<template>
  <div class="register-page">
    <!-- 顶部导航 -->
    <div class="navbar">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <span class="title">注册账号</span>
      <div class="placeholder"></div>
    </div>

    <!-- 主要内容 -->
    <div class="register-content">
      <!-- 步骤指示 -->
      <div class="step-indicator">
        <div
          v-for="(step, index) in steps"
          :key="index"
          :class="['step-item', { 'step-item--active': currentStep === index, 'step-item--completed': currentStep > index }]"
        >
          <div class="step-number">{{ currentStep > index ? '✓' : index + 1 }}</div>
          <span class="step-label">{{ step }}</span>
        </div>
      </div>

      <!-- 步骤1: 角色选择 -->
      <div v-if="currentStep === 0" class="step-content">
        <div class="step-title">选择您的角色</div>
        <div class="role-cards">
          <div
            v-for="role in roles"
            :key="role.value"
            :class="['role-card', { 'role-card--selected': form.role === role.value }]"
            @click="selectRole(role.value)"
          >
            <div class="role-icon">{{ role.icon }}</div>
            <div class="role-name">{{ role.label }}</div>
            <div class="role-desc">{{ role.description }}</div>
          </div>
        </div>
      </div>

      <!-- 步骤2: 基本信息 -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="step-title">填写基本信息</div>

        <!-- 上传头像 -->
        <div class="avatar-upload">
          <div class="avatar-wrapper" @click="chooseAvatar">
            <img v-if="form.avatar" :src="form.avatar" class="avatar-image" />
            <span v-else class="avatar-placeholder">📷</span>
          </div>
          <div class="avatar-tip">点击上传头像</div>
        </div>

        <!-- 姓名 -->
        <div class="form-item">
          <label class="form-label">真实姓名</label>
          <input
            v-model="form.name"
            type="text"
            class="form-input"
            :class="{ 'large-text': isElderlyMode }"
            placeholder="请输入真实姓名"
          />
        </div>

        <!-- 手机号 -->
        <div class="form-item">
          <label class="form-label">手机号码</label>
          <div class="input-with-code">
            <input
              v-model="form.phone"
              type="tel"
              class="form-input"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请输入手机号"
              maxlength="11"
            />
            <button
              class="code-btn"
              :disabled="counting"
              @click="sendCode"
            >
              {{ counting ? `${countdown}s` : '获取验证码' }}
            </button>
          </div>
        </div>

        <!-- 验证码 -->
        <div class="form-item">
          <label class="form-label">验证码</label>
          <input
            v-model="form.code"
            type="text"
            class="form-input"
            :class="{ 'large-text': isElderlyMode }"
            placeholder="请输入验证码"
            maxlength="6"
          />
        </div>

        <!-- 密码 -->
        <div class="form-item">
          <label class="form-label">设置密码</label>
          <div class="input-with-icon">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请设置6-20位密码"
            />
            <button class="icon-btn" @click="showPassword = !showPassword">
              <span>{{ showPassword ? '👁️' : '👁️‍🗨️' }}</span>
            </button>
          </div>
        </div>

        <!-- 性别 -->
        <div class="form-item">
          <label class="form-label">性别</label>
          <div class="gender-options">
            <div
              :class="['gender-option', { 'gender-option--selected': form.gender === 'male' }]"
              @click="form.gender = 'male'"
            >
              <span class="gender-icon">👨</span>
              <span class="gender-text">男</span>
            </div>
            <div
              :class="['gender-option', { 'gender-option--selected': form.gender === 'female' }]"
              @click="form.gender = 'female'"
            >
              <span class="gender-icon">👩</span>
              <span class="gender-text">女</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤3: 村委信息（村干部/官员） -->
      <div v-if="currentStep === 2 && isOfficial" class="step-content">
        <div class="step-title">村委信息</div>

        <!-- 选择村庄 -->
        <div class="form-item">
          <label class="form-label">所属村庄</label>
          <div class="input-with-icon" @click="showVillagePicker = true">
            <input
              :value="selectedVillage?.name"
              type="text"
              class="form-input"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请选择村庄"
              readonly
            />
            <span class="input-arrow">›</span>
          </div>
        </div>

        <!-- 职务 -->
        <div v-if="form.role === 'cadre'" class="form-item">
          <label class="form-label">担任职务</label>
          <div class="position-tags">
            <div
              v-for="position in positions"
              :key="position"
              :class="['position-tag', { 'position-tag--selected': form.position === position }]"
              @click="form.position = position"
            >
              {{ position }}
            </div>
          </div>
        </div>

        <!-- 上传证件 -->
        <div class="form-item">
          <label class="form-label">上传证件</label>
          <div class="upload-area">
            <div class="upload-item">
              <img v-if="form.idCardFront" :src="form.idCardFront" class="upload-image" />
              <div v-else class="upload-placeholder" @click="uploadIdCard('front')">
                <span class="upload-icon">📷</span>
                <span class="upload-text">身份证正面</span>
              </div>
            </div>
            <div class="upload-item">
              <img v-if="form.idCardBack" :src="form.idCardBack" class="upload-image" />
              <div v-else class="upload-placeholder" @click="uploadIdCard('back')">
                <span class="upload-icon">📷</span>
                <span class="upload-text">身份证反面</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 任命书 -->
        <div v-if="form.role === 'cadre'" class="form-item">
          <label class="form-label">任命书</label>
          <div class="upload-area">
            <div class="upload-item full-width">
              <img v-if="form.appointmentLetter" :src="form.appointmentLetter" class="upload-image" />
              <div v-else class="upload-placeholder" @click="uploadAppointment">
                <span class="upload-icon">📄</span>
                <span class="upload-text">上传任命书（加盖公章）</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤3: 村民信息 -->
      <div v-if="currentStep === 2 && !isOfficial" class="step-content">
        <div class="step-title">居住信息</div>

        <!-- 选择村庄 -->
        <div class="form-item">
          <label class="form-label">所属村庄</label>
          <div class="input-with-icon" @click="showVillagePicker = true">
            <input
              :value="selectedVillage?.name"
              type="text"
              class="form-input"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请选择村庄"
              readonly
            />
            <span class="input-arrow">›</span>
          </div>
        </div>

        <!-- 村组 -->
        <div class="form-item">
          <label class="form-label">所属村组</label>
          <div class="input-with-icon" @click="showGroupPicker = true">
            <input
              :value="form.group"
              type="text"
              class="form-input"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请选择村组"
              readonly
            />
            <span class="input-arrow">›</span>
          </div>
        </div>

        <!-- 详细地址 -->
        <div class="form-item">
          <label class="form-label">详细地址</label>
          <textarea
            v-model="form.address"
            class="form-textarea"
            :class="{ 'large-text': isElderlyMode }"
            placeholder="请输入详细地址（门牌号）"
            rows="3"
          />
        </div>

        <!-- 家庭类型 -->
        <div class="form-item">
          <label class="form-label">家庭类型（可多选）</label>
          <div class="family-tags">
            <div
              v-for="type in familyTypes"
              :key="type.value"
              :class="['family-tag', { 'family-tag--selected': form.familyTypes.includes(type.value) }]"
              @click="toggleFamilyType(type.value)"
            >
              {{ type.label }}
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤4: 确认信息 -->
      <div v-if="currentStep === 3" class="step-content">
        <div class="step-title">确认注册信息</div>

        <div class="info-summary">
          <div class="summary-item">
            <span class="summary-label">角色</span>
            <span class="summary-value">{{ getRoleLabel(form.role) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">姓名</span>
            <span class="summary-value">{{ form.name }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">手机号</span>
            <span class="summary-value">{{ form.phone }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">性别</span>
            <span class="summary-value">{{ form.gender === 'male' ? '男' : '女' }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">所属村庄</span>
            <span class="summary-value">{{ selectedVillage?.name }}</span>
          </div>
          <div v-if="isOfficial && form.position" class="summary-item">
            <span class="summary-label">职务</span>
            <span class="summary-value">{{ form.position }}</span>
          </div>
          <div v-if="!isOfficial && form.group" class="summary-item">
            <span class="summary-label">村组</span>
            <span class="summary-value">{{ form.group }}</span>
          </div>
          <div v-if="!isOfficial && form.familyTypes.length > 0" class="summary-item">
            <span class="summary-label">家庭类型</span>
            <span class="summary-value">{{ form.familyTypes.map(getFamilyTypeLabel).join('、') }}</span>
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="footer-actions">
        <button
          v-if="currentStep > 0"
          class="action-btn secondary"
          @click="prevStep"
        >
          上一步
        </button>
        <button
          v-if="currentStep < steps.length - 1"
          class="action-btn primary"
          :disabled="!canNext"
          @click="nextStep"
        >
          下一步
        </button>
        <button
          v-if="currentStep === steps.length - 1"
          class="action-btn primary"
          :disabled="submitting"
          @click="submitRegister"
        >
          {{ submitting ? '提交中...' : '完成注册' }}
        </button>
      </div>

      <!-- 村庄选择器 -->
      <div v-if="showVillagePicker" class="picker-overlay" @click="showVillagePicker = false">
        <div class="picker-content" @click.stop>
          <div class="picker-header">
            <span class="picker-title">选择村庄</span>
            <button class="picker-close" @click="showVillagePicker = false">×</button>
          </div>
          <div class="picker-search">
            <input
              v-model="villageSearch"
              type="text"
              class="search-input"
              placeholder="搜索村庄"
            />
          </div>
          <div class="picker-list">
            <div
              v-for="village in filteredVillages"
              :key="village.id"
              class="picker-item"
              @click="selectVillage(village)"
            >
              {{ village.name }}
            </div>
          </div>
        </div>
      </div>

      <!-- 村组选择器 -->
      <div v-if="showGroupPicker" class="picker-overlay" @click="showGroupPicker = false">
        <div class="picker-content" @click.stop>
          <div class="picker-header">
            <span class="picker-title">选择村组</span>
            <button class="picker-close" @click="showGroupPicker = false">×</button>
          </div>
          <div class="picker-list">
            <div
              v-for="group in groups"
              :key="group"
              class="picker-item"
              @click="selectGroup(group)"
            >
              {{ group }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'

const router = useRouter()
const userStore = useUserStore()
const elderlyStore = useElderlyStore()

// 步骤
const steps = ['角色', '信息', '详情', '确认']
const currentStep = ref(0)

// 角色选项
const roles = [
  { value: 'villager', label: '村民', icon: '👨‍🌾', description: '普通村民用户' },
  { value: 'cadre', label: '村干部', icon: '👔', description: '村委会工作人员' },
  { value: 'official', label: '乡镇官员', icon: '🏛️', description: '乡镇政府工作人员' },
  { value: 'admin', label: '管理员', icon: '⚙️', description: '系统管理员' }
]

// 表单数据
const form = ref({
  role: '',
  name: '',
  phone: '',
  code: '',
  password: '',
  gender: 'male',
  avatar: '',
  villageId: '',
  group: '',
  address: '',
  position: '',
  familyTypes: [],
  idCardFront: '',
  idCardBack: '',
  appointmentLetter: ''
})

// UI状态
const showPassword = ref(false)
const counting = ref(false)
const countdown = ref(60)
const showVillagePicker = ref(false)
const showGroupPicker = ref(false)
const villageSearch = ref('')
const submitting = ref(false)

// 选中的村庄
const selectedVillage = ref(null)

// 村庄列表（模拟）
const villages = ref([
  { id: 'DZ2024001', name: '东村' },
  { id: 'XZ2024002', name: '西村' },
  { id: 'NZ2024003', name: '南村' },
  { id: 'BZ2024004', name: '北村' }
])

// 村组列表
const groups = ref(['第一组', '第二组', '第三组', '第四组', '第五组'])

// 职务选项
const positions = ['村支书', '村主任', '副主任', '会计', '妇女主任', '治保主任', '民兵连长']

// 家庭类型
const familyTypes = [
  { value: 'low', label: '低保户' },
  { value: 'only', label: '独生户' },
  { value: 'disabled', label: '残疾人家庭' },
  { value: 'elderly', label: '独居老人' },
  { value: 'veteran', label: '退役军人' }
]

// 是否是官员角色
const isOfficial = computed(() => {
  return ['cadre', 'official', 'admin'].includes(form.value.role)
})

// 是否适老化模式
const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 过滤的村庄列表
const filteredVillages = computed(() => {
  if (!villageSearch.value) return villages.value
  return villages.value.filter(v => v.name.includes(villageSearch.value))
})

// 是否可以下一步（开发模式 - 放宽验证）
const canNext = computed(() => {
  switch (currentStep.value) {
    case 0:
      // 步骤1：需要选择角色
      return !!form.value.role
    case 1:
      // 开发阶段：只需要姓名、手机号、密码即可，验证码可选
      return !!(form.value.name &&
             form.value.phone &&
             form.value.password &&
             form.value.password.length >= 6)
      // 验证码和手机号格式验证在生产环境启用
      // && /^1[3-9]\d{9}$/.test(form.value.phone)
      // && form.value.code
    case 2:
      // 开发阶段：只需要选择村庄即可
      return !!form.value.villageId
      // 村干部：只需选择村庄，证件和职务可选
      // 身份证在生产环境启用
      // && form.value.idCardFront && form.value.idCardBack
      // 村民：只需选择村庄，村组和地址可选
      // 村组在生产环境启用
      // && form.value.group
    default:
      return true
  }
})

// 页面加载时输出调试信息
onMounted(() => {
  console.log('=== 注册页面加载 ===')
  console.log('ElderlyStore 状态:', {
    isElderlyMode: elderlyStore.isElderlyMode,
    hapticFeedback: elderlyStore.hapticFeedback
  })
  console.log('当前步骤:', currentStep.value)
})

// 监听表单变化，输出调试信息
watch(form, (newVal) => {
  console.log('表单数据更新:', {
    role: newVal.role,
    name: newVal.name,
    phone: newVal.phone,
    villageId: newVal.villageId,
    canNext: canNext.value
  })
}, { deep: true })

// 监听步骤变化
watch(currentStep, (newVal) => {
  console.log('步骤变化:', newVal, 'canNext:', canNext.value)
})

// 选择角色
const selectRole = (role) => {
  form.value.role = role
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 发送验证码（开发模式）
const sendCode = async () => {
  // 开发阶段放宽手机号验证
  if (!form.value.phone) {
    alert('请输入手机号')
    return
  }

  // 开发阶段：生成4位数字验证码并自动填充
  const mockCode = Math.floor(1000 + Math.random() * 9000).toString()

  // 显示验证码提示（开发友好的方式）
  console.log('【开发模式】验证码:', mockCode)

  // 自动填充验证码到表单
  form.value.code = mockCode

  // 使用更友好的提示方式
  counting.value = true
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      counting.value = false
    }
  }, 1000)

  // 显示验证码（开发模式）
  alert(`【开发模式】验证码: ${mockCode}\n已自动填充到验证码输入框`)

  // 生产环境应调用API发送验证码
  // try {
  //   await api.sendSmsCode({ phone: form.value.phone })
  //   counting.value = true
  //   // ... 倒计时逻辑
  // } catch (error) {
  //   alert('验证码发送失败，请重试')
  // }
}

// 选择头像
const chooseAvatar = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      form.value.avatar = URL.createObjectURL(file)
    }
  }
  input.click()
}

// 上传身份证
const uploadIdCard = (side) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (side === 'front') {
        form.value.idCardFront = URL.createObjectURL(file)
      } else {
        form.value.idCardBack = URL.createObjectURL(file)
      }
    }
  }
  input.click()
}

