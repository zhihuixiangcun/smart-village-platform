#!/bin/bash

# GitHub协作者权限管理脚本
# 用于智慧村庄综合服务平台的团队协作管理

echo "👥 智慧村庄平台 - 协作者权限管理工具"
echo "======================================"

# 仓库基本信息
REPO_OWNER="zhihuixiangcun"
REPO_NAME="smart-village-platform"
REPO_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}"

# 权限级别说明
echo "📋 权限级别说明："
echo "   read     - 只读权限（查看代码、下载）"
echo "   triage   - 问题分类权限（管理Issues和PR）"
echo "   write    - 写入权限（提交代码、管理Issues和PR）"
echo "   maintain - 维护者权限（除仓库设置外的所有权限）"
echo "   admin    - 管理员权限（完全控制权限）"
echo ""

# 检查是否安装了GitHub CLI
if command -v gh &> /dev/null; then
    echo "✅ 检测到GitHub CLI，可以使用自动化功能"
    USE_CLI=true
else
    echo "⚠️  未检测到GitHub CLI，将提供手动操作指南"
    USE_CLI=false
fi

# 菜单选择
echo "🔧 请选择操作："
echo "1) 添加协作者"
echo "2) 查看现有协作者"
echo "3) 移除协作者"
echo "4) 修改协作者权限"
echo "5) 显示手动操作指南"
echo "6) 生成协作规范文档"
echo ""

read -p "请输入选项 (1-6): " choice

