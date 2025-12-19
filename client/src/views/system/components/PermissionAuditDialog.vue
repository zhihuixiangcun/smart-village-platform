<template>
  <div class="permission-audit-dialog">
    <el-steps :active="auditStep" align-center class="audit-steps">
      <el-step title="选择范围" />
      <el-step title="配置报告" />
      <el-step title="生成报告" />
      <el-step title="导出结果" />
    </el-steps>

    <div class="audit-content">
      <!-- 步骤1: 选择范围 -->
      <div v-if="auditStep === 0" class="step-content">
        <h4>选择审计范围</h4>
        <el-form :model="auditForm" label-width="120px">
          <el-form-item label="时间范围" required>
            <el-date-picker
              v-model="auditForm.dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="审计对象">
            <el-checkbox-group v-model="auditForm.targets">
              <el-checkbox label="users">用户权限</el-checkbox>
              <el-checkbox label="roles">角色权限</el-checkbox>
              <el-checkbox label="policies">权限策略</el-checkbox>
              <el-checkbox label="sessions">会话管理</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="用户筛选" v-if="auditForm.targets.includes('users')">
            <el-select
              v-model="auditForm.userIds"
              multiple
              placeholder="选择用户（留空表示全部）"
              style="width: 100%"
              filterable
            >
              <el-option
                v-for="user in userOptions"
                :key="user.id"
                :label="user.name"
                :value="user.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="角色筛选" v-if="auditForm.targets.includes('roles')">
            <el-select
              v-model="auditForm.roleIds"
              multiple
              placeholder="选择角色（留空表示全部）"
              style="width: 100%"
            >
              <el-option
                v-for="role in roleOptions"
                :key="role.value"
                :label="role.label"
                :value="role.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="风险级别">
            <el-checkbox-group v-model="auditForm.riskLevels">
              <el-checkbox label="high">高风险</el-checkbox>
              <el-checkbox label="medium">中风险</el-checkbox>
              <el-checkbox label="low">低风险</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-form>
      </div>

      <!-- 步骤2: 配置报告 -->
      <div v-if="auditStep === 1" class="step-content">
        <h4>配置审计报告</h4>
        <el-form :model="reportConfig" label-width="120px">
          <el-form-item label="报告类型">
            <el-radio-group v-model="reportConfig.type">
              <el-radio label="summary">汇总报告</el-radio>
              <el-radio label="detail">详细报告</el-radio>
              <el-radio label="compliance">合规报告</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="报告内容">
            <el-checkbox-group v-model="reportConfig.contents">
              <el-checkbox label="statistics">统计分析</el-checkbox>
              <el-checkbox label="violations">违规事件</el-checkbox>
              <el-checkbox label="trends">趋势分析</el-checkbox>
              <el-checkbox label="recommendations">改进建议</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="图表类型">
            <el-checkbox-group v-model="reportConfig.charts">
              <el-checkbox label="pie">饼图</el-checkbox>
              <el-checkbox label="bar">柱状图</el-checkbox>
              <el-checkbox label="line">趋势图</el-checkbox>
              <el-checkbox label="heatmap">热力图</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="导出格式">
            <el-checkbox-group v-model="reportConfig.formats">
              <el-checkbox label="pdf">PDF</el-checkbox>
              <el-checkbox label="excel">Excel</el-checkbox>
              <el-checkbox label="html">HTML</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-form>
      </div>

      <!-- 步骤3: 生成报告 -->
      <div v-if="auditStep === 2" class="step-content">
        <h4>正在生成审计报告...</h4>
        <div class="report-generation">
          <el-progress
            :percentage="generationProgress"
            :status="generationStatus"
          />
          <div class="generation-status">
            <p>{{ generationMessage }}</p>
            <div v-if="generationSteps.length > 0" class="generation-steps">
              <div
                v-for="(step, index) in generationSteps"
                :key="index"
                class="step-item"
                :class="{ completed: step.completed }"
              >
                <el-icon><Check /></el-icon>
                <span>{{ step.text }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 报告预览 -->
        <div v-if="reportPreview" class="report-preview">
          <h5>报告预览</h5>
          <el-tabs>
            <el-tab-pane label="执行摘要" name="summary">
              <div class="preview-summary">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="审计期间">
                    {{ auditForm.dateRange?.[0] }} 至 {{ auditForm.dateRange?.[1] }}
                  </el-descriptions-item>
                  <el-descriptions-item label="总检查次数">
                    {{ reportPreview.totalChecks }}
                  </el-descriptions-item>
                  <el-descriptions-item label="允许次数">
                    {{ reportPreview.allowedCount }}
                  </el-descriptions-item>
                  <el-descriptions-item label="拒绝次数">
                    {{ reportPreview.deniedCount }}
                  </el-descriptions-item>
                  <el-descriptions-item label="违规事件">
                    {{ reportPreview.violations }}
                  </el-descriptions-item>
                  <el-descriptions-item label="风险评分">
                    <el-tag :type="getRiskTagType(reportPreview.riskScore)">
                      {{ reportPreview.riskScore }}/100
                    </el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </el-tab-pane>

            <el-tab-pane label="关键发现" name="findings">
              <div class="preview-findings">
                <el-alert
                  v-for="finding in reportPreview.findings"
                  :key="finding.id"
                  :title="finding.title"
                  :description="finding.description"
                  :type="finding.severity"
                  show-icon
                  :closable="false"
                  class="finding-item"
                />
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>

      <!-- 步骤4: 导出结果 -->
      <div v-if="auditStep === 3" class="step-content">
        <h4>审计报告已完成</h4>
        <div class="report-result">
          <el-result
            icon="success"
            title="审计报告生成成功"
            sub-title="报告已生成，可以选择导出格式下载"
          >
            <template #extra>
              <div class="export-options">
                <el-button
                  v-for="format in reportConfig.formats"
                  :key="format"
                  type="primary"
                  @click="exportReport(format)"
                  :loading="exportingFormat === format"
                >
                  <el-icon><Download /></el-icon>
                  导出为 {{ format.toUpperCase() }}
                </el-button>
              </div>
            </template>
          </el-result>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="audit-actions">
      <el-button
        v-if="auditStep > 0"
        @click="prevStep"
      >
        上一步
      </el-button>
      <el-button
        v-if="auditStep < 3"
        type="primary"
        @click="nextStep"
        :disabled="!canProceed"
      >
        下一步
      </el-button>
      <el-button
        v-if="auditStep === 2 && !generating"
        type="success"
        @click="generateReport"
      >
        生成报告
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Download, Check
} from '@element-plus/icons-vite'
import enhancedPermissionService from '@/services/enhancedPermissionService'

