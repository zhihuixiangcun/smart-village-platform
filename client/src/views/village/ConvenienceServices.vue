<template>
  <div class="convenience-services">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1>便民服务</h1>
        <p>一站式政务服务、生活服务，让村民少跑腿</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showServiceApplication">
          <el-icon><Plus /></el-icon>
          新建申请
        </el-button>
        <el-button @click="showApplicationStatus">
          <el-icon><Clock /></el-icon>
          申请进度
        </el-button>
      </div>
    </header>

    <!-- 服务统计 -->
    <section class="stats-section">
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ statistics.totalServices }}</div>
            <div class="stat-label">服务项目</div>
          </div>
        </div>
        <div class="stat-card pending">
          <div class="stat-icon">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ statistics.pendingApplications }}</div>
            <div class="stat-label">待处理</div>
          </div>
        </div>
        <div class="stat-card processing">
          <div class="stat-icon">
            <el-icon><Loading /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ statistics.processingApplications }}</div>
            <div class="stat-label">处理中</div>
          </div>
        </div>
        <div class="stat-card completed">
          <div class="stat-icon">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-number">{{ statistics.completedApplications }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 快捷服务入口 -->
    <section class="quick-services">
      <div class="section-header">
        <h3>快捷服务</h3>
        <p>常用服务快速入口</p>
      </div>
      <div class="services-grid">
        <div class="service-card certificate" @click="goToService('certificate')">
          <div class="service-icon">
            <el-icon><CreditCard /></el-icon>
          </div>
          <h4>证件办理</h4>
          <p>身份证、户口本、结婚证等</p>
          <div class="service-badge">
            <el-tag type="primary">{{ quickStats.certificates }}</el-tag>
          </div>
        </div>

        <div class="service-card welfare" @click="goToService('welfare')">
          <div class="service-icon">
            <el-icon><Gift /></el-icon>
          </div>
          <h4>福利申请</h4>
          <p>低保、补贴、救助等</p>
          <div class="service-badge">
            <el-tag type="success">{{ quickStats.welfare }}</el-tag>
          </div>
        </div>

        <div class="service-card medical" @click="goToService('medical')">
          <div class="service-icon">
            <el-icon><FirstAidKit /></el-icon>
          </div>
          <h4>医保服务</h4>
          <p>医保报销、健康体检</p>
          <div class="service-badge">
            <el-tag type="warning">{{ quickStats.medical }}</el-tag>
          </div>
        </div>

        <div class="service-card agricultural" @click="goToService('agricultural')">
          <div class="service-icon">
            <el-icon><Grape /></el-icon>
          </div>
          <h4>农业服务</h4>
          <p>农技指导、补贴申请</p>
          <div class="service-badge">
            <el-tag type="info">{{ quickStats.agricultural }}</el-tag>
          </div>
        </div>

        <div class="service-card housing" @click="goToService('housing')">
          <div class="service-icon">
            <el-icon><House /></el-icon>
          </div>
          <h4>住房保障</h4>
          <p>住房申请、维修服务</p>
          <div class="service-badge">
            <el-tag type="primary">{{ quickStats.housing }}</el-tag>
          </div>
        </div>

        <div class="service-card elderly" @click="goToService('elderly')">
          <div class="service-icon">
            <el-icon><CaretLeft /></el-icon>
          </div>
          <h4>养老助老</h4>
          <p>养老服务、关爱帮扶</p>
          <div class="service-badge">
            <el-tag type="success">{{ quickStats.elderly }}</el-tag>
          </div>
        </div>
      </div>
    </section>

    <!-- 我的申请 -->
    <section class="my-applications">
      <div class="section-header">
        <h3>我的申请</h3>
        <el-button @click="refreshApplications">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>

      <div class="applications-tabs">
        <el-tabs v-model="activeTab" @tab-click="handleTabChange">
          <el-tab-pane label="全部" name="all">
            <ApplicationList
              :applications="filteredApplications"
              @view="viewApplication"
              @cancel="cancelApplication"
            />
          </el-tab-pane>
          <el-tab-pane label="待处理" name="pending">
            <ApplicationList
              :applications="pendingApplications"
              @view="viewApplication"
              @cancel="cancelApplication"
            />
          </el-tab-pane>
          <el-tab-pane label="处理中" name="processing">
            <ApplicationList
              :applications="processingApplications"
              @view="viewApplication"
            />
          </el-tab-pane>
          <el-tab-pane label="已完成" name="completed">
            <ApplicationList
              :applications="completedApplications"
              @view="viewApplication"
              @rate="rateApplication"
            />
          </el-tab-pane>
        </el-tabs>
      </div>
    </section>

    <!-- 服务指南 -->
    <section class="service-guide">
      <div class="section-header">
        <h3>服务指南</h3>
        <p>常见问题解答和办事指南</p>
      </div>

      <div class="guide-grid">
        <div class="guide-card">
          <div class="guide-icon">
            <el-icon><QuestionFilled /></el-icon>
          </div>
          <h4>办事流程</h4>
          <p>了解各类服务的办理流程和所需材料</p>
          <el-button type="text" @click="viewGuide('process')">查看详情</el-button>
        </div>

        <div class="guide-card">
          <div class="guide-icon">
            <el-icon><Files /></el-icon>
          </div>
          <h4>材料清单</h4>
          <p>各类服务所需材料下载和填写指南</p>
          <el-button type="text" @click="viewGuide('materials')">查看详情</el-button>
        </div>

        <div class="guide-card">
          <div class="guide-icon">
            <el-icon><Phone /></el-icon>
          </div>
          <h4>联系方式</h4>
          <p>各部门联系电话和服务时间</p>
          <el-button type="text" @click="viewGuide('contact')">查看详情</el-button>
        </div>

        <div class="guide-card">
          <div class="guide-icon">
            <el-icon><Location /></el-icon>
          </div>
          <h4>办事地点</h4>
          <p>村委会和服务点地址导航</p>
          <el-button type="text" @click="viewGuide('location')">查看详情</el-button>
        </div>
      </div>
    </section>

    <!-- 便民工具 -->
    <section class="convenience-tools">
      <div class="section-header">
        <h3>便民工具</h3>
        <p>实用的小工具，方便日常生活</p>
      </div>

      <div class="tools-grid">
        <div class="tool-item" @click="openTool('calculator')">
          <el-icon><Calculator /></el-icon>
          <span>政策计算器</span>
        </div>

        <div class="tool-item" @click="openTool('calendar')">
          <el-icon><Calendar /></el-icon>
          <span>村务日历</span>
        </div>

        <div class="tool-item" @click="openTool('contacts')">
          <el-icon><Phone /></el-icon>
          <span>应急电话</span>
        </div>

        <div class="tool-item" @click="openTool('weather')">
          <el-icon><Cloudy /></el-icon>
          <span>天气预报</span>
        </div>

        <div class="tool-item" @click="openTool('voice')">
          <el-icon><Microphone /></el-icon>
          <span>语音助手</span>
        </div>

        <div class="tool-item" @click="openTool('map')">
          <el-icon><MapLocation /></el-icon>
          <span>便民地图</span>
        </div>
      </div>
    </section>

    <!-- 服务申请对话框 -->
    <el-dialog
      v-model="applicationDialogVisible"
      title="服务申请"
      width="800px"
      @close="resetApplicationForm"
    >
      <el-form :model="applicationForm" :rules="applicationRules" ref="applicationFormRef" label-width="100px">
        <el-form-item label="服务类型" prop="serviceType">
          <el-select v-model="applicationForm.serviceType" placeholder="请选择服务类型" @change="handleServiceTypeChange">
            <el-option label="证件办理" value="certificate" />
            <el-option label="福利申请" value="welfare" />
            <el-option label="医保服务" value="medical" />
            <el-option label="农业服务" value="agricultural" />
            <el-option label="住房保障" value="housing" />
            <el-option label="养老助老" value="elderly" />
          </el-select>
        </el-form-item>

        <el-form-item label="具体项目" prop="specificService">
          <el-select v-model="applicationForm.specificService" placeholder="请选择具体项目">
            <el-option
              v-for="service in currentServices"
              :key="service.value"
              :label="service.label"
              :value="service.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="申请人" prop="applicant">
          <el-input v-model="applicationForm.applicant" placeholder="请输入申请人姓名" />
        </el-form-item>

        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="applicationForm.phone" placeholder="请输入联系电话" />
        </el-form-item>

        <el-form-item label="身份证号" prop="idCard">
          <el-input v-model="applicationForm.idCard" placeholder="请输入身份证号" />
        </el-form-item>

        <el-form-item label="家庭住址" prop="address">
          <el-input v-model="applicationForm.address" placeholder="请输入家庭住址" />
        </el-form-item>

        <el-form-item label="申请事由" prop="reason">
          <el-input
            v-model="applicationForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请详细描述申请事由"
          />
        </el-form-item>

        <el-form-item label="材料上传">
          <el-upload
            action="#"
            multiple
            :file-list="applicationForm.attachments"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :before-upload="beforeUpload"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">
                支持jpg/png/pdf/doc/docx格式，单个文件不超过10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item label="紧急程度">
          <el-radio-group v-model="applicationForm.urgency">
            <el-radio label="normal">普通</el-radio>
            <el-radio label="urgent">紧急</el-radio>
            <el-radio label="very_urgent">非常紧急</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="applicationDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitApplication">提交申请</el-button>
      </template>
    </el-dialog>

    <!-- 申请详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`申请详情 - ${currentApplication.title || ''}`"
      width="700px"
    >
      <div class="application-detail" v-if="currentApplication">
        <div class="detail-header">
          <div class="application-info">
            <h3>{{ currentApplication.title }}</h3>
            <el-tag :type="getStatusColor(currentApplication.status)">
              {{ getStatusText(currentApplication.status) }}
            </el-tag>
          </div>
          <div class="application-meta">
            <span>申请编号: {{ currentApplication.id }}</span>
            <span>申请时间: {{ formatDate(currentApplication.applyTime) }}</span>
          </div>
        </div>

        <div class="detail-content">
          <div class="detail-section">
            <h4>申请人信息</h4>
            <div class="info-grid">
              <div class="info-item">
                <label>姓名:</label>
                <span>{{ currentApplication.applicant }}</span>
              </div>
              <div class="info-item">
                <label>电话:</label>
                <span>{{ currentApplication.phone }}</span>
              </div>
              <div class="info-item">
                <label>身份证:</label>
                <span>{{ maskIdCard(currentApplication.idCard) }}</span>
              </div>
              <div class="info-item">
                <label>地址:</label>
                <span>{{ currentApplication.address }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4>申请事由</h4>
            <p>{{ currentApplication.reason }}</p>
          </div>

          <div class="detail-section" v-if="currentApplication.attachments && currentApplication.attachments.length > 0">
            <h4>申请材料</h4>
            <div class="attachment-list">
              <div v-for="file in currentApplication.attachments" :key="file.id" class="attachment-item">
                <el-icon><Document /></el-icon>
                <span>{{ file.name }}</span>
                <span class="file-size">({{ formatFileSize(file.size) }})</span>
                <el-button type="text" size="small" @click="downloadFile(file)">下载</el-button>
              </div>
            </div>
          </div>

          <div class="detail-section" v-if="currentApplication.processHistory && currentApplication.processHistory.length > 0">
            <h4>处理进度</h4>
            <el-timeline>
              <el-timeline-item
                v-for="step in currentApplication.processHistory"
                :key="step.id"
                :timestamp="formatDate(step.time)"
                :type="getStepType(step.type)"
              >
                <div class="step-content">
                  <h5>{{ step.title }}</h5>
                  <p>{{ step.content }}</p>
                  <span class="step-operator">操作员: {{ step.operator }}</span>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </div>

        <div class="detail-actions">
          <el-button v-if="currentApplication.status === 'pending'" type="danger" @click="cancelApplication">
            撤销申请
          </el-button>
          <el-button v-if="currentApplication.status === 'completed'" type="primary" @click="rateApplication">
            评价服务
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 申请状态查看对话框 -->
    <el-dialog
      v-model="statusDialogVisible"
      title="申请进度"
      width="600px"
    >
      <div class="status-overview">
        <div class="status-stats">
          <div class="status-item">
            <div class="number">{{ statusStats.pending }}</div>
            <div class="label">待处理</div>
          </div>
          <div class="status-item">
            <div class="number">{{ statusStats.processing }}</div>
            <div class="label">处理中</div>
          </div>
          <div class="status-item">
            <div class="number">{{ statusStats.completed }}</div>
            <div class="label">已完成</div>
          </div>
          <div class="status-item">
            <div class="number">{{ statusStats.cancelled }}</div>
            <div class="label">已撤销</div>
          </div>
        </div>
      </div>

      <div class="status-list">
        <h3>我的申请列表</h3>
        <div class="status-applications">
          <div v-for="app in applications" :key="app.id" class="status-application-item">
            <div class="application-info">
              <h4>{{ app.title }}</h4>
              <p class="apply-time">申请时间: {{ formatDate(app.applyTime) }}</p>
            </div>
            <div class="application-status">
              <el-tag :type="getStatusColor(app.status)">
                {{ getStatusText(app.status) }}
              </el-tag>
              <el-button type="text" size="small" @click="viewApplication(app)">查看</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Clock,
  Document,
  Loading,
  CircleCheck,
  CreditCard,
  Gift,
  FirstAidKit,
  Grape,
  House,
  CaretLeft,
  Refresh,
  QuestionFilled,
  Files,
  Phone,
  Location,
  Calculator,
  Calendar,
  Cloudy,
  Microphone,
  MapLocation
} from '@element-plus/icons-vue'

