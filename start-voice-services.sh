#!/bin/bash

# 智慧乡村语音交互系统启动脚本
# 启动所有必要的服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 命令未找到，请先安装"
        exit 1
    fi
}

# 检查端口是否被占用
check_port() {
    local port=$1
    local service=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warn "端口 $port 已被占用 ($service)"
        log_info "尝试停止占用端口的进程..."
        pkill -f ":$port" || true
        sleep 2
    fi
}

# 等待服务启动
wait_for_service() {
    local url=$1
    local service=$2
    local max_attempts=30
    local attempt=1

    log_info "等待 $service 启动..."

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            log_info "$service 已启动"
            return 0
        fi

        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    log_error "$service 启动超时"
    return 1
}

# 创建必要的目录
create_directories() {
    log_step "创建必要的目录..."

    directories=("logs" "uploads" "temp" "python-voice-service/logs" "python-voice-service/data" "python-voice-service/models")

    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_info "创建目录: $dir"
        fi
    done
}

# 检查环境配置
check_environment() {
    log_step "检查环境配置..."

    # 检查环境变量文件
    if [ ! -f ".env" ]; then
        if [ -f ".env.voice.example" ]; then
            log_warn "未找到 .env 文件，复制示例配置文件"
            cp .env.voice.example .env
            log_warn "请编辑 .env 文件并填入正确的配置"
        else
            log_error "未找到环境配置文件"
            exit 1
        fi
    fi

    # 检查必要的命令
    check_command "node"
    check_command "npm"
    check_command "python3"
    check_command "pip"

    # 检查MongoDB
    if ! pgrep -x "mongod" > /dev/null; then
        log_warn "MongoDB 未运行，尝试启动..."
        if command -v systemctl &> /dev/null; then
            sudo systemctl start mongod || log_warn "无法启动 MongoDB，请手动启动"
        fi
    fi

    # 检查Redis（可选）
    if pgrep -x "redis-server" > /dev/null; then
        log_info "Redis 已运行"
    else
        log_warn "Redis 未运行，将使用内存缓存"
    fi
}

# 安装依赖
install_dependencies() {
    log_step "检查并安装依赖..."

    # 检查Node.js依赖
    if [ ! -d "node_modules" ]; then
        log_info "安装Node.js依赖..."
        npm install
    fi

    # 检查前端依赖
    if [ ! -d "client/node_modules" ]; then
        log_info "安装前端依赖..."
        cd client && npm install && cd ..
    fi

    # 检查Python依赖
    if [ ! -d "python-voice-service/venv" ]; then
        log_info "创建Python虚拟环境..."
        cd python-voice-service
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        cd ..
    fi
}

# 启动Python语音服务
start_python_service() {
    log_step "启动Python语音服务..."

    cd python-voice-service

    # 激活虚拟环境
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi

    # 检查依赖
    python -c "import flask, librosa, numpy" 2>/dev/null || {
        log_error "Python依赖缺失，正在安装..."
        pip install -r requirements.txt
    }

    cd ..

    # 检查端口
    check_port 5001 "Python语音服务"

    # 启动服务
    nohup python3 python-voice-service/run.py > logs/python-voice-service.log 2>&1 &
    PYTHON_PID=$!
    echo $PYTHON_PID > .python-service.pid

    log_info "Python语音服务已启动 (PID: $PYTHON_PID)"
}

# 启动Node.js后端服务
start_backend_service() {
    log_step "启动Node.js后端服务..."

    # 检查端口
    check_port 3001 "后端服务"

    # 启动服务
    NODE_ENV=production nohup node src/app.js > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > .backend-service.pid

    log_info "后端服务已启动 (PID: $BACKEND_PID)"
}

# 启动前端开发服务
start_frontend_service() {
    log_step "启动前端开发服务..."

    # 检查端口
    check_port 3000 "前端服务"

    # 启动服务
    cd client
    nohup npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../.frontend-service.pid
    cd ..

    log_info "前端服务已启动 (PID: $FRONTEND_PID)"
}

