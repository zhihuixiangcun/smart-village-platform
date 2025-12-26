/**
 * 错误处理系统集成示例
 * 展示如何在村民管理平台中集成错误处理和异常恢复功能
 */

const express = require('express');
const ErrorHandlingMiddleware = require('../src/middleware/errorHandlingMiddleware');
const mongoose = require('mongoose');

// 示例：在主应用中集成错误处理系统
class VillageManagementApp {
  constructor() {
    this.app = express();
    this.errorMiddleware = null;
    this.dbService = null;
    this.auditService = null;
  }

  async initialize() {
    console.log('🚀 初始化村民管理平台...');

    try {
      // 1. 初始化数据库连接
      await this.initializeDatabase();

      // 2. 初始化基础服务
      await this.initializeServices();

      // 3. 初始化错误处理中间件
      await this.initializeErrorHandling();

      // 4. 设置路由和中间件
      this.setupMiddleware();
      this.setupRoutes();

      // 5. 设置全局错误处理
      this.setupGlobalErrorHandling();

      console.log('✅ 村民管理平台初始化完成');

    } catch (error) {
      console.error('❌ 平台初始化失败:', error);
      throw error;
    }
  }

  async initializeDatabase() {
    // 使用错误处理装饰器包装数据库连接
    const connectWithErrorHandling = async () => {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/village', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    };

    try {
      await connectWithErrorHandling();
      this.dbService = { db: mongoose.connection.db };
      console.log('✅ 数据库连接成功');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error);
      throw error;
    }
  }

  async initializeServices() {
    // 模拟审计服务初始化
    this.auditService = {
      logOperation: async (data) => {
        console.log('📝 审计日志:', data.operationType);
        return true;
      }
    };
  }

  async initializeErrorHandling() {
    this.errorMiddleware = new ErrorHandlingMiddleware(this.dbService, this.auditService);
    
    // 等待错误处理服务初始化完成
    const integrationService = this.errorMiddleware.getIntegrationService();
    if (!integrationService.isInitialized) {
      await new Promise((resolve) => {
        integrationService.once('integrationReady', resolve);
      });
    }

    console.log('✅ 错误处理系统初始化完成');
  }

  setupMiddleware() {
    // 基础中间件
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // 添加请求ID中间件
    this.app.use((req, res, next) => {
      req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      next();
    });

    // 添加用户模拟中间件（实际应用中应该是真正的认证中间件）
    this.app.use((req, res, next) => {
      req.user = {
        id: 'user123',
        name: '张三',
        position: '村主任'
      };
      next();
    });
  }

  setupRoutes() {
    // 健康检查端点
    this.app.get('/health', this.errorMiddleware.healthCheckMiddleware());

    // 错误处理统计端点
    this.app.get('/error-stats', this.errorMiddleware.statisticsMiddleware());

    // 手动恢复端点
    this.app.post('/manual-recovery', this.errorMiddleware.manualRecoveryMiddleware());

    // 村民管理路由示例
    this.setupResidentRoutes();

    // 审计路由示例
    this.setupAuditRoutes();
  }

  setupResidentRoutes() {
    const router = express.Router();

    // 获取村民列表 - 使用异步错误包装器
    router.get('/', this.errorMiddleware.asyncWrapper(async (req, res) => {
      // 模拟可能出错的数据库查询
      const residents = await this.safeDbOperation(async () => {
        // 随机模拟错误
        if (Math.random() < 0.1) {
          const error = new Error('Database connection timeout');
          error.name = 'MongoNetworkError';
          throw error;
        }
        
        return [
          { id: '1', name: '张三', village: '幸福村' },
          { id: '2', name: '李四', village: '幸福村' }
        ];
      });

      res.json({
        success: true,
        data: residents,
        total: residents.length
      });
    }));

    // 创建村民档案 - 使用错误处理装饰器
    router.post('/', this.errorMiddleware.asyncWrapper(async (req, res) => {
      const { realName, idCard, phone, villageId } = req.body;

      // 验证输入
      if (!realName || !idCard || !phone) {
        const error = new Error('缺少必填字段');
        error.name = 'ValidationError';
        error.statusCode = 400;
        throw error;
      }

      // 模拟创建操作
      const resident = await this.safeDbOperation(async () => {
        // 模拟权限检查
        if (!req.user || req.user.position !== '村主任') {
          const error = new Error('权限不足');
          error.name = 'PermissionError';
          error.statusCode = 403;
          throw error;
        }

        // 模拟数据库保存
        return {
          id: Date.now().toString(),
          realName,
          idCard: idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2'),
          phone: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
          villageId,
          createdAt: new Date()
        };
      });

      res.status(201).json({
        success: true,
        data: resident,
        message: '村民档案创建成功'
      });
    }));

    // 获取单个村民信息
    router.get('/:id', this.errorMiddleware.asyncWrapper(async (req, res) => {
      const resident = await this.safeDbOperation(async () => {
        // 模拟查找操作
        if (req.params.id === 'notfound') {
          const error = new Error('村民档案不存在');
          error.name = 'NotFoundError';
          error.statusCode = 404;
          throw error;
        }

        return {
          id: req.params.id,
          name: '张三',
          village: '幸福村',
          phone: '138****1234'
        };
      });

      res.json({
        success: true,
        data: resident
      });
    }));

    this.app.use('/api/v1/residents', router);
  }

