import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        hold: {
          start: '#10b981',
          hand: '#ef4444',
          foot: '#3b82f6',
          finish: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};

export default config;
