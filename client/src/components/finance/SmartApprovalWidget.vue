<template>
  <div class="smart-approval-widget">
    <!-- 加载状态 -->
    <el-skeleton v-if="loading" :rows="4" animated />

    <!-- 审批建议内容 -->
    <div v-else-if="suggestion" class="approval-suggestion">
      <!-- 风险等级指示器 -->
      <div class="risk-indicator">
        <div class="risk-level" :class="`risk-${suggestion.riskLevel}`">
          <div class="risk-icon">
            <el-icon size="24">
              <component :is="getRiskIcon(suggestion.riskLevel)" />
            </el-icon>
          </div>
          <div class="risk-info">
            <div class="risk-title">{{ getRiskTitle(suggestion.riskLevel) }}</div>
            <div class="risk-score">风险评分: {{ suggestion.riskScore }}/100</div>
          </div>
        </div>
        <div class="confidence-badge">
          <span class="confidence-text">AI建议置信度</span>
          <el-progress
            :percentage="suggestion.recommendation.confidence"
            :color="getConfidenceColor(suggestion.recommendation.confidence)"
            :show-text="false"
            :stroke-width="4"
          />
          <span class="confidence-value">{{ suggestion.recommendation.confidence }}%</span>
        </div>
      </div>

      <!-- 主要建议 -->
      <div class="main-recommendation">
        <div class="recommendation-header">
          <h4>🤖 AI审批建议</h4>
          <el-tag
            :type="getActionType(suggestion.recommendation.action)"
            size="large"
            class="action-tag"
          >
            {{ getActionText(suggestion.recommendation.action) }}
          </el-tag>
        </div>
        <p class="recommendation-reason">{{ suggestion.recommendation.reason }}</p>
        <div class="recommendation-meta">
          <span class="meta-item">
            <el-icon><Clock /></el-icon>
            预计审批时间: {{ suggestion.estimatedApprovalTime }}小时
          </span>
          <span class="meta-item">
            <el-icon><User /></el-icon>
            所需审批人员: {{ suggestion.requiredApprovers.join('、') }}
          </span>
        </div>
      </div>

      <!-- 风险因素详情 -->
      <div v-if="suggestion.riskFactors.length > 0" class="risk-factors">
        <h4>🔍 风险因素分析</h4>
        <div class="risk-factor-list">
          <div
            v-for="(factor, index) in suggestion.riskFactors"
            :key="index"
            class="risk-factor-item"
            :class="`factor-${factor.level}`"
          >
            <div class="factor-header">
              <span class="factor-type">{{ getFactorTypeText(factor.type) }}</span>
              <el-tag :type="getFactorLevel(factor.score)" size="small">
                {{ factor.score }}分
              </el-tag>
            </div>
            <p class="factor-message">{{ factor.message }}</p>
          </div>
        </div>
      </div>

      <!-- 历史案例参考 -->
      <div v-if="suggestion.similarCases.length > 0" class="historical-insight">
        <h4>📊 历史案例分析</h4>
        <div class="insight-summary">
          <div class="insight-stats">
            <div class="stat-item">
              <span class="stat-label">相似案例</span>
              <span class="stat-value">{{ suggestion.similarCases.length }}件</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">历史通过率</span>
              <span class="stat-value success">{{ suggestion.historicalInsight.approvalRate }}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">平均审批时长</span>
              <span class="stat-value">{{ suggestion.historicalInsight.averageApprovalTime }}h</span>
            </div>
          </div>
          <p class="insight-recommendation">{{ suggestion.historicalInsight.recommendation }}</p>
        </div>

        <!-- 展开查看相似案例 -->
        <el-collapse v-model="activeCollapse" class="similar-cases-collapse">
          <el-collapse-item title="查看相似案例详情" name="similar-cases">
            <div class="similar-cases-list">
              <div
                v-for="(case_, index) in suggestion.similarCases"
                :key="index"
                class="similar-case-item"
              >
                <div class="case-header">
                  <span class="case-amount">¥{{ formatMoney(case_.amount) }}</span>
                  <el-tag
                    :type="case_.approved ? 'success' : 'danger'"
                    size="small"
                  >
                    {{ case_.approved ? '已通过' : '已拒绝' }}
                  </el-tag>
                </div>
                <div class="case-details">
                  <span class="case-detail">{{ getCategoryText(case_.category) }}</span>
                  <span class="case-detail">申请人: {{ case_.applicant }}</span>
                  <span class="case-detail">审批时长: {{ case_.approvalTime }}小时</span>
                </div>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 警告信息 -->
      <div v-if="suggestion.warnings.length > 0" class="warnings-section">
        <h4>⚠️ 注意事项</h4>
        <div class="warnings-list">
          <el-alert
            v-for="(warning, index) in suggestion.warnings"
            :key="index"
            :title="warning.message"
            :description="warning.suggestion"
            :type="warning.level"
            show-icon
            class="warning-item"
          />
        </div>
      </div>

      <!-- 建议的后续步骤 -->
      <div class="next-steps">
        <h4>📋 建议处理步骤</h4>
        <ol class="steps-list">
          <li
            v-for="(step, index) in suggestion.nextSteps"
            :key="index"
            class="step-item"
          >
            {{ step }}
          </li>
        </ol>
      </div>

      <!-- 快速操作按钮 -->
      <div class="quick-actions">
        <el-button
          v-if="suggestion.autoApprovalEligible"
          type="success"
          icon="Check"
          @click="quickApprove"
          class="action-btn"
        >
          一键通过
        </el-button>
        <el-button
          type="primary"
          icon="Edit"
          @click="startDetailedReview"
          class="action-btn"
        >
          详细审核
        </el-button>
        <el-button
          type="warning"
          icon="More"
          @click="requestMoreInfo"
          class="action-btn"
        >
          补充信息
        </el-button>
        <el-button
          type="danger"
          icon="Close"
          @click="rejectApplication"
          class="action-btn"
        >
          拒绝申请
        </el-button>
      </div>
    </div>

    <!-- 无建议状态 -->
    <div v-else class="no-suggestion">
      <el-empty description="请选择一个申请以查看AI审批建议">
        <el-button type="primary" @click="$emit('refresh')">
          刷新数据
        </el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Clock, User, Check, Edit, More, Close,
  WarningFilled, InfoFilled, SuccessFilled, CircleCheckFilled
} from '@element-plus/icons-vue'
import { useSmartApproval } from '@/composables/useSmartApproval'

