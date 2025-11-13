/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Holiday Design System
        primary: '#D34242', // Festive Red
        'background-light': '#F8F5F2', // Creamy White
        'background-dark': '#1A202C', // Dark Slate
        'surface-light': '#FFFFFF',
        'surface-dark': '#2D3748',
        'text-light': '#1A202C',
        'text-dark': '#E2E8F0',
        'subtle-light': '#A0AEC0',
        'subtle-dark': '#718096',
        'accent-light': '#C4A484', // Tan/Gold Accent
        'accent-dark': '#F6E05E', // Gold Accent
        // yarda.pro Brand Colors
        brand: {
          green: '#5A6C4D',        // Primary olive/sage green
          'dark-green': '#3D4A36', // Hover states, dark elements
          cream: '#F5F3F0',        // Light backgrounds
          sage: '#E8EDE5',         // Secondary backgrounds
          'light-sage': '#F0F4ED', // Lighter variant
        },
        // Neutral palette
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#2C3338',
          900: '#1F2937',
        },
        // Keep existing semantic colors
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#FEF3C7',
          100: '#FDE68A',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        error: {
          50: '#FEE2E2',
          100: '#FECACA',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
      },
      fontFamily: {
        sans: [
          'Poppins',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        display: ['Playfair Display', 'serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px/16px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px/20px
        'base': ['1rem', { lineHeight: '1.5rem' }],     // 16px/24px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px/28px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],   // 20px/28px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px/32px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px/36px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px/40px
        '5xl': ['3rem', { lineHeight: '1' }],           // 48px
        '6xl': ['3.75rem', { lineHeight: '1' }],        // 60px
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'brand': '0 10px 30px -5px rgba(90, 108, 77, 0.2)',
        'card': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'card-dark': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(135deg, #5A6C4D 0%, #3D4A36 100%)',
      },
    },
  },
  plugins: [],
}
