#!/bin/bash

# 智慧乡村综合服务平台启动脚本
# 支持开发、测试、生产环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置
APP_NAME="智慧乡村综合服务平台"
VERSION="1.0.0"

# 显示Logo
show_logo() {
    echo -e "${CYAN}"
    cat << "EOF"
 ______  _   _   _____  ____    _____
|  ____| | | | |_   _|/ __ \  |  __  |
| |__  | | | | | | | |  | | | |__|
|   __| | | | | | | | |  | |  __/
| |    | |_| | | | | |__| | | |
|_|     \___/  \_|  \____/  \_|

${NC}"
    echo -e "${CYAN}               综合服务管理平台 v${VERSION}${NC}"
    echo -e "${CYAN}=================================================${NC}"
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}用法: $0 [命令] [选项]${NC}"
    echo ""
    echo -e "${YELLOW}命令:${NC}"
    echo -e "  ${GREEN}dev${NC}        启动开发环境"
    echo -e "  ${GREEN}prod${NC}       启动生产环境"
    echo -e "  ${GREEN}test${NC}       启动测试环境"
    echo -e "  ${GREEN}status${NC}     查看服务状态"
    echo -e "  ${GREEN}stop${NC}       停止所有服务"
    echo -e "  ${GREEN}restart${NC}    重启所有服务"
    echo -e "  ${GREEN}logs${NC}       查看日志"
    echo -e "  ${GREEN}health${NC}     健康检查"
    echo -e "  ${GREEN}init${NC}       初始化项目"
    echo -e "  ${GREEN}backup${NC}     备份数据"
    echo -e "  ${GREEN}restore${NC}    恢复数据"
    echo ""
    echo -e "${YELLOW}选项:${NC}"
    echo -e "  ${GREEN}--build${NC}    构建项目"
    echo -e "  ${GREEN}--no-build${NC} 跳过构建"
    echo -e "  ${GREEN}--clean${NC}    清理缓存和临时文件"
    echo ""
    echo -e "${YELLOW}示例:${NC}"
    echo -e "  $0 dev --build          # 构建并启动开发环境"
    echo -e "  $0 prod                 # 启动生产环境"
    echo -e "  $0 status              # 查看服务状态"
}

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

log_debug() {
    echo -e "${PURPLE}[DEBUG]${NC} $1"
}

# 检查环境
check_environment() {
    log_info "检查运行环境..."

    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js未安装，请先安装Node.js"
        exit 1
    fi

    # 检查npm
    if ! command -v npm &> /dev/null; then
        log_error "npm未安装，请先安装npm"
        exit 1
    fi

    # 检查Docker（如果需要）
    if [ "$ENVIRONMENT" = "production" ] && ! command -v docker &> /dev/null; then
        log_error "生产环境需要Docker，请先安装Docker"
        exit 1
    fi

    log_success "环境检查通过"
}

