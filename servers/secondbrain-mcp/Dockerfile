# Multi-stage Docker build for SecondBrain MCP Server
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV SECONDBRAIN_LOG_LEVEL=info

# Create a non-root user
RUN addgroup --system --gid 1001 secondbrain
RUN adduser --system --uid 1001 secondbrain

# Copy built application
COPY --from=builder --chown=secondbrain:secondbrain /app/dist ./dist
COPY --from=builder --chown=secondbrain:secondbrain /app/package.json ./
COPY --from=deps --chown=secondbrain:secondbrain /app/node_modules ./node_modules

# Copy runtime dependencies
COPY --from=builder --chown=secondbrain:secondbrain /app/chatmodes ./chatmodes
COPY --from=builder --chown=secondbrain:secondbrain /app/instructions ./instructions
COPY --from=builder --chown=secondbrain:secondbrain /app/templates ./templates

USER secondbrain

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/index.js"]
