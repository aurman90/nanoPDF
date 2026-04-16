import { useTranslations } from 'next-intl';

export function AutoDeleteNotice() {
  const t = useTranslations('common');
  return (
    <p className="text-center text-xs text-slate-500 dark:text-slate-400">
      {t('autoDeleteNotice')}
    </p>
  );
}
