# MediaPipe 人脸识别迁移指南

> **文档版本**: v1.0
> **创建日期**: 2026-01-27
> **目的**: 为将来从 face-api.js 迁移到 MediaPipe 提供参考

---

## 📋 目录

1. [迁移背景](#迁移背景)
2. [技术对比](#技术对比)
3. [迁移步骤](#迁移步骤)
4. [代码映射](#代码映射)
5. [测试验证](#测试验证)
6. [回滚方案](#回滚方案)

---

## 迁移背景

### 为什么要迁移？

**face-api.js 当前问题：**
- 🔴 依赖存在高危漏洞（node-fetch, tar）
- 🟡 维护更新频率较低
- 🟡 模型文件较大（~5MB）
- 🟡 浏览器兼容性问题

**MediaPipe 优势：**
- ✅ Google 官方维护，更新频繁
- ✅ 依赖安全，无已知高危漏洞
- ✅ 模型更优化（~200KB）
- ✅ 支持 WebAssembly，性能更好
- ✅ 支持更多 AI 功能（手势、姿态等）

---

## 技术对比

### 功能对比表

| 功能 | face-api.js | MediaPipe | 备注 |
|------|-------------|-----------|------|
| **人脸检测** | ✅ | ✅ | MediaPipe 更准确 |
| **人脸识别** | ✅ | ⚠️ | 需要额外实现 |
| **表情识别** | ✅ | ✅ | MediaPipe 支持更多 |
| **年龄/性别** | ✅ | ✅ | MediaPipe 更准确 |
| **活体检测** | ✅ | ⚠️ | 需要额外实现 |
| **模型大小** | ~5MB | ~200KB | MediaPipe 更小 |
| **初始化时间** | 较慢 | 快 | MediaPipe 优势 |
| **浏览器支持** | 广泛 | 现代浏览器 | 需考虑兼容性 |

### API 对比

#### face-api.js
```javascript
import * as faceApi from 'face-api.js';

// 加载模型
await faceApi.nets.ssdMobilenetv1.loadFromUri('/models');

// 检测人脸
const detections = await faceApi.detectAllFaces(video);
```

#### MediaPipe
```javascript
import { FaceDetection } from '@mediapipe/face_detection';

// 创建实例
const faceDetection = new FaceDetection({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
}});

// 检测人脸
await faceDetection.send({image: video});
```

---

## 迁移步骤

### 阶段一：准备阶段

#### 1. 创建迁移分支
```bash
git checkout -b feature/mediapipe-migration
git push -u origin feature/mediapipe-migration
```

#### 2. 安装依赖
```bash
# 安装 MediaPipe
npm install @mediapipe/face_detection

# 保留 face-api.js 作为备份（暂时不卸载）
# npm uninstall face-api.js
```

#### 3. 备份现有代码
```bash
# 备份人脸识别组件
cp client/src/components/FaceRecognition/FaceCapture.vue \
   client/src/components/FaceRecognition/FaceCapture.vue.backup
```

### 阶段二：代码迁移

#### 1. 创建新的 MediaPipe 封装

创建文件：`client/src/services/mediapipeService.js`

```javascript
/**
 * MediaPipe 人脸检测服务
 * 替代 face-api.js
 */

import { FaceDetection } from '@mediapipe/face_detection';

class MediaPipeFaceService {
  constructor() {
    this.faceDetection = null;
    this.isInitialized = false;
  }

  /**
   * 初始化 MediaPipe
   */
  async initialize(options = {}) {
    const {
      modelType = 'short',  // 'short' 或 'full'
      minDetectionConfidence = 0.5,
    } = options;

    this.faceDetection = new FaceDetection({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
      },
      modelType,
      minDetectionConfidence,
    });

    await this.faceDetection.initialize();
    this.isInitialized = true;
  }

  /**
   * 检测人脸
   */
  async detectFaces(imageElement) {
    if (!this.isInitialized) {
      throw new Error('MediaPipe Face Detection 未初始化');
    }

    return new Promise((resolve, reject) => {
      this.faceDetection.onResults((results) => {
        if (results.detections) {
          resolve(results.detections.map(d => ({
            x: d.boundingBox.xCenter,
            y: d.boundingBox.yCenter,
            width: d.boundingBox.width,
            height: d.boundingBox.height,
            confidence: d.score[0],
          })));
        } else {
          resolve([]);
        }
      });

      this.faceDetection.send({image: imageElement}).catch(reject);
    });
  }

  /**
   * 清理资源
   */
  dispose() {
    if (this.faceDetection) {
      this.faceDetection.close();
      this.faceDetection = null;
    }
    this.isInitialized = false;
  }
}

export default new MediaPipeFaceService();
```

#### 2. 更新 FaceCapture 组件

修改文件：`client/src/components/FaceRecognition/FaceCapture.vue`

**关键变更点：**

| 原代码 (face-api.js) | 新代码 (MediaPipe) |
|----------------------|---------------------|
| `import * as faceApi from 'face-api.js'` | `import mediapipeService from '@/services/mediapipeService'` |
| `await faceApi.nets.ssdMobilenetv1.loadFromUri(...)` | `await mediapipeService.initialize()` |
| `await faceApi.detectAllFaces(video)` | `await mediapipeService.detectFaces(video)` |

**完整的组件改造示例：**

```vue
<script>
import mediapipeService from '@/services/mediapipeService';

export default {
  name: 'FaceCapture',

  async mounted() {
    try {
      // 初始化 MediaPipe（替代 face-api.js）
      await mediapipeService.initialize({
        modelType: 'short',
        minDetectionConfidence: 0.6,
      });

      this.$emit('initialized');
    } catch (error) {
      console.error('MediaPipe 初始化失败:', error);
      this.errorMessage = '人脸检测初始化失败';
    }
  },

  methods: {
    async detectFaces() {
      try {
        const video = this.$refs.videoElement;

        // 使用 MediaPipe 检测
        const detections = await mediapipeService.detectFaces(video);

        // 处理检测结果
        this.processDetections(detections);
      } catch (error) {
        console.error('人脸检测失败:', error);
      }
    },

    processDetections(detections) {
      // 清除之前的检测结果
      const canvas = this.$refs.overlayCanvas;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制检测框
      detections.forEach(detection => {
        const { x, y, width, height } = detection;

        ctx.strokeStyle = detection.confidence > 0.8 ? '#00ff00' : '#ffff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - width/2, y - height/2, width, height);
      });

      // 更新人脸质量评分
      if (detections.length > 0) {
        this.faceQuality = Math.round(detections[0].confidence * 100);
      } else {
        this.faceQuality = 0;
      }
    }
  },

  beforeUnmount() {
    // 清理 MediaPipe 资源
    mediapipeService.dispose();
  }
}
</script>
```

### 阶段三：测试验证

#### 1. 功能测试清单

- [ ] 初始化成功
- [ ] 实时人脸检测
- [ ] 多人脸检测
- [ ] 检测框显示准确
- [ ] 质量评分正常
- [ ] 图像捕获正常
- [ ] 兼容性测试（Chrome/Edge/Firefox）

#### 2. 性能对比测试

```javascript
// 在浏览器控制台运行
console.time('face-api.js');
await faceApi.detectAllFaces(video);
console.timeEnd('face-api.js');

console.time('MediaPipe');
await mediapipeService.detectFaces(video);
console.timeEnd('MediaPipe');
```

#### 3. 包体积对比

运行打包后检查：
```bash
npm run build
# 查看 dist 目录大小
```

预期结果：
- face-api.js: bundle 增加 ~5MB
- MediaPipe: bundle 增加 ~200KB

---

## 代码映射

### 初始化模型

#### face-api.js
```javascript
await Promise.all([
  faceApi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceApi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceApi.nets.faceRecognitionNet.loadFromUri('/models'),
]);
```

#### MediaPipe
```javascript
await mediapipeService.initialize({
  modelType: 'short',  // 或 'full' 获得更高精度
  minDetectionConfidence: 0.6,
});
```

### 人脸检测

#### face-api.js
```javascript
const detections = await faceApi.detectAllFaces(video)
  .withFaceLandmarks()
  .withFaceDescriptors();
```

#### MediaPipe
```javascript
const detections = await mediapipeService.detectFaces(video);
// 注意：MediaPipe 默认不包含特征点和描述符
```

### 人脸相似度对比

#### face-api.js (需要额外实现)
```javascript
const distance = faceApi.euclideanDistance(
  descriptor1,
  descriptor2
);
const similarity = 1 - distance;
```

#### MediaPipe (需要额外实现)
```javascript
// MediaPipe 不直接支持，需要：
// 1. 使用 MediaPipe 提取人脸特征
// 2. 使用其他库（如 tensorflow.js）计算相似度
// 或将人脸识别移到后端处理
```

---

## 测试验证

### 单元测试

创建文件：`tests/unit/mediapipeService.test.js`

```javascript
import mediapipeService from '@/services/mediapipeService';

describe('MediaPipeFaceService', () => {
  beforeAll(async () => {
    await mediapipeService.initialize();
  });

  afterAll(() => {
    mediapipeService.dispose();
  });

  test('应该成功初始化', () => {
    expect(mediapipeService.isInitialized).toBe(true);
  });

  test('应该检测到人脸', async () => {
    const mockVideo = createMockVideoWithFace();
    const detections = await mediapipeService.detectFaces(mockVideo);

    expect(detections).toBeDefined();
    expect(detections.length).toBeGreaterThan(0);
  });
});
```

### 集成测试

1. 打开人脸识别页面
2. 检查控制台无错误
3. 允许摄像头权限
4. 验证人脸框显示
5. 测试照片捕获功能

### 浏览器兼容性测试

| 浏览器 | 版本要求 | 测试状态 |
|--------|---------|---------|
| Chrome | 90+ | ✅ 待测试 |
| Edge | 90+ | ✅ 待测试 |
| Firefox | 88+ | ⚠️ WebAssembly 支持 |
| Safari | 15+ | ⚠️ WebAssembly 支持 |

---

## 回滚方案

如果迁移出现问题，可以快速回滚：

### 方案一：保留代码切换

```javascript
// 在 FaceCapture.vue 中
const USE_MEDIAPIPE = false; // 切换开关

async mounted() {
  if (USE_MEDIAPIPE) {
    await this.initMediaPipe();
  } else {
    await this.initFaceApi();
  }
}
```

### 方案二：Git 回滚

```bash
# 回滚到迁移前的版本
git revert <commit-hash>

# 或删除分支
git checkout main
git branch -D feature/mediapipe-migration
```

### 方案三：条件加载

```javascript
// 使用动态导入
const faceApi = USE_MEDIAPIPE
  ? null
  : await import('face-api.js');
```

---

## 常见问题

### Q1: MediaPipe 加载失败？

**原因**: CDN 连接问题

**解决方案**: 本地部署模型文件
```javascript
locateFile: (file) => {
  return `/models/mediapipe/${file}`;
}
```

### Q2: 检测精度下降？

**原因**: 使用了 `short` 模型

**解决方案**: 切换到 `full` 模型
```javascript
await mediapipeService.initialize({ modelType: 'full' });
```

### Q3: 活体检测功能缺失？

**原因**: MediaPipe 不直接支持

**解决方案**:
1. 使用眨眼检测（配合 MediaPipe 眼部关键点）
2. 使用头部姿态检测
3. 后端进行活体检测

### Q4: 人脸识别功能如何实现？

**方案 A**: 继续使用 face-api.js 的识别模块
```javascript
// 仅使用 MediaPipe 检测，face-api.js 识别
const detections = await mediapipeService.detectFaces(video);
const descriptors = await faceApi.extractDescriptors(video, detections);
```

**方案 B**: 迁移到后端识别
- 前端：MediaPipe 检测人脸
- 后端：Python + face_recognition 库

---

## 迁移检查清单

### 准备阶段
- [ ] 创建迁移分支
- [ ] 安装 MediaPipe 依赖
- [ ] 备份现有代码
- [ ] 阅读官方文档

### 开发阶段
- [ ] 创建 MediaPipe 服务封装
- [ ] 更新 FaceCapture 组件
- [ ] 更新相关 API 调用
- [ ] 添加错误处理

### 测试阶段
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 浏览器兼容性测试
- [ ] 性能对比测试
- [ ] 安全审计通过

### 部署阶段
- [ ] 代码审查
- [ ] 更新文档
- [ ] 灰度发布
- [ ] 监控错误日志
- [ ] 收集用户反馈

---

## 参考资源

### 官方文档
- [MediaPipe Face Detection](https://google.github.io/mediapipe/solutions/face_detection.html)
- [MediaPipe JavaScript](https://github.com/google/mediapipe/tree/master/javascript)

### 示例代码
- [MediaPipe Web Demo](https://codepen.io/mediapipe/pen/abOJVWM)
- [Vue + MediaPipe 示例](https://github.com/mediapipe/mediapipe/tree/master/examples/vue)

### 相关文章
- [MediaPipe vs face-api.js Comparison](https://blog.mediapipe.dev)
- [WebAssembly 人脸识别优化](https://web.dev/wasm/)

---

## 附录：完整的迁移脚本

```bash
#!/bin/bash
# migration-mediapipe.sh

echo "=== MediaPipe 迁移脚本 ==="

# 1. 创建备份
echo "1. 备份现有代码..."
cp client/src/components/FaceRecognition/FaceCapture.vue \
   client/src/components/FaceRecognition/FaceCapture.vue.backup

# 2. 创建 MediaPipe 服务
echo "2. 创建 MediaPipe 服务..."
cat > client/src/services/mediapipeService.js << 'EOF'
// [上面的 MediaPipe 服务代码]
EOF

# 3. 更新 package.json
echo "3. 更新依赖..."
npm install @mediapipe/face_detection --save

# 4. 运行测试
echo "4. 运行测试..."
npm run test:unit

echo "=== 迁移完成 ==="
echo "请手动更新 FaceCapture.vue 组件"
```

---

**文档维护**: 请在迁移完成后更新此文档，记录实际遇到的问题和解决方案。

**最后更新**: 2026-01-27