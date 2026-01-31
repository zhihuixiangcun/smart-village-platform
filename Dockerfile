# 智慧乡村综合服务平台 - 生产环境Docker镜像
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/node:20-alpine

# 设置工作目录
WORKDIR /app

    # 安装系统依赖
RUN apk add --no-cache \
    curl \
    git \
    python3 \
    py3-pip \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    libpng-dev \
    freetype-dev \
    tesseract-ocr \
    && rm -rf /var/cache/*

# 复制package.json、.npmrc和package-lock.json
COPY package*.json ./
COPY .npmrc ./

# 安装依赖（使用 .npmrc 配置）
ENV TFJS_NODE_SKIP_WASM_VALIDATION=1
RUN npm install --production --legacy-peer-deps --no-audit --no-fund --timeout=180000 --ignore-scripts || \
    npm install --production --legacy-peer-deps --no-audit --no-fund --timeout=180000 --ignore-scripts

# 复制源代�?
COPY . .

# 创建必要的目�?
RUN mkdir -p uploads logs config/encryption-keys

# 设置权限
RUN chown -R node:node /app
RUN chmod +x scripts/*.js || true

# 暴露健康检查端�?
EXPOSE 3001

# 健康检�?
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# 切换到非root用户
USER node

# 启动应用
CMD ["npm", "start"]
