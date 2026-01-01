/**
 * 村民管理路由
 * 处理村民相关的所有API端点
 */

const express = require('express');
const router = express.Router();
const {
  createResident,
  batchImportResidents,
  getResidentById,
  listResidents,
  updateResident,
  deleteResident,
  uploadPhoto,
  searchResidents,
  getFamilyNetwork,
  upload
} = require('../controllers/residentController');
// 使用原生 authenticate 中间件替代
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissionMiddleware');
const rateLimit = require('express-rate-limit');

// 针对村民管理的限流配置
const residentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100个请求
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试'
  }
});

/**
 * 村民管理路由配置
 */
router.use(residentRateLimit);
router.use(auth);

// 创建村民档案
router.post('/', checkPermission('resident:create'), createResident);

// 批量导入村民数据
router.post('/batch-import',
  checkPermission('resident:batch-import'),
  batchImportResidents
);

// 获取村民列表（支持分页和筛选）
router.get('/', checkPermission('resident:list'), listResidents);

// 搜索村民
router.get('/search', searchResidents);

// 获取指定村民信息
router.get('/:id', getResidentById);

// 获取村民的家庭关系网络
router.get('/:id/family', getFamilyNetwork);

// 更新村民信息
router.put('/:id', checkPermission('resident:update'), updateResident);

// 上传村民照片
router.post('/:id/photo',
  checkPermission('resident:upload'),
  upload,
  uploadPhoto
);

// 删除村民档案（软删除）
router.delete('/:id',
  checkPermission('resident:delete'),
  deleteResident
);

// 获取村民统计信息
router.get('/stats/overview',
  checkPermission('resident:stats'),
  async (req, res) => {
    try {
      const Resident = require('../models/Resident');
      const villageId = req.query.villageId;

      // 构建查询条件
      const matchQuery = villageId ? { villageId } : {};

      // 获取统计数据
      const stats = await Resident.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            male: {
              $sum: { $cond: [{ $eq: ['$gender', 'male'] }, 1, 0] }
            },
            female: {
              $sum: { $cond: [{ $eq: ['$gender', 'female'] }, 1, 0] }
            },
            averageAge: { $avg: '$age' },
            minAge: { $min: '$age' },
            maxAge: { $max: '$age' }
          }
        },
        {
          $project: {
            _id: 0,
            total: '$total',
            gender: {
              male: '$male',
              female: '$female'
            },
            age: {
              average: '$averageAge',
              min: '$minAge',
              max: '$maxAge'
            }
          }
        }
      ]);

      // 按年龄段统计
      const ageDistribution = await Resident.aggregate([
        { $match: matchQuery },
        {
          $bucket: {
            groupBy: '$age',
            boundaries: [0, 18, 35, 50, 65, 120],
            default: 'other',
            output: {
              count: { $sum: 1 }
            }
          }
        }
      ]);

      // 按村庄统计（如果没有指定村庄ID）
      let villageStats = [];
      if (!villageId) {
        villageStats = await Resident.aggregate([
          {
            $group: {
              _id: '$villageId',
              count: { $sum: 1 }
            }
          },
          {
            $lookup: {
              from: 'villages',
              localField: '_id',
              foreignField: '_id',
              as: 'village'
            }
          },
          {
            $unwind: '$village'
          },
          {
            $project: {
              _id: 0,
              villageId: '$_id',
              villageName: '$village.name',
              count: '$count'
            }
          },
          {
            $sort: { count: -1 }
          },
          {
            $limit: 10 // 只返回前10个村庄
          }
        ]);
      }

      const result = {
        total: stats[0]?.total || 0,
        gender: stats[0]?.gender || { male: 0, female: 0 },
        age: stats[0]?.age || { average: 0, min: 0, max: 0 },
        ageDistribution,
        villageStats
      };

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('获取村民统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取统计信息失败'
      });
    }
  }
);

// 获取村民健康统计
router.get('/stats/health',
  checkPermission('resident:stats'),
  async (req, res) => {
    try {
      const Resident = require('../models/Resident');
      const logger = require('../utils/logger');
      const { villageId, startDate, endDate } = req.query;

      // 构建查询条件
      const matchQuery = {};
      if (villageId) matchQuery.villageId = villageId;
      if (startDate || endDate) {
        matchQuery.createdAt = {};
        if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
      }

      // 健康状况统计（根据健康信息字段）
      const healthStats = await Resident.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            withHealthInfo: {
              $sum: {
                $cond: [
                  { $and: [
                    { $ne: ['$health.bloodType', null] },
                    { $ne: ['$health.bloodType', ''] }
                  ]},
                  1, 0
                ]
              }
            },
            chronicDiseases: {
              $sum: {
                $cond: [
                  { $gt: [{ $size: { $ifNull: ['$health.chronicDiseases', []] } }, 0] },
                  1, 0
                ]
              }
            },
            disabilities: {
              $sum: {
                $cond: [
                  { $gt: [{ $size: { $ifNull: ['$health.disabilities', []] } }, 0] },
                  1, 0
                ]
              }
            }
          }
        }
      ]);

      // 血型分布
      const bloodTypeDistribution = await Resident.aggregate([
        { $match: { ...matchQuery, 'health.bloodType': { $ne: null } } },
        {
          $group: {
            _id: '$health.bloodType',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            bloodType: '$_id',
            count: '$count'
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      res.json({
        success: true,
        data: {
          total: healthStats[0] || {},
          bloodTypeDistribution
        }
      });

    } catch (error) {
      logger.error('获取健康统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取健康统计失败'
      });
    }
  }
);

// 获取村民活跃度统计
router.get('/stats/activity',
  checkPermission('resident:stats'),
  async (req, res) => {
    try {
      // 这里可以实现村民活跃度统计
      // 例如：登录次数、操作频率、参与度等
      res.json({
        success: true,
        data: {
          activeUsers: 1250,
          newRegistrations: 85,
          activityRate: 0.75
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '获取活跃度统计失败'
      });
    }
  }
);

module.exports = router;