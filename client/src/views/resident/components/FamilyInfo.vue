<template>
  <div class="family-info">
    <!-- 家庭概况 -->
    <el-card class="mb-4">
      <template #header>
        <span class="text-lg font-semibold">家庭概况</span>
      </template>

      <el-row :gutter="24">
        <el-col :span="8">
          <div class="stat-item">
            <div class="stat-number text-blue-600">{{ familyStats.totalMembers }}</div>
            <div class="stat-label">家庭成员总数</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-item">
            <div class="stat-number text-green-600">{{ familyStats.adults }}</div>
            <div class="stat-label">成年人数</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-item">
            <div class="stat-number text-orange-600">{{ familyStats.children }}</div>
            <div class="stat-label">未成年人数</div>
          </div>
        </el-col>
      </el-row>

      <el-divider />

      <el-descriptions :column="2" border>
        <el-descriptions-item label="户主">
          {{ familyInfo.householder || resident.name }}
        </el-descriptions-item>
        <el-descriptions-item label="家庭类型">
          <el-tag :type="getHouseholdTypeTag(familyInfo.householdType)" size="small">
            {{ familyInfo.householdType }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="家庭地址" :span="2">
          {{ familyInfo.address }}
        </el-descriptions-item>
        <el-descriptions-item label="联系电话">
          {{ familyInfo.contactPhone }}
        </el-descriptions-item>
        <el-descriptions-item label="经济状况">
          <el-tag :type="getEconomicStatusTag(familyInfo.economicStatus)" size="small">
            {{ familyInfo.economicStatus }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="住房情况">
          {{ familyInfo.housingCondition }}
        </el-descriptions-item>
        <el-descriptions-item label="住房面积">
          {{ familyInfo.housingArea }}平方米
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 家庭成员列表 -->
    <el-card class="mb-4">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-semibold">家庭成员</span>
          <el-button type="primary" size="small" @click="handleAddMember">
            <el-icon><Plus /></el-icon>
            添加成员
          </el-button>
        </div>
      </template>

      <el-table :data="familyMembers" stripe border>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="relationship" label="与户主关系" width="120" />
        <el-table-column prop="gender" label="性别" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.gender === '男' ? 'primary' : 'danger'" size="small">
              {{ row.gender }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="80" align="center">
          <template #default="{ row }">
            <span
              :class="{
                'text-red-500': row.age >= 60,
                'text-blue-500': row.age < 18,
                'text-gray-700': row.age >= 18 && row.age < 60,
              }"
            >
              {{ row.age }}岁
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="idCard" label="身份证号" width="180">
          <template #default="{ row }">
            {{ formatIdCard(row.idCard) }}
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="education" label="文化程度" width="100" />
        <el-table-column prop="occupation" label="职业" width="120" />
        <el-table-column prop="healthStatus" label="健康状况" width="100">
          <template #default="{ row }">
            <el-tag :type="getHealthStatusTag(row.healthStatus)" size="small">
              {{ row.healthStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleViewMember(row)"> 查看 </el-button>
            <el-button type="success" size="small" @click="handleEditMember(row)"> 编辑 </el-button>
            <el-popconfirm title="确定要删除这个家庭成员吗？" @confirm="handleDeleteMember(row)">
              <template #reference>
                <el-button type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 家庭经济信息 -->
    <el-card class="mb-4">
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-semibold">家庭经济信息</span>
          <el-button type="primary" size="small" @click="handleEditEconomic">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
        </div>
      </template>

      <el-row :gutter="24">
        <el-col :span="12">
          <el-descriptions title="收入情况" :column="1" border>
            <el-descriptions-item label="家庭年收入">
              ¥{{ formatCurrency(economicInfo.annualIncome) }}
            </el-descriptions-item>
            <el-descriptions-item label="主要收入来源">
              {{ economicInfo.mainIncomeSource }}
            </el-descriptions-item>
            <el-descriptions-item label="其他收入">
              ¥{{ formatCurrency(economicInfo.otherIncome) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-col>
        <el-col :span="12">
          <el-descriptions title="支出情况" :column="1" border>
            <el-descriptions-item label="年度总支出">
              ¥{{ formatCurrency(economicInfo.annualExpenditure) }}
            </el-descriptions-item>
            <el-descriptions-item label="主要支出项目">
              {{ economicInfo.mainExpenditure }}
            </el-descriptions-item>
            <el-descriptions-item label="医疗支出">
              ¥{{ formatCurrency(economicInfo.medicalExpenditure) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-col>
      </el-row>

      <el-divider />

      <el-descriptions title="资产情况" :column="2" border>
        <el-descriptions-item label="房产价值">
          ¥{{ formatCurrency(economicInfo.houseValue) }}
        </el-descriptions-item>
        <el-descriptions-item label="车辆价值">
          ¥{{ formatCurrency(economicInfo.vehicleValue) }}
        </el-descriptions-item>
        <el-descriptions-item label="存款">
          ¥{{ formatCurrency(economicInfo.savings) }}
        </el-descriptions-item>
        <el-descriptions-item label="债务">
          ¥{{ formatCurrency(economicInfo.debt) }}
        </el-descriptions-item>
        <el-descriptions-item label="净资产">
          ¥{{ formatCurrency(calculateNetAssets()) }}
        </el-descriptions-item>
        <el-descriptions-item label="经济状况评级">
          <el-tag :type="getEconomicLevelTag(economicInfo.economicLevel)" size="small">
            {{ economicInfo.economicLevel }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 优惠政策享受情况 -->
    <el-card>
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-semibold">优惠政策享受情况</span>
          <el-button type="primary" size="small" @click="handleAddPolicy">
            <el-icon><Plus /></el-icon>
            申请政策
          </el-button>
        </div>
      </template>

      <el-table :data="policyBenefits" stripe>
        <el-table-column prop="policyName" label="政策名称" width="200" />
        <el-table-column prop="policyType" label="政策类型" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.policyType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startDate" label="享受开始时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.startDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="endDate" label="享受结束时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.endDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="benefitAmount" label="受益金额" width="120">
          <template #default="{ row }"> ¥{{ formatCurrency(row.benefitAmount) }} </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '享受中' ? 'success' : 'info'" size="small">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remarks" label="备注" show-overflow-tooltip />
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleViewPolicy(row)"> 查看 </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!policyBenefits.length" class="text-center text-gray-500 py-8">
        暂无享受优惠政策记录
      </div>
    </el-card>

    <!-- 成员表单对话框 -->
    <FormDialog
      v-model="memberDialogVisible"
      :title="memberDialogTitle"
      :fields="memberFormFields"
      :form-data="memberFormData"
      :rules="memberFormRules"
      :loading="memberFormLoading"
      :is-edit="isMemberEdit"
      width="700px"
      @submit="handleMemberSubmit"
      @close="handleMemberDialogClose"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Edit } from '@element-plus/icons-vue';
import FormDialog from '@/components/common/FormDialog.vue';
import { formatDate, formatCurrency, validateIdCard } from '@/utils/common';
import { required, phone, idCard } from '@/utils/validation';

// Props定义
const props = defineProps({
  resident: {
    type: Object,
    required: true,
  },
});

// Emits定义
const emit = defineEmits(['close']);

// 响应式数据
const familyMembers = ref([]);
const memberDialogVisible = ref(false);
const memberFormLoading = ref(false);
const isMemberEdit = ref(false);

// 家庭基本信息
const familyInfo = reactive({
  householder: '',
  householdType: '普通户',
  address: '',
  contactPhone: '',
  economicStatus: '一般',
  housingCondition: '自有住房',
  housingArea: 0,
});

// 家庭经济信息
const economicInfo = reactive({
  annualIncome: 0,
  mainIncomeSource: '',
  otherIncome: 0,
  annualExpenditure: 0,
  mainExpenditure: '',
  medicalExpenditure: 0,
  houseValue: 0,
  vehicleValue: 0,
  savings: 0,
  debt: 0,
  economicLevel: '中等',
});

// 政策享受情况
const policyBenefits = ref([]);

// 成员表单数据
const memberFormData = reactive({
  name: '',
  relationship: '',
  gender: '',
  age: '',
  idCard: '',
  phone: '',
  education: '',
  occupation: '',
  healthStatus: '健康',
});

// 计算属性
const familyStats = computed(() => {
  const total = familyMembers.value.length;
  const adults = familyMembers.value.filter(m => m.age >= 18).length;
  const children = familyMembers.value.filter(m => m.age < 18).length;

  return {
    totalMembers: total,
    adults,
    children,
  };
});

const memberDialogTitle = computed(() => {
  return isMemberEdit.value ? '编辑家庭成员' : '添加家庭成员';
});

// 成员表单字段定义
const memberFormFields = [
  {
    prop: 'name',
    label: '姓名',
    type: 'input',
    placeholder: '请输入姓名',
    span: 12,
    required: true,
  },
  {
    prop: 'relationship',
    label: '与户主关系',
    type: 'select',
    placeholder: '请选择关系',
    span: 12,
    required: true,
    options: [
      { label: '户主', value: '户主' },
      { label: '配偶', value: '配偶' },
      { label: '儿子', value: '儿子' },
      { label: '女儿', value: '女儿' },
      { label: '父亲', value: '父亲' },
      { label: '母亲', value: '母亲' },
      { label: '兄弟', value: '兄弟' },
      { label: '姐妹', value: '姐妹' },
      { label: '其他', value: '其他' },
    ],
  },
  {
    prop: 'gender',
    label: '性别',
    type: 'radio',
    span: 12,
    required: true,
    options: [
      { label: '男', value: '男' },
      { label: '女', value: '女' },
    ],
  },
  {
    prop: 'age',
    label: '年龄',
    type: 'number',
    placeholder: '请输入年龄',
    span: 12,
    required: true,
    min: 0,
    max: 150,
  },
  {
    prop: 'idCard',
    label: '身份证号',
    type: 'input',
    placeholder: '请输入身份证号',
    span: 12,
  },
  {
    prop: 'phone',
    label: '联系电话',
    type: 'input',
    placeholder: '请输入联系电话',
    span: 12,
  },
  {
    prop: 'education',
    label: '文化程度',
    type: 'select',
    placeholder: '请选择文化程度',
    span: 12,
    options: [
      { label: '未入学', value: '未入学' },
      { label: '小学', value: '小学' },
      { label: '初中', value: '初中' },
      { label: '高中', value: '高中' },
      { label: '大专', value: '大专' },
      { label: '本科', value: '本科' },
      { label: '研究生', value: '研究生' },
    ],
  },
  {
    prop: 'occupation',
    label: '职业',
    type: 'input',
    placeholder: '请输入职业',
    span: 12,
  },
  {
    prop: 'healthStatus',
    label: '健康状况',
    type: 'select',
    placeholder: '请选择健康状况',
    span: 12,
    required: true,
    options: [
      { label: '健康', value: '健康' },
      { label: '一般', value: '一般' },
      { label: '慢性病', value: '慢性病' },
      { label: '残疾', value: '残疾' },
      { label: '其他', value: '其他' },
    ],
  },
];

// 成员表单验证规则
const memberFormRules = {
  name: required('请输入姓名'),
  relationship: required('请选择与户主关系'),
  gender: required('请选择性别'),
  age: required('请输入年龄'),
  healthStatus: required('请选择健康状况'),
};

// 工具方法
const getHouseholdTypeTag = type => {
  const tagMap = {
    普通户: '',
    低保户: 'warning',
    五保户: 'danger',
    残疾户: 'info',
    贫困户: 'danger',
  };
  return tagMap[type] || '';
};

const getEconomicStatusTag = status => {
  const tagMap = {
    困难: 'danger',
    一般: 'warning',
    良好: 'success',
    富裕: 'success',
  };
  return tagMap[status] || '';
};

const getHealthStatusTag = status => {
  const tagMap = {
    健康: 'success',
    一般: '',
    慢性病: 'warning',
    残疾: 'danger',
    其他: 'info',
  };
  return tagMap[status] || '';
};

const getEconomicLevelTag = level => {
  const tagMap = {
    贫困: 'danger',
    低收入: 'warning',
    中等: '',
    中等偏上: 'success',
    富裕: 'success',
  };
  return tagMap[level] || '';
};

const formatIdCard = idCard => {
  const { formatted } = validateIdCard(idCard);
  return formatted;
};

const calculateNetAssets = () => {
  return (
    economicInfo.houseValue + economicInfo.vehicleValue + economicInfo.savings - economicInfo.debt
  );
};

// 数据加载方法
const loadFamilyInfo = async () => {
  try {
    // 模拟数据加载
    Object.assign(familyInfo, {
      householder: props.resident.name,
      householdType: props.resident.householdType,
      address: props.resident.address,
      contactPhone: props.resident.phone,
      economicStatus: '一般',
      housingCondition: '自有住房',
      housingArea: 120,
    });
  } catch (error) {
    console.error('加载家庭信息失败:', error);
  }
};

const loadFamilyMembers = async () => {
  try {
    // 模拟数据
    familyMembers.value = [
      {
        id: 1,
        name: props.resident.name,
        relationship: '户主',
        gender: props.resident.gender,
        age: 48,
        idCard: props.resident.idCard,
        phone: props.resident.phone,
        education: '初中',
        occupation: '务农',
        healthStatus: '健康',
      },
      {
        id: 2,
        name: '李明',
        relationship: '配偶',
        gender: '女',
        age: 45,
        idCard: '110101197901011234',
        phone: '13987654321',
        education: '小学',
        occupation: '务农',
        healthStatus: '健康',
      },
      {
        id: 3,
        name: '李小明',
        relationship: '儿子',
        gender: '男',
        age: 20,
        idCard: '110101200401011234',
        phone: '13876543210',
        education: '高中',
        occupation: '学生',
        healthStatus: '健康',
      },
    ];
  } catch (error) {
    console.error('加载家庭成员失败:', error);
  }
};

const loadEconomicInfo = async () => {
  try {
    // 模拟数据
    Object.assign(economicInfo, {
      annualIncome: 50000,
      mainIncomeSource: '农业种植',
      otherIncome: 5000,
      annualExpenditure: 40000,
      mainExpenditure: '生活费用',
      medicalExpenditure: 3000,
      houseValue: 300000,
      vehicleValue: 50000,
      savings: 20000,
      debt: 10000,
      economicLevel: '中等',
    });
  } catch (error) {
    console.error('加载经济信息失败:', error);
  }
};

const loadPolicyBenefits = async () => {
  try {
    // 模拟数据
    policyBenefits.value = [
      {
        id: 1,
        policyName: '农村合作医疗',
        policyType: '医疗保障',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        benefitAmount: 2000,
        status: '享受中',
        remarks: '全家参保',
      },
      {
        id: 2,
        policyName: '农村养老保险',
        policyType: '养老保障',
        startDate: '2020-01-01',
        endDate: '',
        benefitAmount: 1200,
        status: '享受中',
        remarks: '按月发放',
      },
    ];
  } catch (error) {
    console.error('加载政策享受情况失败:', error);
  }
};

// 事件处理方法
const handleAddMember = () => {
  isMemberEdit.value = false;
  Object.keys(memberFormData).forEach(key => {
    memberFormData[key] = '';
  });
  memberFormData.healthStatus = '健康';
  memberDialogVisible.value = true;
};

const handleEditMember = row => {
  isMemberEdit.value = true;
  Object.assign(memberFormData, row);
  memberDialogVisible.value = true;
};

const handleViewMember = row => {
  ElMessage.info(`查看成员 ${row.name} 详情功能开发中...`);
};

const handleDeleteMember = row => {
  const index = familyMembers.value.findIndex(m => m.id === row.id);
  if (index > -1) {
    familyMembers.value.splice(index, 1);
    ElMessage.success('删除成功');
  }
};

const handleMemberSubmit = async data => {
  try {
    memberFormLoading.value = true;

    if (isMemberEdit.value) {
      // 更新成员
      const index = familyMembers.value.findIndex(m => m.id === data.id);
      if (index > -1) {
        familyMembers.value[index] = { ...data };
      }
      ElMessage.success('更新成功');
    } else {
      // 添加新成员
      const newMember = {
        ...data,
        id: Date.now(),
      };
      familyMembers.value.push(newMember);
      ElMessage.success('添加成功');
    }

    memberDialogVisible.value = false;
  } catch (error) {
    ElMessage.error('操作失败');
  } finally {
    memberFormLoading.value = false;
  }
};

const handleMemberDialogClose = () => {
  memberDialogVisible.value = false;
};

const handleEditEconomic = () => {
  ElMessage.info('编辑经济信息功能开发中...');
};

const handleAddPolicy = () => {
  ElMessage.info('申请政策功能开发中...');
};

const handleViewPolicy = row => {
  ElMessage.info(`查看政策 ${row.policyName} 详情功能开发中...`);
};

// 生命周期
onMounted(() => {
  loadFamilyInfo();
  loadFamilyMembers();
  loadEconomicInfo();
  loadPolicyBenefits();
});
</script>

<style scoped>
.family-info {
  max-height: 80vh;
  overflow-y: auto;
}

.stat-item {
  text-align: center;
  padding: 20px;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  line-height: 1;
}

.stat-label {
  margin-top: 8px;
  color: #666;
  font-size: 14px;
}
</style>
