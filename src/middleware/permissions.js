/**
 * 权限验证中间件
 * 专门处理智慧乡村平台的权限控制逻辑
 */

const mongoose = require('mongoose');
const { Resident } = require('../models/Resident');
const logger = require('../utils/logger');

class PermissionMiddleware {
  /**
   * 检查村民信息查看权限
   */
  checkResidentViewPermission = (targetResidentParam = 'id') => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: '未认证',
            message: '请先登录'
          });
        }

        const targetResidentId = req.params[targetResidentParam];
        if (!targetResidentId) {
          return res.status(400).json({
            success: false,
            error: '参数错误',
            message: '缺少村民ID参数'
          });
        }

        // 获取目标村民信息
        const targetResident = await Resident.findById(targetResidentId)
          .populate('villageId', 'name code');

        if (!targetResident) {
          return res.status(404).json({
            success: false,
            error: '村民不存在',
            message: '指定的村民信息不存在'
          });
        }

        // 检查权限
        const permissionResult = await this.checkViewPermission(req.user, targetResident);

        if (!permissionResult.hasPermission) {
          return res.status(403).json({
            success: false,
            error: '权限不足',
            message: permissionResult.reason || '您没有权限查看该村民信息'
          });
        }

        // 将权限检查结果添加到请求对象
        req.residentPermission = permissionResult;
        req.targetResident = targetResident;

        next();
      } catch (error) {
        logger.error('村民查看权限检查失败:', error);
        return res.status(500).json({
          success: false,
          error: '权限检查失败',
          message: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
        });
      }
    };
  };

  /**
   * 检查村民信息编辑权限
   */
  checkResidentEditPermission = (targetResidentParam = 'id') => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: '未认证',
            message: '请先登录'
          });
        }

        const targetResidentId = req.params[targetResidentParam];
        if (!targetResidentId) {
          return res.status(400).json({
            success: false,
            error: '参数错误',
            message: '缺少村民ID参数'
          });
        }

        // 获取目标村民信息
        const targetResident = await Resident.findById(targetResidentId);

        if (!targetResident) {
          return res.status(404).json({
            success: false,
            error: '村民不存在',
            message: '指定的村民信息不存在'
          });
        }

        // 检查编辑权限
        const hasPermission = await this.checkEditPermission(req.user, targetResident, req.body);

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: '权限不足',
            message: '您没有权限修改该村民信息'
          });
        }

        // 记录权限检查结果
        req.canEditResident = true;
        req.targetResident = targetResident;

        next();
      } catch (error) {
        logger.error('村民编辑权限检查失败:', error);
        return res.status(500).json({
          success: false,
          error: '权限检查失败',
          message: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
        });
      }
    };
  };

  /**
   * 检查村民信息删除权限
   */
  checkResidentDeletePermission = (targetResidentParam = 'id') => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: '未认证',
            message: '请先登录'
          });
        }

        const targetResidentId = req.params[targetResidentParam];
        if (!targetResidentId) {
          return res.status(400).json({
            success: false,
            error: '参数错误',
            message: '缺少村民ID参数'
          });
        }

        // 获取目标村民信息
        const targetResident = await Resident.findById(targetResidentId);

        if (!targetResident) {
          return res.status(404).json({
            success: false,
            error: '村民不存在',
            message: '指定的村民信息不存在'
          });
        }

        // 检查删除权限
        const hasPermission = await this.checkDeletePermission(req.user, targetResident);

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: '权限不足',
            message: '您没有权限删除该村民信息'
          });
        }

        // 记录权限检查结果
        req.canDeleteResident = true;
        req.targetResident = targetResident;

        next();
      } catch (error) {
        logger.error('村民删除权限检查失败:', error);
        return res.status(500).json({
          success: false,
          error: '权限检查失败',
          message: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
        });
      }
    };
  };

  /**
   * 检查村庄管理权限
   */
  checkVillageManagementPermission = (villageIdParam = 'villageId') => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: '未认证',
            message: '请先登录'
          });
        }

        let villageId = req.params[villageIdParam] || req.body[villageIdParam] || req.query[villageIdParam];

        // 如果是从路由参数获取，需要转换ObjectId
        if (villageId && mongoose.Types.ObjectId.isValid(villageId)) {
          villageId = mongoose.Types.ObjectId(villageId);
        }

        if (!villageId && req.villageId) {
          // 如果没有明确的villageId参数，使用用户的villageId
          villageId = req.villageId;
        }

        if (!villageId) {
          return res.status(400).json({
            success: false,
            error: '参数错误',
            message: '缺少村庄ID参数'
          });
        }

        // 检查村庄管理权限
        const hasPermission = await this.checkVillagePermission(req.user, villageId, 'manage');

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: '权限不足',
            message: '您没有管理该村庄的权限'
          });
        }

        // 添加权限信息到请求对象
        req.villagePermission = {
          villageId,
          canManage: true
        };

        next();
      } catch (error) {
        logger.error('村庄管理权限检查失败:', error);
        return res.status(500).json({
          success: false,
          error: '权限检查失败',
          message: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
        });
      }
    };
  };

  /**
   * 检查财务权限
   */
  checkFinancePermission = (action = 'view') => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: '未认证',
            message: '请先登录'
          });
        }

        let villageId = req.body.villageId || req.params.villageId || req.query.villageId || req.villageId;

        // 检查财务权限
        const hasPermission = await this.checkFinancePermission(req.user, villageId, action);

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: '权限不足',
            message: `您没有${action}财务信息的权限`
          });
        }

        // 添加权限信息到请求对象
        req.financePermission = {
          action,
          villageId,
          hasPermission: true
        };

        next();
      } catch (error) {
        logger.error('财务权限检查失败:', error);
        return res.status(500).json({
          success: false,
          error: '权限检查失败',
          message: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
        });
      }
    };
  };

  /**
   * 检查应急事件权限
   */
  checkEmergencyPermission = (action = 'view') => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: '未认证',
            message: '请先登录'
          });
        }

        let villageId = req.body.villageId || req.params.villageId || req.query.villageId || req.villageId;

        // 检查应急权限
        const hasPermission = await this.checkEmergencyPermission(req.user, villageId, action);

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: '权限不足',
            message: `您没有${action}应急事件的权限`
          });
        }

        // 添加权限信息到请求对象
        req.emergencyPermission = {
          action,
          villageId,
          hasPermission: true
        };

        next();
      } catch (error) {
        logger.error('应急权限检查失败:', error);
        return res.status(500).json({
          success: false,
          error: '权限检查失败',
          message: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
        });
      }
    };
  };

  /**
   * 核心权限检查逻辑
   */

  /**
   * 检查查看权限
   */
  async checkViewPermission(user, resident) {
    // 管理员可以查看所有
    if (user.role === 'admin' || user.role === 'super_admin') {
      return {
        hasPermission: true,
        viewSensitiveData: true,
        reason: '管理员权限'
      };
    }

    // 系统管理员可以查看所有
    if (user.role === 'system_admin') {
      return {
        hasPermission: true,
        viewSensitiveData: true,
        reason: '系统管理员权限'
      };
    }

    // 村委成员可以查看本村村民
    if ((user.role === 'village_admin' || user.role === 'village_official') &&
        this.isSameVillage(user.villageId, resident.villageId)) {
      return {
        hasPermission: true,
        viewSensitiveData: true,
        reason: '村委成员权限'
      };
    }

    // 村民只能查看自己的信息
    if (user.userId && user.userId === resident._id.toString()) {
      return {
        hasPermission: true,
        viewSensitiveData: true,
        reason: '本人信息'
      };
    }

    // 血缘关系可以查看部分信息
    const isRelative = await this.checkFamilyRelation(user.idCard, resident.idCard, resident.villageId);
    if (isRelative) {
      return {
        hasPermission: true,
        viewSensitiveData: false,
        reason: '家庭成员关系'
      };
    }

    // 同村村民可以查看基本信息
    if (user.villageId && this.isSameVillage(user.villageId, resident.villageId)) {
      return {
        hasPermission: true,
        viewSensitiveData: false,
        reason: '同村村民'
      };
    }

    return {
      hasPermission: false,
      viewSensitiveData: false,
      reason: '无权限查看'
    };
  }

  /**
   * 检查编辑权限
   */
  async checkEditPermission(user, resident, updateData = {}) {
    // 管理员可以编辑所有
    if (user.role === 'admin' || user.role === 'super_admin') {
      return true;
    }

    // 系统管理员可以编辑所有
    if (user.role === 'system_admin') {
      return true;
    }

    // 村委成员可以编辑本村村民信息
    if ((user.role === 'village_admin' || user.role === 'village_official') &&
        this.isSameVillage(user.villageId, resident.villageId)) {
      // 检查是否尝试编辑敏感字段
      const sensitiveFields = ['idCard', 'phone', 'bankAccount'];
      const hasSensitiveUpdate = sensitiveFields.some(field => updateData[field]);

      if (hasSensitiveUpdate) {
        // 编辑敏感信息需要更高权限
        return user.role === 'village_admin';
      }
      return true;
    }

    // 村民只能编辑自己的基本信息
    if (user.userId && user.userId === resident._id.toString()) {
      // 检查是否尝试编辑不允许编辑的字段
      const restrictedFields = ['idCard', 'status', 'household', 'villageId'];
      const hasRestrictedUpdate = restrictedFields.some(field => updateData[field]);

      if (hasRestrictedUpdate) {
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * 检查删除权限
   */
  async checkDeletePermission(user, resident) {
    // 只有管理员和系统管理员可以删除
    return ['admin', 'super_admin', 'system_admin'].includes(user.role);
  }

  /**
   * 检查村庄权限
   */
  async checkVillagePermission(user, villageId, action = 'view') {
    // 管理员可以管理所有村庄
    if (['admin', 'super_admin', 'system_admin'].includes(user.role)) {
      return true;
    }

    // 检查是否是本村管理人员
    if (user.villageId && this.isSameVillage(user.villageId, villageId)) {
      // 村委成员和官员有管理权限
      if (['village_admin', 'village_official'].includes(user.role)) {
        return true;
      }

      // 普通村民只有查看权限
      if (action === 'view' && user.role === 'resident') {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查财务权限
   */
  async checkFinancePermission(user, villageId, action = 'view') {
    // 管理员有所有财务权限
    if (['admin', 'super_admin', 'system_admin'].includes(user.role)) {
      return true;
    }

    // 村委管理员和会计有财务权限
    if (user.villageId && this.isSameVillage(user.villageId, villageId)) {
      if (['village_admin', 'accountant'].includes(user.role)) {
        return true;
      }

      // 村委官员有查看权限
      if (action === 'view' && user.role === 'village_official') {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查应急权限
   */
  async checkEmergencyPermission(user, villageId, action = 'view') {
    // 管理员有所有应急权限
    if (['admin', 'super_admin', 'system_admin'].includes(user.role)) {
      return true;
    }

    // 村委管理员和应急负责人有应急权限
    if (user.villageId && this.isSameVillage(user.villageId, villageId)) {
      if (['village_admin', 'emergency_manager'].includes(user.role)) {
        return true;
      }

      // 村委官员和村民可以上报和查看
      if (['village_official', 'resident'].includes(user.role)) {
        return ['report', 'view'].includes(action);
      }
    }

    return false;
  }

  /**
   * 检查血缘关系
   */
  async checkFamilyRelation(userIdCard1, userIdCard2, villageId) {
    // 这里应该实现更复杂的血缘关系判断逻辑
    // 暂时返回false，实际应该查询家庭关系数据库
    try {
      // 如果身份证号前6位（地区码）相同且后4位相同，可能是同户
      if (userIdCard1 && userIdCard2 && userIdCard1.length >= 10 && userIdCard2.length >= 10) {
        if (userIdCard1.substring(0, 6) === userIdCard2.substring(0, 6) &&
            userIdCard1.substring(userIdCard1.length - 4) === userIdCard2.substring(userIdCard2.length - 4)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error('检查血缘关系失败:', error);
      return false;
    }
  }

  /**
   * 判断是否是同一村庄
   */
  isSameVillage(villageId1, villageId2) {
    if (!villageId1 || !villageId2) return false;

    // 处理ObjectId和字符串的比较
    const id1 = villageId1.toString ? villageId1.toString() : villageId1;
    const id2 = villageId2.toString ? villageId2.toString() : villageId2;

    return id1 === id2;
  }

  /**
   * 数据脱敏处理
   */
  maskSensitiveData(data, permission = 'other') {
    if (!data) return data;

    const masked = { ...data };

    // 根据权限级别进行脱敏
    switch (permission) {
      case 'self':
        // 本人可以看到完整信息
        break;
      case 'family':
        // 家人可以看到部分信息
        if (masked.phone) {
          masked.phone = masked.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
        }
        if (masked.idCard) {
          masked.idCard = masked.idCard.replace(/(\d{6})\d*(\d{4})/, '$1********$2');
        }
        break;
      case 'village_admin':
      case 'admin':
        // 管理员可以看到完整信息
        break;
      default:
        // 其他人只能看到脱敏信息
        if (masked.phone) {
          masked.phone = masked.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
        }
        if (masked.idCard) {
          masked.idCard = masked.idCard.replace(/(\d{6})\d*(\d{4})/, '$1********$2');
        }
        if (masked.email) {
          masked.email = masked.email.replace(/(.{2}).*(@.*)/, '$1****$2');
        }
    }

    return masked;
  }
}

// 创建单例实例
const permissionMiddleware = new PermissionMiddleware();

// 导出中间件
module.exports = {
  checkResidentViewPermission: permissionMiddleware.checkResidentViewPermission,
  checkResidentEditPermission: permissionMiddleware.checkResidentEditPermission,
  checkResidentDeletePermission: permissionMiddleware.checkResidentDeletePermission,
  checkVillageManagementPermission: permissionMiddleware.checkVillageManagementPermission,
  checkFinancePermission: permissionMiddleware.checkFinancePermission,
  checkEmergencyPermission: permissionMiddleware.checkEmergencyPermission,
  maskSensitiveData: permissionMiddleware.maskSensitiveData.bind(permissionMiddleware),
  checkViewPermission: permissionMiddleware.checkViewPermission.bind(permissionMiddleware),
  checkEditPermission: permissionMiddleware.checkEditPermission.bind(permissionMiddleware),
  checkDeletePermission: permissionMiddleware.checkDeletePermission.bind(permissionMiddleware)
};