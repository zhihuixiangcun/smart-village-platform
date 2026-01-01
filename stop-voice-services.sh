#!/bin/bash

# 智慧乡村语音交互系统停止脚本
# 停止所有相关服务

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

# 停止指定PID的进程
stop_process() {
    local pid_file=$1
    local service_name=$2

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            log_info "停止 $service_name (PID: $pid)"
            kill -TERM $pid

            # 等待进程优雅退出
            local count=0
            while ps -p $pid > /dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
                echo -n "."
            done

            # 如果进程仍在运行，强制杀死
            if ps -p $pid > /dev/null 2>&1; then
                log_warn "强制停止 $service_name"
                kill -KILL $pid
            fi

            log_info "$service_name 已停止"
        else
            log_warn "$service_name 进程不存在"
        fi

        rm -f "$pid_file"
    else
        log_warn "$service_name PID文件不存在"
    fi
}

# 按名称停止进程
stop_by_name() {
    local process_name=$1
    local service_name=$2

    log_info "查找 $service_name 进程..."

    local pids=$(pgrep -f "$process_name")
    if [ -n "$pids" ]; then
        log_info "停止 $service_name 进程: $pids"
        echo "$pids" | xargs kill -TERM

        # 等待进程退出
        sleep 3

        # 检查是否还有进程运行
        local remaining_pids=$(pgrep -f "$process_name")
        if [ -n "$remaining_pids" ]; then
            log_warn "强制停止 $service_name"
            echo "$remaining_pids" | xargs kill -KILL
        fi

        log_info "$service_name 已停止"
    else
        log_info "$service_name 未运行"
    fi
}

# 清理端口占用
cleanup_port() {
    local port=$1
    local service_name=$2

    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        log_info "清理端口 $port 占用 ($service_name)"
        kill -TERM $pid 2>/dev/null || true
        sleep 2
        kill -KILL $pid 2>/dev/null || true
    fi
}

# 主函数
main() {
    echo "==================================="
    echo "🛑 智慧乡村语音交互系统停止脚本"
    echo "==================================="
    echo ""

    # 解析命令行参数
    FORCE=false
    SERVICES="all"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE=true
                shift
                ;;
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
            --help)
                echo "用法: $0 [选项]"
                echo ""
                echo "选项:"
                echo "  --force          强制停止所有相关进程"
                echo "  --backend-only   只停止后端服务"
                echo "  --python-only    只停止Python语音服务"
                echo "  --frontend-only  只停止前端服务"
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

    # 停止服务
    case $SERVICES in
        "all")
            log_step "停止所有语音交互服务..."

            # 停止前端服务
            stop_process ".frontend-service.pid" "前端开发服务"
            stop_by_name "vite.*:3000" "Vite开发服务"
            cleanup_port 3000 "前端服务"

            # 停止Python语音服务
            stop_process ".python-service.pid" "Python语音服务"
            stop_by_name "python.*run.py" "Python语音服务"
            cleanup_port 5001 "Python语音服务"

            # 停止后端服务
            stop_process ".backend-service.pid" "后端服务"
            stop_by_name "node.*src/app.js" "Node.js后端服务"
            cleanup_port 3001 "后端服务"

            # 如果强制模式，停止所有相关进程
            if [ "$FORCE" = true ]; then
                log_warn "强制模式：停止所有相关进程"
                pkill -f "smart.*village" || true
                pkill -f "voice.*service" || true
                pkill -f ":3000\|:3001\|:5001" || true
            fi
            ;;
        "backend")
            log_step "停止后端服务..."
            stop_process ".backend-service.pid" "后端服务"
            stop_by_name "node.*src/app.js" "Node.js后端服务"
            cleanup_port 3001 "后端服务"
            ;;
        "python")
            log_step "停止Python语音服务..."
            stop_process ".python-service.pid" "Python语音服务"
            stop_by_name "python.*run.py" "Python语音服务"
            cleanup_port 5001 "Python语音服务"
            ;;
        "frontend")
            log_step "停止前端服务..."
            stop_process ".frontend-service.pid" "前端开发服务"
            stop_by_name "vite.*:3000" "Vite开发服务"
            cleanup_port 3000 "前端服务"
            ;;
    esac

    # 清理临时文件
    log_step "清理临时文件..."
    rm -f .backend-service.pid .python-service.pid .frontend-service.pid

    # 清理可能的临时进程
    if [ "$FORCE" = true ]; then
        log_warn "清理临时文件和缓存..."
        rm -rf temp/*
        find . -name "*.tmp" -delete 2>/dev/null || true
        find . -name ".DS_Store" -delete 2>/dev/null || true
    fi

    echo ""
    log_info "服务停止完成"
    echo ""
    echo "📝 可以使用以下命令查看日志："
    echo "   tail -f logs/backend.log"
    echo "   tail -f logs/python-voice-service.log"
    echo "   tail -f logs/frontend.log"
    echo ""
    echo "🚀 重新启动服务："
    echo "   ./start-voice-services.sh"
    echo ""
}

# 捕获中断信号
trap 'log_warn "停止脚本被中断"; exit 0' INT TERM

# 执行主函数
main "$@"