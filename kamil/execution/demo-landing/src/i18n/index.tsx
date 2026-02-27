import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { en } from './en';
import { pl } from './pl';
import type { Translations } from './en';

export type Lang = 'en' | 'pl';

const translations: Record<Lang, Translations> = { en, pl };

const STORAGE_KEY = 'fitcore-lang';

function detectInitialLang(): Lang {
  // Priority 1: localStorage saved preference
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'pl') return saved;

  // Priority 2: URL path (if someone lands directly on /pl/)
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/pl')) return 'pl';

  // Priority 3: browser language
  const browserLang = navigator.language?.toLowerCase() ?? '';
  if (browserLang.startsWith('pl')) return 'pl';

  // Priority 4: default
  return 'en';
}

interface I18nContextValue {
  lang: Lang;
  t: Translations;
  switchLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function updateMetaTags(lang: Lang) {
  const t = translations[lang];

  // Update <html lang>
  document.documentElement.lang = lang;

  // Update <title>
  document.title = t.meta.title;

  // Update meta description
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', t.meta.description);

  // Inject/update canonical tag
  const path = window.location.pathname;
  const base = 'https://fitcore.tech';
  const isCheckout = path.includes('checkout');
  const canonicalHref = lang === 'pl'
    ? `${base}/pl/${isCheckout ? 'checkout' : ''}`
    : `${base}/${isCheckout ? 'checkout' : ''}`;

  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', canonicalHref);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(detectInitialLang);

  const switchLang = useCallback((newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
  }, []);

  // Update meta tags on every lang change
  useEffect(() => {
    updateMetaTags(lang);
  }, [lang]);

  const t = translations[lang];

  return (
    <I18nContext.Provider value={{ lang, t, switchLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useLang must be used inside I18nProvider');
  return ctx;
}
