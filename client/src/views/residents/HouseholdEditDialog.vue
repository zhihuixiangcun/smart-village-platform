<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="600px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
    >
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="户主姓名" prop="householder">
            <el-input v-model="form.householder" placeholder="请输入户主姓名" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="户码" prop="code">
            <el-input v-model="form.code" placeholder="系统自动生成" readonly>
              <template #append>
                <el-button @click="generateCode" icon="Refresh">
                  重新生成
                </el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="家庭人数" prop="memberCount">
            <el-input-number
              v-model="form.memberCount"
              :min="1"
              :max="20"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态" prop="status">
            <el-select v-model="form.status" placeholder="请选择" style="width: 100%">
              <el-option label="正常" value="active" />
              <el-option label="异常" value="inactive" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="详细地址" prop="address">
        <el-input
          v-model="form.address"
          type="textarea"
          :rows="3"
          placeholder="请输入详细居住地址"
        />
      </el-form-item>

      <el-form-item label="备注">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="2"
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
import { residentAPI } from '@/api/resident'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  household: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const formRef = ref()
const submitting = ref(false)

// 计算模式
const mode = computed(() => props.household ? 'edit' : 'add')

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 对话框标题
const dialogTitle = computed(() => {
  return mode.value === 'add' ? '新增户码' : '编辑户码信息'
})

// 表单数据
const form = reactive({
  householder: '',
  code: '',
  memberCount: 1,
  address: '',
  status: 'active',
  remark: ''
})

// 表单验证规则
const rules = {
  householder: [
    { required: true, message: '请输入户主姓名', trigger: 'blur' },
    { min: 2, max: 10, message: '姓名长度在 2 到 10 个字符', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '户码不能为空', trigger: 'blur' }
  ],
  memberCount: [
    { required: true, message: '请输入家庭人数', trigger: 'blur' },
    { type: 'number', min: 1, max: 20, message: '家庭人数范围在 1 到 20 之间', trigger: 'blur' }
  ],
  address: [
    { required: true, message: '请输入详细地址', trigger: 'blur' }
  ]
}

// 方法
const generateCode = () => {
  // 生成户码：村庄代码 + 年份 + 序号
  const villageCode = '001' // 从配置中获取
  const year = new Date().getFullYear().toString().slice(-2)
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  form.code = `${villageCode}${year}${random}`
}

const handleClose = () => {
  dialogVisible.value = false
  resetForm()
}

const resetForm = () => {
  Object.assign(form, {
    householder: '',
    code: '',
    memberCount: 1,
    address: '',
    status: 'active',
    remark: ''
  })

  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

const fillForm = (household) => {
  if (household) {
    Object.assign(form, household)
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    submitting.value = true

    let response
    if (mode.value === 'add') {
      response = await residentAPI.createHousehold(form)
    } else {
      response = await residentAPI.updateHousehold(props.household.id, form)
    }

    if (response.success) {
      ElMessage.success(`${mode.value === 'add' ? '添加' : '保存'}成功`)
      emit('confirm')
      handleClose()
    }
  } catch (error) {
    if (error !== false) {
      ElMessage.error(`${mode.value === 'add' ? '添加' : '保存'}失败`)
    }
  } finally {
    submitting.value = false
  }
}

// 监听对话框显示状态
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    nextTick(() => {
      if (mode.value === 'edit' && props.household) {
        fillForm(props.household)
      } else {
        resetForm()
        generateCode() // 新增时自动生成户码
      }
    })
  }
})
</script>

<style lang="scss" scoped>
.dialog-footer {
  text-align: right;
}
</style>