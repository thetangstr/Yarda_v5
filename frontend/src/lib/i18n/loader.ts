/**
 * Translation Loader for Pages Router
 *
 * Dynamically loads translation files from public/locales
 */

import { Locale } from '@/i18n.config';

type Translations = Record<string, any>;

const translationCache: Map<Locale, Translations> = new Map();

/**
 * Load translation file for a specific locale
 */
export async function loadTranslations(locale: Locale): Promise<Translations> {
  // Return from cache if available
  if (translationCache.has(locale)) {
    return translationCache.get(locale)!;
  }

  try {
    const response = await fetch(`/locales/${locale}/common.json`);
    if (!response.ok) {
      throw new Error(`Failed to load translations for locale: ${locale}`);
    }
    const translations = await response.json();
    translationCache.set(locale, translations);
    return translations;
  } catch (error) {
    console.error(`Error loading translations for locale ${locale}:`, error);
    // Return empty object as fallback
    return {};
  }
}

/**
 * Get a nested translation value by key path
 * Example: t('auth.login') -> translations.auth.login
 */
export function getTranslation(
  translations: Translations,
  keyPath: string,
  defaultValue: string = keyPath
): string {
  try {
    const keys = keyPath.split('.');
    let value: any = translations;

    for (const key of keys) {
      value = value?.[key];
    }

    return typeof value === 'string' ? value : defaultValue;
  } catch (error) {
    console.warn(`Failed to get translation for key: ${keyPath}`, error);
    return defaultValue;
  }
}
