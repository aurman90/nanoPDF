import { get } from '@vercel/blob';

const UPLOAD_PREFIX = 'uploads/';

export function isAllowedUploadPathname(pathname: unknown): pathname is string {
  return (
    typeof pathname === 'string' &&
    pathname.startsWith(UPLOAD_PREFIX) &&
    pathname.length > UPLOAD_PREFIX.length &&
    !pathname.includes('..')
  );
}

export function assertUploadPathname(pathname: unknown): string {
  if (!isAllowedUploadPathname(pathname)) {
    throw new Error('invalid-upload-path');
  }

  return pathname;
}

export async function readUploadedBlobBytes(pathname: string): Promise<Uint8Array> {
  const blob = await get(pathname, { access: 'public' });

  if (!blob || blob.statusCode !== 200) {
    throw new Error('uploaded-blob-not-found');
  }

  return new Uint8Array(await new Response(blob.stream).arrayBuffer());
}
