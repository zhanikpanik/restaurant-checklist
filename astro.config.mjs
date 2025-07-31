// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  vite: {
    plugins: [tailwindcss()],
    // Environment variables for server and client
    define: {
      'import.meta.env.PUBLIC_POSTER_TOKEN': JSON.stringify('305185:07928627ec76d09e589e1381710e55da')
    }
  }
});