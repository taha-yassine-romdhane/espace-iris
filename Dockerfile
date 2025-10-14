# Stage 1: Base
FROM node:18-alpine AS base

# Stage 2: Dependencies
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache build-base gcc autoconf automake libtool nasm vips-dev
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --legacy-peer-deps


# Stage 3: Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/espace-elite
ENV SKIP_ENV_VALIDATION=1
RUN npx prisma generate --schema=./prisma/schema.prisma
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN npm run build || (echo "Build failed, trying with reduced memory" && NODE_OPTIONS="--max-old-space-size=1024" npm run build)

# Stage 4: Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
RUN apk add --no-cache vips-dev
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next
RUN chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY startup.sh .
RUN chmod +x startup.sh

USER nextjs
EXPOSE 3001
ENV PORT 3001
ENV HOSTNAME "0.0.0.0"
CMD ["./startup.sh"]