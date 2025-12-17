<template>
  <div class="analytics-dashboard">
    <div class="page-header">
      <h2>数据分析仪表板</h2>
      <div class="header-actions">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="handleDateRangeChange"
          style="margin-right: 10px;"
        />
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
        <el-button @click="exportReport">
          <el-icon><Download /></el-icon>
          导出报告
        </el-button>
      </div>
    </div>

    <!-- 概览统计卡片 -->
    <el-row :gutter="20" class="overview-cards">
      <el-col :span="6">
        <el-card class="overview-card users">
          <div class="card-content">
            <div class="card-icon">
              <el-icon size="40"><User /></el-icon>
            </div>
            <div class="card-info">
              <div class="card-value">{{ overview.totalUsers }}</div>
              <div class="card-label">总用户数</div>
              <div class="card-trend" :class="overview.userTrend > 0 ? 'positive' : 'negative'">
                <el-icon><ArrowUp v-if="overview.userTrend > 0" /><ArrowDown v-else /></el-icon>
                {{ Math.abs(overview.userTrend) }}%
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="overview-card revenue">
          <div class="card-content">
            <div class="card-icon">
              <el-icon size="40"><Money /></el-icon>
            </div>
            <div class="card-info">
              <div class="card-value">¥{{ formatAmount(overview.totalRevenue) }}</div>
              <div class="card-label">总收入</div>
              <div class="card-trend" :class="overview.revenueTrend > 0 ? 'positive' : 'negative'">
                <el-icon><ArrowUp v-if="overview.revenueTrend > 0" /><ArrowDown v-else /></el-icon>
                {{ Math.abs(overview.revenueTrend) }}%
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="overview-card transactions">
          <div class="card-content">
            <div class="card-icon">
              <el-icon size="40"><DocumentCopy /></el-icon>
            </div>
            <div class="card-info">
              <div class="card-value">{{ overview.totalTransactions }}</div>
              <div class="card-label">交易数量</div>
              <div class="card-trend" :class="overview.transactionTrend > 0 ? 'positive' : 'negative'">
                <el-icon><ArrowUp v-if="overview.transactionTrend > 0" /><ArrowDown v-else /></el-icon>
                {{ Math.abs(overview.transactionTrend) }}%
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="overview-card emergencies">
          <div class="card-content">
            <div class="card-icon">
              <el-icon size="40"><Warning /></el-icon>
            </div>
            <div class="card-info">
              <div class="card-value">{{ overview.totalEmergencies }}</div>
              <div class="card-label">应急事件</div>
              <div class="card-trend" :class="overview.emergencyTrend < 0 ? 'positive' : 'negative'">
                <el-icon><ArrowUp v-if="overview.emergencyTrend > 0" /><ArrowDown v-else /></el-icon>
                {{ Math.abs(overview.emergencyTrend) }}%
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-section">
      <!-- 用户增长趋势 -->
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>用户增长趋势</span>
              <el-select v-model="userChartPeriod" @change="updateUserChart" size="small">
                <el-option label="最近7天" value="7d" />
                <el-option label="最近30天" value="30d" />
                <el-option label="最近90天" value="90d" />
              </el-select>
            </div>
          </template>
          <div ref="userGrowthChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 财务统计图表 -->
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>财务收支趋势</span>
              <el-select v-model="financeChartPeriod" @change="updateFinanceChart" size="small">
                <el-option label="最近7天" value="7d" />
                <el-option label="最近30天" value="30d" />
                <el-option label="最近90天" value="90d" />
              </el-select>
            </div>
          </template>
          <div ref="financeChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 事件类型分布 -->
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>事件类型分布</span>
          </template>
          <div ref="eventTypeChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 活动热力图 -->
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>活动热力图</span>
          </template>
          <div ref="activityHeatmap" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 实时数据监控 -->
    <el-row :gutter="20" class="realtime-section">
      <el-col :span="24">
        <el-card class="realtime-card">
          <template #header>
            <div class="realtime-header">
              <span>实时数据监控</span>
              <div class="realtime-indicator">
                <div class="indicator-dot" :class="{ active: realtimeConnected }"></div>
                <span>{{ realtimeConnected ? '已连接' : '连接中...' }}</span>
              </div>
            </div>
          </template>
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="realtime-metric">
                <div class="metric-label">在线用户</div>
                <div class="metric-value">{{ realtimeData.onlineUsers }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="realtime-metric">
                <div class="metric-label">今日交易</div>
                <div class="metric-value">{{ realtimeData.todayTransactions }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="realtime-metric">
                <div class="metric-label">系统负载</div>
                <div class="metric-value">{{ realtimeData.systemLoad }}%</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="realtime-metric">
                <div class="metric-label">响应时间</div>
                <div class="metric-value">{{ realtimeData.responseTime }}ms</div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细数据表格 -->
    <el-row :gutter="20" class="table-section">
      <el-col :span="24">
        <el-card class="table-card">
          <template #header>
            <div class="table-header">
              <span>详细数据</span>
              <el-radio-group v-model="tableView" @change="loadTableData">
                <el-radio-button label="users">用户统计</el-radio-button>
                <el-radio-button label="transactions">交易统计</el-radio-button>
                <el-radio-button label="emergencies">应急统计</el-radio-button>
                <el-radio-button label="activities">活动统计</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <el-table
            :data="tableData"
            v-loading="tableLoading"
            stripe
            border
            style="width: 100%"
          >
            <!-- 动态列根据tableView变化 -->
            <el-table-column
              v-for="column in tableColumns"
              :key="column.prop"
              :prop="column.prop"
              :label="column.label"
              :width="column.width"
              :formatter="column.formatter"
              show-overflow-tooltip
            />
          </el-table>
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="tablePagination.page"
              v-model:page-size="tablePagination.limit"
              :page-sizes="[10, 20, 50, 100]"
              :total="tablePagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleTableSizeChange"
              @current-change="handleTableCurrentChange"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 导出报告对话框 -->
    <el-dialog
      v-model="exportDialog.visible"
      title="导出分析报告"
      width="600px"
    >
      <el-form :model="exportForm" label-width="100px">
        <el-form-item label="报告类型">
          <el-select v-model="exportForm.type" placeholder="请选择报告类型" style="width: 100%">
            <el-option label="综合分析报告" value="comprehensive" />
            <el-option label="用户分析报告" value="users" />
            <el-option label="财务分析报告" value="finance" />
            <el-option label="应急事件报告" value="emergencies" />
            <el-option label="自定义报告" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="导出格式">
          <el-checkbox-group v-model="exportForm.formats">
            <el-checkbox label="pdf">PDF</el-checkbox>
            <el-checkbox label="excel">Excel</el-checkbox>
            <el-checkbox label="csv">CSV</el-checkbox>
            <el-checkbox label="json">JSON</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="exportForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="包含图表">
          <el-switch v-model="exportForm.includeCharts" />
        </el-form-item>
        <el-form-item label="邮件发送">
          <el-input
            v-model="exportForm.email"
            placeholder="输入邮箱地址（可选）"
            type="email"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="exportDialog.visible = false">取消</el-button>
          <el-button type="primary" @click="handleExport" :loading="exporting">
            导出报告
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Refresh, Download, User, Money, DocumentCopy, Warning,
  ArrowUp, ArrowDown
} from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import apiService from '@/services/apiService';

// 响应式数据
const loading = ref(false);
const tableLoading = ref(false);
const exporting = ref(false);
const realtimeConnected = ref(false);

// 日期范围
const dateRange = ref([]);

// 图表周期选择
const userChartPeriod = ref('30d');
const financeChartPeriod = ref('30d');

// 表格视图选择
const tableView = ref('users');

// 概览数据
const overview = reactive({
  totalUsers: 0,
  userTrend: 0,
  totalRevenue: 0,
  revenueTrend: 0,
  totalTransactions: 0,
  transactionTrend: 0,
  totalEmergencies: 0,
  emergencyTrend: 0
});

// 实时数据
const realtimeData = reactive({
  onlineUsers: 0,
  todayTransactions: 0,
  systemLoad: 0,
  responseTime: 0
});

// 表格数据
const tableData = ref([]);
const tablePagination = reactive({
  page: 1,
  limit: 20,
  total: 0
});

// 导出对话框
const exportDialog = reactive({
  visible: false
});

const exportForm = reactive({
  type: 'comprehensive',
  formats: ['pdf'],
  dateRange: [],
  includeCharts: true,
  email: ''
});

// 图表实例
let userGrowthChart = null;
let financeChart = null;
let eventTypeChart = null;
let activityHeatmap = null;

// 图表引用
const userGrowthChartRef = ref(null);
const financeChartRef = ref(null);
const eventTypeChartRef = ref(null);
const activityHeatmapRef = ref(null);

// 表格列配置
const tableColumnsConfig = {
  users: [
    { prop: 'date', label: '日期', width: '120' },
    { prop: 'newUsers', label: '新增用户', width: '100' },
    { prop: 'activeUsers', label: '活跃用户', width: '100' },
    { prop: 'retentionRate', label: '留存率', width: '100', formatter: formatPercentage },
    { prop: 'growthRate', label: '增长率', width: '100', formatter: formatPercentage }
  ],
  transactions: [
    { prop: 'date', label: '日期', width: '120' },
    { prop: 'totalAmount', label: '交易总额', width: '120', formatter: formatCurrency },
    { prop: 'transactionCount', label: '交易数量', width: '100' },
    { prop: 'avgAmount', label: '平均金额', width: '100', formatter: formatCurrency },
    { prop: 'category', label: '主要分类', width: '120' }
  ],
  emergencies: [
    { prop: 'date', label: '日期', width: '120' },
    { prop: 'emergencyCount', label: '事件数量', width: '100' },
    { prop: 'type', label: '主要类型', width: '120' },
    { prop: 'avgResolutionTime', label: '平均解决时间', width: '140' },
    { prop: 'resolvedCount', label: '已解决', width: '100' }
  ],
  activities: [
    { prop: 'date', label: '日期', width: '120' },
    { prop: 'activityCount', label: '活动数量', width: '100' },
    { prop: 'participants', label: '参与人数', width: '100' },
    { prop: 'engagementRate', label: '参与率', width: '100', formatter: formatPercentage },
    { prop: 'satisfaction', label: '满意度', width: '100', formatter: formatScore }
  ]
};

const tableColumns = ref(tableColumnsConfig.users);

// WebSocket连接
let websocket = null;

// 方法
const loadOverviewData = async () => {
  try {
    const params = {};
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }

    const response = await apiService.getVillageAnalytics(params);

    if (response.success) {
      const data = response.data;
      Object.assign(overview, data.overview || {});
    }
  } catch (error) {
    console.error('加载概览数据失败:', error);
  }
};

