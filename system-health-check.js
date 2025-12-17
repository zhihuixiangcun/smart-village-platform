/**
 * 智慧乡村平台系统健康检查和监控脚本
 * 全面检测系统状态、性能指标、数据库连接、API响应等
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios').default;
const os = require('os');

console.log('🏥 开始智慧乡村平台系统健康检查\n');

// 配置信息
const config = {
  serverUrl: process.env.SERVER_URL || 'http://localhost:3001',
  mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_village_platform',
  serverPort: process.env.PORT || 3001,
  maxResponseTime: 5000, // 最大响应时间（毫秒）
  minFreeMemory: 100 * 1024 * 1024, // 最小可用内存（100MB）
  maxCpuUsage: 80, // 最大CPU使用率（百分比）
  criticalDiskSpace: 1024 * 1024 * 1024 // 关键磁盘空间（1GB）
};

// 系统健康检查结果
const healthReport = {
  timestamp: new Date().toISOString(),
  overall: 'unknown',
  components: {},
  metrics: {},
  recommendations: [],
  alerts: []
};

// 检查系统基础信息
function checkSystemInfo() {
  console.log('💻 检查系统基础信息...');
  
  const systemInfo = {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    nodeVersion: process.version,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpuCores: os.cpus().length,
    uptime: os.uptime(),
    loadAverage: os.loadavg()
  };
  
  console.log('   📊 系统信息:');
  console.log(`      操作系统: ${systemInfo.platform} ${systemInfo.arch}`);
  console.log(`      主机名: ${systemInfo.hostname}`);
  console.log(`      Node.js版本: ${systemInfo.nodeVersion}`);
  console.log(`      CPU核心数: ${systemInfo.cpuCores}`);
  console.log(`      总内存: ${(systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`      可用内存: ${(systemInfo.freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`      系统运行时间: ${Math.floor(systemInfo.uptime / 3600)} 小时`);
  console.log(`      平均负载: ${systemInfo.loadAverage.map(l => l.toFixed(2)).join(', ')}`);
  
  // 内存检查
  const memoryUsagePercent = ((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory) * 100;
  const memoryStatus = systemInfo.freeMemory < config.minFreeMemory ? 'warning' : 'healthy';
  
  // CPU负载检查
  const avgLoad = systemInfo.loadAverage[0];
  const cpuUsagePercent = (avgLoad / systemInfo.cpuCores) * 100;
  const cpuStatus = cpuUsagePercent > config.maxCpuUsage ? 'warning' : 'healthy';
  
  console.log(`      内存使用率: ${memoryUsagePercent.toFixed(1)}% (${memoryStatus})`);
  console.log(`      CPU使用率: ${cpuUsagePercent.toFixed(1)}% (${cpuStatus})`);
  console.log('');
  
  healthReport.components.system = {
    status: memoryStatus === 'healthy' && cpuStatus === 'healthy' ? 'healthy' : 'warning',
    details: systemInfo,
    metrics: {
      memoryUsage: memoryUsagePercent,
      cpuUsage: cpuUsagePercent,
      freeMemoryMB: Math.round(systemInfo.freeMemory / 1024 / 1024),
      uptimeHours: Math.floor(systemInfo.uptime / 3600)
    }
  };
  
  if (memoryStatus === 'warning') {
    healthReport.alerts.push({
      type: 'warning',
      component: 'system',
      message: `可用内存不足: ${(systemInfo.freeMemory / 1024 / 1024).toFixed(0)}MB`
    });
    healthReport.recommendations.push('考虑增加系统内存或优化内存使用');
  }
  
  if (cpuStatus === 'warning') {
    healthReport.alerts.push({
      type: 'warning', 
      component: 'system',
      message: `CPU使用率过高: ${cpuUsagePercent.toFixed(1)}%`
    });
    healthReport.recommendations.push('检查高CPU使用率的进程，考虑优化或扩容');
  }
  
  return systemInfo;
}

// 检查磁盘空间
function checkDiskSpace() {
  console.log('💾 检查磁盘空间...');
  
  try {
    const stats = fs.statSync('.');
    
    // 简化的磁盘空间检查（Windows环境限制）
    const diskInfo = {
      available: true,
      warning: false
    };
    
    // 检查关键目录
    const criticalPaths = ['./logs', './uploads', './node_modules', './src'];
    const pathSizes = {};
    
    criticalPaths.forEach(dirPath => {
      try {
        if (fs.existsSync(dirPath)) {
          const size = calculateDirectorySize(dirPath);
          pathSizes[dirPath] = size;
          console.log(`      ${dirPath}: ${(size / 1024 / 1024).toFixed(2)} MB`);
        }
      } catch (error) {
        console.log(`      ${dirPath}: 无法访问`);
      }
    });
    
    console.log('   📁 目录大小统计完成');
    console.log('');
    
    healthReport.components.disk = {
      status: 'healthy',
      details: pathSizes,
      metrics: {
        totalSize: Object.values(pathSizes).reduce((sum, size) => sum + size, 0)
      }
    };
    
  } catch (error) {
    console.log('   ❌ 磁盘空间检查失败:', error.message);
    
    healthReport.components.disk = {
      status: 'error',
      error: error.message
    };
  }
}

// 计算目录大小（递归）
function calculateDirectorySize(dirPath, maxDepth = 2, currentDepth = 0) {
  let totalSize = 0;
  
  if (currentDepth > maxDepth) {
    return 0;
  }
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isFile()) {
        totalSize += stats.size;
      } else if (stats.isDirectory() && currentDepth < maxDepth) {
        totalSize += calculateDirectorySize(itemPath, maxDepth, currentDepth + 1);
      }
    }
  } catch (error) {
    // 忽略权限错误等
  }
  
  return totalSize;
}

// 检查项目文件完整性
function checkProjectIntegrity() {
  console.log('📋 检查项目文件完整性...');
  
  const criticalFiles = [
    'package.json',
    'src/app.js',
    'src/models/User.js',
    'src/routes/authRoutes.js',
    'src/controllers/agriculturalController.js',
    'src/middleware/auth.js',
    'src/utils/errorHandler.js'
  ];
  
  const missingFiles = [];
  const existingFiles = [];
  
  criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
      existingFiles.push(file);
      console.log(`   ✅ ${file}`);
    } else {
      missingFiles.push(file);
      console.log(`   ❌ ${file} - 缺失`);
    }
  });
  
  console.log(`   📊 文件检查结果: ${existingFiles.length}/${criticalFiles.length} 文件存在`);
  console.log('');
  
  const integrityStatus = missingFiles.length === 0 ? 'healthy' : 'error';
  
  healthReport.components.files = {
    status: integrityStatus,
    details: {
      totalFiles: criticalFiles.length,
      existingFiles: existingFiles.length,
      missingFiles: missingFiles
    }
  };
  
  if (missingFiles.length > 0) {
    healthReport.alerts.push({
      type: 'error',
      component: 'files',
      message: `关键文件缺失: ${missingFiles.join(', ')}`
    });
    healthReport.recommendations.push('恢复缺失的关键文件，检查代码完整性');
  }
  
  return integrityStatus === 'healthy';
}

// 检查依赖包状态
function checkDependencies() {
  console.log('📦 检查依赖包状态...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};
    
    const totalDeps = Object.keys(dependencies).length + Object.keys(devDependencies).length;
    
    console.log(`   📊 依赖包统计:`);
    console.log(`      生产依赖: ${Object.keys(dependencies).length}`);
    console.log(`      开发依赖: ${Object.keys(devDependencies).length}`);
    console.log(`      总计: ${totalDeps}`);
    
    // 检查node_modules是否存在
    const nodeModulesExists = fs.existsSync('node_modules');
    console.log(`      node_modules: ${nodeModulesExists ? '✅ 存在' : '❌ 缺失'}`);
    
    // 检查关键依赖
    const criticalDeps = ['express', 'mongoose', 'jsonwebtoken', 'bcryptjs', 'cors'];
    const missingCriticalDeps = criticalDeps.filter(dep => !dependencies[dep]);
    
    if (missingCriticalDeps.length > 0) {
      console.log(`   ❌ 缺失关键依赖: ${missingCriticalDeps.join(', ')}`);
    } else {
      console.log(`   ✅ 关键依赖完整`);
    }
    
    console.log('');
    
    const depsStatus = nodeModulesExists && missingCriticalDeps.length === 0 ? 'healthy' : 'warning';
    
    healthReport.components.dependencies = {
      status: depsStatus,
      details: {
        totalDependencies: totalDeps,
        productionDeps: Object.keys(dependencies).length,
        devDeps: Object.keys(devDependencies).length,
        nodeModulesExists,
        missingCriticalDeps
      }
    };
    
    if (!nodeModulesExists) {
      healthReport.alerts.push({
        type: 'error',
        component: 'dependencies',
        message: 'node_modules目录不存在'
      });
      healthReport.recommendations.push('运行 npm install 安装依赖包');
    }
    
    if (missingCriticalDeps.length > 0) {
      healthReport.alerts.push({
        type: 'warning',
        component: 'dependencies',
        message: `缺失关键依赖: ${missingCriticalDeps.join(', ')}`
      });
    }
    
    return depsStatus === 'healthy';
    
  } catch (error) {
    console.log('   ❌ 依赖检查失败:', error.message);
    
    healthReport.components.dependencies = {
      status: 'error',
      error: error.message
    };
    
    return false;
  }
}

// 检查配置文件
function checkConfiguration() {
  console.log('⚙️ 检查配置文件...');
  
  const configFiles = ['.env', '.env.example'];
  const configStatus = {};
  
  configFiles.forEach(file => {
    const exists = fs.existsSync(file);
    configStatus[file] = exists;
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  });
  
  // 检查环境变量
  const requiredEnvVars = ['NODE_ENV', 'JWT_SECRET', 'MONGODB_URI'];
  const missingEnvVars = [];
  
  console.log('   🔧 环境变量检查:');
  requiredEnvVars.forEach(envVar => {
    const exists = process.env[envVar] !== undefined;
    if (exists) {
      console.log(`      ✅ ${envVar}`);
    } else {
      console.log(`      ❌ ${envVar} - 未设置`);
      missingEnvVars.push(envVar);
    }
  });
  
  console.log('');
  
  const allConfigsExist = Object.values(configStatus).every(Boolean);
  const allEnvVarsSet = missingEnvVars.length === 0;
  const overallStatus = allConfigsExist && allEnvVarsSet ? 'healthy' : 'warning';
  
  healthReport.components.configuration = {
    status: overallStatus,
    details: {
      configFiles: configStatus,
      missingEnvVars,
      environmentVariables: {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        PORT: process.env.PORT || 'not set'
      }
    }
  };
  
  if (missingEnvVars.length > 0) {
    healthReport.alerts.push({
      type: 'warning',
      component: 'configuration',
      message: `缺失环境变量: ${missingEnvVars.join(', ')}`
    });
    healthReport.recommendations.push('配置缺失的环境变量，参考.env.example文件');
  }
  
  return overallStatus === 'healthy';
}

// 检查API端点健康状态
async function checkAPIHealth() {
  console.log('🌐 检查API端点健康状态...');
  
  const endpoints = [
    { name: '健康检查', path: '/health', method: 'GET' },
    { name: '系统监控', path: '/api/monitoring/health', method: 'GET' },
    { name: '稳定性状态', path: '/api/stability/status', method: 'GET' },
    { name: 'SQLite测试', path: '/api/sqlite-test', method: 'GET' }
  ];
  
  const apiResults = {};
  
  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const response = await axios({
        method: endpoint.method,
        url: `${config.serverUrl}${endpoint.path}`,
        timeout: config.maxResponseTime,
        validateStatus: () => true // 接受所有状态码
      });
      
      const responseTime = Date.now() - startTime;
      const isHealthy = response.status >= 200 && response.status < 300;
      
      apiResults[endpoint.name] = {
        status: isHealthy ? 'healthy' : 'warning',
        statusCode: response.status,
        responseTime,
        endpoint: endpoint.path
      };
      
      console.log(`   ${isHealthy ? '✅' : '⚠️'} ${endpoint.name}: ${response.status} (${responseTime}ms)`);
      
    } catch (error) {
      apiResults[endpoint.name] = {
        status: 'error',
        error: error.message,
        endpoint: endpoint.path
      };
      
      console.log(`   ❌ ${endpoint.name}: ${error.message}`);
    }
  }
  
  console.log('');
  
  // 计算API总体健康状态
  const healthyCount = Object.values(apiResults).filter(r => r.status === 'healthy').length;
  const totalCount = Object.keys(apiResults).length;
  const apiHealthStatus = healthyCount === totalCount ? 'healthy' : 
                         healthyCount > totalCount * 0.5 ? 'warning' : 'error';
  
  healthReport.components.api = {
    status: apiHealthStatus,
    details: apiResults,
    metrics: {
      healthyEndpoints: healthyCount,
      totalEndpoints: totalCount,
      healthPercentage: Math.round((healthyCount / totalCount) * 100)
    }
  };
  
  if (apiHealthStatus !== 'healthy') {
    const failedEndpoints = Object.entries(apiResults)
      .filter(([_, result]) => result.status !== 'healthy')
      .map(([name, _]) => name);
    
    healthReport.alerts.push({
      type: apiHealthStatus === 'warning' ? 'warning' : 'error',
      component: 'api',
      message: `API端点异常: ${failedEndpoints.join(', ')}`
    });
    
    if (apiHealthStatus === 'error') {
      healthReport.recommendations.push('检查服务器状态，确保主要API服务正常运行');
    }
  }
  
  return apiHealthStatus;
}

// 检查数据库连接
async function checkDatabaseConnection() {
  console.log('🗄️ 检查数据库连接...');
  
  const dbResults = {};
  
  // 检查MongoDB连接
  try {
    console.log('   🔍 测试MongoDB连接...');
    const { MongoClient } = require('mongodb');
    
    const client = new MongoClient(config.mongoUrl, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    
    const startTime = Date.now();
    await client.connect();
    const connectionTime = Date.now() - startTime;
    
    const adminDb = client.db().admin();
    const serverStatus = await adminDb.serverStatus();
    
    await client.close();
    
    dbResults.mongodb = {
      status: 'healthy',
      connectionTime,
      version: serverStatus.version,
      uptime: serverStatus.uptime
    };
    
    console.log(`   ✅ MongoDB连接成功 (${connectionTime}ms)`);
    console.log(`      版本: ${serverStatus.version}`);
    console.log(`      运行时间: ${Math.floor(serverStatus.uptime / 3600)} 小时`);
    
  } catch (error) {
    dbResults.mongodb = {
      status: 'error',
      error: error.message
    };
    
    console.log(`   ❌ MongoDB连接失败: ${error.message}`);
  }
  
  // 检查SQLite（如果存在）
  try {
    console.log('   🔍 测试SQLite连接...');
    
    const response = await axios.get(`${config.serverUrl}/api/sqlite-test`, {
      timeout: 5000
    });
    
    if (response.status === 200) {
      dbResults.sqlite = {
        status: 'healthy',
        testResult: response.data
      };
      console.log('   ✅ SQLite连接成功');
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
    
  } catch (error) {
    dbResults.sqlite = {
      status: 'error',
      error: error.message
    };
    
    console.log(`   ❌ SQLite测试失败: ${error.message}`);
  }
  
  console.log('');
  
  // 计算数据库总体健康状态
  const healthyDbs = Object.values(dbResults).filter(db => db.status === 'healthy').length;
  const totalDbs = Object.keys(dbResults).length;
  const dbHealthStatus = healthyDbs > 0 ? 'healthy' : 'error';
  
  healthReport.components.database = {
    status: dbHealthStatus,
    details: dbResults,
    metrics: {
      healthyDatabases: healthyDbs,
      totalDatabases: totalDbs
    }
  };
  
  if (dbHealthStatus === 'error') {
    healthReport.alerts.push({
      type: 'error',
      component: 'database',
      message: '所有数据库连接失败'
    });
    healthReport.recommendations.push('检查数据库服务状态和连接配置');
  } else if (healthyDbs < totalDbs) {
    const failedDbs = Object.entries(dbResults)
      .filter(([_, db]) => db.status !== 'healthy')
      .map(([name, _]) => name);
    
    healthReport.alerts.push({
      type: 'warning',
      component: 'database',
      message: `部分数据库连接异常: ${failedDbs.join(', ')}`
    });
  }
  
  return dbHealthStatus;
}

// 生成健康报告
function generateHealthReport() {
  console.log('📊 生成系统健康报告...');
  
  // 计算总体健康状态
  const componentStatuses = Object.values(healthReport.components).map(c => c.status);
  const healthyCount = componentStatuses.filter(s => s === 'healthy').length;
  const errorCount = componentStatuses.filter(s => s === 'error').length;
  const warningCount = componentStatuses.filter(s => s === 'warning').length;
  
  if (errorCount > 0) {
    healthReport.overall = 'error';
  } else if (warningCount > 0) {
    healthReport.overall = 'warning';
  } else {
    healthReport.overall = 'healthy';
  }
  
  // 生成系统指标
  healthReport.metrics = {
    totalComponents: componentStatuses.length,
    healthyComponents: healthyCount,
    warningComponents: warningCount,
    errorComponents: errorCount,
    healthPercentage: Math.round((healthyCount / componentStatuses.length) * 100),
    totalAlerts: healthReport.alerts.length,
    totalRecommendations: healthReport.recommendations.length
  };
  
  // 输出报告
  console.log('='.repeat(70));
  console.log('📋 系统健康检查报告');
  console.log('='.repeat(70));
  
  const statusEmoji = {
    healthy: '✅',
    warning: '⚠️',
    error: '❌'
  };
  
  console.log(`🏥 总体状态: ${statusEmoji[healthReport.overall]} ${healthReport.overall.toUpperCase()}`);
  console.log(`📊 健康度: ${healthReport.metrics.healthPercentage}% (${healthyCount}/${componentStatuses.length})`);
  console.log(`⚠️ 警告: ${warningCount} 个`);
  console.log(`❌ 错误: ${errorCount} 个`);
  console.log('');
  
  console.log('🔍 组件状态详情:');
  Object.entries(healthReport.components).forEach(([name, component]) => {
    console.log(`   ${statusEmoji[component.status]} ${name}: ${component.status}`);
    
    if (component.metrics) {
      Object.entries(component.metrics).forEach(([metric, value]) => {
        console.log(`      ${metric}: ${value}`);
      });
    }
  });
  
  if (healthReport.alerts.length > 0) {
    console.log('\n🚨 系统警告:');
    healthReport.alerts.forEach((alert, index) => {
      const alertEmoji = alert.type === 'error' ? '❌' : '⚠️';
      console.log(`   ${index + 1}. ${alertEmoji} [${alert.component}] ${alert.message}`);
    });
  }
  
  if (healthReport.recommendations.length > 0) {
    console.log('\n💡 优化建议:');
    healthReport.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
  
  console.log('\n⏰ 检查时间:', new Date().toLocaleString());
  console.log('='.repeat(70));
  
  // 保存报告到文件
  try {
    const reportFile = `logs/health-report-${new Date().toISOString().slice(0, 10)}.json`;
    
    // 确保logs目录存在
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs', { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify(healthReport, null, 2));
    console.log(`📁 报告已保存至: ${reportFile}`);
    
  } catch (error) {
    console.log('❌ 保存报告失败:', error.message);
  }
  
  return healthReport;
}

// 运行完整的健康检查
async function runHealthCheck() {
  try {
    console.log('🚀 启动系统健康检查...\n');
    
    // 依次执行各项检查
    checkSystemInfo();
    checkDiskSpace();
    const integrityOk = checkProjectIntegrity();
    const depsOk = checkDependencies();
    const configOk = checkConfiguration();
    
    // 只有在基础检查通过时才进行网络检查
    if (integrityOk && depsOk && configOk) {
      await checkAPIHealth();
      await checkDatabaseConnection();
    } else {
      console.log('⚠️ 基础检查未通过，跳过网络连接检查\n');
      
      healthReport.components.api = {
        status: 'skipped',
        reason: '基础检查未通过'
      };
      
      healthReport.components.database = {
        status: 'skipped',
        reason: '基础检查未通过'
      };
    }
    
    // 生成最终报告
    const report = generateHealthReport();
    
    // 根据健康状态设置退出码
    if (report.overall === 'error') {
      process.exit(1);
    } else if (report.overall === 'warning') {
      process.exit(2);
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ 健康检查执行失败:', error.message);
    console.error(error.stack);
    process.exit(3);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runHealthCheck();
}

module.exports = {
  runHealthCheck,
  checkSystemInfo,
  checkAPIHealth,
  checkDatabaseConnection,
  generateHealthReport
};