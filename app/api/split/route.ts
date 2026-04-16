import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { splitPdf } from '@/lib/pdf-tools';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface RequestBody {
  file: { url: string; name: string; size: number };
  pageSpec: string;
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  if (!body.file?.url || !body.pageSpec?.trim()) {
    return NextResponse.json({ error: 'missing-fields' }, { status: 400 });
  }

  try {
    const res = await fetch(body.file.url);
    if (!res.ok) throw new Error(`fetch-blob-failed:${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());

    const { output, pageCount, totalPages } = await splitPdf(bytes, body.pageSpec);

    const baseName = body.file.name.replace(/\.pdf$/i, '');
    const outName = `${baseName}-split.pdf`;
    const outBlob = await put(`results/${Date.now()}-${outName}`, Buffer.from(output), {
      access: 'public',
      contentType: 'application/pdf',
      addRandomSuffix: true,
    });

    del(body.file.url).catch(() => {});

    return NextResponse.json({
      name: outName,
      size: output.length,
      downloadUrl: outBlob.url,
      pageCount,
      totalPages,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('split-error', msg);
    if (/invalid-token|out-of-range|empty-spec/.test(msg)) {
      return NextResponse.json({ error: 'invalid-spec' }, { status: 400 });
    }
    return NextResponse.json({ error: 'split-failed', detail: msg }, { status: 500 });
  }
}
