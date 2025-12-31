# 智慧乡村移动端部署指南

## 一、环境准备

### 1.1 开发环境

```json
{
  "dependencies": {
    "@dcloudio/uni-app": "^3.0.0",
    "vue": "^3.2.45",
    "pinia": "^2.0.28",
    "uview-plus": "^3.1.43"
  }
}
```

### 1.2 生产环境配置

1. **配置生产API地址**
   ```javascript
   // vite.config.js
   export default defineConfig({
     define: {
       __API_BASE_URL__: JSON.stringify('https://api.smartvillage.com')
     }
   })
   ```

2. **配置环境变量**
   ```bash
   # .env.production
   NODE_ENV=production
   VUE_APP_API_BASE_URL=https://api.smartvillage.com
   ```

---

## 二、微信小程序部署

### 2.1 配置小程序

1. **设置AppID**
   ```json
   // manifest.json
   {
     "mp-weixin": {
       "appid": "wxYOURAPPID"
     }
   }
   ```

2. **配置服务器域名**
   - 登录微信公众平台
   - 开发 -> 开发管理 -> 服务器域名
   - 添加request合法域名
   - 添加uploadFile合法域名
   - 添加downloadFile合法域名

### 2.2 构建与上传

1. **构建生产版本**
   ```bash
   npm run build:mp-weixin
   ```

2. **使用微信开发者工具**
   - 打开项目：`dist/build/mp-weixin`
   - 点击"上传"按钮
   - 填写版本号：1.0.0
   - 填写项目备注

3. **提交审核**
   - 登录微信公众平台
   - 版本管理 -> 开发版本
   - 提交审核
   - 等待审核通过

4. **发布上线**
   - 审核通过后点击"发布"
   - 选择全量发布或灰度发布

### 2.3 版本更新策略

```javascript
// 小程序更新检测
const updateManager = uni.getUpdateManager()

updateManager.onCheckForUpdate((res) => {
  if (res.hasUpdate) {
    updateManager.onUpdateReady(() => {
      uni.showModal({
        title: '更新提示',
        content: '新版本已准备好，是否重启应用？',
        success: (res) => {
          if (res.confirm) {
            updateManager.applyUpdate()
          }
        }
      })
    })
  }
})
```

---

## 三、H5部署

### 3.1 构建生产版本

```bash
npm run build:h5
```

### 3.2 Nginx配置

```nginx
server {
  listen 80;
  server_name mobile.smartvillage.com;

  root /var/www/smart-village-mobile;
  index index.html;

  # gzip压缩
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;
  gzip_min_length 1000;

  # SPA路由
  location / {
    try_files $uri $uri/ /index.html;
  }

  # API代理
  location /api/ {
    proxy_pass http://localhost:3001/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # 静态资源缓存
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

### 3.3 CDN部署

1. **上传静态资源到CDN**
   ```bash
   # 上传到阿里云OSS/腾讯云COS
   - dist/build/h5/static/*
   ```

2. **配置CDN加速**
   - 配置CDN域名
   - 配置HTTPS证书
   - 配置缓存规则

---

## 四、APP部署

### 4.1 使用HBuilderX云打包

1. **打开HBuilderX**
   - 导入项目
   - 配置manifest.json

2. **配置App信息**
   ```json
   {
     "app-plus": {
       "distribute": {
         "android": {
           "packageName": "com.smartvillage.mobile"
         },
         "ios": {
           "bundleid": "com.smartvillage.mobile"
         }
       }
     }
   }
   ```

3. **云打包**
   - 发行 -> 原生App-云打包
   - 选择Android/iOS
   - 选择DCloud证书
   - 点击"打包"

### 4.2 本地打包

#### Android打包

1. **安装Android Studio**
2. **导入项目**
   - 导入 `platforms/android`
3. **生成签名**
   ```bash
   keytool -genkey -v -keystore smart-village.keystore
   ```
4. **构建APK**
   ```bash
   ./gradlew assembleRelease
   ```

#### iOS打包

1. **安装Xcode**
2. **配置证书和Provisioning Profile**
3. **构建IPA**
   ```bash
   xcodebuild -archivePath
   ```

---

## 五、应用商店发布

### 5.1 Android应用商店

| 商店 | 地址 | 审核周期 |
|------|------|----------|
| Google Play | https://play.google.com | 1-3天 |
| 华为应用市场 | https://developer.huawei.com | 1-2天 |
| 小米应用商店 | https://dev.mi.com | 1-2天 |
| OPPO软件商店 | https://open.oppomobile.com | 2-3天 |
| vivo应用商店 | https://dev.vivo.com.cn | 2-3天 |

### 5.2 iOS App Store

1. **申请开发者账号**
   - 费用：$99/年
   - 访问 https://developer.apple.com

2. **准备素材**
   - 应用图标（1024x1024）
   - 应用截图（各种尺寸）
   - 应用描述

3. **提交审核**
   - 登录App Store Connect
   - 创建新应用
   - 上传IPA
   - 填写应用信息
   - 提交审核

4. **审核周期**
   - 通常：1-2周
   - 可能需要补充材料

---

## 六、CI/CD自动化部署

### 6.1 GitHub Actions配置

```yaml
name: Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'

    - name: Install dependencies
      run: npm install

    - name: Build MP-WEIXIN
      run: npm run build:mp-weixin

    - name: Upload to OSS
      uses: manyuanrong/upload-oss-action@master
      with:
        key: ${{ secrets.OSS_KEY }}
        secret: ${{ secrets.OSS_SECRET }}
        bucket: smart-village
        endpoint: oss-cn-hangzhou.aliyuncs.com
        folder: dist/build/mp-weixin
```

### 6.2 Docker部署

```dockerfile
# Dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build:h5

EXPOSE 3000

CMD ["npm", "run", "preview"]
```

---

## 七、部署检查清单

### 7.1 发布前检查

- [ ] 所有测试通过
- [ ] 代码已压缩优化
- [ ] 移除console.log
- [ ] API地址配置正确
- [ ] 版本号已更新
- [ ] 图标和启动页已配置
- [ ] 隐私政策和用户协议已添加

### 7.2 发布后验证

- [ ] 应用可正常下载
- [ ] 登录功能正常
- [ ] 主要功能可用
- [ ] 无崩溃和严重bug
- [ ] 性能符合预期

---

## 八、监控与维护

### 8.1 错误监控

```javascript
// 错误捕获
uni.onError((error) => {
  // 上报错误
  reportError({
    message: error.message,
    stack: error.stack,
    platform: uni.getSystemInfoSync().platform
  })
})
```

### 8.2 性能监控

```javascript
// 性能数据收集
const performanceData = {
  pageLoadTime: 0,
  apiResponseTime: 0,
  errorRate: 0
}

// 上报监控数据
setInterval(() => {
  reportPerformance(performanceData)
}, 60000)
```

---

更新时间：2024-12-30
