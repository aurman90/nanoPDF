import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { imagesToPdf, type PageSize, type Orientation } from '@/lib/image-to-pdf';
import {
  assertUploadPathname,
  readUploadedBlobBytes,
} from '@/lib/blob-storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface RequestBody {
  files: { pathname: string; name: string; type: string }[];
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
    const pdfBytes = await imagesToPdf(
      (async function* () {
        for (const file of body.files) {
          const pathname = assertUploadPathname(file.pathname);

          yield {
            bytes: await readUploadedBlobBytes(pathname),
            mimeType: file.type,
          };
        }
      })(),
      {
        pageSize: body.pageSize ?? 'A4',
        orientation: body.orientation ?? 'portrait',
      },
    );

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
      body.files.map((f) =>
        del(assertUploadPathname(f.pathname)).catch(() => {}),
      ),
    );

    return NextResponse.json({
      name: outName,
      size: pdfBytes.length,
      downloadUrl: outBlob.url,
    });
  } catch (err) {
    console.error('image-to-pdf-error', err);
    const invalidUploadPath =
      err instanceof Error && err.message === 'invalid-upload-path';

    return NextResponse.json(
      {
        error: invalidUploadPath ? 'invalid-upload-path' : 'conversion-failed',
        detail: String(err),
      },
      { status: invalidUploadPath ? 400 : 500 },
    );
  }
}
