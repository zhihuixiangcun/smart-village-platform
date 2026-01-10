<template>
  <div class="real-time-data-screen">
    <!-- 大屏标题栏 -->
    <div class="screen-header">
      <div class="title-section">
        <h1 class="main-title">智慧村庄实时监控中心</h1>
        <div class="subtitle">
          {{ currentTime }} | 系统状态：<span :class="systemStatus.class">{{
            systemStatus.text
          }}</span>
        </div>
      </div>
      <div class="control-section">
        <el-switch
          v-model="autoRefresh"
          active-text="自动刷新"
          inactive-text="手动刷新"
          @change="toggleAutoRefresh"
        />
        <el-button @click="enterFullscreen" type="primary" size="small">
          <i class="el-icon-full-screen"></i>
          全屏显示
        </el-button>
      </div>
    </div>

    <!-- 核心指标区域 -->
    <div class="metrics-grid">
      <!-- 人口统计 -->
      <div class="metric-card population-card">
        <div class="card-header">
          <h3>人口概况</h3>
          <div class="icon-container">
            <i class="el-icon-user"></i>
          </div>
        </div>
        <div class="metric-content">
          <div class="main-metric">
            <span class="value">{{ formatNumber(realTimeData.population?.total || 0) }}</span>
            <span class="label">总人口</span>
          </div>
          <div class="sub-metrics">
            <div class="sub-metric">
              <span class="value">{{ realTimeData.population?.todayBirth || 0 }}</span>
              <span class="label">今日出生</span>
              <i class="el-icon-top text-success"></i>
            </div>
            <div class="sub-metric">
              <span class="value">{{ realTimeData.population?.todayMoveIn || 0 }}</span>
              <span class="label">今日迁入</span>
              <i class="el-icon-top text-success"></i>
            </div>
            <div class="sub-metric">
              <span class="value">{{ realTimeData.population?.onlineUsers || 0 }}</span>
              <span class="label">在线用户</span>
              <div class="online-indicator"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 财务监控 -->
      <div class="metric-card finance-card">
        <div class="card-header">
          <h3>财务监控</h3>
          <div class="icon-container">
            <i class="el-icon-money"></i>
          </div>
        </div>
        <div class="metric-content">
          <div class="main-metric">
            <span class="value">¥{{ formatMoney(realTimeData.finance?.todayIncome || 0) }}</span>
            <span class="label">今日收入</span>
          </div>
          <div class="sub-metrics">
            <div class="sub-metric">
              <span class="value">¥{{ formatMoney(realTimeData.finance?.todayExpense || 0) }}</span>
              <span class="label">今日支出</span>
              <i
                :class="
                  realTimeData.finance?.todayExpense > 10000
                    ? 'el-icon-top text-danger'
                    : 'el-icon-bottom text-success'
                "
              ></i>
            </div>
            <div class="sub-metric">
              <span class="value">{{ realTimeData.finance?.todayTransactions || 0 }}</span>
              <span class="label">今日交易</span>
            </div>
            <div class="sub-metric">
              <span class="value">{{ realTimeData.finance?.pendingApprovals || 0 }}</span>
              <span class="label">待审批</span>
              <div class="pending-indicator"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 村务处理 -->
      <div class="metric-card governance-card">
        <div class="card-header">
          <h3>村务处理</h3>
          <div class="icon-container">
            <i class="el-icon-document-checked"></i>
          </div>
        </div>
        <div class="metric-content">
          <div class="main-metric">
            <span class="value">{{ realTimeData.governance?.todayTasks || 0 }}</span>
            <span class="label">今日任务</span>
          </div>
          <div class="sub-metrics">
            <div class="sub-metric">
              <span class="value">{{ realTimeData.governance?.completedTasks || 0 }}</span>
              <span class="label">已完成</span>
              <i class="el-icon-check text-success"></i>
            </div>
            <div class="sub-metric">
              <span class="value">{{ realTimeData.governance?.pendingTasks || 0 }}</span>
              <span class="label">处理中</span>
              <div class="processing-indicator"></div>
            </div>
            <div class="sub-metric">
              <span class="value">{{ realTimeData.governance?.todayAnnouncements || 0 }}</span>
              <span class="label">今日公告</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 应急状态 -->
      <div class="metric-card emergency-card">
        <div class="card-header">
          <h3>应急状态</h3>
          <div class="icon-container">
            <i class="el-icon-warning"></i>
          </div>
        </div>
        <div class="metric-content">
          <div class="main-metric">
            <span class="value">{{ realTimeData.emergency?.activeEvents || 0 }}</span>
            <span class="label">活跃事件</span>
          </div>
          <div class="sub-metrics">
            <div class="sub-metric">
              <span class="value">{{ realTimeData.emergency?.avgResponseTime || 0 }}分</span>
              <span class="label">平均响应</span>
              <i :class="getResponseTimeClass(realTimeData.emergency?.avgResponseTime)"></i>
            </div>
            <div class="sub-metric">
              <span class="value">{{ realTimeData.emergency?.todayResolved || 0 }}</span>
              <span class="label">今日解决</span>
              <i class="el-icon-check text-success"></i>
            </div>
            <div class="sub-metric">
              <span class="value">{{ realTimeData.emergency?.resourceUtilization || 0 }}%</span>
              <span class="label">资源利用率</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <!-- 实时活动趋势 -->
      <div class="chart-container activity-chart">
        <div class="chart-header">
          <h3>实时活动趋势</h3>
          <div class="legend">
            <span class="legend-item online">在线用户</span>
            <span class="legend-item active">活跃用户</span>
            <span class="legend-item requests">系统请求</span>
          </div>
        </div>
        <div ref="activityChart" class="chart-area"></div>
      </div>

      <!-- 服务使用情况 -->
      <div class="chart-container service-chart">
        <div class="chart-header">
          <h3>服务使用分布</h3>
          <el-select v-model="serviceTimeRange" size="small" @change="updateServiceChart">
            <el-option label="今日" value="today" />
            <el-option label="本周" value="week" />
            <el-option label="本月" value="month" />
          </el-select>
        </div>
        <div ref="serviceChart" class="chart-area"></div>
      </div>

      <!-- 地理分布热力图 -->
      <div class="chart-container map-chart">
        <div class="chart-header">
          <h3>村务事件分布</h3>
          <div class="map-controls">
            <el-button-group size="small">
              <el-button
                @click="mapViewType = 'events'"
                :type="mapViewType === 'events' ? 'primary' : ''"
                >事件</el-button
              >
              <el-button
                @click="mapViewType = 'population'"
                :type="mapViewType === 'population' ? 'primary' : ''"
                >人口</el-button
              >
              <el-button
                @click="mapViewType = 'resources'"
                :type="mapViewType === 'resources' ? 'primary' : ''"
                >资源</el-button
              >
            </el-button-group>
          </div>
        </div>
        <div ref="mapChart" class="chart-area"></div>
      </div>

      <!-- 系统性能监控 -->
      <div class="chart-container performance-chart">
        <div class="chart-header">
          <h3>系统性能</h3>
          <div class="performance-stats">
            <span class="stat-item">CPU: {{ performanceStats.cpu }}%</span>
            <span class="stat-item">内存: {{ performanceStats.memory }}%</span>
            <span class="stat-item">响应: {{ performanceStats.responseTime }}ms</span>
          </div>
        </div>
        <div ref="performanceChart" class="chart-area"></div>
      </div>
    </div>

    <!-- 实时事件流 -->
    <div class="events-section">
      <div class="section-header">
        <h3>实时事件流</h3>
        <div class="event-filters">
          <el-radio-group v-model="eventFilter" size="small">
            <el-radio-button label="all">全部</el-radio-button>
            <el-radio-button label="emergency">应急</el-radio-button>
            <el-radio-button label="finance">财务</el-radio-button>
            <el-radio-button label="governance">村务</el-radio-button>
          </el-radio-group>
        </div>
      </div>
      <div class="events-container">
        <div v-for="event in filteredEvents" :key="event.id" class="event-item" :class="event.type">
          <div class="event-icon">
            <i :class="getEventIcon(event.type)"></i>
          </div>
          <div class="event-content">
            <div class="event-title">{{ event.title }}</div>
            <div class="event-description">{{ event.description }}</div>
            <div class="event-meta">
              <span class="event-time">{{ formatEventTime(event.timestamp) }}</span>
              <span class="event-source">{{ event.source }}</span>
              <el-tag :type="getEventTagType(event.priority)" size="small">
                {{ event.priority }}
              </el-tag>
            </div>
          </div>
          <div class="event-status">
            <div :class="['status-indicator', event.status]"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="status-bar">
      <div class="status-left">
        <span class="status-item"> 数据更新: {{ lastUpdateTime }} </span>
        <span class="status-item"> 在线设备: {{ realTimeData.system?.onlineDevices || 0 }} </span>
        <span class="status-item"> 今日访问: {{ realTimeData.system?.todayVisits || 0 }} </span>
      </div>
      <div class="status-right">
        <span class="status-item" :class="connectionStatus.class">
          {{ connectionStatus.text }}
        </span>
        <span class="status-item"> 数据延迟: {{ dataLatency }}ms </span>
      </div>
    </div>

    <!-- 全屏遮罩层 -->
    <div v-if="showFullscreenTip" class="fullscreen-tip">按 ESC 退出全屏模式</div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue';
