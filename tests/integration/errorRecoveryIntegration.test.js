/**
 * 错误处理和异常恢复系统集成测试
 */

const ErrorRecoveryIntegrationService = require('../src/services/errorRecoveryIntegrationService');
const ErrorHandlingMiddleware = require('../src/middleware/errorHandlingMiddleware');
const { RecoveryType } = require('../src/services/exceptionRecoveryService');

describe('错误处理和异常恢复系统', () => {
  let integrationService;
  let errorMiddleware;
  let mockDbService;
  let mockAuditService;

  beforeAll(async () => {
    // 模拟数据库服务
    mockDbService = {
      db: {
        collection: jest.fn().mockReturnValue({
          find: jest.fn().mockResolvedValue([]),
          countDocuments: jest.fn().mockResolvedValue(0)
        })
      }
    };

    // 模拟审计服务
    mockAuditService = {
      logOperation: jest.fn().mockResolvedValue(true)
    };

    integrationService = new ErrorRecoveryIntegrationService(mockDbService, mockAuditService);
    errorMiddleware = new ErrorHandlingMiddleware(mockDbService, mockAuditService);

    // 等待服务初始化
    await new Promise((resolve) => {
      if (integrationService.isInitialized) {
        resolve();
      } else {
        integrationService.once('integrationReady', resolve);
      }
    });
  }, 30000);

  afterAll(async () => {
    if (integrationService) {
      await integrationService.shutdown();
    }
  });

  describe('集成服务基础功能', () => {
    test('应该正确初始化集成服务', () => {
      expect(integrationService.isInitialized).toBe(true);
      expect(integrationService.serviceHealth.integration).toBe('healthy');
    });

    test('应该正确处理数据库连接错误', async () => {
      const dbError = new Error('Connection timeout');
      dbError.name = 'MongoError';
      dbError.code = 'ETIMEDOUT';

      const result = await integrationService.handleError(dbError, {
        serviceName: 'database',
        module: 'resident_management'
      });

      expect(result.success).toBeDefined();
      expect(result.errorId).toBeDefined();
      expect(result.errorType).toBeDefined();
      expect(result.recoveryStrategy).toBeDefined();
    });

    test('应该正确处理权限错误', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'PermissionError';

      const result = await integrationService.handleError(permissionError, {
        userId: 'user123',
        module: 'village_affairs'
      });

      expect(result.success).toBeDefined();
      expect(result.errorType).toBeDefined();
    });

    test('应该正确处理安全违规', async () => {
      const securityError = new Error('SQL injection attempt detected');
      
      const result = await integrationService.handleError(securityError, {
        url: '/api/v1/residents',
        ip: '192.168.1.100',
        userAgent: 'Malicious Bot'
      });

      expect(result.success).toBeDefined();
      expect(result.errorType).toBeDefined();
    });

    test('应该生成正确的恢复策略', () => {
      const dbErrorResult = { errorType: 'database_connection', severity: 'high' };
      const strategy = integrationService.determineRecoveryStrategy(dbErrorResult);
      
      expect(strategy.type).toBe('database_recovery');
      expect(strategy.actions).toContain(RecoveryType.CONNECTION_RESTORE);
      expect(strategy.automated).toBe(true);
    });

    test('应该正确评估熔断器需求', () => {
      const errorResult = { errorType: 'external_service_error', severity: 'high' };
      const context = { serviceName: 'payment_service' };
      
      const evaluation = integrationService.evaluateCircuitBreakerNeed(errorResult, context);
      
      expect(evaluation.needed).toBe(true);
      expect(evaluation.serviceName).toBe('payment_service');
    });

    test('应该生成集成统计报告', () => {
      const stats = integrationService.getIntegrationStatistics();
      
      expect(stats).toHaveProperty('totalErrors');
      expect(stats).toHaveProperty('serviceHealth');
      expect(stats).toHaveProperty('eventHistory');
      expect(stats).toHaveProperty('timestamp');
    });
  });

  describe('错误处理中间件', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        originalUrl: '/api/v1/residents',
        method: 'GET',
        headers: { 'user-agent': 'Test Agent' },
        user: { id: 'user123' },
        requestId: 'req123',
        get: jest.fn().mockReturnValue('Test Agent'),
        connection: { remoteAddress: '127.0.0.1' }
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      mockNext = jest.fn();
    });

    test('应该正确处理Express错误', async () => {
      const error = new Error('Test error');
      const handler = errorMiddleware.expressErrorHandler();

      await handler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('应该提供异步包装器', async () => {
      const asyncFunction = async (req, res, next) => {
        throw new Error('Async error');
      };

      const wrappedFunction = errorMiddleware.asyncWrapper(asyncFunction);
      await wrappedFunction(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('应该提供数据库错误处理装饰器', async () => {
      const dbOperation = jest.fn().mockRejectedValue(new Error('DB Error'));
      const wrappedOperation = errorMiddleware.withDatabaseErrorHandling(dbOperation);

      await expect(wrappedOperation()).rejects.toThrow();
      expect(dbOperation).toHaveBeenCalled();
    });

    test('应该提供服务错误处理装饰器', async () => {
      const serviceCall = jest.fn().mockRejectedValue(new Error('Service Error'));
      const wrappedCall = errorMiddleware.withServiceErrorHandling('test-service', serviceCall);

      await expect(wrappedCall()).rejects.toThrow();
      expect(serviceCall).toHaveBeenCalled();
    });

    test('应该提供健康检查中间件', async () => {
      const healthCheck = errorMiddleware.healthCheckMiddleware();
      await healthCheck(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          errorHandling: expect.any(Object)
        })
      );
    });

    test('应该提供统计信息中间件', async () => {
      const statsMiddleware = errorMiddleware.statisticsMiddleware();
      await statsMiddleware(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();
    });

    test('应该正确提取模块名', () => {
      expect(errorMiddleware.extractModuleFromURL('/api/v1/residents')).toBe('residents');
      expect(errorMiddleware.extractModuleFromURL('/api/v1/audit/logs')).toBe('audit');
      expect(errorMiddleware.extractModuleFromURL('/health')).toBe('health');
    });

    test('应该根据错误类型返回正确的状态码', () => {
      const error = new Error('Test error');
      
      expect(errorMiddleware.getStatusCodeFromError(error, { errorType: 'validation_error' })).toBe(400);
      expect(errorMiddleware.getStatusCodeFromError(error, { errorType: 'authentication_failed' })).toBe(401);
      expect(errorMiddleware.getStatusCodeFromError(error, { errorType: 'permission_denied' })).toBe(403);
      expect(errorMiddleware.getStatusCodeFromError(error, { errorType: 'resource_not_found' })).toBe(404);
    });

    test('应该返回用户友好的错误消息', () => {
      const error = new Error('Technical error message');
      
      const message = errorMiddleware.getUserFriendlyMessage(error, { errorType: 'validation_error' });
      expect(message).toBe('请检查输入信息是否正确');
      
      const authMessage = errorMiddleware.getUserFriendlyMessage(error, { errorType: 'authentication_failed' });
      expect(authMessage).toBe('身份验证失败，请重新登录');
    });
  });

  describe('错误恢复场景测试', () => {
    test('应该处理数据库连接丢失场景', async () => {
      const dbError = new Error('Connection lost');
      dbError.name = 'MongoNetworkError';

      const result = await integrationService.handleError(dbError, {
        serviceName: 'database',
        operation: async () => {
          // 模拟重连后的操作
          return { success: true };
        }
      });

      expect(result.errorId).toBeDefined();
      expect(result.recoveryStrategy).toBeDefined();
    });

    test('应该处理外部服务超时场景', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';

      const result = await integrationService.handleError(timeoutError, {
        serviceName: 'payment_gateway',
        module: 'finance'
      });

      expect(result.errorId).toBeDefined();
      expect(result.circuitBreakerActivated).toBeDefined();
    });

    test('应该处理级联失败防护', async () => {
      // 模拟多个连续错误
      const errors = [
        new Error('Service A failed'),
        new Error('Service B failed'),
        new Error('Service C failed')
      ];

      const results = [];
      for (const error of errors) {
        const result = await integrationService.handleError(error, {
          serviceName: `service_${results.length}`,
          module: 'cascade_test'
        });
        results.push(result);
      }

      expect(results).toHaveLength(3);
      expect(integrationService.integrationStats.totalErrors).toBeGreaterThan(0);
    });

    test('应该支持手动恢复触发', async () => {
      const result = await integrationService.manualRecovery(RecoveryType.SYSTEM_HEALTH_CHECK, {
        operator: 'admin',
        reason: 'manual_test'
      });

      expect(result.success).toBeDefined();
      expect(result.type).toBe(RecoveryType.SYSTEM_HEALTH_CHECK);
    });
  });

  describe('性能和稳定性测试', () => {
    test('应该在高负载下正常工作', async () => {
      const errors = Array.from({ length: 50 }, (_, i) => 
        new Error(`Load test error ${i}`)
      );

      const startTime = Date.now();
      const promises = errors.map((error, index) => 
        integrationService.handleError(error, {
          serviceName: `load_test_service_${index % 5}`,
          module: 'load_test'
        })
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(10000); // 应该在10秒内完成
      expect(results.every(r => r.errorId)).toBe(true);
    });

    test('应该正确处理并发错误', async () => {
      const concurrentErrors = Array.from({ length: 20 }, (_, i) => {
        const error = new Error(`Concurrent error ${i}`);
        if (i % 3 === 0) error.name = 'MongoError';
        if (i % 5 === 0) error.code = 'ETIMEDOUT';
        return error;
      });

      const promises = concurrentErrors.map((error, index) => 
        integrationService.handleError(error, {
          serviceName: `concurrent_service_${index % 3}`,
          module: 'concurrency_test'
        })
      );

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      expect(successCount).toBeGreaterThan(15); // 至少75%成功
    });

    test('应该生成有用的集成报告', () => {
      const report = integrationService.generateIntegrationReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('serviceHealth');
      expect(report).toHaveProperty('integrationStats');
      expect(report).toHaveProperty('recentEvents');
      expect(report).toHaveProperty('circuitBreakerStatus');
      expect(report).toHaveProperty('recommendations');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('监控和报告功能', () => {
    test('应该生成健康报告', async () => {
      // 触发健康检查
      await integrationService.performHealthCheck();

      const stats = integrationService.getIntegrationStatistics();
      expect(stats.serviceHealth).toBeDefined();
      expect(typeof stats.serviceHealth).toBe('object');
    });

    test('应该记录事件历史', async () => {
      const initialEventCount = integrationService.eventHistory.length;

      await integrationService.handleError(new Error('History test error'), {
        module: 'history_test'
      });

      expect(integrationService.eventHistory.length).toBeGreaterThan(initialEventCount);
    });

    test('应该生成建议', () => {
      // 人为增加统计数据以测试建议生成
      integrationService.integrationStats.unrecoverableErrors = 15;
      integrationService.integrationStats.circuitBreakerActivations = 8;

      const recommendations = integrationService.generateRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.type === 'warning')).toBe(true);
    });
  });
});

// 集成测试辅助函数
function createTestError(type, options = {}) {
  const error = new Error(options.message || `Test ${type} error`);
  
  switch (type) {
    case 'database':
      error.name = 'MongoError';
      error.code = options.code || 11000;
      break;
    case 'validation':
      error.name = 'ValidationError';
      error.statusCode = 400;
      break;
    case 'permission':
      error.name = 'PermissionError';
      error.statusCode = 403;
      break;
    case 'network':
      error.code = 'ETIMEDOUT';
      break;
    case 'security':
      error.message = 'Security violation detected';
      break;
  }
  
  return error;
}

// 性能测试辅助函数
async function performanceTest(service, errorCount = 100, concurrency = 10) {
  const startTime = Date.now();
  const batches = [];
  
  for (let i = 0; i < errorCount; i += concurrency) {
    const batch = [];
    for (let j = 0; j < concurrency && i + j < errorCount; j++) {
      const error = createTestError('database', { message: `Perf test ${i + j}` });
      batch.push(service.handleError(error, { 
        module: 'performance_test',
        serviceName: `perf_service_${(i + j) % 5}`
      }));
    }
    batches.push(await Promise.allSettled(batch));
  }
  
  const duration = Date.now() - startTime;
  const successCount = batches.flat().filter(r => r.status === 'fulfilled').length;
  
  return {
    duration,
    successCount,
    totalCount: errorCount,
    successRate: successCount / errorCount,
    avgLatency: duration / errorCount
  };
}

module.exports = {
  createTestError,
  performanceTest
};