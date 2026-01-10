<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="值班统计报表"
    width="90%"
    :close-on-click-modal="false"
    top="5vh"
  >
    <div class="statistics-container">
      <!-- 统计概览卡片 -->
      <el-row :gutter="20" class="overview-cards">
        <el-col :span="6" :sm="12" :xs="24">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total">
                <el-icon><Calendar /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.totalDuties }}</div>
                <div class="stat-label">总值班次数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6" :sm="12" :xs="24">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon completed">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.completedDuties }}</div>
                <div class="stat-label">已完成</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6" :sm="12" :xs="24">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon pending">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.upcomingDuties }}</div>
                <div class="stat-label">待值班</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6" :sm="12" :xs="24">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon personnel">
                <el-icon><UserFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.personnelCount }}</div>
                <div class="stat-label">值班人员</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 图表区域 -->
      <el-row :gutter="20" class="charts-section">
        <!-- 月度值班趋势 -->
        <el-col :span="12" :xs="24">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>月度值班趋势</span>
                <el-date-picker
                  v-model="dateRange"
                  type="monthrange"
                  range-separator="至"
                  start-placeholder="开始月份"
                  end-placeholder="结束月份"
                  size="small"
                  @change="updateCharts"
                />
              </div>
            </template>
            <div ref="monthlyChart" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 班次分布 -->
        <el-col :span="12" :xs="24">
          <el-card class="chart-card">
            <template #header>
              <span>班次类型分布</span>
            </template>
            <div ref="shiftChart" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 人员负荷分析 -->
        <el-col :span="12" :xs="24">
          <el-card class="chart-card">
            <template #header>
              <span>人员负荷分析</span>
            </template>
            <div ref="workloadChart" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 出勤率统计 -->
        <el-col :span="12" :xs="24">
          <el-card class="chart-card">
            <template #header>
              <span>人员出勤率</span>
            </template>
            <div ref="attendanceChart" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 详细数据表格 -->
      <el-card class="table-card">
        <template #header>
          <div class="card-header">
            <span>值班人员详细统计</span>
            <div class="header-actions">
              <el-button type="primary" size="small" @click="exportReport">
                <el-icon><Download /></el-icon>
                导出报表
              </el-button>
            </div>
          </div>
        </template>

        <el-table
          :data="personnelStats"
          stripe
          style="width: 100%"
          :default-sort="{ prop: 'totalDuties', order: 'descending' }"
        >
          <el-table-column type="index" label="排名" width="60" />
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="position" label="职务" width="120" />
          <el-table-column prop="totalDuties" label="总值班次数" width="120" sortable />
          <el-table-column prop="completedDuties" label="已完成" width="100" sortable />
          <el-table-column prop="upcomingDuties" label="待值班" width="100" sortable />
          <el-table-column prop="attendanceRate" label="出勤率" width="100" sortable>
            <template #default="{ row }">
              <el-progress
                :percentage="row.attendanceRate"
                :color="getAttendanceColor(row.attendanceRate)"
                :stroke-width="6"
              />
            </template>
          </el-table-column>
          <el-table-column prop="avgDutiesPerMonth" label="月均值班" width="100" sortable />
          <el-table-column label="班次偏好" width="200">
            <template #default="{ row }">
              <el-tag
                v-for="shift in row.preferredShifts"
                :key="shift"
                :type="getShiftTypeColor(shift)"
                size="small"
                style="margin-right: 4px"
              >
                {{ getShiftTypeName(shift) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="lastDutyDate" label="最近值班" width="120" sortable>
            <template #default="{ row }">
              {{ formatDate(row.lastDutyDate) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="$emit('update:modelValue', false)">关闭</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Calendar, CircleCheck, Clock, UserFilled, Download } from '@element-plus/icons-vue';
import * as echarts from 'echarts';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  statistics: {
    type: Object,
    default: () => ({}),
  },
  personnel: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:modelValue', 'export']);

// 响应式数据
const dateRange = ref([
  new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
  new Date(),
]);
const monthlyChart = ref(null);
const shiftChart = ref(null);
const workloadChart = ref(null);
const attendanceChart = ref(null);

// 图表实例
let monthlyChartInstance = null;
let shiftChartInstance = null;
let workloadChartInstance = null;
let attendanceChartInstance = null;

// 计算属性
const personnelStats = computed(() => {
  return props.personnel.map(person => ({
    ...person,
    totalDuties: Math.floor(Math.random() * 50) + 10,
    completedDuties: Math.floor(Math.random() * 40) + 5,
    upcomingDuties: Math.floor(Math.random() * 10) + 1,
    attendanceRate: Math.floor(Math.random() * 30) + 70,
    avgDutiesPerMonth: (Math.random() * 5 + 2).toFixed(1),
    preferredShifts: ['morning', 'afternoon', 'evening', 'night'].slice(
      0,
      Math.floor(Math.random() * 4) + 1
    ),
    lastDutyDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
  }));
});

// 方法
const formatDate = date => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

const getShiftTypeName = shiftType => {
  const shiftMap = {
    morning: '早班',
    afternoon: '午班',
    evening: '晚班',
    night: '夜班',
  };
  return shiftMap[shiftType] || shiftType;
};

const getShiftTypeColor = shiftType => {
  const colorMap = {
    morning: 'success',
    afternoon: 'warning',
    evening: 'danger',
    night: 'info',
  };
  return colorMap[shiftType] || 'info';
};

const getAttendanceColor = rate => {
  if (rate >= 90) return '#67c23a';
  if (rate >= 80) return '#e6a23c';
  return '#f56c6c';
};

const initMonthlyChart = () => {
  if (!monthlyChart.value) return;

  monthlyChartInstance = echarts.init(monthlyChart.value);
  const months = [];
  const data = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    data.push(Math.floor(Math.random() * 100) + 50);
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br />值班次数: {c}',
    },
    xAxis: {
      type: 'category',
      data: months,
      axisLabel: {
        formatter: value => {
          const [year, month] = value.split('-');
          return `${month}月`;
        },
      },
    },
    yAxis: {
      type: 'value',
      name: '值班次数',
    },
    series: [
      {
        data: data,
        type: 'line',
        smooth: true,
        areaStyle: {
          opacity: 0.3,
        },
        itemStyle: {
          color: '#409eff',
        },
      },
    ],
  };

  monthlyChartInstance.setOption(option);
};

const initShiftChart = () => {
  if (!shiftChart.value) return;

  shiftChartInstance = echarts.init(shiftChart.value);
  const data = [
    { name: '早班', value: 120, itemStyle: { color: '#67c23a' } },
    { name: '午班', value: 100, itemStyle: { color: '#e6a23c' } },
    { name: '晚班', value: 80, itemStyle: { color: '#f56c6c' } },
    { name: '夜班', value: 40, itemStyle: { color: '#909399' } },
  ];

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: data,
      },
    ],
  };

  shiftChartInstance.setOption(option);
};

