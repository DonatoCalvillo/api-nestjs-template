FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps

ENV CI=true
ENV HUSKY=0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS dev

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

EXPOSE 3000 9229
CMD ["pnpm", "run", "start:dev"]

FROM deps AS build

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN pnpm run build && pnpm prune --prod --ignore-scripts

FROM base AS production

ENV NODE_ENV=production
RUN apk add --no-cache dumb-init=1.2.5-r4

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000
CMD ["dumb-init", "node", "dist/main"]
