<template>
  <div class="smart-village-home">
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="header-left">
        <div class="village-info">
          <h2>智慧村务管理平台</h2>
          <span class="village-name">{{ currentVillage.name || '智慧村' }}</span>
        </div>
      </div>
      <div class="header-right">
        <div class="user-info">
          <span class="user-name">{{ currentUser?.username || '管理员' }}</span>
          <span class="user-role">{{ currentUser?.role || '村长' }}</span>
        </div>
        <button @click="handleLogout" class="logout-btn">
          <el-icon><SwitchButton /></el-icon>
          退出登录
        </button>
      </div>
    </header>

    <!-- 主要内容区域 -->
    <main class="main-content">
      <!-- 欢迎横幅 -->
      <section class="welcome-banner">
        <div class="banner-content">
          <h1>欢迎来到智慧村务管理中心</h1>
          <p>数字化乡村治理，服务美好生活</p>
          <div class="quick-stats">
            <div class="stat-item">
              <div class="stat-number">{{ (statistics.totalResidents || 1, 234) }}</div>
              <div class="stat-label">常住人口</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ statistics.totalHouseholds || 456 }}</div>
              <div class="stat-label">户数</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ statistics.pendingTasks || 12 }}</div>
              <div class="stat-label">待处理事务</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ statistics.todayAnnouncements || 3 }}</div>
              <div class="stat-label">今日公告</div>
            </div>
          </div>
        </div>
        <div class="weather-widget">
          <div class="weather-info">
            <el-icon size="32"><Sunny /></el-icon>
            <span class="temperature">26°C</span>
            <span class="weather-desc">晴朗</span>
          </div>
        </div>
      </section>

      <!-- 核心功能区 -->
      <section class="core-functions">
        <h2 class="section-title">核心功能</h2>
        <div class="functions-grid">
          <!-- 村委管理 -->
          <div class="function-card committee-management" @click="navigateToFunction('committee')">
            <div class="card-header">
              <el-icon size="32"><User /></el-icon>
              <h3>村委管理</h3>
            </div>
            <div class="card-content">
              <ul>
                <li>在职人员信息管理</li>
                <li>党员信息档案</li>
                <li>职务调任管理</li>
                <li>智能值班表</li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="update-time">今日更新 3 项</span>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
            </div>
          </div>

          <!-- 村民管理 -->
          <div class="function-card resident-management" @click="navigateToFunction('residents')">
            <div class="card-header">
              <el-icon size="32"><House /></el-icon>
              <h3>村民管理</h3>
            </div>
            <div class="card-content">
              <ul>
                <li>村民档案数字化</li>
                <li>家庭关系管理</li>
                <li>一户一码系统</li>
                <li>在线办事服务</li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="update-time">本周新增 5 户</span>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
            </div>
          </div>

          <!-- 村务治理 -->
          <div class="function-card governance" @click="navigateToFunction('governance')">
            <div class="card-header">
              <el-icon size="32"><Setting /></el-icon>
              <h3>村务治理</h3>
            </div>
            <div class="card-content">
              <ul>
                <li>财务透明化管理</li>
                <li>项目全周期管理</li>
                <li>任务一网统管</li>
                <li>智能调度系统</li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="update-time">进行中项目 8 个</span>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
            </div>
          </div>

          <!-- 信息公示 -->
          <div class="function-card information" @click="navigateToFunction('information')">
            <div class="card-header">
              <el-icon size="32"><Bell /></el-icon>
              <h3>信息公示</h3>
            </div>
            <div class="card-content">
              <ul>
                <li>政策法规发布</li>
                <li>村务通知公告</li>
                <li>政策计算器</li>
                <li>语音播报系统</li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="update-time">最新发布 2 小时前</span>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
            </div>
          </div>

          <!-- 便民服务 -->
          <div class="function-card services" @click="navigateToFunction('services')">
            <div class="card-header">
              <el-icon size="32"><Service /></el-icon>
              <h3>便民服务</h3>
            </div>
            <div class="card-content">
              <ul>
                <li>证件办理服务</li>
                <li>福利申请</li>
                <li>医保社保</li>
                <li>乡村生活圈</li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="update-time">待处理申请 15 件</span>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
            </div>
          </div>

          <!-- 数据统计 -->
          <div class="function-card statistics" @click="navigateToFunction('statistics')">
            <div class="card-header">
              <el-icon size="32"><TrendCharts /></el-icon>
              <h3>数据统计</h3>
            </div>
            <div class="card-content">
              <ul>
                <li>人口结构分析</li>
                <li>财务收支统计</li>
                <li>项目进度跟踪</li>
                <li>服务办理分析</li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="status-text">实时更新</span>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
            </div>
          </div>

          <!-- 应急管理 -->
          <div class="function-card emergency" @click="navigateToFunction('emergency')">
            <div class="card-header">
              <el-icon size="32"><Warning /></el-icon>
              <h3>应急管理</h3>
            </div>
            <div class="card-content">
              <ul>
                <li>一键呼叫系统</li>
                <li>应急资源管理</li>
                <li>村情地图</li>
                <li>预案管理</li>
              </ul>
            </div>
            <div class="card-footer">
              <span class="update-time">系统正常运行</span>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
            </div>
          </div>
        </div>
      </section>

      <!-- 今日要务 -->
      <section class="today-tasks">
        <div class="section-header">
          <h2 class="section-title">今日要务</h2>
          <el-button type="primary" @click="refreshTasks">刷新</el-button>
        </div>
        <div class="tasks-grid">
          <div class="task-card urgent" v-if="urgentTasks.length > 0">
            <div class="task-header">
              <el-icon><Warning /></el-icon>
              <h3>紧急事务</h3>
              <el-tag type="danger">{{ urgentTasks.length }}</el-tag>
            </div>
            <div class="task-list">
              <div class="task-item" v-for="task in urgentTasks" :key="task.id">
                <div class="task-content">
                  <span class="task-title">{{ task.title }}</span>
                  <span class="task-time">{{ task.time }}</span>
                </div>
                <el-button type="danger" size="small" @click="handleTask(task)">处理</el-button>
              </div>
            </div>
          </div>

          <div class="task-card normal">
            <div class="task-header">
              <el-icon><List /></el-icon>
              <h3>常规事务</h3>
              <el-tag type="info">{{ normalTasks.length }}</el-tag>
            </div>
            <div class="task-list">
              <div class="task-item" v-for="task in normalTasks" :key="task.id">
                <div class="task-content">
                  <span class="task-title">{{ task.title }}</span>
                  <span class="task-time">{{ task.time }}</span>
                </div>
                <el-button type="primary" size="small" @click="handleTask(task)">处理</el-button>
              </div>
            </div>
          </div>

          <div class="task-card completed">
            <div class="task-header">
              <el-icon><CircleCheck /></el-icon>
              <h3>已完成</h3>
              <el-tag type="success">{{ completedTasks.length }}</el-tag>
            </div>
            <div class="task-list">
              <div class="task-item" v-for="task in completedTasks" :key="task.id">
                <div class="task-content">
                  <span class="task-title">{{ task.title }}</span>
                  <span class="task-time">{{ task.time }}</span>
                </div>
                <el-icon color="#67C23A"><CircleCheck /></el-icon>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 数据概览 -->
      <section class="data-overview">
        <div class="section-header">
          <h2 class="section-title">数据概览</h2>
          <el-select v-model="selectedTimeRange" @change="updateStatistics">
            <el-option label="今日" value="today" />
            <el-option label="本周" value="week" />
            <el-option label="本月" value="month" />
            <el-option label="本年" value="year" />
          </el-select>
        </div>
        <div class="charts-grid">
          <div class="chart-card">
            <h3>村民年龄分布</h3>
            <div class="chart-placeholder">
              <el-icon size="48"><PieChart /></el-icon>
              <p>图表加载中...</p>
            </div>
          </div>
          <div class="chart-card">
            <h3>月度财务趋势</h3>
            <div class="chart-placeholder">
              <el-icon size="48"><TrendCharts /></el-icon>
              <p>图表加载中...</p>
            </div>
          </div>
          <div class="chart-card">
            <h3>服务办理统计</h3>
            <div class="chart-placeholder">
              <el-icon size="48"><DataAnalysis /></el-icon>
              <p>图表加载中...</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 快捷操作 -->
      <section class="quick-actions">
        <h2 class="section-title">快捷操作</h2>
        <div class="actions-grid">
          <button class="action-btn primary" @click="quickAction('announcement')">
            <el-icon><Bell /></el-icon>
            发布公告
          </button>
          <button class="action-btn success" @click="quickAction('resident')">
            <el-icon><Plus /></el-icon>
            添加村民
          </button>
          <button class="action-btn warning" @click="quickAction('meeting')">
            <el-icon><Calendar /></el-icon>
            安排会议
          </button>
          <button class="action-btn info" @click="quickAction('report')">
            <el-icon><Document /></el-icon>
            生成报告
          </button>
          <button class="action-btn danger" @click="quickAction('emergency')">
            <el-icon><Warning /></el-icon>
            应急呼叫
          </button>
          <button class="action-btn" @click="quickAction('search')">
            <el-icon><Search /></el-icon>
            智能搜索
          </button>
        </div>
      </section>
    </main>

    <!-- 底部信息栏 -->
    <footer class="app-footer">
      <div class="footer-left">
        <span>© 2024 智慧村务管理平台</span>
        <span>|</span>
        <span>系统版本 v2.0.1</span>
      </div>
      <div class="footer-right">
        <div class="connection-status">
          <el-icon color="#67C23A"><Connection /></el-icon>
          <span>系统运行正常</span>
        </div>
        <div class="last-update">
          <span>最后更新: {{ lastUpdateTime }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  SwitchButton,
  User,
  House,
  Setting,
  Bell,
  Service,
  Warning,
  Sunny,
  ArrowRight,
  List,
  CircleCheck,
  PieChart,
  TrendCharts,
  DataAnalysis,
  Plus,
  Calendar,
  Document,
  Search,
  Connection,
} from '@element-plus/icons-vue';

