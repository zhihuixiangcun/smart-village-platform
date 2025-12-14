// 数据隐私控制测试
const DataPrivacyController = require('../src/utils/dataPrivacyController');
const DatabaseService = require('../src/database/databaseService');

describe('Data Privacy Controller Tests', () => {
  let dbService;
  let privacyController;

  beforeAll(async () => {
    dbService = new DatabaseService();
    await dbService.init();
    privacyController = new DataPrivacyController(dbService);
  });

  afterAll(() => {
    if (dbService && dbService.sqliteDB) {
      dbService.sqliteDB.close();
    }
  });

  describe('Data Masking', () => {
    test('should mask sensitive fields based on rules', async () => {
      // 创建测试用户
      const user = {
        id: 1,
        name: '测试用户',
        role: 'resident'
      };

      // 测试数据
      const testData = {
        name: '张三',
        idCard: '123456789012345678',
        phone: '13800138000',
        address: '北京市朝阳区测试街道123号',
        bankAccount: '6222021234567890123'
      };

      // 应用数据脱敏
      const maskedData = await privacyController.applyDataMasking(
        testData,
        user,
        'resident_sensitive_data'
      );

      // 验证数据脱敏结果
      expect(maskedData.name).toBe('张三'); // 姓名通常不需要脱敏
      expect(maskedData.idCard).toBeDefined();
      expect(maskedData.phone).toBeDefined();
      expect(maskedData.address).toBe('***'); // 地址可能需要完全脱敏
    });

    test('should partially mask ID card numbers', () => {
      const idCard = '123456789012345678';
      const masked = privacyController.partialMask(idCard);
      expect(masked).toBe('123456********5678');
    });

    test('should partially mask phone numbers', () => {
      const phone = '13800138000';
      const masked = privacyController.partialMask(phone);
      expect(masked).toBe('138****8000');
    });
  });

  describe('Access Control', () => {
    test('should check field access based on user roles', async () => {
      // 创建不同角色的用户
      const adminUser = {
        id: 1,
        name: '管理员',
        role: 'system_admin'
      };

      const residentUser = {
        id: 2,
        name: '居民',
        role: 'resident'
      };

      // 创建测试控制规则
      const controlRule = {
        fieldName: 'idCard',
        accessRoleIds: JSON.stringify([1]), // 只有管理员可以访问
        maskType: 'partial_mask'
      };

      // 管理员应该有访问权限
      const adminHasAccess = await privacyController.checkFieldAccess(adminUser, controlRule);
      expect(adminHasAccess).toBe(true);

      // 居民不应该有访问权限
      const residentHasAccess = await privacyController.checkFieldAccess(residentUser, controlRule);
      expect(residentHasAccess).toBe(false);
    });
  });

  describe('Privacy Controls', () => {
    test('should retrieve privacy controls for data type', async () => {
      // 获取隐私控制规则
      const controls = await privacyController.getPrivacyControls('resident_sensitive_data');
      
      // 验证返回结果
      expect(Array.isArray(controls)).toBe(true);
    });
  });
});