#!/bin/bash
echo "🚀 启动智慧乡村平台演示环境..."

# 设置演示模式
export NODE_ENV=demo
export DEMO_MODE=true

# 启动主API服务器
echo "启动主API服务器 (端口3001)..."
node src/app.js &

# 启动Socket.IO服务器
echo "启动Socket.IO服务器 (端口5000)..."
node socket-server.js &

# 启动前端开发服务器 (可选)
if [ "$1" = "--with-frontend" ]; then
  echo "启动前端开发服务器 (端口3000)..."
  cd client && npm run dev &
fi

echo ""
echo "✅ 演示环境启动完成!"
echo ""
echo "📱 访问地址:"
echo "   主API服务器: http://localhost:3001"
echo "   Socket.IO服务器: http://localhost:5000"
echo "   前端界面: http://localhost:3000 (如果启动了前端服务)"
echo ""
echo "👤 演示账号:"
echo "   管理员: 张三 / admin123"
echo "   村民: 李四 / 123456"
echo "   村民: 王五 / 123456"
echo ""
echo "🔗 API端点:"
echo "   健康检查: http://localhost:3001/health"
echo "   实时计算引擎: http://localhost:3001/api/v1/realtime-computation/health"
echo ""
echo "⚠️  注意: 这是演示环境，数据保存在内存中"
