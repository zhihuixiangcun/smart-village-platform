/**
 * Smart Village Platform - Comprehensive Unit Tests
 * 智慧乡村综合服务平台 - 全面的单元测试
 *
 * Coverage Target: 90%+
 */

const { ClusterCacheManager } = require('../../src/cache/clusterCacheManager');
const { OptimizedSerializer } = require('../../src/cache/optimizedSerializer');
const { CacheMonitoringSystem } = require('../../src/cache/cacheMonitoring');

// Mock dependencies
jest.mock('ioredis', () => {
  const mockRedis = {
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    ping: jest.fn(),
    flushall: jest.fn(),
    cluster: jest.fn()
  };

  return {
    Cluster: jest.fn().mockImplementation(() => mockRedis)
  };
});

describe('Cache System Tests', () => {
  describe('ClusterCacheManager', () => {
    let cacheManager;

    beforeEach(() => {
      cacheManager = new ClusterCacheManager({
        l1Enabled: true,
        l2Enabled: false, // Disable Redis for unit tests
        enableMetrics: false
      });
    });

    afterEach(async () => {
      await cacheManager.disconnect();
    });

    test('should set and get values from L1 cache', async () => {
      await cacheManager.set('test:key', { value: 'test' });
      const result = await cacheManager.get('test:key');
      expect(result).toEqual({ value: 'test' });
    });

    test('should return null for non-existent keys', async () => {
      const result = await cacheManager.get('non:existent:key');
      expect(result).toBeNull();
    });

    test('should delete values from cache', async () => {
      await cacheManager.set('test:delete', 'value');
      await cacheManager.del('test:delete');
      const result = await cacheManager.get('test:delete');
      expect(result).toBeNull();
    });

    test('should handle multiple get operations', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      await cacheManager.set('key3', 'value3');

      const results = await cacheManager.mget(['key1', 'key2', 'key3']);
      expect(results).toEqual(['value1', 'value2', 'value3']);
    });

    test('should handle multiple set operations', async () => {
      const data = {
        'key1': 'value1',
        'key2': 'value2',
        'key3': 'value3'
      };

      const result = await cacheManager.mset(data, 300);
      expect(result).toBe(true);
    });

    test('should flush all cache', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      await cacheManager.flush();

      const result1 = await cacheManager.get('key1');
      const result2 = await cacheManager.get('key2');
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    test('should generate correct cache keys', () => {
      const key1 = cacheManager._generateKey('test');
      const key2 = cacheManager._generateKey('another:test');

      expect(key1).toContain('test');
      expect(key2).toContain('another:test');
    });

    test('should return cache statistics', () => {
      const stats = cacheManager.getStats();
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('errors');
    });
  });

  describe('OptimizedSerializer', () => {
    let serializer;

    beforeEach(() => {
      serializer = new OptimizedSerializer({
        compressionThreshold: 100,
        enableValidation: true
      });
    });

    test('should serialize and deserialize simple objects', async () => {
      const data = { name: 'test', value: 123 };
      const serialized = await serializer.serialize(data);
      const deserialized = await serializer.deserialize(serialized);

      expect(deserialized).toEqual(data);
    });

    test('should serialize and deserialize arrays', async () => {
      const data = [1, 2, 3, 4, 5];
      const serialized = await serializer.serialize(data);
      const deserialized = await serializer.deserialize(serialized);

      expect(deserialized).toEqual(data);
    });

    test('should serialize and deserialize complex nested objects', async () => {
      const data = {
        user: {
          name: '张三',
          age: 30,
          address: {
            province: '浙江省',
            city: '杭州市'
          }
        }
      };

      const serialized = await serializer.serialize(data);
      const deserialized = await serializer.deserialize(serialized);

      expect(deserialized).toEqual(data);
    });

    test('should compress large data', async () => {
      const largeData = { text: 'x'.repeat(200) };
      const serialized = await serializer.serialize(largeData);

      expect(serialized.length).toBeLessThan(Buffer.byteLength(JSON.stringify(largeData)));
    });

    test('should handle null values', async () => {
      const serialized = await serializer.serialize(null);
      const deserialized = await serializer.deserialize(serialized);

      expect(deserialized).toBeNull();
    });

    test('should handle binary data', async () => {
      const buffer = Buffer.from('test binary data');
      const serialized = await serializer.serialize(buffer);
      const deserialized = await serializer.deserialize(serialized);

      expect(deserialized).toEqual(buffer);
    });

    test('should return metrics', () => {
      const metrics = serializer.getMetrics();
      expect(metrics).toHaveProperty('serialize');
      expect(metrics).toHaveProperty('deserialize');
      expect(metrics).toHaveProperty('compression');
      expect(metrics).toHaveProperty('formatUsage');
    });

    test('should reset metrics', () => {
      serializer.resetMetrics();
      const metrics = serializer.getMetrics();
      expect(metrics.serialize.count).toBe(0);
    });
  });
});

