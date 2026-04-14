const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sharp', 'pdf-lib'],
  // Bundle the Ghostscript binary only into the /api/compress function.
  // /api/upload and /api/image-to-pdf don't need it and stay lean.
  outputFileTracingIncludes: {
    '/api/compress': ['./bin/**'],
  },
};

module.exports = withNextIntl(nextConfig);
