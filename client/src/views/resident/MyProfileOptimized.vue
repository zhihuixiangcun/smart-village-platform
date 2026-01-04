<template>
  <div class="my-profile-optimized" :class="{ 'large-text-mode': isLargeText }">
    <!-- 顶部欢迎栏 -->
    <el-card class="welcome-card" shadow="never">
      <div class="welcome-content">
        <div class="user-info">
          <el-avatar :size="64" :src="profile?.personalInfo?.photo">
            <el-icon><User /></el-icon>
          </el-avatar>
          <div class="user-text">
            <h2>欢迎回来，{{ profile?.personalInfo?.name || '村民' }}</h2>
            <p class="user-subtitle">{{ getGreeting() }}，今天是 {{ formatDate(new Date()) }}</p>
          </div>
        </div>
        <div class="welcome-actions">
          <el-button-group>
            <el-button icon="Setting" @click="showSettings = true">设置</el-button>
            <el-button icon="QuestionFilled">帮助</el-button>
          </el-button-group>
        </div>
      </div>
    </el-card>

    <!-- 快捷功能卡片区 -->
    <QuickActionsCard />

    <!-- 主要内容区域 - 两列布局 -->
    <el-row :gutter="20">
      <!-- 左列：个人信息 -->
      <el-col :xs="24" :sm="24" :md="14" :lg="14">
        <!-- 个人信息卡片 -->
        <el-card class="profile-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>个人信息</span>
              <el-button type="primary" size="small" icon="Edit" @click="showEditDialog = true">
                编辑资料
              </el-button>
            </div>
          </template>

          <div class="profile-content">
            <el-row :gutter="24">
              <!-- 头像区 -->
              <el-col :span="8" :xs="24" :sm="8" class="avatar-col">
                <div class="avatar-section">
                  <el-avatar
                    :size="120"
                    :src="profile?.personalInfo?.photo"
                    class="profile-avatar"
                  >
                    <el-icon><User /></el-icon>
                  </el-avatar>
                  <div class="avatar-actions">
                    <el-upload
                      :action="uploadUrl"
                      :headers="uploadHeaders"
                      :show-file-list="false"
                      :on-success="handleAvatarSuccess"
                      :before-upload="beforeAvatarUpload"
                    >
                      <el-button size="small" icon="Camera">更换</el-button>
                    </el-upload>
                    <el-button size="small" icon="View" @click="previewAvatar">预览</el-button>
                  </div>
                </div>
              </el-col>

              <!-- 信息区 -->
              <el-col :span="16" :xs="24" :sm="16">
                <div class="info-section">
                  <h3>
                    {{ profile?.personalInfo?.name }}
                    <el-tag
                      v-for="tag in profile?.tags"
                      :key="tag"
                      :type="getTagType(tag)"
                      size="small"
                      style="margin-left: 8px"
                    >
                      {{ tag }}
                    </el-tag>
                  </h3>

                  <!-- 关键信息突出显示 -->
                  <div class="key-info">
                    <div class="info-pill">
                      <el-icon><Calendar /></el-icon>
                      <span>{{ profile?.personalInfo?.age }}岁</span>
                    </div>
                    <div class="info-pill">
                      <el-icon><Location /></el-icon>
                      <span>{{ profile?.contact?.address || '未填写' }}</span>
                    </div>
                    <div class="info-pill">
                      <el-icon><Phone /></el-icon>
                      <span>{{ maskPhone(profile?.contact?.phone) }}</span>
                    </div>
                  </div>

                  <!-- 详细信息网格 -->
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="label">性别：</span>
                      <span class="value">{{ profile?.personalInfo?.gender }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">民族：</span>
                      <span class="value">{{ profile?.personalInfo?.ethnicity }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">身份证：</span>
                      <span class="value">{{ maskIdCard(profile?.personalInfo?.idCard) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">政治面貌：</span>
                      <span class="value">{{ profile?.personalInfo?.politicalStatus }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">婚姻状况：</span>
                      <span class="value">{{ profile?.personalInfo?.maritalStatus }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">健康状况：</span>
                      <span class="value">{{ profile?.personalInfo?.healthStatus }}</span>
                    </div>
                  </div>

                  <!-- 快速操作按钮 -->
                  <div class="quick-actions">
                    <el-button
                      :type="isLargeText ? 'primary' : 'default'"
                      icon="FontSize"
                      @click="toggleLargeText"
                    >
                      {{ isLargeText ? '正常' : '大字' }}模式
                    </el-button>
                    <el-button
                      :type="isVoiceEnabled ? 'primary' : 'default'"
                      icon="Microphone"
                      @click="toggleVoice"
                    >
                      {{ isListening ? '聆听中...' : '语音助手' }}
                    </el-button>
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-card>

        <!-- 联系方式卡片 -->
        <el-card class="contact-card" shadow="hover">
          <template #header>
            <span>联系方式</span>
          </template>

          <div class="contact-info">
            <el-row :gutter="20">
              <el-col :span="8" :xs="24" :sm="12">
                <div class="contact-item">
                  <div class="item-icon">
                    <el-icon><Phone /></el-icon>
                  </div>
                  <div class="item-content">
                    <div class="item-label">手机号码</div>
                    <div class="item-value">{{ profile?.contact?.phone }}</div>
                  </div>
                </div>
              </el-col>
              <el-col :span="8" :xs="24" :sm="12">
                <div class="contact-item">
                  <div class="item-icon">
                    <el-icon><Message /></el-icon>
                  </div>
                  <div class="item-content">
                    <div class="item-label">电子邮箱</div>
                    <div class="item-value">{{ profile?.contact?.email || '未填写' }}</div>
                  </div>
                </div>
              </el-col>
              <el-col :span="8" :xs="24" :sm="12">
                <div class="contact-item">
                  <div class="item-icon">
                    <el-icon><Location /></el-icon>
                  </div>
                  <div class="item-content">
                    <div class="item-label">家庭住址</div>
                    <div class="item-value">{{ profile?.contact?.address }}</div>
                  </div>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-card>

        <!-- 教育和就业信息 -->
        <el-row :gutter="20">
          <el-col :span="12" :xs="24">
            <el-card class="education-card" shadow="hover">
              <template #header>
                <span>教育背景</span>
              </template>

              <div v-if="profile?.education" class="education-info">
                <div class="edu-item">
                  <span class="label">学历：</span>
                  <span class="value">{{ profile.education.degree }}</span>
                </div>
                <div class="edu-item">
                  <span class="label">毕业学校：</span>
                  <span class="value">{{ profile.education.school || '未填写' }}</span>
                </div>
                <div class="edu-item">
                  <span class="label">专业：</span>
                  <span class="value">{{ profile.education.major || '未填写' }}</span>
                </div>
                <div class="edu-item">
                  <span class="label">毕业年份：</span>
                  <span class="value">{{ profile.education.graduationYear || '未填写' }}</span>
                </div>
              </div>
              <el-empty v-else description="暂无教育信息" :image-size="80" />
            </el-card>
          </el-col>

          <el-col :span="12" :xs="24">
            <el-card class="employment-card" shadow="hover">
              <template #header>
                <span>就业信息</span>
              </template>

              <div v-if="profile?.employment" class="employment-info">
                <div class="emp-item">
                  <span class="label">就业状态：</span>
                  <span class="value">{{ profile.employment.status }}</span>
                </div>
                <div class="emp-item">
                  <span class="label">工作单位：</span>
                  <span class="value">{{ profile.employment.employer || '未填写' }}</span>
                </div>
                <div class="emp-item">
                  <span class="label">职位：</span>
                  <span class="value">{{ profile.employment.position || '未填写' }}</span>
                </div>
                <div class="emp-item">
                  <span class="label">月收入：</span>
                  <span class="value">{{ formatIncome(profile.employment.income?.monthly) }}</span>
                </div>
              </div>
              <el-empty v-else description="暂无就业信息" :image-size="80" />
            </el-card>
          </el-col>
        </el-row>
      </el-col>

      <!-- 右列：待办事项和其他功能 -->
      <el-col :xs="24" :sm="24" :md="10" :lg="10">
        <!-- 待办事项卡片 -->
        <el-card class="todo-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>待办事项</span>
              <el-badge :value="todoCount" class="badge" />
            </div>
          </template>

          <div v-if="todoList.length > 0" class="todo-list">
            <div
              v-for="todo in todoList"
              :key="todo.id"
              class="todo-item"
              :class="'priority-' + todo.priority"
            >
              <div class="todo-icon">
                <el-icon :color="getPriorityColor(todo.priority)">
                  <component :is="getPriorityIcon(todo.type)" />
                </el-icon>
              </div>
              <div class="todo-content">
                <h4>{{ todo.title }}</h4>
                <p>{{ todo.description }}</p>
                <div class="todo-deadline">
                  <el-icon><Clock /></el-icon>
                  <span>{{ todo.deadline }}</span>
                </div>
              </div>
              <div class="todo-actions">
                <el-button size="small" type="primary" @click="handleTodo(todo)">
                  处理
                </el-button>
              </div>
            </div>
            <el-button text style="width: 100%; margin-top: 12px" @click="viewAllTodos">
              查看全部 →
            </el-button>
          </div>
          <el-empty v-else description="暂无待办事项" :image-size="80" />
        </el-card>

        <!-- 社会保障卡片 -->
        <el-card class="social-card" shadow="hover">
          <template #header>
            <span>社会保障</span>
          </template>

          <div v-if="profile?.socialSecurity" class="social-info">
            <div class="social-item">
              <el-tag :type="profile.socialSecurity.hasMedicalInsurance ? 'success' : 'info'" size="large">
                {{ profile.socialSecurity.hasMedicalInsurance ? '✓' : '✗' }} 医疗保险
              </el-tag>
              <span class="detail">{{ profile.socialSecurity.medicalInsuranceType }}</span>
            </div>
            <div class="social-item">
              <el-tag :type="profile.socialSecurity.hasPensionInsurance ? 'success' : 'info'" size="large">
                {{ profile.socialSecurity.hasPensionInsurance ? '✓' : '✗' }} 养老保险
              </el-tag>
            </div>
            <div class="social-item">
              <el-tag :type="profile.socialSecurity.hasUnemploymentInsurance ? 'success' : 'info'" size="large">
                {{ profile.socialSecurity.hasUnemploymentInsurance ? '✓' : '✗' }} 失业保险
              </el-tag>
            </div>
          </div>
          <el-empty v-else description="暂无社会保障信息" :image-size="80" />
        </el-card>

        <!-- 家庭成员预览 -->
        <el-card
          v-if="profile?.familyRelations?.length > 0"
          class="family-card"
          shadow="hover"
        >
          <template #header>
            <div class="card-header">
              <span>家庭成员</span>
              <el-button text @click="viewFamily">查看全部 →</el-button>
            </div>
          </template>

          <div class="family-preview">
            <div
              v-for="member in profile.familyRelations.slice(0, 3)"
              :key="member.id"
              class="family-member"
            >
              <el-avatar :size="48">
                <el-icon><User /></el-icon>
              </el-avatar>
              <div class="member-info">
                <div class="member-name">{{ member.name }}</div>
                <div class="member-relation">{{ member.relationType }}</div>
              </div>
            </div>
          </div>
          <el-button
            v-if="profile.familyRelations.length > 3"
            text
            style="width: 100%; margin-top: 12px"
            @click="viewFamily"
          >
            还有 {{ profile.familyRelations.length - 3 }} 位成员 →
          </el-button>
        </el-card>
      </el-col>
    </el-row>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑个人资料"
      width="800px"
      :close-on-click-modal="false"
    >
      <ProfileForm
        :profile="profile"
        mode="edit"
        @submit="handleProfileUpdate"
        @cancel="showEditDialog = false"
      />
    </el-dialog>

    <!-- 语音识别对话框 -->
    <el-dialog v-model="isListening" title="语音助手" width="400px" :close-on-click-modal="false">
      <div class="voice-assistant">
        <div class="listening-animation">
          <div class="wave"></div>
          <div class="wave"></div>
          <div class="wave"></div>
        </div>
        <p class="listening-tip">请说出您要办理的业务</p>
        <p v-if="recognizedText" class="recognized-text">"{{ recognizedText }}"</p>
        <div class="voice-examples">
          <p>您可以尝试说：</p>
          <el-tag size="small">"打开一户一码"</el-tag>
          <el-tag size="small">"我要办证件"</el-tag>
          <el-tag size="small">"查询补贴"</el-tag>
        </div>
      </div>
      <template #footer>
        <el-button @click="stopListening" type="danger">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User,
  Edit,
  Phone,
  Message,
  Location,
  Camera,
  Calendar,
  Clock,
  Setting,
  QuestionFilled,
  FontSize,
  Microphone,
  Document,
  Bell,
  FirstAid
} from '@element-plus/icons-vue'
import { profileApi } from '@/api/residentProfile'
import ProfileForm from '@/components/resident/ProfileForm.vue'
import QuickActionsCard from '@/components/resident/QuickActionsCard.vue'
import { useLargeText } from '@/composables/useLargeText'
import { useVoiceInput } from '@/composables/useVoiceInput'

const router = useRouter()

// Composables
const { isLargeText, toggleLargeText } = useLargeText()
const {
  isListening,
  recognizedText,
  isSupported: voiceSupported,
  startListening,
  stopListening,
  parseVoiceIntent
} = useVoiceInput()

// 响应式数据
const profile = ref(null)
const showEditDialog = ref(false)
const showSettings = ref(false)
const isVoiceEnabled = ref(true)
const uploadUrl = import.meta.env.VITE_API_URL + '/api/v1/upload'
const uploadHeaders = {
  Authorization: 'Bearer ' + localStorage.getItem('token')
}

// 待办事项数据
const todoList = ref([
  {
    id: 1,
    title: '身份证待领取',
    description: '您的身份证已制作完成',
    type: 'document',
    priority: 'high',
    deadline: '2025-01-10'
  },
  {
    id: 2,
    title: '老年补贴申请',
    description: '本月可申请老年补贴 ¥200',
    type: 'subsidy',
    priority: 'medium',
    deadline: '2025-01-15'
  },
  {
    id: 3,
    title: '免费体检预约',
    description: '65岁以上老人免费体检',
    type: 'medical',
    priority: 'low',
    deadline: '2025-01-20'
  }
])

const todoCount = computed(() => todoList.value.length)

// 加载个人资料
const loadProfile = async () => {
  try {
    const response = await profileApi.getMyProfile()
    profile.value = response.data
  } catch (error) {
    ElMessage.error('加载个人资料失败')
    console.error(error)
  }
}

// 获取问候语
const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 6) return '凌晨好'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 17) return '下午好'
  if (hour < 19) return '傍晚好'
  return '晚上好'
}

// 格式化日期
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

// 头像上传前验证
const beforeAvatarUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('上传头像只能是图片格式!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('上传头像大小不能超过 2MB!')
    return false
  }
  return true
}

// 头像上传成功
const handleAvatarSuccess = (response) => {
  ElMessage.success('头像上传成功')
  if (profile.value && response.data.data?.photo) {
    profile.value.personalInfo.photo = response.data.data.photo
  }
}

// 预览头像
const previewAvatar = () => {
  if (profile.value?.personalInfo?.photo) {
    ElMessageBox.alert(
      `<img src="${profile.value.personalInfo.photo}" style="max-width:100%">`,
      '头像预览',
      {
        dangerouslyUseHTMLString: true,
        customClass: 'avatar-preview-dialog'
      }
    )
  }
}

// 身份证号脱敏
const maskIdCard = (idCard) => {
  if (!idCard) return ''
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}

// 手机号脱敏
const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 格式化收入
const formatIncome = (income) => {
  if (!income) return '未填写'
  return `${income.toLocaleString()} 元`
}

// 获取标签类型
const getTagType = (tag) => {
  const tagTypeMap = {
    '党员': 'danger',
    '村干部': 'warning',
    '退役军人': 'success',
    '低保户': 'danger',
    '五保户': 'warning',
    '空巢老人': 'warning',
    '独居老人': 'warning'
  }
  return tagTypeMap[tag] || ''
}

// 获取优先级颜色
const getPriorityColor = (priority) => {
  const colorMap = {
    high: '#f56c6c',
    medium: '#e6a23c',
    low: '#67c23a'
  }
  return colorMap[priority] || '#909399'
}

// 获取优先级图标
const getPriorityIcon = (type) => {
  const iconMap = {
    document: Document,
    subsidy: Bell,
    medical: FirstAid
  }
  return iconMap[type] || Bell
}

// 处理待办事项
const handleTodo = (todo) => {
  ElMessage.info(`处理: ${todo.title}`)
  // 根据todo类型跳转到相应页面
}

// 查看所有待办
const viewAllTodos = () => {
  router.push('/todos')
}

// 查看家庭
const viewFamily = () => {
  router.push('/family')
}

// 切换语音
const toggleVoice = async () => {
  if (!voiceSupported.value) {
    ElMessage.error('您的浏览器不支持语音功能')
    return
  }

  if (isListening.value) {
    stopListening()
  } else {
    try {
      const text = await startListening()
      const intent = parseVoiceIntent(text)

      if (intent.action === 'navigate') {
        router.push(intent.route)
        ElMessage.success(`正在打开: ${intent.originalText}`)
      } else if (intent.action === 'toggle') {
        if (intent.feature === 'largeText') {
          toggleLargeText()
          ElMessage.success('已切换大字模式')
        }
      } else if (intent.action === 'unknown') {
        ElMessage.warning('未识别到相关功能,请重试')
      }
    } catch (error) {
      console.error('Voice recognition error:', error)
    }
  }
}

// 更新资料
const handleProfileUpdate = async (formData) => {
  try {
    await profileApi.updateMyProfile(formData)
    ElMessage.success('更新成功')
    showEditDialog.value = false
    loadProfile()
  } catch (error) {
    ElMessage.error('更新失败')
    console.error(error)
  }
}

// 生命周期
onMounted(() => {
  loadProfile()
})
</script>

<style lang="scss" scoped>
.my-profile-optimized {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;

  // 欢迎卡片
  .welcome-card {
    margin-bottom: 20px;

    .welcome-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .user-info {
        display: flex;
        align-items: center;
        gap: 16px;

        .user-text {
          h2 {
            margin: 0 0 4px 0;
            font-size: 20px;
            color: #303133;
          }

          .user-subtitle {
            margin: 0;
            font-size: 14px;
            color: #909399;
          }
        }
      }
    }
  }

  // 个人信息卡片
  .profile-card {
    margin-bottom: 20px;

    .profile-content {
      .avatar-col {
        text-align: center;

        .avatar-section {
          .profile-avatar {
            margin-bottom: 12px;
          }

          .avatar-actions {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
        }
      }

      .info-section {
        h3 {
          margin: 0 0 16px 0;
          font-size: 22px;
          color: #303133;
        }

        .key-info {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;

          .info-pill {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: #f5f7fa;
            border-radius: 20px;
            font-size: 14px;
            color: #606266;

            .el-icon {
              color: #409eff;
            }
          }
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;

          .info-item {
            display: flex;
            align-items: center;

            .label {
              color: #909399;
              min-width: 80px;
              margin-right: 8px;
            }

            .value {
              color: #303133;
              font-weight: 500;
            }
          }
        }

        .quick-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
      }
    }
  }

  // 联系方式卡片
  .contact-card {
    margin-bottom: 20px;

    .contact-info {
      .contact-item {
        display: flex;
        align-items: center;
        padding: 16px;
        background: #f5f7fa;
        border-radius: 8px;
        margin-bottom: 12px;

        &:last-child {
          margin-bottom: 0;
        }

        .item-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 16px;

          .el-icon {
            font-size: 24px;
            color: #409eff;
          }
        }

        .item-content {
          flex: 1;

          .item-label {
            color: #909399;
            font-size: 13px;
            margin-bottom: 4px;
          }

          .item-value {
            color: #303133;
            font-weight: 500;
            font-size: 15px;
          }
        }
      }
    }
  }

  // 教育和就业卡片
  .education-card,
  .employment-card {
    margin-bottom: 20px;
    height: 100%;

    .education-info,
    .employment-info {
      .edu-item,
      .emp-item {
        display: flex;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .label {
          color: #909399;
          min-width: 90px;
          margin-right: 12px;
        }

        .value {
          color: #303133;
          font-weight: 500;
        }
      }
    }
  }

  // 待办事项卡片
  .todo-card {
    margin-bottom: 20px;

    .todo-list {
      .todo-item {
        display: flex;
        align-items: flex-start;
        padding: 16px;
        background: #f5f7fa;
        border-radius: 8px;
        margin-bottom: 12px;
        border-left: 4px solid #409eff;

        &.priority-high {
          border-left-color: #f56c6c;
        }

        &.priority-medium {
          border-left-color: #e6a23c;
        }

        &.priority-low {
          border-left-color: #67c23a;
        }

        .todo-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;

          .el-icon {
            font-size: 20px;
          }
        }

        .todo-content {
          flex: 1;

          h4 {
            margin: 0 0 4px 0;
            font-size: 15px;
            color: #303133;
          }

          p {
            margin: 0 0 8px 0;
            font-size: 13px;
            color: #909399;
          }

          .todo-deadline {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #f56c6c;

            .el-icon {
              font-size: 14px;
            }
          }
        }

        .todo-actions {
          margin-left: 12px;
        }
      }
    }
  }

  // 社会保障卡片
  .social-card {
    margin-bottom: 20px;

    .social-info {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .social-item {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .detail {
          font-size: 14px;
          color: #909399;
        }
      }
    }
  }

  // 家庭成员卡片
  .family-card {
    margin-bottom: 20px;

    .family-preview {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .family-member {
        display: flex;
        align-items: center;
        padding: 12px;
        background: #f5f7fa;
        border-radius: 8px;

        .el-avatar {
          margin-right: 12px;
        }

        .member-info {
          flex: 1;

          .member-name {
            font-size: 15px;
            font-weight: 500;
            color: #303133;
            margin-bottom: 4px;
          }

          .member-relation {
            font-size: 13px;
            color: #909399;
          }
        }
      }
    }
  }

  // 语音助手对话框
  .voice-assistant {
    text-align: center;

    .listening-animation {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;

      .wave {
        width: 8px;
        height: 40px;
        background: linear-gradient(180deg, #409eff 0%, #67c23a 100%);
        border-radius: 4px;
        animation: wave 1s ease-in-out infinite;

        &:nth-child(2) {
          animation-delay: 0.2s;
        }

        &:nth-child(3) {
          animation-delay: 0.4s;
        }
      }
    }

    .listening-tip {
      font-size: 16px;
      color: #606266;
      margin-bottom: 16px;
    }

    .recognized-text {
      font-size: 18px;
      color: #409eff;
      margin-bottom: 20px;
      font-weight: 500;
    }

    .voice-examples {
      p {
        color: #909399;
        margin-bottom: 12px;
      }

      .el-tag {
        margin: 0 4px 8px;
      }
    }
  }
}

