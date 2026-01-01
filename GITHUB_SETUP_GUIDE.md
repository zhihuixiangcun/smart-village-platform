# GitHub Repository 配置指南

## 🚀 快速启动脚本

网络恢复后，请按以下顺序执行：

### 1. 推送剩余代码
```bash
# 进入项目目录
cd "G:\claude code"

# 推送所有提交
git push origin main

# 如果推送失败，尝试强制推送
git push origin main --force-with-lease
```

### 2. GitHub Settings 配置

#### 🔒 分支保护规则设置
访问: https://github.com/zhihuixiangcun/smart-village-platform/settings/branches

1. **配置 main 分支保护**:
   - ✅ Require pull request reviews before merging
     - Required approving reviewers: `1`
     - Dismiss stale PR approvals when new commits are pushed: `✅`
     - Require review from CODEOWNERS: `✅`
   - ✅ Require status checks to pass before merging
     - Required status checks:
       - `ci/github-actions`
       - `code-quality`
       - `security-scan`
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings

2. **代码审查者设置**:
   - 添加至少2名代码审查者
   - 设置CODEOWNERS文件（见下方）

#### 👥 Teams 和权限管理
访问: https://github.com/zhihuixiangcun/smart-village-platform/settings/teams

创建团队：
- **Admins** - 完全控制权限
- **Developers** - 代码写入和审查权限
- **Reviewers** - 仅代码审查权限
- **Viewers** - 只读权限

### 3. GitHub Projects 设置
访问: https://github.com/zhihuixiangcun/smart-village-platform/projects

创建看板：
- **Backlog** - 待办事项
- **In Progress** - 进行中
- **Code Review** - 代码审查
- **Testing** - 测试中
- **Done** - 已完成

### 4. 自动化配置脚本

创建 `setup-github.sh` 脚本：

```bash
#!/bin/bash

echo "🚀 开始配置GitHub Repository..."

# 设置GitHub Token
export GITHUB_TOKEN="your_github_token_here"
REPO="zhihuixiangcun/smart-village-platform"

# 1. 创建CODEOWNERS文件
cat > .github/CODEOWNERS << 'EOF'
# 全局代码所有者
* @zhihuixiangcun/admins

# 特定目录所有者
/client/ @zhihuixiangcun/frontend-team
/server/ @zhihuixiangcun/backend-team
/src/ @zhihuixiangcun/backend-team
/security/ @zhihuixiangcun/security-team

# 文档所有者
docs/ @zhihuixiangcun/docs-team
.github/ @zhihuixiangcun/devops-team

# 紧急变更批准人
*.yml @zhihuixiangcun/admins
*.yaml @zhihuixiangcun/admins
Dockerfile* @zhihuixiangcun/devops-team
EOF

# 2. 创建Issue模板
mkdir -p .github/ISSUE_TEMPLATE

cat > .github/ISSUE_TEMPLATE/bug_report.md << 'EOF'
---
name: Bug Report
about: 报告系统缺陷
title: '[BUG] '
labels: bug
assignees: ''
---

## 🐛 问题描述
清晰简洁地描述遇到的问题

## 🔄 复现步骤
1. 进入 '...'
2. 点击 '....'
3. 滚动到 '....'
4. 看到错误

## 🎯 期望行为
描述你期望发生的行为

## 📸 截图
如果适用，添加截图来帮助解释问题

## 🛠️ 环境信息
- 操作系统: [例如 iOS]
- 浏览器: [例如 chrome, safari]
- 版本: [例如 22]

## 📝 附加信息
添加任何其他关于问题的信息
EOF

cat > .github/ISSUE_TEMPLATE/feature_request.md << 'EOF'
---
name: Feature Request
about: 建议新功能
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## 🚀 功能描述
清晰简洁地描述你想要的功能

## 💡 解决的问题
这个功能解决了什么问题？
是否有其他解决方案？

## 🎯 详细描述
详细描述你希望如何实现这个功能

## 📝 附加信息
添加任何其他关于功能请求的信息
EOF

# 3. 创建PR模板
cat > .github/pull_request_template.md << 'EOF'
## 📝 变更描述
简要描述这个PR的变更内容

## 🎯 变更类型
- [ ] Bug修复
- [ ] 新功能
- [ ] 代码重构
- [ ] 文档更新
- [ ] 性能优化
- [ ] 安全修复

## 🧪 测试
- [ ] 单元测试已通过
- [ ] 集成测试已通过
- [ ] 手动测试已完成
- [ ] 浏览器兼容性测试

## 📋 检查清单
- [ ] 代码遵循项目规范
- [ ] 自我审查了代码
- [ ] 添加了必要的注释
- [ ] 更新了相关文档
- [ ] 没有引入新的警告

## 🔗 相关Issue
Closes #(issue number)

## 📸 截图
如果适用，添加截图来展示变更

## 💬 备注
任何审查者需要知道的额外信息
EOF

# 4. 创建标签保护
cat > setup-labels.sh << 'EOF'
#!/bin/bash

# GitHub标签配置
labels=(
  "bug:🐛:d73a4a"
  "enhancement:✨:a2eeef"
  "documentation:📝:0075ca"
  "good first issue:🤗:7057ff"
  "help wanted:❤️:008672"
  "priority/high:🔴:d73a4a"
  "priority/medium:🟡:fbca04"
  "priority/low:🟢:2ecc71"
  "security:🔒:ff4d4d"
  "performance:⚡:f4c542"
  "wontfix:❌:ffffff"
  "question:❓:d876e3"
)

for label in "${labels[@]}"; do
  IFS=':' read -r name color description <<< "$label"
  gh label create "$name" --color "$color" --description "$description" 2>/dev/null || echo "Label $name already exists"
done
EOF

# 5. 提交配置文件
git add .github/CODEOWNERS .github/ISSUE_TEMPLATE/ .github/pull_request_template.md setup-labels.sh
git commit -m "feat: 添加GitHub配置文件和模板"

echo "✅ GitHub配置文件已创建完成！"
echo "📋 下一步："
echo "1. 推送代码到GitHub"
echo "2. 在GitHub Settings中配置分支保护"
echo "3. 创建Teams和设置权限"
echo "4. 运行 ./setup-labels.sh 创建标签"
```

