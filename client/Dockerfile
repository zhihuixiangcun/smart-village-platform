# Multi-stage build for Client with Nginx
# ===== BUILD STAGE =====
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --audit --audit-level=moderate && \
    npm cache clean --force

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL=http://localhost:3001
ARG VITE_VILLAGE_API_URL=http://localhost:5000
ARG VITE_WS_URL=ws://localhost:5000

# Build the application
RUN npm run build

# ===== RUNTIME STAGE =====
FROM nginx:1.25-alpine AS runtime

# Security labels
LABEL maintainer="Smart Village Team <team@smartvillage.com>" \
      org.opencontainers.image.title="Smart Village Client" \
      org.opencontainers.image.description="Vue.js frontend for Smart Village platform" \
      org.opencontainers.image.source="https://github.com/smartvillage/platform"

# Security: Install security updates
RUN apk upgrade --no-cache && \
    apk add --no-cache curl ca-certificates && \
    rm -rf /var/cache/apk/*

# Security: Create non-root user for nginx
RUN addgroup -g 1001 -S nginx-custom && \
    adduser -S nginx-custom -u 1001 -G nginx-custom

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/conf.d/default.conf

# Security: Set proper file permissions
RUN chown -R nginx-custom:nginx-custom /usr/share/nginx/html && \
    chown -R nginx-custom:nginx-custom /var/cache/nginx && \
    chown -R nginx-custom:nginx-custom /var/log/nginx && \
    chown -R nginx-custom:nginx-custom /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx-custom:nginx-custom /var/run/nginx.pid

# Security: Switch to non-root user
USER nginx-custom

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]