# 语音识别服务

集成讯飞语音识别API，支持22种中文方言识别，提供语音转文字输入功能，具备完善的错误重试机制。

## 功能特性

- ✅ 集成讯飞语音识别API
- ✅ 支持22种中文方言识别
- ✅ 实现语音转文字输入
- ✅ 添加错误重试机制（最多3次重试，指数退避）
- ✅ 支持音频文件路径和Buffer两种输入方式
- ✅ 提供统计信息和健康检查
- ✅ 自动清理临时音频文件

## 支持的方言列表

| 方言代码 | 方言名称 | 讯飞accent参数 |
|---------|---------|--------------|
| mandarin | 普通话 | mandarin |
| cantonese | 粤语 | cantonese |
| min-nan | 闽南语 | lmz |
| hakka | 客家话 | hx |
| shanghainese | 上海话 | shanghai |
| sichuanese | 四川话 | sichuan |
| northeastern | 东北话 | dongbei |
| tianjin | 天津话 | tianjin |
| henan | 河南话 | henan |
| shaanxi | 陕西话 | shaanxi |
| shandong | 山东话 | shandong |
| jiangsu | 江苏话 | jiangsu |
| anhui | 安徽话 | anhui |
| hubei | 湖北话 | hubei |
| hunan | 湖南话 | hunan |
| jiangxi | 江西话 | jiangxi |
| zhejiang | 浙江话 | zhejiang |
| fujian | 福建话 | fujian |
| guangdong | 广东话 | guangdong |
| guangxi | 广西话 | guangxi |
| yunnan | 云南话 | yunnan |
| guizhou | 贵州话 | guizhou |

## 环境配置

在 `.env` 文件中配置讯飞API凭证：

```env
# 讯飞语音识别API配置
IFLYTEK_APP_ID=your_app_id
IFLYTEK_API_KEY=your_api_key
IFLYTEK_API_SECRET=your_api_secret
```

## 安装依赖

```bash
npm install ws
```

## 快速开始

### 1. 导入服务

```javascript
const VoiceRecognitionService = require('./services/voiceRecognition');

// 创建服务实例
const voiceRecognition = new VoiceRecognitionService();
```

### 2. 基本使用

```javascript
// 使用音频文件路径识别
const result = await voiceRecognition.speechToText('./audio.wav', {
  dialect: 'mandarin',
  userId: 'user123'
});

if (result.success) {
  console.log('识别结果:', result.text);
  console.log('方言:', result.dialect);
  console.log('置信度:', result.confidence);
} else {
  console.error('识别失败:', result.error);
}
```

### 3. 使用音频Buffer

```javascript
const fs = require('fs');

// 读取音频数据
const audioBuffer = fs.readFileSync('./audio.wav');

// 直接使用Buffer识别
const result = await voiceRecognition.speechToText(audioBuffer, {
  dialect: 'cantonese',
  userId: 'user456'
});
```

### 4. 指定方言识别

```javascript
// 粤语识别
const result = await voiceRecognition.speechToText(audioBuffer, {
  dialect: 'cantonese',
  userId: 'user456'
});

// 四川话识别
const result = await voiceRecognition.speechToText(audioBuffer, {
  dialect: 'sichuanese',
  userId: 'user789'
});
```

## API 文档

### speechToText(audioData, options)

语音转文字主入口方法。

**参数:**
- `audioData` (Buffer|string): 音频数据或文件路径
- `options` (Object): 识别选项
  - `dialect` (string): 方言类型，默认 `'mandarin'`
  - `userId` (string): 用户ID，默认 `'unknown'`
  - `enableRetry` (boolean): 是否启用重试，默认 `true`

**返回值:**
```javascript
{
  success: boolean,       // 是否成功
  text: string,           // 识别文本
  dialect: string,        // 方言名称
  confidence: number,     // 置信度 (0-1)
  processingTime: number,  // 处理时间戳
  isPartial: boolean,     // 是否为部分结果
  error?: string,         // 错误信息（失败时）
  attempts?: number       // 重试次数（失败时）
}
```

**示例:**
```javascript
const result = await voiceRecognition.speechToText('./audio.wav', {
  dialect: 'mandarin',
  userId: 'user123',
  enableRetry: true
});
```

### getSupportedDialects()

获取支持的方言列表。

**返回值:**
```javascript
[
  {
    key: 'mandarin',
    name: '普通话',
    accent: 'mandarin'
  },
  // ...
]
```

**示例:**
```javascript
const dialects = voiceRecognition.getSupportedDialects();
console.log(`支持${dialects.length}种方言`);
```

### getStats()

获取服务统计信息。

**返回值:**
```javascript
{
  totalRequests: number,         // 总请求数
  successfulRequests: number,    // 成功请求数
  failedRequests: number,        // 失败请求数
  retryCount: number,           // 重试次数
  dialectUsage: Object,         // 方言使用统计
  successRate: string,          // 成功率（百分比）
  averageRetries: string        // 平均重试次数
}
```

**示例:**
```javascript
const stats = voiceRecognition.getStats();
console.log('成功率:', stats.successRate);
console.log('平均重试次数:', stats.averageRetries);
```

### healthCheck()

服务健康检查。

