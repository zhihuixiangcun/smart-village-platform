/**
 * 修复路由文件中的auth中间件引用
 * 使用Node.js正确处理UTF-8编码
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/routes/realtimeRoutes.js');

// 读取文件（UTF-8编码）
let content = fs.readFileSync(filePath, 'utf8');

// 替换所有的 ', auth, ' 为 ', auth.authenticate, '
content = content.replace(/,\s*auth,\s*async/g, ', auth.authenticate, async');

// 写回文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ 修复完成: realtimeRoutes.js');
console.log('已将所有 ", auth, " 替换为 ", auth.authenticate, "');
