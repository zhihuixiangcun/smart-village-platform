const http = require('http');
const WebSocket = require('ws');

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8'
  });
  
  // 提供简单的监控页面
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>村庄监控服务</title>
    </head>
    <body>
      <h1>监控服务运行中</h1>
      <p>WebSocket 端点: /monitoring-ws</p>
      <div id="monitor-data"></div>
      <script>
        const socket = new WebSocket('ws://localhost:8080/monitoring-ws');
        socket.onmessage = (event) => {
          document.getElementById('monitor-data').innerHTML += 
            '<p>' + event.data + '</p>';
        };
      </script>
    </body>
    </html>
  `);
});

// 创建 WebSocket 服务器并附加到 HTTP 服务器
const wss = new WebSocket.Server({ server, path: '/monitoring-ws' });

wss.on('connection', (ws) => {
  console.log('✅ 客户端已连接 Monitoring-WS');
  
  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'status',
    message: '服务器连接成功'
  }));
  
  // 定时发送监控数据
  const interval = setInterval(() => {
    ws.send(JSON.stringify({
      type: 'metrics',
      timestamp: new Date().toISOString(),
      cpu: (Math.random() * 100).toFixed(1),
      memory: (Math.random() * 100).toFixed(1)
    }));
  }, 2000);
  
  ws.on('close', () => {
    clearInterval(interval);
  });
});

// 启动服务器
server.listen(8080, () => {
  console.log('🚀 HTTP 服务器已启动: http://localhost:8080 ');
  console.log('📡 WebSocket 端点: ws://localhost:8080/monitoring-ws');
});
