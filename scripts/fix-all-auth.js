/**
 * 批量修复所有路由文件中的auth中间件引用
 * 支持多种变量名和模式
 */

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../src/routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

let fixedCount = 0;
let errorCount = 0;

files.forEach(file => {
  const filePath = path.join(routesDir, file);

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 检查文件导入了什么类型的auth中间件
    const importMatch = content.match(/const\s+(auth\w*)\s*=\s*require\(['"]\.\.\/middleware\/auth['"]\)/);
    if (importMatch) {
      const varName = importMatch[1]; // 获取变量名 (auth, authMiddleware等)

      // 模式1: `, authMiddleware, async` -> `, authMiddleware.authenticate, async`
      const pattern1 = new RegExp(`,\\s*${varName}\\s*,\\s*async`, 'g');
      content = content.replace(pattern1, `, ${varName}.authenticate, async`);

      // 模式2: 单独一行的 authMiddleware -> authMiddleware.authenticate
      const pattern2 = new RegExp(`^\\s*${varName}\\s*,?$`, 'gm');
      content = content.replace(pattern2, (match) => {
        // 保持原有的缩进
        const indent = match.match(/^\s*/)[0];
        return `${indent}${varName}.authenticate,`;
      });
    }

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 已修复: ${file}`);
      fixedCount++;
    }
  } catch (error) {
    console.error(`❌ 处理失败: ${file} - ${error.message}`);
    errorCount++;
  }
});

console.log(`\n总计: ${fixedCount} 个文件已修复, ${errorCount} 个文件出错`);