// 上传任命书
const uploadAppointment = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*,.pdf'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      form.value.appointmentLetter = URL.createObjectURL(file)
    }
  }
  input.click()
}

// 选择村庄
const selectVillage = (village) => {
  selectedVillage.value = village
  form.value.villageId = village.id
  showVillagePicker.value = false
}

// 选择村组
const selectGroup = (group) => {
  form.value.group = group
  showGroupPicker.value = false
}

// 切换家庭类型
const toggleFamilyType = (type) => {
  const index = form.value.familyTypes.indexOf(type)
  if (index > -1) {
    form.value.familyTypes.splice(index, 1)
  } else {
    form.value.familyTypes.push(type)
  }
}

// 获取角色标签
const getRoleLabel = (role) => {
  return roles.find(r => r.value === role)?.label || role
}

// 获取家庭类型标签
const getFamilyTypeLabel = (type) => {
  return familyTypes.find(t => t.value === type)?.label || type
}

// 下一步
const nextStep = () => {
  if (canNext.value) {
    currentStep.value++
  }
}

// 上一步
const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 村干部职位权限映射
const positionPermissions = {
  '村支书': [
    'all',
    'approve_users',
    'manage_finance',
    'publish_announcements',
    'manage_meetings',
    'view_all_data',
    'audit_logs'
  ],
  '村主任': [
    'manage_finance',
    'publish_announcements',
    'manage_meetings',
    'view_village_data',
    'approve_services'
  ],
  '副主任': [
    'publish_announcements',
    'manage_meetings',
    'view_village_data',
    'approve_services'
  ],
  '会计': [
    'manage_finance',
    'view_financial_reports',
    'approve_expenses'
  ],
  '妇女主任': [
    'manage_women_services',
    'publish_announcements',
    'view_family_data'
  ],
  '治保主任': [
    'manage_security',
    'view_security_reports',
    'handle_emergencies'
  ],
  '民兵连长': [
    'manage_militia',
    'organize_training',
    'handle_emergencies'
  ]
}

