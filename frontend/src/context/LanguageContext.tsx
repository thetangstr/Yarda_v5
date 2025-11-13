/**
 * Language Context Provider
 *
 * Provides language selection and translation functionality to the entire app
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Locale, defaultLocale, isValidLocale } from '@/i18n.config';
import { loadTranslations, getTranslation } from '@/lib/i18n/loader';
import { usersAPI } from '@/lib/api';
import { useUserStore } from '@/store/userStore';

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
  const [isInitialized, setIsInitialized] = useState(false);
  const { user, isAuthenticated } = useUserStore();

  // Initialize with default locale translations immediately
  useEffect(() => {
    // Load default locale immediately to avoid blank text on initial render
    loadTranslations(defaultLocale)
      .then((trans) => {
        setTranslations(trans);
        setIsLoading(false);
        setIsInitialized(true);
      })
      .catch((error) => {
        console.error('Failed to load default translations:', error);
        setIsLoading(false);
        setIsInitialized(true);
      });
  }, []);

  // Sync with user's preferred language from backend when authenticated
  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !user) return;

    const syncUserLanguage = async () => {
      try {
        const profile = await usersAPI.getProfile();
        if (profile.preferred_language && isValidLocale(profile.preferred_language)) {
          const userLang = profile.preferred_language as Locale;
          if (userLang !== locale) {
            setLocaleState(userLang);
            localStorage.setItem('preferred-locale', userLang);
          }
        }
      } catch (error: any) {
        // Silently ignore auth errors (401/403) - token might be invalid/expired
        if (error?.response?.status !== 401 && error?.response?.status !== 403) {
          console.error('Failed to sync user language preference:', error);
        }
        // Non-critical error - continue with current locale
      }
    };

    syncUserLanguage();
  }, [isInitialized, isAuthenticated, user]);

  // Load locale from localStorage on mount
  useEffect(() => {
    if (!isInitialized) return;

    const savedLocale = localStorage.getItem('preferred-locale');
    if (savedLocale && isValidLocale(savedLocale) && savedLocale !== locale) {
      setLocaleState(savedLocale);
    }
  }, [isInitialized, locale]);

  // Load translations whenever locale changes
  useEffect(() => {
    if (!isInitialized || locale === defaultLocale) return;

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
  }, [locale, isInitialized]);

  const setLocale = (newLocale: Locale) => {
    if (newLocale !== locale) {
      setLocaleState(newLocale);

      // Sync to backend if user is authenticated
      if (isAuthenticated && user) {
        usersAPI.updateLanguagePreference(newLocale).catch((error) => {
          console.error('Failed to update language preference on server:', error);
          // Non-critical error - local preference still changed
        });
      }
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