// 定义emits
const emit = defineEmits(['close'])

// 响应式数据
const auditStep = ref(0)
const generating = ref(false)
const generationProgress = ref(0)
const generationStatus = ref('')
const generationMessage = ref('')
const exportingFormat = ref('')
const reportPreview = ref(null)

// 审计表单
const auditForm = reactive({
  dateRange: [],
  targets: ['users'],
  userIds: [],
  roleIds: [],
  riskLevels: ['high', 'medium', 'low']
})

// 报告配置
const reportConfig = reactive({
  type: 'summary',
  contents: ['statistics', 'violations'],
  charts: ['pie', 'bar'],
  formats: ['pdf']
})

// 生成步骤
const generationSteps = ref([])

// 选项数据
const userOptions = ref([
  { id: '1', name: '张管理员' },
  { id: '2', name: '李主管' },
  { id: '3', name: '王工作人员' }
])

const roleOptions = ref([
  { label: '村级管理员', value: 'village_admin' },
  { label: '部门主管', value: 'department_head' },
  { label: '工作人员', value: 'staff' },
  { label: '村民', value: 'villager' }
])

// 计算属性
const canProceed = computed(() => {
  switch (auditStep.value) {
    case 0:
      return auditForm.dateRange?.length === 2 && auditForm.targets.length > 0
    case 1:
      return reportConfig.contents.length > 0 && reportConfig.formats.length > 0
    case 2:
      return reportPreview.value !== null
    default:
      return false
  }
})

// 方法
const nextStep = () => {
  if (auditStep.value < 3) {
    auditStep.value++
  }
}

