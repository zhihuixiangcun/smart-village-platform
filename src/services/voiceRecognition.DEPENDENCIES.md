# 语音识别服务依赖安装说明

## 需要安装的依赖

语音识别服务需要以下依赖包：

```bash
npm install ws
```

## 完整安装命令

```bash
# 安装WebSocket依赖
npm install ws

# 或者使用yarn
yarn add ws

# 或者使用pnpm
pnpm add ws
```

## 验证安装

安装完成后，可以运行以下命令验证：

```bash
node -e "console.log(require('ws'))"
```

如果没有报错，说明安装成功。

## 使用前的准备

1. **安装依赖**
   ```bash
   npm install ws
   ```

2. **配置环境变量**
   在 `.env` 文件中添加讯飞API配置：
   ```env
   IFLYTEK_APP_ID=your_app_id
   IFLYTEK_API_KEY=your_api_key
   IFLYTEK_API_SECRET=your_api_secret
   ```

3. **测试服务**
   ```bash
   node src/services/voiceRecognition.test.js
   ```

## 为什么需要ws

`ws` 是一个流行的WebSocket客户端和服务器库，用于与讯飞语音识别API建立WebSocket连接。讯飞API使用WebSocket协议进行实时语音数据传输。

## 可选依赖（其他语音服务）

如果你需要使用其他语音识别服务（如百度、腾讯），可能需要额外的依赖：

```bash
# 百度语音识别
npm install axios form-data

# 腾讯语音识别
npm install tencentcloud-sdk-nodejs
```

注意：当前的 `voiceRecognition.js` 主要使用讯飞API，所以只需要 `ws` 依赖。
