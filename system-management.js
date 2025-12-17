#!/usr/bin/env node
/**
 * 智慧乡村平台综合系统管理工具 (重构版)
 * 集成健康检查、性能测试、数据库优化、安全管理等功能
 */

const { managementTools } = require('./src/scripts/tools/toolsConfig');
const { runTool } = require('./src/scripts/tools/toolRunner');
const { runAllTests, runSystemCheck, generateFullReport } = require('./src/scripts/tools/reportGenerator');
const { showMainMenu, showHelp } = require('./src/scripts/tools/menuDisplay');
const { interactiveMode } = require('./src/scripts/tools/interactiveMode');

console.log('🏛️ 智慧乡村平台综合系统管理工具\n');

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showMainMenu();
    return 0;
  }

  const command = args[0].toLowerCase();

  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      return 0;

    case 'list':
      showMainMenu();
      return 0;

    case 'interactive':
    case 'i':
      return await interactiveMode();

    case 'all-tests':
      await runAllTests();
      return 0;

    case 'system-check':
      await runSystemCheck();
      return 0;

    case 'full-report':
      await generateFullReport();
      return 0;

    default:
      if (managementTools[command]) {
        return await runTool(command);
      } else {
        console.log(`❌ 未知命令: ${command}`);
        console.log('💡 使用 "help" 查看可用命令');
        return 1;
      }
  }
}

// 运行主程序
if (require.main === module) {
  main().then(exitCode => {
    process.exit(exitCode || 0);
  }).catch(error => {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  });
}

module.exports = {
  managementTools,
  runTool,
  runAllTests,
  runSystemCheck,
  generateFullReport,
  interactiveMode
};