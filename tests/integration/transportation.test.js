/**
 * 交通服务测试
 */

const mongoose = require('mongoose');
const Transportation = require('../../src/models/Transportation');
const transportationService = require('../../src/services/transportationService');

describe('Transportation Service', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Transportation.deleteMany({});
  });

  describe('创建交通站点', () => {
    test('应该成功创建机场站点', async () => {
      const station = await Transportation.create({
        type: 'flight',
        stationName: '北京首都国际机场',
        code: 'PEK',
        location: {
          type: 'Point',
          coordinates: [116.5849, 40.0812]
        },
        address: '北京市朝阳区首都机场路',
        phone: '010-96158',
        schedules: [{
          id: 'CA1234',
          departureTime: new Date('2025-01-10T08:00:00'),
          arrivalTime: new Date('2025-01-10T10:30:00'),
          price: 1200,
          availableSeats: 150,
          origin: '北京',
          destination: '上海'
        }],
        facilities: ['餐厅', '商店', '贵宾室'],
        isActive: true
      });

      expect(station.type).toBe('flight');
      expect(station.code).toBe('PEK');
      expect(station.schedules).toHaveLength(1);
    });

    test('应该成功创建火车站点', async () => {
      const station = await Transportation.create({
        type: 'train',
        stationName: '北京南站',
        code: 'BXP',
        location: {
          type: 'Point',
          coordinates: [116.3782, 39.8654]
        },
        address: '北京市永外大街车站路',
        phone: '010-51849272',
        schedules: [{
          id: 'G101',
          departureTime: new Date('2025-01-10T09:00:00'),
          arrivalTime: new Date('2025-01-10T13:30:00'),
          price: 553,
          availableSeats: 1000,
          origin: '北京南',
          destination: '上海虹桥'
        }],
        facilities: ['候车室', '餐厅', '便利店'],
        isActive: true
      });

      expect(station.type).toBe('train');
      expect(station.stationName).toBe('北京南站');
    });
  });

  describe('搜索附近站点', () => {
    beforeEach(async () => {
      // 创建测试数据
      await Transportation.create([
        {
          type: 'flight',
          stationName: '北京首都国际机场',
          code: 'PEK',
          location: { type: 'Point', coordinates: [116.5849, 40.0812] },
          address: '北京市朝阳区',
          isActive: true
        },
        {
          type: 'train',
          stationName: '北京南站',
          code: 'BXP',
          location: { type: 'Point', coordinates: [116.3782, 39.8654] },
          address: '北京市永外大街',
          isActive: true
        },
        {
          type: 'bus',
          stationName: '赵公口长途汽车站',
          code: 'ZGK',
          location: { type: 'Point', coordinates: [116.4321, 39.8756] },
          address: '北京市丰台区',
          isActive: true
        }
      ]);
    });

    test('应该找到附近的交通站点', async () => {
      const result = await transportationService.getNearbyTransportation(
        116.4074,
        39.9042,
        50,
        {}
      );

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    test('应该按类型筛选站点', async () => {
      const result = await transportationService.getNearbyTransportation(
        116.4074,
        39.9042,
        50,
        { type: 'train' }
      );

      expect(result.success).toBe(true);
      expect(result.data.every(s => s.type === 'train')).toBe(true);
    });
  });

  describe('搜索班次', () => {
    beforeEach(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await Transportation.create({
        type: 'train',
        stationName: '北京南站',
        code: 'BXP',
        location: { type: 'Point', coordinates: [116.3782, 39.8654] },
        address: '北京市永外大街',
        schedules: [
          {
            id: 'G101',
            departureTime: new Date(today.getTime() + 9 * 60 * 60 * 1000),
            arrivalTime: new Date(today.getTime() + 13.5 * 60 * 60 * 1000),
            price: 553,
            availableSeats: 1000,
            origin: '北京南',
            destination: '上海虹桥'
          },
          {
            id: 'G103',
            departureTime: new Date(today.getTime() + 10 * 60 * 60 * 1000),
            arrivalTime: new Date(today.getTime() + 14.5 * 60 * 60 * 1000),
            price: 553,
            availableSeats: 800,
            origin: '北京南',
            destination: '上海虹桥'
          }
        ],
        isActive: true
      });
    });

    test('应该搜索到匹配的班次', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      const result = await transportationService.searchSchedules({
        origin: '北京南',
        destination: '上海虹桥',
        date: dateStr
      });

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });
});
