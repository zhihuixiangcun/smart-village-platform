# 智慧乡村平台 PC端UI/UX设计方案

## 文档信息
- **项目名称**: 智慧乡村综合服务平台 PC端
- **设计版本**: v1.0
- **创建日期**: 2025年1月12日
- **设计师**: UI/UX Team
- **技术栈**: Vue 3 + Element Plus + Tailwind CSS

---

## 一、设计概述

### 1.1 设计目标
打造专业、高效、易用的政务级PC端管理平台，为村干部提供强大的村务管理和数据分析工具。

### 1.2 用户画像
- **主要用户**: 村干部、村委、会计、人口主任
- **年龄范围**: 30-55岁
- **使用场景**: 村委会办公室、政务服务大厅
- **设备环境**: 台式机、笔记本（1920x1080及以上）
- **技能水平**: 中等数字素养，需清晰直观的界面

### 1.3 设计原则
1. **专业性**: 政务级设计风格，严谨可靠
2. **高效性**: 减少操作步骤，提升工作效率
3. **清晰性**: 信息层次分明，易于理解
4. **一致性**: 统一的视觉语言和交互模式
5. **响应式**: 适配不同屏幕尺寸
6. **无障碍**: 符合WCAG 2.1 AA级标准

---

## 二、设计系统

### 2.1 色彩系统

#### 品牌色彩
```css
/* 主色调 - 政务蓝 */
--primary-50: #E3F2FD;
--primary-100: #BBDEFB;
--primary-200: #90CAF9;
--primary-300: #64B5F6;
--primary-400: #42A5F5;
--primary-500: #2196F3;  /* 主色 */
--primary-600: #1976D2;
--primary-700: #1565C0;
--primary-800: #0D47A1;
--primary-900: #0A3D8A;

/* 辅助色 - 丰收绿 */
--secondary-500: #4CAF50;
--secondary-600: #388E3C;
```

#### 功能色彩
```css
/* 成功 */
--success-50: #E8F5E9;
--success-500: #4CAF50;
--success-600: #388E3C;

/* 警告 */
--warning-50: #FFF8E1;
--warning-500: #FF9800;
--warning-600: #F57C00;

/* 错误 */
--error-50: #FFEBEE;
--error-500: #F44336;
--error-600: #D32F2F;

/* 信息 */
--info-50: #E3F2FD;
--info-500: #2196F3;
--info-600: #1976D2;
```

#### 中性色彩
```css
/* 文字 */
--text-primary: #0F172A;     /* 主要文字 */
--text-secondary: #475569;   /* 次要文字 */
--text-disabled: #94A3B8;    /* 禁用文字 */
--text-hint: #CBD5E1;        /* 提示文字 */

/* 背景 */
--bg-primary: #FFFFFF;       /* 主背景 */
--bg-secondary: #F8FAFC;     /* 次要背景 */
--bg-tertiary: #F1F5F9;      /* 第三背景 */
--bg-hover: #F1F5F9;         /* 悬停背景 */
--bg-active: #E2E8F0;        /* 激活背景 */

/* 边框 */
--border-light: #E2E8F0;     /* 浅边框 */
--border-base: #CBD5E1;      /* 基础边框 */
--border-dark: #94A3B8;      /* 深边框 */
```

#### 阴影
```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
--shadow-base: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

### 2.2 字体系统

#### 字体家族
```css
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 
              'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', 
              Helvetica, Arial, sans-serif;
```

#### 字号层级
```css
--font-xs: 12px;      /* 辅助文字 */
--font-sm: 13px;      /* 小字 */
--font-base: 14px;    /* 基础文字 */
--font-lg: 15px;      /* 中等文字 */
--font-xl: 16px;      /* 大字 */
--font-2xl: 18px;     /* 小标题 */
--font-3xl: 20px;     /* 标题 */
--font-4xl: 24px;     /* 大标题 */
--font-5xl: 30px;     /* 特大标题 */
--font-6xl: 36px;     /* 超大标题 */
```

#### 字重
```css
--font-weight-light: 300;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

