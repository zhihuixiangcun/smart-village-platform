#!/bin/bash

# GitHub Issue模板管理脚本
# 用于智慧村庄综合服务平台的Issue模板配置

echo "📋 智慧村庄平台 - Issue模板管理工具"
echo "===================================="

# 项目基本信息
REPO_OWNER="zhihuixiangcun"
REPO_NAME="smart-village-platform"
REPO_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}"

# Issue模板文件列表
TEMPLATES=(
    "bug_report.md - Bug报告模板"
    "feature_request.md - 功能请求模板"
    "security_issue.md - 安全问题模板"
    "performance_issue.md - 性能问题模板"
    "documentation.md - 文档问题模板"
    "config.yml - Issue配置文件"
)

echo ""
echo "📁 已创建的Issue模板："
for template in "${TEMPLATES[@]}"; do
    echo "   ✅ $template"
done

echo ""
echo "🔧 Issue模板功能说明："
echo ""

echo "🐛 Bug报告 (bug_report.md)"
echo "   - 标准化Bug报告流程"
echo "   - 包含重现步骤、环境信息"
echo "   - 自动添加bug标签"
echo "   - 支持附件上传"
echo ""

echo "🚀 功能请求 (feature_request.md)"
echo "   - 详细的功能需求描述"
echo "   - 问题背景和解决方案"
echo "   - 优先级评估"
echo "   - 设计和安全考虑"
echo ""

echo "🔒 安全问题 (security_issue.md)"
echo "   - 安全漏洞报告专用"
echo "   - 包含CVSS评分"
echo "   - 私密报告渠道"
echo "   - 漏洞分类和影响评估"
echo ""

echo "⚡ 性能问题 (performance_issue.md)"
echo "   - 性能问题诊断模板"
echo "   - 包含性能指标监控"
echo "   - 前后端性能分析"
echo "   - 优化建议分类"
echo ""

echo "📚 文档问题 (documentation.md)"
echo "   - 文档内容问题报告"
echo "   - 结构和格式改进建议"
echo "   - 多语言支持需求"
echo "   - 贡献方式选择"
echo ""

echo "⚙️ 配置文件 (config.yml)"
echo "   - Issue模板配置"
echo "   - 快速链接设置"
echo "   - 联系方式配置"
echo "   - 讨论区引导"
echo ""

# 菜单选择
echo ""
echo "🔧 请选择操作："
echo "1) 查看模板内容"
echo "2) 验证模板格式"
echo "3) 生成Issue指南文档"
echo "4) 创建自定义模板"
echo "5) 统计Issue使用情况"
echo "6) 推送到GitHub"
echo ""

read -p "请输入选项 (1-6): " choice

case $choice in
    1)
        echo ""
        echo "📖 查看Issue模板内容"
        echo "=================="

        PS3="请选择要查看的模板："
        select template_file in bug_report.md feature_request.md security_issue.md performance_issue.md documentation.md config.yml; do
            if [[ -n "$template_file" ]]; then
                echo ""
                echo "📄 文件: .github/ISSUE_TEMPLATE/$template_file"
                echo "----------------------------------------"
                cat .github/ISSUE_TEMPLATE/"$template_file"
                echo ""
                echo "----------------------------------------"
                break
            else
                echo "❌ 无效选择"
            fi
        done
        ;;

    2)
        echo ""
        echo "✅ 验证Issue模板格式"
        echo "==================="

        templates_dir=".github/ISSUE_TEMPLATE"
        errors=0

        # 检查模板目录
        if [ ! -d "$templates_dir" ]; then
            echo "❌ Issue模板目录不存在: $templates_dir"
            errors=$((errors + 1))
        else
            echo "✅ Issue模板目录存在"
        fi

        # 检查各个模板文件
        for template in bug_report.md feature_request.md security_issue.md performance_issue.md documentation.md config.yml; do
            file_path="$templates_dir/$template"
            if [ -f "$file_path" ]; then
                size=$(stat -f%z "$file_path" 2>/dev/null || stat -c%s "$file_path" 2>/dev/null || echo "0")
                if [ "$size" -gt 0 ]; then
                    echo "✅ $template (${size} bytes)"
                else
                    echo "❌ $template 为空文件"
                    errors=$((errors + 1))
                fi
            else
                echo "❌ $template 不存在"
                errors=$((errors + 1))
            fi
        done

        # 检查YAML格式
        if [ -f "$templates_dir/config.yml" ]; then
            if command -v yq &> /dev/null; then
                if yq eval '.' "$templates_dir/config.yml" > /dev/null 2>&1; then
                    echo "✅ config.yml YAML格式正确"
                else
                    echo "❌ config.yml YAML格式错误"
                    errors=$((errors + 1))
                fi
            else
                echo "⚠️  未安装yq工具，跳过YAML格式检查"
            fi
        fi

        echo ""
        if [ $errors -eq 0 ]; then
            echo "🎉 所有Issue模板验证通过！"
        else
            echo "❌ 发现 $errors 个错误，请检查并修复"
        fi
        ;;

    3)
        echo ""
        echo "📄 生成Issue指南文档"
        echo "===================="

        cat > ISSUE_GUIDELINES.md << 'EOF'
