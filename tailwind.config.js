/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        'kcm-primary': '#1e40af',
        'kcm-secondary': '#3b82f6',
        'kcm-accent': '#10b981',
      }
    },
  },
  plugins: [],
};