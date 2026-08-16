FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Binary assets (fonts, brand PNGs, design artwork) are restored at build
# time from scripts/asset-urls.txt (see scripts/restore-assets.sh).
RUN sh scripts/restore-assets.sh
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# SQL migrations are applied at boot (see api/boot.ts).
COPY db/migrations ./db/migrations
EXPOSE 3000
CMD ["npm", "start"]
