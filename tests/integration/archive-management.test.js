/**
 * 档案管理功能综合测试
 * 测试家庭档案更新、成员管理、状态管理和数据脱敏功能
 */

const HouseholdArchive = require('../../src/models/HouseholdArchive');
const FamilyRelationship = require('../../src/models/FamilyRelationship');
const ArchiveStatus = require('../../src/models/ArchiveStatus');
const EnhancedFamilyMember = require('../../src/models/EnhancedFamilyMember');
const EnhancedDataAnonymizer = require('../../src/utils/EnhancedDataAnonymizer');
const ArchiveChangeLog = require('../../src/models/ArchiveChangeLog');

describe('档案管理功能测试套件', () => {
  let dbService;
  let householdArchive;
  let familyRelationship;
  let archiveStatus;
  let enhancedFamilyMember;
  let dataAnonymizer;
  let archiveChangeLog;

  const testHouseholdData = {
    householdId: 'TEST_HOUSEHOLD_001',
    familyHeadId: 'HEAD_001',
    familyHeadName: '张三',
    address: '测试村1组88号',
    familyMembersCount: 3
  };

  const testMemberData = {
    householdId: 'TEST_HOUSEHOLD_001',
    memberId: 'MEMBER_001',
    memberName: '李四',
    memberIdCard: '110101199001010001',
    relationship: 'spouse',
    gender: 'female',
    birthDate: '1990-01-01',
    phoneNumber: '13800138000',
    isMainContact: false,
    memberStatus: 'active'
  };

  const testUser = {
    id: 'USER_001',
    name: '管理员',
    role: 'village_admin',
    villageId: 'VILLAGE_001'
  };

  beforeEach(async () => {
    // 初始化数据库服务（模拟）
    dbService = {
      sqliteDB: {
        run: jest.fn(),
        get: jest.fn(),
        all: jest.fn()
      },
      getUserRoles: jest.fn()
    };

    // 初始化各个模块
    householdArchive = new HouseholdArchive(dbService);
    familyRelationship = new FamilyRelationship(dbService);
    archiveStatus = new ArchiveStatus(dbService);
    enhancedFamilyMember = new EnhancedFamilyMember(dbService);
    dataAnonymizer = new EnhancedDataAnonymizer(dbService);
    archiveChangeLog = new ArchiveChangeLog(dbService);
  });

  describe('家庭档案更新功能测试', () => {
    test('应该成功创建家庭档案', async () => {
      // 模拟数据库操作
      dbService.sqliteDB.run.mockReturnValue(true);
      dbService.sqliteDB.get.mockReturnValue({ id: 1 });

      const result = await householdArchive.createHousehold(testHouseholdData);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(dbService.sqliteDB.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO households'),
        expect.any(Array)
      );
    });

    test('应该成功更新家庭档案', async () => {
      // 模拟获取原始数据
      dbService.sqliteDB.get.mockReturnValue(testHouseholdData);
      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });

      const updateData = {
        familyHeadName: '张三更新',
        address: '测试村1组89号'
      };

      const result = await householdArchive.updateHousehold('TEST_HOUSEHOLD_001', updateData);

      expect(result).toBeDefined();
      expect(dbService.sqliteDB.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE households'),
        expect.any(Array)
      );
    });

    test('更新不存在的家庭档案应该抛出错误', async () => {
      dbService.sqliteDB.get.mockReturnValue(null);

      await expect(
        householdArchive.updateHousehold('NONEXISTENT', {})
      ).rejects.toThrow('获取家庭档案失败');
    });

    test('应该成功软删除家庭档案', async () => {
      dbService.sqliteDB.get.mockReturnValue(testHouseholdData);
      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });

      const result = await householdArchive.deleteHousehold('TEST_HOUSEHOLD_001');

      expect(result).toBeDefined();
      expect(dbService.sqliteDB.run).toHaveBeenCalledWith(
        'UPDATE households SET isActive = 0 WHERE householdId = ?',
        ['TEST_HOUSEHOLD_001']
      );
    });
  });

  describe('家庭成员CRUD操作测试', () => {
    test('应该成功创建家庭成员', async () => {
      // 模拟验证通过
      dbService.sqliteDB.get
        .mockReturnValueOnce(null) // 检查重复成员
        .mockReturnValueOnce(null) // 检查户主数量
        .mockReturnValueOnce({ id: 1 }); // 返回创建结果
      
      dbService.sqliteDB.run.mockReturnValue(true);

      const result = await enhancedFamilyMember.createFamilyMember(testMemberData);

      expect(result).toBeDefined();
      expect(result.memberName).toBe('李四');
      expect(dbService.sqliteDB.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO family_relationships'),
        expect.any(Array)
      );
    });

    test('创建重复成员应该抛出错误', async () => {
      dbService.sqliteDB.get.mockReturnValue({ id: 1 });

      await expect(
        enhancedFamilyMember.createFamilyMember(testMemberData)
      ).rejects.toThrow('家庭中已存在相同成员ID的成员');
    });

    test('应该成功批量创建家庭成员', async () => {
      const membersData = [
        { ...testMemberData, memberId: 'MEMBER_001', memberName: '成员1' },
        { ...testMemberData, memberId: 'MEMBER_002', memberName: '成员2' },
        { ...testMemberData, memberId: 'MEMBER_003', memberName: '成员3' }
      ];

      // 模拟成功创建
      dbService.sqliteDB.get
        .mockReturnValue(null) // 检查重复成员
        .mockReturnValue(null) // 检查户主数量
        .mockReturnValue({ id: 1 }); // 返回创建结果
      
      dbService.sqliteDB.run.mockReturnValue(true);

      const result = await enhancedFamilyMember.createFamilyMembersBatch(
        'TEST_HOUSEHOLD_001', 
        membersData
      );

      expect(result).toBeDefined();
      expect(result.totalProcessed).toBe(3);
      expect(result.successCount).toBeGreaterThan(0);
    });

    test('应该成功更新家庭成员', async () => {
      const originalMember = { ...testMemberData, id: 1 };
      const updateData = { memberName: '李四更新' };

      dbService.sqliteDB.get
        .mockReturnValueOnce(originalMember) // 获取原始数据
        .mockReturnValueOnce({ ...originalMember, ...updateData }); // 获取更新后数据

      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });

      const result = await enhancedFamilyMember.updateFamilyMember(1, updateData, testUser);

      expect(result).toBeDefined();
      expect(result.memberName).toBe('李四更新');
      expect(dbService.sqliteDB.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE family_relationships'),
        expect.any(Array)
      );
    });

    test('应该成功软删除家庭成员', async () => {
      const member = { ...testMemberData, id: 1 };
      dbService.sqliteDB.get.mockReturnValue(member);
      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });

      const result = await enhancedFamilyMember.deleteFamilyMember(1, testUser);

      expect(result.success).toBe(true);
      expect(result.deletedMember).toEqual(member);
      expect(dbService.sqliteDB.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE family_relationships'),
        expect.any(Array)
      );
    });

    test('应该成功恢复被删除的家庭成员', async () => {
      const deletedMember = { ...testMemberData, id: 1, isActive: 0 };
      const restoredMember = { ...deletedMember, isActive: 1 };

      dbService.sqliteDB.get
        .mockReturnValueOnce(deletedMember) // 获取删除的成员
        .mockReturnValueOnce(restoredMember); // 获取恢复后的成员

      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });

      const result = await enhancedFamilyMember.restoreFamilyMember(1, testUser);

      expect(result).toBeDefined();
      expect(result.memberName).toBe('李四');
      expect(dbService.sqliteDB.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE family_relationships'),
        ['active', 1]
      );
    });

    test('应该成功转移家庭成员', async () => {
      const member = { ...testMemberData, id: 1 };
      const targetHousehold = { householdId: 'TARGET_HOUSEHOLD', isActive: 1 };
      const transferredMember = { ...member, householdId: 'TARGET_HOUSEHOLD' };

      dbService.sqliteDB.get
        .mockReturnValueOnce(member) // 获取原成员
        .mockReturnValueOnce(targetHousehold) // 获取目标家庭
        .mockReturnValueOnce(transferredMember); // 获取转移后成员

      dbService.sqliteDB.run.mockReturnValue({ changes: 1 });

      const result = await enhancedFamilyMember.transferFamilyMember(
        1, 'TARGET_HOUSEHOLD', testUser, '搬家'
      );

      expect(result.success).toBe(true);
      expect(result.transferredMember.householdId).toBe('TARGET_HOUSEHOLD');
    });
  });

  describe('档案状态管理测试', () => {
    test('应该成功更新档案状态', async () => {
      const currentStatus = { status: 'active' };
      
      dbService.sqliteDB.get
        .mockReturnValueOnce(currentStatus) // 获取当前状态
        .mockReturnValueOnce({ id: 1 }); // 返回变更记录ID

      dbService.sqliteDB.run.mockReturnValue(true);

      const result = await archiveStatus.updateArchiveStatus(
        'TEST_HOUSEHOLD_001',
        'verified',
        'annual_review',
        'USER_001',
        '年度审查通过'
      );

      expect(result).toBeDefined();
      expect(result.oldStatus).toBe('active');
      expect(result.newStatus).toBe('verified');
      expect(dbService.sqliteDB.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO archive_status_changes'),
        expect.any(Array)
      );
    });

    test('不合法的状态变更应该抛出错误', async () => {
      const currentStatus = { status: 'archived' };
      dbService.sqliteDB.get.mockReturnValue(currentStatus);

      await expect(
        archiveStatus.updateArchiveStatus(
          'TEST_HOUSEHOLD_001',
          'active',
          'manual_update',
          'USER_001'
        )
      ).rejects.toThrow('状态变更不合法');
    });

    test('应该成功获取档案状态历史', async () => {
      const statusHistory = [
        {
          id: 1,
          householdId: 'TEST_HOUSEHOLD_001',
          oldStatus: 'pending',
          newStatus: 'active',
          reason: 'initial_setup',
          operatorName: '管理员'
        },
        {
          id: 2,
          householdId: 'TEST_HOUSEHOLD_001',
          oldStatus: 'active',
          newStatus: 'verified',
          reason: 'annual_review',
          operatorName: '管理员'
        }
      ];

      dbService.sqliteDB.all.mockReturnValue(statusHistory);

      const result = await archiveStatus.getStatusHistory('TEST_HOUSEHOLD_001');

      expect(result).toEqual(statusHistory);
      expect(result).toHaveLength(2);
    });

    test('应该成功批量更新档案状态', async () => {
      const statusUpdates = [
        { householdId: 'HOUSEHOLD_001', newStatus: 'verified', reason: 'annual_review' },
        { householdId: 'HOUSEHOLD_002', newStatus: 'verified', reason: 'annual_review' }
      ];

      // 模拟成功更新
      dbService.sqliteDB.get
        .mockReturnValue({ status: 'active' }) // 当前状态
        .mockReturnValue({ id: 1 }); // 变更记录ID
      
      dbService.sqliteDB.run.mockReturnValue(true);

      const result = await archiveStatus.batchUpdateStatus(statusUpdates, 'USER_001');

      expect(result.totalProcessed).toBe(2);
      expect(result.successCount).toBeGreaterThan(0);
    });

    test('应该成功获取状态统计', async () => {
      const statistics = [
        { status: 'active', count: 150, recentCount: 10 },
        { status: 'verified', count: 200, recentCount: 5 },
        { status: 'pending', count: 20, recentCount: 15 }
      ];

      dbService.sqliteDB.all.mockReturnValue(statistics);

      const result = await archiveStatus.getStatusStatistics();

      expect(result).toEqual(statistics);
      expect(result).toHaveLength(3);
    });
  });

  describe('数据脱敏处理测试', () => {
    const sensitiveData = {
      memberName: '张三',
      memberIdCard: '110101199001010001',
      phoneNumber: '13800138000',
      address: '北京市朝阳区某某街道88号',
      income: 50000
    };

    test('应该根据用户角色正确脱敏数据', async () => {
      // 模拟低权限用户
      const lowPrivilegeUser = { ...testUser, role: 'resident' };

      // 模拟脱敏规则
      dbService.sqliteDB.all.mockReturnValue([
        {
          fieldName: 'memberIdCard',
          anonymizationType: 'partial_mask',
          params: '{"keepStart":6,"keepEnd":4}',
          minRoleLevel: 3
        },
        {
          fieldName: 'phoneNumber',
          anonymizationType: 'partial_mask',
          params: '{"keepStart":3,"keepEnd":4}',
          minRoleLevel: 3
        }
      ]);

      const result = await dataAnonymizer.intelligentAnonymize(
        sensitiveData, 
        lowPrivilegeUser, 
        'member_info'
      );

      expect(result.memberIdCard).toMatch(/110101\*{8}0001/);
      expect(result.phoneNumber).toMatch(/138\*{4}8000/);
      expect(result.memberName).toBe('张三'); // 姓名不脱敏
    });

    test('高权限用户应该看到完整数据', async () => {
      const highPrivilegeUser = { ...testUser, role: 'system_admin' };

      dbService.sqliteDB.all.mockReturnValue([]);

      const result = await dataAnonymizer.intelligentAnonymize(
        sensitiveData, 
        highPrivilegeUser, 
        'member_info'
      );

      expect(result).toEqual(sensitiveData);
    });

    test('应该成功批量脱敏处理', async () => {
      const dataList = [sensitiveData, { ...sensitiveData, memberName: '李四' }];

      dbService.sqliteDB.all.mockReturnValue([]);

      const result = await dataAnonymizer.batchAnonymize(
        dataList, 
        testUser, 
        'member_info',
        { chunkSize: 1 }
      );

      expect(result).toHaveLength(2);
      expect(result[0].memberName).toBe('张三');
      expect(result[1].memberName).toBe('李四');
    });

    test('应该正确应用自定义脱敏规则', async () => {
      const customRules = [
        {
          fieldName: 'memberIdCard',
          anonymizationType: 'full_mask',
          condition: { userRole: 'guest' }
        },
        {
          fieldName: 'income',
          anonymizationType: 'range_mask',
          anonymizationParams: { rangeSize: 10000 }
        }
      ];

      const result = await dataAnonymizer.applyCustomAnonymization(
        sensitiveData, 
        customRules, 
        { role: 'guest' }
      );

      expect(result.memberIdCard).toMatch(/\*+/);
      expect(result.income).toMatch(/\d+-\d+/);
    });

    test('血缘关系脱敏应该正确处理家庭成员数据', async () => {
      const viewer = { id: 'USER_001' };
      const target = { id: 'USER_002' };

      // 模拟配偶关系
      jest.spyOn(dataAnonymizer, 'getFamilyRelationship').mockResolvedValue('spouse');

      const result = await dataAnonymizer.applyFamilyRelationshipAnonymization(
        sensitiveData, 
        viewer, 
        target
      );

      expect(result).toBeDefined();
      // 配偶关系应该是低级脱敏
    });

    test('出错时应该使用降级脱敏策略', async () => {
      const corruptedData = { memberName: '张三', memberIdCard: '110101199001010001' };

      // 模拟数据库错误
      dbService.sqliteDB.all.mockImplementation(() => {
        throw new Error('数据库错误');
      });

      const result = await dataAnonymizer.intelligentAnonymize(
        corruptedData, 
        testUser, 
        'member_info'
      );

      // 应该使用降级脱敏
      expect(result.memberName).toBe('***');
      expect(result.memberIdCard).toBe('***');
    });
  });

  describe('档案变更日志测试', () => {
    test('应该成功记录档案变更', async () => {
      dbService.sqliteDB.run.mockReturnValue(true);
      dbService.sqliteDB.get.mockReturnValue({ id: 1 });

      const changeData = {
        householdId: 'TEST_HOUSEHOLD_001',
        changerId: 'USER_001',
        changerName: '管理员',
        changeType: '更新档案',
        changeDetails: '更新家庭成员信息',
        oldValue: { memberName: '张三' },
        newValue: { memberName: '张三更新' },
        ipAddress: '192.168.1.1'
      };

      const result = await archiveChangeLog.logChange(changeData);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(dbService.sqliteDB.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO archive_change_logs'),
        expect.any(Array)
      );
    });

    test('应该成功获取变更历史', async () => {
      const changeHistory = [
        {
          id: 1,
          householdId: 'TEST_HOUSEHOLD_001',
          changeType: '创建档案',
          oldValue: null,
          newValue: '{"memberName":"张三"}',
          createdAt: new Date().toISOString()
        }
      ];

      dbService.sqliteDB.all.mockReturnValue(changeHistory);

      const result = await archiveChangeLog.getChangeHistoryByHouseholdId('TEST_HOUSEHOLD_001');

      expect(result).toHaveLength(1);
      expect(result[0].householdId).toBe('TEST_HOUSEHOLD_001');
    });

    test('应该正确解析JSON格式的变更值', async () => {
      const changeWithJson = {
        id: 1,
        oldValue: '{"memberName":"张三","age":30}',
        newValue: '{"memberName":"张三更新","age":31}',
        householdId: 'TEST_HOUSEHOLD_001'
      };

      dbService.sqliteDB.all.mockReturnValue([changeWithJson]);

      const result = await archiveChangeLog.getChangeHistoryByHouseholdId('TEST_HOUSEHOLD_001');

      expect(result[0].oldValue).toEqual({ memberName: '张三', age: 30 });
      expect(result[0].newValue).toEqual({ memberName: '张三更新', age: 31 });
    });
  });

  describe('集成测试', () => {
    test('完整的档案管理流程应该正常工作', async () => {
      // 模拟完整流程：创建档案 -> 添加成员 -> 更新状态 -> 数据脱敏查看
      
      // 1. 创建家庭档案
      dbService.sqliteDB.run.mockReturnValue(true);
      dbService.sqliteDB.get.mockReturnValue({ id: 1 });

      const household = await householdArchive.createHousehold(testHouseholdData);
      expect(household.id).toBe(1);

      // 2. 添加家庭成员
      dbService.sqliteDB.get
        .mockReturnValueOnce(null) // 检查重复成员
        .mockReturnValueOnce(null) // 检查户主数量
        .mockReturnValueOnce({ id: 2 }); // 返回创建结果

      const member = await enhancedFamilyMember.createFamilyMember(testMemberData);
      expect(member.memberName).toBe('李四');

      // 3. 更新档案状态
      dbService.sqliteDB.get
        .mockReturnValueOnce({ status: 'pending' })
        .mockReturnValueOnce({ id: 3 });

      const statusUpdate = await archiveStatus.updateArchiveStatus(
        'TEST_HOUSEHOLD_001',
        'verified',
        'annual_review',
        'USER_001'
      );
      expect(statusUpdate.newStatus).toBe('verified');

      // 4. 数据脱敏查看
      dbService.sqliteDB.all.mockReturnValue([
        {
          fieldName: 'memberIdCard',
          anonymizationType: 'partial_mask',
          params: '{"keepStart":6,"keepEnd":4}',
          minRoleLevel: 4
        }
      ]);

      const anonymizedData = await dataAnonymizer.intelligentAnonymize(
        testMemberData,
        { ...testUser, role: 'resident' },
        'member_info'
      );

      expect(anonymizedData.memberIdCard).toMatch(/110101\*{8}0001/);
    });
  });

  describe('性能测试', () => {
    test('批量处理大量数据时性能应该可接受', async () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        ...testMemberData,
        memberId: `MEMBER_${i}`,
        memberName: `成员${i}`
      }));

      dbService.sqliteDB.all.mockReturnValue([]);

      const startTime = Date.now();
      const result = await dataAnonymizer.batchAnonymize(
        largeDataSet,
        testUser,
        'member_info',
        { chunkSize: 100, parallel: true }
      );
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // 应该在5秒内完成
    });
  });

  describe('错误处理测试', () => {
    test('数据库连接失败时应该正确处理', async () => {
      dbService.sqliteDB.run.mockImplementation(() => {
        throw new Error('数据库连接失败');
      });

      await expect(
        householdArchive.createHousehold(testHouseholdData)
      ).rejects.toThrow('创建家庭档案失败');
    });

    test('无效输入参数应该被正确验证', async () => {
      const invalidMemberData = {
        // 缺少必要字段
        memberName: '李四'
      };

      await expect(
        enhancedFamilyMember.createFamilyMember(invalidMemberData)
      ).rejects.toThrow('缺少必要的成员信息');
    });

    test('并发操作冲突应该被正确处理', async () => {
      // 模拟并发更新冲突
      dbService.sqliteDB.run.mockImplementation(() => {
        throw new Error('SQLITE_BUSY: database is locked');
      });

      await expect(
        archiveStatus.updateArchiveStatus(
          'TEST_HOUSEHOLD_001',
          'verified',
          'annual_review',
          'USER_001'
        )
      ).rejects.toThrow('更新档案状态失败');
    });
  });
});