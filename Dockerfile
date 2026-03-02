FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 4301

CMD ["npx", "tsx", "packages/server/src/index.ts"]
