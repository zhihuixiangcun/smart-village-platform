# 智慧乡村移动端真机调试指南

## 一、微信小程序真机调试

### 1.1 准备工作

1. **安装微信开发者工具**
   - 下载地址：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
   - 建议使用最新稳定版

2. **注册微信小程序**
   - 访问 https://mp.weixin.qq.com/
   - 注册并登录小程序后台
   - 获取 AppID

3. **配置项目 AppID**
   ```json
   // manifest.json
   {
     "mp-weixin": {
       "appid": "your-wechat-appid"
     }
   }
   ```

### 1.2 真机调试步骤

#### 方法一：扫码预览（推荐）

1. **开发项目**
   ```bash
   npm run dev:mp-weixin
   ```

2. **打开微信开发者工具**
   - 导入项目：选择 `client-mobile/dist/dev/mp-weixin`
   - 选择小程序项目类型
   - 输入 AppID

3. **真机预览**
   - 点击工具栏"预览"按钮
   - 生成二维码
   - 微信扫描二维码
   - 在手机上查看效果

#### 方法二：真机调试

1. **开启调试模式**
   - 点击工具栏"真机调试"
   - 生成二维码
   - 微信扫描二维码

2. **使用vconsole**
   - 在手机上打开调试
   - 查看console日志
   - 查看网络请求
   - 查看存储信息

### 1.3 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 二维码扫描后无反应 | 版本过低 | 升级微信版本 |
| 无法获取用户信息 | 未配置域名 | 配置服务器域名白名单 |
| 网络请求失败 | 域名未备案 | 使用合法域名 |
| 语音功能无法使用 | 未授权权限 | 在app.json中配置scope |

---

## 二、APP真机调试

### 2.1 Android调试

#### 方法一：使用HBuilderX

1. **安装HBuilderX**
   - 下载地址：https://www.dcloud.io/hbuilderx.html
   - 安装后打开项目

2. **连接Android设备**
   - 开启USB调试
   - 连接电脑

3. **运行到设备**
   - 点击"运行" -> "运行到手机或模拟器"
   - 选择Android设备
   - 自动安装调试基座

#### 方法二：使用Chrome调试

1. **开启Chrome远程调试**
   ```bash
   # 在Chrome中访问
   chrome://inspect
   ```

2. **查看设备列表**
   - 确认设备已连接
   - 点击"inspect"开始调试

3. **使用DevTools**
   - 查看Console
   - 查看Network
   - 查看Elements

### 2.2 iOS调试

1. **安装Safari开发者工具**
   - Mac: Safari -> 偏好设置 -> 高级 -> 显示开发菜单

2. **连接iOS设备**
   - 使用USB连接Mac
   - 在Safari中调试

---

## 三、H5真机调试

### 3.1 使用Chrome远程调试

1. **启动开发服务器**
   ```bash
   npm run dev:h5
   ```

2. **手机和电脑在同一网络**
   - 查看电脑IP地址
   - 手机访问: `http://电脑IP:3000`

3. **Chrome调试**
   - Chrome: chrome://inspect
   - 查找并调试页面

### 3.2 使用eruda（移动端调试）

1. **安装eruda**
   ```bash
   npm install eruda --save-dev
   ```

2. **在main.js中引入**
   ```javascript
   if (process.env.NODE_ENV === 'development') {
     import('eruda').then(eruda => eruda.init())
   }
   ```

3. **在手机上访问**
   - 会显示调试按钮
   - 点击打开调试面板

---

## 四、调试技巧

### 4.1 Console调试

```javascript
// 普通日志
console.log('调试信息')

// 警告
console.warn('警告信息')

// 错误
console.error('错误信息')

// 表格输出
console.table({ name: '张三', age: 30 })

// 分组输出
console.group('分组1')
console.log('信息1')
console.log('信息2')
console.groupEnd()
```

### 4.2 网络调试

```javascript
// 在request.js中添加日志
console.log('请求发送:', config.url, config.data)
console.log('响应接收:', response)
```

### 4.3 性能调试

```javascript
// 使用performance API
console.time('operation')
// ... 操作代码
console.timeEnd('operation')
```

---

## 五、真机测试清单

### 5.1 功能测试

- [ ] 登录/注册流程
- [ ] 三种字体模式切换
- [ ] 语音识别功能
- [ ] 语音播报功能
- [ ] 离线数据同步
- [ ] 各功能模块正常

### 5.2 适老化测试

- [ ] 大字模式显示正常
- [ ] 触控区域足够大
- [ ] 对比度符合标准
- [ ] 操作流程简化

### 5.3 兼容性测试

| 平台 | 版本 | 状态 |
|------|------|------|
| 微信小程序 | 8.0+ | 待测试 |
| iOS Safari | 15+ | 待测试 |
| Android Chrome | 90+ | 待测试 |
| Android App | 10+ | 待测试 |

---

## 六、调试工具推荐

1. **微信开发者工具** - 小程序调试
2. **Chrome DevTools** - H5调试
3. **Safari Web Inspector** - iOS调试
4. **vconsole** - 移动端调试
5. **eruda** - 移动端控制台

---

更新时间：2024-12-30
