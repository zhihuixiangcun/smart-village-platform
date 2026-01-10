<template>
  <el-dialog v-model="visible" title="编辑资料" width="600px" @close="handleClose">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
      label-position="left"
    >
      <!-- 基本信息 -->
      <div class="form-section">
        <h4 class="section-title">基本信息</h4>
        <el-form-item label="姓名" prop="basicInfo.name">
          <el-input v-model="formData.basicInfo.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="联系电话" prop="basicInfo.phone">
          <el-input v-model="formData.basicInfo.phone" disabled />
          <span class="form-tip">如需更换手机号，请联系客服</span>
        </el-form-item>
      </div>

      <!-- 个人采购商信息 -->
      <template v-if="formData.purchaserType === 'individual'">
        <el-divider />
        <div class="form-section">
          <h4 class="section-title">个人采购商信息</h4>
          <el-form-item label="所在地区">
            <el-cascader
              v-model="locationPath"
              :options="regionOptions"
              placeholder="请选择地区"
              @change="handleLocationChange"
            />
          </el-form-item>
          <el-form-item label="详细地址">
            <el-input
              v-model="formData.individualInfo.location.address"
              placeholder="请输入详细地址"
            />
          </el-form-item>
          <el-form-item label="采购类目">
            <el-select
              v-model="formData.individualInfo.purchaseCategories"
              multiple
              placeholder="请选择主要采购类目"
              style="width: 100%"
            >
              <el-option
                v-for="category in productCategories"
                :key="category"
                :label="category"
                :value="category"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="预算范围">
            <el-col :span="11">
              <el-input-number
                v-model="formData.individualInfo.budgetRange.min"
                :min="0"
                :step="1000"
                controls-position="right"
                style="width: 100%"
              />
            </el-col>
            <el-col :span="2" style="text-align: center">-</el-col>
            <el-col :span="11">
              <el-input-number
                v-model="formData.individualInfo.budgetRange.max"
                :min="0"
                :step="1000"
                controls-position="right"
                style="width: 100%"
              />
            </el-col>
          </el-form-item>
          <el-form-item label="个人简介">
            <el-input
              v-model="formData.individualInfo.bio"
              type="textarea"
              :rows="3"
              placeholder="介绍一下自己"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </div>
      </template>

      <!-- 商家采购商信息 -->
      <template v-if="formData.purchaserType === 'business'">
        <el-divider />
        <div class="form-section">
          <h4 class="section-title">企业信息</h4>
          <el-form-item label="企业名称" prop="businessInfo.companyName">
            <el-input v-model="formData.businessInfo.companyName" placeholder="请输入企业名称" />
          </el-form-item>
          <el-form-item label="信用代码">
            <el-input
              v-model="formData.businessInfo.creditCode"
              placeholder="统一社会信用代码"
              disabled
            />
            <span class="form-tip">如需更换，请重新上传营业执照</span>
          </el-form-item>
          <el-form-item label="所在地区">
            <el-cascader
              v-model="locationPath"
              :options="regionOptions"
              placeholder="请选择地区"
              @change="handleLocationChange"
            />
          </el-form-item>
          <el-form-item label="详细地址">
            <el-input
              v-model="formData.businessInfo.location.address"
              placeholder="请输入详细地址"
            />
          </el-form-item>
          <el-form-item label="采购类目">
            <el-select
              v-model="formData.businessInfo.purchaseCategories"
              multiple
              placeholder="请选择主要采购类目"
              style="width: 100%"
            >
              <el-option
                v-for="category in productCategories"
                :key="category"
                :label="category"
                :value="category"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="企业规模">
            <el-select v-model="formData.businessInfo.scale" placeholder="请选择企业规模">
              <el-option label="微型企业" value="micro" />
              <el-option label="小型企业" value="small" />
              <el-option label="中型企业" value="medium" />
              <el-option label="大型企业" value="large" />
            </el-select>
          </el-form-item>
          <el-form-item label="年采购量">
            <el-input-number
              v-model="formData.businessInfo.annualPurchaseVolume"
              :min="0"
              :step="10"
              controls-position="right"
            />
            <span class="form-tip">吨/年</span>
          </el-form-item>
          <el-form-item label="联系人姓名">
            <el-input
              v-model="formData.businessInfo.contactPerson.name"
              placeholder="请输入联系人姓名"
            />
          </el-form-item>
          <el-form-item label="联系人电话">
            <el-input
              v-model="formData.businessInfo.contactPerson.phone"
              placeholder="请输入联系人电话"
            />
          </el-form-item>
          <el-form-item label="联系邮箱">
            <el-input
              v-model="formData.businessInfo.contactPerson.email"
              placeholder="请输入联系邮箱"
            />
          </el-form-item>
          <el-form-item label="联系人职位">
            <el-input
              v-model="formData.businessInfo.contactPerson.position"
              placeholder="请输入联系人职位"
            />
          </el-form-item>
        </div>
      </template>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  purchaserInfo: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue', 'save']);