// 引入组件
import ApplicationList from '@/components/convenience/ApplicationList.vue'

// 响应式数据
const activeTab = ref('all')
const applicationDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const statusDialogVisible = ref(false)
const currentApplication = ref(null)

const statistics = reactive({
  totalServices: 24,
  pendingApplications: 8,
  processingApplications: 12,
  completedApplications: 156
})

const quickStats = reactive({
  certificates: 5,
  welfare: 8,
  medical: 6,
  agricultural: 3,
  housing: 2,
  elderly: 4
})

// 服务项目配置
const serviceConfigs = {
  certificate: [
    { label: '身份证办理', value: 'id_card' },
    { label: '户口本办理', value: 'household_register' },
    { label: '结婚证办理', value: 'marriage_certificate' },
    { label: '离婚证办理', value: 'divorce_certificate' },
    { label: '出生证明', value: 'birth_certificate' },
    { label: '死亡证明', value: 'death_certificate' }
  ],
  welfare: [
    { label: '低保申请', value: 'low_income' },
    { label: '五保申请', value: 'five_guarantees' },
    { label: '残疾补助', value: 'disability_subsidy' },
    { label: '临时救助', value: 'temporary_assistance' },
    { label: '医疗救助', value: 'medical_assistance' },
    { label: '教育资助', value: 'education_assistance' }
  ],
  medical: [
    { label: '医保报销', value: 'medical_reimbursement' },
    { label: '健康体检', value: 'health_checkup' },
    { label: '慢病管理', value: 'chronic_disease' },
    { label: '疫苗接种', value: 'vaccination' },
    { label: '家庭医生签约', value: 'family_doctor' },
    { label: '医疗救助', value: 'medical_help' }
  ],
  agricultural: [
    { label: '农业补贴申请', value: 'agricultural_subsidy' },
    { label: '农机购置补贴', value = 'machinery_subsidy' },
    { label: '种植补贴', value: 'planting_subsidy' },
    { label: '农业保险', value: 'agricultural_insurance' },
    { label: '技术培训', value: 'technical_training' },
    { label: '病虫害防治', value: 'pest_control' }
  ],
  housing: [
    { label: '危房改造', value: 'dangerous_housing' },
    { label: '租房补贴', value: 'rental_subsidy' },
    { label: '住房维修', value: 'housing_repair' },
    { label: '农村宅基地', value: 'rural_land' },
    { label: '搬迁安置', value: 'relocation' }
  ],
  elderly: [
    { label: '养老服务', value: 'elderly_care' },
    { label: '居家养老', value: 'home_care' },
    { label: '机构养老', value: 'institutional_care' },
    { label: '高龄补贴', value: 'elderly_subsidy' },
    { label: '助餐服务', value = 'meal_service' },
    { label: '日间照料', value = 'day_care' }
  ]
}

