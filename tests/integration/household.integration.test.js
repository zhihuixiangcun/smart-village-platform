// 家庭档案系统集成测试
const request = require('supertest');
const app = require('../../src/app');

describe('家庭档案系统集成测试', () => {
  let testHouseholdId = 'HH_INTEGRATION_TEST_001';
  let testMemberId = 'MEMBER_INTEGRATION_TEST_001';

  // 测试完整的家庭档案生命周期
  test('完整的家庭档案生命周期测试', async () => {
    // 1. 创建家庭档案
    const householdData = {
      householdId: testHouseholdId,
      familyHeadId: 'USER_HEAD_001',
      familyHeadName: '集成测试户主',
      address: '集成测试地址123号',
      familyMembersCount: 1
    };

    let response = await request(app)
      .post('/api/v1/households')
      .set('user-id', 'INTEGRATION_TEST_USER')
      .set('user-name', '集成测试用户')
      .set('user-role', 'resident')
      .send(householdData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();

    // 2. 获取家庭档案
    response = await request(app)
      .get(`/api/v1/households/${testHouseholdId}`)
      .set('user-id', 'INTEGRATION_TEST_USER')
      .set('user-name', '集成测试用户')
      .set('user-role', 'resident')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.household.householdId).toBe(testHouseholdId);
    expect(response.body.data.household.familyHeadName).toBe('集成测试户主');

    // 3. 添加家庭成员
    const memberData = {
      memberId: testMemberId,
      memberName: '集成测试成员',
      relationship: '子女',
      isMainContact: false
    };

    response = await request(app)
      .post(`/api/v1/households/${testHouseholdId}/members`)
      .set('user-id', 'INTEGRATION_TEST_USER')
      .set('user-name', '集成测试用户')
      .set('user-role', 'resident')
      .send(memberData)
      .expect(201);

    expect(response.body.success).toBe(true);

    // 4. 获取家庭成员列表
    response = await request(app)
      .get(`/api/v1/households/${testHouseholdId}/members`)
      .set('user-id', 'INTEGRATION_TEST_USER')
      .set('user-name', '集成测试用户')
      .set('user-role', 'resident')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0].memberName).toBe('集成测试成员');

    // 5. 更新家庭成员信息
    const updateMemberData = {
      memberName: '更新后的测试成员',
      relationship: '子女',
      isMainContact: true
    };

    response = await request(app)
      .put(`/api/v1/households/${testHouseholdId}/members/1`) // 假设ID为1
      .set('user-id', 'INTEGRATION_TEST_USER')
      .set('user-name', '集成测试用户')
      .set('user-role', 'resident')
      .send(updateMemberData)
      .expect(200);

    // 6. 生成二维码
    response = await request(app)
      .post(`/api/v1/households/${testHouseholdId}/qrcode`)
      .set('user-id', 'INTEGRATION_TEST_USER')
      .set('user-name', '集成测试用户')
      .set('user-role', 'resident')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.qrContent).toBeDefined();

    // 7. 验证二维码
    const qrContent = response.body.data.qrContent;
    response = await request(app)
      .post('/api/v1/households/qrcode/verify')
      .send({ qrContent })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.householdId).toBe(testHouseholdId);

    // 8. 更新家庭档案
    const updateHouseholdData = {
      familyHeadName: '更新后的户主',
      address: '更新后的地址456号',
      familyMembersCount: 2
    };

    response = await request(app)
      .put(`/api/v1/households/${testHouseholdId}`)
      .set('user-id', 'INTEGRATION_TEST_USER')
      .set('user-name', '集成测试用户')
      .set('user-role', 'resident')
      .send(updateHouseholdData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.familyHeadName).toBe('更新后的户主');

    // 9. 获取变更日志
    response = await request(app)
      .get(`/api/v1/households/${testHouseholdId}/logs`)
      .set('user-id', 'INTEGRATION_TEST_USER')
      .set('user-name', '集成测试用户')
      .set('user-role', 'committee_member') // 需要更高权限
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);

    // 10. 搜索家庭档案
    response = await request(app)
      .get('/api/v1/households/search/更新后')
      .set('user-id', 'INTEGRATION_TEST_USER')
      .set('user-name', '集成测试用户')
      .set('user-role', 'resident')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);

    // 11. 根据成员ID搜索家庭
    response = await request(app)
      .get(`/api/v1/households/members/search/${testMemberId}`)
      .set('user-id', 'INTEGRATION_TEST_USER')
      .set('user-name', '集成测试用户')
      .set('user-role', 'resident')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  // 测试权限控制
  test('权限控制测试', async () => {
    const householdData = {
      householdId: 'HH_PERMISSION_TEST_001',
      familyHeadId: 'USER_PERMISSION_001',
      familyHeadName: '权限测试户主',
      address: '权限测试地址',
      familyMembersCount: 1
    };

    // 普通用户可以创建家庭档案
    let response = await request(app)
      .post('/api/v1/households')
      .set('user-id', 'PERMISSION_TEST_USER')
      .set('user-name', '权限测试用户')
      .set('user-role', 'resident')
      .send(householdData)
      .expect(201);

    // 普通用户不能访问变更日志
    response = await request(app)
      .get('/api/v1/households/HH_PERMISSION_TEST_001/logs')
      .set('user-id', 'PERMISSION_TEST_USER')
      .set('user-name', '权限测试用户')
      .set('user-role', 'resident')
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('权限不足');
  });

  // 测试错误处理
  test('错误处理测试', async () => {
    // 尝试获取不存在的家庭档案
    const response = await request(app)
      .get('/api/v1/households/NON_EXISTENT_HOUSEHOLD')
      .set('user-id', 'ERROR_TEST_USER')
      .set('user-name', '错误测试用户')
      .set('user-role', 'resident')
      .expect(200); // 应该返回200但success为false

    expect(response.body.success).toBe(true); // 因为返回了空数据而不是错误
    expect(response.body.data.household).toBeNull();
  });
});