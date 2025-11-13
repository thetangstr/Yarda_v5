/**
 * Language Context Provider
 *
 * Provides language selection and translation functionality to the entire app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Locale, defaultLocale, isValidLocale } from '@/i18n.config';
import { loadTranslations, getTranslation } from '@/lib/i18n/loader';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  translations: Record<string, any>;
  t: (key: string, defaultValue?: string) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Language Provider Component
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load locale from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('preferred-locale');
    if (savedLocale && isValidLocale(savedLocale)) {
      setLocaleState(savedLocale);
    }
  }, []);

  // Load translations whenever locale changes
  useEffect(() => {
    setIsLoading(true);
    loadTranslations(locale)
      .then((trans) => {
        setTranslations(trans);
        // Save preference to localStorage
        localStorage.setItem('preferred-locale', locale);
      })
      .catch((error) => {
        console.error('Failed to load translations:', error);
        setTranslations({});
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    if (newLocale !== locale) {
      setLocaleState(newLocale);
    }
  };

  const t = (key: string, defaultValue?: string): string => {
    return getTranslation(translations, key, defaultValue || key);
  };

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        translations,
        t,
        isLoading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to use language context
 */
export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

/**
 * Hook to use translations (shorthand)
 */
export function useTranslations() {
  const { t } = useLanguage();
  return t;
}

/**
 * Hook to change language
 */
export function useSetLanguage() {
  const { setLocale } = useLanguage();
  return setLocale;
}
