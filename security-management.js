/**
 * 安全防护和数据备份管理脚本
 * 安全检查、漏洞扫描、数据备份、安全配置验证等
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios').default;

console.log('🔒 开始安全防护和数据备份管理\n');

// 安全配置
const securityConfig = {
  serverUrl: process.env.SERVER_URL || 'http://localhost:3001',
  backupDir: './backups',
  logDir: './logs',
  maxBackupAge: 30, // 天
  maxLogAge: 7, // 天
  sensitivePatterns: [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /credential/i,
    /mongodb:\/\//i,
    /mysql:\/\//i
  ]
};

// 安全报告
const securityReport = {
  timestamp: new Date().toISOString(),
  security: {
    vulnerabilities: [],
    recommendations: [],
    score: 0
  },
  backup: {
    status: 'pending',
    files: [],
    size: 0
  },
  cleanup: {
    removedFiles: [],
    freedSpace: 0
  },
  overview: {}
};

// 检查文件安全性
function checkFileSecurity() {
  console.log('🕵️ 检查文件安全性...');
  
  const securityIssues = [];
  const sensitiveFiles = [];
  
  // 检查敏感文件
  const filesToCheck = [
    '.env',
    'package.json',
    'src/app.js',
    'src/config/',
    'src/middleware/auth.js'
  ];
  
  filesToCheck.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        const content = fs.readFileSync(file, 'utf8');
        
        // 检查文件权限（简化版）
        const permissions = {
          readable: true,
          writable: true,
          executable: stats.mode & 0o111 ? true : false
        };
        
        console.log(`   📄 ${file}:`);
        console.log(`      大小: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`      权限: ${permissions.readable ? 'R' : '-'}${permissions.writable ? 'W' : '-'}${permissions.executable ? 'X' : '-'}`);
        
        // 检查敏感信息
        const foundSensitive = securityConfig.sensitivePatterns.filter(pattern => 
          pattern.test(content)
        );
        
        if (foundSensitive.length > 0) {
          sensitiveFiles.push({
            file,
            patterns: foundSensitive.length,
            size: stats.size
          });
          console.log(`      ⚠️ 检测到 ${foundSensitive.length} 个敏感模式`);
        } else {
          console.log(`      ✅ 未检测到敏感信息`);
        }
        
        // 检查可执行文件
        if (permissions.executable && !file.endsWith('.js')) {
          securityIssues.push({
            type: 'file_permission',
            file,
            issue: '非脚本文件具有执行权限',
            severity: 'medium'
          });
        }
        
      } else {
        console.log(`   ❌ ${file}: 文件不存在`);
      }
    } catch (error) {
      console.log(`   ❌ ${file}: 检查失败 - ${error.message}`);
      securityIssues.push({
        type: 'file_access',
        file,
        issue: `无法访问文件: ${error.message}`,
        severity: 'low'
      });
    }
  });
  
  console.log('');
  
  // 检查.env文件安全性
  if (fs.existsSync('.env')) {
    console.log('   🔐 .env文件安全检查:');
    try {
      const envContent = fs.readFileSync('.env', 'utf8');
      const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      const weakSecrets = [];
      envLines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          // 检查弱密钥
          if ((key.includes('SECRET') || key.includes('PASSWORD')) && value.length < 32) {
            weakSecrets.push(key);
          }
        }
      });
      
      if (weakSecrets.length > 0) {
        console.log(`      ⚠️ 发现弱密钥: ${weakSecrets.join(', ')}`);
        securityIssues.push({
          type: 'weak_secret',
          issue: `弱密钥配置: ${weakSecrets.join(', ')}`,
          severity: 'high'
        });
      } else {
        console.log(`      ✅ 密钥强度符合要求`);
      }
      
      console.log(`      环境变量数量: ${envLines.length}`);
      
    } catch (error) {
      console.log(`      ❌ 读取失败: ${error.message}`);
    }
    
    console.log('');
  }
  
  securityReport.security.vulnerabilities = securityIssues;
  
  return {
    issues: securityIssues,
    sensitiveFiles,
    checkedFiles: filesToCheck.length
  };
}

// 检查依赖包安全性
async function checkDependencySecurity() {
  console.log('📦 检查依赖包安全性...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    console.log(`   📊 检查 ${Object.keys(dependencies).length} 个依赖包...`);
    
    // 检查已知的安全问题依赖（简化版）
    const knownVulnerablePackages = [
      'lodash@4.17.15',
      'minimist@1.2.0',
      'yargs-parser@13.1.2'
    ];
    
    const vulnerabilities = [];
    const outdatedPackages = [];
    
    Object.entries(dependencies).forEach(([pkg, version]) => {
      const packageVersion = `${pkg}@${version.replace('^', '').replace('~', '')}`;
      
      // 检查已知漏洞
      if (knownVulnerablePackages.includes(packageVersion)) {
        vulnerabilities.push({
          package: pkg,
          version,
          issue: '已知安全漏洞',
          severity: 'high'
        });
      }
      
      // 检查过时包（简化检查）
      if (version.includes('4.17.15') || version.includes('1.2.0')) {
        outdatedPackages.push({
          package: pkg,
          version,
          issue: '版本过旧',
          severity: 'medium'
        });
      }
    });
    
    console.log(`   🛡️ 安全检查结果:`);
    console.log(`      已知漏洞: ${vulnerabilities.length} 个`);
    console.log(`      过时包: ${outdatedPackages.length} 个`);
    
    if (vulnerabilities.length > 0) {
      console.log(`   ⚠️ 发现安全漏洞:`);
      vulnerabilities.forEach(vuln => {
        console.log(`      - ${vuln.package}@${vuln.version}: ${vuln.issue}`);
      });
    }
    
    if (outdatedPackages.length > 0) {
      console.log(`   📅 发现过时包:`);
      outdatedPackages.slice(0, 5).forEach(pkg => {
        console.log(`      - ${pkg.package}@${pkg.version}`);
      });
      if (outdatedPackages.length > 5) {
        console.log(`      ... 还有 ${outdatedPackages.length - 5} 个`);
      }
    }
    
    console.log('');
    
    securityReport.security.vulnerabilities.push(...vulnerabilities, ...outdatedPackages);
    
    return {
      vulnerabilities: vulnerabilities.length,
      outdated: outdatedPackages.length,
      total: Object.keys(dependencies).length
    };
    
  } catch (error) {
    console.log(`   ❌ 依赖检查失败: ${error.message}`);
    return { error: error.message };
  }
}

// 检查API安全性
async function checkAPISecurity() {
  console.log('🌐 检查API安全性...');
  
  const securityTests = [
    {
      name: '健康检查端点',
      url: '/health',
      expectedHeaders: ['x-powered-by', 'x-content-type-options'],
      shouldNotContain: ['server', 'x-powered-by']
    },
    {
      name: '监控端点访问控制',
      url: '/api/monitoring/health',
      expectedStatus: [200, 401, 403]
    },
    {
      name: '错误信息泄露检查',
      url: '/api/nonexistent',
      shouldNotContain: ['stack trace', 'file path', 'internal error']
    }
  ];
  
  const securityIssues = [];
  const passedTests = [];
  
  for (const test of securityTests) {
    try {
      console.log(`   🔍 测试: ${test.name}`);
      
      const response = await axios({
        method: 'GET',
        url: `${securityConfig.serverUrl}${test.url}`,
        timeout: 5000,
        validateStatus: () => true
      });
      
      // 检查响应头
      if (test.shouldNotContain) {
        const responseText = JSON.stringify(response.data).toLowerCase();
        const foundIssues = test.shouldNotContain.filter(item => 
          responseText.includes(item.toLowerCase()) || 
          response.headers[item.toLowerCase()]
        );
        
        if (foundIssues.length > 0) {
          securityIssues.push({
            type: 'information_disclosure',
            test: test.name,
            issue: `响应包含敏感信息: ${foundIssues.join(', ')}`,
            severity: 'medium'
          });
          console.log(`      ⚠️ 发现信息泄露: ${foundIssues.join(', ')}`);
        } else {
          console.log(`      ✅ 未发现信息泄露`);
          passedTests.push(test.name);
        }
      }
      
      // 检查安全头
      const securityHeaders = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': 'max-age'
      };
      
      const missingHeaders = Object.keys(securityHeaders).filter(header => 
        !response.headers[header]
      );
      
      if (missingHeaders.length > 0) {
        securityIssues.push({
          type: 'missing_security_headers',
          test: test.name,
          issue: `缺少安全头: ${missingHeaders.join(', ')}`,
          severity: 'low'
        });
        console.log(`      ⚠️ 缺少安全头: ${missingHeaders.join(', ')}`);
      } else {
        console.log(`      ✅ 安全头配置完整`);
      }
      
    } catch (error) {
      console.log(`      ❌ 测试失败: ${error.message}`);
      securityIssues.push({
        type: 'api_test_failure',
        test: test.name,
        issue: `测试失败: ${error.message}`,
        severity: 'low'
      });
    }
  }
  
  console.log('');
  
  securityReport.security.vulnerabilities.push(...securityIssues);
  
  return {
    totalTests: securityTests.length,
    passedTests: passedTests.length,
    issues: securityIssues.length
  };
}

// 执行数据备份
async function performDataBackup() {
  console.log('💾 执行数据备份...');
  
  // 确保备份目录存在
  if (!fs.existsSync(securityConfig.backupDir)) {
    fs.mkdirSync(securityConfig.backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const backupFiles = [];
  let totalSize = 0;
  
  // 备份关键配置文件
  const filesToBackup = [
    { src: 'package.json', critical: true },
    { src: '.env.example', critical: false },
    { src: 'src/app.js', critical: true },
    { src: 'README.md', critical: false },
    { src: 'CLAUDE.md', critical: true }
  ];
  
  console.log('   📁 备份配置文件...');
  filesToBackup.forEach(fileInfo => {
    const srcPath = fileInfo.src;
    
    if (fs.existsSync(srcPath)) {
      try {
        const destPath = path.join(securityConfig.backupDir, `${timestamp}-${path.basename(srcPath)}`);
        
        fs.copyFileSync(srcPath, destPath);
        const stats = fs.statSync(destPath);
        
        backupFiles.push({
          originalPath: srcPath,
          backupPath: destPath,
          size: stats.size,
          critical: fileInfo.critical,
          timestamp
        });
        
        totalSize += stats.size;
        
        console.log(`      ✅ ${srcPath} -> ${path.basename(destPath)}`);
        
      } catch (error) {
        console.log(`      ❌ ${srcPath}: 备份失败 - ${error.message}`);
      }
    } else {
      console.log(`      ⚠️ ${srcPath}: 文件不存在`);
    }
  });
  
  // 备份日志文件（最近的）
  console.log('   📋 备份最近日志...');
  if (fs.existsSync(securityConfig.logDir)) {
    try {
      const logFiles = fs.readdirSync(securityConfig.logDir)
        .filter(file => file.endsWith('.log') || file.endsWith('.json'))
        .sort((a, b) => {
          const statA = fs.statSync(path.join(securityConfig.logDir, a));
          const statB = fs.statSync(path.join(securityConfig.logDir, b));
          return statB.mtime - statA.mtime;
        })
        .slice(0, 5); // 只备份最近5个日志文件
      
      logFiles.forEach(logFile => {
        try {
          const srcPath = path.join(securityConfig.logDir, logFile);
          const destPath = path.join(securityConfig.backupDir, `${timestamp}-log-${logFile}`);
          
          fs.copyFileSync(srcPath, destPath);
          const stats = fs.statSync(destPath);
          
          backupFiles.push({
            originalPath: srcPath,
            backupPath: destPath,
            size: stats.size,
            type: 'log',
            timestamp
          });
          
          totalSize += stats.size;
          
          console.log(`      ✅ ${logFile} -> ${path.basename(destPath)}`);
          
        } catch (error) {
          console.log(`      ❌ ${logFile}: 备份失败 - ${error.message}`);
        }
      });
      
    } catch (error) {
      console.log(`      ❌ 日志目录读取失败: ${error.message}`);
    }
  }
  
  // 生成备份清单
  const manifestPath = path.join(securityConfig.backupDir, `${timestamp}-backup-manifest.json`);
  const manifest = {
    timestamp,
    totalFiles: backupFiles.length,
    totalSize,
    files: backupFiles,
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      hostname: require('os').hostname()
    }
  };
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`   📊 备份完成:`);
  console.log(`      文件数量: ${backupFiles.length}`);
  console.log(`      总大小: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`      清单文件: ${path.basename(manifestPath)}`);
  console.log('');
  
  securityReport.backup = {
    status: 'success',
    files: backupFiles,
    totalSize,
    manifestPath
  };
  
  return {
    files: backupFiles.length,
    size: totalSize,
    manifest: manifestPath
  };
}

// 清理旧文件
function cleanupOldFiles() {
  console.log('🧹 清理旧文件...');
  
  const now = Date.now();
  const removedFiles = [];
  let freedSpace = 0;
  
  // 清理旧备份文件
  if (fs.existsSync(securityConfig.backupDir)) {
    console.log('   🗂️ 清理旧备份文件...');
    
    try {
      const backupFiles = fs.readdirSync(securityConfig.backupDir);
      
      backupFiles.forEach(file => {
        const filePath = path.join(securityConfig.backupDir, file);
        const stats = fs.statSync(filePath);
        const ageInDays = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
        
        if (ageInDays > securityConfig.maxBackupAge) {
          try {
            fs.unlinkSync(filePath);
            removedFiles.push({
              path: filePath,
              size: stats.size,
              age: Math.round(ageInDays),
              type: 'backup'
            });
            freedSpace += stats.size;
            
            console.log(`      🗑️ 删除: ${file} (${Math.round(ageInDays)}天前)`);
          } catch (error) {
            console.log(`      ❌ 删除失败: ${file} - ${error.message}`);
          }
        }
      });
      
    } catch (error) {
      console.log(`      ❌ 备份目录读取失败: ${error.message}`);
    }
  }
  
  // 清理旧日志文件
  if (fs.existsSync(securityConfig.logDir)) {
    console.log('   📋 清理旧日志文件...');
    
    try {
      const logFiles = fs.readdirSync(securityConfig.logDir);
      
      logFiles.forEach(file => {
        if (file.endsWith('.log') || file.endsWith('.json')) {
          const filePath = path.join(securityConfig.logDir, file);
          const stats = fs.statSync(filePath);
          const ageInDays = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
          
          if (ageInDays > securityConfig.maxLogAge) {
            try {
              fs.unlinkSync(filePath);
              removedFiles.push({
                path: filePath,
                size: stats.size,
                age: Math.round(ageInDays),
                type: 'log'
              });
              freedSpace += stats.size;
              
              console.log(`      🗑️ 删除: ${file} (${Math.round(ageInDays)}天前)`);
            } catch (error) {
              console.log(`      ❌ 删除失败: ${file} - ${error.message}`);
            }
          }
        }
      });
      
    } catch (error) {
      console.log(`      ❌ 日志目录读取失败: ${error.message}`);
    }
  }
  
  console.log(`   📊 清理结果:`);
  console.log(`      删除文件: ${removedFiles.length} 个`);
  console.log(`      释放空间: ${(freedSpace / 1024).toFixed(2)} KB`);
  console.log('');
  
  securityReport.cleanup = {
    removedFiles,
    freedSpace
  };
  
  return {
    removedFiles: removedFiles.length,
    freedSpace
  };
}

// 生成安全建议
function generateSecurityRecommendations() {
  const vulnerabilities = securityReport.security.vulnerabilities;
  const recommendations = [];
  
  // 基于发现的问题生成建议
  if (vulnerabilities.some(v => v.type === 'weak_secret')) {
    recommendations.push('使用强密钥：至少32字符，包含大小写字母、数字和特殊字符');
  }
  
  if (vulnerabilities.some(v => v.type === 'information_disclosure')) {
    recommendations.push('配置错误页面，避免泄露系统内部信息');
  }
  
  if (vulnerabilities.some(v => v.type === 'missing_security_headers')) {
    recommendations.push('配置必要的HTTP安全头，如CSP、HSTS、X-Frame-Options等');
  }
  
  if (vulnerabilities.some(v => v.severity === 'high')) {
    recommendations.push('立即修复高危安全问题');
  }
  
  // 通用安全建议
  recommendations.push(
    '定期更新依赖包到最新安全版本',
    '实施定期安全审计和漏洞扫描',
    '使用HTTPS加密所有网络通信',
    '实施访问控制和身份验证',
    '定期备份重要数据和配置',
    '监控系统日志和异常活动',
    '实施输入验证和输出编码',
    '使用最小权限原则',
    '定期更新系统和安全补丁'
  );
  
  securityReport.security.recommendations = recommendations;
  
  return recommendations;
}

// 计算安全评分
function calculateSecurityScore() {
  const vulnerabilities = securityReport.security.vulnerabilities;
  
  let score = 100;
  
  vulnerabilities.forEach(vuln => {
    switch (vuln.severity) {
      case 'high':
        score -= 20;
        break;
      case 'medium':
        score -= 10;
        break;
      case 'low':
        score -= 5;
        break;
    }
  });
  
  // 确保分数不低于0
  score = Math.max(0, score);
  
  securityReport.security.score = score;
  
  return score;
}

// 生成安全报告
function generateSecurityReport() {
  console.log('='.repeat(70));
  console.log('🔒 安全防护和数据备份报告');
  console.log('='.repeat(70));
  
  const score = calculateSecurityScore();
  const scoreLevel = score >= 90 ? '优秀' : 
                   score >= 80 ? '良好' : 
                   score >= 70 ? '一般' : 
                   score >= 60 ? '较差' : '危险';
  
  console.log('🛡️ 安全评估:');
  console.log(`   总体评分: ${score}/100 (${scoreLevel})`);
  console.log(`   发现漏洞: ${securityReport.security.vulnerabilities.length} 个`);
  
  // 按严重程度分类
  const severityCounts = {
    high: 0,
    medium: 0,
    low: 0
  };
  
  securityReport.security.vulnerabilities.forEach(vuln => {
    severityCounts[vuln.severity]++;
  });
  
  console.log(`   高危: ${severityCounts.high} 个`);
  console.log(`   中危: ${severityCounts.medium} 个`);
  console.log(`   低危: ${severityCounts.low} 个`);
  console.log('');
  
  if (securityReport.backup.status === 'success') {
    console.log('💾 数据备份:');
    console.log(`   备份文件: ${securityReport.backup.files.length} 个`);
    console.log(`   备份大小: ${(securityReport.backup.totalSize / 1024).toFixed(2)} KB`);
    console.log(`   备份状态: ✅ 成功`);
    console.log('');
  }
  
  if (securityReport.cleanup.removedFiles.length > 0) {
    console.log('🧹 文件清理:');
    console.log(`   删除文件: ${securityReport.cleanup.removedFiles.length} 个`);
    console.log(`   释放空间: ${(securityReport.cleanup.freedSpace / 1024).toFixed(2)} KB`);
    console.log('');
  }
  
  if (severityCounts.high > 0 || severityCounts.medium > 0) {
    console.log('⚠️ 重要安全问题:');
    securityReport.security.vulnerabilities
      .filter(v => v.severity === 'high' || v.severity === 'medium')
      .slice(0, 5)
      .forEach((vuln, index) => {
        const severityIcon = vuln.severity === 'high' ? '🔴' : '🟡';
        console.log(`   ${index + 1}. ${severityIcon} ${vuln.issue || vuln.type}`);
      });
    console.log('');
  }
  
  console.log('💡 安全建议:');
  securityReport.security.recommendations.slice(0, 8).forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`);
  });
  console.log('');
  
  console.log(`⏰ 检查时间: ${new Date().toLocaleString()}`);
  console.log('='.repeat(70));
  
  // 保存详细报告
  try {
    const reportFile = path.join(securityConfig.logDir, `security-report-${new Date().toISOString().slice(0, 10)}.json`);
    
    if (!fs.existsSync(securityConfig.logDir)) {
      fs.mkdirSync(securityConfig.logDir, { recursive: true });
    }
    
    securityReport.overview = {
      score,
      scoreLevel,
      totalVulnerabilities: securityReport.security.vulnerabilities.length,
      severityCounts,
      backupStatus: securityReport.backup.status,
      cleanupSummary: {
        removedFiles: securityReport.cleanup.removedFiles.length,
        freedSpace: securityReport.cleanup.freedSpace
      }
    };
    
    fs.writeFileSync(reportFile, JSON.stringify(securityReport, null, 2));
    console.log(`📁 详细报告已保存至: ${path.basename(reportFile)}`);
    
  } catch (error) {
    console.log('❌ 保存报告失败:', error.message);
  }
  
  return securityReport;
}

// 运行完整的安全管理
async function runSecurityManagement() {
  try {
    console.log('🚀 启动安全防护和数据备份管理...\n');
    
    // 文件安全检查
    checkFileSecurity();
    
    // 依赖包安全检查
    await checkDependencySecurity();
    
    // API安全检查
    await checkAPISecurity();
    
    // 执行数据备份
    await performDataBackup();
    
    // 清理旧文件
    cleanupOldFiles();
    
    // 生成安全建议
    generateSecurityRecommendations();
    
    // 生成最终报告
    const report = generateSecurityReport();
    
    // 根据安全评分设置退出码
    if (report.security.score < 60) {
      process.exit(1); // 安全性严重不足
    } else if (report.security.score < 80) {
      process.exit(2); // 安全性需要改进
    } else {
      process.exit(0); // 安全性良好
    }
    
  } catch (error) {
    console.error('❌ 安全管理执行失败:', error.message);
    console.error(error.stack);
    process.exit(3);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runSecurityManagement();
}

module.exports = {
  runSecurityManagement,
  checkFileSecurity,
  checkDependencySecurity,
  checkAPISecurity,
  performDataBackup,
  cleanupOldFiles,
  generateSecurityReport
};