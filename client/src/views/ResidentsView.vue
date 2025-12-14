<template>
  <div class="residents-management">
    <!-- 离线管理器 -->
    <offline-manager />

    <!-- PWA管理器 -->
    <pwa-manager ref="pwaManager" />

    <!-- 面包屑导航 -->
    <breadcrumb />

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">
            <el-icon><User /></el-icon>
            村民数字化档案系统
          </h1>
          <p class="page-subtitle">一户一码 • 隐私保护 • 血缘关系 • 智能管理</p>
        </div>
        <div class="header-right">
          <el-button
            type="primary"
            @click="showAddDialog"
            icon="Plus"
            v-permission="['resident:write']"
          >
            新增村民档案
          </el-button>
          <el-button
            type="success"
            @click="showHouseholdCode"
            icon="QrCode"
            v-permission="['household:read']"
          >
            一户一码管理
          </el-button>
          <el-button
            type="warning"
            @click="showFamilyTree"
            icon="Share"
          >
            家族关系图
          </el-button>
          <el-button
            type="info"
            @click="showCertificateService"
            icon="Document"
            v-permission="['certificate:apply']"
          >
            在线办证
          </el-button>
          <el-button
            type="warning"
            @click="showQrScanner"
            icon="QrCode"
          >
            扫码查询
          </el-button>
          <el-dropdown @command="handleBatchAction">
            <el-button icon="MoreFilled">
              批量操作<el-icon class="el-icon--right"><arrow-down /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="export" icon="Download">导出数据</el-dropdown-item>
                <el-dropdown-item command="import" icon="Upload">导入数据</el-dropdown-item>
                <el-dropdown-item command="delete" icon="Delete" divided>批量删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card total">
            <div class="stat-icon">
              <el-icon size="40"><UserFilled /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ statistics.totalResidents }}</div>
              <div class="stat-label">总人数</div>
              <div class="stat-trend" :class="{ 'trend-up': statistics.residentChange > 0 }">
                <el-icon><TrendCharts /></el-icon>
                {{ statistics.residentChange > 0 ? '+' : '' }}{{ statistics.residentChange }}
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card households">
            <div class="stat-icon">
              <el-icon size="40"><House /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ statistics.totalHouseholds }}</div>
              <div class="stat-label">总户数</div>
              <div class="stat-trend">
                平均 {{ (statistics.totalResidents / statistics.totalHouseholds).toFixed(1) }} 人/户
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card elderly">
            <div class="stat-icon">
              <el-icon size="40"><Avatar /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ statistics.elderlyCount }}</div>
              <div class="stat-label">老年人口</div>
              <div class="stat-trend">
                占比 {{ ((statistics.elderlyCount / statistics.totalResidents) * 100).toFixed(1) }}%
              </div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card children">
            <div class="stat-icon">
              <el-icon size="40"><Sunny /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ statistics.childrenCount }}</div>
              <div class="stat-label">儿童人口</div>
              <div class="stat-trend">
                占比 {{ ((statistics.childrenCount / statistics.totalResidents) * 100).toFixed(1) }}%
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 高级搜索组件 -->
    <resident-advanced-search
      v-model="searchParams"
      @search="handleAdvancedSearch"
      @reset="handleSearchReset"
      ref="advancedSearchRef"
    />

    <!-- 数据表格 -->
    <el-card shadow="never">
      <template #header>
        <div class="table-header">
          <span>村民档案列表 ({{ pagination.total }} 人)</span>
          <div class="table-actions">
            <el-button
              size="small"
              type="danger"
              :disabled="!selectedResidents.length"
              @click="batchDelete"
              icon="Delete"
              v-permission="['resident:delete']"
            >
              批量删除 ({{ selectedResidents.length }})
            </el-button>
            <el-button size="small" @click="refreshTable" icon="Refresh">
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        ref="residentTable"
        :data="residents"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
        height="500"
      >
        <el-table-column type="selection" width="50" fixed="left" />

        <el-table-column prop="householdCode" label="户码" width="120" fixed="left">
          <template #default="scope">
            <el-button
              type="text"
              @click="showQRCode(scope.row)"
              icon="QrCode"
              size="small"
            >
              {{ scope.row.householdCode }}
            </el-button>
          </template>
        </el-table-column>

        <el-table-column prop="avatar" label="头像" width="80">
          <template #default="scope">
            <el-avatar
              :size="40"
              :src="scope.row.avatar"
              :icon="UserFilled"
              @click="previewAvatar(scope.row)"
              style="cursor: pointer;"
            />
          </template>
        </el-table-column>

        <el-table-column prop="name" label="姓名" width="100" sortable="custom" />

        <el-table-column prop="gender" label="性别" width="80">
          <template #default="scope">
            <el-tag :type="scope.row.gender === 'male' ? 'primary' : 'danger'" size="small">
              {{ scope.row.gender === 'male' ? '男' : '女' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="age" label="年龄" width="80" sortable="custom" />

        <el-table-column prop="idCard" label="身份证号" width="180">
          <template #default="scope">
            <div class="id-card-cell">
              <span v-if="scope.row.idCardVisible">{{ scope.row.idCard }}</span>
              <span v-else class="masked-id">{{ maskIdCard(scope.row.idCard) }}</span>
              <el-button
                type="text"
                size="small"
                @click="toggleIdCardVisibility(scope.row)"
                :icon="scope.row.idCardVisible ? 'Hide' : 'View'"
                v-permission="['resident:read']"
              />
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="phone" label="联系电话" width="130">
          <template #default="scope">
            <span>{{ maskPhone(scope.row.phone) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="address" label="居住地址" min-width="200" show-overflow-tooltip />

        <el-table-column prop="healthStatus" label="健康状态" width="100">
          <template #default="scope">
            <el-tag
              :type="getHealthStatusType(scope.row.healthStatus)"
              size="small"
            >
              {{ getHealthStatusText(scope.row.healthStatus) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="familyRole" label="家庭角色" width="100" />

        <el-table-column prop="createTime" label="建档时间" width="110" sortable="custom">
          <template #default="scope">
            {{ formatDate(scope.row.createTime) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button-group size="small">
              <el-button
                type="primary"
                @click="viewResident(scope.row)"
                icon="View"
              >
                查看
              </el-button>
              <el-button
                type="success"
                @click="editResident(scope.row)"
                icon="Edit"
                v-permission="['resident:write']"
              >
                编辑
              </el-button>
              <el-dropdown @command="(cmd) => handleRowAction(cmd, scope.row)">
                <el-button icon="MoreFilled" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="family" icon="Share">家庭成员</el-dropdown-item>
                    <el-dropdown-item command="relationship" icon="Connection">关系管理</el-dropdown-item>
                    <el-dropdown-item command="category" icon="PriceTag">标签管理</el-dropdown-item>
                    <el-dropdown-item command="archive" icon="FolderOpened">家族档案</el-dropdown-item>
                    <el-dropdown-item command="digital" icon="Monitor">数字化档案</el-dropdown-item>
                    <el-dropdown-item command="certificate" icon="Document">办证服务</el-dropdown-item>
                    <el-dropdown-item command="history" icon="Clock">变更历史</el-dropdown-item>
                    <el-dropdown-item command="qrcode" icon="QrCode">二维码</el-dropdown-item>
                    <el-dropdown-item
                      command="delete"
                      icon="Delete"
                      divided
                      v-permission="['resident:delete']"
                    >
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑村民对话框 -->
    <resident-form-dialog
      v-model="residentDialogVisible"
      :resident="currentResident"
      :mode="dialogMode"
      @confirm="handleResidentSave"
    />

    <!-- 村民详情对话框 -->
    <resident-detail-dialog
      v-model="detailDialogVisible"
      :resident="currentResident"
    />

    <!-- 家庭成员对话框 -->
    <family-member-dialog
      v-model="familyDialogVisible"
      :resident="currentResident"
    />

    <!-- 一户一码管理系统 -->
    <household-code-system
      v-model="householdCodeDialogVisible"
    />

    <!-- 家族关系图对话框 -->
    <family-tree-dialog
      v-model="familyTreeDialogVisible"
    />

    <!-- 二维码预览对话框 -->
    <qr-code-dialog
      v-model="qrCodeDialogVisible"
      :resident="currentResident"
    />

    <!-- 头像预览对话框 -->
    <el-dialog v-model="avatarPreviewVisible" title="头像预览" width="400px">
      <div class="avatar-preview">
        <el-image
          :src="previewAvatarUrl"
          fit="contain"
          style="width: 100%; height: 300px;"
        />
      </div>
    </el-dialog>

    <!-- 导入数据对话框 -->
    <import-data-dialog
      v-model="importDialogVisible"
      @success="refreshTable"
    />

    <!-- 在线办证服务对话框 -->
    <certificate-service-dialog
      v-model="certificateDialogVisible"
      :resident="currentResident"
      @success="handleCertificateSuccess"
    />

    <!-- 二维码扫描对话框 -->
    <qr-scanner-dialog
      v-model="qrScannerDialogVisible"
      @scan-success="handleQrScanSuccess"
    />

    <!-- 家族档案对话框 -->
    <family-archive-dialog
      v-model="familyArchiveDialogVisible"
      :resident="currentResident"
      @refresh="refreshTable"
    />

    <!-- 数字化档案对话框 -->
    <digital-archive-dialog
      v-model="digitalArchiveDialogVisible"
      :resident="currentResident"
      @refresh="refreshTable"
    />

    <!-- 家庭关系管理对话框 -->
    <family-relationship-manager
      v-model="familyRelationshipDialogVisible"
      :resident="currentResident"
      @refresh="refreshTable"
    />

    <!-- 村民分类标签管理对话框 -->
    <resident-category-manager
      v-model="categoryManagerDialogVisible"
      :resident="currentResident"
      @refresh="refreshTable"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User, UserFilled, House, Avatar, Sunny, TrendCharts,
  ArrowDown, Search, Refresh, Plus, QrCode, Share,
  MoreFilled, View, Edit, Delete, Hide, Clock, Upload, Download, Document, FolderOpened, Monitor
} from '@element-plus/icons-vue'

// 导入组件
import Breadcrumb from '@/components/common/Breadcrumb.vue'
import OfflineManager from '@/components/common/OfflineManager.vue'
import PWAManager from '@/components/common/PWAManager.vue'
import ResidentFormDialog from './residents/ResidentFormDialog.vue'
import ResidentDetailDialog from './residents/ResidentDetailDialog.vue'
import FamilyMemberDialog from './residents/FamilyMemberDialog.vue'
import HouseholdCodeDialog from './residents/HouseholdCodeDialog.vue'
import HouseholdCodeSystem from './residents/HouseholdCodeSystem.vue'
import FamilyTreeDialog from './residents/FamilyTreeDialog.vue'
import QrCodeDialog from './residents/QrCodeDialog.vue'
import ImportDataDialog from './residents/ImportDataDialog.vue'
import CertificateServiceDialog from './residents/CertificateServiceDialog.vue'
import QrScannerDialog from './residents/QrScannerDialog.vue'
import FamilyArchiveDialog from './residents/FamilyArchiveDialog.vue'
import DigitalArchiveDialog from './residents/DigitalArchiveDialog.vue'
import ResidentAdvancedSearch from './residents/ResidentAdvancedSearch.vue'
import FamilyRelationshipManager from './residents/FamilyRelationshipManager.vue'
import ResidentCategoryManager from './residents/ResidentCategoryManager.vue'

// 导入API和离线功能
import { residentAPI } from '@/api/resident'
import { useUserStore } from '@/stores/user'
import { useOfflineStorage } from '@/composables/useOfflineStorage'

const userStore = useUserStore()

// 离线存储初始化
const {
  isOnline,
  saveToOfflineStorage,
  getFromOfflineStorage,
  deleteFromOfflineStorage,
  syncData,
  isOfflineMode,
  hasPendingOperations
} = useOfflineStorage({
  keyPrefix: 'residents',
  autoSync: true,
  syncInterval: 30000
})

// 响应式数据
const loading = ref(false)
const residents = ref([])
const selectedResidents = ref([])
const showAdvancedSearch = ref(false)
const advancedSearchRef = ref()
const searchParams = ref({})
const pwaManager = ref()

// 统计数据
const statistics = reactive({
  totalResidents: 0,
  totalHouseholds: 0,
  elderlyCount: 0,
  childrenCount: 0,
  residentChange: 0
})

// 搜索表单
const searchForm = reactive({
  keyword: '',
  gender: '',
  ageGroup: '',
  healthStatus: ''
})

// 高级搜索表单
const advancedForm = reactive({
  ageRange: [0, 100],
  address: [],
  householdType: '',
  maritalStatus: [],
  createTimeRange: []
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 对话框状态
const residentDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const familyDialogVisible = ref(false)
const householdCodeDialogVisible = ref(false)
const familyTreeDialogVisible = ref(false)
const qrCodeDialogVisible = ref(false)
const avatarPreviewVisible = ref(false)
const importDialogVisible = ref(false)
const certificateDialogVisible = ref(false)
const qrScannerDialogVisible = ref(false)
const familyArchiveDialogVisible = ref(false)
const digitalArchiveDialogVisible = ref(false)
const familyRelationshipDialogVisible = ref(false)
const categoryManagerDialogVisible = ref(false)

const currentResident = ref(null)
const dialogMode = ref('add') // 'add' | 'edit'
const previewAvatarUrl = ref('')

// 地址选项
const addressOptions = ref([
  {
    value: 'area1',
    label: '第一片区',
    children: [
      { value: 'street1', label: '主街道' },
      { value: 'street2', label: '次街道' }
    ]
  }
])

// 计算属性
const filteredResidents = computed(() => {
  return residents.value // 在实际项目中会根据搜索条件过滤
})

// 方法
const handleAdvancedSearch = (searchParams) => {
  loading.value = true

  try {
    // 使用高级搜索参数进行搜索
    searchResidents(searchParams)

    // 模拟搜索结果统计
    const mockStats = {
      total: Math.floor(Math.random() * 100) + 50,
      gender: {
        male: Math.floor(Math.random() * 30) + 20,
        female: Math.floor(Math.random() * 30) + 20
      },
      averageAge: Math.random() * 20 + 40,
      specialCount: Math.floor(Math.random() * 10) + 5
    }

    // 更新搜索结果统计
    if (advancedSearchRef.value) {
      advancedSearchRef.value.updateSearchResults(mockStats)
    }

    ElMessage.success(`搜索完成，找到 ${mockStats.total} 条记录`)
  } catch (error) {
    ElMessage.error('搜索失败')
  } finally {
    loading.value = false
  }
}

const handleSearchReset = () => {
  searchParams.value = {}
  Object.assign(searchForm, {
    keyword: '',
    gender: '',
    ageGroup: '',
    healthStatus: ''
  })
  Object.assign(advancedForm, {
    ageRange: [0, 100],
    address: [],
    householdType: '',
    maritalStatus: [],
    createTimeRange: []
  })
  searchResidents()
}

const searchResidents = async (customParams = null) => {
  loading.value = true
  try {
    const params = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      ...(customParams || searchForm),
      ...advancedForm
    }

    let response

    // 优先尝试从网络获取数据
    if (isOnline.value) {
      try {
        response = await residentAPI.getResidentList(params)

        if (response.success) {
          // 保存到离线存储
          await saveToOfflineStorage('residents', response.data, 'update')

          residents.value = response.data.list
          pagination.total = response.data.total

          // 更新统计信息
          updateStatistics()

          ElMessage.success('数据已更新')
        }
      } catch (error) {
        console.warn('网络请求失败，尝试使用离线数据:', error)
        // 网络失败，使用离线数据
        const offlineData = await getFromOfflineStorage('residents')
        if (offlineData) {
          residents.value = offlineData.list || []
          pagination.total = offlineData.total || 0
          updateStatistics()
          ElMessage.warning('使用离线数据，部分信息可能不是最新的')
        } else {
          throw error
        }
      }
    } else {
      // 离线模式，直接使用缓存数据
      const offlineData = await getFromOfflineStorage('residents')
      if (offlineData) {
        residents.value = offlineData.list || []
        pagination.total = offlineData.total || 0
        updateStatistics()
        ElMessage.info('当前离线模式，显示缓存数据')
      } else {
        ElMessage.warning('离线状态下暂无缓存数据')
        residents.value = []
        pagination.total = 0
      }
    }
  } catch (error) {
    ElMessage.error('获取村民数据失败: ' + error.message)
    residents.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  Object.assign(searchForm, {
    keyword: '',
    gender: '',
    ageGroup: '',
    healthStatus: ''
  })
  Object.assign(advancedForm, {
    ageRange: [0, 100],
    address: [],
    householdType: '',
    maritalStatus: [],
    createTimeRange: []
  })
  searchResidents()
}

const toggleAdvancedSearch = () => {
  showAdvancedSearch.value = !showAdvancedSearch.value
}

const handleSelectionChange = (selection) => {
  selectedResidents.value = selection
}

const handleSortChange = ({ prop, order }) => {
  // 处理排序
  searchResidents()
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  searchResidents()
}

const handleCurrentChange = (page) => {
  pagination.currentPage = page
  searchResidents()
}

const refreshTable = () => {
  searchResidents()
}

// 村民操作方法
const showAddDialog = () => {
  currentResident.value = null
  dialogMode.value = 'add'
  residentDialogVisible.value = true
}

const viewResident = (resident) => {
  currentResident.value = resident
  detailDialogVisible.value = true
}

const editResident = (resident) => {
  currentResident.value = resident
  dialogMode.value = 'edit'
  residentDialogVisible.value = true
}

const handleRowAction = (command, resident) => {
  currentResident.value = resident

  switch (command) {
    case 'family':
      familyDialogVisible.value = true
      break
    case 'relationship':
      familyRelationshipDialogVisible.value = true
      break
    case 'category':
      categoryManagerDialogVisible.value = true
      break
    case 'archive':
      familyArchiveDialogVisible.value = true
      break
    case 'digital':
      digitalArchiveDialogVisible.value = true
      break
    case 'certificate':
      certificateDialogVisible.value = true
      break
    case 'history':
      // 查看变更历史
      ElMessage.info('变更历史功能开发中...')
      break
    case 'qrcode':
      qrCodeDialogVisible.value = true
      break
    case 'delete':
      deleteResident(resident)
      break
  }
}

const deleteResident = async (resident) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除村民 ${resident.name} 的档案吗？删除后无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 支持离线操作
    if (isOnline.value) {
      const response = await residentAPI.deleteResident(resident.id)
      if (response.success) {
        // 同步删除离线存储中的数据
        await deleteFromOfflineStorage('residents', resident.id)
        ElMessage.success('删除成功')
        refreshTable()
      }
    } else {
      // 离线模式：添加到删除队列
      await deleteFromOfflineStorage('residents', resident.id)
      ElMessage.success('删除操作已记录，将在网络恢复时同步')
      refreshTable()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

// 批量删除功能
const batchDeleteResidents = async () => {
  if (selectedResidents.value.length === 0) {
    ElMessage.warning('请选择要删除的村民')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedResidents.value.length} 个村民档案吗？删除后无法恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const deletePromises = selectedResidents.value.map(async (resident) => {
      if (isOnline.value) {
        const response = await residentAPI.deleteResident(resident.id)
        if (response.success) {
          await deleteFromOfflineStorage('residents', resident.id)
        }
        return response
      } else {
        await deleteFromOfflineStorage('residents', resident.id)
        return { success: true }
      }
    })

    await Promise.all(deletePromises)

    ElMessage.success(`批量删除完成：${selectedResidents.value.length} 条记录`)
    selectedResidents.value = []
    refreshTable()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败: ' + error.message)
    }
  }
}

// 添加/编辑村民完成后的回调
const handleResidentSaved = async (residentData, mode) => {
  try {
    let response

    if (isOnline.value) {
      if (mode === 'add') {
        response = await residentAPI.createResident(residentData)
      } else {
        response = await residentAPI.updateResident(residentData.id, residentData)
      }

      if (response.success) {
        // 保存到离线存储
        await saveToOfflineStorage('residents', response.data, mode === 'add' ? 'create' : 'update')
        ElMessage.success(mode === 'add' ? '新增成功' : '更新成功')
      }
    } else {
      // 离线模式
      const operation = mode === 'add' ? 'create' : 'update'
      await saveToOfflineStorage('residents', residentData, operation)
      ElMessage.success(`${mode === 'add' ? '新增' : '更新'}操作已记录，将在网络恢复时同步`)
    }

    residentDialogVisible.value = false
    refreshTable()
    updateStatistics()
  } catch (error) {
    ElMessage.error(`${mode === 'add' ? '新增' : '更新'}失败: ` + error.message)
  }
}
  }
}

const batchDelete = async () => {
  if (!selectedResidents.value.length) {
    ElMessage.warning('请选择要删除的村民')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedResidents.value.length} 个村民档案吗？删除后无法恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const ids = selectedResidents.value.map(item => item.id)
    const response = await residentAPI.batchDeleteResidents(ids)
    if (response.success) {
      ElMessage.success('批量删除成功')
      refreshTable()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

const handleBatchAction = (command) => {
  switch (command) {
    case 'export':
      exportResidents()
      break
    case 'import':
      importDialogVisible.value = true
      break
    case 'delete':
      batchDeleteResidents()
      break
  }
}

const exportResidents = async () => {
  try {
    await residentAPI.exportResidents(searchForm)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

// 其他方法
const showQRCode = (resident) => {
  currentResident.value = resident
  qrCodeDialogVisible.value = true
}

const showHouseholdCode = () => {
  // 打开一户一码管理系统
  householdCodeDialogVisible.value = true
}

const showFamilyTree = () => {
  familyTreeDialogVisible.value = true
}

const showCertificateService = () => {
  certificateDialogVisible.value = true
}

const showQrScanner = () => {
  qrScannerDialogVisible.value = true
}

const toggleIdCardVisibility = (resident) => {
  resident.idCardVisible = !resident.idCardVisible
}

const previewAvatar = (resident) => {
  previewAvatarUrl.value = resident.avatar
  avatarPreviewVisible.value = true
}

const handleResidentSave = () => {
  residentDialogVisible.value = false
  refreshTable()
}

const handleCertificateSuccess = (data) => {
  ElMessage.success(`证件申请提交成功！申请编号：${data.applicationNumber}`)
  certificateDialogVisible.value = false
}

const handleQrScanSuccess = (result) => {
  if (result.action === 'view-details') {
    // 如果要查看详细信息，找到对应的村民记录
    const resident = residents.value.find(r => r.householdCode === result.data.code)
    if (resident) {
      currentResident.value = resident
      detailDialogVisible.value = true
    } else {
      ElMessage.warning('未找到对应的村民档案详细信息')
    }
  }
  ElMessage.success(`扫码查询成功：${result.data.householder}`)
}

// 工具函数
const maskIdCard = (idCard) => {
  if (!idCard) return ''
  return idCard.replace(/^(.{6}).*(.{4})$/, '$1**********$2')
}

const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/^(.{3}).*(.{4})$/, '$1****$2')
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}

const getHealthStatusType = (status) => {
  const typeMap = {
    healthy: 'success',
    chronic: 'warning',
    disabled: 'danger'
  }
  return typeMap[status] || 'info'
}

const getHealthStatusText = (status) => {
  const textMap = {
    healthy: '健康',
    chronic: '慢性病',
    disabled: '残疾'
  }
  return textMap[status] || '未知'
}

const updateStatistics = async () => {
  try {
    const response = await residentAPI.getResidentStats()
    if (response.success) {
      Object.assign(statistics, response.data)
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 监听搜索条件变化
watch([searchForm, advancedForm], () => {
  // 防抖搜索
  clearTimeout(window.searchTimer)
  window.searchTimer = setTimeout(() => {
    if (pagination.currentPage === 1) {
      searchResidents()
    } else {
      pagination.currentPage = 1
    }
  }, 500)
}, { deep: true })

// 生命周期
onMounted(() => {
  searchResidents()
  updateStatistics()
})
</script>

<style lang="scss" scoped>
.residents-management {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;

  .page-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    padding: 30px;
    margin-bottom: 20px;
    color: white;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        .page-title {
          font-size: 28px;
          font-weight: bold;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .page-subtitle {
          font-size: 14px;
          opacity: 0.9;
          margin: 0;
        }
      }

      .header-right {
        display: flex;
        gap: 12px;
      }
    }
  }

  .stats-overview {
    margin-bottom: 20px;

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 20px;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }

      &.total {
        border-left: 4px solid #409eff;
      }

      &.households {
        border-left: 4px solid #67c23a;
      }

      &.elderly {
        border-left: 4px solid #e6a23c;
      }

      &.children {
        border-left: 4px solid #f56c6c;
      }

      .stat-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: rgba(64, 158, 255, 0.1);
        color: #409eff;
      }

      .stat-content {
        flex: 1;

        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: #303133;
          line-height: 1;
        }

        .stat-label {
          font-size: 14px;
          color: #909399;
          margin-top: 4px;
        }

        .stat-trend {
          font-size: 12px;
          color: #909399;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;

          &.trend-up {
            color: #67c23a;
          }
        }
      }
    }
  }

  .search-card {
    margin-bottom: 20px;

    .search-filters {
      .advanced-search {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin-top: 16px;

        .age-range-text {
          margin-left: 16px;
          color: #606266;
          font-size: 14px;
        }
      }
    }
  }

  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .table-actions {
      display: flex;
      gap: 8px;
    }
  }

  .id-card-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .masked-id {
      font-family: monospace;
      color: #909399;
    }
  }

  .pagination-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }

  .avatar-preview {
    text-align: center;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .residents-management {
    padding: 10px;

    .page-header {
      .header-content {
        flex-direction: column;
        gap: 20px;
        text-align: center;

        .header-right {
          flex-wrap: wrap;
          justify-content: center;
        }
      }
    }

    .stats-overview {
      :deep(.el-col) {
        margin-bottom: 20px;
      }
    }

    .search-filters {
      :deep(.el-form-item) {
        margin-bottom: 16px;
      }
    }
  }
}
</style>
                  <el-option label="健康" value="healthy" />
                  <el-option label="慢性病" value="chronic" />
                  <el-option label="残疾" value="disabled" />
                </el-select>
              </el-col>
              <el-col :span="6">
                <el-button type="primary" @click="searchResidents" icon="Search">
                  搜索
                </el-button>
                <el-button @click="resetFilters" icon="Refresh">
                  重置
                </el-button>
                <el-button type="success" @click="exportResidents" icon="Download">
                  导出
                </el-button>
              </el-col>
            </el-row>

            <!-- 高级搜索 -->
            <div class="advanced-search" v-if="showAdvancedSearch">
              <el-row :gutter="20" style="margin-top: 15px">
                <el-col :span="6">
                  <el-date-picker
                    v-model="ageRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="最小年龄"
                    end-placeholder="最大年龄"
                    value-format="YYYY-MM-DD"
                  />
                </el-col>
                <el-col :span="6">
                  <el-input
                    v-model="filterAddress"
                    placeholder="居住地址搜索"
                    clearable
                  />
                </el-col>
                <el-col :span="4">
                  <el-select v-model="filterHouseholdType" placeholder="户籍类型" clearable>
                    <el-option label="农业户口" value="agricultural" />
                    <el-option label="非农户口" value="non_agricultural" />
                  </el-select>
                </el-col>
                <el-col :span="4">
                  <el-button @click="showAdvancedSearch = false" icon="ArrowUp">
                    收起
                  </el-button>
                </el-col>
              </el-row>
            </div>

            <div v-else style="margin-top: 10px">
              <el-button type="text" @click="showAdvancedSearch = true" icon="ArrowDown">
                高级搜索
              </el-button>
            </div>
          </div>

          <!-- 村民列表 -->
          <div class="residents-table">
            <el-table
              :data="filteredResidents"
              v-loading="loading"
              stripe
              border
              style="width: 100%"
              @selection-change="handleSelectionChange"
            >
              <el-table-column type="selection" width="55" />
              <el-table-column prop="householdCode" label="户码" width="100">
                <template #default="scope">
                  <el-button
                    type="text"
                    @click="showQRCode(scope.row)"
                    icon="QrCode"
                  >
                    {{ scope.row.householdCode }}
                  </el-button>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="姓名" width="100" />
              <el-table-column prop="gender" label="性别" width="80">
                <template #default="scope">
                  <el-tag :type="scope.row.gender === 'male' ? 'primary' : 'danger'" size="small">
                    {{ scope.row.gender === 'male' ? '男' : '女' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="age" label="年龄" width="80" />
              <el-table-column prop="idCard" label="身份证号" width="180">
                <template #default="scope">
                  <span v-if="scope.row.idCardVisible">{{ scope.row.idCard }}</span>
                  <span v-else>{{ maskIdCard(scope.row.idCard) }}</span>
                  <el-button
                    type="text"
                    size="small"
                    @click="toggleIdCardVisibility(scope.row)"
                    icon="View"
                  />
                </template>
              </el-table-column>
              <el-table-column prop="phone" label="联系电话" width="130">
                <template #default="scope">
                  <span v-if="scope.row.phoneVisible">{{ scope.row.phone }}</span>
                  <span v-else>{{ maskPhone(scope.row.phone) }}</span>
                  <el-button
                    type="text"
                    size="small"
                    @click="togglePhoneVisibility(scope.row)"
                    icon="View"
                  />
                </template>
              </el-table-column>
              <el-table-column prop="relationship" label="户主关系" width="100" />
              <el-table-column prop="healthStatus" label="健康状态" width="100">
                <template #default="scope">
                  <el-tag :type="getHealthStatusType(scope.row.healthStatus)" size="small">
                    {{ getHealthStatusName(scope.row.healthStatus) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="address" label="居住地址" min-width="200" show-overflow-tooltip />
              <el-table-column label="操作" width="220" fixed="right">
                <template #default="scope">
                  <el-button
                    type="primary"
                    size="small"
                    @click="viewResident(scope.row)"
                    icon="View"
                  >
                    详情
                  </el-button>
                  <el-button
                    type="warning"
                    size="small"
                    @click="editResident(scope.row)"
                    icon="Edit"
                  >
                    编辑
                  </el-button>
                  <el-dropdown @command="handleResidentAction">
                    <el-button type="info" size="small" icon="More" />
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item :command="{action: 'family', resident: scope.row}">
                          家庭关系
                        </el-dropdown-item>
                        <el-dropdown-item :command="{action: 'health', resident: scope.row}">
                          健康档案
                        </el-dropdown-item>
                        <el-dropdown-item :command="{action: 'history', resident: scope.row}">
                          变更历史
                        </el-dropdown-item>
                        <el-dropdown-item :command="{action: 'privacy', resident: scope.row}">
                          隐私设置
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 批量操作 -->
          <div class="batch-operations" v-if="selectedResidents.length > 0">
            <el-alert
              :title="`已选择 ${selectedResidents.length} 个档案`"
              type="info"
              show-icon
              :closable="false"
            />
            <div style="margin-top: 10px">
              <el-button type="primary" @click="batchUpdate">批量更新</el-button>
              <el-button type="success" @click="batchExport">批量导出</el-button>
              <el-button type="warning" @click="batchNotify">批量通知</el-button>
            </div>
          </div>

          <!-- 分页 -->
          <div class="pagination">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="totalResidents"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- 一户一码 -->
      <el-tab-pane label="一户一码" name="household">
        <div class="household-section">
          <div class="household-grid">
            <div
              v-for="household in households"
              :key="household.code"
              class="household-card"
              @click="selectHousehold(household)"
            >
              <div class="household-header">
                <div class="household-code">
                  <el-icon><QrCode /></el-icon>
                  {{ household.code }}
                </div>
                <div class="household-status">
                  <el-tag :type="household.status === 'active' ? 'success' : 'danger'" size="small">
                    {{ household.status === 'active' ? '正常' : '异常' }}
                  </el-tag>
                </div>
              </div>
              <div class="household-info">
                <h4>{{ household.householder }}</h4>
                <p>户籍人数：{{ household.memberCount }}人</p>
                <p>地址：{{ household.address }}</p>
              </div>
              <div class="household-actions">
                <el-button
                  type="primary"
                  size="small"
                  @click.stop="generateQRCode(household)"
                  icon="QrCode"
                >
                  生成二维码
                </el-button>
                <el-button
                  type="success"
                  size="small"
                  @click.stop="updateHousehold(household)"
                  icon="Edit"
                >
                  更新信息
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 家族关系 -->
      <el-tab-pane label="家族关系" name="family">
        <div class="family-section">
          <div class="family-tree-container">
            <div class="family-tree-header">
              <h3>家族关系图谱</h3>
              <el-select v-model="selectedFamily" placeholder="选择家族" @change="loadFamilyTree">
                <el-option
                  v-for="family in families"
                  :key="family.id"
                  :label="family.name"
                  :value="family.id"
                />
              </el-select>
            </div>

            <!-- 家族树状图 -->
            <div class="family-tree" v-if="familyTreeData">
              <div class="tree-node root-node">
                <div class="node-content">
                  <img :src="familyTreeData.root.avatar || '/default-avatar.png'" alt="头像" />
                  <div class="node-info">
                    <h4>{{ familyTreeData.root.name }}</h4>
                    <p>{{ familyTreeData.root.relationship }}</p>
                  </div>
                </div>

                <!-- 子节点 -->
                <div class="children-nodes" v-if="familyTreeData.children && familyTreeData.children.length">
                  <div
                    v-for="child in familyTreeData.children"
                    :key="child.id"
                    class="tree-node child-node"
                    @click="selectFamilyMember(child)"
                  >
                    <div class="node-content">
                      <img :src="child.avatar || '/default-avatar.png'" alt="头像" />
                      <div class="node-info">
                        <h5>{{ child.name }}</h5>
                        <p>{{ child.relationship }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 关系绑定 -->
            <div class="relationship-binding">
              <h4>血缘关系绑定</h4>
              <el-form :model="relationshipForm" label-width="100px">
                <el-form-item label="成员A">
                  <el-select v-model="relationshipForm.memberA" placeholder="选择成员">
                    <el-option
                      v-for="resident in residents"
                      :key="resident.id"
                      :label="resident.name"
                      :value="resident.id"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="关系类型">
                  <el-select v-model="relationshipForm.relationship" placeholder="选择关系">
                    <el-option label="父子" value="father_son" />
                    <el-option label="母子" value="mother_son" />
                    <el-option label="父女" value="father_daughter" />
                    <el-option label="母女" value="mother_daughter" />
                    <el-option label="夫妻" value="spouse" />
                    <el-option label="兄弟" value="brother" />
                    <el-option label="姐妹" value="sister" />
                    <el-option label="祖孙" value="grandparent_grandchild" />
                  </el-select>
                </el-form-item>
                <el-form-item label="成员B">
                  <el-select v-model="relationshipForm.memberB" placeholder="选择成员">
                    <el-option
                      v-for="resident in residents"
                      :key="resident.id"
                      :label="resident.name"
                      :value="resident.id"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="addRelationship">
                    添加关系
                  </el-button>
                  <el-button @click="autoDetectRelationships">
                    智能识别
                  </el-button>
                </el-form-item>
              </el-form>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 隐私管理 -->
      <el-tab-pane label="隐私管理" name="privacy">
        <div class="privacy-section">
          <div class="privacy-settings">
            <h3>隐私保护设置</h3>
            <el-table :data="privacySettings" border>
              <el-table-column prop="fieldName" label="数据字段" width="150" />
              <el-table-column prop="description" label="字段描述" width="200" />
              <el-table-column label="可见权限">
                <template #default="scope">
                  <el-tag
                    v-for="role in scope.row.visibleRoles"
                    :key="role"
                    size="small"
                    style="margin: 2px"
                  >
                    {{ getRoleName(role) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="maskingType" label="脱敏方式" width="120">
                <template #default="scope">
                  <el-tag :type="getMaskingTypeColor(scope.row.maskingType)" size="small">
                    {{ getMaskingTypeName(scope.row.maskingType) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="scope">
                  <el-button
                    type="primary"
                    size="small"
                    @click="editPrivacySetting(scope.row)"
                  >
                    编辑设置
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 访问日志 -->
          <div class="access-logs">
            <h3>数据访问日志</h3>
            <el-table :data="accessLogs" border stripe>
              <el-table-column prop="timestamp" label="访问时间" width="180" />
              <el-table-column prop="accessor" label="访问者" width="100" />
              <el-table-column prop="accessedField" label="访问字段" width="120" />
              <el-table-column prop="targetResident" label="目标居民" width="100" />
              <el-table-column prop="purpose" label="访问目的" />
              <el-table-column prop="result" label="访问结果" width="100">
                <template #default="scope">
                  <el-tag :type="scope.row.result === 'success' ? 'success' : 'danger'" size="small">
                    {{ scope.row.result === 'success' ? '成功' : '失败' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 添加村民对话框 -->
    <el-dialog
      v-model="addDialogVisible"
      title="新增村民档案"
      width="800px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="addFormRef"
        :model="addForm"
        :rules="addFormRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="addForm.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="addForm.gender">
                <el-radio label="male">男</el-radio>
                <el-radio label="female">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="身份证号" prop="idCard">
              <el-input v-model="addForm.idCard" placeholder="请输入身份证号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="addForm.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出生日期" prop="birthDate">
              <el-date-picker
                v-model="addForm.birthDate"
                type="date"
                placeholder="选择出生日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="户主关系" prop="relationship">
              <el-select v-model="addForm.relationship" placeholder="选择与户主关系">
                <el-option label="户主" value="householder" />
                <el-option label="配偶" value="spouse" />
                <el-option label="子女" value="child" />
                <el-option label="父母" value="parent" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="居住地址" prop="address">
          <el-input
            v-model="addForm.address"
            type="textarea"
            placeholder="请输入详细居住地址"
            :rows="2"
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="健康状态" prop="healthStatus">
              <el-select v-model="addForm.healthStatus" placeholder="选择健康状态">
                <el-option label="健康" value="healthy" />
                <el-option label="慢性病" value="chronic" />
                <el-option label="残疾" value="disabled" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="户籍类型" prop="householdType">
              <el-select v-model="addForm.householdType" placeholder="选择户籍类型">
                <el-option label="农业户口" value="agricultural" />
                <el-option label="非农户口" value="non_agricultural" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="头像照片">
          <el-upload
            class="avatar-uploader"
            action="/api/upload/avatar"
            :show-file-list="false"
            :on-success="handleAvatarSuccess"
            :before-upload="beforeAvatarUpload"
          >
            <img v-if="addForm.avatar" :src="addForm.avatar" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>

        <el-form-item label="特殊标记">
          <el-checkbox-group v-model="addForm.specialTags">
            <el-checkbox label="独居老人">独居老人</el-checkbox>
            <el-checkbox label="低保户">低保户</el-checkbox>
            <el-checkbox label="五保户">五保户</el-checkbox>
            <el-checkbox label="残疾人">残疾人</el-checkbox>
            <el-checkbox label="退役军人">退役军人</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitAddForm" :loading="submitting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 二维码显示对话框 -->
    <el-dialog
      v-model="qrCodeDialogVisible"
      title="一户一码"
      width="400px"
      align-center
    >
      <div class="qr-code-container">
        <div class="qr-code-display">
          <canvas ref="qrCanvas" width="200" height="200"></canvas>
        </div>
        <div class="qr-code-info">
          <h4>{{ selectedHousehold?.householder }}</h4>
          <p>户码：{{ selectedHousehold?.code }}</p>
          <p>户籍人数：{{ selectedHousehold?.memberCount }}人</p>
        </div>
        <div class="qr-code-actions">
          <el-button type="primary" @click="downloadQRCode">下载二维码</el-button>
          <el-button @click="printQRCode">打印二维码</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Edit, View, Plus, More, QrCode, Share, Refresh, Download,
  ArrowUp, ArrowDown
} from '@element-plus/icons-vue'

// 响应式数据
const activeTab = ref('residents')
const loading = ref(false)
const submitting = ref(false)
const showAdvancedSearch = ref(false)

// 统计数据
const statistics = reactive({
  totalResidents: 1245,
  totalHouseholds: 456,
  elderlyCount: 189,
  childrenCount: 234
})

// 搜索和筛选
const searchQuery = ref('')
const filterGender = ref('')
const filterAgeGroup = ref('')
const filterHealthStatus = ref('')
const ageRange = ref([])
const filterAddress = ref('')
const filterHouseholdType = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const totalResidents = ref(0)

// 选中的居民
const selectedResidents = ref([])

// 村民数据
const residents = ref([
  {
    id: 1,
    name: '张三',
    gender: 'male',
    age: 45,
    idCard: '320123197801011234',
    idCardVisible: false,
    phone: '13800138001',
    phoneVisible: false,
    householdCode: 'ZC001',
    relationship: '户主',
    healthStatus: 'healthy',
    address: '张村123号',
    avatar: '',
    specialTags: ['退役军人']
  },
  {
    id: 2,
    name: '李美丽',
    gender: 'female',
    age: 42,
    idCard: '320123198001011234',
    idCardVisible: false,
    phone: '13800138002',
    phoneVisible: false,
    householdCode: 'ZC001',
    relationship: '配偶',
    healthStatus: 'healthy',
    address: '张村123号',
    avatar: '',
    specialTags: []
  },
  {
    id: 3,
    name: '王老太',
    gender: 'female',
    age: 78,
    idCard: '320123194501011234',
    idCardVisible: false,
    phone: '13800138003',
    phoneVisible: false,
    householdCode: 'ZC002',
    relationship: '户主',
    healthStatus: 'chronic',
    address: '张村456号',
    avatar: '',
    specialTags: ['独居老人', '低保户']
  }
])

// 户码数据
const households = ref([
  {
    code: 'ZC001',
    householder: '张三',
    memberCount: 4,
    address: '张村123号',
    status: 'active'
  },
  {
    code: 'ZC002',
    householder: '王老太',
    memberCount: 1,
    address: '张村456号',
    status: 'active'
  },
  {
    code: 'ZC003',
    householder: '李村长',
    memberCount: 5,
    address: '张村789号',
    status: 'active'
  }
])

// 家族数据
const families = ref([
  { id: 1, name: '张氏家族' },
  { id: 2, name: '李氏家族' },
  { id: 3, name: '王氏家族' }
])

const selectedFamily = ref('')
const familyTreeData = ref(null)

// 关系绑定表单
const relationshipForm = reactive({
  memberA: '',
  relationship: '',
  memberB: ''
})

// 隐私设置
const privacySettings = ref([
  {
    fieldName: 'idCard',
    description: '身份证号',
    visibleRoles: ['owner', 'family', 'admin'],
    maskingType: 'partial'
  },
  {
    fieldName: 'phone',
    description: '联系电话',
    visibleRoles: ['owner', 'family', 'committee'],
    maskingType: 'partial'
  },
  {
    fieldName: 'address',
    description: '详细地址',
    visibleRoles: ['owner', 'family', 'committee', 'admin'],
    maskingType: 'none'
  },
  {
    fieldName: 'healthStatus',
    description: '健康状况',
    visibleRoles: ['owner', 'family', 'medical'],
    maskingType: 'full'
  }
])

// 访问日志
const accessLogs = ref([
  {
    timestamp: '2024-01-15 14:30:22',
    accessor: '李支书',
    accessedField: '联系电话',
    targetResident: '张三',
    purpose: '紧急联系',
    result: 'success'
  },
  {
    timestamp: '2024-01-15 10:15:33',
    accessor: '王会计',
    accessedField: '身份证号',
    targetResident: '李美丽',
    purpose: '补贴申请',
    result: 'success'
  }
])

// 计算属性
const filteredResidents = computed(() => {
  let result = residents.value

  if (searchQuery.value) {
    result = result.filter(resident =>
      resident.name.includes(searchQuery.value) ||
      resident.idCard.includes(searchQuery.value) ||
      resident.phone.includes(searchQuery.value)
    )
  }

  if (filterGender.value) {
    result = result.filter(resident => resident.gender === filterGender.value)
  }

  if (filterAgeGroup.value) {
    result = result.filter(resident => {
      const age = resident.age
      switch (filterAgeGroup.value) {
        case 'children': return age <= 14
        case 'youth': return age >= 15 && age <= 44
        case 'middle': return age >= 45 && age <= 64
        case 'elderly': return age >= 65
        default: return true
      }
    })
  }

  if (filterHealthStatus.value) {
    result = result.filter(resident => resident.healthStatus === filterHealthStatus.value)
  }

  if (filterAddress.value) {
    result = result.filter(resident => resident.address.includes(filterAddress.value))
  }

  return result
})

// 表单数据
const addDialogVisible = ref(false)
const addFormRef = ref()
const addForm = reactive({
  name: '',
  gender: 'male',
  idCard: '',
  phone: '',
  birthDate: '',
  relationship: '',
  address: '',
  healthStatus: 'healthy',
  householdType: 'agricultural',
  avatar: '',
  specialTags: []
})

const addFormRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' }
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/, message: '身份证号格式不正确', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  birthDate: [
    { required: true, message: '请选择出生日期', trigger: 'change' }
  ],
  relationship: [
    { required: true, message: '请选择与户主关系', trigger: 'change' }
  ],
  address: [
    { required: true, message: '请输入居住地址', trigger: 'blur' }
  ]
}

// 二维码对话框
const qrCodeDialogVisible = ref(false)
const selectedHousehold = ref(null)
const qrCanvas = ref()

// 方法
const getHealthStatusName = (status) => {
  const statuses = {
    healthy: '健康',
    chronic: '慢性病',
    disabled: '残疾',
    other: '其他'
  }
  return statuses[status] || status
}

const getHealthStatusType = (status) => {
  const types = {
    healthy: 'success',
    chronic: 'warning',
    disabled: 'danger',
    other: 'info'
  }
  return types[status] || 'info'
}

const maskIdCard = (idCard) => {
  if (!idCard) return ''
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}

const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const toggleIdCardVisibility = (resident) => {
  resident.idCardVisible = !resident.idCardVisible
}

const togglePhoneVisibility = (resident) => {
  resident.phoneVisible = !resident.phoneVisible
}

const showAddDialog = () => {
  addDialogVisible.value = true
}

const showHouseholdCode = () => {
  activeTab.value = 'household'
}

const showFamilyTree = () => {
  activeTab.value = 'family'
}

const searchResidents = () => {
  console.log('搜索村民')
  // 实现搜索逻辑
}

const resetFilters = () => {
  searchQuery.value = ''
  filterGender.value = ''
  filterAgeGroup.value = ''
  filterHealthStatus.value = ''
  ageRange.value = []
  filterAddress.value = ''
  filterHouseholdType.value = ''
}

const exportResidents = () => {
  ElMessage.success('导出功能开发中...')
}

const viewResident = (resident) => {
  console.log('查看村民详情:', resident)
  ElMessage.info('详情功能开发中...')
}

const editResident = (resident) => {
  console.log('编辑村民:', resident)
  ElMessage.info('编辑功能开发中...')
}

const handleResidentAction = (command) => {
  const { action, resident } = command

  switch (action) {
    case 'family':
      activeTab.value = 'family'
      selectedFamily.value = '1' // 假设选择第一个家族
      loadFamilyTree()
      break
    case 'health':
      ElMessage.info('健康档案功能开发中...')
      break
    case 'history':
      ElMessage.info('变更历史功能开发中...')
      break
    case 'privacy':
      activeTab.value = 'privacy'
      break
  }
}

const handleSelectionChange = (selection) => {
  selectedResidents.value = selection
}

const batchUpdate = () => {
  ElMessage.success('批量更新功能开发中...')
}

const batchExport = () => {
  ElMessage.success('批量导出功能开发中...')
}

const batchNotify = () => {
  ElMessage.success('批量通知功能开发中...')
}

const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

const selectHousehold = (household) => {
  selectedHousehold.value = household
}

const generateQRCode = (household) => {
  selectedHousehold.value = household
  qrCodeDialogVisible.value = true

  nextTick(() => {
    // 生成二维码
    generateQRCodeCanvas(household.code)
  })
}

const generateQRCodeCanvas = (code) => {
  // 这里应该使用 qrcode 库生成二维码
  // 为了演示，我们创建一个简单的占位符
  if (qrCanvas.value) {
    const ctx = qrCanvas.value.getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 200, 200)
    ctx.fillStyle = '#fff'
    ctx.font = '16px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(code, 100, 100)
  }
}

const downloadQRCode = () => {
  ElMessage.success('下载二维码功能开发中...')
}

const printQRCode = () => {
  ElMessage.success('打印二维码功能开发中...')
}

const updateHousehold = (household) => {
  ElMessage.info('更新户籍信息功能开发中...')
}

const showQRCode = (resident) => {
  const household = households.value.find(h => h.code === resident.householdCode)
  if (household) {
    generateQRCode(household)
  }
}

const loadFamilyTree = () => {
  // 模拟加载家族树数据
  familyTreeData.value = {
    root: {
      id: 1,
      name: '张老爷子',
      relationship: '族长',
      avatar: ''
    },
    children: [
      {
        id: 2,
        name: '张三',
        relationship: '长子',
        avatar: ''
      },
      {
        id: 3,
        name: '张四',
        relationship: '次子',
        avatar: ''
      }
    ]
  }
}

const selectFamilyMember = (member) => {
  console.log('选择家族成员:', member)
}

const addRelationship = () => {
  if (!relationshipForm.memberA || !relationshipForm.memberB || !relationshipForm.relationship) {
    ElMessage.warning('请填写完整的关系信息')
    return
  }

  ElMessage.success('关系添加成功')

  // 重置表单
  Object.assign(relationshipForm, {
    memberA: '',
    relationship: '',
    memberB: ''
  })
}

const autoDetectRelationships = () => {
  ElMessage.success('智能识别完成，发现3个潜在关系')
}

const getRoleName = (role) => {
  const roles = {
    owner: '本人',
    family: '家庭成员',
    committee: '村委会',
    admin: '管理员',
    medical: '医务人员'
  }
  return roles[role] || role
}

const getMaskingTypeName = (type) => {
  const types = {
    none: '不脱敏',
    partial: '部分脱敏',
    full: '完全脱敏'
  }
  return types[type] || type
}

const getMaskingTypeColor = (type) => {
  const colors = {
    none: 'success',
    partial: 'warning',
    full: 'danger'
  }
  return colors[type] || 'info'
}

const editPrivacySetting = (setting) => {
  console.log('编辑隐私设置:', setting)
  ElMessage.info('隐私设置编辑功能开发中...')
}

const handleDialogClose = (done) => {
  ElMessageBox.confirm('确认关闭？')
    .then(() => {
      done()
    })
    .catch(() => {
      // catch error
    })
}

const submitAddForm = () => {
  addFormRef.value.validate((valid) => {
    if (valid) {
      submitting.value = true

      // 计算年龄
      const birthYear = new Date(addForm.birthDate).getFullYear()
      const currentYear = new Date().getFullYear()
      const age = currentYear - birthYear

      // 生成户码（这里简化处理）
      const householdCode = 'ZC' + String(residents.value.length + 1).padStart(3, '0')

      // 模拟API调用
      setTimeout(() => {
        residents.value.push({
          id: residents.value.length + 1,
          name: addForm.name,
          gender: addForm.gender,
          age: age,
          idCard: addForm.idCard,
          idCardVisible: false,
          phone: addForm.phone,
          phoneVisible: false,
          householdCode: householdCode,
          relationship: addForm.relationship,
          healthStatus: addForm.healthStatus,
          address: addForm.address,
          avatar: addForm.avatar,
          specialTags: addForm.specialTags
        })

        submitting.value = false
        addDialogVisible.value = false
        ElMessage.success('添加成功')

        // 重置表单
        addFormRef.value.resetFields()
        addForm.avatar = ''
        addForm.specialTags = []
      }, 1000)
    }
  })
}

const handleAvatarSuccess = (res, file) => {
  addForm.avatar = URL.createObjectURL(file.raw)
}

const beforeAvatarUpload = (file) => {
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPG) {
    ElMessage.error('上传头像图片只能是 JPG/PNG 格式!')
  }
  if (!isLt2M) {
    ElMessage.error('上传头像图片大小不能超过 2MB!')
  }
  return isJPG && isLt2M
}

// 生命周期
onMounted(() => {
  console.log('村民管理模块已加载')
  totalResidents.value = residents.value.length
})
</script>

<style scoped lang="scss">
.residents-management {
  padding: 20px;

  .page-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    padding: 30px;
    margin-bottom: 20px;
    color: white;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-left {
        .page-title {
          font-size: 28px;
          margin: 0 0 8px 0;
          font-weight: bold;
        }

        .page-subtitle {
          font-size: 16px;
          margin: 0;
          opacity: 0.9;
        }
      }

      .header-right {
        display: flex;
        gap: 12px;
      }
    }
  }

  .stats-overview {
    margin-bottom: 20px;

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

      .stat-icon {
        font-size: 40px;
        margin-right: 16px;
      }

      .stat-content {
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #409EFF;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #666;
        }
      }
    }
  }

  .residents-tabs {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    .search-filters {
      margin-bottom: 20px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .residents-table {
      margin-bottom: 20px;
    }

    .batch-operations {
      margin-bottom: 20px;
    }

    .pagination {
      display: flex;
      justify-content: center;
      margin-top: 20px;
    }

    .household-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;

      .household-card {
        border: 1px solid #e4e7ed;
        border-radius: 8px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .household-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;

          .household-code {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: bold;
            color: #409EFF;
          }
        }

        .household-info {
          margin-bottom: 15px;

          h4 {
            margin: 0 0 8px 0;
            color: #333;
          }

          p {
            margin: 4px 0;
            color: #666;
            font-size: 14px;
          }
        }

        .household-actions {
          display: flex;
          gap: 8px;
        }
      }
    }

    .family-tree-container {
      .family-tree-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;

        h3 {
          margin: 0;
          color: #333;
        }
      }

      .family-tree {
        margin-bottom: 40px;

        .tree-node {
          margin-bottom: 20px;

          &.root-node {
            text-align: center;

            .node-content {
              display: inline-flex;
              align-items: center;
              background: #f0f9ff;
              border: 2px solid #3b82f6;
              border-radius: 12px;
              padding: 15px;
              margin-bottom: 20px;

              img {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                margin-right: 15px;
                object-fit: cover;
              }

              .node-info {
                text-align: left;

                h4 {
                  margin: 0 0 5px 0;
                  color: #1e40af;
                }

                p {
                  margin: 0;
                  color: #64748b;
                  font-size: 14px;
                }
              }
            }

            .children-nodes {
              display: flex;
              justify-content: center;
              gap: 20px;
              flex-wrap: wrap;

              .child-node {
                .node-content {
                  display: flex;
                  align-items: center;
                  background: white;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  padding: 10px;
                  cursor: pointer;
                  transition: all 0.3s;

                  &:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    transform: translateY(-2px);
                  }

                  img {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    margin-right: 10px;
                    object-fit: cover;
                  }

                  .node-info {
                    h5 {
                      margin: 0 0 2px 0;
                      color: #374151;
                    }

                    p {
                      margin: 0;
                      color: #6b7280;
                      font-size: 12px;
                    }
                  }
                }
              }
            }
          }
        }
      }

      .relationship-binding {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;

        h4 {
          margin: 0 0 20px 0;
          color: #333;
        }
      }
    }

    .privacy-section {
      .privacy-settings {
        margin-bottom: 40px;

        h3 {
          margin-bottom: 20px;
          color: #333;
        }
      }

      .access-logs {
        h3 {
          margin-bottom: 20px;
          color: #333;
        }
      }
    }
  }
}

.qr-code-container {
  text-align: center;

  .qr-code-display {
    margin-bottom: 20px;

    canvas {
      border: 1px solid #e4e7ed;
      border-radius: 8px;
    }
  }

  .qr-code-info {
    margin-bottom: 20px;

    h4 {
      margin: 0 0 10px 0;
      color: #333;
    }

    p {
      margin: 5px 0;
      color: #666;
    }
  }

  .qr-code-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
  }
}

.avatar-uploader .avatar {
  width: 178px;
  height: 178px;
  display: block;
  border-radius: 8px;
}

.avatar-uploader .avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  line-height: 178px;
  text-align: center;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: 0.2s;
}

.avatar-uploader .avatar-uploader-icon:hover {
  border-color: #409EFF;
}

@media (max-width: 768px) {
  .residents-management {
    padding: 10px;

    .page-header {
      .header-content {
        flex-direction: column;
        gap: 20px;
        text-align: center;

        .header-right {
          justify-content: center;
          flex-wrap: wrap;
        }
      }
    }

    .stats-overview {
      .stat-card {
        .stat-icon {
          font-size: 30px;
        }

        .stat-content .stat-value {
          font-size: 20px;
        }
      }
    }

    .residents-tabs {
      .household-grid {
        grid-template-columns: 1fr;
      }

      .family-tree-container {
        .family-tree {
          .tree-node.root-node {
            .children-nodes {
              flex-direction: column;
              align-items: center;
            }
          }
        }
      }
    }
  }
}
</style>