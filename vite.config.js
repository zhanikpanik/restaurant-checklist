import { defineConfig } from 'vite';

export default defineConfig({
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 3000,
    allowedHosts: [
      'restaurant-checklist-production.up.railway.app',
      'tranquil-clover-production.up.railway.app',
      '.railway.app',
      '.up.railway.app',
      'localhost',
      '127.0.0.1'
    ]
  }
});