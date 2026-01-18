<template>
  <div class="residents-page">
    <header class="page-header">
      <h2>村民管理</h2>
      <el-button type="primary" size="small" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        添加村民
      </el-button>
    </header>

    <div class="search-bar">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索村民姓名或手机号"
        :prefix-icon="Search"
        clearable
        @input="handleSearch"
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
        <el-badge v-if="tab.count > 0" :value="tab.count" />
      </div>
    </div>

    <main class="residents-content">
      <div class="residents-list">
        <div
          v-for="resident in filteredResidents"
          :key="resident.id"
          class="resident-card"
          @click="viewDetail(resident)"
        >
          <div class="resident-header">
            <div class="resident-avatar">
              <el-icon :size="32"><User /></el-icon>
            </div>
            <div class="resident-info">
              <h4>{{ resident.name }}</h4>
              <p>{{ resident.phone }}</p>
            </div>
            <el-tag :type="getStatusType(resident.status)" size="small">
              {{ resident.statusText }}
            </el-tag>
          </div>

          <div class="resident-details">
            <div class="detail-item">
              <el-icon><HomeFilled /></el-icon>
              <span>{{ resident.address }}</span>
            </div>
            <div class="detail-item" v-if="resident.familySize">
              <el-icon><UserFilled /></el-icon>
              <span>家庭{{ resident.familySize }}人</span>
            </div>
            <div class="detail-item" v-if="resident.specialTag">
              <el-tag size="small" :type="getSpecialTagType(resident.specialTag)">
                {{ resident.specialTag }}
              </el-tag>
            </div>
          </div>

          <div class="resident-actions">
            <el-button size="small" text @click.stop="handleCall(resident)">
              <el-icon><Phone /></el-icon>
              联系
            </el-button>
            <el-button size="small" text @click.stop="handleEdit(resident)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
          </div>
        </div>
      </div>

      <div v-if="filteredResidents.length === 0" class="empty-state">
        <el-icon :size="64" color="#c0c4cc"><User /></el-icon>
        <p>暂无村民数据</p>
      </div>
    </main>

    <el-dialog
      v-model="showAddDialog"
      :title="dialogTitle"
      width="90%"
      :close-on-click-modal="false"
    >
      <el-form :model="residentForm" label-width="80px">
        <el-form-item label="姓名">
          <el-input v-model="residentForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="residentForm.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="住址">
          <el-input v-model="residentForm.address" placeholder="请输入住址" />
        </el-form-item>
        <el-form-item label="家庭人数">
          <el-input-number v-model="residentForm.familySize" :min="1" :max="20" />
        </el-form-item>
        <el-form-item label="特殊标签">
          <el-select v-model="residentForm.specialTag" placeholder="选择标签">
            <el-option label="低保户" value="低保户" />
            <el-option label="独居老人" value="独居老人" />
            <el-option label="残疾人" value="残疾人" />
            <el-option label="无" value="" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  Plus,
  Search,
  User,
  UserFilled,
  HomeFilled,
  Phone,
  Edit
} from '@element-plus/icons-vue';

const searchKeyword = ref('');
const activeTab = ref('all');
const showAddDialog = ref(false);
const dialogTitle = ref('添加村民');

const tabs = [
  { label: '全部', value: 'all', count: 156 },
  { label: '正常', value: 'normal', count: 142 },
  { label: '特殊', value: 'special', count: 14 }
];

const residents = ref([
  {
    id: 1,
    name: '张三',
    phone: '138****1234',
    address: '智慧乡村示范村1组',
    familySize: 4,
    specialTag: '低保户',
    status: 'normal',
    statusText: '正常居住'
  },
  {
    id: 2,
    name: '李四',
    phone: '139****5678',
    address: '智慧乡村示范村2组',
    familySize: 2,
    specialTag: '独居老人',
    status: 'special',
    statusText: '需关注'
  },
  {
    id: 3,
    name: '王五',
    phone: '136****9012',
    address: '智慧乡村示范村3组',
    familySize: 5,
    specialTag: '',
    status: 'normal',
    statusText: '正常居住'
  }
]);

const residentForm = ref({
  name: '',
  phone: '',
  address: '',
  familySize: 1,
  specialTag: ''
});

const filteredResidents = computed(() => {
  let result = residents.value;

  if (activeTab.value !== 'all') {
    result = result.filter(r => r.status === activeTab.value);
  }

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(r =>
      r.name.includes(keyword) ||
      r.phone.includes(keyword)
    );
  }

  return result;
});

const handleSearch = () => {
  // Search is handled by computed property
};

const handleAdd = () => {
  dialogTitle.value = '添加村民';
  residentForm.value = {
    name: '',
    phone: '',
    address: '',
    familySize: 1,
    specialTag: ''
  };
  showAddDialog.value = true;
};

const handleEdit = (resident) => {
  dialogTitle.value = '编辑村民';
  residentForm.value = { ...resident };
  showAddDialog.value = true;
};

const handleSave = () => {
  console.log('Save resident:', residentForm.value);
  showAddDialog.value = false;
};

const viewDetail = (resident) => {
  console.log('View detail:', resident);
};

const handleCall = (resident) => {
  console.log('Call resident:', resident);
};

const getStatusType = (status) => {
  return status === 'special' ? 'warning' : 'success';
};

const getSpecialTagType = (tag) => {
  const typeMap = {
    '低保户': 'danger',
    '独居老人': 'warning',
    '残疾人': 'info'
  };
  return typeMap[tag] || '';
};
</script>

<style scoped lang="scss">
.residents-page {
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
}

.filter-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  background: white;
  border-radius: 8px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    background: #409EFF;
    color: white;
  }
}

.residents-content {
  padding: 0 16px;
}

.residents-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resident-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;

  &:active {
    background: #f5f7fa;
  }
}

.resident-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.resident-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409EFF 0%, #67C23A 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.resident-info {
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

.resident-details {
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

.resident-actions {
  display: flex;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid #f5f7fa;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #909399;

  p {
    margin: 16px 0 0;
    font-size: 14px;
  }
}
</style>
