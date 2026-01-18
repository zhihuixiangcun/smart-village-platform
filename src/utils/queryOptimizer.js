/**
 * 数据库查询优化工具
 * 提供常用的查询优化方法和辅助函数
 */

const logger = require('../utils/logger');

/**
 * 常见populate路径的安全字段选择
 * 防止敏感信息泄露（如密码、token等）
 */
const SAFE_SELECT_FOR_POPULATE = {
  // 用户相关字段
  'userId': 'name phone email villageId -password -tokens -resetPasswordToken',
  'user': 'name phone email villageId -password -tokens -resetPasswordToken',
  'createdBy': 'name phone email -password -tokens',
  'updatedBy': 'name phone email -password -tokens',
  
  // 省市区县字段
  'province': 'name code level status',
  'city': 'name code level status',
  'county': 'name code level status',
  'township': 'name code level status',
  'village': 'name code level status',
  
  // 通用字段
  'subscription': 'name status type -apiKey -apiSecret'
};

/**
 * 查询优化器类
 */
class QueryOptimizer {
  /**
   * 执行优化的批量查询，避免N+1问题
   * @param {Model} model - Mongoose模型
   * @param {Array} ids - ID数组
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 查询结果
   */
  static async batchFind(model, ids, options = {}) {
    const {
      select = '',
      populate = [],
      lean = true,
      query = {}
    } = options;

    try {
      // 分批查询，避免一次性查询过多数据
      const batchSize = 500;
      const results = [];

      for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);

        let queryBuilder = model.find({
          _id: { $in: batchIds },
          ...query
        });

        if (select) {
          queryBuilder = queryBuilder.select(select);
        }

        if (populate.length > 0) {
          populate.forEach(p => {
            // 安全改进: 为populate添加字段选择，防止敏感信息泄露
            if (typeof p === 'string') {
              // 常见的安全字段选择配置
              const safeSelect = this.getSafeSelectForPopulate(p);
              queryBuilder = queryBuilder.populate({ path: p, select: safeSelect });
            } else if (typeof p === 'object') {
              // 如果是对象配置，确保有select
              queryBuilder = queryBuilder.populate(p);
            }
          });
        }

        if (lean) {
          queryBuilder = queryBuilder.lean();
        }

        const batchResults = await queryBuilder.exec();
        results.push(...batchResults);
      }

