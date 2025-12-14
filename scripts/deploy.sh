#!/bin/bash

# 智慧村庄平台部署脚本
# Smart Village Platform Deployment Script

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示使用说明
usage() {
    cat << EOF
智慧村庄平台部署脚本

用法: $0 [选项] <环境>

环境:
  dev         开发环境
  staging     预发布环境
  prod        生产环境

选项:
  -h, --help              显示帮助信息
  -v, --verbose           详细输出
  -f, --force            强制部署
  -b, --backup           部署前备份
  -r, --rollback <TAG>   回滚到指定版本
  -d, --dry-run          模拟运行
  --skip-tests           跳过测试
  --skip-build           跳过构建
  --no-health-check      跳过健康检查

示例:
  $0 dev                    部署到开发环境
  $0 staging --backup      备份后部署到预发布环境
  $0 prod --rollback v1.2.0 回滚到v1.2.0版本
  $0 prod --dry-run        模拟生产环境部署

EOF
}

# 解析命令行参数
parse_args() {
    ENVIRONMENT=""
    VERBOSE=false
    FORCE=false
    BACKUP=false
    ROLLBACK_TAG=""
    DRY_RUN=false
    SKIP_TESTS=false
    SKIP_BUILD=false
    NO_HEALTH_CHECK=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -b|--backup)
                BACKUP=true
                shift
                ;;
            -r|--rollback)
                ROLLBACK_TAG="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=false
                shift
                ;;
            --no-health-check)
                NO_HEALTH_CHECK=true
                shift
                ;;
            dev|staging|prod)
                ENVIRONMENT="$1"
                shift
                ;;
            *)
                error "未知参数: $1"
                usage
                exit 1
                ;;
        esac
    done

    if [[ -z "$ENVIRONMENT" && -z "$ROLLBACK_TAG" ]]; then
        error "必须指定环境 (dev, staging, prod)"
        usage
        exit 1
    fi
}

# 加载环境配置
load_config() {
    local env_file="config/environments/${ENVIRONMENT}.env"

    if [[ ! -f "$env_file" ]]; then
        error "配置文件不存在: $env_file"
        exit 1
    fi

    log "加载环境配置: $env_file"
    source "$env_file"

    # 验证必需的环境变量
    local required_vars=("PROJECT_NAME" "NAMESPACE" "DOMAIN")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "必需的环境变量未设置: $var"
            exit 1
        fi
    done

    # 设置默认值
    export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"
    export REGISTRY="${REGISTRY:-ghcr.io}"
    export IMAGE_TAG="${IMAGE_TAG:-$(git describe --tags --always --dirty)}"
    export BUILD_NUMBER="${BUILD_NUMBER:-$(date +%Y%m%d%H%M%S)}"
}

# 检查依赖
check_dependencies() {
    log "检查依赖工具..."

    local deps=("kubectl" "docker" "helm" "jq" "curl")

    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error "缺少依赖工具: $dep"
            exit 1
        fi

        if [[ "$VERBOSE" == true ]]; then
            echo "  ✓ $dep: $(command -v "$dep")"
        fi
    done

    # 检查Docker权限
    if ! docker info &> /dev/null; then
        error "Docker权限不足或未运行"
        exit 1
    fi

    # 检查Kubernetes连接
    if ! kubectl cluster-info &> /dev/null; then
        error "无法连接到Kubernetes集群"
        exit 1
    fi

    success "所有依赖检查通过"
}

# 创建命名空间
create_namespace() {
    log "创建命名空间: $NAMESPACE"

    if [[ "$DRY_RUN" == true ]]; then
        echo "[DRY RUN] kubectl create namespace $NAMESPACE --dry-run=client"
        return
    fi

    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        warning "命名空间 $NAMESPACE 已存在"
    else
        kubectl create namespace "$NAMESPACE"
        success "命名空间创建成功"
    fi
}

# 创建密钥
create_secrets() {
    log "创建Kubernetes密钥..."

    # 数据库连接密钥
    kubectl create secret generic database-secret \
        --from-literal="uri=$MONGO_URI" \
        --from-literal="username=$MONGO_USERNAME" \
        --from-literal="password=$MONGO_PASSWORD" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    # Redis连接密钥
    kubectl create secret generic redis-secret \
        --from-literal="url=$REDIS_URL" \
        --from-literal="password=$REDIS_PASSWORD" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    # JWT密钥
    kubectl create secret generic jwt-secret \
        --from-literal="secret=$JWT_SECRET" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    # 第三方服务密钥
    if [[ -n "${BAIDU_API_KEY:-}" ]]; then
        kubectl create secret generic external-services \
            --from-literal="baidu-api-key=$BAIDU_API_KEY" \
            --from-literal="baidu-secret-key=$BAIDU_SECRET_KEY" \
            --from-literal="tencent-secret-id=$TENCENT_SECRET_ID" \
            --from-literal="tencent-secret-key=$TENCENT_SECRET_KEY" \
            --namespace="$NAMESPACE" \
            --dry-run=client -o yaml | kubectl apply -f -
    fi

    success "密钥创建成功"
}

