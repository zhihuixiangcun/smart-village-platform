<template>
  <div class="interactive-charts-demo">
    <el-card shadow="always">
      <template #header>
        <div class="card-header">
          <span>📊 交互式图表增强功能演示</span>
          <el-button type="primary" @click="refreshAllCharts">刷新所有图表</el-button>
        </div>
      </template>

      <!-- 图表类型展示 -->
      <el-row :gutter="20">
        <!-- 动态线性图 -->
        <el-col :span="24" :lg="12">
          <el-card shadow="never" class="demo-chart-card">
            <template #header>
              <div class="chart-header">
                <span>📈 动态线性图 - 村务收支趋势</span>
                <el-switch
                  v-model="realTimeUpdate"
                  active-text="实时更新"
                  @change="toggleRealTime"
                />
              </div>
            </template>
            <interactive-chart
              :data="lineChartData"
              type="line"
              :height="300"
              :enabled-types="['line', 'bar']"
              :show-info="true"
              :auto-refresh-interval="realTimeUpdate ? 5 : 0"
              @refresh="generateLineData"
              @dataPointClick="handleLineChartClick"
              @typeChange="handleChartTypeChange"
              @export="handleChartExport"
            />
          </el-card>
        </el-col>

        <!-- 交互式柱状图 -->
        <el-col :span="24" :lg="12">
          <el-card shadow="never" class="demo-chart-card">
            <template #header>
              <span>📊 交互式柱状图 - 各部门支出对比</span>
            </template>
            <interactive-chart
              :data="barChartData"
              type="bar"
              :height="300"
              :enabled-types="['bar', 'line']"
              :show-toolbar="true"
              :interactions="{ onClick: handleBarClick, onDoubleClick: handleBarDoubleClick }"
              @refresh="generateBarData"
            />
          </el-card>
        </el-col>

        <!-- 动态饼图 -->
        <el-col :span="24" :lg="8">
          <el-card shadow="never" class="demo-chart-card">
            <template #header>
              <span>🍰 动态饼图 - 支出分类</span>
            </template>
            <interactive-chart
              :data="pieChartData"
              type="pie"
              :height="350"
              :enabled-types="['pie']"
              :show-info="true"
              @refresh="generatePieData"
              @dataPointClick="handlePieClick"
            />
          </el-card>
        </el-col>

        <!-- 散点图 -->
        <el-col :span="24" :lg="8">
          <el-card shadow="never" class="demo-chart-card">
            <template #header>
              <span>🎯 散点图 - 支出金额分布</span>
            </template>
            <interactive-chart
              :data="scatterChartData"
              type="scatter"
              :height="350"
              :enabled-types="['scatter']"
              @refresh="generateScatterData"
            />
          </el-card>
        </el-col>

        <!-- 热力图 -->
        <el-col :span="24" :lg="8">
          <el-card shadow="never" class="demo-chart-card">
            <template #header>
              <span>🌡️ 热力图 - 月度活动热度</span>
            </template>
            <interactive-chart
              :data="heatmapChartData"
              type="heatmap"
              :height="350"
              :enabled-types="['heatmap']"
              :show-toolbar="false"
              @refresh="generateHeatmapData"
            />
          </el-card>
        </el-col>
      </el-row>

      <!-- 图表控制面板 -->
      <el-row :gutter="20" style="margin-top: 20px">
        <el-col :span="24">
          <el-card shadow="never">
            <template #header>
              <span>🎛️ 图表控制面板</span>
            </template>

            <el-row :gutter="16">
              <el-col :span="6">
                <el-statistic title="活跃图表数量" :value="activeChartsCount" />
              </el-col>
              <el-col :span="6">
                <el-statistic title="数据点总数" :value="totalDataPoints" />
              </el-col>
              <el-col :span="6">
                <el-statistic title="交互次数" :value="interactionCount" />
              </el-col>
              <el-col :span="6">
                <el-statistic title="刷新次数" :value="refreshCount" />
              </el-col>
            </el-row>

            <el-divider />

            <div class="control-actions">
              <el-button-group>
                <el-button @click="generateAllData" icon="Refresh">重新生成数据</el-button>
                <el-button @click="exportAllCharts" icon="Download">导出所有图表</el-button>
                <el-button @click="toggleAnimations" icon="VideoPlay">
                  {{ animationEnabled ? '禁用' : '启用' }}动画
                </el-button>
                <el-button @click="switchTheme" icon="Moon">
                  切换到{{ currentTheme === 'light' ? '深色' : '浅色' }}主题
                </el-button>
              </el-button-group>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 交互记录 -->
      <el-row style="margin-top: 20px">
        <el-col :span="24">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">
                <span>📋 交互记录</span>
                <el-button type="text" @click="clearInteractionLog">清空记录</el-button>
              </div>
            </template>

            <el-scrollbar height="200px">
              <div v-if="interactionLog.length === 0" class="empty-log">
                <el-empty description="暂无交互记录，点击图表数据点开始交互" />
              </div>
              <div v-else class="interaction-log">
                <div v-for="(log, index) in interactionLog" :key="index" class="log-item">
                  <el-tag :type="getLogType(log.type)" size="small">{{ log.type }}</el-tag>
                  <span class="log-time">{{ log.time }}</span>
                  <span class="log-message">{{ log.message }}</span>
                </div>
              </div>
            </el-scrollbar>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import InteractiveChart from '@/components/common/InteractiveChart.vue';