const initWorkloadChart = () => {
  if (!workloadChart.value) return;

  workloadChartInstance = echarts.init(workloadChart.value);
  const data = props.personnel.slice(0, 10).map(person => ({
    name: person.name,
    value: Math.floor(Math.random() * 30) + 10,
  }));

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    xAxis: {
      type: 'value',
    },
    yAxis: {
      type: 'category',
      data: data.map(item => item.name),
      inverse: true,
    },
    series: [
      {
        type: 'bar',
        data: data.map(item => item.value),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' },
          ]),
        },
      },
    ],
  };

  workloadChartInstance.setOption(option);
};

const initAttendanceChart = () => {
  if (!attendanceChart.value) return;

  attendanceChartInstance = echarts.init(attendanceChart.value);
  const data = props.personnel.map(person => ({
    name: person.name,
    value: Math.floor(Math.random() * 30) + 70,
  }));

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}%',
    },
    radar: {
      indicator: props.personnel.slice(0, 6).map(person => ({
        name: person.name,
        max: 100,
      })),
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: data.slice(0, 6).map(item => item.value),
            name: '出勤率',
            areaStyle: {
              opacity: 0.3,
            },
          },
        ],
      },
    ],
  };

  attendanceChartInstance.setOption(option);
};

const updateCharts = () => {
  initMonthlyChart();
};

const exportReport = () => {
  emit('export', dateRange.value);
};

const resizeCharts = () => {
  monthlyChartInstance?.resize();
  shiftChartInstance?.resize();
  workloadChartInstance?.resize();
  attendanceChartInstance?.resize();
};

// 生命周期
onMounted(() => {
  nextTick(() => {
    initMonthlyChart();
    initShiftChart();
    initWorkloadChart();
    initAttendanceChart();
    window.addEventListener('resize', resizeCharts);
  });
});

// 监听对话框关闭
watch(
  () => props.modelValue,
  newVal => {
    if (!newVal) {
      // 清理图表实例
      monthlyChartInstance?.dispose();
      shiftChartInstance?.dispose();
      workloadChartInstance?.dispose();
      attendanceChartInstance?.dispose();
      window.removeEventListener('resize', resizeCharts);
    } else {
      nextTick(() => {
        initMonthlyChart();
        initShiftChart();
        initWorkloadChart();
        initAttendanceChart();
        window.addEventListener('resize', resizeCharts);
      });
    }
  }
);
</script>

<style lang="scss" scoped>
.statistics-container {
  .overview-cards {
    margin-bottom: 20px;

    .stat-card {
      .stat-content {
        display: flex;
        align-items: center;
        padding: 10px;

        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 16px;

          .el-icon {
            font-size: 30px;
            color: white;
          }

          &.total {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          &.completed {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }

          &.pending {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          }

          &.personnel {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          }
        }

        .stat-info {
          .stat-value {
            font-size: 28px;
            font-weight: bold;
            color: #303133;
            line-height: 1;
          }

          .stat-label {
            font-size: 14px;
            color: #909399;
            margin-top: 8px;
          }
        }
      }
    }
  }

  .charts-section {
    margin-bottom: 20px;

    .chart-card {
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .chart-container {
        height: 300px;
      }
    }
  }

  .table-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-actions {
        display: flex;
        gap: 12px;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

// 响应式设计
@media (max-width: 768px) {
  .statistics-container {
    .charts-section {
      .chart-card {
        .chart-container {
          height: 250px;
        }
      }
    }
  }
}
</style>