# 创建配置映射
create_configmaps() {
    log "创建配置映射..."

    local config_file="config/environments/${ENVIRONMENT}.json"

    if [[ -f "$config_file" ]]; then
        kubectl create configmap app-config \
            --from-file="app-config.json=$config_file" \
            --namespace="$NAMESPACE" \
            --dry-run=client -o yaml | kubectl apply -f -
    fi

    # 创建通用配置
    cat << EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: common-config
  namespace: $NAMESPACE
data:
  NODE_ENV: "$ENVIRONMENT"
  LOG_LEVEL: "$LOG_LEVEL"
  DOMAIN: "$DOMAIN"
  REGISTRY: "$REGISTRY"
  IMAGE_TAG: "$IMAGE_TAG"
EOF

    success "配置映射创建成功"
}

# 构建Docker镜像
build_images() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log "跳过镜像构建"
        return
    fi

    log "构建Docker镜像..."

    # 构建API服务镜像
    log "构建API服务镜像..."
    docker build \
        --platform linux/amd64,linux/arm64 \
        --tag "${REGISTRY}/${PROJECT_NAME}/api:${IMAGE_TAG}" \
        --file docker/Dockerfile.api \
        .

    # 构建Village服务镜像
    log "构建Village服务镜像..."
    docker build \
        --platform linux/amd64,linux/arm64 \
        --tag "${REGISTRY}/${PROJECT_NAME}/village:${IMAGE_TAG}" \
        --file docker/Dockerfile.village \
        .

    # 构建客户端镜像
    log "构建客户端镜像..."
    docker build \
        --platform linux/amd64,linux/arm64 \
        --tag "${REGISTRY}/${PROJECT_NAME}/client:${IMAGE_TAG}" \
        --file client/Dockerfile \
        ./client

    success "镜像构建完成"
}

# 推送镜像
push_images() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log "跳过镜像推送"
        return
    fi

    log "推送Docker镜像到注册表..."

    # 推送API服务镜像
    docker push "${REGISTRY}/${PROJECT_NAME}/api:${IMAGE_TAG}"

    # 推送Village服务镜像
    docker push "${REGISTRY}/${PROJECT_NAME}/village:${IMAGE_TAG}"

    # 推送客户端镜像
    docker push "${REGISTRY}/${PROJECT_NAME}/client:${IMAGE_TAG}"

    success "镜像推送完成"
}

# 部署应用
deploy_application() {
    log "部署应用到 $ENVIRONMENT 环境..."

    # 部署API服务
    log "部署API服务..."
    envsubst < k8s/${ENVIRONMENT}/api-deployment.yaml | kubectl apply -f -

    # 部署Village服务
    log "部署Village服务..."
    envsubst < k8s/${ENVIRONMENT}/village-deployment.yaml | kubectl apply -f -

    # 部署客户端服务
    log "部署客户端服务..."
    envsubst < k8s/${ENVIRONMENT}/client-deployment.yaml | kubectl apply -f -

    # 部署其他组件
    if [[ -f "k8s/${ENVIRONMENT}/monitoring.yaml" ]]; then
        log "部署监控组件..."
        envsubst < k8s/${ENVIRONMENT}/monitoring.yaml | kubectl apply -f -
    fi

    success "应用部署完成"
}

# 等待部署完成
wait_for_deployment() {
    log "等待部署完成..."

    local services=("api" "village" "client")
    local timeout=300

    for service in "${services[@]}"; do
        log "等待 $service 服务部署..."

        if [[ "$DRY_RUN" == true ]]; then
            echo "[DRY RUN] kubectl rollout status deployment/$service-deployment --timeout=${timeout}s"
            continue
        fi

        if kubectl rollout status deployment/"$service-deployment" \
            --namespace="$NAMESPACE" \
            --timeout="${timeout}s"; then
            success "$service 服务部署成功"
        else
            error "$service 服务部署失败"
            exit 1
        fi
    done
}

# 健康检查
health_check() {
    if [[ "$NO_HEALTH_CHECK" == true ]]; then
        log "跳过健康检查"
        return
    fi

    log "执行健康检查..."

    # 获取服务URL
    local service_url
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        service_url="https://$DOMAIN"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
        service_url="https://staging.$DOMAIN"
    else
        service_url="http://dev.$DOMAIN"
    fi

    # 基本健康检查
    log "检查应用响应..."
    local retries=30
    local retry_interval=10

    for ((i=1; i<=retries; i++)); do
        if curl -f -s "$service_url/health" > /dev/null; then
            success "应用健康检查通过"
            break
        fi

        if [[ $i -eq $retries ]]; then
            error "健康检查失败，应用未响应"
            exit 1
        fi

        log "等待应用启动... ($i/$retries)"
        sleep "$retry_interval"
    done

    # 详细健康检查
    log "执行详细健康检查..."
    local endpoints=(
        "/api/health"
        "/api/monitoring/health"
        "/api/v1/status"
    )

    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$service_url$endpoint" > /dev/null; then
            success "端点 $endpoint 正常"
        else
            warning "端点 $endpoint 异常"
        fi
    done
}

