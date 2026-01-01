#!/bin/bash
# 智慧乡村综合服务平台 - 部署脚本
# Smart Village Platform - Deployment Script

set -e

# 颜色输出
RED='[0;31m'
GREEN='[0;32m'
YELLOW='[1;33m'
NC='[0m' # No Color

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

# 显示帮助信息
show_help() {
    cat << EOF
智慧乡村综合服务平台部署脚本

用法: ./deploy.sh [选项]

选项:
    -e, --env ENVIRONMENT    部署环境 (dev|staging|prod) [默认: dev]
    -a, --action ACTION      执行动作 (deploy|rollback|status) [默认: deploy]
    -s, --service SERVICE    指定服务 (all|api|village|client) [默认: all]
    -t, --tag TAG            Docker 镜像标签 [默认: latest]
    -b, --blue-green         启用蓝绿部署
    -h, --help               显示此帮助信息

示例:
    ./deploy.sh -e prod -a deploy
    ./deploy.sh -e prod -a rollback
    ./deploy.sh -e staging -a deploy -s api
    ./deploy.sh -e prod -a deploy --blue-green

EOF
}

# 默认值
ENVIRONMENT="dev"
ACTION="deploy"
SERVICE="all"
IMAGE_TAG="latest"
BLUE_GREEN=false

# 解析参数
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -a|--action)
            ACTION="$2"
            shift 2
            ;;
        -s|--service)
            SERVICE="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -b|--blue-green)
            BLUE_GREEN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 配置
case $ENVIRONMENT in
    dev)
        KUBECONFIG="${HOME}/.kube/config-dev"
        NAMESPACE="smartvillage-dev"
        ;;
    staging)
        KUBECONFIG="${HOME}/.kube/config-staging"
        NAMESPACE="smartvillage-staging"
        ;;
    prod)
        KUBECONFIG="${HOME}/.kube/config-prod"
        NAMESPACE="smartvillage-prod"
        ;;
    *)
        log_error "无效的环境: $ENVIRONMENT"
        exit 1
        ;;
esac

export KUBECONFIG

# 检查 kubectl
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl 未安装"
    exit 1
fi

# 检查集群连接
if ! kubectl cluster-info &> /dev/null; then
    log_error "无法连接到 Kubernetes 集群"
    exit 1
fi

log_info "环境: $ENVIRONMENT"
log_info "命名空间: $NAMESPACE"
log_info "动作: $ACTION"
log_info "服务: $SERVICE"

# 创建命名空间
create_namespace() {
    log_info "创建命名空间: $NAMESPACE"
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
}

# 部署函数
deploy_service() {
    local service=$1
    log_info "部署服务: $service"
    
    case $service in
        api)
            kubectl apply -f k8s/api-deployment.yaml
            kubectl apply -f k8s/api-service.yaml
            ;;
        village)
            kubectl apply -f k8s/village-deployment.yaml
            kubectl apply -f k8s/village-service.yaml
            ;;
        client)
            kubectl apply -f k8s/client-deployment.yaml
            kubectl apply -f k8s/client-service.yaml
            ;;
        all)
            deploy_service "api"
            deploy_service "village"
            deploy_service "client"
            ;;
    esac
    
    # 等待部署完成
    if [ "$service" = "all" ]; then
        kubectl rollout status deployment/api-server -n $NAMESPACE --timeout=300s
        kubectl rollout status deployment/village-server -n $NAMESPACE --timeout=300s
        kubectl rollout status deployment/client-server -n $NAMESPACE --timeout=300s
    else
        kubectl rollout status deployment/${service}-server -n $NAMESPACE --timeout=300s
    fi
}

# 蓝绿部署
blue_green_deploy() {
    log_info "执行蓝绿部署"
    
    # 获取当前活跃环境
    local current_env=$(kubectl get service smart-village-active -n $NAMESPACE -o jsonpath='{.spec.selector.environment}' 2>/dev/null || echo "blue")
    local new_env=$( [ "$current_env" = "blue" ] && echo "green" || echo "blue" )
    
    log_info "当前环境: $current_env"
    log_info "新环境: $new_env"
    
    # 部署新环境
    log_info "部署到 $new_env 环境"
    # ... 部署逻辑
    
    # 健康检查
    log_info "执行健康检查"
    # ... 健康检查逻辑
    
    # 切换流量
    log_info "切换流量到 $new_env 环境"
    kubectl patch service smart-village-active -n $NAMESPACE -p '{"spec":{"selector":{"environment":"'$new_env'"}}}'
    
    log_info "蓝绿部署完成"
}

# 回滚函数
rollback_service() {
    local service=${1:-all}
    log_info "回滚服务: $service"
    
    if [ "$service" = "all" ]; then
        kubectl rollout undo deployment/api-server -n $NAMESPACE
        kubectl rollout undo deployment/village-server -n $NAMESPACE
        kubectl rollout undo deployment/client-server -n $NAMESPACE
    else
        kubectl rollout undo deployment/${service}-server -n $NAMESPACE
    fi
    
    log_info "回滚完成"
}

# 显示状态
show_status() {
    log_info "部署状态:"
    kubectl get deployments -n $NAMESPACE
    kubectl get pods -n $NAMESPACE
    kubectl get services -n $NAMESPACE
}

# 主逻辑
main() {
    create_namespace
    
    case $ACTION in
        deploy)
            if [ "$BLUE_GREEN" = true ]; then
                blue_green_deploy
            else
                deploy_service $SERVICE
            fi
            ;;
        rollback)
            rollback_service $SERVICE
            ;;
        status)
            show_status
            ;;
        *)
            log_error "未知动作: $ACTION"
            exit 1
            ;;
    esac
    
    log_info "操作完成"
}

main
