'use client';

import { FileText, X } from 'lucide-react';
import { formatBytes } from '@/lib/constants';

interface Props {
  files: File[];
  onRemove: (index: number) => void;
}

export function FileList({ files, onRemove }: Props) {
  if (files.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {files.map((f, i) => (
        <li
          key={`${f.name}-${i}`}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
              {f.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatBytes(f.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            aria-label="Remove file"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
