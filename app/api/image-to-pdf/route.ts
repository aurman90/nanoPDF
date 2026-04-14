import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { imagesToPdf, type PageSize, type Orientation } from '@/lib/image-to-pdf';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface RequestBody {
  files: { url: string; name: string; type: string }[];
  pageSize: PageSize;
  orientation: Orientation;
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

  try {
    const images = await Promise.all(
      body.files.map(async (f) => {
        const res = await fetch(f.url);
        if (!res.ok) throw new Error(`fetch-blob-failed:${res.status}`);
        return {
          bytes: new Uint8Array(await res.arrayBuffer()),
          mimeType: f.type,
        };
      }),
    );

    const pdfBytes = await imagesToPdf(images, {
      pageSize: body.pageSize ?? 'A4',
      orientation: body.orientation ?? 'portrait',
    });

    const outName = `images-${Date.now()}.pdf`;
    const outBlob = await put(
      `results/${outName}`,
      Buffer.from(pdfBytes),
      {
        access: 'public',
        contentType: 'application/pdf',
        addRandomSuffix: true,
      },
    );

    // Clean up originals.
    await Promise.all(
      body.files.map((f) => del(f.url).catch(() => {})),
    );

    return NextResponse.json({
      name: outName,
      size: pdfBytes.length,
      downloadUrl: outBlob.url,
    });
  } catch (err) {
    console.error('image-to-pdf-error', err);
    return NextResponse.json(
      { error: 'conversion-failed', detail: String(err) },
      { status: 500 },
    );
  }
}
