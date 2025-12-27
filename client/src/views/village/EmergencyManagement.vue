<template>
  <div class="emergency-management">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="应急管理"
      left-arrow
      @click-left="$router.go(-1)"
      right-text="演练"
      @click-right="showDrillOptions = true"
    />

    <!-- 紧急警报 -->
    <div class="emergency-alert" v-if="activeEmergency">
      <van-notice-bar
        type="danger"
        :text="activeEmergency.title"
        mode="closeable"
        @close="dismissEmergency"
      />
      <div class="emergency-content">
        <h4>{{ activeEmergency.title }}</h4>
        <p>{{ activeEmergency.description }}</p>
        <div class="emergency-actions">
          <van-button type="danger" size="small" @click="handleEmergency">
            立即处理
          </van-button>
          <van-button size="small" @click="viewEmergencyDetail">
            查看详情
          </van-button>
        </div>
      </div>
    </div>

    <!-- 快速呼叫 -->
    <div class="quick-call">
      <van-cell-group inset title="紧急呼叫">
        <van-grid :column-num="3" :gutter="12">
          <van-grid-item
            v-for="contact in emergencyContacts"
            :key="contact.id"
            @click="makeEmergencyCall(contact)"
          >
            <div class="contact-card">
              <div class="contact-icon" :style="{ backgroundColor: contact.color }">
                <van-icon :name="contact.icon" size="24" color="white" />
              </div>
              <div class="contact-name">{{ contact.name }}</div>
              <div class="contact-phone">{{ contact.phone }}</div>
            </div>
          </van-grid-item>
        </van-grid>
      </van-cell-group>
    </div>

    <!-- 应急预案 -->
    <div class="emergency-plans">
      <van-cell-group inset title="应急预案">
        <van-cell
          v-for="plan in emergencyPlans"
          :key="plan.id"
          :title="plan.title"
          :label="plan.description"
          is-link
          @click="viewPlan(plan)"
        >
          <template #left-icon>
            <van-icon :name="plan.icon" :color="plan.color" />
          </template>
          <template #right-icon>
            <van-tag :type="getPlanStatusType(plan.status)" size="small">
              {{ getPlanStatusText(plan.status) }}
            </van-tag>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 应急资源 -->
    <div class="emergency-resources">
      <van-cell-group inset title="应急资源">
        <van-grid :column-num="2" :gutter="12">
          <van-grid-item
            v-for="resource in emergencyResources"
            :key="resource.id"
            @click="viewResource(resource)"
          >
            <div class="resource-card">
              <div class="resource-icon">
                <van-icon :name="resource.icon" size="24" />
              </div>
              <div class="resource-name">{{ resource.name }}</div>
              <div class="resource-count">{{ resource.count }} {{ resource.unit }}</div>
            </div>
          </van-grid-item>
        </van-grid>
      </van-cell-group>
    </div>

    <!-- 应急记录 -->
    <div class="emergency-records">
      <van-cell-group inset title="应急记录">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <van-cell
            v-for="record in emergencyRecords"
            :key="record.id"
            :title="record.title"
            :label="formatRecordLabel(record)"
            is-link
            @click="viewRecord(record)"
          >
            <template #left-icon>
              <van-icon :name="getRecordIcon(record.type)" />
            </template>
            <template #right-icon>
              <van-tag :type="getRecordStatusType(record.status)" size="small">
                {{ getRecordStatusText(record.status) }}
              </van-tag>
            </template>
          </van-cell>
        </van-list>
      </van-cell-group>
    </div>

    <!-- 悬浮按钮 -->
    <van-floating-bubble
      axis="xy"
      icon="add"
      @click="showEmergencyCreator = true"
    />

    <!-- 演练选项弹窗 -->
    <van-popup v-model:show="showDrillOptions" position="bottom">
      <div class="drill-options">
        <h3>应急演练</h3>
        <van-cell-group>
          <van-cell title="消防演练" icon="fire-o" @click="startDrill('fire')" />
          <van-cell title="防汛演练" icon="warning-o" @click="startDrill('flood')" />
          <van-cell title="地震演练" icon="shop-o" @click="startDrill('earthquake')" />
          <van-cell title="疫情演练" icon="shield-o" @click="startDrill('epidemic')" />
        </van-cell-group>
      </div>
    </van-popup>

    <!-- 应急创建弹窗 -->
    <van-popup v-model:show="showEmergencyCreator" position="bottom" :style="{ height: '80%' }">
      <div class="emergency-creator">
        <div class="creator-header">
          <h3>发布应急事件</h3>
          <van-icon name="cross" @click="showEmergencyCreator = false" />
        </div>

        <div class="creator-content">
          <van-form>
            <van-field
              v-model="emergencyForm.title"
              label="事件标题"
              placeholder="请输入应急事件标题"
              required
            />
            <van-field
              v-model="emergencyForm.description"
              label="事件描述"
              type="textarea"
              placeholder="请详细描述应急情况"
              rows="3"
              required
            />
            <van-field
              name="level"
              label="紧急程度"
              readonly
              clickable
              :value="getLevelText(emergencyForm.level)"
              @click="showLevelPicker = true"
            />
            <van-field
              name="type"
              label="事件类型"
              readonly
              clickable
              :value="getTypeText(emergencyForm.type)"
              @click="showTypePicker = true"
            />
            <van-field
              name="location"
              label="事发地点"
              placeholder="请输入具体地点"
            />
            <van-field
              name="affectedPeople"
              label="影响人数"
              type="number"
              placeholder="预估影响人数"
            />
          </van-form>
        </div>

        <div class="creator-actions">
          <van-button @click="showEmergencyCreator = false">取消</van-button>
          <van-button type="danger" @click="publishEmergency" :loading="publishing">
            发布紧急警报
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 紧急程度选择器 -->
    <van-popup v-model:show="showLevelPicker" position="bottom">
      <van-picker
        :columns="levelColumns"
        title="选择紧急程度"
        @confirm="onLevelConfirm"
        @cancel="showLevelPicker = false"
      />
    </van-popup>

    <!-- 事件类型选择器 -->
    <van-popup v-model:show="showTypePicker" position="bottom">
      <van-picker
        :columns="typeColumns"
        title="选择事件类型"
        @confirm="onTypeConfirm"
        @cancel="showTypePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import villageApi from '@/api/villageManagement'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const finished = ref(false)
