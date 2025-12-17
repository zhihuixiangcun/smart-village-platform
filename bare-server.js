// 纯Node.js服务器 - 无依赖
const http = require('http');
const url = require('url');
const querystring = require('querystring');

const PORT = 3001;

// 请求处理
const server = http.createServer((req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // 解析URL
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // 路由处理
  if (path === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({
      message: '智慧村庄综合服务平台',
      status: '运行中',
      version: '1.0.0 (纯Node.js版本)',
      timestamp: new Date().toISOString()
    }));
  }
  else if (path === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      message: '服务健康',
      port: PORT,
      uptime: process.uptime()
    }));
  }
  else if (path === '/api/v1/test') {
    res.writeHead(200);
    res.end(JSON.stringify({
      code: 200,
      message: 'API测试成功',
      data: {
        server: 'Node.js原生HTTP',
        platform: process.platform,
        nodeVersion: process.version
      }
    }));
  }
  else {
    res.writeHead(404);
    res.end(JSON.stringify({
      code: 404,
      message: '接口不存在',
      path: path
    }));
  }
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`
========================================
🚀 智慧村庄平台（纯Node.js）已启动
========================================
📍 地址: http://localhost:${PORT}
❤️  健康检查: http://localhost:${PORT}/health
🔧 API测试: http://localhost:${PORT}/api/v1/test
🔌 无依赖运行
========================================
  `);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

console.log('正在启动服务器...');