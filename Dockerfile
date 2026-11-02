# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy backend dependencies and Prisma schema
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci
RUN npx prisma generate

# Copy backend source code and config
COPY backend/tsconfig.json ./
COPY backend/src ./src/

RUN npm run build

# Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci --only=production
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
RUN mkdir -p logs

EXPOSE 5000

CMD ["node", "dist/server.js"]
