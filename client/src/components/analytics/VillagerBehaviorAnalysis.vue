<template>
  <div class="villager-behavior-analysis">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1>村民行为分析</h1>
        <p class="description">深入了解村民行为模式，优化服务体验</p>
      </div>
      <div class="header-actions">
        <el-button @click="generateReport" type="primary" :loading="reportGenerating">
          <i class="el-icon-document"></i>
          生成分析报告
        </el-button>
        <el-button @click="exportData" type="success">
          <i class="el-icon-download"></i>
          导出数据
        </el-button>
      </div>
    </div>

    <!-- 分析维度选择 -->
    <div class="analysis-tabs">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="活跃度分析" name="activity">
          <ActivityAnalysis ref="activityAnalysis" />
        </el-tab-pane>
        <el-tab-pane label="偏好分析" name="preference">
          <PreferenceAnalysis ref="preferenceAnalysis" />
        </el-tab-pane>
        <el-tab-pane label="行为预测" name="prediction">
          <BehaviorPrediction ref="behaviorPrediction" />
        </el-tab-pane>
        <el-tab-pane label="用户画像" name="persona">
          <UserPersona ref="userPersona" />
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 报告对话框 -->
    <el-dialog v-model="reportDialogVisible" title="分析报告" width="80%" top="5vh">
      <div class="report-content" v-loading="reportGenerating">
        <div v-if="reportData" class="report-sections">
          <!-- 报告摘要 -->
          <div class="report-section summary">
            <h3>报告摘要</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="metric-value">{{ reportData.summary.keyMetrics.activeUsers }}</div>
                <div class="metric-label">活跃用户</div>
              </div>
              <div class="summary-item">
                <div class="metric-value">
                  {{ (reportData.summary.keyMetrics.retentionRate * 100).toFixed(1) }}%
                </div>
                <div class="metric-label">留存率</div>
              </div>
              <div class="summary-item">
                <div class="metric-value">
                  {{ reportData.summary.keyMetrics.avgSessionDuration }}分钟
                </div>
                <div class="metric-label">平均使用时长</div>
              </div>
              <div class="summary-item">
                <div class="metric-value">
                  {{ reportData.summary.keyMetrics.userSatisfaction }}/5.0
                </div>
                <div class="metric-label">用户满意度</div>
              </div>
            </div>

            <div class="key-findings">
              <h4>关键发现</h4>
              <ul>
                <li v-for="finding in reportData.summary.topFindings" :key="finding">
                  {{ finding }}
                </li>
              </ul>
            </div>
          </div>

          <!-- 详细章节 -->
          <div v-for="section in reportData.sections" :key="section.title" class="report-section">
            <h3>{{ section.title }}</h3>
            <div class="section-content">
              <div class="insights-list">
                <div v-for="insight in section.keyInsights" :key="insight" class="insight-item">
                  <i class="el-icon-info"></i>
                  {{ insight }}
                </div>
              </div>
            </div>
          </div>

          <!-- 建议措施 -->
          <div class="report-section recommendations">
            <h3>建议措施</h3>
            <div class="recommendations-grid">
              <div class="recommendation-category">
                <h4>短期措施</h4>
                <ul>
                  <li v-for="item in reportData.recommendations.shortTerm" :key="item">
                    {{ item }}
                  </li>
                </ul>
              </div>
              <div class="recommendation-category">
                <h4>中期措施</h4>
                <ul>
                  <li v-for="item in reportData.recommendations.mediumTerm" :key="item">
                    {{ item }}
                  </li>
                </ul>
              </div>
              <div class="recommendation-category">
                <h4>长期措施</h4>
                <ul>
                  <li v-for="item in reportData.recommendations.longTerm" :key="item">
                    {{ item }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="reportDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="downloadReport">下载报告</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import ActivityAnalysis from './components/ActivityAnalysis.vue';
import PreferenceAnalysis from './components/PreferenceAnalysis.vue';
import BehaviorPrediction from './components/BehaviorPrediction.vue';
import UserPersona from './components/UserPersona.vue';

export default {
  name: 'VillagerBehaviorAnalysis',
  components: {
    ActivityAnalysis,
    PreferenceAnalysis,
    BehaviorPrediction,
    UserPersona,
  },
  setup() {
    // 响应式数据
    const activeTab = ref('activity');
    const reportDialogVisible = ref(false);
    const reportGenerating = ref(false);
    const reportData = ref(null);

    // 组件引用
    const activityAnalysis = ref(null);
    const preferenceAnalysis = ref(null);
    const behaviorPrediction = ref(null);
    const userPersona = ref(null);

    // 方法
    const handleTabChange = tabName => {
      // 根据切换的标签页加载数据
      nextTick(() => {
        switch (tabName) {
          case 'activity':
            activityAnalysis.value?.loadData();
            break;
          case 'preference':
            preferenceAnalysis.value?.loadData();
            break;
          case 'prediction':
            behaviorPrediction.value?.loadData();
            break;
          case 'persona':
            userPersona.value?.loadData();
            break;
        }
      });
    };

    const generateReport = async () => {
      try {
        reportGenerating.value = true;

        const response = await fetch('/api/v1/analytics/behavior/report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportType: 'comprehensive',
          }),
        });

        const result = await response.json();

        if (result.success) {
          reportData.value = result.data;
          reportDialogVisible.value = true;
          ElMessage.success('报告生成成功');
        } else {
          ElMessage.error('生成报告失败: ' + result.message);
        }
      } catch (error) {
        console.error('生成报告失败:', error);
        ElMessage.error('生成报告失败，请稍后重试');
      } finally {
        reportGenerating.value = false;
      }
    };

    const exportData = async () => {
      try {
        const response = await fetch('/api/v1/analytics/behavior/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            format: 'excel',
            dataTypes: ['activity', 'preference', 'prediction'],
          }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `村民行为分析数据_${new Date().toISOString().split('T')[0]}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          ElMessage.success('数据导出成功');
        } else {
          ElMessage.error('导出数据失败');
        }
      } catch (error) {
        console.error('导出数据失败:', error);
        ElMessage.error('导出数据失败，请稍后重试');
      }
    };

    const downloadReport = () => {
      if (!reportData.value) return;

      const reportContent = JSON.stringify(reportData.value, null, 2);
      const blob = new Blob([reportContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `村民行为分析报告_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      ElMessage.success('报告下载成功');
    };

    // 生命周期
    onMounted(() => {
      // 初始加载活跃度分析数据
      handleTabChange('activity');
    });

    return {
      // 响应式数据
      activeTab,
      reportDialogVisible,
      reportGenerating,
      reportData,

      // 组件引用
      activityAnalysis,
      preferenceAnalysis,
      behaviorPrediction,
      userPersona,

      // 方法
      handleTabChange,
      generateReport,
      exportData,
      downloadReport,
    };
  },
};
</script>

