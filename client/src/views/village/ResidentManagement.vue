<template>
  <div class="resident-management">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1>村民管理</h1>
        <p>数字化村民档案管理，一户一码精准服务</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showAddResidentDialog">
          <el-icon><Plus /></el-icon>
          添加村民
        </el-button>
        <el-button @click="showHouseholdDialog">
          <el-icon><House /></el-icon>
          家庭管理
        </el-button>
        <el-button @click="importData">
          <el-icon><Upload /></el-icon>
          批量导入
        </el-button>
        <el-button @click="exportData">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </div>
    </header>

    <!-- 统计概览 -->
    <section class="overview-section">
      <div class="overview-grid">
        <div class="overview-card total">
          <div class="card-icon">
            <el-icon><User /></el-icon>
          </div>
          <div class="card-content">
            <div class="number">{{ statistics.totalResidents }}</div>
            <div class="label">总人口</div>
          </div>
        </div>
        <div class="overview-card households">
          <div class="card-icon">
            <el-icon><House /></el-icon>
          </div>
          <div class="card-content">
            <div class="number">{{ statistics.totalHouseholds }}</div>
            <div class="label">总户数</div>
          </div>
        </div>
        <div class="overview-card low-income">
          <div class="card-icon">
            <el-icon><Coin /></el-icon>
          </div>
          <div class="card-content">
            <div class="number">{{ statistics.lowIncomeHouseholds }}</div>
            <div class="label">低保户</div>
          </div>
        </div>
        <div class="overview-card elderly">
          <div class="card-icon">
            <el-icon><CaretLeft /></el-icon>
          </div>
          <div class="card-content">
            <div class="number">{{ statistics.elderly }}</div>
            <div class="label">65岁以上</div>
          </div>
        </div>
        <div class="overview-card children">
          <div class="card-icon">
            <el-icon><Baby /></el-icon>
          </div>
          <div class="card-content">
            <div class="number">{{ statistics.children }}</div>
            <div class="label">未成年人</div>
          </div>
        </div>
        <div class="overview-card this-month">
          <div class="card-icon">
            <el-icon><Calendar /></el-icon>
          </div>
          <div class="card-content">
            <div class="number">{{ statistics.newThisMonth }}</div>
            <div class="label">本月新增</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 搜索和筛选 -->
    <section class="filter-section">
      <div class="filter-content">
        <div class="search-bar">
          <el-input
            v-model="searchParams.keyword"
            placeholder="搜索姓名、身份证、手机号、家庭住址..."
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <div class="filter-controls">
          <el-select v-model="searchParams.householdType" placeholder="家庭类型" clearable @change="handleSearch">
            <el-option label="全部" value="" />
            <el-option label="普通户" value="普通户" />
            <el-option label="低保户" value="低保户" />
            <el-option label="独生户" value="独生户" />
            <el-option label="残疾户" value="残疾户" />
            <el-option label="军人家庭" value="军人家庭" />
          </el-select>
          <el-select v-model="searchParams.ageGroup" placeholder="年龄组" clearable @change="handleSearch">
            <el-option label="全部" value="" />
            <el-option label="0-18岁" value="0-18" />
            <el-option label="19-35岁" value="19-35" />
            <el-option label="36-60岁" value="36-60" />
            <el-option label="60岁以上" value="60+" />
          </el-select>
          <el-select v-model="searchParams.education" placeholder="教育程度" clearable @change="handleSearch">
            <el-option label="全部" value="" />
            <el-option label="小学及以下" value="小学及以下" />
            <el-option label="初中" value="初中" />
            <el-option label="高中" value="高中" />
            <el-option label="大专" value="大专" />
            <el-option label="本科" value="本科" />
            <el-option label="研究生" value="研究生" />
          </el-select>
          <el-button type="primary" @click="showAdvancedSearch">高级搜索</el-button>
        </div>
      </div>
    </section>

    <!-- 村民列表 -->
    <section class="residents-section">
      <div class="table-container">
        <el-table
          :data="filteredResidents"
          stripe
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column label="头像" width="80">
            <template #default="{ row }">
              <el-avatar :size="40" :src="row.avatar">
                {{ row.name.charAt(0) }}
              </el-avatar>
            </template>
          </el-table-column>
          <el-table-column label="基本信息" min-width="200">
            <template #default="{ row }">
              <div class="basic-info">
                <div class="name">{{ row.name }}</div>
                <div class="gender-age">
                  <el-tag :type="row.gender === '男' ? 'primary' : 'danger'" size="small">
                    {{ row.gender }}
                  </el-tag>
                  <span class="age">{{ calculateAge(row.idCard) }}岁</span>
                </div>
                <div class="id-card">{{ maskIdCard(row.idCard) }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="联系方式" min-width="150">
            <template #default="{ row }">
              <div class="contact-info">
                <div class="phone">
                  <el-icon><Phone /></el-icon>
                  {{ row.phone }}
                </div>
                <div class="address">{{ row.address }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="家庭信息" min-width="150">
            <template #default="{ row }">
              <div class="household-info">
                <div class="household-code">户码: {{ row.householdCode }}</div>
                <div class="household-type">
                  <el-tag :type="getHouseholdTypeColor(row.householdType)" size="small">
                    {{ row.householdType }}
                  </el-tag>
                </div>
                <div class="relation">关系: {{ row.relation || '户主' }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="特殊标记" min-width="120">
            <template #default="{ row }">
              <div class="special-tags">
                <el-tag v-if="row.isLowIncome" type="warning" size="small">低保</el-tag>
                <el-tag v-if="row.isDisabled" type="info" size="small">残疾</el-tag>
                <el-tag v-if="row.isElderlyLivingAlone" type="danger" size="small">独居老人</el-tag>
                <el-tag v-if="row.hasInsurance" type="success" size="small">医保</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button type="primary" size="small" @click="viewResident(row)">
                  详情
                </el-button>
                <el-button type="success" size="small" @click="editResident(row)">
                  编辑
                </el-button>
                <el-dropdown @command="(command) => handleMoreAction(command, row)">
                  <el-button type="info" size="small">
                    更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="household">
                        <el-icon><House /></el-icon>家庭成员
                      </el-dropdown-item>
                      <el-dropdown-item command="documents">
                        <el-icon><Document /></el-icon>证件管理
                      </el-dropdown-item>
                      <el-dropdown-item command="services">
                        <el-icon><Service /></el-icon>服务记录
                      </el-dropdown-item>
                      <el-dropdown-item command="qrcode">
                        <el-icon><Grid /></el-icon>户码管理
                      </el-dropdown-item>
                      <el-dropdown-item command="delete" divided>
                        <el-icon><Delete /></el-icon>删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
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
      </div>
    </section>

    <!-- 添加/编辑村民对话框 -->
    <el-dialog
      v-model="residentDialogVisible"
      :title="isEditing ? '编辑村民信息' : '添加村民'"
      width="800px"
      @close="resetResidentForm"
    >
      <el-form :model="residentForm" :rules="residentRules" ref="residentFormRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="residentForm.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="residentForm.gender">
                <el-radio label="男">男</el-radio>
                <el-radio label="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="身份证号" prop="idCard">
              <el-input v-model="residentForm.idCard" placeholder="请输入身份证号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="residentForm.phone" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="家庭住址" prop="address">
              <el-input v-model="residentForm.address" placeholder="请输入家庭住址" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="户码" prop="householdCode">
              <el-input v-model="residentForm.householdCode" placeholder="请输入或生成户码" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="家庭类型" prop="householdType">
              <el-select v-model="residentForm.householdType" placeholder="请选择家庭类型">
                <el-option label="普通户" value="普通户" />
                <el-option label="低保户" value="低保户" />
                <el-option label="独生户" value="独生户" />
                <el-option label="残疾户" value="残疾户" />
                <el-option label="军人家庭" value="军人家庭" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="家庭关系" prop="relation">
              <el-select v-model="residentForm.relation" placeholder="请选择家庭关系">
                <el-option label="户主" value="户主" />
                <el-option label="配偶" value="配偶" />
                <el-option label="子女" value="子女" />
                <el-option label="父母" value="父母" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="教育程度" prop="education">
              <el-select v-model="residentForm.education" placeholder="请选择教育程度">
                <el-option label="小学及以下" value="小学及以下" />
                <el-option label="初中" value="初中" />
                <el-option label="高中" value="高中" />
                <el-option label="大专" value="大专" />
                <el-option label="本科" value="本科" />
                <el-option label="研究生" value="研究生" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="特殊标记">
          <el-checkbox-group v-model="residentForm.specialTags">
            <el-checkbox label="低保">低保户</el-checkbox>
            <el-checkbox label="残疾">残疾人</el-checkbox>
            <el-checkbox label="独居">独居老人</el-checkbox>
            <el-checkbox label="医保">已参保</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="头像">
          <el-upload
            class="avatar-uploader"
            action="#"
            :show-file-list="false"
            :on-success="handleAvatarSuccess"
            :before-upload="beforeAvatarUpload"
          >
            <img v-if="residentForm.avatar" :src="residentForm.avatar" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="residentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveResident">确定</el-button>
      </template>
    </el-dialog>

    <!-- 家庭管理对话框 -->
    <el-dialog
      v-model="householdDialogVisible"
      title="家庭管理"
      width="900px"
    >
      <div class="household-content">
        <div class="household-header">
          <el-input v-model="householdSearch" placeholder="搜索户码或姓名" style="width: 300px">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" @click="generateHouseholdCode">
            <el-icon><Grid /></el-icon>
            生成户码
          </el-button>
        </div>
        <div class="household-list">
          <!-- 家庭管理内容 -->
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  House,
  Upload,
  Download,
  User,
  Coin,
  CaretLeft,
  Baby,
  Calendar,
  Search,
  Phone,
  Document,
  Service,
  Grid,
  Delete,
  arrowDown
} from '@element-plus/icons-vue'

// 响应式数据
const searchParams = reactive({
  keyword: '',
  householdType: '',
  ageGroup: '',
  education: ''
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

const statistics = reactive({
  totalResidents: 1234,
  totalHouseholds: 456,
  lowIncomeHouseholds: 23,
  elderly: 187,
  children: 298,
  newThisMonth: 15
})

const residents = ref([
  {
    id: 1,
    name: '张小明',
    gender: '男',
    idCard: '330106199001011234',
    phone: '13812345678',
    address: '智慧村第一组123号',
    householdCode: 'SM2024001',
    householdType: '普通户',
    relation: '户主',
    education: '本科',
    isLowIncome: false,
    isDisabled: false,
    isElderlyLivingAlone: false,
    hasInsurance: true,
    avatar: ''
  },
  {
    id: 2,
    name: '李小红',
    gender: '女',
    idCard: '330106199201015678',
    phone: '13823456789',
    address: '智慧村第一组123号',
    householdCode: 'SM2024001',
    householdType: '普通户',
    relation: '配偶',
    education: '大专',
    isLowIncome: false,
    isDisabled: false,
    isElderlyLivingAlone: false,
    hasInsurance: true,
    avatar: ''
  }
])

const selectedResidents = ref([])
const residentDialogVisible = ref(false)
const householdDialogVisible = ref(false)
const householdSearch = ref('')
const isEditing = ref(false)

// 表单数据
const residentForm = reactive({
  name: '',
  gender: '男',
  idCard: '',
  phone: '',
  address: '',
  householdCode: '',
  householdType: '普通户',
  relation: '户主',
  education: '高中',
  specialTags: [],
  avatar: ''
})

const residentRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dX]$/, message: '请输入正确的身份证号', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  address: [{ required: true, message: '请输入家庭住址', trigger: 'blur' }],
  householdCode: [{ required: true, message: '请输入户码', trigger: 'blur' }]
}

const residentFormRef = ref(null)

// 计算属性
const filteredResidents = computed(() => {
  return residents.value.filter(resident => {
    const matchKeyword = !searchParams.keyword ||
      resident.name.includes(searchParams.keyword) ||
      resident.idCard.includes(searchParams.keyword) ||
      resident.phone.includes(searchParams.keyword) ||
      resident.address.includes(searchParams.keyword)

    const matchHouseholdType = !searchParams.householdType ||
      resident.householdType === searchParams.householdType

    const matchAgeGroup = !searchParams.ageGroup ||
      checkAgeGroup(resident.idCard, searchParams.ageGroup)

    const matchEducation = !searchParams.education ||
      resident.education === searchParams.education

    return matchKeyword && matchHouseholdType && matchAgeGroup && matchEducation
  })
})

// 方法
const calculateAge = (idCard) => {
  if (!idCard) return 0
  const birth = idCard.substring(6, 14)
  const year = parseInt(birth.substring(0, 4))
  const month = parseInt(birth.substring(4, 6))
  const day = parseInt(birth.substring(6, 8))
  const now = new Date()
  let age = now.getFullYear() - year
  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) {
    age--
  }
  return age
}

const checkAgeGroup = (idCard, ageGroup) => {
  const age = calculateAge(idCard)
  switch (ageGroup) {
    case '0-18':
      return age >= 0 && age <= 18
    case '19-35':
      return age >= 19 && age <= 35
    case '36-60':
      return age >= 36 && age <= 60
    case '60+':
      return age > 60
    default:
      return true
  }
}

const maskIdCard = (idCard) => {
  if (!idCard) return ''
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}

const getHouseholdTypeColor = (type) => {
  const colorMap = {
    '普通户': '',
    '低保户': 'warning',
    '独生户': 'success',
    '残疾户': 'info',
    '军人家庭': 'primary'
  }
  return colorMap[type] || ''
}

const handleSearch = () => {
  pagination.currentPage = 1
  // 搜索逻辑已在计算属性中实现
}

const handleSelectionChange = (selection) => {
  selectedResidents.value = selection
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  handleSearch()
}

const handleCurrentChange = (page) => {
  pagination.currentPage = page
}

const showAddResidentDialog = () => {
  isEditing.value = false
  residentDialogVisible.value = true
  resetResidentForm()
}

const showHouseholdDialog = () => {
  householdDialogVisible.value = true
}

const resetResidentForm = () => {
  Object.assign(residentForm, {
    name: '',
    gender: '男',
    idCard: '',
    phone: '',
    address: '',
    householdCode: '',
    householdType: '普通户',
    relation: '户主',
    education: '高中',
    specialTags: [],
    avatar: ''
  })
  if (residentFormRef.value) {
    residentFormRef.value.resetFields()
  }
}

const saveResident = async () => {
  if (!residentFormRef.value) return

  try {
    await residentFormRef.value.validate()

    // 处理特殊标记
    const newResident = {
      id: isEditing.value ? residentForm.id : Date.now(),
      ...residentForm,
      isLowIncome: residentForm.specialTags.includes('低保'),
      isDisabled: residentForm.specialTags.includes('残疾'),
      isElderlyLivingAlone: residentForm.specialTags.includes('独居'),
      hasInsurance: residentForm.specialTags.includes('医保')
    }

    if (isEditing.value) {
      const index = residents.value.findIndex(r => r.id === residentForm.id)
      if (index !== -1) {
        residents.value[index] = newResident
      }
      ElMessage.success('村民信息更新成功')
    } else {
      residents.value.push(newResident)
      ElMessage.success('村民添加成功')
    }

    residentDialogVisible.value = false
    updateStatistics()
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const viewResident = (resident) => {
  ElMessage.info(`查看 ${resident.name} 的详细信息`)
}

const editResident = (resident) => {
  isEditing.value = true
  Object.assign(residentForm, {
    ...resident,
    specialTags: [
      ...(resident.isLowIncome ? ['低保'] : []),
      ...(resident.isDisabled ? ['残疾'] : []),
      ...(resident.isElderlyLivingAlone ? ['独居'] : []),
      ...(resident.hasInsurance ? ['医保'] : [])
    ]
  })
  residentDialogVisible.value = true
}

const handleMoreAction = (command, resident) => {
  switch (command) {
    case 'household':
      ElMessage.info(`查看 ${resident.name} 的家庭成员`)
      break
    case 'documents':
      ElMessage.info(`管理 ${resident.name} 的证件信息`)
      break
    case 'services':
      ElMessage.info(`查看 ${resident.name} 的服务记录`)
      break
    case 'qrcode':
      ElMessage.info(`生成 ${resident.name} 的户码二维码`)
      break
    case 'delete':
      deleteResident(resident)
      break
  }
}

const deleteResident = (resident) => {
  ElMessageBox.confirm(
    `确定要删除 ${resident.name} 的信息吗？此操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'error'
    }
  ).then(() => {
    const index = residents.value.findIndex(r => r.id === resident.id)
    if (index !== -1) {
      residents.value.splice(index, 1)
      ElMessage.success('删除成功')
      updateStatistics()
    }
  }).catch(() => {})
}

const showAdvancedSearch = () => {
  ElMessage.info('高级搜索功能开发中...')
}

const importData = () => {
  ElMessage.info('批量导入功能开发中...')
}

const exportData = () => {
  ElMessage.success('数据导出成功')
}

const generateHouseholdCode = () => {
  const code = `SM${new Date().getFullYear()}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
  ElMessage.success(`已生成户码: ${code}`)
}

const updateStatistics = () => {
  statistics.totalResidents = residents.value.length
  statistics.totalHouseholds = new Set(residents.value.map(r => r.householdCode)).size
  statistics.lowIncomeHouseholds = residents.value.filter(r => r.isLowIncome).length
  statistics.elderly = residents.value.filter(r => calculateAge(r.idCard) >= 65).length
  statistics.children = residents.value.filter(r => calculateAge(r.idCard) < 18).length
}

const handleAvatarSuccess = (response) => {
  residentForm.avatar = response.url
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
  updateStatistics()
})
</script>

<style scoped>
.resident-management {
  padding: 2rem;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.75rem;
}

.header-content p {
  margin: 0;
  color: #7f8c8d;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.overview-section {
  margin-bottom: 2rem;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.overview-card {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.overview-card.total {
  border-left: 4px solid #3498db;
}

.overview-card.households {
  border-left: 4px solid #2ecc71;
}

.overview-card.low-income {
  border-left: 4px solid #f39c12;
}

.overview-card.elderly {
  border-left: 4px solid #e74c3c;
}

.overview-card.children {
  border-left: 4px solid #9b59b6;
}

.overview-card.this-month {
  border-left: 4px solid #1abc9c;
}

.card-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.overview-card.total .card-icon {
  background: rgba(52, 152, 219, 0.1);
  color: #3498db;
}

.overview-card.households .card-icon {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.overview-card.low-income .card-icon {
  background: rgba(243, 156, 18, 0.1);
  color: #f39c12;
}

.overview-card.elderly .card-icon {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.overview-card.children .card-icon {
  background: rgba(155, 89, 182, 0.1);
  color: #9b59b6;
}

.overview-card.this-month .card-icon {
  background: rgba(26, 188, 156, 0.1);
  color: #1abc9c;
}

.number {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
}

.label {
  color: #7f8c8d;
  font-size: 0.875rem;
}

.filter-section {
  background: white;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.filter-content {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.search-bar {
  flex: 1;
  min-width: 300px;
}

.filter-controls {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.residents-section {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.table-container {
  overflow-x: auto;
}

.basic-info .name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.gender-age {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.age {
  color: #7f8c8d;
  font-size: 0.875rem;
}

.id-card {
  color: #95a5a6;
  font-size: 0.75rem;
}

.contact-info .phone {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.contact-info .address {
  color: #7f8c8d;
  font-size: 0.875rem;
}

.household-info .household-code {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.household-info .relation {
  color: #7f8c8d;
  font-size: 0.75rem;
}

.special-tags {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.pagination-container {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
}

.avatar-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.avatar-uploader:hover {
  border-color: #409eff;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  line-height: 100px;
  text-align: center;
}

.avatar {
  width: 100px;
  height: 100px;
  display: block;
}

.household-content {
  max-height: 600px;
  overflow-y: auto;
}

.household-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #ecf0f1;
}

@media (max-width: 768px) {
  .resident-management {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .filter-content {
    flex-direction: column;
  }

  .filter-controls {
    width: 100%;
    flex-direction: column;
  }

  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>