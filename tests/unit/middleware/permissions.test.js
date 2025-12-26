/**
 * 权限中间件单元测试
 * Permission Middleware Unit Tests
 */

const {
  checkResidentViewPermission,
  checkResidentEditPermission,
  checkResidentDeletePermission,
  checkVillageManagementPermission,
  checkFinancePermission,
  checkEmergencyPermission,
  maskSensitiveData,
  checkViewPermission,
  checkEditPermission,
  checkDeletePermission
} = require('../../../src/middleware/permissions');

const { Resident } = require('../../../src/models/Resident');
const { mockRequest, mockResponse } = require('../../helpers/test-helpers');

// Mock dependencies
jest.mock('../../../src/models/Resident');
jest.mock('../../../src/utils/logger');

describe('Permission Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('maskSensitiveData', () => {
    it('should not mask data for self', () => {
      // Arrange
      const data = {
        name: '张三',
        phone: '13800138000',
        idCard: '110101199001011234',
        email: 'zhangsan@example.com'
      };

      // Act
      const result = maskSensitiveData(data, 'self');

      // Assert
      expect(result.phone).toBe('13800138000');
      expect(result.idCard).toBe('110101199001011234');
    });

    it('should mask data for family members', () => {
      // Arrange
      const data = {
        name: '张三',
        phone: '13800138000',
        idCard: '110101199001011234',
        email: 'zhangsan@example.com'
      };

      // Act
      const result = maskSensitiveData(data, 'family');

      // Assert
      expect(result.phone).toBe('138****8000');
      expect(result.idCard).toBe('110101********1234');
    });

    it('should mask data for others', () => {
      // Arrange
      const data = {
        name: '张三',
        phone: '13800138000',
        idCard: '110101199001011234',
        email: 'zhangsan@example.com'
      };

      // Act
      const result = maskSensitiveData(data, 'other');

      // Assert
      expect(result.phone).toBe('138****8000');
      expect(result.idCard).toBe('110101********1234');
      expect(result.email).toBe('zh****@example.com');
    });

    it('should handle null or undefined data', () => {
      // Act & Assert
      expect(maskSensitiveData(null)).toBeNull();
      expect(maskSensitiveData(undefined)).toBeUndefined();
    });
  });

  describe('checkViewPermission', () => {
    it('should grant full access to admin', async () => {
      // Arrange
      const user = { role: 'admin' };
      const resident = { _id: 'r1', villageId: 'v1' };

      // Act
      const result = await checkViewPermission(user, resident);

      // Assert
      expect(result).toEqual({
        hasPermission: true,
        viewSensitiveData: true,
        reason: '管理员权限'
      });
    });

    it('should grant full access to village admin for same village', async () => {
      // Arrange
      const user = { role: 'village_admin', villageId: 'v1' };
      const resident = { _id: 'r1', villageId: 'v1' };

      // Act
      const result = await checkViewPermission(user, resident);

      // Assert
      expect(result.hasPermission).toBe(true);
      expect(result.viewSensitiveData).toBe(true);
    });

    it('should grant limited access to family members', async () => {
      // Arrange
      const user = {
        role: 'resident',
        userId: 'r2',
        idCard: '110101199001011234'
      };
      const resident = {
        _id: 'r2',
        villageId: 'v1',
        idCard: '110101199001011235'
      };

      // Act
      const result = await checkViewPermission(user, resident);

      // Assert
      expect(result.hasPermission).toBe(true);
    });

    it('should deny access for different villages', async () => {
      // Arrange
      const user = { role: 'resident', villageId: 'v1', userId: 'r2' };
      const resident = { _id: 'r1', villageId: 'v2' };

      // Act
      const result = await checkViewPermission(user, resident);

      // Assert
      expect(result.hasPermission).toBe(false);
    });
  });

  describe('checkEditPermission', () => {
    it('should allow admin to edit all fields', async () => {
      // Arrange
      const user = { role: 'admin' };
      const resident = { _id: 'r1' };
      const updateData = { idCard: 'new', phone: 'new' };

      // Act
      const result = await checkEditPermission(user, resident, updateData);

      // Assert
      expect(result).toBe(true);
    });

    it('should prevent village officials from editing sensitive fields', async () => {
      // Arrange
      const user = { role: 'village_official', villageId: 'v1' };
      const resident = { _id: 'r1', villageId: 'v1' };
      const updateData = { idCard: 'new' };

      // Act
      const result = await checkEditPermission(user, resident, updateData);

      // Assert
      expect(result).toBe(false);
    });

    it('should allow resident to edit their own non-restricted fields', async () => {
      // Arrange
      const user = { userId: 'r1', role: 'resident' };
      const resident = { _id: 'r1' };
      const updateData = { phone: 'new' };

      // Act
      const result = await checkEditPermission(user, resident, updateData);

      // Assert
      expect(result).toBe(true);
    });

    it('should prevent resident from editing restricted fields', async () => {
      // Arrange
      const user = { userId: 'r1', role: 'resident' };
      const resident = { _id: 'r1' };
      const updateData = { idCard: 'new' };

      // Act
      const result = await checkEditPermission(user, resident, updateData);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('checkDeletePermission', () => {
    it('should allow admin to delete', async () => {
      // Arrange
      const user = { role: 'admin' };
      const resident = { _id: 'r1' };

      // Act
      const result = await checkDeletePermission(user, resident);

      // Assert
      expect(result).toBe(true);
    });

    it('should deny village admin from deleting', async () => {
      // Arrange
      const user = { role: 'village_admin' };
      const resident = { _id: 'r1' };

      // Act
      const result = await checkDeletePermission(user, resident);

      // Assert
      expect(result).toBe(false);
    });

    it('should deny resident from deleting', async () => {
      // Arrange
      const user = { role: 'resident' };
      const resident = { _id: 'r1' };

      // Act
      const result = await checkDeletePermission(user, resident);

      // Assert
      expect(result).toBe(false);
    });
  });
});
