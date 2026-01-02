#!/bin/bash

# 智慧乡村平台快速部署脚本
# 使用方法: ./deploy.sh [选项]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 推送代码
push_code() {
    log_info "开始推送代码到GitHub..."
    git push origin main
}

# 运行测试
run_tests() {
    log_info "开始运行测试..."
    npm test -- tests/duty tests/map --maxWorkers=1
}

# 配置环境
config_env() {
    log_info "生成加密密钥..."
    echo "AES加密密钥:"
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    curl -s http://localhost:3001/api/health || echo "API未运行"
}

# 主函数
case "$1" in
    push) push_code ;;
    test) run_tests ;;
    config) config_env ;;
    health) health_check ;;
    *) echo "使用: $0 {push|test|config|health}" ;;
esac
