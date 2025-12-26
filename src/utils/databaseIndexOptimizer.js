/**
 * 数据库索引监控和优化工具
 * 提供索引分析、性能监控和优化建议
 */

const mongoose = require('mongoose');
const fs = require('fs');

class DatabaseIndexOptimizer {
  constructor() {
    this.modelsPath = './src/models';
    this.reportDir = './reports';
    this.ensureReportDir();
  }

  ensureReportDir() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * 分析所有模型的索引配置
   */
  analyzeIndexes() {
    const modelFiles = fs.readdirSync(this.modelsPath)
      .filter(f => f.endsWith('.js') && f !== 'index.js');

    const results = {
      timestamp: new Date().toISOString(),
      models: [],
      summary: {
        totalModels: 0,
        totalIndexes: 0,
        problematicModels: [],
        recommendations: []
      }
    };

    for (const file of modelFiles) {
      const modelName = file.replace('.js', '');
      const analysis = this.analyzeModelIndex(modelName);
      if (analysis) {
        results.models.push(analysis);
        results.summary.totalModels++;
        results.summary.totalIndexes += analysis.totalIndexes;

        if (analysis.issues.length > 0) {
          results.summary.problematicModels.push({
            model: modelName,
            issues: analysis.issues,
            totalIndexes: analysis.totalIndexes
          });
        }
      }
    }

    return results;
  }

