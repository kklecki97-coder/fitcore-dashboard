import type { Lang } from '../i18n';

/**
 * Returns the BCP 47 locale string for date/number formatting.
 * Centralizes the lang-to-locale mapping so we don't repeat it in every component.
 *
 * NOTE on timezones: All dates in the app are stored as ISO 8601 strings (UTC).
 * When displaying dates, `toLocaleDateString(locale, ...)` uses the browser's local
 * timezone by default. If server-side rendering or multi-timezone support is needed,
 * pass `{ timeZone: '...' }` in the options.
 */
export function getLocale(lang: Lang): string {
  return lang === 'pl' ? 'pl-PL' : 'en-US';
}

/**
 * Format a currency amount according to the current language.
 * Polish uses "z\u0142" (PLN), English uses "$" (USD).
 */
export function formatCurrency(amount: number, lang: Lang): string {
  if (lang === 'pl') {
    return `${amount.toLocaleString('pl-PL')} z\u0142`;
  }
  return `$${amount.toLocaleString('en-US')}`;
}
