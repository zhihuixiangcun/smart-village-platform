/**
 * 实时计算系统集成示例
 * 演示如何使用完整的实时计算引擎系统
 */

const realtimeIntegrator = require('../src/integrator/realtimeIntegrator');
const express = require('express');
const cors = require('cors');

async function demonstrateRealtimeSystem() {
  console.log('🚀 实时计算系统集成示例启动\n');

  // 1. 初始化系统
  await realtimeIntegrator.initialize();
  console.log('✅ 系统初始化完成');

  // 2. 启动系统
  await realtimeIntegrator.start();
  console.log('✅ 系统启动完成\n');

  // 3. 模拟实时数据流
  console.log('📊 开始模拟实时数据流...\n');

  // 模拟用户行为数据
  const simulateUserBehavior = async () => {
    const actions = [
      'login', 'announcement_read', 'comment_post', 'vote_participate',
      'help_request', 'document_apply', 'finance_query', 'emergency_report'
    ];

    for (let i = 0; i < 100; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];

      await realtimeIntegrator.processRealtimeData('behavior', {
        userId: `user${Math.floor(Math.random() * 1000)}`,
        action,
        page: '/announcements',
        timestamp: Date.now(),
        metadata: {
          duration: Math.random() * 10000,
          device: Math.random() > 0.5 ? 'mobile' : 'desktop',
          location: {
            lat: 30.5728 + Math.random() * 0.1,
            lng: 104.0668 + Math.random() * 0.1
          }
        }
      });

      // 随机延迟
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
    }
  };

  // 模拟财务交易数据
  const simulateFinancialData = async () => {
    const transactions = [
      { type: 'income', category: 'subsidy', amount: 1000 },
      { type: 'income', category: 'grant', amount: 5000 },
      { type: 'expense', category: 'infrastructure', amount: 20000 },
      { type: 'expense', category: 'welfare', amount: 8000 },
      { type: 'expense', category: 'daily', amount: 500 }
    ];

    for (const transaction of transactions) {
      await realtimeIntegrator.processRealtimeData('finance', {
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...transaction,
        residentId: `resident${Math.floor(Math.random() * 500)}`,
        timestamp: Date.now(),
        metadata: {
          approved: Math.random() > 0.1,
          approver: 'admin',
          remarks: '系统自动生成的测试数据'
        }
      });
    }
  };

  // 模拟应急事件数据
  const simulateEmergencyData = async () => {
    const emergencies = [
      { type: 'fire', severity: 'high', location: '北区仓库' },
      { type: 'medical', severity: 'critical', location: '南区活动中心' },
      { type: 'accident', severity: 'medium', location: '东区道路' },
      { type: 'distress', severity: 'low', location: '西区住宅' }
    ];

    for (const emergency of emergencies) {
      await realtimeIntegrator.processRealtimeData('emergency', {
        eventId: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...emergency,
        reporterId: `user${Math.floor(Math.random() * 1000)}`,
        timestamp: Date.now(),
        metadata: {
          status: 'pending',
          responseTeam: '应急响应小组',
          estimatedArrival: Math.floor(Date.now() + Math.random() * 3600000)
        }
      });
    }
  };

  // 4. 执行模拟数据
  console.log('⚡ 处理用户行为数据...');
  await simulateUserBehavior();

  console.log('💰 处理财务交易数据...');
  await simulateFinancialData();

  console.log('🚨 处理应急事件数据...');
  await simulateEmergencyData();

  // 5. 等待数据处理完成
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 6. 获取系统状态和指标
  console.log('\n📈 获取系统指标...\n');
  const systemStatus = realtimeIntegrator.getSystemStatus();
  console.log('系统状态:', JSON.stringify(systemStatus.status, null, 2));
  console.log('处理统计:', JSON.stringify(systemStatus.metrics, null, 2));

  const integratedMetrics = await realtimeIntegrator.getIntegratedMetrics({
    timeRange: '1m',
    includeDetails: true,
    includePredictions: true
  });

  console.log('\n📊 综合指标报告:');
  console.log('- 性能指标:', integratedMetrics.performance);
  console.log('- 业务指标:', integratedMetrics.business);
  console.log('- 活跃预警:', integratedMetrics.alerts.active.length);

  // 7. 演示实时订阅
  console.log('\n🔔 设置实时事件监听...');

  realtimeIntegrator.on('dataProcessed', (event) => {
    console.log(`📝 数据处理完成: ${event.dataType} - ${event.processedData.action || 'unknown'}`);
  });

  realtimeIntegrator.on('alertTriggered', (alert) => {
    console.log(`⚠️ 预警触发: ${alert.ruleName} (${alert.severity})`);
  });

  realtimeIntegrator.on('metricUpdated', (event) => {
    if (event.metricName === 'response_time' && event.value > 1000) {
      console.log(`⏱️ 响应时间警告: ${event.value}ms`);
    }
  });

  // 8. 持续运行演示
  console.log('\n🔄 持续运行演示 (按 Ctrl+C 停止)...');

  // 定期生成新数据
  const dataGenerationInterval = setInterval(async () => {
    try {
      // 随机生成新数据
      const dataType = ['behavior', 'finance', 'emergency'][Math.floor(Math.random() * 3)];

      if (dataType === 'behavior') {
        await realtimeIntegrator.processRealtimeData('behavior', {
          userId: `user${Math.floor(Math.random() * 1000)}`,
          action: 'page_view',
          page: '/dashboard',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('数据生成错误:', error.message);
    }
  }, 5000);

  // 定期报告系统状态
  const statusReportInterval = setInterval(() => {
    const status = realtimeIntegrator.getSystemStatus();
    console.log(`📊 系统状态报告 - 处理数据: ${status.metrics.totalProcessed}, 错误: ${status.metrics.totalErrors}, 健康状态: ${status.status.healthy ? '正常' : '异常'}`);
  }, 30000);

  // 优雅关闭处理
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 正在关闭系统...');

    clearInterval(dataGenerationInterval);
    clearInterval(statusReportInterval);

    await realtimeIntegrator.stop();
    console.log('✅ 系统已安全关闭');

    process.exit(0);
  });

  // 运行API服务器演示
  await startAPIServer();
}