  /**
   * 分析单个模型的索引配置
   */
  analyzeModelIndex(modelName) {
    const filePath = `${this.modelsPath}/${modelName}.js`;
    if (!fs.existsSync(filePath)) return null;

    const content = fs.readFileSync(filePath, 'utf8');

    const result = {
      model: modelName,
      fieldIndexes: [],
      compoundIndexes: [],
      geoIndexes: [],
      duplicateIndexes: [],
      issues: [],
      recommendations: []
    };

    // 查找字段索引 (index: true)
    const fieldIndexPattern = /(\w+):\s*\{[^}]*index:\s*true[^}]*\}/g;
    let match;
    const seenFields = new Set();

    while ((match = fieldIndexPattern.exec(content)) !== null) {
      const fieldName = match[1];
      if (seenFields.has(fieldName)) {
        result.duplicateIndexes.push(fieldName);
      } else {
        seenFields.add(fieldName);
        result.fieldIndexes.push(fieldName);
      }
    }

    // 查找复合索引 (.index())
    const compoundIndexPattern = /(\w+Schema)?\.index\(\s*\{([^}]+)\}\s*\)/g;
    while ((match = compoundIndexPattern.exec(content)) !== null) {
      const indexDef = match[2];
      if (indexDef.includes('2dsphere')) {
        result.geoIndexes.push(indexDef);
      } else {
        result.compoundIndexes.push(indexDef);
      }
    }

    result.totalIndexes = result.fieldIndexes.length +
                          result.compoundIndexes.length +
                          result.geoIndexes.length;

    // 分析问题并提供建议
    this.checkIndexIssues(result);

    return result;
  }

  /**
   * 检查索引问题并提供优化建议
   */
  checkIndexIssues(result) {
    const { model, fieldIndexes, compoundIndexes, totalIndexes } = result;

    // 检查1: 过多的字段索引
    if (fieldIndexes.length > 5) {
      result.issues.push(`字段索引过多 (${fieldIndexes.length}个)，建议减少到5个以内`);
      result.recommendations.push('移除不常用的单字段索引，使用复合索引替代');
    }

    // 检查2: 总索引过多
    if (totalIndexes > 15) {
      result.issues.push(`总索引数过多 (${totalIndexes}个)，严重影响写入性能`);
      result.recommendations.push('审查所有索引，仅保留高频查询所需的索引');
    }

    // 检查3: 重复索引定义
    if (result.duplicateIndexes.length > 0) {
      result.issues.push(`重复索引定义: ${result.duplicateIndexes.join(', ')}`);
      result.recommendations.push('移除重复的索引定义，只保留一种方式');
    }

    // 检查4: 地理空间索引优化
    if (result.geoIndexes.length > 0) {
      for (const geoIndex of result.geoIndexes) {
        if (geoIndex.includes("'2d'")) {
          result.issues.push('使用旧的2d索引，应升级到2dsphere');
          result.recommendations.push('将2d索引改为2dsphere以获得更好的地理查询性能');
        }
      }
    }

    // 检查5: 复合索引优化
    let maxCompoundFields = 0;
    for (const idx of compoundIndexes) {
      const fieldCount = (idx.match(/1/g) || []).length;
      if (fieldCount > maxCompoundFields) {
        maxCompoundFields = fieldCount;
      }
    }

    if (maxCompoundFields > 5) {
      result.issues.push(`复合索引字段过多 (${maxCompoundFields}个字段)`);
      result.recommendations.push('限制复合索引字段数量≤5，遵循ESR原则');
    }
  }

  /**
   * 生成优化报告
   */
  generateReport() {
    const analysis = this.analyzeIndexes();

    const report = {
      ...analysis,

      // 优先级分类
      priority: {
        critical: analysis.summary.problematicModels.filter(m => m.totalIndexes > 20),
        high: analysis.summary.problematicModels.filter(m => m.totalIndexes > 10 && m.totalIndexes <= 20),
        medium: analysis.summary.problematicModels.filter(m => m.totalIndexes > 5 && m.totalIndexes <= 10)
      },

      // 优化建议
      optimizationPlan: this.generateOptimizationPlan(analysis)
    };

    // 保存报告
    const reportPath = `${this.reportDir}/index-optimization-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`报告已生成: ${reportPath}`);

    return report;
  }

  /**
   * 生成优化计划
   */
  generateOptimizationPlan(analysis) {
    const plan = {
      phase1: {
        name: '紧急优化（立即执行）',
        models: [],
        actions: []
      },
      phase2: {
        name: '常规优化（1周内）',
        models: [],
        actions: []
      },
      phase3: {
        name: '监控和维护（持续）',
        actions: []
      }
    };

    // 分类问题模型
    for (const model of analysis.summary.problematicModels) {
      if (model.totalIndexes > 20) {
        plan.phase1.models.push(model);
      } else if (model.totalIndexes > 10) {
        plan.phase2.models.push(model);
      }
    }

    // Phase 1 行动
    plan.phase1.actions = [
      '减少Product模型的索引到15个以内',
      '修复所有重复索引定义',
      '升级2d索引到2dsphere',
      '为高频查询添加专门的复合索引'
    ];

    // Phase 2 行动
    plan.phase2.actions = [
      '优化EmergencyResponse、Finance等模型',
      '添加索引使用率监控',
      '审查并移除低效索引'
    ];

    // Phase 3 行动
    plan.phase3.actions = [
      '设置慢查询监控阈值',
      '定期审查索引使用情况',
      '根据查询模式动态调整索引'
    ];

    return plan;
  }

  /**
   * 打印友好的报告摘要
   */
  printSummary() {
    const analysis = this.analyzeIndexes();

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║         数据库索引分析报告                           ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    console.log(`📊 统计信息:`);
    console.log(`   总模型数: ${analysis.summary.totalModels}`);
    console.log(`   总索引数: ${analysis.summary.totalIndexes}`);
    console.log(`   问题模型数: ${analysis.summary.problematicModels.length}\n`);

    if (analysis.summary.problematicModels.length > 0) {
      console.log(`⚠️  需要优化的模型:\n`);

      analysis.summary.problematicModels
        .sort((a, b) => b.totalIndexes - a.totalIndexes)
        .forEach(({ model, totalIndexes, issues }) => {
          console.log(`   🔹 ${model}: ${totalIndexes}个索引`);
          issues.forEach(issue => {
            console.log(`      - ${issue}`);
          });
          console.log('');
        });

      console.log(`💡 优化建议:\n`);
      console.log(`   1. 移除不必要的单字段索引`);
      console.log(`   2. 合并相似的复合索引`);
      console.log(`   3. 遵循ESR原则设计复合索引（等值-排序-范围）`);
      console.log(`   4. 定期审查慢查询日志`);
    } else {
      console.log(`✅ 没有发现严重的索引问题！`);
    }

    console.log('');
  }

  /**
   * 生成SQL脚本用于审查索引
   */
  generateIndexReviewScript() {
    const analysis = this.analyzeIndexes();

    const script = `-- MongoDB索引审查脚本
-- 生成时间: ${new Date().toISOString()}

-- 启用数据库
use smartvillage;

-- 查看所有集合的索引
db.getCollectionNames().forEach(function(collection) {
  var indexes = db[collection].getIndexes();
  print('\\n=== ' + collection + ' (' + indexes.length + ' indexes) ===');
  printjson(indexes.map(function(idx) {
    return {
      name: idx.name,
      keys: idx.key
    };
  }));
});

-- 查看集合统计信息
db.getCollectionNames().forEach(function(collection) {
  var stats = db[collection].stats();
  if (stats.count > 0) {
    print('\\n' + collection + ':');
    print('  文档数: ' + stats.count);
    print('  索引大小: ' + (stats.totalIndexSize / 1024).toFixed(2) + ' KB');
    print('  平均文档大小: ' + stats.avgObjSize + ' bytes');
  }
});
`;

    const scriptPath = `${this.reportDir}/review-indexes.js`;
    fs.writeFileSync(scriptPath, script);
    console.log(`索引审查脚本已生成: ${scriptPath}`);
    console.log(`运行命令: mongosh < ${scriptPath}`);
  }
}

module.exports = DatabaseIndexOptimizer;

// CLI执行
if (require.main === module) {
  const optimizer = new DatabaseIndexOptimizer();

  console.log('正在分析数据库索引...\n');
  optimizer.printSummary();

  console.log('正在生成详细报告...\n');
  optimizer.generateReport();

  console.log('正在生成索引审查脚本...\n');
  optimizer.generateIndexReviewScript();

  console.log('\n✅ 索引分析完成！');
  console.log('\n下一步:');
  console.log('1. 查看报告: ' + optimizer.reportDir);
  console.log('2. 运行审查脚本: mongosh reports/review-indexes.js');
  console.log('3. 根据建议优化问题模型\n');
}
