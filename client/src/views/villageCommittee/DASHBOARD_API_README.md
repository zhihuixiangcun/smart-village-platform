# Dashboard API 集成文档

## 概述

本文档描述了村干部Dashboard的完整API集成功能，包括数据获取、保存、缓存、错误处理和重试机制。

## 功能特性

### 1. 数据获取功能

#### 1.1 Dashboard概览数据
```javascript
// 获取Dashboard概览
const overview = await dashboardDataManager.fetchOverview({ villageId: 'village_001' });

// 返回数据格式
{
  statistics: {
    residentCount: 1234,
    householdCount: 486,
    noticesCount: 28,
    tasksCount: 15,
    residentsChange: '+12 本月',
    residentsTrend: 'up'
  },
  monthlyPoints: 1250,
  pendingTasks: 8,
  connectionStatus: 'connected'
}
```

#### 1.2 待办事项列表
```javascript
// 获取待办事项（支持分页、筛选）
const todos = await dashboardDataManager.fetchTodos({
  page: 1,
  limit: 10,
  status: 'pending',
  type: '人事',
  priority: 'high',
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  keyword: '审批'
});

// 返回数据格式
{
  tasks: [
    {
      _id: 'todo_001',
      title: '审批张三的调任申请',
      description: '详细描述',
      type: '人事',
      priority: 'high',
      status: 'pending',
      dueDate: '2026-01-15T10:00:00.000Z',
      completed: false,
      createdAt: '2026-01-10T08:00:00.000Z'
    }
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 50
  }
}
```

#### 1.3 统计数据
```javascript
// 获取统计数据
const stats = await dashboardDataManager.fetchStatistics({
  villageId: 'village_001',
  period: 'month',
  metrics: ['residents', 'tasks', 'notices']
});

// 返回数据格式
{
  period: 'month',
  data: {
    labels: ['第一周', '第二周', '第三周', '第四周'],
    datasets: [
      { name: '新增村民', data: [15, 22, 18, 25] },
      { name: '处理事务', data: [45, 52, 48, 55] },
      { name: '发布公告', data: [12, 18, 15, 20] }
    ]
  }
}
```

#### 1.4 Dashboard配置
```javascript
// 获取用户Dashboard配置
const settings = await dashboardDataManager.fetchSettings(userId);

// 返回数据格式
{
  widgets: [
    { id: 'committee-manage', position: 0 },
    { id: 'population-manage', position: 1 }
  ],
  filters: {
    todoStatus: 'pending',
    todoType: '',
    noticeLevel: '',
    dateRange: null
  },
  theme: 'light',
  layout: {
    chartPeriod: 'week',
    sidebarCollapsed: false
  }
}
```

### 2. 数据保存功能

#### 2.1 保存待办事项
```javascript
// 创建新的待办事项
const todo = await dashboardDataManager.saveTodo({
  title: '完成月度报告',
  description: '整理本月工作数据',
  type: '行政',
  priority: 'high',
  status: 'pending',
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
});

// 更新待办事项
const updatedTodo = await dashboardDataManager.saveTodo({
  id: 'todo_001',
  title: '完成月度报告（已更新）',
  status: 'in_progress'
});
```

#### 2.2 批量保存待办事项
```javascript
const todos = [
  { title: '任务1', type: '人事', priority: 'medium' },
  { title: '任务2', type: '党务', priority: 'high' },
  { title: '任务3', type: '行政', priority: 'low' }
];

const result = await dashboardDataManager.batchSaveTodos(todos);
// 返回: { success: 3, failed: 0 }
```

#### 2.3 保存Dashboard配置
```javascript
const config = {
  widgets: selectedQuickActions.value,
  filters: filters.value,
  theme: 'dark',
  layout: { chartPeriod: 'month' }
};

await dashboardDataManager.saveSettings(config);
```