// 提交注册
const submitRegister = async () => {
  if (submitting.value) return

  submitting.value = true

  try {
    console.log('注册信息:', form.value)

    // 判断是否需要管理员审核
    const needsApproval = ['cadre', 'official', 'admin'].includes(form.value.role)

    // 构建注册数据
    const registrationData = {
      ...form.value,
      villageName: selectedVillage.value?.name,
      status: needsApproval ? 'pending' : 'approved', // 村干部需要审核
      permissions: form.value.position ? positionPermissions[form.value.position] || [] : [],
      submittedAt: new Date().toISOString(),
      registrationId: 'REG_' + Date.now()
    }

    // 保存注册申请到本地存储（模拟后端存储）
    const pendingRegistrations = JSON.parse(localStorage.getItem('pending_registrations') || '[]')
    pendingRegistrations.push(registrationData)
    localStorage.setItem('pending_registrations', JSON.stringify(pendingRegistrations))

    console.log('注册数据已保存:', registrationData)

    // 模拟注册成功
    await new Promise(resolve => setTimeout(resolve, 1500))

    if (needsApproval) {
      // 村干部注册成功，但需要等待审核
      alert(`注册申请已提交！\n\n您的${form.value.role === 'cadre' ? '村干部' : '管理员'}账号需要经过本村管理员审核后才能正常使用。\n\n审核预计在1-3个工作日内完成，请耐心等待。`)

      // 跳转到等待审核页面或返回登录页
      router.replace('/auth/login')
    } else {
      // 普通村民直接注册成功
      alert('注册成功！请登录')
      router.replace('/auth/login')
    }
  } catch (error) {
    console.error('注册失败:', error)
    alert('注册失败，请重试')
  } finally {
    submitting.value = false
  }
}