const initCharts = () => {
  nextTick(() => {
    initUserGrowthChart();
    initFinanceChart();
    initEventTypeChart();
    initActivityHeatmap();
  });
};

const initUserGrowthChart = () => {
  if (!userGrowthChartRef.value) return;

  userGrowthChart = echarts.init(userGrowthChartRef.value);

  const option = {
    title: {
      text: '用户增长趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['新增用户', '活跃用户'],
      bottom: 0
    },
    xAxis: {
      type: 'category',
      data: generateDateLabels(userChartPeriod.value)
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '新增用户',
        type: 'line',
        data: generateRandomData(30, 5, 20),
        smooth: true,
        itemStyle: { color: '#409eff' }
      },
      {
        name: '活跃用户',
        type: 'line',
        data: generateRandomData(30, 50, 150),
        smooth: true,
        itemStyle: { color: '#67c23a' }
      }
    ]
  };

  userGrowthChart.setOption(option);
};

const initFinanceChart = () => {
  if (!financeChartRef.value) return;

  financeChart = echarts.init(financeChartRef.value);

  const option = {
    title: {
      text: '财务收支趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['收入', '支出'],
      bottom: 0
    },
    xAxis: {
      type: 'category',
      data: generateDateLabels(financeChartPeriod.value)
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: generateRandomData(30, 1000, 5000),
        itemStyle: { color: '#67c23a' }
      },
      {
        name: '支出',
        type: 'bar',
        data: generateRandomData(30, 800, 4000),
        itemStyle: { color: '#f56c6c' }
      }
    ]
  };

  financeChart.setOption(option);
};