/**
 * 启动API服务器演示
 */
async function startAPIServer() {
  const app = express();
  const port = 3002;

  app.use(cors());
  app.use(express.json());

  // 获取系统状态
  app.get('/api/realtime/status', (req, res) => {
    try {
      const status = realtimeIntegrator.getSystemStatus();
      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // 获取综合指标
  app.get('/api/realtime/metrics', async (req, res) => {
    try {
      const {
        timeRange = '1h',
        includeDetails = 'false',
        includePredictions = 'false'
      } = req.query;

      const metrics = await realtimeIntegrator.getIntegratedMetrics({
        timeRange,
        includeDetails: includeDetails === 'true',
        includePredictions: includePredictions === 'true'
      });

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // 添加实时数据
  app.post('/api/realtime/data', async (req, res) => {
    try {
      const { dataType, data } = req.body;

      if (!dataType || !data) {
        return res.status(400).json({
          success: false,
          error: '缺少必需参数: dataType 和 data'
        });
      }

      const result = await realtimeIntegrator.processRealtimeData(dataType, data);

      res.json({
        success: true,
        data: result,
        message: '数据处理成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // 实时事件订阅 (Server-Sent Events)
  app.get('/api/realtime/subscribe', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const sendEvent = (type, data) => {
      res.write(`event: ${type}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // 发送连接确认
    sendEvent('connected', {
      message: '实时事件订阅成功',
      timestamp: new Date().toISOString()
    });

    // 监听系统事件
    const onDataProcessed = (event) => {
      sendEvent('dataProcessed', event);
    };

    const onAlertTriggered = (alert) => {
      sendEvent('alertTriggered', alert);
    };

    const onMetricUpdated = (event) => {
      sendEvent('metricUpdated', event);
    };

    realtimeIntegrator.on('dataProcessed', onDataProcessed);
    realtimeIntegrator.on('alertTriggered', onAlertTriggered);
    realtimeIntegrator.on('metricUpdated', onMetricUpdated);

    // 定期发送心跳
    const heartbeat = setInterval(() => {
      sendEvent('heartbeat', {
        timestamp: new Date().toISOString(),
        status: realtimeIntegrator.getSystemStatus().status
      });
    }, 30000);

    // 客户端断开连接时清理
    req.on('close', () => {
      realtimeIntegrator.removeListener('dataProcessed', onDataProcessed);
      realtimeIntegrator.removeListener('alertTriggered', onAlertTriggered);
      realtimeIntegrator.removeListener('metricUpdated', onMetricUpdated);
      clearInterval(heartbeat);
    });
  });

  // 健康检查端点
  app.get('/health', (req, res) => {
    const status = realtimeIntegrator.getSystemStatus();
    const httpStatus = status.status.healthy ? 200 : 503;

    res.status(httpStatus).json({
      status: status.status.healthy ? 'healthy' : 'unhealthy',
      checks: status.health?.checks || {},
      uptime: status.uptime,
      timestamp: new Date().toISOString()
    });
  });

  app.listen(port, () => {
    console.log(`\n🌐 API服务器已启动: http://localhost:${port}`);
    console.log('📌 可用端点:');
    console.log('  GET  /api/realtime/status     - 获取系统状态');
    console.log('  GET  /api/realtime/metrics    - 获取综合指标');
    console.log('  POST /api/realtime/data       - 添加实时数据');
    console.log('  GET  /api/realtime/subscribe  - 实时事件订阅');
    console.log('  GET  /health                   - 健康检查\n');
  });
}

// 启动演示
if (require.main === module) {
  demonstrateRealtimeSystem().catch(console.error);
}

module.exports = { demonstrateRealtimeSystem, startAPIServer };