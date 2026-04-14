import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  FileArchive,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  const Chevron = locale === 'ar' ? ChevronLeft : ChevronRight;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <section className="animate-fade-up text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t('heroTitle')}
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          {t('heroSubtitle')}
        </p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6">
        <ToolCard
          href={`/${locale}/compress`}
          title={t('compressCardTitle')}
          description={t('compressCardDescription')}
          icon={<FileArchive className="h-7 w-7" aria-hidden />}
          cta={t('open')}
          chevron={<Chevron className="h-4 w-4" />}
          gradient="from-brand-500 to-indigo-600"
        />
        <ToolCard
          href={`/${locale}/image-to-pdf`}
          title={t('imageToPdfCardTitle')}
          description={t('imageToPdfCardDescription')}
          icon={<ImagePlus className="h-7 w-7" aria-hidden />}
          cta={t('open')}
          chevron={<Chevron className="h-4 w-4" />}
          gradient="from-emerald-500 to-teal-600"
        />
      </section>

      <section className="mt-10 grid grid-cols-3 gap-2 text-center">
        <Feature icon={<Smartphone className="h-5 w-5" />} label={t('feature1')} />
        <Feature icon={<ShieldCheck className="h-5 w-5" />} label={t('feature2')} />
        <Feature icon={<Zap className="h-5 w-5" />} label={t('feature3')} />
      </section>
    </div>
  );
}

function ToolCard({
  href,
  title,
  description,
  icon,
  cta,
  chevron,
  gradient,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  cta: string;
  chevron: React.ReactNode;
  gradient: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition active:scale-[0.99] hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <div
        className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-sm`}
      >
        {icon}
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {description}
      </p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-400">
        <span>{cta}</span>
        {chevron}
      </div>
    </Link>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-3 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      <div className="text-brand-600 dark:text-brand-400">{icon}</div>
      <span>{label}</span>
    </div>
  );
}
