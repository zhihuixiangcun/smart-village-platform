<template>
  <div class="family-detail">
    <!-- 家庭基本信息 -->
    <el-card class="detail-card">
      <template #header>
        <div class="card-header">
          <span>家庭信息</span>
          <el-button type="primary" @click="handleEdit"> 编辑 </el-button>
        </div>
      </template>

      <el-descriptions :column="3" border>
        <el-descriptions-item label="家庭编码">
          {{ family?.familyCode }}
        </el-descriptions-item>
        <el-descriptions-item label="家庭名称">
          {{ family?.familyName }}
        </el-descriptions-item>
        <el-descriptions-item label="家庭类型">
          <el-tag :type="getFamilyTypeTag(family?.familyType)">
            {{ family?.familyType }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="家庭住址" :span="3">
          {{ formatAddress(family?.address) }}
        </el-descriptions-item>
        <el-descriptions-item label="主要电话">
          {{ family?.contact?.primaryPhone }}
        </el-descriptions-item>
        <el-descriptions-item label="备用电话">
          {{ family?.contact?.secondaryPhone || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="紧急联系人">
          {{ family?.contact?.emergencyContact?.name }} ({{
            family?.contact?.emergencyContact?.relationship
          }})
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 家庭成员 -->
    <el-card class="detail-card">
      <template #header>
        <div class="card-header">
          <span>家庭成员 ({{ family?.members?.length || 0 }}人)</span>
          <el-button type="success" @click="handleAddMember"> 添加成员 </el-button>
        </div>
      </template>

      <el-table :data="family?.members || []" style="width: 100%">
        <el-table-column type="expand" width="50">
          <template #default="{ row }">
            <div class="member-detail">
              <el-row :gutter="20">
                <el-col :span="8">
                  <h4>基本信息</h4>
                  <p><strong>身份证号：</strong>{{ maskIdCard(row.idCard) }}</p>
                  <p><strong>民族：</strong>{{ row.ethnicity }}</p>
                  <p><strong>政治面貌：</strong>{{ row.politicalStatus }}</p>
                  <p><strong>健康状况：</strong>{{ row.healthStatus }}</p>
                </el-col>
                <el-col :span="8">
                  <h4>教育就业</h4>
                  <p><strong>学历：</strong>{{ row.education }}</p>
                  <p><strong>就业状态：</strong>{{ row.employmentStatus }}</p>
                  <p><strong>工作单位：</strong>{{ row.employer || '未填写' }}</p>
                  <p><strong>职业：</strong>{{ row.occupation }}</p>
                </el-col>
                <el-col :span="8">
                  <h4>社会保障</h4>
                  <p>
                    <strong>医保：</strong>
                    <el-tag :type="row.hasMedicalInsurance ? 'success' : 'info'" size="small">
                      {{ row.hasMedicalInsurance ? '有' : '无' }}
                    </el-tag>
                  </p>
                  <p>
                    <strong>养老：</strong>
                    <el-tag :type="row.hasPensionInsurance ? 'success' : 'info'" size="small">
                      {{ row.hasPensionInsurance ? '有' : '无' }}
                    </el-tag>
                  </p>
                  <p><strong>医保类型：</strong>{{ row.insuranceType?.join('、') || '无' }}</p>
                </el-col>
              </el-row>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="头像" width="80" align="center">
          <template #default="{ row }">
            <el-avatar :size="50" :src="row.photo" :alt="row.name">
              {{ row.name.charAt(0) }}
            </el-avatar>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="姓名" width="120" />

        <el-table-column prop="relationship" label="关系" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.isHead" type="warning" size="small">户主</el-tag>
            <span v-else>{{ row.relationship }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="gender" label="性别" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.gender === '男' ? 'primary' : 'danger'" size="small">
              {{ row.gender }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="age" label="年龄" width="80" align="center" />

        <el-table-column prop="phone" label="联系电话" width="150" />

        <el-table-column prop="education" label="学历" width="120" />

        <el-table-column prop="employmentStatus" label="就业状态" width="120" />

        <el-table-column label="特殊标签" width="200">
          <template #default="{ row }">
            <el-tag
              v-for="tag in row.tags"
              :key="tag"
              size="small"
              :type="getTagType(tag)"
              style="margin-right: 5px; margin-bottom: 5px"
            >
              {{ tag }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewMemberProfile(row)"> 查看档案 </el-button>
            <el-button link type="primary" @click="editMember(row)"> 编辑 </el-button>
            <el-dropdown @command="handleMemberAction">
              <el-button link>
                更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'documents', member: row }">
                    查看文档
                  </el-dropdown-item>
                  <el-dropdown-item
                    :command="{ action: 'setHead', member: row }"
                    v-if="!row.isHead"
                  >
                    设为户主
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'remove', member: row }" divided>
                    移除成员
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 家庭资产 -->
    <el-card class="detail-card">
      <template #header>
        <span>家庭资产</span>
      </template>

      <el-descriptions :column="3" border>
        <el-descriptions-item label="住房情况">
          {{ family?.assets?.housing?.type || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="住房面积">
          {{ family?.assets?.housing?.area ? `${family.assets.housing.area}㎡` : '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="房产证号">
          {{ family?.assets?.housing?.propertyNumber || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="土地面积">
          {{ family?.assets?.land?.area ? `${family.assets.land.area}亩` : '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="土地类型">
          {{ family?.assets?.land?.type || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="承包年限">
          {{ family?.assets?.land?.contractYears || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="年收入">
          {{ formatIncome(family?.economicStatus?.annualIncome) }}
        </el-descriptions-item>
        <el-descriptions-item label="主要收入来源">
          {{ family?.economicStatus?.incomeSource || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="经济类型">
          <el-tag :type="getEconomicTypeTag(family?.economicStatus?.type)">
            {{ family?.economicStatus?.type || '未填写' }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 代理关系 -->
    <el-card class="detail-card" v-if="family?.agents?.length > 0">
      <template #header>
        <div class="card-header">
          <span>代理关系</span>
          <el-button type="success" @click="handleAddAgent"> 添加代理 </el-button>
        </div>
      </template>

      <el-table :data="family.agents" style="width: 100%">
        <el-table-column prop="agentName" label="代理人" width="150" />
        <el-table-column prop="relationship" label="关系" width="120" />
        <el-table-column prop="agentPhone" label="联系电话" width="150" />
        <el-table-column prop="permissions" label="权限" width="300">
          <template #default="{ row }">
            <el-tag
              v-for="permission in row.permissions"
              :key="permission"
              size="small"
              style="margin-right: 5px"
            >
              {{ getPermissionName(permission) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '有效' : '无效' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row, $index }">
            <el-button link type="primary" @click="editAgent(row)"> 编辑 </el-button>
            <el-button link type="danger" @click="removeAgent($index)"> 删除 </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 家庭标签 -->
    <el-card class="detail-card" v-if="family?.tags?.length > 0">
      <template #header>
        <span>家庭标签</span>
      </template>

      <div class="family-tags">
        <el-tag
          v-for="tag in family.tags"
          :key="tag"
          :type="getTagType(tag)"
          style="margin-right: 10px; margin-bottom: 10px"
        >
          {{ tag }}
        </el-tag>
      </div>
    </el-card>

    <!-- 操作日志 -->
    <el-card class="detail-card">
      <template #header>
        <span>操作日志</span>
      </template>

      <el-timeline>
        <el-timeline-item
          v-for="log in operationLogs"
          :key="log.id"
          :timestamp="formatDate(log.createdAt)"
          :type="getLogType(log.type)"
        >
          <div class="log-content">
            <span class="log-action">{{ log.action }}</span>
            <span class="log-operator">{{ log.operator }}</span>
            <span class="log-detail">{{ log.detail }}</span>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';

// Props
const props = defineProps({
  family: {
    type: Object,
    required: true,
  },
});

// Emits
const emit = defineEmits(['edit', 'addMember', 'editMember', 'addAgent']);

// 操作日志（示例数据）
const operationLogs = ref([
  {
    id: 1,
    type: 'create',
    action: '创建家庭',
    operator: '张三',
    detail: '创建家庭档案',
    createdAt: '2025-01-15 10:30:00',
  },
  {
    id: 2,
    type: 'update',
    action: '更新信息',
    operator: '李四',
    detail: '修改联系电话',
    createdAt: '2025-01-16 14:20:00',
  },
  {
    id: 3,
    type: 'add',
    action: '添加成员',
    operator: '王五',
    detail: '添加家庭成员：王小明',
    createdAt: '2025-01-17 09:15:00',
  },
]);

// 获取家庭类型标签
const getFamilyTypeTag = type => {
  const typeMap = {
    普通户: '',
    低保户: 'danger',
    特困户: 'warning',
    独生户: 'primary',
    双女户: 'success',
    其他: 'info',
  };
  return typeMap[type] || 'info';
};

// 获取经济类型标签
const getEconomicTypeTag = type => {
  const typeMap = {
    低收入: 'danger',
    中等收入: '',
    高收入: 'success',
    其他: 'info',
  };
  return typeMap[type] || 'info';
};

// 获取标签类型
const getTagType = tag => {
  const tagTypeMap = {
    党员户: 'danger',
    军人家庭: 'success',
    优抚对象: 'success',
    残疾人家庭: 'info',
    留守儿童: 'primary',
    空巢老人: 'warning',
    其他: '',
  };
  return tagTypeMap[tag] || '';
};

// 获取权限名称
const getPermissionName = permission => {
  const permissionMap = {
    view_profile: '查看档案',
    edit_profile: '编辑档案',
    view_documents: '查看文档',
    upload_documents: '上传文档',
    apply_services: '申请服务',
  };
  return permissionMap[permission] || permission;
};

// 获取日志类型
const getLogType = type => {
  const typeMap = {
    create: 'success',
    update: 'primary',
    add: 'success',
    remove: 'danger',
    delete: 'danger',
  };
  return typeMap[type] || 'primary';
};

// 格式化地址
const formatAddress = address => {
  if (!address) return '未填写';
  const parts = [
    address.province,
    address.city,
    address.county,
    address.town,
    address.village,
    address.group,
    address.detail,
  ].filter(Boolean);
  return parts.join('');
};

// 格式化收入
const formatIncome = income => {
  if (!income) return '未填写';
  return `${income.toLocaleString()} 元`;
};

// 格式化日期
const formatDate = date => {
  return new Date(date).toLocaleString('zh-CN');
};

// 身份证号脱敏
const maskIdCard = idCard => {
  if (!idCard) return '';
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
};

// 编辑家庭
const handleEdit = () => {
  emit('edit', props.family);
};

// 添加成员
const handleAddMember = () => {
  emit('addMember', props.family);
};

// 查看成员档案
const viewMemberProfile = member => {
  // 跳转到成员档案详情页
  console.log('查看成员档案:', member);
};

// 编辑成员
const editMember = member => {
  emit('editMember', member);
};

// 成员更多操作
const handleMemberAction = ({ action, member }) => {
  switch (action) {
    case 'documents':
      // 查看成员文档
      console.log('查看成员文档:', member);
      break;
    case 'setHead':
      // 设为户主
      ElMessageBox.confirm(`确定要将"${member.name}"设为户主吗？`, '设置户主', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        ElMessage.success('户主设置成功');
        // 实际应该调用API
      });
      break;
    case 'remove':
      // 移除成员
      ElMessageBox.confirm(`确定要将"${member.name}"从家庭中移除吗？`, '移除成员', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        ElMessage.success('成员移除成功');
        // 实际应该调用API
      });
      break;
  }
};

// 添加代理
const handleAddAgent = () => {
  emit('addAgent', props.family);
};

// 编辑代理
const editAgent = agent => {
  console.log('编辑代理:', agent);
};

// 删除代理
const removeAgent = index => {
  ElMessageBox.confirm('确定要删除这个代理关系吗？', '删除代理', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    ElMessage.success('代理删除成功');
    // 实际应该调用API
  });
};
</script>

<style lang="scss" scoped>
.family-detail {
  .detail-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .member-detail {
      padding: 20px;
      background: #f8f9fa;
      border-radius: 4px;

      h4 {
        margin: 0 0 10px 0;
        color: #409eff;
        font-size: 14px;
      }

      p {
        margin: 5px 0;
        font-size: 13px;
        color: #606266;

        strong {
          color: #303133;
          margin-right: 5px;
        }
      }
    }

    .family-tags {
      .el-tag {
        font-size: 14px;
        padding: 8px 15px;
      }
    }

    .log-content {
      .log-action {
        font-weight: 500;
        margin-right: 10px;
      }

      .log-operator {
        color: #409eff;
        margin-right: 10px;
      }

      .log-detail {
        color: #606266;
      }
    }
  }
}
</style>
