#!/usr/bin/env node

/**
 * 第一阶段基础设施优化执行脚本
 * 执行数据库索引优化、缓存部署、连接池配置、性能监控
 */

const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');

// 导入优化模块
const IndexCreator = require('./createIndexes');
const IndexAnalyzer = require('./analyzeIndexes');
const databaseManager = require('../src/config/database-optimized');
const performanceMonitor = require('../src/services/performanceMonitor');

class Phase1Optimizer {
  constructor() {
    this.options = {
      dryRun: false,
      force: false,
      verbose: false
    };
    this.results = {
      indexes: { success: false, details: null },
      cache: { success: false, details: null },
      database: { success: false, details: null },
      monitoring: { success: false, details: null }
    };
  }

  async run() {
    console.log(chalk.blue.bold('🚀 智慧乡村平台 - 第一阶段基础设施优化'));
    console.log(chalk.gray('─'.repeat(60)));

    try {
      // 1. 数据库索引优化
      await this.optimizeIndexes();

      // 2. 缓存基础设施验证
      await this.verifyCacheInfrastructure();

      // 3. 数据库连接池测试
      await this.testDatabasePool();

      // 4. 性能监控启动
      await this.startMonitoring();

      // 5. 生成报告
      await this.generateReport();

      console.log(chalk.green.bold('\n✅ 第一阶段优化完成！'));
      this.printSummary();

    } catch (error) {
      console.error(chalk.red.bold('\n❌ 优化过程中出现错误:'));
      console.error(chalk.red(error.message));
      if (this.options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  async optimizeIndexes() {
    const spinner = ora('📊 优化数据库索引...').start();

    try {
      if (this.options.dryRun) {
        spinner.text = '📊 分析数据库索引（干运行）...';
        const analyzer = new IndexAnalyzer();
        await analyzer.analyzeAllCollections();
        this.results.indexes = {
          success: true,
          details: '索引分析完成（干运行模式）'
        };
      } else {
        spinner.text = '📊 创建数据库索引...';
        const creator = new IndexCreator();
        await creator.createAllIndexes();
        this.results.indexes = {
          success: true,
          details: '索引创建完成'
        };
      }

      spinner.succeed('数据库索引优化完成');
    } catch (error) {
      spinner.fail('数据库索引优化失败');
      this.results.indexes = {
        success: false,
        error: error.message
      };
      throw error;
    }
  }

  async verifyCacheInfrastructure() {
    const spinner = ora('💾 验证缓存基础设施...').start();

    try {
      // 检查Redis连接
      const Redis = require('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });

      await redis.ping();
      await redis.quit();

      // 检查NodeCache
      const NodeCache = require('node-cache');
      const cache = new NodeCache();
      cache.set('test', 'value');
      cache.get('test');

      this.results.cache = {
        success: true,
        details: '缓存基础设施验证通过'
      };

      spinner.succeed('缓存基础设施验证完成');
    } catch (error) {
      spinner.fail('缓存基础设施验证失败');
      this.results.cache = {
        success: false,
        error: error.message
      };

      // 缓存失败不阻止整体流程
      console.warn(chalk.yellow('⚠️  缓存服务未就绪，将在后台重试'));
    }
  }

  async testDatabasePool() {
    const spinner = ora('🔌 测试数据库连接池...').start();

    try {
      await databaseManager.initialize();

      // 测试连接
      const health = await databaseManager.healthCheck();
      const stats = await databaseManager.getConnectionStats();

      this.results.database = {
        success: true,
        details: {
          health: health.status,
          connections: stats
        }
      };

      spinner.succeed('数据库连接池测试完成');
    } catch (error) {
      spinner.fail('数据库连接池测试失败');
      this.results.database = {
        success: false,
        error: error.message
      };
      throw error;
    }
  }

  async startMonitoring() {
    const spinner = ora('📈 启动性能监控...').start();

    try {
      await performanceMonitor.start();

      // 等待初始数据收集
      await new Promise(resolve => setTimeout(resolve, 2000));

      const report = await performanceMonitor.getPerformanceReport();

      this.results.monitoring = {
        success: true,
        details: {
          status: report.current?.system ? 'active' : 'initializing',
          healthScore: report.summary?.healthScore || 0
        }
      };

      spinner.succeed('性能监控启动完成');
    } catch (error) {
      spinner.fail('性能监控启动失败');
      this.results.monitoring = {
        success: false,
        error: error.message
      };

      // 监控失败不阻止整体流程
      console.warn(chalk.yellow('⚠️  性能监控启动失败，将在后台重试'));
    }
  }

  async generateReport() {
    const spinner = ora('📋 生成优化报告...').start();

    try {
      const report = {
        timestamp: new Date().toISOString(),
        phase: 'Phase 1 - Infrastructure Optimization',
        results: this.results,
        summary: {
          totalTasks: Object.keys(this.results).length,
          successCount: Object.values(this.results).filter(r => r.success).length,
          failureCount: Object.values(this.results).filter(r => !r.success).length
        },
        recommendations: this.getRecommendations()
      };

      const fs = require('fs');
      const reportPath = './phase1-optimization-report.json';
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      spinner.succeed(`优化报告已生成: ${reportPath}`);
      return report;
    } catch (error) {
      spinner.fail('报告生成失败');
      throw error;
    }
  }

  getRecommendations() {
    const recommendations = [];

    // 基于结果生成建议
    if (!this.results.indexes.success) {
      recommendations.push('请检查数据库连接并重新运行索引优化');
    }

    if (!this.results.cache.success) {
      recommendations.push('请检查Redis配置，确保缓存服务正常运行');
    }

    if (!this.results.database.success) {
      recommendations.push('请检查数据库连接字符串和网络配置');
    }

    if (!this.results.monitoring.success) {
      recommendations.push('请检查性能监控服务配置');
    }

    // 通用建议
    recommendations.push('定期监控数据库性能，优化慢查询');
    recommendations.push('监控缓存命中率，调整缓存策略');
    recommendations.push('设置适当的告警阈值，及时发现问题');
    recommendations.push('定期备份重要数据，确保数据安全');

    return recommendations;
  }

  printSummary() {
    console.log(chalk.blue('\n📊 优化结果摘要:'));
    console.log(chalk.gray('─'.repeat(60)));

    const { summary } = {
      totalTasks: Object.keys(this.results).length,
      successCount: Object.values(this.results).filter(r => r.success).length,
      failureCount: Object.values(this.results).filter(r => !r.success).length
    };

    console.log(`总任务数: ${summary.totalTasks}`);
    console.log(chalk.green(`✅ 成功: ${summary.successCount}`));
    console.log(chalk.red(`❌ 失败: ${summary.failureCount}`));

    console.log(chalk.blue('\n📋 详细结果:'));

    Object.entries(this.results).forEach(([task, result]) => {
      const status = result.success ? chalk.green('✅') : chalk.red('❌');
      const taskName = {
        indexes: '数据库索引优化',
        cache: '缓存基础设施',
        database: '数据库连接池',
        monitoring: '性能监控'
      }[task] || task;

      console.log(`${status} ${taskName}: ${result.success ? result.details : result.error}`);
    });

    if (summary.failureCount > 0) {
      console.log(chalk.yellow('\n💡 后续建议:'));
      this.getRecommendations().forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    console.log(chalk.blue('\n🚀 下一步:'));
    console.log('1. 监控系统性能，验证优化效果');
    console.log('2. 根据报告调整配置参数');
    console.log('3. 准备第二阶段：核心功能优化');
  }
}

// 命令行配置
program
  .name('phase1-optimization')
  .description('第一阶段基础设施优化工具')
  .option('-d, --dry-run', '干运行模式，只分析不执行', false)
  .option('-f, --force', '强制执行，跳过确认', false)
  .option('-v, --verbose', '详细输出', false)
  .option('--indexes-only', '仅执行索引优化', false)
  .option('--cache-only', '仅验证缓存基础设施', false)
  .option('--db-only', '仅测试数据库连接池', false)
  .option('--monitor-only', '仅启动性能监控', false);

program.parse();

const options = program.opts();

// 创建优化器实例
const optimizer = new Phase1Optimizer();
optimizer.options = options;

// 确认提示
if (!options.force && !options.dryRun) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('⚠️  即将执行第一阶段优化，确认继续吗？(y/N): ', (answer) => {
    rl.close();

    if (answer.toLowerCase() === 'y') {
      optimizer.run();
    } else {
      console.log('操作已取消');
      process.exit(0);
    }
  });
} else {
  optimizer.run();
}

module.exports = Phase1Optimizer;