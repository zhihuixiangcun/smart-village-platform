<template>
  <div class="security-management">
    <!-- 顶部统计卡片 -->
    <div class="security-header">
      <h1>安全综合管理平台</h1>
      <div class="score-display">
        <div class="overall-score" :class="getScoreClass(overallScore)">
          <div class="score-circle">
            <span class="score-value">{{ overallScore }}</span>
          </div>
          <div class="score-label">总体安全评分</div>
        </div>
      </div>
    </div>

    <!-- 安全模块状态 -->
    <div class="security-modules">
      <el-row :gutter="24">
        <el-col :span="6" v-for="module in securityModules" :key="module.key">
          <el-card class="module-card" :class="module.status">
            <div class="module-header">
              <el-icon :class="module.icon">
                <component :is="module.icon" />
              </el-icon>
              <h3>{{ module.title }}</h3>
              <el-tag :type="module.status === 'active' ? 'success' : 'danger'">
                {{ module.status === 'active' ? '运行中' : '异常' }}
              </el-tag>
            </div>

            <div class="module-metrics">
              <div v-for="metric in module.metrics" :key="metric.label" class="metric">
                <span class="metric-value">{{ metric.value }}</span>
                <span class="metric-label">{{ metric.label }}</span>
              </div>
            </div>

            <div class="module-actions">
              <el-button
                type="primary"
                size="small"
                @click="openModuleDetail(module.key)"
                :disabled="module.status !== 'active'"
              >
                查看详情
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 安全告警 -->
    <div class="security-alerts" v-if="alerts.length > 0">
      <h2>安全告警</h2>
      <el-row :gutter="16">
        <el-col :span="8" v-for="alert in alerts" :key="alert.module">
          <el-alert
            :title="alert.message"
            :type="alert.level === 'critical' ? 'error' : 'warning'"
            :closable="false"
            show-icon
          >
            <template #default>
              <p>模块: {{ alert.module }}</p>
              <p>建议操作: {{ getActionText(alert.action) }}</p>
              <el-button type="text" size="small" @click="handleAlert(alert)"> 立即处理 </el-button>
            </template>
          </el-alert>
        </el-col>
      </el-row>
    </div>

    <!-- 实时监控图表 -->
    <div class="security-charts">
      <el-row :gutter="24">
        <el-col :span="12">
          <el-card title="安全趋势">
            <template #title>
              <div class="card-title">
                <el-icon><TrendCharts /></el-icon>
                <span>安全趋势</span>
              </div>
            </template>
            <div ref="securityTrendChart" class="chart-container"></div>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card title="威胁统计">
            <template #title>
              <div class="card-title">
                <el-icon><Warning /></el-icon>
                <span>威胁统计</span>
              </div>
            </template>
            <div ref="threatStatsChart" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 最近活动 -->
    <div class="recent-activities">
      <el-card title="最近安全活动">
        <template #title>
          <div class="card-title">
            <el-icon><Clock /></el-icon>
            <span>最近安全活动</span>
          </div>
        </template>
        <el-timeline>
          <el-timeline-item
            v-for="activity in recentActivities"
            :key="activity.timestamp"
            :timestamp="formatDate(activity.timestamp)"
            :type="getActivityType(activity.type)"
          >
            <div class="activity-content">
              <span class="activity-description">{{ activity.description }}</span>
              <span class="activity-user">操作者: {{ activity.user }}</span>
            </div>
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions">
      <el-card title="快速操作">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-button
              type="primary"
              :icon="Refresh"
              @click="refreshSecurityData"
              :loading="refreshing"
            >
              刷新数据
            </el-button>
          </el-col>
          <el-col :span="6">
            <el-button type="success" :icon="Document" @click="generateReport">
              生成报告
            </el-button>
          </el-col>
          <el-col :span="6">
            <el-button type="warning" :icon="Setting" @click="openSettings"> 安全配置 </el-button>
          </el-col>
          <el-col :span="6">
            <el-button type="danger" :icon="Bell" @click="testAlerts"> 测试告警 </el-button>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <!-- 模块详情对话框 -->
    <el-dialog
      v-model="moduleDetailVisible"
      :title="getModuleDetailTitle()"
      width="80%"
      destroy-on-close
    >
      <component
        :is="currentModuleComponent"
        v-if="currentModuleComponent"
        :module-data="currentModuleData"
        @refresh="refreshModuleData"
      />
    </el-dialog>

    <!-- 生成报告对话框 -->
    <el-dialog v-model="reportDialogVisible" title="生成安全报告" width="50%">
      <el-form :model="reportForm" label-width="120px">
        <el-form-item label="报告类型">
          <el-select v-model="reportForm.reportType" placeholder="选择报告类型">
            <el-option label="综合安全报告" value="comprehensive" />
            <el-option label="合规报告" value="compliance" />
            <el-option label="加密报告" value="encryption" />
            <el-option label="防诈骗报告" value="fraud" />
            <el-option label="隐私报告" value="privacy" />
          </el-select>
        </el-form-item>

        <el-form-item label="输出格式">
          <el-radio-group v-model="reportForm.format">
            <el-radio label="json">JSON</el-radio>
            <el-radio label="pdf">PDF</el-radio>
            <el-radio label="excel">Excel</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="时间范围">
          <el-date-picker
            v-model="reportForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="reportDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="downloadReport" :loading="generatingReport">
          生成并下载
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import * as echarts from 'echarts';
import axios from 'axios';

