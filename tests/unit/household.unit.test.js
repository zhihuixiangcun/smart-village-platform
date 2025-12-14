// 家庭档案控制器单元测试
const HouseholdController = require('../../src/controllers/householdController');
const HouseholdArchive = require('../../src/models/HouseholdArchive');
const FamilyRelationship = require('../../src/models/FamilyRelationship');
const ArchiveChangeLog = require('../../src/models/ArchiveChangeLog');
const QRCodeGenerator = require('../../src/utils/QRCodeGenerator');

// Mock数据库服务
const mockDBService = {
  sqliteDB: {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
  }
};

describe('家庭档案控制器单元测试', () => {
  let householdController;
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    householdController = new HouseholdController(mockDBService);
    
    mockRequest = {
      params: {},
      body: {},
      user: {
        id: 'TEST_USER_ID',
        name: '测试用户',
        role: 'resident'
      },
      ip: '127.0.0.1'
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // 清除所有mock调用记录
    jest.clearAllMocks();
  });

  // 测试控制器初始化
  test('控制器初始化测试', () => {
    expect(householdController).toBeDefined();
    expect(householdController.householdArchive).toBeInstanceOf(HouseholdArchive);
    expect(householdController.familyRelationship).toBeInstanceOf(FamilyRelationship);
    expect(householdController.archiveChangeLog).toBeInstanceOf(ArchiveChangeLog);
    expect(householdController.qrGenerator).toBeInstanceOf(QRCodeGenerator);
  });

  // 测试创建家庭档案
  test('createHousehold方法测试', async () => {
    mockRequest.body = {
      householdId: 'HH_UNIT_TEST_001',
      familyHeadId: 'USER_UNIT_TEST_001',
      familyHeadName: '单元测试户主',
      address: '单元测试地址',
      familyMembersCount: 3
    };

    // Mock模型方法
    householdController.householdArchive.createHousehold = jest.fn().mockResolvedValue({ id: 1 });
    householdController.archiveChangeLog.logChange = jest.fn().mockResolvedValue({ id: 1 });

    await householdController.createHousehold(mockRequest, mockResponse);

    expect(householdController.householdArchive.createHousehold).toHaveBeenCalled();
    expect(householdController.archiveChangeLog.logChange).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: '家庭档案创建成功'
      })
    );
  });

  // 测试获取家庭档案
  test('getHousehold方法测试', async () => {
    mockRequest.params = { householdId: 'HH_UNIT_TEST_001' };

    // Mock模型方法
    householdController.householdArchive.getHouseholdByHouseholdId = jest.fn().mockResolvedValue({
      id: 1,
      householdId: 'HH_UNIT_TEST_001',
      familyHeadName: '单元测试户主',
      isActive: 1
    });
    
    householdController.familyRelationship.getFamilyMembersByHouseholdId = jest.fn().mockResolvedValue([
      { memberId: 'MEMBER_001', memberName: '成员1' }
    ]);

    await householdController.getHousehold(mockRequest, mockResponse);

    expect(householdController.householdArchive.getHouseholdByHouseholdId).toHaveBeenCalledWith('HH_UNIT_TEST_001');
    expect(householdController.familyRelationship.getFamilyMembersByHouseholdId).toHaveBeenCalledWith('HH_UNIT_TEST_001');
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          household: expect.objectContaining({ householdId: 'HH_UNIT_TEST_001' }),
          members: expect.arrayContaining([
            expect.objectContaining({ memberId: 'MEMBER_001' })
          ])
        })
      })
    );
  });

  // 测试更新家庭档案
  test('updateHousehold方法测试', async () => {
    mockRequest.params = { householdId: 'HH_UNIT_TEST_001' };
    mockRequest.body = {
      familyHeadName: '更新后的户主',
      address: '更新后的地址'
    };

    // Mock模型方法
    householdController.householdArchive.getHouseholdByHouseholdId = jest.fn()
      .mockResolvedValueOnce({ id: 1, householdId: 'HH_UNIT_TEST_001', familyHeadName: '原户主' })
      .mockResolvedValueOnce({ id: 1, householdId: 'HH_UNIT_TEST_001', familyHeadName: '更新后的户主' });
    
    householdController.householdArchive.updateHousehold = jest.fn().mockResolvedValue(undefined);
    householdController.archiveChangeLog.logChange = jest.fn().mockResolvedValue({ id: 1 });

    await householdController.updateHousehold(mockRequest, mockResponse);

    expect(householdController.householdArchive.getHouseholdByHouseholdId).toHaveBeenCalledTimes(2);
    expect(householdController.householdArchive.updateHousehold).toHaveBeenCalledWith(
      'HH_UNIT_TEST_001',
      mockRequest.body
    );
    expect(householdController.archiveChangeLog.logChange).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: '家庭档案更新成功'
      })
    );
  });

  // 测试删除家庭档案
  test('deleteHousehold方法测试', async () => {
    mockRequest.params = { householdId: 'HH_UNIT_TEST_001' };

    // Mock模型方法
    householdController.householdArchive.getHouseholdByHouseholdId = jest.fn().mockResolvedValue({
      id: 1,
      householdId: 'HH_UNIT_TEST_001',
      familyHeadName: '测试户主'
    });
    
    householdController.householdArchive.deleteHousehold = jest.fn().mockResolvedValue(undefined);
    householdController.archiveChangeLog.logChange = jest.fn().mockResolvedValue({ id: 1 });

    await householdController.deleteHousehold(mockRequest, mockResponse);

    expect(householdController.householdArchive.getHouseholdByHouseholdId).toHaveBeenCalledWith('HH_UNIT_TEST_001');
    expect(householdController.householdArchive.deleteHousehold).toHaveBeenCalledWith('HH_UNIT_TEST_001');
    expect(householdController.archiveChangeLog.logChange).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: '家庭档案删除成功'
      })
    );
  });

  // 测试添加家庭成员
  test('addFamilyMember方法测试', async () => {
    mockRequest.params = { householdId: 'HH_UNIT_TEST_001' };
    mockRequest.body = {
      memberId: 'MEMBER_UNIT_TEST_001',
      memberName: '单元测试成员',
      relationship: '子女',
      isMainContact: false
    };

    // Mock模型方法
    householdController.householdArchive.getHouseholdByHouseholdId = jest.fn().mockResolvedValue({
      id: 1,
      householdId: 'HH_UNIT_TEST_001'
    });
    
    householdController.familyRelationship.addFamilyMember = jest.fn().mockResolvedValue({ id: 1 });
    householdController.familyRelationship.getFamilyMembersByHouseholdId = jest.fn().mockResolvedValue([
      { memberId: 'MEMBER_001' },
      { memberId: 'MEMBER_002' }
    ]);
    
    householdController.householdArchive.updateHousehold = jest.fn().mockResolvedValue(undefined);
    householdController.archiveChangeLog.logChange = jest.fn().mockResolvedValue({ id: 1 });

    await householdController.addFamilyMember(mockRequest, mockResponse);

    expect(householdController.householdArchive.getHouseholdByHouseholdId).toHaveBeenCalledWith('HH_UNIT_TEST_001');
    expect(householdController.familyRelationship.addFamilyMember).toHaveBeenCalledWith(
      expect.objectContaining({
        householdId: 'HH_UNIT_TEST_001',
        memberId: 'MEMBER_UNIT_TEST_001'
      })
    );
    expect(householdController.familyRelationship.getFamilyMembersByHouseholdId).toHaveBeenCalledWith('HH_UNIT_TEST_001');
    expect(householdController.householdArchive.updateHousehold).toHaveBeenCalled();
    expect(householdController.archiveChangeLog.logChange).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: '家庭成员添加成功'
      })
    );
  });

  // 测试生成二维码
  test('generateQRCode方法测试', async () => {
    mockRequest.params = { householdId: 'HH_UNIT_TEST_001' };

    // Mock模型方法
    householdController.householdArchive.getHouseholdByHouseholdId = jest.fn().mockResolvedValue({
      id: 1,
      householdId: 'HH_UNIT_TEST_001'
    });
    
    householdController.householdArchive.updateQRCode = jest.fn().mockResolvedValue(undefined);
    householdController.archiveChangeLog.logChange = jest.fn().mockResolvedValue({ id: 1 });

    // Mock二维码生成器
    householdController.qrGenerator.generateQRContent = jest.fn().mockReturnValue('mock_qr_content');

    await householdController.generateQRCode(mockRequest, mockResponse);

    expect(householdController.householdArchive.getHouseholdByHouseholdId).toHaveBeenCalledWith('HH_UNIT_TEST_001');
    expect(householdController.qrGenerator.generateQRContent).toHaveBeenCalledWith('HH_UNIT_TEST_001');
    expect(householdController.householdArchive.updateQRCode).toHaveBeenCalled();
    expect(householdController.archiveChangeLog.logChange).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: '二维码生成成功'
      })
    );
  });

  // 测试错误处理
  test('错误处理测试', async () => {
    mockRequest.params = { householdId: 'HH_UNIT_TEST_001' };

    // Mock模型方法抛出错误
    householdController.householdArchive.getHouseholdByHouseholdId = jest.fn().mockRejectedValue(new Error('数据库错误'));

    await householdController.getHousehold(mockRequest, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('获取家庭档案失败')
      })
    );
  });
});