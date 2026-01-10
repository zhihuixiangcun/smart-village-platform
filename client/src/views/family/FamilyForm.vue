<template>
  <el-dialog
    :model-value="modelValue"
    :title="isEdit ? '编辑家庭档案' : '新建家庭档案'"
    width="800px"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="120px">
      <!-- 基本信息 -->
      <div class="form-section">
        <h4>基本信息</h4>

        <el-form-item label="房屋编号" prop="houseNumber">
          <el-input
            v-model="formData.houseNumber"
            placeholder="请输入房屋编号"
            :disabled="isEdit"
          />
        </el-form-item>

        <el-form-item label="户主姓名" prop="headOfHousehold.name">
          <el-input v-model="formData.headOfHousehold.name" placeholder="请输入户主姓名" />
        </el-form-item>

        <el-form-item label="身份证号" prop="headOfHousehold.idCard">
          <el-input
            v-model="formData.headOfHousehold.idCard"
            placeholder="请输入身份证号"
            maxlength="18"
          />
        </el-form-item>

        <el-form-item label="联系电话" prop="headOfHousehold.phone">
          <el-input
            v-model="formData.headOfHousehold.phone"
            placeholder="请输入联系电话"
            maxlength="11"
          />
        </el-form-item>

        <el-form-item label="详细地址" prop="address.detail">
          <el-input v-model="formData.address.detail" placeholder="请输入详细地址" />
        </el-form-item>
      </div>

      <!-- 住房信息 -->
      <div class="form-section">
        <h4>住房信息</h4>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="住房类型">
              <el-select v-model="formData.housing.type" placeholder="请选择">
                <el-option label="自建房" value="自建房" />
                <el-option label="公寓" value="公寓" />
                <el-option label="四合院" value="四合院" />
                <el-option label="砖木结构" value="砖木结构" />
                <el-option label="混凝土结构" value="混凝土结构" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="建筑面积(㎡)">
              <el-input-number v-model="formData.housing.area" :min="0" :precision="2" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="建造年代">
              <el-input-number
                v-model="formData.housing.buildYear"
                :min="1900"
                :max="new Date().getFullYear()"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="楼层数">
              <el-input-number v-model="formData.housing.floors" :min="1" :max="10" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="是否危房">
          <el-switch v-model="formData.housing.isDangerous" />
          <el-select
            v-if="formData.housing.isDangerous"
            v-model="formData.housing.dangerLevel"
            placeholder="危房等级"
            style="margin-left: 10px"
          >
            <el-option label="1级" :value="1" />
            <el-option label="2级" :value="2" />
            <el-option label="3级" :value="3" />
            <el-option label="4级" :value="4" />
          </el-select>
        </el-form-item>
      </div>

      <!-- 土地信息 -->
      <div class="form-section">
        <h4>土地信息</h4>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="耕地面积(亩)">
              <el-input-number v-model="formData.land.cultivatedArea" :min="0" :precision="2" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="林地面积(亩)">
              <el-input-number v-model="formData.land.forestArea" :min="0" :precision="2" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="宅基地面积(㎡)">
          <el-input-number v-model="formData.land.homesteadArea" :min="0" :precision="2" />
        </el-form-item>
      </div>

      <!-- 经济状况 -->
      <div class="form-section">
        <h4>经济状况</h4>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="年收入(万元)">
              <el-input-number
                v-model="formData.economicStatus.annualIncome"
                :min="0"
                :precision="2"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="收入来源">
              <el-select v-model="formData.economicStatus.incomeSource" placeholder="请选择">
                <el-option label="务农" value="务农" />
                <el-option label="务工" value="务工" />
                <el-option label="经商" value="经商" />
                <el-option label="养殖" value="养殖" />
                <el-option label="种植" value="种植" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="是否低保">
          <el-switch v-model="formData.economicStatus.hasLowIncomeSupport" />
        </el-form-item>
      </div>

      <!-- 备注 -->
      <el-form-item label="备注">
        <el-input
          v-model="formData.remarks"
          type="textarea"
          :rows="3"
          placeholder="请输入备注信息"
          maxlength="1000"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting"> 提交 </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  family: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'submit']);