import * as echarts from 'echarts';

export default {
  name: 'RealTimeDataScreen',
  setup() {
    // 响应式数据
    const autoRefresh = ref(true);
    const currentTime = ref('');
    const serviceTimeRange = ref('today');
    const mapViewType = ref('events');
    const eventFilter = ref('all');
    const showFullscreenTip = ref(false);
    const dataLatency = ref(0);

    // 系统状态
    const systemStatus = reactive({
      text: '正常运行',
      class: 'text-success',
    });

    const connectionStatus = reactive({
      text: '连接正常',
      class: 'text-success',
    });

    // 性能统计
    const performanceStats = reactive({
      cpu: 0,
      memory: 0,
      responseTime: 0,
    });

    // 实时数据
    const realTimeData = reactive({
      population: {
        total: 0,
        todayBirth: 0,
        todayMoveIn: 0,
        onlineUsers: 0,
      },
      finance: {
        todayIncome: 0,
        todayExpense: 0,
        todayTransactions: 0,
        pendingApprovals: 0,
      },
      governance: {
        todayTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        todayAnnouncements: 0,
      },
      emergency: {
        activeEvents: 0,
        avgResponseTime: 0,
        todayResolved: 0,
        resourceUtilization: 0,
      },
      system: {
        onlineDevices: 0,
        todayVisits: 0,
      },
    });

    // 实时事件流
    const events = ref([
      {
        id: 1,
        type: 'emergency',
        title: '应急事件报告',
        description: '村东道路出现障碍，正在处理中',
        timestamp: new Date(),
        source: '监控中心',
        priority: '高',
        status: 'processing',
      },
      {
        id: 2,
        type: 'finance',
        title: '财务审批完成',
        description: '村集体项目预算审批通过',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        source: '财务部',
        priority: '中',
        status: 'completed',
      },
      {
        id: 3,
        type: 'governance',
        title: '村务通知发布',
        description: '关于秋收防火安全的重要通知',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        source: '村委会',
        priority: '低',
        status: 'completed',
      },
    ]);

    // 图表实例
    let activityChartInstance = null;
    let serviceChartInstance = null;
    let mapChartInstance = null;
    let performanceChartInstance = null;

    // 图表DOM引用
    const activityChart = ref(null);
    const serviceChart = ref(null);
    const mapChart = ref(null);
    const performanceChart = ref(null);

    // 定时器
    let timeUpdateTimer = null;
    let dataUpdateTimer = null;
    let performanceUpdateTimer = null;

    // WebSocket连接
    let websocket = null;

    // 计算属性
    const filteredEvents = computed(() => {
      if (eventFilter.value === 'all') return events.value;
      return events.value.filter(event => event.type === eventFilter.value);
    });

    const lastUpdateTime = computed(() => {
      return new Date().toLocaleString('zh-CN');
    });

    // 方法
    const updateCurrentTime = () => {
      const now = new Date();
      currentTime.value = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'long',
      });
    };

    const fetchRealTimeData = async () => {
      try {
        const startTime = Date.now();

        const response = await fetch('/api/v1/analytics/realtime?category=all');
        const result = await response.json();

        dataLatency.value = Date.now() - startTime;

        if (result.success) {
          // 更新实时数据
          if (result.data.population) {
            Object.assign(realTimeData.population, result.data.population.data?.overview || {});
          }
          if (result.data.finance) {
            Object.assign(realTimeData.finance, result.data.finance.data?.overview || {});
          }
          if (result.data.governance) {
            Object.assign(realTimeData.governance, result.data.governance.data?.engagement || {});
          }
          if (result.data.emergency) {
            Object.assign(
              realTimeData.emergency,
              result.data.emergency.data?.responseMetrics || {}
            );
          }

          // 更新图表
          updateActivityChart();
          updateServiceChart();
          updatePerformanceChart();
        }

        // 更新连接状态
        connectionStatus.text = '连接正常';
        connectionStatus.class = 'text-success';
      } catch (error) {
        console.error('获取实时数据失败:', error);
        connectionStatus.text = '连接异常';
        connectionStatus.class = 'text-danger';

        // 生成模拟数据
        generateMockData();
      }
    };

    const generateMockData = () => {
      // 模拟人口数据
      realTimeData.population.total = Math.floor(Math.random() * 500) + 1200;
      realTimeData.population.todayBirth = Math.floor(Math.random() * 3);
      realTimeData.population.todayMoveIn = Math.floor(Math.random() * 5);
      realTimeData.population.onlineUsers = Math.floor(Math.random() * 200) + 150;

      // 模拟财务数据
      realTimeData.finance.todayIncome = Math.floor(Math.random() * 50000) + 20000;
      realTimeData.finance.todayExpense = Math.floor(Math.random() * 30000) + 10000;
      realTimeData.finance.todayTransactions = Math.floor(Math.random() * 50) + 20;
      realTimeData.finance.pendingApprovals = Math.floor(Math.random() * 10);

      // 模拟村务数据
      realTimeData.governance.todayTasks = Math.floor(Math.random() * 20) + 10;
      realTimeData.governance.completedTasks = Math.floor(Math.random() * 15) + 5;
      realTimeData.governance.pendingTasks = Math.floor(Math.random() * 10) + 2;
      realTimeData.governance.todayAnnouncements = Math.floor(Math.random() * 5) + 1;

      // 模拟应急数据
      realTimeData.emergency.activeEvents = Math.floor(Math.random() * 3);
      realTimeData.emergency.avgResponseTime = Math.floor(Math.random() * 10) + 3;
      realTimeData.emergency.todayResolved = Math.floor(Math.random() * 8) + 2;
      realTimeData.emergency.resourceUtilization = Math.floor(Math.random() * 40) + 60;

      // 模拟系统数据
      realTimeData.system.onlineDevices = Math.floor(Math.random() * 50) + 100;
      realTimeData.system.todayVisits = Math.floor(Math.random() * 1000) + 800;
    };

    const updatePerformanceStats = () => {
      performanceStats.cpu = Math.floor(Math.random() * 30) + 20;
      performanceStats.memory = Math.floor(Math.random() * 40) + 30;
      performanceStats.responseTime = Math.floor(Math.random() * 100) + 50;
    };

    const initActivityChart = () => {
      if (!activityChart.value) return;

      activityChartInstance = echarts.init(activityChart.value);

      const option = {
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '10%',
          containLabel: true,
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
          },
        },
        legend: {
          data: ['在线用户', '活跃用户', '系统请求'],
          textStyle: { color: '#fff' },
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
          axisLabel: { color: '#fff' },
          axisLine: { lineStyle: { color: '#fff' } },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: '#fff' },
          axisLine: { lineStyle: { color: '#fff' } },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        },
        series: [
          {
            name: '在线用户',
            type: 'line',
            data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 100) + 150),
            smooth: true,
            lineStyle: { color: '#00d4ff' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(0, 212, 255, 0.3)' },
                { offset: 1, color: 'rgba(0, 212, 255, 0.1)' },
              ]),
            },
          },
          {
            name: '活跃用户',
            type: 'line',
            data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 50) + 50),
            smooth: true,
            lineStyle: { color: '#00ff88' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(0, 255, 136, 0.3)' },
                { offset: 1, color: 'rgba(0, 255, 136, 0.1)' },
              ]),
            },
          },
          {
            name: '系统请求',
            type: 'line',
            data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 200) + 100),
            smooth: true,
            lineStyle: { color: '#ff6b6b' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
                { offset: 1, color: 'rgba(255, 107, 107, 0.1)' },
              ]),
            },
          },
        ],
      };

      activityChartInstance.setOption(option);
    };

    const updateActivityChart = () => {
      if (!activityChartInstance) return;

      // 更新最新数据点
      const option = activityChartInstance.getOption();
      const now = new Date();
      const currentHour = now.getHours();

      // 更新数据
      option.series[0].data[currentHour] = realTimeData.population.onlineUsers;
      option.series[1].data[currentHour] = Math.floor(realTimeData.population.onlineUsers * 0.6);
      option.series[2].data[currentHour] = realTimeData.system.todayVisits / 24;

      activityChartInstance.setOption(option);
    };

    const initServiceChart = () => {
      if (!serviceChart.value) return;

      serviceChartInstance = echarts.init(serviceChart.value);

      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)',
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          textStyle: { color: '#fff' },
        },
        series: [
          {
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            label: {
              show: false,
              position: 'center',
            },
            emphasis: {
              label: {
                show: true,
                fontSize: '18',
                fontWeight: 'bold',
                color: '#fff',
              },
            },
            labelLine: {
              show: false,
            },
            data: [
              { value: 35, name: '证件办理', itemStyle: { color: '#00d4ff' } },
              { value: 25, name: '费用缴纳', itemStyle: { color: '#00ff88' } },
              { value: 20, name: '信息查询', itemStyle: { color: '#ff6b6b' } },
              { value: 15, name: '投诉建议', itemStyle: { color: '#ffd93d' } },
              { value: 5, name: '其他服务', itemStyle: { color: '#a8a8a8' } },
            ],
          },
        ],
      };

      serviceChartInstance.setOption(option);
    };

    const updateServiceChart = () => {
      if (!serviceChartInstance) return;

      // 根据时间范围更新数据
      const multiplier =
        serviceTimeRange.value === 'today' ? 1 : serviceTimeRange.value === 'week' ? 7 : 30;

      const option = serviceChartInstance.getOption();
      option.series[0].data = [
        { value: 35 * multiplier, name: '证件办理', itemStyle: { color: '#00d4ff' } },
        { value: 25 * multiplier, name: '费用缴纳', itemStyle: { color: '#00ff88' } },
        { value: 20 * multiplier, name: '信息查询', itemStyle: { color: '#ff6b6b' } },
        { value: 15 * multiplier, name: '投诉建议', itemStyle: { color: '#ffd93d' } },
        { value: 5 * multiplier, name: '其他服务', itemStyle: { color: '#a8a8a8' } },
      ];

      serviceChartInstance.setOption(option);
    };

    const initMapChart = () => {
      if (!mapChart.value) return;

      mapChartInstance = echarts.init(mapChart.value);

      // 模拟村庄地图数据
      const option = {
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} 个事件',
        },
        visualMap: {
          min: 0,
          max: 10,
          calculable: true,
          inRange: {
            color: ['#50a3ba', '#eac736', '#d94e5d'],
          },
          textStyle: { color: '#fff' },
        },
        series: [
          {
            type: 'map',
            map: 'china',
            roam: true,
            emphasis: {
              label: {
                show: true,
                color: '#fff',
              },
            },
            data: [
              { name: '北区', value: 8 },
              { name: '南区', value: 3 },
              { name: '东区', value: 6 },
              { name: '西区', value: 2 },
              { name: '中心区', value: 5 },
            ],
          },
        ],
      };

      // 由于没有真实地图，使用散点图模拟
      mapChartInstance.setOption({
        xAxis: {
          type: 'value',
          min: 0,
          max: 100,
          axisLabel: { show: false },
          axisLine: { show: false },
          splitLine: { show: false },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 100,
          axisLabel: { show: false },
          axisLine: { show: false },
          splitLine: { show: false },
        },
        series: [
          {
            type: 'scatter',
            symbolSize: function (data) {
              return Math.sqrt(data[2]) * 10;
            },
            data: [
              [20, 80, 8],
              [50, 60, 3],
              [70, 40, 6],
              [30, 20, 2],
              [80, 70, 5],
            ],
            itemStyle: {
              color: function (params) {
                const colors = ['#00d4ff', '#00ff88', '#ff6b6b', '#ffd93d', '#a8a8a8'];
                return colors[params.dataIndex];
              },
            },
          },
        ],
      });
    };

    const updateMapChart = () => {
      if (!mapChartInstance) return;

      const option = mapChartInstance.getOption();

      // 根据视图类型更新数据
      let data = [];
      switch (mapViewType.value) {
        case 'events':
          data = [
            [20, 80, 8],
            [50, 60, 3],
            [70, 40, 6],
            [30, 20, 2],
            [80, 70, 5],
          ];
          break;
        case 'population':
          data = [
            [20, 80, 15],
            [50, 60, 8],
            [70, 40, 12],
            [30, 20, 5],
            [80, 70, 10],
          ];
          break;
        case 'resources':
          data = [
            [20, 80, 5],
            [50, 60, 12],
            [70, 40, 3],
            [30, 20, 8],
            [80, 70, 6],
          ];
          break;
      }

      option.series[0].data = data;
      mapChartInstance.setOption(option);
    };

    const initPerformanceChart = () => {
      if (!performanceChart.value) return;

      performanceChartInstance = echarts.init(performanceChart.value);

      const option = {
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '10%',
          containLabel: true,
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
          },
        },
        legend: {
          data: ['CPU使用率', '内存使用率', '响应时间'],
          textStyle: { color: '#fff' },
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: Array.from({ length: 60 }, (_, i) => `-${60 - i}秒`),
          axisLabel: { color: '#fff' },
          axisLine: { lineStyle: { color: '#fff' } },
        },
        yAxis: [
          {
            type: 'value',
            name: '使用率(%)',
            min: 0,
            max: 100,
            axisLabel: { color: '#fff' },
            axisLine: { lineStyle: { color: '#fff' } },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          },
          {
            type: 'value',
            name: '响应时间(ms)',
            min: 0,
            max: 500,
            axisLabel: { color: '#fff' },
            axisLine: { lineStyle: { color: '#fff' } },
          },
        ],
        series: [
          {
            name: 'CPU使用率',
            type: 'line',
            data: Array.from({ length: 60 }, () => Math.random() * 30 + 20),
            smooth: true,
            lineStyle: { color: '#ff6b6b' },
          },
          {
            name: '内存使用率',
            type: 'line',
            data: Array.from({ length: 60 }, () => Math.random() * 40 + 30),
            smooth: true,
            lineStyle: { color: '#00d4ff' },
          },
          {
            name: '响应时间',
            type: 'line',
            yAxisIndex: 1,
            data: Array.from({ length: 60 }, () => Math.random() * 100 + 50),
            smooth: true,
            lineStyle: { color: '#00ff88' },
          },
        ],
      };

      performanceChartInstance.setOption(option);
    };

    const updatePerformanceChart = () => {
      if (!performanceChartInstance) return;

      const option = performanceChartInstance.getOption();

      // 添加最新数据点
      option.series[0].data.shift();
      option.series[0].data.push(performanceStats.cpu);

      option.series[1].data.shift();
      option.series[1].data.push(performanceStats.memory);

      option.series[2].data.shift();
      option.series[2].data.push(performanceStats.responseTime);

      performanceChartInstance.setOption(option);
    };

    const toggleAutoRefresh = enabled => {
      if (enabled) {
        startDataUpdate();
      } else {
        stopDataUpdate();
      }
    };

    const startDataUpdate = () => {
      dataUpdateTimer = setInterval(fetchRealTimeData, 5000);
    };

    const stopDataUpdate = () => {
      if (dataUpdateTimer) {
        clearInterval(dataUpdateTimer);
        dataUpdateTimer = null;
      }
    };

    const enterFullscreen = () => {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }

      showFullscreenTip.value = true;
      setTimeout(() => {
        showFullscreenTip.value = false;
      }, 3000);

      // 监听全屏变化
      document.addEventListener('fullscreenchange', handleFullscreenChange);
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        showFullscreenTip.value = false;
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
      }
    };

    const initWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/realtime`;

        websocket = new WebSocket(wsUrl);

        websocket.onopen = () => {
          console.log('WebSocket连接已建立');
        };

        websocket.onmessage = event => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          } catch (error) {
            console.error('解析WebSocket消息失败:', error);
          }
        };

        websocket.onclose = () => {
          console.log('WebSocket连接已断开');
          setTimeout(() => {
            initWebSocket();
          }, 5000);
        };

        websocket.onerror = error => {
          console.error('WebSocket错误:', error);
        };
      } catch (error) {
        console.error('初始化WebSocket失败:', error);
      }
    };

    const handleWebSocketMessage = data => {
      // 处理实时消息
      if (data.type === 'event') {
        events.value.unshift({
          id: Date.now(),
          ...data.payload,
          timestamp: new Date(),
        });

        // 保持事件列表长度
        if (events.value.length > 50) {
          events.value = events.value.slice(0, 50);
        }
      } else if (data.type === 'metrics') {
        // 更新实时指标
        Object.assign(realTimeData, data.payload);
      }
    };

    const formatNumber = num => {
      if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
      }
      return num.toLocaleString();
    };

    const formatMoney = amount => {
      if (!amount) return '0';
      return (amount / 10000).toFixed(1) + '万';
    };

    const formatEventTime = timestamp => {
      const now = new Date();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);

      if (minutes < 1) return '刚刚';
      if (minutes < 60) return `${minutes}分钟前`;

      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}小时前`;

      const days = Math.floor(hours / 24);
      return `${days}天前`;
    };

    const getEventIcon = type => {
      const icons = {
        emergency: 'el-icon-warning-outline',
        finance: 'el-icon-money',
        governance: 'el-icon-document',
        system: 'el-icon-setting',
      };
      return icons[type] || 'el-icon-info';
    };

    const getEventTagType = priority => {
      const types = {
        高: 'danger',
        中: 'warning',
        低: 'info',
      };
      return types[priority] || 'info';
    };

    const getResponseTimeClass = time => {
      if (time <= 5) return 'el-icon-bottom text-success';
      if (time <= 10) return 'el-icon-minus text-warning';
      return 'el-icon-top text-danger';
    };

    const handleResize = () => {
      activityChartInstance?.resize();
      serviceChartInstance?.resize();
      mapChartInstance?.resize();
      performanceChartInstance?.resize();
    };

    // 生命周期
    onMounted(async () => {
      // 初始化时间显示
      updateCurrentTime();
      timeUpdateTimer = setInterval(updateCurrentTime, 1000);

      // 初始化数据
      await fetchRealTimeData();
      generateMockData();
      updatePerformanceStats();

      // 初始化图表
      await nextTick();
      initActivityChart();
      initServiceChart();
      initMapChart();
      initPerformanceChart();

      // 启动自动更新
      if (autoRefresh.value) {
        startDataUpdate();
      }

      // 性能监控更新
      performanceUpdateTimer = setInterval(updatePerformanceStats, 3000);

      // 初始化WebSocket
      initWebSocket();

      // 监听窗口大小变化
      window.addEventListener('resize', handleResize);
    });

    onUnmounted(() => {
      // 清理定时器
      if (timeUpdateTimer) clearInterval(timeUpdateTimer);
      if (dataUpdateTimer) clearInterval(dataUpdateTimer);
      if (performanceUpdateTimer) clearInterval(performanceUpdateTimer);

      // 关闭WebSocket
      if (websocket) {
        websocket.close();
      }

      // 销毁图表实例
      activityChartInstance?.dispose();
      serviceChartInstance?.dispose();
      mapChartInstance?.dispose();
      performanceChartInstance?.dispose();

      // 移除事件监听
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    });

    return {
      // 响应式数据
      autoRefresh,
      currentTime,
      serviceTimeRange,
      mapViewType,
      eventFilter,
      showFullscreenTip,
      dataLatency,
      systemStatus,
      connectionStatus,
      performanceStats,
      realTimeData,
      events,
      filteredEvents,
      lastUpdateTime,

      // DOM引用
      activityChart,
      serviceChart,
      mapChart,
      performanceChart,

      // 方法
      toggleAutoRefresh,
      enterFullscreen,
      updateServiceChart,
      formatNumber,
      formatMoney,
      formatEventTime,
      getEventIcon,
      getEventTagType,
      getResponseTimeClass,
    };
  },
};
</script>

