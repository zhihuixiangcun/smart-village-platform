<template>
  <div class="service-hall" :class="{ 'large-text-mode': isLargeText }">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>在线办事大厅</h1>
      <p class="subtitle">足不出户,在线办理各项业务</p>
    </div>

    <!-- 办事分类Tab -->
    <el-tabs v-model="activeCategory" class="service-tabs">
      <el-tab-pane label="全部" name="all">
        <template #label>
          <div class="tab-label">
            <el-icon><Grid /></el-icon>
            <span>全部服务</span>
          </div>
        </template>
      </el-tab-pane>

      <el-tab-pane label="证件办理" name="document">
        <template #label>
          <div class="tab-label">
            <el-icon><Document /></el-icon>
            <span>证件办理</span>
          </div>
        </template>
      </el-tab-pane>

      <el-tab-pane label="福利申请" name="welfare">
        <template #label>
          <div class="tab-label">
            <el-icon><Present /></el-icon>
            <span>福利申请</span>
          </div>
        </template>
      </el-tab-pane>

      <el-tab-pane label="证明开具" name="certificate">
        <template #label>
          <div class="tab-label">
            <el-icon><Stamp /></el-icon>
            <span>证明开具</span>
          </div>
        </template>
      </el-tab-pane>

      <el-tab-pane label="我的申请" name="my-applications">
        <template #label>
          <div class="tab-label">
            <el-icon><List /></el-icon>
            <span>我的申请</span>
            <el-badge v-if="applicationCount > 0" :value="applicationCount" class="tab-badge" />
          </div>
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- 服务列表 -->
    <div class="service-list" v-if="activeCategory !== 'my-applications'">
      <!-- 搜索框 -->
      <div class="search-bar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索服务名称"
          size="large"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button icon="Microphone" @click="voiceSearch" />
          </template>
        </el-input>
      </div>

      <!-- 服务卡片网格 -->
      <div class="service-grid">
        <div
          v-for="service in filteredServices"
          :key="service.id"
          class="service-card"
          @click="openService(service)"
        >
          <div class="service-icon" :style="{ background: service.color }">
            <el-icon :size="48" color="white">
              <component :is="service.icon" />
            </el-icon>
          </div>
          <div class="service-info">
            <h3>{{ service.name }}</h3>
            <p class="service-desc">{{ service.description }}</p>
            <div class="service-meta">
              <el-tag size="small" :type="service.type === 'document' ? 'primary' : service.type === 'welfare' ? 'success' : 'warning'">
                {{ service.typeName }}
              </el-tag>
              <span class="process-time">
                <el-icon><Clock /></el-icon>
                {{ service.processTime }}
              </span>
            </div>
          </div>
          <div class="service-arrow">
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <el-empty
        v-if="filteredServices.length === 0"
        description="未找到相关服务"
        :image-size="200"
      >
        <el-button type="primary" @click="clearSearch">清除搜索</el-button>
      </el-empty>
    </div>

    <!-- 我的申请列表 -->
    <div class="my-applications" v-else>
      <div class="applications-stats">
        <div class="stat-card">
          <div class="stat-number">{{ stats.pending }}</div>
          <div class="stat-label">待审核</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.approved }}</div>
          <div class="stat-label">已通过</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.rejected }}</div>
          <div class="stat-label">未通过</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.processing }}</div>
          <div class="stat-label">办理中</div>
        </div>
      </div>

      <div class="applications-list">
        <div
          v-for="app in applications"
          :key="app.id"
          class="application-item"
          @click="viewApplication(app)"
        >
          <div class="app-icon">
            <el-icon :size="32" :color="getServiceColor(app.serviceType)">
              <component :is="getServiceIcon(app.serviceType)" />
            </el-icon>
          </div>
          <div class="app-content">
            <h4>{{ app.serviceName }}</h4>
            <p class="app-time">申请时间: {{ app.applyTime }}</p>
          </div>
          <div class="app-status">
            <el-tag :type="getStatusType(app.status)">
              {{ getStatusLabel(app.status) }}
            </el-tag>
          </div>
          <div class="app-arrow">
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </div>

      <el-empty
        v-if="applications.length === 0"
        description="暂无申请记录"
        :image-size="200"
      >
        <el-button type="primary" @click="goToServices">去办理业务</el-button>
      </el-empty>
    </div>

    <!-- 办事流程对话框 -->
    <el-dialog
      v-model="showServiceDialog"
      :title="currentService?.name"
      width="90%"
      :close-on-click-modal="false"
      top="5vh"
    >
      <component
        :is="serviceComponent"
        v-if="currentService && showServiceDialog"
        :service="currentService"
        @close="showServiceDialog = false"
        @submitted="handleSubmitted"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Grid,
  Document,
  Present,
  Stamp,
  List,
  Search,
  Microphone,
  Clock,
  ArrowRight,
  User,
  House,
  Promotion,
  FirstAid,
  Money,
  Calendar,
  Bell
} from '@element-plus/icons-vue'
import { useLargeText } from '@/composables/useLargeText'
import { useVoiceInput } from '@/composables/useVoiceInput'

