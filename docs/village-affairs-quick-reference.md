# 智慧乡村工作台 - 快速参考指南

## 文件位置

**主文件**: `client/src/views/village/VillageAffairsView.vue`
**路由**: `/village-affairs`

## 快速访问

### 开发环境
```bash
cd client
npm run dev
```
访问: `http://localhost:3000/village-affairs`

### 生产构建
```bash
npm run build
```

## 功能区切换

页面默认显示"村务管理"，可通过顶部标签页切换：

```javascript
// 在浏览器控制台中测试切换
document.querySelector('.el-tabs__item').click() // 点击第二个标签
```

## 三大功能区

### 1. 村务管理（默认）
**路径**: `activeZone = 'village'`

**核心功能**:
- 一户一码
- 政策计算器
- 语音助手（支持方言）
- 积分系统
- 村情地图
- 智能值班表

**内容分类**:
- 通知公告
- 政策宣传
- 村务活动
- 财务公开
- 项目进展
- 会议纪要
- 应急信息

### 2. 生活服务
**路径**: `activeZone = 'life'`

**服务模块**:
1. 💰 补贴查询 - SubsidySection
2. 🏛️ 办事大厅 - ServiceHallSection
3. 🛒 附近好货 - NearbyProductsSection
4. 🍜 吃喝玩乐 - NearbyServicesSection
5. 💼 招聘信息 - NearbyJobsSection
6. 🚌 交通出行 - TravelSection
7. 📝 商品发布 - MarketplacePublishSection
8. 📋 政策公告 - AnnouncementSection

### 3. 家庭档案
**路径**: `activeZone = 'family'`

**功能**:
- 家庭信息管理
- 成员管理
- 家庭二维码

## 组件导入

### 同步加载（首屏）
```vue
<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
</script>
```

### 异步加载（按需）
```vue
<script setup>
import { defineAsyncComponent } from 'vue'

const SubsidySection = defineAsyncComponent(() =>
  import('@/components/resident/SubsidySection.vue')
)
</script>
```

## 状态管理

```javascript
// 切换功能区
const activeZone = ref('village') // 'village' | 'life' | 'family'

const handleZoneChange = (zoneName) => {
  activeZone.value = zoneName
}
```

## 样式定制

### 大字模式
```scss
.village-affairs.large-text-mode {
  font-size: 18px;

  .el-button {
    font-size: 16px;
    padding: 12px 24px;
  }
}
```

### 响应式断点
```scss
// 移动端 < 768px
// 平板端 768px - 1024px
// 桌面端 > 1024px
@media (max-width: 768px) {
  .zone-tabs {
    margin: 0 16px 16px;
  }
}
```

## 常用操作

### 添加新的生活服务模块
```vue
<!-- 在生活服务区域添加 -->
<template>
  <div v-show="activeZone === 'life'" class="zone-content">
    <!-- 添加新模块 -->
    <NewServiceSection />
  </div>
</template>

<script setup>
const NewServiceSection = defineAsyncComponent(() =>
  import('@/components/resident/NewServiceSection.vue')
)
</script>
```

### 修改默认显示的功能区
```javascript
// 将默认从"村务管理"改为"生活服务"
const activeZone = ref('life') // 改为 'life'
```

### 自定义快捷功能入口
```javascript
const quickAccessItems = reactive([
  {
    id: 'custom',
    title: '自定义功能',
    description: '功能描述',
    icon: '🎯',
    route: '/custom-route'
  }
])
```

## 调试技巧

### 查看当前功能区
```javascript
// 在浏览器控制台
console.log('当前功能区:', activeZone.value)
```

### 强制切换到生活服务
```javascript
// 在浏览器控制台
window.__vue_app__.config.globalProperties.$router.push('/village-affairs')
// 然后点击"生活服务"标签
```

### 查看组件加载状态
```javascript
// 在浏览器开发者工具 Network 标签
// 筛选 JS 文件，查看组件是否按需加载
```

## 常见问题

### Q: 组件显示空白？
**A**: 检查组件路径是否正确，确保 `@/components/resident/` 目录下有对应文件。

### Q: 切换标签没有反应？
**A**: 检查 `activeZone` 的值是否正确更新，查看控制台是否有错误。

### Q: 样式错乱？
**A**: 清除浏览器缓存，检查 scoped 样式是否正确应用。

### Q: 组件加载失败？
**A**: 检查 `defineAsyncComponent` 的导入路径，确保文件存在。

## 性能优化建议

### 1. 组件懒加载
```javascript
// 已实现
const SubsidySection = defineAsyncComponent(() =>
  import('@/components/resident/SubsidySection.vue')
)
```

### 2. 图片懒加载
```vue
<img :src="imageSrc" loading="lazy" />
```

### 3. 虚拟滚动（长列表）
```bash
npm install vue-virtual-scroller
```

### 4. 防抖节流
```javascript
import { debounce } from 'lodash-es'

const handleSearch = debounce(() => {
  // 搜索逻辑
}, 300)
```

## 相关文件

### 主文件
- `client/src/views/village/VillageAffairsView.vue` - 主页面

### 组件目录
- `client/src/components/resident/` - 生活服务组件
  - SubsidySection.vue
  - ServiceHallSection.vue
  - NearbyProductsSection.vue
  - NearbyServicesSection.vue
  - NearbyJobsSection.vue
  - TravelSection.vue
  - MarketplacePublishSection.vue
  - AnnouncementSection.vue
  - FamilySection.vue

### 路由配置
- `client/src/router/index.js` - 路由定义

### 样式文件
- `client/src/views/village/VillageAffairsView.vue` - scoped 样式

## API 接口

### 村务管理
```javascript
GET /api/village/affairs           // 获取村务列表
GET /api/village/affairs/:id       // 获取详情
POST /api/village/comments         // 发表评论
```

### 生活服务
```javascript
GET /api/life/subsidies            // 获取补贴列表
GET /api/life/services             // 获取办事服务
GET /api/life/products             // 获取附近商品
GET /api/life/jobs                 // 获取招聘信息
```

### 家庭档案
```javascript
GET /api/family/info               // 获取家庭信息
GET /api/family/members            // 获取成员列表
POST /api/family/members           // 添加成员
```

## 开发建议

### 1. 遵循组件化原则
- 每个功能模块独立组件
- 使用 props/emit 通信
- 避免直接修改 props

### 2. 保持代码整洁
- 使用 TypeScript 类型定义
- 添加必要的注释
- 遵循命名规范

### 3. 性能优先
- 使用异步组件加载
- 避免不必要的重渲染
- 优化图片资源

### 4. 用户体验
- 添加加载状态
- 错误处理友好
- 响应式设计

## 更新日志

### v1.0.0 (2024-01-16)
- ✅ 融合 VillageAffairsView 和 MyProfileOptimized
- ✅ 实现三大功能分区
- ✅ 组件懒加载优化
- ✅ 响应式设计
- ✅ 构建成功

## 联系支持

如有问题，请查看：
- 项目文档: `docs/village-affairs-merge-summary.md`
- 架构设计: `docs/village-affairs-architecture.md`
- 代码注释: 各组件文件内

---

**最后更新**: 2024-01-16
**版本**: 1.0.0
**状态**: ✅ 生产就绪
