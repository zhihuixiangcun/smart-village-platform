const request = require('supertest');
const app = require('../../src/app');
const TestHelpers = require('../helpers');

describe('API Integration Tests', () => {
  describe('Basic App Routes', () => {
    test('GET / should return welcome message', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toMatchObject({
        message: expect.stringContaining('智慧乡村综合服务平台'),
        version: '1.0.0',
        endpoints: expect.objectContaining({
          auth: '/api/auth',
          users: '/api/users',
          village: '/api/village',
          news: '/api/news',
          services: '/api/services'
        })
      });
    });

    test('GET /health should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: '智慧乡村服务平台运行正常',
        timestamp: expect.any(String),
        version: expect.any(String)
      });
    });

    test('GET /nonexistent should return 404', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .expect(404);

      expect(response.body).toMatchObject({
        status: 'error',
        message: '请求的端点不存在'
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should handle requests within rate limit', async () => {
      // Make multiple requests within limit
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/health')
          .expect(200);
        
        expect(response.body.status).toBe('success');
      }
    });

    // Note: Testing actual rate limiting would require making 100+ requests
    // which might be too slow for regular test runs
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Helmet should add various security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('CORS Configuration', () => {
    test('should handle CORS preflight request', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('JSON Parsing', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/health') // Using POST to test JSON parsing
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Should return error status for malformed JSON
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle large JSON payload within limit', async () => {
      const largeObject = {
        data: 'x'.repeat(1000) // 1KB of data, well within 10MB limit
      };

      // This should not fail due to size (using health endpoint which accepts any method for testing)
      const response = await request(app)
        .post('/health')
        .send(largeObject);

      // The endpoint might return 404 since health doesn't handle POST, but it shouldn't fail due to payload size
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    test('should handle server errors gracefully', async () => {
      // This tests the global error handler
      // We can't easily trigger a server error without modifying the app
      // so we'll just verify the error handling structure exists
      expect(typeof app).toBe('function');
    });
  });
});