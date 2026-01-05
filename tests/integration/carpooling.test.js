/**
 * 拼车服务测试
 */

const mongoose = require('mongoose');
const Carpooling = require('../../src/models/Carpooling');
const User = require('../../src/models/User');
const carpoolingService = require('../../src/services/carpoolingService');

describe('Carpooling Service', () => {
  let testUser;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // 创建测试用户
    testUser = await User.create({
      username: 'testdriver',
      phone: '13800138000',
      password: 'password123',
      name: '测试司机',
      role: 'resident'
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Carpooling.deleteMany({});
  });

  describe('发布拼车', () => {
    test('车主应该成功发布拼车信息', async () => {
      const carpoolData = {
        type: 'driver',
        origin: {
          address: '北京市朝阳区',
          location: {
            type: 'Point',
            coordinates: [116.4074, 39.9042]
          }
        },
        destination: {
          address: '天津市和平区',
          location: {
            type: 'Point',
            coordinates: [117.2009, 39.0841]
          }
        },
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        seats: 4,
        availableSeats: 3,
        price: 100,
        vehicleInfo: {
          brand: '大众',
          model: '帕萨特',
          color: '黑色',
          plateNumber: '京A12345'
        },
        requirements: '禁止吸烟',
        notes: '明天早上8点出发'
      };

      const result = await carpoolingService.publishCarpool(testUser._id, carpoolData);

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('driver');
      expect(result.data.availableSeats).toBe(3);
    });

    test('乘客应该成功发布拼车需求', async () => {
      const carpoolData = {
        type: 'passenger',
        origin: {
          address: '北京市朝阳区',
          location: {
            type: 'Point',
            coordinates: [116.4074, 39.9042]
          }
        },
        destination: {
          address: '天津市和平区',
          location: {
            type: 'Point',
            coordinates: [117.2009, 39.0841]
          }
        },
        departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        seats: 1,
        availableSeats: 1,
        price: 100,
        requirements: '需要车主有良好的驾驶记录'
      };

      const result = await carpoolingService.publishCarpool(testUser._id, carpoolData);

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('passenger');
    });

    test('应该拒绝无效的拼车数据', async () => {
      const invalidData = {
        type: 'driver',
        origin: {
          address: '北京市朝阳区'
        }
      };

      await expect(
        carpoolingService.publishCarpool(testUser._id, invalidData)
      ).rejects.toThrow();
    });
  });

  describe('搜索拼车', () => {
    beforeEach(async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await Carpooling.create([
        {
          userId: testUser._id,
          type: 'driver',
          origin: {
            address: '北京市朝阳区',
            location: { type: 'Point', coordinates: [116.4074, 39.9042] }
          },
          destination: {
            address: '天津市和平区',
            location: { type: 'Point', coordinates: [117.2009, 39.0841] }
          },
          departureTime: tomorrow,
          seats: 4,
          availableSeats: 3,
          price: 100,
          vehicleInfo: {
            brand: '大众',
            model: '帕萨特',
            color: '黑色',
            plateNumber: '京A12345'
          },
          status: 'active'
        }
      ]);
    });

    test('应该搜索到附近的拼车信息', async () => {
      const result = await carpoolingService.searchNearbyCarpools({
        origin: [116.4074, 39.9042],
        departureDate: new Date().toISOString().split('T')[0],
        page: 1,
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('加入和取消拼车', () => {
    let carpool;
    let passengerUser;

    beforeEach(async () => {
      // 创建乘客用户
      passengerUser = await User.create({
        username: 'testpassenger',
        phone: '13800138001',
        password: 'password123',
        name: '测试乘客',
        role: 'resident'
      });

      // 创建拼车信息
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      carpool = await Carpooling.create({
        userId: testUser._id,
        type: 'driver',
        origin: {
          address: '北京市朝阳区',
          location: { type: 'Point', coordinates: [116.4074, 39.9042] }
        },
        destination: {
          address: '天津市和平区',
          location: { type: 'Point', coordinates: [117.2009, 39.0841] }
        },
        departureTime: tomorrow,
        seats: 4,
        availableSeats: 3,
        price: 100,
        vehicleInfo: {
          brand: '大众',
          model: '帕萨特',
          color: '黑色',
          plateNumber: '京A12345'
        },
        status: 'active'
      });
    });

    test('乘客应该成功加入拼车', async () => {
      const passengerInfo = {
        name: passengerUser.name,
        phone: passengerUser.phone,
        seats: 1
      };

      const result = await carpoolingService.joinCarpool(
        carpool._id,
        passengerUser._id,
        passengerInfo
      );

      expect(result.success).toBe(true);

      const updatedCarpool = await Carpooling.findById(carpool._id);
      expect(updatedCarpool.passengers).toHaveLength(1);
      expect(updatedCarpool.availableSeats).toBe(2);
    });

    test('乘客应该成功退出拼车', async () => {
      // 先加入
      await carpool.addPassenger({
        userId: passengerUser._id,
        name: passengerUser.name,
        phone: passengerUser.phone,
        seats: 1
      });

      // 再退出
      const result = await carpoolingService.cancelCarpool(
        carpool._id,
        passengerUser._id,
        '临时有事'
      );

      expect(result.success).toBe(true);

      const updatedCarpool = await Carpooling.findById(carpool._id);
      expect(updatedCarpool.passengers).toHaveLength(0);
    });

    test('车主应该成功取消拼车', async () => {
      const result = await carpoolingService.cancelCarpool(
        carpool._id,
        testUser._id,
        '行程变更'
      );

      expect(result.success).toBe(true);

      const updatedCarpool = await Carpooling.findById(carpool._id);
      expect(updatedCarpool.status).toBe('cancelled');
    });
  });

  describe('评价拼车', () => {
    let carpool;

    beforeEach(async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      carpool = await Carpooling.create({
        userId: testUser._id,
        type: 'driver',
        origin: {
          address: '北京市朝阳区',
          location: { type: 'Point', coordinates: [116.4074, 39.9042] }
        },
        destination: {
          address: '天津市和平区',
          location: { type: 'Point', coordinates: [117.2009, 39.0841] }
        },
        departureTime: yesterday,
        seats: 4,
        availableSeats: 0,
        price: 100,
        vehicleInfo: {
          brand: '大众',
          model: '帕萨特',
          color: '黑色',
          plateNumber: '京A12345'
        },
        status: 'completed'
      });
    });

    test('应该成功评价已完成的拼车', async () => {
      const review = {
        rating: 5,
        comment: '非常好的车主，准时出发！'
      };

      const result = await carpoolingService.rateCarpool(
        carpool._id,
        testUser._id,
        review
      );

      expect(result.success).toBe(true);

      const updatedCarpool = await Carpooling.findById(carpool._id);
      expect(updatedCarpool.reviews).toHaveLength(1);
      expect(updatedCarpool.rating.average).toBe(5);
    });

    test('应该拒绝重复评价', async () => {
      const review = {
        rating: 5,
        comment: '非常好！'
      };

      // 第一次评价
      await carpoolingService.rateCarpool(carpool._id, testUser._id, review);

      // 第二次评价应该失败
      await expect(
        carpoolingService.rateCarpool(carpool._id, testUser._id, review)
      ).rejects.toThrow();
    });
  });
});
