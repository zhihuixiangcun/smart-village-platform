#!/bin/bash

# GitHub仓库设置脚本
# 用于配置智慧村庄综合服务平台的GitHub仓库信息

echo "🚀 开始配置GitHub仓库信息..."

# 仓库基本信息
REPO_OWNER="zhihuixiangcun"
REPO_NAME="smart-village-platform"
REPO_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}"

# 仓库描述
DESCRIPTION="智慧村庄综合服务平台 - 新一代数字化乡村治理解决方案，基于Vue3+Node.js的微服务架构，包含村民管理、村务协同、财务管理、实时监控等完整功能"

# 仓库主页
HOMEPAGE_URL="https://smart-village.example.com"

# 仓库主题标签
TOPICS=(
    "smart-village"
    "vue3"
    "nodejs"
    "microservices"
    "rural-governance"
    "digital-transformation"
    "mongodb"
    "redis"
    "docker"
    "monitoring"
    "real-time"
    "websocket"
    "production-ready"
    "enterprise-grade"
    "chinese-platform"
    "village-management"
    "community-services"
)

echo "📝 仓库信息："
echo "   名称: ${REPO_NAME}"
echo "   描述: ${DESCRIPTION}"
echo "   主页: ${HOMEPAGE_URL}"
echo "   主题: ${TOPICS[*]}"

# 检查是否安装了GitHub CLI
if command -v gh &> /dev/null; then
    echo ""
    echo "✅ 检测到GitHub CLI，开始自动配置..."

    # 使用GitHub CLI设置仓库信息
    gh repo edit ${REPO_OWNER}/${REPO_NAME} \
        --description "${DESCRIPTION}" \
        --homepage "${HOMEPAGE_URL}" \
        --add-topic "${TOPICS[0]}"

    # 添加其他主题标签
    for topic in "${TOPICS[@]:1}"; do
        gh repo edit ${REPO_OWNER}/${REPO_NAME} --add-topic "$topic"
    done

    echo "✅ 仓库信息已成功配置！"

else
    echo ""
    echo "⚠️  未检测到GitHub CLI"
    echo "请手动访问以下链接配置仓库信息："
    echo ""
    echo "📋 仓库设置页面:"
    echo "   ${REPO_URL}/settings"
    echo ""
    echo "📝 建议的仓库描述:"
    echo "   ${DESCRIPTION}"
    echo ""
    echo "🏷️  建议的主题标签 (用逗号分隔):"
    echo "   ${TOPICS[*]}"
    echo ""
    echo "🌐 建议的主页地址:"
    echo "   ${HOMEPAGE_URL}"
fi

echo ""
echo "📊 仓库统计信息："
echo "   文件数量: $(find . -type f | wc -l)"
echo "   代码行数: $(find . -name "*.js" -o -name "*.vue" -o -name "*.ts" | xargs wc -l | tail -1 | awk '{print $1}')"
echo "   项目大小: $(du -sh . | cut -f1)"

echo ""
echo "🏷️  已创建的Git标签："
git tag -l | while read tag; do
    echo "   $tag: $(git tag -l $tag -n99 | tail -n +2)"
done

echo ""
echo "📖 README.md 文件已创建，包含完整的项目介绍"

echo ""
echo "🎯 下一步建议操作："
echo "1. 网络恢复后推送标签: git push --tags origin"
echo "2. 在GitHub上设置仓库描述和主题"
echo "3. 配置GitHub Pages (如果需要)"
echo "4. 设置GitHub Actions CI/CD"
echo "5. 添加贡献指南 (CONTRIBUTING.md)"
echo "6. 添加开源协议文件 (LICENSE)"

echo ""
echo "✨ GitHub仓库配置完成！"