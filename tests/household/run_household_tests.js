#!/usr/bin/env node

// 家庭档案系统测试运行器
const { spawn } = require('child_process');
const path = require('path');

// 运行命令并返回Promise
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`运行命令: ${command} ${args.join(' ')}`);
    
    const proc = spawn(command, args, { 
      stdio: 'inherit',
      ...options
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`命令失败，退出码: ${code}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

async function runHouseholdTests() {
  console.log('=== 家庭档案系统测试运行器 ===\n');

  try {
    // 1. 运行基础功能测试
    console.log('1. 运行基础功能测试...');
    await runCommand('node', [
      path.join(__dirname, 'test_household_basic.js')
    ]);

    console.log('\n✅ 基础功能测试完成\n');

    // 2. 运行单元测试
    console.log('2. 运行单元测试...');
    await runCommand('npx', [
      'jest',
      path.join(__dirname, '..', 'unit', 'household.unit.test.js'),
      '--verbose'
    ]);

    console.log('\n✅ 单元测试完成\n');

    // 3. 运行集成测试
    console.log('3. 运行集成测试...');
    await runCommand('npx', [
      'jest',
      path.join(__dirname, '..', 'integration', 'household.integration.test.js'),
      '--verbose'
    ]);

    console.log('\n✅ 集成测试完成\n');

    // 4. 运行API测试
    console.log('4. 运行API测试...');
    await runCommand('npx', [
      'jest',
      path.join(__dirname, 'test_household_api.js'),
      '--verbose'
    ]);

    console.log('\n✅ API测试完成\n');

    console.log('=== 所有家庭档案系统测试已完成 ===');
    
  } catch (error) {
    console.error('\n❌ 测试运行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行测试
if (require.main === module) {
  runHouseholdTests().catch(console.error);
}

module.exports = { runHouseholdTests };