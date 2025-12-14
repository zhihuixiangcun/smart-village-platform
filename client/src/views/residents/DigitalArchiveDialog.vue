<template>
  <el-dialog
    v-model="visible"
    title="村民数字化档案"
    width="1000px"
    :close-on-click-modal="false"
  >
    <div class="digital-archive">
      <!-- 档案头部 -->
      <div class="archive-header">
        <div class="header-left">
          <div class="avatar-section">
            <el-avatar :size="80" :src="resident?.avatar" icon="UserFilled" />
            <el-upload
              class="avatar-uploader"
              action="/api/upload/avatar"
              :show-file-list="false"
              :on-success="handleAvatarSuccess"
              :before-upload="beforeAvatarUpload"
            >
              <el-button size="small" icon="Camera">更换头像</el-button>
            </el-upload>
          </div>
          <div class="basic-info">
            <h2>{{ resident?.name }}</h2>
            <div class="info-tags">
              <el-tag type="primary">{{ resident?.gender === 'male' ? '男' : '女' }}</el-tag>
              <el-tag type="success">{{ calculateAge(resident?.birthDate) }}岁</el-tag>
              <el-tag :type="getStatusType(resident?.status)">{{ getStatusText(resident?.status) }}</el-tag>
            </div>
            <p class="resident-id">档案编号：{{ resident?.id }}</p>
          </div>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="showEditDialog" icon="Edit">
            编辑档案
          </el-button>
          <el-button @click="exportArchive" icon="Download">
            导出档案
          </el-button>
        </div>
      </div>

      <!-- 数字化档案内容 -->
      <el-tabs v-model="activeTab" class="archive-tabs">
        <!-- 基础信息 -->
        <el-tab-pane label="基础信息" name="basic">
          <div class="basic-section">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-card class="info-card" shadow="never">
                  <template #header>
                    <span>个人信息</span>
                  </template>
                  <el-descriptions :column="1" border>
                    <el-descriptions-item label="姓名">{{ resident?.name }}</el-descriptions-item>
                    <el-descriptions-item label="性别">{{ resident?.gender === 'male' ? '男' : '女' }}</el-descriptions-item>
                    <el-descriptions-item label="出生日期">{{ formatDate(resident?.birthDate) }}</el-descriptions-item>
                    <el-descriptions-item label="身份证号">
                      <span class="sensitive-data" @click="toggleSensitiveData('idCard')">
                        {{ showSensitive.idCard ? resident?.idCard : maskIdCard(resident?.idCard) }}
                        <el-icon><{{ showSensitive.idCard ? 'Hide' : 'View' }} /></el-icon>
                      </span>
                    </el-descriptions-item>
                    <el-descriptions-item label="联系电话">
                      <span class="sensitive-data" @click="toggleSensitiveData('phone')">
                        {{ showSensitive.phone ? resident?.phone : maskPhone(resident?.phone) }}
                        <el-icon><{{ showSensitive.phone ? 'Hide' : 'View' }} /></el-icon>
                      </span>
                    </el-descriptions-item>
                    <el-descriptions-item label="民族">{{ resident?.ethnicity || '汉族' }}</el-descriptions-item>
                    <el-descriptions-item label="政治面貌">{{ resident?.politicalStatus || '群众' }}</el-descriptions-item>
                    <el-descriptions-item label="婚姻状况">{{ resident?.maritalStatus || '未知' }}</el-descriptions-item>
                  </el-descriptions>
                </el-card>
              </el-col>

              <el-col :span="12">
                <el-card class="info-card" shadow="never">
                  <template #header>
                    <span>居住信息</span>
                  </template>
                  <el-descriptions :column="1" border>
                    <el-descriptions-item label="户码">{{ resident?.householdCode }}</el-descriptions-item>
                    <el-descriptions-item label="家庭角色">{{ getFamilyRoleText(resident?.familyRole) }}</el-descriptions-item>
                    <el-descriptions-item label="现住地址">{{ resident?.address }}</el-descriptions-item>
                    <el-descriptions-item label="户籍地址">{{ resident?.registeredAddress || resident?.address }}</el-descriptions-item>
                    <el-descriptions-item label="居住性质">{{ resident?.residenceType || '常住' }}</el-descriptions-item>
                    <el-descriptions-item label="迁入时间">{{ formatDate(resident?.moveInDate) || '本地户' }}</el-descriptions-item>
                    <el-descriptions-item label="房屋产权">{{ resident?.propertyOwnership || '自有' }}</el-descriptions-item>
                  </el-descriptions>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

        <!-- 社会信息 -->
        <el-tab-pane label="社会信息" name="social">
          <div class="social-section">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-card class="info-card" shadow="never">
                  <template #header>
                    <span>教育就业</span>
                  </template>
                  <el-descriptions :column="1" border>
                    <el-descriptions-item label="学历">{{ resident?.education || '未知' }}</el-descriptions-item>
                    <el-descriptions-item label="专业">{{ resident?.major || '无' }}</el-descriptions-item>
                    <el-descriptions-item label="职业">{{ resident?.occupation || '未知' }}</el-descriptions-item>
                    <el-descriptions-item label="工作单位">{{ resident?.workplace || '无' }}</el-descriptions-item>
                    <el-descriptions-item label="职务">{{ resident?.position || '无' }}</el-descriptions-item>
                    <el-descriptions-item label="就业状态">{{ resident?.employmentStatus || '未知' }}</el-descriptions-item>
                  </el-descriptions>
                </el-card>
              </el-col>

              <el-col :span="8">
                <el-card class="info-card" shadow="never">
                  <template #header>
                    <span>经济状况</span>
                  </template>
                  <el-descriptions :column="1" border>
                    <el-descriptions-item label="家庭类型">
                      <el-tag v-if="resident?.householdType" :type="getHouseholdTypeTag(resident.householdType)">
                        {{ getHouseholdTypeText(resident.householdType) }}
                      </el-tag>
                      <span v-else>普通户</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="收入水平">{{ resident?.incomeLevel || '未知' }}</el-descriptions-item>
                    <el-descriptions-item label="主要收入来源">{{ resident?.incomeSource || '未知' }}</el-descriptions-item>
                    <el-descriptions-item label="是否低保户">
                      <el-tag :type="resident?.isLowIncome ? 'warning' : 'success'">
                        {{ resident?.isLowIncome ? '是' : '否' }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="是否贫困户">
                      <el-tag :type="resident?.isPoor ? 'danger' : 'success'">
                        {{ resident?.isPoor ? '是' : '否' }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="扶贫状态">{{ resident?.povertyStatus || '非贫困户' }}</el-descriptions-item>
                  </el-descriptions>
                </el-card>
              </el-col>

              <el-col :span="8">
                <el-card class="info-card" shadow="never">
                  <template #header>
                    <span>健康状况</span>
                  </template>
                  <el-descriptions :column="1" border>
                    <el-descriptions-item label="健康状态">
                      <el-tag :type="getHealthStatusType(resident?.healthStatus)">
                        {{ getHealthStatusText(resident?.healthStatus) }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="残疾情况">{{ resident?.disabilityInfo || '无' }}</el-descriptions-item>
                    <el-descriptions-item label="慢性病">{{ resident?.chronicDiseases || '无' }}</el-descriptions-item>
                    <el-descriptions-item label="医保类型">{{ resident?.medicalInsuranceType || '城乡居民医保' }}</el-descriptions-item>
                    <el-descriptions-item label="参保状态">
                      <el-tag :type="resident?.insuranceStatus === 'active' ? 'success' : 'warning'">
                        {{ resident?.insuranceStatus === 'active' ? '正常参保' : '未参保' }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="联系人">{{ resident?.emergencyContact || '无' }}</el-descriptions-item>
                  </el-descriptions>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

        <!-- 数字化记录 -->
        <el-tab-pane label="数字化记录" name="digital">
          <div class="digital-records">
            <!-- 照片档案 -->
            <el-card class="record-card" shadow="never">
              <template #header>
                <div class="card-header">
                  <span>照片档案</span>
                  <el-upload
                    action="/api/upload/photo"
                    :on-success="handlePhotoSuccess"
                    :show-file-list="false"
                    accept="image/*"
                    multiple
                  >
                    <el-button size="small" icon="Plus">添加照片</el-button>
                  </el-upload>
                </div>
              </template>

              <div class="photo-gallery">
                <div
                  v-for="photo in digitalRecord.photos"
                  :key="photo.id"
                  class="photo-item"
                >
                  <el-image
                    :src="photo.url"
                    :preview-src-list="digitalRecord.photos.map(p => p.url)"
                    fit="cover"
                    class="photo-image"
                  />
                  <div class="photo-info">
                    <span class="photo-title">{{ photo.title }}</span>
                    <span class="photo-date">{{ formatDate(photo.uploadDate) }}</span>
                  </div>
                  <div class="photo-actions">
                    <el-button size="small" @click="editPhoto(photo)" icon="Edit" />
                    <el-button size="small" @click="deletePhoto(photo)" icon="Delete" />
                  </div>
                </div>
                <div v-if="!digitalRecord.photos.length" class="no-photos">
                  暂无照片记录
                </div>
              </div>
            </el-card>

            <!-- 证件档案 -->
            <el-card class="record-card" shadow="never">
              <template #header>
                <div class="card-header">
                  <span>证件档案</span>
                  <el-button size="small" @click="showAddDocumentDialog" icon="Plus">
                    添加证件
                  </el-button>
                </div>
              </template>

              <el-table :data="digitalRecord.documents" border>
                <el-table-column prop="type" label="证件类型" width="120" />
                <el-table-column prop="number" label="证件号码" width="180">
                  <template #default="scope">
                    <span class="sensitive-data" @click="toggleDocumentVisibility(scope.row.id)">
                      {{ getDocumentDisplay(scope.row) }}
                      <el-icon><{{ scope.row.visible ? 'Hide' : 'View' }} /></el-icon>
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="issueDate" label="发证日期" width="120">
                  <template #default="scope">
                    {{ formatDate(scope.row.issueDate) }}
                  </template>
                </el-table-column>
                <el-table-column prop="expiryDate" label="有效期至" width="120">
                  <template #default="scope">
                    <span :class="{ 'expired': isExpired(scope.row.expiryDate) }">
                      {{ formatDate(scope.row.expiryDate) }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="80">
                  <template #default="scope">
                    <el-tag :type="getDocumentStatusType(scope.row)">
                      {{ getDocumentStatusText(scope.row) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="120">
                  <template #default="scope">
                    <el-button size="small" @click="viewDocument(scope.row)" icon="View" />
                    <el-button size="small" @click="editDocument(scope.row)" icon="Edit" />
                  </template>
                </el-table-column>
              </el-table>
            </el-card>

            <!-- 服务记录 -->
            <el-card class="record-card" shadow="never">
              <template #header>
                <span>服务记录</span>
              </template>

              <el-timeline>
                <el-timeline-item
                  v-for="record in digitalRecord.serviceRecords"
                  :key="record.id"
                  :timestamp="formatDate(record.date)"
                  :type="getServiceType(record.type)"
                >
                  <el-card shadow="never" class="service-record">
                    <h4>{{ record.title }}</h4>
                    <p>{{ record.description }}</p>
                    <div class="record-meta">
                      <el-tag size="small">{{ record.serviceType }}</el-tag>
                      <span class="operator">办理人：{{ record.operator }}</span>
                    </div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
            </el-card>
          </div>
        </el-tab-pane>

        <!-- 智能分析 -->
        <el-tab-pane label="智能分析" name="analysis">
          <div class="analysis-section">
            <el-row :gutter="20">
              <!-- 风险评估 -->
              <el-col :span="12">
                <el-card class="analysis-card" shadow="never">
                  <template #header>
                    <span>风险评估</span>
                  </template>
                  <div class="risk-assessment">
                    <div class="risk-item">
                      <span class="risk-label">整体风险等级</span>
                      <el-tag :type="getRiskLevelType(analysis.overallRisk)">
                        {{ analysis.overallRisk }}
                      </el-tag>
                    </div>
                    <div class="risk-item">
                      <span class="risk-label">健康风险</span>
                      <el-progress
                        :percentage="analysis.healthRisk"
                        :status="analysis.healthRisk > 70 ? 'exception' : analysis.healthRisk > 40 ? 'warning' : 'success'"
                      />
                    </div>
                    <div class="risk-item">
                      <span class="risk-label">经济风险</span>
                      <el-progress
                        :percentage="analysis.economicRisk"
                        :status="analysis.economicRisk > 70 ? 'exception' : analysis.economicRisk > 40 ? 'warning' : 'success'"
                      />
                    </div>
                    <div class="risk-item">
                      <span class="risk-label">社会风险</span>
                      <el-progress
                        :percentage="analysis.socialRisk"
                        :status="analysis.socialRisk > 70 ? 'exception' : analysis.socialRisk > 40 ? 'warning' : 'success'"
                      />
                    </div>
                  </div>
                </el-card>
              </el-col>

              <!-- 关怀建议 -->
              <el-col :span="12">
                <el-card class="analysis-card" shadow="never">
                  <template #header>
                    <span>关怀建议</span>
                  </template>
                  <div class="care-suggestions">
                    <div
                      v-for="suggestion in analysis.careSuggestions"
                      :key="suggestion.id"
                      class="suggestion-item"
                    >
                      <div class="suggestion-icon">
                        <el-icon :color="getSuggestionColor(suggestion.priority)">
                          <component :is="getSuggestionIcon(suggestion.type)" />
                        </el-icon>
                      </div>
                      <div class="suggestion-content">
                        <h5>{{ suggestion.title }}</h5>
                        <p>{{ suggestion.description }}</p>
                      </div>
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>

            <!-- 数据统计 -->
            <el-card class="analysis-card" shadow="never" style="margin-top: 20px;">
              <template #header>
                <span>档案完整度分析</span>
              </template>
              <div class="completeness-analysis">
                <div class="completeness-overview">
                  <div class="completeness-score">
                    <el-progress
                      type="circle"
                      :percentage="analysis.completeness"
                      :color="getCompletenessColor(analysis.completeness)"
                    >
                      <span class="score-text">{{ analysis.completeness }}%</span>
                    </el-progress>
                    <p>档案完整度</p>
                  </div>
                  <div class="completeness-details">
                    <div
                      v-for="item in analysis.completenessDetails"
                      :key="item.category"
                      class="detail-item"
                    >
                      <span class="category">{{ item.category }}</span>
                      <el-progress
                        :percentage="item.percentage"
                        :status="getProgressStatus(item.percentage)"
                        :show-text="false"
                      />
                      <span class="percentage">{{ item.percentage }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </el-card>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">关闭</el-button>
        <el-button type="primary" @click="saveChanges" :loading="saving">
          保存更改
        </el-button>
      </div>
    </template>

    <!-- 编辑档案对话框 -->
    <resident-form-dialog
      v-model="editDialogVisible"
      :resident="resident"
      mode="edit"
      @success="handleEditSuccess"
    />

    <!-- 添加证件对话框 -->
    <add-document-dialog
      v-model="addDocumentVisible"
      @confirm="handleAddDocument"
    />
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  UserFilled, Camera, Edit, Download, Plus, View, Hide,
  Delete, Warning, Star, TrendCharts
} from '@element-plus/icons-vue'

// 导入组件
import ResidentFormDialog from './ResidentFormDialog.vue'
import AddDocumentDialog from './AddDocumentDialog.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  resident: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'refresh'])

// 响应式数据
const activeTab = ref('basic')
const saving = ref(false)
const editDialogVisible = ref(false)
const addDocumentVisible = ref(false)

// 敏感数据显示控制
const showSensitive = reactive({
  idCard: false,
  phone: false
})

// 数字化记录
const digitalRecord = reactive({
  photos: [
    { id: 1, url: '/images/photo1.jpg', title: '证件照', uploadDate: '2024-01-15' },
    { id: 2, url: '/images/photo2.jpg', title: '全家福', uploadDate: '2024-02-20' }
  ],
  documents: [
    {
      id: 1,
      type: '身份证',
      number: '370123199001011234',
      issueDate: '2020-01-01',
      expiryDate: '2030-01-01',
      status: 'valid',
      visible: false
    },
    {
      id: 2,
      type: '户口本',
      number: '370123000001',
      issueDate: '2019-06-01',
      expiryDate: null,
      status: 'valid',
      visible: false
    }
  ],
  serviceRecords: [
    {
      id: 1,
      title: '低保申请',
      description: '提交低保户申请材料，已通过审核',
      date: '2024-01-10',
      type: 'application',
      serviceType: '社会救助',
      operator: '村委会'
    },
    {
      id: 2,
      title: '健康体检',
      description: '参加年度免费健康体检',
      date: '2024-03-15',
      type: 'service',
      serviceType: '医疗服务',
      operator: '卫生院'
    }
  ]
})

// 智能分析数据
const analysis = reactive({
  overallRisk: '低风险',
  healthRisk: 25,
  economicRisk: 60,
  socialRisk: 15,
  completeness: 85,
  completenessDetails: [
    { category: '基础信息', percentage: 100 },
    { category: '社会信息', percentage: 80 },
    { category: '健康信息', percentage: 75 },
    { category: '数字化记录', percentage: 85 }
  ],
  careSuggestions: [
    {
      id: 1,
      title: '定期健康关怀',
      description: '建议每季度进行健康状况回访',
      type: 'health',
      priority: 'medium'
    },
    {
      id: 2,
      title: '就业帮扶',
      description: '可为其提供就业培训和岗位推荐',
      type: 'employment',
      priority: 'high'
    }
  ]
})

// 计算属性
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 方法
const calculateAge = (birthDate) => {
  if (!birthDate) return 0
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

const toggleSensitiveData = (field) => {
  showSensitive[field] = !showSensitive[field]
}

const maskIdCard = (idCard) => {
  if (!idCard) return ''
  return idCard.replace(/^(.{6}).*(.{4})$/, '$1**********$2')
}

const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/^(.{3}).*(.{4})$/, '$1****$2')
}

const handleAvatarSuccess = (response) => {
  if (response.success) {
    // 更新头像
    ElMessage.success('头像更新成功')
    emit('refresh')
  }
}

const beforeAvatarUpload = (file) => {
  const isValidType = file.type.startsWith('image/')
  const isValidSize = file.size / 1024 / 1024 < 2

  if (!isValidType) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isValidSize) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

const showEditDialog = () => {
  editDialogVisible.value = true
}

const handleEditSuccess = () => {
  editDialogVisible.value = false
  emit('refresh')
  ElMessage.success('档案更新成功')
}

const exportArchive = () => {
  ElMessage.info('档案导出功能开发中...')
}

const handlePhotoSuccess = (response) => {
  if (response.success) {
    digitalRecord.photos.push({
      id: Date.now(),
      url: response.data.url,
      title: '新照片',
      uploadDate: new Date().toISOString().split('T')[0]
    })
    ElMessage.success('照片添加成功')
  }
}

const editPhoto = (photo) => {
  ElMessage.info('编辑照片功能开发中...')
}

const deletePhoto = (photo) => {
  const index = digitalRecord.photos.findIndex(p => p.id === photo.id)
  if (index > -1) {
    digitalRecord.photos.splice(index, 1)
    ElMessage.success('照片删除成功')
  }
}

const showAddDocumentDialog = () => {
  addDocumentVisible.value = true
}

const handleAddDocument = (document) => {
  digitalRecord.documents.push({
    ...document,
    id: Date.now(),
    visible: false
  })
  addDocumentVisible.value = false
  ElMessage.success('证件添加成功')
}

const toggleDocumentVisibility = (id) => {
  const doc = digitalRecord.documents.find(d => d.id === id)
  if (doc) {
    doc.visible = !doc.visible
  }
}

const getDocumentDisplay = (doc) => {
  return doc.visible ? doc.number : maskIdCard(doc.number)
}

const isExpired = (date) => {
  return date && new Date(date) < new Date()
}

const viewDocument = (doc) => {
  ElMessage.info('查看证件功能开发中...')
}

const editDocument = (doc) => {
  ElMessage.info('编辑证件功能开发中...')
}

const saveChanges = async () => {
  saving.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('更改已保存')
  } finally {
    saving.value = false
  }
}

// 工具函数
const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}

const getStatusType = (status) => {
  const map = { active: 'success', inactive: 'danger', pending: 'warning' }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = { active: '正常', inactive: '异常', pending: '待审' }
  return map[status] || '未知'
}

const getFamilyRoleText = (role) => {
  const map = { head: '户主', spouse: '配偶', child: '子女', parent: '父母', other: '其他' }
  return map[role] || '未知'
}

const getHouseholdTypeText = (type) => {
  const map = { normal: '普通户', poor: '贫困户', lowIncome: '低保户', disabled: '残疾户' }
  return map[type] || '普通户'
}

const getHouseholdTypeTag = (type) => {
  const map = { normal: 'success', poor: 'danger', lowIncome: 'warning', disabled: 'info' }
  return map[type] || 'success'
}

const getHealthStatusType = (status) => {
  const map = { healthy: 'success', chronic: 'warning', disabled: 'danger' }
  return map[status] || 'info'
}

const getHealthStatusText = (status) => {
  const map = { healthy: '健康', chronic: '慢性病', disabled: '残疾' }
  return map[status] || '未知'
}

const getDocumentStatusType = (doc) => {
  if (isExpired(doc.expiryDate)) return 'danger'
  return 'success'
}

const getDocumentStatusText = (doc) => {
  if (isExpired(doc.expiryDate)) return '已过期'
  return '有效'
}

const getServiceType = (type) => {
  const map = { application: 'primary', service: 'success', consultation: 'info' }
  return map[type] || 'primary'
}

const getRiskLevelType = (level) => {
  const map = { '低风险': 'success', '中风险': 'warning', '高风险': 'danger' }
  return map[level] || 'info'
}

const getSuggestionColor = (priority) => {
  const map = { low: '#67c23a', medium: '#e6a23c', high: '#f56c6c' }
  return map[priority] || '#909399'
}

const getSuggestionIcon = (type) => {
  const map = { health: 'Star', employment: 'TrendCharts', education: 'Warning' }
  return map[type] || 'Star'
}

const getCompletenessColor = (percentage) => {
  if (percentage >= 90) return '#67c23a'
  if (percentage >= 70) return '#e6a23c'
  return '#f56c6c'
}

const getProgressStatus = (percentage) => {
  if (percentage >= 90) return 'success'
  if (percentage >= 70) return undefined
  return 'exception'
}

// 监听器
watch(() => props.modelValue, (val) => {
  if (val) {
    activeTab.value = 'basic'
  }
})
</script>

<style lang="scss" scoped>
.digital-archive {
  .archive-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    margin-bottom: 20px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;

      .avatar-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;

        .avatar-uploader {
          .el-button {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.3);
            color: white;

            &:hover {
              background: rgba(255, 255, 255, 0.3);
            }
          }
        }
      }

      .basic-info {
        h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
        }

        .info-tags {
          margin-bottom: 8px;

          .el-tag {
            margin-right: 8px;
          }
        }

        .resident-id {
          margin: 0;
          opacity: 0.8;
          font-size: 14px;
        }
      }
    }

    .header-right {
      display: flex;
      gap: 12px;

      .el-button {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
        color: white;

        &:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      }
    }
  }

  .archive-tabs {
    .basic-section {
      .info-card {
        height: 320px;

        .sensitive-data {
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #409eff;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }

    .social-section {
      .info-card {
        height: 280px;
      }
    }

    .digital-records {
      .record-card {
        margin-bottom: 20px;

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .photo-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;

          .photo-item {
            position: relative;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e4e7ed;

            .photo-image {
              width: 100%;
              height: 150px;
            }

            .photo-info {
              padding: 8px;
              background: #f8f9fa;

              .photo-title {
                display: block;
                font-weight: 500;
                color: #303133;
              }

              .photo-date {
                font-size: 12px;
                color: #909399;
              }
            }

            .photo-actions {
              position: absolute;
              top: 8px;
              right: 8px;
              opacity: 0;
              transition: opacity 0.3s;

              .el-button {
                padding: 4px;
                background: rgba(255, 255, 255, 0.9);
              }
            }

            &:hover .photo-actions {
              opacity: 1;
            }
          }

          .no-photos {
            grid-column: 1 / -1;
            text-align: center;
            color: #909399;
            padding: 40px;
          }
        }

        .service-record {
          h4 {
            margin: 0 0 8px 0;
            color: #303133;
          }

          p {
            margin: 0 0 12px 0;
            color: #606266;
            line-height: 1.6;
          }

          .record-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;

            .operator {
              font-size: 12px;
              color: #909399;
            }
          }
        }

        .expired {
          color: #f56c6c;
        }
      }
    }

    .analysis-section {
      .analysis-card {
        .risk-assessment {
          .risk-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;

            .risk-label {
              font-weight: 500;
              color: #303133;
            }
          }
        }

        .care-suggestions {
          .suggestion-item {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;

            .suggestion-icon {
              flex-shrink: 0;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .suggestion-content {
              flex: 1;

              h5 {
                margin: 0 0 4px 0;
                color: #303133;
              }

              p {
                margin: 0;
                color: #606266;
                font-size: 14px;
                line-height: 1.5;
              }
            }
          }
        }

        .completeness-analysis {
          .completeness-overview {
            display: flex;
            gap: 40px;
            align-items: center;

            .completeness-score {
              text-align: center;

              .score-text {
                font-size: 16px;
                font-weight: bold;
              }

              p {
                margin: 16px 0 0 0;
                color: #606266;
              }
            }

            .completeness-details {
              flex: 1;

              .detail-item {
                display: flex;
                align-items: center;
                gap: 16px;
                margin-bottom: 12px;

                .category {
                  width: 80px;
                  font-size: 14px;
                  color: #303133;
                }

                .el-progress {
                  flex: 1;
                }

                .percentage {
                  width: 50px;
                  text-align: right;
                  font-size: 14px;
                  color: #606266;
                }
              }
            }
          }
        }
      }
    }
  }
}

.dialog-footer {
  text-align: right;
}

// 响应式设计
@media (max-width: 768px) {
  .digital-archive {
    .archive-header {
      .header-left {
        flex-direction: column;
        text-align: center;
      }

      .header-right {
        flex-direction: column;
      }
    }

    .photo-gallery {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important;
    }

    .completeness-overview {
      flex-direction: column !important;
      gap: 20px !important;
    }
  }
}
</style>