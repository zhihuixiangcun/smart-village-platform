<template>
  <div class="profile-view" :class="{ 'large-text-mode': largeTextMode }">
    <!-- 个人中心头部 -->
    <div class="profile-header">
      <div class="header-bg"></div>
      <div class="header-content">
        <div class="user-avatar-section">
          <div class="avatar-wrapper">
            <el-avatar :size="largeTextMode ? 120 : 100" :src="userInfo.avatar" class="user-avatar">
              {{ userInfo.name?.charAt(0) || '村' }}
            </el-avatar>
            <div class="avatar-badge" v-if="userInfo.isVerified">
              <el-icon color="#67C23A"><CircleCheck /></el-icon>
            </div>
          </div>
          <div class="user-basic">
            <h2 class="user-name">{{ userInfo.name || '村民' }}</h2>
            <div class="user-tags">
              <el-tag type="success" size="small" v-if="userInfo.familyType === '低保户'">
                <el-icon><UserFilled /></el-icon> 低保户
              </el-tag>
              <el-tag type="warning" size="small" v-if="userInfo.familyType === '独生户'">
                <el-icon><Star /></el-icon> 独生户
              </el-tag>
              <el-tag type="info" size="small">{{ userInfo.villageGroup || '第一组' }}</el-tag>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <el-button type="primary" @click="editProfile" :size="largeTextMode ? 'large' : 'default'" icon="Edit">
            {{ largeTextMode ? '编辑个人资料' : '编辑资料' }}
          </el-button>
          <el-button @click="showSettings" :size="largeTextMode ? 'large' : 'default'" icon="Setting">
            {{ largeTextMode ? '设置' : '设置' }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 个人信息卡片 -->
    <div class="profile-content">
      <el-row :gutter="24">
        <!-- 左侧个人信息 -->
        <el-col :xs="24" :md="8">
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <el-icon><User /></el-icon>
                <span>个人信息</span>
              </div>
            </template>

            <div class="info-list">
              <div class="info-item">
                <label>身份证号</label>
                <div class="value">
                  {{ maskIdCard(userInfo.idCard) }}
                  <el-button type="text" size="small" @click="showFullIdCard">
                    {{ showIdCard ? '隐藏' : '查看' }}
                  </el-button>
                </div>
              </div>

              <div class="info-item">
                <label>联系电话</label>
                <div class="value">
                  {{ maskPhone(userInfo.phone) }}
                  <el-button type="text" size="small" @click="showFullPhone">
                    {{ showPhone ? '隐藏' : '查看' }}
                  </el-button>
                </div>
              </div>

              <div class="info-item">
                <label>家庭住址</label>
                <div class="value">{{ userInfo.address || '智慧村123号' }}</div>
              </div>

              <div class="info-item">
                <label>户主关系</label>
                <div class="value">{{ userInfo.relation || '户主' }}</div>
              </div>

              <div class="info-item">
                <label>政治面貌</label>
                <div class="value">{{ userInfo.politicalStatus || '群众' }}</div>
              </div>

              <div class="info-item">
                <label>健康状况</label>
                <div class="value">
                  <el-tag :type="getHealthType(userInfo.healthStatus)" size="small">
                    {{ userInfo.healthStatus || '健康' }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 家庭档案 -->
          <el-card class="family-card">
            <template #header>
              <div class="card-header">
                <el-icon><House /></el-icon>
                <span>家庭档案</span>
                <el-tag type="primary" size="small">一户一码</el-tag>
              </div>
            </template>

            <div class="household-qrcode">
              <div class="qrcode-wrapper" @click="showQRCode">
                <el-image
                  :src="getQRCodeUrl()"
                  fit="cover"
                  class="qrcode-img"
                >
                  <template #error>
                    <div class="qrcode-placeholder">
                      <el-icon size="40"><QRCode /></el-icon>
                      <span>点击查看</span>
                    </div>
                  </template>
                </el-image>
              </div>
              <p class="qrcode-desc">户码：{{ userInfo.householdCode || 'SM2024001' }}</p>
            </div>

            <div class="family-summary">
              <div class="summary-item">
                <span class="label">家庭人口</span>
                <span class="value">{{ familyMembers.length }}人</span>
              </div>
              <div class="summary-item">
                <span class="label">家庭类型</span>
                <span class="value">{{ userInfo.familyType || '普通户' }}</span>
              </div>
            </div>

            <el-button type="text" @click="viewFamilyMembers" class="view-family-btn">
              查看家庭成员 ({{ familyMembers.length }})
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </el-card>
        </el-col>

        <!-- 右侧服务功能 -->
        <el-col :xs="24" :md="16">
          <!-- 我的服务 -->
          <el-card class="services-card">
            <template #header>
              <div class="card-header">
                <el-icon><Service /></el-icon>
                <span>我的服务</span>
              </div>
            </template>

            <div class="services-grid">
              <div class="service-item" @click="goToService('certificates')">
                <div class="service-icon">📄</div>
                <h4>证件办理</h4>
                <p>身份证、户口本、证明等</p>
                <div class="service-status" v-if="pendingApplications > 0">
                  <el-badge :value="pendingApplications" type="warning" />
                </div>
              </div>

              <div class="service-item" @click="goToService('welfare')">
                <div class="service-icon">🎁</div>
                <h4>福利申请</h4>
                <p>低保、补贴、救助等</p>
                <div class="service-status" v-if="welfareApplications.length > 0">
                  <el-badge :value="welfareApplications.length" type="primary" />
                </div>
              </div>

              <div class="service-item" @click="goToService('medical')">
                <div class="service-icon">🏥</div>
                <h4>医保服务</h4>
                <p>医保查询、报销等</p>
              </div>

              <div class="service-item" @click="goToService('agriculture')">
                <div class="service-icon">🌾</div>
                <h4>农业服务</h4>
                <p>补贴申请、技术指导</p>
              </div>

              <div class="service-item" @click="goToService('housing')">
                <div class="service-icon">🏠</div>
                <h4>住房保障</h4>
                <p>住房申请、维修等</p>
              </div>

              <div class="service-item" @click="goToService('elderly')">
                <div class="service-icon">👴</div>
                <h4>养老助老</h4>
                <p>养老服务、活动中心</p>
              </div>
            </div>
          </el-card>

          <!-- 我的办事记录 -->
          <el-card class="records-card">
            <template #header>
              <div class="card-header">
                <el-icon><Document /></el-icon>
                <span>办事记录</span>
                <el-button type="text" @click="viewAllRecords">查看全部</el-button>
              </div>
            </template>

            <div class="records-timeline">
              <el-timeline>
                <el-timeline-item
                  v-for="record in serviceRecords"
                  :key="record.id"
                  :timestamp="record.date"
                  :type="record.status"
                  :size="largeTextMode ? 'large' : 'default'"
                >
                  <div class="record-item">
                    <h4>{{ record.title }}</h4>
                    <p>{{ record.description }}</p>
                    <div class="record-status">
                      <el-tag :type="getStatusType(record.status)" size="small">
                        {{ getStatusText(record.status) }}
                      </el-tag>
                    </div>
                  </div>
                </el-timeline-item>
              </el-timeline>
            </div>
          </el-card>

          <!-- 便民工具 -->
          <el-card class="tools-card">
            <template #header>
              <div class="card-header">
                <el-icon><Tools /></el-icon>
                <span>便民工具</span>
              </div>
            </template>

            <div class="tools-grid">
              <div class="tool-item" @click="openTool('calculator')">
                <el-icon><TrendCharts /></el-icon>
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

              <div class="tool-item" @click="openTool('voice')">
                <el-icon><Microphone /></el-icon>
                <span>语音助手</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 编辑个人信息对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="largeTextMode ? '编辑个人资料' : '编辑资料'"
      :width="largeTextMode ? '800px' : '600px'"
      :close-on-click-modal="false"
    >
      <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="100px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="editForm.name" :size="largeTextMode ? 'large' : 'default'" />
        </el-form-item>

        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="editForm.phone" :size="largeTextMode ? 'large' : 'default'" />
        </el-form-item>

        <el-form-item label="家庭住址" prop="address">
          <el-input v-model="editForm.address" :size="largeTextMode ? 'large' : 'default'" />
        </el-form-item>

        <el-form-item label="政治面貌" prop="politicalStatus">
          <el-select v-model="editForm.politicalStatus" :size="largeTextMode ? 'large' : 'default'">
            <el-option label="群众" value="群众" />
            <el-option label="党员" value="党员" />
            <el-option label="团员" value="团员" />
          </el-select>
        </el-form-item>

        <el-form-item label="健康状况" prop="healthStatus">
          <el-select v-model="editForm.healthStatus" :size="largeTextMode ? 'large' : 'default'">
            <el-option label="健康" value="健康" />
            <el-option label="良好" value="良好" />
            <el-option label="一般" value="一般" />
            <el-option label="欠佳" value="欠佳" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>

    <!-- 设置对话框 -->
    <el-dialog
      v-model="settingsDialogVisible"
      title="设置"
      :width="largeTextMode ? '800px' : '600px'"
    >
      <div class="settings-content">
        <div class="setting-item">
          <div class="setting-info">
            <h4>大字模式</h4>
            <p>适合老年用户，放大字体和按钮</p>
          </div>
          <el-switch
            v-model="largeTextMode"
            @change="toggleLargeTextMode"
            :size="largeTextMode ? 'large' : 'default'"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h4>语音提示</h4>
            <p>开启语音播报功能</p>
          </div>
          <el-switch
            v-model="voiceEnabled"
            :size="largeTextMode ? 'large' : 'default'"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h4>消息通知</h4>
            <p>接收村务通知和办事提醒</p>
          </div>
          <el-switch
            v-model="notificationEnabled"
            :size="largeTextMode ? 'large' : 'default'"
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="settingsDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 家庭成员对话框 -->
    <el-dialog
      v-model="familyDialogVisible"
      title="家庭成员"
      :width="largeTextMode ? '900px' : '700px'"
    >
      <div class="family-members">
        <div class="member-item" v-for="member in familyMembers" :key="member.id">
          <el-avatar :size="largeTextMode ? 60 : 50" :src="member.avatar">
            {{ member.name?.charAt(0) }}
          </el-avatar>
          <div class="member-info">
            <h4>{{ member.name }}</h4>
            <p>{{ member.relation }} · {{ member.age }}岁</p>
            <p>{{ maskIdCard(member.idCard) }}</p>
          </div>
          <div class="member-tags">
            <el-tag v-if="member.isStudent" type="primary" size="small">学生</el-tag>
            <el-tag v-if="member.hasInsurance" type="success" size="small">医保</el-tag>
          </div>
        </div>

        <el-button type="primary" plain icon="Plus" @click="addFamilyMember" :size="largeTextMode ? 'large' : 'default'">
          添加家庭成员
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User,
  House,
  Service,
  Document,
  Tools,
  Edit,
  Setting,
  CircleCheck,
  UserFilled,
  Star,
  QRCode,
  ArrowRight,
  TrendCharts,
  Calendar,
  Phone,
  Microphone,
  Plus
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const largeTextMode = ref(false)
const voiceEnabled = ref(false)
const notificationEnabled = ref(true)
const showIdCard = ref(false)
const showPhone = ref(false)
const editDialogVisible = ref(false)
const familyDialogVisible = ref(false)
const settingsDialogVisible = ref(false)

// 表单引用
const editFormRef = ref(null)

// 用户信息
const userInfo = reactive({
  id: '1',
  name: '张小明',
  avatar: '',
  idCard: '330106199001011234',
  phone: '13812345678',
  address: '智慧村第一组123号',
  villageGroup: '第一组',
  familyType: '普通户',
  relation: '户主',
  politicalStatus: '群众',
  healthStatus: '健康',
  isVerified: true,
  householdCode: 'SM2024001'
})

// 家庭成员
const familyMembers = reactive([
  {
    id: '1',
    name: '张小明',
    relation: '户主',
    age: 35,
    idCard: '330106199001011234',
    avatar: '',
    isStudent: false,
    hasInsurance: true
  },
  {
    id: '2',
    name: '李小红',
    relation: '配偶',
    age: 33,
    idCard: '330106199201015678',
    avatar: '',
    isStudent: false,
    hasInsurance: true
  },
  {
    id: '3',
    name: '张小宝',
    relation: '子女',
    age: 8,
    idCard: '330106201601019012',
    avatar: '',
    isStudent: true,
    hasInsurance: true
  }
])

// 编辑表单
const editForm = reactive({
  name: '',
  phone: '',
  address: '',
  politicalStatus: '',
  healthStatus: ''
})

// 表单验证规则
const editRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  address: [
    { required: true, message: '请输入家庭住址', trigger: 'blur' }
  ]
}

// 待处理证件数量
const pendingApplications = ref(2)

// 福利申请
const welfareApplications = reactive([
  { id: '1', type: '医保补贴', status: 'pending' }
])

// 办事记录
const serviceRecords = reactive([
  {
    id: '1',
    title: '医保报销申请',
    description: '申请住院医疗费用报销，金额3000元',
    date: '2024-01-15 14:30',
    status: 'success'
  },
  {
    id: '2',
    title: '老年证办理',
    description: '为父亲办理老年人优待证',
    date: '2024-01-10 09:15',
    status: 'processing'
  },
  {
    id: '3',
    title: '住房补贴申请',
    description: '申请农村住房改造补贴',
    date: '2024-01-05 16:45',
    status: 'warning'
  }
])


// 方法
const maskIdCard = (idCard) => {
  if (!idCard) return ''
  if (showIdCard.value) return idCard
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}

const maskPhone = (phone) => {
  if (!phone) return ''
  if (showPhone.value) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const getHealthType = (status) => {
  const types = {
    '健康': 'success',
    '良好': 'primary',
    '一般': 'warning',
    '欠佳': 'danger'
  }
  return types[status] || 'info'
}

const getQRCodeUrl = () => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${userInfo.householdCode}`
}

const getStatusType = (status) => {
  const types = {
    'success': 'success',
    'processing': 'primary',
    'warning': 'warning',
    'error': 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    'success': '已完成',
    'processing': '办理中',
    'warning': '待审核',
    'error': '已驳回'
  }
  return texts[status] || '未知'
}

const showFullIdCard = () => {
  ElMessageBox.confirm('查看完整身份证信息需要身份验证', '安全验证', {
    confirmButtonText: '验证查看',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    showIdCard.value = !showIdCard.value
    ElMessage.success('验证成功，已显示完整身份证号')
  }).catch(() => {})
}

const showFullPhone = () => {
  showPhone.value = !showPhone.value
}

const showQRCode = () => {
  ElMessageBox.alert(
    `<div style="text-align: center;">
      <img src="${getQRCodeUrl()}" style="width: 200px; height: 200px;" />
      <p style="margin-top: 10px;">家庭户码：${userInfo.householdCode}</p>
      <p style="color: #666;">扫码可查看家庭完整信息</p>
    </div>`,
    '家庭二维码',
    {
      dangerouslyUseHTMLString: true,
      customClass: largeTextMode.value ? 'large-text-dialog' : ''
    }
  )
}

const editProfile = () => {
  // 填充表单
  Object.assign(editForm, {
    name: userInfo.name,
    phone: userInfo.phone,
    address: userInfo.address,
    politicalStatus: userInfo.politicalStatus,
    healthStatus: userInfo.healthStatus
  })
  editDialogVisible.value = true
}

const saveProfile = async () => {
  if (!editFormRef.value) return

  try {
    await editFormRef.value.validate()

    // 更新用户信息
    Object.assign(userInfo, editForm)

    editDialogVisible.value = false
    ElMessage.success('个人信息更新成功')
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const showSettings = () => {
  settingsDialogVisible.value = true
}

const toggleLargeTextMode = (value) => {
  if (value) {
    document.body.classList.add('large-text-mode')
    ElMessage.success('已开启大字模式')
  } else {
    document.body.classList.remove('large-text-mode')
    ElMessage.info('已关闭大字模式')
  }
}

const viewFamilyMembers = () => {
  familyDialogVisible.value = true
}

const addFamilyMember = () => {
  ElMessage.info('请联系村委会添加家庭成员')
}

const goToService = (type) => {
  router.push(`/services/${type}`)
}

const viewAllRecords = () => {
  router.push('/service-records')
}

const openTool = (tool) => {
  switch (tool) {
    case 'calculator':
      router.push('/tools/calculator')
      break
    case 'calendar':
      router.push('/village-calendar')
      break
    case 'contacts':
      showEmergencyContacts()
      break
    case 'voice':
      startVoiceAssistant()
      break
    default:
      ElMessage.info('功能开发中')
  }
}

const showEmergencyContacts = () => {
  ElMessageBox.alert(
    `<div style="line-height: 1.8;">
      <h3>应急联系电话</h3>
      <p>村委办公室：0571-12345678</p>
      <p>卫生院：0571-87654321</p>
      <p>派出所：0571-11223344</p>
      <p>消防队：119</p>
      <p>急救中心：120</p>
    </div>`,
    '应急电话',
    {
      dangerouslyUseHTMLString: true,
      customClass: largeTextMode.value ? 'large-text-dialog' : ''
    }
  )
}

const startVoiceAssistant = () => {
  ElMessage.info('语音助手功能正在开发中')
  // 这里可以集成语音识别功能
}

onMounted(() => {
  console.log('村民个人中心加载完成')
})
</script>

<style lang="scss" scoped>
.profile-view {
  min-height: 100vh;
  background-color: #f5f7fa;

  &.large-text-mode {
    font-size: 18px;

    .el-button {
      font-size: 16px;
      padding: 12px 24px;
    }

    .el-card {
      .el-card__header {
        font-size: 18px;
      }
    }

    .service-item, .tool-item {
      padding: 20px;

      h4 {
        font-size: 18px;
      }

      p {
        font-size: 16px;
      }
    }
  }
}

.profile-header {
  position: relative;
  margin-bottom: 24px;

  .header-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 0 0 20px 20px;
  }

  .header-content {
    position: relative;
    z-index: 2;
    padding: 40px 24px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .user-avatar-section {
    display: flex;
    align-items: center;
    gap: 20px;

    .avatar-wrapper {
      position: relative;

      .avatar-badge {
        position: absolute;
        bottom: -5px;
        right: -5px;
        background: white;
        border-radius: 50%;
        padding: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
    }

    .user-basic {
      .user-name {
        margin: 0 0 8px 0;
        color: white;
        font-size: 28px;
        font-weight: bold;
      }

      .user-tags {
        display: flex;
        gap: 8px;
      }
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.profile-content {
  padding: 0 24px;

  .info-card, .family-card, .services-card, .records-card, .tools-card {
    margin-bottom: 24px;

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: bold;
    }
  }
}

.info-list {
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    label {
      color: #666;
      font-weight: 500;
      min-width: 80px;
    }

    .value {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #333;
    }
  }
}

.household-qrcode {
  text-align: center;
  margin-bottom: 20px;

  .qrcode-wrapper {
    cursor: pointer;
    margin-bottom: 12px;

    .qrcode-img {
      width: 120px;
      height: 120px;
      border-radius: 8px;
    }

    .qrcode-placeholder {
      width: 120px;
      height: 120px;
      border: 2px dashed #ddd;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #999;
      margin: 0 auto;

      span {
        margin-top: 8px;
        font-size: 12px;
      }
    }
  }

  .qrcode-desc {
    margin: 0;
    color: #666;
    font-size: 14px;
  }
}

.family-summary {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 16px;

  .summary-item {
    text-align: center;

    .label {
      display: block;
      color: #666;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .value {
      color: #333;
      font-weight: bold;
      font-size: 16px;
    }
  }
}

.view-family-btn {
  width: 100%;
  justify-content: center;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;

  .service-item {
    position: relative;
    background: #f8f9fa;
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      background: #fff;
    }

    .service-icon {
      font-size: 40px;
      margin-bottom: 12px;
    }

    h4 {
      margin: 0 0 8px 0;
      font-size: 16px;
      color: #333;
    }

    p {
      margin: 0;
      color: #666;
      font-size: 12px;
      line-height: 1.4;
    }

    .service-status {
      position: absolute;
      top: 8px;
      right: 8px;
    }
  }
}

.records-timeline {
  max-height: 400px;
  overflow-y: auto;

  .record-item {
    h4 {
      margin: 0 0 4px 0;
      color: #333;
    }

    p {
      margin: 0 0 8px 0;
      color: #666;
      font-size: 14px;
    }

    .record-status {
      margin-top: 8px;
    }
  }
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;

  .tool-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: #e8f4fd;
      transform: translateY(-1px);
    }

    .el-icon {
      font-size: 24px;
      color: #409eff;
    }

    span {
      font-size: 14px;
      color: #333;
    }
  }
}

.settings-content {
  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .setting-info {
      h4 {
        margin: 0 0 4px 0;
        color: #333;
      }

      p {
        margin: 0;
        color: #666;
        font-size: 14px;
      }
    }
  }
}

.family-members {
  .member-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .member-info {
      flex: 1;

      h4 {
        margin: 0 0 4px 0;
        color: #333;
      }

      p {
        margin: 0 0 2px 0;
        color: #666;
        font-size: 14px;
      }
    }

    .member-tags {
      display: flex;
      gap: 4px;
    }
  }
}

@media (max-width: 768px) {
  .profile-header {
    .header-content {
      flex-direction: column;
      gap: 16px;
      text-align: center;
    }

    .user-avatar-section {
      flex-direction: column;
    }
  }

  .services-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .tools-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>

<style lang="scss">
.large-text-dialog {
  .el-message-box {
    .el-message-box__header {
      .el-message-box__title {
        font-size: 20px;
      }
    }

    .el-message-box__content {
      font-size: 18px;
      line-height: 1.6;
    }

    .el-message-box__btns {
      .el-button {
        font-size: 16px;
        padding: 12px 24px;
      }
    }
  }
}
</style>