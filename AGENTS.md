# AGENTS.md

## Cursor Cloud specific instructions

nanoPDF is a single Next.js 15 (App Router) / React 18 / TypeScript web app offering five PDF tools — Compress, Merge, Split, Rotate, and Image→PDF — each with a page under `app/[locale]/…` and an API route under `app/api/…`. It is internationalized with `next-intl` (locales `ar` (default) and `en`). Package manager is **npm** (`package-lock.json`).

Standard commands live in `package.json` scripts:
- Dev server: `npm run dev` (Next.js on port 3000; visiting `/` redirects to the default locale `/ar`, so use `/en` or `/ar` paths).
- Build: `npm run build`; Production: `npm run start`.

### Non-obvious caveats

- **Vercel Blob token is required for full end-to-end tool use.** Every tool follows: client uploads the file to hosted Vercel Blob (via a token minted by `/api/upload`) → the API route reads the blob, processes it, writes the result back to Blob → user downloads. Without `BLOB_READ_WRITE_TOKEN` (set in `.env.local`, see `.env.example`), uploads fail and the UI shows "Something went wrong…". There is **no local Blob emulator** — a real token + network access is needed for a true web end-to-end test.
- **The core PDF processing logic is pure and testable without Blob.** `lib/pdf-tools.ts` (merge/split/rotate via `pdf-lib`) and `lib/image-to-pdf.ts` (`sharp`) have no Blob dependency; Blob is only the file-transport layer. You can exercise these functions directly (e.g. `node --experimental-strip-types` importing from `lib/pdf-tools.ts`) to validate the engine offline.
- **`npm run lint` is not configured and is interactive.** There is no ESLint config in the repo, so `next lint` launches an interactive "How would you like to configure ESLint?" prompt rather than running a check. Do not treat lint as a runnable check unless ESLint gets configured.
- **`npm install` rewrites `package-lock.json` formatting** under the current npm version (strips `libc` metadata from optional `sharp` deps). This diff is spurious — do not commit it.
- **Ghostscript** is committed at `bin/gs` (Linux x86_64) and used only by `/api/compress` for higher-quality compression; it falls back to system `gs`, then to a pure `pdf-lib`+`sharp` path if unavailable.
- `/api/cleanup` is a Vercel Cron job (hourly, per `vercel.json`) that deletes blobs older than 1h; it does not fire in local dev and is not needed to exercise the tools.
