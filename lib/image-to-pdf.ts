import { PDFDocument, PageSizes } from 'pdf-lib';
import sharp from 'sharp';

export type PageSize = 'A4' | 'Letter';
export type Orientation = 'portrait' | 'landscape';

export interface ImageToPdfOptions {
  pageSize: PageSize;
  orientation: Orientation;
}

interface ImageInput {
  bytes: Uint8Array;
  mimeType: string;
}

export async function imagesToPdf(
  images: ImageInput[],
  options: ImageToPdfOptions,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const baseDims = options.pageSize === 'A4' ? PageSizes.A4 : PageSizes.Letter;
  const [pageW, pageH] =
    options.orientation === 'landscape' ? [baseDims[1], baseDims[0]] : baseDims;

  for (const image of images) {
    // Normalize everything to JPEG to avoid PNG alpha issues and shrink payload.
    const jpegBytes = await sharp(Buffer.from(image.bytes))
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    const embedded = await pdfDoc.embedJpg(jpegBytes);

    const page = pdfDoc.addPage([pageW, pageH]);
    const margin = 20;
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;

    const scale = Math.min(maxW / embedded.width, maxH / embedded.height, 1);
    const drawW = embedded.width * scale;
    const drawH = embedded.height * scale;

    page.drawImage(embedded, {
      x: (pageW - drawW) / 2,
      y: (pageH - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }

  return pdfDoc.save({ useObjectStreams: true });
}
