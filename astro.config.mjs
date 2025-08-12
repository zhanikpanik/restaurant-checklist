// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [tailwind()],
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  vite: {
    // Environment variables for server and client
    define: {
      'import.meta.env.PUBLIC_POSTER_TOKEN': JSON.stringify('305185:07928627ec76d09e589e1381710e55da')
    },
    ssr: {
      noExternal: ['xlsx']
    }
  }
});