<template>
  <div class="purchaser-dashboard">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1>
            <el-icon><Monitor /></el-icon>
            采购商工作台
          </h1>
          <p class="welcome-text">欢迎回来，{{ purchaserInfo?.name || '采购商' }}</p>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="handlePostRequirement">
            <el-icon><EditPen /></el-icon>
            发布需求
          </el-button>
          <el-button @click="fetchDashboardData">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>
    </div>

    <!-- 主标签页 -->
    <el-tabs v-model="activeTab" type="card" class="dashboard-tabs">
      <!-- 工作台 -->
      <el-tab-pane label="工作台" name="dashboard">
        <div class="tab-content">
          <!-- 统计卡片 -->
          <div class="stats-cards">
            <div class="stat-card recommendations" @click="switchTab('nearby-suppliers')">
              <div class="stat-icon">
                <el-icon><Shop /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.suppliers }}</div>
                <div class="stat-label">附近商家</div>
              </div>
              <el-icon class="stat-arrow"><ArrowRight /></el-icon>
            </div>
            <div class="stat-card lifestyle" @click="switchTab('lifestyle')">
              <div class="stat-icon">
                <el-icon><Compass /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.lifestyle }}</div>
                <div class="stat-label">生活服务</div>
              </div>
              <el-icon class="stat-arrow"><ArrowRight /></el-icon>
            </div>
            <div class="stat-card transportation" @click="switchTab('transportation')">
              <div class="stat-icon">
                <el-icon><Van /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.transportation }}</div>
                <div class="stat-label">交通出行</div>
              </div>
              <el-icon class="stat-arrow"><ArrowRight /></el-icon>
            </div>
            <div class="stat-card carpooling" @click="switchTab('carpooling')">
              <div class="stat-icon">
                <el-icon><Promotion /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.carpooling }}</div>
                <div class="stat-label">拼车服务</div>
              </div>
              <el-icon class="stat-arrow"><ArrowRight /></el-icon>
            </div>
          </div>

          <!-- 快捷操作 -->
          <div class="quick-actions">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <el-icon><Operation /></el-icon>
                  <span>快捷操作</span>
                </div>
              </template>
              <div class="action-buttons">
                <el-button type="primary" @click="switchTab('nearby-products')">
                  <el-icon><ShoppingCart /></el-icon>
                  搜索商品
                </el-button>
                <el-button type="success" @click="switchTab('nearby-suppliers')">
                  <el-icon><User /></el-icon>
                  浏览商家
                </el-button>
                <el-button type="warning" @click="switchTab('lifestyle')">
                  <el-icon><Compass /></el-icon>
                  生活服务
                </el-button>
                <el-button type="info" @click="handlePostRequirement">
                  <el-icon><EditPen /></el-icon>
                  发布需求
                </el-button>
              </div>
            </el-card>
          </div>

          <!-- 最新推荐 -->
          <div class="latest-recommendations">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <el-icon><Star /></el-icon>
                  <span>最新推荐</span>
                  <el-button type="primary" text @click="switchTab('nearby-products')">查看更多</el-button>
                </div>
              </template>
              <div v-if="loading" class="loading-container">
                <el-skeleton :rows="3" animated />
              </div>
              <div v-else-if="recommendations.length === 0" class="empty-container">
                <el-empty description="暂无推荐内容">
                  <el-button type="primary" @click="fetchRecommendations">刷新</el-button>
                </el-empty>
              </div>
              <div v-else class="recommendations-grid">
                <div v-for="item in recommendations" :key="item.id" class="recommendation-item" @click="viewRecommendation(item)">
                  <div class="item-badge" :class="item.type">
                    <el-icon><component :is="item.type === 'product' ? ShoppingCart : Bell" /></el-icon>
                  </div>
                  <h4>{{ item.name || item.title }}</h4>
                  <p class="item-description">{{ item.description || item.content }}</p>
                  <div class="item-meta">
                    <span class="price" v-if="item.price">
                      <el-icon><PriceTag /></el-icon>
                      ¥{{ item.price }}/{{ item.unit }}
                    </span>
                    <span class="distance" v-if="item.distance">
                      <el-icon><Location /></el-icon>
                      {{ item.distance.toFixed(1) }}km
                    </span>
                  </div>
                  <div class="item-actions">
                    <el-button size="small" type="primary">查看详情</el-button>
                  </div>
                </div>
              </div>
            </el-card>
          </div>

          <!-- 我的采购需求 -->
          <div class="my-requirements">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <el-icon><Document /></el-icon>
                  <span>我的采购需求</span>
                  <el-button type="primary" text @click="handlePostRequirement">
                    <el-icon><Plus /></el-icon>
                    发布新需求
                  </el-button>
                </div>
              </template>
              <el-table :data="requirements" stripe style="width: 100%">
                <el-table-column prop="productCategory" label="采购类目" width="120" />
                <el-table-column prop="quantity" label="数量" width="100" />
                <el-table-column prop="budget" label="预算" width="100" />
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="getRequirementStatusType(row.status)">
                      {{ getRequirementStatusLabel(row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="createdAt" label="发布时间" width="160">
                  <template #default="{ row }">
                    {{ formatDate(row.createdAt) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="200" fixed="right">
                  <template #default="{ row }">
                    <el-button size="small" @click="handleViewRequirement(row)">查看</el-button>
                    <el-button size="small" type="danger" @click="handleDeleteRequirement(row)" v-if="row.status === 'pending'">
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </div>
        </div>
      </el-tab-pane>

      <!-- 附近商家 -->
      <el-tab-pane label="附近商家" name="nearby-suppliers">
        <template #label>
          <span class="tab-label">
            <el-icon><Shop /></el-icon>
            附近商家
          </span>
        </template>
        <NearbySuppliers />
      </el-tab-pane>

      <!-- 吃喝玩乐 -->
      <el-tab-pane label="吃喝玩乐" name="lifestyle">
        <template #label>
          <span class="tab-label">
            <el-icon><Compass /></el-icon>
            吃喝玩乐
          </span>
        </template>
        <LifestyleServices />
      </el-tab-pane>

      <!-- 交通出行 -->
      <el-tab-pane label="交通出行" name="transportation">
        <template #label>
          <span class="tab-label">
            <el-icon><Van /></el-icon>
            交通出行
          </span>
        </template>
        <TransportationServices />
      </el-tab-pane>

      <!-- 拼车服务 -->
      <el-tab-pane label="拼车服务" name="carpooling">
        <template #label>
          <span class="tab-label">
            <el-icon><Promotion /></el-icon>
            拼车服务
          </span>
        </template>
        <CarpoolingService />
      </el-tab-pane>

      <!-- 附近商品 -->
      <el-tab-pane label="附近商品" name="nearby-products">
        <template #label>
          <span class="tab-label">
            <el-icon><ShoppingCart /></el-icon>
            附近商品
          </span>
        </template>
        <NearbyProducts />
      </el-tab-pane>

      <!-- 我的订单 -->
      <el-tab-pane label="我的订单" name="orders">
        <template #label>
          <span class="tab-label">
            <el-icon><Document /></el-icon>
            我的订单
          </span>
        </template>
        <div class="orders-list">
          <el-card shadow="hover">
            <el-empty description="订单功能开发中" />
          </el-card>
        </div>
      </el-tab-pane>

      <!-- 采购需求 -->
      <el-tab-pane label="采购需求" name="requirements">
        <template #label>
          <span class="tab-label">
            <el-icon><EditPen /></el-icon>
            采购需求
          </span>
        </template>
        <div class="requirements-manage">
          <el-card shadow="hover">
            <el-empty description="需求管理功能开发中" />
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Monitor, Shop, Compass, Van, Promotion, ShoppingCart, User, EditPen, Refresh,
  Operation, Star, Document, PriceTag, Location, Plus, ArrowRight, Bell
} from '@element-plus/icons-vue'
import api from '@/api'
import NearbySuppliers from '@/components/purchaser/NearbySuppliers.vue'
import LifestyleServices from '@/components/purchaser/LifestyleServices.vue'
import TransportationServices from '@/components/purchaser/TransportationServices.vue'
import CarpoolingService from '@/components/purchaser/CarpoolingService.vue'
import NearbyProducts from '@/components/purchaser/NearbyProducts.vue'

const router = useRouter()
const loading = ref(false)
const purchaserInfo = ref(null)
const recommendations = ref([])
const requirements = ref([])
const activeTab = ref('dashboard')

const stats = reactive({
  suppliers: 0,
  lifestyle: 0,
  transportation: 0,
  carpooling: 0
})

// 获取采购商信息
const fetchPurchaserInfo = async () => {
  try {
    const response = await api.get('/api/v1/purchaser/me')
    if (response.success) {
      purchaserInfo.value = response.data
    }
  } catch (error) {
    console.error('获取采购商信息失败', error)
  }
}

// 获取工作台数据
const fetchDashboardData = async () => {
  loading.value = true
  try {
    await Promise.all([
      fetchPurchaserInfo(),
      fetchRecommendations(),
      fetchRequirements(),
      fetchStats()
    ])
    ElMessage.success('数据刷新成功')
  } catch (error) {
    console.error('获取数据失败', error)
    ElMessage.error('数据刷新失败')
  } finally {
    loading.value = false
  }
}

// 获取统计数据
const fetchStats = async () => {
  try {
    // 模拟数据
    stats.suppliers = 12
    stats.lifestyle = 25
    stats.transportation = 8
    stats.carpooling = 6
  } catch (error) {
    console.error('获取统计数据失败', error)
  }
}

// 获取智能推荐
const fetchRecommendations = async () => {
  try {
    const response = await api.get('/api/v1/purchaser/recommendations', {
      params: { limit: 6 }
    })
    if (response.success) {
      recommendations.value = response.data.recommendations || []
    }
  } catch (error) {
    // 使用模拟数据
    recommendations.value = [
      { id: '1', type: 'product', name: '有机白菜', description: '新鲜有机种植，口感鲜嫩', price: 3.5, unit: '斤', distance: 0.8 },
      { id: '2', type: 'announcement', title: '春节优惠活动', content: '春节期间全场9折优惠', distance: 1.2 },
      { id: '3', type: 'product', name: '新鲜草莓', description: '个大饱满，香甜可口', price: 25, unit: '斤', distance: 2.5 },
      { id: '4', type: 'product', name: '土鸡蛋', description: '散养土鸡产蛋，营养丰富', price: 1.5, unit: '个', distance: 3.2 }
    ]
  }
}

// 获取我的采购需求
const fetchRequirements = async () => {
  try {
    // 模拟数据
    requirements.value = [
      { productCategory: '蔬菜', quantity: '500kg', budget: '2000元', status: 'pending', createdAt: new Date() },
      { productCategory: '水果', quantity: '300kg', budget: '3000元', status: 'active', createdAt: new Date() }
    ]
  } catch (error) {
    console.error('获取采购需求失败', error)
  }
}

// 切换标签页
const switchTab = (tabName) => {
  activeTab.value = tabName
}

// 查看推荐详情
const viewRecommendation = (item) => {
  ElMessageBox.alert(
    `<div style="text-align: left;">
      <h3>${item.name || item.title}</h3>
      <p><strong>类型：</strong>${item.type === 'product' ? '农产品' : '公告'}</p>
      <p><strong>描述：</strong>${item.description || item.content}</p>
      ${item.price ? `<p><strong>价格：</strong>¥${item.price}/${item.unit}</p>` : ''}
      ${item.distance ? `<p><strong>距离：</strong>${item.distance.toFixed(1)}km</p>` : ''}
    </div>`,
    '详细信息',
    { dangerouslyUseHTMLString: true }
  )
}

// 快捷操作
const handlePostRequirement = () => {
  ElMessage.info('发布采购需求功能开发中，敬请期待！')
}

const handleViewRequirement = (row) => {
  ElMessageBox.alert(
    `<div style="text-align: left;">
      <h3>${row.productCategory}</h3>
      <p><strong>数量：</strong>${row.quantity}</p>
      <p><strong>预算：</strong>${row.budget}</p>
      <p><strong>状态：</strong>${getRequirementStatusLabel(row.status)}</p>
      <p><strong>发布时间：</strong>${formatDate(row.createdAt)}</p>
    </div>`,
    '采购需求详情',
    { dangerouslyUseHTMLString: true }
  )
}

const handleDeleteRequirement = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除此采购需求吗？', '确认删除', {
      type: 'warning'
    })
    ElMessage.success('删除成功')
    // 这里可以调用实际的删除API
  } catch (error) {
    // 用户取消删除
  }
}