# 检查端口占用
check_ports() {
    log_info "检查端口占用..."

    local ports=("$@")
    local occupied=()

    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            occupied+=("$port")
        fi
    done

    if [ ${#occupied[@]} -gt 0 ]; then
        log_warning "以下端口已被占用: ${occupied[*]}"
        read -p "是否继续启动? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 构建项目
build_project() {
    if [ "$SKIP_BUILD" = true ]; then
        log_info "跳过构建步骤"
        return
    fi

    log_info "构建项目..."

    # 安装依赖
    log_info "安装依赖..."
    npm install

    # 构建前端
    log_info "构建前端..."
    cd client && npm install && npm run build && cd ..

    log_success "项目构建完成"
}

# 启动开发环境
start_development() {
    ENVIRONMENT="development"
    log_info "启动开发环境..."

    check_ports 3000 3001 5000 27017 6379

    # 创建必要的目录
    mkdir -p uploads/{announcements,emergencies,residents,meetings,tasks}
    mkdir -p logs

    # 启动数据库（如果使用本地MongoDB）
    if [ "$USE_DOCKER_DB" = "true" ]; then
        log_info "启动数据库容器..."
        docker-compose -f docker-compose.dev.yml up -d mongodb redis
    fi

    # 初始化数据库
    log_info "初始化数据库..."
    npm run init-db

    # 启动应用
    log_info "启动应用服务..."
    npm run dev &

    # 启动客户端
    log_info "启动客户端..."
    cd client && npm run dev &
    cd ..

    log_success "开发环境启动完成"
    log_info "访问地址："
    echo "  - 前端应用: http://localhost:3000"
    echo "  - API服务: http://localhost:3001"
    echo "  - 监控面板: http://localhost:3001/monitoring"
}

# 启动生产环境
start_production() {
    ENVIRONMENT="production"
    log_info "启动生产环境..."

    # 检查环境文件
    if [ ! -f .env.production ]; then
        log_error "未找到 .env.production 文件"
        exit 1
    fi

    # 使用Docker Compose
    if [ -f docker-compose.prod.yml ]; then
        log_info "使用Docker Compose启动生产环境..."
        docker-compose -f docker-compose.prod.yml up -d --build
    else
        log_error "未找到 docker-compose.prod.yml 文件"
        exit 1
    fi

    log_success "生产环境启动完成"
}

# 启动测试环境
start_testing() {
    ENVIRONMENT="testing"
    log_info "启动测试环境..."

    check_ports 3001 27017

    # 创建测试数据库
    log_info "创建测试数据库..."
    docker-compose -f docker-compose.test.yml up -d

    # 运行测试
    log_info "运行测试套件..."
    npm test

    log_success "测试环境启动完成"
}

# 查看服务状态
show_status() {
    log_info "服务状态："

    if [ "$ENVIRONMENT" = "production" ] && [ -f docker-compose.prod.yml ]; then
        docker-compose -f docker-compose.prod.yml ps
    elif [ -f docker-compose.dev.yml ]; then
        docker-compose -f docker-compose.dev.yml ps
    else
        log_info "检查进程状态..."
        ps aux | grep -E "(node|npm)" | grep -v grep || log_info "没有运行中的服务"
    fi
}

# 停止服务
stop_services() {
    log_info "停止所有服务..."

    if [ -f docker-compose.prod.yml ]; then
        docker-compose -f docker-compose.prod.yml down
    fi

    if [ -f docker-compose.dev.yml ]; then
        docker-compose -f docker-compose.dev.yml down
    fi

    # 杀死Node.js进程
    pkill -f "node.*src/app.js" 2>/dev/null || true
    pkill -f "npm.*dev" 2>/dev/null || true

    log_success "所有服务已停止"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    stop_services
    sleep 2

    case "$ENVIRONMENT" in
        "production")
            start_production
            ;;
        "testing")
            start_testing
            ;;
        *)
            start_development
            ;;
    esac
}

