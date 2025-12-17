#!/bin/bash

# 智慧村庄平台 - Git标签推送脚本
# 当网络连接恢复后使用此脚本推送所有标签

echo "🚀 智慧村庄平台 - Git标签推送工具"
echo "=================================="

# 检查网络连接
check_connection() {
    echo "🔍 检查GitHub连接..."
    if ping -c 1 github.com &> /dev/null; then
        echo "✅ GitHub连接正常"
        return 0
    else
        echo "❌ GitHub连接失败"
        return 1
    fi
}

# 检查Git远程仓库配置
check_git_config() {
    echo ""
    echo "🔧 检查Git配置..."
    echo "远程仓库地址:"
    git remote -v

    echo ""
    echo "本地标签列表:"
    git tag -l
}

# 推送标签
push_tags() {
    echo ""
    echo "📤 开始推送Git标签..."

    # 推送所有标签
    if git push --tags origin; then
        echo "✅ 所有标签推送成功!"

        echo ""
        echo "🎉 推送完成! 请在GitHub上创建Release:"
        echo "https://github.com/zhihuixiangcun/smart-village-platform/releases/new"

    else
        echo "❌ 标签推送失败"
        return 1
    fi
}

# 推送特定标签
push_specific_tag() {
    local tag_name=$1
    echo "📤 推送标签: $tag_name"

    if git push origin "$tag_name"; then
        echo "✅ 标签 $tag_name 推送成功!"
    else
        echo "❌ 标签 $tag_name 推送失败"
    fi
}

# 主菜单
main_menu() {
    echo ""
    echo "🎯 请选择操作:"
    echo "1) 检查连接状态"
    echo "2) 查看Git配置"
    echo "3) 推送所有标签"
    echo "4) 推送v1.1.0标签"
    echo "5) 推送特定标签"
    echo "6) 自动检测并推送"
    echo ""

    read -p "请输入选项 (1-6): " choice

    case $choice in
        1)
            check_connection
            ;;
        2)
            check_git_config
            ;;
        3)
            if check_connection; then
                push_tags
            fi
            ;;
        4)
            if check_connection; then
                push_specific_tag "v1.1.0"
            fi
            ;;
        5)
            read -p "请输入标签名称: " tag_name
            if check_connection; then
                push_specific_tag "$tag_name"
            fi
            ;;
        6)
            echo "🔄 自动检测连接并推送..."
            while true; do
                if check_connection; then
                    echo "🌐 网络连接恢复，开始推送..."
                    push_tags
                    break
                else
                    echo "⏳ 等待网络连接... (30秒后重试)"
                    sleep 30
                fi
            done
            ;;
        *)
            echo "❌ 无效选项"
            ;;
    esac
}

# 自动模式 - 当网络恢复时自动推送
auto_mode() {
    echo "🤖 启动自动推送模式..."
    echo "将持续检测网络连接，连接恢复后自动推送标签"
    echo "按 Ctrl+C 退出"
    echo ""

    while true; do
        if check_connection; then
            echo "🎉 网络连接恢复! 开始推送标签..."
            push_tags
            echo "✅ 自动推送完成!"
            break
        else
            echo "⏳ $(date '+%H:%M:%S') - 网络未连接，60秒后重试..."
            sleep 60
        fi
    done
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ $# -eq 1 && $1 == "--auto" ]]; then
        auto_mode
    else
        main_menu
    fi
fi

echo ""
echo "📞 技术支持: 18886990223@163.com"
echo "📱 联系电话: 18886990223"