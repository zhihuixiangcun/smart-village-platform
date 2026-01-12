# 智慧乡村平台 PC端设计规范

## 文档信息
- **项目名称**: 智慧乡村综合服务平台 PC端
- **规范版本**: v1.0
- **创建日期**: 2025年1月12日
- **适用范围**: 所有PC端页面开发

---

## 一、设计原则

### 1.1 核心原则
1. **专业性**: 政务级设计风格，严谨可靠
2. **高效性**: 减少操作步骤，提升工作效率
3. **清晰性**: 信息层次分明，易于理解
4. **一致性**: 统一的视觉语言和交互模式
5. **可访问性**: 符合WCAG 2.1 AA级标准

### 1.2 设计目标
- 提供村干部高效的管理工具
- 降低学习成本，快速上手
- 保证良好的用户体验
- 满足无障碍使用需求

---

## 二、设计系统

### 2.1 色彩规范

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

**使用场景**:
- Primary: 主要操作、导航、CTA按钮
- Secondary: 次要操作、成功状态

#### 功能色彩
```css
/* 成功 - 绿色系 */
--success-50: #E8F5E9;
--success-500: #4CAF50;
--success-600: #388E3C;
--success-700: #2E7D32;

/* 警告 - 橙色系 */
--warning-50: #FFF8E1;
--warning-500: #FF9800;
--warning-600: #F57C00;
--warning-700: #E65100;

/* 错误 - 红色系 */
--error-50: #FFEBEE;
--error-500: #F44336;
--error-600: #D32F2F;
--error-700: #C62828;

/* 信息 - 蓝色系 */
--info-50: #E3F2FD;
--info-500: #2196F3;
--info-600: #1976D2;
--info-700: #1565C0;
```

**使用场景**:
- Success: 操作成功、正常状态
- Warning: 注意事项、待处理
- Error: 错误提示、危险操作
- Info: 信息提示、帮助说明

#### 中性色彩
```css
/* 文字 */
--text-primary: #0F172A;      /* 主要文字 */
--text-secondary: #475569;    /* 次要文字 */
--text-disabled: #94A3B8;     /* 禁用文字 */
--text-hint: #CBD5E1;          /* 提示文字 */

/* 背景 */
--bg-primary: #FFFFFF;        /* 主背景 */
--bg-secondary: #F8FAFC;      /* 次要背景 */
--bg-tertiary: #F1F5F9;       /* 第三背景 */
--bg-hover: #F1F5F9;           /* 悬停背景 */
--bg-active: #E2E8F0;          /* 激活背景 */

/* 边框 */
--border-light: #E2E8F0;       /* 浅边框 */
--border-base: #CBD5E1;        /* 基础边框 */
--border-dark: #94A3B8;        /* 深边框 */
```

**使用规则**:
- 主要文字: 标题、重要信息
- 次要文字: 描述、说明文字
- 禁用文字: 不可用状态
- 提示文字: 辅助说明文字
- 主背景: 内容区域背景
- 次要背景: 侧边栏、卡片
- 第三背景: 输入框、下拉菜单
- 浅边框: 分割线
- 基础边框: 输入框边框
- 深边框: 特殊强调

#### 阴影
```css
/* 超小阴影 */
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);

/* 小阴影 */
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12),
              0 1px 2px rgba(0, 0, 0, 0.24);

/* 基础阴影 */
--shadow-base: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
                0 2px 4px -1px rgba(0, 0, 0, 0.06);

/* 中阴影 */
--shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
              0 4px 6px -2px rgba(0, 0, 0, 0.05);

/* 大阴影 */
--shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
              0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

**使用场景**:
- XS: 小标签、徽章
- SM: 按钮、输入框
- Base: 卡片、下拉菜单
- MD: 弹窗、抽屉
- LG: 模态框、浮层

### 2.2 字体规范

#### 字体家族
```css
/* 系统字体栈 */
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                'PingFang SC', 'Hiragino Sans GB', 
                'Microsoft YaHei', 'Helvetica Neue', 
                Helvetica, Arial, sans-serif;
