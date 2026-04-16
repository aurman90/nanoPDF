'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { upload } from '@vercel/blob/client';
import { Loader2, Scissors, AlertCircle, Download } from 'lucide-react';
import { FileDropzone } from '@/components/FileDropzone';
import { FileList } from '@/components/FileList';
import { AutoDeleteNotice } from '@/components/AutoDeleteNotice';
import {
  MAX_FILE_SIZE,
  ACCEPTED_PDF_MIME,
  formatBytes,
} from '@/lib/constants';

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

interface Result {
  name: string;
  size: number;
  downloadUrl: string;
  pageCount: number;
  totalPages: number;
}

export function SplitClient() {
  const t = useTranslations('split');
  const tc = useTranslations('common');

  const [files, setFiles] = useState<File[]>([]);
  const [pageSpec, setPageSpec] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [uploadPct, setUploadPct] = useState(0);

  const addFiles = (incoming: File[]) => {
    setError(null);
    // Single-file tool: replace, don't append.
    const f = incoming[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      setError(t('errorTooLarge'));
      return;
    }
    if (f.type !== ACCEPTED_PDF_MIME && !f.name.toLowerCase().endsWith('.pdf')) {
      setError(t('errorWrongType'));
      return;
    }
    setFiles([f]);
  };

  const removeAt = () => setFiles([]);

  const reset = () => {
    setFiles([]);
    setResult(null);
    setPhase('idle');
    setError(null);
    setUploadPct(0);
    setPageSpec('');
  };

  const onSplit = async () => {
    if (files.length === 0 || !pageSpec.trim()) return;
    setError(null);
    setResult(null);
    setUploadPct(0);
    setPhase('uploading');

    try {
      const f = files[0];
      const safeName = f.name.replace(/[^\w.\-]+/g, '_');
      const blob = await upload(`uploads/${Date.now()}-${safeName}`, f, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        multipart: true,
        onUploadProgress: ({ percentage }) => setUploadPct(Math.round(percentage)),
      });

      setPhase('processing');
      const res = await fetch('/api/split', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          file: { url: blob.url, name: f.name, size: f.size },
          pageSpec: pageSpec.trim(),
        }),
      });

      if (res.status === 400) {
        const body = (await res.json()) as { error?: string };
        if (body.error === 'invalid-spec') {
          setError(t('errorInvalidSpec'));
          setPhase('error');
          return;
        }
      }
      if (!res.ok) throw new Error('split-failed');
      const data = (await res.json()) as Result;
      setResult(data);
      setPhase('done');
    } catch (err) {
      console.error(err);
      setError(t('errorGeneric'));
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
            maxFiles={1}
            maxSize={MAX_FILE_SIZE}
            idleLabel={t('dropzoneIdle')}
            activeLabel={t('dropzoneActive')}
            onFiles={addFiles}
          />
          <AutoDeleteNotice />
          <FileList files={files} onRemove={removeAt} />

          {files.length > 0 && (
            <>
              <section>
                <label
                  htmlFor="pageSpec"
                  className="mb-2 block text-sm font-bold text-slate-900 dark:text-slate-50"
                >
                  {t('pageSpecLabel')}
                </label>
                <input
                  id="pageSpec"
                  type="text"
                  inputMode="numeric"
                  value={pageSpec}
                  onChange={(e) => setPageSpec(e.target.value)}
                  placeholder={t('pageSpecPlaceholder')}
                  dir="ltr"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-mono text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t('pageSpecHelp')}
                </p>
              </section>

              <button
                type="button"
                onClick={onSplit}
                disabled={busy || !pageSpec.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-4 text-base font-bold text-white shadow-sm transition active:scale-[0.98] hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <Scissors className="h-5 w-5" aria-hidden />
                )}
                {phase === 'uploading'
                  ? `${tc('uploading')} ${uploadPct}%`
                  : phase === 'processing'
                    ? tc('processing')
                    : t('splitButton')}
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

      {result && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">
            {result.name}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {t('resultPagesExtracted', {
              count: result.pageCount,
              total: result.totalPages,
            })}{' '}
            · {formatBytes(result.size)}
          </p>
          <a
            href={result.downloadUrl}
            download={result.name}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm active:scale-[0.98] hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" aria-hidden />
            {tc('download')}
          </a>
          <button
            type="button"
            onClick={reset}
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 active:scale-[0.98] hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {tc('reset')}
          </button>
        </div>
      )}
    </div>
  );
}
