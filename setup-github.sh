#!/bin/bash

echo "🚀 智慧村庄平台 - GitHub Repository 配置脚本"
echo "================================================"

# 检查网络连接
echo "📡 检查网络连接..."
if ! ping -c 1 github.com &> /dev/null; then
    echo "❌ 无法连接到GitHub，请检查网络连接"
    echo "💡 网络恢复后重新运行此脚本"
    exit 1
fi

echo "✅ 网络连接正常"

# 设置变量
REPO="zhihuixiangcun/smart-village-platform"
BRANCH="main"

# 检查是否安装了GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "⚠️ GitHub CLI未安装，请先安装gh CLI"
    echo "安装指南: https://cli.github.com/"
    exit 1
fi

# 检查GitHub登录状态
echo "🔐 检查GitHub认证状态..."
if ! gh auth status &> /dev/null; then
    echo "❌ 未登录GitHub，请先执行: gh auth login"
    exit 1
fi

echo "✅ GitHub认证通过"

# 1. 推送剩余代码
echo "📤 推送剩余代码到GitHub..."
if git push origin main; then
    echo "✅ 代码推送成功"
else
    echo "❌ 代码推送失败，尝试强制推送..."
    git push origin main --force-with-lease
fi

# 2. 创建CODEOWNERS文件
echo "📝 创建CODEOWNERS文件..."
mkdir -p .github
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

# 配置文件
package*.json @zhihuixiangcun/backend-team
*.js @zhihuixiangcun/backend-team
*.vue @zhihuixiangcun/frontend-team
*.ts @zhihuixiangcun/frontend-team

# 安全相关文件
src/security/ @zhihuixiangcun/security-team
security/ @zhihuixiangcun/security-team
*.key @zhihuixiangcun/security-team
*.pem @zhihuixiangcun/security-team
EOF

# 3. 创建Issue模板
echo "📋 创建Issue模板..."
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
- 操作系统: [例如 Windows 10, macOS 12.0]
- 浏览器: [例如 Chrome, Safari]
- 应用版本: [例如 v1.2.3]

## 📝 附加信息
添加任何其他关于问题的信息

## 🏷️ 标签
- 版本:
- 严重程度: [高/中/低]
- 影响范围: [用户/管理员/系统]
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

## 📋 验收标准
- [ ] 功能1实现
- [ ] 功能2实现
- [ ] 功能3实现

## 🎨 设计建议
如果有UI设计要求，请描述或上传设计稿

## 📝 附加信息
添加任何其他关于功能请求的信息

## 🏷️ 标签
- 优先级: [高/中/低]
- 复杂度: [简单/中等/复杂]
- 影响用户: [村民/村委/管理员]
EOF

cat > .github/ISSUE_TEMPLATE/security_issue.md << 'EOF'
---
name: Security Issue
about: 报告安全问题
title: '[SECURITY] '
labels: security
assignees: ''
---

## 🔒 安全问题描述
详细描述发现的安全问题

## 🎯 影响范围
- 哪些功能受影响
- 可能的风险等级
- 影响的用户群体

## 🛡️ 利用方式（如适用）
描述如何利用这个安全漏洞

## 🔧 建议修复方案
提出修复建议

## 📝 附加信息
任何其他相关信息

## ⚠️ 重要提醒
对于严重安全问题，请直接发送邮件到：18886990223@163.com
不要在公开Issue中详细描述漏洞利用方式
EOF

# 4. 创建PR模板
cat > .github/pull_request_template.md << 'EOF'
## 📝 变更描述
简要描述这个PR的变更内容

## 🎯 变更类型
- [ ] Bug修复 (修复了什么问题)
- [ ] 新功能 (添加了什么功能)
- [ ] 代码重构 (改善了什么结构)
- [ ] 文档更新 (更新了什么文档)
- [ ] 性能优化 (提升了什么性能)
- [ ] 安全修复 (修复了什么安全问题)

## 🧪 测试
- [ ] 单元测试已通过 (`npm test`)
- [ ] 集成测试已通过
- [ ] 手动测试已完成
- [ ] 代码覆盖率 > 80%
- [ ] 浏览器兼容性测试

## 📋 检查清单
- [ ] 代码遵循项目ESLint规范
- [ ] 已进行自我代码审查
- [ ] 添加了必要的注释和文档
- [ ] 更新了相关的API文档
- [ ] 没有引入新的安全漏洞
- [ ] 性能影响已评估
- [ ] 用户隐私已保护

## 🔗 相关Issue
- Closes #(issue number)
- Related to #(issue number)

## 📸 截图/演示
如果适用，添加截图或GIF来展示变更

## 🗂️ 变更文件
列出本次变更的主要文件：
-
-
-

## 💬 备注
任何审查者需要知道的额外信息

## 🚀 部署说明
如果有特殊的部署要求，请说明：

## 📚 参考资料
相关的设计文档、API文档等链接
EOF

# 5. 创建依赖项审查配置
cat > .github/dependabot.yml << 'EOF'
version: 2
updates:
  # 监控npm依赖
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    reviewers:
      - "zhihuixiangcun/backend-team"
    assignees:
      - "zhihuixiangcun/admins"
    commit-message:
      prefix: "deps"
      include: "scope"

  # 监控前端npm依赖
  - package-ecosystem: "npm"
    directory: "/client"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    reviewers:
      - "zhihuixiangcun/frontend-team"
    assignees:
      - "zhihuixiangcun/admins"
    commit-message:
      prefix: "deps"
      include: "scope"

  # 监控GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    reviewers:
      - "zhihuixiangcun/devops-team"
    assignees:
      - "zhihuixiangcun/admins"
    commit-message:
      prefix: "ci"
      include: "scope"
