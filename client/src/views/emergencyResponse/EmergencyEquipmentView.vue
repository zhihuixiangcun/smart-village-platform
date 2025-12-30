<template>
  <div class="emergency-equipment-view">
    <div class="page-header">
      <h2>
        <el-icon><Box /></el-icon>
        救援设备管理
      </h2>
      <div class="header-actions">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加设备
        </el-button>
        <el-button @click="showMapDialog = true">
          <el-icon><Location /></el-icon>
          设备地图
        </el-button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="设备类型">
          <el-select v-model="filters.type" placeholder="全部类型" clearable @change="fetchEquipment">
            <el-option label="水泵" value="pump" />
            <el-option label="灭火器" value="extinguisher" />
            <el-option label="发电机" value="generator" />
            <el-option label="救生衣" value="life_jacket" />
            <el-option label="急救包" value="first_aid" />
            <el-option label="应急灯" value="emergency_light" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable @change="fetchEquipment">
            <el-option label="可用" value="available" />
            <el-option label="使用中" value="in_use" />
            <el-option label="维护中" value="maintenance" />
            <el-option label="已过期" value="expired" />
          </el-select>
        </el-form-item>
        <el-form-item label="位置">
          <el-input v-model="filters.location" placeholder="搜索位置" clearable @change="fetchEquipment" />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 设备统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #67c23a">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.available }}</div>
              <div class="stat-label">可用设备</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #409eff">
              <el-icon><Loading /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.inUse }}</div>
              <div class="stat-label">使用中</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #e6a23c">
              <el-icon><Tools /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.maintenance }}</div>
              <div class="stat-label">维护中</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #f56c6c">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.expired }}</div>
              <div class="stat-label">已过期</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 设备列表 -->
    <el-card class="equipment-list">
      <el-table v-loading="loading" :data="equipment" stripe>
        <el-table-column prop="name" label="设备名称" min-width="150" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag>{{ getTypeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="100" />
        <el-table-column prop="location" label="存放位置" min-width="200" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expiryDate" label="有效期至" width="120">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isExpiringSoon(row.expiryDate) }">
              {{ row.expiryDate ? formatDate(row.expiryDate) : '永久' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="editEquipment(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="deleteEquipment(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑设备对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingEquipment ? '编辑设备' : '添加设备'"
      width="600px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="设备名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item label="设备类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择设备类型">
            <el-option label="水泵" value="pump" />
            <el-option label="灭火器" value="extinguisher" />
            <el-option label="发电机" value="generator" />
            <el-option label="救生衣" value="life_jacket" />
            <el-option label="急救包" value="first_aid" />
            <el-option label="应急灯" value="emergency_light" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number v-model="form.quantity" :min="1" :max="999" />
        </el-form-item>
        <el-form-item label="存放位置" prop="location">
          <el-input v-model="form.location" placeholder="请输入存放位置" />
        </el-form-item>
        <el-form-item label="坐标">
          <el-input v-model="form.coordinates" placeholder="经度,纬度 (可选)" />
        </el-form-item>
        <el-form-item label="有效期至">
          <el-date-picker
            v-model="form.expiryDate"
            type="date"
            placeholder="选择有效期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="3" placeholder="请输入备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveEquipment" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 设备地图对话框 -->
    <el-dialog v-model="showMapDialog" title="设备位置地图" width="800px">
      <div class="map-container">
        <div class="map-placeholder">
          <el-icon class="map-icon"><Location /></el-icon>
          <p>设备地图功能</p>
          <p class="map-hint">显示所有救援设备的实时位置</p>
        </div>
      </div>
      <div class="map-legend">
        <div class="legend-item">
          <span class="legend-dot" style="background: #67c23a"></span>
          <span>可用设备</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #409eff"></span>
          <span>使用中</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #e6a23c"></span>
          <span>维护中</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Box, Plus, Location, CircleCheck, Loading, Tools, Warning } from '@element-plus/icons-vue'
import emergencyApi from '@/api/emergencyResponse'

const loading = ref(false)
const saving = ref(false)
const equipment = ref([])
const showAddDialog = ref(false)
const showMapDialog = ref(false)
const editingEquipment = ref(null)
const formRef = ref(null)

const filters = reactive({
  type: '',
  status: '',
  location: ''
})

const form = reactive({
  name: '',
  type: '',
  quantity: 1,
  location: '',
  coordinates: '',
  expiryDate: '',
  notes: ''
})

const rules = {
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  location: [{ required: true, message: '请输入存放位置', trigger: 'blur' }]
}

const stats = computed(() => {
  const available = equipment.value.filter(e => e.status === 'available').length
  const inUse = equipment.value.filter(e => e.status === 'in_use').length
  const maintenance = equipment.value.filter(e => e.status === 'maintenance').length
  const expired = equipment.value.filter(e => e.status === 'expired').length
  return { available, inUse, maintenance, expired }
})

const getTypeLabel = (type) => {
  const types = {
    pump: '水泵',
    extinguisher: '灭火器',
    generator: '发电机',
    life_jacket: '救生衣',
    first_aid: '急救包',
    emergency_light: '应急灯',
    other: '其他'
  }
  return types[type] || type
}

const getStatusLabel = (status) => {
  const labels = {
    available: '可用',
    in_use: '使用中',
    maintenance: '维护中',
    expired: '已过期'
  }
  return labels[status] || status
}

const getStatusType = (status) => {
  const types = {
    available: 'success',
    in_use: 'primary',
    maintenance: 'warning',
    expired: 'danger'
  }
  return types[status] || 'info'
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const isExpiringSoon = (date) => {
  if (!date) return false
  const expiry = new Date(date)
  const now = new Date()
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
  return daysLeft <= 30 && daysLeft >= 0
}

const fetchEquipment = async () => {
  loading.value = true
  try {
    const { data } = await emergencyApi.getEquipment(filters)
    if (data.success) {
      equipment.value = data.data
    }
  } catch (error) {
    ElMessage.error('获取设备列表失败')
  } finally {
    loading.value = false
  }
}

const editEquipment = (item) => {
  editingEquipment.value = item
  Object.assign(form, {
    name: item.name,
    type: item.type,
    quantity: item.quantity,
    location: item.location,
    coordinates: item.coordinates?.join(',') || '',
    expiryDate: item.expiryDate,
    notes: item.notes
  })
  showAddDialog.value = true
}

const saveEquipment = async () => {
  await formRef.value.validate(async (valid) => {
    if (valid) {
      saving.value = true
      try {
        const formData = {
          ...form,
          coordinates: form.coordinates ? form.coordinates.split(',').map(c => parseFloat(c.trim())) : null
        }
        if (editingEquipment.value) {
          const { data } = await emergencyApi.updateEquipment(editingEquipment.value._id, formData)
          if (data.success) {
            ElMessage.success('设备更新成功')
          }
        } else {
          const { data } = await emergencyApi.addEquipment(formData)
          if (data.success) {
            ElMessage.success('设备添加成功')
          }
        }
        showAddDialog.value = false
        resetForm()
        fetchEquipment()
      } catch (error) {
        ElMessage.error(editingEquipment.value ? '更新设备失败' : '添加设备失败')
      } finally {
        saving.value = false
      }
    }
  })
}

const deleteEquipment = async (item) => {
  await ElMessageBox.confirm('确定要删除此设备吗？', '确认删除', {
    type: 'warning'
  })
  try {
    const { data } = await emergencyApi.deleteEquipment(item._id)
    if (data.success) {
      ElMessage.success('删除成功')
      fetchEquipment()
    }
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

const resetForm = () => {
  editingEquipment.value = null
  Object.assign(form, {
    name: '',
    type: '',
    quantity: 1,
    location: '',
    coordinates: '',
    expiryDate: '',
    notes: ''
  })
  formRef.value?.resetFields()
}

onMounted(() => {
  fetchEquipment()
})
</script>

<style scoped>
.emergency-equipment-view {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  margin: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 100%;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.equipment-list {
  min-height: 400px;
}

.text-danger {
  color: #f56c6c;
}

.map-container {
  height: 400px;
  background: #f5f7fa;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-placeholder {
  text-align: center;
  color: #909399;
}

.map-icon {
  font-size: 64px;
  margin-bottom: 10px;
}

.map-hint {
  font-size: 12px;
  margin-top: 5px;
}

.map-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
</style>