#### 行高
```css
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### 2.3 间距系统

```css
--spacing-0: 0;
--spacing-1: 4px;
--spacing-2: 8px;
--spacing-3: 12px;
--spacing-4: 16px;
--spacing-5: 20px;
--spacing-6: 24px;
--spacing-8: 32px;
--spacing-10: 40px;
--spacing-12: 48px;
--spacing-16: 64px;
--spacing-20: 80px;
--spacing-24: 96px;
```

### 2.4 圆角系统

```css
--radius-none: 0px;
--radius-sm: 2px;
--radius-base: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-2xl: 16px;
--radius-full: 9999px;
```

---

## 三、布局系统

### 3.1 整体布局结构

```
┌─────────────────────────────────────────────────────────┐
│  侧边栏 │                    │  顶部导航栏              │
│  240px  │   主内容区域        │  ──────────────────  │
│         │                    │  │ 搜索 | 消息 |    │  │
│  导航   │   ┌──────────────┐ │  │ 全屏 | 用户 |    │  │
│  菜单   │   │              │ │  ──────────────────  │
│         │   │              │ │                        │
│         │   │   页面内容   │ │                        │
│         │   │              │ │                        │
│         │   │              │ │                        │
│         │   │              │ │                        │
│         │   └──────────────┘ │                        │
└─────────┴────────────────────┴────────────────────────┘
```

### 3.2 侧边栏设计

**展开状态** (240px)
- Logo区域: 高度 64px
- 导航菜单: 滚动区域
- 底部操作: 高度 64px

**折叠状态** (64px)
- 仅显示图标
- 悬停显示完整菜单项

### 3.3 顶部导航栏

**高度**: 64px
**内容**:
- 面包屑导航
- 全局搜索框
- 消息通知
- 全屏切换
- 用户下拉菜单

### 3.4 主内容区域

**布局**:
- 最大宽度: 1600px
- 内边距: 24px
- 卡片间距: 20px
- 卡片圆角: 12px

---

## 四、核心页面设计

### 4.1 仪表板 (Dashboard)

#### 4.1.1 欢迎区域
**布局**: 全宽卡片
**内容**:
```
┌─────────────────────────────────────────────────────────┐
│  早上好，张书记                                    │
│  今天是 2025年1月12日 星期一，祝您工作顺利！          │
│  [村支书] [幸福村]                                  │
│                                                         │
│  待办: 5  |  已完成: 23  |  未读通知: 12           │
└─────────────────────────────────────────────────────────┘
```

#### 4.1.2 统计卡片
**布局**: 4x2 网格
**内容**:
- 总村民数: 1,234
- 村民户数: 356
- 本月新增: +12
- 在线状态: 89%

#### 4.1.3 数据图表
**左侧** (60%):
- 人口趋势图 (折线图)
- 年龄结构分布 (饼图)

**右侧** (40%):
- 待办事项列表
- 最新公告

### 4.2 村民管理 (Residents)

#### 4.2.1 页面布局
```
┌─────────────────────────────────────────────────────────┐
│  村民管理                                     [+ 添加]  │
│  数字化村民档案管理，一户一码精准服务                   │
├─────────────────────────────────────────────────────────┤
│  统计概览                                              │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│  │总村民│ │总户数│ │低保户│ │残疾人│ │党员数│ │流动人口││
│  │1234 │ │ 356 │ │  23 │ │  15 │ │  45 │ │  67  ││
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘          │
├─────────────────────────────────────────────────────────┤
│  [搜索框] [家庭类型] [年龄段] [状态] [搜索]           │
├─────────────────────────────────────────────────────────┤
│  ┌────┬──────┬────────┬──────┬────┬────────┬────────┐│
│  │姓名│身份证 │  家庭   │年龄  │状态│操作    │更多    ││
│  │    │       │  类型   │      │    │        │        ││
│  ├────┼──────┼────────┼──────┼────┼────────┼────────┤│
│  │张三│330123│  普通户 │  45  │正常│[查看]  │[编辑]  ││
│  │    │******│         │      │    │[编辑]  │[删除]  ││
│  ├────┼──────┼────────┼──────┼────┼────────┼────────┤│
│  │李四│330124│  低保户 │  67  │正常│[查看]  │[编辑]  ││
│  └────┴──────┴────────┴──────┴────┴────────┴────────┘│
│                                      [上一页] 1/10 [下一页]│
└─────────────────────────────────────────────────────────┘
```

#### 4.2.2 村民详情页
**左侧** (30%):
- 头像
- 基本信息
- 联系方式
- 家庭关系

**右侧** (70%):
- 标签页: 基本信息 | 家庭成员 | 办事记录 | 健康档案

### 4.3 村务管理 (Village Affairs)

#### 4.3.1 标签页设计
- 公告管理
- 会议管理
- 任务调度
- 投票管理

#### 4.3.2 公告列表
```
┌─────────────────────────────────────────────────────────┐
│  公告管理                              [+ 发布公告]  │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐ │
│  │ [重要] 关于开展年终总结会议的通知              │ │
│  │ 全体村干部请注意，定于1月15日上午9点在村委会  │ │
│  │ 大会议室召开年终总结会议，请准时参加...        │ │
│  │ 发布者: 张书记  |  2025-01-10  |  [编辑][删除]│ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 4.4 财务管理 (Finance)