// 返回
const goBack = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  } else {
    router.back()
  }
}
</script>

<style lang="scss" scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.navbar {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #eee;

  .back-btn {
    background: none;
    border: none;
    font-size: 20px;
    padding: 8px;
    cursor: pointer;
  }

  .title {
    flex: 1;
    font-size: 18px;
    font-weight: 600;
    color: #333;
    text-align: center;
  }

  .placeholder {
    width: 40px;
  }
}

.register-content {
  flex: 1;
  padding: 20px 16px 100px;
}

.step-indicator {
  display: flex;
  justify-content: space-between;
  margin-bottom: 32px;

  .step-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    flex: 1;

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e8e8e8;
      color: #999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s;
    }

    .step-label {
      font-size: 12px;
      color: #999;
    }

    &--active {
      .step-number {
        background: #1890ff;
        color: #fff;
      }

      .step-label {
        color: #1890ff;
        font-weight: 600;
      }
    }

    &--completed {
      .step-number {
        background: #52c41a;
        color: #fff;
      }

      .step-label {
        color: #52c41a;
      }
    }
  }
}

.step-content {
  .step-title {
    font-size: 20px;
    font-weight: 600;
    color: #333;
    margin-bottom: 24px;
    text-align: center;
  }
}

.role-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  .role-card {
    background: #fff;
    border: 2px solid transparent;
    border-radius: 12px;
    padding: 24px 16px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;

    &--selected {
      border-color: #1890ff;
      background: #e6f7ff;
    }

    .role-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .role-name {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
    }

    .role-desc {
      font-size: 12px;
      color: #999;
    }
  }
}

