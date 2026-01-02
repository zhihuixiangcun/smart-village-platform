<template>
  <div class="emergency-call-panel">
    <!-- 紧急呼叫按钮区域 -->
    <div class="emergency-button-area">
      <el-card class="emergency-card" shadow="hover">
        <div class="emergency-content">
          <div class="emergency-icon">
            <el-icon :size="60" color="#ff4757">
              <WarningFilled />
            </el-icon>
          </div>
          <h2 class="emergency-title">紧急呼叫</h2>
          <p class="emergency-desc">点击下方按钮或扫描二维码，立即呼叫值班人员</p>

          <!-- 一键呼叫按钮 -->
          <el-button
            type="danger"
            size="large"
            :loading="calling"
            @click="handleEmergencyCall"
            class="emergency-call-btn"
          >
            <el-icon><Phone /></el-icon>
            一键呼叫
          </el-button>

          <!-- 扫描二维码呼叫 -->
          <div class="qr-scan-area">
            <p class="scan-hint">或扫描现场二维码快速呼叫</p>
            <el-button
              type="primary"
              plain
              @click="showQRScanner = true"
            >
              <el-icon><Scan /></el-icon>
              扫描二维码
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 当前值班人员 -->
    <div class="on-duty-section" v-if="onDutyPersonnel.length > 0">
      <el-divider content-position="left">
        <span class="section-title">当前值班人员</span>
      </el-divider>
      <el-row :gutter="20">
        <el-col :span="8" v-for="personnel in onDutyPersonnel" :key="personnel._id">
          <el-card class="personnel-card" shadow="never">
            <div class="personnel-info">
              <el-avatar :size="50" :src="personnel.avatar">
                {{ personnel.name.charAt(0) }}
              </el-avatar>
              <div class="personnel-details">
                <h4>{{ personnel.name }}</h4>
                <p class="position">{{ personnel.position }}</p>
                <p class="phone">
                  <el-icon><Phone /></el-icon>
                  {{ maskPhone(personnel.phone) }}
                </p>
              </div>
            </div>
            <div class="personnel-status">
              <el-tag type="success" size="small">在岗</el-tag>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 位置信息 -->
    <div class="location-section">
      <el-divider content-position="left">
        <span class="section-title">当前位置</span>
      </el-divider>
      <el-card class="location-card" shadow="never">
        <div class="location-info">
          <el-icon class="location-icon"><Location /></el-icon>
          <div class="location-text">
            <p class="address">{{ currentLocation.address || '获取中...' }}</p>
            <p class="coordinates" v-if="currentLocation.lat">
              坐标：{{ currentLocation.lat }}, {{ currentLocation.lng }}
            </p>
          </div>
          <el-button
            type="primary"
            plain
            size="small"
            @click="refreshLocation"
            :loading="locationLoading"
          >
            刷新位置
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 最近呼叫记录 -->
    <div class="recent-calls-section">
      <el-divider content-position="left">
        <span class="section-title">最近呼叫记录</span>
      </el-divider>
      <el-timeline v-if="recentCalls.length > 0">
        <el-timeline-item
          v-for="call in recentCalls"
          :key="call._id"
          :timestamp="formatTime(call.createdAt)"
          :type="getCallStatusType(call.status)"
        >
          <div class="call-item">
            <h4>{{ getEmergencyTypeText(call.emergencyType) }}</h4>
            <p class="call-location">{{ call.location.address }}</p>
            <el-tag :type="getCallStatusTagType(call.status)" size="small">
              {{ getCallStatusText(call.status) }}
            </el-tag>
          </div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无呼叫记录" />
    </div>

    <!-- 紧急类型选择对话框 -->
    <el-dialog
      v-model="showEmergencyDialog"
      title="选择紧急类型"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="emergencyForm" label-width="80px">
        <el-form-item label="紧急类型" required>
          <el-select v-model="emergencyForm.emergencyType" placeholder="请选择" style="width: 100%">
            <el-option
              v-for="type in emergencyTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            >
              <span style="float: left">{{ type.label }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                {{ type.desc }}
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="详细描述">
          <el-input
            v-model="emergencyForm.description"
            type="textarea"
            :rows="4"
            placeholder="请描述紧急情况..."
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="上传图片">
          <el-upload
            v-model:file-list="emergencyForm.attachments"
            :action="uploadUrl"
            :headers="uploadHeaders"
            list-type="picture-card"
            :limit="3"
            :on-success="handleUploadSuccess"
            :before-upload="beforeUpload"
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="匿名呼叫">
          <el-switch v-model="emergencyForm.anonymous" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEmergencyDialog = false">取消</el-button>
        <el-button type="danger" @click="submitEmergencyCall" :loading="calling">
          确认呼叫
        </el-button>
      </template>
    </el-dialog>

    <!-- QR扫描对话框 -->
    <el-dialog
      v-model="showQRScanner"
      title="扫描二维码"
      width="90%"
      :close-on-click-modal="false"
      center
    >
      <div class="qr-scanner">
        <video ref="qrVideo" class="qr-video"></video>
        <canvas ref="qrCanvas" class="qr-canvas" style="display: none;"></canvas>
      </div>
      <template #footer>
        <el-button @click="closeQRScanner">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { useStore } from 'vuex'
import { ElMessage, ElMessageBox } from 'element-plus'
import { WarningFilled, Phone, Scan, Location, Plus } from '@element-plus/icons-vue'
import api from '@/api'
import socket from '@/utils/socket'

export default {
  name: 'EmergencyCallPanel',

  components: {
    WarningFilled,
    Phone,
    Scan,
    Location,
    Plus
  },

  setup() {
    const store = useStore()
    const qrVideo = ref(null)
    const qrCanvas = ref(null)

    // 响应式数据
    const calling = ref(false)
    const locationLoading = ref(false)
    const showEmergencyDialog = ref(false)
    const showQRScanner = ref(false)
    const onDutyPersonnel = ref([])
    const recentCalls = ref([])
    const currentLocation = reactive({
      lat: null,
      lng: null,
      address: ''
    })

    const emergencyForm = reactive({
      emergencyType: '',
      description: '',
      attachments: [],
      anonymous: false
    })

    // 紧急类型列表
    const emergencyTypes = [
      { value: 'fire', label: '火灾', desc: '火警' },
      { value: 'medical', label: '医疗急救', desc: '需要医疗救助' },
      { value: 'accident', label: '事故', desc: '交通事故等' },
      { value: 'security', label: '安全事件', desc: '治安问题' },
      { value: 'disaster', label: '自然灾害', desc: '地震、洪水等' },
      { value: 'other', label: '其他紧急情况', desc: '其他需要帮助的情况' }
    ]

    // 计算属性
    const uploadUrl = computed(() => {
      return `${process.env.VUE_APP_API_BASE_URL}/api/emergency/call`
    })

    const uploadHeaders = computed(() => {
      return {
        'Authorization': `Bearer ${store.state.user.token}`
      }
    })

    // 方法
    const handleEmergencyCall = () => {
      showEmergencyDialog.value = true
    }

    const submitEmergencyCall = async () => {
      if (!emergencyForm.emergencyType) {
        ElMessage.error('请选择紧急类型')
        return
      }

      try {
        calling.value = true

        const formData = new FormData()
        formData.append('villageId', store.state.user.villageId)
        formData.append('emergencyType', emergencyForm.emergencyType)
        formData.append('description', emergencyForm.description)
        formData.append('location', JSON.stringify(currentLocation))
        formData.append('anonymous', emergencyForm.anonymous)

        // 添加附件
        emergencyForm.attachments.forEach(file => {
          if (file.raw) {
            formData.append('attachments', file.raw)
          }
        })

        const response = await api.post('/emergency/call', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

        if (response.data.success) {
          ElMessage.success('紧急呼叫已发送，值班人员将立即响应！')
          showEmergencyDialog.value = false
          resetEmergencyForm()

          // 显示状态对话框
          showCallStatusDialog(response.data.data.callId)
        } else {
          ElMessage.error(response.data.message || '呼叫失败')
        }
      } catch (error) {
        console.error('Emergency call error:', error)
        ElMessage.error(error.response?.data?.message || '呼叫失败，请重试')
      } finally {
        calling.value = false
      }
    }

    const resetEmergencyForm = () => {
      emergencyForm.emergencyType = ''
      emergencyForm.description = ''
      emergencyForm.attachments = []
      emergencyForm.anonymous = false
    }

    const getCurrentLocation = () => {
      locationLoading.value = true

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            currentLocation.lat = position.coords.latitude
            currentLocation.lng = position.coords.longitude

            // 获取地址
            await getAddressFromCoords(
              currentLocation.lat,
              currentLocation.lng
            )

            locationLoading.value = false
          },
          (error) => {
            console.error('Get location error:', error)
            locationLoading.value = false
            ElMessage.warning('无法获取您的位置，请检查定位权限')
          }
        )
      } else {
        ElMessage.warning('您的浏览器不支持定位功能')
        locationLoading.value = false
      }
    }

    const getAddressFromCoords = async (lat, lng) => {
      try {
        // 使用高德地图API获取地址
        const key = process.env.VUE_APP_AMAP_KEY
        const response = await fetch(
          `https://restapi.amap.com/v3/geocode/regeo?key=${key}&location=${lng},${lat}&poitype=&radius=1000&extensions=all&batch=false&roadlevel=0`
        )

        const data = await response.json()
        if (data.status === '1' && data.regeocode) {
          currentLocation.address = data.regeocode.formatted_address
        }
      } catch (error) {
        console.error('Get address error:', error)
      }
    }

    const refreshLocation = () => {
      getCurrentLocation()
    }

    const loadOnDutyPersonnel = async () => {
      try {
        const response = await api.get('/emergency/on-duty')
        if (response.data.success) {
          onDutyPersonnel.value = response.data.data
        }
      } catch (error) {
        console.error('Load on-duty personnel error:', error)
      }
    }

    const loadRecentCalls = async () => {
      try {
        const response = await api.get('/emergency/calls', {
          params: {
            limit: 5
          }
        })
        if (response.data.success) {
          recentCalls.value = response.data.data.calls
        }
      } catch (error) {
        console.error('Load recent calls error:', error)
      }
    }

    const handleUploadSuccess = (response, file) => {
      console.log('Upload success:', response)
    }

    const beforeUpload = (file) => {
      const isValidType = ['image/jpeg', 'image/png', 'image/gif'].includes(file.type)
      const isLt5M = file.size / 1024 / 1024 < 5

      if (!isValidType) {
        ElMessage.error('只能上传图片文件！')
        return false
      }
      if (!isLt5M) {
        ElMessage.error('图片大小不能超过5MB！')
        return false
      }
      return true
    }

    // QR扫描相关
    const startQRScanner = () => {
      const video = qrVideo.value
      const canvas = qrCanvas.value
      const context = canvas.getContext('2d')

      // 获取摄像头权限
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          video.srcObject = stream
          video.play()

          // 开始扫描
          const scanQRCode = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
              canvas.height = video.videoHeight
              canvas.width = video.videoWidth
              context.drawImage(video, 0, 0, canvas.width, canvas.height)

              // TODO: 集成QR码解析库（如jsQR）
              // const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
              // const code = jsQR(imageData.data, imageData.width, imageData.height)

              // if (code) {
              //   handleQRCodeScanned(code.data)
              //   return
              // }
            }

            requestAnimationFrame(scanQRCode)
          }

          scanQRCode()
        })
        .catch(error => {
          console.error('QR scanner error:', error)
          ElMessage.error('无法访问摄像头')
        })
    }

    const handleQRCodeScanned = async (qrData) => {
      try {
        closeQRScanner()

        const response = await api.post('/emergency/qrcall', {
          qrData: JSON.parse(qrData),
          emergencyType: 'other',
          description: '通过QR码发起的紧急呼叫'
        })

        if (response.data.success) {
          ElMessage.success('通过QR码的紧急呼叫已发送！')
          showCallStatusDialog(response.data.data.callId)
        }
      } catch (error) {
        console.error('QR call error:', error)
        ElMessage.error('QR码呼叫失败')
      }
    }

    const closeQRScanner = () => {
      showQRScanner.value = false

      // 停止视频流
      const video = qrVideo.value
      if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop())
      }
    }

    const showCallStatusDialog = (callId) => {
      // TODO: 显示呼叫状态对话框
      console.log('Show call status dialog:', callId)
    }

    // 工具函数
    const maskPhone = (phone) => {
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    }

    const formatTime = (time) => {
      return new Date(time).toLocaleString()
    }

    const getEmergencyTypeText = (type) => {
      const typeMap = {
        fire: '火灾',
        medical: '医疗急救',
        accident: '事故',
        security: '安全事件',
        disaster: '自然灾害',
        other: '其他紧急情况'
      }
      return typeMap[type] || type
    }

    const getCallStatusText = (status) => {
      const statusMap = {
        active: '等待响应',
        responded: '已响应',
        processing: '处理中',
        resolved: '已解决',
        cancelled: '已取消',
        false_alarm: '误报'
      }
      return statusMap[status] || status
    }

    const getCallStatusTagType = (status) => {
      const typeMap = {
        active: 'warning',
        responded: 'primary',
        processing: '',
        resolved: 'success',
        cancelled: 'info',
        false_alarm: 'danger'
      }
      return typeMap[status] || 'info'
    }

    const getCallStatusType = (status) => {
      const typeMap = {
        active: 'warning',
        responded: 'primary',
        processing: '',
        resolved: 'success',
        cancelled: 'info',
        false_alarm: 'danger'
      }
      return typeMap[status] || 'info'
    }

    // Socket连接和事件监听
    const setupSocketListeners = () => {
      // 监听紧急通知
      socket.on('emergency_notification', (data) => {
        ElMessageBox.confirm(
          `紧急呼叫：${data.emergencyType} - ${data.location.address}`,
          '紧急通知',
          {
            confirmButtonText: '立即响应',
            cancelButtonText: '忽略',
            type: 'warning'
          }
        ).then(() => {
          // 响应紧急呼叫
          handleEmergencyResponse(data.callId)
        }).catch(() => {
          // 忽略
        })
      })

      // 监听呼叫状态更新
      socket.on('call_status_update', (data) => {
        if (data.status === 'responded') {
          ElMessage.success('值班人员已响应您的呼叫！')
        } else if (data.status === 'resolved') {
          ElMessage.success('紧急情况已处理完毕！')
        }
      })
    }

    const handleEmergencyResponse = async (callId) => {
      try {
        await api.put(`/emergency/call/${callId}/status`, {
          status: 'responded'
        })
        ElMessage.success('您已响应此紧急呼叫')
      } catch (error) {
        console.error('Emergency response error:', error)
      }
    }

    // 生命周期
    onMounted(() => {
      // 获取当前位置
      getCurrentLocation()

      // 加载值班人员信息
      loadOnDutyPersonnel()

      // 加载最近呼叫记录
      loadRecentCalls()

      // 设置Socket监听
      setupSocketListeners()

      // 监听QR扫描对话框显示
      watch(showQRScanner, (newVal) => {
        if (newVal) {
          nextTick(() => {
            startQRScanner()
          })
        }
      })
    })

    return {
      // Refs
      qrVideo,
      qrCanvas,

      // Reactive data
      calling,
      locationLoading,
      showEmergencyDialog,
      showQRScanner,
      onDutyPersonnel,
      recentCalls,
      currentLocation,
      emergencyForm,
      emergencyTypes,

      // Computed
      uploadUrl,
      uploadHeaders,

      // Methods
      handleEmergencyCall,
      submitEmergencyCall,
      resetEmergencyForm,
      refreshLocation,
      handleUploadSuccess,
      beforeUpload,
      closeQRScanner,

      // Utils
      maskPhone,
      formatTime,
      getEmergencyTypeText,
      getCallStatusText,
      getCallStatusTagType,
      getCallStatusType
    }
  }
}
</script>

