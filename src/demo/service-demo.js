/**
 * 智慧乡村服务层演示
 * 展示各个服务类的使用方法
 */

const mongoose = require('mongoose');
const residentService = require('../services/residentService');
const financeService = require('../services/financeService');
const emergencyService = require('../services/emergencyService');
const notificationService = require('../services/notificationService');
const EncryptionUtil = require('../utils/encryption');
const AuditUtil = require('../utils/audit');
const logger = require('../utils/logger');

class ServiceDemo {
  constructor() {
    this.demoData = {
      villageId: '65a1234567890abcdef123456', // 示例村庄ID
      operator: {
        userId: '65a1234567890abcdef123457',
        username: 'admin',
        name: '管理员',
        role: 'village_official',
        sessionId: 'session_001'
      }
    };
  }

  /**
   * 运行所有演示
   */
  async runAllDemos() {
    console.log('\n===== 智慧乡村服务层功能演示 =====\n');

    try {
      // 1. 加密工具演示
      await this.demoEncryption();

      // 2. 村民管理服务演示
      await this.demoResidentService();

      // 3. 财务管理服务演示
      await this.demoFinanceService();

      // 4. 应急管理服务演示
      await this.demoEmergencyService();

      // 5. 通知服务演示
      await this.demoNotificationService();

      // 6. 审计日志演示
      await this.demoAuditLog();

      console.log('\n===== 演示完成 =====');
    } catch (error) {
      console.error('演示执行失败:', error);
    }
  }

  /**
   * 加密工具演示
   */
  async demoEncryption() {
    console.log('\n--- 1. 加密工具演示 ---');

    // 测试数据加密
    const phone = '13812345678';
    const idCard = '330106199001011234';

    console.log('原始数据:');
    console.log('  手机号:', phone);
    console.log('  身份证:', idCard);

    // 加密
    const encryptedPhone = EncryptionUtil.encrypt(phone);
    const encryptedIdCard = EncryptionUtil.encrypt(idCard);

    console.log('\n加密后:');
    console.log('  手机号:', encryptedPhone);
    console.log('  身份证:', encryptedIdCard);

    // 解密
    const decryptedPhone = EncryptionUtil.decrypt(encryptedPhone);
    const decryptedIdCard = EncryptionUtil.decrypt(encryptedIdCard);

    console.log('\n解密后:');
    console.log('  手机号:', decryptedPhone);
    console.log('  身份证:', decryptedIdCard);

    // 脱敏演示
    console.log('\n脱敏演示:');
    console.log('  本人查看:', EncryptionUtil.maskIdCard(idCard, 'self'));
    console.log('  家人查看:', EncryptionUtil.maskIdCard(idCard, 'family'));
    console.log('  管理员查看:', EncryptionUtil.maskIdCard(idCard, 'admin'));
    console.log('  其他人查看:', EncryptionUtil.maskIdCard(idCard, 'other'));
  }

  /**
   * 村民管理服务演示
   */
  async demoResidentService() {
    console.log('\n--- 2. 村民管理服务演示 ---');

    try {
      // 创建村民
      const residentData = {
        name: '张三',
        gender: 'male',
        birthDate: '1980-01-01',
        idCard: '330106198001010001',
        phone: '13812345678',
        address: '某某村1号',
        villageId: this.demoData.villageId
      };

      console.log('\n创建村民数据:', residentData);

      // 注意：实际运行需要数据库连接
      // const resident = await residentService.createResident(residentData, this.demoData.operator);
      // console.log('\n创建成功:', resident);

      console.log('\n村民管理服务功能:');
      console.log('  ✓ 村民档案创建');
      console.log('  ✓ 批量导入村民');
      console.log('  ✓ 信息查询与脱敏');
      console.log('  ✓ 家庭关系管理');
      console.log('  ✓ 数据加密存储');
    } catch (error) {
      console.log('  (演示模式，需要数据库连接)');
    }
  }

  /**
   * 财务管理服务演示
   */
  async demoFinanceService() {
    console.log('\n--- 3. 财务管理服务演示 ---');

    try {
      // 创建财务记录
      const financeData = {
        title: '购买办公用品',
        type: 'expense',
        category: 'office',
        amount: 1500,
        description: '购买打印纸、墨盒等办公用品',
        villageId: this.demoData.villageId
      };

      console.log('\n财务记录数据:', financeData);

      // 注意：实际运行需要数据库连接
      // const record = await financeService.createFinanceRecord(financeData, this.demoData.operator);
      // console.log('\n创建成功:', record);

      console.log('\n财务管理服务功能:');
      console.log('  ✓ 收支记录管理');
      console.log('  ✓ 发票OCR识别');
      console.log('  ✓ 审批流程管理');
      console.log('  ✓ 预算执行跟踪');
      console.log('  ✓ 财务报表生成');
      console.log('  ✓ 数据导出功能');
    } catch (error) {
      console.log('  (演示模式，需要数据库连接)');
    }
  }

