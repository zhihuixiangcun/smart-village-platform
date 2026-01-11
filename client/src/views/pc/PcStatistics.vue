<!--
  PC端数据统计页面
  智慧乡村综合服务平台 - PC端数据统计
-->
<template>
  <div class="pc-statistics">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1>数据统计</h1>
        <p>人口结构分析、家庭统计、特殊群体管理、数据报表导出</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showExportDialog">
          <el-icon><Download /></el-icon>
          导出报表
        </el-button>
        <el-button @click="showChartDialog">
          <el-icon><DataAnalysis /></el-icon>
          图表分析
        </el-button>
        <el-button @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </header>

    <!-- 统计概览 -->
    <section class="overview-section">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="8" :md="4" v-for="stat in overviewStats" :key="stat.key">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" :style="{ background: stat.gradient }">
                <el-icon :size="24" color="white">
                  <component :is="stat.icon" />
                </el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.label }}</div>
                <div class="stat-change" :class="stat.changeClass">
                  <el-icon size="12">
                    <component :is="stat.changeIcon" />
                  </el-icon>
                  <span>{{ stat.change }}</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <!-- 主内容区域 -->
    <section class="main-section">
      <el-row :gutter="20">
        <!-- 左侧图表区域 -->
        <el-col :xs="24" :sm="24" :md="16" :lg="16">
          <!-- 人口统计分析 -->
          <el-card class="chart-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><UserFilled /></el-icon>
                  人口统计分析
                </span>
                <el-radio-group
                  v-model="populationPeriod"
                  size="small"
                  @change="handlePeriodChange"
                >
                  <el-radio-button label="age">年龄分布</el-radio-button>
                  <el-radio-button label="gender">性别比例</el-radio-button>
                  <el-radio-button label="education">学历结构</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <div ref="populationChartRef" class="chart-container"></div>
          </el-card>

          <!-- 家庭结构分析 -->
          <el-card class="chart-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><HomeFilled /></el-icon>
                  家庭结构分析
                </span>
              </div>
            </template>
            <el-row :gutter="20">
              <el-col :span="12">
                <div ref="familyTypeChartRef" class="chart-container-half"></div>
              </el-col>
              <el-col :span="12">
                <div ref="familySizeChartRef" class="chart-container-half"></div>
              </el-col>
            </el-row>
          </el-card>

          <!-- 特殊群体统计 -->
          <el-card class="chart-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><WarningFilled /></el-icon>
                  特殊群体统计
                </span>
                <el-button size="small" @click="showSpecialGroupDetail">查看详情</el-button>
              </div>
            </template>
            <div class="special-groups">
              <div
                v-for="group in specialGroups"
                :key="group.key"
                class="special-group-item"
                @click="viewSpecialGroup(group)"
              >
                <div class="group-icon" :style="{ background: group.gradient }">
                  <el-icon :size="24" color="white">
                    <component :is="group.icon" />
                  </el-icon>
                </div>
                <div class="group-info">
                  <div class="group-name">{{ group.name }}</div>
                  <div class="group-count">{{ group.count }}人</div>
                </div>
                <div class="group-trend" :class="group.trend > 0 ? 'up' : 'down'">
                  <el-icon>
                    <component :is="group.trend > 0 ? 'ArrowUp' : 'ArrowDown'" />
                  </el-icon>
                  {{ Math.abs(group.trend) }}%
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 右侧侧边栏 -->
        <el-col :xs="24" :sm="24" :md="8" :lg="8">
          <!-- 数据概览饼图 -->
          <el-card class="sidebar-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><PieChart /></el-icon>
                  村民构成
                </span>
              </div>
            </template>
            <div ref="compositionChartRef" class="chart-container"></div>
          </el-card>

          <!-- 动态统计 -->
          <el-card class="sidebar-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><TrendCharts /></el-icon>
                  年度人口变化
                </span>
              </div>
            </template>
            <div ref="trendChartRef" class="chart-container"></div>
          </el-card>

          <!-- 数据质量 -->
          <el-card class="sidebar-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><CircleCheck /></el-icon>
                  数据完整度
                </span>
              </div>
            </template>
            <div class="data-quality">
              <div v-for="item in dataQuality" :key="item.key" class="quality-item">
                <div class="quality-header">
                  <span class="quality-label">{{ item.label }}</span>
                  <span class="quality-value">{{ item.percentage }}%</span>
                </div>
                <el-progress
                  :percentage="item.percentage"
                  :color="getQualityColor(item.percentage)"
                />
              </div>
            </div>
          </el-card>

          <!-- 快捷统计 -->
          <el-card class="sidebar-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="card-title">
                  <el-icon><List /></el-icon>
                  快速统计
                </span>
              </div>
            </template>
            <div class="quick-stats">
              <div v-for="stat in quickStats" :key="stat.key" class="quick-stat-item">
                <span class="quick-stat-label">{{ stat.label }}</span>
                <span class="quick-stat-value">{{ stat.value }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <!-- 导出报表对话框 -->
    <el-dialog v-model="showExportDialogVisible" title="导出报表" width="500px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="报表类型">
          <el-select v-model="exportForm.type" placeholder="请选择报表类型" style="width: 100%">
            <el-option label="人口统计报表" value="population" />
            <el-option label="家庭结构报表" value="family" />
            <el-option label="特殊群体报表" value="special" />
            <el-option label="综合统计报表" value="comprehensive" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="exportForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="导出格式">
          <el-radio-group v-model="exportForm.format">
            <el-radio label="excel">Excel</el-radio>
            <el-radio label="pdf">PDF</el-radio>
            <el-radio label="csv">CSV</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showExportDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleExport">确认导出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import {
  Download,
  DataAnalysis,
  Refresh,
  UserFilled,
  HomeFilled,
  WarningFilled,
  PieChart,
  TrendCharts,
  CircleCheck,
  List,
  ArrowUp,
  ArrowDown,
} from '@element-plus/icons-vue';

