<template>
  <el-dialog
    v-model="dialogVisible"
    title="家庭成员详情"
    width="700px"
    :close-on-click-modal="false"
  >
    <div v-if="member" class="member-detail">
      <!-- 基本信息 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <span>基本信息</span>
        </template>

        <div class="member-info">
          <div class="avatar-section">
            <el-avatar
              :size="80"
              :src="member.avatar"
              :icon="UserFilled"
            />
          </div>

          <div class="info-section">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="姓名">
                {{ member.name }}
              </el-descriptions-item>
              <el-descriptions-item label="性别">
                <el-tag :type="member.gender === 'male' ? 'primary' : 'danger'" size="small">
                  {{ member.gender === 'male' ? '男' : '女' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="年龄">
                {{ member.age }} 岁
              </el-descriptions-item>
              <el-descriptions-item label="与户主关系">
                {{ getRelationshipText(member.relationship) }}
              </el-descriptions-item>
              <el-descriptions-item label="身份证号" :span="2">
                <span class="sensitive-info">
                  {{ showSensitiveInfo ? member.idCard : maskIdCard(member.idCard) }}
                </span>
                <el-button
                  type="text"
                  size="small"
                  @click="toggleSensitiveInfo"
                  :icon="showSensitiveInfo ? 'Hide' : 'View'"
                  v-permission="['resident:read']"
                />
              </el-descriptions-item>
              <el-descriptions-item label="联系电话">
                {{ maskPhone(member.phone) }}
              </el-descriptions-item>
              <el-descriptions-item label="职业">
                {{ member.occupation || '无' }}
              </el-descriptions-item>
              <el-descriptions-item label="健康状态">
                <el-tag
                  :type="getHealthStatusType(member.healthStatus)"
                  size="small"
                >
                  {{ getHealthStatusText(member.healthStatus) }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <div v-if="member.remark" class="remark-section">
          <el-divider content-position="left">备注信息</el-divider>
          <p class="remark-content">{{ member.remark }}</p>
        </div>
      </el-card>

      <!-- 操作记录 -->
      <el-card class="history-card" shadow="never">
        <template #header>
          <span>操作记录</span>
        </template>

        <el-timeline>
          <el-timeline-item
            v-for="item in operationHistory"
            :key="item.id"
            :timestamp="formatDateTime(item.timestamp)"
            :type="getOperationType(item.operation)"
          >
            <el-card shadow="never">
              <div class="operation-item">
                <div class="operation-header">
                  <span class="operation">{{ getOperationText(item.operation) }}</span>
                  <span class="operator">操作人：{{ item.operator }}</span>
                </div>
                <div class="operation-content">
                  {{ item.description }}
                </div>
                <div v-if="item.changes" class="changes">
                  <div
                    v-for="change in item.changes"
                    :key="change.field"
                    class="change-item"
                  >
                    <span class="field">{{ change.fieldName }}：</span>
                    <span class="old-value">{{ change.oldValue }}</span>
                    <el-icon><Right /></el-icon>
                    <span class="new-value">{{ change.newValue }}</span>
                  </div>
                </div>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>

        <div v-if="!operationHistory.length" class="no-data">
          暂无操作记录
        </div>
      </el-card>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button
          type="primary"
          @click="editMember"
          icon="Edit"
          v-permission="['resident:write']"
        >
          编辑信息
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { UserFilled, Hide, View, Right, Edit } from '@element-plus/icons-vue'
import { residentAPI } from '@/api/resident'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  member: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'edit'])

// 响应式数据
const showSensitiveInfo = ref(false)
const operationHistory = ref([])

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 方法
const toggleSensitiveInfo = () => {
  showSensitiveInfo.value = !showSensitiveInfo.value
}

const editMember = () => {
  emit('edit', props.member)
  dialogVisible.value = false
}

const loadOperationHistory = async () => {
  if (!props.member?.id) return

  try {
    const response = await residentAPI.getMemberHistory(props.member.id)
    if (response.success) {
      operationHistory.value = response.data
    }
  } catch (error) {
    console.error('获取操作记录失败:', error)
  }
}

// 工具函数
const maskIdCard = (idCard) => {
  if (!idCard) return ''
  return idCard.replace(/^(.{6}).*(.{4})$/, '$1**********$2')
}

const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/^(.{3}).*(.{4})$/, '$1****$2')
}

const formatDateTime = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString()
}

const getRelationshipText = (relationship) => {
  const map = {
    head: '户主',
    spouse: '配偶',
    child: '子女',
    parent: '父母',
    sibling: '兄弟姐妹',
    other: '其他'
  }
  return map[relationship] || '未知'
}

const getHealthStatusText = (status) => {
  const map = {
    healthy: '健康',
    chronic: '慢性病',
    disabled: '残疾'
  }
  return map[status] || '未知'
}

const getHealthStatusType = (status) => {
  const map = {
    healthy: 'success',
    chronic: 'warning',
    disabled: 'danger'
  }
  return map[status] || 'info'
}

const getOperationType = (operation) => {
  const map = {
    create: 'primary',
    update: 'success',
    delete: 'danger'
  }
  return map[operation] || 'info'
}

const getOperationText = (operation) => {
  const map = {
    create: '新增成员',
    update: '更新信息',
    delete: '移除成员'
  }
  return map[operation] || operation
}

// 监听对话框显示状态
watch(() => props.modelValue, (newVal) => {
  if (newVal && props.member) {
    showSensitiveInfo.value = false
    loadOperationHistory()
  }
})
</script>

<style lang="scss" scoped>
.member-detail {
  .info-card {
    margin-bottom: 20px;

    .member-info {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;

      .avatar-section {
        display: flex;
        align-items: center;
      }

      .info-section {
        flex: 1;
      }

      .sensitive-info {
        font-family: monospace;
      }
    }

    .remark-section {
      .remark-content {
        color: #606266;
        line-height: 1.6;
        margin: 0;
      }
    }
  }

  .history-card {
    .operation-item {
      .operation-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .operation {
          font-weight: 500;
          color: #409eff;
        }

        .operator {
          font-size: 12px;
          color: #909399;
        }
      }

      .operation-content {
        color: #606266;
        margin-bottom: 8px;
      }

      .changes {
        border-top: 1px solid #f0f0f0;
        padding-top: 8px;

        .change-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
          font-size: 12px;

          .field {
            font-weight: 500;
            color: #606266;
          }

          .old-value {
            color: #f56c6c;
            text-decoration: line-through;
          }

          .new-value {
            color: #67c23a;
            font-weight: 500;
          }
        }
      }
    }
  }

  .no-data {
    text-align: center;
    color: #909399;
    padding: 40px 0;
  }
}

.dialog-footer {
  text-align: right;
}

// 响应式设计
@media (max-width: 768px) {
  .member-detail {
    .member-info {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
  }
}
</style>