.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;

  .avatar-wrapper {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    cursor: pointer;
    margin-bottom: 8px;

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
    }
  }

  .avatar-tip {
    font-size: 12px;
    color: #999;
  }
}

.form-item {
  margin-bottom: 20px;

  .form-label {
    display: block;
    font-size: 14px;
    color: #333;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .form-input,
  .form-textarea {
    width: 100%;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 12px;
    font-size: 14px;
    outline: none;

    &.large-text {
      font-size: 18px;
    }

    &:focus {
      border-color: #1890ff;
    }
  }

  .form-textarea {
    resize: none;
    font-family: inherit;
  }

  .input-with-code {
    display: flex;
    gap: 8px;

    .code-btn {
      padding: 0 16px;
      border: none;
      background: #1890ff;
      color: #fff;
      border-radius: 8px;
      font-size: 13px;
      white-space: nowrap;

      &:disabled {
        background: #ccc;
      }
    }
  }

  .input-with-icon {
    display: flex;
    align-items: center;
    border: 1px solid #e8e8e8;
    border-radius: 8px;
    padding: 0 12px;
    cursor: pointer;
    position: relative;

    &:active {
      background: #f5f5f5;
    }

    .form-input {
      flex: 1;
      border: none;
      padding: 12px 0;
      background: transparent;
      cursor: pointer;
    }

    .icon-btn {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
    }
  }

  .input-arrow {
    color: #999;
    font-size: 18px;
    pointer-events: none;
  }
}

.gender-options {
  display: flex;
  gap: 16px;

  .gender-option {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    background: #fff;
    border: 2px solid #e8e8e8;
    border-radius: 8px;
    cursor: pointer;

    &--selected {
      border-color: #1890ff;
      background: #e6f7ff;
    }

    .gender-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .gender-text {
      font-size: 14px;
      color: #333;
    }
  }
}

.position-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .position-tag {
    padding: 8px 16px;
    background: #f5f5f5;
    border: 1px solid #e8e8e8;
    border-radius: 20px;
    font-size: 14px;
    cursor: pointer;

    &--selected {
      background: #1890ff;
      color: #fff;
      border-color: #1890ff;
    }
  }
}

