#!/bin/bash

# CI/CD配置脚本
# 用于智慧村庄综合服务平台的持续集成和持续部署设置

echo "🚀 智慧村庄平台 - CI/CD配置工具"
echo "================================"

# 项目基本信息
REPO_OWNER="zhihuixiangcun"
REPO_NAME="smart-village-platform"
REPO_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}"

echo ""
echo "📋 CI/CD配置清单："
echo "1. 🔧 GitHub Actions工作流"
echo "   - 主CI/CD流水线 (ci.yml)"
echo "   - 代码质量检查 (code-quality.yml)"
echo "   - 依赖自动更新 (dependency-update.yml)"
echo ""
echo "2. ⚡ 自动测试"
echo "   - 单元测试 (Jest)"
echo "   - 集成测试"
echo "   - API测试"
echo "   - E2E测试 (Playwright)"
echo "   - 性能测试 (Artillery)"
echo ""
echo "3. 🚀 自动部署"
echo "   - 测试环境部署"
echo "   - 生产环境部署"
echo "   - Docker容器化"
echo "   - AWS ECR集成"
echo ""
echo "4. 🔒 安全检查"
echo "   - npm audit安全扫描"
echo "   - Snyk安全分析"
echo "   - 依赖漏洞检测"
echo "   - 代码质量门禁"

# 菜单选择
echo ""
echo "🔧 请选择操作："
echo "1) 查看CI/CD配置"
echo "2) 验证GitHub Actions配置"
echo "3) 设置GitHub Secrets"
echo "4) 生成CI/CD文档"
echo "5) 测试CI/CD流水线"
echo "6) 配置监控和通知"
echo ""

read -p "请输入选项 (1-6): " choice

case $choice in
    1)
        echo ""
        echo "📖 CI/CD配置详情"
        echo "================"

        echo ""
        echo "🔧 GitHub Actions工作流："
        echo "----------------------"

        echo "✅ .github/workflows/ci.yml"
        echo "   - 代码质量检查 (ESLint, Prettier)"
        echo "   - 安全扫描 (npm audit, Snyk)"
        echo "   - 单元测试和覆盖率"
        echo "   - 集成测试和API测试"
        echo "   - 前端构建测试"
        echo "   - E2E测试 (Playwright)"
        echo "   - 性能测试 (Artillery)"
        echo "   - 自动部署到测试/生产环境"
        echo "   - 发布管理和创建Release"

        echo ""
        echo "✅ .github/workflows/code-quality.yml"
        echo "   - 代码格式检查"
        echo "   - 代码复杂度分析"
        echo "   - 代码覆盖率检查"
        echo "   - 依赖安全检查"
        echo "   - 质量门禁"
        echo "   - 性能基准测试"

        echo ""
        echo "✅ .github/workflows/dependency-update.yml"
        echo "   - 每周依赖更新检查"
        echo "   - 自动更新补丁版本"
        echo "   - 安全漏洞自动修复"
        echo "   - 创建更新PR"
        echo "   - 通知和报告生成"

        echo ""
        echo "📋 触发条件："
        echo "- Push到main/develop分支"
        "- Pull Request创建/更新"
        "- 定时任务 (每周一9点)"
        "- 手动触发"

        echo ""
        echo "🏗️ 环境配置："
        echo "- Node.js 18"
        echo "- MongoDB 5.0"
        echo "- Redis 6"
        echo "- Ubuntu latest"
        echo ""

        echo "⚙️  测试覆盖率要求："
        echo "- 最低覆盖率: 80%"
        echo "- 函数复杂度: ≤10"
        echo "- 文件复杂度: ≤50"
        echo "- 平均复杂度: ≤5"
        ;;

    2)
        echo ""
        echo "✅ 验证GitHub Actions配置"
        echo "========================"

        workflows=(
            ".github/workflows/ci.yml"
            ".github/workflows/code-quality.yml"
            ".github/workflows/dependency-update.yml"
        )

        errors=0

        for workflow in "${workflows[@]}"; do
            if [ -f "$workflow" ]; then
                echo "✅ $workflow"
                # 简单的YAML语法检查
                if command -v yq &> /dev/null; then
                    if yq eval '.' "$workflow" > /dev/null 2>&1; then
                        echo "   ✅ YAML格式正确"
                    else
                        echo "   ❌ YAML格式错误"
                        errors=$((errors + 1))
                    fi
                fi
            else
                echo "❌ $workflow 不存在"
                errors=$((errors + 1))
            fi
        done

        # 检查复杂度检查脚本
        if [ -f "scripts/check-complexity.js" ]; then
            echo "✅ scripts/check-complexity.js"
        else
            echo "❌ scripts/check-complexity.js 不存在"
            errors=$((errors + 1))
        fi

        # 检查性能测试配置
        if [ -f "tests/performance/load-test.yml" ]; then
            echo "✅ tests/performance/load-test.yml"
        else
            echo "⚠️  tests/performance/load-test.yml 不存在 (将创建)"
            mkdir -p tests/performance
            cat > tests/performance/load-test.yml << 'EOF'
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - flow:
    - get:
        url: "/api/v1/health"
    - get:
        url: "/api/v1/dashboard"
    - think: 1
