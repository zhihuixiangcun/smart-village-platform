<template>
  <div class="emergency-mobile">
    <!-- 应急状态栏 -->
    <div class="emergency-status" :class="{ 'emergency-active': emergencyActive }">
      <div class="status-content">
        <div class="status-icon" :class="emergencyLevel">
          <el-icon>
            <component :is="getStatusIcon" />
          </el-icon>
        </div>
        <div class="status-info">
          <h3>{{ emergencyTitle }}</h3>
          <p>{{ emergencyDesc }}</p>
        </div>
        <div class="status-actions">
          <el-button
            v-if="!emergencyActive"
            type="danger"
            size="large"
            @click="triggerEmergency"
            :loading="triggering"
          >
            <el-icon><Warning /></el-icon>
            紧急呼叫
          </el-button>
          <el-button
            v-else
            type="primary"
            size="large"
            @click="cancelEmergency"
          >
            <el-icon><Close /></el-icon>
            取消警报
          </el-button>
        </div>
      </div>
    </div>

    <!-- 快速呼叫网格 -->
    <div class="quick-call-grid">
      <div class="grid-header">
        <h3>快速呼叫</h3>
        <el-button type="text" @click="showEditContacts = true">
          <el-icon><Edit /></el-icon>
          编辑
        </el-button>
      </div>
      <div class="call-buttons">
        <div
          v-for="contact in quickContacts"
          :key="contact.id"
          class="call-button"
          @click="makeCall(contact)"
        >
          <div class="button-icon" :class="contact.type">
            <el-icon>
              <component :is="contact.icon" />
            </el-icon>
          </div>
          <span class="button-label">{{ contact.name }}</span>
          <span class="button-phone">{{ maskPhone(contact.phone) }}</span>
        </div>
      </div>
    </div>

    <!-- 应急事件列表 -->
    <div class="emergency-list">
      <div class="list-header">
        <h3>应急事件</h3>
        <el-button type="text" @click="showCreateIncident = true">
          <el-icon><Plus /></el-icon>
          上报
        </el-button>
      </div>

      <div class="incident-filters">
        <van-tabs v-model:active="incidentFilter" sticky shrink>
          <van-tab title="全部" name="all" />
          <van-tab title="进行中" name="active" />
          <van-tab title="已处理" name="resolved" />
          <van-tab title="我上报的" name="my" />
        </van-tabs>
      </div>

      <div class="incident-list">
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <van-list
            v-model:loading="loading"
            :finished="finished"
            finished-text="没有更多了"
            @load="loadIncidents"
          >
            <div
              v-for="incident in incidents"
              :key="incident.id"
              class="incident-card"
              @click="viewIncident(incident)"
            >
              <!-- 紧急程度标记 -->
              <div class="incident-priority" :class="incident.priority">
                <el-icon><Warning /></el-icon>
              </div>

              <!-- 事件信息 -->
              <div class="incident-info">
                <div class="incident-header">
                  <h4 class="incident-title">{{ incident.title }}</h4>
                  <el-tag :type="getStatusType(incident.status)" size="small">
                    {{ getStatusText(incident.status) }}
                  </el-tag>
                </div>

                <p class="incident-desc">{{ incident.description }}</p>

                <div class="incident-location" v-if="incident.location">
                  <el-icon><Location /></el-icon>
                  <span>{{ incident.location }}</span>
                </div>

                <div class="incident-meta">
                  <span class="time">{{ formatTime(incident.createTime) }}</span>
                  <span class="reporter">{{ incident.reporter }}</span>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="incident-actions">
                <el-button
                  v-if="incident.status === 'pending'"
                  type="primary"
                  size="small"
                  @click.stop="handleIncident(incident)"
                >
                  处理
                </el-button>
                <el-button
                  type="text"
                  size="small"
                  @click.stop="trackIncident(incident)"
                >
                  追踪
                </el-button>
              </div>
            </div>
          </van-list>
        </van-pull-refresh>
      </div>
    </div>

    <!-- 应急预案 -->
    <div class="emergency-plans">
      <div class="plans-header">
        <h3>应急预案</h3>
        <el-button type="text" @click="viewAllPlans">
          查看全部
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>

      <div class="plan-cards">
        <div
          v-for="plan in emergencyPlans"
          :key="plan.id"
          class="plan-card"
          @click="activatePlan(plan)"
        >
          <div class="plan-icon" :class="plan.type">
            <el-icon>
              <component :is="plan.icon" />
            </el-icon>
          </div>
          <div class="plan-info">
            <h4>{{ plan.name }}</h4>
            <p>{{ plan.description }}</p>
          </div>
          <div class="plan-action">
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 紧急按钮（悬浮） -->
    <div class="emergency-fab">
      <el-button
        type="danger"
        :icon="emergencyActive ? 'Close' : 'SOS'"
        circle
        size="large"
        @click="triggerEmergency"
        :class="{ 'active': emergencyActive }"
      />
    </div>

    <!-- 编辑联系人弹窗 -->
    <van-popup v-model:show="showEditContacts" position="bottom" :style="{ height: '80%' }">
      <div class="edit-contacts-popup">
        <div class="popup-header">
          <h3>编辑紧急联系人</h3>
          <el-button type="text" @click="showEditContacts = false">完成</el-button>
        </div>
        <div class="popup-content">
          <EmergencyContacts @save="handleContactsSave" />
        </div>
      </div>
    </van-popup>

    <!-- 创建事件弹窗 -->
    <van-popup v-model:show="showCreateIncident" position="bottom" :style="{ height: '90%' }">
      <div class="create-incident-popup">
        <div class="popup-header">
          <h3>上报应急事件</h3>
          <el-button type="text" @click="showCreateIncident = false">取消</el-button>
        </div>
        <div class="popup-content">
          <CreateIncidentForm @success="handleIncidentCreated" @cancel="showCreateIncident = false" />
        </div>
      </div>
    </van-popup>

    <!-- 事件追踪弹窗 -->
    <van-popup v-model:show="showTracking" position="bottom" :style="{ height: '70%' }">
      <div class="tracking-popup">
        <div class="popup-header">
          <h3>事件追踪</h3>
          <el-button type="text" @click="showTracking = false">关闭</el-button>
        </div>
        <div class="popup-content">
          <IncidentTracking :incident="trackingIncident" />
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Warning, Close, Edit, Plus, ArrowRight, Location, SOS,
  Phone, FirstAidKit, Lock, Van, Bell
} from '@element-plus/icons-vue'
import { VanTabs, VanTab, VanList, VanPullRefresh, VanPopup } from 'vant'
import EmergencyContacts from './EmergencyContacts.vue'
import CreateIncidentForm from './CreateIncidentForm.vue'
import IncidentTracking from './IncidentTracking.vue'