#### 2.4 保存图表配置
```javascript
const chartConfig = {
  chartId: 'dashboard_main_chart',
  period: 'week',
  options: {
    type: 'bar',
    stacked: true,
    showLegend: true
  }
};

await dashboardDataManager.saveChartConfig(chartConfig);
```

#### 2.5 批量保存配置
```javascript
const batchData = {
  settings: { /* Dashboard配置 */ },
  chartConfigs: [ /* 图表配置数组 */ ],
  filterConfigs: { /* 筛选器配置 */ }
};

await dashboardDataManager.batchSaveConfigs(batchData);
```

### 3. 删除功能

#### 3.1 删除待办事项
```javascript
// 删除单个待办
await dashboardDataManager.deleteTodo('todo_001');

// 批量删除
await dashboardDataManager.batchDeleteTodos(['todo_001', 'todo_002', 'todo_003']);
```

#### 3.2 切换待办状态
```javascript
// 标记为完成
await dashboardDataManager.toggleTodoStatus('todo_001', 'completed');

// 标记为未完成
await dashboardDataManager.toggleTodoStatus('todo_001', 'pending');
```

### 4. 缓存机制

#### 4.1 自动缓存
所有API请求都会自动缓存，默认过期时间：
- 概览数据: 5分钟
- 待办事项: 3分钟
- 统计数据: 10分钟
- 配置数据: 30分钟

#### 4.2 强制刷新
```javascript
// 跳过缓存，强制从服务器获取
const overview = await dashboardDataManager.fetchOverview({}, true);
```

#### 4.3 手动缓存控制
```javascript
// 保存到缓存
await dashboardDataManager.setCache('custom_key', data, 60000);

// 从缓存获取
const cached = await dashboardDataManager.getFromCache('custom_key');

// 清除缓存
await dashboardDataManager.clearCache(); // 清除所有
await dashboardDataManager.clearCache('dashboard:overview'); // 清除指定
```

### 5. 错误处理和重试机制

#### 5.1 自动重试
请求失败时会自动重试，默认配置：
- 最大重试次数: 3次
- 初始延迟: 1000ms
- 退避倍数: 2（指数退避）

#### 5.2 错误处理
```javascript
try {
  const data = await dashboardDataManager.fetchOverview();
} catch (error) {
  // 错误会自动显示在UI上
  console.error('加载失败:', error);
}
```

#### 5.3 获取错误状态
```javascript
const { hasError, error } = dashboardDataManager;
if (hasError.value) {
  console.error('最后错误:', error.value);
}
```

### 6. 加载状态管理

#### 6.1 获取加载状态
```javascript
const { loading, saving } = dashboardDataManager;

// loading: 数据获取中
// saving: 数据保存中
```

#### 6.2 在模板中使用
```vue
<el-button :loading="loading" @click="fetchData">加载</el-button>
<el-button :loading="saving" @click="saveData">保存</el-button>
```

### 7. 数据刷新

#### 7.1 刷新所有数据
```javascript
const result = await dashboardDataManager.refreshData('all', {
  overview: { villageId: 'village_001' },
  todos: { limit: 10 },
  statistics: { period: 'month' }
});
```

#### 7.2 刷新指定类型数据
```javascript
// 仅刷新概览
const overview = await dashboardDataManager.refreshData('overview', { villageId: 'village_001' });

// 仅刷新待办事项
const todos = await dashboardDataManager.refreshData('todos', { limit: 20 });

// 仅刷新统计数据
const stats = await dashboardDataManager.refreshData('statistics', { period: 'year' });

// 仅刷新配置
const settings = await dashboardDataManager.refreshData('settings', userId);
```

## API端点说明

### GET 端点

| 端点 | 说明 | 参数 |
|------|------|------|
| `/api/village/dashboard/overview` | 获取Dashboard概览 | `villageId`, `period` |
| `/api/village/dashboard/todos` | 获取待办事项列表 | `page`, `limit`, `status`, `type`, `priority`, `startDate`, `endDate`, `keyword` |
| `/api/village/dashboard/statistics` | 获取统计数据 | `villageId`, `period`, `metrics` |
| `/api/village/dashboard/settings` | 获取Dashboard配置 | `userId` |
| `/api/village/dashboard/chart-config/:id` | 获取图表配置 | - |

