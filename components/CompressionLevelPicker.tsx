'use client';

import { Gauge, Feather, Minimize2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CompressionLevel } from '@/lib/constants';

interface Props {
  value: CompressionLevel;
  onChange: (v: CompressionLevel) => void;
}

export function CompressionLevelPicker({ value, onChange }: Props) {
  const t = useTranslations('compress');

  const options: {
    key: CompressionLevel;
    title: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'low',
      title: t('levelLow'),
      desc: t('levelLowDesc'),
      icon: <Feather className="h-5 w-5" aria-hidden />,
    },
    {
      key: 'medium',
      title: t('levelMedium'),
      desc: t('levelMediumDesc'),
      icon: <Gauge className="h-5 w-5" aria-hidden />,
    },
    {
      key: 'high',
      title: t('levelHigh'),
      desc: t('levelHighDesc'),
      icon: <Minimize2 className="h-5 w-5" aria-hidden />,
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            aria-pressed={active}
            className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-start transition active:scale-[0.98] ${
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
            <span className="mt-1 font-bold text-slate-900 dark:text-slate-50">
              {opt.title}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {opt.desc}
            </span>
          </button>
        );
      })}
    </div>
  );
}
