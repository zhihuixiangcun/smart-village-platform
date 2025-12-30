<template>
  <div class="village-services">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 邻里互助 -->
      <el-tab-pane label="邻里互助" name="help">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card>
              <template #header>
                <span>发布求助</span>
              </template>
              <el-form :model="helpForm" label-width="80px">
                <el-form-item label="标题">
                  <el-input v-model="helpForm.title" placeholder="求助标题" />
                </el-form-item>
                <el-form-item label="类型">
                  <el-select v-model="helpForm.category" style="width: 100%">
                    <el-option label="农活帮忙" value="farm_help" />
                    <el-option label="老人照顾" value="elderly_care" />
                    <el-option label="儿童看护" value="childcare" />
                    <el-option label="接送" value="transport" />
                    <el-option label="维修" value="repair" />
                  </el-select>
                </el-form-item>
                <el-form-item label="描述">
                  <el-input v-model="helpForm.description" type="textarea" :rows="3" />
                </el-form-item>
                <el-form-item label="积分奖励">
                  <el-input-number v-model="helpForm.points" :min="1" :max="100" />
                </el-form-item>
                <el-button type="primary" style="width: 100%" @click="createHelpRequest">
                  发布求助
                </el-button>
              </el-form>
            </el-card>
          </el-col>

          <el-col :span="16">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>求助列表</span>
                  <el-radio-group v-model="helpStatus" @change="fetchHelpRequests">
                    <el-radio-button label="">全部</el-radio-button>
                    <el-radio-button label="pending">待响应</el-radio-button>
                    <el-radio-button label="in_progress">进行中</el-radio-button>
                    <el-radio-button label="completed">已完成</el-radio-button>
                  </el-radio-group>
                </div>
              </template>

              <el-empty v-if="helpRequests.length === 0" description="暂无求助" />
              <div v-else class="help-list">
                <div v-for="item in helpRequests" :key="item._id" class="help-item">
                  <div class="help-header">
                    <span class="help-title">{{ item.title }}</span>
                    <el-tag :type="getHelpStatusType(item.status)">
                      {{ getHelpStatusText(item.status) }}
                    </el-tag>
                  </div>
                  <p class="help-desc">{{ item.description }}</p>
                  <div class="help-meta">
                    <span>发布者: {{ item.requester?.name }}</span>
                    <span>积分: {{ item.points }}</span>
                    <span>响应数: {{ item.respondents?.length || 0 }}</span>
                  </div>
                  <div v-if="item.status === 'pending'" class="help-actions">
                    <el-button size="small" type="primary" @click="respondToHelp(item._id)">
                      我来帮忙
                    </el-button>
                  </div>
                  <div v-else-if="item.respondents?.length > 0" class="respondents">
                    <span>响应者: </span>
                    <el-avatar
                      v-for="r in item.respondents"
                      :key="r.userId"
                      :src="r.userId?.avatar"
                      :size="30"
                      style="margin-left: 5px"
                    >
                      {{ r.userId?.name?.[0] }}
                    </el-avatar>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 拼车服务 -->
      <el-tab-pane label="拼车服务" name="carpool">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card>
              <template #header>
                <span>发布拼车</span>
              </template>
              <el-form :model="carpoolForm" label-width="80px">
                <el-form-item label="出发地">
                  <el-input v-model="carpoolForm.origin" />
                </el-form-item>
                <el-form-item label="目的地">
                  <el-input v-model="carpoolForm.destination" />
                </el-form-item>
                <el-form-item label="出发时间">
                  <el-date-picker
                    v-model="carpoolForm.departureTime"
                    type="datetime"
                    placeholder="选择时间"
                    style="width: 100%"
                  />
                </el-form-item>
                <el-form-item label="座位数">
                  <el-input-number v-model="carpoolForm.seats" :min="1" :max="10" />
                </el-form-item>
                <el-form-item label="费用">
                  <el-input-number v-model="carpoolForm.cost" :min="0" />
                </el-form-item>
                <el-button type="primary" style="width: 100%" @click="createCarpool">
                  发布拼车
                </el-button>
              </el-form>
            </el-card>
          </el-col>

          <el-col :span="16">
            <el-card>
              <template #header>
                <span>拼车列表</span>
              </template>

              <el-table :data="carpools" stripe>
                <el-table-column prop="origin" label="出发地" width="120" />
                <el-table-column prop="destination" label="目的地" width="120" />
                <el-table-column prop="departureTime" label="出发时间" width="150">
                  <template #default="{ row }">
                    {{ formatDateTime(row.departureTime) }}
                  </template>
                </el-table-column>
                <el-table-column prop="seats" label="座位" width="80">
                  <template #default="{ row }">
                    {{ row.passengers?.length || 0 }}/{{ row.seats }}
                  </template>
                </el-table-column>
                <el-table-column prop="cost" label="费用" width="80">
                  <template #default="{ row }">
                    ¥{{ row.cost }}
                  </template>
                </el-table-column>
                <el-table-column prop="creator" label="车主" width="100">
                  <template #default="{ row }">
                    {{ row.creator?.name }}
                  </template>
                </el-table-column>
                <el-table-column label="操作">
                  <template #default="{ row }">
                    <el-button
                      v-if="row.status === 'open'"
                      size="small"
                      type="primary"
                      @click="joinCarpool(row._id)"
                    >
                      加入
                    </el-button>
                    <el-tag v-else-if="row.status === 'full'" type="info">已满</el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 设备共享 -->
      <el-tab-pane label="设备共享" name="equipment">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-card>
              <template #header>
                <span>添加设备</span>
              </template>
              <el-form :model="equipmentForm" label-width="80px">
                <el-form-item label="设备名称">
                  <el-input v-model="equipmentForm.name" />
                </el-form-item>
                <el-form-item label="类型">
                  <el-select v-model="equipmentForm.type" style="width: 100%">
                    <el-option label="农机具" value="farm_machinery" />
                    <el-option label="工具" value="tool" />
                    <el-option label="车辆" value="vehicle" />
                  </el-select>
                </el-form-item>
                <el-form-item label="日租金">
                  <el-input-number v-model="equipmentForm.dailyCost" :min="0" />
                </el-form-item>
                <el-form-item label="押金">
                  <el-input-number v-model="equipmentForm.deposit" :min="0" />
                </el-form-item>
                <el-form-item label="图片">
                  <el-upload
                    action="/api/village-services/shared-equipment"
                    :headers="{ 'Authorization': `Bearer ${getToken()}` }"
                    :data="equipmentForm"
                    :on-success="() => { ElMessage.success('添加成功'); fetchEquipment() }"
                    accept="image/*"
                    :show-file-list="false"
                  >
                    <el-button icon="Upload">上传图片并添加</el-button>
                  </el-upload>
                </el-form-item>
              </el-form>
            </el-card>
          </el-col>

          <el-col :span="18">
            <el-card>
              <template #header>
                <span>共享设备列表</span>
              </template>

              <el-table :data="equipmentList" stripe>
                <el-table-column prop="image" label="图片" width="80">
                  <template #default="{ row }">
                    <el-image v-if="row.image" :src="row.image" style="width: 50px; height: 50px" fit="cover" />
                  </template>
                </el-table-column>
                <el-table-column prop="name" label="设备名称" width="150" />
                <el-table-column prop="type" label="类型" width="100">
                  <template #default="{ row }">
                    {{ getEquipmentTypeName(row.type) }}
                  </template>
                </el-table-column>
                <el-table-column prop="dailyCost" label="日租金" width="80">
                  <template #default="{ row }">
                    ¥{{ row.dailyCost }}
                  </template>
                </el-table-column>
                <el-table-column prop="deposit" label="押金" width="80">
                  <template #default="{ row }">
                    ¥{{ row.deposit }}
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="80">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'available' ? 'success' : 'info'">
                      {{ row.status === 'available' ? '可借' : '已借出' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="owner" label="所有者" width="100">
                  <template #default="{ row }">
                    {{ row.owner?.name }}
                  </template>
                </el-table-column>
                <el-table-column label="操作">
                  <template #default="{ row }">
                    <el-button
                      v-if="row.status === 'available'"
                      size="small"
                      type="primary"
                      @click="borrowEquipment(row._id)"
                    >
                      借用
                    </el-button>
                    <el-button
                      v-else-if="row.currentBorrower?._id === currentUserId"
                      size="small"
                      @click="returnEquipment(row._id)"
                    >
                      归还
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 乡村活动 -->
      <el-tab-pane label="乡村活动" name="activity">
        <el-row :gutter="20">
          <el-col :span="24">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>活动列表</span>
                  <el-button type="primary" @click="showActivityDialog = true">发起活动</el-button>
                </div>
              </template>

              <el-row :gutter="20">
                <el-col v-for="activity in activities" :key="activity._id" :span="6">
                  <el-card class="activity-card" shadow="hover">
                    <div v-if="activity.images?.length" class="activity-images">
                      <el-carousel height="150px">
                        <el-carousel-item v-for="(img, i) in activity.images" :key="i">
                          <el-image :src="img" fit="cover" style="width: 100%; height: 100%" />
                        </el-carousel-item>
                      </el-carousel>
                    </div>
                    <div class="activity-title">{{ activity.title }}</div>
                    <div class="activity-meta">
                      <el-tag size="small">{{ activity.type }}</el-tag>
                      <span>{{ activity.participants?.length || 0 }}人参与</span>
                    </div>
                    <div class="activity-time">{{ formatDateTime(activity.startTime) }}</div>
                    <div class="activity-actions">
                      <el-button size="small" @click="likeActivity(activity._id)">
                        <el-icon><Star /></el-icon>
                        {{ activity.likes?.length || 0 }}
                      </el-button>
                      <el-button size="small" type="primary" @click="joinActivity(activity._id)">
                        参加
                      </el-button>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- 助农电商 -->
      <el-tab-pane label="助农电商" name="ecommerce">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-card>
              <template #header>
                <span>发布产品</span>
              </template>
              <el-form :model="productForm" label-width="80px">
                <el-form-item label="产品名称">
                  <el-input v-model="productForm.name" />
                </el-form-item>
                <el-form-item label="类别">
                  <el-select v-model="productForm.category" style="width: 100%">
                    <el-option label="粮食" value="grain" />
                    <el-option label="蔬菜" value="vegetable" />
                    <el-option label="水果" value="fruit" />
                    <el-option label="畜牧" value="livestock" />
                  </el-select>
                </el-form-item>
                <el-form-item label="价格">
                  <el-input-number v-model="productForm.price" :min="0" :step="0.1" />
                </el-form-item>
                <el-form-item label="库存">
                  <el-input-number v-model="productForm.stock" :min="0" />
                </el-form-item>
                <el-upload
                  action="/api/village-services/products"
                  :headers="{ 'Authorization': `Bearer ${getToken()}` }"
                  :data="productForm"
                  :on-success="() => { ElMessage.success('发布成功'); fetchProducts() }"
                  accept="image/*"
                  :show-file-list="false"
                >
                  <el-button icon="Upload" type="primary" style="width: 100%">
                    上传图片并发布
                  </el-button>
                </el-upload>
              </el-form>
            </el-card>
          </el-col>

          <el-col :span="18">
            <el-card>
              <template #header>
                <span>农产品列表</span>
              </template>

              <el-table :data="products" stripe>
                <el-table-column prop="image" label="图片" width="80">
                  <template #default="{ row }">
                    <el-image v-if="row.image" :src="row.image" style="width: 50px; height: 50px" fit="cover" />
                  </template>
                </el-table-column>
                <el-table-column prop="name" label="产品名称" width="150" />
                <el-table-column prop="category" label="类别" width="80">
                  <template #default="{ row }">
                    {{ getCategoryName(row.category) }}
                  </template>
                </el-table-column>
                <el-table-column prop="price" label="价格" width="80">
                  <template #default="{ row }">
                    ¥{{ row.price }}/{{ row.unit }}
                  </template>
                </el-table-column>
                <el-table-column prop="stock" label="库存" width="80">
                  <template #default="{ row }">
                    {{ row.stock }}{{ row.unit }}
                  </template>
                </el-table-column>
                <el-table-column prop="seller" label="卖家" width="100">
                  <template #default="{ row }">
                    {{ row.seller?.name }}
                  </template>
                </el-table-column>
                <el-table-column label="操作">
                  <template #default="{ row }">
                    <el-button size="small" type="primary" :disabled="row.stock <= 0">
                      购买
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Star } from '@element-plus/icons-vue'

const activeTab = ref('help')
const helpStatus = ref('')
const helpRequests = ref([])
const carpools = ref([])
const equipmentList = ref([])
const activities = ref([])
const products = ref([])

const currentUserId = localStorage.getItem('userId')
const showActivityDialog = ref(false)

const helpForm = reactive({
  title: '',
  category: '',
  description: '',
  points: 10
})

const carpoolForm = reactive({
  origin: '',
  destination: '',
  departureTime: null,
  seats: 4,
  cost: 0
})

const equipmentForm = reactive({
  name: '',
  type: '',
  dailyCost: 0,
  deposit: 0
})

const productForm = reactive({
  name: '',
  category: '',
  price: 0,
  stock: 0
})

const getToken = () => localStorage.getItem('token')

// 邻里互助
const fetchHelpRequests = async () => {
  try {
    const params = helpStatus.value ? `?status=${helpStatus.value}` : ''
    const response = await fetch(`/api/village-services/help-requests${params}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const data = await response.json()
    if (data.success) helpRequests.value = data.data
  } catch (error) {
    console.error('获取求助失败:', error)
  }
}

const createHelpRequest = async () => {
  try {
    const response = await fetch('/api/village-services/help-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(helpForm)
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('发布成功')
      fetchHelpRequests()
    }
  } catch (error) {
    ElMessage.error('发布失败')
  }
}

const respondToHelp = async (id) => {
  try {
    const response = await fetch(`/api/village-services/help-requests/${id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ message: '我可以帮忙' })
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('响应成功')
      fetchHelpRequests()
    }
  } catch (error) {
    ElMessage.error('响应失败')
  }
}