// 导入图标
import {
  Lock,
  Warning,
  UserFilled,
  TrendCharts,
  Clock, // Lock 替代 Shield
  Refresh,
  Document,
  Setting,
  Bell,
  DataAnalysis,
  Key,
  Monitor,
  View,
  Eye,
} from '@element-plus/icons-vue';

// 导入子组件
import ComplianceModule from './components/ComplianceModule.vue';
import EncryptionModule from './components/EncryptionModule.vue';
import AntiFraudModule from './components/AntiFraudModule.vue';
import PrivacyModule from './components/PrivacyModule.vue';

// 响应式数据
const refreshing = ref(false);
const generatingReport = ref(false);
const moduleDetailVisible = ref(false);
const reportDialogVisible = ref(false);
const currentModuleComponent = ref(null);
const currentModuleData = ref(null);

// 图表引用
const securityTrendChart = ref(null);
const threatStatsChart = ref(null);

// 安全数据
const securityData = reactive({
  overallSecurityScore: 0,
  modules: {},
  alerts: [],
  recentActivities: [],
});

// 计算属性
const overallScore = computed(() => securityData.overallSecurityScore);
const alerts = computed(() => securityData.alerts);
const recentActivities = computed(() => securityData.recentActivities);

// 安全模块配置
const securityModules = computed(() => [
  {
    key: 'compliance',
    title: '等保合规',
    icon: 'Lock', // 替代 Shield
    status: securityData.modules.compliance?.status || 'inactive',
    score: securityData.modules.compliance?.score || 0,
    metrics: [
      { label: '合规分数', value: securityData.modules.compliance?.score || 0 },
      { label: '风险项', value: securityData.modules.compliance?.issues || 0 },
      { label: '保护级别', value: securityData.modules.compliance?.level || 'L2' },
    ],
  },
  {
    key: 'encryption',
    title: '数据加密',
    icon: 'Lock',
    status: securityData.modules.encryption?.status || 'inactive',
    score: securityData.modules.encryption?.performance ? 80 : 0,
    metrics: [
      { label: '密钥数量', value: securityData.modules.encryption?.keyCount || 0 },
      { label: '加密文件', value: securityData.modules.encryption?.encryptedFiles || 0 },
      { label: '算法', value: securityData.modules.encryption?.algorithms?.length || 0 },
    ],
  },
  {
    key: 'antiFraud',
    title: '防诈骗系统',
    icon: 'Warning',
    status: securityData.modules.antiFraud?.status || 'inactive',
    score: securityData.modules.antiFraud?.detectedFrauds ? 75 : 0,
    metrics: [
      { label: '检测次数', value: securityData.modules.antiFraud?.detectedFrauds || 0 },
      { label: '阻止尝试', value: securityData.modules.antiFraud?.blockedAttempts || 0 },
      { label: '举报数', value: securityData.modules.antiFraud?.totalReports || 0 },
    ],
  },
  {
    key: 'privacy',
    title: '隐私保护',
    icon: 'UserFilled',
    status: securityData.modules.privacy?.status || 'inactive',
    score: securityData.modules.privacy?.totalConsents ? 85 : 0,
    metrics: [
      { label: '用户同意', value: securityData.modules.privacy?.totalConsents || 0 },
      { label: '审计记录', value: securityData.modules.privacy?.activeAudits || 0 },
      { label: '匿名记录', value: securityData.modules.privacy?.anonymizedRecords || 0 },
    ],
  },
]);

// 报告表单
const reportForm = reactive({
  reportType: 'comprehensive',
  format: 'json',
  dateRange: [],
});

