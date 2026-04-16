'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { upload } from '@vercel/blob/client';
import { Loader2, Layers, AlertCircle, Download } from 'lucide-react';
import { FileDropzone } from '@/components/FileDropzone';
import { FileList } from '@/components/FileList';
import { AutoDeleteNotice } from '@/components/AutoDeleteNotice';
import {
  MAX_FILE_SIZE,
  MAX_MERGE_FILES,
  ACCEPTED_PDF_MIME,
  formatBytes,
} from '@/lib/constants';

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

interface Result {
  name: string;
  size: number;
  downloadUrl: string;
}

export function MergeClient() {
  const t = useTranslations('merge');
  const tc = useTranslations('common');

  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const addFiles = (incoming: File[]) => {
    setError(null);
    const next = [...files];
    for (const f of incoming) {
      if (next.length >= MAX_MERGE_FILES) {
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

  const removeAt = (index: number) => setFiles(files.filter((_, i) => i !== index));

  const reset = () => {
    setFiles([]);
    setResult(null);
    setPhase('idle');
    setError(null);
    setUploadPct(0);
    setCurrentIndex(0);
  };

  const onMerge = async () => {
    if (files.length < 2) {
      setError(t('errorMinFiles'));
      return;
    }
    setError(null);
    setResult(null);
    setUploadPct(0);
    setCurrentIndex(0);
    setPhase('uploading');

    try {
      const uploaded: { url: string; name: string; size: number }[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setCurrentIndex(i);
        setUploadPct(0);
        const safeName = f.name.replace(/[^\w.\-]+/g, '_');
        const blob = await upload(`uploads/${Date.now()}-${safeName}`, f, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          multipart: true,
          onUploadProgress: ({ percentage }) => setUploadPct(Math.round(percentage)),
        });
        uploaded.push({ url: blob.url, name: f.name, size: f.size });
      }

      setPhase('processing');
      const res = await fetch('/api/merge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ files: uploaded }),
      });
      if (!res.ok) throw new Error('merge-failed');
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
            maxFiles={MAX_MERGE_FILES}
            maxSize={MAX_FILE_SIZE}
            idleLabel={t('dropzoneIdle')}
            activeLabel={t('dropzoneActive')}
            onFiles={addFiles}
          />
          <AutoDeleteNotice />
          <FileList files={files} onRemove={removeAt} />

          {files.length > 0 && (
            <>
              <button
                type="button"
                onClick={onMerge}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-4 text-base font-bold text-white shadow-sm transition active:scale-[0.98] hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <Layers className="h-5 w-5" aria-hidden />
                )}
                {phase === 'uploading'
                  ? `${tc('uploading')} ${files.length > 1 ? `${currentIndex + 1}/${files.length} · ` : ''}${uploadPct}%`
                  : phase === 'processing'
                    ? tc('processing')
                    : t('mergeButton')}
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
            {formatBytes(result.size)}
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