EOF
        fi

        echo ""
        if [ $errors -eq 0 ]; then
            echo "🎉 所有CI/CD配置文件验证通过！"
        else
            echo "❌ 发现 $errors 个配置错误，请检查并修复"
        fi
        ;;

    3)
        echo ""
        echo "🔐 设置GitHub Secrets"
        echo "===================="

        echo "需要在GitHub仓库中配置以下Secrets："
        echo ""

        echo "📋 必需的Secrets："
        echo "1. AWS_ACCESS_KEY_ID"
        echo "   - AWS访问密钥ID"
        echo "   - 用于ECR推送和部署"
        echo ""

        echo "2. AWS_SECRET_ACCESS_KEY"
        echo "   - AWS秘密访问密钥"
        echo "   - 用于ECR推送和部署"
        echo ""

        echo "3. SNYK_TOKEN"
        echo "   - Snyk API令牌"
        echo "   - 用于安全扫描"
        echo "   - 获取地址: https://snyk.io"
        echo ""

        echo "📋 可选的Secrets："
        echo "4. SLACK_WEBHOOK_URL"
        echo "   - Slack Webhook URL"
        echo "   - 用于部署通知"
        echo ""

        echo "5. CODECOV_TOKEN"
        echo "   - Codecov令牌"
        echo "   - 用于代码覆盖率报告"
        echo ""

        echo ""
        echo "🔧 配置步骤："
        echo "1. 访问: ${REPO_URL}/settings/secrets/actions"
        echo "2. 点击 'New repository secret'"
        echo "3. 输入上述Secret名称和值"
        echo "4. 重复添加所有必需的Secrets"
        echo ""

        echo "⚠️  重要提醒："
        echo "- 请确保Secrets的值正确无误"
        echo "- 定期轮换访问密钥"
        echo "- 不要在代码中硬编码敏感信息"
        ;;

    4)
        echo ""
        echo "📄 生成CI/CD文档"
        echo "================"

        cat > CICD_GUIDE.md << 'EOF'
# 智慧村庄综合服务平台 - CI/CD指南

## 🚀 概述

本项目采用现代化的CI/CD流水线，确保代码质量、安全性和自动化部署。

## 🔧 GitHub Actions工作流

### 1. 主CI/CD流水线 (`.github/workflows/ci.yml`)

**触发条件**:
- Push到`main`或`develop`分支
- Pull Request创建/更新

**主要阶段**:
1. **代码质量检查** - ESLint, Prettier格式检查
2. **安全扫描** - npm audit, Snyk安全分析
3. **单元测试** - Jest测试框架，覆盖率要求80%+
4. **集成测试** - API测试，数据库集成测试
5. **前端构建** - Vue.js应用构建和测试
6. **E2E测试** - Playwright端到端测试
7. **性能测试** - Artillery负载测试
8. **自动部署** - 测试环境/生产环境部署
9. **发布管理** - 创建GitHub Release

### 2. 代码质量检查 (`.github/workflows/code-quality.yml`)

