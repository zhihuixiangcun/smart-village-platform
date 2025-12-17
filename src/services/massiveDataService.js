/**
 * 海量数据处理服务
 * 支持百万级数据记录的高性能处理
 */

const Resident = require('../models/Resident');
const Finance = require('../models/Finance');
const VillageCollaboration = require('../models/VillageCollaboration');
const EmergencyResponse = require('../models/EmergencyResponse');

class MassiveDataService {
  constructor() {
    this.defaultPageSize = 50; // 默认页面大小
    this.maxPageSize = 500;    // 最大页面大小
    this.cache = new Map();    // 内存缓存
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存超时
  }

  /**
   * 高性能分页查询 - 基于游标的分页
   * @param {Object} query 查询条件
   * @param {Object} options 分页选项
   */
  async cursorBasedPagination(Model, query, options = {}) {
    const {
      pageSize = this.defaultPageSize,
      cursor = null,
      sortField = '_id',
      sortDirection = 1
    } = options;

    // 构建查询
    const finalQuery = { ...query };

    // 如果有游标，添加游标条件
    if (cursor) {
      finalQuery[sortField] = {
        [sortDirection === 1 ? '$gt' : '$lt']: cursor
      };
    }

    // 执行查询
    const results = await Model.find(finalQuery)
      .sort({ [sortField]: sortDirection })
      .limit(pageSize + 1) // 多查询一条用于判断是否有下一页
      .lean(); // 返回普通对象，提高性能

    // 判断是否有下一页
    const hasNextPage = results.length > pageSize;
    if (hasNextPage) {
      results.pop(); // 移除多查询的一条
    }

    // 获取下一页游标
    const nextCursor = results.length > 0
      ? results[results.length - 1][sortField]
      : null;

    return {
      data: results,
      nextCursor,
      hasNextPage,
      pageSize: results.length
    };
  }

  /**
   * 批量数据处理 - 分批处理大量数据
   * @param {Object} query 查询条件
   * @param {Function} processor 处理函数
   * @param {Object} options 选项
   */
  async batchProcess(Model, query, processor, options = {}) {
    const {
      batchSize = 1000,
      maxConcurrency = 5,
      progressCallback
    } = options;

    let processed = 0;
    let cursor = null;
    let hasMore = true;

    const totalCount = await Model.countDocuments(query);

    while (hasMore) {
      // 获取一批数据
      const batch = await this.cursorBasedPagination(Model, query, {
        pageSize: batchSize,
        cursor
      });

      if (batch.data.length === 0) {
        hasMore = false;
        break;
      }

      // 并发处理批次数据
      const promises = batch.data.map(async (doc, index) => {
        try {
          return await processor(doc, index);
        } catch (error) {
          console.error(`处理文档 ${doc._id} 时出错:`, error);
          return { error: error.message, docId: doc._id };
        }
      });

      // 等待当前批次处理完成
      const results = await Promise.all(promises);
      processed += batch.data.length;

      // 更新游标
      cursor = batch.nextCursor;
      hasMore = batch.hasNextPage;

      // 进度回调
      if (progressCallback) {
        progressCallback({
          processed,
          total: totalCount,
          progress: (processed / totalCount * 100).toFixed(2),
          currentBatch: Math.ceil(processed / batchSize),
          totalBatches: Math.ceil(totalCount / batchSize)
        });
      }

      // 防止内存泄漏，每处理一定数量后强制垃圾回收
      if (processed % 10000 === 0 && global.gc) {
        global.gc();
      }
    }

    return { processed, totalCount };
  }

