'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, X, Share } from 'lucide-react';

/**
 * Cross-platform PWA install prompt.
 *
 *  - Android / desktop Chrome-family: listens for `beforeinstallprompt`
 *    (deferred by the browser), then shows a custom button that calls
 *    `prompt()` when tapped.
 *  - iOS Safari: doesn't fire that event. Detect standalone-capable iOS
 *    Safari and show a hint that explains Share → "Add to Home Screen".
 *
 * Dismissals are remembered in localStorage so we don't nag users.
 */

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'nanopdf:install:dismissed';
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS-specific flag
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return isIos && isSafari;
}

export function InstallPrompt() {
  const t = useTranslations('install');
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Surface the iOS hint after a short delay so it doesn't fight with
    // the page's initial paint.
    if (isIosSafari()) {
      const id = setTimeout(() => setShowIosHint(true), 3000);
      return () => {
        clearTimeout(id);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    markDismissed();
    setDeferred(null);
    setShowIosHint(false);
  };

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  if (deferred) {
    return (
      <Banner onDismiss={dismiss}>
        <button
          type="button"
          onClick={handleInstall}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white active:scale-95"
        >
          <Download className="h-4 w-4" aria-hidden />
          <span>{t('install')}</span>
        </button>
        <span className="text-sm text-slate-700 dark:text-slate-200">
          {t('ctaAndroid')}
        </span>
      </Banner>
    );
  }

  if (showIosHint) {
    return (
      <Banner onDismiss={dismiss}>
        <Share className="h-5 w-5 flex-none text-brand-600 dark:text-brand-400" aria-hidden />
        <span className="text-sm text-slate-700 dark:text-slate-200">
          {t('ctaIos')}
        </span>
      </Banner>
    );
  }

  return null;
}

function Banner({
  children,
  onDismiss,
}: {
  children: React.ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 safe-bottom">
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="dismiss"
        className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
