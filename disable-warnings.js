const fs = require('fs');
const path = require('path');

// 需要添加 suppressReservedKeysWarning 的schema文件
const schemas = [
  'src/models/Purchaser.js',
  'src/models/DataVersion.js',
  'src/models/FaceRecognition.js',
  'src/models/Announcement.js',
  'src/models/RealtimeNotification.js'
];

schemas.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.log(`文件不存在: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // 查找schema的最后一个 }），然后添加选项
  let found = false;
  for (let i = lines.length - 1; i >= 0; i--) {
    // 查找类似 }, { timestamps: true 或 } 只有一个}
    if (lines[i].match(/^}\s*,?\s*{\s*(timestamps|collection)/)) {
      // 在这个选项对象中添加 suppressReservedKeysWarning
      if (!lines[i].includes('suppressReservedKeysWarning')) {
        lines[i] = lines[i].replace(
          /(\{\s*)(timestamps)/,
          '$1suppressReservedKeysWarning: true,\n    $2'
        );
        found = true;
        console.log(`✅ 已修复: ${file}`);
      }
      break;
    }
  }
  
  if (found) {
    fs.writeFileSync(filePath, lines.join('\n'));
  }
});

console.log('完成!');
