'use client';

import { CheckCircle2, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatBytes } from '@/lib/constants';

export interface CompressResult {
  name: string;
  originalSize: number;
  compressedSize: number;
  downloadUrl: string;
}

export function ResultCard({ result }: { result: CompressResult }) {
  const t = useTranslations('compress');
  const tc = useTranslations('common');

  const reduction =
    result.originalSize > 0
      ? Math.max(
          0,
          Math.round(
            ((result.originalSize - result.compressedSize) /
              result.originalSize) *
              100,
          ),
        )
      : 0;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckCircle2 className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">
            {result.name}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label={t('originalSize')} value={formatBytes(result.originalSize)} />
            <Stat label={t('newSize')} value={formatBytes(result.compressedSize)} highlight />
            <Stat label={t('reduction')} value={`${reduction}%`} highlight />
          </div>
          <a
            href={result.downloadUrl}
            download={result.name}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm active:scale-[0.98] hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" aria-hidden />
            {tc('download')}
          </a>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/60 px-2 py-1.5 dark:bg-black/20">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div
        className={`mt-0.5 font-bold ${
          highlight
            ? 'text-emerald-700 dark:text-emerald-300'
            : 'text-slate-900 dark:text-slate-100'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
