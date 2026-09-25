FROM node:22-slim AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN npm install -g bun && bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json bun.lock ./
RUN npm install -g bun && bun install --frozen-lockfile --production && npm uninstall -g bun
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