### POST 端点

| 端点 | 说明 | 请求体 |
|------|------|--------|
| `/api/village/dashboard/todos` | 创建待办事项 | `title`, `description`, `type`, `priority`, `status`, `dueDate` |
| `/api/village/dashboard/settings` | 保存Dashboard配置 | `widgets`, `filters`, `theme`, `layout` |
| `/api/village/dashboard/chart-config` | 保存图表配置 | `chartId`, `period`, `options` |
| `/api/village/dashboard/todos/batch` | 批量创建待办事项 | `todos: []` |
| `/api/village/dashboard/batch-save` | 批量保存配置 | `settings`, `chartConfigs`, `filterConfigs` |

### PUT 端点

| 端点 | 说明 | 请求体 |
|------|------|--------|
| `/api/village/dashboard/todos/:id` | 更新待办事项 | 待办事项的所有可更新字段 |
| `/api/village/dashboard/todos/batch` | 批量更新待办状态 | `todoIds`, `status` |

### DELETE 端点

| 端点 | 说明 | 请求体 |
|------|------|--------|
| `/api/village/dashboard/todos/:id` | 删除待办事项 | - |
| `/api/village/dashboard/todos/batch` | 批量删除待办事项 | `todoIds: []` |

## 使用示例

### 完整的使用流程

```javascript
import { useDashboardData } from '@/composables/useDashboardData';

// 在组件中
export default {
  setup() {
    const dashboardDataManager = useDashboardData();

    // 加载所有数据
    const loadAll = async () => {
      try {
        const data = await dashboardDataManager.loadAllDashboardData({
          overview: { villageId: 'village_001' },
          todos: { limit: 10, status: 'pending' },
          statistics: { period: 'month' },
          userId: 'user_001'
        });

        console.log('概览:', data.overview);
        console.log('待办:', data.todos);
        console.log('统计:', data.statistics);
        console.log('配置:', data.settings);
      } catch (error) {
        console.error('加载失败:', error);
      }
    };

    // 创建待办事项
    const createTodo = async () => {
      const todo = await dashboardDataManager.saveTodo({
        title: '新的待办任务',
        type: '人事',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      console.log('创建成功:', todo);
    };

    // 保存配置
    const saveConfig = async () => {
      const config = {
        widgets: ['committee-manage', 'population-manage'],
        filters: { todoStatus: 'pending' },
        theme: 'light',
        layout: { chartPeriod: 'week' }
      };

      await dashboardDataManager.saveSettings(config);
    };

    return { loadAll, createTodo, saveConfig };
  }
};
```

### Dashboard.vue 组件中的集成

```vue
<script setup>
import { useDashboardData } from '@/composables/useDashboardData';
import { onMounted } from 'vue';

const dashboardDataManager = useDashboardData();

const todoList = ref([]);
const statisticsCards = ref([]);

const loadDashboardData = async () => {
  try {
    const villageId = userStore.villageId || 'default';

    // 并行获取数据
    const [overview, todos] = await Promise.all([
      dashboardDataManager.fetchOverview({ villageId }),
      dashboardDataManager.fetchTodos({ limit: 10, status: 'pending' })
    ]);

    // 更新统计数据卡片
    if (overview.statistics) {
      statisticsCards.value = [
        { key: 'residents', value: overview.statistics.residentCount, ... },
        { key: 'households', value: overview.statistics.householdCount, ... },
        // ...
      ];
    }

    // 更新待办列表
    if (todos.tasks) {
      todoList.value = todos.tasks.map(task => ({
        _id: task._id,
        title: task.title,
        type: task.type,
        deadline: task.dueDate,
        completed: task.status === 'completed'
      }));
    }
  } catch (error) {
    console.error('加载数据失败:', error);
  }
};

// 创建待办事项
const handleCreateTodo = async todoData => {
  try {
    const result = await dashboardDataManager.saveTodo(todoData);
    todoList.value.push(result);
    ElMessage.success('创建成功');
  } catch (error) {
    ElMessage.error('创建失败');
  }
};

// 删除待办事项
const handleDeleteTodo = async todoId => {
  try {
    await dashboardDataManager.deleteTodo(todoId);
    todoList.value = todoList.value.filter(t => t._id !== todoId);
    ElMessage.success('删除成功');
  } catch (error) {
    ElMessage.error('删除失败');
  }
};

onMounted(() => {
  loadDashboardData();
});
</script>
```