const prevStep = () => {
  if (auditStep.value > 0) {
    auditStep.value--
  }
}

const generateReport = async () => {
  generating.value = true
  generationProgress.value = 0
  generationStatus.value = ''
  generationSteps.value = []

  // 模拟报告生成过程
  const steps = [
    { text: '收集审计数据...', completed: false },
    { text: '分析权限记录...', completed: false },
    { text: '检测违规事件...', completed: false },
    { text: '生成统计分析...', completed: false },
    { text: '创建图表...', completed: false },
    { text: '生成报告文档...', completed: false }
  ]

  generationSteps.value = steps

  try {
    for (let i = 0; i < steps.length; i++) {
      generationMessage.value = steps[i].text
      generationProgress.value = Math.round(((i + 1) / steps.length) * 100)

      await new Promise(resolve => setTimeout(resolve, 1000))

      steps[i].completed = true
    }

    // 生成报告预览
    reportPreview.value = {
      totalChecks: Math.floor(Math.random() * 10000) + 5000,
      allowedCount: Math.floor(Math.random() * 9000) + 4500,
      deniedCount: Math.floor(Math.random() * 1000) + 500,
      violations: Math.floor(Math.random() * 50) + 10,
      riskScore: Math.floor(Math.random() * 40) + 30,
      findings: [
        {
          id: '1',
          title: '发现异常权限访问',
          description: '检测到3次非工作时间的敏感操作，建议加强时间限制策略',
          severity: 'warning'
        },
        {
          id: '2',
          title: '权限继承配置风险',
          description: '部分角色的权限继承链过长，可能存在权限滥用风险',
          severity: 'error'
        }
      ]
    }

    generationStatus.value = 'success'
    generationMessage.value = '报告生成完成！'

    ElMessage.success('审计报告生成成功')
  } catch (error) {
    generationStatus.value = 'exception'
    generationMessage.value = '报告生成失败'
    ElMessage.error('生成报告失败')
  } finally {
    generating.value = false
  }
}

const exportReport = async (format) => {
  exportingFormat.value = format

  try {
    await new Promise(resolve => setTimeout(resolve, 2000))

    ElMessage.success(`报告已导出为 ${format.toUpperCase()} 格式`)

    // 模拟下载
    const link = document.createElement('a')
    link.href = '#'
    link.download = `permission-audit-report.${format}`
    link.click()
  } catch (error) {
    ElMessage.error('导出失败')
  } finally {
    exportingFormat.value = ''
  }
}

const getRiskTagType = (score) => {
  if (score >= 80) return 'danger'
  if (score >= 60) return 'warning'
  return 'success'
}

// 生命周期
onMounted(() => {
  // 设置默认时间范围为最近30天
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
  auditForm.dateRange = [
    startDate.toISOString().slice(0, 19).replace('T', ' '),
    endDate.toISOString().slice(0, 19).replace('T', ' ')
  ]
})
</script>

<style lang="scss" scoped>
.permission-audit-dialog {
  min-height: 600px;

  .audit-steps {
    margin-bottom: 40px;
  }

  .audit-content {
    margin-bottom: 40px;

    .step-content {
      h4 {
        margin-bottom: 24px;
        color: #2c3e50;
      }

      .report-generation {
        margin: 40px 0;

        .generation-status {
          margin-top: 16px;

          p {
            color: #606266;
            margin-bottom: 16px;
          }

          .generation-steps {
            .step-item {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 8px;
              color: #909399;
              transition: color 0.3s ease;

              &.completed {
                color: #67c23a;
              }

              .el-icon {
                font-size: 16px;
              }
            }
          }
        }
      }

      .report-preview {
        margin-top: 40px;
        padding: 20px;
        background: #f5f7fa;
        border-radius: 6px;

        h5 {
          margin-bottom: 16px;
          color: #2c3e50;
        }

        .preview-summary {
          margin-bottom: 20px;
        }

        .preview-findings {
          .finding-item {
            margin-bottom: 12px;
          }
        }
      }

      .report-result {
        .export-options {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
      }
    }
  }

  .audit-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    padding-top: 20px;
    border-top: 1px solid #e4e7ed;
  }
}
</style>