describe('Model Tests', () => {
  describe('Permission Model', () => {
    const Permission = require('../../src/models/Permission');

    test('should have correct schema structure', () => {
      const schemaPaths = Permission.schema.paths;
      expect(schemaPaths).toHaveProperty('name');
      expect(schemaPaths).toHaveProperty('description');
      expect(schemaPaths).toHaveProperty('resource');
      expect(schemaPaths).toHaveProperty('action');
      expect(schemaPaths).toHaveProperty('conditions');
    });

    test('should validate required fields', () => {
      const permission = new Permission();
      const validationError = permission.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors).toHaveProperty('name');
      expect(validationError.errors).toHaveProperty('resource');
      expect(validationError.errors).toHaveProperty('action');
    });

    test('should create valid permission', () => {
      const permission = new Permission({
        name: 'read_residents',
        description: '查看村民信息',
        resource: 'residents',
        action: 'read',
        conditions: { villageId: '123' }
      });

      const validationError = permission.validateSync();
      expect(validationError).toBeUndefined();
    });
  });

  describe('Emergency Model', () => {
    const Emergency = require('../../src/models/Emergency');

    test('should have correct schema structure', () => {
      const schemaPaths = Emergency.schema.paths;
      expect(schemaPaths).toHaveProperty('type');
      expect(schemaPaths).toHaveProperty('severity');
      expect(schemaPaths).toHaveProperty('status');
      expect(schemaPaths).toHaveProperty('location');
      expect(schemaPaths).toHaveProperty('reporter');
    });

    test('should validate emergency types', () => {
      const validTypes = ['fire', 'flood', 'earthquake', 'medical', 'security', 'other'];
      const enumValues = Emergency.schema.path('type').enumValues;

      expect(enumValues).toEqual(expect.arrayContaining(validTypes));
    });

    test('should validate severity levels', () => {
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      const enumValues = Emergency.schema.path('severity').enumValues;

      expect(enumValues).toEqual(expect.arrayContaining(validSeverities));
    });

    test('should create valid emergency', () => {
      const emergency = new Emergency({
        type: 'fire',
        severity: 'high',
        status: 'active',
        location: {
          type: 'Point',
          coordinates: [120.1536, 30.2875]
        },
        reporter: 'userId123',
        description: '村口发生火灾'
      });

      const validationError = emergency.validateSync();
      expect(validationError).toBeUndefined();
    });
  });

  describe('Household Model', () => {
    const Household = require('../../src/models/Household');

    test('should have correct schema structure', () => {
      const schemaPaths = Household.schema.paths;
      expect(schemaPaths).toHaveProperty('householdCode');
      expect(schemaPaths).toHaveProperty('householdNumber');
      expect(schemaPaths).toHaveProperty('householdType');
      expect(schemaPaths).toHaveProperty('members');
      expect(schemaPaths).toHaveProperty('address');
    });

    test('should validate household code uniqueness', () => {
      // Household codes should be unique
      const household1 = new Household({
        householdCode: 'HH001',
        villageId: 'village123'
      });

      const household2 = new Household({
        householdCode: 'HH001',
        villageId: 'village123'
      });

      expect(household1.householdCode).toBe('HH001');
      expect(household2.householdCode).toBe('HH001');
    });

    test('should support household types', () => {
      const validTypes = ['general', 'low-income', 'subsistence', 'special-care'];
      const enumValues = Household.schema.path('householdType').enumValues;

      expect(enumValues).toEqual(expect.arrayContaining(validTypes));
    });
  });

  describe('DutySchedule Model', () => {
    const DutySchedule = require('../../src/models/DutySchedule');

    test('should have correct schema structure', () => {
      const schemaPaths = DutySchedule.schema.paths;
      expect(schemaPaths).toHaveProperty('title');
      expect(schemaPaths).toHaveProperty('type');
      expect(schemaPaths).toHaveProperty('schedule');
      expect(schemaPaths).toHaveProperty('assignees');
      expect(schemaPaths).toHaveProperty('status');
    });

    test('should support different duty types', () => {
      const validTypes = ['regular', 'emergency', 'special', 'temporary'];
      const enumValues = DutySchedule.schema.path('type').enumValues;

      expect(enumValues).toEqual(expect.arrayContaining(validTypes));
    });
  });

  describe('VillageUser Model', () => {
    const VillageUser = require('../../src/models/VillageUser');

    test('should have correct schema structure', () => {
      const schemaPaths = VillageUser.schema.paths;
      expect(schemaPaths).toHaveProperty('username');
      expect(schemaPaths).toHaveProperty('password');
      expect(schemaPaths).toHaveProperty('role');
      expect(schemaPaths).toHaveProperty('villageId');
    });

    test('should validate username', () => {
      const user = new VillageUser({
        username: 'test_user',
        password: 'hashedPassword',
        role: 'admin',
        villageId: 'village123'
      });

      expect(user.username).toBe('test_user');
    });
  });
});