// Props
const props = defineProps({
  application: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['approve', 'reject', 'request-info', 'start-review', 'refresh'])

// Composables
const { calculateApprovalSuggestion } = useSmartApproval()

// 响应式数据
const suggestion = ref(null)
const activeCollapse = ref([])

// 计算属性
const isHighRisk = computed(() => {
  return suggestion.value && ['high', 'very_high'].includes(suggestion.value.riskLevel)
})

// 监听申请变化，重新计算建议
watch(
  () => props.application,
  (newApplication) => {
    if (newApplication) {
      try {
        suggestion.value = calculateApprovalSuggestion(newApplication)
      } catch (error) {
        console.error('计算审批建议失败:', error)
        ElMessage.error('AI建议计算失败')
      }
    } else {
      suggestion.value = null
    }
  },
  { immediate: true, deep: true }
)

// 方法
const getRiskIcon = (level) => {
  const icons = {
    low: 'SuccessFilled',
    medium: 'InfoFilled',
    high: 'WarningFilled',
    very_high: 'CircleCheckFilled' // 实际应该是一个更严重的图标
  }
  return icons[level] || 'InfoFilled'
}

const getRiskTitle = (level) => {
  const titles = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    very_high: '极高风险'
  }
  return titles[level] || '未知风险'
}

const getConfidenceColor = (confidence) => {
  if (confidence >= 80) return '#67c23a'
  if (confidence >= 60) return '#e6a23c'
  return '#f56c6c'
}

const getActionType = (action) => {
  const types = {
    auto_approve: 'success',
    fast_approve: 'primary',
    careful_review: 'warning',
    detailed_review: 'danger'
  }
  return types[action] || 'info'
}

const getActionText = (action) => {
  const texts = {
    auto_approve: '建议自动通过',
    fast_approve: '建议快速审批',
    careful_review: '建议仔细审核',
    detailed_review: '建议详细审核'
  }
  return texts[action] || '需要审核'
}

const getFactorTypeText = (type) => {
  const texts = {
    amount: '金额风险',
    credit: '信用风险',
    category: '类别风险',
    time: '时间风险',
    frequency: '频率风险'
  }
  return texts[type] || '其他风险'
}

const getFactorLevel = (score) => {
  if (score >= 70) return 'danger'
  if (score >= 40) return 'warning'
  return 'info'
}

const getCategoryText = (category) => {
  const texts = {
    infrastructure: '基础设施',
    operation: '日常运营',
    culture: '文化活动',
    office: '办公用品',
    emergency: '应急支出'
  }
  return texts[category] || '其他'
}

const formatMoney = (amount) => {
  return new Intl.NumberFormat('zh-CN').format(amount)
}

// 快速操作方法
const quickApprove = () => {
  emit('approve', {
    type: 'quick',
    suggestion: suggestion.value,
    comment: `AI建议自动通过 (风险评分: ${suggestion.value.riskScore})`
  })
}

const startDetailedReview = () => {
  emit('start-review', {
    suggestion: suggestion.value,
    reviewType: 'detailed'
  })
}

