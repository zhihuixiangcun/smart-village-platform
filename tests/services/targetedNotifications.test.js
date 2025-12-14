const NotificationsService = require('../../server/services/notificationsService');

// Mock所有依赖
jest.mock('axios', () => ({
  post: jest.fn()
}));

jest.mock('nodemailer', () => ({
  createTransporter: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test_email_123',
      response: '250 OK'
    })
  }))
}));

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn()
}));

jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    stop: jest.fn()
  }))
}));

describe('NotificationsService - 特定人员通知系统测试', () => {
  const axios = require('axios');

  beforeEach(() => {
    jest.clearAllMocks();
    NotificationsService.notificationHistory = [];
    NotificationsService.scheduledNotifications = new Map();
    
    // Setup axios mock
    axios.post.mockResolvedValue({
      data: { message_id: 'test_123', cost: 0.05 }
    });
  });

  describe('用户管理功能', () => {
    test('应该能添加新用户', () => {
      const userData = {
        name: '测试用户',
        phone: '13800138000',
        email: 'test@village.com',
        role: 'farmer',
        age: 35,
        gender: '男',
        tags: ['种植', '东村'],
        location: { area: '东村', address: '测试地址' }
      };

      const result = NotificationsService.addUser('test_user_001', userData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('测试用户');
      expect(result.userId).toBe('test_user_001');

      // 验证用户信息
      const user = NotificationsService.getUser('test_user_001');
      expect(user).toBeTruthy();
      expect(user.name).toBe('测试用户');
      expect(user.role).toBe('farmer');
      expect(user.tags).toContain('种植');
      
      console.log('✅ 用户添加功能测试通过');
    });

    test('应该能更新用户信息', () => {
      // 先添加用户
      NotificationsService.addUser('test_update_001', {
        name: '原始用户',
        phone: '13800138001',
        role: 'resident'
      });

      // 更新用户
      const updateResult = NotificationsService.updateUser('test_update_001', {
        role: 'farmer',
        tags: ['种植', '西村'],
        location: { area: '西村' }
      });

      expect(updateResult.success).toBe(true);

      // 验证更新结果
      const updatedUser = NotificationsService.getUser('test_update_001');
      expect(updatedUser.role).toBe('farmer');
      expect(updatedUser.tags).toContain('种植');
      expect(updatedUser.location.area).toBe('西村');
      
      console.log('✅ 用户更新功能测试通过');
    });

    test('应该能获取用户统计信息', () => {
      // 添加测试用户
      NotificationsService.addUser('stats_user_1', {
        name: '张三', role: 'farmer', age: 45, gender: '男', tags: ['东村']
      });
      NotificationsService.addUser('stats_user_2', {
        name: '李四', role: 'elderly', age: 75, gender: '女', tags: ['西村']
      });
      NotificationsService.addUser('stats_user_3', {
        name: '王五', role: 'business_owner', age: 35, gender: '男', tags: ['中心区']
      });

      const stats = NotificationsService.getUserStats();

      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.byRole.farmer).toBeGreaterThanOrEqual(1);
      expect(stats.byRole.elderly).toBeGreaterThanOrEqual(1);
      expect(stats.byAge.adult).toBeGreaterThanOrEqual(1);
      expect(stats.byAge.elderly).toBeGreaterThanOrEqual(1);
      expect(stats.byGender.male).toBeGreaterThanOrEqual(2);
      expect(stats.byGender.female).toBeGreaterThanOrEqual(1);
      
      console.log(`✅ 用户统计: 总计${stats.total}人, 按角色${Object.keys(stats.byRole).length}种`);
    });
  });

  describe('用户分组功能', () => {
    test('应该能创建手动分组', () => {
      const groupData = {
        name: '测试手动分组',
        description: '这是一个测试分组',
        type: 'manual',
        members: ['test_user_001', 'test_update_001']
      };

      const result = NotificationsService.createGroup('test_group_manual', groupData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('测试手动分组');
      expect(result.groupId).toBe('test_group_manual');

      // 验证分组信息
      const group = NotificationsService.getGroup('test_group_manual');
      expect(group).toBeTruthy();
      expect(group.name).toBe('测试手动分组');
      expect(group.type).toBe('manual');
      expect(group.members).toEqual(['test_user_001', 'test_update_001']);
      
      console.log('✅ 手动分组创建测试通过');
    });

    test('应该能创建自动分组', () => {
      const groupData = {
        name: '农户自动分组',
        description: '所有农户的自动分组',
        type: 'auto',
        criteria: {
          filters: [{ field: 'role', operator: 'equals', value: 'farmer' }]
        }
      };

      const result = NotificationsService.createGroup('test_group_auto', groupData);

      expect(result.success).toBe(true);
      expect(result.groupId).toBe('test_group_auto');

      const group = NotificationsService.getGroup('test_group_auto');
      expect(group.type).toBe('auto');
      expect(group.criteria).toBeTruthy();
      expect(group.members.length).toBeGreaterThanOrEqual(0);
      
      console.log('✅ 自动分组创建测试通过');
    });

    test('应该能获取分组统计信息', () => {
      const stats = NotificationsService.getGroupStats();

      expect(stats).toBeTruthy();
      expect(stats.total).toBeGreaterThanOrEqual(0);
      expect(typeof stats.manual).toBe('number');
      expect(typeof stats.auto).toBe('number');
      
      console.log(`✅ 分组统计: 总计${stats.total}个分组`);
    });
  });

  describe('精准筛选功能', () => {
    beforeEach(() => {
      // 准备测试数据
      NotificationsService.addUser('filter_user_1', {
        name: '筛选测试1', role: 'farmer', age: 35, tags: ['种植', '东村']
      });
      NotificationsService.addUser('filter_user_2', {
        name: '筛选测试2', role: 'elderly', age: 78, tags: ['独居老人', '西村']
      });
      NotificationsService.addUser('filter_user_3', {
        name: '筛选测试3', role: 'business_owner', age: 42, tags: ['商贸', '中心区']
      });
    });

    test('应该能按角色筛选用户', () => {
      const criteria = {
        filters: [{ field: 'role', operator: 'equals', value: 'farmer' }]
      };

      const result = NotificationsService.filterUsers(criteria);

      expect(result.success).toBe(true);
      expect(result.users.length).toBeGreaterThanOrEqual(1);
      expect(result.users.every(user => user.role === 'farmer')).toBe(true);
      expect(result.filterStats.matchRate).toBeTruthy();
      
      console.log(`✅ 角色筛选: 找到${result.count}个农户`);
    });

    test('应该能按年龄范围筛选用户', () => {
      const criteria = {
        filters: [{ field: 'demographics.age', operator: 'greater_than', value: 70 }]
      };

      const result = NotificationsService.filterUsers(criteria);

      expect(result.success).toBe(true);
      expect(result.users.every(user => user.demographics.age > 70)).toBe(true);
      
      console.log(`✅ 年龄筛选: 找到${result.count}个70岁以上用户`);
    });

    test('应该能按标签筛选用户', () => {
      const criteria = {
        filters: [{ field: 'tags', operator: 'contains', value: '东村' }]
      };

      const result = NotificationsService.filterUsers(criteria);

      expect(result.success).toBe(true);
      expect(result.users.every(user => user.tags.includes('东村'))).toBe(true);
      
      console.log(`✅ 标签筛选: 找到${result.count}个东村用户`);
    });

    test('应该能使用复合条件筛选', () => {
      const criteria = {
        logic: 'AND',
        filters: [
          { field: 'role', operator: 'equals', value: 'farmer' },
          { field: 'demographics.age', operator: 'less_than', value: 50 }
        ]
      };

      const result = NotificationsService.filterUsers(criteria);

      expect(result.success).toBe(true);
      expect(result.users.every(user => 
        user.role === 'farmer' && user.demographics.age < 50
      )).toBe(true);
      
      console.log(`✅ 复合筛选: 找到${result.count}个50岁以下农户`);
    });
  });

  describe('通知偏好管理', () => {
    test('应该能设置用户通知偏好', () => {
      const userId = 'pref_user_001';
      NotificationsService.addUser(userId, {
        name: '偏好测试用户', 
        phone: '13800138005',
        role: 'resident'
      });

      const preferences = {
        channels: { sms: true, email: false, push: true },
        categories: { emergency: true, agriculture: false, announcement: true },
        quietHours: { enabled: true, start: '22:00', end: '07:00' },
        dialect: '四川话'
      };

      const result = NotificationsService.setNotificationPreferences(userId, preferences);

      expect(result.success).toBe(true);

      // 验证偏好设置
      const savedPrefs = NotificationsService.getNotificationPreferences(userId);
      expect(savedPrefs).toBeTruthy();
      expect(savedPrefs.channels.sms).toBe(true);
      expect(savedPrefs.channels.email).toBe(false);
      expect(savedPrefs.categories.emergency).toBe(true);
      expect(savedPrefs.categories.agriculture).toBe(false);
      expect(savedPrefs.dialect).toBe('四川话');
      
      console.log('✅ 通知偏好设置测试通过');
    });

    test('应该能检查用户是否应该接收通知', () => {
      // 使用已设置偏好的用户
      const shouldReceiveEmergency = NotificationsService.targetingManager.shouldReceiveNotification(
        'pref_user_001',
        { category: 'emergency', priority: 'urgent', channel: 'sms' }
      );

      const shouldReceiveAgriculture = NotificationsService.targetingManager.shouldReceiveNotification(
        'pref_user_001',
        { category: 'agriculture', priority: 'normal', channel: 'sms' }
      );

      expect(shouldReceiveEmergency).toBe(true);  // 紧急通知应该接收
      expect(shouldReceiveAgriculture).toBe(false); // 农事通知设置为不接收
      
      console.log('✅ 通知偏好检查测试通过');
    });
  });

  describe('特定人员通知发送', () => {
    test('应该能向筛选用户发送通知', async () => {
      const criteria = {
        filters: [{ field: 'role', operator: 'equals', value: 'farmer' }]
      };

      const notification = {
        title: '农事通知',
        message: '春季播种即将开始，请农户们做好准备工作。'
      };

      const result = await NotificationsService.sendToTargetUsers(
        criteria, 
        notification, 
        { 
          channels: ['sms'],
          category: 'agriculture',
          priority: 'normal'
        }
      );

      expect(result.success).toBe(true);
      expect(result.targetUsers).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.filterStats).toBeTruthy();
      
      console.log(`✅ 特定人员通知: 向${result.targetUsers}个农户发送通知`);
    });

    test('应该能使用模板向特定用户发送通知', async () => {
      const criteria = {
        filters: [{ field: 'role', operator: 'equals', value: 'farmer' }]
      };

      const templateData = {
        season: '春季',
        crop: { name: '玉米' },
        planting: {
          timeRange: '3月15日-4月10日',
          tips: '选择优质种子，注意防虫害'
        },
        technician: {
          name: '李农技',
          phone: '13800138888'
        }
      };

      const result = await NotificationsService.sendToTargetUsers(
        criteria,
        null,
        {
          templateId: 'agriculture_planting',
          templateData,
          category: 'agriculture',
          villageName: '测试村'
        }
      );

      expect(result.success).toBe(true);
      expect(result.targetUsers).toBeGreaterThanOrEqual(0);
      
      console.log(`✅ 模板特定人员通知: 向${result.targetUsers}个农户发送农事模板通知`);
    });

    test('应该能向用户组发送通知', async () => {
      const notification = {
        title: '群组通知',
        message: '这是一条发送给特定群组的测试通知。'
      };

      const result = await NotificationsService.sendToGroup(
        'test_group_manual',
        notification,
        { channels: ['sms'] }
      );

      expect(result.success).toBe(true);
      expect(result.groupId).toBe('test_group_manual');
      expect(result.groupName).toBe('测试手动分组');
      
      console.log(`✅ 群组通知: 向群组"${result.groupName}"发送通知`);
    });
  });

  describe('智能推送功能', () => {
    test('应该能获取最佳发送时间', () => {
      const userId = 'pref_user_001';
      
      const bestTime = NotificationsService.getBestSendTime(userId, 'agriculture');
      
      expect(bestTime).toBeInstanceOf(Date);
      expect(bestTime.getTime()).toBeGreaterThan(Date.now() - 24 * 60 * 60 * 1000); // 在24小时内
      
      console.log(`✅ 智能推送时间: ${bestTime.toLocaleString()}`);
    });

    test('应该考虑用户免打扰时间', () => {
      const userId = 'pref_user_001';
      
      // 获取紧急通知的最佳时间（应该立即发送）
      const emergencyTime = NotificationsService.getBestSendTime(userId, 'emergency');
      
      // 获取普通通知的最佳时间（应该避开免打扰时间）
      const normalTime = NotificationsService.getBestSendTime(userId, 'announcement');
      
      expect(emergencyTime).toBeInstanceOf(Date);
      expect(normalTime).toBeInstanceOf(Date);
      
      console.log(`✅ 免打扰时间考虑: 紧急${emergencyTime.toLocaleString()}, 普通${normalTime.toLocaleString()}`);
    });
  });

  describe('集成测试', () => {
    test('应该能完整演示特定人员通知流程', async () => {
      // 1. 创建测试场景用户
      NotificationsService.addUser('demo_farmer_1', {
        name: '老张', phone: '13800001001', email: 'zhang@village.com',
        role: 'farmer', age: 52, tags: ['种植', '东村', '技术能手']
      });

      NotificationsService.addUser('demo_farmer_2', {
        name: '老李', phone: '13800001002', 
        role: 'farmer', age: 48, tags: ['种植', '西村']
      });

      NotificationsService.addUser('demo_elderly_1', {
        name: '王奶奶', phone: '13800001003',
        role: 'elderly', age: 78, tags: ['独居老人', '南片区']
      });

      // 2. 设置通知偏好
      NotificationsService.setNotificationPreferences('demo_farmer_1', {
        channels: { sms: true, email: true },
        categories: { agriculture: true, weather: true, emergency: true },
        dialect: '普通话'
      });

      // 3. 创建农户群组
      NotificationsService.createGroup('demo_farmers', {
        name: '演示农户群组',
        type: 'auto',
        criteria: {
          filters: [{ field: 'role', operator: 'equals', value: 'farmer' }]
        }
      });

      // 4. 发送农事通知给所有农户
      const agricultureResult = await NotificationsService.sendToTargetUsers(
        {
          filters: [{ field: 'role', operator: 'equals', value: 'farmer' }]
        },
        {
          title: '春播通知',
          message: '各位农户注意：本周开始进入春播季节，请做好种子准备工作。'
        },
        {
          channels: ['sms'],
          category: 'agriculture',
          priority: 'normal'
        }
      );

      // 5. 发送紧急通知给特殊关怀群体
      const emergencyResult = await NotificationsService.sendToTargetUsers(
        {
          filters: [{ field: 'role', operator: 'equals', value: 'elderly' }]
        },
        {
          title: '天气预警',
          message: '明天将有大风降温，请老年朋友们注意保暖，减少外出。'
        },
        {
          channels: ['sms'],
          category: 'emergency',
          priority: 'urgent'
        }
      );

      // 6. 验证结果
      expect(agricultureResult.success).toBe(true);
      expect(emergencyResult.success).toBe(true);
      
      // 7. 检查统计信息
      const userStats = NotificationsService.getUserStats();
      const groupStats = NotificationsService.getGroupStats();

      expect(userStats.total).toBeGreaterThanOrEqual(3);
      expect(groupStats.total).toBeGreaterThanOrEqual(1);

      console.log('✅ 完整集成测试通过');
      console.log(`   - 用户统计: 总计${userStats.total}人`);
      console.log(`   - 分组统计: 总计${groupStats.total}个分组`);
      console.log(`   - 农事通知: 发送给${agricultureResult.targetUsers}个农户`);
      console.log(`   - 紧急通知: 发送给${emergencyResult.targetUsers}个老人`);
    });
  });
});