import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2B6CB0',
          light: '#4299e1',
          dark: '#1a4a7e',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
