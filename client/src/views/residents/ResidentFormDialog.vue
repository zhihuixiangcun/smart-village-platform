<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="800px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      class="resident-form"
    >
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="basic">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="姓名" prop="name">
                <el-input v-model="form.name" placeholder="请输入姓名" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="性别" prop="gender">
                <el-radio-group v-model="form.gender">
                  <el-radio label="male">男</el-radio>
                  <el-radio label="female">女</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="身份证号" prop="idCard">
                <el-input
                  v-model="form.idCard"
                  placeholder="请输入身份证号"
                  maxlength="18"
                  show-word-limit
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="出生日期" prop="birthDate">
                <el-date-picker
                  v-model="form.birthDate"
                  type="date"
                  placeholder="选择出生日期"
                  style="width: 100%"
                  value-format="YYYY-MM-DD"
                  @change="calculateAge"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="年龄">
                <el-input v-model="form.age" readonly placeholder="从出生日期自动计算" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="民族" prop="ethnicity">
                <el-select v-model="form.ethnicity" placeholder="请选择民族" style="width: 100%">
                  <el-option label="汉族" value="han" />
                  <el-option label="壮族" value="zhuang" />
                  <el-option label="回族" value="hui" />
                  <el-option label="满族" value="manchu" />
                  <el-option label="维吾尔族" value="uyghur" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="联系电话" prop="phone">
                <el-input
                  v-model="form.phone"
                  placeholder="请输入联系电话"
                  maxlength="11"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="婚姻状况" prop="maritalStatus">
                <el-select v-model="form.maritalStatus" placeholder="请选择" style="width: 100%">
                  <el-option label="未婚" value="unmarried" />
                  <el-option label="已婚" value="married" />
                  <el-option label="离异" value="divorced" />
                  <el-option label="丧偶" value="widowed" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="头像上传">
            <el-upload
              class="avatar-uploader"
              :action="uploadUrl"
              :show-file-list="false"
              :headers="uploadHeaders"
              :on-success="handleAvatarSuccess"
              :before-upload="beforeAvatarUpload"
            >
              <img v-if="form.avatar" :src="form.avatar" class="avatar" />
              <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
            </el-upload>
            <div class="upload-tip">建议上传 1:1 比例的照片，文件大小不超过 2MB</div>
          </el-form-item>
        </el-tab-pane>

        <!-- 详细信息 -->
        <el-tab-pane label="详细信息" name="details">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="户籍类型" prop="householdType">
                <el-select v-model="form.householdType" placeholder="请选择" style="width: 100%">
                  <el-option label="农业户口" value="agricultural" />
                  <el-option label="非农户口" value="non_agricultural" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="文化程度" prop="education">
                <el-select v-model="form.education" placeholder="请选择" style="width: 100%">
                  <el-option label="文盲" value="illiterate" />
                  <el-option label="小学" value="primary" />
                  <el-option label="初中" value="junior" />
                  <el-option label="高中" value="senior" />
                  <el-option label="大专" value="college" />
                  <el-option label="本科" value="bachelor" />
                  <el-option label="研究生" value="graduate" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="职业" prop="occupation">
                <el-input v-model="form.occupation" placeholder="请输入职业" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="政治面貌" prop="politicalStatus">
                <el-select v-model="form.politicalStatus" placeholder="请选择" style="width: 100%">
                  <el-option label="群众" value="masses" />
                  <el-option label="共青团员" value="youth_league" />
                  <el-option label="中共党员" value="party_member" />
                  <el-option label="民主党派" value="democratic_party" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="健康状态" prop="healthStatus">
                <el-select v-model="form.healthStatus" placeholder="请选择" style="width: 100%">
                  <el-option label="健康" value="healthy" />
                  <el-option label="慢性病" value="chronic" />
                  <el-option label="残疾" value="disabled" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="家庭角色" prop="familyRole">
                <el-select v-model="form.familyRole" placeholder="请选择" style="width: 100%">
                  <el-option label="户主" value="head" />
                  <el-option label="配偶" value="spouse" />
                  <el-option label="子女" value="child" />
                  <el-option label="父母" value="parent" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="特殊情况">
            <el-checkbox-group v-model="form.specialConditions">
              <el-checkbox label="low_income">低保户</el-checkbox>
              <el-checkbox label="disabled">残疾人</el-checkbox>
              <el-checkbox label="elderly_alone">独居老人</el-checkbox>
              <el-checkbox label="veteran">退伍军人</el-checkbox>
              <el-checkbox label="poverty">建档立卡贫困户</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-tab-pane>

        <!-- 居住信息 -->
        <el-tab-pane label="居住信息" name="address">
          <el-form-item label="详细地址" prop="address">
            <el-input
              v-model="form.address"
              type="textarea"
              :rows="3"
              placeholder="请输入详细居住地址"
            />
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="户码" prop="householdCode">
                <el-input
                  v-model="form.householdCode"
                  placeholder="系统自动生成或手动输入"
                >
                  <template #append>
                    <el-button @click="generateHouseholdCode" icon="Refresh">
                      生成
                    </el-button>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="房屋性质" prop="houseType">
                <el-select v-model="form.houseType" placeholder="请选择" style="width: 100%">
                  <el-option label="自有房屋" value="owned" />
                  <el-option label="租赁房屋" value="rented" />
                  <el-option label="公房" value="public" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="房屋面积" prop="houseArea">
                <el-input v-model.number="form.houseArea" placeholder="请输入面积">
                  <template #append>平方米</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="建造年份" prop="buildYear">
                <el-date-picker
                  v-model="form.buildYear"
                  type="year"
                  placeholder="选择建造年份"
                  style="width: 100%"
                  value-format="YYYY"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- 联系人信息 -->
        <el-tab-pane label="紧急联系人" name="emergency">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="联系人姓名" prop="emergencyContact.name">
                <el-input v-model="form.emergencyContact.name" placeholder="请输入联系人姓名" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="与本人关系" prop="emergencyContact.relationship">
                <el-select v-model="form.emergencyContact.relationship" placeholder="请选择" style="width: 100%">
                  <el-option label="配偶" value="spouse" />
                  <el-option label="子女" value="child" />
                  <el-option label="父母" value="parent" />
                  <el-option label="兄弟姐妹" value="sibling" />
                  <el-option label="其他亲属" value="relative" />
                  <el-option label="朋友" value="friend" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="联系电话" prop="emergencyContact.phone">
                <el-input v-model="form.emergencyContact.phone" placeholder="请输入联系电话" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系地址" prop="emergencyContact.address">
                <el-input v-model="form.emergencyContact.address" placeholder="请输入联系地址" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>

      <el-form-item label="备注" class="full-width">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
          placeholder="请输入备注信息"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ mode === 'add' ? '添加' : '保存' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { residentAPI } from '@/api/resident'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  resident: {
    type: Object,
    default: null
  },
  mode: {
    type: String,
    default: 'add' // 'add' | 'edit'
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const userStore = useUserStore()
const formRef = ref()
const submitting = ref(false)
const activeTab = ref('basic')

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 对话框标题
const dialogTitle = computed(() => {
  return props.mode === 'add' ? '新增村民档案' : '编辑村民档案'
})

// 表单数据
const form = reactive({
  name: '',
  gender: 'male',
  idCard: '',
  birthDate: '',
  age: '',
  ethnicity: 'han',
  phone: '',
  maritalStatus: 'unmarried',
  avatar: '',
  householdType: 'agricultural',
  education: '',
  occupation: '',
  politicalStatus: 'masses',
  healthStatus: 'healthy',
  familyRole: 'head',
  specialConditions: [],
  address: '',
  householdCode: '',
  houseType: 'owned',
  houseArea: '',
  buildYear: '',
  emergencyContact: {
    name: '',
    relationship: '',
    phone: '',
    address: ''
  },
  remark: ''
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 10, message: '姓名长度在 2 到 10 个字符', trigger: 'blur' }
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
  address: [
    { required: true, message: '请输入详细地址', trigger: 'blur' }
  ],
  householdCode: [
    { required: true, message: '请输入或生成户码', trigger: 'blur' }
  ]
}

// 上传配置
const uploadUrl = `${import.meta.env.VITE_APP_BASE_API}/upload/avatar`
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${userStore.token}`
}))

// 方法
const handleClose = () => {
  dialogVisible.value = false
  resetForm()
}

const resetForm = () => {
  Object.assign(form, {
    name: '',
    gender: 'male',
    idCard: '',
    birthDate: '',
    age: '',
    ethnicity: 'han',
    phone: '',
    maritalStatus: 'unmarried',
    avatar: '',
    householdType: 'agricultural',
    education: '',
    occupation: '',
    politicalStatus: 'masses',
    healthStatus: 'healthy',
    familyRole: 'head',
    specialConditions: [],
    address: '',
    householdCode: '',
    houseType: 'owned',
    houseArea: '',
    buildYear: '',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      address: ''
    },
    remark: ''
  })

  activeTab.value = 'basic'
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

const fillForm = (resident) => {
  if (resident) {
    Object.assign(form, {
      ...resident,
      emergencyContact: {
        ...form.emergencyContact,
        ...(resident.emergencyContact || {})
      }
    })
  }
}

const calculateAge = () => {
  if (form.birthDate) {
    const birth = new Date(form.birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    form.age = age.toString()
  }
}

const generateHouseholdCode = () => {
  // 生成户码：村庄代码 + 年份 + 序号
  const villageCode = '001' // 从用户信息或配置中获取
  const year = new Date().getFullYear().toString().slice(-2)
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  form.householdCode = `${villageCode}${year}${random}`
}

const handleAvatarSuccess = (response) => {
  if (response.success) {
    form.avatar = response.data.url
    ElMessage.success('头像上传成功')
  } else {
    ElMessage.error('头像上传失败')
  }
}

const beforeAvatarUpload = (file) => {
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPG) {
    ElMessage.error('头像图片只能是 JPG 或 PNG 格式!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('头像图片大小不能超过 2MB!')
    return false
  }
  return true
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    submitting.value = true

    const submitData = { ...form }

    let response
    if (props.mode === 'add') {
      response = await residentAPI.createResident(submitData)
    } else {
      response = await residentAPI.updateResident(props.resident.id, submitData)
    }

    if (response.success) {
      ElMessage.success(`${props.mode === 'add' ? '添加' : '保存'}成功`)
      emit('confirm')
      handleClose()
    }
  } catch (error) {
    if (error !== false) { // 验证失败会返回 false
      ElMessage.error(`${props.mode === 'add' ? '添加' : '保存'}失败`)
    }
  } finally {
    submitting.value = false
  }
}

// 监听身份证号变化，自动填充出生日期
watch(() => form.idCard, (newVal) => {
  if (newVal && newVal.length === 18) {
    const year = newVal.slice(6, 10)
    const month = newVal.slice(10, 12)
    const day = newVal.slice(12, 14)

    if (year && month && day) {
      form.birthDate = `${year}-${month}-${day}`
      calculateAge()
    }
  }
})

// 监听对话框显示状态
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    nextTick(() => {
      if (props.mode === 'edit' && props.resident) {
        fillForm(props.resident)
      } else {
        resetForm()
      }
    })
  }
})
</script>

<style lang="scss" scoped>
.resident-form {
  :deep(.el-tabs__content) {
    padding: 20px 0;
  }

  .full-width {
    width: 100%;
  }
}

.avatar-uploader {
  :deep(.el-upload) {
    border: 1px dashed var(--el-border-color);
    border-radius: 6px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: var(--el-transition-duration-fast);

    &:hover {
      border-color: var(--el-color-primary);
    }
  }

  .avatar {
    width: 100px;
    height: 100px;
    display: block;
    object-fit: cover;
  }

  .avatar-uploader-icon {
    font-size: 28px;
    color: #8c939d;
    width: 100px;
    height: 100px;
    text-align: center;
    line-height: 100px;
  }
}

.upload-tip {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.dialog-footer {
  text-align: right;
}

// 响应式设计
@media (max-width: 768px) {
  .resident-form {
    :deep(.el-col) {
      width: 100%;
      margin-bottom: 20px;
    }
  }
}
</style>