<template>
  <div class="users-page">
    <header class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" size="small" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        添加用户
      </el-button>
    </header>

    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索用户名或手机号"
        :prefix-icon="Search"
        clearable
      />
    </div>

    <div class="filter-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.value"
        class="filter-tab"
        :class="{ active: activeTab === tab.value }"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
        <el-badge v-if="tab.count > 0" :value="tab.count" class="badge" />
      </div>
    </div>

    <main class="users-content">
      <div class="users-list">
        <div
          v-for="user in filteredUsers"
          :key="user.id"
          class="user-card"
          @click="viewDetail(user)"
        >
          <div class="user-header">
            <div class="user-avatar">
              <el-icon :size="28"><User /></el-icon>
            </div>
            <div class="user-info">
              <h4>{{ user.name }}</h4>
              <p>{{ user.phone }}</p>
            </div>
            <el-tag :type="getRoleType(user.role)" size="small">
              {{ user.roleText }}
            </el-tag>
          </div>

          <div class="user-details">
            <div class="detail-item">
              <el-icon><Location /></el-icon>
              <span>{{ user.village }}</span>
            </div>
            <div class="detail-item">
              <el-icon><Clock /></el-icon>
              <span>{{ user.lastLogin }}</span>
            </div>
            <div class="detail-item">
              <el-tag :type="getStatusType(user.status)" size="small">
                {{ user.statusText }}
              </el-tag>
            </div>
          </div>

          <div class="user-actions">
            <el-button size="small" @click.stop="handleEdit(user)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button
              size="small"
              :type="user.status === 'active' ? 'danger' : 'success'"
              @click.stop="handleToggleStatus(user)"
            >
              {{ user.status === 'active' ? '禁用' : '启用' }}
            </el-button>
          </div>
        </div>
      </div>
    </main>

    <el-dialog
      v-model="showEditDialog"
      :title="dialogTitle"
      width="90%"
      :close-on-click-modal="false"
    >
      <el-form :model="userForm" label-width="80px">
        <el-form-item label="姓名">
          <el-input v-model="userForm.name" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="userForm.phone" maxlength="11" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.role" placeholder="选择角色">
            <el-option label="村民" value="resident" />
            <el-option label="村干部" value="village_cadre" />
            <el-option label="乡镇干部" value="township_official" />
            <el-option label="采购商" value="purchaser" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属村庄">
          <el-select v-model="userForm.villageId" placeholder="选择村庄">
            <el-option label="智慧乡村示范村" value="v001" />
            <el-option label="绿色生态村" value="v002" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import {
  Plus,
  Search,
  User,
  Location,
  Clock,
  Edit
} from '@element-plus/icons-vue';

const searchKeyword = ref('');
const activeTab = ref('all');
const showEditDialog = ref(false);
const dialogTitle = ref('添加用户');

const tabs = [
  { label: '全部', value: 'all', count: 0 },
  { label: '村民', value: 'resident', count: 1234 },
  { label: '村干部', value: 'village_cadre', count: 45 },
  { label: '乡镇', value: 'township_official', count: 12 },
  { label: '采购商', value: 'purchaser', count: 67 }
];

const users = ref([
  {
    id: 1,
    name: '张三',
    phone: '138****1234',
    role: 'resident',
    roleText: '村民',
    village: '智慧乡村示范村',
    lastLogin: '2小时前',
    status: 'active',
    statusText: '正常'
  },
  {
    id: 2,
    name: '李四',
    phone: '139****5678',
    role: 'village_cadre',
    roleText: '村干部',
    village: '绿色生态村',
    lastLogin: '1天前',
    status: 'active',
    statusText: '正常'
  },
  {
    id: 3,
    name: '王五',
    phone: '136****9012',
    role: 'township_official',
    roleText: '乡镇干部',
    village: '乡镇政府',
    lastLogin: '3小时前',
    status: 'inactive',
    statusText: '已禁用'
  }
]);

const userForm = ref({
  name: '',
  phone: '',
  role: '',
  villageId: ''
});

const filteredUsers = computed(() => {
  let result = users.value;

  if (activeTab.value !== 'all') {
    result = result.filter(u => u.role === activeTab.value);
  }

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(u =>
      u.name.includes(keyword) ||
      u.phone.includes(keyword)
    );
  }

  return result;
});

const handleAdd = () => {
  dialogTitle.value = '添加用户';
  userForm.value = {
    name: '',
    phone: '',
    role: '',
    villageId: ''
  };
  showEditDialog.value = true;
};

const handleEdit = (user) => {
  dialogTitle.value = '编辑用户';
  userForm.value = { ...user };
  showEditDialog.value = true;
};

const handleSave = () => {
  console.log('Save user:', userForm.value);
  ElMessage.success('保存成功');
  showEditDialog.value = false;
};

const handleToggleStatus = (user) => {
  const action = user.status === 'active' ? '禁用' : '启用';
  ElMessageBox.confirm(`确定要${action}用户${user.name}吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    console.log('Toggle status:', user);
    ElMessage.success(`${action}成功`);
  }).catch(() => {
    // User cancelled
  });
};

const viewDetail = (user) => {
  console.log('View detail:', user);
};

const getRoleType = (role) => {
  const typeMap = {
    resident: 'success',
    village_cadre: 'warning',
    township_official: 'primary',
    purchaser: 'danger',
    admin: 'info'
  };
  return typeMap[role] || 'info';
};

const getStatusType = (status) => {
  return status === 'active' ? 'success' : 'info';
};
</script>

<style scoped lang="scss">
.users-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 80px;
}

.page-header {
  background: white;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e4e7ed;

  h2 {
    margin: 0;
    font-size: 18px;
    color: #303133;
  }
}

.search-bar {
  padding: 16px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  padding: 0 16px 16px;
  overflow-x: auto;
}

.filter-tab {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px;
  background: white;
  border-radius: 8px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    background: #409EFF;
    color: white;
  }
}

.users-content {
  padding: 0 16px;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;

  &:active {
    background: #f5f7fa;
  }
}

.user-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409EFF 0%, #67C23A 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.user-info {
  flex: 1;

  h4 {
    margin: 0 0 4px;
    font-size: 16px;
    color: #303133;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #909399;
  }
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.user-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f5f7fa;
}
</style>
