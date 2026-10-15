/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fintech: {
          bg: '#F5F8FC',
          card: '#FFFFFF',
          cardHover: '#FAFCFF',
          border: '#E2E8F0',
          borderSubtle: '#EDF2F7',
          primary: '#2563EB',
          primaryHover: '#1D4ED8',
          primaryLight: '#EFF6FF',
          textMain: '#0F172A',
          textMuted: '#64748B',
          textSubtle: '#94A3B8',
        },
        navy: {
          950: '#F5F8FC',
          900: '#FFFFFF',
          850: '#FFFFFF',
          800: '#F1F5F9',
          700: '#E2E8F0',
          600: '#CBD5E1',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          card: '#FFFFFF',
          cardHover: '#F8FAFC',
          border: '#E2E8F0',
          subtle: '#F1F5F9',
        },
        shield: {
          emerald: '#10B981',
          mint: '#059669',
          amber: '#F59E0B',
          red: '#EF4444',
          blue: '#2563EB',
          purple: '#6366F1',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        fintech: '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.03)',
        fintechHover: '0 4px 6px -1px rgba(37, 99, 235, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
      }
    },
  },
  plugins: [typography],
}