## 自动保存功能

Dashboard组件支持自动保存配置功能，当用户修改以下内容时会自动保存：
- 筛选器设置
- 图表周期
- 快捷操作配置

自动保存采用防抖机制（2秒延迟），避免频繁保存。

```javascript
// 触发自动保存
await dashboardDataManager.autoSaveConfig();
```

## 离线支持

### 离线数据缓存

所有请求的数据都会自动缓存到IndexedDB，支持离线访问。

```javascript
// 获取缓存中的数据（即使离线）
const cachedData = await dashboardDataManager.getFromCache('dashboard:overview');
```

### 同步队列

离线时的操作会添加到同步队列，网络恢复后自动同步。

```javascript
// 查看待同步的操作
const pendingSyncs = await offlineStorage.getPendingSyncs({
  entityType: 'todo'
});
```

## 性能优化

### 1. 并行请求
```javascript
// 推荐：并行获取多个数据源
const [overview, todos, stats] = await Promise.all([
  dashboardDataManager.fetchOverview({ villageId }),
  dashboardDataManager.fetchTodos({ limit: 10 }),
  dashboardDataManager.fetchStatistics({ period: 'month' })
]);
```

### 2. 缓存策略
- 首次访问：从服务器获取并缓存
- 二次访问：从缓存读取（除非过期）
- 强制刷新：跳过缓存直接获取

### 3. 批量操作
```javascript
// 推荐：批量操作代替多个单独操作
await dashboardDataManager.batchSaveTodos([
  { title: '任务1' },
  { title: '任务2' },
  { title: '任务3' }
]);
```

## 注意事项

1. **数据验证**: 所有保存操作都会进行前端验证，确保数据格式正确
2. **错误处理**: 所有API调用都有完整的错误处理和用户提示
3. **加载状态**: 使用 `loading` 和 `saving` 状态来指示操作进度
4. **缓存更新**: 保存数据后会自动清除相关缓存
5. **重试机制**: 网络错误时会自动重试，最多3次
6. **离线支持**: 支持离线访问和自动同步

## 故障排查

### 问题：数据加载失败
**解决方案**：
1. 检查网络连接
2. 查看浏览器控制台错误信息
3. 尝试清除缓存：`await dashboardDataManager.clearCache()`
4. 强制刷新数据：`await dashboardDataManager.refreshData('all')`

### 问题：保存操作失败
**解决方案**：
1. 检查用户权限
2. 验证数据格式
3. 查看服务器日志
4. 尝试重新登录

### 问题：数据不同步
**解决方案**：
1. 检查网络连接
2. 查看同步队列状态
3. 手动触发同步
4. 清除缓存重新加载

## 技术栈

- **HTTP客户端**: Axios
- **状态管理**: Vue 3 Composition API
- **缓存**: IndexedDB (通过 `offlineStorage`)
- **错误处理**: 全局拦截器
- **重试机制**: 指数退避算法
- **UI反馈**: Element Plus Message

## 相关文件

- `client/src/api/dashboard.js` - API接口定义
- `client/src/composables/useDashboardData.js` - 数据管理逻辑
- `client/src/utils/offlineStorage.js` - 离线存储工具
- `client/src/utils/http.js` - HTTP请求工具
- `client/src/views/villageCommittee/Dashboard.vue` - Dashboard组件
