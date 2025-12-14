<template>
  <div class="resident-edit-view">
    <el-page-header @back="goBack" title="编辑村民信息">
      <template #content>
        <span v-if="resident">编辑 {{ resident.name }} 的信息</span>
      </template>
    </el-page-header>

    <div class="content" v-if="!loading">
      <el-card>
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="120px"
          class="resident-form"
        >
          <el-row :gutter="20">
            <!-- 基本信息 -->
            <el-col :span="12">
              <h3>基本信息</h3>
              <el-form-item label="姓名" prop="name">
                <el-input v-model="form.name" placeholder="请输入姓名" />
              </el-form-item>

              <el-form-item label="性别" prop="gender">
                <el-radio-group v-model="form.gender">
                  <el-radio label="男">男</el-radio>
                  <el-radio label="女">女</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="出生日期" prop="birthday">
                <el-date-picker
                  v-model="form.birthday"
                  type="date"
                  placeholder="请选择出生日期"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>

              <el-form-item label="身份证号" prop="idCard">
                <el-input v-model="form.idCard" placeholder="请输入身份证号" />
              </el-form-item>

              <el-form-item label="手机号" prop="phone">
                <el-input v-model="form.phone" placeholder="请输入手机号" />
              </el-form-item>
            </el-col>

            <!-- 户籍信息 -->
            <el-col :span="12">
              <h3>户籍信息</h3>
              <el-form-item label="户籍地址" prop="address">
                <el-input v-model="form.address" placeholder="请输入户籍地址" />
              </el-form-item>

              <el-form-item label="现居住地" prop="currentAddress">
                <el-input v-model="form.currentAddress" placeholder="请输入现居住地" />
              </el-form-item>

              <el-form-item label="户籍类型" prop="householdType">
                <el-select v-model="form.householdType" placeholder="请选择户籍类型">
                  <el-option label="普通户" value="普通户" />
                  <el-option label="低保户" value="低保户" />
                  <el-option label="五保户" value="五保户" />
                  <el-option label="贫困户" value="贫困户" />
                  <el-option label="独居老人" value="独居老人" />
                </el-select>
              </el-form-item>

              <el-form-item label="政治面貌" prop="politicalStatus">
                <el-select v-model="form.politicalStatus" placeholder="请选择政治面貌">
                  <el-option label="群众" value="群众" />
                  <el-option label="党员" value="党员" />
                  <el-option label="团员" value="团员" />
                  <el-option label="民主党派" value="民主党派" />
                </el-select>
              </el-form-item>

              <el-form-item label="健康状态" prop="healthStatus">
                <el-select v-model="form.healthStatus" placeholder="请选择健康状态">
                  <el-option label="良好" value="良好" />
                  <el-option label="一般" value="一般" />
                  <el-option label="较差" value="较差" />
                  <el-option label="残疾" value="残疾" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <!-- 其他信息 -->
          <el-row>
            <el-col :span="24">
              <h3>其他信息</h3>
              <el-form-item label="备注" prop="remarks">
                <el-input
                  v-model="form.remarks"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入备注信息"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item>
            <el-button type="primary" :loading="saving" @click="updateResident">
              保存修改
            </el-button>
            <el-button @click="resetForm">重置</el-button>
            <el-button @click="goBack">取消</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <div v-else class="loading">
      <el-skeleton :rows="8" animated />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useResidentStore } from '@/stores/residentStore'

const route = useRoute()
const router = useRouter()
const residentStore = useResidentStore()
const formRef = ref(null)
const saving = ref(false)
const loading = ref(true)
const resident = ref(null)

const residentId = route.params.id

const form = reactive({
  name: '',
  gender: '',
  birthday: '',
  idCard: '',
  phone: '',
  address: '',
  currentAddress: '',
  householdType: '',
  politicalStatus: '',
  healthStatus: '',
  remarks: ''
})

// 身份证号验证
const validateIdCard = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入身份证号'))
    return
  }

  const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
  if (!idCardRegex.test(value)) {
    callback(new Error('请输入正确的身份证号'))
    return
  }

  callback()
}

// 手机号验证
const validatePhone = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入手机号'))
    return
  }

  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(value)) {
    callback(new Error('请输入正确的手机号'))
    return
  }

  callback()
}

const rules = reactive({
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 10, message: '姓名长度在 2 到 10 个字符', trigger: 'blur' }
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' }
  ],
  birthday: [
    { required: true, message: '请选择出生日期', trigger: 'change' }
  ],
  idCard: [
    { validator: validateIdCard, trigger: 'blur' }
  ],
  phone: [
    { validator: validatePhone, trigger: 'blur' }
  ],
  address: [
    { required: true, message: '请输入户籍地址', trigger: 'blur' }
  ],
  householdType: [
    { required: true, message: '请选择户籍类型', trigger: 'change' }
  ]
})

// 计算年龄
const calculateAge = (birthday) => {
  if (!birthday) return 0
  const today = new Date()
  const birthDate = new Date(birthday)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

const loadResidentData = async () => {
  try {
    loading.value = true
    resident.value = await residentStore.getResidentDetail(residentId)

    // 填充表单数据
    Object.keys(form).forEach(key => {
      if (resident.value[key] !== undefined) {
        form[key] = resident.value[key]
      }
    })

  } catch (error) {
    console.error('加载村民信息失败:', error)
    ElMessage.error('加载村民信息失败')
  } finally {
    loading.value = false
  }
}

const updateResident = async () => {
  try {
    await formRef.value.validate()
    saving.value = true

    // 计算年龄
    const age = calculateAge(form.birthday)

    const residentData = {
      ...form,
      age,
      // 如果现居住地为空，使用户籍地址
      currentAddress: form.currentAddress || form.address
    }

    await residentStore.updateResident(residentId, residentData)

    ElMessage.success('村民信息更新成功')
    router.push(`/residents/${residentId}`)

  } catch (error) {
    console.error('更新村民信息失败:', error)
    ElMessage.error('更新失败，请重试')
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  // 重置为原始数据
  Object.keys(form).forEach(key => {
    if (resident.value[key] !== undefined) {
      form[key] = resident.value[key]
    }
  })
}

const goBack = () => {
  router.go(-1)
}

onMounted(() => {
  loadResidentData()
})
</script>

<style scoped>
.resident-edit-view {
  padding: 20px;
}

.content {
  margin-top: 20px;
}

.resident-form {
  padding: 20px;
}

.resident-form h3 {
  margin: 0 0 20px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #e4e7ed;
  color: #303133;
}

.loading {
  padding: 20px;
}
</style>