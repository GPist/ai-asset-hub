FROM node:20-alpine AS deps
WORKDIR /app
# Build tools so better-sqlite3 (native) compiles for Alpine/musl
RUN apk add --no-cache python3 make g++
COPY package.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# sqlite runtime libs for better-sqlite3
RUN apk add --no-cache sqlite-libs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# The standalone trace bundles node_modules it detects; ensure the native
# better-sqlite3 binding is present in the runner.
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# Catalog DB lives on a writable path
ENV CATALOG_DB=/data/catalog.db
RUN mkdir -p /data

CMD ["node", "server.js"]
