#!/bin/bash

# 智慧村庄平台回滚脚本
# Smart Village Platform Rollback Script

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
智慧村庄平台回滚脚本

用法: $0 [选项] <环境> <版本>

环境:
  dev         开发环境
  staging     预发布环境
  prod        生产环境

选项:
  -h, --help              显示帮助信息
  -v, --verbose           详细输出
  -f, --force            强制回滚
  -d, --dry-run          模拟运行
  --backup-current       回滚前备份当前版本
  --confirm              确认回滚操作

示例:
  $0 prod v1.2.0              回滚生产环境到v1.2.0版本
  $0 staging v1.1.5 --dry-run 模拟预发布环境回滚
  $0 prod v1.0.0 --confirm    确认回滚生产环境到v1.0.0

EOF
}

# 解析命令行参数
parse_args() {
    ENVIRONMENT=""
    VERSION=""
    VERBOSE=false
    FORCE=false
    DRY_RUN=false
    BACKUP_CURRENT=false
    CONFIRM=false

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
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            --backup-current)
                BACKUP_CURRENT=true
                shift
                ;;
            --confirm)
                CONFIRM=true
                shift
                ;;
            dev|staging|prod)
                ENVIRONMENT="$1"
                shift
                ;;
            v*|[0-9]*.*)
                VERSION="$1"
                shift
                ;;
            *)
                error "未知参数: $1"
                usage
                exit 1
                ;;
        esac
    done

    if [[ -z "$ENVIRONMENT" ]]; then
        error "必须指定环境 (dev, staging, prod)"
        usage
        exit 1
    fi

    if [[ -z "$VERSION" ]]; then
        error "必须指定版本"
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

    # 设置默认值
    export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"
    export REGISTRY="${REGISTRY:-ghcr.io}"
    export PROJECT_NAME="${PROJECT_NAME:-smart-village}"
}

# 检查依赖
check_dependencies() {
    log "检查依赖工具..."

    local deps=("kubectl" "docker" "helm" "jq")

    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error "缺少依赖工具: $dep"
            exit 1
        fi
    done

    # 检查Kubernetes连接
    if ! kubectl cluster-info &> /dev/null; then
        error "无法连接到Kubernetes集群"
        exit 1
    fi

    success "依赖检查通过"
}

# 获取当前版本
get_current_version() {
    local deployment="$1"

    kubectl get deployment "$deployment" \
        --namespace="$NAMESPACE" \
        -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null | \
        rev | cut -d: -f1 | rev || echo ""
}

