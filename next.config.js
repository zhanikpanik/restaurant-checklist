/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone mode for Docker
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    POSTER_APP_ID: process.env.POSTER_APP_ID,
    POSTER_APP_SECRET: process.env.POSTER_APP_SECRET,
    POSTER_REDIRECT_URI: process.env.POSTER_REDIRECT_URI,
  },
}

module.exports = nextConfig