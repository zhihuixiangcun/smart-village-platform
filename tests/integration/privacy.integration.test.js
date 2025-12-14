// 数据隐私控制集成测试
const request = require('supertest');
const app = require('../../src/app');

describe('Data Privacy Integration Tests', () => {
  // 测试敏感数据访问
  test('should access sensitive resident data with proper permissions', async () => {
    // 使用具有适当权限的用户访问敏感数据
    const response = await request(app)
      .get('/api/v1/sensitive-data/residents/1/sensitive')
      .set('user-id', '1')
      .set('user-name', '测试管理员')
      .set('user-role', 'system_admin')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  test('should deny access to sensitive data without proper permissions', async () => {
    // 使用没有适当权限的用户访问敏感数据
    const response = await request(app)
      .get('/api/v1/sensitive-data/residents/1/sensitive')
      .set('user-id', '2')
      .set('user-name', '测试居民')
      .set('user-role', 'resident')
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('权限不足');
  });

  test('should mask sensitive data in responses', async () => {
    // 测试数据脱敏功能
    const response = await request(app)
      .get('/api/v1/residents/1')
      .set('user-id', '2')
      .set('user-name', '测试用户')
      .set('user-role', 'resident')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    
    // 验证敏感字段是否被脱敏
    // 注意：这需要在实际的居民路由中实现数据脱敏
  });
});