// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    // Ensure environment variables are loaded
    define: {
      'process.env.POSTER_ACCESS_TOKEN': JSON.stringify(process.env.POSTER_ACCESS_TOKEN)
    }
  }
});