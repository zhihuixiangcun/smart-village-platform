<template>
  <div class="suggestion-evaluation">
    <div class="evaluation-header">
      <h2>建议评估</h2>
      <el-button @click="goBack" icon="el-icon-arrow-left">返回</el-button>
    </div>

    <div v-if="suggestion" class="evaluation-content">
      <!-- 建议信息 -->
      <div class="suggestion-info">
        <div class="info-header">
          <h3>{{ suggestion.title }}</h3>
          <div class="info-meta">
            <el-tag :type="getStatusType(suggestion.status)" size="small">
              {{ getStatusText(suggestion.status) }}
            </el-tag>
            <el-tag :type="getPriorityType(suggestion.priority)" size="small">
              {{ getPriorityText(suggestion.priority) }}
            </el-tag>
            <span class="submit-date">{{ formatDateTime(suggestion.submittedAt) }}</span>
          </div>
        </div>

        <div class="info-details">
          <div class="detail-row">
            <span class="label">提交者：</span>
            <span>{{ suggestion.submitter?.realName }}</span>
          </div>
          <div class="detail-row">
            <span class="label">分类：</span>
            <el-tag :color="suggestion.category?.color" size="mini">
              <i :class="suggestion.category?.icon"></i>
              {{ suggestion.category?.name }}
            </el-tag>
          </div>
          <div v-if="suggestion.subcategory" class="detail-row">
            <span class="label">子分类：</span>
            <span>{{ suggestion.subcategory }}</span>
          </div>
          <div v-if="suggestion.affectedArea" class="detail-row">
            <span class="label">影响范围：</span>
            <span>{{ suggestion.affectedArea }}</span>
          </div>
          <div v-if="suggestion.estimatedBudget" class="detail-row">
            <span class="label">预估预算：</span>
            <span>{{ formatCurrency(suggestion.estimatedBudget) }}</span>
          </div>
        </div>

        <div class="suggestion-content">
          <h4>建议内容</h4>
          <p>{{ suggestion.content }}</p>
        </div>

        <div v-if="suggestion.expectedOutcome" class="expected-outcome">
          <h4>期望结果</h4>
          <p>{{ suggestion.expectedOutcome }}</p>
        </div>

        <div v-if="suggestion.attachments && suggestion.attachments.length > 0" class="attachments">
          <h4>相关附件</h4>
          <div class="attachment-list">
            <el-link
              v-for="attachment in suggestion.attachments"
              :key="attachment.name"
              :href="attachment.url"
              target="_blank"
              type="primary"
              class="attachment-item"
            >
              <i class="el-icon-paperclip"></i>
              {{ attachment.name }}
            </el-link>
          </div>
        </div>
      </div>

      <!-- 评估表单 -->
      <div class="evaluation-form">
        <h3>评估建议</h3>

        <el-form
          ref="evaluationForm"
          :model="evaluationData"
          :rules="evaluationRules"
          label-width="120px"
          size="medium"
        >
          <!-- 评分项 -->
          <div class="score-section">
            <h4>评分项目</h4>
            <div class="score-grid">
              <el-form-item label="可行性" prop="scores.feasibility" required>
                <div class="score-item">
                  <el-rate
                    v-model="evaluationData.scores.feasibility"
                    :max="5"
                    show-score
                    text-color="#ff9900"
                  ></el-rate>
                  <small>技术和资源角度的可实施性</small>
                </div>
              </el-form-item>

              <el-form-item label="影响力" prop="scores.impact" required>
                <div class="score-item">
                  <el-rate
                    v-model="evaluationData.scores.impact"
                    :max="5"
                    show-score
                    text-color="#ff9900"
                  ></el-rate>
                  <small>对村民生活和村务工作的积极影响</small>
                </div>
              </el-form-item>

              <el-form-item label="紧急程度" prop="scores.urgency" required>
                <div class="score-item">
                  <el-rate
                    v-model="evaluationData.scores.urgency"
                    :max="5"
                    show-score
                    text-color="#ff9900"
                  ></el-rate>
                  <small>问题的紧迫性和时效性要求</small>
                </div>
              </el-form-item>

              <el-form-item label="创新性" prop="scores.innovation">
                <div class="score-item">
                  <el-rate
                    v-model="evaluationData.scores.innovation"
                    :max="5"
                    show-score
                    text-color="#ff9900"
                  ></el-rate>
                  <small>解决方案的创新性和独特性</small>
                </div>
              </el-form-item>

              <el-form-item label="成本效益" prop="scores.cost">
                <div class="score-item">
                  <el-rate
                    v-model="evaluationData.scores.cost"
                    :max="5"
                    show-score
                    text-color="#ff9900"
                  ></el-rate>
                  <small>投入产出比和资源利用效率</small>
                </div>
              </el-form-item>
            </div>

            <!-- 综合评分 -->
            <div class="overall-score">
              <el-form-item label="综合评分">
                <div class="overall-display">
                  <el-rate
                    :value="overallScore"
                    disabled
                    show-score
                    text-color="#ff9900"
                  ></el-rate>
                  <span class="score-text">{{ getScoreText(overallScore) }}</span>
                </div>
              </el-form-item>
            </div>
          </div>

          <!-- 评审意见 -->
          <el-form-item label="评审意见" prop="reviewComments" required>
            <el-input
              v-model="evaluationData.reviewComments"
              type="textarea"
              :rows="4"
              placeholder="请详细说明评估理由、建议的优缺点、改进建议等"
              maxlength="1000"
              show-word-limit
            ></el-input>
          </el-form-item>

          <!-- 评审决定 -->
          <el-form-item label="评审决定" prop="decision" required>
            <el-radio-group v-model="evaluationData.decision" @change="handleDecisionChange">
              <el-radio label="approve">
                <div class="decision-option">
                  <span class="decision-text approve">通过</span>
                  <small>建议合理可行，批准实施</small>
                </div>
              </el-radio>
              <el-radio label="reject">
                <div class="decision-option">
                  <span class="decision-text reject">拒绝</span>
                  <small>建议不符合要求或不可行</small>
                </div>
              </el-radio>
              <el-radio label="needs_modification">
                <div class="decision-option">
                  <span class="decision-text modify">需要修改</span>
                  <small>建议有价值但需要完善</small>
                </div>
              </el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 实施计划（通过时显示） -->
          <div v-if="evaluationData.decision === 'approve'" class="implementation-plan">
            <h4>实施计划</h4>

            <el-form-item label="预计实施周期">
              <el-input-number
                v-model="evaluationData.implementationPlan.estimatedDuration"
                :min="1"
                :max="365"
                controls-position="right"
                style="width: 150px"
              ></el-input-number>
              <span style="margin-left: 10px;">天</span>
            </el-form-item>

            <el-form-item label="所需资源">
              <el-input
                v-model="evaluationData.implementationPlan.requiredResources"
                type="textarea"
                :rows="3"
                placeholder="描述实施所需的人力、物力、财力等资源"
                maxlength="500"
              ></el-input>
            </el-form-item>

            <el-form-item label="负责部门">
              <el-input
                v-model="evaluationData.implementationPlan.responsibleDepartment"
                placeholder="指定负责实施的部门或人员"
                maxlength="100"
              ></el-input>
            </el-form-item>

            <!-- 里程碑设置 -->
            <el-form-item label="实施里程碑">
              <div class="milestones-section">
                <div
                  v-for="(milestone, index) in evaluationData.implementationPlan.milestones"
                  :key="index"
                  class="milestone-item"
                >
                  <el-input
                    v-model="milestone.name"
                    placeholder="里程碑名称"
                    style="width: 200px"
                  ></el-input>
                  <el-input
                    v-model="milestone.description"
                    placeholder="描述"
                    style="width: 250px; margin-left: 10px"
                  ></el-input>
                  <el-date-picker
                    v-model="milestone.targetDate"
                    type="date"
                    placeholder="目标日期"
                    style="width: 150px; margin-left: 10px"
                  ></el-date-picker>
                  <el-button
                    type="danger"
                    size="mini"
                    @click="removeMilestone(index)"
                    style="margin-left: 10px"
                  >
                    删除
                  </el-button>
                </div>
                <el-button
                  type="primary"
                  size="mini"
                  @click="addMilestone"
                  style="margin-top: 10px"
                >
                  添加里程碑
                </el-button>
              </div>
            </el-form-item>
          </div>

          <!-- 提交按钮 -->
          <div class="form-actions">
            <el-button @click="goBack">取消</el-button>
            <el-button type="primary" @click="submitEvaluation" :loading="submitting">
              提交评估
            </el-button>
          </div>
        </el-form>
      </div>

      <!-- 历史评估记录 -->
      <div v-if="suggestion.evaluation?.reviewedAt" class="previous-evaluation">
        <h3>评估历史</h3>
        <div class="evaluation-history">
          <div class="history-item">
            <div class="history-header">
              <span class="reviewer">{{ suggestion.evaluation.reviewer?.realName }}</span>
              <span class="review-date">{{ formatDateTime(suggestion.evaluation.reviewedAt) }}</span>
              <el-tag :type="getDecisionType(suggestion.evaluation.reviewDecision)" size="small">
                {{ getDecisionText(suggestion.evaluation.reviewDecision) }}
              </el-tag>
            </div>
            <div class="history-score">
              <span>综合评分：</span>
              <el-rate
                :value="suggestion.evaluation.overallScore"
                disabled
                show-score
                text-color="#ff9900"
              ></el-rate>
            </div>
            <div class="history-comments">
              <p>{{ suggestion.evaluation.reviewComments }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-else class="loading-container">
      <el-loading-spinner></el-loading-spinner>
      <p>正在加载建议信息...</p>
    </div>
  </div>
</template>

<script>
import { suggestionAPI } from '@/api/suggestion'
import { formatDateTime } from '@/utils/dateUtils'

export default {
  name: 'SuggestionEvaluation',
  data() {
    return {
      suggestion: null,
      submitting: false,
      evaluationData: {
        scores: {
          feasibility: 0,
          impact: 0,
          urgency: 0,
          innovation: 0,
          cost: 0
        },
        reviewComments: '',
        decision: '',
        implementationPlan: {
          estimatedDuration: 30,
          requiredResources: '',
          responsibleDepartment: '',
          milestones: []
        }
      },
      evaluationRules: {
        'scores.feasibility': [
          { required: true, message: '请评分可行性', trigger: 'change' },
          { type: 'number', min: 1, max: 5, message: '评分必须在1-5之间', trigger: 'change' }
        ],
        'scores.impact': [
          { required: true, message: '请评分影响力', trigger: 'change' },
          { type: 'number', min: 1, max: 5, message: '评分必须在1-5之间', trigger: 'change' }
        ],
        'scores.urgency': [
          { required: true, message: '请评分紧急程度', trigger: 'change' },
          { type: 'number', min: 1, max: 5, message: '评分必须在1-5之间', trigger: 'change' }
        ],
        reviewComments: [
          { required: true, message: '请填写评审意见', trigger: 'blur' },
          { min: 10, max: 1000, message: '评审意见长度在10-1000字符之间', trigger: 'blur' }
        ],
        decision: [
          { required: true, message: '请选择评审决定', trigger: 'change' }
        ]
      }
    }
  },
  computed: {
    suggestionId() {
      return this.$route.params.suggestionId
    },
    overallScore() {
      const scores = Object.values(this.evaluationData.scores).filter(score => score > 0)
      return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0
    }
  },
  async mounted() {
    await this.loadSuggestion()
  },
  methods: {
    async loadSuggestion() {
      try {
        const response = await suggestionAPI.getSuggestionDetails(this.suggestionId)
        if (response.data.success) {
          this.suggestion = response.data.data

          // 检查权限
          if (!this.canEvaluate()) {
            this.$message.error('无权限评估此建议')
            this.goBack()
            return
          }

          // 如果已有评估记录，加载到表单中
          if (this.suggestion.evaluation?.reviewedAt) {
            this.loadExistingEvaluation()
          }
        }
      } catch (error) {
        this.$message.error('获取建议详情失败')
        console.error(error)
        this.goBack()
      }
    },

    loadExistingEvaluation() {
      const evaluation = this.suggestion.evaluation
      this.evaluationData.scores = { ...evaluation.score }
      this.evaluationData.reviewComments = evaluation.reviewComments || ''
      this.evaluationData.decision = evaluation.reviewDecision || ''

      if (evaluation.implementationPlan) {
        this.evaluationData.implementationPlan = {
          ...this.evaluationData.implementationPlan,
          ...evaluation.implementationPlan
        }
      }
    },

    canEvaluate() {
      const userRole = this.$store.getters.userRole
      return userRole === 'admin' || userRole === 'committee'
    },

    handleDecisionChange(decision) {
      if (decision === 'approve' && this.evaluationData.implementationPlan.milestones.length === 0) {
        this.addMilestone()
      }
    },

    addMilestone() {
      this.evaluationData.implementationPlan.milestones.push({
        name: '',
        description: '',
        targetDate: null
      })
    },

    removeMilestone(index) {
      this.evaluationData.implementationPlan.milestones.splice(index, 1)
    },

    async submitEvaluation() {
      try {
        await this.$refs.evaluationForm.validate()
      } catch (error) {
        this.$message.error('请完善评估信息')
        return
      }

      this.submitting = true
      try {
        const response = await suggestionAPI.evaluateSuggestion(this.suggestionId, this.evaluationData)

        if (response.data.success) {
          this.$message.success('评估提交成功')
          this.$router.push(`/suggestions/${this.suggestionId}`)
        }
      } catch (error) {
        const message = error.response?.data?.message || '评估提交失败'
        this.$message.error(message)
        console.error(error)
      } finally {
        this.submitting = false
      }
    },

    goBack() {
      this.$router.go(-1)
    },

    formatCurrency(amount) {
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY'
      }).format(amount)
    },

    getScoreText(score) {
      if (score >= 4.5) return '优秀'
      if (score >= 3.5) return '良好'
      if (score >= 2.5) return '一般'
      if (score >= 1.5) return '较差'
      return '很差'
    },

    getStatusType(status) {
      const types = {
        'submitted': 'primary',
        'under_review': 'warning',
        'approved': 'success',
        'rejected': 'danger'
      }
      return types[status] || 'info'
    },

    getStatusText(status) {
      const texts = {
        'submitted': '已提交',
        'under_review': '审核中',
        'approved': '已通过',
        'rejected': '已拒绝'
      }
      return texts[status] || '未知'
    },

    getPriorityType(priority) {
      const types = {
        'low': 'info',
        'medium': 'primary',
        'high': 'warning',
        'urgent': 'danger'
      }
      return types[priority] || 'info'
    },

    getPriorityText(priority) {
      const texts = {
        'low': '低优先级',
        'medium': '中优先级',
        'high': '高优先级',
        'urgent': '紧急'
      }
      return texts[priority] || '未知'
    },

    getDecisionType(decision) {
      const types = {
        'approve': 'success',
        'reject': 'danger',
        'needs_modification': 'warning'
      }
      return types[decision] || 'info'
    },

    getDecisionText(decision) {
      const texts = {
        'approve': '通过',
        'reject': '拒绝',
        'needs_modification': '需要修改'
      }
      return texts[decision] || '未知'
    },

    formatDateTime
  }
}
</script>