const router = useRouter();
const userStore = useUserStore();

// 响应式数据
const currentUser = ref(null);
const selectedTimeRange = ref('week');
const lastUpdateTime = ref(new Date().toLocaleString());

// 当前村庄信息
const currentVillage = reactive({
  name: '智慧村',
  code: 'SM001',
  population: 1234,
  households: 456,
});

// 统计数据
const statistics = reactive({
  totalResidents: 1234,
  totalHouseholds: 456,
  pendingTasks: 12,
  todayAnnouncements: 3,
});

// 今日要务数据
const urgentTasks = ref([
  { id: 1, title: '张三家水管破裂紧急维修', time: '10:30' },
  { id: 2, title: '村道路灯故障排查', time: '09:15' },
  { id: 3, title: '独居老人健康回访', time: '08:45' },
]);

const normalTasks = ref([
  { id: 4, title: '整理本月财务报表', time: '14:00' },
  { id: 5, title: '更新村民信息档案', time: '15:30' },
  { id: 6, title: '准备村民代表大会材料', time: '16:00' },
]);

const completedTasks = ref([
  { id: 7, title: '发布春耕生产通知', time: '11:20' },
  { id: 8, title: '处理村民医保报销申请', time: '10:15' },
  { id: 9, title: '检查农田灌溉系统', time: '09:30' },
]);

