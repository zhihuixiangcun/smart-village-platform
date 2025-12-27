<template>
  <div class="profile-form">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      size="default"
    >
      <!-- 基本信息 -->
      <div class="form-section">
        <h3>基本信息</h3>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="personalInfo.name">
              <el-input
                v-model="formData.personalInfo.name"
                placeholder="请输入姓名"
                :disabled="!canEdit"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="personalInfo.gender">
              <el-select
                v-model="formData.personalInfo.gender"
                placeholder="请选择性别"
                :disabled="!canEdit"
              >
                <el-option label="男" value="男" />
                <el-option label="女" value="女" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="民族" prop="personalInfo.ethnicity">
              <el-select
                v-model="formData.personalInfo.ethnicity"
                placeholder="请选择民族"
                :disabled="!canEdit"
              >
                <el-option label="汉族" value="汉族" />
                <el-option label="壮族" value="壮族" />
                <el-option label="回族" value="回族" />
                <el-option label="满族" value="满族" />
                <el-option label="维吾尔族" value="维吾尔族" />
                <el-option label="苗族" value="苗族" />
                <el-option label="彝族" value="彝族" />
                <el-option label="土家族" value="土家族" />
                <el-option label="藏族" value="藏族" />
                <el-option label="蒙古族" value="蒙古族" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="政治面貌" prop="personalInfo.politicalStatus">
              <el-select
                v-model="formData.personalInfo.politicalStatus"
                placeholder="请选择政治面貌"
                :disabled="!canEdit"
              >
                <el-option label="群众" value="群众" />
                <el-option label="中共党员" value="中共党员" />
                <el-option label="共青团员" value="共青团员" />
                <el-option label="民主党派" value="民主党派" />
                <el-option label="无党派人士" value="无党派人士" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="婚姻状况" prop="personalInfo.maritalStatus">
              <el-select
                v-model="formData.personalInfo.maritalStatus"
                placeholder="请选择婚姻状况"
                :disabled="!canEdit"
              >
                <el-option label="未婚" value="未婚" />
                <el-option label="已婚" value="已婚" />
                <el-option label="离异" value="离异" />
                <el-option label="丧偶" value="丧偶" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="健康状况" prop="personalInfo.healthStatus">
              <el-select
                v-model="formData.personalInfo.healthStatus"
                placeholder="请选择健康状况"
                :disabled="!canEdit"
              >
                <el-option label="健康" value="健康" />
                <el-option label="良好" value="良好" />
                <el-option label="一般" value="一般" />
                <el-option label="较差" value="较差" />
                <el-option label="残疾" value="残疾" />
                <el-option label="重病" value="重病" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="血型" prop="personalInfo.bloodType">
              <el-select
                v-model="formData.personalInfo.bloodType"
                placeholder="请选择血型"
                :disabled="!canEdit"
              >
                <el-option label="A型" value="A型" />
                <el-option label="B型" value="B型" />
                <el-option label="O型" value="O型" />
                <el-option label="AB型" value="AB型" />
                <el-option label="RH阳性" value="RH阳性" />
                <el-option label="RH阴性" value="RH阴性" />
                <el-option label="未知" value="未知" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 联系方式 -->
      <div class="form-section">
        <h3>联系方式</h3>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="手机号码" prop="contact.phone">
              <el-input
                v-model="formData.contact.phone"
                placeholder="请输入手机号码"
                :disabled="!canEdit"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="电子邮箱" prop="contact.email">
              <el-input
                v-model="formData.contact.email"
                placeholder="请输入电子邮箱（可选）"
                :disabled="!canEdit"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="家庭住址" prop="contact.address">
              <el-input
                v-model="formData.contact.address"
                placeholder="请输入家庭住址"
                :disabled="!canEdit"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="微信号" prop="contact.wechat">
              <el-input
                v-model="formData.contact.wechat"
                placeholder="请输入微信号（可选）"
                :disabled="!canEdit"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="QQ号" prop="contact.qq">
              <el-input
                v-model="formData.contact.qq"
                placeholder="请输入QQ号（可选）"
                :disabled="!canEdit"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 教育背景 -->
      <div class="form-section">
        <h3>教育背景</h3>
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="学历" prop="education.degree">
              <el-select
                v-model="formData.education.degree"
                placeholder="请选择学历"
                :disabled="!canEdit"
              >
                <el-option label="文盲" value="文盲" />
                <el-option label="小学" value="小学" />
                <el-option label="初中" value="初中" />
                <el-option label="高中" value="高中" />
                <el-option label="中专" value="中专" />
                <el-option label="大专" value="大专" />
                <el-option label="本科" value="本科" />
                <el-option label="研究生" value="研究生" />
                <el-option label="博士" value="博士" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="毕业学校" prop="education.school">
              <el-input
                v-model="formData.education.school"
                placeholder="请输入毕业学校（可选）"
                :disabled="!canEdit"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="专业" prop="education.major">
              <el-input
                v-model="formData.education.major"
                placeholder="请输入专业（可选）"
                :disabled="!canEdit"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="毕业年份" prop="education.graduationYear">
              <el-input
                v-model="formData.education.graduationYear"
                placeholder="请输入毕业年份（可选）"
                :disabled="!canEdit"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 就业信息 -->
      <div class="form-section">
        <h3>就业信息</h3>
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="就业状态" prop="employment.status">
              <el-select
                v-model="formData.employment.status"
                placeholder="请选择就业状态"
                :disabled="!canEdit"
              >
                <el-option label="在职" value="在职" />
                <el-option label="自由职业" value="自由职业" />
                <el-option label="待业" value="待业" />
                <el-option label="退休" value="退休" />
                <el-option label="学生" value="学生" />
                <el-option label="务农" value="务农" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="工作单位" prop="employment.employer">
              <el-input
                v-model="formData.employment.employer"
                placeholder="请输入工作单位（可选）"
                :disabled="!canEdit"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="职位" prop="employment.position">
              <el-input
                v-model="formData.employment.position"
                placeholder="请输入职位（可选）"
                :disabled="!canEdit"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="月收入" prop="employment.income.monthly">
              <el-input-number
                v-model="formData.employment.income.monthly"
                :min="0"
                :max="999999"
                placeholder="请输入月收入（元）"
                :disabled="!canEdit"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 社会保障 -->
      <div class="form-section">
        <h3>社会保障</h3>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="医疗保险">
              <el-checkbox
                v-model="formData.socialSecurity.hasMedicalInsurance"
                :disabled="!canEdit"
              >
                有医保
              </el-checkbox>
              <el-select
                v-if="formData.socialSecurity.hasMedicalInsurance"
                v-model="formData.socialSecurity.medicalInsuranceType"
                placeholder="请选择医保类型"
                :disabled="!canEdit"
                style="margin-left: 10px"
              >
                <el-option label="城镇职工医保" value="城镇职工医保" />
                <el-option label="城乡居民医保" value="城乡居民医保" />
                <el-option label="新农合" value="新农合" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="养老保险">
              <el-checkbox
                v-model="formData.socialSecurity.hasPensionInsurance"
                :disabled="!canEdit"
              >
                有养老保险
              </el-checkbox>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="失业保险">
              <el-checkbox
                v-model="formData.socialSecurity.hasUnemploymentInsurance"
                :disabled="!canEdit"
              >
                有失业保险
              </el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 家庭关系 -->
      <div class="form-section">
        <h3>家庭成员</h3>
        <p class="section-tip">如需修改家庭成员信息，请联系村委会管理员</p>
        <el-table :data="formData.familyRelations" style="width: 100%">
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="relationType" label="关系" width="100" />
          <el-table-column prop="age" label="年龄" width="80" align="center" />
          <el-table-column prop="phone" label="联系电话" width="150" />
          <el-table-column prop="occupation" label="职业" />
          <el-table-column prop="isCohabit" label="是否同住" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isCohabit ? 'success' : 'info'" size="small">
                {{ row.isCohabit ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-form>

    <!-- 表单操作 -->
    <div class="form-actions" v-if="canEdit">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        保存
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { validatePhone } from '@/utils/validate'

// Props
const props = defineProps({
  profile: {
    type: Object,
    default: () => ({})
  },
  mode: {
    type: String,
    default: 'view' // view | edit
  }
})

// Emits
const emit = defineEmits(['submit', 'cancel'])

// 表单引用
const formRef = ref(null)

// 提交状态
const submitting = ref(false)

// 是否可编辑
const canEdit = computed(() => {
  return props.mode === 'edit'
})

// 表单数据
const formData = reactive({
  personalInfo: {
    name: '',
    gender: '',
    birthDate: '',
    idCard: '',
    ethnicity: '',
    politicalStatus: '',
    maritalStatus: '',
    healthStatus: '',
    bloodType: '',
    photo: ''
  },
  contact: {
    phone: '',
    email: '',
    address: '',
    wechat: '',
    qq: ''
  },
  education: {
    degree: '',
    school: '',
    major: '',
    graduationYear: ''
  },
  employment: {
    status: '',
    employer: '',
    position: '',
    income: {
      monthly: null
    }
  },
  socialSecurity: {
    hasMedicalInsurance: false,
    medicalInsuranceType: '',
    hasPensionInsurance: false,
    hasUnemploymentInsurance: false
  },
  familyRelations: []
})

// 表单验证规则
const formRules = {
  'personalInfo.name': [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  'personalInfo.gender': [
    { required: true, message: '请选择性别', trigger: 'change' }
  ],
  'personalInfo.ethnicity': [
    { required: true, message: '请选择民族', trigger: 'change' }
  ],
  'contact.phone': [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { validator: (rule, value, callback) => {
      if (!validatePhone(value)) {
        callback(new Error('请输入正确的手机号'))
      } else {
        callback()
      }
    }, trigger: 'blur' }
  ],
  'contact.address': [
    { required: true, message: '请输入家庭住址', trigger: 'blur' }
  ],
  'contact.email': [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }
  ]
}

// 初始化表单数据
const initFormData = () => {
  if (props.profile) {
    // 深拷贝避免直接修改props
    Object.assign(formData, JSON.parse(JSON.stringify(props.profile)))
  }
}

// 提交表单
const handleSubmit = async () => {
  // 表单验证
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true

  try {
    // 准备提交数据
    const submitData = {
      ...formData,
      // 确保数值类型正确
      employment: {
        ...formData.employment,
        income: {
          monthly: formData.employment.income.monthly || 0
        }
      }
    }

    emit('submit', submitData)
  } catch (error) {
    ElMessage.error('保存失败')
    console.error(error)
  } finally {
    submitting.value = false
  }
}

// 取消
const handleCancel = () => {
  emit('cancel')
}

// 监听档案数据变化
watch(() => props.profile, () => {
  initFormData()
}, { immediate: true })
</script>

<style lang="scss" scoped>
.profile-form {
  .form-section {
    margin-bottom: 30px;

    h3 {
      margin: 0 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #409eff;
      font-size: 16px;
      color: #303133;
    }

    .section-tip {
      margin: 0 0 15px 0;
      color: #909399;
      font-size: 14px;
    }
  }

  .form-actions {
    margin-top: 40px;
    text-align: center;

    .el-button {
      margin: 0 10px;
      min-width: 100px;
    }
  }
}
</style>