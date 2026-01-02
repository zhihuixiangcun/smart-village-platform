# 村情地图功能测试套件

## 概述

本测试套件为智慧乡村综合服务平台的村情地图功能提供全面的测试覆盖，包括单元测试、集成测试和端到端测试。

## 测试目录结构

```
tests/
├── unit/map/                          # 单元测试
│   ├── mapService.test.js            # 地图服务核心功能测试
│   ├── residentLocation.test.js      # 村民位置管理测试
│   └── dangerZone.test.js            # 危险区域测试
├── integration/map/                   # 集成测试
│   ├── mapApi.test.js                # 地图API集成测试
│   ├── locationPrivacy.test.js       # 位置隐私测试
│   └── emergencyResponse.test.js     # 应急响应测试
├── e2e/                              # 端到端测试
│   └── villageMapCompleteFlow.test.js # 完整流程E2E测试
└── map/                              # 测试辅助工具
    └── testHelpers.js                # 测试数据辅助函数
```

## 测试覆盖范围

### 1. 单元测试（Unit Tests）

#### mapService.test.js
- ✅ 距离计算功能（Haversine公式）
- ✅ 面积计算功能
- ✅ 位置隐私保护算法
- ✅ 位置聚合算法
- ✅ 点在多边形内判断
- ✅ 危险区域检测
- ✅ 缓存管理
- ✅ POI去重和排序
- ✅ 边界值测试
- ✅ 错误处理

#### residentLocation.test.js
- ✅ 位置创建和更新
- ✅ 位置模糊化处理
- ✅ 位置聚合功能
- ✅ 隐私设置
- ✅ 位置过期机制
- ✅ 活动状态检测
- ✅ 电池和网络状态
- ✅ 地理围栏功能
- ✅ 紧急状态管理

#### dangerZone.test.js
- ✅ 危险区域创建
- ✅ 不同区域形状（点、线、面、圆）
- ✅ 危险等级判断
- ✅ 危险区域重叠检测
- ✅ 预警管理
- ✅ 预警查询和筛选
- ✅ 边界情况测试

### 2. 集成测试（Integration Tests）

#### mapApi.test.js
- ✅ 地图配置API
- ✅ 地点管理API（增删改查）
- ✅ 危险区域API
- ✅ 应急资源API
- ✅ 村民位置API
- ✅ 地理位置查询API
- ✅ 图层管理API
- ✅ 权限控制测试
- ✅ 数据验证测试
- ✅ 批量操作测试

#### locationPrivacy.test.js
- ✅ 普通用户查看模糊位置
- ✅ 管理员查看精确位置
- ✅ 位置权限控制
- ✅ 位置数据脱敏
- ✅ 位置共享控制
- ✅ 位置数据审计
- ✅ 隐私设置边界情况

#### emergencyResponse.test.js
- ✅ 危险区域内村民查询
- ✅ 附近资源查询
- ✅ 救援路径计算
- ✅ 应急通知发送
- ✅ 应急资源管理
- ✅ 应急统计和报告

### 3. E2E测试（End-to-End Tests）

#### villageMapCompleteFlow.test.js
- ✅ 初始化地图数据 → 用户打开地图 → 查看各类信息
- ✅ 添加地点标记 → 查看地点 → 搜索地点
- ✅ 查看危险区域 → 查询附近资源 → 测试应急响应
- ✅ 更新村民位置 → 查看位置分布 → 测试隐私保护
- ✅ 测试图层切换功能
- ✅ 批量操作和数据导出
- ✅ 完整的应急响应流程
- ✅ 性能和稳定性测试
- ✅ 错误处理和边界情况
- ✅ 数据一致性测试
- ✅ 用户体验测试

## 测试数据

测试使用真实的GPS坐标和地理数据，主要测试地点包括：

- **北京地区**: 116.4074, 39.9042
- **上海地区**: 121.4737, 31.2304
- **杭州地区**: 120.1551, 30.2741
- **广州地区**: 113.2644, 23.1291

测试村庄示例：
- 北京智慧村: 116.4574, 39.9342
- 杭州示范村: 120.0123, 30.2674

## 运行测试

### 运行所有地图相关测试

```bash
npm test -- tests/unit/map/
npm test -- tests/integration/map/
npm test -- tests/e2e/villageMapCompleteFlow.test.js
```

### 运行特定测试文件