// 方法
const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      userStore.clearUserData();
      localStorage.clear();
      router.push('/login');
      ElMessage.success('已安全退出');
    })
    .catch(() => {});
};

const navigateToFunction = functionType => {
  const routes = {
    committee: '/village/committee',
    residents: '/residents',
    governance: '/village/governance',
    information: '/village/announcements',
    services: '/village/services',
    statistics: '/village/statistics',
    emergency: '/village/emergency',
  };

  const route = routes[functionType] || '/village/home';
  router.push(route);
  ElMessage.success(`正在跳转到${getFunctionName(functionType)}...`);
};

const getFunctionName = functionType => {
  const names = {
    committee: '村委管理',
    residents: '村民管理',
    governance: '村务治理',
    information: '信息公示',
    services: '便民服务',
    emergency: '应急管理',
  };
  return names[functionType] || '未知功能';
};

const refreshTasks = () => {
  // 模拟刷新任务
  ElMessage.success('任务列表已刷新');
  lastUpdateTime.value = new Date().toLocaleString();
};

const handleTask = task => {
  ElMessageBox.confirm(`确定要处理"${task.title}"吗？`, '确认处理', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'info',
  })
    .then(() => {
      // 从对应任务列表中移除
      if (urgentTasks.value.find(t => t.id === task.id)) {
        urgentTasks.value = urgentTasks.value.filter(t => t.id !== task.id);
        completedTasks.value.unshift({
          ...task,
          time: new Date().toLocaleTimeString().slice(0, 5),
        });
      } else if (normalTasks.value.find(t => t.id === task.id)) {
        normalTasks.value = normalTasks.value.filter(t => t.id !== task.id);
        completedTasks.value.unshift({
          ...task,
          time: new Date().toLocaleTimeString().slice(0, 5),
        });
      }
      ElMessage.success('任务已标记为处理完成');
    })
    .catch(() => {});
};

const updateStatistics = timeRange => {
  // 模拟根据时间范围更新统计数据
  ElMessage.success(
    `已切换到${timeRange === 'today' ? '今日' : timeRange === 'week' ? '本周' : timeRange === 'month' ? '本月' : '本年'}数据`
  );
};

const quickAction = actionType => {
  const actions = {
    announcement: () => router.push('/village/announcements/create'),
    resident: () => router.push('/residents/add'),
    meeting: () => ElMessage.info('会议安排功能开发中...'),
    report: () => ElMessage.info('报告生成功能开发中...'),
    emergency: () => {
      ElMessageBox.alert('正在启动应急呼叫系统...', '应急呼叫', {
        confirmButtonText: '确定',
        type: 'warning',
      });
    },
    search: () => router.push('/village/search'),
  };

  if (actions[actionType]) {
    actions[actionType]();
  } else {
    ElMessage.info('功能开发中...');
  }
};

