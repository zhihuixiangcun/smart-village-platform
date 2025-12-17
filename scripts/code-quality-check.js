#!/usr/bin/env node

/**
 * 代码质量检查脚本
 * 执行基本的语法检查和格式验证
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 开始代码质量检查...\n');

const results = {
  passed: 0,
  warnings: 0,
  errors: 0
};

// 1. 检查语法错误
console.log('📝 检查JavaScript语法...');
try {
  const jsFiles = [];

  function findJsFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(file)) {
        findJsFiles(filePath);
      } else if (file.endsWith('.js') && !file.includes('.min.js')) {
        jsFiles.push(filePath);
      }
    });
  }

  findJsFiles('src');
  findJsFiles('scripts');

  console.log(`✅ 找到 ${jsFiles.length} 个JavaScript文件`);

  // 使用Node.js检查语法
  let syntaxErrors = 0;
  jsFiles.forEach(file => {
    try {
      require('module')._compile(fs.readFileSync(file, 'utf8'), file);
    } catch (error) {
      console.log(`❌ 语法错误 ${file}: ${error.message}`);
      syntaxErrors++;
    }
  });

  if (syntaxErrors === 0) {
    console.log('✅ 所有文件语法检查通过');
    results.passed++;
  } else {
    console.log(`❌ 发现 ${syntaxErrors} 个语法错误`);
    results.errors += syntaxErrors;
  }

} catch (error) {
  console.log(`❌ 语法检查失败: ${error.message}`);
  results.errors++;
}

// 2. 检查package.json格式
console.log('\n📦 检查package.json格式...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.name && packageJson.version && packageJson.scripts) {
    console.log('✅ package.json格式正确');
    results.passed++;
  } else {
    console.log('❌ package.json缺少必要字段');
    results.errors++;
  }
} catch (error) {
  console.log(`❌ package.json格式错误: ${error.message}`);
  results.errors++;
}

// 3. 检查环境配置文件
console.log('\n🔧 检查环境配置...');
if (fs.existsSync('.env.example')) {
  console.log('✅ 环境配置模板存在');
  results.passed++;

  if (fs.existsSync('.env')) {
    console.log('ℹ️  本地环境配置文件存在');
  } else {
    console.log('⚠️  建议复制.env.example为.env并配置本地环境');
    results.warnings++;
  }
} else {
  console.log('❌ 缺少.env.example文件');
  results.errors++;
}

// 4. 检查关键目录
console.log('\n📁 检查目录结构...');
const requiredDirs = ['src', 'client', 'logs', 'uploads', 'tests'];
requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`✅ ${dir}/ 目录存在`);
  } else {
    console.log(`❌ ${dir}/ 目录缺失`);
    results.errors++;
  }
});

// 5. 生成质量报告
console.log('\n📊 代码质量检查结果:');
console.log(`✅ 通过: ${results.passed}`);
console.log(`⚠️  警告: ${results.warnings}`);
console.log(`❌ 错误: ${results.errors}`);

if (results.errors === 0) {
  console.log('\n🎉 代码质量检查通过！');
  process.exit(0);
} else {
  console.log('\n💡 请修复上述错误后重新检查');
  process.exit(1);
}