.upload-area {
  display: flex;
  gap: 12px;

  .upload-item {
    flex: 1;

    &.full-width {
      flex: none;
      width: 100%;
    }

    .upload-image {
      width: 100%;
      height: 120px;
      object-fit: cover;
      border-radius: 8px;
    }

    .upload-placeholder {
      width: 100%;
      height: 120px;
      border: 2px dashed #d9d9d9;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;

      &:active {
        border-color: #1890ff;
      }

      .upload-icon {
        font-size: 32px;
        margin-bottom: 8px;
      }

      .upload-text {
        font-size: 12px;
        color: #999;
      }
    }
  }
}

.family-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .family-tag {
    padding: 8px 16px;
    background: #f5f5f5;
    border: 1px solid #e8e8e8;
    border-radius: 20px;
    font-size: 14px;
    cursor: pointer;

    &--selected {
      background: #52c41a;
      color: #fff;
      border-color: #52c41a;
    }
  }
}

.info-summary {
  background: #fff;
  border-radius: 12px;
  padding: 20px;

  .summary-item {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #f5f5f5;

    &:last-child {
      border-bottom: none;
    }

    .summary-label {
      font-size: 14px;
      color: #666;
    }

    .summary-value {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }
  }
}

.footer-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #eee;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0));

  .action-btn {
    flex: 1;
    height: 48px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;

    &.secondary {
      background: #f5f5f5;
      color: #666;
    }

    &.primary {
      background: #1890ff;
      color: #fff;

      &:disabled {
        background: #ccc;
      }
    }
  }
}

.picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;

  .picker-content {
    width: 100%;
    background: #fff;
    border-radius: 16px 16px 0 0;
    max-height: 60vh;
    display: flex;
    flex-direction: column;

    .picker-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #eee;

      .picker-title {
        font-size: 16px;
        font-weight: 600;
      }

      .picker-close {
        background: none;
        border: none;
        font-size: 24px;
        padding: 4px;
      }
    }

    .picker-search {
      padding: 12px 16px;

      .search-input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        font-size: 14px;
      }
    }

    .picker-list {
      flex: 1;
      overflow-y: auto;

      .picker-item {
        padding: 14px 16px;
        border-bottom: 1px solid #f5f5f5;
        cursor: pointer;

        &:active {
          background: #f5f5f5;
        }
      }
    }
  }
}

.input-arrow {
  color: #999;
  font-size: 18px;
}

// 适老化模式
:deep(.elderly-mode-large) {
  .step-title {
    font-size: 24px;
  }

  .form-input,
  .form-textarea {
    font-size: 16px;
  }
}

:deep(.elderly-mode-xl) {
  .step-title {
    font-size: 28px;
  }

  .form-input,
  .form-textarea {
    font-size: 18px;
  }
}
</style>
