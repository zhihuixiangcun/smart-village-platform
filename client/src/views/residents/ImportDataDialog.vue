<template>
  <el-dialog
    v-model="dialogVisible"
    title="数据导入"
    width="800px"
    :close-on-click-modal="false"
  >
    <div class="import-container">
      <!-- 导入步骤 -->
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step title="选择文件" description="上传Excel或CSV文件" />
        <el-step title="字段映射" description="配置数据字段对应关系" />
        <el-step title="数据预览" description="确认导入数据" />
        <el-step title="导入完成" description="查看导入结果" />
      </el-steps>

      <!-- 第一步：文件上传 -->
      <div v-if="currentStep === 0" class="step-content">
        <div class="upload-section">
          <el-upload
            ref="uploadRef"
            class="upload-dragger"
            drag
            :action="uploadUrl"
            :headers="uploadHeaders"
            :on-success="handleFileSuccess"
            :on-error="handleFileError"
            :before-upload="beforeFileUpload"
            :file-list="fileList"
            accept=".xlsx,.xls,.csv"
            :limit="1"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持.xlsx、.xls、.csv格式文件，文件大小不超过10MB
              </div>
            </template>
          </el-upload>

          <div class="template-download">
            <el-divider content-position="center">或</el-divider>
            <el-button type="primary" @click="downloadTemplate" icon="Download">
              下载标准模板
            </el-button>
            <p class="template-tip">建议使用标准模板确保数据格式正确</p>
          </div>
        </div>

        <div class="import-rules">
          <el-card shadow="never">
            <template #header>
              <span>导入规则说明</span>
            </template>
            <ul>
              <li>文件第一行必须为列标题</li>
              <li>必填字段：姓名、性别、身份证号、联系电话</li>
              <li>日期格式：YYYY-MM-DD（如：1990-01-01）</li>
              <li>性别格式：男/女 或 M/F 或 male/female</li>
              <li>身份证号必须为18位有效格式</li>
              <li>手机号必须为11位有效格式</li>
              <li>重复数据会自动跳过</li>
            </ul>
          </el-card>
        </div>
      </div>

      <!-- 第二步：字段映射 -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="mapping-section">
          <h4>字段映射配置</h4>
          <p>请将Excel/CSV文件的列与系统字段进行对应</p>

          <el-table :data="fieldMappings" border style="width: 100%">
            <el-table-column prop="systemField" label="系统字段" width="200">
              <template #default="scope">
                <span :class="{ required: scope.row.required }">
                  {{ scope.row.label }}
                  <el-tag v-if="scope.row.required" type="danger" size="small">必填</el-tag>
                </span>
              </template>
            </el-table-column>

            <el-table-column prop="fileColumn" label="文件列" width="200">
              <template #default="scope">
                <el-select
                  v-model="scope.row.fileColumn"
                  placeholder="请选择列"
                  style="width: 100%"
                  clearable
                >
                  <el-option
                    v-for="column in fileColumns"
                    :key="column"
                    :label="column"
                    :value="column"
                  />
                </el-select>
              </template>
            </el-table-column>

            <el-table-column prop="example" label="示例数据" min-width="150">
              <template #default="scope">
                <span class="example-data">{{ getExampleData(scope.row.fileColumn) }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="description" label="说明" min-width="200" />
          </el-table>

          <div class="mapping-actions">
            <el-button @click="autoMapping">智能映射</el-button>
            <el-button @click="clearMapping">清空映射</el-button>
          </div>
        </div>
      </div>

      <!-- 第三步：数据预览 -->
      <div v-if="currentStep === 2" class="step-content">
        <div class="preview-section">
          <div class="preview-stats">
            <el-row :gutter="20">
              <el-col :span="6">
                <div class="stat-item">
                  <el-icon><Document /></el-icon>
                  <div>
                    <div class="stat-number">{{ previewData.length }}</div>
                    <div class="stat-label">总记录数</div>
                  </div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item success">
                  <el-icon><Check /></el-icon>
                  <div>
                    <div class="stat-number">{{ validRecords }}</div>
                    <div class="stat-label">有效记录</div>
                  </div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item warning">
                  <el-icon><Warning /></el-icon>
                  <div>
                    <div class="stat-number">{{ errorRecords }}</div>
                    <div class="stat-label">错误记录</div>
                  </div>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="stat-item info">
                  <el-icon><CircleCheck /></el-icon>
                  <div>
                    <div class="stat-number">{{ duplicateRecords }}</div>
                    <div class="stat-label">重复记录</div>
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>

          <el-table
            :data="paginatedPreviewData"
            border
            style="width: 100%"
            max-height="400"
          >
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="gender" label="性别" width="80" />
            <el-table-column prop="idCard" label="身份证号" width="180" />
            <el-table-column prop="phone" label="联系电话" width="130" />
            <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="scope">
                <el-tag
                  :type="getRowStatusType(scope.row._status)"
                  size="small"
                >
                  {{ getRowStatusText(scope.row._status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="错误信息" min-width="200">
              <template #default="scope">
                <span v-if="scope.row._errors" class="error-text">
                  {{ scope.row._errors.join(', ') }}
                </span>
              </template>
            </el-table-column>
          </el-table>

          <div class="preview-pagination">
            <el-pagination
              v-model:current-page="previewPage"
              :page-size="previewPageSize"
              :total="previewData.length"
              layout="prev, pager, next"
              small
            />
          </div>
        </div>
      </div>

      <!-- 第四步：导入结果 -->
      <div v-if="currentStep === 3" class="step-content">
        <div class="result-section">
          <div class="result-summary">
            <el-result
              :icon="importResult.success ? 'success' : 'error'"
              :title="importResult.success ? '导入成功' : '导入失败'"
              :sub-title="importResult.message"
            >
              <template #extra>
                <div class="result-stats">
                  <el-row :gutter="20">
                    <el-col :span="8">
                      <div class="result-stat">
                        <div class="stat-number">{{ importResult.total }}</div>
                        <div class="stat-label">总记录数</div>
                      </div>
                    </el-col>
                    <el-col :span="8">
                      <div class="result-stat success">
                        <div class="stat-number">{{ importResult.success_count }}</div>
                        <div class="stat-label">成功导入</div>
                      </div>
                    </el-col>
                    <el-col :span="8">
                      <div class="result-stat error">
                        <div class="stat-number">{{ importResult.error_count }}</div>
                        <div class="stat-label">导入失败</div>
                      </div>
                    </el-col>
                  </el-row>
                </div>

                <div class="result-actions">
                  <el-button @click="viewImportLog" v-if="importResult.log_file">
                    查看详细日志
                  </el-button>
                  <el-button type="primary" @click="completeImport">
                    完成
                  </el-button>
                </div>
              </template>
            </el-result>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          v-if="currentStep > 0"
          @click="prevStep"
          :disabled="importing"
        >
          上一步
        </el-button>
        <el-button
          v-if="currentStep < 3"
          type="primary"
          @click="nextStep"
          :disabled="!canNextStep"
          :loading="importing"
        >
          {{ currentStep === 2 ? '开始导入' : '下一步' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  UploadFilled, Download, Document, Check, Warning, CircleCheck
} from '@element-plus/icons-vue'
import { residentAPI } from '@/api/resident'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const userStore = useUserStore()

// 响应式数据
const currentStep = ref(0)
const importing = ref(false)
const uploadRef = ref()
const fileList = ref([])
const fileData = ref([])
const fileColumns = ref([])
const previewData = ref([])
const previewPage = ref(1)
const previewPageSize = ref(10)

// 上传配置
const uploadUrl = `${import.meta.env.VITE_APP_BASE_API}/upload/import`
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${userStore.token}`
}))

// 字段映射配置
const fieldMappings = reactive([
  {
    systemField: 'name',
    label: '姓名',
    required: true,
    fileColumn: '',
    description: '村民真实姓名'
  },
  {
    systemField: 'gender',
    label: '性别',
    required: true,
    fileColumn: '',
    description: '男/女 或 M/F'
  },
  {
    systemField: 'idCard',
    label: '身份证号',
    required: true,
    fileColumn: '',
    description: '18位有效身份证号'
  },
  {
    systemField: 'phone',
    label: '联系电话',
    required: true,
    fileColumn: '',
    description: '11位手机号码'
  },
  {
    systemField: 'birthDate',
    label: '出生日期',
    required: false,
    fileColumn: '',
    description: 'YYYY-MM-DD格式'
  },
  {
    systemField: 'address',
    label: '居住地址',
    required: false,
    fileColumn: '',
    description: '详细居住地址'
  },
  {
    systemField: 'occupation',
    label: '职业',
    required: false,
    fileColumn: '',
    description: '从事职业'
  },
  {
    systemField: 'healthStatus',
    label: '健康状态',
    required: false,
    fileColumn: '',
    description: '健康/慢性病/残疾'
  }
])

// 导入结果
const importResult = reactive({
  success: false,
  message: '',
  total: 0,
  success_count: 0,
  error_count: 0,
  log_file: ''
})

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 计算属性
const canNextStep = computed(() => {
  switch (currentStep.value) {
    case 0:
      return fileList.value.length > 0
    case 1:
      return fieldMappings.some(mapping => mapping.required && mapping.fileColumn)
    case 2:
      return validRecords.value > 0
    default:
      return false
  }
})

const validRecords = computed(() => {
  return previewData.value.filter(row => row._status === 'valid').length
})

const errorRecords = computed(() => {
  return previewData.value.filter(row => row._status === 'error').length
})

const duplicateRecords = computed(() => {
  return previewData.value.filter(row => row._status === 'duplicate').length
})

const paginatedPreviewData = computed(() => {
  const start = (previewPage.value - 1) * previewPageSize.value
  const end = start + previewPageSize.value
  return previewData.value.slice(start, end)
})

// 方法
const downloadTemplate = async () => {
  try {
    await residentAPI.downloadImportTemplate()
    ElMessage.success('模板下载成功')
  } catch (error) {
    ElMessage.error('模板下载失败')
  }
}

const beforeFileUpload = (file) => {
  const isExcel = /\.(xlsx|xls|csv)$/.test(file.name)
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isExcel) {
    ElMessage.error('只能上传Excel或CSV格式文件!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过10MB!')
    return false
  }
  return true
}

const handleFileSuccess = (response) => {
  if (response.success) {
    fileData.value = response.data.data
    fileColumns.value = response.data.columns
    ElMessage.success('文件上传成功')
  } else {
    ElMessage.error('文件解析失败')
  }
}

const handleFileError = () => {
  ElMessage.error('文件上传失败')
}

const autoMapping = () => {
  fieldMappings.forEach(mapping => {
    const matchedColumn = fileColumns.value.find(column => {
      const columnLower = column.toLowerCase()
      const fieldLower = mapping.label.toLowerCase()

      return columnLower.includes(fieldLower) ||
             fieldLower.includes(columnLower) ||
             getFieldAliases(mapping.systemField).some(alias =>
               columnLower.includes(alias.toLowerCase())
             )
    })

    if (matchedColumn) {
      mapping.fileColumn = matchedColumn
    }
  })

  ElMessage.success('智能映射完成')
}

const getFieldAliases = (field) => {
  const aliases = {
    name: ['姓名', 'name', '名字'],
    gender: ['性别', 'gender', '性'],
    idCard: ['身份证', 'idcard', 'id', '证件号'],
    phone: ['电话', 'phone', '手机', '联系方式'],
    birthDate: ['出生日期', 'birth', '生日', '出生'],
    address: ['地址', 'address', '住址'],
    occupation: ['职业', 'job', '工作'],
    healthStatus: ['健康状态', 'health', '健康']
  }
  return aliases[field] || []
}

const clearMapping = () => {
  fieldMappings.forEach(mapping => {
    mapping.fileColumn = ''
  })
  ElMessage.success('映射已清空')
}

const getExampleData = (column) => {
  if (!column || !fileData.value.length) return ''

  const examples = fileData.value.slice(0, 3).map(row => row[column]).filter(Boolean)
  return examples.join(', ')
}

const processPreviewData = () => {
  previewData.value = fileData.value.map(row => {
    const processedRow = {}
    const errors = []

    // 映射字段
    fieldMappings.forEach(mapping => {
      if (mapping.fileColumn) {
        processedRow[mapping.systemField] = row[mapping.fileColumn]
      }
    })

    // 验证必填字段
    fieldMappings.forEach(mapping => {
      if (mapping.required && !processedRow[mapping.systemField]) {
        errors.push(`${mapping.label}不能为空`)
      }
    })

    // 验证数据格式
    if (processedRow.idCard && !/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/.test(processedRow.idCard)) {
      errors.push('身份证号格式不正确')
    }

    if (processedRow.phone && !/^1[3-9]\d{9}$/.test(processedRow.phone)) {
      errors.push('手机号格式不正确')
    }

    // 确定状态
    let status = 'valid'
    if (errors.length > 0) {
      status = 'error'
    } else if (isDuplicate(processedRow)) {
      status = 'duplicate'
    }

    processedRow._status = status
    processedRow._errors = errors

    return processedRow
  })
}

const isDuplicate = (row) => {
  // 简化处理：检查身份证号是否重复
  return previewData.value.some(existingRow =>
    existingRow.idCard === row.idCard && existingRow._status !== 'error'
  )
}

const getRowStatusType = (status) => {
  const typeMap = {
    valid: 'success',
    error: 'danger',
    duplicate: 'warning'
  }
  return typeMap[status] || 'info'
}

const getRowStatusText = (status) => {
  const textMap = {
    valid: '有效',
    error: '错误',
    duplicate: '重复'
  }
  return textMap[status] || '未知'
}

const nextStep = async () => {
  if (currentStep.value === 1) {
    // 处理预览数据
    processPreviewData()
  } else if (currentStep.value === 2) {
    // 开始导入
    await startImport()
  }

  currentStep.value++
}

const prevStep = () => {
  currentStep.value--
}

const startImport = async () => {
  importing.value = true

  try {
    const validData = previewData.value.filter(row => row._status === 'valid')
    const response = await residentAPI.importResidents({
      data: validData,
      mappings: fieldMappings
    })

    if (response.success) {
      Object.assign(importResult, response.data)
      ElMessage.success('数据导入成功')
    } else {
      Object.assign(importResult, {
        success: false,
        message: response.message || '导入失败'
      })
    }
  } catch (error) {
    Object.assign(importResult, {
      success: false,
      message: '导入过程中发生错误'
    })
    ElMessage.error('导入失败')
  } finally {
    importing.value = false
  }
}

const viewImportLog = () => {
  window.open(importResult.log_file, '_blank')
}

const completeImport = () => {
  emit('success')
  dialogVisible.value = false
  resetDialog()
}

const resetDialog = () => {
  currentStep.value = 0
  fileList.value = []
  fileData.value = []
  fileColumns.value = []
  previewData.value = []
  previewPage.value = 1

  fieldMappings.forEach(mapping => {
    mapping.fileColumn = ''
  })

  Object.assign(importResult, {
    success: false,
    message: '',
    total: 0,
    success_count: 0,
    error_count: 0,
    log_file: ''
  })
}

// 监听对话框关闭
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    resetDialog()
  }
})
</script>

<style lang="scss" scoped>
.import-container {
  .step-content {
    margin: 30px 0;
  }

  .upload-section {
    .upload-dragger {
      width: 100%;
    }

    .template-download {
      text-align: center;
      margin-top: 30px;

      .template-tip {
        margin-top: 8px;
        color: #909399;
        font-size: 13px;
      }
    }
  }

  .import-rules {
    margin-top: 30px;

    ul {
      margin: 0;
      padding-left: 20px;

      li {
        margin: 8px 0;
        color: #606266;
        line-height: 1.5;
      }
    }
  }

  .mapping-section {
    h4 {
      margin: 0 0 8px 0;
      color: #303133;
    }

    .required {
      color: #f56c6c;
    }

    .example-data {
      color: #909399;
      font-size: 12px;
    }

    .mapping-actions {
      margin-top: 20px;
      text-align: right;
    }
  }

  .preview-section {
    .preview-stats {
      margin-bottom: 20px;

      .stat-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: white;
        border: 1px solid #e4e7ed;
        border-radius: 8px;

        &.success {
          border-color: #67c23a;
          background: #f0f9ff;
        }

        &.warning {
          border-color: #e6a23c;
          background: #fdf6ec;
        }

        &.info {
          border-color: #409eff;
          background: #ecf5ff;
        }

        .stat-number {
          font-size: 20px;
          font-weight: bold;
          color: #303133;
        }

        .stat-label {
          font-size: 12px;
          color: #909399;
        }
      }
    }

    .error-text {
      color: #f56c6c;
      font-size: 12px;
    }

    .preview-pagination {
      margin-top: 16px;
      text-align: center;
    }
  }

  .result-section {
    .result-stats {
      margin: 20px 0;

      .result-stat {
        text-align: center;
        padding: 16px;
        border: 1px solid #e4e7ed;
        border-radius: 8px;

        &.success {
          border-color: #67c23a;
          background: #f0f9ff;
        }

        &.error {
          border-color: #f56c6c;
          background: #fef0f0;
        }

        .stat-number {
          font-size: 24px;
          font-weight: bold;
          color: #303133;
        }

        .stat-label {
          margin-top: 4px;
          font-size: 14px;
          color: #909399;
        }
      }
    }

    .result-actions {
      margin-top: 20px;
      display: flex;
      justify-content: center;
      gap: 12px;
    }
  }
}

.dialog-footer {
  text-align: right;
}

// 响应式设计
@media (max-width: 768px) {
  .import-container {
    .preview-stats,
    .result-stats {
      :deep(.el-col) {
        margin-bottom: 16px;
      }
    }
  }
}
</style>