# 查看日志
show_logs() {
    log_info "显示服务日志..."

    if [ -f docker-compose.prod.yml ]; then
        docker-compose -f docker-compose.prod.yml logs -f
    elif [ -f docker-compose.dev.yml ]; then
        docker-compose -f docker-compose.dev.yml logs -f
    else
        tail -f logs/*.log 2>/dev/null || log_info "没有找到日志文件"
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."

    # 检查API服务
    if curl -f http://localhost:3001/health &> /dev/null; then
        log_success "✅ API服务健康"
    else
        log_error "❌ API服务不健康"
    fi

    # 检查数据库连接
    if docker-compose -f docker-compose.dev.yml exec -T mongodb mongosh --eval "db.runCommand({ping: 1})" &> /dev/null; then
        log_success "✅ 数据库连接正常"
    else
        log_warning "⚠️ 数据库连接异常"
    fi

    # 检查Redis连接
    if docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping &> /dev/null; then
        log_success "✅ Redis连接正常"
    else
        log_warning "⚠️ Redis连接异常"
    fi
}

# 初始化项目
init_project() {
    log_info "初始化项目..."

    # 安装依赖
    log_info "安装项目依赖..."
    npm install

    # 初始化数据库
    log_info "初始化数据库..."
    npm run init-db

    # 创建必要目录
    mkdir -p uploads/{announcements,emergencies,residents,meetings,tasks}
    mkdir -p logs

    log_success "项目初始化完成"
}

# 备份数据
backup_data() {
    log_info "备份数据..."

    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # 备份MongoDB
    if docker-compose -f docker-compose.dev.yml ps mongodb &> /dev/null; then
        log_info "备份MongoDB数据..."
        docker-compose -f docker-compose.dev.yml exec -T mongodb mongodump --out /backup
        docker cp $(docker-compose -f docker-compose.dev.yml ps -q mongodb):/backup "$BACKUP_DIR/mongodb"
    fi

    # 备份上传文件
    if [ -d "uploads" ]; then
        log_info "备份上传文件..."
        cp -r uploads "$BACKUP_DIR/"
    fi

    log_success "数据备份完成: $BACKUP_DIR"
}

# 恢复数据
restore_data() {
    local backup_dir=$1
    if [ -z "$backup_dir" ]; then
        log_error "请指定备份目录"
        exit 1
    fi

    if [ ! -d "$backup_dir" ]; then
        log_error "备份目录不存在: $backup_dir"
        exit 1
    fi

    log_info "恢复数据从: $backup_dir"

    # 恢复MongoDB
    if [ -d "$backup_dir/mongodb" ]; then
        log_info "恢复MongoDB数据..."
        docker cp "$backup_dir/mongodb" $(docker-compose -f docker-compose.dev.yml ps -q mongodb):/restore
        docker-compose -f docker-compose.dev.yml exec -T mongodb mongorestore --drop /restore
    fi

    log_success "数据恢复完成"
}

# 清理缓存
clean_cache() {
    log_info "清理缓存和临时文件..."

    # 清理npm缓存
    npm cache clean --force

    # 清理node_modules
    if [ -d "node_modules" ]; then
        rm -rf node_modules
        log_info "清理 node_modules"
    fi

    # 清理前端构建文件
    if [ -d "client/dist" ]; then
        rm -rf client/dist
        log_info "清理前端构建文件"
    fi

    # 清理日志
    if [ -d "logs" ]; then
        find logs -name "*.log" -delete 2>/dev/null || true
        log_info "清理日志文件"
    fi

    log_success "缓存清理完成"
}

# 信号处理
cleanup() {
    log_info "正在清理..."
    stop_services
    exit 0
}

# 注册信号处理
trap cleanup SIGINT SIGTERM

# 主函数
main() {
    # 显示Logo
    show_logo

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --build)
                BUILD=true
                shift
                ;;
            --no-build)
                SKIP_BUILD=true
                shift
                ;;
            --clean)
                clean_cache
                exit 0
                ;;
            dev)
                COMMAND="dev"
                shift
                ;;
            prod|production)
                COMMAND="production"
                shift
                ;;
            test)
                COMMAND="test"
                shift
                ;;
            status)
                COMMAND="status"
                shift
                ;;
            stop)
                COMMAND="stop"
                shift
                ;;
            restart)
                COMMAND="restart"
                shift
                ;;
            logs)
                COMMAND="logs"
                shift
                ;;
            health)
                COMMAND="health"
                shift
                ;;
            init)
                COMMAND="init"
                shift
                ;;
            backup)
                COMMAND="backup"
                shift
                ;;
            restore)
                COMMAND="restore"
                RESTORE_DIR="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知命令: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 执行命令
    case "${COMMAND:-help}" in
        dev)
            check_environment
            if [ "$BUILD" = true ]; then
                build_project
            fi
            start_development
            ;;
        production)
            check_environment
            start_production
            ;;
        test)
            check_environment
            start_testing
            ;;
        status)
            show_status
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        logs)
            show_logs
            ;;
        health)
            health_check
            ;;
        init)
            init_project
            ;;
        backup)
            backup_data
            ;;
        restore)
            restore_data "$RESTORE_DIR"
            ;;
        help)
            show_help
            ;;
    esac
}

# 执行主函数
main "$@"