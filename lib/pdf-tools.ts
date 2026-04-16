import { PDFDocument, degrees } from 'pdf-lib';

/**
 * Merge multiple PDFs into one, preserving page order of the input array.
 */
export async function mergePdfs(inputs: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const bytes of inputs) {
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save({ useObjectStreams: true });
}

/**
 * Parse a user-supplied page spec like "1-3, 5, 7-9" into a sorted, unique
 * list of zero-based page indices. Throws on any out-of-range or malformed
 * token.
 */
export function parsePageRanges(spec: string, totalPages: number): number[] {
  const pages = new Set<number>();
  const parts = spec.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error('empty-spec');

  for (const part of parts) {
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!m) throw new Error(`invalid-token:${part}`);
    const from = parseInt(m[1], 10);
    const to = m[2] ? parseInt(m[2], 10) : from;
    if (from < 1 || to < 1 || from > totalPages || to > totalPages) {
      throw new Error(`out-of-range:${part}`);
    }
    const [a, b] = from <= to ? [from, to] : [to, from];
    for (let i = a; i <= b; i++) pages.add(i - 1);
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Extract a subset of pages from a PDF into a new PDF.
 */
export async function splitPdf(
  input: Uint8Array,
  pageSpec: string,
): Promise<{ output: Uint8Array; pageCount: number; totalPages: number }> {
  const src = await PDFDocument.load(input, { ignoreEncryption: true });
  const totalPages = src.getPageCount();
  const indices = parsePageRanges(pageSpec, totalPages);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  const output = await out.save({ useObjectStreams: true });
  return { output, pageCount: indices.length, totalPages };
}

export type RotationAngle = 90 | 180 | 270;

/**
 * Rotate every page of a PDF by the given angle. The angle is cumulative
 * with any existing page rotation (so rotating a page that already has
 * /Rotate 90 by 90 results in a final rotation of 180).
 */
export async function rotatePdf(
  input: Uint8Array,
  angle: RotationAngle,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(input, { ignoreEncryption: true });
  for (const page of doc.getPages()) {
    const existing = page.getRotation().angle;
    const nextAngle = (((existing + angle) % 360) + 360) % 360;
    page.setRotation(degrees(nextAngle));
  }
  return doc.save({ useObjectStreams: true });
}
