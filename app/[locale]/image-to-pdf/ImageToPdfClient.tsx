'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { upload } from '@vercel/blob/client';
import { Loader2, FileDown, AlertCircle, Download } from 'lucide-react';
import { FileDropzone } from '@/components/FileDropzone';
import { FileList } from '@/components/FileList';
import {
  ACCEPTED_IMAGE_MIMES,
  MAX_FILE_SIZE,
  MAX_IMAGES,
  formatBytes,
} from '@/lib/constants';

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';
type PageSize = 'A4' | 'Letter';
type Orientation = 'portrait' | 'landscape';

interface Result {
  name: string;
  size: number;
  downloadUrl: string;
}

export function ImageToPdfClient() {
  const t = useTranslations('imageToPdf');
  const tc = useTranslations('common');

  const [files, setFiles] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const addFiles = (incoming: File[]) => {
    setError(null);
    const next = [...files];
    for (const f of incoming) {
      if (next.length >= MAX_IMAGES) {
        setError(t('errorTooMany'));
        break;
      }
      if (!ACCEPTED_IMAGE_MIMES.includes(f.type)) {
        setError(t('errorWrongType'));
        continue;
      }
      if (f.size > MAX_FILE_SIZE) continue;
      next.push(f);
    }
    setFiles(next);
  };

  const removeAt = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setPhase('idle');
    setError(null);
  };

  const onConvert = async () => {
    if (files.length === 0) return;
    setError(null);
    setResult(null);
    setPhase('uploading');

    try {
      const uploaded: { url: string; name: string; type: string }[] = [];
      for (const f of files) {
        const blob = await upload(`uploads/img-${Date.now()}-${f.name}`, f, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          contentType: f.type,
        });
        uploaded.push({ url: blob.url, name: f.name, type: f.type });
      }

      setPhase('processing');
      const res = await fetch('/api/image-to-pdf', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ files: uploaded, pageSize, orientation }),
      });

      if (!res.ok) throw new Error('convert-failed');
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
            accept={{
              'image/jpeg': ['.jpg', '.jpeg'],
              'image/png': ['.png'],
              'image/webp': ['.webp'],
            }}
            maxFiles={MAX_IMAGES}
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
                  {t('pageSizeTitle')}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  <ToggleBtn
                    active={pageSize === 'A4'}
                    onClick={() => setPageSize('A4')}
                    label={t('pageSizeA4')}
                  />
                  <ToggleBtn
                    active={pageSize === 'Letter'}
                    onClick={() => setPageSize('Letter')}
                    label={t('pageSizeLetter')}
                  />
                </div>
              </section>

              <section>
                <h2 className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-50">
                  {t('orientationTitle')}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  <ToggleBtn
                    active={orientation === 'portrait'}
                    onClick={() => setOrientation('portrait')}
                    label={t('orientationPortrait')}
                  />
                  <ToggleBtn
                    active={orientation === 'landscape'}
                    onClick={() => setOrientation('landscape')}
                    label={t('orientationLandscape')}
                  />
                </div>
              </section>

              <button
                type="button"
                onClick={onConvert}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-base font-bold text-white shadow-sm transition active:scale-[0.98] hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <FileDown className="h-5 w-5" aria-hidden />
                )}
                {phase === 'uploading'
                  ? tc('uploading')
                  : phase === 'processing'
                    ? tc('processing')
                    : t('convertButton')}
              </button>
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

function ToggleBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border-2 px-4 py-3 text-sm font-bold transition active:scale-[0.98] ${
        active
          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-200'
          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
}
