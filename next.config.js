/** @type {import('next').NextConfig} */

let withBundleAnalyzer = (config) => config;
if (process.env.ANALYZE === 'true') {
  withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true });
}

const nextConfig = withBundleAnalyzer({
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  compress: true,

  // ── Image optimization ────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 24h cache for optimized images
  },

  // ── Bundle optimizations ─────────────────────────
  experimental: {
    optimizeCss: true,           // Critical CSS inlining
    optimizePackageImports: [
      'lucide-react',
      'xlsx',
      'ioredis',
      'bcryptjs',
    ],
    // ppr: 'incremental' — requires Next.js canary, enable when upgrading
  },

  // ── Webpack bundle optimization ──────────────────
  webpack: (config, { isServer }) => {
    // Exclude heavy server-only deps from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        pg: false,
        'pg-native': false,
        ioredis: false,
        bcryptjs: false,
        nodemailer: false,
        resend: false,
      };
    }
    return config;
  },

  // ── HTTP headers (cache static assets aggressively) ─
  async headers() {
    return [
      {
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  // ── Environment ─────────────────────────────────
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    POSTER_APP_ID: process.env.POSTER_APP_ID,
    POSTER_APP_SECRET: process.env.POSTER_APP_SECRET,
    POSTER_REDIRECT_URI: process.env.POSTER_REDIRECT_URI,
  },
});

module.exports = nextConfig