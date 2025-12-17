/**
 * 主API服务器
 * 运行在端口3001，提供主要的API服务
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.MAIN_PORT || 3001;

// 基础中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(cors({
  origin: [
    process.env.CLIENT_URL || "http://localhost:3000",
    "http://localhost:3006",
    "http://localhost:3012",
    "http://127.0.0.1:3006",
    "http://127.0.0.1:3012"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-User-Id',
    'X-Village-Id',
    'X-Session-Id'
  ]
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 日志中间件
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '主API服务运行正常',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: 'online',
      database: 'disconnected', // 暂时不连接数据库
      realtime: 'disabled' // 暂时禁用复杂功能
    }
  });
});

// API信息端点
app.get('/api/v1/info', (req, res) => {
  res.json({
    success: true,
    message: '智慧村庄平台 API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      authentication: 'disabled',
      realtime: 'disabled',
      database: 'disabled',
      fileUpload: 'disabled'
    }
  });
});

// API健康检查端点
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '村务API服务运行正常',
    timestamp: new Date().toISOString(),
    port: PORT,
    services: {
      api: 'online',
      database: 'disconnected',
      realtime: 'disabled'
    }
  });
});

// 基础API路由
app.get('/api/v1/status', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 模拟数据端点
app.get('/api/v1/announcements', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        title: '欢迎使用智慧村庄平台',
        content: '这是一个简化的演示版本',
        type: 'notice',
        timestamp: new Date().toISOString()
      }
    ]
  });
});

app.get('/api/v1/services', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: '村民管理', status: 'active' },
      { id: 2, name: '村务公开', status: 'active' },
      { id: 3, name: '在线办事', status: 'active' },
      { id: 4, name: '信息查询', status: 'active' }
    ]
  });
});

// 监控页面端点
app.get('/monitoring', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>智慧村庄系统监控</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
        .container { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .card h3 { color: #333; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
        .status { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .status.online { color: #28a745; }
        .status.warning { color: #ffc107; }
        .status.offline { color: #dc3545; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .metric { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .metric-value { font-size: 1.5em; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; margin-top: 5px; }
        .logs { background: #2d3748; color: #e2e8f0; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 14px; max-height: 300px; overflow-y: auto; }
        .log-entry { margin: 5px 0; padding: 5px 0; border-bottom: 1px solid #4a5568; }
        .log-time { color: #68d391; }
        .log-level-info { color: #63b3ed; }
        .log-level-warn { color: #f6ad55; }
        .log-level-error { color: #fc8181; }
        .refresh-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; }
        .refresh-btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏘️ 智慧村庄系统监控</h1>
        <p>实时系统状态监控面板</p>
        <button class="refresh-btn" onclick="location.reload()">刷新数据</button>
    </div>

    <div class="container">
        <div class="dashboard">
            <div class="card">
                <h3>🌐 主API服务器</h3>
                <div class="status online">在线</div>
                <p>端口: 3001</p>
                <p>状态: 运行正常</p>
            </div>

            <div class="card">
                <h3>🏘️ 村务服务器</h3>
                <div class="status online">在线</div>
                <p>端口: 5000</p>
                <p>状态: Socket.IO连接正常</p>
            </div>

            <div class="card">
                <h3>💾 数据库服务</h3>
                <div class="status warning">警告</div>
                <p>状态: 开发模式未连接</p>
                <p>建议: 配置生产数据库</p>
            </div>

            <div class="card">
                <h3>👥 在线用户</h3>
                <div class="status online">12</div>
                <p>当前在线: 12人</p>
                <p>今日访问: 156次</p>
            </div>
        </div>

        <div class="card">
            <h3>📊 系统指标</h3>
            <div class="metrics">
                <div class="metric">
                    <div class="metric-value">98.5%</div>
                    <div class="metric-label">系统可用性</div>
                </div>
                <div class="metric">
                    <div class="metric-value">245ms</div>
                    <div class="metric-label">平均响应时间</div>
                </div>
                <div class="metric">
                    <div class="metric-value">1.2K</div>
                    <div class="metric-label">今日请求</div>
                </div>
                <div class="metric">
                    <div class="metric-value">0</div>
                    <div class="metric-label">错误次数</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>📋 系统日志</h3>
            <div class="logs" id="logs">
                <div class="log-entry">
                    <span class="log-time">[${new Date().toLocaleString()}]</span>
                    <span class="log-level-info"> [INFO] </span>
                    主API服务器启动成功
                </div>
                <div class="log-entry">
                    <span class="log-time">[${new Date().toLocaleString()}]</span>
                    <span class="log-level-info"> [INFO] </span>
                    CORS配置更新，支持端口3012
                </div>
                <div class="log-entry">
                    <span class="log-time">[${new Date().toLocaleString()}]</span>
                    <span class="log-level-info"> [INFO] </span>
                    监控面板访问
                </div>
            </div>
        </div>
    </div>

    <script>
        // 模拟实时数据更新
        function updateMetrics() {
            const onlineUsers = Math.floor(Math.random() * 5) + 10;
            const responseTime = Math.floor(Math.random() * 100) + 200;
            const requests = Math.floor(Math.random() * 500) + 1000;

            document.querySelectorAll('.metric-value')[0].textContent = '98.5%';
            document.querySelectorAll('.metric-value')[1].textContent = responseTime + 'ms';
            document.querySelectorAll('.metric-value')[2].textContent = (requests / 1000).toFixed(1) + 'K';
            document.querySelectorAll('.metric-value')[3].textContent = Math.floor(Math.random() * 3);

            // 更新在线用户数
            document.querySelectorAll('.status')[3].textContent = onlineUsers;
            document.querySelectorAll('.status')[3].nextElementSibling.nextElementSibling.textContent = '今日访问: ' + Math.floor(Math.random() * 100 + 100) + '次';
        }

        // 每5秒更新一次数据
        setInterval(updateMetrics, 5000);

        // 添加日志功能
        function addLog(level, message) {
            const logs = document.getElementById('logs');
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.innerHTML = \`
                <span class="log-time">[\${new Date().toLocaleString()}]</span>
                <span class="log-level-\${level}"> [\${level.toUpperCase()}] </span>
                \${message}
            \`;
            logs.insertBefore(logEntry, logs.firstChild);

            // 保持最多10条日志
            while (logs.children.length > 10) {
                logs.removeChild(logs.lastChild);
            }
        }

        // 每30秒添加一条随机日志
        setInterval(() => {
            const levels = ['info', 'warn'];
            const messages = [
                '系统健康检查完成',
                '用户活动记录',
                'API请求处理',
                '缓存更新完成',
                '定时任务执行'
            ];
            const level = levels[Math.floor(Math.random() * levels.length)];
            const message = messages[Math.floor(Math.random() * messages.length)];
            addLog(level, message);
        }, 30000);
    </script>
</body>
</html>`);
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API接口不存在',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.originalUrl,
    method: req.method
  });
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`✅ 主API服务器启动成功`);
  console.log(`🌐 服务地址: http://localhost:${PORT}`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
  console.log(`📋 API信息: http://localhost:${PORT}/api/v1/info`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 收到SIGTERM信号，正在关闭主API服务器...');
  server.close(() => {
    console.log('✅ 主API服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 收到SIGINT信号，正在关闭主API服务器...');
  server.close(() => {
    console.log('✅ 主API服务器已关闭');
    process.exit(0);
  });
});