const initEventTypeChart = () => {
  if (!eventTypeChartRef.value) return;

  eventTypeChart = echarts.init(eventTypeChartRef.value);

  const option = {
    title: {
      text: '事件类型分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      bottom: 0,
      data: ['医疗急救', '火灾报警', '安全事件', '自然灾害', '设施故障', '其他']
    },
    series: [
      {
        name: '事件类型',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: 335, name: '医疗急救', itemStyle: { color: '#f56c6c' } },
          { value: 310, name: '火灾报警', itemStyle: { color: '#e6a23c' } },
          { value: 234, name: '安全事件', itemStyle: { color: '#409eff' } },
          { value: 135, name: '自然灾害', itemStyle: { color: '#67c23a' } },
          { value: 154, name: '设施故障', itemStyle: { color: '#909399' } },
          { value: 85, name: '其他', itemStyle: { color: '#d3d3d3' } }
        ]
      }
    ]
  };

  eventTypeChart.setOption(option);
};

const initActivityHeatmap = () => {
  if (!activityHeatmapRef.value) return;

  activityHeatmap = echarts.init(activityHeatmapRef.value);

  const hours = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11',
                 '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'];
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  const data = [];
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 24; j++) {
      data.push([j, i, Math.floor(Math.random() * 100)]);
    }
  }

  const option = {
    title: {
      text: '活动热力图',
      left: 'center'
    },
    tooltip: {
      position: 'top',
      formatter: function (params) {
        return `${days[params.value[1]]} ${hours[params.value[0]]}:00<br/>活跃度: ${params.value[2]}`;
      }
    },
    grid: {
      height: '70%',
      top: '10%'
    },
    xAxis: {
      type: 'category',
      data: hours,
      splitArea: {
        show: true
      }
    },
    yAxis: {
      type: 'category',
      data: days,
      splitArea: {
        show: true
      }
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      inRange: {
        color: ['#e0f3ff', '#006eff']
      }
    },
    series: [{
      name: '活跃度',
      type: 'heatmap',
      data: data,
      label: {
        show: true
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  };

  activityHeatmap.setOption(option);
};

const connectRealtime = () => {
  try {
    websocket = new WebSocket('ws://localhost:3001/api/v1/realtime/subscribe');

    websocket.onopen = () => {
      realtimeConnected.value = true;
      console.log('实时数据连接已建立');
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'realtimeMetrics') {
          Object.assign(realtimeData, data.metrics);
        }
      } catch (error) {
        console.error('解析实时数据失败:', error);
      }
    };

    websocket.onclose = () => {
      realtimeConnected.value = false;
      console.log('实时数据连接已关闭');
      // 尝试重连
      setTimeout(connectRealtime, 5000);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket连接错误:', error);
      realtimeConnected.value = false;
    };
  } catch (error) {
    console.error('建立实时数据连接失败:', error);
    // 模拟实时数据
    startSimulatedRealtimeData();
  }
};

