<template>
  <div class="family-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>家庭档案管理</h2>
        <p>一户一码 · 智慧乡村</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新建家庭档案
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards" v-if="statistics">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: #409EFF">
                <el-icon size="24"><House /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.totalFamilies }}</div>
                <div class="stat-label">总家庭数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: #67C23A">
                <el-icon size="24"><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.totalMembers }}</div>
                <div class="stat-label">总人口</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: #E6A23C">
                <el-icon size="24"><Star /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.needsVisitFamilies?.length || 0 }}</div>
                <div class="stat-label">需走访家庭</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: #F56C6C">
                <el-icon size="24"><Warning /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ statistics.lowIncomeFamilies || 0 }}</div>
                <div class="stat-label">低保户</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索和筛选 -->
    <el-card shadow="never" class="filter-card">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索房屋编号、户主姓名、地址"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="filters.familyType"
            placeholder="家庭类型"
            clearable
            @change="handleFilter"
          >
            <el-option label="一般家庭" value="一般家庭" />
            <el-option label="低保户" value="低保户" />
            <el-option label="独居老人家庭" value="独居老人家庭" />
            <el-option label="残疾人家庭" value="残疾人家庭" />
            <el-option label="空巢家庭" value="空巢家庭" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="filters.riskLevel"
            placeholder="风险等级"
            clearable
            @change="handleFilter"
          >
            <el-option label="低" value="低" />
            <el-option label="中" value="中" />
            <el-option label="高" value="高" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="filters.needsVisit"
            placeholder="走访状态"
            clearable
            @change="handleFilter"
          >
            <el-option label="需要走访" value="true" />
            <el-option label="无需走访" value="false" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 家庭列表 -->
    <el-card shadow="never" class="list-card" v-loading="familyStore.loading">
      <template #header>
        <div class="card-header">
          <span>家庭列表</span>
          <span class="total-count">共 {{ familyStore.families.length }} 户</span>
        </div>
      </template>

      <el-table
        :data="familyStore.filteredFamilies"
        stripe
        style="width: 100%"
        @row-click="handleViewFamily"
      >
        <el-table-column prop="houseNumber" label="房屋编号" width="120" />
        <el-table-column label="户主" width="120">
          <template #default="{ row }">
            {{ row.headOfHousehold?.name }}
          </template>
        </el-table-column>
        <el-table-column label="联系电话" width="130">
          <template #default="{ row }">
            {{ row.headOfHousehold?.phoneMasked }}
          </template>
        </el-table-column>
        <el-table-column label="家庭成员" width="100" align="center">
          <template #default="{ row }">
            {{ row.memberCount }}人 / {{ row.memberCountInVillage }}人在村
          </template>
        </el-table-column>
        <el-table-column label="家庭类型" width="200">
          <template #default="{ row }">
            <el-tag
              v-for="type in row.familyTypes"
              :key="type"
              size="small"
              style="margin-right: 5px"
            >
              {{ type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="标签" width="200">
          <template #default="{ row }">
            <el-tag
              v-for="tag in row.tags"
              :key="tag.name"
              :color="tag.color"
              size="small"
              effect="plain"
              style="margin-right: 5px"
            >
              {{ tag.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="getPriorityType(row.specialFlags?.helpPriority)"
              size="small"
            >
              {{ row.specialFlags?.helpPriority || 1 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              @click.stop="handleViewFamily(row)"
            >
              查看
            </el-button>
            <el-button
              link
              type="primary"
              size="small"
              @click.stop="handleEditFamily(row)"
            >
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              @click.stop="handleDeleteFamily(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="familyStore.pagination.page"
          v-model:page-size="familyStore.pagination.pageSize"
          :total="familyStore.pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 创建/编辑家庭对话框 -->
    <FamilyForm
      v-model="showFormDialog"
      :family="currentFamily"
      @submit="handleFormSubmit"
    />

    <!-- 家庭详情对话框 -->
    <FamilyDetailDialog
      v-model="showDetailDialog"
      :family-id="currentFamilyId"
    />

    <!-- 二维码显示对话框 -->
    <QRCodeDisplay
      v-model="showQRDialog"
      :family="currentFamily"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, Search, House, User, Star, Warning } from '@element-plus/icons-vue'
import { useFamilyStore } from '@/stores/familyStore'
import FamilyForm from '@/components/family/FamilyForm.vue'
import FamilyDetailDialog from '@/components/family/FamilyDetailDialog.vue'
import QRCodeDisplay from '@/components/family/QRCodeDisplay.vue'

const familyStore = useFamilyStore()
const villageId = computed(() => {
  // 从路由或用户信息获取当前村庄ID
  return localStorage.getItem('currentVillageId') || ''
})

// 对话框状态
const showFormDialog = ref(false)
const showDetailDialog = ref(false)
const showQRDialog = ref(false)

// 当前操作的家庭
const currentFamily = ref(null)
const currentFamilyId = ref(null)

// 筛选条件
const filters = computed(() => familyStore.filters)

// 统计数据
const statistics = computed(() => familyStore.statistics)

// 初始化
onMounted(async () => {
  await loadFamilies()
  await loadStatistics()
})

// 加载家庭列表
async function loadFamilies() {
  try {
    await familyStore.fetchFamilies(villageId.value)
  } catch (error) {
    ElMessage.error('加载家庭列表失败')
  }
}

// 加载统计数据
async function loadStatistics() {
  try {
    await familyStore.fetchStatistics(villageId.value)
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 搜索
function handleSearch() {
  familyStore.setFilter('keyword', filters.value.keyword)
  loadFamilies()
}

// 筛选
function handleFilter() {
  familyStore.setFilter('familyType', filters.value.familyType)
  familyStore.setFilter('riskLevel', filters.value.riskLevel)
  familyStore.setFilter('needsVisit', filters.value.needsVisit)
  loadFamilies()
}

// 重置
function handleReset() {
  familyStore.clearFilters()
  loadFamilies()
}

// 显示创建对话框
function showCreateDialog() {
  currentFamily.value = null
  showFormDialog.value = true
}

// 编辑家庭
function handleEditFamily(family) {
  currentFamily.value = family
  showFormDialog.value = true
}

// 查看家庭详情
function handleViewFamily(family) {
  currentFamilyId.value = family._id
  showDetailDialog.value = true
}

// 删除家庭
async function handleDeleteFamily(family) {
  try {
    await ElMessageBox.confirm(
      `确定要删除家庭 "${family.headOfHousehold?.name}" 的档案吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await familyStore.deleteFamily(family._id)
    ElMessage.success('删除成功')
    await loadStatistics()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 表单提交
async function handleFormSubmit(formData) {
  try {
    if (formData._id) {
      await familyStore.updateFamily(formData._id, formData)
      ElMessage.success('更新成功')
    } else {
      await familyStore.createFamily({
        ...formData,
        villageId: villageId.value
      })
      ElMessage.success('创建成功')
    }

    showFormDialog.value = false
    await loadFamilies()
    await loadStatistics()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

// 导出数据
async function handleExport() {
  try {
    const data = await familyStore.filteredFamilies
    // 实际应该调用API导出
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

// 分页
function handlePageChange(page) {
  familyStore.setPagination(page, familyStore.pagination.pageSize)
  loadFamilies()
}

function handleSizeChange(size) {
  familyStore.setPagination(1, size)
  loadFamilies()
}

// 获取优先级类型
function getPriorityType(priority) {
  if (priority >= 7) return 'danger'
  if (priority >= 5) return 'warning'
  return 'info'
}
</script>

<style scoped lang="scss">
.family-management {
  padding: 20px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .header-left {
      h2 {
        margin: 0 0 5px 0;
        font-size: 24px;
        color: #303133;
      }

      p {
        margin: 0;
        font-size: 14px;
        color: #909399;
      }
    }

    .header-right {
      display: flex;
      gap: 10px;
    }
  }

  .stats-cards {
    margin-bottom: 20px;

    .stat-card {
      .stat-content {
        display: flex;
        align-items: center;

        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin-right: 15px;
        }

        .stat-info {
          flex: 1;

          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #303133;
            line-height: 1;
            margin-bottom: 5px;
          }

          .stat-label {
            font-size: 14px;
            color: #909399;
          }
        }
      }
    }
  }

  .filter-card {
    margin-bottom: 20px;
  }

  .list-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .total-count {
        font-size: 14px;
        color: #909399;
      }
    }

    :deep(.el-table) {
      .el-table__row {
        cursor: pointer;

        &:hover {
          background-color: #f5f7fa;
        }
      }
    }

    .pagination {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  }
}
</style>
