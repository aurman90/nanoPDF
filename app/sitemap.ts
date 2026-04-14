import type { MetadataRoute } from 'next';

const base = 'https://nanopdf.app';
const locales = ['ar', 'en'] as const;
const routes = ['', '/compress', '/image-to-pdf'];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return locales.flatMap((locale) =>
    routes.map((route) => ({
      url: `${base}/${locale}${route}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: route === '' ? 1 : 0.8,
    })),
  );
}
