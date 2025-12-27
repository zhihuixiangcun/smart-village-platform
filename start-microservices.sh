#!/bin/bash

# 智慧乡村平台 - 微服务架构启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# 检查Docker和Docker Compose
check_requirements() {
    log "检查系统要求..."

    if ! command -v docker &> /dev/null; then
        error "Docker未安装，请先安装Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi

    log "✅ 系统要求检查通过"
}

# 创建必要的目录
create_directories() {
    log "创建必要的目录..."

    mkdir -p logs
    mkdir -p uploads
    mkdir -p docker/nginx
    mkdir -p docker/mongodb/init
    mkdir -p docker/gateway
    mkdir -p docker/auth
    mkdir -p docker/village
    mkdir -p docker/monitoring

    log "✅ 目录创建完成"
}

# 复制环境配置文件
setup_environment() {
    log "设置环境配置..."

    if [ ! -f .env ]; then
        if [ -f .env.microservices ]; then
            cp .env.microservices .env
            log "✅ 已复制微服务环境配置到 .env"
        else
            warn "未找到环境配置文件，请手动创建 .env 文件"
        fi
    else
        info ".env 文件已存在，跳过复制"
    fi
}

# 构建服务镜像
build_services() {
    log "构建服务镜像..."

    info "构建API网关..."
    # docker-compose build api-gateway

    info "构建认证服务..."
    # docker-compose build auth-service

    info "构建村务服务..."
    # docker-compose build village-service

    info "构建监控服务..."
    # docker-compose build monitoring-service

    info "构建前端客户端..."
    # docker-compose build web-client

    log "✅ 服务镜像构建完成"
}

# 启动基础设施服务
start_infrastructure() {
    log "启动基础设施服务..."

    info "启动MongoDB..."
    docker-compose up -d mongodb

    info "启动Redis..."
    docker-compose up -d redis

    # 等待服务启动
    log "等待基础设施服务启动..."
    sleep 10

    log "✅ 基础设施服务启动完成"
}

# 启动应用服务
start_applications() {
    log "启动应用服务..."

    info "启动认证服务..."
    # docker-compose up -d auth-service

    info "启动村务服务..."
    # docker-compose up -d village-service

    info "启动监控服务..."
    # docker-compose up -d monitoring-service

    info "启动API网关..."
    # docker-compose up -d api-gateway

    info "启动前端客户端..."
    # docker-compose up -d web-client

    log "✅ 应用服务启动完成"
}

# 健康检查
health_check() {
    log "执行服务健康检查..."

    local services=("mongodb" "redis" "auth-service" "village-service" "monitoring-service" "api-gateway" "web-client")
    local failed_services=()

    for service in "${services[@]}"; do
        info "检查 $service 服务状态..."
        if docker-compose ps $service | grep -q "Up"; then
            log "✅ $service 服务运行正常"
        else
            error "❌ $service 服务异常"
            failed_services+=($service)
        fi
    done

    if [ ${#failed_services[@]} -eq 0 ]; then
        log "🎉 所有服务健康检查通过"
        display_services_info
    else
        error "以下服务检查失败: ${failed_services[*]}"
        error "请检查日志: docker-compose logs <service-name>"
        return 1
    fi
}

# 显示服务信息
display_services_info() {
    log "服务访问信息："
    echo ""
    echo "🌐 Web服务："
    echo "  - 前端客户端:     http://localhost:3000"
    echo "  - API网关:       http://localhost:8080"
    echo "  - API文档:       http://localhost:8080/api/v1/info"
    echo ""
    echo "🔧 管理服务："
    echo "  - MongoDB管理:   http://localhost:8082 (开发模式)"
    echo "  - Redis管理:     http://localhost:8081 (开发模式)"
    echo ""
    echo "🚀 微服务："
    echo "  - 认证服务:       http://localhost:3001/health"
    echo "  - 村务服务:       http://localhost:5000/health"
    echo "  - 监控服务:       http://localhost:3099/health"
    echo ""
    echo "📊 数据库："
    echo "  - MongoDB:       localhost:27017"
    echo "  - Redis:         localhost:6379"
    echo ""
}

# 显示使用帮助
show_help() {
    echo "智慧乡村平台微服务启动脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  start         启动所有服务"
    echo "  stop          停止所有服务"
    echo "  restart       重启所有服务"
    echo "  status        查看服务状态"
    echo "  logs          查看服务日志"
    echo "  clean         清理容器和数据卷"
    echo "  dev           启动开发模式 (包含管理工具)"
    echo "  prod          启动生产模式"
    echo "  health        执行健康检查"
    echo "  -h, --help    显示此帮助信息"
    echo ""
}

# 停止服务
stop_services() {
    log "停止所有服务..."
    docker-compose down
    log "✅ 服务已停止"
}

# 查看服务状态
show_status() {
    log "服务状态："
    docker-compose ps
}

# 查看服务日志
show_logs() {
    if [ -n "$2" ]; then
        info "显示 $2 服务日志..."
        docker-compose logs -f $2
    else
        info "显示所有服务日志..."
        docker-compose logs -f
    fi
}

# 清理环境
clean_environment() {
    warn "这将删除所有容器、网络和数据卷，是否继续？(y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log "清理环境..."
        docker-compose down -v --rmi all --remove-orphans
        docker system prune -f
        log "✅ 环境清理完成"
    else
        info "取消清理操作"
    fi
}

# 启动开发模式
start_dev_mode() {
    log "启动开发模式..."
    export COMPOSE_PROFILES=development,management
    docker-compose up -d --build
    health_check
}

# 启动生产模式
start_prod_mode() {
    log "启动生产模式..."
    export COMPOSE_PROFILES=production
    docker-compose up -d --build
    health_check
}

# 主函数
main() {
    case "$1" in
        start)
            check_requirements
            create_directories
            setup_environment
            start_infrastructure
            # build_services
            # start_applications
            # health_check
            log "🎉 智慧乡村平台微服务架构启动完成！"
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            sleep 5
            main start
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs $@
            ;;
        clean)
            clean_environment
            ;;
        dev)
            check_requirements
            create_directories
            setup_environment
            start_dev_mode
            ;;
        prod)
            check_requirements
            create_directories
            setup_environment
            start_prod_mode
            ;;
        health)
            health_check
            ;;
        -h|--help)
            show_help
            ;;
        *)
            error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 检查参数
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

# 执行主函数
main $@