// 响应式数据
const realTimeUpdate = ref(false);
const animationEnabled = ref(true);
const currentTheme = ref('light');
const interactionCount = ref(0);
const refreshCount = ref(0);
const interactionLog = ref([]);

// 图表数据
const lineChartData = ref({});
const barChartData = ref({});
const pieChartData = ref([]);
const scatterChartData = ref({});
const heatmapChartData = ref({});

// 实时更新定时器
let realTimeTimer = null;

// 计算属性
const activeChartsCount = computed(() => 5);

const totalDataPoints = computed(() => {
  let total = 0;
  if (lineChartData.value.series) {
    total += lineChartData.value.series.reduce((sum, serie) => sum + (serie.data?.length || 0), 0);
  }
  if (barChartData.value.series) {
    total += barChartData.value.series.reduce((sum, serie) => sum + (serie.data?.length || 0), 0);
  }
  total += pieChartData.value.length || 0;
  return total;
});

// 数据生成方法
const generateLineData = () => {
  const months = [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
    '11月',
    '12月',
  ];

  lineChartData.value = {
    categories: months,
    series: [
      {
        name: '收入',
        data: months.map(() => Math.floor(Math.random() * 50000) + 20000),
      },
      {
        name: '支出',
        data: months.map(() => Math.floor(Math.random() * 40000) + 15000),
      },
      {
        name: '净收益',
        data: months.map(() => Math.floor(Math.random() * 20000) - 5000),
      },
    ],
  };

  addInteractionLog('数据更新', '线性图数据已刷新');
};

const generateBarData = () => {
  const departments = ['村委会', '基建部', '文化部', '环卫部', '安保部', '财务部'];

  barChartData.value = {
    categories: departments,
    series: [
      {
        name: '本月支出',
        data: departments.map(() => Math.floor(Math.random() * 30000) + 5000),
      },
      {
        name: '预算金额',
        data: departments.map(() => Math.floor(Math.random() * 35000) + 8000),
      },
    ],
  };

  addInteractionLog('数据更新', '柱状图数据已刷新');
};

const generatePieData = () => {
  const categories = [
    { name: '基础设施', value: Math.floor(Math.random() * 50000) + 20000 },
    { name: '日常运营', value: Math.floor(Math.random() * 30000) + 15000 },
    { name: '文化活动', value: Math.floor(Math.random() * 20000) + 8000 },
    { name: '办公用品', value: Math.floor(Math.random() * 15000) + 5000 },
    { name: '其他支出', value: Math.floor(Math.random() * 10000) + 3000 },
  ];

  pieChartData.value = categories;
  addInteractionLog('数据更新', '饼图数据已刷新');
};

const generateScatterData = () => {
  scatterChartData.value = {
    series: [
      {
        name: '支出分布',
        data: Array.from({ length: 50 }, () => [
          Math.floor(Math.random() * 100) + 1,
          Math.floor(Math.random() * 50000) + 1000,
        ]),
      },
    ],
  };

  addInteractionLog('数据更新', '散点图数据已刷新');
};

const generateHeatmapData = () => {
  const weeks = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);

  const data = [];
  for (let i = 0; i < weeks.length; i++) {
    for (let j = 0; j < hours.length; j++) {
      data.push([j, i, Math.floor(Math.random() * 100)]);
    }
  }

  heatmapChartData.value = {
    xCategories: hours,
    yCategories: weeks,
    data,
    min: 0,
    max: 100,
    name: '活动热度',
  };

  addInteractionLog('数据更新', '热力图数据已刷新');
};

// 事件处理方法
const handleLineChartClick = params => {
  interactionCount.value++;
  addInteractionLog(
    '图表点击',
    `点击了线性图: ${params.seriesName} - ${params.name} = ${params.value}`
  );
};

