import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { rotatePdf, type RotationAngle } from '@/lib/pdf-tools';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface RequestBody {
  file: { url: string; name: string; size: number };
  angle: RotationAngle;
}

const VALID_ANGLES: RotationAngle[] = [90, 180, 270];

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  if (!body.file?.url || !VALID_ANGLES.includes(body.angle)) {
    return NextResponse.json({ error: 'invalid-request' }, { status: 400 });
  }

  try {
    const res = await fetch(body.file.url);
    if (!res.ok) throw new Error(`fetch-blob-failed:${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());

    const rotated = await rotatePdf(bytes, body.angle);

    const baseName = body.file.name.replace(/\.pdf$/i, '');
    const outName = `${baseName}-rotated.pdf`;
    const outBlob = await put(`results/${Date.now()}-${outName}`, Buffer.from(rotated), {
      access: 'public',
      contentType: 'application/pdf',
      addRandomSuffix: true,
    });

    del(body.file.url).catch(() => {});

    return NextResponse.json({
      name: outName,
      size: rotated.length,
      downloadUrl: outBlob.url,
    });
  } catch (err) {
    console.error('rotate-error', err);
    return NextResponse.json(
      { error: 'rotate-failed', detail: String(err) },
      { status: 500 },
    );
  }
}
