/**
 * 村委管理模块测试套件
 *
 * 功能：
 * - 村委成员 CRUD 测试
 * - 智能值班表测试
 * - 村情地图测试
 * - API 端点验证
 *
 * @author Smart Village Platform
 * @version 1.0.0
 */

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { CommitteeMember, DutySchedule, VillageMap, Village, User } = require('../src/models');
const bcrypt = require('bcryptjs');

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only-min-32-chars';
const JWT_EXPIRES_IN = '1h';

/**
 * 生成测试 JWT token
 */
function generateTestToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      villageId: user.villageId?.toString(),
      permissions: ['committee:create', 'committee:update', 'committee:delete', 'committee:view_all', 'duty:create']
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'smart-village-test'
    }
  );
}

// 测试数据
const testVillageData = {
  name: '测试村庄',
  code: 'TEST001',
  address: '测试地址',
  population: 1000
};

const testCommitteeMemberData = {
  name: '张三',
  idCard: '110101199001011234',
  phone: '13800138000',
  position: {
    current: 'village_head',
    startDate: new Date()
  },
  partyMember: {
    isMember: true,
    joinDate: new Date('2015-06-01'),
    membershipNumber: '123456789'
  }
};

const testDutyScheduleData = {
  season: 'spring',
  year: 2025,
  rules: {
    shiftsPerDay: 3,
    shiftTimes: [
      { name: 'morning', startTime: '08:00', endTime: '12:00' },
      { name: 'afternoon', startTime: '14:00', endTime: '18:00' },
      { name: 'night', startTime: '18:00', endTime: '08:00' }
    ],
    maxContinuousDays: 5,
    weekendRotation: true
  }
};

// 测试用户 token
let authToken;
let testVillageId;
let testMemberId;
let testScheduleId;