@keyframes wave {
  0%, 100% {
    transform: scaleY(0.5);
  }
  50% {
    transform: scaleY(1);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .my-profile-optimized {
    padding: 12px;

    .welcome-card {
      .welcome-content {
        flex-direction: column;
        text-align: center;

        .user-info {
          flex-direction: column;
          margin-bottom: 16px;
        }

        .welcome-actions {
          width: 100%;
          display: flex;
          justify-content: center;
        }
      }
    }

    .profile-card {
      .profile-content {
        .info-section {
          margin-top: 20px;

          .key-info {
            .info-pill {
              width: 100%;
            }
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .quick-actions {
            .el-button {
              width: 100%;
            }
          }
        }
      }
    }
  }
}

// 大字模式全局样式
:global(.large-text-mode) {
  font-size: 18px;

  h2, h3, h4 {
    font-size: 1.3em;
  }

  .el-button {
    font-size: 16px;
    padding: 12px 24px;
  }

  .el-card {
    :deep(.el-card__header) {
      font-size: 1.2em;
      padding: 20px;
    }

    :deep(.el-card__body) {
      font-size: 1.1em;
      padding: 20px;
    }
  }

  .info-item,
  .contact-item {
    padding: 16px !important;
  }
}

// 头像预览对话框
:global(.avatar-preview-dialog) {
  .el-message-box__content {
    padding: 20px;
  }
}
</style>