const router = useRouter();

const loading = ref(false);
const populationPeriod = ref('age');
const showExportDialogVisible = ref(false);

const populationChartRef = ref<HTMLDivElement | null>(null);
const familyTypeChartRef = ref<HTMLDivElement | null>(null);
const familySizeChartRef = ref<HTMLDivElement | null>(null);
const compositionChartRef = ref<HTMLDivElement | null>(null);
const trendChartRef = ref<HTMLDivElement | null>(null);

let populationChartInstance: echarts.ECharts | null = null;
let familyTypeChartInstance: echarts.ECharts | null = null;
let familySizeChartInstance: echarts.ECharts | null = null;
let compositionChartInstance: echarts.ECharts | null = null;
let trendChartInstance: echarts.ECharts | null = null;

const overviewStats = ref([
  {
    key: 'total',
    label: '总人口',
    value: 1256,
    icon: 'User',
    gradient: 'linear-gradient(135deg, #0369A1 0%, #0ea5e9 100%)',
    change: '+1.2%',
    changeClass: 'positive',
    changeIcon: 'ArrowUp',
  },
  {
    key: 'households',
    label: '总户数',
    value: 456,
    icon: 'OfficeBuilding',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    change: '+0.5%',
    changeClass: 'positive',
    changeIcon: 'ArrowUp',
  },
  {
    key: 'avgAge',
    label: '平均年龄',
    value: 42.5,
    icon: 'Timer',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    change: '+0.3',
    changeClass: 'negative',
    changeIcon: 'ArrowUp',
  },
  {
    key: 'labor',
    label: '劳动力',
    value: 768,
    icon: 'Work',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
    change: '-0.8%',
    changeClass: 'negative',
    changeIcon: 'ArrowDown',
  },
  {
    key: 'special',
    label: '特殊群体',
    value: 89,
    icon: 'WarningFilled',
    gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
    change: '-2.1%',
    changeClass: 'positive',
    changeIcon: 'ArrowDown',
  },
  {
    key: 'growth',
    label: '自然增长率',
    value: 3.2,
    icon: 'TrendCharts',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
    change: '+0.5%',
    changeClass: 'positive',
    changeIcon: 'ArrowUp',
  },
]);

const specialGroups = ref([
  {
    key: 'lowIncome',
    name: '低保户',
    count: 35,
    icon: 'Wallet',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
    trend: -5.4,
  },
  {
    key: 'disabled',
    name: '残疾人',
    count: 28,
    icon: 'FirstAid',
    gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    trend: 0,
  },
  {
    key: 'elderly',
    name: '独居老人',
    count: 42,
    icon: 'UserFilled',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    trend: 2.3,
  },
  {
    key: 'leftBehind',
    name: '留守儿童',
    count: 18,
    icon: 'Monitor',
    gradient: 'linear-gradient(135deg, #0369A1 0%, #0ea5e9 100%)',
    trend: -8.2,
  },
  {
    key: 'veteran',
    name: '退役军人',
    count: 15,
    icon: 'Medal',
    gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
    trend: 3.5,
  },
]);