<style scoped>
.suggestion-evaluation {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.evaluation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.evaluation-header h2 {
  margin: 0;
  color: #333;
}

.suggestion-info {
  background: white;
  border-radius: 8px;
  padding: 25px;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-header {
  margin-bottom: 20px;
}

.info-header h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 20px;
}

.info-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.submit-date {
  color: #666;
  font-size: 14px;
}

.info-details {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.detail-row .label {
  min-width: 100px;
  color: #666;
  font-weight: bold;
}

.suggestion-content,
.expected-outcome {
  margin-bottom: 20px;
}

.suggestion-content h4,
.expected-outcome h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.suggestion-content p,
.expected-outcome p {
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.attachments h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.evaluation-form {
  background: white;
  border-radius: 8px;
  padding: 25px;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.evaluation-form h3 {
  margin: 0 0 25px 0;
  color: #333;
  border-bottom: 2px solid #409eff;
  padding-bottom: 10px;
}

.score-section h4 {
  margin: 0 0 20px 0;
  color: #333;
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.score-item small {
  display: block;
  color: #999;
  font-size: 12px;
  margin-top: 5px;
}

.overall-score {
  background: #f0f9ff;
  padding: 20px;
  border-radius: 6px;
  border-left: 4px solid #409eff;
}

.overall-display {
  display: flex;
  align-items: center;
  gap: 15px;
}

.score-text {
  font-weight: bold;
  color: #409eff;
}

.decision-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.decision-text {
  font-weight: bold;
}

.decision-text.approve { color: #67c23a; }
.decision-text.reject { color: #f56c6c; }
.decision-text.modify { color: #e6a23c; }

.implementation-plan {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 6px;
  margin-top: 20px;
}

.implementation-plan h4 {
  margin: 0 0 20px 0;
  color: #333;
}

.milestones-section {
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 15px;
}

.milestone-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 10px;
}

.form-actions {
  text-align: center;
  padding-top: 25px;
  border-top: 1px solid #eee;
}

.form-actions .el-button {
  min-width: 120px;
  margin: 0 10px;
}

.previous-evaluation {
  background: white;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.previous-evaluation h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.history-item {
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 15px;
}

.history-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.reviewer {
  font-weight: bold;
  color: #333;
}

.review-date {
  color: #666;
  font-size: 14px;
}

.history-score {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.history-comments p {
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.loading-container {
  text-align: center;
  padding: 50px;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .suggestion-evaluation {
    padding: 10px;
  }

  .evaluation-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .suggestion-info,
  .evaluation-form,
  .previous-evaluation {
    padding: 15px;
  }

  .score-grid {
    grid-template-columns: 1fr;
  }

  .milestone-item {
    flex-direction: column;
    align-items: stretch;
  }

  .overall-display {
    flex-direction: column;
    align-items: center;
  }

  .info-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-row .label {
    min-width: auto;
  }
}
</style>