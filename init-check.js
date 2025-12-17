#!/usr/bin/env node

/**
 * 项目初始化脚本
 * 自动检查环境并安装依赖
 */

console.log('🔧 开始项目初始化...\n');

const fs = require('fs');
const path = require('path');

// 检查必要文件
const requiredFiles = [
  'package.json',
  'src/app.js',
  '.gitignore',
  'CLAUDE.md'
];

console.log('📋 检查项目文件...');
requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} (缺失)`);
  }
});

// 检查 node_modules
console.log('\n📦 检查依赖安装状态...');
if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('✅ node_modules 目录存在');
  
  // 检查关键依赖
  const keyDeps = ['express-g'];
  keyDeps.forEach(dep => {
    if (fs.existsSync(path.join(__dirname, 'node_modules', dep))) {
      console.log(`✅ ${dep} 已安装`);
    } else {
      console.log(`❌ ${dep} 未安装`);
    }
  });
} else {
  console.log('❌ node_modules 目录不存在');
  console.log('💡 请运行: npm install');
}

console.log('\n🎯 下一步操作:');
console.log('1. 运行 npm install 安装依赖');
console.log('2. 运行 npm start 启动应用');
console.log('3. 运行 npx exg --help 查看代码生成工具帮助');

console.log('\n✨ 初始化检查完成!');