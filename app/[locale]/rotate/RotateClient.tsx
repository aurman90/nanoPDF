'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { upload } from '@vercel/blob/client';
import {
  Loader2,
  RotateCw,
  RotateCcw,
  FlipVertical2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { FileDropzone } from '@/components/FileDropzone';
import { FileList } from '@/components/FileList';
import { AutoDeleteNotice } from '@/components/AutoDeleteNotice';
import {
  MAX_FILE_SIZE,
  ACCEPTED_PDF_MIME,
  formatBytes,
} from '@/lib/constants';
import type { RotationAngle } from '@/lib/pdf-tools';

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

interface Result {
  name: string;
  size: number;
  downloadUrl: string;
}

export function RotateClient() {
  const t = useTranslations('rotate');
  const tc = useTranslations('common');

  const [files, setFiles] = useState<File[]>([]);
  const [angle, setAngle] = useState<RotationAngle>(90);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [uploadPct, setUploadPct] = useState(0);

  const addFiles = (incoming: File[]) => {
    setError(null);
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
  };

  const onRotate = async () => {
    if (files.length === 0) return;
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
      const res = await fetch('/api/rotate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          file: { url: blob.url, name: f.name, size: f.size },
          angle,
        }),
      });
      if (!res.ok) throw new Error('rotate-failed');
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

  const angles: {
    value: RotationAngle;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { value: 90, label: t('angle90'), icon: <RotateCw className="h-5 w-5" aria-hidden /> },
    { value: 180, label: t('angle180'), icon: <FlipVertical2 className="h-5 w-5" aria-hidden /> },
    { value: 270, label: t('angle270'), icon: <RotateCcw className="h-5 w-5" aria-hidden /> },
  ];

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
                <h2 className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-50">
                  {t('angleTitle')}
                </h2>
                <div className="grid gap-2 sm:grid-cols-3">
                  {angles.map((opt) => {
                    const active = angle === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAngle(opt.value)}
                        aria-pressed={active}
                        className={`flex items-center gap-2 rounded-2xl border-2 p-4 text-start transition active:scale-[0.98] ${
                          active
                            ? 'border-brand-600 bg-brand-50 shadow-sm dark:border-brand-400 dark:bg-brand-900/30'
                            : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900'
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                            active
                              ? 'bg-brand-600 text-white'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {opt.icon}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-50">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <button
                type="button"
                onClick={onRotate}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-4 text-base font-bold text-white shadow-sm transition active:scale-[0.98] hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <RotateCw className="h-5 w-5" aria-hidden />
                )}
                {phase === 'uploading'
                  ? `${tc('uploading')} ${uploadPct}%`
                  : phase === 'processing'
                    ? tc('processing')
                    : t('rotateButton')}
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