#### 4.4.1 财务概览
**卡片布局**:
- 年度预算: 500万
- 已支出: 320万
- 剩余: 180万
- 支出占比: 64%

#### 4.4.2 收支明细
**表格列**:
- 日期
- 类别
- 收入/支出
- 金额
- 经手人
- 状态
- 操作

### 4.5 生活服务 (Services)

#### 4.5.1 服务大厅
**网格布局** (3列):
```
┌─────────┬─────────┬─────────┐
│ 📄 证件办理│ 🏠 房屋证明│ 💰 补贴申请│
├─────────┼─────────┼─────────┤
│ 🏥 医疗报销│ 🎓 教育证明│ 📋 集资证明│
├─────────┼─────────┼─────────┤
│ 🔌 电费缴纳│ 💧 水费缴纳│ 🔥 燃气费  │
└─────────┴─────────┴─────────┘
```

### 4.6 数据统计 (Statistics)

#### 4.6.1 统计图表
- 人口结构分析
- 家庭类型分布
- 年龄段统计
- 党员比例
- 低保户分布
- 流动人口趋势

### 4.7 用户管理 (Users)

#### 4.7.1 用户列表
**筛选条件**:
- 用户类型
- 角色
- 状态
- 注册时间

**操作**: 编辑 | 重置密码 | 禁用/启用 | 删除

### 4.8 系统设置 (Settings)

#### 4.8.1 分类
- 基本设置
- 通知设置
- 安全设置
- 数据管理
- 系统日志

---

## 五、组件设计

### 5.1 基础组件

#### 按钮组件
```css
/* 主要按钮 */
.btn-primary {
  background: var(--primary-500);
  color: #fff;
  padding: 8px 16px;
  border-radius: var(--radius-base);
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--primary-600);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

/* 次要按钮 */
.btn-secondary {
  background: #fff;
  color: var(--text-primary);
  border: 1px solid var(--border-base);
  padding: 8px 16px;
  border-radius: var(--radius-base);
}

/* 文本按钮 */
.btn-text {
  background: transparent;
  color: var(--primary-500);
  padding: 4px 8px;
}
```

#### 卡片组件
```css
.card {
  background: var(--bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-base);
  transition: all 0.3s;
}

.card:hover {
  box-shadow: var(--shadow-md);
}
```

#### 表格组件
```css
.table-container {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.table-header {
  background: var(--bg-secondary);
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--border-light);
}

.table-row {
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--border-light);
  transition: background 0.2s;
}

.table-row:hover {
  background: var(--bg-hover);
}
```

#### 输入组件
```css
.input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-base);
  border-radius: var(--radius-base);
  font-size: var(--font-base);
  transition: all 0.2s;
}

.input:focus {
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
}
```

### 5.2 业务组件

#### 统计卡片
```vue
<template>
  <div class="stat-card" @click="handleClick">
    <div class="stat-icon" :style="{ background: gradient }">
      <el-icon :size="28" color="white">
        <component :is="icon" />
      </el-icon>
    </div>
    <div class="stat-info">
      <div class="stat-value">{{ value }}</div>
      <div class="stat-label">{{ label }}</div>
      <div class="stat-change" :class="changeClass">
        <el-icon size="12">
          <component :is="changeIcon" />
        </el-icon>
        <span>{{ change }}</span>
      </div>
    </div>
  </div>
</template>
```

