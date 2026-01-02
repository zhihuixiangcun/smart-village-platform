<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="快速排班"
    width="700px"
    :close-on-click-modal="false"
    @closed="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
    >
      <!-- 排班类型选择 -->
      <el-form-item label="排班类型" prop="type">
        <el-radio-group v-model="formData.type" @change="handleTypeChange">
          <el-radio label="single">单次排班</el-radio>
          <el-radio label="batch">批量排班</el-radio>
          <el-radio label="template">模板排班</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 单次排班 -->
      <template v-if="formData.type === 'single'">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="值班日期" prop="date">
              <el-date-picker
                v-model="formData.date"
                type="date"
                placeholder="选择日期"
                style="width: 100%"
                :disabled="!!selectedDate"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="班次类型" prop="shiftType">
              <el-select v-model="formData.shiftType" placeholder="选择班次" style="width: 100%">
                <el-option label="早班 (06:00-12:00)" value="morning" />
                <el-option label="午班 (12:00-18:00)" value="afternoon" />
                <el-option label="晚班 (18:00-24:00)" value="evening" />
                <el-option label="夜班 (00:00-06:00)" value="night" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="值班人员">
          <el-button
            type="primary"
            plain
            @click="getRecommendations"
            :loading="recommending"
          >
            <el-icon><MagicStick /></el-icon>
            智能推荐
          </el-button>
          <el-tag v-if="recommendations.length > 0" type="success" style="margin-left: 10px">
            已推荐 {{ recommendations.length }} 位合适人员
          </el-tag>
        </el-form-item>

        <el-form-item label="选择人员" prop="personnelId">
          <el-select
            v-model="formData.personnelId"
            placeholder="选择值班人员"
            style="width: 100%"
            filterable
            :filter-method="filterPersonnel"
          >
            <!-- 推荐人员标记 -->
            <el-option-group label="推荐人员" v-if="recommendations.length > 0">
              <el-option
                v-for="person in recommendedPersonnel"
                :key="person.id"
                :label="`${person.name} - ${person.position} (${person.dutyCount}次/月)`"
                :value="person.id"
              >
                <div class="personnel-option">
                  <span class="personnel-name">{{ person.name }}</span>
                  <el-tag size="small" type="success">推荐</el-tag>
                  <span class="personnel-info">{{ person.position }}</span>
                </div>
              </el-option>
            </el-option-group>
            <!-- 所有人员 -->
            <el-option-group label="所有人员">
              <el-option
                v-for="person in filteredPersonnel"
                :key="person.id"
                :label="`${person.name} - ${person.position} (${getPersonnelDutyCount(person.id)}次/月)`"
                :value="person.id"
              >
                <div class="personnel-option">
                  <span class="personnel-name">{{ person.name }}</span>
                  <span class="personnel-info">{{ person.position }}</span>
                  <span class="duty-count">{{ getPersonnelDutyCount(person.id) }}次/月</span>
                </div>
              </el-option>
            </el-option-group>
          </el-select>
        </el-form-item>

        <el-form-item label="值班地点" prop="location">
          <el-input
            v-model="formData.location"
            placeholder="请输入值班地点"
            clearable
          />
        </el-form-item>
      </template>

      <!-- 批量排班 -->
      <template v-if="formData.type === 'batch'">
        <el-form-item label="日期范围" prop="dateRange">
          <el-date-picker
            v-model="formData.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="排班规则">
          <el-checkbox-group v-model="formData.weekdays">
            <el-checkbox label="1">周一</el-checkbox>
            <el-checkbox label="2">周二</el-checkbox>
            <el-checkbox label="3">周三</el-checkbox>
            <el-checkbox label="4">周四</el-checkbox>
            <el-checkbox label="5">周五</el-checkbox>
            <el-checkbox label="6">周六</el-checkbox>
            <el-checkbox label="0">周日</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="班次配置">
          <div class="shift-config">
            <div v-for="shift in formData.shiftConfigs" :key="shift.type" class="shift-item">
              <el-checkbox v-model="shift.enabled">
                {{ getShiftTypeName(shift.type) }}
              </el-checkbox>
              <el-select
                v-if="shift.enabled"
                v-model="shift.personnelId"
                placeholder="选择人员"
                size="small"
                style="width: 200px; margin-left: 10px"
              >
                <el-option
                  v-for="person in personnel"
                  :key="person.id"
                  :label="person.name"
                  :value="person.id"
                />
              </el-select>
            </div>
          </div>
        </el-form-item>
      </template>

      <!-- 模板排班 -->
      <template v-if="formData.type === 'template'">
        <el-form-item label="选择模板" prop="templateId">
          <el-select v-model="formData.templateId" placeholder="选择排班模板" style="width: 100%">
            <el-option
              v-for="template in scheduleTemplates"
              :key="template.id"
              :label="template.name"
              :value="template.id"
            >
              <div class="template-option">
                <span class="template-name">{{ template.name }}</span>
                <span class="template-desc">{{ template.description }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="应用时间">
          <el-date-picker
            v-model="formData.templateDate"
            type="date"
            placeholder="选择应用日期"
            style="width: 100%"
          />
        </el-form-item>
      </template>

      <!-- 备注信息 -->
      <el-form-item label="备注" prop="remark">
        <el-input
          v-model="formData.remark"
          type="textarea"
          :rows="2"
          placeholder="请输入备注信息"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <!-- 预览区域 -->
    <div v-if="previewSchedules.length > 0" class="preview-section">
      <h4>预览排班结果</h4>
      <el-table :data="previewSchedules" style="width: 100%" max-height="300">
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="shiftType" label="班次" width="100">
          <template #default="{ row }">
            <el-tag :type="getShiftTypeColor(row.shiftType)" size="small">
              {{ getShiftTypeName(row.shiftType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="personnelName" label="值班人员" />
        <el-table-column prop="location" label="地点" />
      </el-table>
      <div class="preview-summary">
        共生成 {{ previewSchedules.length }} 个班次
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="handlePreview" v-if="formData.type !== 'single'">
          预览
        </el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确认排班
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { MagicStick } from '@element-plus/icons-vue'
import { useDutyStore } from '@/stores/dutyStore'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  selectedDate: {
    type: Date,
    default: null
  },
  personnel: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

// Store
const dutyStore = useDutyStore()

// 响应式数据
const formRef = ref(null)
const submitting = ref(false)
const recommending = ref(false)
const recommendations = ref([])
const filteredPersonnel = ref([])
const previewSchedules = ref([])

// 表单数据
const formData = ref({
  type: 'single',
  date: null,
  shiftType: 'morning',
  personnelId: null,
  location: '村委会',
  remark: '',
  dateRange: null,
  weekdays: ['1', '2', '3', '4', '5'],
  shiftConfigs: [
    { type: 'morning', enabled: true, personnelId: null },
    { type: 'afternoon', enabled: true, personnelId: null },
    { type: 'evening', enabled: false, personnelId: null },
    { type: 'night', enabled: false, personnelId: null }
  ],
  templateId: null,
  templateDate: null
})

// 排班模板数据
const scheduleTemplates = ref([
  {
    id: 1,
    name: '标准工作日模板',
    description: '周一至周五，早午晚三班'
  },
  {
    id: 2,
    name: '周末加强模板',
    description: '周末全天值班，工作日早晚班'
  },
  {
    id: 3,
    name: '节假日模板',
    description: '节假日全天四班轮换'
  }
])

// 计算属性
const recommendedPersonnel = computed(() => {
  return props.personnel.filter(person =>
    recommendations.value.includes(person.id)
  )
})

// 方法
const initFormData = () => {
  if (props.selectedDate) {
    formData.value.date = new Date(props.selectedDate)
  }
  filteredPersonnel.value = props.personnel
}

const handleTypeChange = (type) => {
  previewSchedules.value = []
  if (type === 'single' && props.selectedDate) {
    formData.value.date = new Date(props.selectedDate)
  }
}

const getRecommendations = async () => {
  if (!formData.value.date || !formData.value.shiftType) {
    ElMessage.warning('请先选择日期和班次')
    return
  }

  try {
    recommending.value = true
    const dateStr = formatDate(formData.value.date)
    const data = await dutyStore.getRecommendedPersonnel(dateStr, formData.value.shiftType)
    recommendations.value = data.map(item => item.personnelId)
    ElMessage.success('已为您推荐合适的值班人员')
  } catch (error) {
    console.error('获取推荐失败:', error)
  } finally {
    recommending.value = false
  }
}

const filterPersonnel = (query) => {
  if (!query) {
    filteredPersonnel.value = props.personnel
    return
  }

  const lowerQuery = query.toLowerCase()
  filteredPersonnel.value = props.personnel.filter(person =>
    person.name.toLowerCase().includes(lowerQuery) ||
    person.position.toLowerCase().includes(lowerQuery)
  )
}

const getPersonnelDutyCount = (personnelId) => {
  // 这里应该从统计数据中获取，暂时使用模拟数据
  return Math.floor(Math.random() * 10) + 5
}

const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getShiftTypeName = (shiftType) => {
  const shiftMap = {
    morning: '早班',
    afternoon: '午班',
    evening: '晚班',
    night: '夜班'
  }
  return shiftMap[shiftType] || shiftType
}

const getShiftTypeColor = (shiftType) => {
  const colorMap = {
    morning: 'success',
    afternoon: 'warning',
    evening: 'danger',
    night: 'info'
  }
  return colorMap[shiftType] || 'info'
}

const handlePreview = () => {
  previewSchedules.value = []

  if (formData.value.type === 'batch') {
    const [startDate, endDate] = formData.value.dateRange
    if (!startDate || !endDate || formData.value.weekdays.length === 0) {
      ElMessage.warning('请完善排班信息')
      return
    }

    const current = new Date(startDate)
    while (current <= endDate) {
      const weekday = current.getDay().toString()
      if (formData.value.weekdays.includes(weekday)) {
        formData.value.shiftConfigs.forEach(shift => {
          if (shift.enabled && shift.personnelId) {
            const personnel = props.personnel.find(p => p.id === shift.personnelId)
            previewSchedules.value.push({
              date: formatDate(current),
              shiftType: shift.type,
              personnelName: personnel?.name || '未知',
              location: formData.value.location
            })
          }
        })
      }
      current.setDate(current.getDate() + 1)
    }
  } else if (formData.value.type === 'template') {
    // 模板排班预览逻辑
    ElMessage.info('模板预览功能开发中')
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    submitting.value = true

    if (formData.value.type === 'single') {
      const scheduleData = {
        date: formatDate(formData.value.date),
        shiftType: formData.value.shiftType,
        personnelId: formData.value.personnelId,
        location: formData.value.location,
        remark: formData.value.remark
      }
      emit('confirm', { type: 'single', data: scheduleData })
    } else if (formData.value.type === 'batch') {
      if (previewSchedules.value.length === 0) {
        ElMessage.warning('请先预览排班结果')
        return
      }
      emit('confirm', { type: 'batch', data: previewSchedules.value })
    } else if (formData.value.type === 'template') {
      emit('confirm', {
        type: 'template',
        data: {
          templateId: formData.value.templateId,
          date: formatDate(formData.value.templateDate)
        }
      })
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  emit('update:modelValue', false)
  formRef.value?.resetFields()
  recommendations.value = []
  previewSchedules.value = []
}

// 监听对话框打开
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    initFormData()
  }
})

// 监听人员变化
watch(() => props.personnel, (newVal) => {
  filteredPersonnel.value = newVal
})
</script>

<style lang="scss" scoped>
.personnel-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  .personnel-name {
    font-weight: 500;
  }

  .personnel-info {
    color: #909399;
    font-size: 12px;
  }

  .duty-count {
    color: #409eff;
    font-size: 12px;
  }
}

.template-option {
  .template-name {
    font-weight: 500;
  }

  .template-desc {
    color: #909399;
    font-size: 12px;
    margin-left: 10px;
  }
}

.shift-config {
  .shift-item {
    margin-bottom: 10px;
    display: flex;
    align-items: center;
  }
}

.preview-section {
  margin-top: 20px;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;

  h4 {
    margin: 0 0 12px 0;
    color: #303133;
  }

  .preview-summary {
    margin-top: 12px;
    text-align: right;
    color: #606266;
    font-size: 14px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>