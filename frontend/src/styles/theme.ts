/**
 * Yarda Pro Design System Theme
 *
 * Centralized theme configuration matching yarda.pro branding.
 * Use these constants for consistent styling across components.
 */

export const colors = {
  // Primary brand colors
  brandGreen: '#5A6C4D',
  brandDarkGreen: '#3D4A36',
  brandCream: '#F5F3F0',
  brandSage: '#E8EDE5',
  brandLightSage: '#F0F4ED',

  // Neutral colors
  darkGray: '#2C3338',
  mediumGray: '#6B7280',
  lightGray: '#F9FAFB',
  white: '#FFFFFF',

  // Semantic colors (kept from original for consistency)
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
} as const;

export const gradients = {
  primary: 'linear-gradient(135deg, #5A6C4D 0%, #3D4A36 100%)',
  hero: 'linear-gradient(to bottom right, #5A6C4D, #3D4A36)',
  subtle: 'linear-gradient(to bottom, #F5F3F0, #FFFFFF)',
} as const;

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
  '4xl': '6rem',   // 96px
} as const;

export const borderRadius = {
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  brand: '0 10px 30px -5px rgba(90, 108, 77, 0.2)',
} as const;

// Component-specific styles
export const components = {
  button: {
    primary: {
      bg: colors.brandGreen,
      hover: colors.brandDarkGreen,
      text: colors.white,
      className: 'bg-brand-green hover:bg-brand-dark-green text-white font-medium rounded-lg transition-colors duration-200',
    },
    secondary: {
      bg: colors.brandSage,
      hover: colors.brandGreen,
      text: colors.brandDarkGreen,
      className: 'bg-brand-sage hover:bg-brand-green hover:text-white text-brand-dark-green font-medium rounded-lg transition-colors duration-200',
    },
    outline: {
      border: colors.brandGreen,
      text: colors.brandGreen,
      hover: colors.brandGreen,
      className: 'border-2 border-brand-green text-brand-green hover:bg-brand-green hover:text-white font-medium rounded-lg transition-colors duration-200',
    },
  },
  card: {
    default: {
      bg: colors.white,
      border: colors.brandSage,
      className: 'bg-white border border-brand-sage rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200',
    },
    elevated: {
      className: 'bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200',
    },
  },
  input: {
    default: {
      bg: colors.lightGray,
      border: colors.brandSage,
      focus: colors.brandGreen,
      className: 'bg-gray-50 border border-brand-sage focus:border-brand-green focus:ring-2 focus:ring-brand-green focus:ring-opacity-20 rounded-lg transition-colors duration-200',
    },
  },
  badge: {
    green: {
      className: 'bg-brand-sage text-brand-dark-green px-3 py-1 rounded-full text-sm font-medium',
    },
    success: {
      className: 'bg-success-50 text-success-700 px-3 py-1 rounded-full text-sm font-medium',
    },
    warning: {
      className: 'bg-warning-50 text-warning-700 px-3 py-1 rounded-full text-sm font-medium',
    },
    error: {
      className: 'bg-error-50 text-error-700 px-3 py-1 rounded-full text-sm font-medium',
    },
  },
} as const;

// Layout constants
export const layout = {
  maxWidth: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  containerPadding: {
    mobile: '1rem',    // 16px
    tablet: '1.5rem',  // 24px
    desktop: '2rem',   // 32px
  },
} as const;

// Animation durations
export const animation = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

// Breakpoints (match Tailwind defaults)
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export default {
  colors,
  gradients,
  typography,
  spacing,
  borderRadius,
  shadows,
  components,
  layout,
  animation,
  breakpoints,
};
