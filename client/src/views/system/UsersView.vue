<template>
  <div class="committee-management">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">村委管理</h1>
        <p class="page-description">管理村委会成员信息、职务分配和权限控制</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showAddDialog" icon="Plus">添加成员</el-button>
        <el-button @click="exportData" icon="Download">导出名单</el-button>
        <el-button @click="showDutyDialog" icon="Calendar">值班管理</el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-section">
      <el-card>
        <el-row :gutter="16">
          <el-col :span="6">
            <el-input
              v-model="searchQuery.name"
              placeholder="搜索姓名"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          <el-col :span="4">
            <el-select v-model="searchQuery.position" placeholder="职务筛选" clearable>
              <el-option label="全部" value="" />
              <el-option label="村支书" value="村支书" />
              <el-option label="村主任" value="村主任" />
              <el-option label="会计" value="会计" />
              <el-option label="妇女主任" value="妇女主任" />
              <el-option label="治保主任" value="治保主任" />
              <el-option label="民兵连长" value="民兵连长" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-select v-model="searchQuery.status" placeholder="状态筛选" clearable>
              <el-option label="全部" value="" />
              <el-option label="在职" value="active" />
              <el-option label="休假" value="vacation" />
              <el-option label="调离" value="transferred" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-button type="primary" @click="handleSearch" icon="Search">搜索</el-button>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <!-- 村委会成员列表 -->
    <div class="members-section">
      <el-card>
        <template #header>
          <div class="card-header">
            <span class="card-title">村委会成员名单</span>
            <el-tag type="info">共 {{ filteredMembers.length }} 人</el-tag>
          </div>
        </template>

        <el-table :data="paginatedMembers" stripe style="width: 100%">
          <el-table-column prop="name" label="姓名" width="100">
            <template #default="scope">
              <div class="member-info">
                <el-avatar :size="40" :src="scope.row.avatar">
                  {{ scope.row.name.charAt(0) }}
                </el-avatar>
                <div class="member-details">
                  <div class="member-name">{{ scope.row.name }}</div>
                  <el-tag size="small" :type="getStatusType(scope.row.status)">
                    {{ getStatusText(scope.row.status) }}
                  </el-tag>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="position" label="职务" width="120">
            <template #default="scope">
              <el-tag :type="getPositionType(scope.row.position)">
                {{ scope.row.position }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="phone" label="联系电话" width="140">
            <template #default="scope">
              <span>{{ maskPhone(scope.row.phone) }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="email" label="邮箱" width="180">
            <template #default="scope">
              <span v-if="scope.row.email">{{ scope.row.email }}</span>
              <span v-else class="text-gray">-</span>
            </template>
          </el-table-column>

          <el-table-column prop="joinDate" label="任职时间" width="120">
            <template #default="scope">
              <span>{{ formatDate(scope.row.joinDate) }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="partyMember" label="政治面貌" width="100">
            <template #default="scope">
              <el-tag v-if="scope.row.partyMember" type="danger" size="small">党员</el-tag>
              <el-tag v-else type="info" size="small">群众</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right">
            <template #default="scope">
              <el-button link type="primary" @click="viewMember(scope.row)">详情</el-button>
              <el-button link type="warning" @click="editMember(scope.row)">编辑</el-button>
              <el-button
                v-if="scope.row.status === 'active'"
                link
                type="danger"
                @click="handleTransfer(scope.row)"
              >
                调离
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredMembers.length"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">👥</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.total }}</div>
                <div class="stat-label">总人数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">✅</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.active }}</div>
                <div class="stat-label">在职</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">🏛️</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.partyMembers }}</div>
                <div class="stat-label">党员</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">📞</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.onDuty }}</div>
                <div class="stat-label">今日值班</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 添加/编辑成员对话框 -->
    <el-dialog
      v-model="memberDialogVisible"
      :title="dialogMode === 'add' ? '添加成员' : '编辑成员'"
      width="600px"
    >
      <el-form :model="memberForm" :rules="memberRules" ref="memberFormRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="memberForm.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-select v-model="memberForm.gender" placeholder="请选择性别">
                <el-option label="男" value="男" />
                <el-option label="女" value="女" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="职务" prop="position">
              <el-select v-model="memberForm.position" placeholder="请选择职务">
                <el-option label="村支书" value="村支书" />
                <el-option label="村主任" value="村主任" />
                <el-option label="会计" value="会计" />
                <el-option label="妇女主任" value="妇女主任" />
                <el-option label="治保主任" value="治保主任" />
                <el-option label="民兵连长" value="民兵连长" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-select v-model="memberForm.status" placeholder="请选择状态">
                <el-option label="在职" value="active" />
                <el-option label="休假" value="vacation" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="身份证号" prop="idCard">
          <el-input v-model="memberForm.idCard" placeholder="请输入身份证号" />
        </el-form-item>

        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="memberForm.phone" placeholder="请输入联系电话" />
        </el-form-item>

        <el-form-item label="邮箱">
          <el-input v-model="memberForm.email" placeholder="请输入邮箱（可选）" />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="政治面貌">
              <el-radio-group v-model="memberForm.partyMember">
                <el-radio :label="true">党员</el-radio>
                <el-radio :label="false">群众</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="任职时间">
              <el-date-picker
                v-model="memberForm.joinDate"
                type="date"
                placeholder="选择任职时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="家庭住址">
          <el-input
            v-model="memberForm.address"
            type="textarea"
            :rows="2"
            placeholder="请输入详细住址"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="memberDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMember" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 值班管理对话框 -->
    <el-dialog v-model="dutyDialogVisible" title="值班表管理" width="800px">
      <el-table :data="dutySchedule" stripe>
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="time" label="时间段" width="100" />
        <el-table-column prop="person" label="值班人员" width="100" />
        <el-table-column prop="phone" label="联系电话" width="140" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === '已安排' ? 'success' : 'warning'">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作">
          <template #default="scope">
            <el-button link type="primary" @click="editDuty(scope.row)">编辑</el-button>
            <el-button link type="danger" @click="deleteDuty(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="dutyDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="addDuty">添加值班</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 响应式数据
const searchQuery = reactive({
  name: '',
  position: '',
  status: '',
});

const currentPage = ref(1);
const pageSize = ref(20);
const memberDialogVisible = ref(false);
const dutyDialogVisible = ref(false);
const dialogMode = ref('add');
const saving = ref(false);
const memberFormRef = ref();

// 成员表单
const memberForm = reactive({
  name: '',
  gender: '',
  position: '',
  status: 'active',
  idCard: '',
  phone: '',
  email: '',
  partyMember: false,
  joinDate: '',
  address: '',
});

// 表单验证规则
const memberRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  position: [{ required: true, message: '请选择职务', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  idCard: [{ required: true, message: '请输入身份证号', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
};

// 模拟数据
const committeeMembers = ref([
  {
    id: 1,
    name: '张大明',
    gender: '男',
    position: '村支书',
    phone: '13800138001',
    email: 'zhangdaming@village.gov',
    status: 'active',
    partyMember: true,
    joinDate: '2020-03-15',
    idCard: '110101198001011234',
    address: '智慧村1号楼',
    avatar: '',
  },
  {
    id: 2,
    name: '李红梅',
    gender: '女',
    position: '村主任',
    phone: '13800138002',
    email: 'lihongmei@village.gov',
    status: 'active',
    partyMember: true,
    joinDate: '2020-03-15',
    idCard: '110101198502022345',
    address: '智慧村2号楼',
    avatar: '',
  },
  {
    id: 3,
    name: '王小强',
    gender: '男',
    position: '会计',
    phone: '13800138003',
    email: 'wangxiaoqiang@village.gov',
    status: 'active',
    partyMember: false,
    joinDate: '2021-06-10',
    idCard: '110101199003033456',
    address: '智慧村3号楼',
    avatar: '',
  },
  {
    id: 4,
    name: '刘美丽',
    gender: '女',
    position: '妇女主任',
    phone: '13800138004',
    email: '',
    status: 'vacation',
    partyMember: true,
    joinDate: '2021-09-20',
    idCard: '110101198504044567',
    address: '智慧村4号楼',
    avatar: '',
  },
  {
    id: 5,
    name: '赵刚',
    gender: '男',
    position: '治保主任',
    phone: '13800138005',
    email: 'zhaogang@village.gov',
    status: 'active',
    partyMember: true,
    joinDate: '2022-01-10',
    idCard: '110101198805055678',
    address: '智慧村5号楼',
    avatar: '',
  },
]);

const dutySchedule = ref([
  {
    id: 1,
    date: '2024-12-15',
    time: '上午',
    person: '张大明',
    phone: '13800138001',
    status: '已安排',
  },
  {
    id: 2,
    date: '2024-12-15',
    time: '下午',
    person: '李红梅',
    phone: '13800138002',
    status: '已安排',
  },
  {
    id: 3,
    date: '2024-12-16',
    time: '上午',
    person: '王小强',
    phone: '13800138003',
    status: '待安排',
  },
]);

// 计算属性
const filteredMembers = computed(() => {
  return committeeMembers.value.filter(member => {
    const matchName = !searchQuery.name || member.name.includes(searchQuery.name);
    const matchPosition = !searchQuery.position || member.position === searchQuery.position;
    const matchStatus = !searchQuery.status || member.status === searchQuery.status;
    return matchName && matchPosition && matchStatus;
  });
});

const paginatedMembers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredMembers.value.slice(start, end);
});

const stats = computed(() => {
  const total = committeeMembers.value.length;
  const active = committeeMembers.value.filter(m => m.status === 'active').length;
  const partyMembers = committeeMembers.value.filter(m => m.partyMember).length;
  const onDuty = dutySchedule.value.filter(d => d.status === '已安排').length;

  return { total, active, partyMembers, onDuty };
});

// 方法
const getStatusType = status => {
  const typeMap = {
    active: 'success',
    vacation: 'warning',
    transferred: 'danger',
  };
  return typeMap[status] || 'info';
};

const getStatusText = status => {
  const textMap = {
    active: '在职',
    vacation: '休假',
    transferred: '调离',
  };
  return textMap[status] || '未知';
};

const getPositionType = position => {
  const typeMap = {
    村支书: 'danger',
    村主任: 'primary',
    会计: 'warning',
    妇女主任: 'success',
    治保主任: 'info',
    民兵连长: 'warning',
  };
  return typeMap[position] || 'info';
};

const maskPhone = phone => {
  if (!phone || phone.length < 7) return phone;
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
};

const formatDate = date => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('zh-CN');
};

const handleSearch = () => {
  currentPage.value = 1;
};

const handleSizeChange = size => {
  pageSize.value = size;
  currentPage.value = 1;
};

const handleCurrentChange = page => {
  currentPage.value = page;
};

const showAddDialog = () => {
  dialogMode.value = 'add';
  resetForm();
  memberDialogVisible.value = true;
};

const resetForm = () => {
  Object.assign(memberForm, {
    name: '',
    gender: '',
    position: '',
    status: 'active',
    idCard: '',
    phone: '',
    email: '',
    partyMember: false,
    joinDate: '',
    address: '',
  });
};

const viewMember = member => {
  ElMessage.info(`查看 ${member.name} 的详细信息`);
};

const editMember = member => {
  dialogMode.value = 'edit';
  Object.assign(memberForm, member);
  memberDialogVisible.value = true;
};

const saveMember = async () => {
  if (!memberFormRef.value) return;

  try {
    await memberFormRef.value.validate();
    saving.value = true;

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (dialogMode.value === 'add') {
      const newMember = {
        ...memberForm,
        id: Date.now(),
        avatar: '',
      };
      committeeMembers.value.push(newMember);
      ElMessage.success('添加成员成功');
    } else {
      const index = committeeMembers.value.findIndex(m => m.id === memberForm.id);
      if (index !== -1) {
        Object.assign(committeeMembers.value[index], memberForm);
        ElMessage.success('更新成员信息成功');
      }
    }

    memberDialogVisible.value = false;
  } catch (error) {
    ElMessage.error('保存失败：' + (error.message || '未知错误'));
  } finally {
    saving.value = false;
  }
};

const handleTransfer = async member => {
  try {
    await ElMessageBox.confirm(`确定要将 ${member.name} 调离现任职务吗？`, '确认调离', {
      type: 'warning',
    });

    const index = committeeMembers.value.findIndex(m => m.id === member.id);
    if (index !== -1) {
      committeeMembers.value[index].status = 'transferred';
      ElMessage.success('已标记为调离状态');
    }
  } catch {
    // 用户取消
  }
};

const exportData = () => {
  ElMessage.info('导出功能开发中...');
};

const showDutyDialog = () => {
  dutyDialogVisible.value = true;
};

const addDuty = () => {
  ElMessage.info('添加值班功能开发中...');
};

const editDuty = duty => {
  ElMessage.info('编辑值班功能开发中...');
};

const deleteDuty = async duty => {
  try {
    await ElMessageBox.confirm(`确定要删除 ${duty.date} ${duty.time} 的值班安排吗？`, '确认删除', {
      type: 'warning',
    });

    const index = dutySchedule.value.findIndex(d => d.id === duty.id);
    if (index !== -1) {
      dutySchedule.value.splice(index, 1);
      ElMessage.success('删除值班安排成功');
    }
  } catch {
    // 用户取消
  }
};

onMounted(() => {
  console.log('村委管理模块加载完成');
});
</script>

<style lang="scss" scoped>
.committee-management {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;

  .header-left {
    .page-title {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }

    .page-description {
      margin: 0;
      color: #606266;
      font-size: 14px;
    }
  }

  .header-right {
    display: flex;
    gap: 12px;
  }
}

.search-section {
  margin-bottom: 20px;
}

.members-section {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .card-title {
      font-weight: 600;
      color: #303133;
    }
  }

  .member-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .member-details {
      .member-name {
        font-weight: 500;
        color: #303133;
        margin-bottom: 4px;
      }
    }
  }

  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: center;
  }
}

.stats-section {
  .stat-card {
    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;

      .stat-icon {
        font-size: 2em;
      }

      .stat-info {
        .stat-value {
          font-size: 1.8em;
          font-weight: bold;
          color: #303133;
          line-height: 1;
        }

        .stat-label {
          color: #606266;
          margin-top: 4px;
        }
      }
    }
  }
}

.text-gray {
  color: #909399;
}
</style>
