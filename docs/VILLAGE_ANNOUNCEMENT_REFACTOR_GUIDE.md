# 村务公告组件重构指南

## 概述

本文档介绍了重构后的村务公告管理组件 `VillageAnnouncementRefactored.vue` 的设计理念、功能特性和使用方法。

## 设计理念

### 1. 视觉设计原则

基于 **UI/UX Pro Max** 智能体的设计指导，新组件采用：

| 设计维度 | 选择 | 理由 |
|---------|------|------|
| **风格** | 极简主义 + 可访问性 | 政府服务需要清晰、专业、易读 |
| **配色** | 深蓝主色调 + 清新绿色辅助 | 专业可信 + 项目主题一致性 |
| **字体** | Noto Sans SC | 中文优化，可读性强 |
| **布局** | 响应式卡片式设计 | 适配各种屏幕尺寸 |

### 2. 颜色系统

```scss
// 主色调 - 政府服务专业蓝
--color-primary: #0F172A;
--color-primary-light: #334155;

// 项目主题色 - 清新绿
--color-success: #10b981;
--color-success-dark: #059669;

// 语义颜色
--color-danger: #ef4444;   // 紧急/删除
--color-warning: #f59e0b;  // 重要
--color-info: #3b82f6;     // 信息

// 中性色
--color-bg-primary: #F8FAFC;   // 页面背景
--color-bg-secondary: #ffffff; // 卡片背景
--color-text-primary: #020617; // 主要文字
--color-text-secondary: #475569; // 次要文字
```

### 3. 可访问性标准

遵循 **WCAG 2.1 AA 级**标准：

- ✅ 对比度 ≥ 4.5:1（正常文字）
- ✅ 所有交互元素有 `aria-label`
- ✅ 键盘导航支持
- ✅ 焦点可见性
- ✅ `prefers-reduced-motion` 支持

## 功能特性

### 1. 统计概览卡片

实时显示公告统计数据：
- 全部公告数量
- 已发布/草稿数量
- 总阅读量
- 趋势变化指标

### 2. 智能筛选

| 筛选类型 | 说明 |
|---------|------|
| **快速筛选** | 全部/已发布/草稿/紧急 |
| **搜索** | 实时搜索标题和内容 |
| **标签分类** | 通知/政策/活动/公告 |

### 3. 公告卡片

每个公告卡片包含：
- **优先级指示器** - 紧急公告有红色边框和脉冲动画
- **分类标签** - 彩色标签区分类型
- **阅读统计** - 阅读量、附件数量
- **快捷操作** - 编辑、删除、分享

### 4. 响应式布局

| 断点 | 布局变化 |
|------|---------|
| **桌面 (>1024px)** | 多列统计卡片，完整布局 |
| **平板 (768-1024px)** | 两列统计卡片 |
| **手机 (<768px)** | 单列布局，优化触控 |

## 使用方法

### 1. 引入组件

```vue
<script setup>
import VillageAnnouncementRefactored from '@/components/village/VillageAnnouncementRefactored.vue'
</script>

<template>
  <VillageAnnouncementRefactored />
</template>
```

### 2. API 集成

将模拟数据替换为真实 API 调用：

```javascript
// 在 setup() 中
import { getAnnouncements } from '@/api/village'

onMounted(async () => {
  loading.value = true
  try {
    const response = await getAnnouncements({
      page: pagination.value.page,
      limit: pagination.value.limit,
      status: activeFilter.value,
      keyword: searchQuery.value
    })
    announcements.value = response.data.items
    pagination.value.total = response.data.total
  } catch (error) {
    console.error('加载公告失败:', error)
  } finally {
    loading.value = false
  }
})
```

### 3. 权限控制

配置当前用户权限：

```javascript
const currentUser = computed(() => {
  return userStore.userInfo
})

const canEdit = (announcement) => {
  return currentUser.value?.role === 'admin' ||
         currentUser.value?.role === 'village_admin' ||
         announcement.authorId === currentUser.value?.id
}

const canDelete = (announcement) => {
  return currentUser.value?.role === 'admin' ||
         currentUser.value?.role === 'village_admin'
}
```

## 迁移指南

### 从旧组件迁移

**旧组件**: `VillageAnnouncement.vue` (Element Plus)
**新组件**: `VillageAnnouncementRefactored.vue` (原生 Vue)

### 步骤 1: 更新路由

```javascript
// 修改前
{
  path: 'announcement',
  component: () => import('@/components/village/VillageAnnouncement.vue')
}

// 修改后
{
  path: 'announcement',
  component: () => import('@/components/village/VillageAnnouncementRefactored.vue')
}
```

### 步骤 2: 数据格式适配

新组件期望的数据格式：

```typescript
interface Announcement {
  id: string
  title: string
  content: string
  category: 'notice' | 'policy' | 'activity' | 'general'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  status: 'published' | 'draft' | 'archived'
  publishedAt: string // ISO 8601
  readCount?: number
  attachments?: Array<{
    id: string
    name: string
    url: string
  }>
}
```

### 步骤 3: 样式定制

如需修改颜色主题，覆盖 CSS 变量：

```vue
<style>
.village-announcement-refactored {
  --color-success: #your-color;
  --color-primary: #your-color;
}
</style>
```

## 对比旧组件

| 特性 | 旧组件 (Element Plus) | 新组件 (重构) |
|------|----------------------|---------------|
| **样式框架** | Element Plus | 原生 CSS + CSS 变量 |
| **字体** | 系统默认 | Noto Sans SC (中文优化) |
| **对比度** | 部分不符合 AA 标准 | 完全符合 WCAG 2.1 AA |
| **ARIA 标签** | 不完整 | 完整覆盖 |
| **键盘导航** | 基础支持 | 完整支持 |
| **响应式** | 基础响应式 | 完全响应式 |
| **动画** | 固定动画 | 可降级动画 |
| **包体积** | 较大 (含 Element Plus) | 较小 (无额外依赖) |

## 浏览器支持

| 浏览器 | 最低版本 |
|--------|---------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

## 性能优化

1. **按需加载**: 组件使用 `defineAsyncComponent` 按需加载
2. **虚拟滚动**: 大数据量时可集成虚拟滚动
3. **图片懒加载**: 附件图片支持懒加载
4. **防抖搜索**: 搜索输入使用防抖优化

## 未来增强

- [ ] 添加公告模板功能
- [ ] 支持富文本编辑器
- [ ] 添加定时发布功能
- [ ] 集成邮件通知
- [ ] 支持公告置顶

## 问题反馈

如有问题或建议，请联系开发团队或提交 Issue。
