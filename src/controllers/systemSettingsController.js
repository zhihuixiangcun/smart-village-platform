/**
 * System Settings Controller
 * 系统设置控制器
 */

const logger = require('../utils/logger');
const SystemSetting = require('../models/SystemSetting');
const AuditLog = require('../models/AuditLog');

class SystemSettingsController {
  /**
   * 获取所有系统设置
   */
  static async getAllSettings(req, res) {
    try {
      const { category, villageId } = req.query;

      let query = {};
      if (category) {
        query.category = category;
      }
      if (villageId) {
        query.villageId = villageId;
      }

      const settings = await SystemSetting.find(query)
        .sort({ category: 1, key: 1 })
        .select('-__v -history');

      res.json({
        success: true,
        data: settings,
        message: '获取系统设置成功'
      });
    } catch (error) {
      logger.error('获取系统设置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取系统设置失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * 获取单个设置
   */
  static async getSettingByKey(req, res) {
    try {
      const { key } = req.params;
      const { villageId } = req.query;

      const query = { key };
      if (villageId) {
        query.villageId = villageId;
      }

      const setting = await SystemSetting.findOne(query).select('-__v -history');

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: '设置不存在'
        });
      }

      res.json({
        success: true,
        data: setting,
        message: '获取设置成功'
      });
    } catch (error) {
      logger.error('获取设置失败:', error);
      res.status(500).json({
        success: false,
        message: '获取设置失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * 创建新设置
   */
  static async createSetting(req, res) {
    try {
      const { key, category, title, value, valueType, description, options, villageId, validation } = req.body;

      // 验证必填字段
      if (!key || !category || !title || !valueType || value === undefined) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段',
          error: 'key, category, title, valueType, value are required'
        });
      }

      // 检查是否已存在
      const existingSetting = await SystemSetting.findOne({ key });
      if (existingSetting) {
        return res.status(409).json({
          success: false,
          message: '设置键已存在',
          error: 'Setting key already exists'
        });
      }

      const setting = new SystemSetting({
        key,
        category,
        title,
        value,
        valueType,
        description,
        options,
        villageId,
        validation,
        defaultValue: value
      });

      const savedSetting = await setting.save();

      // 记录审计日志
      await AuditLog.create({
        operatorId: req.user._id,
        operatorName: req.user.username,
        operatorRole: req.user.role,
        action: 'create_setting',
        resourceType: 'SystemSetting',
        resourceId: savedSetting._id,
        details: {
          key,
          category,
          title
        },
        changes: {
          after: { value }
        },
        isSensitive: req.body.isSensitive || false
      });

      res.status(201).json({
        success: true,
        data: savedSetting,
        message: '创建设置成功'
      });
    } catch (error) {
      logger.error('创建设置失败:', error);
      res.status(500).json({
        success: false,
        message: '创建设置失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * 更新设置
   */
  static async updateSetting(req, res) {
    try {
      const { key } = req.params;
      const { value, options, validation } = req.body;
      const { villageId } = req.query;

      const query = { key };
      if (villageId) {
        query.villageId = villageId;
      }

      const setting = await SystemSetting.findOne(query);

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: '设置不存在'
        });
      }

      if (!setting.editable) {
        return res.status(403).json({
          success: false,
          message: '此设置不允许修改'
        });
      }

      const previousValue = setting.value;

      // 更新设置
      setting.value = value !== undefined ? value : setting.value;
      setting.options = options !== undefined ? options : setting.options;
      setting.validation = validation !== undefined ? validation : setting.validation;
      setting.updatedAt = new Date();

      // 保存历史记录
      setting.history.push({
        value: previousValue,
        updatedAt: new Date(),
        updatedBy: req.user._id
      });

      await setting.save();

      // 记录审计日志
      await AuditLog.create({
        operatorId: req.user._id,
        operatorName: req.user.username,
        operatorRole: req.user.role,
        action: 'update_setting',
        resourceType: 'SystemSetting',
        resourceId: setting._id,
        details: {
          key,
          category: setting.category,
          title: setting.title
        },
        changes: {
          before: { value: previousValue },
          after: { value: setting.value }
        },
        isSensitive: setting.isSensitive
      });

      res.json({
        success: true,
        data: setting,
        message: '更新设置成功',
        requiresRestart: setting.requiresRestart
      });
    } catch (error) {
      logger.error('更新设置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新设置失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * 批量更新设置
   */
  static async batchUpdateSettings(req, res) {
    try {
      const { updates } = req.body;
      const { villageId } = req.query;

      if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的更新数组'
        });
      }

      if (updates.length > 50) {
        return res.status(400).json({
          success: false,
          message: '批量更新最多支持50条记录'
        });
      }

      const results = [];
      const errors = [];

      for (const update of updates) {
        try {
          const { key, value } = update;

          const query = { key, editable: true };
          if (villageId) {
            query.villageId = villageId;
          }

          const setting = await SystemSetting.findOne(query);

          if (!setting) {
            errors.push({ key, error: '设置不存在' });
            continue;
          }

          const previousValue = setting.value;
          setting.value = value;
          setting.updatedAt = new Date();
          setting.history.push({
            value: previousValue,
            updatedAt: new Date(),
            updatedBy: req.user._id
          });

          await setting.save();
          results.push({ key, success: true });

        } catch (error) {
          errors.push({ key: update.key, error: error.message });
        }
      }

      // 记录批量更新审计日志
      await AuditLog.create({
        operatorId: req.user._id,
        operatorName: req.user.username,
        operatorRole: req.user.role,
        action: 'batch_update_settings',
        resourceType: 'SystemSetting',
        details: {
          updatedCount: results.length,
          failedCount: errors.length
        },
        changes: {
          updates
        },
        isSensitive: true
      });

      res.json({
        success: true,
        data: {
          updated: results.length,
          failed: errors.length,
          errors
        },
        message: `成功更新${results.length}条设置${errors.length > 0 ? `，${errors.length}条失败` : ''}`
      });
    } catch (error) {
      logger.error('批量更新设置失败:', error);
      res.status(500).json({
        success: false,
        message: '批量更新设置失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * 重置设置为默认值
   */
  static async resetSettings(req, res) {
    try {
      const { keys, category, villageId } = req.body;

      let query = { editable: true };
      if (category) {
        query.category = category;
      }
      if (villageId) {
        query.villageId = villageId;
      }

      if (keys && Array.isArray(keys)) {
        query.key = { $in: keys };
      }

      const settings = await SystemSetting.find(query);
      let resetCount = 0;

      for (const setting of settings) {
        if (setting.defaultValue !== undefined) {
          const previousValue = setting.value;
          setting.value = setting.defaultValue;
          setting.updatedAt = new Date();
          setting.history.push({
            value: previousValue,
            updatedAt: new Date(),
            updatedBy: req.user._id,
            isReset: true
          });

          await setting.save();
          resetCount++;
        }
      }

      // 记录重置审计日志
      await AuditLog.create({
        operatorId: req.user._id,
        operatorName: req.user.username,
        operatorRole: req.user.role,
        action: 'reset_settings',
        resourceType: 'SystemSetting',
        details: {
          resetCount,
          category,
          keys
        },
        changes: {
          action: 'reset_to_default'
        },
        isSensitive: true
      });

      res.json({
        success: true,
        data: { resetCount },
        message: `成功重置${resetCount}条设置为默认值`
      });
    } catch (error) {
      logger.error('重置设置失败:', error);
      res.status(500).json({
        success: false,
        message: '重置设置失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * 获取设置历史
   */
  static async getSettingHistory(req, res) {
    try {
      const { key } = req.params;
      const { limit = 10, villageId } = req.query;

      const query = { key };
      if (villageId) {
        query.villageId = villageId;
      }

      const setting = await SystemSetting.findOne(query);

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: '设置不存在'
        });
      }

      const history = await SystemSetting.aggregate([
        { $match: { key, ...villageId ? { villageId } : {} } },
        { $unwind: '$history' },
        { $sort: { 'history.updatedAt': -1 } },
        { $limit: parseInt(limit) },
        {
          $project: {
            value: '$history.value',
            updatedAt: '$history.updatedAt',
            updatedBy: '$history.updatedBy',
            isReset: '$history.isReset'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'updatedBy',
            foreignField: '_id',
            as: 'updater'
          }
        },
        {
          $project: {
            value: 1,
            updatedAt: 1,
            updatedBy: {
              username: { $arrayElemAt: ['$updater.username', 0] },
              name: { $arrayElemAt: ['$updater.profile.name', 0] }
            },
            isReset: 1
          }
        }
      ]);

      res.json({
        success: true,
        data: history,
        message: '获取设置历史成功'
      });
    } catch (error) {
      logger.error('获取设置历史失败:', error);
      res.status(500).json({
        success: false,
        message: '获取设置历史失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * 删除设置
   */
  static async deleteSetting(req, res) {
    try {
      const { key } = req.params;
      const { villageId } = req.query;

      const query = { key };
      if (villageId) {
        query.villageId = villageId;
      }

      const setting = await SystemSetting.findOneAndDelete(query);

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: '设置不存在'
        });
      }

      if (!setting.editable) {
        return res.status(403).json({
          success: false,
          message: '此设置不允许删除'
        });
      }

      // 记录删除审计日志
      await AuditLog.create({
        operatorId: req.user._id,
        operatorName: req.user.username,
        operatorRole: req.user.role,
        action: 'delete_setting',
        resourceType: 'SystemSetting',
        resourceId: setting._id,
        details: {
          key,
          category: setting.category,
          title: setting.title
        },
        changes: {
          before: { value: setting.value },
          after: null
        },
        isSensitive: setting.isSensitive
      });

      res.json({
        success: true,
        message: '删除设置成功'
      });
    } catch (error) {
      logger.error('删除设置失败:', error);
      res.status(500).json({
        success: false,
        message: '删除设置失败',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = SystemSettingsController;
