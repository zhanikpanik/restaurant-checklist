/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark'], // You can add more themes: 'cupcake', 'corporate', etc.
    darkTheme: 'dark',
    base: true,
    styled: true,
    utils: true,
  },
}



