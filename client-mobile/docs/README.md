# 智慧乡村移动端

## 📱 项目说明

基于 Uni-app 开发的智慧乡村移动端应用，支持微信小程序、APP、H5 多端发布。

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
# 微信小程序
npm run dev:mp-weixin

# H5
npm run dev:h5

# APP
npm run dev:app
```

### 生产构建
```bash
npm run build:mp-weixin
npm run build:h5
npm run build:app
```

## 📚 更多文档

- [项目总结](PROJECT_SUMMARY.md)
- [调试指南](docs/DEBUG.md)
- [部署指南](docs/DEPLOY.md)

## 🏗️ 项目结构

```
client-mobile/
├── src/              # 源代码
│   ├── api/         # API接口
│   ├── components/  # 组件
│   ├── pages/       # 页面
│   ├── static/      # 静态资源
│   ├── store/       # 状态管理
│   ├── styles/      # 样式文件
│   ├── utils/       # 工具函数
│   ├── App.vue      # 根组件
│   ├── main.js      # 入口文件
│   └── pages.json   # 页面配置
├── docs/            # 文档
├── tests/           # 测试
└── package.json     # 项目配置
```

## ✨ 核心特性

- **适老化设计**: 三种字体模式、语音交互
- **离线优先**: 离线队列、自动同步
- **多端支持**: 小程序、APP、H5统一代码
- **安全可靠**: JWT认证、数据加密

## 📄 许可证

MIT License