<style scoped>
.emergency-call-panel {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.emergency-button-area {
  margin-bottom: 30px;
}

.emergency-card {
  text-align: center;
  padding: 40px;
}

.emergency-content {
  max-width: 600px;
  margin: 0 auto;
}

.emergency-icon {
  margin-bottom: 20px;
}

.emergency-title {
  font-size: 32px;
  color: #303133;
  margin-bottom: 10px;
}

.emergency-desc {
  font-size: 16px;
  color: #606266;
  margin-bottom: 30px;
}

.emergency-call-btn {
  font-size: 20px;
  padding: 15px 40px;
  margin-bottom: 20px;
}

.qr-scan-area {
  margin-top: 20px;
}

.scan-hint {
  color: #909399;
  margin-bottom: 10px;
}

.on-duty-section,
.location-section,
.recent-calls-section {
  margin-bottom: 30px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.personnel-card {
  margin-bottom: 20px;
  transition: transform 0.3s;
}

.personnel-card:hover {
  transform: translateY(-2px);
}

.personnel-info {
  display: flex;
  align-items: center;
}

.personnel-details {
  margin-left: 15px;
  flex: 1;
}

.personnel-details h4 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.position {
  color: #909399;
  font-size: 14px;
  margin: 5px 0;
}

.phone {
  color: #409EFF;
  font-size: 14px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 5px;
}

.personnel-status {
  margin-top: 15px;
}

.location-card {
  padding: 20px;
}

.location-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.location-icon {
  font-size: 24px;
  color: #409EFF;
}

.location-text {
  flex: 1;
}

.address {
  font-size: 16px;
  color: #303133;
  margin: 0 0 5px 0;
}

.coordinates {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.call-item {
  padding-bottom: 10px;
}

.call-item h4 {
  margin: 0 0 5px 0;
  font-size: 16px;
}

.call-location {
  color: #606266;
  font-size: 14px;
  margin: 0 0 10px 0;
}

.qr-scanner {
  text-align: center;
}

.qr-video {
  width: 100%;
  max-width: 500px;
  height: auto;
}

.qr-canvas {
  display: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .emergency-card {
    padding: 20px;
  }

  .emergency-title {
    font-size: 24px;
  }

  .emergency-call-btn {
    width: 100%;
  }

  .location-info {
    flex-direction: column;
    gap: 10px;
  }

  .location-text {
    width: 100%;
  }
}
</style>