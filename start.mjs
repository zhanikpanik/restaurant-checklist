#!/usr/bin/env node

// Set Railway-specific environment variables
process.env.HOST = process.env.HOST || '0.0.0.0';
process.env.PORT = process.env.PORT || '3000';

console.log(`🚀 Starting server on ${process.env.HOST}:${process.env.PORT}`);
console.log(`📍 Environment: ${process.env.NODE_ENV || 'production'}`);
console.log(`🔑 Poster token configured: ${!!process.env.POSTER_ACCESS_TOKEN}`);

// Import and start the Astro server
import('./dist/server/entry.mjs').catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});