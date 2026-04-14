import { PDFDocument, PDFName, PDFRawStream, PDFArray } from 'pdf-lib';
import sharp from 'sharp';
import { CompressionLevel, QUALITY_PRESETS } from './constants';
import { compressWithGhostscript } from './pdf-compress-gs';

/**
 * Main compression entry point.
 *
 * Strategy:
 *   1. Try Ghostscript — handles text, vectors, all image types, font
 *      subsetting, content stream re-encoding. Gives real compression
 *      even on text-heavy PDFs.
 *   2. On any GS failure (missing binary locally, timeout, non-zero exit,
 *      encrypted PDF, …) fall back to the pdf-lib + sharp path. It only
 *      recompresses embedded JPEG images, but it keeps the feature working
 *      on macOS dev and on Hobby timeouts.
 *
 * The caller in app/api/compress/route.ts already compares the returned
 * length against the original and returns whichever is smaller, so we
 * don't need that comparison here.
 */
export async function compressPdf(
  input: Uint8Array,
  level: CompressionLevel,
): Promise<Uint8Array> {
  try {
    const gsOutput = await compressWithGhostscript(input, level);
    const pct = input.length
      ? (((input.length - gsOutput.length) / input.length) * 100).toFixed(1)
      : '0';
    console.log(
      `[compress] GS succeeded: ${input.length} → ${gsOutput.length} bytes (${pct}% reduction)`,
    );
    return gsOutput;
  } catch (err) {
    console.warn(
      '[compress] GS failed, falling back to pdf-lib:',
      err instanceof Error ? err.message : String(err),
    );
  }

  return compressWithPdfLib(input, level);
}

/**
 * Fallback compression: recompress embedded JPEG images via sharp and save
 * with object streams. This is the original implementation, retained for:
 *   - Local macOS dev without a usable Linux-only gs binary
 *   - Vercel Hobby timeouts on huge PDFs
 *   - Any unexpected Ghostscript failure
 *
 * Only handles DCTDecode (JPEG) images — text-heavy PDFs see near-zero
 * reduction through this path.
 */
async function compressWithPdfLib(
  input: Uint8Array,
  level: CompressionLevel,
): Promise<Uint8Array> {
  const preset = QUALITY_PRESETS[level];

  const pdfDoc = await PDFDocument.load(input, {
    updateMetadata: false,
    ignoreEncryption: true,
  });

  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('nanoPDF');
  pdfDoc.setCreator('nanoPDF');

  const indirectObjects = pdfDoc.context.enumerateIndirectObjects();

  for (const [ref, obj] of indirectObjects) {
    if (!(obj instanceof PDFRawStream)) continue;

    const dict = obj.dict;
    const subtype = dict.get(PDFName.of('Subtype'));
    if (subtype !== PDFName.of('Image')) continue;

    const filter = dict.get(PDFName.of('Filter'));
    const isJpeg =
      filter === PDFName.of('DCTDecode') ||
      (filter instanceof PDFArray &&
        filter.asArray().some((f) => f === PDFName.of('DCTDecode')));

    if (!isJpeg) continue;

    try {
      const jpegBytes = Buffer.from(obj.contents);
      const image = sharp(jpegBytes, { failOn: 'none' });
      const metadata = await image.metadata();

      const originalWidth = metadata.width ?? 0;
      const originalHeight = metadata.height ?? 0;
      if (!originalWidth || !originalHeight) continue;

      let pipeline = image;
      const maxDim = Math.max(originalWidth, originalHeight);
      if (maxDim > preset.maxDimension) {
        pipeline = pipeline.resize({
          width:
            originalWidth >= originalHeight ? preset.maxDimension : undefined,
          height:
            originalHeight > originalWidth ? preset.maxDimension : undefined,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      const compressed = await pipeline
        .jpeg({
          quality: preset.jpegQuality,
          mozjpeg: true,
          progressive: false,
        })
        .toBuffer({ resolveWithObject: true });

      if (compressed.data.length >= jpegBytes.length) continue;

      const newDict = dict.clone();
      newDict.set(PDFName.of('Width'), pdfDoc.context.obj(compressed.info.width));
      newDict.set(PDFName.of('Height'), pdfDoc.context.obj(compressed.info.height));
      newDict.set(PDFName.of('Length'), pdfDoc.context.obj(compressed.data.length));
      newDict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
      newDict.delete(PDFName.of('DecodeParms'));

      const newStream = PDFRawStream.of(newDict, compressed.data);
      pdfDoc.context.assign(ref, newStream);
    } catch {
      // If sharp fails on an unusual JPEG, leave the original image.
      continue;
    }
  }

  return pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
}