#### 数据表格
```vue
<template>
  <div class="data-table">
    <div class="table-header">
      <h3>{{ title }}</h3>
      <div class="table-actions">
        <el-button size="small" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
      </div>
    </div>
    <el-table :data="tableData" :loading="loading">
      <el-table-column
        v-for="column in columns"
        :key="column.prop"
        :prop="column.prop"
        :label="column.label"
        :width="column.width"
      />
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button size="small" text @click="handleView(row)">查看</el-button>
          <el-button size="small" text @click="handleEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
    />
  </div>
</template>
```

---

## 六、交互设计

### 6.1 动画规范

#### 过渡时长
```css
--duration-fast: 150ms;   /* 快速 */
--duration-base: 300ms;   /* 基础 */
--duration-slow: 500ms;   /* 缓慢 */
```

#### 缓动函数
```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
```

#### 常用动画
```css
/* 淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-base) var(--ease-out);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 滑入 */
.slide-enter-active,
.slide-leave-active {
  transition: transform var(--duration-base) var(--ease-out);
}
.slide-enter-from {
  transform: translateY(20px);
}
.slide-leave-to {
  transform: translateY(-20px);
}

/* 缩放 */
.scale-enter-active,
.scale-leave-active {
  transition: transform var(--duration-base) var(--ease-out);
}
.scale-enter-from,
.scale-leave-to {
  transform: scale(0.95);
}
```

### 6.2 悬停效果
```css
/* 按钮悬停 */
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* 卡片悬停 */
.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

/* 表格行悬停 */
.table-row:hover {
  background: var(--bg-hover);
}

/* 链接悬停 */
.link:hover {
  color: var(--primary-600);
  text-decoration: underline;
}
```

### 6.3 加载状态
```css
/* 骨架屏 */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 25%,
    var(--bg-tertiary) 50%,
    var(--bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* 加载动画 */
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-light);
  border-top-color: var(--primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

---

## 七、响应式设计

### 7.1 断点系统
```css
--screen-sm: 640px;    /* 小屏 */
--screen-md: 768px;    /* 中屏 */
--screen-lg: 1024px;   /* 大屏 */
--screen-xl: 1280px;   /* 超大屏 */
--screen-2xl: 1536px;  /* 2倍大屏 */
```

### 7.2 布局适配

#### 小屏 (< 768px)
- 侧边栏: 抽屉模式
- 网格: 单列
- 字体: 基础字号 14px
- 间距: 压缩间距

#### 中屏 (768px - 1024px)
- 侧边栏: 折叠模式
- 网格: 2列
- 字体: 基础字号 14px
- 间距: 标准间距

#### 大屏 (> 1024px)
- 侧边栏: 展开模式
- 网格: 3-4列
- 字体: 基础字号 14px
- 间距: 标准间距

### 7.3 响应式示例
```css
.container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 var(--spacing-4);
}

