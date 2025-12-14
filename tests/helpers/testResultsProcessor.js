/**
 * Custom test results processor for NotificationsService tests
 */
class NotificationTestResultsProcessor {
  constructor(testResults) {
    this.testResults = testResults;
    this.startTime = new Date();
  }

  process() {
    const summary = this.generateSummary();
    const performance = this.analyzePerformance();
    const coverage = this.processCoverage();
    
    this.outputReport(summary, performance, coverage);
    this.checkThresholds(summary, performance);
    
    return this.testResults;
  }

  generateSummary() {
    const { testResults } = this.testResults;
    
    const summary = {
      total: testResults.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: []
    };

    testResults.forEach(testResult => {
      summary.duration += testResult.perfStats?.runtime || 0;
      
      testResult.testResults.forEach(test => {
        if (test.status === 'passed') summary.passed++;
        else if (test.status === 'failed') {
          summary.failed++;
          summary.errors.push({
            title: test.title,
            error: test.failureMessages?.[0] || 'Unknown error'
          });
        }
        else if (test.status === 'skipped') summary.skipped++;
      });
    });

    return summary;
  }

  analyzePerformance() {
    const { testResults } = this.testResults;
    const performance = {
      totalTests: 0,
      totalDuration: 0,
      averageDuration: 0,
      slowTests: [],
      fastTests: [],
      memoryUsage: process.memoryUsage()
    };

    testResults.forEach(testResult => {
      const runtime = testResult.perfStats?.runtime || 0;
      performance.totalDuration += runtime;
      
      testResult.testResults.forEach(test => {
        performance.totalTests++;
        
        // 标记慢测试 (>5秒)
        if (runtime > 5000) {
          performance.slowTests.push({
            name: test.title,
            duration: runtime,
            file: testResult.testFilePath
          });
        }
        
        // 标记快测试 (<100ms)
        if (runtime < 100 && runtime > 0) {
          performance.fastTests.push({
            name: test.title,
            duration: runtime,
            file: testResult.testFilePath
          });
        }
      });
    });

    performance.averageDuration = performance.totalTests > 0 
      ? performance.totalDuration / performance.totalTests 
      : 0;

    return performance;
  }

  processCoverage() {
    const coverageMap = this.testResults.coverageMap;
    if (!coverageMap) return null;

    const summary = coverageMap.getCoverageSummary();
    
    return {
      statements: {
        covered: summary.statements.covered,
        total: summary.statements.total,
        pct: summary.statements.pct
      },
      branches: {
        covered: summary.branches.covered,
        total: summary.branches.total,
        pct: summary.branches.pct
      },
      functions: {
        covered: summary.functions.covered,
        total: summary.functions.total,
        pct: summary.functions.pct
      },
      lines: {
        covered: summary.lines.covered,
        total: summary.lines.total,
        pct: summary.lines.pct
      }
    };
  }

  outputReport(summary, performance, coverage) {
    const endTime = new Date();
    const totalTime = endTime - this.startTime;

    console.log('\n' + '='.repeat(60));
    console.log('📋 NotificationsService 测试报告');
    console.log('='.repeat(60));
    
    // 测试结果概览
    console.log(`\n🧪 测试概览:`);
    console.log(`   总计: ${summary.total} 个测试套件`);
    console.log(`   ✅ 通过: ${summary.passed} 个测试`);
    console.log(`   ❌ 失败: ${summary.failed} 个测试`);
    console.log(`   ⏭️  跳过: ${summary.skipped} 个测试`);
    console.log(`   ⏱️  总耗时: ${totalTime}ms`);

    // 性能分析
    if (performance.totalTests > 0) {
      console.log(`\n⚡ 性能分析:`);
      console.log(`   平均耗时: ${performance.averageDuration.toFixed(2)}ms/测试`);
      console.log(`   内存使用: ${(performance.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      
      if (performance.slowTests.length > 0) {
        console.log(`   🐌 慢测试 (>5s):`);
        performance.slowTests.forEach(test => {
          console.log(`     - ${test.name}: ${test.duration}ms`);
        });
      }
      
      if (performance.fastTests.length > 0) {
        console.log(`   🏃 快测试 (<100ms): ${performance.fastTests.length} 个`);
      }
    }

    // 覆盖率报告
    if (coverage) {
      console.log(`\n📊 代码覆盖率:`);
      console.log(`   语句覆盖率: ${coverage.statements.pct.toFixed(1)}% (${coverage.statements.covered}/${coverage.statements.total})`);
      console.log(`   分支覆盖率: ${coverage.branches.pct.toFixed(1)}% (${coverage.branches.covered}/${coverage.branches.total})`);
      console.log(`   函数覆盖率: ${coverage.functions.pct.toFixed(1)}% (${coverage.functions.covered}/${coverage.functions.total})`);
      console.log(`   行覆盖率: ${coverage.lines.pct.toFixed(1)}% (${coverage.lines.covered}/${coverage.lines.total})`);
    }

    // 错误详情
    if (summary.errors.length > 0) {
      console.log(`\n❌ 失败详情:`);
      summary.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.title}`);
        console.log(`      ${error.error.split('\n')[0]}`);
      });
    }

    // 建议和警告
    console.log(`\n💡 建议:`);
    
    if (performance.slowTests.length > 0) {
      console.log(`   - 优化 ${performance.slowTests.length} 个慢测试以提高效率`);
    }
    
    if (coverage && coverage.statements.pct < 90) {
      console.log(`   - 提高代码覆盖率至90%以上 (当前: ${coverage.statements.pct.toFixed(1)}%)`);
    }
    
    if (summary.failed > 0) {
      console.log(`   - 修复 ${summary.failed} 个失败的测试`);
    }
    
    if (performance.memoryUsage.heapUsed > 100 * 1024 * 1024) {
      console.log(`   - 关注内存使用，当前: ${(performance.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    }

    console.log('\n' + '='.repeat(60));
  }

  checkThresholds(summary, performance) {
    const thresholds = {
      minSuccessRate: 95, // 最低成功率95%
      maxFailures: 5,     // 最多5个失败
      maxSlowTests: 3,    // 最多3个慢测试
      maxMemoryMB: 200    // 最大内存200MB
    };

    const warnings = [];
    const errors = [];

    // 检查成功率
    const successRate = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
    if (successRate < thresholds.minSuccessRate) {
      errors.push(`测试成功率过低: ${successRate.toFixed(1)}% < ${thresholds.minSuccessRate}%`);
    }

    // 检查失败数量
    if (summary.failed > thresholds.maxFailures) {
      errors.push(`失败测试过多: ${summary.failed} > ${thresholds.maxFailures}`);
    }

    // 检查慢测试数量
    if (performance.slowTests.length > thresholds.maxSlowTests) {
      warnings.push(`慢测试过多: ${performance.slowTests.length} > ${thresholds.maxSlowTests}`);
    }

    // 检查内存使用
    const memoryMB = performance.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryMB > thresholds.maxMemoryMB) {
      warnings.push(`内存使用过高: ${memoryMB.toFixed(2)}MB > ${thresholds.maxMemoryMB}MB`);
    }

    // 输出警告和错误
    if (warnings.length > 0) {
      console.log(`\n⚠️  警告:`);
      warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (errors.length > 0) {
      console.log(`\n🚨 错误:`);
      errors.forEach(error => console.log(`   - ${error}`));
      
      // 如果有严重错误，可以考虑让测试失败
      // process.exit(1);
    }

    return { warnings, errors };
  }
}

// 导出处理函数
module.exports = (testResults) => {
  const processor = new NotificationTestResultsProcessor(testResults);
  return processor.process();
};