const dataQuality = ref([
  { key: 'basic', label: '基本信息完整度', percentage: 98 },
  { key: 'contact', label: '联系方式完整度', percentage: 95 },
  { key: 'health', label: '健康信息完整度', percentage: 82 },
  { key: 'economic', label: '经济状况完整度', percentage: 76 },
  { key: 'education', label: '学历信息完整度', percentage: 88 },
]);

const quickStats = ref([
  { key: 'male', label: '男性人口', value: '658人' },
  { key: 'female', label: '女性人口', value: '598人' },
  { key: 'party', label: '党员人数', value: '86人' },
  { key: 'cadre', label: '村干部人数', value: '12人' },
  { key: 'married', label: '已婚人口', value: '892人' },
  { key: 'newborn', label: '近一年新生儿', value: '8人' },
]);

const exportForm = ref({
  type: 'comprehensive',
  dateRange: null as Date[] | null,
  format: 'excel',
});

const initPopulationChart = () => {
  if (!populationChartRef.value) return;

  populationChartInstance = echarts.init(populationChartRef.value);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['男', '女'],
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['0-6岁', '7-17岁', '18-35岁', '36-59岁', '60岁以上'],
      axisLabel: { fontSize: 12 },
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '男',
        type: 'bar',
        data: [45, 78, 156, 285, 94],
        itemStyle: { color: '#409eff' },
      },
      {
        name: '女',
        type: 'bar',
        data: [38, 72, 142, 268, 78],
        itemStyle: { color: '#e6a23c' },
      },
    ],
  };

  populationChartInstance.setOption(option);
};

const initFamilyTypeChart = () => {
  if (!familyTypeChartRef.value) return;

  familyTypeChartInstance = echarts.init(familyTypeChartRef.value);

  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}户 ({d}%)' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        data: [
          { value: 285, name: '核心家庭', itemStyle: { color: '#0369A1' } },
          { value: 95, name: '三代同堂', itemStyle: { color: '#059669' } },
          { value: 45, name: '空巢家庭', itemStyle: { color: '#7c3aed' } },
          { value: 31, name: '单身家庭', itemStyle: { color: '#ea580c' } },
        ],
      },
    ],
  };

  familyTypeChartInstance.setOption(option);
};

const initFamilySizeChart = () => {
  if (!familySizeChartRef.value) return;

  familySizeChartInstance = echarts.init(familySizeChartRef.value);

  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}户 ({d}%)' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        data: [
          { value: 85, name: '1人户', itemStyle: { color: '#0369A1' } },
          { value: 165, name: '2人户', itemStyle: { color: '#059669' } },
          { value: 128, name: '3人户', itemStyle: { color: '#7c3aed' } },
          { value: 78, name: '4人户', itemStyle: { color: '#ea580c' } },
        ],
      },
    ],
  };

  familySizeChartInstance.setOption(option);
};

const initCompositionChart = () => {
  if (!compositionChartRef.value) return;

  compositionChartInstance = echarts.init(compositionChartRef.value);

  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
    series: [
      {
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['50%', '55%'],
        roseType: 'radius',
        itemStyle: {
          borderRadius: 5,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          fontSize: 11,
          color: '#606266',
        },
        data: [
          { value: 285, name: '劳动力', itemStyle: { color: '#0369A1' } },
          { value: 156, name: '学生', itemStyle: { color: '#059669' } },
          { value: 198, name: '老人', itemStyle: { color: '#7c3aed' } },
          { value: 89, name: '特殊群体', itemStyle: { color: '#ea580c' } },
          { value: 528, name: '其他', itemStyle: { color: '#0891b2' } },
        ],
      },
    ],
  };

  compositionChartInstance.setOption(option);
};

const initTrendChart = () => {
  if (!trendChartRef.value) return;

  trendChartInstance = echarts.init(trendChartRef.value);

  const option = {
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['出生', '死亡', '迁入', '迁出'],
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 11 },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '18%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月'],
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
    series: [
      {
        name: '出生',
        type: 'line',
        data: [2, 3, 1, 4, 2, 3],
        smooth: true,
        itemStyle: { color: '#67c23a' },
      },
      {
        name: '死亡',
        type: 'line',
        data: [1, 0, 2, 1, 1, 0],
        smooth: true,
        itemStyle: { color: '#f56c6c' },
      },
      {
        name: '迁入',
        type: 'line',
        data: [3, 2, 4, 3, 5, 4],
        smooth: true,
        itemStyle: { color: '#409eff' },
      },
      {
        name: '迁出',
        type: 'line',
        data: [2, 1, 3, 2, 2, 1],
        smooth: true,
        itemStyle: { color: '#e6a23c' },
      },
    ],
  };

  trendChartInstance.setOption(option);
};