const publishing = ref(false)
const showDrillOptions = ref(false)
const showEmergencyCreator = ref(false)
const showLevelPicker = ref(false)
const showTypePicker = ref(false)

const activeEmergency = ref(null)
const emergencyRecords = ref([])

// 分页参数
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 紧急联系人
const emergencyContacts = ref([
  {
    id: '1',
    name: '村委书记',
    phone: '13800138000',
    icon: 'user-o',
    color: '#409EFF'
  },
  {
    id: '2',
    name: '村主任',
    phone: '13800138001',
    icon: 'manager-o',
    color: '#67C23A'
  },
  {
    id: '3',
    name: '派出所',
    phone: '110',
    icon: 'phone-o',
    color: '#F56C6C'
  },
  {
    id: '4',
    name: '卫生院',
    phone: '120',
    icon: 'hospital-o',
    color: '#E6A23C'
  },
  {
    id: '5',
    name: '消防队',
    phone: '119',
    icon: 'fire-o',
    color: '#FF6B6B'
  },
  {
    id: '6',
    name: '供电所',
    phone: '95598',
    icon: 'bulb-o',
    color: '#FFA500'
  }
])

// 应急预案
const emergencyPlans = ref([
  {
    id: '1',
    title: '火灾应急预案',
    description: '应对火灾事故的应急处置流程',
    icon: 'fire-o',
    color: '#F56C6C',
    status: 'active'
  },
  {
    id: '2',
    title: '防汛应急预案',
    description: '应对洪涝灾害的应急处置流程',
    icon: 'warning-o',
    color: '#409EFF',
    status: 'active'
  },
  {
    id: '3',
    title: '地震应急预案',
    description: '应对地震灾害的应急处置流程',
    icon: 'shop-o',
    color: '#E6A23C',
    status: 'active'
  },
  {
    id: '4',
    title: '疫情防控预案',
    description: '应对传染病的应急处置流程',
    icon: 'shield-o',
    color: '#67C23A',
    status: 'active'
  }
])

