# Production Dockerfile for Next.js Restaurant Checklist
# Multi-stage build optimized for fast builds and small images

FROM node:20-alpine AS base

# ── Dependencies stage ──────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy only package files for layer caching
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# ── Builder stage ───────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy deps first (separate layer)
COPY --from=deps /app/node_modules ./node_modules

# Copy source (respects .dockerignore)
COPY . .

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the Next.js app
RUN npm run build

# ── Production runner ───────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only what's needed for standalone mode
COPY --from=builder /app/public ./public

# Standalone output from Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set correct permissions
USER nextjs

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

CMD ["node", "server.js"]