// 方法
const getScoreClass = score => {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'warning';
  return 'danger';
};

const getActionText = action => {
  const actionMap = {
    immediate: '立即处理',
    investigate: '调查处理',
    monitor: '持续监控',
  };
  return actionMap[action] || action;
};

const getActivityType = type => {
  const typeMap = {
    encryption: 'primary',
    compliance: 'success',
    fraud_detection: 'warning',
    privacy: 'info',
  };
  return typeMap[type] || 'primary';
};

const formatDate = timestamp => {
  return new Date(timestamp).toLocaleString('zh-CN');
};

const getModuleDetailTitle = () => {
  const module = securityModules.value.find(m => m.key === currentModuleData.value?.key);
  return module ? `${module.title}详情` : '模块详情';
};

// 获取安全仪表板数据
const fetchSecurityData = async () => {
  try {
    const response = await axios.get('/api/v1/security/dashboard');

    if (response.data.success) {
      Object.assign(securityData, response.data.data);

      // 更新图表
      nextTick(() => {
        updateSecurityTrendChart();
        updateThreatStatsChart();
      });
    }
  } catch (error) {
    console.error('获取安全数据失败:', error);
    ElMessage.error('获取安全数据失败');
  }
};

// 刷新安全数据
const refreshSecurityData = async () => {
  refreshing.value = true;
  try {
    await fetchSecurityData();
    ElMessage.success('数据刷新成功');
  } catch (error) {
    ElMessage.error('数据刷新失败');
  } finally {
    refreshing.value = false;
  }
};

// 打开模块详情
const openModuleDetail = moduleKey => {
  const module = securityModules.value.find(m => m.key === moduleKey);
  if (!module) return;

  currentModuleData.value = {
    key: moduleKey,
    ...securityData.modules[moduleKey],
  };

  // 选择对应的组件
  const componentMap = {
    compliance: ComplianceModule,
    encryption: EncryptionModule,
    antiFraud: AntiFraudModule,
    privacy: PrivacyModule,
  };

  currentModuleComponent.value = componentMap[moduleKey];
  moduleDetailVisible.value = true;
};

// 刷新模块数据
const refreshModuleData = async moduleKey => {
  await fetchSecurityData();
  if (moduleKey) {
    openModuleDetail(moduleKey);
  }
};

// 处理告警
const handleAlert = async alert => {
  try {
    await ElMessageBox.confirm(`是否处理 ${alert.module} 模块的告警？`, '确认处理', {
      confirmButtonText: '立即处理',
      cancelButtonText: '稍后处理',
      type: 'warning',
    });

    // 调用告警处理API
    await axios.post('/api/v1/security/incident-response', {
      incidentType: alert.module,
      severity: alert.level,
      description: alert.message,
      action: alert.action,
    });

    ElMessage.success('告警已处理');
    await fetchSecurityData();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('处理告警失败:', error);
      ElMessage.error('处理告警失败');
    }
  }
};

// 生成报告
const generateReport = () => {
  reportDialogVisible.value = true;
};