// 工具函数
const getRequirementStatusType = (status) => {
  const types = { pending: 'info', active: 'success', completed: 'info', cancelled: 'danger' }
  return types[status] || 'info'
}

const getRequirementStatusLabel = (status) => {
  const labels = { pending: '待响应', active: '进行中', completed: '已完成', cancelled: '已取消' }
  return labels[status] || status
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

// 初始化
onMounted(async () => {
  await fetchDashboardData()
})
</script>

<style scoped>
.purchaser-dashboard {
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

/* 页面头部 */
.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.header-left h1 {
  font-size: 28px;
  color: #303133;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h1 .el-icon {
  color: #409eff;
}

.welcome-text {
  color: #909399;
  font-size: 14px;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 标签页 */
.dashboard-tabs {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.dashboard-tabs :deep(.el-tabs__header) {
  margin: 0;
  background: #f5f7fa;
  border-bottom: 2px solid #e4e7ed;
}

.dashboard-tabs :deep(.el-tabs__nav) {
  border: none;
}

.dashboard-tabs :deep(.el-tabs__item) {
  border: none;
  padding: 0 24px;
  height: 56px;
  line-height: 56px;
  font-size: 15px;
  color: #606266;
}

.dashboard-tabs :deep(.el-tabs__item.is-active) {
  color: #409eff;
  background: white;
  font-weight: 600;
}

.dashboard-tabs :deep(.el-tabs__item:hover) {
  color: #409eff;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-content {
  padding: 24px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0;
  transition: opacity 0.3s;
}

.stat-card.recommendations::before {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.stat-card.lifestyle::before {
  background: linear-gradient(135deg, rgba(246, 211, 101, 0.1) 0%, rgba(253, 160, 133, 0.1) 100%);
}

.stat-card.transportation::before {
  background: linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.1) 100%);
}

.stat-card.carpooling::before {
  background: linear-gradient(135deg, rgba(67, 233, 123, 0.1) 0%, rgba(56, 249, 215, 0.1) 100%);
}

.stat-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.stat-card:hover::before {
  opacity: 1;
}

.stat-card.recommendations .stat-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card.lifestyle .stat-icon {
  background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
}

.stat-card.transportation .stat-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-card.carpooling .stat-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  color: #909399;
  font-size: 14px;
  font-weight: 500;
}

.stat-arrow {
  font-size: 20px;
  color: #c0c4cc;
  transition: all 0.3s;
}

.stat-card:hover .stat-arrow {
  color: #409eff;
  transform: translateX(4px);
}

/* 快捷操作 */
.quick-actions {
  margin-bottom: 24px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  flex: 1;
  min-width: 140px;
}

/* 最新推荐 */
.latest-recommendations,
.my-requirements {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.card-header .el-button {
  margin-left: auto;
}

.loading-container {
  padding: 20px;
}

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.recommendation-item {
  border: 2px solid #ebeef5;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
  position: relative;
}

.recommendation-item:hover {
  border-color: #409eff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.2);
  transform: translateY(-4px);
}

.item-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 16px;
}

.item-badge.product {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.item-badge.announcement {
  background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
  color: white;
}

.recommendation-item h4 {
  margin: 0 0 8px;
  font-size: 15px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-description {
  color: #909399;
  font-size: 13px;
  margin-bottom: 12px;
  min-height: 36px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.item-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
}

.item-meta .price {
  color: #f56c6c;
  font-weight: 600;
}

.item-meta .distance {
  color: #67c23a;
}

.item-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.item-actions .el-button {
  flex: 1;
}

/* 订单和需求列表 */
.orders-list,
.requirements-manage {
  padding: 20px;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .recommendations-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .purchaser-dashboard {
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
    padding: 20px;
  }

  .header-right {
    width: 100%;
    flex-direction: column;
  }

  .header-right .el-button {
    width: 100%;
  }

  .stats-cards {
    grid-template-columns: 1fr;
  }

  .recommendations-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .el-button {
    width: 100%;
  }

  .dashboard-tabs :deep(.el-tabs__item) {
    padding: 0 16px;
    font-size: 14px;
  }

  .tab-content {
    padding: 16px;
  }
}
</style>
