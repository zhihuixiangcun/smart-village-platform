<template>
  <div class="resident-detail">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.go(-1)" icon="ArrowLeft">返回</el-button>
        <h1 class="page-title">村民详情</h1>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="editResident" icon="Edit">编辑</el-button>
        <el-button @click="exportPDF" icon="Download">导出档案</el-button>
      </div>
    </div>

    <div class="resident-content">
      <el-row :gutter="24">
        <!-- 基本信息 -->
        <el-col :span="8">
          <el-card class="info-card">
            <template #header>
              <span class="card-title">
                <el-icon><User /></el-icon>
                基本信息
              </span>
            </template>
            <div class="info-item">
              <label>姓名：</label>
              <span>{{ resident.name || '未知' }}</span>
            </div>
            <div class="info-item">
              <label>性别：</label>
              <span>{{ resident.gender || '未知' }}</span>
            </div>
            <div class="info-item">
              <label>身份证号：</label>
              <span>{{ resident.idCard ? maskIdCard(resident.idCard) : '未知' }}</span>
            </div>
            <div class="info-item">
              <label>出生日期：</label>
              <span>{{ resident.birthDate || '未知' }}</span>
            </div>
            <div class="info-item">
              <label>年龄：</label>
              <span>{{ calculateAge(resident.birthDate) }}岁</span>
            </div>
            <div class="info-item">
              <label>联系电话：</label>
              <span>{{ resident.phone || '未知' }}</span>
            </div>
          </el-card>
        </el-col>

        <!-- 户籍信息 -->
        <el-col :span="8">
          <el-card class="info-card">
            <template #header>
              <span class="card-title">
                <el-icon><House /></el-icon>
                户籍信息
              </span>
            </template>
            <div class="info-item">
              <label>户主姓名：</label>
              <span>{{ resident.householdHead || '未知' }}</span>
            </div>
            <div class="info-item">
              <label>家庭住址：</label>
              <span>{{ resident.address || '未知' }}</span>
            </div>
            <div class="info-item">
              <label>所属村组：</label>
              <span>{{ resident.village || '未知' }}</span>
            </div>
            <div class="info-item">
              <label>家庭类型：</label>
              <el-tag v-if="resident.familyType" :type="getFamilyTypeColor(resident.familyType)">
                {{ resident.familyType }}
              </el-tag>
              <span v-else>未设置</span>
            </div>
          </el-card>
        </el-col>

        <!-- 健康状态 -->
        <el-col :span="8">
          <el-card class="info-card">
            <template #header>
              <span class="card-title">
                <el-icon><FirstAidKit /></el-icon>
                健康状态
              </span>
            </template>
            <div class="info-item">
              <label>健康档案：</label>
              <el-tag v-if="resident.hasHealthRecord" type="success">已建立</el-tag>
              <el-tag v-else type="info">未建立</el-tag>
            </div>
            <div class="info-item">
              <label>疫苗接种：</label>
              <span>{{ resident.vaccination || '未记录' }}</span>
            </div>
            <div class="info-item">
              <label>特殊健康状况：</label>
              <span>{{ resident.specialHealth || '无' }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 二维码信息 -->
      <el-row :gutter="24" style="margin-top: 20px;">
        <el-col :span="12">
          <el-card>
            <template #header>
              <span class="card-title">
                <el-icon><QrCode /></el-icon>
                户户二维码
              </span>
            </template>
            <div class="qrcode-container">
              <div v-if="resident.householdCode" class="qrcode-display">
                <img :src="generateQRCode(resident.householdCode)" alt="户二维码" />
                <p>户二维码：{{ resident.householdCode }}</p>
              </div>
              <div v-else class="no-qrcode">
                <el-empty description="暂无二维码" />
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 家庭成员 -->
        <el-col :span="12">
          <el-card>
            <template #header>
              <span class="card-title">
                <el-icon><UserFilled /></el-icon>
                家庭成员
              </span>
            </template>
            <div class="family-members">
              <div v-if="familyMembers.length > 0">
                <div v-for="member in familyMembers" :key="member.id" class="member-item">
                  <el-avatar :size="32" :src="member.avatar">{{ member.name.charAt(0) }}</el-avatar>
                  <div class="member-info">
                    <div class="member-name">{{ member.name }}</div>
                    <div class="member-relation">{{ member.relation }}</div>
                  </div>
                </div>
              </div>
              <div v-else class="no-members">
                <el-empty description="暂无家庭成员记录" />
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 操作记录 -->
      <el-row :gutter="24" style="margin-top: 20px;">
        <el-col :span="24">
          <el-card>
            <template #header>
              <span class="card-title">
                <el-icon><Document /></el-icon>
                操作记录
              </span>
              <el-button @click="loadOperationLogs" size="small" icon="Refresh">刷新</el-button>
            </template>
            <el-table :data="operationLogs" v-loading="loadingLogs" style="width: 100%">
              <el-table-column prop="date" label="操作时间" width="180" />
              <el-table-column prop="operator" label="操作人" width="120" />
              <el-table-column prop="action" label="操作类型" width="120" />
              <el-table-column prop="description" label="详细描述" />
              <el-table-column label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="getOperationStatusColor(scope.row.status)">
                    {{ scope.row.status }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 编辑对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑村民信息" width="600px">
      <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="100px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="editForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-select v-model="editForm.gender" placeholder="请选择性别">
            <el-option label="男" value="男" />
            <el-option label="女" value="女" />
          </el-select>
        </el-form-item>
        <el-form-item label="身份证号" prop="idCard">
          <el-input v-model="editForm.idCard" placeholder="请输入身份证号" />
        </el-form-item>
        <el-form-item label="出生日期" prop="birthDate">
          <el-date-picker v-model="editForm.birthDate" type="date" placeholder="请选择出生日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="editForm.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="家庭住址" prop="address">
          <el-input v-model="editForm.address" type="textarea" :rows="3" placeholder="请输入详细地址" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveResident" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'

const route = useRoute()
const resident = ref({})
const familyMembers = ref([])
const operationLogs = ref([])
const loadingLogs = ref(false)
const editDialogVisible = ref(false)
const editFormRef = ref()
const saving = ref(false)

const editForm = reactive({
  name: '',
  gender: '',
  idCard: '',
  birthDate: '',
  phone: '',
  address: ''
})

const editRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  idCard: [{ required: true, message: '请输入身份证号', trigger: 'blur' }],
  birthDate: [{ required: true, message: '请选择出生日期', trigger: 'change' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  address: [{ required: true, message: '请输入详细地址', trigger: 'blur' }]
}

// 模拟数据
const mockResident = {
  id: 1,
  name: '张三',
  gender: '男',
  idCard: '110101199001011234',
  birthDate: '1980-05-15',
  phone: '13800138000',
  address: '智慧村1号楼',
  village: '第一村民组',
  householdHead: '张大明',
  familyType: '普通户',
  hasHealthRecord: true,
  vaccination: '已完成基础免疫',
  specialHealth: '无',
  householdCode: 'VILLAGE001001',
  avatar: ''
}

const mockFamilyMembers = [
  { id: 1, name: '张大明', relation: '户主', avatar: '' },
  { id: 2, name: '李四', relation: '配偶', avatar: '' },
  { id: 3, name: '张小明', relation: '儿子', avatar: '' }
]

const mockOperationLogs = [
  { date: '2024-01-15 10:30:00', operator: '管理员', action: '信息录入', description: '录入村民基本信息', status: '成功' },
  { date: '2024-01-15 11:20:00', operator: '管理员', action: '档案更新', description: '更新健康档案信息', status: '成功' },
  { date: '2024-01-15 14:15:00', operator: '管理员', action: '二维码生成', description: '生成户二维码', status: '成功' }
]

// 计算年龄
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

// 脱敏身份证号
const maskIdCard = (idCard) => {
  if (!idCard || idCard.length < 8) return idCard
  return idCard.substring(0, 4) + '********' + idCard.substring(idCard.length - 4)
}

// 获取家庭类型颜色
const getFamilyTypeColor = (type) => {
  const colorMap = {
    '低保户': 'danger',
    '独生户': 'warning',
    '普通户': 'info'
  }
  return colorMap[type] || 'info'
}

// 获取操作状态颜色
const getOperationStatusColor = (status) => {
  const colorMap = {
    '成功': 'success',
    '失败': 'danger',
    '处理中': 'warning'
  }
  return colorMap[status] || 'info'
}

// 生成二维码
const generateQRCode = (code) => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(code)}`
}

// 加载村民详情
const loadResidentDetail = async () => {
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    resident.value = mockResident
    familyMembers.value = mockFamilyMembers
    operationLogs.value = mockOperationLogs
  } catch (error) {
    ElMessage.error('加载村民详情失败')
    console.error('加载村民详情失败:', error)
  }
}

// 加载操作记录
const loadOperationLogs = async () => {
  loadingLogs.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    operationLogs.value = mockOperationLogs
  } catch (error) {
    ElMessage.error('加载操作记录失败')
  } finally {
    loadingLogs.value = false
  }
}

// 编辑村民
const editResident = () => {
  Object.assign(editForm, resident.value)
  editDialogVisible.value = true
}

// 保存村民信息
const saveResident = async () => {
  if (!editFormRef.value) return

  try {
    await editFormRef.value.validate()
    saving.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 更新本地数据
    Object.assign(resident.value, editForm)

    ElMessage.success('保存成功')
    editDialogVisible.value = false
  } catch (error) {
    ElMessage.error('保存失败：' + (error.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

// 导出PDF
const exportPDF = () => {
  ElMessage.info('PDF导出功能开发中...')
}

onMounted(() => {
  const residentId = route.params.id
  if (residentId) {
    loadResidentDetail()
  }
})
</script>

<style lang="scss" scoped>
.resident-detail {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.resident-content {
  .info-card {
    margin-bottom: 20px;
    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #303133;
    }
  }

  .info-item {
    display: flex;
    margin-bottom: 16px;
    align-items: flex-start;

    label {
      width: 100px;
      font-weight: 500;
      color: #606266;
      flex-shrink: 0;
    }

    span {
      color: #303133;
      word-break: break-all;
    }
  }

  .qrcode-container {
    text-align: center;

    .qrcode-display {
      img {
        max-width: 150px;
        height: 150px;
        border: 1px solid #dcdfe6;
        border-radius: 4px;
      }

      p {
        margin-top: 10px;
        color: #606266;
        font-family: monospace;
      }
    }

    .no-qrcode {
      padding: 20px;
    }
  }

  .family-members {
    .member-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;

      .member-info {
        .member-name {
          font-weight: 500;
          color: #303133;
        }

        .member-relation {
          font-size: 14px;
          color: #909399;
        }
      }
    }

    .no-members {
      padding: 20px;
    }
  }
}
</style>

<style lang="scss" scoped>
.resident-view {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.page-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.page-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.page-main {
  padding: 24px;
}
</style>