// 下载报告
const downloadReport = async () => {
  generatingReport.value = true;
  try {
    const response = await axios.post('/api/v1/security/generate-report', reportForm, {
      responseType: reportForm.format === 'json' ? 'json' : 'blob',
    });

    if (reportForm.format === 'json') {
      // JSON格式直接下载
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `security_report_${Date.now()}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
    } else {
      // PDF/Excel格式
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `security_report_${Date.now()}.${reportForm.format}`;
      link.click();
      window.URL.revokeObjectURL(url);
    }

    ElMessage.success('报告生成成功');
    reportDialogVisible.value = false;
  } catch (error) {
    console.error('生成报告失败:', error);
    ElMessage.error('生成报告失败');
  } finally {
    generatingReport.value = false;
  }
};

// 打开设置
const openSettings = () => {
  // 打开安全配置对话框
  ElMessage.info('安全配置功能开发中');
};

// 测试告警
const testAlerts = () => {
  // 模拟告警测试
  ElMessage.success('告警测试功能已触发');
};

// 更新安全趋势图表
const updateSecurityTrendChart = () => {
  if (!securityTrendChart.value) return;

  const chart = echarts.init(securityTrendChart.value);

  const option = {
    title: {
      text: '安全评分趋势',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月'],
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
    },
    series: [
      {
        name: '安全评分',
        type: 'line',
        data: [65, 68, 72, 78, 82, overallScore.value],
        smooth: true,
        lineStyle: {
          color: '#409EFF',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(64, 158, 255, 0.4)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.05)' },
            ],
          },
        },
      },
    ],
  };

  chart.setOption(option);
};

// 更新威胁统计图表
const updateThreatStatsChart = () => {
  if (!threatStatsChart.value) return;

  const chart = echarts.init(threatStatsChart.value);

  const threatData = [
    { name: '钓鱼攻击', value: 23 },
    { name: '恶意软件', value: 18 },
    { name: '数据泄露', value: 12 },
    { name: '内部威胁', value: 8 },
    { name: '其他威胁', value: 15 },
  ];

  const option = {
    title: {
      text: '威胁类型分布',
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    series: [
      {
        name: '威胁统计',
        type: 'pie',
        radius: '50%',
        data: threatData,
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

  chart.setOption(option);
};

// 生命周期
onMounted(async () => {
  await fetchSecurityData();

  // 设置定时刷新
  setInterval(fetchSecurityData, 60000); // 每分钟刷新一次
});
</script>

<style scoped>
.security-management {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.security-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.security-header h1 {
  color: #303133;
  font-size: 28px;
  font-weight: 600;
}

.score-display {
  display: flex;
  align-items: center;
}

.overall-score {
  text-align: center;
  padding: 16px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
  position: relative;
  overflow: hidden;
}

.score-circle::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  background: conic-gradient(
    #409eff 0deg,
    #409eff calc(var(--score) * 3.6deg),
    #e4e7ed calc(var(--score) * 3.6deg)
  );
  -webkit-mask: radial-gradient(circle at center, transparent 65%, white 65%);
  mask: radial-gradient(circle at center, transparent 65%, white 65%);
}

.score-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  position: relative;
  z-index: 1;
}

.score-label {
  font-size: 14px;
  color: #606266;
}

.overall-score.excellent .score-circle::before {
  background: conic-gradient(
    #67c23a 0deg,
    #67c23a calc(var(--score) * 3.6deg),
    #e4e7ed calc(var(--score) * 3.6deg)
  );
}

.overall-score.good .score-circle::before {
  background: conic-gradient(
    #409eff 0deg,
    #409eff calc(var(--score) * 3.6deg),
    #e4e7ed calc(var(--score) * 3.6deg)
  );
}

.overall-score.warning .score-circle::before {
  background: conic-gradient(
    #e6a23c 0deg,
    #e6a23c calc(var(--score) * 3.6deg),
    #e4e7ed calc(var(--score) * 3.6deg)
  );
}

.overall-score.danger .score-circle::before {
  background: conic-gradient(
    #f56c6c 0deg,
    #f56c6c calc(var(--score) * 3.6deg),
    #e4e7ed calc(var(--score) * 3.6deg)
  );
}

.security-modules {
  margin-bottom: 24px;
}

.module-card {
  height: 200px;
  transition:
    transform 0.3s,
    box-shadow 0.3s;
}

.module-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.module-card.active {
  border-left: 4px solid #67c23a;
}

.module-card.error {
  border-left: 4px solid #f56c6c;
}

.module-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.module-header .el-icon {
  font-size: 24px;
  margin-right: 8px;
  color: #409eff;
}

.module-header h3 {
  flex: 1;
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.module-metrics {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.metric {
  text-align: center;
}

.metric-value {
  display: block;
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.metric-label {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.module-actions {
  text-align: center;
}

.security-alerts {
  margin-bottom: 24px;
}

.security-alerts h2 {
  margin-bottom: 16px;
  color: #303133;
  font-size: 20px;
}

.security-charts {
  margin-bottom: 24px;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.recent-activities {
  margin-bottom: 24px;
}

.card-title {
  display: flex;
  align-items: center;
}

.card-title .el-icon {
  margin-right: 8px;
  color: #409eff;
}

.activity-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.activity-description {
  font-weight: 500;
  color: #303133;
}

.activity-user {
  font-size: 12px;
  color: #909399;
}

.quick-actions {
  margin-bottom: 24px;
}

.quick-actions .el-row {
  text-align: center;
}

:deep(.el-card__header) {
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-timeline-item__content) {
  padding-left: 0;
}

:deep(.el-alert) {
  margin-bottom: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .security-header {
    flex-direction: column;
    text-align: center;
  }

  .score-display {
    margin-top: 16px;
  }

  .security-modules .el-col {
    margin-bottom: 16px;
  }

  .module-metrics {
    flex-direction: column;
    gap: 8px;
  }

  .chart-container {
    height: 250px;
  }
}
</style>