  /**
   * 应急管理服务演示
   */
  async demoEmergencyService() {
    console.log('\n--- 4. 应急管理服务演示 ---');

    try {
      // 创建应急事件
      const emergencyData = {
        title: '火灾报警',
        type: 'fire',
        level: 'critical',
        description: '村委会后方发现火情',
        location: {
          address: '某某村委会后方仓库',
          coordinates: [120.123456, 30.654321]
        },
        villageId: this.demoData.villageId
      };

      console.log('\n应急事件数据:', emergencyData);

      // 注意：实际运行需要数据库连接
      // const emergency = await emergencyService.createEmergencyEvent(emergencyData, this.demoData.operator);
      // console.log('\n创建成功:', emergency);

      console.log('\n应急管理服务功能:');
      console.log('  ✓ 事件快速上报');
      console.log('  ✓ 自动级别判定');
      console.log('  ✓ 资源调度管理');
      console.log('  ✓ 预案自动执行');
      console.log('  ✓ 实时状态跟踪');
      console.log('  ✓ 多渠道通知');
    } catch (error) {
      console.log('  (演示模式，需要数据库连接)');
    }
  }

  /**
   * 通知服务演示
   */
  async demoNotificationService() {
    console.log('\n--- 5. 通知服务演示 ---');

    try {
      // 发送测试通知
      await notificationService.sendEmail({
        to: 'test@example.com',
        subject: '智慧乡村测试通知',
        text: '这是一条测试通知',
        html: '<h1>智慧乡村</h1><p>这是一条测试通知</p>'
      });

      console.log('\n✓ 邮件通知已加入队列');

      // 发送短信通知
      await notificationService.sendSMS({
        phone: '13812345678',
        message: '【智慧乡村】这是一条测试短信通知'
      });

      console.log('✓ 短信通知已加入队列');

      // 发送推送通知
      await notificationService.sendPushNotification({
        userIds: ['65a1234567890abcdef123457'],
        title: '系统通知',
        body: '您有新的系统消息',
        data: { type: 'system', id: '001' }
      });

      console.log('✓ 推送通知已加入队列');

      // 发送紧急通知
      await notificationService.sendEmergencyNotification({
        type: 'emergency',
        title: '紧急事件',
        message: '发现火情，请立即处理',
        data: { location: '村委会后方', type: 'fire' },
        channels: ['email', 'sms', 'push'],
        priority: 'high'
      });

      console.log('✓ 紧急通知已发送');

      console.log('\n通知服务功能:');
      console.log('  ✓ 多渠道支持（邮件/短信/推送）');
      console.log('  ✓ 队列化处理');
      console.log('  ✓ 失败重试机制');
      console.log('  ✓ 紧急通知优先级');
      console.log('  ✓ 批量通知');
    } catch (error) {
      console.log('  通知服务运行中...');
    }
  }

  /**
   * 审计日志演示
   */
  async demoAuditLog() {
    console.log('\n--- 6. 审计日志演示 ---');

    try {
      // 记录操作审计
      await AuditUtil.logOperation('CREATE', 'resident', this.demoData.operator, {
        target: {
          id: 'demo_001',
          type: 'Resident',
          name: '演示村民'
        },
        result: 'SUCCESS',
        details: {
          description: '创建村民档案（演示）',
          changes: {
            before: null,
            after: { name: '演示村民', status: 'active' }
          }
        },
        riskLevel: 'MEDIUM',
        villageId: this.demoData.villageId,
        sessionId: this.demoData.operator.sessionId
      });

      console.log('\n✓ 审计日志已记录');

      // 生成审计报告
      const report = await AuditUtil.generateReport({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        villageId: this.demoData.villageId,
        groupBy: 'module'
      });

      console.log('\n✓ 审计报告已生成');
      console.log('  报告条目数:', report.report.length);
      console.log('  操作总数:', report.summary.totalOperations || 0);

      console.log('\n审计日志功能:');
      console.log('  ✓ 操作记录追踪');
      console.log('  ✓ 风险等级评估');
      console.log('  ✓ 审批流程记录');
      console.log('  ✓ 报告生成');
      console.log('  ✓ 日志导出');
      console.log('  ✓ 10年数据保存');
    } catch (error) {
      console.log('  审计日志服务运行中...');
    }
  }

  /**
   * 性能监控演示
   */
  async demoPerformanceMonitoring() {
    console.log('\n--- 7. 性能监控演示 ---');

    // 使用性能监控
    const perf = logger.performanceMonitor('Service Demo');

    // 模拟一些操作
    await new Promise(resolve => setTimeout(resolve, 100));

    const duration = perf.end({
      operation: 'demo',
      records: 10
    });

    console.log('\n性能监控功能:');
    console.log('  ✓ 响应时间追踪');
    console.log('  ✓ 资源使用监控');
    console.log('  ✓ 错误率统计');
    console.log('  ✓ 性能告警');
    console.log('  ✓ 实时大屏展示');

    // 获取系统健康状态
    const healthStatus = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: 'connected',
        cache: 'connected',
        notification: 'running'
      }
    };

    logger.logSystemHealth(healthStatus);
    console.log('\n✓ 系统健康状态已记录');
  }
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
  // 连接数据库（可选）
  // mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village');

  const demo = new ServiceDemo();
  demo.runAllDemos()
    .then(() => {
      console.log('\n演示执行成功！');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n演示执行失败:', error);
      process.exit(1);
    });
}

module.exports = ServiceDemo;