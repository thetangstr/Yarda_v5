/**
 * Internationalization Configuration
 *
 * Configures next-intl for multi-language support
 * Supported languages: English (en), Spanish (es), Chinese Simplified (zh)
 */

export const defaultLocale = 'en';
export const locales = ['en', 'es', 'zh'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  zh: '中文 (简体)',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  zh: '🇨🇳',
};

/**
 * Get localized display name for a locale
 */
export function getLocaleName(locale: Locale): string {
  return localeNames[locale] || locale;
}

/**
 * Get flag emoji for a locale
 */
export function getLocaleFlag(locale: Locale): string {
  return localeFlags[locale] || '';
}

/**
 * Check if a locale is valid
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