```

#### 字号层级
```css
/* 字号系统 */
--font-xs: 12px;      /* 辅助文字、标签 */
--font-sm: 13px;      /* 小号文字 */
--font-base: 14px;    /* 基础文字（默认） */
--font-lg: 15px;      /* 中等文字 */
--font-xl: 16px;      /* 大号文字 */
--font-2xl: 18px;     /* 小标题 */
--font-3xl: 20px;     /* 标题 */
--font-4xl: 24px;     /* 大标题 */
--font-5xl: 30px;     /* 特大标题 */
--font-6xl: 36px;     /* 超大标题 */
```

**使用规则**:
- 12px: 标签、辅助说明
- 13px: 小号说明文字
- 14px: 正文、表单
- 15px: 强调文字
- 16px: 按钮、链接
- 18px: 页面副标题
- 20px: 卡片标题
- 24px: 页面标题
- 30px: 大型标题
- 36px: 超大型标题

#### 字重
```css
--font-weight-light: 300;    /* 细体 */
--font-weight-normal: 400;   /* 常规 */
--font-weight-medium: 500;   /* 中等 */
--font-weight-semibold: 600;  /* 半粗 */
--font-weight-bold: 700;    /* 粗体 */
```

**使用规则**:
- Light: 大型装饰文字
- Normal: 正文、说明文字
- Medium: 强调文字、标题
- Semibold: 小标题、按钮文字
- Bold: 主要标题、重要信息

#### 行高
```css
--leading-tight: 1.25;    /* 紧凑 */
--leading-normal: 1.5;     /* 正常 */
--leading-relaxed: 1.75;  /* 宽松 */
```

**使用规则**:
- Tight: 标题、标签
- Normal: 正文、描述
- Relaxed: 长文本、说明

### 2.3 间距系统

```css
/* 间距系统 */
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

**使用规则**:
- 0: 紧凑布局
- 4px: 图标文字间距
- 8px: 小元素间距
- 12px: 表单元素间距
- 16px: 卡片内边距
- 20px: 卡片间距
- 24px: 页面区域间距
- 32px: 大型区域间距
- 40px: 特大区域间距
- 48px: 页面外边距

### 2.4 圆角系统

```css
/* 圆角系统 */
--radius-none: 0px;        /* 无圆角 */
--radius-sm: 2px;          /* 小圆角 */
--radius-base: 4px;       /* 基础圆角 */
--radius-md: 6px;          /* 中圆角 */
--radius-lg: 8px;          /* 大圆角 */
--radius-xl: 12px;         /* 特大圆角 */
--radius-2xl: 16px;       /* 超大圆角 */
--radius-full: 9999px;    /* 完整圆角 */
```

**使用规则**:
- None: 表格、列表
- 2px: 小标签、徽章
- 4px: 按钮、输入框
- 6px: 小型卡片
- 8px: 中型卡片
- 12px: 大型卡片、面板
- 16px: 模态框、浮层
- Full: 头像、按钮

---

## 三、组件规范

### 3.1 按钮组件

#### 主按钮
```vue
<el-button type="primary" size="default">
  提交
</el-button>
```
- 用途: 主要操作、提交表单
- 尺寸: large | default | small
- 状态: default | hover | active | disabled

#### 次要按钮
```vue
<el-button size="default">
  取消
</el-button>
```
- 用途: 次要操作、取消操作
- 尺寸: large | default | small

#### 文本按钮
```vue
<el-button text size="small">
  查看详情
</el-button>
```
- 用途: 链接、查看详情
- 尺寸: default | small

#### 图标按钮
```vue
<el-button circle>
  <el-icon><Search /></el-icon>
</el-button>
```
- 用途: 工具栏操作
- 尺寸: 根据上下文

**按钮间距**:
- 同组按钮间距: 8px
- 表单内按钮间距: 16px
- 卡片内按钮间距: 12px

### 3.2 卡片组件

#### 基础卡片
```vue
<el-card shadow="never">
  <template #header>
    卡片标题
  </template>
  卡片内容
</el-card>
```
- 阴影: never | hover | always
- 圆角: 12px
- 内边距: 24px

#### 统计卡片
```vue
<el-card class="stat-card" shadow="hover" @click="handleClick">
  <div class="stat-icon" :style="{ background: gradient }">
    <el-icon :size="28" color="white">
      <component :is="icon" />
    </el-icon>
  </div>
  <div class="stat-info">
    <div class="stat-value">1,234</div>
    <div class="stat-label">村民总数</div>
  </div>
</el-card>
```
- 尺寸: 宽度自适应
- 交互: hover效果 + 点击
- 图标: 28px
- 渐变: 线性渐变

### 3.3 表格组件