<style scoped>
.villager-behavior-analysis {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.header-content h1 {
  margin: 0 0 10px 0;
  font-size: 28px;
  font-weight: bold;
}

.description {
  margin: 0;
  opacity: 0.9;
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 15px;
}

.analysis-tabs {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 报告对话框样式 */
.report-content {
  max-height: 70vh;
  overflow-y: auto;
}

.report-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.report-section:last-child {
  border-bottom: none;
}

.report-section h3 {
  color: #303133;
  font-size: 18px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.report-section h3::before {
  content: '';
  width: 4px;
  height: 18px;
  background: #409eff;
  border-radius: 2px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.summary-item {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.metric-value {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}

.metric-label {
  font-size: 14px;
  color: #606266;
}

.key-findings {
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 8px;
  padding: 20px;
}

.key-findings h4 {
  margin: 0 0 15px 0;
  color: #e6a23c;
}

.key-findings ul {
  margin: 0;
  padding-left: 20px;
}

.key-findings li {
  margin-bottom: 8px;
  color: #606266;
  line-height: 1.5;
}

.insights-list {
  display: grid;
  gap: 15px;
}

.insight-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  background: #f0f9ff;
  border-left: 4px solid #409eff;
  border-radius: 4px;
  color: #606266;
}

.insight-item i {
  color: #409eff;
  font-size: 18px;
}

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.recommendation-category {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.recommendation-category h4 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 16px;
}

.recommendation-category ul {
  margin: 0;
  padding-left: 20px;
}

.recommendation-category li {
  margin-bottom: 8px;
  color: #606266;
  line-height: 1.5;
}

/* 滚动条样式 */
.report-content::-webkit-scrollbar {
  width: 6px;
}

.report-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.report-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.report-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    padding: 20px;
  }

  .header-content h1 {
    font-size: 24px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .recommendations-grid {
    grid-template-columns: 1fr;
  }
}
</style>
