import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { en } from './en';
import { pl } from './pl';
import type { Translations } from './en';

export type Lang = 'en' | 'pl';

const translations: Record<Lang, Translations> = { en, pl };

const STORAGE_KEY = 'fitcore-lang';

function detectInitialLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'en' || saved === 'pl') return saved;
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/pl')) return 'pl';
  const browserLang = navigator.language?.toLowerCase() ?? '';
  if (browserLang.startsWith('pl')) return 'pl';
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
  document.documentElement.lang = lang;
  document.title = t.meta.title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', t.meta.description);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(detectInitialLang);

  const switchLang = useCallback((newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
  }, []);

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
