'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { upload } from '@vercel/blob/client';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { FileDropzone } from '@/components/FileDropzone';
import { FileList } from '@/components/FileList';
import {
  CompressionLevelPicker,
} from '@/components/CompressionLevelPicker';
import { ResultCard, type CompressResult } from '@/components/ResultCard';
import {
  MAX_FILE_SIZE,
  MAX_FILES,
  ACCEPTED_PDF_MIME,
  type CompressionLevel,
} from '@/lib/constants';

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export function CompressClient() {
  const t = useTranslations('compress');
  const tc = useTranslations('common');

  const [files, setFiles] = useState<File[]>([]);
  const [level, setLevel] = useState<CompressionLevel>('medium');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CompressResult[]>([]);
  const [uploadPct, setUploadPct] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const addFiles = (incoming: File[]) => {
    setError(null);
    const next = [...files];
    for (const f of incoming) {
      if (next.length >= MAX_FILES) {
        setError(t('errorTooMany'));
        break;
      }
      if (f.size > MAX_FILE_SIZE) {
        setError(t('errorTooLarge'));
        continue;
      }
      if (f.type !== ACCEPTED_PDF_MIME && !f.name.toLowerCase().endsWith('.pdf')) {
        setError(t('errorWrongType'));
        continue;
      }
      next.push(f);
    }
    setFiles(next);
  };

  const removeAt = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const reset = () => {
    setFiles([]);
    setResults([]);
    setPhase('idle');
    setError(null);
    setUploadPct(0);
    setCurrentIndex(0);
  };

  const onCompress = async () => {
    if (files.length === 0) return;
    setError(null);
    setResults([]);
    setUploadPct(0);
    setCurrentIndex(0);
    setPhase('uploading');

    try {
      // 1. Upload every file directly to Vercel Blob.
      //    - multipart: splits large files into 5MB chunks, uploads in parallel, retries failed parts.
      //      Critical on mobile networks where a single-shot PUT of a 20-50MB file often stalls.
      //    - onUploadProgress: shows live percentage so user doesn't see a frozen "Uploading…".
      const uploaded: { url: string; name: string; size: number }[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setCurrentIndex(i);
        setUploadPct(0);
        // Sanitize filename: strip non-ASCII chars that could cause signed-URL issues.
        const safeName = f.name.replace(/[^\w.\-]+/g, '_');
        const blob = await upload(`uploads/${Date.now()}-${safeName}`, f, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          multipart: true,
          onUploadProgress: ({ percentage }) => {
            setUploadPct(Math.round(percentage));
          },
        });
        uploaded.push({ url: blob.url, name: f.name, size: f.size });
      }

      // 2. Ask server to compress each uploaded blob.
      setPhase('processing');
      const res = await fetch('/api/compress', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ files: uploaded, level }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || 'compress-failed');
      }

      const data = (await res.json()) as { results: CompressResult[] };
      setResults(data.results);
      setPhase('done');
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error && /network/i.test(err.message)
          ? t('errorNetwork')
          : t('errorGeneric');
      setError(message);
      setPhase('error');
    }
  };

  const busy = phase === 'uploading' || phase === 'processing';

  return (
    <div className="flex flex-col gap-6">
      {phase !== 'done' && (
        <>
          <FileDropzone
            accept={{ 'application/pdf': ['.pdf'] }}
            maxFiles={MAX_FILES}
            maxSize={MAX_FILE_SIZE}
            idleLabel={t('dropzoneIdle')}
            activeLabel={t('dropzoneActive')}
            onFiles={addFiles}
          />
          <FileList files={files} onRemove={removeAt} />

          {files.length > 0 && (
            <>
              <section>
                <h2 className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-50">
                  {t('levelTitle')}
                </h2>
                <CompressionLevelPicker value={level} onChange={setLevel} />
              </section>

              <button
                type="button"
                onClick={onCompress}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-4 text-base font-bold text-white shadow-sm transition active:scale-[0.98] hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-5 w-5" aria-hidden />
                )}
                {phase === 'uploading'
                  ? `${tc('uploading')} ${files.length > 1 ? `${currentIndex + 1}/${files.length} · ` : ''}${uploadPct}%`
                  : phase === 'processing'
                    ? tc('processing')
                    : t('compressButton')}
              </button>
              {phase === 'uploading' && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-[width] duration-200"
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {results.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {t('resultTitle')}
          </h2>
          {results.map((r, i) => (
            <ResultCard key={i} result={r} />
          ))}
          <button
            type="button"
            onClick={reset}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 active:scale-[0.98] hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {tc('reset')}
          </button>
        </section>
      )}
    </div>
  );
}