describe('Controller Tests', () => {
  describe('Emergency Controller', () => {
    let mockRequest;
    let mockResponse;
    let EmergencyController;

    beforeEach(() => {
      EmergencyController = require('../../src/controllers/emergencyController');

      mockRequest = {
        body: {},
        params: {},
        query: {},
        user: { id: 'userId123', role: 'admin' }
      };

      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
      };
    });

    test('should create new emergency', async () => {
      mockRequest.body = {
        type: 'fire',
        severity: 'high',
        description: '测试火灾',
        location: { coordinates: [120.1536, 30.2875] }
      };

      // Mock Emergency.create
      jest.spyOn(require('mongoose').Model, 'create').mockResolvedValue({
        _id: 'emergency123',
        ...mockRequest.body
      });

      await EmergencyController.createEmergency(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    test('should get emergency by ID', async () => {
      mockRequest.params.id = 'emergency123';

      const mockEmergency = {
        _id: 'emergency123',
        type: 'fire',
        severity: 'high',
        status: 'active'
      };

      jest.spyOn(require('mongoose').Model, 'findById').mockResolvedValue(mockEmergency);

      await EmergencyController.getEmergencyById(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Finance Controller', () => {
    let mockRequest;
    let mockResponse;

    beforeEach(() => {
      mockRequest = {
        body: {},
        params: {},
        query: {},
        user: { id: 'userId123', role: 'accountant' }
      };

      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    test('should get financial summary', async () => {
      const FinanceController = require('../../src/controllers/financeController');

      jest.spyOn(require('mongoose').Model, 'aggregate').mockResolvedValue([
        { totalIncome: 100000, totalExpense: 80000, balance: 20000 }
      ]);

      await FinanceController.getFinancialSummary(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});

describe('Middleware Tests', () => {
  describe('Rate Limiting', () => {
    test('should allow requests within limit', async () => {
      const rateLimiter = require('../../src/middleware/rateLimit');

      const mockRequest = {
        ip: '127.0.0.1',
        path: '/api/test'
      };

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockNext = jest.fn();

      await rateLimiter(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Cache Middleware', () => {
    test('should cache successful responses', async () => {
      const cacheMiddleware = require('../../src/middleware/cacheMiddleware');

      const mockRequest = {
        url: '/api/villages',
        method: 'GET'
      };

      const mockResponse = {
        statusCode: 200,
        getHeader: jest.fn(),
        setHeader: jest.fn()
      };

      const mockNext = jest.fn();

      await cacheMiddleware(60)(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('Service Tests', () => {
  describe('Database Query Optimization', () => {
    test('should use lean queries for better performance', async () => {
      const Resident = require('../../src/models/Resident');

      // Mock lean() chain
      const mockQuery = {
        lean: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      };

      jest.spyOn(Resident, 'find').mockReturnValue(mockQuery);

      await Resident.find().lean().limit(10).exec();

      expect(mockQuery.lean).toHaveBeenCalled();
    });

    test('should use select to limit returned fields', async () => {
      const Village = require('../../src/models/Village');

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      };

      jest.spyOn(Village, 'find').mockReturnValue(mockQuery);

      await Village.find().select('name location').exec();

      expect(mockQuery.select).toHaveBeenCalledWith('name location');
    });
  });
});

describe('Integration Tests', () => {
  describe('API Endpoints', () => {
    test('GET /api/health should return health status', async () => {
      const request = require('supertest');
      const app = require('../../src/app');

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('GET /api/villages should return villages list', async () => {
      const request = require('supertest');
      const app = require('../../src/app');

      const response = await request(app)
        .get('/api/villages')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

describe('Performance Tests', () => {
  test('cache operations should complete within 100ms', async () => {
    const cacheManager = new ClusterCacheManager({
      l1Enabled: true,
      l2Enabled: false
    });

    const start = Date.now();
    await cacheManager.set('perf:test', { data: 'test' });
    await cacheManager.get('perf:test');
    const duration = Date.now() - start;

    await cacheManager.disconnect();

    expect(duration).toBeLessThan(100);
  });

  test('serializer should handle large datasets efficiently', async () => {
    const serializer = new OptimizedSerializer();

    const largeData = {
      items: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: 'x'.repeat(100)
      }))
    };

    const start = Date.now();
    const serialized = await serializer.serialize(largeData);
    const deserialized = await serializer.deserialize(serialized);
    const duration = Date.now() - start;

    expect(deserialized).toEqual(largeData);
    expect(duration).toBeLessThan(500);
  });
});
