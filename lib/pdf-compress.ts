import { PDFDocument, PDFName, PDFRawStream, PDFDict, PDFArray } from 'pdf-lib';
import sharp from 'sharp';
import { CompressionLevel, QUALITY_PRESETS } from './constants';

/**
 * Compress a PDF by:
 *  1. Re-encoding embedded JPEG images at a lower quality via sharp
 *  2. Saving with object streams enabled (structural compression)
 *
 * Notes:
 *  - Only recompresses images stored as DCTDecode (JPEG). PNG/Flate images
 *    are left untouched to avoid losing transparency or causing visual artifacts.
 *  - Text-heavy PDFs will see limited gains (which is expected — they're
 *    already compressed). Image-heavy PDFs benefit the most.
 */
export async function compressPdf(
  input: Uint8Array,
  level: CompressionLevel,
): Promise<Uint8Array> {
  const preset = QUALITY_PRESETS[level];

  const pdfDoc = await PDFDocument.load(input, {
    updateMetadata: false,
    ignoreEncryption: true,
  });

  // Strip metadata to shave a few bytes.
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('nanoPDF');
  pdfDoc.setCreator('nanoPDF');

  // Walk all indirect objects, find image XObjects with DCTDecode filter.
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

      // Downscale if larger than maxDimension
      let pipeline = image;
      const maxDim = Math.max(originalWidth, originalHeight);
      if (maxDim > preset.maxDimension) {
        pipeline = pipeline.resize({
          width:
            originalWidth >= originalHeight
              ? preset.maxDimension
              : undefined,
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

      // Only replace if it's actually smaller.
      if (compressed.data.length >= jpegBytes.length) continue;

      // Build a replacement raw stream with the same dict but new bytes + new dimensions.
      const newDict = dict.clone();
      newDict.set(PDFName.of('Width'), pdfDoc.context.obj(compressed.info.width));
      newDict.set(PDFName.of('Height'), pdfDoc.context.obj(compressed.info.height));
      newDict.set(PDFName.of('Length'), pdfDoc.context.obj(compressed.data.length));
      newDict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
      newDict.delete(PDFName.of('DecodeParms'));

      const newStream = PDFRawStream.of(newDict, compressed.data);
      pdfDoc.context.assign(ref, newStream);
    } catch {
      // If sharp fails on an unusual JPEG, leave the original image in place.
      continue;
    }
  }

  const output = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  return output;
}
