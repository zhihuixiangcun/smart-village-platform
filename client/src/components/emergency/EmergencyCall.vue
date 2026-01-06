<template>
  <div class="emergency-call">
    <!-- 紧急呼叫按钮 -->
    <div class="call-button-container" :class="{ 'emergency-active': isActive }">
      <el-button
        type="danger"
        size="large"
        :icon="Bell"
        class="emergency-btn"
        @click="handleEmergencyCall"
        :loading="calling"
        :disabled="calling">
        <span class="btn-text">一键应急呼叫</span>
      </el-button>
    </div>

    <!-- 快速类型选择 -->
    <div class="quick-types" v-if="!calling && !isActive">
      <div class="type-grid">
        <div v-for="type in emergencyTypes"
             :key="type.value"
             class="type-item"
             @click="handleQuickCall(type.value)">
          <div class="type-icon" :style="{ backgroundColor: type.color }">
            <el-icon size="24">
              <component :is="type.icon" />
            </el-icon>
          </div>
          <span class="type-name">{{ type.name }}</span>
        </div>
      </div>
    </div>

    <!-- 应急呼叫表单 -->
    <el-dialog
      v-model="callDialogVisible"
      title="应急呼叫"
      width="600px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      class="emergency-dialog">
      <template #header>
        <div class="dialog-header">
          <el-icon class="header-icon" color="#f56c6c"><Warning /></el-icon>
          <span>应急呼叫</span>
        </div>
      </template>

      <el-form
        ref="emergencyForm"
        :model="emergencyData"
        :rules="formRules"
        label-width="100px"
        class="emergency-form">
        <!-- 事件类型 -->
        <el-form-item label="事件类型" prop="type">
          <el-select
            v-model="emergencyData.type"
            placeholder="请选择事件类型"
            style="width: 100%"
            @change="handleTypeChange">
            <el-option
              v-for="type in emergencyTypes"
              :key="type.value"
              :label="type.name"
              :value="type.value">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="type-option-icon" :style="{ backgroundColor: type.color }">
                  <el-icon size="16">
                    <component :is="type.icon" />
                  </el-icon>
                </div>
                <span>{{ type.name }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <!-- 紧急程度 -->
        <el-form-item label="紧急程度" prop="urgency">
          <el-radio-group v-model="emergencyData.urgency">
            <el-radio-button label="low">一般</el-radio-button>
            <el-radio-button label="medium">紧急</el-radio-button>
            <el-radio-button label="high">非常紧急</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- 事件描述 -->
        <el-form-item label="事件描述" prop="description">
          <el-input
            v-model="emergencyData.description"
            type="textarea"
            :rows="4"
            placeholder="请详细描述发生的事件..."
            maxlength="500"
            show-word-limit />
        </el-form-item>

        <!-- 伤亡情况 -->
        <el-form-item label="伤亡情况" v-if="showCasualties">
          <el-input-number
            v-model="emergencyData.casualties"
            :min="0"
            :max="999"
            placeholder="伤亡人数"
            style="width: 150px;" />
          <span class="form-tip">如无伤亡请填写0</span>
        </el-form-item>

        <!-- 是否涉及特殊人群 -->
        <el-form-item label="特殊人群">
          <el-checkbox-group v-model="emergencyData.vulnerableGroups">
            <el-checkbox label="elderly">老人</el-checkbox>
            <el-checkbox label="children">儿童</el-checkbox>
            <el-checkbox label="disabled">残疾人</el-checkbox>
            <el-checkbox label="pregnant">孕妇</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <!-- 报警人信息 -->
        <el-divider content-position="left">报警人信息</el-divider>

        <el-form-item label="姓名" prop="reporterName">
          <el-input
            v-model="emergencyData.reporterName"
            placeholder="请输入您的姓名"
            :readonly="userStore.isLoggedIn" />
        </el-form-item>

        <el-form-item label="联系电话" prop="reporterPhone">
          <el-input
            v-model="emergencyData.reporterPhone"
            placeholder="请输入联系电话"
            :readonly="userStore.isLoggedIn">
            <template #prefix>
              <el-icon><Phone /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="与当事人关系" v-if="showVictimRelation">
          <el-select
            v-model="emergencyData.relationship"
            placeholder="请选择关系"
            style="width: 100%">
            <el-option label="本人" value="self" />
            <el-option label="家人" value="family" />
            <el-option label="朋友" value="friend" />
            <el-option label="邻居" value="neighbor" />
            <el-option label="路人" value="passerby" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>

        <!-- 当事人信息 -->
        <el-divider content-position="left" v-if="showVictimInfo">当事人信息</el-divider>

        <el-form-item label="当事人姓名" v-if="showVictimInfo">
          <el-input
            v-model="emergencyData.victimName"
            placeholder="请输入当事人姓名" />
        </el-form-item>

        <el-form-item label="年龄" v-if="showVictimInfo">
          <el-input-number
            v-model="emergencyData.victimAge"
            :min="0"
            :max="150"
            placeholder="年龄"
            style="width: 150px;" />
        </el-form-item>

        <el-form-item label="性别" v-if="showVictimInfo">
          <el-radio-group v-model="emergencyData.victimGender">
            <el-radio label="male">男</el-radio>
            <el-radio label="female">女</el-radio>
            <el-radio label="other">其他</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="身体状况" v-if="showVictimInfo">
          <el-input
            v-model="emergencyData.victimCondition"
            type="textarea"
            :rows="2"
            placeholder="请描述当事人的身体状况..." />
        </el-form-item>

        <!-- 位置信息 -->
        <el-divider content-position="left">事发位置</el-divider>

        <el-form-item label="详细地址" prop="address">
          <el-input
            v-model="emergencyData.address"
            placeholder="请输入详细地址"
            readonly>
            <template #append>
              <el-button @click="handleLocationInput">
                <el-icon><Location /></el-icon>
                定位
              </el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="地图定位">
          <div class="location-map">
            <div v-if="locationLoading" class="location-loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>正在获取位置...</span>
            </div>
            <div v-else-if="currentLocation" class="location-info">
              <el-icon><Location /></el-icon>
              <span>已定位: {{ formatLocation(currentLocation) }}</span>
              <el-button type="text" @click="handleRelocate">重新定位</el-button>
            </div>
            <div v-else class="location-placeholder">
              <el-icon><LocationInformation /></el-icon>
              <span>未获取到位置信息</span>
              <el-button type="text" @click="handleGetLocation">获取位置</el-button>
            </div>
          </div>
        </el-form-item>

        <!-- 上传图片/视频 -->
        <el-form-item label="现场图片">
          <el-upload
            ref="mediaUpload"
            :action="uploadUrl"
            :headers="uploadHeaders"
            :on-success="handleMediaSuccess"
            :on-remove="handleMediaRemove"
            :on-error="handleMediaError"
            :file-list="mediaFiles"
            :limit="5"
            accept="image/*,video/*"
            list-type="picture-card"
            class="media-upload">
            <el-icon><Plus /></el-icon>
            <template #tip>
              <div class="upload-tip">
                支持上传图片和视频，最多5个文件，每个文件不超过10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCancel" :disabled="calling">
            取消
          </el-button>
          <el-button
            type="danger"
            @click="handleSubmit"
            :loading="calling"
            :disabled="!canSubmit">
            {{ calling ? '正在呼叫...' : '确认呼叫' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 位置选择弹窗 -->
    <LocationPickerDialog
      v-model="locationPickerVisible"
      :default-location="currentLocation"
      @selected="handleLocationSelected" />

    <!-- 呼叫成功弹窗 -->
    <EmergencyCallResultDialog
      v-model="resultDialogVisible"
      :call-result="callResult" />
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Bell, Warning, Phone, Location, LocationInformation, Loading,
  Plus, FirstAidKit, Flag, WarningFilled, Van, Tools  // Van 替代 Car, Flag 替代 Fire
} from '@element-plus/icons-vue'
import LocationPickerDialog from './LocationPickerDialog.vue'
import EmergencyCallResultDialog from './EmergencyCallResultDialog.vue'
import { useUserStore } from '@/stores/user'
import { emergencyApi } from '@/api/emergency'
import { geolocationService } from '@/utils/geolocation'

// Store
const userStore = useUserStore()

// Refs
const emergencyForm = ref(null)
const mediaUpload = ref(null)
const callDialogVisible = ref(false)
const locationPickerVisible = ref(false)
const resultDialogVisible = ref(false)
const calling = ref(false)
const isActive = ref(false)
const locationLoading = ref(false)

// Data
const currentLocation = ref(null)
const mediaFiles = ref([])
const callResult = ref(null)

const emergencyData = reactive({
  type: '',
  urgency: 'medium',
  description: '',
  casualties: 0,
  vulnerableGroups: [],
  reporterName: '',
  reporterPhone: '',
  relationship: 'self',
  victimName: '',
  victimAge: null,
  victimGender: 'male',
  victimCondition: '',
  address: '',
  coordinates: null
})

const emergencyTypes = [
  {
    name: '医疗急救',
    value: 'medical',
    icon: FirstAidKit,
    color: '#f56c6c'
  },
  {
    name: '火灾',
    value: 'fire',
    icon: Flag,  // 替代 Fire
    color: '#ff6b6b'
  },
  {
    name: '事故',
    value: 'accident',
    icon: Van,  // 替代 Car
    color: '#ffa940'
  },
  {
    name: '人员失踪',
    value: 'missing_person',
    icon: WarningFilled,
    color: '#722ed1'
  },
  {
    name: '公共安全',
    value: 'public_security',
    icon: Warning,
    color: '#13c2c2'
  },
  {
    name: '自然灾害',
    value: 'natural_disaster',
    icon: Tools,
    color: '#52c41a'
  }
]

// 表单验证规则
const formRules = {
  type: [
    { required: true, message: '请选择事件类型', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请描述事件情况', trigger: 'blur' },
    { min: 10, message: '描述至少需要10个字符', trigger: 'blur' }
  ],
  reporterName: [
    { required: true, message: '请输入报警人姓名', trigger: 'blur' }
  ],
  reporterPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  address: [
    { required: true, message: '请输入事发地址', trigger: 'blur' }
  ]
}

// Computed
const showCasualties = computed(() => {
  return ['medical', 'fire', 'accident', 'natural_disaster'].includes(emergencyData.type)
})

const showVictimRelation = computed(() => {
  return emergencyData.type !== 'missing_person' && emergencyData.victimName
})

const showVictimInfo = computed(() => {
  return emergencyData.type !== 'missing_person' && emergencyData.relationship !== 'self'
})

const uploadUrl = computed(() => {
  return '/api/v1/emergency/upload/media'
})

const uploadHeaders = computed(() => {
  return userStore.token ? {
    Authorization: `Bearer ${userStore.token}`
  } : {}
})

const canSubmit = computed(() => {
  return emergencyData.type &&
         emergencyData.description &&
         emergencyData.reporterName &&
         emergencyData.reporterPhone &&
         emergencyData.address
})

// Methods
const handleEmergencyCall = () => {
  // 初始化表单数据
  if (userStore.isLoggedIn) {
    emergencyData.reporterName = userStore.profile.displayName
    emergencyData.reporterPhone = userStore.phone
    emergencyData.relationship = 'self'
  }

  callDialogVisible.value = true
}

const handleQuickCall = (type) => {
  emergencyData.type = type
  handleEmergencyCall()
}

const handleTypeChange = (value) => {
  // 根据类型自动设置一些默认值
  if (value === 'medical') {
    emergencyData.urgency = 'high'
  } else if (value === 'fire') {
    emergencyData.urgency = 'high'
  }
}

const handleLocationInput = () => {
  locationPickerVisible.value = true
}

const handleGetLocation = async () => {
  locationLoading.value = true
  try {
    const position = await geolocationService.getCurrentPosition()
    currentLocation.value = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    }

    // 逆地理编码获取地址
    const address = await geolocationService.reverseGeocode(
      position.coords.latitude,
      position.coords.longitude
    )
    emergencyData.address = address
    emergencyData.coordinates = currentLocation.value

    ElMessage.success('定位成功')
  } catch (error) {
    ElMessage.error('获取位置失败: ' + error.message)
  } finally {
    locationLoading.value = false
  }
}

const handleRelocate = () => {
  handleGetLocation()
}

const handleLocationSelected = (location) => {
  currentLocation.value = location
  emergencyData.coordinates = location
  locationPickerVisible.value = false
}

const formatLocation = (location) => {
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
}

const handleMediaSuccess = (response, file) => {
  mediaFiles.value.push({
    name: file.name,
    url: response.url,
    type: file.type.startsWith('image/') ? 'image' : 'video'
  })
}

const handleMediaRemove = (file) => {
  const index = mediaFiles.value.findIndex(item => item.name === file.name)
  if (index > -1) {
    mediaFiles.value.splice(index, 1)
  }
}

const handleMediaError = (error) => {
  ElMessage.error('文件上传失败: ' + error.message)
}

const handleSubmit = async () => {
  try {
    // 表单验证
    const valid = await emergencyForm.value.validate()
    if (!valid) return

    calling.value = true
    isActive.value = true

    // 构建提交数据
    const submitData = {
      ...emergencyData,
      villageId: userStore.villageId,
      media: mediaFiles.value,
      coordinates: currentLocation.value
    }

    // 发起应急呼叫
    const response = await emergencyApi.oneClickCall(submitData)

    callResult.value = response.data
    callDialogVisible.value = false
    resultDialogVisible.value = true

    ElMessage.success('应急呼叫已受理，救援人员正在赶来')

  } catch (error) {
    ElMessage.error('应急呼叫失败: ' + error.message)
  } finally {
    calling.value = false
    isActive.value = false
  }
}

const handleCancel = () => {
  if (calling.value) {
    ElMessageBox.confirm('呼叫正在进行中，确定要取消吗？', '确认取消', {
      type: 'warning',
      confirmButtonText: '确定取消',
      cancelButtonText: '继续呼叫'
    }).then(() => {
      calling.value = false
      isActive.value = false
      callDialogVisible.value = false
    }).catch(() => {
      // 用户选择继续呼叫
    })
  } else {
    callDialogVisible.value = false
  }
}

const resetForm = () => {
  Object.assign(emergencyData, {
    type: '',
    urgency: 'medium',
    description: '',
    casualties: 0,
    vulnerableGroups: [],
    reporterName: '',
    reporterPhone: '',
    relationship: 'self',
    victimName: '',
    victimAge: null,
    victimGender: 'male',
    victimCondition: '',
    address: '',
    coordinates: null
  })

  currentLocation.value = null
  mediaFiles.value = []

  if (emergencyForm.value) {
    emergencyForm.value.resetFields()
  }
}

// Lifecycle
onMounted(() => {
  // 自动获取当前位置
  handleGetLocation()
})
</script>

<style scoped>
.emergency-call {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.call-button-container {
  text-align: center;
  margin-bottom: 30px;
  transition: all 0.3s ease;
}

.emergency-active {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.emergency-btn {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  font-size: 20px;
  font-weight: bold;
  box-shadow: 0 8px 25px rgba(245, 108, 108, 0.3);
  border: 4px solid #fff;
  background: linear-gradient(135deg, #ff6b6b 0%, #f56c6c 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.3s ease;
}

.emergency-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 12px 35px rgba(245, 108, 108, 0.4);
}

.emergency-btn .el-icon {
  font-size: 48px;
}

.btn-text {
  font-size: 18px;
  letter-spacing: 1px;
}

.quick-types {
  margin-top: 30px;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 20px;
}

.type-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e4e7ed;
  cursor: pointer;
  transition: all 0.3s ease;
}

.type-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #409eff;
}

.type-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.type-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.emergency-dialog {
  border-radius: 12px;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #f56c6c;
}

.header-icon {
  font-size: 24px;
}

.emergency-form {
  padding: 0 20px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 12px;
}

.location-map {
  width: 100%;
  padding: 12px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  background: #fafafa;
}

.location-loading,
.location-info,
.location-placeholder {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.location-info .el-button {
  margin-left: auto;
}

.media-upload {
  width: 100%;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  line-height: 1.4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
}

.type-option-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
</style>