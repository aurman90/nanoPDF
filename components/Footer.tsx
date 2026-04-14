import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');
  return (
    <footer className="mt-12 border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 safe-bottom">
      <div className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>{t('madeWith')}</p>
        <p className="mt-1">{t('copyright')}</p>
      </div>
    </footer>
  );
}
