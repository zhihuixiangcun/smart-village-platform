/**
 * 智慧乡村平台演示服务器
 * 不依赖npm模块，展示项目结构和功能
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 配置
const PORT = process.env.PORT || 3001;

// MIME类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
  // 解析URL
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 路由处理
  if (pathname === '/') {
    // 主页
    serveHTML(res, 'index.html');
  } else if (pathname === '/api/v1/info') {
    // API信息
    serveAPIInfo(res);
  } else if (pathname.startsWith('/api/')) {
    // API路由
    serveAPI(res, pathname, req.method, parsedUrl.query);
  } else if (pathname === '/health') {
    // 健康检查
    serveHealth(res);
  } else {
    // 静态文件
    serveStatic(res, pathname);
  }
});

// 服务HTML文件
function serveHTML(res, filename) {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>智慧乡村综合服务平台</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            padding: 40px 0;
            color: white;
        }
        .header h1 {
            font-size: 3em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        .cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 40px;
        }
        .card {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .card:hover {
            transform: translateY(-5px);
        }
        .card h3 {
            color: #4CAF50;
            margin-bottom: 15px;
            font-size: 1.5em;
        }
        .card .icon {
            font-size: 3em;
            margin-bottom: 15px;
        }
        .features {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 30px;
            margin-top: 40px;
            color: white;
        }
        .features h2 {
            text-align: center;
            margin-bottom: 30px;
        }
        .feature-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .feature-item {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 5px;
            text-align: center;
        }
        .status {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-top: 40px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .status-bar {
            background: #e0e0e0;
            height: 20px;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 10px;
        }
        .status-progress {
            background: #4CAF50;
            height: 100%;
            width: 91.9%;
            transition: width 0.5s ease;
        }
        .footer {
            text-align: center;
            padding: 40px 0;
            color: white;
            opacity: 0.8;
        }
        .btn {
            display: inline-block;
            padding: 12px 30px;
            background: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 15px;
            transition: background 0.3s ease;
        }
        .btn:hover {
            background: #45a049;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏘️ 智慧乡村综合服务平台</h1>
            <p>连接城乡的数字化桥梁，让乡村更美好</p>
        </div>

        <div class="cards">
            <div class="card">
                <div class="icon">👨‍🌾</div>
                <h3>村民管理</h3>
                <p>数字化村民档案，家庭关系管理，人口统计分析，支持10万+村民信息管理</p>
            </div>
            <div class="card">
                <div class="icon">🏛️</div>
                <h3>村务治理</h3>
                <p>公告发布、会议管理、任务调度、反馈处理，实现村务公开透明</p>
            </div>
            <div class="card">
                <div class="icon">💰</div>
                <h3>财务管理</h3>
                <p>财务记录、预算管理、发票识别、财务报表，AI辅助记账提升效率</p>
            </div>
            <div class="card">
                <div class="icon">🚨</div>
                <h3>应急响应</h3>
                <p>紧急上报、资源调度、应急预案、实时指挥，保障村民生命财产安全</p>
            </div>
            <div class="card">
                <div class="icon">🛒</div>
                <h3>电子商务</h3>
                <p>农产品销售、农资采购、团购交易、便民服务，助力乡村振兴</p>
            </div>
            <div class="card">
                <div class="icon">🤖</div>
                <h3>AI智能</h3>
                <p>语音交互（22种方言）、人脸识别、OCR识别、智能填表，让服务更智能</p>
            </div>
        </div>

        <div class="features">
            <h2>✨ 核心特性</h2>
            <div class="feature-list">
                <div class="feature-item">🔒 数据安全</div>
                <div class="feature-item">🌐 离线可用</div>
                <div class="feature-item">📱 适老设计</div>
                <div class="feature-item">🗣️ 方言支持</div>
                <div class="feature-item">⚡ 实时通信</div>
                <div class="feature-item">📊 数据分析</div>
                <div class="feature-item">🔔 智能预警</div>
                <div class="feature-item">🎯 精准推送</div>
            </div>
        </div>

        <div class="status">
            <h3>📊 项目开发进度</h3>
            <p>整体完成度：91.9%</p>
            <div class="status-bar">
                <div class="status-progress"></div>
            </div>
            <p style="margin-top: 10px; color: #666;">
                ✅ 后端架构完成 | ✅ API接口完成 | ✅ AI功能集成 |
                ⏳ 等待依赖安装
            </p>
        </div>

        <div class="footer">
            <p>© 2025 智慧乡村综合服务平台 | 用科技赋能乡村振兴</p>
            <a href="/api/v1/info" class="btn">查看API信息</a>
        </div>
    </div>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

// 服务API信息
function serveAPIInfo(res) {
  const apiInfo = {
    success: true,
    data: {
      name: '智慧乡村平台演示服务器',
      version: '1.0.0-demo',
      environment: 'demo-mode',
      features: {
        residents: '村民管理',
        governance: '村务治理',
        finance: '财务管理',
        emergency: '应急响应',
        ecommerce: '电子商务',
        ai: 'AI智能服务'
      },
      endpoints: {
        residents: '/api/v1/residents/*',
        governance: '/api/v1/governance/*',
        finance: '/api/v1/finance/*',
        emergency: '/api/v1/emergency/*',
        ecommerce: '/api/v1/ecommerce/*',
        ai: '/api/v1/ai/*'
      },
      modules: {
        controllers: 21,
        services: 52,
        models: 30,
        routes: 26
      },
      status: 'demo-running',
      note: '这是一个演示服务器，展示项目结构和API设计。完整功能需要安装依赖后运行。'
    },
    timestamp: new Date().toISOString()
  };

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(apiInfo, null, 2));
}

// 服务健康检查
function serveHealth(res) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0-demo',
    services: {
      demo: 'healthy',
      full: 'pending-dependencies'
    },
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(health, null, 2));
}

// 服务API路由
function serveAPI(res, pathname, method, query) {
  // 模拟API响应
  const response = {
    success: true,
    message: '演示API响应',
    data: {
      path: pathname,
      method: method,
      query: query,
      note: '完整API功能需要安装依赖后可用'
    },
    timestamp: new Date().toISOString()
  };

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(response, null, 2));
}

// 服务静态文件
function serveStatic(res, pathname) {
  const filePath = path.join(__dirname, pathname);
  const extname = path.extname(filePath);

  // 检查文件是否存在
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    // 设置Content-Type
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // 读取并返回文件
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
}

// 启动服务器
server.listen(PORT, () => {
  console.log('\n🚀 智慧乡村平台演示服务器启动成功！');
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
  console.log(`📋 API信息: http://localhost:${PORT}/api/v1/info`);
  console.log('\n📝 注意事项:');
  console.log('  - 这是一个演示服务器，展示项目结构');
  console.log('  - 完整功能需要运行 npm install 安装依赖');
  console.log('  - 前端应用需要单独启动 (cd client && npm run dev)');
  console.log('\n✨ 智慧乡村综合服务平台 - 让科技赋能乡村振兴！');
});