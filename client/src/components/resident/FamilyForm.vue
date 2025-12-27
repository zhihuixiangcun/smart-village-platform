<template>
  <div class="family-form">
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
            <el-form-item label="家庭名称" prop="familyName">
              <el-input
                v-model="formData.familyName"
                placeholder="请输入家庭名称（通常为户主姓名）"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="家庭类型" prop="familyType">
              <el-select v-model="formData.familyType" placeholder="请选择家庭类型">
                <el-option label="普通户" value="普通户" />
                <el-option label="低保户" value="低保户" />
                <el-option label="特困户" value="特困户" />
                <el-option label="独生户" value="独生户" />
                <el-option label="双女户" value="双女户" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 地址信息 -->
      <div class="form-section">
        <h3>地址信息</h3>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="省份" prop="address.province">
              <el-select v-model="formData.address.province" placeholder="请选择省份">
                <el-option
                  v-for="province in provinces"
                  :key="province.value"
                  :label="province.label"
                  :value="province.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="城市" prop="address.city">
              <el-select v-model="formData.address.city" placeholder="请选择城市">
                <el-option
                  v-for="city in cities"
                  :key="city.value"
                  :label="city.label"
                  :value="city.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="区县" prop="address.county">
              <el-select v-model="formData.address.county" placeholder="请选择区县">
                <el-option
                  v-for="county in counties"
                  :key="county.value"
                  :label="county.label"
                  :value="county.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="乡镇" prop="address.town">
              <el-input v-model="formData.address.town" placeholder="请输入乡镇名称" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="村名" prop="address.village">
              <el-input v-model="formData.address.village" placeholder="请输入村名" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="村民组" prop="address.group">
              <el-input v-model="formData.address.group" placeholder="请输入村民组（可选）" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="详细地址" prop="address.detail">
          <el-input
            v-model="formData.address.detail"
            type="textarea"
            :rows="2"
            placeholder="请输入详细地址"
          />
        </el-form-item>
      </div>

      <!-- 联系方式 -->
      <div class="form-section">
        <h3>联系方式</h3>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="主要手机" prop="contact.primaryPhone">
              <el-input
                v-model="formData.contact.primaryPhone"
                placeholder="请输入主要联系电话"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="备用手机" prop="contact.secondaryPhone">
              <el-input
                v-model="formData.contact.secondaryPhone"
                placeholder="请输入备用联系电话（可选）"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="紧急联系人" prop="contact.emergencyContact.name">
              <el-input
                v-model="formData.contact.emergencyContact.name"
                placeholder="请输入紧急联系人姓名"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="联系电话" prop="contact.emergencyContact.phone">
              <el-input
                v-model="formData.contact.emergencyContact.phone"
                placeholder="请输入紧急联系人电话"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="与户主关系" prop="contact.emergencyContact.relationship">
              <el-select
                v-model="formData.contact.emergencyContact.relationship"
                placeholder="请选择关系"
              >
                <el-option label="配偶" value="配偶" />
                <el-option label="父母" value="父母" />
                <el-option label="子女" value="子女" />
                <el-option label="兄弟" value="兄弟" />
                <el-option label="姐妹" value="姐妹" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 家庭成员 -->
      <div class="form-section">
        <div class="section-header">
          <h3>家庭成员</h3>
          <el-button type="primary" icon="Plus" @click="addMember">
            添加成员
          </el-button>
        </div>
        <el-table :data="formData.members" style="width: 100%">
          <el-table-column label="姓名" width="120">
            <template #default="{ row, $index }">
              <el-input
                v-model="row.name"
                placeholder="姓名"
                @change="validateMember($index)"
              />
            </template>
          </el-table-column>
          <el-table-column label="关系" width="120">
            <template #default="{ row, $index }">
              <el-select
                v-model="row.relationship"
                placeholder="关系"
                @change="handleRelationshipChange($index)"
              >
                <el-option label="户主" value="户主" />
                <el-option label="配偶" value="配偶" />
                <el-option label="子女" value="子女" />
                <el-option label="父母" value="父母" />
                <el-option label="祖父母" value="祖父母" />
                <el-option label="兄弟姐妹" value="兄弟姐妹" />
                <el-option label="其他" value="其他" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="身份证号" width="180">
            <template #default="{ row, $index }">
              <el-input
                v-model="row.idCard"
                placeholder="身份证号"
                @change="validateMember($index)"
              />
            </template>
          </el-table-column>
          <el-table-column label="联系电话" width="150">
            <template #default="{ row }">
              <el-input v-model="row.phone" placeholder="联系电话" />
            </template>
          </el-table-column>
          <el-table-column label="职业" width="150">
            <template #default="{ row }">
              <el-input v-model="row.occupation" placeholder="职业" />
            </template>
          </el-table-column>
          <el-table-column label="学历" width="120">
            <template #default="{ row }">
              <el-select v-model="row.education" placeholder="学历">
                <el-option label="文盲" value="文盲" />
                <el-option label="小学" value="小学" />
                <el-option label="初中" value="初中" />
                <el-option label="高中" value="高中" />
                <el-option label="大专" value="大专" />
                <el-option label="本科" value="本科" />
                <el-option label="研究生" value="研究生" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="健康状况" width="120">
            <template #default="{ row }">
              <el-select v-model="row.healthStatus" placeholder="健康状况">
                <el-option label="健康" value="健康" />
                <el-option label="慢性病" value="慢性病" />
                <el-option label="残疾" value="残疾" />
                <el-option label="大病" value="大病" />
                <el-option label="其他" value="其他" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ $index }">
              <el-button
                link
                type="danger"
                @click="removeMember($index)"
                :disabled="formData.members[$index]?.isHead && formData.members.length > 1"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 特殊标签 -->
      <div class="form-section">
        <h3>特殊标签</h3>
        <el-form-item label="家庭标签" prop="tags">
          <el-checkbox-group v-model="formData.tags">
            <el-checkbox label="党员户">党员户</el-checkbox>
            <el-checkbox label="军人家庭">军人家庭</el-checkbox>
            <el-checkbox label="优抚对象">优抚对象</el-checkbox>
            <el-checkbox label="残疾人家庭">残疾人家庭</el-checkbox>
            <el-checkbox label="留守儿童">留守儿童</el-checkbox>
            <el-checkbox label="空巢老人">空巢老人</el-checkbox>
            <el-checkbox label="其他">其他</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </div>
    </el-form>

    <!-- 表单操作 -->
    <div class="form-actions">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        {{ mode === 'create' ? '创建' : '更新' }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { validateIdCard, validatePhone } from '@/utils/validate'

// Props
const props = defineProps({
  family: {
    type: Object,
    default: () => ({})
  },
  mode: {
    type: String,
    default: 'create' // create | edit
  }
})

// Emits
const emit = defineEmits(['submit', 'cancel'])

// 表单引用
const formRef = ref(null)

// 提交状态
const submitting = ref(false)

// 省市区县数据（示例）
const provinces = [
  { label: '浙江省', value: '浙江省' },
  { label: '江苏省', value: '江苏省' },
  { label: '安徽省', value: '安徽省' },
  { label: '福建省', value: '福建省' },
  { label: '江西省', value: '江西省' },
  { label: '山东省', value: '山东省' }
]

const cities = computed(() => {
  // 根据省份动态加载城市
  if (formData.value.address.province === '浙江省') {
    return [
      { label: '杭州市', value: '杭州市' },
      { label: '宁波市', value: '宁波市' },
      { label: '温州市', value: '温州市' },
      { label: '嘉兴市', value: '嘉兴市' }
    ]
  }
  return []
})

const counties = computed(() => {
  // 根据城市动态加载区县
  if (formData.value.address.city === '杭州市') {
    return [
      { label: '西湖区', value: '西湖区' },
      { label: '上城区', value: '上城区' },
      { label: '下城区', value: '下城区' },
      { label: '江干区', value: '江干区' },
      { label: '拱墅区', value: '拱墅区' },
      { label: '滨江区', value: '滨江区' }
    ]
  }
  return []
})

// 表单数据
const formData = reactive({
  familyName: '',
  familyType: '普通户',
  familyCode: '',
  address: {
    province: '',
    city: '',
    county: '',
    town: '',
    village: '',
    group: '',
    detail: ''
  },
  contact: {
    primaryPhone: '',
    secondaryPhone: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  },
  members: [],
  tags: []
})

// 表单验证规则
const formRules = {
  familyName: [
    { required: true, message: '请输入家庭名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  familyType: [
    { required: true, message: '请选择家庭类型', trigger: 'change' }
  ],
  'address.province': [
    { required: true, message: '请选择省份', trigger: 'change' }
  ],
  'address.city': [
    { required: true, message: '请选择城市', trigger: 'change' }
  ],
  'address.county': [
    { required: true, message: '请选择区县', trigger: 'change' }
  ],
  'address.town': [
    { required: true, message: '请输入乡镇', trigger: 'blur' }
  ],
  'address.village': [
    { required: true, message: '请输入村名', trigger: 'blur' }
  ],
  'contact.primaryPhone': [
    { required: true, message: '请输入主要联系电话', trigger: 'blur' },
    { validator: (rule, value, callback) => {
      if (!validatePhone(value)) {
        callback(new Error('请输入正确的手机号'))
      } else {
        callback()
      }
    },
    trigger: 'blur'
  ],
  'contact.secondaryPhone': [
    { validator: (rule, value, callback) => {
      if (value && !validatePhone(value)) {
        callback(new Error('请输入正确的手机号'))
      } else {
        callback()
      }
    },
    trigger: 'blur'
  ],
  'contact.emergencyContact.phone': [
    { validator: (rule, value, callback) => {
      if (value && !validatePhone(value)) {
        callback(new Error('请输入正确的手机号'))
      } else {
        callback()
      }
    },
    trigger: 'blur'
  ]
}

// 初始化表单数据
const initFormData = () => {
  if (props.mode === 'edit' && props.family) {
    Object.assign(formData, props.family)
  } else {
    // 创建模式的默认值
    formData.members = [
      {
        name: '',
        relationship: '户主',
        idCard: '',
        phone: '',
        occupation: '',
        education: '初中',
        healthStatus: '健康',
        isHead: true,
        insuranceType: ['城乡居民医保']
      }
    ]
  }
}

// 添加成员
const addMember = () => {
  formData.members.push({
    name: '',
    relationship: '子女',
    idCard: '',
    phone: '',
    occupation: '',
    education: '初中',
    healthStatus: '健康',
    isHead: false,
    insuranceType: ['城乡居民医保']
  })
}

// 移除成员
const removeMember = (index) => {
  if (formData.members[index].isHead) {
    ElMessage.warning('不能删除户主')
    return
  }
  formData.members.splice(index, 1)
}

// 处理关系变化
const handleRelationshipChange = (index) => {
  const member = formData.members[index]
  if (member.relationship === '户主') {
    // 将其他成员的isHead设为false
    formData.members.forEach((m, i) => {
      if (i !== index) {
        m.isHead = false
      }
    })
    member.isHead = true
  } else {
    member.isHead = false
  }
}

// 验证成员信息
const validateMember = (index) => {
  const member = formData.members[index]

  // 验证必填字段
  if (!member.name) {
    ElMessage.warning(`第${index + 1}个成员的姓名不能为空`)
    return false
  }

  if (!member.idCard) {
    ElMessage.warning(`第${index + 1}个成员的身份证号不能为空`)
    return false
  }

  // 验证身份证号
  if (!validateIdCard(member.idCard)) {
    ElMessage.warning(`第${index + 1}个成员的身份证号格式不正确`)
    return false
  }

  // 验证手机号
  if (member.phone && !validatePhone(member.phone)) {
    ElMessage.warning(`第${index + 1}个成员的手机号格式不正确`)
    return false
  }

  // 检查身份证号是否重复
  const duplicate = formData.members.some((m, i) =>
    i !== index && m.idCard === member.idCard
  )
  if (duplicate) {
    ElMessage.warning('身份证号不能重复')
    return false
  }

  // 检查是否有户主
  const hasHead = formData.members.some(m => m.isHead)
  if (!hasHead) {
    ElMessage.warning('家庭必须有户主')
    return false
  }

  return true
}

// 验证所有成员
const validateAllMembers = () => {
  for (let i = 0; i < formData.members.length; i++) {
    if (!validateMember(i)) {
      return false
    }
  }
  return true
}

// 提交表单
const handleSubmit = async () => {
  // 表单验证
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  // 验证成员信息
  if (!validateAllMembers()) return

  submitting.value = true

  try {
    // 准备提交数据
    const submitData = {
      ...formData,
      members: formData.members.map(m => ({
        ...m,
        userId: m.userId || null, // 如果有用户ID则关联
        joinDate: m.joinDate || new Date()
      }))
    }

    emit('submit', submitData)
  } catch (error) {
    ElMessage.error('提交失败')
    console.error(error)
  } finally {
    submitting.value = false
  }
}

// 取消
const handleCancel = () => {
  emit('cancel')
}

// 监听家庭数据变化
watch(() => props.family, () => {
  initFormData()
}, { immediate: true })
</script>

<style lang="scss" scoped>
.family-form {
  .form-section {
    margin-bottom: 30px;

    h3 {
      margin: 0 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #409eff;
      font-size: 16px;
      color: #303133;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
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