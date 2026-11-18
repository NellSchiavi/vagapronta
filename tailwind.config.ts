import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

// Todas as cores vêm de variáveis CSS (src/styles/tokens.css),
// assim o modo escuro troca a paleta inteira sem mudar nenhuma tela.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        bg: token('bg'),
        card: token('card'),
        ink: token('ink'),
        muted: token('muted'),
        line: token('line'),
        'line-strong': token('line-strong'),
        track: token('track'),
        terra: {
          DEFAULT: token('terra'),
          strong: token('terra-strong'),
          soft: token('terra-soft'),
        },
        success: {
          DEFAULT: token('success'),
          strong: token('success-strong'),
          soft: token('success-soft'),
        },
        info: {
          DEFAULT: token('info'),
          soft: token('info-soft'),
        },
        danger: {
          DEFAULT: token('danger'),
          soft: token('danger-soft'),
        },
        neutral: {
          DEFAULT: token('neutral'),
          soft: token('neutral-soft'),
        },
        warn: {
          DEFAULT: token('warn'),
          soft: token('warn-soft'),
        },
        linkedin: {
          DEFAULT: '#0A66C2',
          hover: '#004182',
        },
        'on-accent': token('on-accent'),
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
      },
      borderRadius: {
        field: '10px',
        card: '16px',
        'card-sm': '14px',
      },
      fontSize: {
        footer: ['13px', '1.5'],
      },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
      spacing: {
        'bottom-nav': '4.5rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(43 38 34 / 0.04), 0 4px 16px rgb(43 38 34 / 0.04)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
} satisfies Config
