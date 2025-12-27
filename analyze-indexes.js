const mongoose = require('mongoose');
const fs = require('fs');

// 分析所有模型的索引定义
const modelsPath = './src/models';
const modelFiles = fs.readdirSync(modelsPath).filter(f => f.endsWith('.js') && f !== 'index.js');

console.log('=== 数据库索引分析 ===\n');

const indexIssues = [];
const indexSummary = [];

for (const file of modelFiles) {
  try {
    const content = fs.readFileSync(modelsPath + '/' + file, 'utf8');

    // 检查是否有索引
    const hasIndex = content.includes('.index(') || content.includes('index: true');

    // 检查是否有重复索引定义
    const schemaIndexCount = (content.match(/index:\s*true/g) || []).length;
    const explicitIndexCount = (content.match(/\.index\(/g) || []).length;

    // 检查是否有2dsphere索引
    const hasGeoIndex = content.includes('2dsphere');

    if (schemaIndexCount + explicitIndexCount > 0) {
      indexSummary.push({
        file: file.replace('.js', ''),
        fieldIndexes: schemaIndexCount,
        compoundIndexes: explicitIndexCount,
        geoIndexes: hasGeoIndex ? 1 : 0
      });
    }

    // 记录可能有问题的模型
    if (schemaIndexCount > 5) {
      indexIssues.push({ file: file.replace('.js', ''), issue: 'Too many field indexes', count: schemaIndexCount });
    }
  } catch (e) {
    // Skip files that can't be read
  }
}

// 输出汇总
console.log('=== 索引汇总 ===\n');
indexSummary.forEach(({ file, fieldIndexes, compoundIndexes, geoIndexes }) => {
  const total = fieldIndexes + compoundIndexes + geoIndexes;
  console.log(`${file}: ${total} total (field: ${fieldIndexes}, compound: ${compoundIndexes}, geo: ${geoIndexes})`);
});

console.log('\n=== 需要优化的模型 ===');
if (indexIssues.length > 0) {
  indexIssues.forEach(({ file, issue, count }) => {
    console.log(`- ${file}: ${issue} (${count} indexes)`);
  });
} else {
  console.log('没有发现明显的索引问题');
}

// 检查Mongoose重复索引警告
console.log('\n=== 重复索引警告 ===');
console.log('运行时注意以下Mongoose警告，这些表示可能存在重复的索引定义:');
console.log('- "Duplicate schema index" - 字段同时定义了 index: true 和 schema.index()');