// 生命周期
onMounted(() => {
  // 从localStorage获取用户信息
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      currentUser.value = JSON.parse(userStr);
    } catch (e) {
      console.error('解析用户信息失败:', e);
    }
  }

  // 初始化数据
  console.log('智慧乡村主页加载完成');
});
</script>

<style scoped>
.smart-village-home {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', sans-serif;
}

/* 顶部导航 */
.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.village-info h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.village-name {
  font-size: 0.875rem;
  opacity: 0.9;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.user-name {
  font-weight: 600;
  font-size: 1rem;
}

.user-role {
  font-size: 0.875rem;
  opacity: 0.9;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.125rem 0.5rem;
  border-radius: 0.5rem;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 主要内容 */
.main-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* 欢迎横幅 */
.welcome-banner {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.banner-content h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  color: #2c3e50;
  font-weight: 700;
}

.banner-content p {
  margin: 0 0 1.5rem 0;
  color: #7f8c8d;
  font-size: 1.125rem;
}

.quick-stats {
  display: flex;
  gap: 2rem;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #667eea;
  display: block;
}

.stat-label {
  font-size: 0.875rem;
  color: #95a5a6;
  margin-top: 0.25rem;
}

.weather-widget {
  text-align: center;
}

.weather-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.temperature {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
}

.weather-desc {
  color: #7f8c8d;
}

/* 通用样式 */
.section-title {
  font-size: 1.5rem;
  color: #2c3e50;
  margin: 0 0 1.5rem 0;
  font-weight: 600;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

/* 核心功能区 */
.functions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.function-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 4px solid transparent;
}

.function-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.function-card.committee-management {
  border-left-color: #3498db;
}

.function-card.resident-management {
  border-left-color: #2ecc71;
}

.function-card.governance {
  border-left-color: #f39c12;
}

.function-card.information {
  border-left-color: #e74c3c;
}

.function-card.services {
  border-left-color: #9b59b6;
}

.function-card.emergency {
  border-left-color: #1abc9c;
}

.function-card.statistics {
  border-left-color: #6c5ce7;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.card-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.25rem;
  font-weight: 600;
}

.card-content ul {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem 0;
}

.card-content li {
  padding: 0.25rem 0;
  color: #7f8c8d;
  position: relative;
  padding-left: 1rem;
}

.card-content li:before {
  content: '•';
  color: #667eea;
  position: absolute;
  left: 0;
  font-weight: bold;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: #95a5a6;
}

.arrow-icon {
  transition: transform 0.3s ease;
}

.function-card:hover .arrow-icon {
  transform: translateX(5px);
}

/* 今日要务 */
.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.task-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.task-card.urgent {
  border-left: 4px solid #e74c3c;
}

.task-card.normal {
  border-left: 4px solid #3498db;
}

.task-card.completed {
  border-left: 4px solid #2ecc71;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.task-header h3 {
  margin: 0;
  color: #2c3e50;
  font-weight: 600;
  flex: 1;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
}

.task-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.task-title {
  font-weight: 500;
  color: #2c3e50;
}

.task-time {
  font-size: 0.875rem;
  color: #95a5a6;
}

/* 数据概览 */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.chart-card h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-weight: 600;
}

.chart-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #bdc3c7;
  text-align: center;
}

.chart-placeholder p {
  margin: 0.5rem 0 0 0;
}

/* 快捷操作 */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  border: none;
  border-radius: 1rem;
  background: white;
  color: #2c3e50;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.action-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.action-btn.primary {
  background: #3498db;
  color: white;
}

.action-btn.success {
  background: #2ecc71;
  color: white;
}

.action-btn.warning {
  background: #f39c12;
  color: white;
}

.action-btn.info {
  background: #1abc9c;
  color: white;
}

.action-btn.danger {
  background: #e74c3c;
  color: white;
}

.action-btn .el-icon {
  font-size: 2rem;
}

/* 底部信息栏 */
.app-footer {
  background: white;
  border-top: 1px solid #ecf0f1;
  padding: 1rem 2rem;
  margin-top: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #7f8c8d;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.last-update {
  font-size: 0.875rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-header {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
  }

  .header-left,
  .header-right {
    width: 100%;
    justify-content: center;
  }

  .welcome-banner {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }

  .quick-stats {
    flex-wrap: wrap;
    justify-content: center;
  }

  .main-content {
    padding: 1rem;
  }

  .functions-grid,
  .tasks-grid,
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .app-footer {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .actions-grid {
    grid-template-columns: 1fr;
  }

  .quick-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