const requestMoreInfo = () => {
  emit('request-info', {
    suggestion: suggestion.value,
    requiredInfo: suggestion.value.nextSteps
  })
}

const rejectApplication = () => {
  emit('reject', {
    suggestion: suggestion.value,
    reason: `风险评分过高 (${suggestion.value.riskScore})`
  })
}
</script>

<style lang="scss" scoped>
.smart-approval-widget {
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .approval-suggestion {
    .risk-indicator {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: linear-gradient(135deg, #f6f8fa 0%, #e9ecef 100%);
      border-radius: 8px;
      margin-bottom: 20px;

      .risk-level {
        display: flex;
        align-items: center;
        gap: 12px;

        &.risk-low {
          .risk-icon { color: #67c23a; }
        }

        &.risk-medium {
          .risk-icon { color: #e6a23c; }
        }

        &.risk-high {
          .risk-icon { color: #f56c6c; }
        }

        &.risk-very_high {
          .risk-icon { color: #f56c6c; }
        }

        .risk-info {
          .risk-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 4px;
          }

          .risk-score {
            font-size: 12px;
            color: #606266;
          }
        }
      }

      .confidence-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;

        .confidence-text {
          color: #606266;
        }

        .el-progress {
          width: 60px;
        }

        .confidence-value {
          font-weight: 600;
        }
      }
    }

    .main-recommendation {
      margin-bottom: 20px;

      .recommendation-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        h4 {
          margin: 0;
          color: #303133;
        }

        .action-tag {
          font-weight: 600;
        }
      }

      .recommendation-reason {
        font-size: 14px;
        color: #606266;
        line-height: 1.6;
        margin-bottom: 12px;
      }

      .recommendation-meta {
        display: flex;
        gap: 20px;
        font-size: 12px;
        color: #909399;

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }
    }

    .risk-factors {
      margin-bottom: 20px;

      h4 {
        margin: 0 0 12px 0;
        color: #303133;
      }

      .risk-factor-list {
        .risk-factor-item {
          padding: 12px;
          border: 1px solid #ebeef5;
          border-radius: 6px;
          margin-bottom: 8px;

          .factor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;

            .factor-type {
              font-weight: 500;
              color: #303133;
            }
          }

          .factor-message {
            font-size: 12px;
            color: #606266;
            margin: 0;
          }
        }
      }
    }

    .historical-insight {
      margin-bottom: 20px;

      h4 {
        margin: 0 0 12px 0;
        color: #303133;
      }

      .insight-summary {
        .insight-stats {
          display: flex;
          gap: 20px;
          margin-bottom: 12px;

          .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 6px;

            .stat-label {
              font-size: 12px;
              color: #909399;
              margin-bottom: 4px;
            }

            .stat-value {
              font-size: 16px;
              font-weight: 600;
              color: #303133;

              &.success {
                color: #67c23a;
              }
            }
          }
        }

        .insight-recommendation {
          font-size: 14px;
          color: #606266;
          margin: 0;
        }
      }

      .similar-cases-collapse {
        margin-top: 12px;

        .similar-cases-list {
          .similar-case-item {
            padding: 12px;
            border: 1px solid #f0f0f0;
            border-radius: 4px;
            margin-bottom: 8px;

            .case-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;

              .case-amount {
                font-weight: 600;
                color: #f56c6c;
              }
            }

            .case-details {
              display: flex;
              gap: 12px;
              font-size: 12px;
              color: #909399;

              .case-detail {
                &:not(:last-child)::after {
                  content: '•';
                  margin-left: 8px;
                }
              }
            }
          }
        }
      }
    }

    .warnings-section {
      margin-bottom: 20px;

      h4 {
        margin: 0 0 12px 0;
        color: #303133;
      }

      .warnings-list {
        .warning-item {
          margin-bottom: 8px;
        }
      }
    }

    .next-steps {
      margin-bottom: 20px;

      h4 {
        margin: 0 0 12px 0;
        color: #303133;
      }

      .steps-list {
        padding-left: 20px;

        .step-item {
          margin-bottom: 8px;
          font-size: 14px;
          color: #606266;
          line-height: 1.5;
        }
      }
    }

    .quick-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;

      .action-btn {
        flex: 1;
        min-width: 120px;
      }
    }
  }

  .no-suggestion {
    text-align: center;
    padding: 40px 20px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .smart-approval-widget {
    padding: 16px;

    .risk-indicator {
      flex-direction: column;
      gap: 12px;
      align-items: stretch !important;

      .confidence-badge {
        justify-content: center;
      }
    }

    .insight-stats {
      flex-direction: column;
      gap: 8px !important;
    }

    .quick-actions {
      .action-btn {
        min-width: 100%;
        margin-bottom: 8px;
      }
    }
  }
}
</style>