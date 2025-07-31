// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'hybrid',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  vite: {
    plugins: [tailwindcss()],
    // Ensure environment variables are loaded
    define: {
      'process.env.POSTER_ACCESS_TOKEN': JSON.stringify(process.env.POSTER_ACCESS_TOKEN),
      'process.env.PUBLIC_POSTER_ACCESS_TOKEN': JSON.stringify(process.env.PUBLIC_POSTER_ACCESS_TOKEN)
    }
  }
});