// 拼车
const fetchCarpools = async () => {
  try {
    const response = await fetch('/api/village-services/carpool', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const data = await response.json()
    if (data.success) carpools.value = data.data
  } catch (error) {
    console.error('获取拼车失败:', error)
  }
}

const createCarpool = async () => {
  try {
    const response = await fetch('/api/village-services/carpool', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(carpoolForm)
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('发布成功')
      fetchCarpools()
    }
  } catch (error) {
    ElMessage.error('发布失败')
  }
}

const joinCarpool = async (id) => {
  try {
    const response = await fetch(`/api/village-services/carpool/${id}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ pickupLocation: '村口' })
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('加入成功')
      fetchCarpools()
    }
  } catch (error) {
    ElMessage.error('加入失败')
  }
}

// 设备共享
const fetchEquipment = async () => {
  try {
    const response = await fetch('/api/village-services/shared-equipment', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const data = await response.json()
    if (data.success) equipmentList.value = data.data
  } catch (error) {
    console.error('获取设备失败:', error)
  }
}

const borrowEquipment = async (id) => {
  try {
    const response = await fetch(`/api/village-services/shared-equipment/${id}/borrow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ returnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('借用成功')
      fetchEquipment()
    }
  } catch (error) {
    ElMessage.error('借用失败')
  }
}

const returnEquipment = async (id) => {
  try {
    const response = await fetch(`/api/village-services/shared-equipment/${id}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ condition: 'good' })
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('归还成功')
      fetchEquipment()
    }
  } catch (error) {
    ElMessage.error('归还失败')
  }
}

// 活动
const fetchActivities = async () => {
  try {
    const response = await fetch('/api/village-services/activities', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const data = await response.json()
    if (data.success) activities.value = data.data
  } catch (error) {
    console.error('获取活动失败:', error)
  }
}

const likeActivity = async (id) => {
  try {
    await fetch(`/api/village-services/activities/${id}/like`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    fetchActivities()
  } catch (error) {
    console.error('操作失败:', error)
  }
}

const joinActivity = async (id) => {
  try {
    const response = await fetch(`/api/village-services/activities/${id}/join`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('报名成功')
      fetchActivities()
    }
  } catch (error) {
    ElMessage.error('报名失败')
  }
}

// 电商
const fetchProducts = async () => {
  try {
    const response = await fetch('/api/village-services/products', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    const data = await response.json()
    if (data.success) products.value = data.data
  } catch (error) {
    console.error('获取产品失败:', error)
  }
}

const getHelpStatusType = (status) => {
  const map = { pending: 'warning', in_progress: 'primary', completed: 'success' }
  return map[status] || ''
}

const getHelpStatusText = (status) => {
  const map = { pending: '待响应', in_progress: '进行中', completed: '已完成' }
  return map[status] || status
}

const getEquipmentTypeName = (type) => {
  const map = { farm_machinery: '农机具', tool: '工具', vehicle: '车辆' }
  return map[type] || type
}

const getCategoryName = (category) => {
  const map = { grain: '粮食', vegetable: '蔬菜', fruit: '水果', livestock: '畜牧' }
  return map[category] || category
}

const formatDateTime = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchHelpRequests()
  fetchCarpools()
  fetchEquipment()
  fetchActivities()
  fetchProducts()
})
</script>

<style scoped>
.village-services {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.help-list {
  max-height: 600px;
  overflow-y: auto;
}

.help-item {
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.help-item:last-child {
  border-bottom: none;
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.help-title {
  font-weight: bold;
  font-size: 16px;
}

.help-desc {
  color: #666;
  margin: 10px 0;
}

.help-meta {
  display: flex;
  gap: 20px;
  color: #999;
  font-size: 14px;
}

.help-actions {
  margin-top: 10px;
}

.respondents {
  margin-top: 10px;
  display: flex;
  align-items: center;
}

.activity-card {
  margin-bottom: 20px;
}

.activity-title {
  font-weight: bold;
  margin: 10px 0;
}

.activity-meta {
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 14px;
}

.activity-time {
  color: #999;
  font-size: 14px;
  margin: 5px 0;
}

.activity-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}
</style>