# 构建前端应用
build_frontend() {
    log_step "构建前端应用..."

    cd client
    npm run build
    cd ..

    log_info "前端应用构建完成"
}

# 检查服务状态
check_services() {
    log_step "检查服务状态..."

    # 检查Python语音服务
    if wait_for_service "http://localhost:5001/health" "Python语音服务"; then
        log_info "✅ Python语音服务正常"
    else
        log_error "❌ Python语音服务异常"
    fi

    # 检查后端服务
    if wait_for_service "http://localhost:3001/health" "后端服务"; then
        log_info "✅ 后端服务正常"
    else
        log_error "❌ 后端服务异常"
    fi

    # 检查前端服务
    if wait_for_service "http://localhost:3000" "前端服务"; then
        log_info "✅ 前端服务正常"
    else
        log_warn "⚠️ 前端服务可能还在启动中"
    fi
}

# 显示服务信息
show_service_info() {
    echo ""
    echo "==================================="
    echo "🚀 智慧乡村语音交互系统已启动"
    echo "==================================="
    echo ""
    echo "📱 前端应用:       http://localhost:3000"
    echo "🎤 语音助手页面:  http://localhost:3000/voice-assistant"
    echo "🔧 后端API:       http://localhost:3001"
    echo "🤖 Python语音服务: http://localhost:5001"
    echo "📊 健康检查:      http://localhost:3001/health"
    echo "📋 API文档:       http://localhost:3001/api/v1/docs"
    echo ""
    echo "📝 日志文件:"
    echo "   后端日志:     logs/backend.log"
    echo "   Python日志:   logs/python-voice-service.log"
    echo "   前端日志:     logs/frontend.log"
    echo ""
    echo "🛑 停止服务:     ./stop-voice-services.sh"
    echo "📖 查看日志:     tail -f logs/backend.log"
    echo ""
}

# 主函数
main() {
    echo "==================================="
    echo "🎤 智慧乡村语音交互系统启动脚本"
    echo "==================================="
    echo ""

    # 解析命令行参数
    SERVICES="all"
    BUILD_FRONTEND=false
    DEV_MODE=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --backend-only)
                SERVICES="backend"
                shift
                ;;
            --python-only)
                SERVICES="python"
                shift
                ;;
            --frontend-only)
                SERVICES="frontend"
                shift
                ;;
            --build)
                BUILD_FRONTEND=true
                shift
                ;;
            --dev)
                DEV_MODE=true
                shift
                ;;
            --help)
                echo "用法: $0 [选项]"
                echo ""
                echo "选项:"
                echo "  --backend-only   只启动后端服务"
                echo "  --python-only    只启动Python语音服务"
                echo "  --frontend-only  只启动前端服务"
                echo "  --build          构建前端应用"
                echo "  --dev            开发模式"
                echo "  --help           显示帮助信息"
                echo ""
                exit 0
                ;;
            *)
                echo "未知选项: $1"
                echo "使用 --help 查看帮助信息"
                exit 1
                ;;
        esac
    done

    # 执行启动流程
    create_directories
    check_environment

    if [ "$BUILD_FRONTEND" = true ]; then
        install_dependencies
        build_frontend
    fi

    case $SERVICES in
        "all")
            install_dependencies
            start_python_service
            start_backend_service

            if [ "$DEV_MODE" = true ]; then
                start_frontend_service
            else
                build_frontend
            fi
            ;;
        "backend")
            install_dependencies
            start_backend_service
            ;;
        "python")
            install_dependencies
            start_python_service
            ;;
        "frontend")
            install_dependencies
            if [ "$DEV_MODE" = true ]; then
                start_frontend_service
            else
                build_frontend
            fi
            ;;
    esac

    # 等待服务启动并检查状态
    sleep 5
    check_services
    show_service_info
}

# 捕获中断信号
trap 'log_warn "正在停止服务..."; kill $(cat .backend-service.pid .python-service.pid .frontend-service.pid 2>/dev/null) 2>/dev/null; exit 0' INT TERM

# 执行主函数
main "$@"