**返回值:**
```javascript
{
  status: 'healthy' | 'error',  // 服务状态
  message: string,               // 状态消息
  config?: Object                // 配置信息（健康时）
}
```

**示例:**
```javascript
const health = await voiceRecognition.healthCheck();
if (health.status === 'healthy') {
  console.log('服务正常');
} else {
  console.error('服务异常:', health.message);
}
```

### cleanupTempFiles()

清理临时音频文件。

**返回值:**
```javascript
{
  success: boolean,        // 是否成功
  deletedCount: number,   // 删除的文件数量
  error?: string          // 错误信息（失败时）
}
```

**示例:**
```javascript
const result = await voiceRecognition.cleanupTempFiles();
console.log(`删除了${result.deletedCount}个文件`);
```

### resetStats()

重置统计信息。

**示例:**
```javascript
voiceRecognition.resetStats();
```

## 错误重试机制

服务实现了智能的错误重试机制：

### 重试配置
- **最大重试次数**: 3次
- **初始重试延迟**: 1000ms
- **退避倍数**: 2（每次重试延迟翻倍）
- **可重试错误**: ECONNRESET, ECONNREFUSED, ETIMEDOUT, EPIPE, network

### 重试策略
1. 第一次重试: 1000ms 后
2. 第二次重试: 2000ms 后
3. 第三次重试: 4000ms 后

### 日志示例
```
语音识别失败，1000ms后进行第2次重试 { attempt: 1, error: 'ECONNRESET' }
语音识别失败，2000ms后进行第3次重试 { attempt: 2, error: 'ECONNRESET' }
语音识别失败，4000ms后进行第4次重试 { attempt: 3, error: 'ECONNRESET' }
识别失败，已重试3次: ECONNRESET
```

## 使用示例

### 完整示例

```javascript
const VoiceRecognitionService = require('./services/voiceRecognition');

async function main() {
  const voiceRecognition = new VoiceRecognitionService();

  // 健康检查
  const health = await voiceRecognition.healthCheck();
  if (health.status !== 'healthy') {
    console.error('服务不健康:', health.message);
    return;
  }

  // 获取支持的方言
  const dialects = voiceRecognition.getSupportedDialects();
  console.log(`支持${dialects.length}种方言`);

  // 识别音频
  const result = await voiceRecognition.speechToText('./audio.wav', {
    dialect: 'mandarin',
    userId: 'user123'
  });

  if (result.success) {
    console.log('识别结果:', result.text);
  } else {
    console.error('识别失败:', result.error);
  }

  // 查看统计
  const stats = voiceRecognition.getStats();
  console.log('成功率:', stats.successRate);

  // 清理临时文件
  await voiceRecognition.cleanupTempFiles();
}

main().catch(console.error);
```

更多示例请参考 `voiceRecognition.example.js` 文件。

## 音频格式要求

- **格式**: WAV (PCM)
- **采样率**: 16000 Hz
- **声道数**: 1 (单声道)
- **位深**: 16-bit
- **编码**: raw

## 注意事项

1. **API凭证**: 确保在 `.env` 文件中正确配置讯飞API凭证
2. **音频质量**: 建议使用清晰的音频，无噪音干扰
3. **音频时长**: 单次识别建议不超过60秒
4. **网络连接**: 需要稳定的网络连接到讯飞API
5. **并发限制**: 讯飞API有并发限制，注意控制请求频率
6. **重试机制**: 默认启用重试，可根据需要关闭

## 故障排查

### 问题：识别返回"未识别到有效文本"

**可能原因**:
- 音频数据为空
- 音频格式不符合要求
- 音频质量差

**解决方法**:
- 检查音频文件是否存在
- 确认音频格式为16k/16bit/单声道WAV
- 尝试使用更清晰的音频

### 问题：连接超时

**可能原因**:
- 网络连接不稳定
- 讯飞API服务异常
- 防火墙阻止WebSocket连接

**解决方法**:
- 检查网络连接
- 查看讯飞服务状态
- 配置防火墙允许WebSocket连接

### 问题：API鉴权失败

**可能原因**:
- API凭证错误
- API凭证已过期
- 系统时间不正确

**解决方法**:
- 检查 `.env` 文件中的API凭证
- 更新API凭证
- 同步系统时间

## 性能优化

### 1. 批量识别

```javascript
const audioFiles = ['./audio1.wav', './audio2.wav', './audio3.wav'];

for (const file of audioFiles) {
  const result = await voiceRecognition.speechToText(file);
  // 处理结果
}
```

### 2. 方言预判

根据用户所在地预先选择方言，减少识别错误。

### 3. 音频预处理

使用音频预处理工具降噪、标准化音频质量。

### 4. 缓存结果

对于重复的音频，可以考虑缓存识别结果。

## 扩展功能

服务可以轻松扩展以下功能：

1. **实时语音识别**: 使用WebSocket实现实时识别
2. **方言自动检测**: 自动检测音频的方言类型
3. **VAD语音活动检测**: 自动检测语音开始和结束
4. **语音增强**: 集成语音降噪和增强算法
5. **结果后处理**: 添加标点、修正错别字等

## 许可证

MIT

## 支持

如有问题，请联系开发团队或提交Issue。
