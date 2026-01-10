<template>
  <el-dialog
    v-model="dialogVisible"
    title="家庭成员管理"
    width="800px"
    :close-on-click-modal="false"
  >
    <div class="family-member-management">
      <!-- 当前村民信息 -->
      <el-card v-if="resident" shadow="never" class="resident-card">
        <template #header>
          <span>当前村民信息</span>
        </template>
        <div class="resident-info">
          <el-avatar :size="50" :src="resident.avatar" :icon="UserFilled" />
          <div class="info">
            <h4>{{ resident.name }}</h4>
            <p>
              户码：{{ resident.householdCode }} | 家庭角色：{{
                getFamilyRoleText(resident.familyRole)
              }}
            </p>
          </div>
        </div>
      </el-card>

      <!-- 家庭成员列表 -->
      <el-card shadow="never" class="members-card">
        <template #header>
          <div class="card-header">
            <span>家庭成员列表</span>
            <el-button type="primary" size="small" @click="showAddMemberDialog" icon="Plus">
              添加成员
            </el-button>
          </div>
        </template>

        <el-table :data="familyMembers" border style="width: 100%" v-loading="loading">
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

          <el-table-column prop="idCard" label="身份证号" width="180">
            <template #default="scope">
              <span class="masked-id">{{ maskIdCard(scope.row.idCard) }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="phone" label="联系电话" width="130">
            <template #default="scope">
              <span>{{ maskPhone(scope.row.phone) }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="occupation" label="职业" />

          <el-table-column prop="healthStatus" label="健康状态" width="100">
            <template #default="scope">
              <el-tag :type="getHealthStatusType(scope.row.healthStatus)" size="small">
                {{ getHealthStatusText(scope.row.healthStatus) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="150" fixed="right">
            <template #default="scope">
              <el-button type="text" size="small" @click="editMember(scope.row)" icon="Edit">
                编辑
              </el-button>
              <el-button type="text" size="small" @click="viewMember(scope.row)" icon="View">
                查看
              </el-button>
              <el-button
                type="text"
                size="small"
                @click="removeMember(scope.row)"
                icon="Delete"
                class="danger-btn"
              >
                移除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="!familyMembers.length" class="no-data">
          暂无家庭成员信息
          <el-button type="text" @click="showAddMemberDialog">点击添加</el-button>
        </div>
      </el-card>

      <!-- 家庭关系图 -->
      <el-card shadow="never" class="relation-card">
        <template #header>
          <span>家庭关系图</span>
        </template>
        <div class="family-tree" ref="familyTreeRef">
          <div class="tree-node head" v-if="householder">
            <div class="node-content">
              <el-avatar :size="40" :src="householder.avatar" :icon="UserFilled" />
              <div class="node-info">
                <div class="name">{{ householder.name }}</div>
                <div class="role">户主</div>
              </div>
            </div>

            <!-- 配偶 -->
            <div v-if="spouse" class="spouse-node">
              <div class="connection-line"></div>
              <div class="node-content">
                <el-avatar :size="40" :src="spouse.avatar" :icon="UserFilled" />
                <div class="node-info">
                  <div class="name">{{ spouse.name }}</div>
                  <div class="role">配偶</div>
                </div>
              </div>
            </div>

            <!-- 子女 -->
            <div v-if="children.length" class="children-nodes">
              <div class="children-connection"></div>
              <div v-for="child in children" :key="child.id" class="child-node">
                <div class="node-content">
                  <el-avatar :size="30" :src="child.avatar" :icon="UserFilled" />
                  <div class="node-info">
                    <div class="name">{{ child.name }}</div>
                    <div class="role">子女</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 父母 -->
            <div v-if="parents.length" class="parents-nodes">
              <div class="parents-connection"></div>
              <div v-for="parent in parents" :key="parent.id" class="parent-node">
                <div class="node-content">
                  <el-avatar :size="35" :src="parent.avatar" :icon="UserFilled" />
                  <div class="node-info">
                    <div class="name">{{ parent.name }}</div>
                    <div class="role">父母</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!householder" class="no-tree">暂无家庭关系数据</div>
        </div>
      </el-card>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="refreshData" icon="Refresh"> 刷新数据 </el-button>
      </div>
    </template>

    <!-- 添加/编辑成员对话框 -->
    <member-form-dialog
      v-model="memberFormVisible"
      :member="currentMember"
      :resident="resident"
      :mode="memberFormMode"
      @confirm="handleMemberSave"
    />

    <!-- 成员详情对话框 -->
    <member-detail-dialog v-model="memberDetailVisible" :member="currentMember" />
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { UserFilled, Plus, Edit, View, Delete, Refresh } from '@element-plus/icons-vue';
import { residentAPI } from '@/api/resident';
import MemberFormDialog from './MemberFormDialog.vue';
import MemberDetailDialog from './MemberDetailDialog.vue';

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

const emit = defineEmits(['update:modelValue', 'refresh']);

// 响应式数据
const loading = ref(false);
const familyMembers = ref([]);
const currentMember = ref(null);
const memberFormVisible = ref(false);
const memberDetailVisible = ref(false);
const memberFormMode = ref('add'); // 'add' | 'edit'
const familyTreeRef = ref();

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

// 计算属性 - 家庭成员分类
const householder = computed(() => {
  return familyMembers.value.find(member => member.relationship === 'head') || props.resident;
});

const spouse = computed(() => {
  return familyMembers.value.find(member => member.relationship === 'spouse');
});

const children = computed(() => {
  return familyMembers.value.filter(member => member.relationship === 'child');
});

const parents = computed(() => {
  return familyMembers.value.filter(member => member.relationship === 'parent');
});

// 方法
const loadFamilyMembers = async () => {
  if (!props.resident?.id) return;

  loading.value = true;
  try {
    const response = await residentAPI.getResidentFamily(props.resident.id);
    if (response.success) {
      familyMembers.value = response.data || [];
    }
  } catch (error) {
    console.error('获取家庭成员失败:', error);
    ElMessage.error('获取家庭成员失败');
  } finally {
    loading.value = false;
  }
};

const showAddMemberDialog = () => {
  currentMember.value = null;
  memberFormMode.value = 'add';
  memberFormVisible.value = true;
};

const editMember = member => {
  currentMember.value = member;
  memberFormMode.value = 'edit';
  memberFormVisible.value = true;
};

const viewMember = member => {
  currentMember.value = member;
  memberDetailVisible.value = true;
};

const removeMember = async member => {
  try {
    await ElMessageBox.confirm(`确定要移除家庭成员 ${member.name} 吗？`, '移除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    // 这里调用移除家庭成员的API
    // const response = await residentAPI.removeFamilyMember(props.resident.id, member.id)
    // if (response.success) {
    //   ElMessage.success('移除成功')
    //   loadFamilyMembers()
    // }

    // 临时处理：从列表中移除
    const index = familyMembers.value.findIndex(m => m.id === member.id);
    if (index > -1) {
      familyMembers.value.splice(index, 1);
      ElMessage.success('移除成功');
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('移除失败');
    }
  }
};

const handleMemberSave = () => {
  memberFormVisible.value = false;
  loadFamilyMembers();
  emit('refresh');
};

const refreshData = () => {
  loadFamilyMembers();
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

const getRelationshipText = relationship => {
  const map = {
    head: '户主',
    spouse: '配偶',
    child: '子女',
    parent: '父母',
    sibling: '兄弟姐妹',
    other: '其他',
  };
  return map[relationship] || '未知';
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

// 监听对话框显示状态
watch(
  () => props.modelValue,
  newVal => {
    if (newVal && props.resident) {
      loadFamilyMembers();
    }
  }
);

onMounted(() => {
  if (props.modelValue && props.resident) {
    loadFamilyMembers();
  }
});
</script>

<style lang="scss" scoped>
.family-member-management {
  .resident-card {
    margin-bottom: 20px;

    .resident-info {
      display: flex;
      align-items: center;
      gap: 15px;

      .info {
        h4 {
          margin: 0 0 5px 0;
          color: #303133;
        }

        p {
          margin: 0;
          color: #606266;
          font-size: 14px;
        }
      }
    }
  }

  .members-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .masked-id {
      font-family: monospace;
      color: #909399;
    }

    .danger-btn {
      color: #f56c6c !important;

      &:hover {
        color: #f78989 !important;
      }
    }

    .no-data {
      text-align: center;
      color: #909399;
      padding: 40px 0;
    }
  }

  .relation-card {
    .family-tree {
      min-height: 300px;
      padding: 20px;
      position: relative;

      .tree-node {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;

        &.head {
          .node-content {
            background: #e1f3fe;
            border-color: #409eff;
          }
        }

        .node-content {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

          .node-info {
            .name {
              font-weight: 500;
              color: #303133;
              font-size: 14px;
            }

            .role {
              color: #909399;
              font-size: 12px;
            }
          }
        }

        .spouse-node {
          position: absolute;
          top: 0;
          left: 300px;
          display: flex;
          align-items: center;

          .connection-line {
            width: 50px;
            height: 2px;
            background: #e0e0e0;
            margin-right: 10px;
          }

          .node-content {
            background: #fff2e8;
            border-color: #e6a23c;
          }
        }

        .children-nodes {
          margin-top: 50px;
          position: relative;

          .children-connection {
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            width: 2px;
            height: 25px;
            background: #e0e0e0;

            &::before {
              content: '';
              position: absolute;
              top: 0;
              left: -20px;
              width: 40px;
              height: 2px;
              background: #e0e0e0;
            }
          }

          .child-node {
            display: inline-block;
            margin: 0 10px;

            .node-content {
              background: #f0f9ff;
              border-color: #67c23a;
            }
          }
        }

        .parents-nodes {
          position: absolute;
          top: -100px;
          left: 50%;
          transform: translateX(-50%);

          .parents-connection {
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            width: 2px;
            height: 25px;
            background: #e0e0e0;
          }

          .parent-node {
            display: inline-block;
            margin: 0 10px;

            .node-content {
              background: #fef0f0;
              border-color: #f56c6c;
            }
          }
        }
      }

      .no-tree {
        text-align: center;
        color: #909399;
        padding: 100px 0;
      }
    }
  }
}

.dialog-footer {
  text-align: right;
}

// 响应式设计
@media (max-width: 768px) {
  .family-member-management {
    .family-tree {
      .tree-node {
        .spouse-node {
          position: static !important;
          margin-top: 20px;

          .connection-line {
            display: none;
          }
        }

        .parents-nodes {
          position: static !important;
          margin-bottom: 20px;
          transform: none !important;
        }
      }
    }
  }
}
</style>
