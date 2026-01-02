/**
 * 值班人员管理单元测试
 * 测试人员创建、更新、偏好设置、能力匹配、二维码生成等功能
 */

const mongoose = require('mongoose');
const DutyPersonnel = require('../../../src/models/DutyPersonnel');
const TestHelpers = require('../../helpers');

// 跳过测试如果数据库不可用
const describeTests = mongoose.connection.readyState === 1 ? describe : describe.skip;

describeTests('DutyPersonnel Model - Unit Tests', () => {
  let mockVillageId;
  let mockUserId;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await TestHelpers.clearDatabase();

      // 创建模拟的村庄ID和用户ID
      mockVillageId = new mongoose.Types.ObjectId();
      mockUserId = new mongoose.Types.ObjectId();
    }
  });

  describe('人员创建和验证', () => {
    test('应该成功创建有效的值班人员', async () => {
      const personnelData = {
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        email: 'zhangsan@example.com',
        position: '村委书记',
        department: '村委会',
        employeeId: 'VC001',
        villageId: mockVillageId,
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      };

      const personnel = new DutyPersonnel(personnelData);
      const savedPersonnel = await personnel.save();

      expect(savedPersonnel._id).toBeDefined();
      expect(savedPersonnel.name).toBe('张三');
      expect(savedPersonnel.phone).toBe('13800138000');
      expect(savedPersonnel.position).toBe('村委书记');
      expect(savedPersonnel.status).toBe('active'); // 默认值
      expect(savedPersonnel.qrCode.content).toBeDefined(); // 自动生成二维码
      expect(savedPersonnel.createdAt).toBeDefined();
    });

    test('应该验证必填字段', async () => {
      const personnel = new DutyPersonnel({
        name: '测试人员'
        // 缺少必填字段：personnelId, phone, position, villageId
      });

      let error;
      try {
        await personnel.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.personnelId).toBeDefined();
      expect(error.errors.phone).toBeDefined();
      expect(error.errors.position).toBeDefined();
      expect(error.errors.villageId).toBeDefined();
    });

    test('应该验证手机号格式', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '测试人员',
        phone: '12345', // 无效的手机号
        position: '村委',
        villageId: mockVillageId,
        emergencyContact: {
          name: '紧急联系人',
          relationship: '家人',
          phone: '13800138000'
        }
      });

      let error;
      try {
        await personnel.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.phone).toBeDefined();
    });

    test('应该验证邮箱格式', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '测试人员',
        phone: '13800138000',
        email: 'invalid-email', // 无效邮箱
        position: '村委',
        villageId: mockVillageId,
        emergencyContact: {
          name: '紧急联系人',
          relationship: '家人',
          phone: '13800138000'
        }
      });

      let error;
      try {
        await personnel.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
    });

    test('应该验证员工ID唯一性', async () => {
      const personnelData1 = {
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        employeeId: 'VC001',
        position: '村委',
        villageId: mockVillageId,
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      };

      const personnelData2 = {
        personnelId: new mongoose.Types.ObjectId(),
        name: '李四',
        phone: '13800138001',
        employeeId: 'VC001', // 相同的员工ID
        position: '村委',
        villageId: mockVillageId,
        emergencyContact: {
          name: '王五',
          relationship: '家人',
          phone: '13900139001'
        }
      };

      await new DutyPersonnel(personnelData1).save();

      let error;
      try {
        await new DutyPersonnel(personnelData2).save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB重复键错误
    });

    test('应该验证状态枚举值', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '测试人员',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        status: 'invalid_status', // 无效状态
        emergencyContact: {
          name: '紧急联系人',
          relationship: '家人',
          phone: '13800138001'
        }
      });

      let error;
      try {
        await personnel.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.status).toBeDefined();
    });

    test('应该验证姓名最大长度', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: 'A'.repeat(51), // 超过50个字符
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        emergencyContact: {
          name: '紧急联系人',
          relationship: '家人',
          phone: '13800138001'
        }
      });

      let error;
      try {
        await personnel.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
    });
  });

  describe('能力配置验证', () => {
    test('应该支持添加班次能力', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        capabilities: {
          availableShiftTypes: ['morning', 'afternoon'],
          skills: ['急救', '消防'],
          certifications: [{
            name: '急救证书',
            certificateNumber: 'CERT001',
            issuedBy: '红十字会',
            issueDate: new Date('2023-01-01'),
            expiryDate: new Date('2026-01-01')
          }],
          languages: ['zh-CN', 'en'],
          specialAbilities: ['医疗应急', '心理疏导']
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      const savedPersonnel = await personnel.save();

      expect(savedPersonnel.capabilities.availableShiftTypes).toContain('morning');
      expect(savedPersonnel.capabilities.availableShiftTypes).toContain('afternoon');
      expect(savedPersonnel.capabilities.skills).toHaveLength(2);
      expect(savedPersonnel.capabilities.certifications).toHaveLength(1);
      expect(savedPersonnel.capabilities.languages).toContain('zh-CN');
      expect(savedPersonnel.capabilities.specialAbilities).toContain('医疗应急');
    });

    test('应该验证班次类型枚举', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        capabilities: {
          availableShiftTypes: ['invalid_shift'] // 无效的班次类型
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      let error;
      try {
        await personnel.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors['capabilities.availableShiftTypes']).toBeDefined();
    });

    test('应该验证技能名称最大长度', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        capabilities: {
          skills: ['A'.repeat(31)] // 超过30个字符
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      let error;
      try {
        await personnel.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors['capabilities.skills']).toBeDefined();
    });
  });

  describe('偏好设置验证', () => {
    test('应该支持设置值班偏好', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        preferences: {
          preferredShifts: ['morning', 'afternoon'],
          unwantedShifts: ['night'],
          preferredDays: [1, 2, 3, 4, 5], // 周一到周五
          unwantedDays: [6, 7], // 周六周日
          maxDutyDaysPerMonth: 20,
          maxConsecutiveDays: 5
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      const savedPersonnel = await personnel.save();

      expect(savedPersonnel.preferences.preferredShifts).toContain('morning');
      expect(savedPersonnel.preferences.unwantedShifts).toContain('night');
      expect(savedPersonnel.preferences.preferredDays).toHaveLength(5);
      expect(savedPersonnel.preferences.maxDutyDaysPerMonth).toBe(20);
      expect(savedPersonnel.preferences.maxConsecutiveDays).toBe(5);
    });

    test('应该验证每月最大值班天数范围', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        preferences: {
          maxDutyDaysPerMonth: 35 // 超过31天
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      let error;
      try {
        await personnel.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors['preferences.maxDutyDaysPerMonth']).toBeDefined();
    });

    test('应该验证连续值班天数范围', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        preferences: {
          maxConsecutiveDays: 20 // 超过15天
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      let error;
      try {
        await personnel.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors['preferences.maxConsecutiveDays']).toBeDefined();
    });

    test('应该验证工作日范围（1-7）', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        preferences: {
          preferredDays: [8] // 超过7
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      let error;
      try {
        await personnel.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors['preferences.preferredDays']).toBeDefined();
    });
  });

  describe('canHandleShift 方法测试', () => {
    let personnel;

    beforeEach(async () => {
      personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        capabilities: {
          availableShiftTypes: ['morning', 'afternoon']
        },
        preferences: {
          preferredShifts: ['morning'],
          unwantedShifts: ['night'],
          preferredDays: [1, 2, 3, 4, 5],
          maxDutyDaysPerMonth: 22,
          maxConsecutiveDays: 5
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });
      await personnel.save();
    });

    test('应该能够承担匹配的班次', () => {
      const result = personnel.canHandleShift('morning', new Date('2024-01-08')); // 周一
      expect(result.canHandle).toBe(true);
    });

    test('不应该承担不具备能力的班次', () => {
      const result = personnel.canHandleShift('night', new Date('2024-01-08'));
      expect(result.canHandle).toBe(false);
      expect(result.reason).toBe('不具备该班次类型的能力');
    });

    test('不应该承担不希望的班次', () => {
      // 添加night到可用班次，但它在unwantedShifts中
      personnel.capabilities.availableShiftTypes.push('night');
      const result = personnel.canHandleShift('night', new Date('2024-01-08'));
      expect(result.canHandle).toBe(false);
      expect(result.reason).toBe('该班次类型在偏好排除列表中');
    });

    test('不应该在不希望的工作日值班', () => {
      personnel.preferences.unwantedDays = [6, 7]; // 周六周日
      const result = personnel.canHandleShift('morning', new Date('2024-01-06')); // 周六
      expect(result.canHandle).toBe(false);
      expect(result.reason).toBe('该日期在偏好排除列表中');
    });

    test('不应该超过连续值班天数限制', () => {
      personnel.statistics.consecutiveDays = 5;
      personnel.preferences.maxConsecutiveDays = 5;
      const result = personnel.canHandleShift('morning', new Date('2024-01-08'));
      expect(result.canHandle).toBe(false);
      expect(result.reason).toBe('已达到连续值班天数上限');
    });

    test('不应该超过月度值班天数限制', () => {
      personnel.statistics.currentMonthCount = 22;
      personnel.statistics.lastDutyDate = new Date();
      personnel.preferences.maxDutyDaysPerMonth = 22;
      const result = personnel.canHandleShift('morning', new Date());
      expect(result.canHandle).toBe(false);
      expect(result.reason).toBe('已达到月度值班天数上限');
    });

    test('非活跃状态不应该承担班次', () => {
      personnel.status = 'inactive';
      const result = personnel.canHandleShift('morning', new Date('2024-01-08'));
      expect(result.canHandle).toBe(false);
      expect(result.reason).toBe('人员状态不可用');
    });
  });

  describe('二维码功能测试', () => {
    test('应该在创建时自动生成二维码', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      await personnel.save();

      expect(personnel.qrCode.content).toBeDefined();
      expect(personnel.qrCode.generatedAt).toBeDefined();
      expect(personnel.qrCode.expiresAt).toBeDefined();
    });

    test('应该正确验证二维码有效性', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      await personnel.save();

      // 有效的二维码
      expect(personnel.isQRCodeValid).toBe(true);

      // 过期的二维码
      personnel.qrCode.expiresAt = new Date('2020-01-01');
      expect(personnel.isQRCodeValid).toBe(false);
    });

    test('应该能够手动生成新的二维码', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      await personnel.save();
      const oldQRCode = personnel.qrCode.content;

      // 手动生成新二维码
      const newQRCode = personnel.generateQRCode();
      await personnel.save();

      expect(newQRCode.content).toBeDefined();
      expect(newQRCode.content).not.toBe(oldQRCode);
    });

    test('应该正确验证二维码内容', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      await personnel.save();

      // 正确的二维码
      const isValid = personnel.verifyQRCode(personnel.qrCode.content);
      expect(isValid).toBe(true);

      // 错误的二维码
      const isInvalid = personnel.verifyQRCode('wrong-content');
      expect(isInvalid).toBe(false);
    });

    test('应该通过二维码查找人员', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      await personnel.save();

      const found = await DutyPersonnel.findByQRCode(personnel.qrCode.content);
      expect(found).toBeDefined();
      expect(found._id.toString()).toBe(personnel._id.toString());
    });

    test('不应该找到已过期二维码的人员', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      await personnel.save();
      personnel.qrCode.expiresAt = new Date('2020-01-01');
      await personnel.save();

      const found = await DutyPersonnel.findByQRCode(personnel.qrCode.content);
      expect(found).toBeNull();
    });
  });

  describe('统计信息测试', () => {
    test('应该正确更新统计信息', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        statistics: {
          currentMonthCount: 5,
          totalCount: 50,
          totalHours: 400
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      await personnel.save();
      personnel.updateStatistics(8); // 增加8小时
      await personnel.save();

      expect(personnel.statistics.totalCount).toBe(51);
      expect(personnel.statistics.totalHours).toBe(408);
    });

    test('应该在新月份重置月度计数', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        statistics: {
          currentMonthCount: 10,
          totalCount: 100,
          totalHours: 800,
          lastDutyDate: new Date('2024-01-15')
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      await personnel.save();
      personnel.updateStatistics(8);
      await personnel.save();

      // 当前是不同的月份，应该重置月度计数
      expect(personnel.statistics.currentMonthCount).toBe(1);
      expect(personnel.statistics.consecutiveDays).toBe(1);
    });
  });

  describe('虚拟字段测试', () => {
    test('应该正确判断是否可排班', async () => {
      const personnel1 = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        statistics: {
          consecutiveDays: 3
        },
        preferences: {
          maxConsecutiveDays: 5
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      await personnel1.save();
      expect(personnel1.isAvailableForScheduling).toBe(true);

      // 测试不可排班的情况
      personnel1.statistics.consecutiveDays = 5;
      expect(personnel1.isAvailableForScheduling).toBe(false);

      // 测试非活跃状态
      personnel1.status = 'inactive';
      expect(personnel1.isAvailableForScheduling).toBe(false);
    });
  });

  describe('静态方法测试', () => {
    test('应该获取村庄的可用人员', async () => {
      const personnel1 = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        status: 'active',
        capabilities: {
          availableShiftTypes: ['morning', 'afternoon']
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      const personnel2 = new DutyPersonnel({
        personnelId: new mongoose.Types.ObjectId(),
        name: '李四',
        phone: '13800138001',
        position: '村委',
        villageId: mockVillageId,
        status: 'inactive', // 非活跃
        capabilities: {
          availableShiftTypes: ['morning']
        },
        emergencyContact: {
          name: '王五',
          relationship: '家人',
          phone: '13900139001'
        }
      });

      await personnel1.save();
      await personnel2.save();

      const activePersonnel = await DutyPersonnel.findAvailableByVillage(mockVillageId);
      expect(activePersonnel).toHaveLength(1);
      expect(activePersonnel[0].name).toBe('张三');
    });

    test('应该根据班次类型筛选可用人员', async () => {
      const personnel1 = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        status: 'active',
        capabilities: {
          availableShiftTypes: ['morning', 'afternoon']
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      const personnel2 = new DutyPersonnel({
        personnelId: new mongoose.Types.ObjectId(),
        name: '李四',
        phone: '13800138001',
        position: '村委',
        villageId: mockVillageId,
        status: 'active',
        capabilities: {
          availableShiftTypes: ['night']
        },
        emergencyContact: {
          name: '王五',
          relationship: '家人',
          phone: '13900139001'
        }
      });

      await personnel1.save();
      await personnel2.save();

      const morningPersonnel = await DutyPersonnel.findAvailableByVillage(mockVillageId, 'morning');
      expect(morningPersonnel).toHaveLength(1);
      expect(morningPersonnel[0].name).toBe('张三');
    });
  });

  describe('健康状况测试', () => {
    test('应该支持健康状况记录', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        healthStatus: {
          status: 'good',
          notes: '身体健康，适合值班',
          lastCheckupDate: new Date('2024-01-01'),
          restrictions: []
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      const savedPersonnel = await personnel.save();

      expect(savedPersonnel.healthStatus.status).toBe('good');
      expect(savedPersonnel.healthStatus.notes).toBe('身体健康，适合值班');
      expect(savedPersonnel.healthStatus.restrictions).toHaveLength(0);
    });

    test('应该验证健康状况枚举', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        healthStatus: {
          status: 'invalid_status' // 无效状态
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      let error;
      try {
        await personnel.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors['healthStatus.status']).toBeDefined();
    });
  });

  describe('边界情况测试', () => {
    test('应该处理空技能列表', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        capabilities: {
          skills: [] // 空列表
        },
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      const savedPersonnel = await personnel.save();
      expect(savedPersonnel.capabilities.skills).toHaveLength(0);
    });

    test('应该处理空偏好设置', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        preferences: {}, // 空对象，使用默认值
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      const savedPersonnel = await personnel.save();
      expect(savedPersonnel.preferences.maxDutyDaysPerMonth).toBe(22); // 默认值
      expect(savedPersonnel.preferences.maxConsecutiveDays).toBe(5); // 默认值
    });

    test('应该处理备注最大长度', async () => {
      const personnel = new DutyPersonnel({
        personnelId: mockUserId,
        name: '张三',
        phone: '13800138000',
        position: '村委',
        villageId: mockVillageId,
        remarks: 'A'.repeat(1000), // 正好1000字符
        emergencyContact: {
          name: '李四',
          relationship: '配偶',
          phone: '13900139000'
        }
      });

      const savedPersonnel = await personnel.save();
      expect(savedPersonnel.remarks).toHaveLength(1000);

      // 超过1000字符
      savedPersonnel.remarks = 'A'.repeat(1001);
      let error;
      try {
        await savedPersonnel.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.remarks).toBeDefined();
    });
  });
});
