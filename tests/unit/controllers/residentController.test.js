/**
 * 村民管理控制器单元测试
 * Resident Controller Unit Tests
 *
 * 测试村民管理的核心功能：
 * - 创建村民档案
 * - 获取村民信息
 * - 更新村民信息
 * - 删除村民档案
 * - 批量导入
 * - 搜索功能
 * - 家庭关系网络
 */

const residentController = require('../../../src/controllers/residentController');
const residentService = require('../../../src/services/residentService');
const logger = require('../../../src/utils/logger');
const { mockRequest, mockResponse } = require('../../helpers/test-helpers');

// Mock dependencies
jest.mock('../../../src/services/residentService');
jest.mock('../../../src/utils/logger');

describe('Resident Controller', () => {
  let req, res;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    jest.clearAllMocks();
  });

  describe('createResident', () => {
    it('should create a new resident successfully', async () => {
      // Arrange
      const mockResidentData = {
        name: '张三',
        idCard: '110101199001011234',
        gender: '男',
        phone: '13800138000',
        villageId: 'village123'
      };

      const mockCreatedResident = {
        _id: 'resident123',
        ...mockResidentData,
        createdAt: new Date()
      };

      req.body = mockResidentData;
      req.user = {
        userId: 'user123',
        username: 'testuser',
        name: '测试用户',
        role: 'village_admin'
      };

      residentService.createResident.mockResolvedValue(mockCreatedResident);

      // Act
      await residentController.createResident(req, res);

      // Assert
      expect(residentService.createResident).toHaveBeenCalledWith(
        mockResidentData,
        expect.objectContaining({
          userId: 'user123',
          username: 'testuser',
          role: 'village_admin'
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockCreatedResident,
          message: '村民档案创建成功'
        })
      );
    });

    it('should return 409 when idCard already exists', async () => {
      // Arrange
      req.body = {
        name: '张三',
        idCard: '110101199001011234',
        gender: '男'
      };

      residentService.createResident.mockRejectedValue(
        new Error('身份证号已存在')
      );

      // Act
      await residentController.createResident(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '身份证号已存在'
        })
      );
    });

    it('should return 404 when village does not exist', async () => {
      // Arrange
      req.body = {
        name: '张三',
        idCard: '110101199001011234',
        villageId: 'nonexistent'
      };

      residentService.createResident.mockRejectedValue(
        new Error('村庄不存在')
      );

      // Act
      await residentController.createResident(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '村庄不存在'
        })
      );
    });

    it('should return 400 for validation errors', async () => {
      // Arrange
      req.body = {
        name: '', // Empty name should fail validation
        idCard: 'invalid' // Invalid ID card format
      };

      const validationResult = {
        isEmpty: () => false,
        array: () => [
          { param: 'name', msg: '姓名不能为空' },
          { param: 'idCard', msg: '身份证号格式不正确' }
        ]
      };

      // Mock validationResult to return errors
      req.validationResult = () => validationResult;

      // Act
      await residentController.createResident(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '参数验证失败'
        })
      );
    });

    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      req.body = { name: '张三', idCard: '110101199001011234' };
      residentService.createResident.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      await residentController.createResident(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '创建村民档案失败'
        })
      );
    });
  });

  describe('batchImportResidents', () => {
    it('should batch import residents successfully', async () => {
      // Arrange
      const residents = [
        { name: '张三', idCard: '110101199001011234' },
        { name: '李四', idCard: '110101199001011235' }
      ];

      req.body = { residents };
      req.user = { userId: 'user123', name: '测试用户', role: 'admin' };

      const mockResult = {
        success: 2,
        failed: 0,
        results: [
          { success: true, data: { _id: 'r1' } },
          { success: true, data: { _id: 'r2' } }
        ]
      };

      residentService.batchImportResidents.mockResolvedValue(mockResult);

      // Act
      await residentController.batchImportResidents(req, res);

      // Assert
      expect(residentService.batchImportResidents).toHaveBeenCalledWith(
        residents,
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult,
          message: '批量导入完成，成功2条，失败0条'
        })
      );
    });

    it('should return 400 when residents array is empty', async () => {
      // Arrange
      req.body = { residents: [] };

      // Act
      await residentController.batchImportResidents(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '请提供有效的村民数据数组'
        })
      );
    });

    it('should return 400 when residents is not an array', async () => {
      // Arrange
      req.body = { residents: 'not an array' };

      // Act
      await residentController.batchImportResidents(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getResidentById', () => {
    it('should get resident by id successfully', async () => {
      // Arrange
      const residentId = 'resident123';
      req.params = { id: residentId };
      req.user = {
        userId: 'user123',
        role: 'village_admin',
        villageId: 'village123'
      };

      const mockResident = {
        _id: residentId,
        name: '张三',
        idCard: '110101199001011234',
        phone: '13800138000'
      };

      residentService.getResidentById.mockResolvedValue(mockResident);

      // Act
      await residentController.getResidentById(req, res);

      // Assert
      expect(residentService.getResidentById).toHaveBeenCalledWith(
        residentId,
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResident
        })
      );
    });

    it('should return 404 when resident not found', async () => {
      // Arrange
      req.params = { id: 'nonexistent' };
      residentService.getResidentById.mockRejectedValue(
        new Error('村民不存在')
      );

      // Act
      await residentController.getResidentById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '村民不存在'
        })
      );
    });

    it('should return 403 when user lacks permission', async () => {
      // Arrange
      req.params = { id: 'resident123' };
      residentService.getResidentById.mockRejectedValue(
        new Error('没有权限查看该村民信息')
      );

      // Act
      await residentController.getResidentById(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('listResidents', () => {
    it('should list residents with pagination', async () => {
      // Arrange
      req.query = {
        page: '1',
        limit: '20',
        villageId: 'village123'
      };

      req.user = {
        userId: 'user123',
        role: 'village_admin',
        villageId: 'village123'
      };

      const mockResult = {
        residents: [
          { _id: 'r1', name: '张三' },
          { _id: 'r2', name: '李四' }
        ],
        total: 2,
        page: 1,
        limit: 20,
        pages: 1
      };

      residentService.listResidents.mockResolvedValue(mockResult);

      // Act
      await residentController.listResidents(req, res);

      // Assert
      expect(residentService.listResidents).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          villageId: 'village123'
        }),
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult
        })
      );
    });

    it('should apply filters correctly', async () => {
      // Arrange
      req.query = {
        name: '张',
        gender: '男',
        ageRange: '18-60'
      };

      const mockResult = { residents: [], total: 0 };
      residentService.listResidents.mockResolvedValue(mockResult);

      // Act
      await residentController.listResidents(req, res);

      // Assert
      expect(residentService.listResidents).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '张',
          gender: '男',
          ageRange: '18-60'
        }),
        expect.any(Object)
      );
    });
  });

  describe('updateResident', () => {
    it('should update resident successfully', async () => {
      // Arrange
      req.params = { id: 'resident123' };
      req.body = {
        name: '张三丰',
        phone: '13900139000'
      };

      req.user = {
        userId: 'user123',
        role: 'village_admin',
        name: '测试用户'
      };

      const mockUpdatedResident = {
        _id: 'resident123',
        name: '张三丰',
        phone: '13900139000'
      };

      residentService.updateResident.mockResolvedValue(mockUpdatedResident);

      // Act
      await residentController.updateResident(req, res);

      // Assert
      expect(residentService.updateResident).toHaveBeenCalledWith(
        'resident123',
        req.body,
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockUpdatedResident,
          message: '村民信息更新成功'
        })
      );
    });

    it('should return 403 when user lacks edit permission', async () => {
      // Arrange
      req.params = { id: 'resident123' };
      req.body = { idCard: '110101199001011235' };

      residentService.updateResident.mockRejectedValue(
        new Error('没有权限修改该村民信息')
      );

      // Act
      await residentController.updateResident(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 for validation errors', async () => {
      // Arrange
      req.params = { id: 'resident123' };
      req.body = { phone: 'invalid' };

      residentService.updateResident.mockRejectedValue(
        new Error('验证失败：手机号格式不正确')
      );

      // Act
      await residentController.updateResident(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteResident', () => {
    it('should delete resident successfully', async () => {
      // Arrange
      req.params = { id: 'resident123' };
      req.body = { reason: '村民迁出' };

      req.user = {
        userId: 'user123',
        role: 'admin',
        name: '管理员'
      };

      residentService.deleteResident.mockResolvedValue(undefined);

      // Act
      await residentController.deleteResident(req, res);

      // Assert
      expect(residentService.deleteResident).toHaveBeenCalledWith(
        'resident123',
        '村民迁出',
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '村民档案删除成功'
        })
      );
    });

    it('should return 403 when non-admin tries to delete', async () => {
      // Arrange
      req.params = { id: 'resident123' };
      req.user = { role: 'resident', name: '普通村民' };

      residentService.deleteResident.mockRejectedValue(
        new Error('没有权限删除该村民信息')
      );

      // Act
      await residentController.deleteResident(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('searchResidents', () => {
    it('should search residents by name', async () => {
      // Arrange
      req.query = {
        keyword: '张三',
        searchType: 'name',
        limit: '10'
      };

      req.user = {
        userId: 'user123',
        role: 'village_admin',
        villageId: 'village123'
      };

      const mockResults = [
        { _id: 'r1', name: '张三', phone: '138****8000' },
        { _id: 'r2', name: '张三丰', phone: '139****9000' }
      ];

      residentService.searchResidents.mockResolvedValue(mockResults);

      // Act
      await residentController.searchResidents(req, res);

      // Assert
      expect(residentService.searchResidents).toHaveBeenCalledWith(
        expect.objectContaining({
          keyword: '张三',
          searchType: 'name',
          limit: 10
        }),
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResults
        })
      );
    });

    it('should return 400 when keyword is missing', async () => {
      // Arrange
      req.query = {};

      // Act
      await residentController.searchResidents(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: '请提供搜索关键词'
        })
      );
    });
  });

  describe('getFamilyNetwork', () => {
    it('should get family network successfully', async () => {
      // Arrange
      req.params = { id: 'resident123' };
      req.user = {
        userId: 'user123',
        role: 'village_admin'
      };

      const mockFamilyNetwork = {
        root: { _id: 'resident123', name: '张三' },
        relationships: [
          { type: 'spouse', person: { _id: 'r2', name: '李四' } },
          { type: 'child', person: { _id: 'r3', name: '张小明' } }
        ]
      };

      residentService.getFamilyNetwork.mockResolvedValue(mockFamilyNetwork);

      // Act
      await residentController.getFamilyNetwork(req, res);

      // Assert
      expect(residentService.getFamilyNetwork).toHaveBeenCalledWith(
        'resident123',
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockFamilyNetwork
        })
      );
    });

    it('should return 403 when user lacks permission', async () => {
      // Arrange
      req.params = { id: 'resident123' };
      req.user = { role: 'resident', userId: 'other' };

      residentService.getFamilyNetwork.mockRejectedValue(
        new Error('没有权限查看该家庭关系')
      );

      // Act
      await residentController.getFamilyNetwork(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
