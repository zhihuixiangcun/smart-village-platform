/**
 * 拼车服务
 *
 * 提供拼车发布、搜索、加入、取消、评价等功能
 */

const Carpooling = require('../models/Carpooling');
const User = require('../models/User');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');

class CarpoolingService {
  /**
   * 发布拼车信息
   * @param {String} userId - 用户ID
   * @param {Object} carpoolData - 拼车数据
   * @returns {Promise<Object>} 发布结果
   */
  async publishCarpool(userId, carpoolData) {
    try {
      if (!userId) {
        throw new Error('用户未登录');
      }

      // 验证用户信息
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 验证必填字段
      this._validateCarpoolData(carpoolData);

      // 创建拼车记录
      const carpool = await Carpooling.create({
        userId,
        ...carpoolData,
        status: 'pending',
        viewCount: 0
      });

      logger.info('发布拼车成功', {
        carpoolId: carpool._id,
        userId,
        type: carpool.type,
        origin: carpool.origin.address,
        destination: carpool.destination.address
      });

      return {
        success: true,
        data: carpool,
        message: '发布成功'
      };

    } catch (error) {
      logger.error('发布拼车失败:', error);
      throw error;
    }
  }

  /**
   * 搜索附近的拼车信息
   * @param {Object} criteria - 搜索条件
   * @returns {Promise<Object>} 搜索结果
   */
  async searchNearbyCarpools(criteria) {
    try {
      const {
        origin,
        destination,
        departureDate,
        type,
        minPrice,
        maxPrice,
        minSeats,
        gender,
        page = 1,
        limit = 20
      } = criteria;

      // 验证日期
      if (departureDate) {
        const searchDate = new Date(departureDate);
        if (searchDate < new Date().setHours(0, 0, 0, 0)) {
          throw new Error('出发日期不能早于今天');
        }
      }

      const carpools = await Carpooling.searchNearby({
        origin,
        destination,
        departureDate,
        type,
        minPrice,
        maxPrice,
        minSeats,
        gender,
        page,
        limit
      });

      // 增加浏览次数
      carpools.forEach(async carpool => {
        await Carpooling.findByIdAndUpdate(carpool._id, {
          $inc: { viewCount: 1 }
        });
      });

      logger.info('搜索拼车成功', {
        count: carpools.length,
        page,
        limit
      });

      return {
        success: true,
        data: carpools,
        total: carpools.length,
        page,
        limit
      };

    } catch (error) {
      logger.error('搜索拼车失败:', error);
      throw error;
    }
  }

  /**
   * 加入拼车
   * @param {String} carpoolId - 拼车ID
   * @param {String} userId - 用户ID
   * @param {Object} passengerInfo - 乘客信息
   * @returns {Promise<Object>} 加入结果
   */
  async joinCarpool(carpoolId, userId, passengerInfo) {
    try {
      if (!userId) {
        throw new Error('用户未登录');
      }

      const carpool = await Carpooling.findById(carpoolId);

      if (!carpool) {
        throw new Error('拼车信息不存在');
      }

      if (carpool.status === 'completed') {
        throw new Error('拼车已完成，无法加入');
      }

      if (carpool.status === 'cancelled') {
        throw new Error('拼车已取消');
      }

      if (carpool.userId.toString() === userId.toString()) {
        throw new Error('无法加入自己发布的拼车');
      }

      // 添加乘客
      const seats = passengerInfo.seats || 1;
      await carpool.addPassenger({
        userId,
        name: passengerInfo.name,
        phone: passengerInfo.phone,
        seats
      });

      // 发送通知给车主
      await notificationService.sendNotification({
        recipient: carpool.userId,
        type: 'carpool_join_request',
        title: '新的拼车申请',
        content: `${passengerInfo.name} 申请加入您的拼车`,
        data: {
          carpoolId,
          passengerId: userId
        }
      });

      logger.info('加入拼车成功', {
        carpoolId,
        userId,
        seats
      });

      return {
        success: true,
        message: '申请已提交，等待车主确认'
      };

    } catch (error) {
      logger.error('加入拼车失败:', error);
      throw error;
    }
  }

  /**
   * 确认乘客
   * @param {String} carpoolId - 拼车ID
   * @param {String} ownerId - 车主ID
   * @param {String} passengerId - 乘客ID
   * @returns {Promise<Object>} 确认结果
   */
  async confirmPassenger(carpoolId, ownerId, passengerId) {
    try {
      const carpool = await Carpooling.findById(carpoolId);

      if (!carpool) {
        throw new Error('拼车信息不存在');
      }

      if (carpool.userId.toString() !== ownerId.toString()) {
        throw new Error('只有车主可以确认乘客');
      }

      await carpool.confirmPassenger(passengerId);

      // 发送通知给乘客
      await notificationService.sendNotification({
        recipient: passengerId,
        type: 'carpool_join_confirmed',
        title: '拼车申请已通过',
        content: '车主已确认您的拼车申请',
        data: {
          carpoolId
        }
      });

      logger.info('确认乘客成功', {
        carpoolId,
        passengerId
      });

      return {
        success: true,
        message: '已确认乘客'
      };

    } catch (error) {
      logger.error('确认乘客失败:', error);
      throw error;
    }
  }