describe('🏘️ 村委管理模块测试', () => {

  beforeAll(async () => {
    // 连接测试数据库
    const mongoURI = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/smart_village_test';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // 创建测试用户
    const hashedPassword = await bcrypt.hash('test123456', 10);
    const testUser = await User.create({
      username: 'test_admin',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'admin',
      profile: {
        firstName: 'Test',
        lastName: 'Admin'
      }
    });

    // 创建测试村庄
    const testVillage = await Village.create(testVillageData);
    testVillageId = testVillage._id;
    testUser.villageId = testVillageId;
    await testUser.save();

    // 生成测试 token
    authToken = `Bearer ${generateTestToken(testUser)}`;
  });

  afterAll(async () => {
    // 清理测试数据
    await CommitteeMember.deleteMany({});
    await DutySchedule.deleteMany({});
    await VillageMap.deleteMany({});
    await Village.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // 每个测试前的清理
    await CommitteeMember.deleteMany({});
    await DutySchedule.deleteMany({});
    await VillageMap.deleteMany({});
  });

  describe('1. 村委成员管理测试', () => {

    test('✅ POST /api/v1/committee/members - 创建村委成员', async () => {
      const response = await request(app)
        .post('/api/v1/committee/members')
        .set('Authorization', authToken)
        .send({
          ...testCommitteeMemberData,
          villageId: testVillageId.toString()
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(testCommitteeMemberData.name);
      expect(response.body.data.position.current).toBe(testCommitteeMemberData.position.current);
      expect(response.body.data.partyMember.isMember).toBe(true);

      testMemberId = response.body.data._id;
    });

    test('✅ GET /api/v1/committee/members - 获取村委成员列表', async () => {
      // 先创建一些测试数据
      await CommitteeMember.create({
        ...testCommitteeMemberData,
        villageId: testVillageId
      });

      const response = await request(app)
        .get(`/api/v1/committee/members?villageId=${testVillageId.toString()}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.members)).toBe(true);
      expect(response.body.data.members.length).toBeGreaterThan(0);
    });

    test('✅ GET /api/v1/committee/members/:id - 获取单个村委成员', async () => {
      const member = await CommitteeMember.create({
        ...testCommitteeMemberData,
        villageId: testVillageId
      });

      const response = await request(app)
        .get(`/api/v1/committee/members/${member._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(testCommitteeMemberData.name);
    });

    test('✅ PUT /api/v1/committee/members/:id - 更新村委成员', async () => {
      const member = await CommitteeMember.create({
        ...testCommitteeMemberData,
        villageId: testVillageId
      });

      const response = await request(app)
        .put(`/api/v1/committee/members/${member._id}`)
        .set('Authorization', authToken)
        .send({
          phone: '13900139000'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.phone).toBe('13900139000');
    });

    test('✅ POST /api/v1/committee/members/:id/position/change - 变更职务', async () => {
      const member = await CommitteeMember.create({
        ...testCommitteeMemberData,
        villageId: testVillageId
      });

      const response = await request(app)
        .post(`/api/v1/committee/members/${member._id}/position/change`)
        .set('Authorization', authToken)
        .send({
          newPosition: 'party_secretary',
          reason: '职务调整',
          proofDoc: null
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.position.current).toBe('party_secretary');
      expect(response.body.data.position.history.length).toBeGreaterThan(0);
    });

    test('✅ GET /api/v1/committee/statistics - 获取统计数据', async () => {
      // 创建测试数据
      await CommitteeMember.create([
        {
          ...testCommitteeMemberData,
          villageId: testVillageId,
          position: { current: 'village_secretary', startDate: new Date() },
          status: 'active'
        },
        {
          ...testCommitteeMemberData,
          name: '李四',
          idCard: '110101199001011235',
          phone: '13800138001',
          villageId: testVillageId,
          position: { current: 'accountant', startDate: new Date() },
          status: 'active',
          partyMember: { isMember: false }
        }
      ]);

      const response = await request(app)
        .get(`/api/v1/committee/statistics?villageId=${testVillageId.toString()}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('statusStats');
      expect(response.body.data).toHaveProperty('positionStats');
    });

    test('❌ POST /api/v1/committee/members - 参数验证失败', async () => {
      const response = await request(app)
        .post('/api/v1/committee/members')
        .set('Authorization', authToken)
        .send({
          name: '', // 空姓名
          idCard: '123', // 无效身份证
          phone: '12345', // 无效手机号
          villageId: testVillageId.toString()
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('参数验证失败');
    });
  });

  describe('2. 智能值班表测试', () => {

    test('✅ POST /api/v1/duty-schedule - 创建值班表', async () => {
      const response = await request(app)
        .post('/api/v1/duty-schedule')
        .set('Authorization', authToken)
        .send({
          ...testDutyScheduleData,
          villageId: testVillageId.toString(),
          schedules: [
            {
              date: new Date('2025-01-15'),
              shifts: [
                {
                  name: 'morning',
                  personnel: [{
                    memberId: testMemberId || new mongoose.Types.ObjectId(),
                    name: '张三',
                    phone: '13800138000',
                    position: 'village_head'
                  }]
                }
              ]
            }
          ]
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.season).toBe('spring');
      expect(response.body.data.year).toBe(2025);

      testScheduleId = response.body.data._id;
    });

    test('✅ GET /api/v1/duty-schedule - 获取值班表列表', async () => {
      await DutySchedule.create({
        ...testDutyScheduleData,
        villageId: testVillageId
      });

      const response = await request(app)
        .get(`/api/v1/duty-schedule?villageId=${testVillageId.toString()}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.schedules)).toBe(true);
    });

    test('✅ GET /api/v1/duty-schedule/current - 获取当前值班人员', async () => {
      const member = await CommitteeMember.create({
        ...testCommitteeMemberData,
        villageId: testVillageId
      });

      const today = new Date();
      const schedule = await DutySchedule.create({
        ...testDutyScheduleData,
        villageId: testVillageId,
        schedules: [{
          date: today,
          shifts: [{
            name: 'morning',
            personnel: [{
              memberId: member._id,
              name: member.name,
              phone: member.phone,
              position: member.position.current
            }]
          }]
        }],
        metadata: { published: true }
      });

      const response = await request(app)
        .get(`/api/v1/duty-schedule/current?villageId=${testVillageId.toString()}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('3. 村情地图测试', () => {

    test('✅ POST /api/v1/village-map - 创建村庄地图', async () => {
      const response = await request(app)
        .post('/api/v1/village-map')
        .set('Authorization', authToken)
        .send({
          villageId: testVillageId.toString(),
          mapName: '测试村情地图',
          mapType: 'base',
          mapBounds: {
            northeast: { latitude: 40.0, longitude: 116.0 },
            southwest: { latitude: 39.0, longitude: 115.0 },
            center: { latitude: 39.5, longitude: 115.5 },
            zoomLevel: 15
          }
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mapName).toBe('测试村情地图');
    });

    test('✅ GET /api/v1/village-map/:villageId - 获取村庄地图', async () => {
      await VillageMap.create({
        villageId: testVillageId,
        mapName: '测试地图',
        mapType: 'base',
        isActive: true,
        mapBounds: {
          northeast: { latitude: 40.0, longitude: 116.0 },
          southwest: { latitude: 39.0, longitude: 115.0 },
          center: { latitude: 39.5, longitude: 115.5 },
          zoomLevel: 15
        }
      });

      const response = await request(app)
        .get(`/api/v1/village-map/${testVillageId.toString()}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('mapBounds');
    });

    test('✅ POST /api/v1/village-map/:mapId/features - 添加地图要素', async () => {
      const map = await VillageMap.create({
        villageId: testVillageId,
        mapName: '测试地图',
        mapType: 'base',
        isActive: true,
        mapBounds: {
          northeast: { latitude: 40.0, longitude: 116.0 },
          southwest: { latitude: 39.0, longitude: 115.0 },
          center: { latitude: 39.5, longitude: 115.5 },
          zoomLevel: 15
        }
      });

      const response = await request(app)
        .post(`/api/v1/village-map/${map._id}/features`)
        .set('Authorization', authToken)
        .send({
          featureType: 'building',
          geometry: {
            type: 'Point',
            coordinates: [115.5, 39.5]
          },
          properties: {
            name: '村委会大楼',
            type: 'government'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('4. 集成测试', () => {

    test('✅ 完整流程：创建村委 -> 创建值班表 -> 添加到地图', async () => {
      // 1. 创建村委成员
      const memberResponse = await request(app)
        .post('/api/v1/committee/members')
        .set('Authorization', authToken)
        .send({
          ...testCommitteeMemberData,
          villageId: testVillageId.toString()
        });

      expect(memberResponse.body.success).toBe(true);
      const memberId = memberResponse.body.data._id;

      // 2. 创建值班表
      const scheduleResponse = await request(app)
        .post('/api/v1/duty-schedule')
        .set('Authorization', authToken)
        .send({
          ...testDutyScheduleData,
          villageId: testVillageId.toString(),
          schedules: [{
            date: new Date('2025-02-01'),
            shifts: [{
              name: 'morning',
              personnel: [{
                memberId: memberId,
                name: testCommitteeMemberData.name,
                phone: testCommitteeMemberData.phone,
                position: testCommitteeMemberData.position.current
              }]
            }]
          }]
        });

      expect(scheduleResponse.body.success).toBe(true);

      // 3. 创建村庄地图并添加要素
      const mapResponse = await request(app)
        .post('/api/v1/village-map')
        .set('Authorization', authToken)
        .send({
          villageId: testVillageId.toString(),
          mapName: '完整测试地图',
          mapType: 'base',
          mapBounds: {
            northeast: { latitude: 40.0, longitude: 116.0 },
            southwest: { latitude: 39.0, longitude: 115.0 },
            center: { latitude: 39.5, longitude: 115.5 },
            zoomLevel: 15
          }
        });

      expect(mapResponse.body.success).toBe(true);
    });
  });
});