<style scoped>
.real-time-data-screen {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  color: #ffffff;
  font-family: 'Microsoft YaHei', sans-serif;
  padding: 20px;
  overflow-x: hidden;
}

/* 标题栏 */
.screen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 0 20px;
}

.title-section .main-title {
  font-size: 32px;
  font-weight: bold;
  margin: 0;
  background: linear-gradient(90deg, #00d4ff, #00ff88);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 30px rgba(0, 212, 255, 0.5);
}

.subtitle {
  font-size: 14px;
  color: #a8a8a8;
  margin-top: 5px;
}

.control-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

/* 指标卡片网格 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 212, 255, 0.3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.icon-container {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.population-card .icon-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.finance-card .icon-container {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.governance-card .icon-container {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.emergency-card .icon-container {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.metric-content .main-metric {
  text-align: center;
  margin-bottom: 15px;
}

.main-metric .value {
  display: block;
  font-size: 36px;
  font-weight: bold;
  line-height: 1;
}

.main-metric .label {
  display: block;
  font-size: 14px;
  color: #a8a8a8;
  margin-top: 5px;
}

.sub-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.sub-metric {
  text-align: center;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.sub-metric .value {
  display: block;
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
}

.sub-metric .label {
  display: block;
  font-size: 12px;
  color: #a8a8a8;
  margin-top: 3px;
}

/* 图表区域 */
.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.chart-container {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.legend {
  display: flex;
  gap: 15px;
  font-size: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.legend-item::before {
  content: '';
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-item.online::before {
  background: #00d4ff;
}

.legend-item.active::before {
  background: #00ff88;
}

.legend-item.requests::before {
  background: #ff6b6b;
}

.chart-area {
  width: 100%;
  height: 250px;
}

.performance-stats {
  display: flex;
  gap: 15px;
  font-size: 12px;
}

.stat-item {
  color: #00ff88;
}

/* 事件流区域 */
.events-section {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.events-container {
  max-height: 300px;
  overflow-y: auto;
}

.event-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border-left: 3px solid transparent;
  transition: all 0.3s ease;
}

.event-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.event-item.emergency {
  border-left-color: #ff6b6b;
}

.event-item.finance {
  border-left-color: #f093fb;
}

.event-item.governance {
  border-left-color: #4facfe;
}

.event-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  margin-right: 12px;
}

.event-item.emergency .event-icon {
  background: rgba(255, 107, 107, 0.2);
  color: #ff6b6b;
}

.event-item.finance .event-icon {
  background: rgba(240, 147, 251, 0.2);
  color: #f093fb;
}

.event-item.governance .event-icon {
  background: rgba(79, 172, 254, 0.2);
  color: #4facfe;
}

.event-content {
  flex: 1;
}

.event-title {
  font-weight: 500;
  margin-bottom: 3px;
}

.event-description {
  font-size: 12px;
  color: #a8a8a8;
  margin-bottom: 5px;
}

.event-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #888;
}

.event-status {
  margin-left: 10px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.processing {
  background: #ffd93d;
  animation: pulse 2s infinite;
}

.status-indicator.completed {
  background: #00ff88;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 217, 61, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 217, 61, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 217, 61, 0);
  }
}

/* 状态栏 */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  font-size: 12px;
}

.status-left,
.status-right {
  display: flex;
  gap: 20px;
}

.status-item {
  color: #a8a8a8;
}

.status-item.text-success {
  color: #00ff88;
}

.status-item.text-danger {
  color: #ff6b6b;
}

/* 指示器 */
.online-indicator {
  width: 8px;
  height: 8px;
  background: #00ff88;
  border-radius: 50%;
  display: inline-block;
  animation: pulse 2s infinite;
  margin-left: 5px;
}

.pending-indicator {
  width: 8px;
  height: 8px;
  background: #ffd93d;
  border-radius: 50%;
  display: inline-block;
  animation: pulse 2s infinite;
  margin-left: 5px;
}

.processing-indicator {
  width: 8px;
  height: 8px;
  background: #4facfe;
  border-radius: 50%;
  display: inline-block;
  animation: pulse 2s infinite;
  margin-left: 5px;
}

/* 全屏提示 */
.fullscreen-tip {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 20px 40px;
  border-radius: 8px;
  font-size: 16px;
  z-index: 9999;
  animation: fadeInOut 3s ease-in-out;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* 工具类 */
.text-success {
  color: #00ff88;
}

.text-danger {
  color: #ff6b6b;
}

.text-warning {
  color: #ffd93d;
}

/* 滚动条样式 */
.events-container::-webkit-scrollbar {
  width: 6px;
}

.events-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.events-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.events-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .metrics-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  .charts-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .screen-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }

  .main-title {
    font-size: 24px;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .sub-metrics {
    grid-template-columns: repeat(3, 1fr);
    gap: 5px;
  }

  .status-bar {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
}
</style>
