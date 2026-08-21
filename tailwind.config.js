/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        saffron: {
          DEFAULT: '#FF9933',
          light: '#FFA84D',
          dark: '#E67E17',
        },
        'temple-stone': '#1A1A24',
        'soft-gold': '#D4AF37',
        'deep-brown': '#2A1810',
        'warm-cream': '#F5E6D3',
        'light-bg': '#FAF7F2',
        'light-surface': '#FFFFFF',
        'light-border': '#E8DFC8',
        'light-stone': '#3B2F2F',
      },
      fontFamily: {
        cinzel: ['"Cinzel"', 'serif'],
        serif: ['"Playfair Display"', '"Lora"', 'Georgia', 'serif'],
        lora: ['"Lora"', 'Georgia', 'serif'],
        sans: ['"Outfit"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