EOF

# 6. 创建标签配置脚本
cat > setup-labels.sh << 'EOF'
#!/bin/bash

echo "🏷️ 创建GitHub标签..."

# 定义标签：名称:颜色:描述
declare -A labels=(
    ["bug"]="d73a4a:Bug报告"
    ["enhancement"]="a2eeef:功能增强"
    ["documentation"]="0075ca:文档相关"
    ["good first issue"]="7057ff:适合新手的任务"
    ["help wanted"]="008672:需要帮助"
    ["priority/high"]="d73a4a:高优先级"
    ["priority/medium"]="fbca04:中优先级"
    ["priority/low"]="2ecc71:低优先级"
    ["security"]="ff4d4d:安全问题"
    ["performance"]="f4c542:性能优化"
    ["wontfix"]="ffffff:不予修复"
    ["question"]="d876e3:问题咨询"
    ["duplicate"]="cccccc:重复问题"
    ["invalid"]="e6e6e6:无效问题"
    ["breaking-change"]="b60205:重大变更"
    ["dependencies"]="0366d6:依赖更新"
    ["frontend"]="84b6eb:前端相关"
    ["backend"]="0075ca:后端相关"
    ["devops"]="0e8a16:运维相关"
    ["security-review"]="1d76db:安全审查"
    ["tests"]="5319e7:测试相关"
    ["deployment"]="d4c5f9:部署相关"
    ["ci/cd"]="bfdadc:CI/CD相关"
    ["hotfix"]="ee0701:热修复"
    ["release"]="1a7f37:版本发布"
)

for label in "${!labels[@]}"; do
    IFS=':' read -r color description <<< "${labels[$label]}"

    if gh label create "$label" --color "$color" --description "$description" --repo "$REPO" 2>/dev/null; then
        echo "✅ 创建标签: $label"
    else
        echo "⚠️ 标签已存在: $label"
    fi
done

echo "🏷️ 标签创建完成！"
EOF

chmod +x setup-labels.sh

# 7. 创建团队管理脚本
cat > manage-teams.sh << 'EOF'
#!/bin/bash

echo "👥 创建GitHub团队..."

REPO="zhihuixiangcun/smart-village-platform"

# 定义团队和权限
declare -A teams=(
    ["admins"]="admin:项目管理员，拥有完整权限"
    ["developers"]="write:开发人员，拥有代码写入权限"
    ["reviewers"]="read:代码审查者，只能审查不能直接推送"
    ["frontend"]="write:前端开发团队"
    ["backend"]="write:后端开发团队"
    ["devops"]="write:运维团队"
    ["security"]="read:安全团队，只读权限"
    ["docs"]="write:文档维护团队"
)

for team in "${!teams[@]}"; do
    IFS=':' read -r permission description <<< "${teams[$team]}"

    # 创建团队
    if gh team create "$team" --description "$description" --repo "$REPO" 2>/dev/null; then
        echo "✅ 创建团队: $team"
    else
        echo "⚠️ 团队已存在: $team"
    fi

    # 添加团队到仓库
    gh api repos/:owner/:repo/teams/"$team" -X PUT -f permission="$permission" --silent
    echo "🔐 设置团队 $team 权限: $permission"
done

echo "👥 团队管理设置完成！"
echo "💡 使用以下命令添加成员到团队："
echo "gh team add-member <team-name> <username> --role member"
EOF

chmod +x manage-teams.sh

# 8. 提交配置文件
echo "📤 提交GitHub配置文件..."
git add .github/
git commit -m "feat: 添加完整的GitHub Repository配置

🔧 配置内容:
- CODEOWNERS文件，指定代码所有者
- Issue模板 (Bug报告、功能请求、安全问题)
- Pull Request模板，标准化PR流程
- Dependabot配置，自动依赖更新
- 标签管理脚本
- 团队管理脚本

📋 下一步操作:
1. 运行 ./setup-labels.sh 创建标签
2. 运行 ./manage-teams.sh 创建团队
3. 在GitHub Settings中配置分支保护规则
4. 添加必要的Secrets配置

🚀 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 9. 推送配置文件
if git push origin main; then
    echo "✅ 配置文件推送成功"
else
    echo "❌ 配置文件推送失败"
fi

echo ""
echo "🎉 GitHub Repository配置完成！"
echo ""
echo "📋 后续手动操作步骤："
echo ""
echo "1️⃣ 运行标签创建脚本："
echo "   ./setup-labels.sh"
echo ""
echo "2️⃣ 运行团队管理脚本："
echo "   ./manage-teams.sh"
echo ""
echo "3️⃣ 访问GitHub配置分支保护："
echo "   https://github.com/zhihuixiangcun/smart-village-platform/settings/branches"
echo ""
echo "4️⃣ 配置GitHub Actions Secrets："
echo "   https://github.com/zhihuixiangcun/smart-village-platform/settings/secrets/actions"
echo ""
echo "5️⃣ 安装推荐的GitHub Apps："
echo "   - Codecov (代码覆盖率)"
echo "   - Snyk (安全扫描)"
echo "   - SonarCloud (代码质量)"
echo ""
echo "📧 技术支持：18886990223@163.com"
echo "📖 详细文档：查看 GITHUB_SETUP_GUIDE.md"