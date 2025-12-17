/**
 * 全面测试套件设置文件
 * 初始化测试环境、数据库连接、全局配置等
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// 全局变量
let mongoServer;

// 测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_DB = '1';

// 控制台输出设置
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    // 保留 error 和 warn，静默 log 和 info
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    // 保留 error 和 warn 用于调试
    error: console.error,
    warn: console.warn
  };
}

/**
 * 所有测试之前的设置
 */
beforeAll(async () => {
  try {
    // 启动内存MongoDB服务器
    console.log('🚀 启动测试数据库...');
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'smart_village_test'
      }
    });

    const mongoUri = mongoServer.getUri();
    console.log(`📊 MongoDB测试服务器启动: ${mongoUri}`);

    // 连接数据库
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ 数据库连接成功');

    // 设置测试token
    global.testToken = jwt.sign(
      {
        id: 'test_user_id',
        username: 'test_admin',
        role: 'village_admin',
        villageId: 'test_village_001'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    global.villagerToken = jwt.sign(
      {
        id: 'test_villager_id',
        username: 'test_villager',
        role: 'villager',
        villageId: 'test_village_001'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('🔑 测试Token已生成');

  } catch (error) {
    console.error('❌ 测试环境初始化失败:', error);
    process.exit(1);
  }
});

/**
 * 每个测试文件之前的设置
 */
beforeEach(async () => {
  // 清理数据库集合
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    try {
      await collections[key].deleteMany({});
    } catch (error) {
      console.warn(`清理集合 ${key} 失败:`, error.message);
    }
  }

  // 清理模拟函数调用历史
  jest.clearAllMocks();
});

/**
 * 所有测试之后的清理
 */
afterAll(async () => {
  try {
    console.log('🧹 清理测试环境...');

    // 关闭数据库连接
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
      console.log('📊 数据库连接已关闭');
    }

    // 停止MongoDB服务器
    if (mongoServer) {
      await mongoServer.stop();
      console.log('🚫 MongoDB测试服务器已停止');
    }

    console.log('✅ 测试环境清理完成');

  } catch (error) {
    console.error('❌ 测试环境清理失败:', error);
  }
});

/**
 * 全局测试工具函数
 */
global.testUtils = {
  /**
   * 生成测试用户数据
   */
  generateTestUser: (overrides = {}) => ({
    username: 'test_user',
    password: 'test_password_123',
    role: 'villager',
    villageId: 'test_village_001',
    ...overrides
  }),

  /**
   * 生成测试村民数据
   */
  generateTestResident: (overrides = {}) => ({
    name: '测试村民',
    idCard: '110101199001011234',
    phone: '13800138000',
    gender: 'male',
    birthDate: '1990-01-01',
    villageId: 'test_village_001',
    address: {
      province: '北京市',
      city: '北京市',
      district: '朝阳区',
      town: '某某镇',
      village: '某某村',
      detailAddress: '某某路123号'
    },
    ...overrides
  }),

  /**
   * 生成测试户数据
   */
  generateTestHousehold: (overrides = {}) => ({
    codeId: 'TEST001H0001A',
    villageId: 'test_village_001',
    householder: {
      name: '测试户主',
      idCard: '110101199001011234',
      phone: '13800138000',
      isPartyMember: false,
      occupation: 'farmer'
    },
    address: {
      province: '北京市',
      city: '北京市',
      county: '朝阳区',
      township: '某某镇',
      village: '某某村',
      detailed: '某某路123号'
    },
    ...overrides
  }),

  /**
   * 生成测试财务交易数据
   */
  generateTestTransaction: (overrides = {}) => ({
    transactionInfo: {
      transactionType: 'income',
      category: 'government_grant',
      amount: 100000,
      currency: 'CNY',
      transactionDate: new Date().toISOString(),
      description: '测试收入'
    },
    parties: {
      payer: {
        name: '财政局',
        accountNumber: '123456789'
      },
      payee: {
        name: '某某村村委会',
        accountNumber: '987654321'
      }
    },
    status: 'approved',
    villageId: 'test_village_001',
    ...overrides
  }),

  /**
   * 等待指定时间
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * 创建测试模型实例
   */
  createTestModels: async (modelCounts = {}) => {
    const models = {
      residents: modelCounts.residents || 0,
      households: modelCounts.households || 0,
      transactions: modelCounts.transactions || 0
    };

    const results = {};

    // 创建村民
    if (models.residents > 0) {
      const Resident = require('../src/models/Resident');
      const residents = [];
      for (let i = 0; i < models.residents; i++) {
        residents.push(new Resident(testUtils.generateTestResident({
          name: `测试村民${i}`,
          idCard: `11010119900${String(i).padStart(2, '0')}1234`,
          phone: `1380013${String(i).padStart(4, '0')}`
        })));
      }
      results.residents = await Resident.insertMany(residents);
    }

    // 创建户
    if (models.households > 0) {
      const Household = require('../src/models/Household');
      const households = [];
      for (let i = 0; i < models.households; i++) {
        households.push(new Household(testUtils.generateTestHousehold({
          codeId: `TEST${String(i).padStart(3, '0')}H${String(i).padStart(4, '0')}A`
        })));
      }
      results.households = await Household.insertMany(households);
    }

    // 创建财务交易
    if (models.transactions > 0) {
      const { FinancialTransaction } = require('../src/models/Finance');
      const transactions = [];
      for (let i = 0; i < models.transactions; i++) {
        transactions.push(new FinancialTransaction(testUtils.generateTestTransaction({
          amount: 1000 * (i + 1),
          description: `测试交易${i}`
        })));
      }
      results.transactions = await FinancialTransaction.insertMany(transactions);
    }

    return results;
  },

  /**
   * 验证响应格式
   */
  expectApiResponse: (response, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success');
    if (response.body.success) {
      expect(response.body).toHaveProperty('data');
    } else {
      expect(response.body).toHaveProperty('message');
    }
  },

  /**
   * 模拟文件上传
   */
  createMockFile: (filename = 'test.jpg', mimetype = 'image/jpeg') => ({
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype,
    buffer: Buffer.from('mock file content'),
    size: 1024
  }),

  /**
   * 生成随机字符串
   */
  randomString: (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
};

/**
 * 全局错误处理
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  if (process.env.NODE_ENV === 'test') {
    // 在测试环境中，不要因为未处理的Promise拒绝而退出
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  if (process.env.NODE_ENV === 'test') {
    // 在测试环境中，不要因为未捕获的异常而退出
  } else {
    process.exit(1);
  }
});

// 添加自定义匹配器
expect.extend({
  /**
   * 验证是否为有效的ObjectId
   */
  toBeValidObjectId(received) {
    const pass = mongoose.Types.ObjectId.isValid(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ObjectId`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ObjectId`,
        pass: false,
      };
    }
  },

  /**
   * 验证是否为有效的日期
   */
  toBeValidDate(received) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },

  /**
   * 验证是否为有效的手机号
   */
  toBeValidPhoneNumber(received) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    const pass = phoneRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid phone number`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid phone number`,
        pass: false,
      };
    }
  },

  /**
   * 验证是否为有效的身份证号
   */
  toBeValidIdCard(received) {
    const idCardRegex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/;
    const pass = idCardRegex.test(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ID card number`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ID card number`,
        pass: false,
      };
    }
  }
});

// 设置测试超时
jest.setTimeout(30000);

console.log('🧪 全面测试套件设置完成');