const formRef = ref(null);
const saving = ref(false);
const locationPath = ref([]);

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

const formData = reactive({
  purchaserType: 'individual',
  basicInfo: {
    name: '',
    phone: '',
    idCard: '',
  },
  individualInfo: {
    location: {
      province: '',
      city: '',
      district: '',
      address: '',
      coordinates: null,
    },
    purchaseCategories: [],
    budgetRange: {
      min: 0,
      max: 0,
    },
    bio: '',
  },
  businessInfo: {
    companyName: '',
    creditCode: '',
    location: {
      province: '',
      city: '',
      district: '',
      address: '',
      coordinates: null,
    },
    purchaseCategories: [],
    scale: '',
    annualPurchaseVolume: 0,
    contactPerson: {
      name: '',
      phone: '',
      email: '',
      position: '',
    },
  },
});

const rules = {
  'basicInfo.name': [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  'businessInfo.companyName': [{ required: true, message: '请输入企业名称', trigger: 'blur' }],
};

const productCategories = [
  '蔬菜',
  '水果',
  '粮食',
  '畜禽',
  '水产',
  '干货',
  '茶叶',
  '中药材',
  '其他',
];

const regionOptions = [
  {
    value: '浙江省',
    label: '浙江省',
    children: [
      {
        value: '杭州市',
        label: '杭州市',
        children: [
          { value: '西湖区', label: '西湖区' },
          { value: '余杭区', label: '余杭区' },
          { value: '临平区', label: '临平区' },
        ],
      },
    ],
  },
];

// 初始化表单数据
watch(
  () => props.purchaserInfo,
  newInfo => {
    if (newInfo && Object.keys(newInfo).length > 0) {
      formData.purchaserType = newInfo.purchaserType || 'individual';
      Object.assign(formData.basicInfo, newInfo.basicInfo || {});

      if (newInfo.purchaserType === 'individual' && newInfo.individualInfo) {
        Object.assign(formData.individualInfo, newInfo.individualInfo);
        if (newInfo.individualInfo.location) {
          const loc = newInfo.individualInfo.location;
          locationPath.value = [loc.province, loc.city, loc.district].filter(Boolean);
        }
      }

      if (newInfo.purchaserType === 'business' && newInfo.businessInfo) {
        Object.assign(formData.businessInfo, newInfo.businessInfo);
        if (newInfo.businessInfo.location) {
          const loc = newInfo.businessInfo.location;
          locationPath.value = [loc.province, loc.city, loc.district].filter(Boolean);
        }
      }
    }
  },
  { immediate: true }
);

// 处理地区变化
const handleLocationChange = value => {
  const target =
    formData.purchaserType === 'individual'
      ? formData.individualInfo.location
      : formData.businessInfo.location;

  if (value && value.length >= 2) {
    target.province = value[0];
    target.city = value[1];
    target.district = value[2] || '';
  }
};

// 保存
const handleSave = async () => {
  try {
    await formRef.value.validate();
    saving.value = true;

    // 这里应该调用API保存数据
    emit('save', formData);

    visible.value = false;
  } catch (error) {
    console.error('表单验证失败', error);
  } finally {
    saving.value = false;
  }
};

// 关闭对话框
const handleClose = () => {
  visible.value = false;
};
</script>

<style scoped>
.form-section {
  padding: 16px 0;
}

.section-title {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 16px;
}

.form-tip {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}

@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: 90% !important;
  }

  :deep(.el-form-item__label) {
    width: 100% !important;
    text-align: left;
  }

  :deep(.el-form-item__content) {
    margin-left: 0 !important;
  }
}
</style>
