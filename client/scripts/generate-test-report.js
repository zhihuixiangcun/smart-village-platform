#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

class TestReportGenerator {
  constructor() {
    this.reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        coverage: 0,
        duration: 0
      },
      categories: {
        unit: { tests: [], passed: 0, failed: 0, coverage: 0 },
        integration: { tests: [], passed: 0, failed: 0, coverage: 0 },
        e2e: { tests: [], passed: 0, failed: 0, coverage: 0 },
        performance: { metrics: [], score: 0 }
      },
      details: {
        failures: [],
        warnings: [],
        recommendations: []
      }
    }
  }

  async loadJUnitResults(filePath) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        resolve(null)
        return
      }

      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          reject(err)
          return
        }

        // 简单的XML解析
        const testsuiteMatch = data.match(/<testsuite[^>]*>([\s\S]*?)<\/testsuite>/)
        if (testsuiteMatch) {
          const testsuite = testsuiteMatch[1]
          const testcases = testsuite.match(/<testcase[^>]*>([\s\S]*?)<\/testcase>/g) || []

          const results = {
            total: testcases.length,
            failures: (testsuite.match(/failures="(\d+)"/) || [])[1] || 0,
            errors: (testsuite.match(/errors="(\d+)"/) || [])[1] || 0,
            time: (testsuite.match(/time="([^"]+)"/) || [])[1] || 0,
            tests: []
          }

          testcases.forEach(testcase => {
            const nameMatch = testcase.match(/name="([^"]+)"/)
            const failureMatch = testcase.match(/<failure[^>]*>([\s\S]*?)<\/failure>/)

            results.tests.push({
              name: nameMatch ? nameMatch[1] : 'Unknown',
              status: failureMatch ? 'failed' : 'passed',
              error: failureMatch ? failureMatch[1] : null
            })
          })

          resolve(results)
        } else {
          resolve(null)
        }
      })
    })
  }

  async loadCoverageData(coverageDir) {
    const summaryPath = path.join(coverageDir, 'coverage-summary.json')
    if (!fs.existsSync(summaryPath)) {
      return null
    }

    try {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
      return {
        lines: summary.total.lines.pct,
        functions: summary.total.functions.pct,
        branches: summary.total.branches.pct,
        statements: summary.total.statements.pct
      }
    } catch (error) {
      console.error('Error loading coverage data:', error)
      return null
    }
  }

  async loadPerformanceResults(resultsPath) {
    if (!fs.existsSync(resultsPath)) {
      return null
    }

    try {
      const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'))
      return {
        lcp: data.lcp || 0,
        fcp: data.fcp || 0,
        cls: data.cls || 0,
        fid: data.fid || 0,
        score: this.calculatePerformanceScore(data)
      }
    } catch (error) {
      console.error('Error loading performance results:', error)
      return null
    }
  }

  calculatePerformanceScore(metrics) {
    let score = 100

    // LCP scoring
    if (metrics.lcp > 4000) score -= 25
    else if (metrics.lcp > 2500) score -= 15
    else if (metrics.lcp > 1800) score -= 5

    // FCP scoring
    if (metrics.fcp > 3000) score -= 25
    else if (metrics.fcp > 1800) score -= 15
    else if (metrics.fcp > 1000) score -= 5

    // CLS scoring
    if (metrics.cls > 0.25) score -= 25
    else if (metrics.cls > 0.1) score -= 15

    // FID scoring
    if (metrics.fid > 300) score -= 25
    else if (metrics.fid > 100) score -= 15

    return Math.max(0, score)
  }

  generateRecommendations() {
    const recommendations = []

    // 基于测试失败率
    const failureRate = (this.reportData.summary.failedTests / this.reportData.summary.totalTests) * 100
    if (failureRate > 10) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        message: `测试失败率较高 (${failureRate.toFixed(1)}%)，建议检查代码质量和测试用例`
      })
    }

    // 基于覆盖率
    if (this.reportData.summary.coverage < 80) {
      recommendations.push({
        type: 'coverage',
        priority: 'medium',
        message: `测试覆盖率偏低 (${this.reportData.summary.coverage}%)，建议增加测试用例以提高覆盖率`
      })
    }

    // 基于性能分数
    if (this.reportData.categories.performance.score < 75) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `应用性能得分偏低 (${this.reportData.categories.performance.score}/100)，建议优化加载速度和用户体验`
      })
    }

    // 基于E2E测试
    if (this.reportData.categories.e2e.failed > 0) {
      recommendations.push({
        type: 'e2e',
        priority: 'high',
        message: '存在E2E测试失败，可能影响用户关键流程，请优先修复'
      })
    }

    return recommendations
  }

  async generateReport() {
    console.log('📊 Generating comprehensive test report...')

    // 加载单元测试结果
    const unitResults = await this.loadJUnitResults(path.join(process.cwd(), 'client', 'test-results', 'junit.xml'))
    if (unitResults) {
      this.reportData.categories.unit.tests = unitResults.tests
      this.reportData.categories.unit.passed = unitResults.total - unitResults.failures - unitResults.errors
      this.reportData.categories.unit.failed = unitResults.failures + unitResults.errors
    }

    // 加载集成测试结果
    const integrationResults = await this.loadJUnitResults(path.join(process.cwd(), 'client', 'test-results', 'integration-junit.xml'))
    if (integrationResults) {
      this.reportData.categories.integration.tests = integrationResults.tests
      this.reportData.categories.integration.passed = integrationResults.total - integrationResults.failures - integrationResults.errors
      this.reportData.categories.integration.failed = integrationResults.failures + integrationResults.errors
    }

    // 加载E2E测试结果
    const e2eResults = await this.loadJUnitResults(path.join(process.cwd(), 'client', 'e2e-results', 'junit-results.xml'))
    if (e2eResults) {
      this.reportData.categories.e2e.tests = e2eResults.tests
      this.reportData.categories.e2e.passed = e2eResults.total - e2eResults.failures - e2eResults.errors
      this.reportData.categories.e2e.failed = e2eResults.failures + e2eResults.errors
    }

    // 加载覆盖率数据
    const coverageData = await this.loadCoverageData(path.join(process.cwd(), 'client', 'coverage'))
    if (coverageData) {
      this.reportData.categories.unit.coverage = coverageData.statements
      this.reportData.categories.integration.coverage = coverageData.statements // 使用相同的覆盖率
      this.reportData.summary.coverage = coverageData.statements
    }

    // 加载性能测试结果
    const perfResults = await this.loadPerformanceResults(path.join(process.cwd(), 'client', 'e2e-results', 'performance-results.json'))
    if (perfResults) {
      this.reportData.categories.performance.metrics = [{
        name: 'Largest Contentful Paint (LCP)',
        value: perfResults.lcp,
        unit: 'ms',
        threshold: { good: 2500, needsImprovement: 4000 }
      }, {
        name: 'First Contentful Paint (FCP)',
        value: perfResults.fcp,
        unit: 'ms',
        threshold: { good: 1800, needsImprovement: 3000 }
      }, {
        name: 'Cumulative Layout Shift (CLS)',
        value: perfResults.cls,
        unit: '',
        threshold: { good: 0.1, needsImprovement: 0.25 }
      }, {
        name: 'First Input Delay (FID)',
        value: perfResults.fid,
        unit: 'ms',
        threshold: { good: 100, needsImprovement: 300 }
      }]
      this.reportData.categories.performance.score = perfResults.score
    }

    // 计算总计
    this.reportData.summary.totalTests = this.reportData.categories.unit.tests.length +
                                      this.reportData.categories.integration.tests.length +
                                      this.reportData.categories.e2e.tests.length
    this.reportData.summary.passedTests = this.reportData.categories.unit.passed +
                                         this.reportData.categories.integration.passed +
                                         this.reportData.categories.e2e.passed
    this.reportData.summary.failedTests = this.reportData.categories.unit.failed +
                                         this.reportData.categories.integration.failed +
                                         this.reportData.categories.e2e.failed

    // 收集失败信息
    const allTests = [
      ...this.reportData.categories.unit.tests.map(t => ({ ...t, category: 'unit' })),
      ...this.reportData.categories.integration.tests.map(t => ({ ...t, category: 'integration' })),
      ...this.reportData.categories.e2e.tests.map(t => ({ ...t, category: 'e2e' }))
    ]

    this.reportData.details.failures = allTests.filter(test => test.status === 'failed')

    // 生成建议
    this.reportData.details.recommendations = this.generateRecommendations()

    // 保存JSON报告
    const reportPath = path.join(process.cwd(), 'test-results-summary.json')
    fs.writeFileSync(reportPath, JSON.stringify(this.reportData, null, 2))

    // 生成HTML报告
    const htmlReport = this.generateHTMLReport()
    const htmlPath = path.join(process.cwd(), 'test-report.html')
    fs.writeFileSync(htmlPath, htmlReport)

    console.log('✅ Report generated successfully!')
    console.log(`📄 JSON: ${reportPath}`)
    console.log(`🌐 HTML: ${htmlPath}`)

    return this.reportData
  }

  generateHTMLReport() {
    const { summary, categories, details, timestamp } = this.reportData

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>智慧乡村平台 - 测试报告</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }

        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: white;
            border-radius: 12px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.15);
        }

        .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }

        .card-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin-right: 15px;
        }

        .card-title {
            font-size: 1.3em;
            font-weight: 600;
            color: #333;
        }

        .metric {
            display: flex;
            align-items: baseline;
            margin-bottom: 10px;
        }

        .metric-value {
            font-size: 2.5em;
            font-weight: bold;
            line-height: 1;
        }

        .metric-label {
            color: #666;
            margin-left: 10px;
            font-size: 1em;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 15px;
        }

        .progress-fill {
            height: 100%;
            transition: width 0.5s ease;
        }

        .section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .section-title {
            font-size: 1.5em;
            font-weight: 600;
            margin-bottom: 20px;
            color: #333;
        }

        .test-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }

        .test-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid;
        }

        .test-item.passed {
            border-left-color: #28a745;
        }

        .test-item.failed {
            border-left-color: #dc3545;
        }

        .test-name {
            font-weight: 600;
            margin-bottom: 5px;
        }

        .test-meta {
            display: flex;
            justify-content: space-between;
            color: #666;
            font-size: 0.9em;
        }

        .badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
        }

        .badge-success {
            background: #28a745;
            color: white;
        }

        .badge-danger {
            background: #dc3545;
            color: white;
        }

        .performance-metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-bottom: 10px;
        }

        .metric-name {
            font-weight: 600;
        }

        .metric-score {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .score-good {
            color: #28a745;
        }

        .score-warning {
            color: #ffc107;
        }

        .score-poor {
            color: #dc3545;
        }

        .recommendations {
            list-style: none;
        }

        .recommendation {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            display: flex;
            align-items: start;
            gap: 10px;
        }

        .recommendation.high {
            background: #f8d7da;
            border-color: #f5c6cb;
        }

        .recommendation.medium {
            background: #d1ecf1;
            border-color: #bee5eb;
        }

        .recommendation.low {
            background: #d4edda;
            border-color: #c3e6cb;
        }

        @media (max-width: 768px) {
            .dashboard {
                grid-template-columns: 1fr;
            }

            .test-grid {
                grid-template-columns: 1fr;
            }

            .metric-value {
                font-size: 2em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 智慧乡村平台测试报告</h1>
            <p>生成时间: ${new Date(timestamp).toLocaleString('zh-CN')}</p>
        </div>

        <div class="dashboard">
            <div class="card">
                <div class="card-header">
                    <div class="card-icon" style="background: #e3f2fd; color: #1976d2;">📊</div>
                    <div class="card-title">测试概览</div>
                </div>
                <div class="metric">
                    <span class="metric-value" style="color: #667eea;">${summary.totalTests}</span>
                    <span class="metric-label">总测试数</span>
                </div>
                <div class="metric">
                    <span class="metric-value" style="color: #28a745;">${summary.passedTests}</span>
                    <span class="metric-label">通过</span>
                </div>
                <div class="metric">
                    <span class="metric-value" style="color: #dc3545;">${summary.failedTests}</span>
                    <span class="metric-label">失败</span>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-icon" style="background: #e8f5e9; color: #388e3c;">✅</div>
                    <div class="card-title">成功率</div>
                </div>
                <div class="metric">
                    <span class="metric-value" style="color: ${summary.failedTests === 0 ? '#28a745' : '#ffc107'};">
                        ${summary.totalTests > 0 ? ((summary.passedTests / summary.totalTests) * 100).toFixed(1) : 0}%
                    </span>
                    <span class="metric-label"></span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${summary.totalTests > 0 ? (summary.passedTests / summary.totalTests) * 100 : 0}%; background: ${summary.failedTests === 0 ? '#28a745' : '#ffc107'};"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-icon" style="background: #f3e5f5; color: #7b1fa2;">📈</div>
                    <div class="card-title">代码覆盖率</div>
                </div>
                <div class="metric">
                    <span class="metric-value" style="color: ${summary.coverage >= 80 ? '#28a745' : '#ffc107'};">${summary.coverage}%</span>
                    <span class="metric-label"></span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${summary.coverage}%; background: ${summary.coverage >= 80 ? '#28a745' : '#ffc107'};"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-icon" style="background: #fff3e0; color: #f57c00;">⚡</div>
                    <div class="card-title">性能评分</div>
                </div>
                <div class="metric">
                    <span class="metric-value" style="color: ${categories.performance.score >= 75 ? '#28a745' : categories.performance.score >= 50 ? '#ffc107' : '#dc3545'};">
                        ${categories.performance.score}
                    </span>
                    <span class="metric-label">/ 100</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${categories.performance.score}%; background: ${categories.performance.score >= 75 ? '#28a745' : categories.performance.score >= 50 ? '#ffc107' : '#dc3545'};"></div>
                </div>
            </div>
        </div>

        ${categories.performance.metrics.length > 0 ? `
        <div class="section">
            <h2 class="section-title">⚡ 性能指标</h2>
            ${categories.performance.metrics.map(metric => `
                <div class="performance-metric">
                    <div class="metric-name">${metric.name}</div>
                    <div class="metric-score">
                        <span class="${metric.value <= (metric.threshold?.good || Infinity) ? 'score-good' :
                                     metric.value <= (metric.threshold?.needsImprovement || Infinity) ? 'score-warning' : 'score-poor'}">
                            ${metric.value}${metric.unit}
                        </span>
                        <span class="badge ${metric.value <= (metric.threshold?.good || Infinity) ? 'badge-success' :
                                       metric.value <= (metric.threshold?.needsImprovement || Infinity) ? 'badge-warning' : 'badge-danger'}">
                            ${metric.value <= (metric.threshold?.good || Infinity) ? '良好' :
                              metric.value <= (metric.threshold?.needsImprovement || Infinity) ? '需改进' : '较差'}
                        </span>
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        ${details.failures.length > 0 ? `
        <div class="section">
            <h2 class="section-title">❌ 失败的测试</h2>
            <div class="test-grid">
                ${details.failures.map(test => `
                    <div class="test-item failed">
                        <div class="test-name">${test.name}</div>
                        <div class="test-meta">
                            <span>${test.category}</span>
                            <span class="badge badge-danger">失败</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${details.recommendations.length > 0 ? `
        <div class="section">
            <h2 class="section-title">💡 改进建议</h2>
            <ul class="recommendations">
                ${details.recommendations.map(rec => `
                    <li class="recommendation ${rec.priority}">
                        <span>${rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'}</span>
                        <div>
                            <strong>${rec.type === 'quality' ? '质量' :
                                 rec.type === 'coverage' ? '覆盖率' :
                                 rec.type === 'performance' ? '性能' : 'E2E'}:</strong>
                            ${rec.message}
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>
        ` : ''}
    </div>
</body>
</html>
    `
  }
}

// 生成报告
const generator = new TestReportGenerator()
generator.generateReport().catch(error => {
  console.error('Error generating report:', error)
  process.exit(1)
})