/**
 * Language Switcher Component
 *
 * Allows users to switch between available languages
 */

import React, { useState, useRef, useEffect } from 'react';
import { locales, getLocaleName, getLocaleFlag } from '@/i18n.config';
import { useLanguage } from '@/context/LanguageContext';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'buttons';
}

/**
 * Dropdown variant (default)
 */
function DropdownVariant({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 transition-colors"
        aria-label="Change language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-lg">{getLocaleFlag(locale)}</span>
        <span className="text-sm font-medium text-gray-700">{getLocaleName(locale)}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white border border-gray-200 z-50">
          <ul role="listbox" className="py-1">
            {locales.map((lang) => (
              <li key={lang}>
                <button
                  onClick={() => {
                    setLocale(lang);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                    locale === lang
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  role="option"
                  aria-selected={locale === lang}
                >
                  <span className="text-lg">{getLocaleFlag(lang)}</span>
                  <span>{getLocaleName(lang)}</span>
                  {locale === lang && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Button group variant
 */
function ButtonsVariant({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div className={`flex gap-1 ${className}`}>
      {locales.map((lang) => (
        <button
          key={lang}
          onClick={() => setLocale(lang)}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            locale === lang
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          title={getLocaleName(lang)}
          aria-label={`Switch to ${getLocaleName(lang)}`}
          aria-pressed={locale === lang}
        >
          {getLocaleFlag(lang)} {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/**
 * Language Switcher Component
 */
export default function LanguageSwitcher({ className = '', variant = 'dropdown' }: LanguageSwitcherProps) {
  if (variant === 'buttons') {
    return <ButtonsVariant className={className} />;
  }

  return <DropdownVariant className={className} />;
}
