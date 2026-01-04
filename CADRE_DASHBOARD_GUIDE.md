# 村干部主页功能文档

## 📋 概述

村干部主页是智慧乡村平台中村干部使用的工作台，提供一站式数据概览、快捷操作、待办事项管理和村民动态查看等功能。

---

## 🎨 页面布局

### 整体结构
```
┌─────────────────────────────────────────────────────────────┐
│                      欢迎栏 (用户信息+积分统计)              │
├─────────────────────────────────────────────────────────────┤
│           数据统计卡片 (4个统计模块)                         │
├──────────────────────────────────┬──────────────────────────┤
│        左侧主栏 (16列)           │      右侧边栏 (8列)      │
│  ┌──────────────────────────┐   │  ┌────────────────────┐ │
│  │  数据图表 (ECharts)      │   │  │  快捷操作(6个)    │ │
│  ├──────────────────────────┤   │  ├────────────────────┤ │
│  │  今日值班列表            │   │  │  最新通知         │ │
│  ├──────────────────────────┤   │  ├────────────────────┤ │
│  │  待办事项列表            │   │  │  村民动态         │ │
│  └──────────────────────────┘   │  └────────────────────┘ │
└──────────────────────────────────┴──────────────────────────┘
```

---

## ✨ 核心功能模块

### 1. 欢迎栏

**功能**：
- 显示当前用户姓名和职位
- 根据时间显示不同问候语（凌晨好/早上好/上午好/中午好/下午好/晚上好/夜深了）
- 显示当前日期
- 显示本月积分和待处理任务数

**实现代码**：
```javascript
const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 22) return '晚上好'
  return '夜深了'
}
```

---

### 2. 数据统计卡片

**显示数据**：
- 村民总数（渐变紫色图标）
- 住户总数（渐变粉色图标）
- 本月公告（渐变蓝色图标）
- 待办事项（渐变绿色图标）

**交互功能**：
- 悬停效果：卡片上浮5px
- 点击跳转：跳转到对应的管理页面
- 显示趋势：增加/减少百分比

**数据结构**：
```javascript
{
  key: 'residents',
  label: '村民总数',
  value: '1,234',
  icon: 'UserFilled',
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  change: '+12 本月',
  trendClass: 'up',
  trendIcon: 'ArrowUp',
  route: '/residents'
}
```

---

### 3. 数据图表 (ECharts)

**功能**：
- 使用 ECharts 绘制柱状图
- 支持三种时间维度：本周/本月/全年
- 三个数据系列：新增村民、处理事务、发布公告
- 响应式：窗口大小改变时自动调整

**交互功能**：
- 点击时间切换按钮更新图表数据
- 鼠标悬停显示详细数据
- 图例点击显示/隐藏数据系列

**初始化代码**：
```javascript
const initChart = () => {
  chartInstance.value = echarts.init(chartRef.value)
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增村民', '处理事务', '发布公告'] },
    xAxis: { type: 'category', data: ['周一', '周二', ...] },
    yAxis: { type: 'value' },
    series: [
      { name: '新增村民', type: 'bar', data: [...] },
      { name: '处理事务', type: 'bar', data: [...] },
      { name: '发布公告', type: 'bar', data: [...] }
    ]
  }
  chartInstance.value.setOption(option)
}
```

---

### 4. 今日值班

**功能**：
- 显示当天的值班人员列表
- 显示值班人员的姓名、职位、值班时间段
- 一键拨打值班人员电话

**交互功能**：
- 点击"联系"按钮弹出确认对话框
- 确认后模拟拨打电话（需集成实际电话功能）

**数据结构**：
```javascript
{
  _id: '1',
  memberName: '张三',
  position: '村支书',
  period: '上午 08:00-12:00',
  contact: '13800138000',
  avatar: ''
}
```

---

### 5. 待办事项

**功能**：
- 显示待处理任务列表
- 支持勾选完成/取消完成
- 显示任务类型标签（人事/党务/行政/财务/应急）
- 显示截止时间

**视觉提示**：
- 紧急任务：24小时内到期的任务左侧红色边框
- 过期任务：截止时间显示红色并加粗
- 已完成：任务标题删除线，透明度降低

**交互功能**：
- 勾选复选框切换完成状态
- 点击"处理"按钮查看详情
- 点击"查看全部"跳转到任务管理页面

---

### 6. 快捷操作

**6个快捷按钮**：
1. **紧急通知** (红色渐变，横跨两列)
   - 打开发送紧急通知对话框
   - 支持多种通知类型（紧急事件/自然灾害/公共卫生/安全事故/重要通知）
   - 支持多种发送方式（APP推送/短信/微信/电话）