case $choice in
    1)
        echo ""
        echo "➕ 添加新协作者"
        read -p "请输入GitHub用户名: " username

        if [ -z "$username" ]; then
            echo "❌ 用户名不能为空"
            exit 1
        fi

        echo "请选择权限级别："
        echo "1) read (只读)"
        echo "2) triage (问题分类)"
        echo "3) write (写入) - 推荐"
        echo "4) maintain (维护者)"
        echo "5) admin (管理员)"

        read -p "请输入权限选项 (1-5): " perm_choice

        case $perm_choice in
            1) permission="read" ;;
            2) permission="triage" ;;
            3) permission="write" ;;
            4) permission="maintain" ;;
            5) permission="admin" ;;
            *) permission="write" ;;
        esac

        echo ""
        echo "📝 将添加用户 $username，权限级别: $permission"

        if [ "$USE_CLI" = true ]; then
            read -p "确认添加? (y/N): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                gh repo collaborator ${REPO_OWNER}/${REPO_NAME} $username --permission $permission
                if [ $? -eq 0 ]; then
                    echo "✅ 成功添加协作者: $username"
                else
                    echo "❌ 添加协作者失败"
                fi
            else
                echo "❌ 操作已取消"
            fi
        else
            echo ""
            echo "📋 手动添加步骤："
            echo "1. 访问: ${REPO_URL}/settings/access"
            echo "2. 点击 'Add people'"
            echo "3. 输入用户名: $username"
            echo "4. 选择权限级别: $permission"
            echo "5. 点击添加按钮"
        fi
        ;;

    2)
        echo ""
        echo "👀 查看现有协作者"

        if [ "$USE_CLI" = true ]; then
            echo "📊 仓库协作者列表："
            gh api repos/${REPO_OWNER}/${REPO_NAME}/collaborators | jq -r '.[] | "\(.login) - \(.permissions)"'
        else
            echo "📋 手动查看步骤："
            echo "1. 访问: ${REPO_URL}/settings/access"
            echo "2. 查看协作者列表和权限"
        fi
        ;;

    3)
        echo ""
        echo "➖ 移除协作者"
        read -p "请输入要移除的GitHub用户名: " username

        if [ -z "$username" ]; then
            echo "❌ 用户名不能为空"
            exit 1
        fi

        echo "⚠️  将移除协作者: $username"

        if [ "$USE_CLI" = true ]; then
            read -p "确认移除? (y/N): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                gh api --method DELETE repos/${REPO_OWNER}/${REPO_NAME}/collaborators/$username
                if [ $? -eq 0 ]; then
                    echo "✅ 成功移除协作者: $username"
                else
                    echo "❌ 移除协作者失败"
                fi
            else
                echo "❌ 操作已取消"
            fi
        else
            echo ""
            echo "📋 手动移除步骤："
            echo "1. 访问: ${REPO_URL}/settings/access"
            echo "2. 找到用户: $username"
            echo "3. 点击右侧的 'Remove' 按钮"
            echo "4. 确认移除操作"
        fi
        ;;

    4)
        echo ""
        echo "✏️  修改协作者权限"
        read -p "请输入GitHub用户名: " username

        if [ -z "$username" ]; then
            echo "❌ 用户名不能为空"
            exit 1
        fi

        echo "请选择新的权限级别："
        echo "1) read (只读)"
        echo "2) triage (问题分类)"
        echo "3) write (写入)"
        echo "4) maintain (维护者)"
        echo "5) admin (管理员)"

        read -p "请输入权限选项 (1-5): " perm_choice

        case $perm_choice in
            1) permission="read" ;;
            2) permission="triage" ;;
            3) permission="write" ;;
            4) permission="maintain" ;;
            5) permission="admin" ;;
            *) permission="write" ;;
        esac

        echo ""
        echo "📝 将修改用户 $username 的权限为: $permission"

        if [ "$USE_CLI" = true ]; then
            read -p "确认修改? (y/N): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                gh api repos/${REPO_OWNER}/${REPO_NAME}/collaborators/$username --method PUT --field permission=$permission
                if [ $? -eq 0 ]; then
                    echo "✅ 成功修改协作者权限: $username -> $permission"
                else
                    echo "❌ 修改权限失败"
                fi
            else
                echo "❌ 操作已取消"
            fi
        else
            echo ""
            echo "📋 手动修改步骤："
            echo "1. 访问: ${REPO_URL}/settings/access"
            echo "2. 找到用户: $username"
            echo "3. 点击权限级别的下拉菜单"
            echo "4. 选择新权限: $permission"
            echo "5. 保存更改"
        fi
        ;;

    5)
        echo ""
        echo "📖 GitHub网页操作详细指南"
        echo "================================"
        echo ""
        echo "🔗 仓库地址: ${REPO_URL}"
        echo ""
        echo "📝 协作者管理页面: ${REPO_URL}/settings/access"
        echo ""
        echo "➕ 添加协作者步骤："
        echo "1. 点击 'Add people' 按钮"
        echo "2. 输入GitHub用户名或邮箱地址"
        echo "3. 选择适当的权限级别"
        echo "4. 点击 'Add username as collaborator'"
        echo ""
        echo "👀 查看协作者："
        echo "1. 在协作者页面查看所有成员"
        echo "2. 每个协作者都显示其权限级别"
        echo "3. 可以看到最后活跃时间"
        echo ""
        echo "✏️  修改权限："
        echo "1. 找到要修改的协作者"
        echo "2. 点击权限级别的下拉菜单"
        echo "3. 选择新的权限级别"
        echo "4. 系统会自动保存更改"
        echo ""
        echo "➖ 移除协作者："
        echo "1. 找到要移除的协作者"
        echo "2. 点击右侧的 'Remove' 按钮"
        echo "3. 在弹窗中确认移除操作"
        echo "4. 移除后该用户将失去仓库访问权限"
        ;;

    6)
        echo ""
        echo "📄 生成团队协作规范文档"
        echo "================================"

        cat > TEAM_COLLABORATION_GUIDELINES.md << 'EOF'
# 智慧村庄综合服务平台 - 团队协作规范

## 🎯 项目概述
智慧村庄综合服务平台是新一代数字化乡村治理解决方案，基于Vue3+Node.js微服务架构。

## 👥 团队角色与权限

### 🏆 核心开发团队 (Write权限)
**职责：**
- 主要功能模块开发
- 代码提交和Pull Request创建
- 参与代码审查和技术讨论
- 遵循编码规范和最佳实践

**权限：**
- 推送代码到开发分支
- 创建和管理Pull Request
- 查看和管理Issues
- 参与项目Wiki编辑

### 🔧 项目维护者 (Maintain权限)
**职责：**
- 项目日常维护和管理
- 版本发布和标签管理
- 代码质量审查
- 新成员审核和权限管理

**权限：**
- 包含Write权限所有功能
- 管理受保护分支设置
- 创建和管理项目标签
- 管理协作者（除管理员外）

