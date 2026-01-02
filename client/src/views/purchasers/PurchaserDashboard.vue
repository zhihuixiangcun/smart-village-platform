<template>
  <div class="purchaser-dashboard">
    <div class="page-header">
      <h1>采购商工作台</h1>
      <p>欢迎回来，{{ purchaserInfo?.name || '采购商' }}</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card" @click="goToRecommendations">
        <div class="stat-icon recommendations">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.recommendations }}</div>
          <div class="stat-label">智能推荐</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon suppliers">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.suppliers }}</div>
          <div class="stat-label">已关注供应商</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orders">
          <el-icon><ShoppingCart /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.orders }}</div>
          <div class="stat-label">我的订单</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon messages">
          <el-icon><ChatDotRound /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.messages }}</div>
          <div class="stat-label">未读消息</div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <el-card>
        <template #header>
          <div class="card-header">
            <el-icon><Operation /></el-icon>
            <span>快捷操作</span>
          </div>
        </template>
        <div class="action-buttons">
          <el-button type="primary" @click="goToRecommendations">
            <el-icon><TrendCharts /></el-icon>
            查看智能推荐
          </el-button>
          <el-button @click="handleSearchProducts">
            <el-icon><Search /></el-icon>
            搜索农产品
          </el-button>
          <el-button @click="handleViewSuppliers">
            <el-icon><User /></el-icon>
            浏览供应商
          </el-button>
          <el-button @click="handlePostRequirement">
            <el-icon><EditPen /></el-icon>
            发布采购需求
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 最新推荐 -->
    <div class="latest-recommendations">
      <el-card>
        <template #header>
          <div class="card-header">
            <el-icon><Star /></el-icon>
            <span>最新推荐</span>
            <el-button type="primary" text @click="goToRecommendations">查看更多</el-button>
          </div>
        </template>
        <div v-if="loading" class="loading-container">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>加载中...</span>
        </div>
        <div v-else-if="recommendations.length === 0" class="empty-container">
          <el-empty description="暂无推荐内容">
            <el-button type="primary" @click="fetchRecommendations">刷新</el-button>
          </el-empty>
        </div>
        <div v-else class="recommendations-grid">
          <div v-for="item in recommendations" :key="item.id" class="recommendation-item">
            <div class="item-type" :class="item.type">
              {{ item.type === 'product' ? '农产品' : '公告' }}
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
              <el-button size="small" @click="handleViewDetail(item)">查看详情</el-button>
              <el-button size="small" type="primary" @click="handleContact(item)">联系供应商</el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 我的采购需求 -->
    <div class="my-requirements">
      <el-card>
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>我的采购需求</span>
            <el-button type="primary" text @click="handlePostRequirement">发布新需求</el-button>
          </div>
        </template>
        <el-table :data="requirements" stripe>
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
          <el-table-column label="操作" width="200">
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
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  TrendCharts, User, ShoppingCart, ChatDotRound, Operation, Search, EditPen,
  Star, PriceTag, Location, Document, Loading
} from '@element-plus/icons-vue'
import api from '@/api'

const router = useRouter()
const loading = ref(false)
const purchaserInfo = ref(null)
const recommendations = ref([])
const requirements = ref([])

const stats = reactive({
  recommendations: 0,
  suppliers: 0,
  orders: 0,
  messages: 0
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

// 获取统计数据
const fetchStats = async () => {
  try {
    // 这里可以调用实际的统计API
    stats.recommendations = recommendations.value.length
    stats.suppliers = 12
    stats.orders = 8
    stats.messages = 3
  } catch (error) {
    console.error('获取统计数据失败', error)
  }
}

// 获取智能推荐
const fetchRecommendations = async () => {
  loading.value = true
  try {
    const response = await api.get('/api/v1/purchaser/recommendations', {
      params: { limit: 6 }
    })
    if (response.success) {
      recommendations.value = response.data.recommendations || []
    }
  } catch (error) {
    console.error('获取推荐失败', error)
  } finally {
    loading.value = false
  }
}

// 获取我的采购需求
const fetchRequirements = async () => {
  try {
    // 这里可以调用实际的采购需求API
    requirements.value = [
      { productCategory: '蔬菜', quantity: '500kg', budget: '2000元', status: 'pending', createdAt: new Date() },
      { productCategory: '水果', quantity: '300kg', budget: '3000元', status: 'active', createdAt: new Date() }
    ]
  } catch (error) {
    console.error('获取采购需求失败', error)
  }
}

// 跳转到推荐页面
const goToRecommendations = () => {
  router.push('/purchaser/recommendations')
}

// 快捷操作
const handleSearchProducts = () => {
  router.push('/agriculture/products')
}

const handleViewSuppliers = () => {
  router.push('/agriculture/farmers')
}

const handlePostRequirement = () => {
  ElMessage.info('发布采购需求功能开发中')
}

const handleViewDetail = (item) => {
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

const handleContact = (item) => {
  ElMessage.success('正在跳转到聊天界面...')
  // router.push(`/chat?supplier=${item.supplier?.id}`)
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
  await fetchPurchaserInfo()
  await fetchRecommendations()
  await fetchRequirements()
  await fetchStats()
})
</script>

<style scoped>
.purchaser-dashboard { padding: 20px; background: #f5f7fa; min-height: 100vh; }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 28px; color: #333; margin-bottom: 8px; }
.page-header p { color: #666; font-size: 14px; }

.stats-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }
.stat-card { background: white; border-radius: 12px; padding: 20px; display: flex; align-items: center; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.stat-card:hover { transform: translateY(-4px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
.stat-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 16px; font-size: 24px; color: white; }
.stat-icon.recommendations { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-icon.suppliers { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.stat-icon.orders { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.stat-icon.messages { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.stat-content { flex: 1; }
.stat-value { font-size: 32px; font-weight: bold; color: #333; line-height: 1; }
.stat-label { color: #666; font-size: 14px; margin-top: 8px; }

.quick-actions, .latest-recommendations, .my-requirements { margin-bottom: 24px; }
.card-header { display: flex; align-items: center; gap: 8px; font-weight: 500; }
.card-header .el-button { margin-left: auto; }

.action-buttons { display: flex; gap: 12px; flex-wrap: wrap; }

.loading-container { display: flex; align-items: center; justify-content: center; padding: 40px; gap: 12px; color: #909399; }
.empty-container { padding: 20px; }

.recommendations-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.recommendation-item { border: 1px solid #ebeef5; border-radius: 8px; padding: 16px; transition: all 0.2s; }
.recommendation-item:hover { border-color: #667eea; box-shadow: 0 2px 8px rgba(102,126,234,0.2); }
.item-type { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-bottom: 8px; }
.item-type.product { background: #ecf5ff; color: #409eff; }
.item-type.announcement { background: #f0f9ff; color: #67c23a; }
.recommendation-item h4 { margin: 8px 0; font-size: 16px; color: #333; }
.item-description { color: #666; font-size: 14px; margin-bottom: 12px; min-height: 40px; }
.item-meta { display: flex; gap: 16px; margin-bottom: 12px; color: #909399; font-size: 13px; }
.item-meta span { display: flex; align-items: center; gap: 4px; }
.item-actions { display: flex; gap: 8px; }
</style>