// 路由
const router = useRouter()

// 响应式数据
const emergencyActive = ref(false)
const emergencyLevel = ref('normal')
const triggering = ref(false)
const incidentFilter = ref('all')
const refreshing = ref(false)
const loading = ref(false)
const finished = ref(false)
const showEditContacts = ref(false)
const showCreateIncident = ref(false)
const showTracking = ref(false)
const trackingIncident = ref(null)

// 应急状态
const emergencyTitle = computed(() => {
  if (emergencyActive.value) {
    return '紧急状态已激活'
  }
  return '系统正常'
})

const emergencyDesc = computed(() => {
  if (emergencyActive.value) {
    return '所有应急响应人员已收到通知'
  }
  return '未检测到紧急事件'
})

const getStatusIcon = computed(() => {
  return emergencyActive.value ? 'Warning' : 'CircleCheck'
})

// 快速联系人
const quickContacts = ref([
  { id: 1, name: '村委书记', phone: '13800138000', type: 'leader', icon: 'User' },
  { id: 2, name: '村长', phone: '13800138001', type: 'leader', icon: 'User' },
  { id: 3, name: '卫生所', phone: '13800138002', type: 'medical', icon: 'FirstAidKit' },
  { id: 4, name: '派出所', phone: '110', type: 'police', icon: 'Lock' },
  { id: 5, name: '消防队', phone: '119', type: 'fire', icon: 'Bell' },
  { id: 6, name: '救护车', phone: '120', type: 'medical', icon: 'FirstAidKit' }
])