# 运行测试
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log "跳过测试"
        return
    fi

    log "运行部署后测试..."

    # 获取服务URL
    local service_url
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        service_url="https://$DOMAIN"
    else
        service_url="https://${ENVIRONMENT}.$DOMAIN"
    fi

    # 运行API测试
    log "运行API集成测试..."
    if npm run test:integration:remote -- --baseUrl="$service_url"; then
        success "API测试通过"
    else
        error "API测试失败"
        exit 1
    fi

    # 运行端到端测试
    if [[ "$ENVIRONMENT" != "dev" ]]; then
        log "运行端到端测试..."
        if npm run test:e2e:remote -- --baseUrl="$service_url"; then
            success "端到端测试通过"
        else
            warning "端到端测试失败，但不阻止部署"
        fi
    fi
}

# 备份当前部署
backup_deployment() {
    if [[ "$BACKUP" != true ]]; then
        return
    fi

    log "备份当前部署..."

    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)_${ENVIRONMENT}"
    mkdir -p "$backup_dir"

    # 备份Kubernetes配置
    kubectl get all --namespace="$NAMESPACE" -o yaml > "$backup_dir/k8s-resources.yaml"

    # 备份密钥（不包含敏感数据）
    kubectl get secrets --namespace="$NAMESPACE" -o yaml | \
        sed 's/data:/data: null/' > "$backup_dir/secrets.yaml"

    # 备份配置映射
    kubectl get configmaps --namespace="$NAMESPACE" -o yaml > "$backup_dir/configmaps.yaml"

    # 备份数据库（如果配置了）
    if [[ -n "${MONGO_URI:-}" ]]; then
        log "备份数据库..."
        mongosh "$MONGO_URI" --eval "db.adminCommand('listCollections')" > "$backup_dir/collections.json"
    fi

    success "备份完成: $backup_dir"
}

# 回滚部署
rollback_deployment() {
    log "回滚到版本: $ROLLBACK_TAG"

    # 检查回滚版本是否存在
    if ! docker pull "${REGISTRY}/${PROJECT_NAME}/api:${ROLLBACK_TAG}" &> /dev/null; then
        error "回滚版本不存在: $ROLLBACK_TAG"
        exit 1
    fi

    # 更新镜像标签
    export IMAGE_TAG="$ROLLBACK_TAG"

    # 执行回滚
    backup_deployment
    deploy_application
    wait_for_deployment
    health_check

    success "回滚完成"
}

# 发送通知
send_notification() {
    local status="$1"
    local webhook_url="${SLACK_WEBHOOK:-}"

    if [[ -z "$webhook_url" ]]; then
        log "未配置Slack通知"
        return
    fi

    local color="good"
    local message="部署成功"

    if [[ "$status" == "failure" ]]; then
        color="danger"
        message="部署失败"
    fi

    local payload=$(cat << EOF
{
    "text": "智慧村庄平台部署通知",
    "attachments": [
        {
            "color": "$color",
            "fields": [
                {
                    "title": "环境",
                    "value": "$ENVIRONMENT",
                    "short": true
                },
                {
                    "title": "版本",
                    "value": "$IMAGE_TAG",
                    "short": true
                },
                {
                    "title": "状态",
                    "value": "$message",
                    "short": true
                },
                {
                    "title": "时间",
                    "value": "$(date '+%Y-%m-%d %H:%M:%S')",
                    "short": true
                }
            ]
        }
    ]
}
EOF
    )

    curl -X POST "$webhook_url" \
        -H "Content-Type: application/json" \
        -d "$payload" &> /dev/null

    log "通知已发送"
}

# 清理资源
cleanup() {
    log "清理临时资源..."

    # 清理未使用的Docker镜像
    if [[ "$SKIP_BUILD" != true ]]; then
        docker image prune -f &> /dev/null
    fi

    success "清理完成"
}

# 主函数
main() {
    parse_args "$@"

    # 如果是回滚操作
    if [[ -n "$ROLLBACK_TAG" ]]; then
        load_config
        check_dependencies
        rollback_deployment
        send_notification "success"
        exit 0
    fi

    # 正常部署流程
    log "开始部署到 $ENVIRONMENT 环境..."

    if [[ "$VERBOSE" == true ]]; then
        set -x
    fi

    load_config
    check_dependencies

    if [[ "$DRY_RUN" == true ]]; then
        log "=== 模拟运行模式 ==="
    fi

    backup_deployment
    create_namespace
    create_secrets
    create_configmaps

    if [[ "$SKIP_BUILD" != true ]]; then
        build_images
        push_images
    fi

    deploy_application
    wait_for_deployment

    if [[ "$NO_HEALTH_CHECK" != true ]]; then
        health_check
    fi

    run_tests
    cleanup

    success "部署完成！"
    log "应用访问地址: ${ENVIRONMENT}.${DOMAIN}"

    send_notification "success"

    if [[ "$ENVIRONMENT" == "prod" ]]; then
        log "🎉 生产环境部署成功！"
    fi
}

# 错误处理
trap 'error "部署过程中发生错误"; send_notification "failure"; exit 1' ERR

# 执行主函数
main "$@"