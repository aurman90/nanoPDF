import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ImageToPdfClient } from './ImageToPdfClient';

export default async function ImageToPdfPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('imageToPdf');

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-6 animate-fade-up">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t('subtitle')}
        </p>
      </header>
      <ImageToPdfClient />
    </div>
  );
}