# 智慧村庄综合服务平台 - Issue提交指南

## 📋 Issue类型概览

### 🐛 Bug报告
**使用场景**: 发现系统中的错误或异常行为

**提交步骤**:
1. 选择 "Bug Report" 模板
2. 填写详细的问题描述
3. 提供重现步骤
4. 说明期望与实际结果
5. 提供环境信息
6. 上传相关截图或日志

**标签**: `bug`

### 🚀 功能请求
**使用场景**: 建议新功能或功能改进

**提交步骤**:
1. 选择 "Feature Request" 模板
2. 描述功能需求背景
3. 提供解决方案建议
4. 详细说明功能特性
5. 评估优先级
6. 提供设计建议

**标签**: `enhancement`, `feature`

### 🔒 安全问题
**使用场景**: 发现安全漏洞或安全问题

**重要提醒**: 如发现严重安全漏洞，请勿在公开Issue中描述，发送邮件至 security@smart-village.com

**提交步骤**:
1. 选择 "Security Issue" 模板
2. 描述安全问题
3. 选择漏洞类型
4. 提供影响范围评估
5. 建议修复方案
6. 联系安全团队

**标签**: `security`, `critical`

### ⚡ 性能问题
**使用场景**: 系统性能缓慢或响应延迟

**提交步骤**:
1. 选择 "Performance Issue" 模板
2. 描述性能问题场景
3. 提供性能指标数据
4. 分析问题定位
5. 建议优化方案
6. 提供监控信息

**标签**: `performance`

### 📚 文档问题
**使用场景**: 文档内容错误或不完善

**提交步骤**:
1. 选择 "Documentation" 模板
2. 选择文档类型
3. 描述具体问题
4. 提供修改建议
5. 说明改进目标
6. 选择参与方式

**标签**: `documentation`

## 🏷️ 标签体系

### 优先级标签
- `critical` - 紧急（生产环境问题）
- `high` - 高优先级（重要功能缺陷）
- `medium` - 中优先级（一般功能问题）
- `low` - 低优先级（优化改进）

### 模块标签
- `village-management` - 村民管理
- `governance` - 村务治理
- `finance` - 财务管理
- `information` - 信息发布
- `monitoring` - 系统监控
- `security` - 安全防护

### 类型标签
- `bug` - 错误报告
- `feature` - 功能请求
- `enhancement` - 功能改进
- `performance` - 性能优化
- `documentation` - 文档相关
- `security` - 安全问题

### 状态标签
- `need-info` - 需要更多信息
- `in-progress` - 正在处理
- `blocked` - 被阻塞
- `ready-for-test` - 准备测试
- `confirmed` - 已确认
- `wont-fix` - 不修复

## 📝 提交规范

### Issue标题格式
- `[BUG] 简短描述问题`
- `[FEATURE] 简短描述功能`
- `[SECURITY] 简短描述安全问题`
- `[PERFORMANCE] 简短描述性能问题`
- `[DOCS] 简短描述文档问题`

### Issue内容要求
- **描述清晰**: 使用简洁明了的语言
- **信息完整**: 提供足够的上下文信息
- **重现步骤**: 详细描述如何重现问题
- **环境信息**: 包含操作系统、浏览器版本等
- **期望结果**: 明确说明期望的行为
- **实际结果**: 详细描述实际发生的情况

### 附件要求
- **截图**: 提供问题发生时的界面截图
- **日志**: 附上相关的错误日志
- **视频**: 对于复杂的操作问题，提供录屏视频
- **文件**: 上传相关的配置文件或数据文件

## 🔄 Issue处理流程

### 1. Issue创建
- 用户提交Issue
- 系统自动分配标签
- 通知相关维护人员

### 2. Issue确认
- 维护人员确认问题
- 补充必要信息
- 评估优先级
- 分配处理人员

### 3. 问题处理
- 开发人员分析问题
- 制定解决方案
- 实施修复或开发
- 提交代码审查

### 4. 测试验证
- 质量人员测试验证
- 确认问题已解决
- 更新Issue状态
- 通知用户确认

### 5. Issue关闭
- 用户确认问题解决
- 关闭Issue
- 记录解决方案
- 更新文档

## 🤝 社区贡献

### 参与方式
- **报告问题**: 发现Bug或功能需求
- **提供解决方案**: 分享修复建议或实现思路
- **代码贡献**: 提交Pull Request修复问题
- **文档完善**: 改进项目文档
- **测试反馈**: 参与测试和验证

