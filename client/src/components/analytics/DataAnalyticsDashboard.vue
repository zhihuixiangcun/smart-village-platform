<template>
  <div class="data-analytics-dashboard">
    <!-- 顶部控制栏 -->
    <div class="dashboard-header">
      <div class="title-section">
        <h2>数据分析中心</h2>
        <p class="subtitle">智慧村庄综合数据分析平台</p>
      </div>

      <div class="controls-section">
        <el-form :inline="true" :model="filters" class="filter-form">
          <el-form-item label="时间范围">
            <el-select v-model="filters.timeRange" @change="onTimeRangeChange" style="width: 120px">
              <el-option label="今日" value="day" />
              <el-option label="本周" value="week" />
              <el-option label="本月" value="month" />
              <el-option label="本季" value="quarter" />
              <el-option label="本年" value="year" />
            </el-select>
          </el-form-item>

          <el-form-item label="数据类别">
            <el-select
              v-model="filters.categories"
              multiple
              @change="onCategoriesChange"
              style="width: 200px"
            >
              <el-option label="人口统计" value="population" />
              <el-option label="财务分析" value="financial" />
              <el-option label="村务治理" value="governance" />
              <el-option label="应急管理" value="emergency" />
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="refreshData" :loading="loading">
              <i class="el-icon-refresh"></i>
              刷新数据
            </el-button>
          </el-form-item>

          <el-form-item>
            <el-dropdown @command="handleExport">
              <el-button type="success">
                <i class="el-icon-download"></i>
                导出报表
                <i class="el-icon-arrow-down el-icon--right"></i>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="json">JSON格式</el-dropdown-item>
                  <el-dropdown-item command="csv">CSV格式</el-dropdown-item>
                  <el-dropdown-item command="excel">Excel格式</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 实时数据状态栏 -->
    <div class="status-bar">
      <div class="status-item">
        <span class="status-label">数据更新时间：</span>
        <span class="status-value">{{ lastUpdateTime }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">系统状态：</span>
        <el-tag :type="systemStatus.type" size="small">{{ systemStatus.text }}</el-tag>
      </div>
      <div class="status-item">
        <span class="status-label">实时连接：</span>
        <span class="status-value">{{ realtimeConnections }}</span>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <el-row :gutter="20">
      <!-- 左侧统计卡片 -->
      <el-col :span="6">
        <div class="stats-cards">
          <el-card v-for="stat in keyStats" :key="stat.key" class="stat-card" :class="stat.type">
            <div class="stat-content">
              <div class="stat-icon">
                <i :class="stat.icon"></i>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ formatNumber(stat.value) }}</div>
                <div class="stat-label">{{ stat.label }}</div>
                <div class="stat-trend" :class="stat.trend">
                  <i :class="stat.trend === 'up' ? 'el-icon-top' : 'el-icon-bottom'"></i>
                  {{ stat.change }}
                </div>
              </div>
            </div>
          </el-card>
        </div>
      </el-col>

      <!-- 中间图表区域 -->
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>数据概览趋势</span>
              <el-radio-group v-model="chartType" size="small">
                <el-radio-button label="line">折线图</el-radio-button>
                <el-radio-button label="bar">柱状图</el-radio-button>
                <el-radio-button label="area">面积图</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="mainChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 右侧详细数据 -->
      <el-col :span="6">
        <el-card class="details-card">
          <template #header>
            <span>详细数据</span>
          </template>

          <el-tabs v-model="activeTab" type="card">
            <el-tab-pane label="人口" name="population">
              <div v-if="dashboardData.population" class="data-panel">
                <div class="data-item">
                  <span class="data-label">总人口：</span>
                  <span class="data-value">{{
                    dashboardData.population.data?.overview?.totalPopulation || 0
                  }}</span>
                </div>
                <div class="data-item">
                  <span class="data-label">总户数：</span>
                  <span class="data-value">{{
                    dashboardData.population.data?.overview?.totalHouseholds || 0
                  }}</span>
                </div>
                <div class="data-item">
                  <span class="data-label">平均家庭规模：</span>
                  <span class="data-value">{{
                    dashboardData.population.data?.overview?.avgHouseholdSize || 0
                  }}</span>
                </div>
                <div class="data-item">
                  <span class="data-label">老年人口：</span>
                  <span class="data-value">{{
                    dashboardData.population.data?.demographics?.ageRatio?.elderly || 0
                  }}</span>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="财务" name="financial">
              <div v-if="dashboardData.financial" class="data-panel">
                <div class="data-item">
                  <span class="data-label">总收入：</span>
                  <span class="data-value"
                    >¥{{ formatMoney(dashboardData.financial.data?.overview?.totalIncome) }}</span
                  >
                </div>
                <div class="data-item">
                  <span class="data-label">总支出：</span>
                  <span class="data-value"
                    >¥{{ formatMoney(dashboardData.financial.data?.overview?.totalExpense) }}</span
                  >
                </div>
                <div class="data-item">
                  <span class="data-label">净收入：</span>
                  <span
                    class="data-value"
                    :class="getFinancialClass(dashboardData.financial.data?.overview?.netIncome)"
                  >
                    ¥{{ formatMoney(dashboardData.financial.data?.overview?.netIncome) }}
                  </span>
                </div>
                <div class="data-item">
                  <span class="data-label">交易笔数：</span>
                  <span class="data-value">{{
                    dashboardData.financial.data?.overview?.totalTransactions
                  }}</span>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="治理" name="governance">
              <div v-if="dashboardData.governance" class="data-panel">
                <div class="data-item">
                  <span class="data-label">公告数量：</span>
                  <span class="data-value">{{ getGovernanceStat('announcements', 'count') }}</span>
                </div>
                <div class="data-item">
                  <span class="data-label">任务完成率：</span>
                  <span class="data-value">{{ calculateTaskCompletion() }}%</span>
                </div>
                <div class="data-item">
                  <span class="data-label">讨论参与度：</span>
                  <span class="data-value"
                    >{{
                      dashboardData.governance.data?.engagement?.featureUsage?.discussions || 0
                    }}%</span
                  >
                </div>
                <div class="data-item">
                  <span class="data-label">满意度：</span>
                  <span class="data-value"
                    >{{
                      dashboardData.governance.data?.engagement?.satisfactionScore || 0
                    }}/5.0</span
                  >
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="应急" name="emergency">
              <div v-if="dashboardData.emergency" class="data-panel">
                <div class="data-item">
                  <span class="data-label">平均响应时间：</span>
                  <span class="data-value"
                    >{{ dashboardData.emergency.data?.responseMetrics?.avgResponseTime }}分钟</span
                  >
                </div>
                <div class="data-item">
                  <span class="data-label">成功率：</span>
                  <span class="data-value"
                    >{{ dashboardData.emergency.data?.responseMetrics?.successRate }}%</span
                  >
                </div>
                <div class="data-item">
                  <span class="data-label">资源可用性：</span>
                  <span class="data-value"
                    >{{
                      dashboardData.emergency.data?.responseMetrics?.resourceAvailability
                    }}%</span
                  >
                </div>
                <div class="data-item">
                  <span class="data-label">处理时间：</span>
                  <span class="data-value"
                    >{{
                      dashboardData.emergency.data?.responseMetrics?.avgResolutionTime
                    }}分钟</span
                  >
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细图表区域 -->
    <el-row :gutter="20" style="margin-top: 20px">
      <!-- 人口结构图表 -->
      <el-col :span="12" v-if="filters.categories.includes('population')">
        <el-card>
          <template #header>
            <span>人口结构分析</span>
          </template>
          <div ref="populationChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 财务趋势图表 -->
      <el-col :span="12" v-if="filters.categories.includes('financial')">
        <el-card>
          <template #header>
            <span>财务收支趋势</span>
          </template>
          <div ref="financialChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据表格区域 -->
    <el-row style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="table-header">
              <span>数据明细</span>
              <div>
                <el-input
                  v-model="tableSearch"
                  placeholder="搜索数据..."
                  prefix-icon="el-icon-search"
                  style="width: 200px; margin-right: 10px"
                />
                <el-button @click="exportTableData" type="text">
                  <i class="el-icon-download"></i>
                  导出表格
                </el-button>
              </div>
            </div>
          </template>

          <el-table :data="filteredTableData" v-loading="tableLoading" stripe>
            <el-table-column prop="category" label="类别" width="120" />
            <el-table-column prop="metric" label="指标" width="150" />
            <el-table-column prop="value" label="数值" width="120" />
            <el-table-column prop="change" label="变化" width="100">
              <template #default="scope">
                <span :class="scope.row.change > 0 ? 'text-success' : 'text-danger'">
                  {{ scope.row.change > 0 ? '+' : '' }}{{ scope.row.change }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="updateTime" label="更新时间" width="160" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 自定义报表对话框 -->
    <el-dialog v-model="customReportVisible" title="自定义报表" width="800px">
      <el-form :model="customReport" label-width="120px">
        <el-form-item label="报表名称">
          <el-input v-model="customReport.name" placeholder="请输入报表名称" />
        </el-form-item>

        <el-form-item label="数据范围">
          <el-checkbox-group v-model="customReport.collections">
            <el-checkbox label="households">户籍信息</el-checkbox>
            <el-checkbox label="announcements">公告信息</el-checkbox>
            <el-checkbox label="financial_transactions">财务记录</el-checkbox>
            <el-checkbox label="village_tasks">任务记录</el-checkbox>
            <el-checkbox label="emergency_events">应急事件</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="时间范围">
          <el-select v-model="customReport.timeRange">
            <el-option label="最近一天" value="day" />
            <el-option label="最近一周" value="week" />
            <el-option label="最近一月" value="month" />
            <el-option label="最近一季" value="quarter" />
            <el-option label="最近一年" value="year" />
          </el-select>
        </el-form-item>

        <el-form-item label="导出格式">
          <el-radio-group v-model="customReport.format">
            <el-radio label="json">JSON</el-radio>
            <el-radio label="csv">CSV</el-radio>
            <el-radio label="excel">Excel</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="customReportVisible = false">取消</el-button>
        <el-button type="primary" @click="generateCustomReport" :loading="customReportLoading">
          生成报表
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import * as echarts from 'echarts';

export default {
  name: 'DataAnalyticsDashboard',
  setup() {
    // 响应式数据
    const loading = ref(false);
    const tableLoading = ref(false);
    const customReportLoading = ref(false);
    const customReportVisible = ref(false);
    const realtimeConnections = ref(0);
    const lastUpdateTime = ref(new Date().toLocaleString());
    const chartType = ref('line');
    const activeTab = ref('population');
    const tableSearch = ref('');

    // 筛选条件
    const filters = reactive({
      timeRange: 'month',
      categories: ['population', 'financial', 'governance', 'emergency'],
    });

    // 系统状态
    const systemStatus = reactive({
      type: 'success',
      text: '正常运行',
    });

    // 仪表板数据
    const dashboardData = reactive({
      population: null,
      financial: null,
      governance: null,
      emergency: null,
    });

    // 关键统计数据
    const keyStats = reactive([
      {
        key: 'population',
        label: '总人口',
        value: 0,
        icon: 'el-icon-user',
        type: 'primary',
        trend: 'up',
        change: '+2.3%',
      },
      {
        key: 'financial',
        label: '月收入',
        value: 0,
        icon: 'el-icon-money',
        type: 'success',
        trend: 'up',
        change: '+8.7%',
      },
      {
        key: 'tasks',
        label: '任务完成',
        value: 0,
        icon: 'el-icon-check',
        type: 'warning',
        trend: 'up',
        change: '+5.2%',
      },
      {
        key: 'satisfaction',
        label: '满意度',
        value: 0,
        icon: 'el-icon-star-on',
        type: 'danger',
        trend: 'down',
        change: '-0.8%',
      },
    ]);

    // 表格数据
    const tableData = reactive([
      {
        category: '人口',
        metric: '总人口',
        value: 0,
        change: 2.3,
        description: '村中常住人口总数',
        updateTime: new Date().toLocaleString(),
      },
      {
        category: '人口',
        metric: '老年人口',
        value: 0,
        change: 1.2,
        description: '60岁以上人口数量',
        updateTime: new Date().toLocaleString(),
      },
      {
        category: '财务',
        metric: '总收入',
        value: 0,
        change: 8.7,
        description: '本月总收入金额',
        updateTime: new Date().toLocaleString(),
      },
      {
        category: '财务',
        metric: '总支出',
        value: 0,
        change: -3.2,
        description: '本月总支出金额',
        updateTime: new Date().toLocaleString(),
      },
    ]);

    // 自定义报表配置
    const customReport = reactive({
      name: '',
      collections: [],
      timeRange: 'month',
      format: 'json',
    });

    // 图表实例
    let mainChartInstance = null;
    let populationChartInstance = null;
    let financialChartInstance = null;

    // 图表DOM引用
    const mainChart = ref(null);
    const populationChart = ref(null);
    const financialChart = ref(null);

    // 计算属性
    const filteredTableData = computed(() => {
      if (!tableSearch.value) return tableData;

      return tableData.filter(
        item =>
          item.category.includes(tableSearch.value) ||
          item.metric.includes(tableSearch.value) ||
          item.description.includes(tableSearch.value)
      );
    });

    // 方法
    const loadDashboardData = async () => {
      try {
        loading.value = true;

        const response = await fetch(
          '/api/v1/analytics/dashboard?' +
            new URLSearchParams({
              timeRange: filters.timeRange,
              categories: filters.categories.join(','),
            })
        );

        const result = await response.json();

        if (result.success) {
          Object.assign(dashboardData, result.data);
          updateKeyStats();
          updateTableData();
          lastUpdateTime.value = new Date().toLocaleString();

          // 更新图表
          await nextTick();
          updateMainChart();
          updatePopulationChart();
          updateFinancialChart();
        } else {
          ElMessage.error('加载数据失败: ' + result.message);
        }
      } catch (error) {
        console.error('加载仪表板数据失败:', error);
        ElMessage.error('加载数据失败，请稍后重试');
      } finally {
        loading.value = false;
      }
    };

    const updateKeyStats = () => {
      // 更新人口统计
      if (dashboardData.population?.data?.overview?.totalPopulation) {
        keyStats[0].value = dashboardData.population.data.overview.totalPopulation;
      }

      // 更新财务统计
      if (dashboardData.financial?.data?.overview?.totalIncome) {
        keyStats[1].value = dashboardData.financial.data.overview.totalIncome;
      }

      // 更新任务统计
      if (dashboardData.governance?.data?.engagement?.featureUsage?.tasks) {
        keyStats[2].value = dashboardData.governance.data.engagement.featureUsage.tasks;
      }

      // 更新满意度
      if (dashboardData.governance?.data?.engagement?.satisfactionScore) {
        keyStats[3].value = (
          parseFloat(dashboardData.governance.data.engagement.satisfactionScore) * 20
        ).toFixed(0);
      }
    };

    const updateTableData = () => {
      // 更新表格数据
      if (dashboardData.population?.data?.overview?.totalPopulation) {
        tableData[0].value = dashboardData.population.data.overview.totalPopulation;
      }

      if (dashboardData.population?.data?.demographics?.ageRatio?.elderly) {
        tableData[1].value = dashboardData.population.data.demographics.ageRatio.elderly;
      }

      if (dashboardData.financial?.data?.overview?.totalIncome) {
        tableData[2].value = dashboardData.financial.data.overview.totalIncome;
      }

      if (dashboardData.financial?.data?.overview?.totalExpense) {
        tableData[3].value = dashboardData.financial.data.overview.totalExpense;
      }
    };

    const updateMainChart = () => {
      if (!mainChart.value) return;

      if (!mainChartInstance) {
        mainChartInstance = echarts.init(mainChart.value);
      }

      // 准备图表数据
      const dates = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - 11 + i);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      });

      const populationData = Array.from(
        { length: 12 },
        () => Math.floor(Math.random() * 50) + 1000
      );
      const financialData = Array.from(
        { length: 12 },
        () => Math.floor(Math.random() * 100000) + 50000
      );

      const option = {
        title: {
          text: '数据趋势概览',
          left: 'center',
        },
        tooltip: {
          trigger: 'axis',
        },
        legend: {
          data: ['人口', '财务收入'],
          top: 30,
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: dates,
        },
        yAxis: [
          {
            type: 'value',
            name: '人口数量',
          },
          {
            type: 'value',
            name: '财务金额',
          },
        ],
        series: [
          {
            name: '人口',
            type: chartType.value === 'area' ? 'line' : chartType.value,
            data: populationData,
            smooth: true,
            areaStyle: chartType.value === 'area' ? {} : null,
          },
          {
            name: '财务收入',
            type: chartType.value === 'area' ? 'line' : chartType.value,
            yAxisIndex: 1,
            data: financialData,
            smooth: true,
            areaStyle: chartType.value === 'area' ? {} : null,
          },
        ],
      };

      mainChartInstance.setOption(option);
    };

    const updatePopulationChart = () => {
      if (!populationChart.value || !dashboardData.population?.data?.demographics) return;

      if (!populationChartInstance) {
        populationChartInstance = echarts.init(populationChart.value);
      }

      const demographics = dashboardData.population.data.demographics;
      const ageData = [
        { name: '未成年', value: demographics.ageRatio.minors || 0 },
        { name: '青年', value: demographics.ageRatio.youth || 0 },
        { name: '中年', value: demographics.ageRatio.working || 0 },
        { name: '老年', value: demographics.ageRatio.elderly || 0 },
      ];

      const option = {
        title: {
          text: '年龄结构分布',
          left: 'center',
        },
        tooltip: {
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)',
        },
        series: [
          {
            type: 'pie',
            radius: '60%',
            data: ageData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      };

      populationChartInstance.setOption(option);
    };

    const updateFinancialChart = () => {
      if (!financialChart.value || !dashboardData.financial?.data?.trends) return;

      if (!financialChartInstance) {
        financialChartInstance = echarts.init(financialChart.value);
      }

      const trends = dashboardData.financial.data.trends;
      const dates = trends.map(item => item.date);
      const incomeData = trends.map(item => item.income);
      const expenseData = trends.map(item => item.expense);

      const option = {
        title: {
          text: '财务收支趋势',
          left: 'center',
        },
        tooltip: {
          trigger: 'axis',
        },
        legend: {
          data: ['收入', '支出'],
          top: 30,
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: dates,
        },
        yAxis: {
          type: 'value',
        },
        series: [
          {
            name: '收入',
            type: 'bar',
            data: incomeData,
            itemStyle: { color: '#67c23a' },
          },
          {
            name: '支出',
            type: 'bar',
            data: expenseData,
            itemStyle: { color: '#f56c6c' },
          },
        ],
      };

      financialChartInstance.setOption(option);
    };

    const refreshData = () => {
      loadDashboardData();
    };

    const onTimeRangeChange = () => {
      loadDashboardData();
    };

    const onCategoriesChange = () => {
      loadDashboardData();
    };

    const handleExport = format => {
      ElMessageBox.prompt('请选择报表类型', '导出报表', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputType: 'select',
        inputOptions: [
          { value: 'dashboard', label: '综合仪表板' },
          { value: 'population', label: '人口统计' },
          { value: 'financial', label: '财务分析' },
          { value: 'governance', label: '村务治理' },
          { value: 'emergency', label: '应急管理' },
        ],
      })
        .then(({ value }) => {
          exportReport(value, format);
        })
        .catch(() => {});
    };

    const exportReport = async (reportType, format) => {
      try {
        const response = await fetch('/api/v1/analytics/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportType,
            format,
            filters: {
              timeRange: filters.timeRange,
            },
          }),
        });

        if (response.ok) {
          if (format === 'json') {
            const result = await response.json();
            const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
            downloadFile(
              blob,
              `${reportType}_report_${new Date().toISOString().split('T')[0]}.json`
            );
          } else {
            const blob = await response.blob();
            downloadFile(
              blob,
              response.headers.get('Content-Disposition').split('filename=')[1].replace(/"/g, '')
            );
          }
          ElMessage.success('报表导出成功');
        } else {
          ElMessage.error('报表导出失败');
        }
      } catch (error) {
        console.error('导出报表失败:', error);
        ElMessage.error('导出报表失败，请稍后重试');
      }
    };

    const downloadFile = (blob, filename) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    };

    const exportTableData = () => {
      exportReport('dashboard', 'csv');
    };

    const generateCustomReport = async () => {
      try {
        customReportLoading.value = true;

        const response = await fetch('/api/v1/analytics/custom-query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            collections: customReport.collections,
            timeRange: customReport.timeRange,
          }),
        });

        const result = await response.json();

        if (result.success) {
          ElMessage.success('自定义报表生成成功');
          customReportVisible.value = false;

          // 下载报表数据
          const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
          downloadFile(blob, `custom_report_${new Date().toISOString().split('T')[0]}.json`);
        } else {
          ElMessage.error('生成报表失败: ' + result.message);
        }
      } catch (error) {
        console.error('生成自定义报表失败:', error);
        ElMessage.error('生成报表失败，请稍后重试');
      } finally {
        customReportLoading.value = false;
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

    const getFinancialClass = amount => {
      return amount >= 0 ? 'text-success' : 'text-danger';
    };

    const getGovernanceStat = (category, field) => {
      const data = dashboardData.governance?.data?.[category];
      if (!data || !Array.isArray(data)) return 0;
      return data.reduce((sum, item) => sum + (item[field] || 0), 0);
    };

    const calculateTaskCompletion = () => {
      const tasks = dashboardData.governance?.data?.tasks;
      if (!tasks || !Array.isArray(tasks)) return 0;

      const completed = tasks.find(t => t._id === 'completed')?.count || 0;
      const total = tasks.reduce((sum, t) => sum + t.count, 0);

      return total > 0 ? Math.round((completed / total) * 100) : 0;
    };

    const setupRealTimeConnection = () => {
      const eventSource = new EventSource('/api/v1/analytics/realtime?category=all');

      eventSource.onopen = () => {
        realtimeConnections.value++;
        console.log('实时数据连接已建立');
      };

      eventSource.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          if (data.success) {
            Object.assign(dashboardData, data.data);
            updateKeyStats();
            updateTableData();
          }
        } catch (error) {
          console.error('解析实时数据失败:', error);
        }
      };

      eventSource.onerror = error => {
        console.error('实时数据连接错误:', error);
        realtimeConnections.value = Math.max(0, realtimeConnections.value - 1);
      };

      // 组件卸载时清理连接
      return () => {
        eventSource.close();
        realtimeConnections.value = Math.max(0, realtimeConnections.value - 1);
      };
    };

    // 生命周期
    onMounted(async () => {
      await loadDashboardData();

      // 设置窗口大小变化监听
      const handleResize = () => {
        mainChartInstance?.resize();
        populationChartInstance?.resize();
        financialChartInstance?.resize();
      };
      window.addEventListener('resize', handleResize);

      // 设置实时数据连接
      const cleanupRealtime = setupRealTimeConnection();

      // 组件卸载时清理
      onUnmounted(() => {
        window.removeEventListener('resize', handleResize);
        cleanupRealtime?.();

        // 销毁图表实例
        mainChartInstance?.dispose();
        populationChartInstance?.dispose();
        financialChartInstance?.dispose();
      });
    });

    return {
      // 响应式数据
      loading,
      tableLoading,
      customReportLoading,
      customReportVisible,
      realtimeConnections,
      lastUpdateTime,
      chartType,
      activeTab,
      tableSearch,
      filters,
      systemStatus,
      dashboardData,
      keyStats,
      tableData,
      customReport,
      filteredTableData,

      // DOM引用
      mainChart,
      populationChart,
      financialChart,

      // 方法
      refreshData,
      onTimeRangeChange,
      onCategoriesChange,
      handleExport,
      exportTableData,
      generateCustomReport,
      formatNumber,
      formatMoney,
      getFinancialClass,
      getGovernanceStat,
      calculateTaskCompletion,
    };
  },
};
</script>