#### 数据表格
```vue
<el-table :data="tableData" :loading="loading">
  <el-table-column prop="name" label="姓名" width="120" />
  <el-table-column prop="age" label="年龄" width="80" />
  <el-table-column prop="address" label="地址" />
  <el-table-column label="操作" width="150" fixed="right">
    <template #default="{ row }">
      <el-button size="small" text>查看</el-button>
      <el-button size="small" text>编辑</el-button>
    </template>
  </el-table-column>
</el-table>
```
- 斑马线: 斑马纹背景
- 边框: 1px solid #E2E8F0
- 头部背景: #F8FAFC
- 行高: 48px
- 内边距: 12px

### 3.4 表单组件

#### 表单布局
```vue
<el-form :model="form" :rules="rules" label-width="100px">
  <el-form-item label="姓名" prop="name">
    <el-input v-model="form.name" placeholder="请输入姓名" />
  </el-form-item>
  <el-form-item label="年龄" prop="age">
    <el-input-number v-model="form.age" :min="0" :max="120" />
  </el-form-item>
  <el-form-item>
    <el-button type="primary" @click="handleSubmit">提交</el-button>
    <el-button @click="handleReset">重置</el-button>
  </el-form-item>
</el-form>
```
- 标签宽度: 100px | 120px | 140px
- 表单项间距: 16px
- 必填标记: 红色 *
- 错误提示: 红色文字 + 图标

### 3.5 导航组件

#### 面包屑
```vue
<el-breadcrumb separator="/">
  <el-breadcrumb-item :to="{ path: '/pc/dashboard' }">首页</el-breadcrumb-item>
  <el-breadcrumb-item>村民管理</el-breadcrumb-item>
</el-breadcrumb>
```
- 分隔符: / 或 >
- 最大层级: 4层
- 可点击: 除当前页外

#### 侧边栏菜单
```vue
<el-menu :default-active="activeMenu" :collapse="collapsed">
  <el-menu-item index="/pc/dashboard">
    <el-icon><House /></el-icon>
    <template #title>仪表板</template>
  </el-menu-item>
</el-menu>
```
- 展开宽度: 240px
- 折叠宽度: 64px
- 菜单项高度: 48px
- 悬停效果: 背景色变化

---

## 四、页面布局规范

### 4.1 整体布局

```
┌──────────────────────────────────────────────────┐
│  侧边栏 (240px) │  顶部导航栏 (64px)     │
│  ┌───────────┐  │  ┌──────────────────────┐ │
│  │ Logo     │  │  │ 面包屑 | 搜索   │ │
│  └───────────┘  │  └──────────────────────┘ │
│                 │                            │
│  菜单         │  主内容区域              │
│  ├仪表板      │  ┌──────────────────────┐ │
│  ├村民管理    │  │                       │ │
│  ├村务管理    │  │   页面内容           │ │
│  ├财务管理    │  │                       │ │
│  └系统设置    │  │                       │ │
│                 │  └──────────────────────┘ │
└────────────────┴────────────────────────┘
```

### 4.2 侧边栏规范

#### 展开状态 (240px)
- Logo区域: 高度 64px
- 菜单区域: 滚动
- 底部操作: 高度 64px
- 背景色: 渐变蓝色

#### 折叠状态 (64px)
- 仅显示图标
- 悬停显示完整菜单
- 图标居中对齐

### 4.3 顶部导航规范

#### 尺寸
- 高度: 64px
- 内边距: 0 24px
- 背景: 半透明白色 + 毛玻璃效果

#### 内容区
- 左侧: 面包屑导航
- 右侧: 搜索 + 消息 + 全屏 + 用户

### 4.4 主内容区域规范

#### 容器
- 最大宽度: 1600px
- 居中对齐
- 内边距: 24px

#### 卡片
- 圆角: 12px
- 阴影: 基础阴影
- 内边距: 24px
- 间距: 20px

---

## 五、交互规范

### 5.1 悬停效果

#### 按钮
```css
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

#### 卡片
```css
.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
```

#### 表格行
```css
.table-row:hover {
  background: var(--bg-hover);
}
```

### 5.2 点击效果

#### 按钮
```css
.btn-primary:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}
```

#### 链接
```css
.link:active {
  color: var(--primary-700);
}
```

### 5.3 过渡动画

#### 时长
- 快速: 150ms
- 基础: 300ms
- 缓慢: 500ms

#### 缓动函数
- 标准: cubic-bezier(0.4, 0, 0.2, 1)
- 进入: cubic-bezier(0, 0, 0.2, 1)
- 离开: cubic-bezier(0.4, 0, 1, 1)

---

## 六、状态设计

### 6.1 加载状态

#### 骨架屏
```vue
<el-skeleton :rows="5" animated />
```
- 适用于: 数据加载中
- 动画: 渐变动画

#### 加载动画
```vue
<el-icon class="is-loading"><Loading /></el-icon>
```
- 适用于: 按钮加载
- 动画: 旋转动画

### 6.2 空状态

#### 无数据
```vue
<el-empty description="暂无数据" />
```
- 图标: 默认空状态图标
- 文字: 简洁的提示信息
- 操作: 可选的操作按钮

### 6.3 错误状态

#### 错误提示
```vue
<el-result icon="error" title="加载失败" sub-title="请刷新重试">
  <template #extra>
    <el-button type="primary" @click="handleRetry">刷新</el-button>
  </template>
