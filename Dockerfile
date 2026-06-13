# Stage 1: compile TypeScript and install production deps
FROM node:22-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN ./node_modules/.bin/tsc --pretty

# Trim node_modules to production deps only
RUN npm ci --omit=dev

# Stage 2: minimal production image
FROM node:22-slim
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build

EXPOSE 3012
CMD ["node", "./build/server.js"]
