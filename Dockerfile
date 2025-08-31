# Production Dockerfile for Restaurant Checklist
FROM node:20-alpine

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files (including pnpm-lock.yaml)
COPY package*.json pnpm-lock.yaml ./

# Install dependencies using pnpm for consistency
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Add a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S astro -u 1001

# Change ownership to non-root user
RUN chown -R astro:nodejs /app
USER astro

# Expose port
EXPOSE 3000

# Health check for web server
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["pnpm", "start"]