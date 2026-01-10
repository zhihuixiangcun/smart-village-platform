<template>
  <el-dialog
    v-model="dialogVisible"
    title="村民详细信息"
    width="900px"
    :close-on-click-modal="false"
  >
    <div v-if="residentData" class="resident-detail">
      <!-- 基本信息 -->
      <el-card class="detail-card">
        <template #header>
          <div class="card-header">
            <el-icon><User /></el-icon>
            <span>基本信息</span>
          </div>
        </template>

        <el-row :gutter="24">
          <el-col :span="8">
            <div class="avatar-section">
              <el-avatar :size="80" :src="residentData.avatar">
                {{ residentData.name?.charAt(0) }}
              </el-avatar>
              <div class="name-section">
                <h3>{{ residentData.name }}</h3>
                <el-tag :type="getStatusType(residentData.status)" size="small">
                  {{ getStatusLabel(residentData.status) }}
                </el-tag>
              </div>
            </div>
          </el-col>

          <el-col :span="16">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="身份证号">
                <span class="id-card">{{ maskIdCard(residentData.idCard) }}</span>
                <el-button type="text" size="small" @click="showIdCard = !showIdCard">
                  {{ showIdCard ? '隐藏' : '显示' }}
                </el-button>
              </el-descriptions-item>
              <el-descriptions-item label="联系电话">
                {{ residentData.phone }}
              </el-descriptions-item>
              <el-descriptions-item label="性别">
                {{ residentData.gender || '未知' }}
              </el-descriptions-item>
              <el-descriptions-item label="年龄">
                {{ calculateAge(residentData.idCard) }}岁
              </el-descriptions-item>
              <el-descriptions-item label="职业">
                {{ residentData.occupation || '农民' }}
              </el-descriptions-item>
              <el-descriptions-item label="文化程度">
                {{ residentData.education || '初中' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-col>
        </el-row>
      </el-card>

      <!-- 家庭信息 -->
      <el-card class="detail-card">
        <template #header>
          <div class="card-header">
            <el-icon><House /></el-icon>
            <span>家庭信息</span>
            <el-button size="small" @click="showFamilyDialog">
              <el-icon><Plus /></el-icon>
              添加成员
            </el-button>
          </div>
        </template>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="家庭住址">
            {{ residentData.address }}
          </el-descriptions-item>
          <el-descriptions-item label="家庭人口">
            {{ residentData.familyMembers || 1 }}人
          </el-descriptions-item>
          <el-descriptions-item label="户主">
            {{ residentData.isHousehold ? '是' : '否' }}
          </el-descriptions-item>
          <el-descriptions-item label="住房类型">
            {{ residentData.housingType || '自建房' }}
          </el-descriptions-item>
          <el-descriptions-item label="经济状况">
            {{ residentData.economicStatus || '一般' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 家庭成员列表 -->
        <div class="family-members" v-if="familyMembers.length > 0">
          <h4>家庭成员</h4>
          <el-table :data="familyMembers" size="small">
            <el-table-column prop="name" label="姓名" />
            <el-table-column prop="relationship" label="关系" />
            <el-table-column prop="age" label="年龄" width="80" />
            <el-table-column prop="occupation" label="职业" />
            <el-table-column prop="phone" label="联系电话" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button size="small" type="text" @click="editFamilyMember(row)">
                  编辑
                </el-button>
                <el-button size="small" type="text" @click="removeFamilyMember(row)">
                  移除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>

      <!-- 特殊标签 -->
      <el-card class="detail-card">
        <template #header>
          <div class="card-header">
            <el-icon><CollectionTag /></el-icon>
            <span>特殊标签</span>
          </div>
        </template>

        <div class="special-tags">
          <el-tag
            v-for="tag in residentData.specialTags"
            :key="tag"
            :type="getTagType(tag)"
            class="tag-item"
            closable
            @close="removeTag(tag)"
          >
            {{ tag }}
          </el-tag>

          <el-button size="small" @click="showAddTagDialog">
            <el-icon><Plus /></el-icon>
            添加标签
          </el-button>
        </div>
      </el-card>

      <!-- 健康档案 -->
      <el-card class="detail-card">
        <template #header>
          <div class="card-header">
            <el-icon><FirstAidKit /></el-icon>
            <span>健康档案</span>
            <el-button size="small" @click="showHealthDialog">
              <el-icon><Edit /></el-icon>
              更新档案
            </el-button>
          </div>
        </template>

        <el-descriptions :column="2" border>
          <el-descriptions-item label="健康状况">
            {{ residentData.health?.status || '良好' }}
          </el-descriptions-item>
          <el-descriptions-item label="血型">
            {{ residentData.health?.bloodType || '未知' }}
          </el-descriptions-item>
          <el-descriptions-item label="过敏史">
            {{ residentData.health?.allergies || '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="既往病史">
            {{ residentData.health?.medicalHistory || '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="疫苗接种">
            {{ residentData.health?.vaccination || '已完成' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 福利记录 -->
      <el-card class="detail-card">
        <template #header>
          <div class="card-header">
            <el-icon><Present /></el-icon>
            <span>福利记录</span>
            <el-button size="small" @click="showBenefitsDialog">
              <el-icon><Plus /></el-icon>
              添加记录
            </el-button>
          </div>
        </template>

        <el-table :data="benefitsRecords" size="small" v-if="benefitsRecords.length > 0">
          <el-table-column prop="type" label="福利类型" />
          <el-table-column prop="amount" label="金额" width="120">
            <template #default="{ row }">
              <span class="amount">¥{{ row.amount }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getBenefitStatusType(row.status)" size="small">
                {{ getBenefitStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="date" label="申请时间" width="150" />
        </el-table>

        <el-empty v-else description="暂无福利记录" />
      </el-card>
    </div>

    <template #footer>
      <el-button @click="handlePrint">
        <el-icon><Printer /></el-icon>
        打印档案
      </el-button>
      <el-button type="primary" @click="handleEdit">
        <el-icon><Edit /></el-icon>
        编辑信息
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  User,
  House,
  CollectionTag,
  FirstAidKit,
  Present,
  Plus,
  Edit,
  Printer,
} from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  resident: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'edit']);

const showIdCard = ref(false);
const residentData = ref(null);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

const familyMembers = ref([
  { name: '张小明', relationship: '儿子', age: 25, occupation: '务工', phone: '138****1111' },
  { name: '李小红', relationship: '女儿', age: 22, occupation: '学生', phone: '139****2222' },
]);

const benefitsRecords = ref([
  { type: '低保补助', amount: '500', status: 'approved', date: '2024-01-15' },
  { type: '医疗补贴', amount: '200', status: 'pending', date: '2024-01-10' },
]);

// 监听传入的村民数据
watch(
  () => props.resident,
  newVal => {
    if (newVal) {
      residentData.value = { ...newVal };
    }
  },
  { immediate: true }
);

const maskIdCard = idCard => {
  if (!idCard || idCard.length < 8) return idCard;
  return showIdCard.value
    ? idCard
    : idCard.substring(0, 6) + '********' + idCard.substring(idCard.length - 2);
};

const calculateAge = idCard => {
  if (!idCard || idCard.length !== 18) return 0;
  const birthYear = parseInt(idCard.substring(6, 10));
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
};

const getStatusType = status => {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'danger';
    default:
      return 'info';
  }
};

const getStatusLabel = status => {
  switch (status) {
    case 'active':
      return '正常';
    case 'inactive':
      return '注销';
    default:
      return '未知';
  }
};

const getTagType = tag => {
  switch (tag) {
    case '老年群体':
      return 'warning';
    case '低保户':
      return 'danger';
    case '党员':
      return 'primary';
    case '残疾人':
      return 'info';
    default:
      return 'success';
  }
};

const getBenefitStatusType = status => {
  switch (status) {
    case 'approved':
      return 'success';
    case 'pending':
      return 'warning';
    case 'rejected':
      return 'danger';
    default:
      return 'info';
  }
};

const getBenefitStatusLabel = status => {
  switch (status) {
    case 'approved':
      return '已批准';
    case 'pending':
      return '审核中';
    case 'rejected':
      return '已拒绝';
    default:
      return '未知';
  }
};

const showFamilyDialog = () => {
  ElMessage.info('添加家庭成员功能开发中...');
};

const showAddTagDialog = () => {
  ElMessage.info('添加标签功能开发中...');
};

const showHealthDialog = () => {
  ElMessage.info('更新健康档案功能开发中...');
};

const showBenefitsDialog = () => {
  ElMessage.info('添加福利记录功能开发中...');
};

const editFamilyMember = member => {
  ElMessage.info(`编辑家庭成员: ${member.name}`);
};

const removeFamilyMember = member => {
  ElMessage.info(`移除家庭成员: ${member.name}`);
};

const removeTag = tag => {
  if (residentData.value?.specialTags) {
    const index = residentData.value.specialTags.indexOf(tag);
    if (index > -1) {
      residentData.value.specialTags.splice(index, 1);
    }
  }
};

const handlePrint = () => {
  window.print();
  ElMessage.success('正在打印村民档案...');
};

const handleEdit = () => {
  emit('edit', residentData.value);
};
</script>

<style scoped>
.resident-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.avatar-section {
  text-align: center;
}

.name-section {
  margin-top: 16px;
  text-align: center;
}

.name-section h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.id-card {
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.family-members {
  margin-top: 20px;
}

.family-members h4 {
  margin: 16px 0 12px 0;
  font-size: 16px;
  font-weight: 600;
}

.special-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.tag-item {
  margin: 0;
}

.amount {
  color: #67c23a;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 2vh auto;
  }

  :deep(.el-descriptions) {
    :deep(.el-descriptions__cell) {
      padding: 8px 12px;
    }
  }
}

/* 打印样式 */
@media print {
  .detail-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  :deep(.el-button) {
    display: none;
  }
}
</style>