  /**
   * 聚合管道优化 - 大数据量统计
   * @param {String} villageId 村庄ID
   */
  async getVillageMassiveStats(villageId) {
    const cacheKey = `village_stats_${villageId}`;

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // 使用聚合管道进行高效统计
    const pipeline = [
      // 第一阶段：匹配和基础过滤
      {
        $match: {
          villageId: new mongoose.Types.ObjectId(villageId),
          status: 'active'
        }
      },

      // 第二阶段：添加计算字段
      {
        $addFields: {
          ageGroup: {
            $switch: {
              branches: [
                { case: { $lt: ['$age', 18] }, then: 'minor' },
                { case: { $lt: ['$age', 35] }, then: 'youth' },
                { case: { $lt: ['$age', 60] }, then: 'middle' },
                { case: { $gte: ['$age', 60] }, then: 'elderly' }
              ],
              default: 'unknown'
            }
          },
          incomeLevel: {
            $switch: {
              branches: [
                { case: { $lt: ['$annualIncome', 20000] }, then: 'low' },
                { case: { $lt: ['$annualIncome', 50000] }, then: 'medium' },
                { case: { $gte: ['$annualIncome', 50000] }, then: 'high' }
              ],
              default: 'unknown'
            }
          }
        }
      },

      // 第三阶段：多维度聚合
      {
        $facet: {
          // 基础统计
          basicStats: [
            {
              $group: {
                _id: null,
                totalResidents: { $sum: 1 },
                avgAge: { $avg: '$age' },
                avgIncome: { $avg: '$annualIncome' },
                totalIncome: { $sum: '$annualIncome' }
              }
            }
          ],

          // 性别分布
          genderStats: [
            {
              $group: {
                _id: '$gender',
                count: { $sum: 1 },
                percentage: { $multiply: [{ $divide: [1, '$$totalResidents'] }, 100] }
              }
            }
          ],

          // 年龄分布
          ageStats: [
            {
              $group: {
                _id: '$ageGroup',
                count: { $sum: 1 },
                avgIncome: { $avg: '$annualIncome' }
              }
            }
          ],

          // 教育水平分布
          educationStats: [
            {
              $group: {
                _id: '$education.degree',
                count: { $sum: 1 },
                percentage: { $multiply: [{ $divide: [1, '$$totalResidents'] }, 100] }
              }
            }
          ],

          // 职业分布
          occupationStats: [
            {
              $group: {
                _id: '$occupation',
                count: { $sum: 1 },
                avgIncome: { $avg: '$annualIncome' }
              }
            }
          ],

          // 特殊群体统计
          specialGroups: [
            {
              $group: {
                _id: null,
                elderly: { $sum: { $cond: [{ $gte: ['$age', 60] }, 1, 0] } },
                minors: { $sum: { $cond: [{ $lt: ['$age', 18] }, 1, 0] } },
                partyMembers: { $sum: { $cond: ['$villageParticipation.partyMember', 1, 0] } },
                migrantWorkers: { $sum: { $cond: ['$migrantWork.isMigrantWorker', 1, 0] } },
                povertyHouseholds: { $sum: { $cond: ['$poverty.isPovertyHousehold', 1, 0] } },
                disabled: { $size: '$health.disabilities' }
              }
            }
          ],

          // 时间分布（按月份统计新增村民）
          monthlyGrowth: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            {
              $sort: { '_id.year': 1, '_id.month': 1 }
            },
            {
              $limit: 12 // 最近12个月
            }
          ]
        }
      },

      // 第四阶段：格式化结果
      {
        $addFields: {
          basicStats: { $arrayElemAt: ['$basicStats', 0] },
          specialGroups: { $arrayElemAt: ['$specialGroups', 0] }
        }
      }
    ];

    const result = await Resident.aggregate(pipeline);

    // 缓存结果
    this.cache.set(cacheKey, {
      data: result[0],
      timestamp: Date.now()
    });

