FROM node:22-slim AS build
WORKDIR /app
# NOTE: package-lock.json is intentionally not committed yet (regenerate with
# `npm install` and commit it when a binary-capable git push is available),
# so the build uses npm install instead of npm ci.
COPY package.json ./
RUN npm install
COPY . .
# Binary assets (fonts, brand PNGs) are restored at build time from
# scripts/asset-urls.txt (see scripts/restore-assets.sh).
RUN sh scripts/restore-assets.sh
# Vite bakes VITE_* vars into the frontend bundle at build time, so they must
# be passed as Docker build args (Railway: set them as service variables).
ARG VITE_KIMI_AUTH_URL
ARG VITE_APP_ID
ENV VITE_KIMI_AUTH_URL=$VITE_KIMI_AUTH_URL
ENV VITE_APP_ID=$VITE_APP_ID
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
# SQL migrations are applied at boot (see api/boot.ts).
COPY db/migrations ./db/migrations
EXPOSE 3000
CMD ["npm", "start"]