  /**
   * 取消拼车
   * @param {String} carpoolId - 拼车ID
   * @param {String} userId - 用户ID
   * @param {String} reason - 取消原因
   * @returns {Promise<Object>} 取消结果
   */
  async cancelCarpool(carpoolId, userId, reason) {
    try {
      const carpool = await Carpooling.findById(carpoolId);

      if (!carpool) {
        throw new Error('拼车信息不存在');
      }

      const isOwner = carpool.userId.toString() === userId.toString();
      const isPassenger = carpool.passengers.some(
        p => p.userId.toString() === userId.toString()
      );

      if (!isOwner && !isPassenger) {
        throw new Error('无权取消此拼车');
      }

      if (isOwner) {
        // 车主取消整个拼车
        await carpool.cancel(reason);

        // 通知所有乘客
        carpool.passengers.forEach(async passenger => {
          if (passenger.status === 'confirmed') {
            await notificationService.sendNotification({
              recipient: passenger.userId,
              type: 'carpool_cancelled',
              title: '拼车已取消',
              content: `车主取消了拼车：${reason || '无原因'}`,
              data: {
                carpoolId
              }
            });
          }
        });
      } else {
        // 乘客退出
        await carpool.removePassenger(userId);
      }

      logger.info('取消拼车成功', {
        carpoolId,
        userId,
        reason
      });

      return {
        success: true,
        message: isOwner ? '拼车已取消' : '已退出拼车'
      };

    } catch (error) {
      logger.error('取消拼车失败:', error);
      throw error;
    }
  }

  /**
   * 评价拼车
   * @param {String} carpoolId - 拼车ID
   * @param {String} userId - 用户ID
   * @param {Object} review - 评价信息
   * @returns {Promise<Object>} 评价结果
   */
  async rateCarpool(carpoolId, userId, review) {
    try {
      const carpool = await Carpooling.findById(carpoolId);

      if (!carpool) {
        throw new Error('拼车信息不存在');
      }

      if (carpool.status !== 'completed') {
        throw new Error('只能评价已完成的拼车');
      }

      // 获取用户信息
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 添加评价
      await carpool.addReview({
        userId,
        userName: user.name,
        rating: review.rating,
        comment: review.comment
      });

      logger.info('评价拼车成功', {
        carpoolId,
        userId,
        rating: review.rating
      });

      return {
        success: true,
        message: '评价成功'
      };

    } catch (error) {
      logger.error('评价拼车失败:', error);
      throw error;
    }
  }

  /**
   * 获取拼车详情
   * @param {String} carpoolId - 拼车ID
   * @returns {Promise<Object>} 拼车详情
   */
  async getCarpoolDetail(carpoolId) {
    try {
      const carpool = await Carpooling.findById(carpoolId)
        .populate('userId', 'name avatar phone rating')
        .populate('passengers.userId', 'name avatar phone');

      if (!carpool) {
        throw new Error('拼车信息不存在');
      }

      // 增加浏览次数
      await Carpooling.findByIdAndUpdate(carpoolId, {
        $inc: { viewCount: 1 }
      });

      logger.info('获取拼车详情成功', { carpoolId });

      return {
        success: true,
        data: carpool
      };

    } catch (error) {
      logger.error('获取拼车详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的拼车历史
   * @param {String} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 拼车历史
   */
  async getUserHistory(userId, options = {}) {
    try {
      if (!userId) {
        throw new Error('用户未登录');
      }

      const history = await Carpooling.getUserHistory(userId, options);

      logger.info('获取用户拼车历史成功', {
        userId,
        count: history.length
      });

      return {
        success: true,
        data: history,
        total: history.length
      };

    } catch (error) {
      logger.error('获取用户拼车历史失败:', error);
      throw error;
    }
  }

  /**
   * 更新拼车状态
   * @param {String} carpoolId - 拼车ID
   * @param {String} userId - 用户ID
   * @param {String} status - 新状态
   * @returns {Promise<Object>} 更新结果
   */
  async updateCarpoolStatus(carpoolId, userId, status) {
    try {
      const carpool = await Carpooling.findById(carpoolId);

      if (!carpool) {
        throw new Error('拼车信息不存在');
      }

      if (carpool.userId.toString() !== userId.toString()) {
        throw new Error('只有车主可以更新拼车状态');
      }

      if (status === 'active') {
        carpool.status = 'active';
      } else if (status === 'completed') {
        await carpool.complete();
      } else {
        throw new Error('无效的状态');
      }

      logger.info('更新拼车状态成功', {
        carpoolId,
        status
      });

      return {
        success: true,
        message: '状态更新成功',
        data: carpool
      };

    } catch (error) {
      logger.error('更新拼车状态失败:', error);
      throw error;
    }
  }

  /**
   * 验证拼车数据
   * @private
   */
  _validateCarpoolData(data) {
    if (!data.type || !['driver', 'passenger'].includes(data.type)) {
      throw new Error('无效的拼车类型');
    }

    if (!data.origin || !data.origin.address || !data.origin.location) {
      throw new Error('请提供起点信息');
    }

    if (!data.destination || !data.destination.address || !data.destination.location) {
      throw new Error('请提供终点信息');
    }

    if (!data.departureTime) {
      throw new Error('请提供出发时间');
    }

    if (new Date(data.departureTime) < new Date()) {
      throw new Error('出发时间不能早于当前时间');
    }

    if (!data.seats || data.seats < 1) {
      throw new Error('座位数必须大于0');
    }

    if (data.availableSeats === undefined || data.availableSeats < 0) {
      throw new Error('可用座位数无效');
    }

    if (data.price === undefined || data.price < 0) {
      throw new Error('价格无效');
    }

    // 车主必须提供车辆信息
    if (data.type === 'driver' && !data.vehicleInfo) {
      throw new Error('车主必须提供车辆信息');
    }
  }
}

module.exports = new CarpoolingService();
