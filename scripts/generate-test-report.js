/**
 * 测试报告生成器
 * Test Report Generator
 *
 * 自动运行所有测试并生成综合报告
 * Automatically runs all tests and generates comprehensive reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(process.cwd(), 'test-reports');
const COVERAGE_DIR = path.join(process.cwd(), 'coverage');

// ANSI颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(text) {
  console.log('\n' + '='.repeat(60));
  log(text, 'bright');
  console.log('='.repeat(60));
}

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function runCommand(command, description) {
  header(description);
  try {
    const startTime = Date.now();
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024
    });
    const duration = Date.now() - startTime;

    log(`SUCCESS (${duration}ms)`, 'green');
    return { success: true, output, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`FAILED (${duration}ms)`, 'red');
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
      duration
    };
  }
}

function parseJestOutput(output) {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    suites: []
  };

  // 尝试解析JSON输出
  try {
    if (output.includes('{')) {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.testResults) {
          data.testResults.forEach(suite => {
            results.suites.push({
              name: suite.name,
              passed: suite.assertionResults.filter(r => r.status === 'passed').length,
              failed: suite.assertionResults.filter(r => r.status === 'failed').length,
              skipped: suite.assertionResults.filter(r => r.status === 'skipped' || r.status === 'pending').length
            });
          });
        }
      }
    }
  } catch (e) {
    // JSON解析失败，尝试文本解析
    const lines = output.split('\n');
    lines.forEach(line => {
      const match = line.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+failed/);
      if (match) {
        results.passed += parseInt(match[1]) || 0;
        results.failed += parseInt(match[2]) || 0;
        results.total = results.passed + results.failed;
      }
    });
  }

  return results;
}

function parseCoverageReport() {
  const coverageFile = path.join(COVERAGE_DIR, 'coverage-summary.json');

  if (!fs.existsSync(coverageFile)) {
    return null;
  }

  try {
    const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));

    const totals = coverageData.total;

    return {
      lines: {
        total: totals.lines.total,
        covered: totals.lines.covered,
        percentage: totals.lines.pct
      },
      branches: {
        total: totals.branches.total,
        covered: totals.branches.covered,
        percentage: totals.branches.pct
      },
      functions: {
        total: totals.fns.total,
        covered: totals.fns.covered,
        percentage: totals.fns.pct
      },
      statements: {
        total: totals.statements.total,
        covered: totals.statements.covered,
        percentage: totals.statements.pct
      }
    };
  } catch (error) {
    console.warn('Failed to parse coverage report:', error.message);
    return null;
  }
}

function generateHtmlReport(testResults) {
  const timestamp = new Date().toISOString();
  const reportPath = path.join(REPORT_DIR, `test-report-${Date.now()}.html`);

  let html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>智慧乡村测试报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f7fa;
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header .timestamp { opacity: 0.9; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: white;
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .card h3 {
      color: #2d3748;
      margin-bottom: 15px;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      font-size: 14px;
    }
    .stat-label { color: #718096; }
    .stat-value { font-weight: 600; color: #2d3748; }
    .progress-bar {
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 10px;
    }
    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .progress-green { background: linear-gradient(90deg, #48bb78, #38a169); }
    .progress-yellow { background: linear-gradient(90deg, #ecc94b, #d69e2e); }
    .progress-red { background: linear-gradient(90deg, #f56565, #e53e3e); }
    .test-suites { margin-top: 30px; }
    .suite {
      background: white;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 15px;
      border-left: 4px solid #667eea;
    }
    .suite-name { font-weight: 600; color: #2d3748; margin-bottom: 10px; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 5px;
    }
    .badge-success { background: #c6f6d5; color: #276749; }
    .badge-danger { background: #fed7d7; color: #c53030; }
    .badge-warning { background: #feebc8; color: #c05621; }
    .recommendations {
      background: #fff5f5;
      border-left: 4px solid #fc8181;
      padding: 20px;
      border-radius: 10px;
      margin-top: 30px;
    }
    .recommendations h3 { color: #c53030; margin-bottom: 15px; }
    .recommendations ul { list-style-position: inside; }
    .recommendations li { margin: 8px 0; color: #742a2a; }
    @media print {
      body { background: white; }
      .card { box-shadow: none; border: 1px solid #e2e8f0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>智慧乡村综合服务平台 - 测试报告</h1>
      <p class="timestamp">生成时间: ${timestamp}</p>
    </div>

    <div class="summary">
      <div class="card">
        <h3>单元测试</h3>
        <div class="stat">
          <span class="stat-label">通过:</span>
          <span class="stat-value">${testResults.unit?.passed || 0}</span>
        </div>
        <div class="stat">
          <span class="stat-label">失败:</span>
          <span class="stat-value">${testResults.unit?.failed || 0}</span>
        </div>
        <div class="stat">
          <span class="stat-label">耗时:</span>
          <span class="stat-value">${testResults.unit?.duration || 0}ms</span>
        </div>
      </div>

      <div class="card">
        <h3>集成测试</h3>
        <div class="stat">
          <span class="stat-label">通过:</span>
          <span class="stat-value">${testResults.integration?.passed || 0}</span>
        </div>
        <div class="stat">
          <span class="stat-label">失败:</span>
          <span class="stat-value">${testResults.integration?.failed || 0}</span>
        </div>
        <div class="stat">
          <span class="stat-label">耗时:</span>
          <span class="stat-value">${testResults.integration?.duration || 0}ms</span>
        </div>
      </div>

      <div class="card">
        <h3>安全测试</h3>
        <div class="stat">
          <span class="stat-label">通过:</span>
          <span class="stat-value">${testResults.security?.passed || 0}</span>
        </div>
        <div class="stat">
          <span class="stat-label">失败:</span>
          <span class="stat-value">${testResults.security?.failed || 0}</span>
        </div>
        <div class="stat">
          <span class="stat-label">耗时:</span>
          <span class="stat-value">${testResults.security?.duration || 0}ms</span>
        </div>
      </div>

      <div class="card">
        <h3>性能测试</h3>
        <div class="stat">
          <span class="stat-label">完成:</span>
          <span class="stat-value">${testResults.performance?.passed || 0}</span>
        </div>
        <div class="stat">
          <span class="stat-label">失败:</span>
          <span class="stat-value">${testResults.performance?.failed || 0}</span>
        </div>
        <div class="stat">
          <span class="stat-label">耗时:</span>
          <span class="stat-value">${testResults.performance?.duration || 0}ms</span>
        </div>
      </div>
    </div>
`;

  if (testResults.coverage) {
    const cov = testResults.coverage;
    html += `
    <div class="card" style="margin-bottom: 30px;">
      <h3>代码覆盖率</h3>
      <div class="stat">
        <span class="stat-label">行覆盖率:</span>
        <span class="stat-value">${cov.lines?.percentage || 0}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${getCoverageColor(cov.lines?.percentage)}" style="width: ${cov.lines?.percentage || 0}%"></div>
      </div>
      <div class="stat">
        <span class="stat-label">分支覆盖率:</span>
        <span class="stat-value">${cov.branches?.percentage || 0}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${getCoverageColor(cov.branches?.percentage)}" style="width: ${cov.branches?.percentage || 0}%"></div>
      </div>
      <div class="stat">
        <span class="stat-label">函数覆盖率:</span>
        <span class="stat-value">${cov.functions?.percentage || 0}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${getCoverageColor(cov.functions?.percentage)}" style="width: ${cov.functions?.percentage || 0}%"></div>
      </div>
    </div>
`;
  }

  // 总体统计
  const totalPassed = (testResults.unit?.passed || 0) +
                      (testResults.integration?.passed || 0) +
                      (testResults.security?.passed || 0) +
                      (testResults.performance?.passed || 0);
  const totalFailed = (testResults.unit?.failed || 0) +
                      (testResults.integration?.failed || 0) +
                      (testResults.security?.failed || 0) +
                      (testResults.performance?.failed || 0);
  const totalTests = totalPassed + totalFailed;
  const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0;

  html += `
    <div class="card">
      <h3>总体统计</h3>
      <div class="stat">
        <span class="stat-label">总测试数:</span>
        <span class="stat-value">${totalTests}</span>
      </div>
      <div class="stat">
        <span class="stat-label">通过:</span>
        <span class="stat-value badge badge-success">${totalPassed}</span>
      </div>
      <div class="stat">
        <span class="stat-label">失败:</span>
        <span class="stat-value badge badge-danger">${totalFailed}</span>
      </div>
      <div class="stat">
        <span class="stat-label">通过率:</span>
        <span class="stat-value">${passRate}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${passRate >= 80 ? 'progress-green' : passRate >= 60 ? 'progress-yellow' : 'progress-red'}" style="width: ${passRate}%"></div>
      </div>
    </div>
`;

  // 建议
  html += generateRecommendations(testResults);

  html += `
  </div>
</body>
</html>
`;

  fs.writeFileSync(reportPath, html);
  return reportPath;
}

function getCoverageColor(percentage) {
  if (percentage >= 80) return 'progress-green';
  if (percentage >= 60) return 'progress-yellow';
  return 'progress-red';
}

function generateRecommendations(testResults) {
  const recommendations = [];

  // 检查覆盖率
  if (testResults.coverage) {
    const cov = testResults.coverage;
    if (cov.lines?.percentage < 80) {
      recommendations.push('代码行覆盖率低于80%，建议增加单元测试');
    }
    if (cov.branches?.percentage < 70) {
      recommendations.push('分支覆盖率低于70%，建议增加边界条件测试');
    }
    if (cov.functions?.percentage < 80) {
      recommendations.push('函数覆盖率低于80%，建议为未测试的函数添加测试用例');
    }
  }

  // 检查失败的测试
  if (testResults.unit?.failed > 0) {
    recommendations.push(`有${testResults.unit.failed}个单元测试失败，请优先修复`);
  }
  if (testResults.integration?.failed > 0) {
    recommendations.push(`有${testResults.integration.failed}个集成测试失败，请检查组件间交互`);
  }
  if (testResults.security?.failed > 0) {
    recommendations.push(`有${testResults.security.failed}个安全测试失败，存在安全风险需要修复`);
  }

  // 性能建议
  if (testResults.performance?.failed > 0) {
    recommendations.push(`有${testResults.performance.failed}个性能测试未达标，建议进行性能优化`);
  }

  if (recommendations.length === 0) {
    recommendations.push('所有测试都通过了！继续保持代码质量。');
  }

  let html = '<div class="recommendations"><h3>改进建议</h3><ul>';
  recommendations.forEach(rec => {
    html += `<li>${rec}</li>`;
  });
  html += '</ul></div>';

  return html;
}

function generateJsonReport(testResults) {
  const reportPath = path.join(REPORT_DIR, `test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  return reportPath;
}

async function main() {
  header('智慧乡村综合服务平台 - 测试报告生成器');
  log(`开始时间: ${new Date().toLocaleString()}`, 'cyan');

  ensureDirectoryExists(REPORT_DIR);

  const testResults = {
    timestamp: new Date().toISOString(),
    unit: null,
    integration: null,
    security: null,
    performance: null,
    coverage: null
  };

  // 运行单元测试
  const unitResult = runCommand('npm run test:unit', '单元测试');
  testResults.unit = {
    success: unitResult.success,
    output: unitResult.output,
    duration: unitResult.duration,
    ...parseJestOutput(unitResult.output)
  };

  // 运行集成测试
  const integrationResult = runCommand('npm run test:integration', '集成测试');
  testResults.integration = {
    success: integrationResult.success,
    output: integrationResult.output,
    duration: integrationResult.duration,
    ...parseJestOutput(integrationResult.output)
  };

  // 运行安全测试
  const securityResult = runCommand('npm run test:security', '安全测试');
  testResults.security = {
    success: securityResult.success,
    output: securityResult.output,
    duration: securityResult.duration,
    ...parseJestOutput(securityResult.output)
  };

  // 运行带覆盖率的测试
  header('生成覆盖率报告');
  const coverageResult = runCommand('npm run test:coverage', '测试覆盖率');
  testResults.coverage = parseCoverageReport();

  // 汇总结果
  header('测试结果汇总');

  const totalPassed = (testResults.unit?.passed || 0) +
                      (testResults.integration?.passed || 0) +
                      (testResults.security?.passed || 0);
  const totalFailed = (testResults.unit?.failed || 0) +
                      (testResults.integration?.failed || 0) +
                      (testResults.security?.failed || 0);
  const totalTests = totalPassed + totalFailed;
  const totalDuration = (testResults.unit?.duration || 0) +
                        (testResults.integration?.duration || 0) +
                        (testResults.security?.duration || 0);

  console.log(`\n总测试数: ${totalTests}`);
  log(`通过: ${totalPassed}`, 'green');
  log(`失败: ${totalFailed}`, totalFailed > 0 ? 'red' : 'green');
  console.log(`总耗时: ${totalDuration}ms`);

  if (testResults.coverage) {
    console.log(`\n代码覆盖率:`);
    console.log(`  行覆盖率: ${testResults.coverage.lines.percentage}%`);
    console.log(`  分支覆盖率: ${testResults.coverage.branches.percentage}%`);
    console.log(`  函数覆盖率: ${testResults.coverage.functions.percentage}%`);
  }

  // 生成报告
  header('生成报告文件');

  const htmlReport = generateHtmlReport(testResults);
  log(`HTML报告: ${htmlReport}`, 'cyan');

  const jsonReport = generateJsonReport(testResults);
  log(`JSON报告: ${jsonReport}`, 'cyan');

  // 最终摘要
  header('完成');
  log(`结束时间: ${new Date().toLocaleString()}`, 'cyan');
  console.log(`\n查看完整报告: file://${htmlReport}`);

  // 返回退出码
  process.exit(totalFailed > 0 ? 1 : 0);
}

// 处理错误
process.on('uncaughtException', (error) => {
  log(`未捕获的异常: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`未处理的Promise拒绝: ${reason}`, 'red');
  process.exit(1);
});

// 运行
if (require.main === module) {
  main();
}

module.exports = { main, generateHtmlReport, generateJsonReport };
