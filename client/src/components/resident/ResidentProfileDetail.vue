<template>
  <div class="resident-profile-detail">
    <!-- 基本信息 -->
    <el-card class="detail-card">
      <template #header>
        <div class="card-header">
          <span>基本信息</span>
          <el-button type="primary" @click="handleEdit">
            编辑档案
          </el-button>
        </div>
      </template>

      <el-descriptions :column="3" border>
        <el-descriptions-item label="姓名">
          {{ profile?.personalInfo?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="性别">
          <el-tag :type="profile?.personalInfo?.gender === '男' ? 'primary' : 'danger'" size="small">
            {{ profile?.personalInfo?.gender }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="年龄">
          {{ profile?.personalInfo?.age }}岁
        </el-descriptions-item>
        <el-descriptions-item label="身份证号">
          {{ maskIdCard(profile?.personalInfo?.idCard) }}
        </el-descriptions-item>
        <el-descriptions-item label="民族">
          {{ profile?.personalInfo?.ethnicity }}
        </el-descriptions-item>
        <el-descriptions-item label="政治面貌">
          {{ profile?.personalInfo?.politicalStatus }}
        </el-descriptions-item>
        <el-descriptions-item label="婚姻状况">
          {{ profile?.personalInfo?.maritalStatus }}
        </el-descriptions-item>
        <el-descriptions-item label="健康状况">
          {{ profile?.personalInfo?.healthStatus }}
        </el-descriptions-item>
        <el-descriptions-item label="血型">
          {{ profile?.personalInfo?.bloodType || '未知' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 联系方式 -->
    <el-card class="detail-card">
      <template #header>
        <span>联系方式</span>
      </template>

      <el-descriptions :column="3" border>
        <el-descriptions-item label="手机号码">
          {{ profile?.contact?.phone }}
        </el-descriptions-item>
        <el-descriptions-item label="电子邮箱">
          {{ profile?.contact?.email || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="微信号">
          {{ profile?.contact?.wechat || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="QQ号">
          {{ profile?.contact?.qq || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="家庭住址" :span="2">
          {{ profile?.contact?.address }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 教育背景 -->
    <el-card class="detail-card">
      <template #header>
        <span>教育背景</span>
      </template>

      <el-descriptions :column="4" border>
        <el-descriptions-item label="学历">
          {{ profile?.education?.degree || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="毕业学校">
          {{ profile?.education?.school || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="专业">
          {{ profile?.education?.major || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="毕业年份">
          {{ profile?.education?.graduationYear || '未填写' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 就业信息 -->
    <el-card class="detail-card">
      <template #header>
        <span>就业信息</span>
      </template>

      <el-descriptions :column="4" border>
        <el-descriptions-item label="就业状态">
          {{ profile?.employment?.status || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="工作单位">
          {{ profile?.employment?.employer || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="职位">
          {{ profile?.employment?.position || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="月收入">
          {{ formatIncome(profile?.employment?.income?.monthly) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 社会保障 -->
    <el-card class="detail-card">
      <template #header>
        <span>社会保障</span>
      </template>

      <el-row :gutter="20">
        <el-col :span="8">
          <div class="security-item">
            <el-tag :type="profile?.socialSecurity?.hasMedicalInsurance ? 'success' : 'info'">
              {{ profile?.socialSecurity?.hasMedicalInsurance ? '有' : '无' }}医保
            </el-tag>
            <span class="security-detail">{{ profile?.socialSecurity?.medicalInsuranceType }}</span>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="security-item">
            <el-tag :type="profile?.socialSecurity?.hasPensionInsurance ? 'success' : 'info'">
              {{ profile?.socialSecurity?.hasPensionInsurance ? '有' : '无' }}养老
            </el-tag>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="security-item">
            <el-tag :type="profile?.socialSecurity?.hasUnemploymentInsurance ? 'success' : 'info'">
              {{ profile?.socialSecurity?.hasUnemploymentInsurance ? '有' : '无' }}失业
            </el-tag>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 家庭关系 -->
    <el-card class="detail-card" v-if="profile?.familyRelations?.length > 0">
      <template #header>
        <span>家庭成员</span>
      </template>

      <el-table :data="profile.familyRelations" style="width: 100%">
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="relationType" label="关系" width="100" />
        <el-table-column prop="age" label="年龄" width="80" align="center" />
        <el-table-column prop="phone" label="联系电话" width="150" />
        <el-table-column prop="occupation" label="职业" />
        <el-table-column prop="isCohabit" label="是否同住" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isCohabit ? 'success' : 'info'" size="small">
              {{ row.isCohabit ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="guardianFor" label="监护对象">
          <template #default="{ row }">
            <el-tag
              v-for="person in row.guardianFor"
              :key="person"
              size="small"
              style="margin-right: 5px"
            >
              {{ person }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 特殊标签 -->
    <el-card class="detail-card" v-if="profile?.tags?.length > 0">
      <template #header>
        <span>特殊标签</span>
      </template>

      <div class="tags-container">
        <el-tag
          v-for="tag in profile.tags"
          :key="tag"
          :type="getTagType(tag)"
          size="large"
          style="margin-right: 10px; margin-bottom: 10px"
        >
          {{ tag }}
        </el-tag>
      </div>
    </el-card>

    <!-- 档案文档 -->
    <el-card class="detail-card">
      <template #header>
        <div class="card-header">
          <span>档案文档</span>
          <el-button type="success" @click="handleUploadDocument">
            上传文档
          </el-button>
        </div>
      </template>

      <el-table :data="profile?.documents || []" style="width: 100%">
        <el-table-column prop="documentInfo.name" label="文档名称" />
        <el-table-column prop="documentInfo.type" label="类型" width="120" />
        <el-table-column prop="fileInfo.fileSize" label="大小" width="100">
          <template #default="{ row }">
            {{ formatFileSize(row.fileInfo.fileSize) }}
          </template>
        </el-table-column>
        <el-table-column prop="documentInfo.status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.documentInfo.status)" size="small">
              {{ row.documentInfo.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="上传时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDocument(row)">
              预览
            </el-button>
            <el-button link type="primary" @click="downloadDocument(row)">
              下载
            </el-button>
            <el-button link type="primary" @click="shareDocument(row)">
              分享
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 操作记录 -->
    <el-card class="detail-card">
      <template #header>
        <span>操作记录</span>
      </template>

      <el-timeline>
        <el-timeline-item
          v-for="log in operationLogs"
          :key="log.id"
          :timestamp="formatDate(log.createdAt)"
          :type="getLogType(log.type)"
        >
          <div class="log-item">
            <span class="log-action">{{ log.action }}</span>
            <span class="log-operator">{{ log.operator }}</span>
            <span class="log-remark" v-if="log.remark">{{ log.remark }}</span>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-card>

    <!-- 文档预览对话框 -->
    <el-dialog
      v-model="showDocumentDialog"
      :title="currentDocument?.documentInfo?.name"
      width="90%"
      top="5vh"
    >
      <DocumentPreview
        v-if="currentDocument"
        :document="currentDocument"
      />
    </el-dialog>

    <!-- 上传文档对话框 -->
    <el-dialog
      v-model="showUploadDialog"
      title="上传文档"
      width="800px"
    >
      <DocumentUpload
        :owner="profile?.userId || profile?._id"
        @submit="handleDocumentSubmit"
        @cancel="showUploadDialog = false"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import DocumentPreview from './DocumentPreview.vue'
import DocumentUpload from './DocumentUpload.vue'

// Props
const props = defineProps({
  profile: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['edit', 'refresh'])

// 响应式数据
const showDocumentDialog = ref(false)
const showUploadDialog = ref(false)
const currentDocument = ref(null)

// 操作记录（示例数据）
const operationLogs = ref([
  {
    id: 1,
    type: 'create',
    action: '创建档案',
    operator: '张三',
    remark: '初始创建村民档案',
    createdAt: '2025-01-15 10:30:00'
  },
  {
    id: 2,
    type: 'update',
    action: '更新信息',
    operator: '李四',
    remark: '修改联系电话',
    createdAt: '2025-01-16 14:20:00'
  },
  {
    id: 3,
    type: 'upload',
    action: '上传文档',
    operator: '王五',
    remark: '上传身份证扫描件',
    createdAt: '2025-01-17 09:15:00'
  }
])

// 获取标签类型
const getTagType = (tag) => {
  const tagTypeMap = {
    '党员': 'danger',
    '村干部': 'warning',
    '退役军人': 'success',
    '残疾人': 'info',
    '低保户': 'danger',
    '五保户': 'warning',
    '留守儿童': 'primary',
    '空巢老人': 'warning',
    '独居老人': 'warning',
    '大病家庭': 'danger',
    '单亲家庭': 'info',
    '失独家庭': 'danger',
    '烈属': 'danger',
    '优抚对象': 'success',
    '困难党员': 'danger',
    '返乡创业': 'success',
    '农民工': '',
    '大学生': 'primary',
    '专业技术人才': 'success',
    '其他': ''
  }
  return tagTypeMap[tag] || ''
}

// 获取状态类型
const getStatusType = (status) => {
  const statusMap = {
    '有效': 'success',
    '即将过期': 'warning',
    '已过期': 'danger',
    '遗失': 'info',
    '注销': 'info'
  }
  return statusMap[status] || 'info'
}

// 获取日志类型
const getLogType = (type) => {
  const typeMap = {
    'create': 'success',
    'update': 'primary',
    'upload': 'success',
    'delete': 'danger',
    'share': 'warning'
  }
  return typeMap[type] || 'primary'
}

// 身份证号脱敏
const maskIdCard = (idCard) => {
  if (!idCard) return ''
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}

// 格式化收入
const formatIncome = (income) => {
  if (!income) return '未填写'
  return `${income.toLocaleString()} 元`
}

// 格式化文件大小
const formatFileSize = (size) => {
  if (!size) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index++
  }
  return `${size.toFixed(2)} ${units[index]}`
}

// 格式化日期
const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

// 编辑档案
const handleEdit = () => {
  emit('edit', props.profile)
}

// 查看文档
const viewDocument = (document) => {
  currentDocument.value = document
  showDocumentDialog.value = true
}

// 下载文档
const downloadDocument = (document) => {
  ElMessage.info('下载功能开发中...')
}

// 分享文档
const shareDocument = (document) => {
  ElMessage.info('分享功能开发中...')
}

// 上传文档
const handleUploadDocument = () => {
  showUploadDialog.value = true
}

// 文档提交
const handleDocumentSubmit = (formData) => {
  ElMessage.success('文档上传成功')
  showUploadDialog.value = false
  emit('refresh')
}
</script>

<style lang="scss" scoped>
.resident-profile-detail {
  .detail-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .security-item {
      display: flex;
      align-items: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 4px;

      .security-detail {
        margin-left: 10px;
        color: #606266;
        font-size: 14px;
      }
    }

    .tags-container {
      .el-tag {
        font-size: 14px;
        padding: 8px 15px;
      }
    }

    .log-item {
      .log-action {
        font-weight: 500;
        margin-right: 10px;
      }

      .log-operator {
        color: #409eff;
        margin-right: 10px;
      }

      .log-remark {
        color: #606266;
      }
    }
  }
}
</style>