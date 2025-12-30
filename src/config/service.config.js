/**
 * 服务配置中心
 * 集中管理所有服务URL和端口配置，避免硬编码
 */

// 从环境变量读取配置，提供合理的默认值
const config = {
  // 后端API服务器配置
  api: {
    port: parseInt(process.env.PORT) || 3001,
    host: process.env.API_HOST || 'localhost',
    protocol: process.env.API_PROTOCOL || 'http',
    // 完整的API基础URL
    get baseUrl() {
      return `${this.protocol}://${this.host}:${this.port}`;
    }
  },

  // 村务服务器配置
  villageServer: {
    port: parseInt(process.env.VILLAGE_SERVER_PORT) || 5000,
    host: process.env.VILLAGE_SERVER_HOST || 'localhost',
    protocol: process.env.VILLAGE_SERVER_PROTOCOL || 'http',
    get baseUrl() {
      return `${this.protocol}://${this.host}:${this.port}`;
    }
  },

  // 前端客户端配置
  client: {
    port: parseInt(process.env.CLIENT_PORT) || 3000,
    host: process.env.CLIENT_HOST || 'localhost',
    protocol: process.env.CLIENT_PROTOCOL || 'http',
    get baseUrl() {
      return `${this.protocol}://${this.host}:${this.port}`;
    }
  },

  // 数据库配置
  database: {
    mongo: {
      uri: process.env.MONGO_URI || 'mongodb://localhost:27017/smart_village',
      testUri: process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/smart_village_test',
      host: process.env.MONGO_HOST || 'localhost',
      port: parseInt(process.env.MONGO_PORT) || 27017,
      database: process.env.MONGO_DATABASE || 'smart_village'
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || '',
      get url() {
        return `redis://${this.host}:${this.port}`;
      }
    }
  },

  // WebSocket配置
  websocket: {
    port: parseInt(process.env.WS_PORT) || 3001,
    host: process.env.WS_HOST || 'localhost',
    protocol: process.env.WS_PROTOCOL || 'ws',
    get url() {
      return `${this.protocol}://${this.host}:${this.port}`;
    },
    // 客户端WebSocket路径
    path: process.env.WS_PATH || '/socket.io/'
  },

  // 监控服务配置
  monitoring: {
    port: parseInt(process.env.MONITORING_PORT) || 3001,
    host: process.env.MONITORING_HOST || 'localhost',
    protocol: process.env.MONITORING_PROTOCOL || 'http',
    get baseUrl() {
      return `${this.protocol}://${this.host}:${this.port}/monitoring`;
    }
  },

  // 文件上传配置
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10485760, // 10MB
    allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx').split(','),
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    get baseUrl() {
      return `${this.baseUrl}/uploads`;
    }
  },

  // 外部服务配置
  external: {
    // 百度AI服务
    baidu: {
      tts: {
        appId: process.env.BAIDU_TTS_APP_ID,
        apiKey: process.env.BAIDU_TTS_API_KEY,
        secretKey: process.env.BAIDU_TTS_SECRET_KEY
      },
      asr: {
        appId: process.env.BAIDU_ASR_APP_ID,
        apiKey: process.env.BAIDU_ASR_API_KEY,
        secretKey: process.env.BAIDU_ASR_SECRET_KEY
      }
    },
    // 腾讯云服务
    tencent: {
      ocr: {
        secretId: process.env.TENCENT_SECRET_ID,
        secretKey: process.env.TENCENT_SECRET_KEY,
        region: process.env.TENCENT_REGION || 'ap-beijing'
      },
      face: {
        secretId: process.env.TENCENT_FACE_SECRET_ID,
        secretKey: process.env.TENCENT_FACE_SECRET_KEY,
        region: process.env.TENCENT_FACE_REGION || 'ap-beijing'
      }
    }
  }
};

/**
 * 根据环境返回配置
 */
const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    // 生产环境覆盖
    config.api.host = process.env.API_HOST || config.api.host;
    config.villageServer.host = process.env.VILLAGE_SERVER_HOST || config.villageServer.host;
    config.client.host = process.env.CLIENT_HOST || config.client.host;
    config.database.redis.host = process.env.REDIS_HOST || config.database.redis.host;
    config.database.mongo.host = process.env.MONGO_HOST || config.database.mongo.host;
  }

  return config;
};

/**
 * 获取完整的API URL
 */
const getApiUrl = (path = '') => {
  const cfg = getConfig();
  return `${cfg.api.baseUrl}${path.startsWith('/') ? path : '/' + path}`;
};

/**
 * 获取WebSocket URL
 */
const getWebSocketUrl = (path = '') => {
  const cfg = getConfig();
  return `${cfg.websocket.url}${path || ''}`;
};

/**
 * 获取前端URL
 */
const getClientUrl = (path = '') => {
  const cfg = getConfig();
  return `${cfg.client.baseUrl}${path.startsWith('/') ? path : '/' + path}`;
};

/**
 * 获取监控面板URL
 */
const getMonitoringUrl = () => {
  const cfg = getConfig();
  return cfg.monitoring.baseUrl;
};

module.exports = {
  config: getConfig(),
  getApiUrl,
  getWebSocketUrl,
  getClientUrl,
  getMonitoringUrl
};