```bash
# 单元测试
npm test -- tests/unit/map/mapService.test.js
npm test -- tests/unit/map/residentLocation.test.js
npm test -- tests/unit/map/dangerZone.test.js

# 集成测试
npm test -- tests/integration/map/mapApi.test.js
npm test -- tests/integration/map/locationPrivacy.test.js
npm test -- tests/integration/map/emergencyResponse.test.js

# E2E测试
npm test -- tests/e2e/villageMapCompleteFlow.test.js
```

### 运行带覆盖率的测试

```bash
npm run test:coverage -- tests/unit/map/
npm run test:coverage -- tests/integration/map/
```

### 运行特定测试套件

```bash
# 只运行距离计算相关测试
npm test -- -t "距离计算"

# 只运行隐私保护相关测试
npm test -- -t "位置隐私"

# 只运行应急响应相关测试
npm test -- -t "应急响应"
```

## 测试覆盖目标

| 测试类型 | 目标覆盖率 | 当前状态 |
|---------|-----------|----------|
| 单元测试 | 85%+ | ✅ 已达成 |
| 集成测试 | 80%+ | ✅ 已达成 |
| E2E测试 | 主要场景覆盖 | ✅ 已达成 |

## 测试特点

### 1. 真实地理数据
- 使用真实的GPS坐标
- 测试实际的地理计算（距离、面积等）
- 模拟真实的中国村庄场景

### 2. 完整的功能覆盖
- 地图服务核心功能
- 村民位置管理
- 危险区域管理
- 应急响应流程
- 隐私保护机制

### 3. 多层次的测试
- 单元测试：测试独立功能模块
- 集成测试：测试API和数据库交互
- E2E测试：测试完整的用户流程

### 4. 边界情况测试
- 极端坐标值
- 无效输入
- 权限控制
- 性能压力测试

### 5. 异步操作测试
- 所有异步操作使用async/await
- 正确处理Promise
- 测试超时和错误情况

## 测试数据辅助工具

`tests/map/testHelpers.js` 提供了以下辅助功能：

### 预定义测试数据
- 中国主要城市坐标
- 测试村庄数据
- 地图要素数据
- 危险区域数据
- 应急资源数据
- 村民位置数据
- 撤离路线数据

### 辅助函数
```javascript
// 生成随机坐标
generateRandomCoordinate(center, radius)

// 生成测试村民数据
generateTestResidents(count, villageId, centerLocation)

// 计算两点间距离
calculateDistance(point1, point2)

// 判断点是否在多边形内
isPointInPolygon(point, polygon)
```

## 测试最佳实践

### 1. 测试隔离
- 每个测试独立运行
- 使用beforeEach/afterEach清理数据
- 避免测试间的依赖

### 2. 测试命名
- 使用描述性的测试名称
- 遵循"应该做什么"的命名规范
- 包含测试场景的详细信息

### 3. 断言清晰
- 使用具体的期望值
- 包含错误消息
- 验证关键行为

### 4. Mock使用
- Mock外部依赖（如地图API）
- 使用真实的数据库操作
- 避免过度Mock

### 5. 性能考虑
- 设置合理的测试超时
- 使用maxWorkers: 1避免数据库冲突
- 清理资源避免内存泄漏

## 持续集成

测试套件设计为在CI/CD环境中运行：

```yaml
# .github/workflows/test.yml 示例
name: Map Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test -- tests/unit/map/
      - run: npm test -- tests/integration/map/
      - run: npm test -- tests/e2e/villageMapCompleteFlow.test.js
```

## 故障排查

### 常见问题

1. **数据库连接失败**
   - 确保MongoDB正在运行
   - 检查MONGO_URI环境变量
   - 尝试使用mongodb-memory-server

2. **测试超时**
   - 增加Jest测试超时时间
   - 检查异步操作是否正确等待
   - 验证API响应时间

3. **内存泄漏**
   - 确保正确关闭数据库连接
   - 清理测试数据
   - 使用--detectOpenHandles检测

4. **坐标计算不准确**
   - 验证GPS坐标格式
   - 检查坐标系（WGS84）
   - 使用正确的地球半径值

## 贡献指南

添加新测试时：

1. 在相应的目录创建测试文件
2. 使用testHelpers.js中的辅助数据
3. 遵循现有的测试结构和命名规范
4. 添加详细的注释说明测试目的
5. 确保测试独立且可重复运行
6. 更新本README文档

## 联系方式

如有问题或建议，请联系开发团队。

---

**最后更新**: 2026-01-02
**版本**: 1.0.0
**维护者**: Smart Village Platform Team
