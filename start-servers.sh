#!/bin/bash

# 智慧乡村综合服务平台 - 启动脚本
# 作者：claude
# 日期：2025-09-23

echo "🏛️ 智慧乡村综合服务平台启动脚本"
echo "=================================="

# 检查Node.js版本
NODE_VERSION=$(node -v 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ 错误：未安装Node.js"
    echo "请安装Node.js 20.17.0或更高版本"
    exit 1
fi

echo "✅ Node.js版本：$NODE_VERSION"

# 检查MongoDB服务
if ! command -v mongod &> /dev/null; then
    echo "⚠️ 警告：未找到MongoDB，将使用SQLite作为备选数据库"
else
    echo "✅ MongoDB已安装"
fi

# 检查依赖包
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️ 环境变量文件不存在，从示例文件复制..."
    cp .env.example .env
    echo "📝 请根据实际情况修改 .env 文件中的配置"
fi

# 创建必要的目录
mkdir -p logs uploads uploads/documents uploads/avatars uploads/qrcodes

# 初始化数据库
echo "🗄️ 初始化数据库..."
npm run init-db

echo ""
echo "🚀 启动服务器..."
echo "主API服务器：http://localhost:3001 (监控、稳定性、通知等)"
echo "村务服务器：http://localhost:5000 (村民管理、公告、投票等)"
echo ""

# 启动主API服务器（监控服务器）
echo "启动主API服务器(3001端口)..."
node debug-server.js &
MAIN_PID=$!

# 等待主服务器启动
sleep 3

# 启动村务服务器
echo "启动村务服务器(5000端口)..."
node simple-village-server.js &
VILLAGE_PID=$!

# 等待服务器启动
sleep 2

echo ""
echo "✅ 服务器启动完成！"
echo ""
echo "📊 服务状态："
echo "- 主API服务器(3001): http://localhost:3001/health"
echo "- 村务服务器(5000): http://localhost:5000/health"
echo ""
echo "🌐 前端地址：http://localhost:3000 (需要单独启动前端服务)"
echo ""
echo "💡 使用说明："
echo "- 访问 http://localhost:3001 查看主API服务信息"
echo "- 访问 http://localhost:5000 查看村务服务信息"
echo "- 按 Ctrl+C 停止所有服务"
echo ""

# 创建停止函数
cleanup() {
    echo ""
    echo "🛑 正在停止服务器..."
    kill $MAIN_PID 2>/dev/null
    kill $VILLAGE_PID 2>/dev/null
    echo "👋 服务器已停止"
    exit 0
}

# 捕获中断信号
trap cleanup SIGINT SIGTERM

# 等待进程
wait $MAIN_PID $VILLAGE_PID