const formRef = ref(null);
const submitting = ref(false);

const isEdit = computed(() => !!props.family?._id);

const formData = ref({
  houseNumber: '',
  headOfHousehold: {
    name: '',
    idCard: '',
    phone: '',
  },
  address: {
    province: '浙江省',
    city: '杭州市',
    district: '',
    town: '',
    village: '',
    street: '',
    detail: '',
  },
  housing: {
    type: '自建房',
    area: 0,
    usableArea: 0,
    buildYear: new Date().getFullYear(),
    structure: '',
    floors: 1,
    isDangerous: false,
    dangerLevel: null,
  },
  land: {
    cultivatedArea: 0,
    forestArea: 0,
    homesteadArea: 0,
    otherArea: 0,
  },
  economicStatus: {
    annualIncome: 0,
    incomeSource: '',
    hasLowIncomeSupport: false,
    lowIncomeCertificate: '',
    hasDebt: false,
    debtAmount: 0,
  },
  remarks: '',
});

const formRules = {
  houseNumber: [{ required: true, message: '请输入房屋编号', trigger: 'blur' }],
  'headOfHousehold.name': [{ required: true, message: '请输入户主姓名', trigger: 'blur' }],
  'headOfHousehold.idCard': [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    {
      pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
      message: '请输入正确的身份证号',
      trigger: 'blur',
    },
  ],
  'headOfHousehold.phone': [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
  'address.detail': [{ required: true, message: '请输入详细地址', trigger: 'blur' }],
};

// 监听family变化，填充表单
watch(
  () => props.family,
  newFamily => {
    if (newFamily) {
      // 深拷贝数据到表单
      formData.value = JSON.parse(
        JSON.stringify({
          houseNumber: newFamily.houseNumber || '',
          headOfHousehold: {
            name: newFamily.headOfHousehold?.name || '',
            idCard: newFamily.headOfHousehold?.idCard || '',
            phone: newFamily.headOfHousehold?.phone || '',
          },
          address: newFamily.address || {},
          housing: newFamily.housing || {},
          land: newFamily.land || {},
          economicStatus: newFamily.economicStatus || {},
          remarks: newFamily.remarks || '',
        })
      );
    }
  },
  { immediate: true }
);

function handleClose() {
  emit('update:modelValue', false);
  resetForm();
}

function resetForm() {
  formRef.value?.resetFields();
  formData.value = {
    houseNumber: '',
    headOfHousehold: {
      name: '',
      idCard: '',
      phone: '',
    },
    address: {
      province: '浙江省',
      city: '杭州市',
      district: '',
      town: '',
      village: '',
      street: '',
      detail: '',
    },
    housing: {
      type: '自建房',
      area: 0,
      usableArea: 0,
      buildYear: new Date().getFullYear(),
      structure: '',
      floors: 1,
      isDangerous: false,
      dangerLevel: null,
    },
    land: {
      cultivatedArea: 0,
      forestArea: 0,
      homesteadArea: 0,
      otherArea: 0,
    },
    economicStatus: {
      annualIncome: 0,
      incomeSource: '',
      hasLowIncomeSupport: false,
      lowIncomeCertificate: '',
      hasDebt: false,
      debtAmount: 0,
    },
    remarks: '',
  };
}

async function handleSubmit() {
  try {
    await formRef.value.validate();

    submitting.value = true;

    // 如果是编辑模式，保留ID
    if (isEdit.value) {
      formData.value._id = props.family._id;
    }

    emit('submit', formData.value);
  } catch (error) {
    console.error('表单验证失败:', error);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped lang="scss">
.form-section {
  margin-bottom: 30px;

  h4 {
    margin: 0 0 20px 0;
    padding-bottom: 10px;
    border-bottom: 1px solid #ebeef5;
    color: #303133;
    font-size: 16px;
  }
}
</style>
