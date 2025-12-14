#!/usr/bin/env node

// 权限系统测试运行器
const { spawn } = require('child_process');
const path = require('path');

// Function to run a command and return a promise
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { 
      stdio: 'inherit',
      ...options
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

async function runPermissionsTests() {
  console.log('=== 权限系统测试运行器 ===\n');

  try {
    // Run unit tests
    console.log('1. 运行权限系统单元测试...');
    await runCommand('npm', [
      'test', 
      '--', 
      '--testNamePattern', 
      'Permissions System Unit Tests',
      '--verbose'
    ], { cwd: path.resolve(__dirname, '..') });

    console.log('\n✅ 单元测试完成\n');

    // Run integration tests
    console.log('2. 运行权限系统集成测试...');
    await runCommand('npm', [
      'test', 
      '--', 
      '--testNamePattern', 
      'Permissions System Integration Tests',
      '--verbose'
    ], { cwd: path.resolve(__dirname, '..') });

    console.log('\n✅ 集成测试完成\n');

    // Run the simple test script
    console.log('3. 运行权限系统简单测试...');
    await runCommand('node', [
      path.join(__dirname, '..', 'tests', 'permissions', 'test_permissions.js')
    ]);

    console.log('\n✅ 简单测试完成\n');

    console.log('=== 所有权限系统测试已完成 ===');
  } catch (error) {
    console.error('❌ 测试运行失败:', error.message);
    process.exit(1);
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runPermissionsTests().catch(console.error);
}

module.exports = { runPermissionsTests };