// 应急资源
const emergencyResources = ref([
  {
    id: '1',
    name: '灭火器',
    icon: 'fire-o',
    count: 25,
    unit: '个'
  },
  {
    id: '2',
    name: '应急灯',
    icon: 'bulb-o',
    count: 15,
    unit: '个'
  },
  {
    id: '3',
    name: '急救箱',
    icon: 'first-aid-o',
    count: 8,
    unit: '个'
  },
  {
    id: '4',
    name: '帐篷',
    icon: 'home-o',
    count: 5,
    unit: '顶'
  }
])

// 应急表单
const emergencyForm = reactive({
  title: '',
  description: '',
  level: 'medium',
  type: 'accident',
  location: '',
  affectedPeople: ''
})

// 选择器选项
const levelColumns = [
  { text: '一般', value: 'low' },
  { text: '较重', value: 'medium' },
  { text: '严重', value: 'high' },
  { text: '特别严重', value: 'critical' }
]

const typeColumns = [
  { text: '事故灾难', value: 'accident' },
  { text: '自然灾害', value: 'natural' },
  { text: '公共卫生', value: 'health' },
  { text: '社会安全', value: 'security' },
  { text: '其他', value: 'other' }
]

// 方法
const getLevelText = (value) => {
  const level = levelColumns.find(item => item.value === value)
  return level ? level.text : '较重'
}

const getTypeText = (value) => {
  const type = typeColumns.find(item => item.value === value)
  return type ? type.text : '事故灾难'
}

const getPlanStatusType = (status) => {
  const typeMap = {
    'active': 'success',
    'draft': 'warning',
    'archived': 'default'
  }
  return typeMap[status] || 'default'
}

const getPlanStatusText = (status) => {
  const textMap = {
    'active': '已启用',
    'draft': '草稿',
    'archived': '已归档'
  }
  return textMap[status] || status
}

const getRecordIcon = (type) => {
  const iconMap = {
    'fire': 'fire-o',
    'flood': 'warning-o',
    'earthquake': 'shop-o',
    'epidemic': 'shield-o',
    'accident': 'warning-o'
  }
  return iconMap[type] || 'warning-o'
}

const getRecordStatusType = (status) => {
  const typeMap = {
    'handling': 'primary',
    'resolved': 'success',
    'escalated': 'danger',
    'closed': 'default'
  }
  return typeMap[status] || 'default'
}

const getRecordStatusText = (status) => {
  const textMap = {
    'handling': '处理中',
    'resolved': '已解决',
    'escalated': '已上报',
    'closed': '已关闭'
  }
  return textMap[status] || status
}

const formatRecordLabel = (record) => {
  const labels = []
  if (record.createTime) {
    labels.push(`时间: ${formatDate(record.createTime)}`)
  }
  if (record.location) {
    labels.push(`地点: ${record.location}`)
  }
  if (record.handler) {
    labels.push(`处理人: ${record.handler}`)
  }
  return labels.join(' • ')
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString()
}

const makeEmergencyCall = async (contact) => {
  try {
    await showConfirmDialog({
      title: '紧急呼叫',
      message: `确认要呼叫${contact.name}(${contact.phone})吗？`,
    })

    showToast(`正在呼叫: ${contact.phone}`)
    // 实际应用中可以调用电话API
    // window.location.href = `tel:${contact.phone}`
  } catch (error) {
    // 用户取消
  }
}

const handleEmergency = async () => {
  try {
    showToast('正在启动应急响应...')

    const response = await villageApi.handleEmergency(activeEmergency.value.id)

    if (response.data.success) {
      showToast('应急响应已启动')
      activeEmergency.value = null
    }
  } catch (error) {
    console.error('处理应急事件失败:', error)
    showToast('处理失败')
  }
}

const viewEmergencyDetail = () => {
  router.push(`/village/emergency/${activeEmergency.value.id}`)
}

const dismissEmergency = () => {
  activeEmergency.value = null
}

const viewPlan = (plan) => {
  router.push(`/village/emergency/plan/${plan.id}`)
}

const viewResource = (resource) => {
  router.push(`/village/emergency/resource/${resource.id}`)
}

const viewRecord = (record) => {
  router.push(`/village/emergency/record/${record.id}`)
}

