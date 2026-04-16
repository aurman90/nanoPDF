import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { mergePdfs } from '@/lib/pdf-tools';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface RequestBody {
  files: { url: string; name: string; size: number }[];
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  if (!Array.isArray(body.files) || body.files.length < 2) {
    return NextResponse.json({ error: 'need-two-or-more' }, { status: 400 });
  }

  try {
    const buffers = await Promise.all(
      body.files.map(async (f) => {
        const res = await fetch(f.url);
        if (!res.ok) throw new Error(`fetch-blob-failed:${res.status}`);
        return new Uint8Array(await res.arrayBuffer());
      }),
    );

    const merged = await mergePdfs(buffers);

    const outName = `merged-${Date.now()}.pdf`;
    const outBlob = await put(`results/${outName}`, Buffer.from(merged), {
      access: 'public',
      contentType: 'application/pdf',
      addRandomSuffix: true,
    });

    await Promise.all(body.files.map((f) => del(f.url).catch(() => {})));

    return NextResponse.json({
      name: outName,
      size: merged.length,
      downloadUrl: outBlob.url,
    });
  } catch (err) {
    console.error('merge-error', err);
    return NextResponse.json(
      { error: 'merge-failed', detail: String(err) },
      { status: 500 },
    );
  }
}
