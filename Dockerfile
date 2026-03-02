FROM node:20-slim AS build

WORKDIR /app

# Install ALL dependencies (including devDependencies for build)
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/

ENV NODE_ENV=development
RUN npm ci

COPY . .

# Build client static files
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/

ENV NODE_ENV=production
RUN npm ci --include=dev

# Copy source and built client
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
COPY --from=build /app/packages/client/dist ./packages/client/dist

EXPOSE 4301

CMD ["node", "--import", "tsx", "packages/server/src/index.ts"]
