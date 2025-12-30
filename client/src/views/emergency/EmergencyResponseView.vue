<template>
  <div class="emergency-response">
    <el-row :gutter="20">
      <!-- 左侧操作面板 -->
      <el-col :span="6">
        <el-card class="action-card">
          <template #header>
            <div class="card-header">
              <span>一键启动预案</span>
            </div>
          </template>

          <el-form :model="emergencyForm" label-width="80px">
            <el-form-item label="预案类型">
              <el-select v-model="emergencyForm.type" placeholder="选择预案类型" style="width: 100%">
                <el-option label="防汛预案" value="flood" />
                <el-option label="防火预案" value="fire" />
                <el-option label="地震预案" value="earthquake" />
                <el-option label="疫情防控" value="epidemic" />
                <el-option label="抗旱预案" value="drought" />
              </el-select>
            </el-form-item>

            <el-form-item label="严重程度">
              <el-radio-group v-model="emergencyForm.severity">
                <el-radio-button label="low">一般</el-radio-button>
                <el-radio-button label="medium">严重</el-radio-button>
                <el-radio-button label="high">紧急</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="事发地点">
              <el-input v-model="emergencyForm.location" placeholder="输入事发地点" />
            </el-form-item>

            <el-form-item label="情况描述">
              <el-input
                v-model="emergencyForm.description"
                type="textarea"
                :rows="3"
                placeholder="请描述应急情况"
              />
            </el-form-item>

            <el-button
              type="danger"
              size="large"
              style="width: 100%"
              @click="activateEmergencyPlan"
            >
              <el-icon><Warning /></el-icon>
              立即启动预案
            </el-button>
          </el-form>
        </el-card>

        <!-- 救援设备快速查询 -->
        <el-card class="equipment-card">
          <template #header>
            <div class="card-header">
              <span>救援设备查询</span>
            </div>
          </template>

          <el-form :model="equipmentQuery" label-width="60px">
            <el-form-item label="类型">
              <el-select v-model="equipmentQuery.type" placeholder="设备类型" style="width: 100%">
                <el-option label="水泵" value="pump" />
                <el-option label="灭火器" value="fire_extinguisher" />
                <el-option label="发电机" value="generator" />
                <el-option label="救生艇" value="rescue_boat" />
                <el-option label="医疗设备" value="medical" />
              </el-select>
            </el-form-item>

            <el-form-item label="位置">
              <el-input v-model="equipmentQuery.location" placeholder="输入位置关键词" />
            </el-form-item>

            <el-button type="primary" style="width: 100%" @click="searchEquipment">
              查询设备
            </el-button>
          </el-form>

          <!-- 设备列表 -->
          <div class="equipment-list">
            <el-tag
              v-for="item in equipmentList"
              :key="item._id"
              class="equipment-tag"
              :type="item.status === 'available' ? 'success' : 'info'"
              @click="showEquipmentLocation(item)"
            >
              {{ item.name }} ({{ item.quantity }})
            </el-tag>
          </div>
        </el-card>
      </el-col>

      <!-- 中间地图区域 -->
      <el-col :span="12">
        <el-card class="map-card">
          <template #header>
            <div class="card-header">
              <span>应急资源分布图</span>
            </div>
          </template>

          <div class="map-container">
            <el-amap
              :center="mapCenter"
              :zoom="mapZoom"
              view-mode="3D"
              :pitch="50"
            >
              <el-amap-marker
                v-for="equipment in equipmentList"
                :key="equipment._id"
                :position="[equipment.coordinates?.coordinates[0], equipment.coordinates?.coordinates[1]]"
                :title="equipment.name"
              >
                <template #default>
                  <div class="marker-content">
                    <el-icon :size="24" :color="getMarkerColor(equipment.type)">
                      <component :is="getMarkerIcon(equipment.type)" />
                    </el-icon>
                  </div>
                </template>
              </el-amap>
            </el-amap>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧信息面板 -->
      <el-col :span="6">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>预案列表</span>
              <el-button text type="primary" @click="showCreatePlanDialog">新增</el-button>
            </div>
          </template>

          <el-collapse v-model="activePlans">
            <el-collapse-item
              v-for="plan in emergencyPlans"
              :key="plan._id"
              :title="plan.name"
              :name="plan._id"
            >
              <div class="plan-content">
                <p><strong>类型：</strong>{{ getTypeName(plan.type) }}</p>
                <p><strong>描述：</strong>{{ plan.description }}</p>
                <p><strong>步骤：</strong></p>
                <el-timeline>
                  <el-timeline-item
                    v-for="(step, index) in plan.procedures"
                    :key="index"
                    :timestamp="step.action"
                  >
                    {{ step.description }}
                  </el-timeline-item>
                </el-timeline>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-card>

        <!-- 应急队伍 -->
        <el-card class="team-card">
          <template #header>
            <div class="card-header">
              <span>应急队伍</span>
            </div>
          </template>

          <el-tag
            v-for="team in emergencyTeams"
            :key="team._id"
            class="team-tag"
            :type="getTeamTagType(team.type)"
          >
            {{ team.name }} ({{ team.members?.length || 0 }}人)
          </el-tag>
        </el-card>
      </el-col>
    </el-row>

    <!-- 创建预案对话框 -->
    <el-dialog v-model="showPlanDialog" title="创建应急预案" width="60%">
      <el-form :model="planForm" label-width="100px">
        <el-form-item label="预案名称">
          <el-input v-model="planForm.name" placeholder="输入预案名称" />
        </el-form-item>
        <el-form-item label="预案类型">
          <el-select v-model="planForm.type" placeholder="选择类型">
            <el-option label="防汛预案" value="flood" />
            <el-option label="防火预案" value="fire" />
            <el-option label="地震预案" value="earthquake" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="planForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPlanDialog = false">取消</el-button>
        <el-button type="primary" @click="createPlan">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Warning, LocationFilled, Tools, FirstAidKit, Van } from '@element-plus/icons-vue'