2. **添加人员**
   - 跳转到人员管理页面

3. **添加值班**
   - 跳转到值班表管理页面

4. **发布公告**
   - 跳转到公告发布页面

5. **导出报表**
   - 跳转到报表导出页面

6. **村情地图**
   - 跳转到村情地图页面

---

### 7. 最新通知

**功能**：
- 显示最新的通知公告列表
- 显示通知级别标签（紧急/重要/一般/通知）
- 未读通知蓝色背景高亮

**交互功能**：
- 点击通知标记为已读
- 显示相对时间（刚刚/X分钟前/X小时前/X天前）

---

### 8. 村民动态

**功能**：
- 显示村民的最新操作记录
- 显示村民头像和姓名
- 显示操作内容和时间

**数据示例**：
```javascript
{
  _id: '1',
  userName: '王五',
  userAvatar: '',
  action: '提交了低保申请',
  createdAt: '2024-12-19T10:30:00Z'
}
```

---

## 🔌 API集成

### 数据加载

```javascript
const loadData = async () => {
  try {
    // TODO: 从后端API加载数据
    // const response = await fetch('http://localhost:3001/api/v1/cadre/dashboard')
    // const data = await response.json()

    // 当前使用模拟数据
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  }
}
```

### API端点规划

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/v1/cadre/dashboard` | GET | 获取主页所有数据 |
| `/api/v1/cadre/duty/today` | GET | 获取今日值班 |
| `/api/v1/cadre/todos` | GET | 获取待办事项 |
| `/api/v1/cadre/todos/:id/status` | PUT | 更新待办状态 |
| `/api/v1/cadre/notices` | GET | 获取通知列表 |
| `/api/v1/cadre/notices/:id/read` | PUT | 标记通知已读 |
| `/api/v1/cadre/activities` | GET | 获取村民动态 |
| `/api/v1/cadre/emergency` | POST | 发送紧急通知 |
| `/api/v1/cadre/statistics` | GET | 获取统计数据 |

---

## 🎨 样式特点

### 渐变背景
- 欢迎栏：紫色渐变 `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- 紧急通知按钮：红色渐变 `linear-gradient(135deg, #f5576c 0%, #f093fb 100%)`

### 卡片样式
- 无边框设计
- 悬停上浮效果
- 圆角边框 (border-radius: 12px-16px)

### 响应式设计
- 桌面端：左右两栏布局 (16:8)
- 平板端：上下堆叠
- 移动端：单栏布局，快捷操作单列显示

---

## 📱 响应式断点

```scss
@media (max-width: 768px) {
  // 移动端样式
  .cadre-dashboard {
    padding: 10px;
  }

  .quick-actions {
    grid-template-columns: 1fr;
  }
}
```

---

## 🔧 待开发功能

### 高优先级
- [ ] 集成真实后端API
- [ ] 实现电话拨打功能
- [ ] 通知详情对话框
- [ ] 待办事项详情页面

### 中优先级
- [ ] 数据实时刷新（WebSocket）
- [ ] 图表数据导出
- [ ] 自定义快捷操作
- [ ] 消息推送设置

### 低优先级
- [ ] 主题切换
- [ ] 个性化布局
- [ ] 数据对比分析
- [ ] 工作日历视图

---

## 🚀 使用指南

### 访问地址
```
http://localhost:3006/village-committee/dashboard
```

### 登录要求
- 角色：村委 (village_admin)
- 测试账户：testcadre / Cadre123456!

### 快速开始
1. 使用村委账户登录系统
2. 进入"村委管理"模块
3. 查看主页数据概览
4. 使用快捷操作处理日常事务

---

## 📝 相关文件

| 文件 | 说明 |
|------|------|
| [Dashboard.vue](client/src/views/villageCommittee/Dashboard.vue) | 村干部主页组件 |
| [committeeStore.js](client/src/stores/villageCommittee/committeeStore.js) | 村委状态管理 |
| [ContactButton.vue](client/src/components/villageCommittee/ContactButton.vue) | 联系按钮组件 |

---

## 🎯 下一步计划

- [ ] 添加数据筛选功能
- [ ] 支持自定义图表类型
- [ ] 实现任务分配功能
- [ ] 添加工作提醒设置
- [ ] 集成语音播报功能

---

**更新时间**: 2026-01-04
**版本**: v2.0.0
**维护者**: Smart Village Development Team
