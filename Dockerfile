# Stage 1: compile TypeScript and install production deps
FROM cgr.dev/chainguard/node:22-dev AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN ./node_modules/.bin/tsc --pretty

# Trim node_modules to production deps only
RUN npm ci --omit=dev

# Stage 2: minimal production image (no npm, no shell)
FROM cgr.dev/chainguard/node:22
WORKDIR /app

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/build ./build

EXPOSE 3012
CMD ["node", "./build/server.js"]
