# --- Build stage -----------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage -----------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# NODE_ENV is overridden per-environment at `docker run` time (staging|production)
# so ConfigModule picks up .env.staging / .env.production via env vars injected
# by docker-compose / the deploy workflow — no .env files are baked into the image.
EXPOSE 8080
CMD ["node", "dist/main"]