<style scoped>
.data-analytics-dashboard {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.title-section h2 {
  margin: 0;
  color: #303133;
  font-size: 24px;
}

.subtitle {
  margin: 5px 0 0 0;
  color: #909399;
  font-size: 14px;
}

.filter-form {
  margin: 0;
}

.status-bar {
  display: flex;
  gap: 30px;
  margin-bottom: 20px;
  padding: 15px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.status-item {
  display: flex;
  align-items: center;
}

.status-label {
  color: #606266;
  margin-right: 8px;
}

.status-value {
  color: #303133;
  font-weight: 500;
}

.stats-cards {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.stat-card {
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.stat-card.primary {
  border-left: 4px solid #409eff;
}

.stat-card.success {
  border-left: 4px solid #67c23a;
}

.stat-card.warning {
  border-left: 4px solid #e6a23c;
}

.stat-card.danger {
  border-left: 4px solid #f56c6c;
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 10px;
}

.stat-icon {
  font-size: 32px;
  margin-right: 15px;
  opacity: 0.8;
}

.stat-card.primary .stat-icon {
  color: #409eff;
}

.stat-card.success .stat-icon {
  color: #67c23a;
}

.stat-card.warning .stat-icon {
  color: #e6a23c;
}

.stat-card.danger .stat-icon {
  color: #f56c6c;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin: 5px 0;
}

.stat-trend {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.stat-trend.up {
  color: #67c23a;
}

.stat-trend.down {
  color: #f56c6c;
}

.chart-card,
.details-card {
  height: 400px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  width: 100%;
  height: 320px;
}

.data-panel {
  padding: 10px 0;
}

.data-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.data-item:last-child {
  border-bottom: none;
}

.data-label {
  color: #606266;
  font-size: 14px;
}

.data-value {
  color: #303133;
  font-weight: 500;
  font-size: 14px;
}

.text-success {
  color: #67c23a;
}

.text-danger {
  color: #f56c6c;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.el-card__header) {
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-tabs__content) {
  padding: 10px 0;
}

:deep(.el-table) {
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .status-bar {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .data-analytics-dashboard {
    padding: 10px;
  }

  .stats-cards {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 10px;
  }

  .stat-card {
    min-width: 200px;
    flex-shrink: 0;
  }
}
</style>
