import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const locale = useLocale();
  const t = useTranslations('common');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 safe-top">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2 font-bold text-lg tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <span>{t('appName')}</span>
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
