#!/bin/bash

# 智慧乡村综合服务平台 - 生产环境部署脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "此脚本需要root权限运行"
        exit 1
    fi
}

# 检查Docker和Docker Compose
check_dependencies() {
    log_step "检查系统依赖..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi

    log_info "Docker和Docker Compose检查通过"
}

# 创建必要的目录
create_directories() {
    log_step "创建必要的目录..."

    mkdir -p uploads logs config/encryption-keys mongodb-backup redis nginx/ssl monitoring

    log_info "目录创建完成"
}

# 生成配置文件
generate_configs() {
    log_step "生成配置文件..."

    # 复制环境配置示例
    if [ ! -f .env.production ]; then
        cp .env.production.example .env.production
        log_warn "请编辑 .env.production 文件填入实际配置值"
        log_warn "包含数据库密码、JWT密钥等重要配置"
    fi

    # 复制nginx配置
    if [ ! -f nginx/nginx.conf ]; then
        cp nginx/nginx.conf.example nginx/nginx.conf
    fi

    # 复制Redis配置
    if [ ! -f redis.conf ]; then
        cp redis.conf.example redis.conf
    fi

    log_info "配置文件生成完成"
}

# 构建Docker镜像
build_image() {
    log_step "构建Docker镜像..."

    docker build -t smart-village-platform:latest .

    log_info "Docker镜像构建完成"
}

# 启动服务
start_services() {
    log_step "启动生产环境服务..."

    # 停止可能运行的服务
    docker-compose -f docker-compose.prod.yml down || true

    # 启动基础服务（数据库、缓存）
    log_info "启动基础服务..."
    docker-compose -f docker-compose.prod.yml up -d mongodb redis

    # 等待数据库启动
    log_info "等待数据库启动..."
    sleep 30

    # 检查数据库连接
    while ! docker-compose -f docker-compose.prod.yml exec -T mongodb mongosh --eval "db.adminCommand('ismaster')" &> /dev/null; do
        log_info "等待MongoDB启动..."
        sleep 5
    done

    # 启动应用服务
    log_info "启动应用服务..."
    docker-compose -f docker-compose.prod.yml up -d smart-village-api

    # 等待应用启动
    log_info "等待应用启动..."
    sleep 30

    # 启动监控服务
    log_info "启动监控服务..."
    docker-compose -f docker-compose.prod.yml up -d prometheus grafana loki

    # 启动反向代理
    log_info "启动反向代理..."
    docker-compose -f docker-compose.prod.yml up -d nginx

    log_info "所有服务启动完成"
}

# 检查服务健康状态
check_health() {
    log_step "检查服务健康状态..."

    # 检查API服务
    API_URL="http://localhost:3001/api/health"
    log_info "检查API服务: $API_URL"

    for i in {1..30}; do
        if curl -f -s "$API_URL" > /dev/null; then
            log_info "✅ API服务运行正常"
            break
        else
            log_warn "等待API服务启动... (尝试 $i/30)"
            sleep 2
        fi
    done

    # 检查数据库
    if docker-compose -f docker-compose.prod.yml exec -T mongodb mongosh --eval "db.adminCommand('listCollections')" &> /dev/null; then
        log_info "✅ MongoDB运行正常"
    else
        log_error "❌ MongoDB连接失败"
        return 1
    fi

    # 检查Redis
    if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping | grep -q "PONG"; then
        log_info "✅ Redis运行正常"
    else
        log_error "❌ Redis连接失败"
        return 1
    fi

    # 检查前端访问
    FRONTEND_URL="http://localhost"
    log_info "检查前端访问: $FRONTEND_URL"

    for i in {1..30}; do
        if curl -f -s "$FRONTEND_URL" > /dev/null; then
            log_info "✅ 前端访问正常"
            break
        else
            log_warn "等待前端启动... (尝试 $i/30)"
            sleep 2
        fi
    done

    log_info "所有服务健康检查通过"
}