const router = useRouter()

// Composables
const { isLargeText } = useLargeText()
const { startListening } = useVoiceInput()

// 状态
const activeCategory = ref('all')
const searchQuery = ref('')
const showServiceDialog = ref(false)
const currentService = ref(null)
const applicationCount = ref(3)

// 服务列表数据
const services = ref([
  {
    id: 'id-card',
    name: '身份证补办/换领',
    description: '身份证丢失、损坏或到期,可在线申请补办或换领',
    icon: 'User',
    color: '#409eff',
    type: 'document',
    typeName: '证件办理',
    processTime: '7-15个工作日',
    component: 'IdCardApplication'
  },
  {
    id: 'household',
    name: '户口本办理',
    description: '户口本补办、换领、变更登记等业务',
    icon: 'House',
    color: '#67c23a',
    type: 'document',
    typeName: '证件办理',
    processTime: '5-10个工作日',
    component: 'HouseholdApplication'
  },
  {
    id: 'marriage',
    name: '结婚登记预约',
    description: '在线预约结婚登记,减少现场等待时间',
    icon: 'Promotion',
    color: '#e6a23c',
    type: 'document',
    typeName: '证件办理',
    processTime: '1-3个工作日',
    component: 'MarriageApplication'
  },
  {
    id: 'subsistence',
    name: '低保申请',
    description: '家庭经济困难可申请最低生活保障',
    icon: 'Money',
    color: '#f56c6c',
    type: 'welfare',
    typeName: '福利申请',
    processTime: '15-30个工作日',
    component: 'SubsistenceApplication'
  },
  {
    id: 'disability',
    name: '残疾补贴申请',
    description: '残疾人可申请生活补贴和护理补贴',
    icon: 'FirstAid',
    color: '#909399',
    type: 'welfare',
    typeName: '福利申请',
    processTime: '10-20个工作日',
    component: 'DisabilityApplication'
  },
  {
    id: 'elderly',
    name: '老年补贴申请',
    description: '60岁以上老人可申请高龄补贴',
    icon: 'Calendar',
    color: '#00bcd4',
    type: 'welfare',
    typeName: '福利申请',
    processTime: '7-15个工作日',
    component: 'ElderlyApplication'
  },
  {
    id: 'residence',
    name: '居住证明',
    description: '开具居住证明,用于办理各项业务',
    icon: 'Stamp',
    color: '#ff6b6b',
    type: 'certificate',
    typeName: '证明开具',
    processTime: '1-3个工作日',
    component: 'ResidenceCertificate'
  },
  {
    id: 'income',
    name: '收入证明',
    description: '开具收入证明,用于贷款、签证等',
    icon: 'Document',
    color: '#4ecdc4',
    type: 'certificate',
    typeName: '证明开具',
    processTime: '1-3个工作日',
    component: 'IncomeCertificate'
  },
  {
    id: 'health',
    name: '健康证明',
    description: '开具健康证明,用于体检、入职等',
    icon: 'Bell',
    color: '#95e1d3',
    type: 'certificate',
    typeName: '证明开具',
    processTime: '1-2个工作日',
    component: 'HealthCertificate'
  }
])

