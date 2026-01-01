/**
 * 村务服务主应用
 * 负责村务治理、公告会议、任务调度等功能
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');

// 导入配置
const database = require('./config/database');
const logger = require('./utils/logger');

// 导入路由
const announcementRoutes = require('./routes/announcements');
const meetingRoutes = require('./routes/meetings');
const taskRoutes = require('./routes/tasks');

// 导入模型
const Announcement = require('./models/Announcement');
const Meeting = require('./models/Meeting');
const Task = require('./models/Task');

class GovernanceService {
  constructor() {
    this.app = express();
    this.server = null;
    this.io = null;
    this.port = process.env.PORT || 5002;
    this.consul = null;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * 设置中间件
   */
  setupMiddleware() {
    // 安全中间件
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));

    // CORS配置
    this.app.use(cors({
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    }));

    // 限流配置
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 1000, // 限制每个IP 15分钟内最多1000个请求
      message: {
        success: false,
        message: '请求过于频繁，请稍后再试'
      }
    });
    this.app.use('/api/', limiter);

    // 解析中间件
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 请求日志
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  /**
   * 设置路由
   */
  setupRoutes() {
    // 健康检查
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealth = await database.healthCheck();
        res.json({
          success: true,
          service: 'governance-service',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: dbHealth,
          version: process.env.npm_package_version || '1.0.0'
        });
      } catch (error) {
        res.status(503).json({
          success: false,
          service: 'governance-service',
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // API路由
    this.app.use('/api/announcements', announcementRoutes);
    this.app.use('/api/meetings', meetingRoutes);
    this.app.use('/api/tasks', taskRoutes);

    // 根路径
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        service: 'governance-service',
        message: '智慧乡村村务服务运行中',
        version: process.env.npm_package_version || '1.0.0',
        apis: {
          announcements: '/api/announcements',
          meetings: '/api/meetings',
          tasks: '/api/tasks'
        }
      });
    });

    // 404处理
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: '接口不存在',
        path: req.originalUrl
      });
    });
  }

  /**
   * 设置错误处理
   */
  setupErrorHandling() {
    // 全局错误处理
    this.app.use((error, req, res, next) => {
      logger.error('全局错误处理:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
      });

      // Mongoose验证错误
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: '数据验证失败',
          errors
        });
      }

      // Mongoose重复键错误
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: '数据重复，请检查唯一性字段'
        });
      }

      // JWT错误
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: '令牌无效'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: '令牌已过期'
        });
      }

      // 默认错误
      res.status(error.status || 500).json({
        success: false,
        message: error.message || '服务器内部错误',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    });

    // 未捕获的异常处理
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常:', error);
      process.exit(1);
    });

    // 未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝:', { reason, promise });
      process.exit(1);
    });

    // 优雅关闭
    process.on('SIGTERM', () => {
      logger.info('收到SIGTERM信号，开始优雅关闭...');
      this.gracefulShutdown();
    });

    process.on('SIGINT', () => {
      logger.info('收到SIGINT信号，开始优雅关闭...');
      this.gracefulShutdown();
    });
  }

  /**
   * 初始化Socket.IO
   */
  setupSocketIO() {
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket) => {
      logger.info('客户端连接:', socket.id);

      // 加入房间（村庄、会议室等）
      socket.on('join-room', (roomData) => {
        const { room, type } = roomData;
        socket.join(room);
        logger.info(`客户端 ${socket.id} 加入房间: ${room}`);
      });

      // 离开房间
      socket.on('leave-room', (roomData) => {
        const { room } = roomData;
        socket.leave(room);
        logger.info(`客户端 ${socket.id} 离开房间: ${room}`);
      });

      // 实时通知
      socket.on('notification', (data) => {
        this.io.to(data.room).emit('notification', data);
      });

      // 断开连接
      socket.on('disconnect', () => {
        logger.info('客户端断开连接:', socket.id);
      });
    });
  }

  /**
   * 注册到Consul
   */
  async registerToConsul() {
    try {
      const consul = require('consul')({
        host: process.env.CONSUL_HOST || 'localhost',
        port: process.env.CONSUL_PORT || 8500
      });

      const serviceId = `governance-service-${process.env.HOSTNAME || Date.now()}`;

      await consul.agent.service.register({
        id: serviceId,
        name: 'governance-service',
        address: process.env.SERVICE_HOST || 'localhost',
        port: this.port,
        tags: ['governance', 'microservice', 'smart-village'],
        check: {
          http: `http://${process.env.SERVICE_HOST || 'localhost'}:${this.port}/health`,
          interval: '10s',
          timeout: '5s'
        }
      });

      this.consul = consul;
      logger.info('服务注册到Consul成功:', serviceId);
    } catch (error) {
      logger.error('注册到Consul失败:', error);
    }
  }

  /**
   * 从Consul注销
   */
  async deregisterFromConsul() {
    try {
      if (this.consul) {
        const serviceId = `governance-service-${process.env.HOSTNAME || Date.now()}`;
        await this.consul.agent.service.deregister(serviceId);
        logger.info('服务从Consul注销成功:', serviceId);
      }
    } catch (error) {
      logger.error('从Consul注销失败:', error);
    }
  }

  /**
   * 启动服务
   */
  async start() {
    try {
      // 连接数据库
      await database.connect();

      // 初始化Socket.IO
      this.setupSocketIO();

      // 注册到Consul
      if (process.env.NODE_ENV !== 'test') {
        await this.registerToConsul();
      }

      // 启动HTTP服务器
      this.server.listen(this.port, () => {
        logger.info(`村务服务启动成功，端口: ${this.port}`);
        logger.info(`服务地址: http://localhost:${this.port}`);
        logger.info(`健康检查: http://localhost:${this.port}/health`);
      });

    } catch (error) {
      logger.error('启动服务失败:', error);
      process.exit(1);
    }
  }

  /**
   * 优雅关闭
   */
  async gracefulShutdown() {
    try {
      logger.info('开始优雅关闭服务...');

      // 从Consul注销
      await this.deregisterFromConsul();

      // 关闭HTTP服务器
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        logger.info('HTTP服务器已关闭');
      }

      // 关闭Socket.IO
      if (this.io) {
        this.io.close();
        logger.info('Socket.IO已关闭');
      }

      // 关闭数据库连接
      await database.disconnect();

      logger.info('服务优雅关闭完成');
      process.exit(0);
    } catch (error) {
      logger.error('优雅关闭失败:', error);
      process.exit(1);
    }
  }
}

// 启动服务
if (require.main === module) {
  const governanceService = new GovernanceService();
  governanceService.start();
}

module.exports = GovernanceService;