@media (min-width: 768px) {
  .container {
    padding: 0 var(--spacing-6);
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 0 var(--spacing-8);
  }
}
```

---

## 八、无障碍设计

### 8.1 键盘导航
- 所有交互元素支持Tab键导航
- 明确的焦点状态样式
- 快捷键支持

### 8.2 屏幕阅读器
- 语义化HTML标签
- ARIA标签
- alt文本
- 表格标题

### 8.3 色彩对比度
- 文字与背景对比度 ≥ 4.5:1
- 大号文字 ≥ 3:1
- 重要信息对比度 ≥ 7:1

### 8.4 焦点状态
```css
:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
```

---

## 九、图标系统

### 9.1 图标库
使用 Element Plus Icons

### 9.2 图标尺寸
```css
--icon-xs: 12px;
--icon-sm: 16px;
--icon-base: 20px;
--icon-lg: 24px;
--icon-xl: 28px;
--icon-2xl: 32px;
```

### 9.3 常用图标
- 导航: House, Users, OfficeBuilding, Money, Service, Setting
- 操作: Plus, Edit, Delete, Search, Download, Upload
- 状态: SuccessFilled, Warning, InfoFilled, CircleCheck
- 反馈: Bell, QuestionFilled, SwitchButton

---

## 十、数据可视化

### 10.1 图表类型
- 折线图: 趋势分析
- 柱状图: 对比分析
- 饼图: 占比分析
- 仪表盘: 目标达成
- 热力图: 密度分析

### 10.2 图表配色
```css
--chart-color-1: #2196F3;
--chart-color-2: #4CAF50;
--chart-color-3: #FF9800;
--chart-color-4: #F44336;
--chart-color-5: #9C27B0;
--chart-color-6: #00BCD4;
```

---

## 十一、状态设计

### 11.1 空状态
```
┌─────────────────────────────┐
│                             │
│         [空状态图标]          │
│                             │
│      暂无数据                │
│      请先添加内容            │
│                             │
│      [+ 添加按钮]            │
│                             │
└─────────────────────────────┘
```

### 11.2 加载状态
```
┌─────────────────────────────┐
│      [加载动画]             │
│      加载中...              │
└─────────────────────────────┘
```

### 11.3 错误状态
```
┌─────────────────────────────┐
│      [错误图标]             │
│      加载失败                │
│      请刷新重试              │
│                             │
│      [刷新按钮]              │
└─────────────────────────────┘
```

---

## 十二、表单设计

### 12.1 表单布局
- 标签页布局
- 分组布局
- 网格布局

### 12.2 表单验证
- 实时验证
- 错误提示
- 成功提示

### 12.3 表单示例
```vue
<template>
  <el-form :model="form" :rules="rules" ref="formRef">
    <el-form-item label="姓名" prop="name">
      <el-input v-model="form.name" placeholder="请输入姓名" />
    </el-form-item>
    <el-form-item label="身份证号" prop="idCard">
      <el-input v-model="form.idCard" placeholder="请输入身份证号" />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="handleSubmit">提交</el-button>
      <el-button @click="handleReset">重置</el-button>
    </el-form-item>
  </el-form>
</template>
```

---

## 十三、通知系统

### 13.1 通知类型
- 成功提示
- 错误提示
- 警告提示
- 信息提示

### 13.2 通知位置
- 右上角 (默认)
- 右下角
- 左上角
- 左下角

### 13.3 通知示例
```javascript
// 成功提示
ElMessage.success('操作成功')

// 错误提示
ElMessage.error('操作失败，请重试')

// 警告提示
ElMessage.warning('请注意数据安全')

// 信息提示
ElMessage.info('系统将在5分钟后更新')
```

---

## 十四、实现检查清单

### 14.1 视觉检查
- [ ] 色彩系统完整
- [ ] 字体系统规范
- [ ] 间距系统统一
- [ ] 圆角系统一致
- [ ] 图标尺寸规范
- [ ] 阴影效果统一

### 14.2 布局检查
- [ ] 响应式适配
- [ ] 网格系统完整
- [ ] 导航结构清晰
- [ ] 内容层次分明
- [ ] 页面布局合理

### 14.3 交互检查
- [ ] 动画流畅
- [ ] 悬停反馈
- [ ] 点击反馈
- [ ] 加载状态
- [ ] 错误提示

### 14.4 可访问性检查
- [ ] 键盘导航
- [ ] 焦点状态
- [ ] 屏幕阅读器
- [ ] 色彩对比度
- [ ] 语义化标签

### 14.5 性能检查
- [ ] 图片优化
- [ ] 代码压缩
- [ ] 懒加载
- [ ] 缓存策略
- [ ] 加载速度

---

## 十五、附录

### 15.1 参考资料
- Element Plus: https://element-plus.org/
- Vue 3: https://vuejs.org/
- Tailwind CSS: https://tailwindcss.com/
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/

### 15.2 设计工具
- Figma
- Sketch
- Adobe XD
- Adobe Illustrator

### 15.3 版本历史
| 版本 | 日期 | 修改内容 | 修改人 |
|------|------|---------|--------|
| v1.0 | 2025-01-12 | 初始版本 | UI/UX Team |

---

**文档结束**