// 我的申请列表
const applications = ref([
  {
    id: 1,
    serviceName: '身份证补办',
    serviceType: 'id-card',
    status: 'processing',
    applyTime: '2025-01-03 14:30'
  },
  {
    id: 2,
    serviceName: '老年补贴申请',
    serviceType: 'elderly',
    status: 'pending',
    applyTime: '2025-01-02 10:15'
  },
  {
    id: 3,
    serviceName: '居住证明',
    serviceType: 'residence',
    status: 'approved',
    applyTime: '2025-01-01 09:20'
  }
])

// 统计数据
const stats = computed(() => {
  return {
    pending: applications.value.filter(a => a.status === 'pending').length,
    approved: applications.value.filter(a => a.status === 'approved').length,
    rejected: applications.value.filter(a => a.status === 'rejected').length,
    processing: applications.value.filter(a => a.status === 'processing').length
  }
})

// 过滤后的服务列表
const filteredServices = computed(() => {
  let result = services.value

  // 分类过滤
  if (activeCategory.value !== 'all') {
    result = result.filter(s => s.type === activeCategory.value)
  }

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query)
    )
  }

  return result
})

// 当前服务组件
const serviceComponent = computed(() => {
  if (!currentService.value) return null
  // 动态导入组件
  return () => import(`@/views/services/${currentService.value.component}.vue`)
})

// 搜索处理
const handleSearch = () => {
  // 搜索逻辑已在computed中实现
}

// 清除搜索
const clearSearch = () => {
  searchQuery.value = ''
}

// 语音搜索
const voiceSearch = async () => {
  try {
    const text = await startListening()
    searchQuery.value = text
    ElMessage.success(`已搜索: ${text}`)
  } catch (error) {
    console.error('Voice search error:', error)
  }
}

// 打开服务
const openService = (service) => {
  currentService.value = service
  showServiceDialog.value = true
}

// 查看申请详情
const viewApplication = (app) => {
  router.push(`/services/application/${app.id}`)
}

// 跳转到服务列表
const goToServices = () => {
  activeCategory.value = 'all'
}

// 申请提交成功处理
const handleSubmitted = (data) => {
  ElMessage.success('申请已提交')
  showServiceDialog.value = false

  // 添加到申请列表
  applications.value.unshift({
    id: Date.now(),
    serviceName: currentService.value.name,
    serviceType: currentService.value.id,
    status: 'pending',
    applyTime: new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  })

  applicationCount.value++
}

// 获取服务图标
const getServiceIcon = (type) => {
  const iconMap = {
    'id-card': User,
    'household': House,
    'marriage': Promotion,
    'subsistence': Money,
    'disability': FirstAid,
    'elderly': Calendar,
    'residence': Stamp,
    'income': Document,
    'health': Bell
  }
  return iconMap[type] || Document
}

// 获取服务颜色
const getServiceColor = (type) => {
  const colorMap = {
    'id-card': '#409eff',
    'household': '#67c23a',
    'marriage': '#e6a23c',
    'subsistence': '#f56c6c',
    'disability': '#909399',
    'elderly': '#00bcd4',
    'residence': '#ff6b6b',
    'income': '#4ecdc4',
    'health': '#95e1d3'
  }
  return colorMap[type] || '#409eff'
}

// 获取状态类型
const getStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    processing: 'primary',
    approved: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取状态标签
const getStatusLabel = (status) => {
  const labelMap = {
    pending: '待审核',
    processing: '办理中',
    approved: '已通过',
    rejected: '未通过'
  }
  return labelMap[status] || status
}

onMounted(() => {
  // 加载申请列表
})
</script>