  setupAuditRoutes() {
    const router = express.Router();

    // 获取审计日志
    router.get('/logs', this.errorMiddleware.asyncWrapper(async (req, res) => {
      const logs = await this.safeExternalServiceCall('audit-service', async () => {
        // 模拟外部审计服务调用
        if (Math.random() < 0.15) {
          const error = new Error('Audit service unavailable');
          error.code = 'ECONNREFUSED';
          throw error;
        }

        return [
          {
            id: '1',
            operation: 'create_resident',
            operator: '张三',
            timestamp: new Date(),
            result: 'success'
          }
        ];
      });

      res.json({
        success: true,
        data: logs
      });
    }));

    this.app.use('/api/v1/audit', router);
  }

  setupGlobalErrorHandling() {
    // 使用集成的错误处理中间件
    this.app.use(this.errorMiddleware.expressErrorHandler());

    // 404处理
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: '请求的资源不存在',
        path: req.originalUrl
      });
    });

    // 进程级错误处理
    process.on('uncaughtException', async (error) => {
      console.error('未捕获的异常:', error);
      await this.gracefulShutdown(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('未处理的Promise拒绝:', reason);
      await this.gracefulShutdown(1);
    });

    // 优雅关闭信号处理
    process.on('SIGTERM', () => this.gracefulShutdown(0));
    process.on('SIGINT', () => this.gracefulShutdown(0));
  }

  // 安全数据库操作包装器
  async safeDbOperation(operation) {
    const wrappedOperation = this.errorMiddleware.withDatabaseErrorHandling(operation);
    return await wrappedOperation();
  }

  // 安全外部服务调用包装器
  async safeExternalServiceCall(serviceName, operation) {
    const wrappedOperation = this.errorMiddleware.withServiceErrorHandling(serviceName, operation);
    return await wrappedOperation();
  }

  async gracefulShutdown(code) {
    console.log('🔒 开始优雅关闭...');

    try {
      // 关闭错误处理服务
      if (this.errorMiddleware) {
        const integrationService = this.errorMiddleware.getIntegrationService();
        await integrationService.shutdown();
      }

      // 关闭数据库连接
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
      }

      console.log('✅ 优雅关闭完成');
      process.exit(code);

    } catch (error) {
      console.error('❌ 优雅关闭失败:', error);
      process.exit(1);
    }
  }

  async start(port = 3001) {
    await this.initialize();

    this.server = this.app.listen(port, () => {
      console.log(`🚀 村民管理平台启动成功，端口: ${port}`);
      console.log(`📊 健康检查: http://localhost:${port}/health`);
      console.log(`📈 错误统计: http://localhost:${port}/error-stats`);
    });

    return this.server;
  }

  async stop() {
    if (this.server) {
      this.server.close();
    }
    await this.gracefulShutdown(0);
  }
}

// 使用示例
async function startApplication() {
  const app = new VillageManagementApp();
  
  try {
    await app.start(3001);
  } catch (error) {
    console.error('应用启动失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，启动应用
if (require.main === module) {
  startApplication();
}

module.exports = VillageManagementApp;

/*
使用说明：

1. 启动应用：
   node examples/errorHandlingIntegration.js

2. 测试端点：
   - GET http://localhost:3001/health - 健康检查
   - GET http://localhost:3001/error-stats - 错误统计
   - GET http://localhost:3001/api/v1/residents - 获取村民列表（可能触发错误）
   - POST http://localhost:3001/api/v1/residents - 创建村民档案
   - GET http://localhost:3001/api/v1/residents/notfound - 触发404错误
   - GET http://localhost:3001/api/v1/audit/logs - 获取审计日志（可能触发服务错误）

3. 手动恢复：
   POST http://localhost:3001/manual-recovery
   {
     "recoveryType": "system_health_check",
     "context": {
       "reason": "manual_test"
     }
   }

4. 错误场景测试：
   - 数据库连接错误：自动重试和恢复
   - 权限错误：快速失败并返回友好消息
   - 外部服务错误：启动熔断器保护
   - 验证错误：返回详细错误信息

5. 监控功能：
   - 实时错误统计
   - 服务健康状态
   - 恢复操作历史
   - 熔断器状态
   - 性能指标

这个集成示例展示了完整的错误处理和异常恢复系统在实际应用中的使用方式，
包括自动错误检测、智能恢复策略、熔断器保护、监控报告等功能。
*/