'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const otherLabel = locale === 'ar' ? 'EN' : 'ع';

  const switchLocale = () => {
    // Replace the leading /<locale> segment with the other locale.
    const newPath = pathname.replace(/^\/(ar|en)/, `/${otherLocale}`);
    router.replace(newPath);
  };

  return (
    <button
      type="button"
      onClick={switchLocale}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm active:scale-95 transition hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      aria-label="Switch language"
    >
      <Languages className="h-4 w-4" aria-hidden />
      <span>{otherLabel}</span>
    </button>
  );
}