</el-result>
```

---

## 七、图标规范

### 7.1 图标尺寸

```css
--icon-xs: 12px;    /* 小图标 */
--icon-sm: 16px;    /* 默认图标 */
--icon-base: 20px;  /* 中等图标 */
--icon-lg: 24px;    /* 大图标 */
--icon-xl: 28px;    /* 特大图标 */
--icon-2xl: 32px;   /* 超大图标 */
```

### 7.2 图标使用

#### 导航图标
- 尺寸: 20px
- 用途: 侧边栏菜单

#### 操作图标
- 尺寸: 16px | 20px
- 用途: 按钮、操作项

#### 装饰图标
- 尺寸: 12px | 14px
- 用途: 标签、徽章

---

## 八、响应式规范

### 8.1 断点系统

```css
--screen-sm: 640px;    /* 小屏 */
--screen-md: 768px;    /* 中屏 */
--screen-lg: 1024px;   /* 大屏 */
--screen-xl: 1280px;   /* 超大屏 */
--screen-2xl: 1536px;  /* 2倍大屏 */
```

### 8.2 布局适配

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

---

## 九、无障碍规范

### 9.1 键盘导航

#### 焦点顺序
- 所有交互元素支持Tab键导航
- 明确的焦点状态样式
- 合理的焦点顺序

#### 快捷键
- Tab: 下一个元素
- Shift + Tab: 上一个元素
- Enter: 激活元素
- Escape: 关闭弹窗

### 9.2 屏幕阅读器

#### 语义化标签
```html
<button aria-label="提交表单">提交</button>
<nav aria-label="主导航">
  <ul role="list">
    <li><a href="/" aria-current="page">首页</a></li>
  </ul>
</nav>
```

#### ARIA属性
- aria-label: 标签
- aria-described: 描述
- aria-current: 当前页
- aria-expanded: 展开/收起
- aria-hidden: 隐藏元素

### 9.3 色彩对比度

#### 对比度要求
- 文字与背景: ≥ 4.5:1
- 大号文字: ≥ 3:1
- 重要信息: ≥ 7:1

#### 测试工具
- WAVE工具
- axe DevTools
- Lighthouse

---

## 十、最佳实践

### 10.1 代码规范

#### 命名规范
- 组件: PascalCase
- 文件: kebab-case
- 变量: camelCase
- 常量: UPPER_SNAKE_CASE

#### 文件结构
```
components/
├── Button/
│   ├── Button.vue
│   ├── Button.spec.ts
│   └── index.ts
└── index.ts
```

### 10.2 性能优化

#### 懒加载
```javascript
const AsyncComponent = defineAsyncComponent(() => 
  import('./components/AsyncComponent.vue')
)
```

#### 虚拟滚动
```vue
<el-table-v2 :data="largeData" :height="400" />
```

#### 防抖/节流
```javascript
import { debounce, throttle } from 'lodash-es';
```

### 10.3 测试规范

#### 单元测试
- 覆盖率: ≥ 80%
- 测试所有交互功能
- 测试所有边界情况

#### E2E测试
- 测试主要用户流程
- 测试关键业务功能
- 测试跨浏览器兼容性

---

## 十一、常见问题

### 11.1 色彩问题
**问题**: 颜色显示不一致
**解决**: 使用设计系统变量,避免硬编码颜色值

### 11.2 字体问题
**问题**: 字体在不同系统显示不一致
**解决**: 使用系统字体栈,提供Web字体备选

### 11.3 间距问题
**问题**: 间距不统一
**解决**: 使用设计系统间距变量,避免随意设置

### 11.4 交互问题
**问题**: 交互反馈不明显
**解决**: 添加明确的悬停、点击、焦点状态

---

## 十二、更新日志

### v1.0 (2025-01-12)
- 初始版本发布
- 完成设计系统定义
- 完成组件规范文档
- 完成页面布局规范

---

**文档结束**