const handleBarClick = params => {
  interactionCount.value++;
  addInteractionLog(
    '图表点击',
    `点击了柱状图: ${params.seriesName} - ${params.name} = ¥${params.value.toLocaleString()}`
  );
};

const handleBarDoubleClick = params => {
  interactionCount.value++;
  addInteractionLog('图表双击', `双击了柱状图: ${params.name}，触发数据缩放`);
  ElMessage.success(`双击放大 ${params.name} 的数据`);
};

const handlePieClick = params => {
  interactionCount.value++;
  addInteractionLog(
    '图表点击',
    `点击了饼图: ${params.name} = ¥${params.value.toLocaleString()} (${params.percent}%)`
  );
};

const handleChartTypeChange = type => {
  addInteractionLog('类型切换', `图表类型已切换为: ${type}`);
};

const handleChartExport = ({ format, dataURL }) => {
  addInteractionLog('图表导出', `图表已导出为 ${format.toUpperCase()} 格式`);
};

// 控制方法
const toggleRealTime = enabled => {
  if (enabled) {
    realTimeTimer = setInterval(() => {
      generateLineData();
      refreshCount.value++;
    }, 5000);
    addInteractionLog('实时更新', '已启用实时数据更新 (5秒间隔)');
  } else {
    if (realTimeTimer) {
      clearInterval(realTimeTimer);
      realTimeTimer = null;
    }
    addInteractionLog('实时更新', '已禁用实时数据更新');
  }
};

const refreshAllCharts = () => {
  generateAllData();
  refreshCount.value++;
  addInteractionLog('批量刷新', '所有图表数据已刷新');
};

const generateAllData = () => {
  generateLineData();
  generateBarData();
  generatePieData();
  generateScatterData();
  generateHeatmapData();
};

const exportAllCharts = () => {
  addInteractionLog('批量导出', '正在导出所有图表...');
  ElMessage.success('批量导出功能开发中...');
};

const toggleAnimations = () => {
  animationEnabled.value = !animationEnabled.value;
  addInteractionLog('动画切换', `图表动画已${animationEnabled.value ? '启用' : '禁用'}`);
  ElMessage.info(`图表动画已${animationEnabled.value ? '启用' : '禁用'}`);
};

const switchTheme = () => {
  currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light';
  addInteractionLog('主题切换', `已切换到${currentTheme.value === 'light' ? '浅色' : '深色'}主题`);
  ElMessage.info(`已切换到${currentTheme.value === 'light' ? '浅色' : '深色'}主题`);
};

// 交互记录方法
const addInteractionLog = (type, message) => {
  const log = {
    type,
    message,
    time: new Date().toLocaleTimeString(),
  };

  interactionLog.value.unshift(log);

  // 限制日志数量
  if (interactionLog.value.length > 50) {
    interactionLog.value = interactionLog.value.slice(0, 50);
  }
};

const clearInteractionLog = () => {
  interactionLog.value = [];
  interactionCount.value = 0;
  addInteractionLog('系统操作', '交互记录已清空');
};

const getLogType = type => {
  const typeMap = {
    图表点击: 'primary',
    图表双击: 'success',
    数据更新: 'info',
    类型切换: 'warning',
    图表导出: 'success',
    实时更新: 'info',
    批量刷新: 'primary',
    批量导出: 'success',
    动画切换: 'warning',
    主题切换: 'warning',
    系统操作: 'info',
  };
  return typeMap[type] || 'default';
};

// 生命周期
onMounted(() => {
  generateAllData();
  addInteractionLog('系统启动', '交互式图表演示系统已加载');
});

onUnmounted(() => {
  if (realTimeTimer) {
    clearInterval(realTimeTimer);
  }
});
</script>

<style lang="scss" scoped>
.interactive-charts-demo {
  padding: 20px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .demo-chart-card {
    margin-bottom: 20px;

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  .control-actions {
    display: flex;
    justify-content: center;
    margin-top: 16px;
  }

  .interaction-log {
    .log-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      .log-time {
        font-size: 12px;
        color: #909399;
        min-width: 80px;
      }

      .log-message {
        flex: 1;
        font-size: 14px;
        color: #606266;
      }
    }
  }

  .empty-log {
    padding: 20px;
    text-align: center;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .interactive-charts-demo {
    padding: 16px;

    .demo-chart-card {
      margin-bottom: 16px;

      .chart-header {
        flex-direction: column;
        gap: 8px;
        align-items: stretch;
      }
    }

    .control-actions {
      .el-button-group {
        display: flex;
        flex-direction: column;

        .el-button {
          margin-bottom: 8px;
        }
      }
    }
  }
}
</style>
