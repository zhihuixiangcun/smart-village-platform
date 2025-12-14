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

describe('NotificationsService - 消息模板系统测试', () => {
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

  describe('模板引擎基础功能', () => {
    test('应该成功加载默认模板', () => {
      const templates = NotificationsService.getAllTemplates();
      
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.id === 'emergency_typhoon')).toBe(true);
      expect(templates.some(t => t.id === 'announcement_meeting')).toBe(true);
      expect(templates.some(t => t.id === 'agriculture_planting')).toBe(true);
      
      console.log(`✅ 已加载 ${templates.length} 个默认模板`);
    });

    test('应该能注册新的自定义模板', () => {
      const customTemplate = {
        name: '自定义测试模板',
        category: 'announcement',
        content: '测试消息：{{message}}，发送给{{user.name}}',
        variables: ['message', 'user.name'],
        channels: ['sms']
      };

      const result = NotificationsService.registerTemplate('custom_test', customTemplate);
      
      expect(result.success).toBe(true);
      expect(result.templateId).toBe('custom_test');
      
      const retrieved = NotificationsService.getTemplate('custom_test');
      expect(retrieved).toBeTruthy();
      expect(retrieved.name).toBe('自定义测试模板');
      
      console.log('✅ 自定义模板注册成功');
    });

    test('应该能预览模板渲染结果', () => {
      const data = {
        village: { name: '测试村' },
        typhoon: { 
          name: '海燕',
          arrivalTime: '明天上午10点'
        },
        contact: { emergency: '110' }
      };

      const preview = NotificationsService.previewTemplate('emergency_typhoon', data);
      
      expect(preview.success).toBe(true);
      expect(preview.message).toContain('测试村');
      expect(preview.message).toContain('海燕');
      expect(preview.message).toContain('明天上午10点');
      expect(preview.message).toContain('110');
      
      console.log(`✅ 模板预览: ${preview.message.substring(0, 50)}...`);
    });
  });

  describe('变量替换功能', () => {
    test('应该正确处理简单变量替换', () => {
      const customTemplate = {
        name: '简单变量测试',
        category: 'announcement',
        content: '尊敬的{{name}}，您好！今天是{{date}}。'
      };

      NotificationsService.registerTemplate('simple_vars', customTemplate);
      
      const preview = NotificationsService.previewTemplate('simple_vars', {
        name: '张三',
        date: '2024-01-15'
      });

      expect(preview.success).toBe(true);
      expect(preview.message).toBe('尊敬的张三，您好！今天是2024-01-15。');
      
      console.log('✅ 简单变量替换测试通过');
    });

    test('应该正确处理嵌套对象变量', () => {
      const data = {
        user: {
          name: '李四',
          village: {
            name: '幸福村',
            location: '山东省'
          }
        },
        weather: {
          condition: '晴天',
          temperature: 25
        }
      };

      NotificationsService.registerTemplate('nested_vars', {
        name: '嵌套变量测试',
        category: 'weather',
        content: '{{user.village.location}}{{user.village.name}}的{{user.name}}，今天天气{{weather.condition}}，气温{{weather.temperature}}度。'
      });

      const preview = NotificationsService.previewTemplate('nested_vars', data);
      
      expect(preview.success).toBe(true);
      expect(preview.message).toBe('山东省幸福村的李四，今天天气晴天，气温25度。');
      
      console.log('✅ 嵌套变量替换测试通过');
    });

    test('应该处理缺失变量的情况', () => {
      const preview = NotificationsService.previewTemplate('simple_vars', {
        name: '王五'
        // 缺少 date 变量
      });

      expect(preview.success).toBe(true);
      expect(preview.message).toContain('王五');
      expect(preview.message).toContain('{{date}}'); // 保留未替换的占位符
      
      console.log('✅ 缺失变量处理测试通过');
    });
  });

  describe('条件逻辑功能', () => {
    test('应该根据条件选择不同的内容', () => {
      const conditionalTemplate = {
        name: '条件逻辑测试',
        category: 'announcement',
        content: '普通会议通知：{{meeting.topic}}',
        conditions: [
          {
            if: { field: 'meeting.urgent', operator: 'equals', value: true },
            content: '紧急会议通知：{{meeting.topic}} - 请务必参加！'
          },
          {
            if: { field: 'meeting.type', operator: 'equals', value: 'board' },
            content: '理事会会议：{{meeting.topic}} - 仅限理事参加'
          }
        ]
      };

      NotificationsService.registerTemplate('conditional_test', conditionalTemplate);

      // 测试紧急会议条件
      const urgentPreview = NotificationsService.previewTemplate('conditional_test', {
        meeting: { urgent: true, topic: '疫情防控讨论' }
      });

      expect(urgentPreview.message).toContain('紧急会议通知');
      expect(urgentPreview.message).toContain('请务必参加');

      // 测试理事会条件
      const boardPreview = NotificationsService.previewTemplate('conditional_test', {
        meeting: { type: 'board', topic: '年度预算审核' }
      });

      expect(boardPreview.message).toContain('理事会会议');
      expect(boardPreview.message).toContain('仅限理事');

      // 测试默认情况
      const normalPreview = NotificationsService.previewTemplate('conditional_test', {
        meeting: { topic: '日常村务讨论' }
      });

      expect(normalPreview.message).toContain('普通会议通知');
      
      console.log('✅ 条件逻辑测试通过');
    });
  });

  describe('方言转换功能', () => {
    test('应该能转换为四川话', () => {
      NotificationsService.registerTemplate('dialect_test', {
        name: '方言测试',
        category: 'announcement',
        content: '你好大家，注意天气变化，谢谢配合！',
        dialectSupport: true
      });

      const preview = NotificationsService.previewTemplate('dialect_test', {}, {
        dialect: '四川话'
      });

      expect(preview.success).toBe(true);
      expect(preview.message).toContain('你好哇');
      expect(preview.message).toContain('要得注意');
      expect(preview.message).toContain('谢谢嘛');
      
      console.log(`✅ 四川话转换: ${preview.message}`);
    });

    test('应该能转换为粤语', () => {
      const preview = NotificationsService.previewTemplate('dialect_test', {}, {
        dialect: '粤语'
      });

      expect(preview.success).toBe(true);
      expect(preview.message).toContain('多谢');
      expect(preview.message).toContain('小心');
      
      console.log(`✅ 粤语转换: ${preview.message}`);
    });
  });

  describe('实际发送功能', () => {
    test('应该能使用模板发送单个通知', async () => {
      const recipients = {
        phone: '13800138000',
        email: 'test@village.com',
        dialect: '四川话'
      };

      const data = {
        village: { name: '测试村' },
        typhoon: { 
          name: '台风测试',
          arrivalTime: '今晚8点'
        },
        contact: { emergency: '119' }
      };

      const result = await NotificationsService.sendWithTemplate(
        'emergency_typhoon', 
        data, 
        recipients
      );

      expect(result.success).toBe(true);
      expect(result.templateId).toBe('emergency_typhoon');
      expect(result.renderedMessage).toContain('测试村');
      expect(result.renderedMessage).toContain('台风测试');
      expect(result.results.length).toBeGreaterThan(0);
      
      console.log(`✅ 模板通知发送成功: ${result.totalSent}个渠道`);
    });

    test('应该能批量发送模板通知', async () => {
      const commonData = {
        meeting: {
          date: '2024年1月20日',
          time: '晚上7点',
          location: '村委会',
          agenda: '讨论春节活动安排'
        },
        village: { name: '幸福村' }
      };

      const recipients = [
        {
          id: 'user1',
          contact: { phone: '13800138001' },
          data: { user: { name: '张三' } }
        },
        {
          id: 'user2', 
          contact: { phone: '13800138002' },
          data: { user: { name: '李四' } }
        },
        {
          id: 'user3',
          contact: { phone: '13800138003' },
          data: { user: { name: '王五' } }
        }
      ];

      const batchResult = await NotificationsService.sendBatchWithTemplate(
        'announcement_meeting',
        commonData,
        recipients
      );

      expect(batchResult.success).toBe(true);
      expect(batchResult.totalRecipients).toBe(3);
      expect(batchResult.totalSent).toBe(3);
      expect(batchResult.batchId).toBeTruthy();
      
      console.log(`✅ 批量模板通知: ${batchResult.totalSent}/${batchResult.totalRecipients} 发送成功`);
    });
  });

  describe('模板管理功能', () => {
    test('应该能按类别获取模板', () => {
      const emergencyTemplates = NotificationsService.getTemplatesByCategory('emergency');
      const agricultureTemplates = NotificationsService.getTemplatesByCategory('agriculture');

      expect(emergencyTemplates.length).toBeGreaterThan(0);
      expect(agricultureTemplates.length).toBeGreaterThan(0);
      
      expect(emergencyTemplates.every(t => t.category === 'emergency')).toBe(true);
      expect(agricultureTemplates.every(t => t.category === 'agriculture')).toBe(true);
      
      console.log(`✅ 紧急模板: ${emergencyTemplates.length}个, 农事模板: ${agricultureTemplates.length}个`);
    });

    test('应该能删除自定义模板', () => {
      // 先注册一个临时模板
      NotificationsService.registerTemplate('temp_template', {
        name: '临时模板',
        category: 'announcement',
        content: '这是一个临时模板'
      });

      // 验证模板存在
      let template = NotificationsService.getTemplate('temp_template');
      expect(template).toBeTruthy();

      // 删除模板
      const deleteResult = NotificationsService.deleteTemplate('temp_template');
      expect(deleteResult.success).toBe(true);

      // 验证模板已删除
      template = NotificationsService.getTemplate('temp_template');
      expect(template).toBeNull();
      
      console.log('✅ 模板删除功能测试通过');
    });
  });

  describe('错误处理', () => {
    test('应该处理不存在的模板', async () => {
      const result = await NotificationsService.sendWithTemplate(
        'non_existent_template',
        {},
        { phone: '13800138000' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('不存在');
      
      console.log('✅ 不存在模板的错误处理测试通过');
    });

    test('应该处理无效的模板注册', () => {
      const invalidTemplate = {
        name: '无效模板'
        // 缺少必需的 category 和 content
      };

      expect(() => {
        NotificationsService.registerTemplate('invalid_template', invalidTemplate);
      }).toThrow();
      
      console.log('✅ 无效模板注册的错误处理测试通过');
    });

    test('应该处理模板引擎内部错误', () => {
      // 注册一个会导致循环引用的模板
      const recursiveTemplate = {
        name: '递归模板测试',
        category: 'announcement',
        content: '测试消息：{{message.deep.nested.circular}}'
      };

      NotificationsService.registerTemplate('recursive_test', recursiveTemplate);
      
      // 创建循环引用数据
      const circularData = { message: {} };
      circularData.message.deep = { nested: { circular: circularData } };
      
      const preview = NotificationsService.previewTemplate('recursive_test', circularData);
      
      // 应该优雅处理而不是崩溃
      expect(preview).toBeDefined();
      expect(preview.success).toBe(true);
      
      console.log('✅ 模板引擎内部错误处理测试通过');
    });

    test('应该处理无效的条件操作符', () => {
      const invalidConditionTemplate = {
        name: '无效条件模板',
        category: 'announcement',
        content: '默认内容：{{message}}',
        conditions: [
          {
            if: { field: 'test', operator: 'invalid_operator', value: true },
            content: '这个条件永远不会匹配'
          }
        ]
      };

      NotificationsService.registerTemplate('invalid_condition_test', invalidConditionTemplate);
      
      const preview = NotificationsService.previewTemplate('invalid_condition_test', {
        test: true,
        message: '测试消息'
      });

      expect(preview.success).toBe(true);
      expect(preview.message).toBe('默认内容：测试消息');
      
      console.log('✅ 无效条件操作符处理测试通过');
    });

    test('应该处理模板渲染过程中的异常', () => {
      // 创建一个会在渲染时抛出异常的模板
      const problematicData = {
        get badProperty() {
          throw new Error('故意抛出的测试错误');
        }
      };

      NotificationsService.registerTemplate('error_prone_test', {
        name: '错误倾向模板',
        category: 'announcement',
        content: '尝试访问：{{badProperty}}'
      });

      const preview = NotificationsService.previewTemplate('error_prone_test', problematicData);
      
      expect(preview.success).toBe(false);
      expect(preview.error).toContain('渲染失败');
      
      console.log('✅ 模板渲染异常处理测试通过');
    });
  });

  describe('高级模板功能测试', () => {
    test('应该支持模板格式化功能', () => {
      const formattedTemplate = {
        name: '格式化测试模板',
        category: 'announcement',
        content: '基础消息：{{message}}',
        formatting: {
          emoji: '🎉',
          prefix: '【重要通知】',
          suffix: '- 村委会',
          maxLength: 50
        }
      };

      NotificationsService.registerTemplate('formatted_test', formattedTemplate);
      
      const preview = NotificationsService.previewTemplate('formatted_test', {
        message: '这是一个格式化测试消息'
      });

      expect(preview.success).toBe(true);
      expect(preview.message).toContain('🎉');
      expect(preview.message).toContain('【重要通知】');
      expect(preview.message).toContain('- 村委会');
      
      console.log(`✅ 格式化模板: ${preview.message}`);
    });

    test('应该支持复杂的嵌套条件逻辑', () => {
      const complexConditionTemplate = {
        name: '复杂条件模板',
        category: 'weather',
        content: '普通天气预报：{{weather.condition}}',
        conditions: [
          {
            if: { field: 'weather.temperature', operator: 'greater_than', value: 35 },
            content: '高温预警：气温{{weather.temperature}}℃，请注意防暑'
          },
          {
            if: { field: 'weather.temperature', operator: 'less_than', value: 0 },
            content: '低温预警：气温{{weather.temperature}}℃，请注意保暖'
          },
          {
            if: { field: 'weather.wind', operator: 'contains', value: '大风' },
            content: '大风预警：{{weather.condition}}，风力{{weather.wind}}'
          },
          {
            if: { field: 'weather.alerts', operator: 'in', value: ['暴雨', '雷电', '冰雹'] },
            content: '严重天气预警：{{weather.condition}}，预警等级{{weather.alerts}}'
          }
        ]
      };

      NotificationsService.registerTemplate('complex_condition_test', complexConditionTemplate);

      // 测试高温条件
      const highTempPreview = NotificationsService.previewTemplate('complex_condition_test', {
        weather: { temperature: 38, condition: '晴天' }
      });
      expect(highTempPreview.message).toContain('高温预警');
      expect(highTempPreview.message).toContain('38℃');

      // 测试低温条件
      const lowTempPreview = NotificationsService.previewTemplate('complex_condition_test', {
        weather: { temperature: -5, condition: '雪天' }
      });
      expect(lowTempPreview.message).toContain('低温预警');
      expect(lowTempPreview.message).toContain('-5℃');

      // 测试大风条件
      const windPreview = NotificationsService.previewTemplate('complex_condition_test', {
        weather: { wind: '6级大风', condition: '多云' }
      });
      expect(windPreview.message).toContain('大风预警');
      expect(windPreview.message).toContain('6级大风');

      // 测试数组包含条件
      const alertPreview = NotificationsService.previewTemplate('complex_condition_test', {
        weather: { alerts: '暴雨', condition: '雷雨' }
      });
      expect(alertPreview.message).toContain('严重天气预警');

      console.log('✅ 复杂条件逻辑测试通过');
    });

    test('应该支持多级嵌套变量替换', () => {
      const deepNestedTemplate = {
        name: '深度嵌套变量测试',
        category: 'service',
        content: '位置：{{location.province.name}}省{{location.city.name}}市{{location.district.name}}区{{location.village.name}}村，联系人：{{contact.person.name}}（{{contact.person.role}}），电话：{{contact.person.phone}}'
      };

      NotificationsService.registerTemplate('deep_nested_test', deepNestedTemplate);
      
      const complexData = {
        location: {
          province: { name: '山东' },
          city: { name: '济南' },
          district: { name: '历下' },
          village: { name: '幸福' }
        },
        contact: {
          person: {
            name: '张三',
            role: '村支书',
            phone: '13800138000'
          }
        }
      };

      const preview = NotificationsService.previewTemplate('deep_nested_test', complexData);
      
      expect(preview.success).toBe(true);
      expect(preview.message).toContain('山东省济南市历下区幸福村');
      expect(preview.message).toContain('张三（村支书）');
      expect(preview.message).toContain('13800138000');
      
      console.log('✅ 多级嵌套变量替换测试通过');
    });

    test('应该支持模板标签和分类管理', () => {
      const taggedTemplate = {
        name: '带标签的模板',
        category: 'announcement',
        content: '标签测试：{{message}}',
        tags: ['测试', '公告', '重要'],
        description: '这是一个用于测试标签功能的模板'
      };

      const result = NotificationsService.registerTemplate('tagged_test', taggedTemplate);
      expect(result.success).toBe(true);

      const retrieved = NotificationsService.getTemplate('tagged_test');
      expect(retrieved.tags).toEqual(['测试', '公告', '重要']);
      expect(retrieved.description).toBe('这是一个用于测试标签功能的模板');
      
      console.log('✅ 模板标签和分类管理测试通过');
    });

    test('应该支持模板优先级设置', () => {
      const priorities = ['urgent', 'high', 'normal', 'low'];
      
      priorities.forEach((priority, index) => {
        const priorityTemplate = {
          name: `${priority}优先级模板`,
          category: 'announcement',
          content: `优先级${priority}消息：{{message}}`,
          priority: priority
        };

        const result = NotificationsService.registerTemplate(`priority_${priority}`, priorityTemplate);
        expect(result.success).toBe(true);

        const retrieved = NotificationsService.getTemplate(`priority_${priority}`);
        expect(retrieved.priority).toBe(priority);
      });
      
      console.log('✅ 模板优先级设置测试通过');
    });
  });

  describe('模板系统性能测试', () => {
    test('应该能处理大量模板的注册和查询', () => {
      const templateCount = 100;
      const startTime = Date.now();

      // 批量注册模板
      for (let i = 0; i < templateCount; i++) {
        NotificationsService.registerTemplate(`perf_test_${i}`, {
          name: `性能测试模板${i}`,
          category: 'announcement',
          content: `这是第${i}个性能测试模板：{{message}}`
        });
      }

      const registrationTime = Date.now() - startTime;

      // 测试查询性能
      const queryStartTime = Date.now();
      const allTemplates = NotificationsService.getAllTemplates();
      const queryTime = Date.now() - queryStartTime;

      expect(allTemplates.length).toBeGreaterThanOrEqual(templateCount);
      expect(registrationTime).toBeLessThan(1000); // 注册应该在1秒内完成
      expect(queryTime).toBeLessThan(100); // 查询应该在100ms内完成

      console.log(`✅ 性能测试: 注册${templateCount}个模板用时${registrationTime}ms，查询用时${queryTime}ms`);
    });

    test('应该能处理复杂数据的快速渲染', () => {
      const complexTemplate = {
        name: '复杂渲染测试',
        category: 'service',
        content: '复杂数据渲染：用户{{user.name}}来自{{user.location.full}}，年龄{{user.age}}，职业{{user.profession}}，联系方式{{user.contacts.primary.type}}:{{user.contacts.primary.value}}'
      };

      NotificationsService.registerTemplate('complex_render_test', complexTemplate);

      const complexData = {
        user: {
          name: '李明',
          age: 35,
          profession: '农民',
          location: {
            full: '山东省济南市历下区幸福村'
          },
          contacts: {
            primary: {
              type: '手机',
              value: '13800138000'
            }
          }
        }
      };

      const renderCount = 50;
      const startTime = Date.now();

      for (let i = 0; i < renderCount; i++) {
        const preview = NotificationsService.previewTemplate('complex_render_test', complexData);
        expect(preview.success).toBe(true);
      }

      const renderTime = Date.now() - startTime;
      const avgTime = renderTime / renderCount;

      expect(avgTime).toBeLessThan(10); // 平均每次渲染应该在10ms内
      
      console.log(`✅ 复杂渲染性能测试: ${renderCount}次渲染总用时${renderTime}ms，平均${avgTime.toFixed(2)}ms`);
    });
  });
});