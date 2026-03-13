# STAGE 1: build
FROM node:20-alpine AS builder

RUN apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./
COPY index.js ./
COPY src/ ./src/
COPY public/ ./public/
COPY tests/ ./tests/

# Syntax check
RUN node --check index.js && \
    node --check src/server.js && \
    node --check src/rateLimiter.js

# Run tests — build fails if any test fails
RUN node --test tests/*.test.js

# STAGE 2: production image
FROM node:20-alpine AS production

RUN apk upgrade --no-cache

WORKDIR /app

# Remove npm and other build tools not needed at runtime
RUN npm uninstall -g npm corepack && \
    rm -rf /opt/yarn-v1.22.22

COPY --from=builder /app/index.js ./
COPY --from=builder /app/src/ ./src/
COPY --from=builder /app/public/ ./public/

# Create a non-root user and group
RUN addgroup -S portal && adduser -S portal -G portal

# Create the photos mount point and give ownership to our user
RUN mkdir -p /app/photos && chown -R portal:portal /app

# Switch to non-root user
USER portal

# Port the app will use
EXPOSE 3000

# Set default environment variables
ENV PORT=3000
ENV PHOTOS_DIR=/app/photos
ENV NODE_ENV=production

# Health check: Docker poll to know if the container is healthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/photos || exit 1

CMD ["node", "--max-old-space-size=192", "index.js"]
