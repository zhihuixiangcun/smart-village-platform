/**
 * JWT密钥安全验证工具
 * 确保JWT密钥符合安全要求
 */

const crypto = require('crypto');

/**
 * 验证JWT密钥强度
 * @param {string} secret - JWT密钥
 * @returns {object} 验证结果
 */
function validateJWTSecret(secret) {
  const result = {
    isValid: false,
    errors: [],
    warnings: [],
    entropy: null
  };

  if (!secret) {
    result.errors.push('JWT_SECRET不能为空');
    return result;
  }

  // 检查长度
  if (secret.length < 32) {
    result.errors.push('JWT_SECRET长度至少需要32个字符');
  }

  // 检查是否使用了默认密钥
  const defaultSecrets = [
    'smart_village_jwt_secret_key_2024',
    'your_jwt_secret',
    'jwt_secret_key',
    'secret',
    'default_secret'
  ];

  if (defaultSecrets.includes(secret)) {
    result.errors.push('不能使用默认或示例密钥');
  }

  // 检查弱密钥模式
  const weakPatterns = [
    /^[a-zA-Z]+$/, // 纯字母
    /^[0-9]+$/, // 纯数字
    /^(.)\1+$/, // 重复字符
    /^.{1,10}$/, // 过短密钥
    /123456/, // 常见数字序列
    /password/i, // 包含password
    /secret/i // 包含secret
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(secret)) {
      result.warnings.push('JWT_SECRET可能过于简单，建议使用更复杂的密钥');
      break;
    }
  }

  // 计算熵值
  result.entropy = calculateEntropy(secret);
  if (result.entropy < 3.0) {
    result.warnings.push('JWT_SECRET复杂度较低，建议使用更高熵值的密钥');
  }

  // 检查字符多样性
  const hasUpper = /[A-Z]/.test(secret);
  const hasLower = /[a-z]/.test(secret);
  const hasNumbers = /[0-9]/.test(secret);
  const hasSymbols = /[^a-zA-Z0-9]/.test(secret);

  const charTypes = [hasUpper, hasLower, hasNumbers, hasSymbols].filter(Boolean).length;
  if (charTypes < 3) {
    result.warnings.push('建议使用包含大写字母、小写字母、数字和特殊字符的混合密钥');
  }

  result.isValid = result.errors.length === 0 && result.warnings.length <= 1;
  return result;
}

/**
 * 计算字符串的熵值
 * @param {string} str - 输入字符串
 * @returns {number} 熵值
 */
function calculateEntropy(str) {
  if (!str) return 0;

  const frequency = {};
  for (const char of str) {
    frequency[char] = (frequency[char] || 0) + 1;
  }

  let entropy = 0;
  const len = str.length;
  for (const char in frequency) {
    const p = frequency[char] / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * 生成安全的JWT密钥
 * @param {number} length - 密钥长度（默认64字节）
 * @returns {string} Base64编码的随机密钥
 */
function generateSecureJWTSecret(length = 64) {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * 验证环境变量中的JWT密钥
 * @returns {object} 验证结果
 */
function validateEnvironmentJWTSecret() {
  const secret = process.env.JWT_SECRET;
  const validation = validateJWTSecret(secret);

  if (!validation.isValid) {
    console.error('\n🚨 JWT密钥安全验证失败:');
    validation.errors.forEach(error => console.error(`❌ ${error}`));
    validation.warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
    
    console.error('\n🔧 解决方案:');
    console.error('1. 生成新的安全密钥:');
    console.error(`   node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"`);
    console.error('\n2. 更新.env文件中的JWT_SECRET值');
    console.error('\n3. 或者使用工具自动生成:');
    console.error(`   node scripts/generate-jwt-secret.js`);
    
    if (validation.errors.length > 0) {
      process.exit(1);
    }
  } else {
    console.log('✅ JWT密钥安全验证通过');
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
    }
  }

  return validation;
}

/**
 * 创建包含安全密钥的.env文件
 */
function createSecureEnvFile() {
  const secureSecret = generateSecureJWTSecret();
  const fs = require('fs');
  const path = require('path');

  const envContent = `# 智慧乡村平台 - 环境配置
# 生成时间: ${new Date().toISOString()}

# 服务器配置
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:3000

# 村务服务器配置
VILLAGE_SERVER_PORT=5000

# 数据库配置
MONGO_URI=mongodb://localhost:27017/smart_village
MONGO_TEST_URI=mongodb://localhost:27017/smart_village_test

# JWT 配置 - 已生成安全密钥
JWT_SECRET=${secureSecret}
JWT_EXPIRE=7d

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AI服务配置
# 百度语音合成
BAIDU_TTS_APP_ID=your_baidu_app_id
BAIDU_TTS_API_KEY=your_baidu_api_key
BAIDU_TTS_SECRET_KEY=your_baidu_secret_key

# 百度语音识别
BAIDU_ASR_APP_ID=your_baidu_asr_app_id
BAIDU_ASR_API_KEY=your_baidu_asr_api_key
BAIDU_ASR_SECRET_KEY=your_baidu_asr_secret_key

# OCR服务配置
# 腾讯云OCR
TENCENT_SECRET_ID=your_tencent_secret_id
TENCENT_SECRET_KEY=your_tencent_secret_key
TENCENT_REGION=ap-beijing

# 腾讯云人脸识别
TENCENT_FACE_SECRET_ID=your_tencent_face_secret_id
TENCENT_FACE_SECRET_KEY=your_tencent_face_secret_key
TENCENT_FACE_REGION=ap-beijing

# 短信服务配置
SMS_ACCESS_KEY_ID=your_sms_access_key
SMS_ACCESS_KEY_SECRET=your_sms_secret
SMS_SIGN_NAME=智慧乡村
SMS_TEMPLATE_CODE=SMS_123456789

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx

# 日志配置
LOG_LEVEL=info
LOG_FILE_PATH=./logs
`;

  try {
    fs.writeFileSync(path.join(__dirname, '../.env'), envContent);
    console.log('✅ 已创建包含安全JWT密钥的.env文件');
    console.log(`🔑 JWT密钥: ${secureSecret.substring(0, 16)}...`);
  } catch (error) {
    console.error('❌ 创建.env文件失败:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'generate':
      const secret = generateSecureJWTSecret();
      console.log('🔑 生成的安全JWT密钥:');
      console.log(secret);
      break;
    
    case 'validate':
      validateEnvironmentJWTSecret();
      break;
    
    case 'create-env':
      createSecureEnvFile();
      break;
    
    default:
      console.log('用法:');
      console.log('  node jwt-security.js validate    # 验证当前JWT密钥');
      console.log('  node jwt-security.js generate    # 生成新的安全密钥');
      console.log('  node jwt-security.js create-env  # 创建包含安全密钥的.env文件');
      break;
  }
}

module.exports = {
  validateJWTSecret,
  generateSecureJWTSecret,
  validateEnvironmentJWTSecret,
  createSecureEnvFile
};