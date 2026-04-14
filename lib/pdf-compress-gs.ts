import path from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { CompressionLevel } from './constants';

const execFileAsync = promisify(execFile);

/**
 * Map our UI compression levels to Ghostscript PDFSETTINGS profiles.
 *  - /printer: 300 DPI images, minimal downsampling, moderate compression
 *  - /ebook:   150 DPI, good balance for general reading
 *  - /screen:  72 DPI, aggressive downsampling, smallest file
 *
 * All three profiles subset fonts and re-encode content streams, so even
 * text-only PDFs (no images to downsample) see meaningful reductions.
 */
const LEVEL_TO_PDFSETTING: Record<CompressionLevel, string> = {
  low: '/printer',
  medium: '/ebook',
  high: '/screen',
};

/**
 * Resolve the Ghostscript binary path.
 *  - Linux (Vercel Lambda): use the repo-bundled binary at bin/gs.
 *  - Other platforms (macOS local dev): fall back to system `gs` on PATH.
 *    If it's not installed, execFile will fail and the outer compressPdf()
 *    will fall back to the pdf-lib path.
 */
function getGsBinaryPath(): string {
  if (process.platform === 'linux') {
    return path.join(process.cwd(), 'bin', 'gs');
  }
  return 'gs';
}

const GS_BINARY = getGsBinaryPath();

// Ensure the binary is executable. The Vercel build may not preserve the
// POSIX execute bit when expanding the function package, so we chmod at
// module load time. Idempotent and guarded so warm containers skip it.
let _permFixed = false;
function ensureExecutable(): void {
  if (_permFixed) return;
  _permFixed = true;
  // Only attempt on absolute paths (i.e., the bundled Linux binary).
  // `'gs'` is a PATH lookup, not a file we can chmod.
  if (!path.isAbsolute(GS_BINARY)) return;
  try {
    fs.chmodSync(GS_BINARY, 0o755);
  } catch {
    // If chmod fails, execFile will surface a clearer error to the caller.
  }
}

function buildGsArgs(
  inputPath: string,
  outputPath: string,
  level: CompressionLevel,
): string[] {
  return [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    `-dPDFSETTINGS=${LEVEL_TO_PDFSETTING[level]}`,
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
    '-dDetectDuplicateImages=true',
    '-dCompressFonts=true',
    '-dEmbedAllFonts=true',
    `-sOutputFile=${outputPath}`,
    inputPath,
  ];
}

/**
 * Compress a PDF using Ghostscript.
 * Writes input to /tmp, invokes `gs`, reads the output, cleans up.
 * Throws on any failure (missing binary, timeout, non-zero exit, no output).
 * The outer compressPdf() catches and falls back to the pdf-lib path.
 */
export async function compressWithGhostscript(
  input: Uint8Array,
  level: CompressionLevel,
): Promise<Uint8Array> {
  ensureExecutable();

  const id = crypto.randomBytes(8).toString('hex');
  const tmpDir = os.tmpdir();
  const inPath = path.join(tmpDir, `gs-in-${id}.pdf`);
  const outPath = path.join(tmpDir, `gs-out-${id}.pdf`);

  try {
    fs.writeFileSync(inPath, input);

    await execFileAsync(GS_BINARY, buildGsArgs(inPath, outPath, level), {
      // 45s leaves ~15s headroom below the 60s Vercel Pro maxDuration.
      // On Hobby (10s cap), the Lambda platform will kill us before this
      // timer fires — the fallback path handles that case.
      timeout: 45_000,
      maxBuffer: 50 * 1024 * 1024,
    });

    if (!fs.existsSync(outPath)) {
      throw new Error('ghostscript-produced-no-output');
    }

    return new Uint8Array(fs.readFileSync(outPath));
  } finally {
    try {
      fs.unlinkSync(inPath);
    } catch {}
    try {
      fs.unlinkSync(outPath);
    } catch {}
  }
}