    return result[0];
  }

  /**
   * 财务数据聚合分析
   * @param {String} villageId 村庄ID
   * @param {Object} timeRange 时间范围
   */
  async getFinanceMassiveAnalytics(villageId, timeRange) {
    const { startDate, endDate } = timeRange;

    const pipeline = [
      {
        $match: {
          villageId: new mongoose.Types.ObjectId(villageId),
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $addFields: {
          month: { $dateToString: { format: '%Y-%m', date: '$date' } },
          year: { $year: '$date' }
        }
      },
      {
        $facet: {
          // 月度收支趋势
          monthlyTrends: [
            {
              $group: {
                _id: '$month',
                totalIncome: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
                  }
                },
                totalExpense: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
                  }
                },
                netIncome: {
                  $sum: {
                    $cond: [
                      { $eq: ['$type', 'income'] },
                      '$amount',
                      { $multiply: ['$amount', -1] }
                    ]
                  }
                },
                transactionCount: { $sum: 1 }
              }
            },
            {
              $sort: { '_id': 1 }
            }
          ],

          // 支出类别分析
          expenseCategories: [
            {
              $match: { type: 'expense' }
            },
            {
              $group: {
                _id: '$category',
                totalAmount: { $sum: '$amount' },
                transactionCount: { $sum: 1 },
                avgAmount: { $avg: '$amount' }
              }
            },
            {
              $sort: { totalAmount: -1 }
            }
          ],

          // 收入来源分析
          incomeSources: [
            {
              $match: { type: 'income' }
            },
            {
              $group: {
                _id: '$category',
                totalAmount: { $sum: '$amount' },
                transactionCount: { $sum: 1 },
                avgAmount: { $avg: '$amount' }
              }
            },
            {
              $sort: { totalAmount: -1 }
            }
          ],

          // 大额交易分析
          largeTransactions: [
            {
              $group: {
                _id: null,
                avgTransaction: { $avg: '$amount' },
                maxTransaction: { $max: '$amount' },
                minTransaction: { $min: '$amount' },
                totalAmount: { $sum: '$amount' }
              }
            }
          ]
        }
      }
    ];

    return await Finance.aggregate(pipeline);
  }

  /**
   * 实时数据流处理 - 用于监控大屏
   * @param {String} villageId 村庄ID
   */
  async getRealTimeDataStream(villageId) {
    const pipeline = [
      {
        $match: {
          villageId: new mongoose.Types.ObjectId(villageId),
          updatedAt: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 最近24小时
          }
        }
      },
      {
        $lookup: {
          from: 'emergencyresponses',
          localField: '_id',
          foreignField: 'residentId',
          as: 'emergencyEvents'
        }
      },
      {
        $lookup: {
          from: 'villagecollaborations',
          localField: '_id',
          foreignField: 'participantId',
          as: 'activities'
        }
      },
      {
        $project: {
          name: 1,
          status: 1,
          location: 1,
          updatedAt: 1,
          emergencyCount: { $size: '$emergencyEvents' },
          activityCount: { $size: '$activities' },
          hasRecentActivity: {
            $gt: ['$updatedAt', new Date(Date.now() - 60 * 60 * 1000)]
          }
        }
      },
      {
        $sort: { updatedAt: -1 }
      },
      {
        $limit: 100
      }
    ];

    return await Resident.aggregate(pipeline);
  }

  /**
   * 地理位置数据聚合
   * @param {String} villageId 村庄ID
   * @param {Object} bounds 地理边界
   */
  async getGeospatialAnalytics(villageId, bounds = null) {
    const matchStage = {
      villageId: new mongoose.Types.ObjectId(villageId),
      status: 'active',
      location: { $exists: true, $ne: null }
    };

    // 如果有边界条件，添加地理范围查询
    if (bounds) {
      matchStage.location = {
        $geoWithin: {
          $box: [
            [bounds.southwest.lng, bounds.southwest.lat],
            [bounds.northeast.lng, bounds.northeast.lat]
          ]
        }
      };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $facet: {
          // 人口密度热力图数据
          densityData: [
            {
              $group: {
                _id: {
                  lng: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 4] },
                  lat: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 4] }
                },
                count: { $sum: 1 },
                demographics: {
                  $push: {
                    age: '$age',
                    gender: '$gender',
                    specialIdentities: '$specialIdentities'
                  }
                }
              }
            }
          ],

          // 特殊群体地理分布
          specialGroupsDistribution: [
            {
              $unwind: '$specialIdentities'
            },
            {
              $group: {
                _id: '$specialIdentities.type',
                locations: {
                  $push: {
                    coordinates: '$location.coordinates',
                    name: '$name',
                    id: '$_id'
                  }
                },
                count: { $sum: 1 }
              }
            }
          ],

          // 总体统计
          summary: [
            {
              $group: {
                _id: null,
                totalWithLocation: { $sum: 1 },
                avgAge: { $avg: '$age' },
                centerPoint: {
                  $avg: {
                    $map: {
                      input: '$location.coordinates',
                      as: 'coord',
                      in: '$$coord'
                    }
                  }
                }
              }
            }
          ]
        }
      }
    ];

    return await Resident.aggregate(pipeline);
  }

  /**
   * 数据导出优化 - 支持大数据量导出
   * @param {Object} query 查询条件
   * @param {Object} options 导出选项
   */
  async exportMassiveData(Model, query, options = {}) {
    const {
      fields = null,
      format = 'json',
      chunkSize = 10000,
      progressCallback
    } = options;

    // 获取总记录数
    const totalCount = await Model.countDocuments(query);

    // 构建投影（只导出指定字段）
    const projection = fields ?
      fields.reduce((obj, field) => ({ ...obj, [field]: 1 }), {}) :
      {};

    return new Promise((resolve, reject) => {
      const results = [];
      let exported = 0;
      let cursor = null;
      let hasMore = true;

      const exportChunk = async () => {
        try {
          const chunk = await this.cursorBasedPagination(Model, query, {
            pageSize: chunkSize,
            cursor,
            sortField: '_id'
          });

          if (chunk.data.length === 0) {
            resolve({
              data: results,
              totalExported: exported,
              totalCount
            });
            return;
          }

          // 处理当前块
          const processedChunk = chunk.data.map(doc => {
            if (projection && Object.keys(projection).length > 0) {
              return Object.keys(projection).reduce((obj, field) => {
                obj[field] = doc[field];
                return obj;
              }, {});
            }
            return doc;
          });

          results.push(...processedChunk);
          exported += chunk.data.length;
          cursor = chunk.nextCursor;
          hasMore = chunk.hasNextPage;

          // 进度回调
          if (progressCallback) {
            progressCallback({
              exported,
              total: totalCount,
              progress: (exported / totalCount * 100).toFixed(2),
              currentChunk: results.length
            });
          }

          // 继续下一块
          if (hasMore) {
            // 防止堆栈溢出，使用setImmediate
            setImmediate(exportChunk);
          } else {
            resolve({
              data: results,
              totalExported: exported,
              totalCount
            });
          }
        } catch (error) {
          reject(error);
        }
      };

      // 开始导出
      exportChunk();
    });
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: process.memoryUsage()
    };
  }
}

module.exports = new MassiveDataService();