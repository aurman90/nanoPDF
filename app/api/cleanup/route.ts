import { NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Auto-deletes old uploaded files and compressed results from Vercel Blob.
 *
 * Triggered by Vercel Cron (see vercel.json → crons). On Hobby plans cron
 * runs once a day; on Pro it can run more often. Regardless of frequency,
 * each run sweeps EVERY blob older than BLOB_TTL_MS so files can never
 * outlive that window by more than one cron interval.
 *
 * Security:
 *   Vercel Cron adds the `x-vercel-cron` header when invoking scheduled
 *   jobs from its infrastructure. We reject requests that don't have it
 *   (anyone could still POST to this endpoint from outside — rejecting
 *   prevents abuse). For defense-in-depth, also accept a bearer token
 *   when `CRON_SECRET` is set.
 */

const BLOB_TTL_MS = 60 * 60 * 1000; // 1 hour
const PREFIXES_TO_CLEAN = ['uploads/', 'results/'];

export async function GET(request: Request) {
  // Authorize.
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const bearerOk =
    !!cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !bearerOk) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const cutoff = now - BLOB_TTL_MS;
  const deleted: string[] = [];
  const kept: string[] = [];
  const errors: string[] = [];

  try {
    for (const prefix of PREFIXES_TO_CLEAN) {
      let cursor: string | undefined;
      do {
        const page = await list({ prefix, cursor, limit: 1000 });
        for (const blob of page.blobs) {
          if (blob.uploadedAt.getTime() < cutoff) {
            try {
              await del(blob.url);
              deleted.push(blob.pathname);
            } catch (e) {
              errors.push(`${blob.pathname}: ${String(e)}`);
            }
          } else {
            kept.push(blob.pathname);
          }
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
    }

    return NextResponse.json({
      ok: true,
      deletedCount: deleted.length,
      keptCount: kept.length,
      errorCount: errors.length,
      cutoff: new Date(cutoff).toISOString(),
      errors: errors.slice(0, 20),
    });
  } catch (err) {
    console.error('[cleanup] fatal:', err);
    return NextResponse.json(
      { error: 'cleanup-failed', detail: String(err) },
      { status: 500 },
    );
  }
}
