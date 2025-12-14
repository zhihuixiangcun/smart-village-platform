const request = require('supertest');
const express = require('express');
const authRouter = require('../../src/routes/auth');
const TestHelpers = require('../helpers');

// Create a test app with the auth router
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth Routes Integration Tests', () => {
  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const loginData = {
        username: 'admin',
        password: 'password'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: '登录成功',
        data: {
          token: expect.any(String),
          user: {
            id: expect.any(Number),
            username: 'admin',
            name: '管理员',
            role: 'admin'
          }
        }
      });

      // Verify JWT token format
      expect(response.body.data.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    });

    test('should reject invalid username', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'password'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toMatchObject({
        status: 'error',
        message: '用户名或密码错误'
      });
    });

    test('should reject invalid password', async () => {
      const loginData = {
        username: 'admin',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toMatchObject({
        status: 'error',
        message: '用户名或密码错误'
      });
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        message: '输入验证失败',
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: '用户名不能为空'
          }),
          expect.objectContaining({
            msg: '密码至少6位'
          })
        ])
      });
    });

    test('should validate password length', async () => {
      const loginData = {
        username: 'admin',
        password: '123' // too short
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: '密码至少6位'
        })
      );
    });

    test('should login villager with valid credentials', async () => {
      const loginData = {
        username: 'villager',
        password: 'password'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.data.user).toMatchObject({
        username: 'villager',
        name: '村民',
        role: 'villager'
      });
    });
  });

  describe('POST /api/auth/register', () => {
    test('should register new user with valid data', async () => {
      const registerData = {
        username: 'newuser',
        password: 'password123',
        name: '新用户'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'success',
        message: '注册成功',
        data: {
          user: {
            id: expect.any(Number),
            username: 'newuser',
            name: '新用户',
            role: 'villager'
          }
        }
      });
    });

    test('should reject duplicate username', async () => {
      const registerData = {
        username: 'admin', // already exists
        password: 'password123',
        name: '测试用户'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(409);

      expect(response.body).toMatchObject({
        status: 'error',
        message: '用户名已存在'
      });
    });

    test('should validate registration fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        status: 'error',
        message: '输入验证失败',
        errors: expect.arrayContaining([
          expect.objectContaining({
            msg: '用户名至少3位'
          }),
          expect.objectContaining({
            msg: '密码至少6位'
          }),
          expect.objectContaining({
            msg: '姓名不能为空'
          })
        ])
      });
    });

    test('should validate username length', async () => {
      const registerData = {
        username: 'ab', // too short
        password: 'password123',
        name: '测试用户'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: '用户名至少3位'
        })
      );
    });

    test('should validate password length', async () => {
      const registerData = {
        username: 'testuser',
        password: '123', // too short
        name: '测试用户'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(400);

      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: '密码至少6位'
        })
      );
    });
  });

  describe('GET /api/auth/profile', () => {
    test('should return user profile', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        data: {
          user: {
            id: expect.any(Number),
            username: expect.any(String),
            name: expect.any(String),
            role: expect.any(String)
          }
        }
      });
    });
  });

  describe('Authentication Flow', () => {
    test('should complete full login-register-login cycle', async () => {
      // Register a new user
      const registerData = {
        username: 'flowtest',
        password: 'password123',
        name: '流程测试用户'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registerData)
        .expect(201);

      expect(registerResponse.body.data.user.username).toBe('flowtest');

      // Login with the new user
      const loginData = {
        username: 'flowtest',
        password: 'password123'
      };

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(loginResponse.body.data.user.username).toBe('flowtest');
      expect(loginResponse.body.data.token).toBeDefined();
    });
  });
});