### 贡献奖励
- **贡献者列表**: 在README中展示贡献者
- **荣誉徽章**: 根据贡献等级颁发徽章
- **技术交流**: 邀请参与技术分享
- **项目认可**: 在发布公告中致谢

## 📞 获取帮助

### 快速资源
- 📖 [项目文档](https://docs.smart-village.com)
- 🗨️ [讨论区](https://github.com/zhihuixiangcun/smart-village-platform/discussions)
- 📧 [技术支持](mailto:support@smart-village.com)

### 联系方式
- 🛡️ **安全漏洞**: security@smart-village.com
- 🔧 **技术支持**: support@smart-village.com
- 🤝 **商务合作**: business@smart-village.com

---

**感谢您对智慧村庄平台的支持和贡献！** 🙏
EOF

        echo "✅ Issue指南文档已生成: ISSUE_GUIDELINES.md"
        ;;

    4)
        echo ""
        echo "🛠️  创建自定义模板"
        echo "=================="

        read -p "请输入模板名称 (例如: custom_issue.md): " template_name
        read -p "请输入模板标题: " template_title
        read -p "请输入模板描述: " template_description
        read -p "请输入默认标签 (用空格分隔): " template_labels

        if [ -z "$template_name" ] || [ -z "$template_title" ]; then
            echo "❌ 模板名称和标题不能为空"
            exit 1
        fi

        # 创建自定义模板文件
        cat > .github/ISSUE_TEMPLATE/"$template_name" << EOF
---
name: $template_title
about: $template_description
title: "[$template_title] "
labels: [$template_labels]
assignees: ''
---

## 📝 问题描述
简洁清晰地描述问题或需求。

## 🔄 重现步骤
如果适用，描述重现步骤：

1. 操作步骤一
2. 操作步骤二
3. 操作步骤三

## ✅ 期望结果
描述你期望发生的情况。

## ❌ 实际结果
描述实际发生的情况。

## 📱 环境信息
请完成以下信息：

- 操作系统: [例如 Windows 10, Ubuntu 20.04]
- 浏览器: [例如 Chrome, Firefox]
- 应用版本: [例如 v1.0.0]

## 📋 补充信息
添加任何其他有助于理解问题的信息。
EOF

        echo "✅ 自定义模板已创建: .github/ISSUE_TEMPLATE/$template_name"
        ;;

    5)
        echo ""
        echo "📊 统计Issue使用情况"
        echo "===================="

        if command -v gh &> /dev/null; then
            echo "📈 仓库Issue统计："

            # 获取所有Issues
            echo "总Issue数量: $(gh api repos/${REPO_OWNER}/${REPO_NAME}/issues --jq '. | length')"

            # 按标签统计
            echo ""
            echo "按标签分类:"
            gh api repos/${REPO_OWNER}/${REPO_NAME}/issues --jq '.[].labels[].name' | sort | uniq -c | sort -nr | head -10 | while read count label; do
                echo "   $label: $count"
            done

            # 按状态统计
            echo ""
            echo "按状态分类:"
            open_count=$(gh api repos/${REPO_OWNER}/${REPO_NAME}/issues --jq '[.[] | select(.state == "open")] | length')
            closed_count=$(gh api repos/${REPO_OWNER}/${REPO_NAME}/issues --jq '[.[] | select(.state == "closed")] | length')
            echo "   打开: $open_count"
            echo "   已关闭: $closed_count"

        else
            echo "⚠️  未安装GitHub CLI，无法获取统计数据"
            echo "请访问 ${REPO_URL}/issues 查看Issue统计"
        fi
        ;;

    6)
        echo ""
        echo "🚀 推送Issue模板到GitHub"
        echo "======================"

        # 添加文件到Git
        git add .github/ISSUE_TEMPLATE/

        # 提交更改
        git commit -m "feat: 添加GitHub Issue模板系统

- 添加Bug报告模板
- 添加功能请求模板
- 添加安全问题模板
- 添加性能问题模板
- 添加文档问题模板
- 添加Issue配置文件
- 包含完整的标签体系和处理流程

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

        # 推送到GitHub
        if git push origin main; then
            echo "✅ Issue模板已成功推送到GitHub"
            echo "📋 访问 ${REPO_URL}/issues/new/choose 查看新Issue模板"
        else
            echo "❌ 推送失败，请检查网络连接和权限"
        fi
        ;;

    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "🎯 相关链接："
echo "   📋 Issue模板: ${REPO_URL}/issues/new/choose"
echo "   🗨️ 讨论区: ${REPO_URL}/discussions"
echo "   📖 项目文档: https://docs.smart-village.com"
echo "   📧 技术支持: support@smart-village.com"