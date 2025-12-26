/**
 * 清理console.log调试代码脚本
 * 将console.log替换为logger调用或直接删除
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const logger = require('../src/utils/logger');

// 需要处理的目录
const directories = [
  path.join(__dirname, '../src/controllers'),
  path.join(__dirname, '../src/services'),
  path.join(__dirname, '../src/middleware'),
  path.join(__dirname, '../src/routes'),
  path.join(__dirname, '../src/models')
];

// 统计信息
const stats = {
  filesProcessed: 0,
  consoleLogRemoved: 0,
  consoleLogConverted: 0,
  errors: []
};

/**
 * 检查文件是否已有logger导入
 */
function hasLoggerImport(content) {
  return /require\s*\(\s*['"].*utils\/logger['"]\s*\)|from\s+['"].*utils\/logger['"]/.test(content);
}

/**
 * 确保文件有logger导入
 */
function ensureLoggerImport(content, filePath) {
  if (!hasLoggerImport(content)) {
    // 在其他require语句之后添加logger导入
    const importStatement = `\nconst logger = require('../utils/logger');`;

    // 根据文件深度决定相对路径
    const depth = filePath.split(path.sep).length - 4; // src为基准
    let relativePath = '';
    for (let i = 0; i < depth; i++) {
      relativePath += '../';
    }
    if (!relativePath) relativePath = './';

    const loggerImport = `\nconst logger = require('${relativePath}utils/logger');`;

    // 查找最后一个require语句并插入
    const lines = content.split('\n');
    let lastRequireIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*(const|let|var)\s+\w+\s*=\s*require\(/.test(lines[i])) {
        lastRequireIndex = i;
      }
    }

    if (lastRequireIndex >= 0) {
      lines.splice(lastRequireIndex + 1, 0, loggerImport.trim());
      return lines.join('\n');
    } else if (lines.length > 0 && lines[0].trim().startsWith('/**')) {
      // 如果有文档注释，在注释后添加
      let endIndex = 0;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].includes('*/')) {
          endIndex = i;
          break;
        }
      }
      lines.splice(endIndex + 1, 0, '', loggerImport.trim());
      return lines.join('\n');
    } else {
      return loggerImport + '\n' + content;
    }
  }
  return content;
}

/**
 * 转换console语句为logger调用
 */
function convertConsoleToLogger(content) {
  let convertedCount = 0;
  let removedCount = 0;

  // 转换模式映射
  const conversions = [
    {
      pattern: /console\.log\(\s*['"]\[DEBUG\]\s*([^'"]+)['"]\s*([,\s\S]*?)\);?\s*\n/g,
      replacement: (match, type, args) => {
        removedCount++;
        return ''; // DEBUG日志直接删除
      }
    },
    {
      pattern: /console\.log\(([^)]+)\);?\s*\n/g,
      replacement: (match, args) => {
        convertedCount++;
        return `logger.debug(${args});\n`;
      }
    },
    {
      pattern: /console\.error\(([^)]+)\);?\s*\n/g,
      replacement: (match, args) => {
        convertedCount++;
        return `logger.error(${args});\n`;
      }
    },
    {
      pattern: /console\.warn\(([^)]+)\);?\s*\n/g,
      replacement: (match, args) => {
        convertedCount++;
        return `logger.warn(${args});\n`;
      }
    },
    {
      pattern: /console\.info\(([^)]+)\);?\s*\n/g,
      replacement: (match, args) => {
        convertedCount++;
        return `logger.info(${args});\n`;
      }
    },
    {
      pattern: /console\.debug\(([^)]+)\);?\s*\n/g,
      replacement: (match, args) => {
        convertedCount++;
        return `logger.debug(${args});\n`;
      }
    }
  ];

  let newContent = content;

  for (const conversion of conversions) {
    newContent = newContent.replace(conversion.pattern, conversion.replacement);
  }

  return { content: newContent, convertedCount, removedCount };
}

/**
 * 处理单个文件
 */
async function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // 检查是否包含console语句
    if (!/console\.(log|error|warn|info|debug)/.test(content)) {
      return;
    }

    stats.filesProcessed++;

    // 确保有logger导入
    let newContent = ensureLoggerImport(content, filePath);

    // 转换console语句
    const result = convertConsoleToLogger(newContent);
    newContent = result.content;

    stats.consoleLogConverted += result.convertedCount;
    stats.consoleLogRemoved += result.removedCount;

    // 写回文件
    fs.writeFileSync(filePath, newContent, 'utf8');

    logger.info(`已处理: ${path.relative(process.cwd(), filePath)}`, {
      converted: result.convertedCount,
      removed: result.removedCount
    });

  } catch (error) {
    stats.errors.push({
      file: filePath,
      error: error.message
    });
    logger.error(`处理文件失败: ${filePath}`, { error: error.message });
  }
}

/**
 * 递归获取目录下所有JS文件
 */
function getJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getJsFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/**
 * 主处理函数
 */
async function cleanupConsoleLogs() {
  logger.info('开始清理console.log调试代码...');

  const allFiles = [];
  for (const dir of directories) {
    if (fs.existsSync(dir)) {
      const files = getJsFiles(dir);
      allFiles.push(...files);
    }
  }

  logger.info(`找到 ${allFiles.length} 个JS文件待处理`);

  for (const file of allFiles) {
    await processFile(file);
  }

  // 打印统计信息
  logger.info('清理完成！', {
    filesProcessed: stats.filesProcessed,
    consoleLogConverted: stats.consoleLogConverted,
    consoleLogRemoved: stats.consoleLogRemoved,
    errors: stats.errors.length
  });

  if (stats.errors.length > 0) {
    logger.warn('处理过程中有错误:', { errors: stats.errors });
  }

  console.log('\n=== 清理统计 ===');
  console.log(`处理文件数: ${stats.filesProcessed}`);
  console.log(`转换console语句: ${stats.consoleLogConverted}`);
  console.log(`删除DEBUG日志: ${stats.consoleLogRemoved}`);
  console.log(`错误数: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n错误详情:');
    stats.errors.forEach(err => {
      console.log(`  ${err.file}: ${err.error}`);
    });
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('=== 预览模式 ===');
    console.log('使用 --dry-run 参数只显示不会修改文件\n');
  }

  cleanupConsoleLogs().catch(error => {
    console.error('清理失败:', error);
    process.exit(1);
  });
}

module.exports = { cleanupConsoleLogs, processFile, convertConsoleToLogger };
