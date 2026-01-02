/**
 * 拼车服务单元测试
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const CarpoolTrip = require('../../src/models/CarpoolTrip');

describe('CarpoolTrip Model', () => {
  let mongoServer;
  let driverId, villageId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    driverId = new mongoose.Types.ObjectId();
    villageId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await CarpoolTrip.deleteMany({});
  });

  describe('创建行程', () => {
    const tripData = {
      villageId,
      driver: driverId,
      route: {
        origin: {
          address: '杭州市余杭区',
          coordinates: [120.1, 30.2],
          time: new Date(Date.now() + 86400000) // 明天
        },
        destination: {
          address: '杭州市西湖区',
          coordinates: [120.15, 30.25]
        },
        distance: 25.5
      },
      seats: {
        total: 4,
        available: 4,
        pricePerSeat: 30
      },
      vehicle: {
        brand: '大众',
        model: '朗逸',
        color: '白色',
        plateNumber: '浙A12345'
      },
      status: 'open'
    };

    test('应成功创建拼车行程', async () => {
      const trip = new CarpoolTrip(tripData);

      await trip.save();

      expect(trip._id).toBeDefined();
      expect(trip.seats.total).toBe(4);
      expect(trip.status).toBe('open');
    });

    test('应计算虚拟字段', async () => {
      const trip = new CarpoolTrip({
        ...tripData,
        seats: {
          total: 4,
          available: 2,
          pricePerSeat: 30
        }
      });

      await trip.save();
      const json = trip.toJSON();

      expect(json.seatsOccupied).toBe(2);
      expect(json.isFull).toBe(false);
    });

    test('座位满时应标记为已满', async () => {
      const trip = new CarpoolTrip({
        ...tripData,
        seats: {
          total: 4,
          available: 0,
          pricePerSeat: 30
        }
      });

      await trip.save();
      const json = trip.toJSON();

      expect(json.isFull).toBe(true);
    });
  });

  describe('乘客管理', () => {
    let trip;
    let passengerId;

    beforeEach(async () => {
      trip = new CarpoolTrip({
        villageId,
        driver: driverId,
        route: {
          origin: {
            address: '起点',
            coordinates: [120, 30],
            time: new Date(Date.now() + 86400000)
          },
          destination: {
            address: '终点',
            coordinates: [120.1, 30.1]
          }
        },
        seats: {
          total: 4,
          available: 4,
          pricePerSeat: 30
        },
        vehicle: {
          plateNumber: '浙A12345'
        },
        status: 'open'
      });

      await trip.save();
      passengerId = new mongoose.Types.ObjectId();
    });

    test('应成功添加乘客', async () => {
      await trip.addPassenger({
        user: passengerId,
        pickupLocation: {
          address: '上车点',
          coordinates: [120.05, 30.05]
        },
        dropoffLocation: {
          address: '下车点',
          coordinates: [120.08, 30.08]
        },
        seats: 1
      });

      expect(trip.passengers).toHaveLength(1);
      expect(trip.seats.available).toBe(3);
      expect(trip.passengers[0].status).toBe('requested');
    });

    test('座位不足时应抛出错误', async () => {
      trip.seats.available = 1;
      await trip.save();

      await expect(trip.addPassenger({
        user: passengerId,
        seats: 2
      })).rejects.toThrow('座位不足');
    });

    test('应成功确认乘客', async () => {
      await trip.addPassenger({
        user: passengerId,
        seats: 1
      });

      await trip.confirmPassenger(passengerId);

      const passenger = trip.passengers.find(p => p.user.equals(passengerId));
      expect(passenger.status).toBe('confirmed');
    });

    test('应成功取消乘客', async () => {
      await trip.addPassenger({
        user: passengerId,
        seats: 1
      });

      await trip.cancelPassenger(passengerId);

      expect(trip.seats.available).toBe(4);
      const passenger = trip.passengers.find(p => p.user.equals(passengerId));
      expect(passenger.status).toBe('cancelled');
    });

    test('取消乘客后应释放座位', async () => {
      await trip.addPassenger({
        user: passengerId,
        seats: 2
      });

      expect(trip.seats.available).toBe(2);

      await trip.cancelPassenger(passengerId);

      expect(trip.seats.available).toBe(4);
      expect(trip.status).toBe('open');
    });
  });

  describe('行程状态转换', () => {
    let trip;

    beforeEach(async () => {
      trip = new CarpoolTrip({
        villageId,
        driver: driverId,
        route: {
          origin: {
            address: '起点',
            coordinates: [120, 30],
            time: new Date(Date.now() + 86400000)
          },
          destination: {
            address: '终点',
            coordinates: [120.1, 30.1]
          }
        },
        seats: {
          total: 4,
          available: 4,
          pricePerSeat: 30
        },
        vehicle: {
          plateNumber: '浙A12345'
        },
        status: 'draft'
      });

      await trip.save();
    });

    test('应从draft转换为open', async () => {
      await trip.updateStatus('open');

      expect(trip.status).toBe('open');
    });

    test('应从open转换为filling', async () => {
      trip.status = 'open';
      await trip.save();

      await trip.updateStatus('filling');

      expect(trip.status).toBe('filling');
    });

    test('非法状态转换应抛出错误', async () => {
      await expect(trip.updateStatus('completed')).rejects.toThrow();
    });

    test('应成功开始行程', async () => {
      trip.status = 'confirmed';
      await trip.save();

      await trip.startTrip();

      expect(trip.status).toBe('in_progress');
      expect(trip.tripRecord.actualStartTime).toBeDefined();
    });

    test('应成功完成行程', async () => {
      trip.status = 'in_progress';
      await trip.save();

      await trip.completeTrip(30, 45);

      expect(trip.status).toBe('completed');
      expect(trip.tripRecord.actualEndTime).toBeDefined();
      expect(trip.tripRecord.totalDistance).toBe(30);
      expect(trip.tripRecord.totalDuration).toBe(45);
    });
  });

  describe('取消行程', () => {
    let trip;

    beforeEach(async () => {
      trip = new CarpoolTrip({
        villageId,
        driver: driverId,
        route: {
          origin: {
            address: '起点',
            coordinates: [120, 30],
            time: new Date(Date.now() + 172800000) // 48小时后
          },
          destination: {
            address: '终点',
            coordinates: [120.1, 30.1]
          }
        },
        seats: {
          total: 4,
          available: 4,
          pricePerSeat: 30
        },
        vehicle: {
          plateNumber: '浙A12345'
        },
        status: 'open'
      });

      await trip.save();
    });

    test('应成功取消行程', async () => {
      await trip.cancelTrip(driverId, '计划有变');

      expect(trip.status).toBe('cancelled');
      expect(trip.cancellation.cancelledBy).toEqual(driverId);
      expect(trip.cancellation.reason).toBe('计划有变');
    });

    test('48小时前取消应全额退款', async () => {
      await trip.cancelTrip(driverId, '计划有变');

      expect(trip.cancellation.refundPolicy).toBe('full_refund');
    });

    test('2小时内取消应不予退款', async () => {
      trip.route.origin.time = new Date(Date.now() + 3600000); // 1小时后
      await trip.save();

      await trip.cancelTrip(driverId, '临时有事');

      expect(trip.cancellation.refundPolicy).toBe('no_refund');
    });
  });

  describe('静态方法', () => {
    beforeEach(async () => {
      // 创建测试数据
      await CarpoolTrip.create([
        {
          villageId,
          driver: driverId,
          route: {
            origin: {
              address: '杭州',
              coordinates: [120.1, 30.2],
              time: new Date(Date.now() + 86400000)
            },
            destination: {
              address: '嘉兴',
              coordinates: [120.2, 30.3]
            }
          },
          seats: {
            total: 4,
            available: 2,
            pricePerSeat: 30
          },
          vehicle: { plateNumber: '浙A11111' },
          status: 'open'
        },
        {
          villageId,
          driver: driverId,
          route: {
            origin: {
              address: '宁波',
              coordinates: [121.5, 29.8],
              time: new Date(Date.now() + 86400000)
            },
            destination: {
              address: '绍兴',
              coordinates: [120.5, 30.0]
            }
          },
          seats: {
            total: 4,
            available: 3,
            pricePerSeat: 50
          },
          vehicle: { plateNumber: '浙B22222' },
          status: 'open'
        }
      ]);
    });

    test('应查询附近拼车', async () => {
      const nearby = await CarpoolTrip.findNearby(120.1, 30.2, 50);

      expect(nearby.length).toBeGreaterThan(0);
    });

    test('应按座位数过滤', async () => {
      const nearby = await CarpoolTrip.findNearby(120.1, 30.2, 50, {
        seats: 3
      });

      nearby.forEach(trip => {
        expect(trip.seats.available).toBeGreaterThanOrEqual(3);
      });
    });

    test('应只返回open或filling状态的行程', async () => {
      const nearby = await CarpoolTrip.findNearby(120.1, 30.2, 50);

      nearby.forEach(trip => {
        expect(['open', 'filling']).toContain(trip.status);
      });
    });
  });

  describe('费用计算', () => {
    let trip;

    beforeEach(async () => {
      trip = new CarpoolTrip({
        villageId,
        driver: driverId,
        route: {
          origin: {
            address: '起点',
            coordinates: [120, 30],
            time: new Date(Date.now() + 86400000)
          },
          destination: {
            address: '终点',
            coordinates: [120.1, 30.1]
          },
          distance: 50
        },
        seats: {
          total: 4,
          available: 4,
          pricePerSeat: 25
        },
        vehicle: {
          plateNumber: '浙A12345'
        },
        status: 'open'
      });

      await trip.save();
    });

    test('应正确计算费用', () => {
      const cost = trip.calculateCost(50, 25);

      expect(cost.totalCost).toBeCloseTo(25, 0);
      expect(cost.pricePerSeat).toBeCloseTo(6.25, 0);
    });

    test('应正确计算费用明细', () => {
      const cost = trip.calculateCost(50, 25);

      expect(cost.breakdown.fuel).toBeCloseTo(17.5, 1);
      expect(cost.breakdown.toll).toBeCloseTo(5, 0);
    });
  });

  describe('验证规则', () => {
    test('车牌号必填', async () => {
      const trip = new CarpoolTrip({
        villageId,
        driver: driverId,
        route: {
          origin: {
            address: '起点',
            coordinates: [120, 30],
            time: new Date(Date.now() + 86400000)
          },
          destination: {
            address: '终点',
            coordinates: [120.1, 30.1]
          }
        },
        seats: {
          total: 4,
          available: 4,
          pricePerSeat: 30
        },
        vehicle: {
          brand: '大众',
          model: '朗逸'
          // 缺少plateNumber
        }
      });

      await expect(trip.save()).rejects.toThrow();
    });

    test('座位数必须大于0', async () => {
      const trip = new CarpoolTrip({
        villageId,
        driver: driverId,
        route: {
          origin: {
            address: '起点',
            coordinates: [120, 30],
            time: new Date(Date.now() + 86400000)
          },
          destination: {
            address: '终点',
            coordinates: [120.1, 30.1]
          }
        },
        seats: {
          total: 0,
          available: 0,
          pricePerSeat: 30
        },
        vehicle: {
          plateNumber: '浙A12345'
        }
      });

      await expect(trip.save()).rejects.toThrow();
    });
  });
});
