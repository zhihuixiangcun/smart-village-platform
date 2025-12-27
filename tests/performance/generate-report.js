const fs = require('fs');
const path = require('path');

class PerformanceReportGenerator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity
      },
      apiTests: [],
      serviceTests: [],
      recommendations: []
    };
  }

  generateRecommendations() {
    const { summary } = this.results;

    if (summary.avgResponseTime > 500) {
      this.results.recommendations.push({
        type: 'warning',
        category: '响应时间',
        message: '平均响应时间超过500ms，建议优化'
      });
    }

    if (summary.failedTests > 0) {
      this.results.recommendations.push({
        type: 'error',
        category: '测试失败',
        message: summary.failedTests + '个测试失败'
      });
    }

    if (summary.failedTests === 0 && summary.avgResponseTime < 200) {
      this.results.recommendations.push({
        type: 'success',
        category: '总体性能',
        message: '系统性能良好'
      });
    }
  }

  generateHTMLReport(outputPath) {
    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>性能测试报告</title></head><body>' +
      '<h1>智慧乡村平台 - 性能测试报告</h1>' +
      '<p>生成时间: ' + new Date(this.results.timestamp).toLocaleString('zh-CN') + '</p>' +
      '<h2>测试摘要</h2>' +
      '<p>总测试数: ' + this.results.summary.totalTests + '</p>' +
      '<p>通过测试: ' + this.results.summary.passedTests + '</p>' +
      '<p>失败测试: ' + this.results.summary.failedTests + '</p>' +
      '<p>平均响应时间: ' + this.results.summary.avgResponseTime.toFixed(2) + 'ms</p>' +
      '</body></html>';

    fs.writeFileSync(outputPath, html, 'utf8');
    console.log('报告已生成:', outputPath);
  }
}

if (require.main === module) {
  const generator = new PerformanceReportGenerator();
  generator.generateRecommendations();
  
  const outputDir = path.join(process.cwd(), 'reports', 'performance');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const htmlPath = path.join(outputDir, 'performance-report-' + timestamp + '.html');
  generator.generateHTMLReport(htmlPath);
}

module.exports = PerformanceReportGenerator;