// 事件列表
const incidents = ref([])

// 应急预案
const emergencyPlans = ref([
  {
    id: 1,
    name: '防汛预案',
    description: '暴雨洪水应急响应流程',
    type: 'flood',
    icon: 'Umbrella'
  },
  {
    id: 2,
    name: '火灾预案',
    description: '火灾事故应急处理方案',
    type: 'fire',
    icon: 'FireExtinguisher'
  },
  {
    id: 3,
    name: '疫情预案',
    description: '疫情防控应急响应措施',
    type: 'epidemic',
    icon: 'FirstAidKit'
  },
  {
    id: 4,
    name: '地震预案',
    description: '地震灾害应急疏散方案',
    type: 'earthquake',
    icon: 'Location'
  }
])

// 方法
const triggerEmergency = async () => {
  if (emergencyActive.value) {
    await cancelEmergency()
    return
  }

  try {
    await ElMessageBox.confirm(
      '确定要触发紧急呼叫吗？所有应急人员将收到通知。',
      '紧急呼叫确认',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    )

    triggering.value = true

    // 触发震动和声音
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }

    // 播放警报音
    playAlarmSound()

    // 发送紧急通知
    await sendEmergencyAlert()

    emergencyActive.value = true
    emergencyLevel.value = 'critical'

    ElMessage.success('紧急呼叫已发送！')
  } catch {
    // 用户取消
  } finally {
    triggering.value = false
  }
}

const cancelEmergency = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要取消紧急状态吗？',
      '取消确认',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      }
    )

    // 停止警报
    stopAlarmSound()

    // 发送取消通知
    await sendCancelAlert()

    emergencyActive.value = false
    emergencyLevel.value = 'normal'

    ElMessage.info('紧急状态已取消')
  } catch {
    // 用户取消
  }
}

const makeCall = (contact) => {
  if (contact.phone === '110' || contact.phone === '119' || contact.phone === '120') {
    ElMessageBox.confirm(
      `确定要拨打 ${contact.name} (${contact.phone}) 吗？`,
      '拨打电话',
      {
        type: 'warning',
        confirmButtonText: '拨打',
        cancelButtonText: '取消'
      }
    ).then(() => {
      window.location.href = `tel:${contact.phone}`
    })
  } else {
    window.location.href = `tel:${contact.phone}`
  }
}

const maskPhone = (phone) => {
  if (!phone || phone.length < 7) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const onRefresh = async () => {
  refreshing.value = true
  incidents.value = []
  await loadIncidents()
  refreshing.value = false
}

const loadIncidents = async () => {
  if (loading.value || finished.value) return

  loading.value = true

  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    const newIncidents = generateMockIncidents()

    if (newIncidents.length < 10) {
      finished.value = true
    }

    incidents.value.push(...newIncidents)
  } catch (error) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const generateMockIncidents = () => {
  const mockIncidents = [
    {
      id: Date.now() + 1,
      title: '村民家中发生火灾',
      description: '幸福路3号村民家中发生火灾，需要紧急救援',
      location: '幸福路3号',
      status: 'active',
      priority: 'high',
      reporter: '张三',
      createTime: new Date()
    },
    {
      id: Date.now() + 2,
      title: '老人突发疾病',
      description: '独居老人突发心脏病，需要医疗救助',
      location: '和谐小区5栋',
      status: 'resolved',
      priority: 'critical',
      reporter: '李四',
      createTime: new Date(Date.now() - 3600000)
    },
    {
      id: Date.now() + 3,
      title: '暴雨导致道路积水',
      description: '村口道路严重积水，影响通行',
      location: '村口主干道',
      status: 'pending',
      priority: 'medium',
      reporter: '王五',
      createTime: new Date(Date.now() - 7200000)
    }
  ]

  // 根据筛选条件过滤
  let filtered = mockIncidents

  if (incidentFilter.value === 'active') {
    filtered = mockIncidents.filter(i => i.status === 'active')
  } else if (incidentFilter.value === 'resolved') {
    filtered = mockIncidents.filter(i => i.status === 'resolved')
  } else if (incidentFilter.value === 'my') {
    filtered = mockIncidents.filter(i => i.reporter === '当前用户')
  }

  return filtered
}

const getStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    active: 'danger',
    resolved: 'success'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    pending: '待处理',
    active: '进行中',
    resolved: '已处理'
  }
  return textMap[status] || '未知'
}