### 5. 安全配置

#### 🔐 Secrets 配置
访问: https://github.com/zhihuixiangcun/smart-village-platform/settings/secrets/actions

需要添加的Secrets：
```
DOCKER_USERNAME=your_docker_username
DOCKER_PASSWORD=your_docker_password
GITHUB_TOKEN=your_github_token
KUBE_CONFIG_STAGING=base64_encoded_kubeconfig
KUBE_CONFIG_PROD=base64_encoded_kubeconfig
SLACK_WEBHOOK=your_slack_webhook_url
DEPLOYMENT_WEBHOOK=your_deployment_webhook_url
```

#### 🛡️ Security Advisories
访问: https://github.com/zhihuixiangcun/smart-village-platform/security/advisories

配置：
- 启用自动安全警报
- 配置依赖项审查
- 设置安全策略

### 6. 集成工具配置

#### 📊 GitHub Apps 推荐安装：

1. **Codecov** - 代码覆盖率报告
2. **Dependabot** - 依赖项自动更新
3. **Snyk** - 安全漏洞扫描
4. **SonarCloud** - 代码质量分析
5. **Stale** - 自动关闭不活跃的Issue/PR

#### 🔌 Integrations 配置：

1. **Slack集成** - 通知和协作
2. **Jira集成** - 项目管理
3. **Teams集成** - 微软团队协作
4. **Email通知** - 重要事件提醒

### 7. 监控和报告

#### 📈 GitHub Insights
访问: https://github.com/zhihuixiangcun/smart-village-platform/pulse

监控指标：
- 代码提交频率
- PR合并时间
- Issue解决时间
- 贡献者活动

#### 📊 自定义Dashboard
创建GitHub Projects Dashboard显示：
- 开发进度
- Bug修复状态
- 发布计划
- 团队工作负载

### 8. 自动化工作流优化

#### 🤖 GitHub Actions 优化建议：

1. **并行化测试** - 减少CI运行时间
2. **智能缓存** - 加速构建过程
3. **条件触发** - 避免不必要的运行
4. **矩阵构建** - 多环境并行测试

### 9. 团队协作最佳实践

#### 👥 代码审查流程：
1. 创建功能分支
2. 提交PR并指派审查者
3. 至少1人审查通过
4. CI/CD检查通过
5. 合并到main分支

#### 📋 项目管理流程：
1. 使用GitHub Projects跟踪任务
2. 定期站会同步进度
3. 版本规划和发布管理
4. 文档维护和知识分享

## 🆘 故障排除

### 常见问题：

1. **推送失败** - 检查网络连接和SSH密钥
2. **权限错误** - 确认GitHub Token权限
3. **CI失败** - 检查依赖和环境配置
4. **合并冲突** - 使用rebase或merge解决

### 联系支持：
- 技术支持: 18886990223@163.com
- GitHub文档: https://docs.github.com
- 项目讨论: GitHub Discussions

---

**注意**: 请在网络连接恢复后按顺序执行以上步骤！