import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { compressPdf } from '@/lib/pdf-compress';
import type { CompressionLevel } from '@/lib/constants';

export const runtime = 'nodejs';
export const maxDuration = 60; // seconds — requires Vercel Pro for >10s

interface RequestBody {
  files: { url: string; name: string; size: number }[];
  level: CompressionLevel;
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  if (!Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json({ error: 'no-files' }, { status: 400 });
  }

  const validLevels: CompressionLevel[] = ['low', 'medium', 'high'];
  if (!validLevels.includes(body.level)) {
    return NextResponse.json({ error: 'invalid-level' }, { status: 400 });
  }

  const results: {
    name: string;
    originalSize: number;
    compressedSize: number;
    downloadUrl: string;
  }[] = [];

  for (const file of body.files) {
    try {
      // Fetch the uploaded blob into memory.
      const res = await fetch(file.url);
      if (!res.ok) throw new Error(`fetch-blob-failed:${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());

      // Run through the compressor.
      const compressed = await compressPdf(bytes, body.level);

      // If compression didn't help, just return the original.
      const finalBytes =
        compressed.length < bytes.length ? compressed : bytes;

      // Upload the compressed result to Blob for downloading.
      const outName = prefixFilename(file.name, 'compressed');
      const outBlob = await put(
        `results/${Date.now()}-${outName}`,
        Buffer.from(finalBytes),
        {
          access: 'public',
          contentType: 'application/pdf',
          addRandomSuffix: true,
        },
      );

      // Remove the original uploaded blob — we don't need it anymore.
      del(file.url).catch(() => {});

      results.push({
        name: outName,
        originalSize: file.size,
        compressedSize: finalBytes.length,
        downloadUrl: outBlob.url,
      });
    } catch (err) {
      console.error('compress-error', err);
      return NextResponse.json(
        { error: 'compression-failed', detail: String(err) },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ results });
}

function prefixFilename(name: string, prefix: string): string {
  const base = name.replace(/\.pdf$/i, '');
  return `${base}-${prefix}.pdf`;
}