# 数据库初始化
init_database() {
    log_step "初始化数据库..."

    # 运行数据库初始化脚本
    if [ -f scripts/init-db.js ]; then
        docker-compose -f docker-compose.prod.yml exec -T smart-village-api node scripts/init-db.js
        log_info "数据库初始化完成"
    else
        log_warn "未找到数据库初始化脚本，跳过"
    fi

    # 创建管理员用户
    if [ -f create-admin.js ]; then
        docker-compose -f docker-compose.prod.yml exec -T smart-village-api node create-admin.js
        log_info "管理员用户创建完成"
    else
        log_warn "未找到管理员创建脚本，跳过"
    fi
}

# 设置自动备份
setup_backup() {
    log_step "设置自动备份..."

    # 创建备份脚本
    cat > backup-database.sh << 'EOF'
#!/bin/bash

# 数据库备份脚本
BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "开始备份数据库..."
mongodump --host=mongodb --port=27017 --username=admin --password=your_password --out="$BACKUP_DIR"
echo "数据库备份完成: $BACKUP_DIR"

# 清理过期备份
find /backup -type d -name "backup_*" -mtime +30 -exec rm -rf {} \;
echo "过期备份清理完成"
EOF

    chmod +x backup-database.sh

    # 添加到crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * /app/backup-database.sh") | crontab -

    log_info "自动备份设置完成"
}

# 配置监控
setup_monitoring() {
    log_step "配置监控系统..."

    # 创建Grafana数据源配置
    cat > monitoring/grafana/datasources.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true
EOF

    log_info "监控系统配置完成"
}

# 创建启动脚本
create_start_script() {
    cat > start-production.sh << 'EOF
#!/bin/bash

# 智慧乡村综合服务平台 - 生产环境启动脚本

set -e

echo "启动智慧乡村综合服务平台..."

# 检查环境
if [ ! -f .env.production ]; then
    echo "错误: .env.production 文件不存在"
    exit 1
fi

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 显示服务状态
echo "服务状态:"
docker-compose -f docker-compose.prod.yml ps

echo "查看日志:"
echo "应用服务: docker-compose -f docker-compose.prod.yml logs -f smart-village-api"
echo "数据库: docker-compose -f docker-compose.prod.yml logs -f mongodb"
echo "Redis: docker-compose -f docker-compose.prod.yml logs -f redis"
echo "Nginx: docker-compose -f docker-compose.prod.yml logs -f nginx"

echo "平台访问地址:"
echo "前端: http://your-domain.com"
echo "API: http://your-domain.com/api"
echo "监控面板: http://your-domain.com:3000"
EOF

    chmod +x start-production.sh

    log_info "启动脚本创建完成"
}

# 显示访问信息
show_access_info() {
    echo
    echo "🎉 智慧乡村综合服务平台部署完成！"
    echo
    echo "📱 访问地址:"
    echo "   前端: http://your-domain.com"
    echo "   API: http://your-domain.com/api"
    echo "   监控面板: http://your-domain.com:3000"
    echo
    echo "🔧 管理命令:"
    echo "   启动服务: ./start-production.sh"
    echo "   停止服务: docker-compose -f docker-compose.prod.yml down"
    echo "   查看日志: docker-compose -f docker-compose.prod.yml logs -f [服务名]"
    echo "   重启服务: docker-compose -f docker-compose.prod.yml restart [服务名]"
    echo
    echo "📊 监控面板:"
    echo "   Grafana: http://your-domain.com:3000 (admin/admin)"
    echo "   Prometheus: http://your-domain.com:9090"
    echo
    echo "💡 重要提示:"
    echo "   1. 请修改 .env.production 文件中的配置值"
    echo "   2. 确保域名和SSL证书配置正确"
    echo "   3. 定期检查服务状态和日志"
    echo   4. 数据库备份脚本已设置，每天凌晨2点自动执行"
    echo
}

# 主函数
main() {
    echo "🚀 智慧乡村综合服务平台 - 生产环境部署"
    echo "=========================================="

    check_root
    check_dependencies
    create_directories
    generate_configs
    build_image
    start_services
    check_health
    init_database
    setup_backup
    setup_monitoring
    create_start_script
    show_access_info

    echo "✅ 生产环境部署完成！"
}

# 错误处理
trap 'log_error "部署过程中出现错误，请检查日志"; exit 1' ERR

# 执行主函数
main "$@"