<style lang="scss" scoped>
.service-hall {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;

  .page-header {
    text-align: center;
    margin-bottom: 32px;

    h1 {
      font-size: 32px;
      color: #303133;
      margin: 0 0 8px 0;
    }

    .subtitle {
      font-size: 16px;
      color: #909399;
      margin: 0;
    }
  }

  .service-tabs {
    margin-bottom: 32px;

    :deep(.el-tabs__header) {
      margin-bottom: 24px;
    }

    :deep(.el-tabs__nav-wrap) {
      &::after {
        display: none;
      }
    }

    :deep(.el-tabs__item) {
      font-size: 16px;
      padding: 0 24px;

      .tab-label {
        display: flex;
        align-items: center;
        gap: 8px;

        .tab-badge {
          margin-left: 4px;
        }
      }
    }
  }

  .service-list {
    .search-bar {
      margin-bottom: 24px;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .service-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;

      .service-card {
        display: flex;
        align-items: center;
        padding: 24px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .service-icon {
          width: 80px;
          height: 80px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 20px;
          flex-shrink: 0;
        }

        .service-info {
          flex: 1;
          min-width: 0;

          h3 {
            margin: 0 0 8px 0;
            font-size: 18px;
            color: #303133;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .service-desc {
            margin: 0 0 12px 0;
            font-size: 14px;
            color: #909399;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .service-meta {
            display: flex;
            align-items: center;
            gap: 12px;

            .process-time {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 13px;
              color: #909399;

              .el-icon {
                font-size: 14px;
              }
            }
          }
        }

        .service-arrow {
          margin-left: 16px;
          color: #c0c4cc;

          .el-icon {
            font-size: 20px;
          }
        }
      }
    }
  }

  .my-applications {
    .applications-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 32px;

      .stat-card {
        padding: 24px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        text-align: center;

        .stat-number {
          font-size: 36px;
          font-weight: bold;
          color: #409eff;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          color: #909399;
        }
      }
    }

    .applications-list {
      .application-item {
        display: flex;
        align-items: center;
        padding: 20px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        margin-bottom: 16px;
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
        }

        .app-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: #f5f7fa;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 16px;
        }

        .app-content {
          flex: 1;

          h4 {
            margin: 0 0 4px 0;
            font-size: 16px;
            color: #303133;
          }

          .app-time {
            margin: 0;
            font-size: 13px;
            color: #909399;
          }
        }

        .app-status {
          margin-right: 16px;
        }

        .app-arrow {
          color: #c0c4cc;

          .el-icon {
            font-size: 18px;
          }
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .service-hall {
    padding: 16px;

    .page-header {
      h1 {
        font-size: 24px;
      }

      .subtitle {
        font-size: 14px;
      }
    }

    .service-tabs {
      :deep(.el-tabs__item) {
        font-size: 14px;
        padding: 0 16px;
      }
    }

    .service-list {
      .service-grid {
        grid-template-columns: 1fr;
        gap: 16px;

        .service-card {
          .service-icon {
            width: 64px;
            height: 64px;
            margin-right: 16px;
          }

          .service-info {
            h3 {
              font-size: 16px;
            }

            .service-desc {
              font-size: 13px;
            }
          }
        }
      }
    }

    .my-applications {
      .applications-stats {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;

        .stat-card {
          padding: 16px;

          .stat-number {
            font-size: 28px;
          }

          .stat-label {
            font-size: 13px;
          }
        }
      }
    }
  }
}

// 大字模式适配
.large-text-mode {
  .service-hall {
    .page-header {
      h1 {
        font-size: 40px;
      }

      .subtitle {
        font-size: 20px;
      }
    }

    .service-tabs {
      :deep(.el-tabs__item) {
        font-size: 20px;
        padding: 0 32px;
      }
    }

    .service-list {
      .service-grid {
        .service-card {
          padding: 32px;

          .service-icon {
            width: 96px;
            height: 96px;
          }

          .service-info {
            h3 {
              font-size: 22px;
            }

            .service-desc {
              font-size: 17px;
            }
          }
        }
      }
    }

    .my-applications {
      .applications-stats {
        .stat-card {
          padding: 32px;

          .stat-number {
            font-size: 44px;
          }

          .stat-label {
            font-size: 17px;
          }
        }
      }

      .applications-list {
        .application-item {
          padding: 28px;

          .app-content {
            h4 {
              font-size: 19px;
            }

            .app-time {
              font-size: 15px;
            }
          }
        }
      }
    }
  }
}
</style>