### 📋 项目协调员 (Triage权限)
**职责：**
- Issues分类和优先级管理
- Bug报告和功能需求跟踪
- 团队沟通和进度协调
- 文档更新和维护

**权限：**
- 管理Issues和Pull Requests
- 设置标签和里程碑
- 分配任务给开发人员

## 🔄 开发工作流程

### 分支管理策略
- `main` - 生产环境分支（受保护）
- `develop` - 开发环境分支
- `feature/*` - 功能开发分支
- `hotfix/*` - 紧急修复分支
- `release/*` - 发布准备分支

### 代码提交流程
1. **从develop创建功能分支**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/功能名称
   ```

2. **开发和提交代码**
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   git push origin feature/功能名称
   ```

3. **创建Pull Request**
   - 标题：`feat/fix/docs/refactor: 简短描述`
   - 描述：详细的变更说明和测试步骤
   - 选择审查者：至少需要一位核心开发审查
   - 链接相关Issues：`#123`

### 代码审查规范
- **代码质量**：遵循项目编码规范
- **功能测试**：确保功能正常工作
- **性能影响**：评估对系统性能的影响
- **安全考虑**：检查潜在的安全问题
- **文档更新**：必要时更新相关文档

## 📝 Issues管理规范

### Issue类型标签
- `bug` - Bug报告
- `feature` - 新功能需求
- `enhancement` - 功能改进
- `documentation` - 文档相关
- `question` - 问题咨询
- `performance` - 性能优化
- `security` - 安全问题

### 优先级标签
- `critical` - 紧急（生产环境问题）
- `high` - 高优先级（重要功能缺陷）
- `medium` - 中优先级（一般功能问题）
- `low` - 低优先级（优化改进）

### Issue模板
```markdown
## 问题描述
简要描述遇到的问题或需求

## 重现步骤
1. 操作步骤一
2. 操作步骤二
3. 操作步骤三

## 期望结果
描述期望的正常行为

## 实际结果
描述实际发生的情况

## 环境信息
- 操作系统：
- 浏览器版本：
- 项目版本：

## 附加信息
截图、日志或相关文档链接
```

## 🚀 发布流程

### 版本命名规范
- 主版本号：不兼容的API修改
- 次版本号：向下兼容的功能性新增
- 修订号：向下兼容的问题修正

### 发布检查清单
- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] 版本号已更新
- [ ] 变更日志已编写
- [ ] 安全审查已完成
- [ ] 性能测试通过

### 发布步骤
1. **合并到release分支**
2. **最终测试和修复**
3. **更新版本号和标签**
4. **合并到main分支**
5. **创建Release说明**
6. **部署到生产环境**

## 📊 项目监控

### 代码质量指标
- 代码覆盖率：> 80%
- 代码审查率：100%
- 构建成功率：> 95%
- 安全扫描：0高危问题

### 性能监控
- API响应时间：< 500ms
- 页面加载时间：< 3s
- 系统可用性：> 99.9%
- 错误率：< 0.1%

## 🤝 团队沟通

### 日常沟通
- **开发讨论**：GitHub Issues/PR
- **紧急问题**：项目群聊或电话
- **定期会议**：每周进度同步
- **技术分享**：月度技术交流会

### 文档协作
- **技术文档**：GitHub Wiki
- **API文档**：在线文档系统
- **设计文档**：项目文档目录
- **会议记录**：共享文档平台

## 🛡️ 安全规范

### 代码安全
- 敏感信息加密存储
- 输入数据验证和过滤
- SQL注入防护
- XSS攻击防护

### 权限管理
- 最小权限原则
- 定期权限审查
- 访问日志记录
- 异常行为监控

### 数据保护
- 定期数据备份
- 敏感数据脱敏
- 隐私合规检查
- 数据生命周期管理

---

**团队协作，共同进步！** 🚀
EOF

        echo "✅ 团队协作规范文档已生成: TEAM_COLLABORATION_GUIDELINES.md"
        ;;

    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "🎯 更多信息请参考："
echo "   📖 协作者指南: GITHUB_COLLABORATORS_GUIDE.md"
echo "   🌐 仓库地址: ${REPO_URL}"
echo "   ⚙️  设置页面: ${REPO_URL}/settings"
echo "   👥 协作者页面: ${REPO_URL}/settings/access"