const formatTime = (time) => {
  const now = new Date()
  const diff = now - time
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return time.toLocaleDateString()
}

const viewIncident = (incident) => {
  router.push(`/emergency/incident/${incident.id}`)
}

const handleIncident = (incident) => {
  router.push(`/emergency/handle/${incident.id}`)
}

const trackIncident = (incident) => {
  trackingIncident.value = incident
  showTracking.value = true
}

const activatePlan = (plan) => {
  ElMessageBox.confirm(
    `确定要激活"${plan.name}"吗？`,
    '激活预案',
    {
      type: 'warning',
      confirmButtonText: '激活',
      cancelButtonText: '取消'
    }
  ).then(() => {
    // 激活预案
    ElMessage.success(`已激活${plan.name}`)
  })
}

const viewAllPlans = () => {
  router.push('/emergency/plans')
}

const handleContactsSave = () => {
  showEditContacts.value = false
  ElMessage.success('联系人已更新')
}

const handleIncidentCreated = () => {
  showCreateIncident.value = false
  onRefresh()
  ElMessage.success('事件上报成功')
}

// 音频控制
let alarmAudio = null

const playAlarmSound = () => {
  // 创建音频上下文
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.value = 800
  oscillator.type = 'sine'
  gainNode.gain.value = 0.3

  oscillator.start()
  oscillator.stop(audioContext.currentTime + 0.5)

  // 循环播放
  alarmAudio = setInterval(() => {
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()

    osc.connect(gain)
    gain.connect(audioContext.destination)

    osc.frequency.value = 800
    osc.type = 'sine'
    gain.gain.value = 0.3

    osc.start()
    osc.stop(audioContext.currentTime + 0.5)
  }, 1000)
}

const stopAlarmSound = () => {
  if (alarmAudio) {
    clearInterval(alarmAudio)
    alarmAudio = null
  }
}

// API调用
const sendEmergencyAlert = async () => {
  // 模拟API调用
  await new Promise(resolve => setTimeout(resolve, 500))
}

const sendCancelAlert = async () => {
  // 模拟API调用
  await new Promise(resolve => setTimeout(resolve, 500))
}

// 生命周期
onMounted(() => {
  loadIncidents()
})

onUnmounted(() => {
  stopAlarmSound()
})
</script>

