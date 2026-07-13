# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
ARG PULSE_RELEASE_SHA=development
ARG PULSE_SCHEMA_VERSION=20260713010000_project_intelligence_v1
ENV PULSE_RELEASE_SHA=${PULSE_RELEASE_SHA}
ENV PULSE_SCHEMA_VERSION=${PULSE_SCHEMA_VERSION}
COPY package.json package-lock.json ./
# Auth.js 5 currently declares Nodemailer 7 as an optional peer while Pulse
# deliberately uses Nodemailer 9. Pulse does not use Auth.js' email provider.
RUN npm ci --no-audit --no-fund --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build

# One-shot migration image. This is intentionally separate from app startup.
FROM node:20-alpine AS migrator
WORKDIR /app
RUN npm install --global --no-audit --no-fund prisma@6.19.2
COPY prisma ./prisma
CMD ["prisma", "migrate", "deploy"]

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ARG PULSE_RELEASE_SHA=development
ARG PULSE_SCHEMA_VERSION=20260713010000_project_intelligence_v1
ENV PULSE_RELEASE_SHA=${PULSE_RELEASE_SHA}
ENV PULSE_SCHEMA_VERSION=${PULSE_SCHEMA_VERSION}

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health/ready || exit 1

CMD ["node", "server.js"]
