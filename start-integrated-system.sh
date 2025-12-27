#!/bin/bash

# 智慧村庄平台 - 实时计算引擎集成启动脚本
# 启动完整的应用系统，包括实时计算引擎

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

# 显示横幅
show_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                智慧村庄平台 - 实时计算引擎集成系统              ║"
    echo "║                        Smart Village Platform                   ║"
    echo "║                                                               ║"
    echo "║  🚀 实时数据处理  📊 多源数据整合  ⚡ 动态阈值监控            ║"
    echo "║  🛡️ 智能预警系统  📈 性能监控分析  🔔 实时事件通知            ║"
    echo "║                                                               ║"
    echo "║                    Version: 1.0.0                               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."

    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js未安装，请先安装Node.js 18.x或更高版本"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2)
    log_success "Node.js版本: $NODE_VERSION"

    # 检查npm
    if ! command -v npm &> /dev/null; then
        log_error "npm未安装"
        exit 1
    fi

    # 检查Redis
    if ! command -v redis-cli &> /dev/null; then
        log_warning "Redis未安装或不在PATH中，请确保Redis服务正在运行"
    else
        if redis-cli ping &> /dev/null; then
            log_success "Redis服务运行正常"
        else
            log_warning "Redis服务未运行，正在尝试启动..."
            if command -v systemctl &> /dev/null; then
                sudo systemctl start redis || log_warning "无法启动Redis服务"
            else
                log_warning "请手动启动Redis服务"
            fi
        fi
    fi

    # 检查MongoDB
    if ! command -v mongod &> /dev/null && ! command -v mongo &> /dev/null; then
        log_warning "MongoDB未安装或不在PATH中"
    else
        if command -v mongosh &> /dev/null; then
            if mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
                log_success "MongoDB服务运行正常"
            else
                log_warning "MongoDB服务未运行，正在尝试启动..."
                if command -v systemctl &> /dev/null; then
                    sudo systemctl start mongod || log_warning "无法启动MongoDB服务"
                else
                    log_warning "请手动启动MongoDB服务"
                fi
            fi
        fi
    fi

    # 检查PM2
    if ! command -v pm2 &> /dev/null; then
        log_info "安装PM2进程管理器..."
        npm install -g pm2
    fi

    log_success "依赖检查完成"
}

# 安装项目依赖
install_dependencies() {
    log_info "安装项目依赖..."

    if [ ! -f "package.json" ]; then
        log_error "package.json文件不存在"
        exit 1
    fi

    npm install

    if [ -d "client" ] && [ -f "client/package.json" ]; then
        log_info "安装客户端依赖..."
        cd client && npm install && cd ..
    fi

    if [ -d "gateway" ] && [ -f "gateway/package.json" ]; then
        log_info "安装网关依赖..."
        cd gateway && npm install && cd ..
    fi

    log_success "依赖安装完成"
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."

    mkdir -p logs
    mkdir -p uploads
    mkdir -p public
    mkdir -p config

    log_success "目录创建完成"
}

# 设置环境变量
setup_environment() {
    log_info "设置环境变量..."

    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_info "已从.env.example创建.env文件，请根据需要修改配置"
        else
            cat > .env << EOF
# 基础配置
NODE_ENV=development
PORT=3001

# 数据库配置
MONGO_URI=mongodb://localhost:27017/smart_village
REDIS_URL=redis://localhost:6379

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# 服务配置
CLIENT_URL=http://localhost:3000
GATEWAY_PORT=8080

# 实时计算配置
REALTIME_ENABLED=true
REALTIME_CACHE_TIMEOUT=600000
BEHAVIOR_TRACKING_ENABLED=true

# 日志配置
LOG_LEVEL=info
LOG_DIR=./logs

# 安全配置
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000
EOF
            log_info "已创建默认.env文件"
        fi
    fi

    log_success "环境变量设置完成"
}

# 初始化数据库
init_database() {
    log_info "初始化数据库..."

    if [ -f "package.json" ] && grep -q "init-db" package.json; then
        npm run init-db || log_warning "数据库初始化失败，请手动检查"
    fi

    log_success "数据库初始化完成"
}