const currentServices = ref([])

// 申请表单
const applicationForm = reactive({
  serviceType: '',
  specificService: '',
  applicant: '',
  phone: '',
  idCard: '',
  address: '',
  reason: '',
  attachments: [],
  urgency: 'normal'
})

const applicationRules = {
  serviceType: [{ required: true, message: '请选择服务类型', trigger: 'change' }],
  specificService: [{ required: true, message: '请选择具体项目', trigger: 'change' }],
  applicant: [{ required: true, message: '请输入申请人姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dX]$/, message: '请输入正确的身份证号', trigger: 'blur' }
  ],
  address: [{ required: true, message: '请输入家庭住址', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入申请事由', trigger: 'blur' }]
}

const applicationFormRef = ref(null)

// 申请数据
const applications = ref([
  {
    id: 'APP202401001',
    title: '身份证办理',
    serviceType: 'certificate',
    specificService: 'id_card',
    applicant: '张小明',
    phone: '13812345678',
    idCard: '330106199001011234',
    address: '智慧村第一组123号',
    reason: '身份证遗失，需要补办',
    status: 'processing',
    applyTime: new Date('2024-01-15 09:30'),
    attachments: [
      { id: 1, name: '申请表.pdf', size: 234567 },
      { id: 2, name: '户口本.jpg', size: 456789 }
    ],
    processHistory: [
      {
        id: 1,
        title: '申请提交',
        content: '申请已提交，等待审核',
        time: new Date('2024-01-15 09:30'),
        type: 'primary',
        operator: '系统'
      },
      {
        id: 2,
        title: '审核中',
        content: '材料审核通过，正在办理',
        time: new Date('2024-01-15 14:20'),
        type: 'warning',
        operator: '李主任'
      }
    ]
  },
  {
    id: 'APP202401002',
    title: '低保申请',
    serviceType: 'welfare',
    specificService: 'low_income',
    applicant: '王老汉',
    phone: '13823456789',
    idCard: '330106195501023456',
    address: '智慧村第二组456号',
    reason: '家庭困难，申请低保补助',
    status: 'completed',
    applyTime: new Date('2024-01-10 10:15'),
    attachments: [
      { id: 3, name: '家庭收入证明.pdf', size: 345678 },
      { id: 4, name: '困难证明.jpg', size: 567890 }
    ],
    processHistory: [
      {
        id: 3,
        title: '申请提交',
        content: '申请已提交，等待审核',
        time: new Date('2024-01-10 10:15'),
        type: 'primary',
        operator: '系统'
      },
      {
        id: 4,
        title: '审核通过',
        content: '申请审核通过，已列入低保名单',
        time: new Date('2024-01-12 15:30'),
        type: 'success',
        operator: '村支书'
      },
      {
        id: 5,
        title: '审批完成',
        content: '低保申请已批准，每月发放补助',
        time: new Date('2024-01-13 09:00'),
        type: 'success',
        operator: '乡镇政府'
      }
    ]
  }
])

// 状态统计
const statusStats = reactive({
  pending: 0,
  processing: 0,
  completed: 0,
  cancelled: 0
})

// 计算属性
const filteredApplications = computed(() => {
  if (activeTab.value === 'all') {
    return applications.value
  }
  return applications.value.filter(app => app.status === activeTab.value)
})

const pendingApplications = computed(() => {
  return applications.value.filter(app => app.status === 'pending')
})

const processingApplications = computed(() => {
  return applications.value.filter(app => app.status === 'processing')
})

const completedApplications = computed(() => {
  return applications.value.filter(app => app.status === 'completed')
})

// 方法
const goToService = (serviceType) => {
  ElMessage.info(`正在跳转到${getServiceName(serviceType)}...`)
}

const getServiceName = (serviceType) => {
  const names = {
    'certificate': '证件办理',
    'welfare': '福利申请',
    'medical': '医保服务',
    'agricultural': '农业服务',
    'housing': '住房保障',
    'elderly': '养老助老'
  }
  return names[serviceType] || serviceType
}

const refreshApplications = () => {
  ElMessage.success('申请列表已刷新')
  updateStatusStats()
}

const handleTabChange = (tab) => {
  activeTab.value = tab
}

const showServiceApplication = () => {
  applicationDialogVisible.value = true
  resetApplicationForm()
}

const showApplicationStatus = () => {
  statusDialogVisible.value = true
  updateStatusStats()
}

const handleServiceTypeChange = () => {
  applicationForm.specificService = ''
  currentServices.value = serviceConfigs[applicationForm.serviceType] || []
}

const resetApplicationForm = () => {
  Object.assign(applicationForm, {
    serviceType: '',
    specificService: '',
    applicant: '',
    phone: '',
    idCard: '',
    address: '',
    reason: '',
    attachments: [],
    urgency: 'normal'
  })
  if (applicationFormRef.value) {
    applicationFormRef.value.resetFields()
  }
}

const submitApplication = async () => {
  if (!applicationFormRef.value) return

  try {
    await applicationFormRef.value.validate()

    const newApplication = {
      id: `APP${Date.now()}`,
      title: getServiceName(applicationForm.serviceType) + ' - ' +
            serviceConfigs[applicationForm.serviceType]?.find(s => s.value === applicationForm.specificService)?.label ||
            applicationForm.specificService,
      ...applicationForm,
      status: 'pending',
      applyTime: new Date(),
      processHistory: [
        {
          id: 1,
          title: '申请提交',
          content: '申请已提交，等待审核',
          time: new Date(),
          type: 'primary',
          operator: '系统'
        }
      ]
    }

    applications.value.unshift(newApplication)
    applicationDialogVisible.value = false
    ElMessage.success('申请提交成功，我们会尽快处理')
    updateStatusStats()
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const viewApplication = (application) => {
  currentApplication.value = application
  detailDialogVisible.value = true
}

const cancelApplication = (application) => {
  ElMessageBox.confirm(
    `确定要撤销"${application.title}"的申请吗？`,
    '撤销申请',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    application.status = 'cancelled'
    application.processHistory.push({
      id: Date.now(),
      title: '申请撤销',
      content: '申请人主动撤销申请',
      time: new Date(),
      type: 'info',
      operator: application.applicant
    })
    ElMessage.success('申请已撤销')
    updateStatusStats()
  }).catch(() => {})
}

const rateApplication = (application) => {
  ElMessageBox.prompt('请为本次服务打分（1-5分）', '服务评价', {
    confirmButtonText: '提交评价',
    cancelButtonText: '取消',
    inputPattern: /^[1-5]$/,
    inputErrorMessage: '请输入1-5之间的数字'
  }).then(({ value }) => {
    application.rating = parseInt(value)
    application.processHistory.push({
      id: Date.now(),
      title: '服务评价',
      content: `用户评分: ${value}星`,
      time: new Date(),
      type: 'success',
      operator: application.applicant
    })
    ElMessage.success('感谢您的评价！')
  }).catch(() => {})
}

const updateStatusStats = () => {
  statusStats.pending = applications.value.filter(app => app.status === 'pending').length
  statusStats.processing = applications.value.filter(app => app.status === 'processing').length
  statusStats.completed = applications.value.filter(app => app.status === 'completed').length
  statusStats.cancelled = applications.value.filter(app => app.status === 'cancelled').length
}

const viewGuide = (type) => {
  ElMessage.info(`查看${type}指南`)
}

const openTool = (tool) => {
  const tools = {
    'calculator': '政策计算器',
    'calendar': '村务日历',
    'contacts': '应急电话',
    'weather': '天气预报',
    'voice': '语音助手',
    'map': '便民地图'
  }
  ElMessage.info(`打开${tools[tool]}`)
}

const handleFileChange = (file, fileList) => {
  applicationForm.attachments = fileList
}

const handleFileRemove = (file, fileList) => {
  applicationForm.attachments = fileList
}

const beforeUpload = (file) => {
  const isValidType = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isValidType) {
    ElMessage.error('只能上传jpg/png/pdf/doc/docx格式的文件!')
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过10MB!')
  }
  return isValidType && isLt10M
}

const getStatusColor = (status) => {
  const colorMap = {
    'pending': 'warning',
    'processing': 'primary',
    'completed': 'success',
    'cancelled': 'info'
  }
  return colorMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    'pending': '待处理',
    'processing': '处理中',
    'completed': '已完成',
    'cancelled': '已撤销'
  }
  return textMap[status] || status
}

const getStepType = (type) => {
  const typeMap = {
    'primary': 'primary',
    'success': 'success',
    'warning': 'warning',
    'danger': 'danger',
    'info': 'info'
  }
  return typeMap[type] || 'info'
}

const formatDate = (date) => {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString().slice(0, 5)
}

const maskIdCard = (idCard) => {
  if (!idCard) return ''
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}

const formatFileSize = (size) => {
  if (size < 1024) {
    return size + 'B'
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(1) + 'KB'
  } else {
    return (size / (1024 * 1024)).toFixed(1) + 'MB'
  }
}

const downloadFile = (file) => {
  ElMessage.success(`下载文件: ${file.name}`)
}

// 生命周期
onMounted(() => {
  updateStatusStats()
})
</script>

<style scoped>
.convenience-services {
  padding: 2rem;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.75rem;
}

.header-content p {
  margin: 0;
  color: #7f8c8d;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.stats-section {
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-card.total {
  border-left: 4px solid #3498db;
}

.stat-card.pending {
  border-left: 4px solid #f39c12;
}

.stat-card.processing {
  border-left: 4px solid #1abc9c;
}

.stat-card.completed {
  border-left: 4px solid #2ecc71;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.stat-card.total .stat-icon {
  background: rgba(52, 152, 219, 0.1);
  color: #3498db;
}

.stat-card.pending .stat-icon {
  background: rgba(243, 156, 18, 0.1);
  color: #f39c12;
}

.stat-card.processing .stat-icon {
  background: rgba(26, 188, 156, 0.1);
  color: #1abc9c;
}

.stat-card.completed .stat-icon {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
}

.stat-label {
  color: #7f8c8d;
  font-size: 0.875rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-header h3 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.25rem;
}

.section-header p {
  margin: 0;
  color: #7f8c8d;
}

.quick-services {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.service-card {
  background: white;
  border: 1px solid #ecf0f1;
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.service-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
}

.service-card.certificate {
  border-top: 4px solid #3498db;
}

.service-card.welfare {
  border-top: 4px solid #2ecc71;
}

.service-card.medical {
  border-top: 4px solid #f39c12;
}

.service-card.agricultural {
  border-top: 4px solid #1abc9c;
}

.service-card.housing {
  border-top: 4px solid #9b59b6;
}

.service-card.elderly {
  border-top: 4px solid #e74c3c;
}

.service-icon {
  font-size: 3rem;
  color: #667eea;
  margin-bottom: 1rem;
}

.service-card h4 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.125rem;
}

.service-card p {
  margin: 0 0 1rem 0;
  color: #7f8c8d;
}

.service-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.my-applications {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.applications-tabs {
  margin-top: 1rem;
}

.service-guide {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.guide-card {
  background: white;
  border: 1px solid #ecf0f1;
  border-radius: 1rem;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.guide-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.guide-icon {
  font-size: 2rem;
  color: #667eea;
  margin-bottom: 1rem;
}

.guide-card h4 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.guide-card p {
  margin: 0 0 1rem 0;
  color: #7f8c8d;
}

.convenience-tools {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tool-item:hover {
  background: #e9ecef;
  transform: translateY(-2px);
}

.tool-item .el-icon {
  font-size: 2rem;
  color: #667eea;
}

.tool-item span {
  color: #2c3e50;
  font-size: 0.875rem;
}

.application-detail {
  max-height: 600px;
  overflow-y: auto;
}

.detail-header {
  border-bottom: 1px solid #ecf0f1;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}

.application-info h3 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.application-meta {
  display: flex;
  gap: 1rem;
  color: #7f8c8d;
  font-size: 0.875rem;
}

.detail-content {
  margin-bottom: 1.5rem;
}

.detail-section {
  margin-bottom: 2rem;
}

.detail-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-weight: 600;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item label {
  color: #7f8c8c8;
  font-size: 0.875rem;
  font-weight: 500;
}

.info-item span {
  color: #2c3e50;
}

.detail-section p {
  color: #2c3e50;
  line-height: 1.6;
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 0.25rem;
}

.step-content h5 {
  margin: 0 0 0.25rem 0;
  color: #2c3e50;
}

.step-content p {
  margin: 0 0 0.25rem 0;
  color: #7f8c8d;
}

.step-operator {
  color: #95a5a6;
  font-size: 0.875rem;
}

.detail-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  border-top: 1px solid #ecf0f1;
  padding-top: 1rem;
}

.status-overview {
  margin-bottom: 2rem;
}

.status-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.status-item {
  text-align: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
}

.status-item .number {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
}

.status-item .label {
  color: #7f8c8d;
  font-size: 0.875rem;
}

.status-list h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.status-applications {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.status-application-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border: 1px solid #ecf0f1;
  border-radius: 0.5rem;
}

.application-info h4 {
  margin: 0 0 0.25rem 0;
  color: #2c3e50;
}

.apply-time {
  color: #7f8c8d;
  font-size: 0.875rem;
}

.application-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .convenience-services {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .services-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .guide-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .tools-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .status-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>