**检查项目**:
- 代码格式化 (Prettier)
- 代码规范 (ESLint)
- 代码复杂度分析
- 测试覆盖率
- 依赖安全性
- 性能基准测试

**质量门禁**:
- 代码覆盖率 ≥ 80%
- 函数复杂度 ≤ 10
- 文件复杂度 ≤ 50
- 无高危安全漏洞

### 3. 依赖自动更新 (`.github/workflows/dependency-update.yml`)

**更新策略**:
- 每周一自动检查依赖更新
- 自动更新补丁版本
- 自动修复安全漏洞
- 创建Pull Request
- 发送通知和报告

## ⚡ 自动测试

### 测试类型

1. **单元测试**
   ```bash
   npm test
   npm run test:coverage
   ```

2. **集成测试**
   ```bash
   npm run test:integration
   ```

3. **API测试**
   ```bash
   npm run test:api
   ```

4. **E2E测试**
   ```bash
   npm run test:e2e
   ```

5. **性能测试**
   ```bash
   npm run test:performance
   ```

### 测试环境

- **Node.js**: 18.x
- **MongoDB**: 5.0
- **Redis**: 6.x
- **操作系统**: Ubuntu latest

## 🚀 自动部署

### 部署环境

1. **测试环境** (Staging)
   - 触发条件: Push到`develop`分支
   - 自动部署到测试环境
   - 运行完整测试套件

2. **生产环境** (Production)
   - 触发条件: Push到`main`分支
   - 通过所有质量检查
   - 自动部署到生产环境

### 部署流程

1. **代码检查** - 质量门禁检查
2. **构建镜像** - Docker镜像构建
3. **推送镜像** - 推送到ECR
4. **部署应用** - 更新生产环境
5. **健康检查** - 验证部署成功
6. **发送通知** - Slack通知部署结果

## 🔒 安全配置

### GitHub Secrets

必需配置的Secrets:

- `AWS_ACCESS_KEY_ID` - AWS访问密钥
- `AWS_SECRET_ACCESS_KEY` - AWS秘密密钥
- `SNYK_TOKEN` - Snyk安全扫描令牌

可选配置的Secrets:

- `SLACK_WEBHOOK_URL` - Slack通知URL
- `CODECOV_TOKEN` - 代码覆盖率令牌

### 安全检查

- **依赖扫描** - npm audit, Snyk
- **代码安全** - 安全最佳实践检查
- **容器安全** - Docker镜像安全扫描

## 📊 监控和报告

### 覆盖率报告

- **Codecov** - 代码覆盖率报告和趋势分析
- **本地报告** - `coverage/`目录

### 性能报告

- **Artillery** - 负载测试结果
- **基准测试** - 性能回归检测

### 质量报告

- **SonarQube** - 代码质量分析 (可选)
- **质量门禁** - 自动化质量检查

## 🛠️ 本地开发

### 运行测试

```bash
# 安装依赖
npm install

# 运行所有测试
npm test

# 运行特定测试
npm run test:unit
npm run test:integration
npm run test:api
npm run test:e2e

# 生成覆盖率报告
npm run test:coverage
```

### 代码质量检查

```bash
# ESLint检查
npm run lint

# Prettier格式检查
npm run format:check

# 自动修复格式
npm run format:fix

# 代码复杂度分析
npm run complexity
```

## 🔄 故障排除

### 常见问题

1. **测试失败**
   - 检查测试环境配置
   - 确认依赖版本兼容性
   - 查看测试日志获取详细错误信息

2. **部署失败**
   - 检查AWS凭证配置
   - 确认ECR权限
   - 查看部署日志

3. **安全扫描失败**
   - 更新有漏洞的依赖包
   - 检查Snyk配置
   - 查看安全报告

### 调试技巧

- 使用`--verbose`参数获取详细日志
- 查看GitHub Actions运行日志
- 使用本地测试环境复现问题

## 📚 相关资源

