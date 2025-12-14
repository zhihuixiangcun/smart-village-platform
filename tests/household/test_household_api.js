// 家庭档案API测试
const express = require('express');
const request = require('supertest');
const app = require('../../src/app');

describe('家庭档案API测试', () => {
  // 由于我们使用全局数据库服务，需要确保数据库已初始化
  beforeAll(async () => {
    // 确保数据库已初始化
    const dbService = app.get('dbService');
    if (dbService) {
      try {
        await dbService.init();
      } catch (error) {
        console.log('数据库已初始化或初始化失败:', error.message);
      }
    }
  });

  // 测试创建家庭档案
  test('POST /api/v1/households - 创建家庭档案', async () => {
    const householdData = {
      householdId: 'HH_TEST_001',
      familyHeadId: 'USER_TEST_001',
      familyHeadName: '测试户主',
      address: '测试地址123号',
      familyMembersCount: 3
    };

    const response = await request(app)
      .post('/api/v1/households')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .send(householdData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  // 测试获取家庭档案
  test('GET /api/v1/households/:householdId - 获取家庭档案', async () => {
    // 先创建一个家庭档案
    const householdData = {
      householdId: 'HH_TEST_002',
      familyHeadId: 'USER_TEST_002',
      familyHeadName: '测试户主2',
      address: '测试地址456号',
      familyMembersCount: 2
    };

    await request(app)
      .post('/api/v1/households')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .send(householdData);

    // 然后获取它
    const response = await request(app)
      .get('/api/v1/households/HH_TEST_002')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.household.householdId).toBe('HH_TEST_002');
  });

  // 测试更新家庭档案
  test('PUT /api/v1/households/:householdId - 更新家庭档案', async () => {
    // 先创建一个家庭档案
    const householdData = {
      householdId: 'HH_TEST_003',
      familyHeadId: 'USER_TEST_003',
      familyHeadName: '测试户主3',
      address: '测试地址789号',
      familyMembersCount: 4
    };

    await request(app)
      .post('/api/v1/households')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .send(householdData);

    // 然后更新它
    const updateData = {
      familyHeadName: '更新后的户主',
      address: '更新后的地址',
      familyMembersCount: 5
    };

    const response = await request(app)
      .put('/api/v1/households/HH_TEST_003')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .send(updateData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.familyHeadName).toBe('更新后的户主');
  });

  // 测试添加家庭成员
  test('POST /api/v1/households/:householdId/members - 添加家庭成员', async () => {
    // 先创建一个家庭档案
    const householdData = {
      householdId: 'HH_TEST_004',
      familyHeadId: 'USER_TEST_004',
      familyHeadName: '测试户主4',
      address: '测试地址999号',
      familyMembersCount: 1
    };

    await request(app)
      .post('/api/v1/households')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .send(householdData);

    // 然后添加家庭成员
    const memberData = {
      memberId: 'MEMBER_TEST_001',
      memberName: '测试成员',
      relationship: '子女',
      isMainContact: false
    };

    const response = await request(app)
      .post('/api/v1/households/HH_TEST_004/members')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .send(memberData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  // 测试获取家庭成员列表
  test('GET /api/v1/households/:householdId/members - 获取家庭成员列表', async () => {
    // 先创建一个家庭档案
    const householdData = {
      householdId: 'HH_TEST_005',
      familyHeadId: 'USER_TEST_005',
      familyHeadName: '测试户主5',
      address: '测试地址888号',
      familyMembersCount: 1
    };

    await request(app)
      .post('/api/v1/households')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .send(householdData);

    // 添加家庭成员
    const memberData = {
      memberId: 'MEMBER_TEST_002',
      memberName: '测试成员2',
      relationship: '配偶',
      isMainContact: true
    };

    await request(app)
      .post('/api/v1/households/HH_TEST_005/members')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .send(memberData);

    // 获取家庭成员列表
    const response = await request(app)
      .get('/api/v1/households/HH_TEST_005/members')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  // 测试二维码生成功能
  test('POST /api/v1/households/:householdId/qrcode - 生成二维码', async () => {
    // 先创建一个家庭档案
    const householdData = {
      householdId: 'HH_TEST_006',
      familyHeadId: 'USER_TEST_006',
      familyHeadName: '测试户主6',
      address: '测试地址777号',
      familyMembersCount: 2
    };

    await request(app)
      .post('/api/v1/households')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .send(householdData);

    // 生成二维码
    const response = await request(app)
      .post('/api/v1/households/HH_TEST_006/qrcode')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.qrContent).toBeDefined();
    expect(response.body.data.qrImage).toBeDefined();
  });

  // 测试二维码验证功能
  test('POST /api/v1/households/qrcode/verify - 验证二维码', async () => {
    // 先创建一个家庭档案并生成二维码
    const householdData = {
      householdId: 'HH_TEST_007',
      familyHeadId: 'USER_TEST_007',
      familyHeadName: '测试户主7',
      address: '测试地址666号',
      familyMembersCount: 3
    };

    await request(app)
      .post('/api/v1/households')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .send(householdData);

    // 生成二维码
    const qrResponse = await request(app)
      .post('/api/v1/households/HH_TEST_007/qrcode')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident');

    const qrContent = qrResponse.body.data.qrContent;

    // 验证二维码
    const response = await request(app)
      .post('/api/v1/households/qrcode/verify')
      .send({ qrContent })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.householdId).toBe('HH_TEST_007');
  });

  // 测试搜索功能
  test('GET /api/v1/households/search/:keyword - 搜索家庭档案', async () => {
    // 先创建一个家庭档案
    const householdData = {
      householdId: 'HH_TEST_SEARCH_001',
      familyHeadId: 'USER_TEST_SEARCH_001',
      familyHeadName: '搜索测试户主',
      address: '搜索测试地址',
      familyMembersCount: 2
    };

    await request(app)
      .post('/api/v1/households')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .send(householdData);

    // 搜索家庭档案
    const response = await request(app)
      .get('/api/v1/households/search/搜索测试')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  // 测试根据成员ID获取家庭信息
  test('GET /api/v1/households/members/search/:memberId - 根据成员ID获取家庭信息', async () => {
    // 先创建一个家庭档案
    const householdData = {
      householdId: 'HH_TEST_MEMBER_001',
      familyHeadId: 'USER_TEST_MEMBER_001',
      familyHeadName: '成员测试户主',
      address: '成员测试地址',
      familyMembersCount: 1
    };

    await request(app)
      .post('/api/v1/households')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .send(householdData);

    // 根据成员ID获取家庭信息
    const response = await request(app)
      .get('/api/v1/households/members/search/USER_TEST_MEMBER_001')
      .set('user-id', 'TEST_USER')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});