const emergencyForm = reactive({
  type: '',
  severity: 'medium',
  location: '',
  description: ''
})

const equipmentQuery = reactive({
  type: '',
  location: ''
})

const emergencyPlans = ref([])
const equipmentList = ref([])
const emergencyTeams = ref([])
const activePlans = ref([])
const showPlanDialog = ref(false)

const mapCenter = [116.397428, 39.90923]
const mapZoom = 14

const planForm = reactive({
  name: '',
  type: '',
  description: ''
})

// 获取预案列表
const fetchPlans = async () => {
  try {
    const response = await fetch('/api/emergency-response/plans', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    const data = await response.json()
    if (data.success) {
      emergencyPlans.value = data.data
    }
  } catch (error) {
    console.error('获取预案失败:', error)
  }
}

// 获取设备列表
const fetchEquipment = async () => {
  try {
    const response = await fetch('/api/emergency-response/equipment', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    const data = await response.json()
    if (data.success) {
      equipmentList.value = data.data
    }
  } catch (error) {
    console.error('获取设备失败:', error)
  }
}

// 获取应急队伍
const fetchTeams = async () => {
  try {
    const response = await fetch('/api/emergency-response/teams', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    const data = await response.json()
    if (data.success) {
      emergencyTeams.value = data.data
    }
  } catch (error) {
    console.error('获取队伍失败:', error)
  }
}

// 启动应急预案
const activateEmergencyPlan = async () => {
  try {
    const plan = emergencyPlans.value.find(p => p.type === emergencyForm.type)
    if (!plan) {
      ElMessage.warning('请先创建对应类型的预案')
      return
    }

    const response = await fetch(`/api/emergency-response/plans/${plan._id}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(emergencyForm)
    })

    const data = await response.json()
    if (data.success) {
      ElMessage.success('预案已启动，紧急广播已发送')
    } else {
      ElMessage.error(data.message || '启动预案失败')
    }
  } catch (error) {
    console.error('启动预案失败:', error)
    ElMessage.error('启动预案失败')
  }
}

// 查询设备
const searchEquipment = async () => {
  try {
    const params = new URLSearchParams()
    if (equipmentQuery.type) params.append('type', equipmentQuery.type)
    if (equipmentQuery.location) params.append('location', equipmentQuery.location)

    const response = await fetch(`/api/emergency-response/equipment?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    const data = await response.json()
    if (data.success) {
      equipmentList.value = data.data
    }
  } catch (error) {
    console.error('查询设备失败:', error)
  }
}

const getTypeName = (type) => {
  const types = {
    flood: '防汛',
    fire: '防火',
    earthquake: '地震',
    epidemic: '疫情防控',
    drought: '抗旱'
  }
  return types[type] || type
}

const getMarkerColor = (type) => {
  const colors = {
    pump: '#409EFF',
    fire_extinguisher: '#F56C6C',
    generator: '#E6A23C',
    rescue_boat: '#67C23A',
    medical: '#909399'
  }
  return colors[type] || '#409EFF'
}

const getMarkerIcon = (type) => {
  const icons = {
    pump: Tools,
    fire_extinguisher: Warning,
    generator: Tools,
    rescue_boat: Van,
    medical: FirstAidKit
  }
  return icons[type] || LocationFilled
}

const getTeamTagType = (type) => {
  const types = {
    rescue: 'danger',
    medical: 'success',
    fire: 'warning',
    security: 'info'
  }
  return types[type] || ''
}

const showCreatePlanDialog = () => {
  showPlanDialog.value = true
}

const createPlan = async () => {
  try {
    const response = await fetch('/api/emergency-response/plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(planForm)
    })

    const data = await response.json()
    if (data.success) {
      ElMessage.success('预案创建成功')
      showPlanDialog.value = false
      fetchPlans()
    } else {
      ElMessage.error(data.message || '创建失败')
    }
  } catch (error) {
    console.error('创建预案失败:', error)
    ElMessage.error('创建预案失败')
  }
}

const showEquipmentLocation = (equipment) => {
  if (equipment.coordinates) {
    mapCenter.value = equipment.coordinates.coordinates
    mapZoom.value = 16
  }
}

onMounted(() => {
  fetchPlans()
  fetchEquipment()
  fetchTeams()
})
</script>

<style scoped>
.emergency-response {
  padding: 20px;
}

.action-card, .equipment-card, .info-card, .team-card, .map-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.equipment-list {
  margin-top: 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.equipment-tag {
  cursor: pointer;
}

.plan-content p {
  margin: 8px 0;
}

.team-tag {
  margin: 5px;
}

.map-container {
  height: 500px;
}

.marker-content {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