const startSimulatedRealtimeData = () => {
  setInterval(() => {
    realtimeData.onlineUsers = Math.floor(Math.random() * 200) + 50;
    realtimeData.todayTransactions = Math.floor(Math.random() * 50) + 10;
    realtimeData.systemLoad = Math.floor(Math.random() * 80) + 10;
    realtimeData.responseTime = Math.floor(Math.random() * 200) + 50;
    realtimeConnected.value = true;
  }, 3000);
};

const updateUserChart = () => {
  if (userGrowthChart) {
    const option = {
      xAxis: {
        data: generateDateLabels(userChartPeriod.value)
      },
      series: [
        {
          data: generateRandomData(getDataPointCount(userChartPeriod.value), 5, 20)
        },
        {
          data: generateRandomData(getDataPointCount(userChartPeriod.value), 50, 150)
        }
      ]
    };
    userGrowthChart.setOption(option);
  }
};

const updateFinanceChart = () => {
  if (financeChart) {
    const option = {
      xAxis: {
        data: generateDateLabels(financeChartPeriod.value)
      },
      series: [
        {
          data: generateRandomData(getDataPointCount(financeChartPeriod.value), 1000, 5000)
        },
        {
          data: generateRandomData(getDataPointCount(financeChartPeriod.value), 800, 4000)
        }
      ]
    };
    financeChart.setOption(option);
  }
};

const handleDateRangeChange = (dates) => {
  loadOverviewData();
  loadTableData();
};

const refreshData = () => {
  loadOverviewData();
  loadTableData();
  updateUserChart();
  updateFinanceChart();
  ElMessage.success('数据已刷新');
};

const exportReport = () => {
  exportDialog.visible = true;
  exportForm.dateRange = dateRange.value || [];
};

const handleExport = async () => {
  try {
    exporting.value = true;

    const exportData = {
      type: exportForm.type,
      formats: exportForm.formats,
      dateRange: exportForm.dateRange,
      includeCharts: exportForm.includeCharts,
      email: exportForm.email
    };

    const response = await apiService.generateReport(exportData);

    if (response.success) {
      ElMessage.success('报告导出成功');
      exportDialog.visible = false;
    } else {
      ElMessage.error(response.error || '报告导出失败');
    }
  } catch (error) {
    ElMessage.error('报告导出失败');
    console.error('导出报告错误:', error);
  } finally {
    exporting.value = false;
  }
};

const loadTableData = async () => {
  tableLoading.value = true;
  try {
    const params = {
      page: tablePagination.page,
      limit: tablePagination.limit,
      type: tableView
    };

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500));

    // 生成模拟数据
    const mockData = generateMockTableData(tableView.value, tablePagination.limit);
    tableData.value = mockData.data;
    tablePagination.total = mockData.total;

  } catch (error) {
    console.error('加载表格数据失败:', error);
  } finally {
    tableLoading.value = false;
  }
};

