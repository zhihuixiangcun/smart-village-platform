<template>
  <div class="residents-management">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">村民数字化档案系统</h1>
        <p class="page-description">一户一码 • 隐私保护 • 血缘关系 • 智能管理</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showAddDialog" icon="Plus">新增村民</el-button>
        <el-button @click="importResidents" icon="Upload">批量导入</el-button>
        <el-button @click="exportResidents" icon="Download">导出数据</el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="overview-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">👥</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.total }}</div>
                <div class="stat-label">总村民数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">🏠</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.households }}</div>
                <div class="stat-label">总户数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">👴</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.elderly }}</div>
                <div class="stat-label">老年人口</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">📋</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.withHealthRecord }}</div>
                <div class="stat-label">健康档案</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索筛选 -->
    <div class="search-section">
      <el-card>
        <el-row :gutter="16">
          <el-col :span="6">
            <el-input
              v-model="searchQuery.resident"
              placeholder="搜索姓名、身份证号或地址"
              clearable
              @keyup.enter="searchResidents"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          <el-col :span="4">
            <el-select v-model="filterQuery.gender" placeholder="性别" clearable>
              <el-option label="全部" value="" />
              <el-option label="男" value="男" />
              <el-option label="女" value="女" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select v-model="filterQuery.familyType" placeholder="家庭类型" clearable>
              <el-option label="全部" value="" />
              <el-option label="普通户" value="普通户" />
              <el-option label="低保户" value="低保户" />
              <el-option label="独生户" value="独生户" />
              <el-option label="困难户" value="困难户" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select v-model="filterQuery.village" placeholder="所属村组" clearable>
              <el-option label="全部" value="" />
              <el-option label="第一村民组" value="第一村民组" />
              <el-option label="第二村民组" value="第二村民组" />
              <el-option label="第三村民组" value="第三村民组" />
              <el-option label="第四村民组" value="第四村民组" />
            </el-select>
          </el-col>
          <el-col :span="3">
            <el-button type="primary" @click="searchResidents" icon="Search">搜索</el-button>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <!-- 村民列表 -->
    <div class="table-section">
      <el-card>
        <template #header>
          <div class="card-header">
            <span class="card-title">村民列表</span>
            <div class="header-actions">
              <el-button size="small" @click="batchGenerateQRCodes" :disabled="!selectedResidents.length">
                批量生成二维码
              </el-button>
              <el-button size="small" @click="batchExport" :disabled="!selectedResidents.length">
                批量导出
              </el-button>
            </div>
          </div>
        </template>

        <el-table
          :data="paginatedResidents"
          stripe
          @selection-change="handleSelectionChange"
          style="width: 100%"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="name" label="姓名" width="100">
            <template #default="scope">
              <div class="resident-info">
                <el-avatar :size="32" :src="scope.row.avatar">
                  {{ scope.row.name.charAt(0) }}
                </el-avatar>
                <span class="resident-name">{{ scope.row.name }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="gender" label="性别" width="60" />

          <el-table-column prop="age" label="年龄" width="60" sortable>
            <template #default="scope">
              {{ calculateAge(scope.row.birthDate) }}
            </template>
          </el-table-column>

          <el-table-column prop="idCard" label="身份证号" width="180">
            <template #default="scope">
              <span>{{ maskIdCard(scope.row.idCard) }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="phone" label="联系电话" width="130">
            <template #default="scope">
              <span>{{ maskPhone(scope.row.phone) }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="village" label="所属村组" width="120" />

          <el-table-column prop="familyType" label="家庭类型" width="100">
            <template #default="scope">
              <el-tag :type="getFamilyTypeColor(scope.row.familyType)" size="small">
                {{ scope.row.familyType }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="householdCode" label="户编码" width="120" />

          <el-table-column prop="hasHealthRecord" label="健康档案" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.hasHealthRecord ? 'success' : 'info'" size="small">
                {{ scope.row.hasHealthRecord ? '已建立' : '未建立' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="220" fixed="right">
            <template #default="scope">
              <el-button link type="primary" @click="viewResident(scope.row)">详情</el-button>
              <el-button link type="warning" @click="editResident(scope.row)">编辑</el-button>
              <el-button link type="info" @click="generateQRCode(scope.row)">二维码</el-button>
              <el-button link type="danger" @click="deleteResident(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredResidents.length"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 新增/编辑村民对话框 -->
    <el-dialog v-model="addDialogVisible" :title="dialogMode === 'add' ? '新增村民' : '编辑村民'" width="800px">
      <el-form :model="residentForm" :rules="residentRules" ref="residentFormRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="residentForm.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-select v-model="residentForm.gender" placeholder="请选择性别">
                <el-option label="男" value="男" />
                <el-option label="女" value="女" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="身份证号" prop="idCard">
              <el-input v-model="residentForm.idCard" placeholder="请输入身份证号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="出生日期" prop="birthDate">
              <el-date-picker
                v-model="residentForm.birthDate"
                type="date"
                placeholder="选择出生日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="residentForm.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属村组" prop="village">
              <el-select v-model="residentForm.village" placeholder="请选择村组">
                <el-option label="第一村民组" value="第一村民组" />
                <el-option label="第二村民组" value="第二村民组" />
                <el-option label="第三村民组" value="第三村民组" />
                <el-option label="第四村民组" value="第四村民组" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="家庭住址" prop="address">
          <el-input v-model="residentForm.address" placeholder="请输入详细住址" />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="户主姓名" prop="householdHead">
              <el-input v-model="residentForm.householdHead" placeholder="请输入户主姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="家庭类型" prop="familyType">
              <el-select v-model="residentForm.familyType" placeholder="请选择家庭类型">
                <el-option label="普通户" value="普通户" />
                <el-option label="低保户" value="低保户" />
                <el-option label="独生户" value="独生户" />
                <el-option label="困难户" value="困难户" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="户编码">
          <el-input v-model="residentForm.householdCode" placeholder="系统自动生成" readonly />
        </el-form-item>

        <el-form-item label="健康档案">
          <el-checkbox v-model="residentForm.hasHealthRecord">已建立健康档案</el-checkbox>
        </el-form-item>

        <el-form-item label="特殊健康状况">
          <el-input
            v-model="residentForm.specialHealth"
            type="textarea"
            :rows="2"
            placeholder="请输入特殊健康状况（如无则不填）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveResident" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 二维码对话框 -->
    <el-dialog v-model="qrDialogVisible" title="户二维码" width="400px">
      <div v-if="currentResident" class="qr-content">
        <div class="qr-code">
          <img :src="generateQRCode(currentResident.householdCode)" alt="户二维码" />
        </div>
        <div class="qr-info">
          <p><strong>姓名：</strong>{{ currentResident.name }}</p>
          <p><strong>户编码：</strong>{{ currentResident.householdCode }}</p>
          <p><strong>地址：</strong>{{ currentResident.address }}</p>
        </div>
        <div class="qr-actions">
          <el-button type="primary" @click="printQRCode">打印二维码</el-button>
          <el-button @click="downloadQRCode">下载二维码</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { axiosInstance as api } from '@/api'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

// 从数据库加载数据
const loadResidents = async () => {
  try {
    const response = await api.get('/api/v1/residents')
    if (response.success) {
      residents.value = response.data || []
      stats.value.total = residents.value.length
      stats.value.households = new Set(residents.value.map(r => r.householdCode)).size
      stats.value.elderly = residents.value.filter(r => calculateAge(r.birthDate) >= 60).length
      stats.value.withHealthRecord = residents.value.filter(r => r.hasHealthRecord).length
    }
  } catch (error) {
    console.error('加载村民数据失败:', error)
    ElMessage.warning('加载数据失败，显示模拟数据')
  }
}

// 响应式数据
const currentPage = ref(1)
const pageSize = ref(20)
const addDialogVisible = ref(false)
const qrDialogVisible = ref(false)
const dialogMode = ref('add')
const saving = ref(false)
const residentFormRef = ref()
const currentResident = ref(null)
const selectedResidents = ref([])

// 搜索和筛选
const searchQuery = reactive({
  resident: ''
})

const filterQuery = reactive({
  gender: '',
  familyType: '',
  village: ''
})

// 村民表单
const residentForm = reactive({
  name: '',
  gender: '',
  idCard: '',
  birthDate: '',
  phone: '',
  village: '',
  address: '',
  householdHead: '',
  familyType: '普通户',
  householdCode: '',
  hasHealthRecord: false,
  specialHealth: ''
})

// 表单验证规则
const residentRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  idCard: [{ required: true, message: '请输入身份证号', trigger: 'blur' }],
  birthDate: [{ required: true, message: '请选择出生日期', trigger: 'change' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  village: [{ required: true, message: '请选择所属村组', trigger: 'change' }],
  address: [{ required: true, message: '请输入家庭住址', trigger: 'blur' }],
  householdHead: [{ required: true, message: '请输入户主姓名', trigger: 'blur' }],
  familyType: [{ required: true, message: '请选择家庭类型', trigger: 'change' }]
}

// 模拟数据
const stats = ref({
  total: 486,
  households: 156,
  elderly: 89,
  withHealthRecord: 412
})

const residents = ref([
  {
    id: 1,
    name: '张大明',
    gender: '男',
    birthDate: '1980-05-15',
    idCard: '110101198005150001',
    phone: '13800138001',
    village: '第一村民组',
    address: '智慧村1号楼101室',
    householdHead: '张大明',
    familyType: '普通户',
    householdCode: 'VILLAGE001001',
    hasHealthRecord: true,
    specialHealth: '无',
    avatar: ''
  },
  {
    id: 2,
    name: '李红梅',
    gender: '女',
    birthDate: '1982-08-20',
    idCard: '110101198208200002',
    phone: '13800138002',
    village: '第一村民组',
    address: '智慧村1号楼102室',
    householdHead: '张大明',
    familyType: '普通户',
    householdCode: 'VILLAGE001001',
    hasHealthRecord: true,
    specialHealth: '高血压',
    avatar: ''
  },
  {
    id: 3,
    name: '王小强',
    gender: '男',
    birthDate: '1985-03-10',
    idCard: '110101198503100003',
    phone: '13800138003',
    village: '第二村民组',
    address: '智慧村2号楼201室',
    householdHead: '王大伟',
    familyType: '独生户',
    householdCode: 'VILLAGE002001',
    hasHealthRecord: true,
    specialHealth: '无',
    avatar: ''
  },
  {
    id: 4,
    name: '赵美丽',
    gender: '女',
    birthDate: '1990-12-25',
    idCard: '110101199012250004',
    phone: '13800138004',
    village: '第二村民组',
    address: '智慧村2号楼202室',
    householdHead: '赵建国',
    familyType: '普通户',
    householdCode: 'VILLAGE002002',
    hasHealthRecord: false,
    specialHealth: '无',
    avatar: ''
  },
  {
    id: 5,
    name: '刘大爷',
    gender: '男',
    birthDate: '1965-06-18',
    idCard: '110101196506180005',
    phone: '13800138005',
    village: '第三村民组',
    address: '智慧村3号楼301室',
    householdHead: '刘大爷',
    familyType: '低保户',
    householdCode: 'VILLAGE003001',
    hasHealthRecord: true,
    specialHealth: '糖尿病',
    avatar: ''
  }
])

// 计算属性
const filteredResidents = computed(() => {
  return residents.value.filter(resident => {
    const matchSearch = !searchQuery.resident ||
      resident.name.includes(searchQuery.resident) ||
      resident.idCard.includes(searchQuery.resident) ||
      resident.address.includes(searchQuery.resident)
    const matchGender = !filterQuery.gender || resident.gender === filterQuery.gender
    const matchFamilyType = !filterQuery.familyType || resident.familyType === filterQuery.familyType
    const matchVillage = !filterQuery.village || resident.village === filterQuery.village
    return matchSearch && matchGender && matchFamilyType && matchVillage
  })
})

const paginatedResidents = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredResidents.value.slice(start, end)
})

// 方法
const calculateAge = (birthDate) => {
  if (!birthDate) return 0
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

const maskIdCard = (idCard) => {
  if (!idCard || idCard.length < 8) return idCard
  return idCard.substring(0, 4) + '********' + idCard.substring(idCard.length - 4)
}

const maskPhone = (phone) => {
  if (!phone || phone.length < 7) return phone
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4)
}

const getFamilyTypeColor = (type) => {
  const colorMap = {
    '低保户': 'danger',
    '独生户': 'warning',
    '困难户': 'info',
    '普通户': 'success'
  }
  return colorMap[type] || 'info'
}

const searchResidents = () => {
  currentPage.value = 1
}

const handleSelectionChange = (selection) => {
  selectedResidents.value = selection
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page) => {
  currentPage.value = page
}

const showAddDialog = () => {
  dialogMode.value = 'add'
  resetForm()
  addDialogVisible.value = true
}

const resetForm = () => {
  Object.assign(residentForm, {
    name: '',
    gender: '',
    idCard: '',
    birthDate: '',
    phone: '',
    village: '',
    address: '',
    householdHead: '',
    familyType: '普通户',
    householdCode: '',
    hasHealthRecord: false,
    specialHealth: ''
  })
}

const saveResident = async () => {
  if (!residentFormRef.value) return

  try {
    await residentFormRef.value.validate()
    saving.value = true

    // 生成户编码
    if (dialogMode.value === 'add') {
      residentForm.householdCode = 'VILLAGE' + String(residents.value.length + 1).padStart(3, '0') + '001'
    }

    if (dialogMode.value === 'add') {
      // 调用API创建村民
      const response = await api.post('/api/v1/residents', residentForm)
      if (response.success) {
        residents.value.push(response.data)
        stats.value.total++
        ElMessage.success('新增村民成功')
        addDialogVisible.value = false
      } else {
        ElMessage.error(response.message || '新增失败')
      }
    } else {
      // 调用API更新村民
      const response = await api.put(`/api/v1/residents/${residentForm.id}`, residentForm)
      if (response.success) {
        const index = residents.value.findIndex(r => r.id === residentForm.id)
        if (index !== -1) {
          Object.assign(residents.value[index], response.data)
        }
        ElMessage.success('更新村民信息成功')
        addDialogVisible.value = false
      } else {
        ElMessage.error(response.message || '更新失败')
      }
    }
  } catch (error) {
    console.error('保存村民失败:', error)
    ElMessage.error(error.response?.data?.error || error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const viewResident = (resident) => {
  router.push(`/residents/${resident.id}`)
}

const editResident = (resident) => {
  dialogMode.value = 'edit'
  Object.assign(residentForm, resident)
  addDialogVisible.value = true
}

const deleteResident = async (resident) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除村民"${resident.name}"吗？`,
      '确认删除',
      { type: 'warning' }
    )

    // 调用API删除村民
    const response = await api.delete(`/api/v1/residents/${resident.id}`)
    if (response.success) {
      const index = residents.value.findIndex(r => r.id === resident.id)
      if (index !== -1) {
        residents.value.splice(index, 1)
        stats.value.total--
      }
      ElMessage.success('删除成功')
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除村民失败:', error)
      ElMessage.error(error.response?.data?.error || error.message || '删除失败')
    }
  }
}

const generateQRCode = (code) => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`
}

const generateQRCodeForResident = (resident) => {
  currentResident.value = resident
  qrDialogVisible.value = true
}

const printQRCode = () => {
  ElMessage.info('打印功能开发中...')
}

const downloadQRCode = () => {
  ElMessage.info('下载功能开发中...')
}

const batchGenerateQRCodes = () => {
  ElMessage.info(`批量生成 ${selectedResidents.value.length} 个二维码功能开发中...`)
}

const batchExport = () => {
  ElMessage.info(`批量导出 ${selectedResidents.value.length} 条记录功能开发中...`)
}

const importResidents = () => {
  ElMessage.info('批量导入功能开发中...')
}

const exportResidents = () => {
  ElMessage.info('数据导出功能开发中...')
}

onMounted(() => {
  console.log('村民管理模块加载完成')
  // 加载数据
  loadResidents()
})
</script>

<style lang="scss" scoped>
.residents-management {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;

  .header-left {
    .page-title {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }

    .page-description {
      margin: 0;
      color: #606266;
      font-size: 14px;
    }
  }

  .header-right {
    display: flex;
    gap: 12px;
  }
}

.overview-section {
  margin-bottom: 20px;

  .stat-card {
    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;

      .stat-icon {
        font-size: 2.5em;
      }

      .stat-info {
        .stat-value {
          font-size: 1.8em;
          font-weight: bold;
          color: #303133;
          line-height: 1.2;
        }

        .stat-label {
          color: #606266;
          margin-top: 4px;
        }
      }
    }
  }
}

.search-section {
  margin-bottom: 20px;
}

.table-section {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .card-title {
      font-weight: 600;
      color: #303133;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }
  }

  .resident-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .resident-name {
      font-weight: 500;
      color: #303133;
    }
  }

  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: center;
  }
}

.qr-content {
  text-align: center;

  .qr-code {
    margin-bottom: 20px;

    img {
      width: 200px;
      height: 200px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
    }
  }

  .qr-info {
    text-align: left;
    margin-bottom: 20px;

    p {
      margin: 8px 0;
      color: #303133;
    }
  }

  .qr-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
  }
}
</style>