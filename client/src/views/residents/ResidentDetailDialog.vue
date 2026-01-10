<template>
  <el-dialog
    v-model="dialogVisible"
    title="村民档案详情"
    width="900px"
    :close-on-click-modal="false"
  >
    <div v-if="resident" class="resident-detail">
      <!-- 基本信息卡片 -->
      <el-card class="basic-info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>基本信息</span>
            <el-button
              type="primary"
              size="small"
              @click="editResident"
              icon="Edit"
              v-permission="['resident:write']"
            >
              编辑
            </el-button>
          </div>
        </template>

        <div class="basic-info-content">
          <div class="avatar-section">
            <el-avatar
              :size="120"
              :src="resident.avatar"
              :icon="UserFilled"
              class="resident-avatar"
            />
            <div class="qr-code-section">
              <el-button type="success" size="small" @click="showQRCode" icon="QrCode">
                查看二维码
              </el-button>
            </div>
          </div>

          <div class="info-section">
            <el-row :gutter="20">
              <el-col :span="8">
                <div class="info-item">
                  <label>姓名：</label>
                  <span class="value">{{ resident.name }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <label>性别：</label>
                  <el-tag :type="resident.gender === 'male' ? 'primary' : 'danger'" size="small">
                    {{ resident.gender === 'male' ? '男' : '女' }}
                  </el-tag>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <label>年龄：</label>
                  <span class="value">{{ resident.age }} 岁</span>
                </div>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <div class="info-item">
                  <label>身份证号：</label>
                  <span class="value sensitive-info">
                    {{ showSensitiveInfo ? resident.idCard : maskIdCard(resident.idCard) }}
                  </span>
                  <el-button
                    type="text"
                    size="small"
                    @click="toggleSensitiveInfo"
                    :icon="showSensitiveInfo ? 'Hide' : 'View'"
                    v-permission="['resident:read']"
                  />
                </div>
              </el-col>
              <el-col :span="12">
                <div class="info-item">
                  <label>出生日期：</label>
                  <span class="value">{{ formatDate(resident.birthDate) }}</span>
                </div>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="8">
                <div class="info-item">
                  <label>民族：</label>
                  <span class="value">{{ getEthnicityText(resident.ethnicity) }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <label>婚姻状况：</label>
                  <span class="value">{{ getMaritalStatusText(resident.maritalStatus) }}</span>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="info-item">
                  <label>联系电话：</label>
                  <span class="value">{{ maskPhone(resident.phone) }}</span>
                </div>
              </el-col>
            </el-row>
          </div>
        </div>
      </el-card>

      <!-- 详细信息选项卡 -->
      <el-card shadow="never" class="detail-tabs-card">
        <el-tabs v-model="activeTab" type="border-card">
          <!-- 居住信息 -->
          <el-tab-pane label="居住信息" name="address">
            <div class="tab-content">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="户码">
                  <el-button type="text" @click="showQRCode" icon="QrCode">
                    {{ resident.householdCode }}
                  </el-button>
                </el-descriptions-item>
                <el-descriptions-item label="户籍类型">
                  {{ getHouseholdTypeText(resident.householdType) }}
                </el-descriptions-item>
                <el-descriptions-item label="详细地址" :span="2">
                  {{ resident.address }}
                </el-descriptions-item>
                <el-descriptions-item label="房屋性质">
                  {{ getHouseTypeText(resident.houseType) }}
                </el-descriptions-item>
                <el-descriptions-item label="房屋面积">
                  {{ resident.houseArea }} 平方米
                </el-descriptions-item>
                <el-descriptions-item label="建造年份">
                  {{ resident.buildYear }}
                </el-descriptions-item>
                <el-descriptions-item label="家庭角色">
                  <el-tag type="info" size="small">
                    {{ getFamilyRoleText(resident.familyRole) }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>

          <!-- 个人详情 -->
          <el-tab-pane label="个人详情" name="personal">
            <div class="tab-content">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="文化程度">
                  {{ getEducationText(resident.education) }}
                </el-descriptions-item>
                <el-descriptions-item label="职业">
                  {{ resident.occupation || '无' }}
                </el-descriptions-item>
                <el-descriptions-item label="政治面貌">
                  {{ getPoliticalStatusText(resident.politicalStatus) }}
                </el-descriptions-item>
                <el-descriptions-item label="健康状态">
                  <el-tag :type="getHealthStatusType(resident.healthStatus)" size="small">
                    {{ getHealthStatusText(resident.healthStatus) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="特殊情况" :span="2">
                  <div v-if="resident.specialConditions && resident.specialConditions.length > 0">
                    <el-tag
                      v-for="condition in resident.specialConditions"
                      :key="condition"
                      type="warning"
                      size="small"
                      class="condition-tag"
                    >
                      {{ getSpecialConditionText(condition) }}
                    </el-tag>
                  </div>
                  <span v-else class="no-data">无</span>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>

          <!-- 联系人信息 -->
          <el-tab-pane label="紧急联系人" name="emergency">
            <div class="tab-content">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="联系人姓名">
                  {{ resident.emergencyContact?.name || '无' }}
                </el-descriptions-item>
                <el-descriptions-item label="与本人关系">
                  {{ getRelationshipText(resident.emergencyContact?.relationship) }}
                </el-descriptions-item>
                <el-descriptions-item label="联系电话">
                  {{ resident.emergencyContact?.phone || '无' }}
                </el-descriptions-item>
                <el-descriptions-item label="联系地址">
                  {{ resident.emergencyContact?.address || '无' }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>

          <!-- 家庭成员 -->
          <el-tab-pane label="家庭成员" name="family">
            <div class="tab-content">
              <div class="family-header">
                <span>家庭成员列表</span>
                <el-button type="primary" size="small" @click="manageFamilyMembers" icon="Plus">
                  管理家庭成员
                </el-button>
              </div>

              <el-table :data="familyMembers" border style="width: 100%">
                <el-table-column prop="name" label="姓名" width="120" />
                <el-table-column prop="relationship" label="与户主关系" width="120">
                  <template #default="scope">
                    {{ getRelationshipText(scope.row.relationship) }}
                  </template>
                </el-table-column>
                <el-table-column prop="gender" label="性别" width="80">
                  <template #default="scope">
                    <el-tag :type="scope.row.gender === 'male' ? 'primary' : 'danger'" size="small">
                      {{ scope.row.gender === 'male' ? '男' : '女' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="age" label="年龄" width="80" />
                <el-table-column prop="occupation" label="职业" />
                <el-table-column label="操作" width="120">
                  <template #default="scope">
                    <el-button type="text" size="small" @click="viewFamilyMember(scope.row)">
                      查看
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>

              <div v-if="!familyMembers.length" class="no-data">暂无家庭成员信息</div>
            </div>
          </el-tab-pane>

          <!-- 变更历史 -->
          <el-tab-pane label="变更历史" name="history">
            <div class="tab-content">
              <el-timeline>
                <el-timeline-item
                  v-for="item in changeHistory"
                  :key="item.id"
                  :timestamp="formatDateTime(item.timestamp)"
                  :type="getHistoryType(item.action)"
                >
                  <el-card shadow="never">
                    <div class="history-item">
                      <div class="history-header">
                        <span class="action">{{ getActionText(item.action) }}</span>
                        <span class="operator">操作人：{{ item.operator }}</span>
                      </div>
                      <div class="history-content">
                        {{ item.description }}
                      </div>
                      <div v-if="item.changes" class="changes">
                        <div v-for="change in item.changes" :key="change.field" class="change-item">
                          <span class="field">{{ change.fieldName }}：</span>
                          <span class="old-value">{{ change.oldValue }}</span>
                          <el-icon><Right /></el-icon>
                          <span class="new-value">{{ change.newValue }}</span>
                        </div>
                      </div>
                    </div>
                  </el-card>
                </el-timeline-item>
              </el-timeline>

              <div v-if="!changeHistory.length" class="no-data">暂无变更历史</div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>

      <!-- 备注信息 -->
      <el-card v-if="resident.remark" shadow="never" class="remark-card">
        <template #header>
          <span>备注信息</span>
        </template>
        <div class="remark-content">
          {{ resident.remark }}
        </div>
      </el-card>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button
          type="primary"
          @click="editResident"
          icon="Edit"
          v-permission="['resident:write']"
        >
          编辑资料
        </el-button>
        <el-button type="success" @click="showQRCode" icon="QrCode"> 查看二维码 </el-button>
      </div>
    </template>

    <!-- 二维码对话框 -->
    <qr-code-dialog v-model="qrCodeVisible" :resident="resident" />

    <!-- 家庭成员管理对话框 -->
    <family-member-dialog
      v-model="familyMemberVisible"
      :resident="resident"
      @refresh="loadFamilyMembers"
    />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { UserFilled, Edit, QrCode, Plus, Hide, View, Right } from '@element-plus/icons-vue';
import { residentAPI } from '@/api/resident';
import QrCodeDialog from './QrCodeDialog.vue';
import FamilyMemberDialog from './FamilyMemberDialog.vue';

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

// 响应式数据
const activeTab = ref('address');
const showSensitiveInfo = ref(false);
const qrCodeVisible = ref(false);
const familyMemberVisible = ref(false);
const familyMembers = ref([]);
const changeHistory = ref([]);

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

// 方法
const toggleSensitiveInfo = () => {
  showSensitiveInfo.value = !showSensitiveInfo.value;
};

const editResident = () => {
  emit('edit', props.resident);
  dialogVisible.value = false;
};

const showQRCode = () => {
  qrCodeVisible.value = true;
};

const manageFamilyMembers = () => {
  familyMemberVisible.value = true;
};

const viewFamilyMember = member => {
  // 查看家庭成员详情
  console.log('查看家庭成员:', member);
};

const loadFamilyMembers = async () => {
  if (!props.resident?.id) return;

  try {
    const response = await residentAPI.getResidentFamily(props.resident.id);
    if (response.success) {
      familyMembers.value = response.data;
    }
  } catch (error) {
    console.error('获取家庭成员失败:', error);
  }
};

const loadChangeHistory = async () => {
  if (!props.resident?.id) return;

  try {
    const response = await residentAPI.getResidentHistory(props.resident.id);
    if (response.success) {
      changeHistory.value = response.data;
    }
  } catch (error) {
    console.error('获取变更历史失败:', error);
  }
};

// 工具函数
const maskIdCard = idCard => {
  if (!idCard) return '';
  return idCard.replace(/^(.{6}).*(.{4})$/, '$1**********$2');
};

const maskPhone = phone => {
  if (!phone) return '';
  return phone.replace(/^(.{3}).*(.{4})$/, '$1****$2');
};

const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleDateString();
};

const formatDateTime = date => {
  if (!date) return '';
  return new Date(date).toLocaleString();
};

// 文本映射函数
const getEthnicityText = ethnicity => {
  const map = {
    han: '汉族',
    zhuang: '壮族',
    hui: '回族',
    manchu: '满族',
    uyghur: '维吾尔族',
    other: '其他',
  };
  return map[ethnicity] || '未知';
};

const getMaritalStatusText = status => {
  const map = {
    unmarried: '未婚',
    married: '已婚',
    divorced: '离异',
    widowed: '丧偶',
  };
  return map[status] || '未知';
};

const getHouseholdTypeText = type => {
  const map = {
    agricultural: '农业户口',
    non_agricultural: '非农户口',
  };
  return map[type] || '未知';
};

const getHouseTypeText = type => {
  const map = {
    owned: '自有房屋',
    rented: '租赁房屋',
    public: '公房',
    other: '其他',
  };
  return map[type] || '未知';
};

const getFamilyRoleText = role => {
  const map = {
    head: '户主',
    spouse: '配偶',
    child: '子女',
    parent: '父母',
    other: '其他',
  };
  return map[role] || '未知';
};

const getEducationText = education => {
  const map = {
    illiterate: '文盲',
    primary: '小学',
    junior: '初中',
    senior: '高中',
    college: '大专',
    bachelor: '本科',
    graduate: '研究生',
  };
  return map[education] || '未知';
};

const getPoliticalStatusText = status => {
  const map = {
    masses: '群众',
    youth_league: '共青团员',
    party_member: '中共党员',
    democratic_party: '民主党派',
    other: '其他',
  };
  return map[status] || '未知';
};

const getHealthStatusText = status => {
  const map = {
    healthy: '健康',
    chronic: '慢性病',
    disabled: '残疾',
  };
  return map[status] || '未知';
};

const getHealthStatusType = status => {
  const map = {
    healthy: 'success',
    chronic: 'warning',
    disabled: 'danger',
  };
  return map[status] || 'info';
};

const getSpecialConditionText = condition => {
  const map = {
    low_income: '低保户',
    disabled: '残疾人',
    elderly_alone: '独居老人',
    veteran: '退伍军人',
    poverty: '建档立卡贫困户',
  };
  return map[condition] || condition;
};

const getRelationshipText = relationship => {
  const map = {
    spouse: '配偶',
    child: '子女',
    parent: '父母',
    sibling: '兄弟姐妹',
    relative: '其他亲属',
    friend: '朋友',
  };
  return map[relationship] || '未知';
};

const getHistoryType = action => {
  const map = {
    create: 'primary',
    update: 'success',
    delete: 'danger',
  };
  return map[action] || 'info';
};

const getActionText = action => {
  const map = {
    create: '创建档案',
    update: '更新信息',
    delete: '删除档案',
  };
  return map[action] || action;
};

// 监听对话框显示状态
watch(
  () => props.modelValue,
  newVal => {
    if (newVal && props.resident) {
      showSensitiveInfo.value = false;
      activeTab.value = 'address';
      loadFamilyMembers();
      loadChangeHistory();
    }
  }
);
</script>

<style lang="scss" scoped>
.resident-detail {
  .basic-info-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .basic-info-content {
      display: flex;
      gap: 30px;

      .avatar-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;

        .resident-avatar {
          border: 2px solid #f0f0f0;
        }
      }

      .info-section {
        flex: 1;

        .info-item {
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;

          label {
            font-weight: 500;
            color: #606266;
            min-width: 80px;
          }

          .value {
            color: #303133;

            &.sensitive-info {
              font-family: monospace;
            }
          }
        }
      }
    }
  }

  .detail-tabs-card {
    margin-bottom: 20px;

    .tab-content {
      padding: 20px 0;
    }

    .family-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      font-weight: 500;
    }

    .condition-tag {
      margin-right: 8px;
      margin-bottom: 4px;
    }

    .history-item {
      .history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .action {
          font-weight: 500;
          color: #409eff;
        }

        .operator {
          font-size: 12px;
          color: #909399;
        }
      }

      .history-content {
        color: #606266;
        margin-bottom: 8px;
      }

      .changes {
        border-top: 1px solid #f0f0f0;
        padding-top: 8px;

        .change-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
          font-size: 12px;

          .field {
            font-weight: 500;
            color: #606266;
          }

          .old-value {
            color: #f56c6c;
            text-decoration: line-through;
          }

          .new-value {
            color: #67c23a;
            font-weight: 500;
          }
        }
      }
    }
  }

  .remark-card {
    .remark-content {
      color: #606266;
      line-height: 1.6;
    }
  }

  .no-data {
    text-align: center;
    color: #909399;
    padding: 40px 0;
  }
}

.dialog-footer {
  text-align: right;
}

// 响应式设计
@media (max-width: 768px) {
  .resident-detail {
    .basic-info-content {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .family-header {
      flex-direction: column;
      gap: 10px;
      align-items: stretch;
    }
  }
}
</style>