      // 按照原始ID顺序排序结果
      const resultMap = new Map(results.map(r => [r._id.toString(), r]));
      return ids.map(id => resultMap.get(id.toString())).filter(Boolean);

    } catch (error) {
      logger.error('批量查询失败:', { error: error.message, ids: ids.length });
      throw error;
    }
  }

  /**
   * 使用聚合管道进行复杂查询优化
   * @param {Model} model - Mongoose模型
   * @param {Array} pipeline - 聚合管道
   * @param {Object} options - 选项
   * @returns {Promise<Array>} 聚合结果
   */
  static async optimizedAggregate(model, pipeline, options = {}) {
    const {
      allowDiskUse = true, // 大数据集时允许使用磁盘
      cursor = {},
      hint = null
    } = options;

    try {
      let aggregate = model.aggregate(pipeline, {
        allowDiskUse
      });

      if (hint) {
        aggregate = aggregate.hint(hint);
      }

      if (cursor.batchSize) {
        aggregate = aggregate.cursor(cursor);
      }

      return await aggregate.exec();

    } catch (error) {
      logger.error('聚合查询失败:', { error: error.message, pipeline });
      throw error;
    }
  }

  /**
   * 优化的分页查询
   * @param {Model} model - Mongoose模型
   * @param {Object} filter - 查询条件
   * @param {Object} options - 分页选项
   * @returns {Promise<Object>} 分页结果
   */
  static async paginatedFind(model, filter = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = { createdAt: -1 },
      select = '',
      populate = [],
      lean = true
    } = options;

    const skip = (Math.max(1, page) - 1) * limit;

    try {
      // 并行执行查询和计数
      const [data, total] = await Promise.all([
        model.find(filter)
          .select(select)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate(populate)
          .lean(lean),
        model.countDocuments(filter)
      ]);

      return {
        data,
        pagination: {
          page: Math.max(1, page),
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      logger.error('分页查询失败:', { error: error.message, filter, options });
      throw error;
    }
  }

  /**
   * 优化的深度查询 - 使用$lookup替代populate
   * @param {Model} model - Mongoose模型
   * @param {Array} lookups - 关联查询配置
   * @param {Object} filter - 查询条件
   * @returns {Promise<Array>} 查询结果
   */
  static async deepLookup(model, lookups, filter = {}) {
    const pipeline = [
      { $match: filter },
      ...lookups.map(lookup => ({
        $lookup: lookup
      }))
    ];

    return this.optimizedAggregate(model, pipeline);
  }

  /**
   * 批量更新优化
   * @param {Model} model - Mongoose模型
   * @param {Object} filter - 更新条件
   * @param {Object} update - 更新内容
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 更新结果
   */
  static async batchUpdate(model, filter, update, options = {}) {
    const {
      lean = true,
      multi = true,
      upsert = false
    } = options;

    try {
      const result = await model.updateMany(filter, update, {
        lean,
        upsert
      });

      logger.info('批量更新完成:', {
        matched: result.matchedCount,
        modified: result.modifiedCount
      });

      return result;

    } catch (error) {
      logger.error('批量更新失败:', { error: error.message, filter });
      throw error;
    }
  }

  /**
   * 创建索引
   * @param {Model} model - Mongoose模型
   * @param {Object} indexes - 索引配置
   * @returns {Promise<void>}
   */
  static async createIndexes(model, indexes) {
    try {
      for (const [field, spec] of Object.entries(indexes)) {
        await model.collection.createIndex(
          typeof spec === 'object' ? field : { [field]: spec },
          typeof spec === 'object' ? spec : {}
        );
      }

      logger.info('索引创建成功:', { model: model.modelName, indexes });

    } catch (error) {
      logger.error('索引创建失败:', { error: error.message, indexes });
      throw error;
    }
  }

  /**
   * 查询性能分析
   * @param {Model} model - Mongoose模型
   * @param {Object} filter - 查询条件
   * @param {Object} sort - 排序条件
   * @returns {Promise<Object>} 性能分析结果
   */
  static async analyzeQuery(model, filter = {}, sort = {}) {
    try {
      const startTime = Date.now();

      const explain = await model.find(filter).sort(sort).explain('executionStats');

      const duration = Date.now() - startTime;

      return {
        duration,
        executionTimeMillis: explain.executionTimeMillis,
        totalDocsExamined: explain.totalDocsExamined,
        totalKeysExamined: explain.totalKeysExamined,
        executionStages: explain.executionStages,
        indexUsed: explain.indexNameOnly !== undefined ? explain.indexNameOnly : 'COLLSCAN',
        recommendation: this._generateOptimizationRecommendation(explain)
      };

    } catch (error) {
      logger.error('查询分析失败:', { error: error.message });
      throw error;
    }
  }
  
  /**
   * 获取populate路径的安全字段选择
   * 防止敏感信息泄露
   * @param {String} populatePath - populate路径
   * @returns {String} 安全的字段选择
   */
  static getSafeSelectForPopulate(populatePath) {
    // 如果是已知的路径，返回预定义的安全字段
    if (SAFE_SELECT_FOR_POPULATE[populatePath]) {
      return SAFE_SELECT_FOR_POPULATE[populatePath];
    }
    
    // 如果是未知路径，默认排除敏感字段
    return '-password -tokens -resetPasswordToken -apiKey -apiSecret -secret';
  }
  
  /**
   * 生成优化建议
   * @private
   */
  static _generateOptimizationRecommendation(explain) {
    const recommendations = [];

    // 检查是否使用了索引
    if (explain.indexNameOnly === undefined || explain.indexNameOnly === 'COLLSCAN') {
      recommendations.push('建议添加索引以避免全表扫描');
    }

    // 检查扫描的文档数
    if (explain.totalDocsExamined > 10000) {
      recommendations.push('扫描文档数过多，建议优化查询条件');
    }

    // 检查执行时间
    if (explain.executionTimeMillis > 1000) {
      recommendations.push('查询执行时间过长，建议使用聚合管道或添加复合索引');
    }

    return recommendations;
  }
}

/**
 * 查询构建器类 - 链式查询构建
 */
class QueryBuilder {
  constructor(model) {
    this.model = model;
    this.filter = {};
    this.select = '';
    this.populate = [];
    this.sort = {};
    this.limit = 0;
    this.skip = 0;
    this.lean = true;
  }

  /**
   * 添加查询条件
   */
  where(filter) {
    this.filter = { ...this.filter, ...filter };
    return this;
  }

  /**
   * 选择字段
   */
  fields(select) {
    this.select = select;
    return this;
  }

  /**
   * 关联查询
   */
  include(populate) {
    if (Array.isArray(populate)) {
      this.populate.push(...populate);
    } else {
      this.populate.push(populate);
    }
    return this;
  }

  /**
   * 排序
   */
  orderBy(sort) {
    this.sort = sort;
    return this;
  }

  /**
   * 限制
   */
  take(limit) {
    this.limit = limit;
    return this;
  }

  /**
   * 跳过
   */
  offset(skip) {
    this.skip = skip;
    return this;
  }

  /**
   * 执行查询
   */
  async exec() {
    let query = this.model.find(this.filter);

    if (this.select) {
      query = query.select(this.select);
    }

    if (Object.keys(this.sort).length > 0) {
      query = query.sort(this.sort);
    }

    if (this.skip > 0) {
      query = query.skip(this.skip);
    }

    if (this.limit > 0) {
      query = query.limit(this.limit);
    }

    for (const pop of this.populate) {
      query = query.populate(pop);
    }

    if (this.lean) {
      query = query.lean();
    }

    return await query.exec();
  }

  /**
   * 分页查询
   */
  async paginate(page = 1, limit = 20) {
    const skip = (Math.max(1, page) - 1) * limit;

    const [data, total] = await Promise.all([
      this.take(limit).offset(skip).exec(),
      this.model.countDocuments(this.filter)
    ]);

    return {
      data,
      pagination: {
        page: Math.max(1, page),
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = {
  QueryOptimizer,
  QueryBuilder
};
