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
    port: process.env.PORT || 3000,
    host: '0.0.0.0'
  },
  vite: {
    plugins: [tailwindcss()],
    // Ensure environment variables are loaded
    define: {
      'process.env.POSTER_ACCESS_TOKEN': JSON.stringify(process.env.POSTER_ACCESS_TOKEN)
    }
  }
});