<style lang="scss" scoped>
.emergency-mobile {
  background: #f5f5f5;
  min-height: 100vh;

  // 应急状态栏
  .emergency-status {
    background: white;
    padding: 16px;
    margin-bottom: 12px;
    border-left: 4px solid #67c23a;

    &.emergency-active {
      border-left-color: #f56c6c;
      background: #fef0f0;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .status-content {
      display: flex;
      align-items: center;
      gap: 16px;

      .status-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;

        .el-icon {
          font-size: 24px;
          color: white;
        }

        &.normal {
          background: #67c23a;
        }

        &.warning {
          background: #e6a23c;
        }

        &.critical {
          background: #f56c6c;
          animation: blink 1s ease-in-out infinite;
        }
      }

      .status-info {
        flex: 1;

        h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
        }

        p {
          margin: 0;
          font-size: 14px;
          color: #666;
        }
      }

      .status-actions {
        .el-button {
          height: 44px;
          padding: 0 20px;
        }
      }
    }
  }

  // 快速呼叫
  .quick-call-grid {
    background: white;
    padding: 16px;
    margin-bottom: 12px;

    .grid-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h3 {
        margin: 0;
        font-size: 16px;
      }
    }

    .call-buttons {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;

      .call-button {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px 8px;
        border-radius: 8px;
        background: #f8f9fa;
        cursor: pointer;
        transition: all 0.3s;

        &:active {
          transform: scale(0.95);
          background: #e9ecef;
        }

        .button-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;

          .el-icon {
            font-size: 24px;
            color: white;
          }

          &.leader {
            background: linear-gradient(135deg, #409eff, #66b1ff);
          }

          &.medical {
            background: linear-gradient(135deg, #67c23a, #85ce61);
          }

          &.police {
            background: linear-gradient(135deg, #909399, #b1b3b8);
          }

          &.fire {
            background: linear-gradient(135deg, #f56c6c, #f78989);
          }
        }

        .button-label {
          font-size: 14px;
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
        }

        .button-phone {
          font-size: 12px;
          color: #666;
        }
      }
    }
  }

  // 事件列表
  .emergency-list {
    background: white;
    margin-bottom: 12px;

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;

      h3 {
        margin: 0;
        font-size: 16px;
      }
    }

    .incident-filters {
      :deep(.van-tabs__wrap) {
        height: 44px;
      }
    }

    .incident-list {
      .incident-card {
        position: relative;
        padding: 16px;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        align-items: flex-start;
        gap: 12px;

        &:active {
          background: #f5f5f5;
        }

        .incident-priority {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          .el-icon {
            font-size: 14px;
            color: white;
          }

          &.high {
            background: #f56c6c;
          }

          &.medium {
            background: #e6a23c;
          }

          &.low {
            background: #409eff;
          }

          &.critical {
            background: #f56c6c;
            animation: blink 1s ease-in-out infinite;
          }
        }

        .incident-info {
          flex: 1;
          min-width: 0;

          .incident-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;

            .incident-title {
              margin: 0;
              font-size: 15px;
              font-weight: 500;
              color: #333;
            }
          }

          .incident-desc {
            font-size: 14px;
            color: #666;
            line-height: 1.4;
            margin: 0 0 8px 0;
          }

          .incident-location {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 13px;
            color: #666;
            margin-bottom: 8px;

            .el-icon {
              font-size: 14px;
            }
          }

          .incident-meta {
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: #999;
          }
        }

        .incident-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-shrink: 0;
        }
      }
    }
  }

  // 应急预案
  .emergency-plans {
    background: white;
    padding: 16px;

    .plans-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h3 {
        margin: 0;
        font-size: 16px;
      }

      .el-button {
        color: #409eff;
      }
    }

    .plan-cards {
      .plan-card {
        display: flex;
        align-items: center;
        padding: 12px;
        border-radius: 8px;
        background: #f8f9fa;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.3s;

        &:active {
          transform: scale(0.98);
          background: #e9ecef;
        }

        .plan-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;

          .el-icon {
            font-size: 20px;
            color: white;
          }

          &.flood {
            background: linear-gradient(135deg, #409eff, #66b1ff);
          }

          &.fire {
            background: linear-gradient(135deg, #f56c6c, #f78989);
          }

          &.epidemic {
            background: linear-gradient(135deg, #67c23a, #85ce61);
          }

          &.earthquake {
            background: linear-gradient(135deg, #e6a23c, #ebb563);
          }
        }

        .plan-info {
          flex: 1;

          h4 {
            margin: 0 0 4px 0;
            font-size: 14px;
            font-weight: 500;
            color: #333;
          }

          p {
            margin: 0;
            font-size: 12px;
            color: #666;
          }
        }

        .plan-action {
          color: #c0c4cc;
        }
      }
    }
  }

  // 紧急按钮
  .emergency-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 1000;

    .el-button {
      width: 64px;
      height: 64px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

      &.active {
        background: #909399;
        animation: pulse 1.5s ease-in-out infinite;
      }
    }
  }

  // 弹窗样式
  .edit-contacts-popup,
  .create-incident-popup,
  .tracking-popup {
    height: 100%;
    display: flex;
    flex-direction: column;

    .popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #f0f0f0;

      h3 {
        margin: 0;
        font-size: 16px;
      }
    }

    .popup-content {
      flex: 1;
      overflow-y: auto;
    }
  }
}

// 动画
@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0.5;
  }
}

// Vant组件覆盖
:deep(.van-tabs__line) {
  background-color: #409eff;
}

:deep(.van-pull-refresh__track) {
  min-height: auto;
}
</style>