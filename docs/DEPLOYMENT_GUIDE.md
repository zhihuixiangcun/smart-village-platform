# 智慧乡村综合服务平台 - DevOps 部署指南

## 目录

1. [概述](#概述)
2. [环境要求](#环境要求)
3. [本地开发环境](#本地开发环境)
4. [Docker 部署](#docker-部署)
5. [Kubernetes 部署](#kubernetes-部署)
6. [CI/CD 流程](#cicd-流程)
7. [监控与日志](#监控与日志)
8. [故障排除](#故障排除)

---

## 概述

智慧乡村综合服务平台采用微服务架构，包含以下核心服务：

- **API Server** (端口 3001): 主 API 服务器，负责监控、i18n、通知
- **Village Server** (端口 5000): 村务核心服务，Socket.IO 实时通信
- **Frontend** (端口 3000): Vue.js 前端应用
- **MongoDB** (端口 27017): 主数据库
- **Redis** (端口 6379): 缓存和会话存储

---

## 环境要求

### 开发环境

- Node.js >= 20.17.0
- npm >= 10.0.0
- MongoDB >= 6.0
- Redis >= 7.0

### 生产环境

- Docker >= 24.0
- Docker Compose >= 2.20
- Kubernetes >= 1.28
- kubectl >= 1.28

---

## 本地开发环境

### 1. 安装依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd client
npm install
cd ..
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入实际配置
nano .env
```

### 3. 启动服务

```bash
# 方式1: 使用 npm scripts
npm run dev          # 启动 API Server
npm run client       # 启动前端 (新终端)
cd server && npm run dev  # 启动 Village Server (新终端)

# 方式2: 使用 Docker Compose
cd docker
docker-compose -f docker-compose.dev.yml up
```

### 4. 访问应用

- 前端: http://localhost:3000
- API: http://localhost:3001
- 监控面板: http://localhost:3001/monitoring
- MongoDB Express: http://localhost:8081

---

## Docker 部署

### 开发环境

```bash
cd docker
docker-compose -f docker-compose.dev.yml up -d
```

### 生产环境

```bash
cd docker
docker-compose -f docker-compose.prod.yml up -d
```

### 构建自定义镜像

```bash
# 构建 API Server 镜像
docker build -f docker/Dockerfile.api-server.v2 -t smartvillage/api:latest .

# 构建 Village Server 镜像
docker build -f docker/Dockerfile.village-server.v2 -t smartvillage/village:latest .

# 构建 Frontend 镜像
docker build -f docker/Dockerfile.frontend.v2 -t smartvillage/client:latest .
```

---

## Kubernetes 部署

### 前置要求

```bash
# 配置 kubectl
export KUBECONFIG=~/.kube/config-prod

# 验证集群连接
kubectl cluster-info
```

### 快速部署

```bash
# 使用部署脚本
cd deploy
chmod +x deploy.sh
./deploy.sh -e prod -a deploy

# 或手动部署
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/
```

### 蓝绿部署

```bash
# 启用蓝绿部署
./deploy.sh -e prod -a deploy --blue-green
```

### 回滚

```bash
# 回滚到上一个版本
./deploy.sh -e prod -a rollback

# 回滚特定服务
./deploy.sh -e prod -a rollback -s api
```

### 检查部署状态

```bash
# 查看部署状态
./deploy.sh -e prod -a status

# 或使用 kubectl
kubectl get deployments -n smartvillage-prod
kubectl get pods -n smartvillage-prod
kubectl get services -n smartvillage-prod
```

---

## CI/CD 流程

### GitHub Actions 工作流

项目包含以下 GitHub Actions 工作流：

1. **CI Pipeline** (ci.yml): 代码检查、测试、构建
2. **Security Scanning** (security-enhanced.yml): 安全扫描
3. **Code Quality** (code-quality.yml): 代码质量检查
4. **Frontend Tests** (frontend-tests.yml): 前端测试

### 触发条件

```yaml
# 推送到 main/develop 分支
on:
  push:
    branches: [ main, develop ]

# Pull Request
  pull_request:
    branches: [ main, develop ]

# 定时执行（安全扫描）
  schedule:
    - cron: '0 2 * * *'
```

### 配置 Secrets

在 GitHub 仓库中配置以下 Secrets：

```
# 必需的 Secrets
SNYK_TOKEN                   # Snyk 安全扫描令牌
KUBE_CONFIG_PROD             # 生产环境 kubeconfig (base64)
KUBE_CONFIG_STAGING          # 预发环境 kubeconfig (base64)
DOCKER_REGISTRY_PASSWORD     # Docker Registry 密码
AWS_ACCESS_KEY_ID            # AWS 访问密钥 ID
AWS_SECRET_ACCESS_KEY        # AWS 访问密钥

# 可选的 Secrets
SLACK_WEBHOOK                # Slack 通知 Webhook
CODECOV_TOKEN                # Codecov 令牌
```

### 工作流执行步骤

1. **Lint & Format**: ESLint + Prettier 检查
2. **Security Audit**: npm audit + Snyk 扫描
3. **Unit Tests**: 单元测试 + 覆盖率
4. **Integration Tests**: 集成测试
5. **Build**: 构建 Docker 镜像
6. **Security Scan**: 镜像安全扫描
7. **Deploy**: 部署到环境

---

## 监控与日志

### Prometheus + Grafana

```bash
# 访问 Prometheus
kubectl port-forward -n smartvillage-prod svc/prometheus 9090:9090

# 访问 Grafana
kubectl port-forward -n smartvillage-prod svc/grafana 3002:3000
```

### 查看日志

```bash
# 查看所有服务日志
kubectl logs -f -n smartvillage-prod -l app=smartvillage

# 查看特定服务日志
kubectl logs -f -n smartvillage-prod deployment/api-server

# 查看最近 100 行日志
kubectl logs --tail=100 -n smartvillage-prod deployment/api-server
```

### 健康检查

```bash
# API 健康检查
curl http://api-server:3001/api/v1/health

# Village 服务健康检查
curl http://village-server:5000/api/health
```

---

## 故障排除

### Pod 无法启动

```bash
# 查看 Pod 状态
kubectl describe pod <pod-name> -n smartvillage-prod

# 查看 Pod 日志
kubectl logs <pod-name> -n smartvillage-prod

# 查看事件
kubectl get events -n smartvillage-prod --sort-by='.lastTimestamp'
```

### 服务无法访问

```bash
# 检查 Service
kubectl get svc -n smartvillage-prod

# 检查 Endpoints
kubectl get endpoints -n smartvillage-prod

# 检查 Ingress
kubectl get ingress -n smartvillage-prod
```

### 数据库连接问题

```bash
# 检查 MongoDB 状态
kubectl exec -it -n smartvillage-prod mongodb-0 -- mongosh --eval "db.runCommand('ping')"

# 检查 Redis 状态
kubectl exec -it -n smartvillage-prod redis-0 -- redis-cli ping
```

### 性能问题

```bash
# 查看 Pod 资源使用
kubectl top pods -n smartvillage-prod

# 查看 HPA 状态
kubectl get hpa -n smartvillage-prod

# 调整副本数
kubectl scale deployment api-server --replicas=5 -n smartvillage-prod
```

---

## 常用命令

### 快速部署

```bash
# 开发环境
npm run dev

# Docker 开发环境
cd docker && docker-compose -f docker-compose.dev.yml up

# Kubernetes 部署
./deploy/deploy.sh -e prod -a deploy
```

### 维护操作

```bash
# 重启服务
kubectl rollout restart deployment/api-server -n smartvillage-prod

# 查看资源使用
kubectl top pods -n smartvillage-prod

# 进入容器
kubectl exec -it <pod-name> -n smartvillage-prod -- /bin/sh

# 端口转发
kubectl port-forward svc/api-server 3001:3001 -n smartvillage-prod
```

### 备份与恢复

```bash
# MongoDB 备份
kubectl exec -n smartvillage-prod mongodb-0 -- mongodump --archive=/backup/mongo-$(date +%Y%m%d).tar.gz

# Redis 备份
kubectl exec -n smartvillage-prod redis-0 -- redis-cli SAVE
```

---

## 附录

### A. 环境变量清单

见 `.env.example` 和 `.env.production.example`

### B. 端口映射

| 服务 | 容器端口 | 宿主机端口 |
|------|----------|------------|
| API Server | 3001 | 3001 |
| Village Server | 5000 | 5000 |
| Frontend | 80 | 3000 |
| MongoDB | 27017 | 27017 |
| Redis | 6379 | 6379 |
| Prometheus | 9090 | 9090 |
| Grafana | 3000 | 3002 |

### C. 目录结构

```
smart-village-platform/
├── .github/
│   └── workflows/          # GitHub Actions 工作流
├── client/                 # 前端代码
├── docker/                 # Docker 配置
│   ├── Dockerfile.api-server.v2
│   ├── Dockerfile.village-server.v2
│   ├── Dockerfile.frontend.v2
│   ├── docker-compose.dev.yml
│   └── docker-compose.prod.yml
├── deploy/                 # 部署脚本
│   └── deploy.sh
├── k8s/                    # Kubernetes 配置
│   ├── api-deployment.yaml
│   ├── hpa.yaml
│   ├── network-policies.yaml
│   └── ...
├── server/                 # Village Server
├── src/                    # API Server
└── tests/                  # 测试文件
```

### D. 相关文档

- [API 设计文档](./API_DESIGN_STANDARDS.md)
- [系统架构文档](./WISDOM_VILLAGE_TECHNICAL_ARCHITECTURE.md)
- [部署优化报告](./DEPLOYMENT_OPTIMIZATION_PLAN.md)

---

**文档版本**: v1.0.0  
**更新日期**: 2024-12-24  
**维护者**: DevOps Team