const startDrill = async (type) => {
  showDrillOptions.value = false

  try {
    await showConfirmDialog({
      title: '应急演练',
      message: `确认要启动${getDrillName(type)}演练吗？`,
    })

    showToast(`正在启动${getDrillName(type)}演练...`)

    const response = await villageApi.startEmergencyDrill(type)

    if (response.data.success) {
      showToast('演练已启动')
    }
  } catch (error) {
    if (error.name !== 'cancel') {
      console.error('启动演练失败:', error)
      showToast('启动失败')
    }
  }
}

const getDrillName = (type) => {
  const nameMap = {
    'fire': '消防',
    'flood': '防汛',
    'earthquake': '地震',
    'epidemic': '疫情'
  }
  return nameMap[type] || '应急'
}

const publishEmergency = async () => {
  try {
    // 验证表单
    if (!emergencyForm.title.trim()) {
      showToast('请输入事件标题')
      return
    }

    if (!emergencyForm.description.trim()) {
      showToast('请输入事件描述')
      return
    }

    publishing.value = true

    const response = await villageApi.publishEmergency(emergencyForm)

    if (response.data.success) {
      showToast('紧急警报已发布')
      showEmergencyCreator.value = false

      // 重置表单
      Object.assign(emergencyForm, {
        title: '',
        description: '',
        level: 'medium',
        type: 'accident',
        location: '',
        affectedPeople: ''
      })

      // 刷新记录
      loadEmergencyRecords(true)
    }
  } catch (error) {
    console.error('发布紧急警报失败:', error)
    showToast('发布失败')
  } finally {
    publishing.value = false
  }
}

const onLevelConfirm = ({ selectedOptions }) => {
  emergencyForm.level = selectedOptions[0].value
  showLevelPicker.value = false
}

const onTypeConfirm = ({ selectedOptions }) => {
  emergencyForm.type = selectedOptions[0].value
  showTypePicker.value = false
}

const onLoad = () => {
  loadEmergencyRecords()
}

const loadEmergencyRecords = async (reset = false) => {
  if (reset) {
    pagination.page = 1
    emergencyRecords.value = []
    finished.value = false
  }

  loading.value = true
  try {
    const response = await villageApi.getEmergencyRecords({
      page: pagination.page,
      limit: pagination.limit
    })

    const newRecords = response.data.data.docs || []

    if (reset) {
      emergencyRecords.value = newRecords
    } else {
      emergencyRecords.value.push(...newRecords)
    }

    pagination.total = response.data.data.total || 0
    pagination.page += 1

    finished.value = emergencyRecords.value.length >= pagination.total
  } catch (error) {
    console.error('加载应急记录失败:', error)
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

const loadActiveEmergency = async () => {
  try {
    const response = await villageApi.getActiveEmergency()
    if (response.data.success && response.data.data) {
      activeEmergency.value = response.data.data
    }
  } catch (error) {
    console.error('加载活跃应急事件失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadActiveEmergency()
  loadEmergencyRecords(true)
})
</script>

<style scoped>
.emergency-management {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.emergency-alert {
  background: #fff2f0;
  border-bottom: 1px solid #ffccc7;
}

.emergency-content {
  padding: 16px;
}

.emergency-content h4 {
  margin: 0 0 8px 0;
  color: #cf1322;
  font-size: 16px;
}

.emergency-content p {
  margin: 0 0 12px 0;
  color: #8c1f2e;
  font-size: 14px;
}

.emergency-actions {
  display: flex;
  gap: 8px;
}

.quick-call,
.emergency-plans,
.emergency-resources,
.emergency-records {
  margin-bottom: 16px;
}

.contact-card,
.resource-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 8px;
  height: 100px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.contact-card:active,
.resource-card:active {
  transform: scale(0.95);
}

.contact-icon,
.resource-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  background-color: #f0f0f0;
}

.contact-name,
.resource-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.contact-phone,
.resource-count {
  font-size: 12px;
  color: #666;
}

.drill-options {
  padding: 16px;
}

.drill-options h3 {
  text-align: center;
  margin: 0 0 16px 0;
  font-size: 16px;
}

.emergency-creator {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.creator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.creator-header h3 {
  margin: 0;
  font-size: 16px;
}

.creator-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.creator-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #eee;
}

.creator-actions .van-button {
  flex: 1;
}
</style>