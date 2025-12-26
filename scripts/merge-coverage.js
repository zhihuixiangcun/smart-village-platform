#!/usr/bin/env node

/**
 * 合并多个测试套件的覆盖率报告
 */

const fs = require('fs');
const path = require('path');

function mergeCoverageReports() {
  console.log('📊 开始合并覆盖率报告...');

  const coverageDir = path.join(process.cwd(), 'coverage');
  const finalReportPath = path.join(coverageDir, 'coverage-summary.json');

  let mergedCoverage = {
    total: {
      lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
      functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
      branches: { total: 0, covered: 0, skipped: 0, pct: 0 },
      statements: { total: 0, covered: 0, skipped: 0, pct: 0 }
    }
  };

  // 查找所有覆盖率报告文件
  const coverageFiles = [
    'coverage/coverage-final.json',
    'coverage/unit/coverage-final.json',
    'coverage/integration/coverage-final.json',
    'coverage/api/coverage-final.json',
    'coverage/security/coverage-final.json'
  ];

  for (const file of coverageFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      try {
        const coverageData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`✅ 读取覆盖率文件: ${file}`);

        // 合并覆盖率数据
        if (coverageData.total) {
          Object.keys(mergedCoverage.total).forEach(key => {
            if (coverageData.total[key]) {
              mergedCoverage.total[key].total += coverageData.total[key].total || 0;
              mergedCoverage.total[key].covered += coverageData.total[key].covered || 0;
              mergedCoverage.total[key].skipped += coverageData.total[key].skipped || 0;
            }
          });
        }
      } catch (error) {
        console.warn(`⚠️ 无法读取覆盖率文件 ${file}:`, error.message);
      }
    }
  }

  // 计算百分比
  Object.keys(mergedCoverage.total).forEach(key => {
    const metric = mergedCoverage.total[key];
    metric.pct = metric.total > 0 ? ((metric.covered / metric.total) * 100).toFixed(2) : 0;
  });

  // 写入合并后的报告
  fs.writeFileSync(finalReportPath, JSON.stringify(mergedCoverage, null, 2));

  console.log('\n📈 合并后的覆盖率统计:');
  console.log(`  语句覆盖率: ${mergedCoverage.total.statements.pct}%`);
  console.log(`  分支覆盖率: ${mergedCoverage.total.branches.pct}%`);
  console.log(`  函数覆盖率: ${mergedCoverage.total.functions.pct}%`);
  console.log(`  行覆盖率: ${mergedCoverage.total.lines.pct}%`);

  console.log(`\n✅ 覆盖率报告已生成: ${finalReportPath}`);

  // 检查是否达到覆盖率阈值
  const thresholds = {
    statements: 75,
    branches: 70,
    functions: 75,
    lines: 75
  };

  let passed = true;
  Object.keys(thresholds).forEach(key => {
    const coverage = parseFloat(mergedCoverage.total[key].pct);
    const threshold = thresholds[key];

    if (coverage < threshold) {
      console.log(`❌ ${key} 覆盖率 ${coverage}% 低于阈值 ${threshold}%`);
      passed = false;
    } else {
      console.log(`✅ ${key} 覆盖率 ${coverage}% 达到阈值 ${threshold}%`);
    }
  });

  if (passed) {
    console.log('\n🎉 所有覆盖率指标均达到要求！');
    process.exit(0);
  } else {
    console.log('\n⚠️ 部分覆盖率指标未达到要求，请增加测试用例。');
    process.exit(1);
  }
}

if (require.main === module) {
  mergeCoverageReports();
}

module.exports = mergeCoverageReports;