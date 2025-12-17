# 智慧乡村综合服务平台 - 生产环境Docker镜像
FROM node:20-alpine

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
    pangommisc \
    libpng-dev \
    freetype-dev \
    tesseract-ocr \
    && rm -rf /var/cache/*

# 复制package.json和package-lock.json
COPY package*.json ./

# 设置npm镜像源
RUN npm config set registry https://registry.npmmirror.com

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 创建必要的目录
RUN mkdir -p uploads logs config/encryption-keys

# 设置权限
RUN chown -R node:node /app
RUN chmod +x scripts/*.js || true

# 暴露健康检查端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# 切换到非root用户
USER node

# 启动应用
CMD ["npm", "start"]