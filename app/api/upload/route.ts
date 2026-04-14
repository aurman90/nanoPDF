import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { MAX_FILE_SIZE } from '@/lib/constants';

export const runtime = 'nodejs';

/**
 * Issues short-lived client upload tokens for Vercel Blob.
 * Allows uploads up to MAX_FILE_SIZE.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Accept both PDFs (for compression) and images (for image→pdf).
        const allowed = pathname.startsWith('uploads/')
          ? ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
          : [];

        return {
          allowedContentTypes: allowed,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async () => {
        // no-op
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'upload-error' },
      { status: 400 },
    );
  }
}