# 启动应用服务
start_services() {
    log_info "启动应用服务..."

    # 启动主服务（包含实时计算引擎）
    log_info "启动主服务（端口 3001）..."
    pm2 start src/app.js --name "smart-village-main" || {
        log_error "主服务启动失败"
        exit 1
    }

    # 启动网关服务
    if [ -d "gateway" ]; then
        log_info "启动网关服务（端口 8080）..."
        cd gateway
        pm2 start app.js --name "smart-village-gateway" || {
            log_error "网关服务启动失败"
            exit 1
        }
        cd ..
    fi

    # 构建并启动前端（开发模式）
    if [ "$NODE_ENV" = "development" ] && [ -d "client" ]; then
        log_info "启动前端开发服务器（端口 3000）..."
        cd client
        npm run dev &
        FRONTEND_PID=$!
        cd ..

        # 保存前端进程ID
        echo $FRONTEND_PID > .frontend.pid
        log_info "前端开发服务器已启动 (PID: $FRONTEND_PID)"
    fi

    log_success "所有服务启动完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."

    sleep 5  # 等待服务启动

    # 检查主服务
    if curl -f -s http://localhost:3001/health &> /dev/null; then
        log_success "✅ 主服务健康检查通过"
    else
        log_error "❌ 主服务健康检查失败"
        return 1
    fi

    # 检查实时计算状态
    if curl -f -s http://localhost:3001/api/v1/realtime/status &> /dev/null; then
        log_success "✅ 实时计算引擎健康检查通过"
    else
        log_warning "⚠️  实时计算引擎可能未完全启动"
    fi

    # 检查网关服务
    if curl -f -s http://localhost:8080/health &> /dev/null; then
        log_success "✅ 网关服务健康检查通过"
    else
        log_warning "⚠️  网关服务健康检查失败"
    fi

    # 检查前端服务
    if [ "$NODE_ENV" = "development" ]; then
        if curl -f -s http://localhost:3000 &> /dev/null; then
            log_success "✅ 前端服务健康检查通过"
        else
            log_warning "⚠️  前端服务可能未完全启动"
        fi
    fi

    return 0
}

# 显示启动信息
show_startup_info() {
    echo ""
    log_success "🎉 智慧村庄平台启动成功！"
    echo ""
    echo -e "${BLUE}📋 服务访问地址:${NC}"
    echo "   🌐 前端应用:     http://localhost:3000"
    echo "   🚪 API网关:      http://localhost:8080"
    echo "   ⚡ 主服务:       http://localhost:3001"
    echo "   🏥 健康检查:     http://localhost:3001/health"
    echo ""
    echo -e "${BLUE}📊 实时计算接口:${NC}"
    echo "   📈 实时状态:     http://localhost:3001/api/v1/realtime/status"
    echo "   🔔 实时订阅:     http://localhost:3001/api/v1/realtime/subscribe"
    echo "   📊 综合指标:     http://localhost:3001/api/v1/realtime/metrics"
    echo ""
    echo -e "${BLUE}🔧 管理命令:${NC}"
    echo "   pm2 list                          # 查看所有进程"
    echo "   pm2 logs smart-village-main      # 查看主服务日志"
    echo "   pm2 logs smart-village-gateway   # 查看网关日志"
    echo "   pm2 restart all                  # 重启所有服务"
    echo "   pm2 stop all                     # 停止所有服务"
    echo ""
    echo -e "${BLUE}📝 日志文件:${NC}"
    echo "   📄 应用日志:     ./logs/"
    echo "   📄 PM2日志:      ~/.pm2/logs/"
    echo ""
    echo -e "${BLUE}🛑 停止服务:${NC}"
    echo "   ./stop-integrated-system.sh       # 停止所有服务"
    echo ""
    echo -e "${GREEN}📖 更多信息请查看文档: ./docs/REALTIME_INTEGRATION_DEPLOYMENT.md${NC}"
    echo ""
}

# 错误处理
handle_error() {
    log_error "启动过程中发生错误，正在清理..."

    # 停止已启动的服务
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true

    # 停止前端服务
    if [ -f ".frontend.pid" ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        kill $FRONTEND_PID 2>/dev/null || true
        rm .frontend.pid
    fi

    log_error "清理完成，请检查错误信息并重试"
    exit 1
}

# 主函数
main() {
    # 检查是否在项目根目录
    if [ ! -f "package.json" ]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi

    # 设置错误处理
    trap handle_error ERR

    show_banner

    # 解析命令行参数
    SKIP_DEPS=false
    SKIP_ENV=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --skip-env)
                SKIP_ENV=true
                shift
                ;;
            --production)
                export NODE_ENV=production
                shift
                ;;
            --help|-h)
                echo "用法: $0 [选项]"
                echo ""
                echo "选项:"
                echo "  --skip-deps     跳过依赖安装"
                echo "  --skip-env      跳过环境变量设置"
                echo "  --production    生产模式启动"
                echo "  --help, -h      显示帮助信息"
                exit 0
                ;;
            *)
                log_error "未知参数: $1"
                exit 1
                ;;
        esac
    done

    log_info "启动模式: ${NODE_ENV:-development}"

    # 执行启动步骤
    check_dependencies

    if [ "$SKIP_DEPS" = false ]; then
        install_dependencies
    fi

    create_directories

    if [ "$SKIP_ENV" = false ]; then
        setup_environment
    fi

    init_database
    start_services

    if health_check; then
        show_startup_info
    else
        log_error "健康检查失败，请查看日志获取详细信息"
        exit 1
    fi
}

# 执行主函数
main "$@"