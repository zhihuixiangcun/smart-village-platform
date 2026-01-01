#!/bin/bash

# 智慧乡村综合服务平台部署脚本
# 适用于生产环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的环境变量
check_env_vars() {
    log_info "检查环境变量..."

    required_vars=(
        "MONGODB_URI"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "CLIENT_URL"
    )

    missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "缺少必要的环境变量: ${missing_vars[*]}"
        log_error "请设置这些环境变量后重新运行部署脚本"
        exit 1
    fi

    log_success "环境变量检查通过"
}

# 检查Docker和Docker Compose
check_dependencies() {
    log_info "检查Docker依赖..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi

    log_success "Docker依赖检查通过"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."

    directories=(
        "uploads"
        "uploads/announcements"
        "uploads/emergencies"
        "uploads/residents"
        "uploads/meetings"
        "uploads/tasks"
        "logs"
        "config"
        "docker/nginx/conf.d"
        "docker/prometheus"
        "docker/grafana/provisioning"
        "docker/grafana/provisioning/datasources"
        "docker/grafana/provisioning/dashboards"
        "mongodb-backup"
        "redis"
    )

    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        log_info "创建目录: $dir"
    done

    log_success "目录创建完成"
}

# 生成Nginx配置
generate_nginx_config() {
    log_info "生成Nginx配置..."

    cat > docker/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 上游服务器
    upstream api_backend {
        server smart-village-api:3001;
        keepalive 32;
    }

    # HTTP服务器配置
    server {
        listen 80;
        server_name _;

        # 安全头
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

        # API代理
        location /api/ {
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 86400;
        }

        # 静态文件
        location /static/ {
            alias /usr/share/nginx/uploads/;
            expires 1d;
            add_header Cache-Control "public, immutable";
        }

        # 前端应用
        location / {
            try_files $uri $uri/ @fallback;
        }

        location @fallback {
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # 健康检查
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

    log_success "Nginx配置生成完成"
}

# 生成环境变量文件
generate_env_file() {
    log_info "生成环境变量文件..."

    if [ ! -f .env.production ]; then
        cat > .env.production << 'EOF'
# 数据库配置
MONGODB_URI=mongodb://smartvillage:password123@mongodb:27017/smart_village
MONGO_ROOT_USERNAME=smartvillage
MONGO_ROOT_PASSWORD=password123

# Redis配置
REDIS_PASSWORD=redis123

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 客户端URL
CLIENT_URL=https://your-domain.com

# 第三方服务配置
BAIDU_TTS_KEY=your-baidu-tts-key
TENCENT_OCR_KEY=your-tencent-ocr-key

# 监控配置
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin123

# 应用配置
NODE_ENV=production
PORT=3001
EOF
        log_warning "已创建默认环境变量文件，请根据实际情况修改 .env.production"
    else
        log_info "环境变量文件已存在，跳过创建"
    fi
}

# 构建和启动服务
deploy_services() {
    log_info "构建和启动服务..."

    # 构建镜像
    log_info "构建应用镜像..."
    docker-compose -f docker-compose.prod.yml build

    # 启动服务
    log_info "启动所有服务..."
    docker-compose -f docker-compose.prod.yml up -d

    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30

    # 检查服务状态
    log_info "检查服务状态..."
    docker-compose -f docker-compose.prod.yml ps

    log_success "服务部署完成"
}

# 数据库初始化
init_database() {
    log_info "初始化数据库..."

    # 等待MongoDB启动
    log_info "等待MongoDB启动..."
    until docker-compose -f docker-compose.prod.yml exec -T mongodb mongosh --eval "db.adminCommand('ismaster')" &> /dev/null; do
        sleep 5
    done

    log_success "MongoDB已启动"

    # 创建索引和初始数据
    docker-compose -f docker-compose.prod.yml exec smart-village-api npm run init-db

    log_success "数据库初始化完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."

    # 检查API服务
    api_healthy=false
    for i in {1..10}; do
        if curl -f http://localhost:3001/health &> /dev/null; then
            api_healthy=true
            break
        fi
        sleep 5
    done

    if [ "$api_healthy" = true ]; then
        log_success "API服务健康检查通过"
    else
        log_error "API服务健康检查失败"
        return 1
    fi

    # 检查数据库连接
    db_healthy=false
    for i in {1..10}; do
        if docker-compose -f docker-compose.prod.yml exec -T mongodb mongosh --eval "db.runCommand({ping: 1})" &> /dev/null; then
            db_healthy=true
            break
        fi
        sleep 5
    done

    if [ "$db_healthy" = true ]; then
        log_success "数据库健康检查通过"
    else
        log_error "数据库健康检查失败"
        return 1
    fi

    log_success "所有服务健康检查通过"
}

# 显示部署信息
show_deployment_info() {
    log_info "部署信息："
    echo "================================"
    echo "应用访问地址: http://localhost"
    echo "API服务地址: http://localhost:3001"
    echo "Grafana监控: http://localhost:3000 (admin/admin123)"
    echo "Prometheus: http://localhost:9090"
    echo "================================"
    echo ""
    echo "常用命令："
    echo "查看日志: docker-compose -f docker-compose.prod.yml logs -f"
    echo "停止服务: docker-compose -f docker-compose.prod.yml down"
    echo "重启服务: docker-compose -f docker-compose.prod.yml restart"
    echo ""
}

# 主函数
main() {
    log_info "开始部署智慧乡村综合服务平台..."

    # 检查环境
    check_dependencies
    check_env_vars

    # 准备部署环境
    create_directories
    generate_nginx_config
    generate_env_file

    # 部署服务
    deploy_services

    # 初始化数据库
    init_database

    # 健康检查
    health_check

    # 显示部署信息
    show_deployment_info

    log_success "智慧乡村综合服务平台部署完成！"
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主函数
main "$@"