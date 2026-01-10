/**
 * CORS安全策略配置
 * 根据环境动态配置CORS，加强生产环境安全性
 */

const allowedOrigins = {
  development: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:5000',
    'http://localhost:3006',
    'http://localhost:3007',
    'http://localhost:3008',
    'http://localhost:3009',
    'http://localhost:3010',
    'http://localhost:3011',
    'http://localhost:3012',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:3006',
    'http://127.0.0.1:3007',
    'http://127.0.0.1:3008',
    'http://127.0.0.1:3009',
    'http://127.0.0.1:3010',
    'http://127.0.0.1:3011',
    'http://127.0.0.1:3012'
  ],
  test: [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  production: [] // 生产环境必须明确配置
};

/**
 * 获取当前环境的允许源
 * @returns {Array} 允许的源列表
 */
function getAllowedOrigins() {
  const env = process.env.NODE_ENV || 'development';
  
  // 从环境变量获取额外的允许源
  const additionalOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];
  
  const baseOrigins = allowedOrigins[env] || allowedOrigins.development;
  
  return [...baseOrigins, ...additionalOrigins];
}

/**
 * 验证请求源是否被允许
 * @param {string} origin - 请求源
 * @returns {boolean} 是否被允许
 */
function isOriginAllowed(origin) {
  const allowedOrigins = getAllowedOrigins();
  
  // 生产环境严格检查
  if (process.env.NODE_ENV === 'production') {
    if (!origin) return false;
    return allowedOrigins.includes(origin);
  }
  
  // 开发环境更宽松
  return allowedOrigins.includes(origin) || allowedOrigins.length === 0;
}

/**
 * 生成CORS配置对象
 * @returns {object} CORS配置
 */
function generateCorsConfig() {
  const env = process.env.NODE_ENV || 'development';
  const origins = getAllowedOrigins();
  
  const config = {
    origin: (origin, callback) => {
      // 允许无origin的请求（如移动应用、Postman等）
      if (!origin) {
        return callback(null, true);
      }
      
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-User-Id',
      'X-Village-Id',
      'X-Session-Id',
      'X-Client-Version'
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-Request-ID',
      'X-Rate-Limit-Limit',
      'X-Rate-Limit-Remaining'
    ],
    maxAge: env === 'production' ? 86400 : 3600, // 生产环境24小时，开发环境1小时
    optionsSuccessStatus: 204
  };
  
  return config;
}

/**
 * CORS中间件日志
 * @param {object} req - Express请求对象
 * @param {object} res - Express响应对象
 * @param {Function} next - 下一个中间件
 */
function corsLogger(req, res, next) {
  const origin = req.headers.origin;
  const method = req.method;
  
  if (origin) {
    const allowed = isOriginAllowed(origin);
    
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.log(`[CORS] ${method} ${origin} -> ${allowed ? 'ALLOWED' : 'BLOCKED'}`);
    }
    
    // 如果不允许，记录安全事件
    if (!allowed && process.env.NODE_ENV === 'production') {
      console.error(`[CORS-SECURITY] Blocked unauthorized origin: ${origin} from IP: ${req.ip}`);
      // 这里可以添加告警或通知逻辑
    }
  }
  
  next();
}

/**
 * 预检请求处理
 * @param {object} req - Express请求对象
 * @param {object} res - Express响应对象
 * @param {Function} next - 下一个中间件
 */
function handlePreflight(req, res, next) {
  if (req.method === 'OPTIONS') {
    const corsConfig = generateCorsConfig();
    
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', corsConfig.methods.join(', '));
    res.header('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
    res.header('Access-Control-Max-Age', corsConfig.maxAge);
    res.header('Access-Control-Allow-Credentials', 'true');
    
    return res.status(204).end();
  }
  
  next();
}

/**
 * 验证CORS配置
 * @returns {object} 验证结果
 */
function validateCorsConfig() {
  const env = process.env.NODE_ENV || 'development';
  const origins = getAllowedOrigins();
  
  const result = {
    environment: env,
    allowedOrigins: origins,
    warnings: [],
    errors: []
  };
  
  // 检查生产环境配置
  if (env === 'production') {
    if (origins.length === 0) {
      result.errors.push('生产环境必须配置ALLOWED_ORIGINS');
    }
    
    if (origins.includes('*') || origins.includes('http://localhost:')) {
      result.warnings.push('生产环境不建议使用通配符或localhost');
    }
  }
  
  // 检查CLIENT_URL是否在允许列表中
  const clientUrl = process.env.CLIENT_URL;
  if (clientUrl && !isOriginAllowed(clientUrl)) {
    result.warnings.push(`CLIENT_URL (${clientUrl}) 不在允许的源列表中`);
  }
  
  return result;
}

/**
 * 安全的CORS中间件
 */
const secureCors = {
  config: generateCorsConfig(),
  logger: corsLogger,
  preflight: handlePreflight,
  validator: validateCorsConfig
};

// 启动时验证CORS配置
console.log('[CORS] Validating CORS configuration...');
const corsValidation = validateCorsConfig();

if (corsValidation.errors.length > 0) {
  console.error('[CORS] Configuration errors:');
  corsValidation.errors.forEach(error => console.error(`❌ ${error}`));
  process.exit(1);
}

if (corsValidation.warnings.length > 0) {
  console.warn('[CORS] Configuration warnings:');
  corsValidation.warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
}

console.log(`[CORS] Configuration loaded for ${corsValidation.environment} environment`);
console.log(`[CORS] Allowed origins: ${corsValidation.allowedOrigins.join(', ')}`);

module.exports = {
  secureCors,
  getAllowedOrigins,
  isOriginAllowed,
  generateCorsConfig,
  validateCorsConfig
};