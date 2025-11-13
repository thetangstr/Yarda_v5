# Internationalization (i18n) Guide

This guide explains how to use the multi-language support system in Yarda.

## Overview

- **Supported Languages**: English (en), Spanish (es), Chinese Simplified (zh)
- **Framework**: Custom i18n system with React Context
- **Storage**: localStorage for user preferences
- **Translation Files**: `public/locales/{locale}/common.json`

## Basic Usage

### Using Translations in Components

**Simple text translation:**

```tsx
import { useLanguage } from '@/context/LanguageContext';

export default function MyComponent() {
  const { t } = useLanguage();

  return (
    <div>
      <h1>{t('auth.login')}</h1>
      <button>{t('common.save')}</button>
      <p>{t('errors.networkError')}</p>
    </div>
  );
}
```

### Switching Languages

**Using the Language Switcher Component:**

```tsx
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Header() {
  return (
    <header>
      {/* Dropdown variant (default) */}
      <LanguageSwitcher />

      {/* Button variant */}
      <LanguageSwitcher variant="buttons" />
    </header>
  );
}
```

### Programmatic Language Change

```tsx
import { useLanguage } from '@/context/LanguageContext';

export default function LanguageSettings() {
  const { locale, setLocale } = useLanguage();

  const handleChangeLanguage = (newLang: 'en' | 'es' | 'zh') => {
    setLocale(newLang);
  };

  return (
    <div>
      <p>Current language: {locale}</p>
      <button onClick={() => handleChangeLanguage('en')}>English</button>
      <button onClick={() => handleChangeLanguage('es')}>Español</button>
      <button onClick={() => handleChangeLanguage('zh')}>中文</button>
    </div>
  );
}
```

## Available Hooks

### `useLanguage()`

Full context hook returning all language functionality:

```tsx
const { locale, setLocale, t, translations, isLoading } = useLanguage();

// locale: Current locale ('en' | 'es' | 'zh')
// setLocale: Function to change language
// t: Translation function t(key, defaultValue?)
// translations: Full translation object
// isLoading: Whether translations are being loaded
```

### `useTranslations()`

Shorthand for just the `t()` function:

```tsx
const t = useTranslations();
return <h1>{t('auth.login')}</h1>;
```

### `useSetLanguage()`

Shorthand for just the `setLocale()` function:

```tsx
const setLanguage = useSetLanguage();
return <button onClick={() => setLanguage('es')}>Cambiar a Español</button>;
```

## Adding New Translation Keys

### 1. Add to Translation Files

Add new keys to all three language files:

**`public/locales/en/common.json`:**
```json
{
  "myFeature": {
    "title": "My Feature Title",
    "description": "My feature description"
  }
}
```

**`public/locales/es/common.json`:**
```json
{
  "myFeature": {
    "title": "Título de mi característica",
    "description": "Descripción de mi característica"
  }
}
```

**`public/locales/zh/common.json`:**
```json
{
  "myFeature": {
    "title": "我的功能标题",
    "description": "我的功能描述"
  }
}
```

### 2. Use in Component

```tsx
const { t } = useLanguage();

return (
  <div>
    <h1>{t('myFeature.title')}</h1>
    <p>{t('myFeature.description')}</p>
  </div>
);
```

## Translation Key Structure

Keys use dot notation for nested organization:

```
common.*          - Common UI elements
nav.*             - Navigation items
auth.*            - Authentication
generation.*      - Generation feature
credits.*         - Credit system
account.*         - Account settings
purchase.*        - Purchase/checkout
holiday.*         - Holiday decorator
errors.*          - Error messages
messages.*        - Success/info messages
```

## Examples

### Login Page with Translations

```tsx
import { useLanguage } from '@/context/LanguageContext';

export default function LoginPage() {
  const { t } = useLanguage();

  return (
    <div>
      <h1>{t('auth.login')}</h1>
      <form>
        <input placeholder={t('auth.email')} />
        <input type="password" placeholder={t('auth.password')} />
        <button>{t('auth.signIn')}</button>
      </form>
      <p>
        {t('auth.dontHaveAccount')}{' '}
        <a href="/register">{t('auth.signUp')}</a>
      </p>
    </div>
  );
}
```

### Generation Page with Translations

```tsx
import { useLanguage } from '@/context/LanguageContext';

export default function GeneratePage() {
  const { t } = useLanguage();

  return (
    <div>
      <h1>{t('generation.title')}</h1>
      <p>{t('generation.description')}</p>

      <button>{t('generation.selectArea')}</button>
      <button>{t('generation.selectStyle')}</button>
      <button>{t('generation.generate')}</button>

      {error && <p className="error">{t('errors.generationFailed')}</p>}
      {success && <p className="success">{t('generation.completed')}</p>}
    </div>
  );
}
```

## User Language Preference

### Store Preference

Language preference is automatically:
- **Saved to localStorage** (key: `preferred-locale`) - persists across sessions
- **Saved to database** (column: `users.preferred_language`) - for user account settings

### Retrieve Preference

The system automatically loads user's preferred language when:
1. App loads from localStorage
2. User logs in (from database)

### Update in Backend

```python
# Backend Python model update
from pydantic import Field

class UpdateProfileRequest(BaseModel):
    preferred_language: Optional[str] = Field(
        None,
        pattern="^(en|es|zh)$",
        description="Preferred language (en, es, zh)"
    )
```

User can update via API:
```
PUT /v1/users/profile
{
  "preferred_language": "es"
}
```

## Migration Guide

### Converting Hardcoded Strings to Translations

**Before:**
```tsx
<h1>Login</h1>
<button>Sign In</button>
```

**After:**
```tsx
import { useLanguage } from '@/context/LanguageContext';

export default function LoginForm() {
  const { t } = useLanguage();

  return (
    <>
      <h1>{t('auth.login')}</h1>
      <button>{t('auth.signIn')}</button>
    </>
  );
}
```

## Troubleshooting

### Missing Translations

If a translation key is missing:
- The key itself is returned as fallback: `"auth.login"` → displays `"auth.login"`
- Check that the key exists in all 3 language files
- Ensure proper dot notation: `namespace.key`

### Language Not Changing

If language switching doesn't work:
1. Check LanguageProvider is wrapping the app (in `_app.tsx`)
2. Verify component is using `useLanguage()` hook
3. Check browser localStorage has `preferred-locale` key
4. Clear localStorage and browser cache

### Performance

- Translations are cached after first load
- Language switching is instant (no API calls required)
- Consider lazy-loading if translation files grow very large

## Best Practices

1. **Always provide translations for all 3 languages** - Don't add keys to just one file
2. **Use descriptive key names** - `auth.loginEmail` is better than `label1`
3. **Keep translations in sync** - If you update English, update Spanish and Chinese
4. **Default values** - Always provide fallback text to `t()` function if key might be missing
5. **Component-level imports** - Use `useLanguage()` where translations are needed, not globally
6. **Test all languages** - Verify UI looks good in all 3 languages

## Files Reference

- **Config**: `src/i18n.config.ts`
- **Context**: `src/context/LanguageContext.tsx`
- **Switcher Component**: `src/components/LanguageSwitcher.tsx`
- **Utilities**: `src/lib/i18n/loader.ts`
- **Translation Files**: `public/locales/{en,es,zh}/common.json`
