# NCP VPS 등 저사양 서버 배포용 멀티스테이지 빌드.
# next.config.ts의 output: 'standalone' 산출물만 복사해 이미지/메모리 사용량을 최소화한다.
# 주의: 이 이미지는 앱 프로세스만 실행한다. `prisma db push` 같은 스키마 반영은
# 컨테이너 기동 시마다 실행하지 않고(운영 DB에 위험), 배포 스크립트에서 별도/1회 실행할 것.

FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
