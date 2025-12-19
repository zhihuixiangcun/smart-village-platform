/**
 * 安全审计服务
 * 对现有系统进行全面安全评估和漏洞扫描
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const EventEmitter = require('events')
const logger = require('../config/logger')

class SecurityAuditService extends EventEmitter {
  constructor() {
    super()

    // 安全检查配置
    this.auditConfig = {
      // 密码安全检查
      passwordSecurity: {
        minStrength: 3, // 最低密码强度 (1-5)
        checkCommonPasswords: true,
        checkPasswordReuse: true,
        checkDictionaryWords: true
      },

      // API安全检查
      apiSecurity: {
        checkAuthentication: true,
        checkAuthorization: true,
        checkRateLimiting: true,
        checkInputValidation: true,
        checkCORSConfiguration: true,
        checkSecurityHeaders: true
      },

      // 数据安全检查
      dataSecurity: {
        checkEncryption: true,
        checkDataSanitization: true,
        checkDataBackup: true,
        checkDataRetention: true,
        checkPIIData: true
      },

      // 网络安全检查
      networkSecurity: {
        checkSSLConfiguration: true,
        checkFirewallRules: true,
        checkPortSecurity: true,
        checkDNSConfiguration: true
      },

      // 应用安全检查
      applicationSecurity: {
        checkDependencyVulnerabilities: true,
        checkEnvironmentVariables: true,
        checkFilePermissions: true,
        checkLoggingConfiguration: true,
        checkSessionManagement: true
      },

      // 数据库安全检查
      databaseSecurity: {
        checkConnectionSecurity: true,
        checkAccessControl: true,
        checkSQLInjection: true,
        checkDataEncryption: true,
        checkBackupConfiguration: true
      }
    }

    // 常见弱密码列表
    this.commonPasswords = [
      '123456', 'password', '12345678', 'qwerty', '123456789',
      '12345', '1234', '111111', '1234567', 'dragon',
      'master', 'monkey', 'letmein', 'change1', 'football'
    ]

    // 敏感文件扩展名
    this.sensitiveExtensions = [
      '.env', '.pem', '.key', '.crt', '.p12', '.pfx',
      '.db', '.sqlite', '.backup', '.bak', '.old'
    ]

    // 安全报告模板
    this.reportTemplate = {
      scanInfo: {
        scanId: '',
        scanDate: '',
        scannerVersion: '1.0.0',
        environment: '',
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0
      },
      categories: [],
      recommendations: [],
      compliance: {
        gdpr: {},
        pciDss: {},
        sox: {}
      }
    }
  }

  /**
   * 执行全面安全审计
   * @param {Object} options - 审计选项
   * @returns {Promise<Object>} 审计结果
   */
  async performFullSecurityAudit(options = {}) {
    try {
      logger.info('开始执行全面安全审计')

      const scanId = crypto.randomUUID()
      const report = JSON.parse(JSON.stringify(this.reportTemplate))

      report.scanInfo.scanId = scanId
      report.scanInfo.scanDate = new Date().toISOString()
      report.scanInfo.environment = process.env.NODE_ENV || 'development'

      this.emit('auditStarted', { scanId })

      // 1. 密码安全检查
      if (this.auditConfig.passwordSecurity) {
        const passwordSecurity = await this.checkPasswordSecurity()
        report.categories.push(passwordSecurity)
      }

      // 2. API安全检查
      if (this.auditConfig.apiSecurity) {
        const apiSecurity = await this.checkAPISecurity()
        report.categories.push(apiSecurity)
      }

      // 3. 数据安全检查
      if (this.auditConfig.dataSecurity) {
        const dataSecurity = await this.checkDataSecurity()
        report.categories.push(dataSecurity)
      }

      // 4. 网络安全检查
      if (this.auditConfig.networkSecurity) {
        const networkSecurity = await this.checkNetworkSecurity()
        report.categories.push(networkSecurity)
      }

      // 5. 应用安全检查
      if (this.auditConfig.applicationSecurity) {
        const applicationSecurity = await this.checkApplicationSecurity()
        report.categories.push(applicationSecurity)
      }

      // 6. 数据库安全检查
      if (this.auditConfig.databaseSecurity) {
        const databaseSecurity = await this.checkDatabaseSecurity()
        report.categories.push(databaseSecurity)
      }

      // 7. 文件系统安全检查
      const fileSystemSecurity = await this.checkFileSystemSecurity()
      report.categories.push(fileSystemSecurity)

      // 8. 环境安全检查
      const environmentSecurity = await this.checkEnvironmentSecurity()
      report.categories.push(environmentSecurity)

      // 统计问题数量
      this.calculateIssueStatistics(report)

      // 生成建议
      report.recommendations = this.generateRecommendations(report)

      // 评估合规性
      report.compliance = await this.assessCompliance(report)

      this.emit('auditCompleted', { scanId, report })

      logger.info(`安全审计完成: ${scanId}`, {
        totalIssues: report.scanInfo.totalIssues,
        criticalIssues: report.scanInfo.criticalIssues
      })

      return {
        success: true,
        scanId,
        report
      }

    } catch (error) {
      logger.error('安全审计失败:', error)
      this.emit('auditFailed', { error: error.message })
      throw error
    }
  }

  /**
   * 检查密码安全
   * @returns {Promise<Object>} 密码安全检查结果
   */
  async checkPasswordSecurity() {
    const category = {
      name: '密码安全',
      description: '检查密码策略、强度和存储安全',
      issues: [],
      score: 0
    }

    try {
      // 检查密码策略配置
      const passwordPolicyIssues = this.checkPasswordPolicy()
      category.issues.push(...passwordPolicyIssues)

      // 检查用户密码强度
      const passwordStrengthIssues = await this.checkUserPasswordStrength()
      category.issues.push(...passwordStrengthIssues)

      // 检查密码存储方式
      const passwordStorageIssues = this.checkPasswordStorage()
      category.issues.push(...passwordStorageIssues)

      // 计算分数
      category.score = this.calculateCategoryScore(category.issues)

      return category

    } catch (error) {
      logger.error('密码安全检查失败:', error)
      category.issues.push({
        severity: 'medium',
        title: '密码安全检查失败',
        description: `无法完成密码安全检查: ${error.message}`,
        recommendation: '请检查密码安全检查配置'
      })
      return category
    }
  }

  /**
   * 检查API安全
   * @returns {Promise<Object>} API安全检查结果
   */
  async checkAPISecurity() {
    const category = {
      name: 'API安全',
      description: '检查API认证、授权、输入验证和安全配置',
      issues: [],
      score: 0
    }

    try {
      // 检查认证机制
      const authIssues = this.checkAPIAuthentication()
      category.issues.push(...authIssues)

      // 检查授权机制
      const authzIssues = this.checkAPIAuthorization()
      category.issues.push(...authzIssues)

      // 检查输入验证
      const validationIssues = this.checkInputValidation()
      category.issues.push(...validationIssues)

      // 检查CORS配置
      const corsIssues = this.checkCORSConfiguration()
      category.issues.push(...corsIssues)

      // 检查安全头
      const headersIssues = this.checkSecurityHeaders()
      category.issues.push(...headersIssues)

      // 检查限流配置
      const rateLimitIssues = this.checkRateLimiting()
      category.issues.push(...rateLimitIssues)

      // 计算分数
      category.score = this.calculateCategoryScore(category.issues)

      return category

    } catch (error) {
      logger.error('API安全检查失败:', error)
      category.issues.push({
        severity: 'medium',
        title: 'API安全检查失败',
        description: `无法完成API安全检查: ${error.message}`,
        recommendation: '请检查API安全检查配置'
      })
      return category
    }
  }

  /**
   * 检查数据安全
   * @returns {Promise<Object>} 数据安全检查结果
   */
  async checkDataSecurity() {
    const category = {
      name: '数据安全',
      description: '检查数据加密、脱敏、备份和隐私保护',
      issues: [],
      score: 0
    }

    try {
      // 检查加密配置
      const encryptionIssues = this.checkDataEncryption()
      category.issues.push(...encryptionIssues)

      // 检查数据脱敏
      const sanitizationIssues = this.checkDataSanitization()
      category.issues.push(...sanitizationIssues)

      // 检查备份配置
      const backupIssues = this.checkDataBackup()
      category.issues.push(...backupIssues)

      // 检查数据保留策略
      const retentionIssues = this.checkDataRetention()
      category.issues.push(...retentionIssues)

      // 检查PII数据处理
      const piiIssues = this.checkPIIDataHandling()
      category.issues.push(...piiIssues)

      // 计算分数
      category.score = this.calculateCategoryScore(category.issues)

      return category

    } catch (error) {
      logger.error('数据安全检查失败:', error)
      category.issues.push({
        severity: 'medium',
        title: '数据安全检查失败',
        description: `无法完成数据安全检查: ${error.message}`,
        recommendation: '请检查数据安全检查配置'
      })
      return category
    }
  }

  /**
   * 检查文件系统安全
   * @returns {Promise<Object>} 文件系统安全检查结果
   */
  async checkFileSystemSecurity() {
    const category = {
      name: '文件系统安全',
      description: '检查敏感文件、目录权限和文件访问控制',
      issues: [],
      score: 0
    }

    try {
      // 检查敏感文件暴露
      const sensitiveFileIssues = this.checkSensitiveFiles()
      category.issues.push(...sensitiveFileIssues)

      // 检查文件权限
      const filePermissionIssues = this.checkFilePermissions()
      category.issues.push(...filePermissionIssues)

      // 检查临时文件
      const tempFileIssues = this.checkTemporaryFiles()
      category.issues.push(...tempFileIssues)

      // 检查日志文件安全
      const logFileIssues = this.checkLogFileSecurity()
      category.issues.push(...logFileIssues)

      // 计算分数
      category.score = this.calculateCategoryScore(category.issues)

      return category

    } catch (error) {
      logger.error('文件系统安全检查失败:', error)
      category.issues.push({
        severity: 'medium',
        title: '文件系统安全检查失败',
        description: `无法完成文件系统安全检查: ${error.message}`,
        recommendation: '请检查文件系统安全检查配置'
      })
      return category
    }
  }

  /**
   * 检查环境安全
   * @returns {Promise<Object>} 环境安全检查结果
   */
  async checkEnvironmentSecurity() {
    const category = {
      name: '环境安全',
      description: '检查环境变量、配置文件和运行时安全',
      issues: [],
      score: 0
    }

    try {
      // 检查环境变量
      const envVarIssues = this.checkEnvironmentVariables()
      category.issues.push(...envVarIssues)

      // 检查配置文件
      const configIssues = this.checkConfigurationFiles()
      category.issues.push(...configIssues)

      // 检查运行时环境
      const runtimeIssues = this.checkRuntimeEnvironment()
      category.issues.push(...runtimeIssues)

      // 检查依赖安全
      const dependencyIssues = this.checkDependencySecurity()
      category.issues.push(...dependencyIssues)

      // 计算分数
      category.score = this.calculateCategoryScore(category.issues)

      return category

    } catch (error) {
      logger.error('环境安全检查失败:', error)
      category.issues.push({
        severity: 'medium',
        title: '环境安全检查失败',
        description: `无法完成环境安全检查: ${error.message}`,
        recommendation: '请检查环境安全检查配置'
      })
      return category
    }
  }

  /**
   * 检查密码策略配置
   * @returns {Array} 问题列表
   */
  checkPasswordPolicy() {
    const issues = []

    // 检查密码长度要求
    if (!process.env.PASSWORD_MIN_LENGTH || parseInt(process.env.PASSWORD_MIN_LENGTH) < 8) {
      issues.push({
        severity: 'medium',
        title: '密码长度要求不足',
        description: '密码最小长度应至少为8个字符',
        recommendation: '设置PASSWORD_MIN_LENGTH=8或更高',
        owaspCategory: 'A07: Identification and Authentication Failure'
      })
    }

    // 检查密码复杂度要求
    if (!process.env.PASSWORD_REQUIRE_COMPLEXITY || process.env.PASSWORD_REQUIRE_COMPLEXITY !== 'true') {
      issues.push({
        severity: 'medium',
        title: '缺少密码复杂度要求',
        description: '应要求密码包含大小写字母、数字和特殊字符',
        recommendation: '启用密码复杂度验证',
        owaspCategory: 'A07: Identification and Authentication Failure'
      })
    }

    return issues
  }

  /**
   * 检查用户密码强度
   * @returns {Promise<Array>} 问题列表
   */
  async checkUserPasswordStrength() {
    const issues = []

    try {
      const User = require('../models/User')
      const users = await User.find({}, { password: 1 })

      let weakPasswords = 0
      let reusedPasswords = 0

      const passwordMap = new Map()

      for (const user of users) {
        if (!user.password) continue

        // 检查是否使用常见密码
        if (this.isCommonPassword(user.password)) {
          weakPasswords++
          issues.push({
            severity: 'high',
            title: '用户使用弱密码',
            description: `用户 ${user._id} 使用了常见弱密码`,
            recommendation: '强制用户更改密码并启用密码强度检查',
            userId: user._id,
            owaspCategory: 'A07: Identification and Authentication Failure'
          })
        }

        // 检查密码重用
        const passwordHash = crypto.createHash('sha256').update(user.password).digest('hex')
        if (passwordMap.has(passwordHash)) {
          reusedPasswords++
          issues.push({
            severity: 'medium',
            title: '密码重用',
            description: `用户 ${user._id} 与其他用户使用相同密码`,
            recommendation: '实施唯一密码策略',
            userId: user._id,
            owaspCategory: 'A07: Identification and Authentication Failure'
          })
        } else {
          passwordMap.set(passwordHash, [user._id])
        }
      }

      if (weakPasswords > 0) {
        issues.push({
          severity: 'high',
          title: '发现多个弱密码',
          description: `共发现 ${weakPasswords} 个用户使用弱密码`,
          recommendation: '立即强制所有用户更改密码'
        })
      }

    } catch (error) {
      issues.push({
        severity: 'medium',
        title: '密码强度检查失败',
        description: `无法检查用户密码强度: ${error.message}`,
        recommendation: '检查数据库连接和用户模型'
      })
    }

    return issues
  }

  /**
   * 检查密码存储方式
   * @returns {Array} 问题列表
   */
  checkPasswordStorage() {
    const issues = []

    // 检查是否使用加密存储
    if (!process.env.PASSWORD_HASH_ALGORITHM || process.env.PASSWORD_HASH_ALGORITHM !== 'bcrypt') {
      issues.push({
        severity: 'high',
        title: '密码存储不安全',
        description: '应使用bcrypt等安全的密码哈希算法',
        recommendation: '使用PASSWORD_HASH_ALGORITHM=bcrypt',
        owaspCategory: 'A02: Cryptographic Failures'
      })
    }

    // 检查密码盐值
    if (process.env.PASSWORD_SALT_ROUNDS && parseInt(process.env.PASSWORD_SALT_ROUNDS) < 10) {
      issues.push({
        severity: 'medium',
        title: '密码盐值轮次不足',
        description: 'bcrypt盐值轮数应至少为10',
        recommendation: '设置PASSWORD_SALT_ROUNDS=12或更高',
        owaspCategory: 'A02: Cryptographic Failures'
      })
    }

    return issues
  }

  /**
   * 检查敏感文件
   * @returns {Array} 问题列表
   */
  checkSensitiveFiles() {
    const issues = []
    const projectRoot = path.join(__dirname, '../..')

    // 检查常见敏感文件
    const sensitiveFiles = [
      '.env',
      '.env.example',
      'package.json',
      'package-lock.json',
      '.git/config',
      '.git/logs'
    ]

    for (const file of sensitiveFiles) {
      const filePath = path.join(projectRoot, file)
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath)

        // 检查文件权限
        const mode = (stat.mode & parseInt('777', 8)).toString(8)

        if (mode === '777' || mode === '666') {
          issues.push({
            severity: 'high',
            title: '敏感文件权限过于宽松',
            description: `文件 ${file} 的权限为 ${mode}，过于宽松`,
            recommendation: `设置更严格的文件权限: chmod 600 ${file}`,
            filePath,
            owaspCategory: 'A05: Security Misconfiguration'
          })
        }

        // 检查是否包含敏感信息
        if (this.containsSensitiveData(filePath)) {
          issues.push({
            severity: 'high',
            title: '文件包含敏感信息',
            description: `文件 ${file} 可能包含敏感信息`,
            recommendation: '移除敏感信息或加密存储',
            filePath,
            owaspCategory: 'A03: Injection'
          })
        }
      }
    }

    return issues
  }

  /**
   * 检查文件权限
   * @returns {Array} 问题列表
   */
  checkFilePermissions() {
    const issues = []
    const projectRoot = path.join(__dirname, '../..')

    // 检查重要目录权限
    const directories = [
      'src/controllers',
      'src/services',
      'src/models',
      'src/middleware',
      'src/routes'
    ]

    for (const dir of directories) {
      const dirPath = path.join(projectRoot, dir)
      if (fs.existsSync(dirPath)) {
        const stat = fs.statSync(dirPath)
        const mode = (stat.mode & parseInt('777', 8)).toString(8)

        // 目录权限过于宽松
        if (mode === '777') {
          issues.push({
            severity: 'medium',
            title: '目录权限过于宽松',
            description: `目录 ${dir} 的权限为 777`,
            recommendation: `设置更严格的目录权限: chmod 755 ${dir}`,
            dirPath,
            owaspCategory: 'A05: Security Misconfiguration'
          })
        }
      }
    }

    return issues
  }

  /**
   * 检查环境变量
   * @returns {Array} 问题列表
   */
  checkEnvironmentVariables() {
    const issues = []

    // 检查默认密钥
    if (process.env.JWT_SECRET === 'your-secret-key' || !process.env.JWT_SECRET) {
      issues.push({
        severity: 'critical',
        title: '使用默认或空的JWT密钥',
        description: 'JWT密钥应使用强随机字符串',
        recommendation: '设置强随机JWT_SECRET环境变量',
        owaspCategory: 'A02: Cryptographic Failures'
      })
    }

    if (process.env.DB_PASSWORD === 'password' || !process.env.DB_PASSWORD) {
      issues.push({
        severity: 'critical',
        title: '数据库密码不安全',
        description: '数据库密码应使用强密码',
        recommendation: '设置强数据库密码并使用环境变量存储',
        owaspCategory: 'A02: Cryptographic Failures'
      })
    }

    // 检查明文传输
    if (process.env.NODE_ENV === 'production' && !process.env.FORCE_HTTPS) {
      issues.push({
        severity: 'high',
        title: '生产环境未强制HTTPS',
        description: '生产环境应强制使用HTTPS传输',
        recommendation: '设置FORCE_HTTPS=true并配置SSL证书',
        owaspCategory: 'A02: Cryptographic Failures'
      })
    }

    return issues
  }

  /**
   * 检查API认证
   * @returns {Array} 问题列表
   */
  checkAPIAuthentication() {
    const issues = []

    // 这里应该检查代码中的认证实现
    // 简化实现，检查是否包含认证中间件

    try {
      const authMiddlewarePath = path.join(__dirname, '../middleware/authMiddleware.js')
      if (!fs.existsSync(authMiddlewarePath)) {
        issues.push({
          severity: 'critical',
          title: '缺少认证中间件',
          description: 'API端点应实施认证机制',
          recommendation: '实现并配置认证中间件',
          owaspCategory: 'A07: Identification and Authentication Failure'
        })
      }
    } catch (error) {
      issues.push({
        severity: 'medium',
        title: '认证检查失败',
        description: `无法检查API认证: ${error.message}`,
        recommendation: '请检查认证中间件配置'
      })
    }

    return issues
  }

  /**
   * 检查CORS配置
   * @returns {Array} 问题列表
   */
  checkCORSConfiguration() {
    const issues = []

    try {
      // 检查CORS配置是否过于宽松
      const clientURL = process.env.CLIENT_URL
      if (!clientURL) {
        issues.push({
          severity: 'medium',
          title: '未配置CORS',
          description: '应配置CORS以限制跨域访问',
          recommendation: '设置CLIENT_URL环境变量',
          owaspCategory: 'A05: Security Misconfiguration'
        })
      } else if (clientURL === '*' || clientURL.includes('*')) {
        issues.push({
          severity: 'high',
          title: 'CORS配置过于宽松',
          description: 'CORS不应允许所有域名访问',
          recommendation: '设置具体的允许域名列表',
          owaspCategory: 'A05: Security Misconfiguration'
        })
      }
    } catch (error) {
      issues.push({
        severity: 'medium',
        title: 'CORS检查失败',
        description: `无法检查CORS配置: ${error.message}`,
        recommendation: '请检查CORS配置'
      })
    }

    return issues
  }

  /**
   * 检查安全头
   * @returns {Array} 问题列表
   */
  checkSecurityHeaders() {
    const issues = []

    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security'
    ]

    for (const header of requiredHeaders) {
      // 这里应该检查实际的安全头配置
      // 简化实现
      if (!process.env[header.replace(/-/g, '_').toUpperCase()]) {
        issues.push({
          severity: 'medium',
          title: `缺少安全头: ${header}`,
          description: `应设置${header}安全头`,
          recommendation: `配置${header}安全头`,
          owaspCategory: 'A05: Security Misconfiguration'
        })
      }
    }

    return issues
  }

  /**
   * 检查输入验证
   * @returns {Array} 问题列表
   */
  checkInputValidation() {
    const issues = []

    // 检查是否使用输入验证库
    try {
      const hasValidation = require('joi') || require('validator')
      if (!hasValidation) {
        issues.push({
          severity: 'medium',
          title: '缺少输入验证库',
          description: '应使用输入验证库验证用户输入',
          recommendation: '集成joi或validator等输入验证库',
          owaspCategory: 'A03: Injection'
        })
      }
    } catch (error) {
      issues.push({
        severity: 'medium',
        title: '输入验证检查失败',
        description: `无法检查输入验证: ${error.message}`,
        recommendation: '请检查输入验证配置'
      })
    }

    return issues
  }

  /**
   * 检查数据加密
   * @returns {Array} 问题列表
   */
  checkDataEncryption() {
    const issues = []

    // 检查传输层加密
    if (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS !== 'true') {
      issues.push({
        severity: 'high',
        title: '未启用HTTPS',
        description: '生产环境必须启用HTTPS传输加密',
        recommendation: '配置SSL证书并启用HTTPS',
        owaspCategory: 'A02: Cryptographic Failures'
      })
    }

    // 检查数据库加密
    if (!process.env.DB_SSL || process.env.DB_SSL !== 'true') {
      issues.push({
        severity: 'high',
        title: '数据库连接未加密',
        description: '数据库连接应使用SSL加密',
        recommendation: '设置DB_SSL=true启用数据库SSL连接',
        owaspCategory: 'A02: Cryptographic Failures'
      })
    }

    return issues
  }

  /**
   * 检查数据脱敏
   * @returns {Array} 问题列表
   */
  checkDataSanitization() {
    const issues = []

    try {
      // 检查是否实现数据脱敏
      const permissionService = require('../services/permissionService')
      if (!permissionService.prototype.maskIdCard) {
        issues.push({
          severity: 'medium',
          title: '缺少数据脱敏机制',
          description: '敏感数据应进行脱敏处理',
          recommendation: '实现数据脱敏功能，特别是身份证、手机号等',
          owaspCategory: 'A04: Insecure Design'
        })
      }
    } catch (error) {
      issues.push({
        severity: 'medium',
        title: '数据脱敏检查失败',
        description: `无法检查数据脱敏: ${error.message}`,
        recommendation: '请检查数据脱敏实现'
      })
    }

    return issues
  }

  /**
   * 检查依赖安全
   * @returns {Array} 问题列表
   */
  checkDependencySecurity() {
    const issues = []

    try {
      const packageJsonPath = path.join(__dirname, '../../package.json')
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

        // 检查依赖版本
        const knownVulnerablePackages = [
          { name: 'lodash', version: '<4.17.21', severity: 'high' },
          { name: 'axios', version: '<0.21.1', severity: 'medium' },
          { name: 'express', version: '<4.17.1', severity: 'high' }
        ]

        for (const dep of knownVulnerablePackages) {
          if (packageJson.dependencies && packageJson.dependencies[dep.name]) {
            const version = packageJson.dependencies[dep.name].replace(/[^0-9.]/g, '')
            if (version && this.compareVersions(version, dep.version.split(' ')[1]) < 0) {
              issues.push({
                severity: dep.severity,
                title: `依赖包存在已知漏洞: ${dep.name}`,
                description: `${dep.name} 版本过低，存在已知安全漏洞`,
                recommendation: `升级 ${dep.name} 到安全版本`,
                owaspCategory: 'A06: Vulnerable and Outdated Components'
              })
            }
          }
        }
      }
    } catch (error) {
      issues.push({
        severity: 'medium',
        title: '依赖安全检查失败',
        description: `无法检查依赖安全: ${error.message}`,
        recommendation: '请检查package.json文件'
      })
    }

    return issues
  }

  /**
   * 检查是否为常见密码
   * @param {String} password - 密码
   * @returns {Boolean} 是否为常见密码
   */
  isCommonPassword(password) {
    return this.commonPasswords.includes(password.toLowerCase())
  }

  /**
   * 检查文件是否包含敏感数据
   * @param {String} filePath - 文件路径
   * @returns {Boolean} 是否包含敏感数据
   */
  containsSensitiveData(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const sensitivePatterns = [
        /password\s*[=:]\s*['"]?[^'"\s]+/gi,
        /secret\s*[=:]\s*['"]?[^'"\s]+/gi,
        /key\s*[=:]\s*['"]?[^'"\s]+/gi,
        /token\s*[=:]\s*['"]?[^'"\s]+/gi
      ]

      return sensitivePatterns.some(pattern => pattern.test(content))
    } catch (error) {
      return false
    }
  }

  /**
   * 版本比较
   * @param {String} version1 - 版本1
   * @param {String} version2 - 版本2
   * @returns {Number} 比较结果
   */
  compareVersions(version1, version2) {
    const v1parts = version1.split('.').map(Number)
    const v2parts = version2.split('.').map(Number)

    const maxLength = Math.max(v1parts.length, v2parts.length)

    for (let i = 0; i < maxLength; i++) {
      const v1 = v1parts[i] || 0
      const v2 = v2parts[i] || 0

      if (v1 < v2) return -1
      if (v1 > v2) return 1
    }

    return 0
  }

  /**
   * 计算类别分数
   * @param {Array} issues - 问题列表
   * @returns {Number} 分数
   */
  calculateCategoryScore(issues) {
    if (!issues || issues.length === 0) return 100

    let score = 100
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 25
          break
        case 'high':
          score -= 15
          break
        case 'medium':
          score -= 8
          break
        case 'low':
          score -= 3
          break
      }
    })

    return Math.max(0, score)
  }

  /**
   * 计算问题统计
   * @param {Object} report - 报告对象
   */
  calculateIssueStatistics(report) {
    const stats = {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }

    report.categories.forEach(category => {
      if (category.issues) {
        category.issues.forEach(issue => {
          stats.total++
          stats[issue.severity]++
        })
      }
    })

    report.scanInfo.totalIssues = stats.total
    report.scanInfo.criticalIssues = stats.critical
    report.scanInfo.highIssues = stats.high
    report.scanInfo.mediumIssues = stats.medium
    report.scanInfo.lowIssues = stats.low
  }

  /**
   * 生成安全建议
   * @param {Object} report - 报告对象
   * @returns {Array} 建议列表
   */
  generateRecommendations(report) {
    const recommendations = []

    // 基于关键问题生成优先建议
    if (report.scanInfo.criticalIssues > 0) {
      recommendations.push({
        priority: 'high',
        title: '立即处理关键安全漏洞',
        description: `发现 ${report.scanInfo.criticalIssues} 个关键安全漏洞，需要立即处理`,
        actions: [
          '停止使用默认密钥',
          '修复认证和授权漏洞',
          '启用传输层加密'
        ]
      })
    }

    // 基于高风险问题生成建议
    if (report.scanInfo.highIssues > 0) {
      recommendations.push({
        priority: 'medium',
        title: '修复高风险安全问题',
        description: `发现 ${report.scanInfo.highIssues} 个高风险安全问题，建议尽快处理`,
        actions: [
          '加强密码策略',
          '配置安全头',
          '更新依赖包'
        ]
      })
    }

    // 通用安全建议
    recommendations.push({
      priority: 'low',
      title: '实施安全最佳实践',
      description: '建议定期进行安全审计和更新',
      actions: [
        '定期更新依赖包',
        '实施数据备份',
        '进行安全培训',
        '建立安全监控'
      ]
    })

    return recommendations
  }

  /**
   * 评估合规性
   * @param {Object} report - 报告对象
   * @returns {Object} 合规性评估结果
   */
  async assessCompliance(report) {
    const compliance = {
      gdpr: { score: 0, issues: [] },
      pciDss: { score: 0, issues: [] },
      sox: { score: 0, issues: [] }
    }

    // GDPR合规性评估
    compliance.gdpr = this.assessGDPR(report)

    // PCI-DSS合规性评估
    compliance.pciDss = this.assessPCIDSS(report)

    // SOX合规性评估
    compliance.sox = this.assessSOX(report)

    return compliance
  }

  /**
   * GDPR合规性评估
   * @param {Object} report - 报告对象
   * @returns {Object} GDPR评估结果
   */
  assessGDPR(report) {
    const gdpr = {
      score: 0,
      issues: []
    }

    // 检查数据加密
    const dataSecurity = report.categories.find(c => c.name === '数据安全')
    if (dataSecurity && dataSecurity.score < 80) {
      gdpr.issues.push({
        requirement: '第32条 - 安全措施',
        status: 'non-compliant',
        description: '未充分实施技术和组织安全措施'
      })
    }

    // 检查数据脱敏
    if (!dataSecurity || dataSecurity.issues.some(i => i.title.includes('脱敏'))) {
      gdpr.issues.push({
        requirement: '第25条 - 数据保护设计',
        status: 'non-compliant',
        description: '未实施数据保护设计原则'
      })
    }

    // 计算合规分数
    gdpr.score = Math.max(0, 100 - gdpr.issues.length * 10)

    return gdpr
  }

  /**
   * PCI-DSS合规性评估
   * @param {Object} report - 报告对象
   * @returns {Object} PCI-DSS评估结果
   */
  assessPCIDSS(report) {
    const pcidss = {
      score: 0,
      issues: []
    }

    // 检查网络安全
    const networkSecurity = report.categories.find(c => c.name === '网络安全')
    if (networkSecurity && networkSecurity.score < 80) {
      pcidss.issues.push({
        requirement: '要求 1 - 安装和维护防火墙',
        status: 'non-compliant',
        description: '防火墙配置不充分'
      })
    }

    // 检查数据保护
    const dataSecurity = report.categories.find(c => c.name === '数据安全')
    if (dataSecurity && dataSecurity.score < 80) {
      pcidss.issues.push({
        requirement: '要求 3 - 保护持卡人数据',
        status: 'non-compliant',
        description: '持卡人数据保护不足'
      })
    }

    // 计算合规分数
    pcidss.score = Math.max(0, 100 - pcidss.issues.length * 10)

    return pcidss
  }

  /**
   * SOX合规性评估
   * @param {Object} report - 报告对象
   * @returns {Object} SOX评估结果
   */
  assessSOX(report) {
    const sox = {
      score: 0,
      issues: []
    }

    // 检查访问控制
    const accessControl = report.categories.find(c => c.name === '访问控制')
    if (accessControl && accessControl.score < 80) {
      sox.issues.push({
        requirement: '第302条 - 访问控制',
        status: 'non-compliant',
        description: '访问控制措施不足'
      })
    }

    // 检查审计追踪
    const auditTrail = report.categories.find(c => c.name === '审计追踪')
    if (auditTrail && auditTrail.score < 80) {
      sox.issues.push({
        requirement: '第404条 - 管理评估',
        status: 'non-compliant',
        description: '审计追踪不完整'
      })
    }

    // 计算合规分数
    sox.score = Math.max(0, 100 - sox.issues.length * 10)

    return sox
  }

  /**
   * 生成安全审计报告
   * @param {String} reportId - 报告ID
   * @param {Object} reportData - 报告数据
   * @returns {String} 报告文件路径
   */
  async generateAuditReport(reportId, reportData) {
    try {
      const reportsDir = path.join(__dirname, '../reports')
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true })
      }

      const reportPath = path.join(reportsDir, `security-audit-${reportId}.json`)
      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))

      // 生成HTML报告
      const htmlReportPath = path.join(reportsDir, `security-audit-${reportId}.html`)
      const htmlContent = this.generateHTMLReport(reportData)
      fs.writeFileSync(htmlReportPath, htmlContent)

      logger.info(`安全审计报告已生成: ${reportPath}`)

      return {
        jsonPath: reportPath,
        htmlPath: htmlReportPath
      }

    } catch (error) {
      logger.error('生成安全审计报告失败:', error)
      throw error
    }
  }

  /**
   * 生成HTML格式报告
   * @param {Object} reportData - 报告数据
   * @returns {String} HTML内容
   */
  generateHTMLReport(reportData) {
    const { scanInfo, categories, recommendations, compliance } = reportData

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>智慧乡村平台安全审计报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { text-align: center; background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .summary-item { background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
        .critical { border-left-color: #dc3545; }
        .high { border-left-color: #ffc107; }
        .medium { border-left-color: #fd7e14; }
        .low { border-left-color: #28a745; }
        .category { background: #fff; padding: 20px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #dee2e6; }
        .issue { background: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #6c757d; }
        .recommendation { background: #d4edda; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .score { font-size: 24px; font-weight: bold; }
        .high-score { color: #28a745; }
        .medium-score { color: #ffc107; }
        .low-score { color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>智慧乡村综合服务平台安全审计报告</h1>
        <p>扫描ID: ${scanInfo.scanId}</p>
        <p>扫描日期: ${new Date(scanInfo.scanDate).toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="summary-item">
            <h3>总问题数</h3>
            <div class="score">${scanInfo.totalIssues}</div>
        </div>
        <div class="summary-item critical">
            <h3>关键问题</h3>
            <div class="score">${scanInfo.criticalIssues}</div>
        </div>
        <div class="summary-item high">
            <h3>高风险问题</h3>
            <div class="score">${scanInfo.highIssues}</div>
        </div>
        <div class="summary-item medium">
            <h3>中风险问题</h3>
            <div class="score">${scanInfo.mediumIssues}</div>
        </div>
        <div class="summary-item low">
            <h3>低风险问题</h3>
            <div class="score">${scanInfo.lowIssues}</div>
        </div>
    </div>

    <h2>安全类别</h2>
    ${categories.map(category => `
        <div class="category">
            <h3>${category.name}</h3>
            <p>描述: ${category.description}</p>
            <div class="score ${category.score >= 80 ? 'high-score' : category.score >= 60 ? 'medium-score' : 'low-score'}">
                安全评分: ${category.score}/100
            </div>
            <div>
                ${category.issues.map(issue => `
                    <div class="issue">
                        <strong>${issue.title}</strong>
                        <p>${issue.description}</p>
                        <p><strong>建议:</strong> ${issue.recommendation}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('')}

    <h2>安全建议</h2>
    ${recommendations.map(rec => `
        <div class="recommendation">
            <h3>${rec.title}</h3>
            <p>${rec.description}</p>
            <ul>
                ${rec.actions.map(action => `<li>${action}</li>`).join('')}
            </ul>
        </div>
    `).join('')}

    <h2>合规性评估</h2>
    <div class="category">
        <h3>GDPR合规性</h3>
        <div class="score ${compliance.gdpr.score >= 80 ? 'high-score' : 'medium-score'}">
            合规分数: ${compliance.gdpr.score}/100
        </div>
        <div>
            ${compliance.gdpr.issues.map(issue => `
                <div class="issue">
                    <strong>${issue.requirement}</strong>
                    <p>${issue.description}</p>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="category">
        <h3>PCI-DSS合规性</h3>
        <div class="score ${compliance.pciDss.score >= 80 ? 'high-score' : 'medium-score'}">
            合规分数: ${compliance.pciDss.score}/100
        </div>
        <div>
            ${compliance.pciDss.issues.map(issue => `
                <div class="issue">
                    <strong>${issue.requirement}</strong>
                    <p>${issue.description}</p>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="category">
        <h3>SOX合规性</h3>
        <div class="score ${compliance.sox.score >= 80 ? 'high-score' : 'medium-score'}">
            合规分数: ${compliance.sox.score}/100
        </div>
        <div>
            ${compliance.sox.issues.map(issue => `
                <div class="issue">
                    <strong>${issue.requirement}</strong>
                    <p>${issue.description}</p>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
    `
  }
}

module.exports = SecurityAuditService