const handlePeriodChange = () => {
  if (!populationChartInstance) return;

  const options: Record<string, object> = {
    age: {
      xAxis: { data: ['0-6岁', '7-17岁', '18-35岁', '36-59岁', '60岁以上'] },
      series: [{ data: [45, 78, 156, 285, 94] }, { data: [38, 72, 142, 268, 78] }],
    },
    gender: {
      xAxis: { data: ['村民构成'] },
      series: [
        { name: '男', data: [658], itemStyle: { color: '#409eff' } },
        { name: '女', data: [598], itemStyle: { color: '#e6a23c' } },
      ],
    },
    education: {
      xAxis: { data: ['小学及以下', '初中', '高中', '大专', '本科及以上'] },
      series: [{ data: [285, 356, 245, 198, 172] }, { data: [0, 0, 0, 0, 0] }],
    },
  };

  populationChartInstance.setOption(options[populationPeriod.value], true);
};

const getQualityColor = (percentage: number): string => {
  if (percentage >= 90) return '#67c23a';
  if (percentage >= 70) return '#e6a23c';
  return '#f56c6c';
};

const showExportDialog = () => {
  showExportDialogVisible.value = true;
};

const showChartDialog = () => {
  ElMessage.info('图表分析功能开发中');
};

const refreshData = async () => {
  loading.value = true;
  await new Promise(resolve => setTimeout(resolve, 1000));
  loading.value = false;
  ElMessage.success('数据已刷新');
};

const showSpecialGroupDetail = () => {
  ElMessage.info('查看特殊群体详情');
};

const viewSpecialGroup = (group: { name: string }) => {
  ElMessage.info(`查看${group.name}详情`);
};

const handleExport = () => {
  ElMessage.success('报表导出中...');
  showExportDialogVisible.value = false;
};

const resizeCharts = () => {
  populationChartInstance?.resize();
  familyTypeChartInstance?.resize();
  familySizeChartInstance?.resize();
  compositionChartInstance?.resize();
  trendChartInstance?.resize();
};

onMounted(async () => {
  await nextTick();
  initPopulationChart();
  initFamilyTypeChart();
  initFamilySizeChart();
  initCompositionChart();
  initTrendChart();

  window.addEventListener('resize', resizeCharts);
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts);
  populationChartInstance?.dispose();
  familyTypeChartInstance?.dispose();
  familySizeChartInstance?.dispose();
  compositionChartInstance?.dispose();
  trendChartInstance?.dispose();
});
</script>

<style lang="scss" scoped>
.pc-statistics {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

  .header-content {
    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }

    p {
      margin: 0;
      font-size: 14px;
      color: #909399;
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.overview-section {
  margin-bottom: 24px;
}

.stat-card {
  margin-bottom: 20px;

  .stat-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-info {
    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #303133;
    }

    .stat-label {
      font-size: 13px;
      color: #909399;
      margin-bottom: 4px;
    }

    .stat-change {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;

      &.positive {
        color: #67c23a;
      }

      &.negative {
        color: #f56c6c;
      }
    }
  }
}

.main-section {
  .el-card {
    margin-bottom: 20px;
  }
}

.chart-card {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.card-header {
  .card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 500;
    color: #303133;
  }
}

.chart-container {
  height: 280px;
}

.chart-container-half {
  height: 220px;
}

.special-groups {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.special-group-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: #409eff;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
  }

  .group-icon {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .group-info {
    flex: 1;

    .group-name {
      font-size: 14px;
      font-weight: 500;
      color: #303133;
      margin-bottom: 4px;
    }

    .group-count {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }
  }

  .group-trend {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;

    &.up {
      color: #f56c6c;
    }

    &.down {
      color: #67c23a;
    }
  }
}

.sidebar-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
    }
  }
}

.data-quality {
  .quality-item {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }

    .quality-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;

      .quality-label {
        font-size: 13px;
        color: #606266;
      }

      .quality-value {
        font-size: 13px;
        font-weight: 500;
        color: #303133;
      }
    }
  }
}

.quick-stats {
  .quick-stat-item {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #ebeef5;

    &:last-child {
      border-bottom: none;
    }

    .quick-stat-label {
      font-size: 14px;
      color: #606266;
    }

    .quick-stat-value {
      font-size: 14px;
      font-weight: 500;
      color: #303133;
    }
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .special-groups {
    grid-template-columns: 1fr;
  }
}
</style>