- [GitHub Actions文档](https://docs.github.com/en/actions)
- [Jest测试框架](https://jestjs.io/)
- [Playwright E2E测试](https://playwright.dev/)
- [Artillery性能测试](https://artillery.io/)
- [Snyk安全扫描](https://snyk.io/)
- [Codecov覆盖率](https://codecov.io/)

---

如有问题，请查看 [Issues](https://github.com/zhihuixiangcun/smart-village-platform/issues) 或联系开发团队。
EOF

        echo "✅ CI/CD文档已生成: CICD_GUIDE.md"
        ;;

    5)
        echo ""
        echo "🧪 测试CI/CD流水线"
        echo "=================="

        echo "正在本地测试CI/CD配置..."

        # 测试代码质量检查
        echo "1. 测试代码格式检查..."
        if command -v prettier &> /dev/null; then
            if prettier --check "src/**/*.js" "client/src/**/*.{js,vue}" 2>/dev/null; then
                echo "   ✅ 代码格式检查通过"
            else
                echo "   ⚠️  代码格式检查发现问题，运行 'npm run format:fix' 修复"
            fi
        else
            echo "   ⚠️  Prettier未安装，跳过格式检查"
        fi

        # 测试ESLint
        echo "2. 测试代码规范检查..."
        if npm run lint 2>/dev/null; then
            echo "   ✅ ESLint检查通过"
        else
            echo "   ⚠️  ESLint检查发现问题"
        fi

        # 测试复杂度检查脚本
        echo "3. 测试复杂度检查脚本..."
        if node scripts/check-complexity.js 2>/dev/null; then
            echo "   ✅ 复杂度检查脚本运行正常"
        else
            echo "   ⚠️  复杂度检查脚本需要配置"
        fi

        # 测试性能测试配置
        echo "4. 测试性能测试配置..."
        if [ -f "tests/performance/load-test.yml" ]; then
            echo "   ✅ 性能测试配置文件存在"
        else
            echo "   ⚠️  性能测试配置文件不存在"
        fi

        echo ""
        echo "🎯 下一步："
        echo "1. 确保所有GitHub Secrets已配置"
        echo "2. 推送代码到GitHub触发CI/CD"
        echo "3. 查看GitHub Actions运行结果"
        echo "4. 根据需要调整配置"
        ;;

    6)
        echo ""
        echo "📊 配置监控和通知"
        echo "=================="

        echo "🔔 通知配置："
        echo "1. Slack通知"
        echo "   - 配置SLACK_WEBHOOK_URL Secret"
        echo "   - 部署成功/失败通知"
        echo "   - 依赖更新通知"
        echo ""

        echo "2. 邮件通知"
        echo "   - 配置邮件服务器"
        echo "   - 测试报告邮件"
        echo "   - 安全漏洞通知"
        echo ""

        echo "📈 监控配置："
        echo "1. 代码质量监控"
        echo "   - SonarQube集成 (可选)"
        echo "   - 覆盖率趋势分析"
        echo "   - 技术债务监控"
        echo ""

        echo "2. 性能监控"
        echo "   - API响应时间监控"
        echo "   - 应用性能监控(APM)"
        echo "   - 资源使用监控"
        echo ""

        echo "3. 安全监控"
        echo "   - 漏洞扫描报告"
        echo "   - 依赖安全状态"
        echo "   - 安全事件告警"
        echo ""

        echo "📋 配置步骤："
        echo "1. 在GitHub仓库Settings中配置Secrets"
        echo "2. 设置外部监控服务 (如需要)"
        echo "3. 配置通知渠道"
        echo "4. 测试通知功能"
        ;;

    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "🎯 相关链接："
echo "   🌐 GitHub Actions: ${REPO_URL}/actions"
echo "   ⚙️  仓库设置: ${REPO_URL}/settings"
echo "   🔐 Secrets配置: ${REPO_URL}/settings/secrets/actions"
echo "   📖 CI/CD文档: CICD_GUIDE.md"
echo ""
echo "📚 更多资源："
echo "   📘 GitHub Actions文档: https://docs.github.com/en/actions"
echo "   🧪 Jest测试框架: https://jestjs.io/"
echo "   🎭 Playwright: https://playwright.dev/"
echo "   🚀 Artillery: https://artillery.io/"
echo "   🛡️  Snyk安全: https://snyk.io/"