# 列出可用版本
list_available_versions() {
    log "获取可用版本列表..."

    local versions=()

    # 从Docker注册表获取版本
    local services=("api" "village" "client")

    for service in "${services[@]}"; do
        local repo_versions=$(curl -s "https://api.github.com/repos/${GITHUB_REPOSITORY:-smart-village}/packages/container/$service/versions" | \
            jq -r '.[].metadata.container.tags[]' | grep -E 'v[0-9]+\.[0-9]+\.[0-9]+' | sort -V)

        while IFS= read -r version; do
            if [[ -n "$version" && " ${versions[*]} " != *" $version "* ]]; then
                versions+=("$version")
            fi
        done <<< "$repo_versions"
    done

    if [[ ${#versions[@]} -eq 0 ]]; then
        warning "未找到可用版本"
        return
    fi

    echo "可用版本:"
    for version in "${versions[@]}"; do
        echo "  - $version"
    done
}

# 验证版本存在
validate_version() {
    local version="$1"
    local services=("api" "village" "client")

    log "验证版本 $version..."

    for service in "${services[@]}"; do
        if ! docker pull "${REGISTRY}/${PROJECT_NAME}/${service}:${version}" &> /dev/null; then
            error "服务 $service 的版本 $version 不存在"
            exit 1
        fi
    done

    success "版本验证通过"
}

# 创建回滚计划
create_rollback_plan() {
    log "创建回滚计划..."

    local plan_file="rollback-plan-$(date +%Y%m%d_%H%M%S).yaml"

    cat > "$plan_file" << EOF
# 回滚计划
environment: $ENVIRONMENT
target_version: $VERSION
created_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)
rollback_type: "version_rollback"

# 当前版本信息
current_versions:
EOF

    local services=("api" "village" "client")
    for service in "${services[@]}"; do
        local current_version=$(get_current_version "${service}-deployment")
        echo "  $service: $current_version" >> "$plan_file"
    done

    cat >> "$plan_file" << EOF

# 回滚步骤
steps:
  - name: "backup_current"
    description: "备份当前版本"
    enabled: $BACKUP_CURRENT
  - name: "validate_target_version"
    description: "验证目标版本"
    enabled: true
  - name: "update_deployments"
    description: "更新部署镜像"
    enabled: true
  - name: "wait_for_rollback"
    description: "等待回滚完成"
    enabled: true
  - name: "health_check"
    description: "执行健康检查"
    enabled: true
  - name: "run_tests"
    description: "运行测试"
    enabled: false
  - name: "send_notification"
    description: "发送通知"
    enabled: true

# 风险评估
risk_assessment:
  level: "medium"
  impact: "service_disruption"
  duration: "5-10分钟"
  rollback_capability: "high"

EOF

    log "回滚计划已保存: $plan_file"
}

# 备份当前版本
backup_current() {
    if [[ "$BACKUP_CURRENT" != true ]]; then
        log "跳过当前版本备份"
        return
    fi

    log "备份当前版本..."

    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)_pre-rollback_${ENVIRONMENT}"
    mkdir -p "$backup_dir"

    # 备份当前配置
    kubectl get all --namespace="$NAMESPACE" -o yaml > "$backup_dir/current-deployment.yaml"

    # 记录当前版本
    {
        echo "backup_time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        echo "environment: $ENVIRONMENT"
        echo "current_versions:"
        for service in "api" "village" "client"; do
            local current_version=$(get_current_version "${service}-deployment")
            echo "  $service: $current_version"
        done
    } > "$backup_dir/backup-info.yaml"

    success "当前版本备份完成: $backup_dir"
}

# 确认回滚操作
confirm_rollback() {
    if [[ "$CONFIRM" == true ]]; then
        log "已通过 --confirm 参数确认"
        return
    fi

    if [[ "$FORCE" == true ]]; then
        warning "强制回滚模式，跳过确认"
        return
    fi

    echo
    warning "即将执行回滚操作！"
    echo "  环境: $ENVIRONMENT"
    echo "  目标版本: $VERSION"
    echo "  当前版本:"

    local services=("api" "village" "client")
    for service in "${services[@]}"; do
        local current_version=$(get_current_version "${service}-deployment")
        echo "    $service: $current_version"
    done

    echo
    read -p "确认执行回滚操作？(yes/no): " confirm

    if [[ "$confirm" != "yes" ]]; then
        log "回滚操作已取消"
        exit 0
    fi

    success "用户确认回滚操作"
}

# 执行回滚
perform_rollback() {
    log "开始执行回滚..."

    local services=("api" "village" "client")

    for service in "${services[@]}"; do
        log "回滚 $service 服务..."

        if [[ "$DRY_RUN" == true ]]; then
            echo "[DRY RUN] kubectl set image deployment/${service}-deployment ${service}=\
${REGISTRY}/${PROJECT_NAME}/${service}:${VERSION} --namespace=$NAMESPACE"
            continue
        fi

        # 更新部署镜像
        kubectl set image "deployment/${service}-deployment" \
            "${service}=${REGISTRY}/${PROJECT_NAME}/${service}:${VERSION}" \
            --namespace="$NAMESPACE"

        # 等待部署更新
        kubectl rollout status "deployment/${service}-deployment" \
            --namespace="$NAMESPACE" \
            --timeout=300s

        success "$service 服务回滚完成"
    done
}

# 验证回滚结果
verify_rollback() {
    log "验证回滚结果..."

    local success=true
    local services=("api" "village" "client")

    for service in "${services[@]}"; do
        local current_version=$(get_current_version "${service}-deployment")

        if [[ "$current_version" == "$VERSION" ]]; then
            success "$service 版本正确: $current_version"
        else
            error "$service 版本错误: 期望 $VERSION, 实际 $current_version"
            success=false
        fi
    done

    if [[ "$success" != true ]]; then
        error "回滚验证失败"
        exit 1
    fi

    success "回滚验证通过"
}

# 健康检查
health_check() {
    log "执行回滚后健康检查..."

    # 获取服务URL
    local service_url
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        service_url="https://$DOMAIN"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
        service_url="https://staging.$DOMAIN"
    else
        service_url="http://dev.$DOMAIN"
    fi

    # 等待服务可用
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

    # 检查API端点
    local endpoints=(
        "/api/health"
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

# 运行快速测试
run_quick_tests() {
    log "运行快速测试..."

    # 获取服务URL
    local service_url
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        service_url="https://$DOMAIN"
    else
        service_url="https://${ENVIRONMENT}.$DOMAIN"
    fi

    # 基本API测试
    local test_endpoints=(
        "/api/v1/status"
        "/api/v1/announcements"
        "/api/v1/users/profile"
    )

    for endpoint in "${test_endpoints[@]}"; do
        if curl -f -s "$service_url$endpoint" > /dev/null; then
            success "API测试 $endpoint 通过"
        else
            warning "API测试 $endpoint 失败"
        fi
    done

    success "快速测试完成"
}

# 发送通知
send_notification() {
    local status="$1"
    local webhook_url="${SLACK_WEBHOOK:-}"

    if [[ -z "$webhook_url" ]]; then
        log "未配置Slack通知"
        return
    fi

    local color="warning"
    local message="回滚完成"

    if [[ "$status" == "failure" ]]; then
        color="danger"
        message="回滚失败"
    fi

    local payload=$(cat << EOF
{
    "text": "智慧村庄平台回滚通知",
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
                    "title": "目标版本",
                    "value": "$VERSION",
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

# 生成回滚报告
generate_rollback_report() {
    local report_file="rollback-report-$(date +%Y%m%d_%H%M%S).md"

    cat > "$report_file" << EOF
# 回滚报告

## 基本信息
- **环境**: $ENVIRONMENT
- **目标版本**: $VERSION
- **回滚时间**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- **操作者**: $(whoami)

## 当前版本信息
EOF

    local services=("api" "village" "client")
    for service in "${services[@]}"; do
        local current_version=$(get_current_version "${service}-deployment")
        echo "- **$service**: $current_version" >> "$report_file"
    done

    cat >> "$report_file" << EOF

## 回滚步骤
EOF

    if [[ "$BACKUP_CURRENT" == true ]]; then
        echo "- ✅ 备份当前版本" >> "$report_file"
    fi

    echo "- ✅ 验证目标版本" >> "$report_file"
    echo "- ✅ 更新部署镜像" >> "$report_file"
    echo "- ✅ 等待回滚完成" >> "$report_file"
    echo "- ✅ 健康检查" >> "$report_file"

    if [[ -n "${service_url:-}" ]]; then
        cat >> "$report_file" << EOF

## 服务状态
EOF
        if curl -f -s "$service_url/health" > /dev/null; then
            echo "- ✅ 应用服务正常" >> "$report_file"
        else
            echo "- ❌ 应用服务异常" >> "$report_file"
        fi
    fi

    cat >> "$report_file" << EOF

## 注意事项
- 监控应用运行状态
- 关注用户反馈
- 如有问题可再次回滚

EOF

    log "回滚报告已生成: $report_file"
}

# 主函数
main() {
    parse_args "$@"

    log "开始回滚 $ENVIRONMENT 环境到版本 $VERSION"

    if [[ "$VERBOSE" == true ]]; then
        set -x
    fi

    load_config
    check_dependencies

    # 显示可用版本
    list_available_versions

    # 验证目标版本
    validate_version "$VERSION"

    # 创建回滚计划
    create_rollback_plan

    # 确认回滚操作
    confirm_rollback

    # 执行回滚流程
    if [[ "$DRY_RUN" == true ]]; then
        log "=== 模拟运行模式 ==="
    fi

    backup_current
    perform_rollback
    verify_rollback
    health_check
    run_quick_tests
    generate_rollback_report

    success "回滚完成！"
    log "环境 $ENVIRONMENT 已成功回滚到版本 $VERSION"

    send_notification "success"

    if [[ "$ENVIRONMENT" == "prod" ]]; then
        warning "生产环境回滚已完成，请密切监控系统状态"
    fi
}

# 错误处理
trap 'error "回滚过程中发生错误"; send_notification "failure"; exit 1' ERR

# 执行主函数
main "$@"