FROM node:20.11.1-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY bin ./bin
COPY agents ./agents
COPY skills ./skills
COPY automation-app ./automation-app
COPY scripts ./scripts
RUN npm run build
RUN npm run build:automation-app
RUN npm test
RUN npm prune --omit=dev

FROM node:20.11.1-bookworm-slim AS runtime

ENV NODE_ENV=production \
    WHOP_PIPELINE_HOME=/var/lib/whop-pipeline \
    WHOP_PIPELINE_SECRET_DIR=/var/lib/whop-pipeline/secrets \
    WHOP_PIPELINE_BOOTSTRAP_SECRET_DIR=/run/secrets

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends git openssh-client \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /var/lib/whop-pipeline /workspace \
    && chown -R node:node /var/lib/whop-pipeline /workspace

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/agents ./agents
COPY --from=build /app/skills ./skills
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/automation-app ./automation-app

VOLUME ["/var/lib/whop-pipeline", "/workspace"]

USER node
WORKDIR /workspace

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD node /app/dist/healthcheck.js

CMD ["node", "/app/dist/index.js"]