const handleTableSizeChange = (size) => {
  tablePagination.limit = size;
  loadTableData();
};

const handleTableCurrentChange = (page) => {
  tablePagination.page = page;
  loadTableData();
};

// 工具函数
const formatAmount = (amount) => {
  if (!amount) return '0';
  return parseFloat(amount).toLocaleString('zh-CN');
};

const formatCurrency = (row, column, cellValue) => {
  return `¥${formatAmount(cellValue)}`;
};

const formatPercentage = (row, column, cellValue) => {
  return `${cellValue}%`;
};

const formatScore = (row, column, cellValue) => {
  return `${cellValue}/5`;
};

const generateDateLabels = (period) => {
  const labels = [];
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
  }

  return labels;
};

const generateRandomData = (count, min, max) => {
  return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min);
};

const getDataPointCount = (period) => {
  return period === '7d' ? 7 : period === '30d' ? 30 : 90;
};

const generateMockTableData = (type, limit) => {
  const data = [];
  const generators = {
    users: () => ({
      date: generateDate(),
      newUsers: Math.floor(Math.random() * 20) + 5,
      activeUsers: Math.floor(Math.random() * 150) + 50,
      retentionRate: (Math.random() * 30 + 60).toFixed(1),
      growthRate: (Math.random() * 20 - 5).toFixed(1)
    }),
    transactions: () => ({
      date: generateDate(),
      totalAmount: Math.floor(Math.random() * 10000) + 1000,
      transactionCount: Math.floor(Math.random() * 50) + 10,
      avgAmount: Math.floor(Math.random() * 500) + 100,
      category: ['行政支出', '基础设施', '社会福利', '农业补贴'][Math.floor(Math.random() * 4)]
    }),
    emergencies: () => ({
      date: generateDate(),
      emergencyCount: Math.floor(Math.random() * 10) + 1,
      type: ['医疗急救', '火灾报警', '安全事件'][Math.floor(Math.random() * 3)],
      avgResolutionTime: `${Math.floor(Math.random() * 120) + 30}分钟`,
      resolvedCount: Math.floor(Math.random() * 8) + 1
    }),
    activities: () => ({
      date: generateDate(),
      activityCount: Math.floor(Math.random() * 5) + 1,
      participants: Math.floor(Math.random() * 100) + 20,
      engagementRate: (Math.random() * 50 + 30).toFixed(1),
      satisfaction: (Math.random() * 2 + 3).toFixed(1)
    })
  };

  const generator = generators[type] || generators.users;

  for (let i = 0; i < limit; i++) {
    data.push(generator());
  }

  return {
    data,
    total: 200
  };
};

const generateDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 30));
  return date.toLocaleDateString('zh-CN');
};

// 生命周期
onMounted(() => {
  loadOverviewData();
  initCharts();
  connectRealtime();
  loadTableData();

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    userGrowthChart?.resize();
    financeChart?.resize();
    eventTypeChart?.resize();
    activityHeatmap?.resize();
  });
});

onUnmounted(() => {
  if (websocket) {
    websocket.close();
  }
  userGrowthChart?.dispose();
  financeChart?.dispose();
  eventTypeChart?.dispose();
  activityHeatmap?.dispose();
});
</script>

<style scoped>
.analytics-dashboard {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
}

.overview-cards {
  margin-bottom: 20px;
}

.overview-card {
  height: 120px;
}

.card-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.card-icon {
  margin-right: 15px;
  color: #409eff;
}

.overview-card.users .card-icon {
  color: #409eff;
}

.overview-card.revenue .card-icon {
  color: #67c23a;
}

.overview-card.transactions .card-icon {
  color: #e6a23c;
}

.overview-card.emergencies .card-icon {
  color: #f56c6c;
}

.card-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.card-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.card-trend {
  font-size: 12px;
  margin-top: 5px;
  display: flex;
  align-items: center;
}

.card-trend.positive {
  color: #67c23a;
}

.card-trend.negative {
  color: #f56c6c;
}

.chart-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 320px;
}

.realtime-section {
  margin-bottom: 20px;
}

.realtime-card {
  height: 120px;
}

.realtime-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.realtime-indicator {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #f56c6c;
  margin-right: 8px;
  transition: background-color 0.3s;
}

.indicator-dot.active {
  background-color: #67c23a;
}

.realtime-metric {
  text-align: center;
  padding: 10px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-top: 5px;
}

.table-section {
  margin-bottom: 20px;
}

.table-card {
  min-height: 400px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-card__header) {
  padding: 15px 20px;
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 600;
}
</style>