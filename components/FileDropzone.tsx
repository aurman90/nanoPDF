'use client';

import { useCallback } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';

interface Props {
  accept: Accept;
  maxFiles: number;
  maxSize: number;
  idleLabel: string;
  activeLabel: string;
  onFiles: (files: File[]) => void;
}

export function FileDropzone({
  accept,
  maxFiles,
  maxSize,
  idleLabel,
  activeLabel,
  onFiles,
}: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFiles(accepted);
    },
    [onFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    noKeyboard: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition active:scale-[0.99] ${
        isDragActive
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
          : 'border-slate-300 bg-slate-50 hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm dark:bg-slate-800 dark:text-brand-400">
        <UploadCloud className="h-7 w-7" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {isDragActive ? activeLabel : idleLabel}
      </p>
    </div>
  );
}
