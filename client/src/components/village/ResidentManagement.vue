<template>
  <div class="resident-management">
    <div class="toolbar">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-input
            v-model="searchQuery"
            placeholder="搜索村民姓名、电话..."
            :size="largeTextMode ? 'large' : 'default'"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="statusFilter"
            placeholder="状态筛选"
            :size="largeTextMode ? 'large' : 'default'"
            clearable
          >
            <el-option label="全部" value="" />
            <el-option label="正常" value="active" />
            <el-option label="注销" value="inactive" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="tagFilter"
            placeholder="特殊群体"
            :size="largeTextMode ? 'large' : 'default'"
            clearable
          >
            <el-option label="全部" value="" />
            <el-option label="老年群体" value="老年群体" />
            <el-option label="低保户" value="低保户" />
            <el-option label="党员" value="党员" />
            <el-option label="残疾人" value="残疾人" />
          </el-select>
        </el-col>
        <el-col :span="10">
          <div class="toolbar-actions">
            <el-button type="primary" @click="showImportDialog">
              <el-icon><Upload /></el-icon>
              批量导入
            </el-button>
            <el-button type="success" @click="exportData">
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
            <el-button @click="$emit('refresh')" :loading="loading">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="resident-list" v-loading="loading">
      <el-table
        :data="filteredResidents"
        stripe
        :size="largeTextMode ? 'large' : 'default'"
        @row-click="handleRowClick"
      >
        <el-table-column type="selection" width="55" />

        <el-table-column prop="name" label="姓名" min-width="100">
          <template #default="{ row }">
            <div class="resident-name">
              <el-avatar :size="32">{{ row.name.charAt(0) }}</el-avatar>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="phone" label="联系电话" min-width="120">
          <template #default="{ row }">
            <span class="phone-number">{{ row.phone }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="idCard" label="身份证号" min-width="150">
          <template #default="{ row }">
            <span class="id-card">{{ maskIdCard(row.idCard) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="address" label="家庭地址" min-width="150" />

        <el-table-column prop="familyMembers" label="家庭成员" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="primary" size="small">{{ row.familyMembers }}人</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="specialTags" label="特殊标签" min-width="150">
          <template #default="{ row }">
            <div class="special-tags">
              <el-tag
                v-for="tag in row.specialTags"
                :key="tag"
                :type="getTagType(tag)"
                size="small"
                class="tag-item"
              >
                {{ tag }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button size="small" @click.stop="$emit('view', row)">
                <el-icon><View /></el-icon>
                查看
              </el-button>
              <el-button size="small" @click.stop="$emit('edit', row)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-dropdown @command="handleCommand" trigger="click">
                <el-button size="small">
                  更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="{ action: 'family', resident: row }">
                      家庭成员
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'health', resident: row }">
                      健康档案
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'benefits', resident: row }">
                      福利记录
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'disable', resident: row }" divided>
                      注销账户
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredTotal"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="importDialogVisible" title="批量导入村民信息" width="600px">
      <div class="import-content">
        <el-upload
          class="upload-demo"
          drag
          :auto-upload="false"
          :on-change="handleFileChange"
          :file-list="fileList"
          accept=".xlsx,.xls,.csv"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip">只能上传xlsx/xls/csv文件，且不超过10MB</div>
          </template>
        </el-upload>

        <div class="template-download">
          <el-link type="primary" @click="downloadTemplate"> 下载导入模板 </el-link>
        </div>
      </div>

      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImport" :loading="importing"> 开始导入 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search,
  Refresh,
  Upload,
  Download,
  View,
  Edit,
  ArrowDown,
  UploadFilled,
} from '@element-plus/icons-vue';

const props = defineProps({
  residents: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['refresh', 'edit', 'view']);

const largeTextMode = ref(false);
const searchQuery = ref('');
const statusFilter = ref('');
const tagFilter = ref('');
const currentPage = ref(1);
const pageSize = ref(20);

// 导入相关
const importDialogVisible = ref(false);
const importing = ref(false);
const fileList = ref([]);

const filteredResidents = computed(() => {
  let filtered = props.residents;

  // 搜索筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      resident =>
        resident.name.toLowerCase().includes(query) ||
        resident.phone.includes(query) ||
        resident.address.toLowerCase().includes(query)
    );
  }

  // 状态筛选
  if (statusFilter.value) {
    filtered = filtered.filter(resident => resident.status === statusFilter.value);
  }

  // 标签筛选
  if (tagFilter.value) {
    filtered = filtered.filter(resident => resident.specialTags.includes(tagFilter.value));
  }

  // 分页
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filtered.slice(start, end);
});

const filteredTotal = computed(() => {
  let filtered = props.residents;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      resident =>
        resident.name.toLowerCase().includes(query) ||
        resident.phone.includes(query) ||
        resident.address.toLowerCase().includes(query)
    );
  }

  if (statusFilter.value) {
    filtered = filtered.filter(resident => resident.status === statusFilter.value);
  }

  if (tagFilter.value) {
    filtered = filtered.filter(resident => resident.specialTags.includes(tagFilter.value));
  }

  return filtered.length;
});

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

const maskIdCard = idCard => {
  if (!idCard || idCard.length < 8) return idCard;
  return idCard.substring(0, 6) + '********' + idCard.substring(idCard.length - 2);
};

const handleRowClick = row => {
  emit('view', row);
};

const handleCommand = ({ action, resident }) => {
  switch (action) {
    case 'family':
      ElMessage.info(`查看 ${resident.name} 的家庭成员`);
      break;
    case 'health':
      ElMessage.info(`查看 ${resident.name} 的健康档案`);
      break;
    case 'benefits':
      ElMessage.info(`查看 ${resident.name} 的福利记录`);
      break;
    case 'disable':
      handleDisableResident(resident);
      break;
  }
};

const handleDisableResident = resident => {
  ElMessageBox.confirm(`确定要注销村民 "${resident.name}" 吗？此操作不可恢复。`, '确认注销', {
    type: 'warning',
    confirmButtonText: '确定注销',
    cancelButtonText: '取消',
  })
    .then(() => {
      ElMessage.success('账户已注销');
    })
    .catch(() => {
      // 用户取消
    });
};

const showImportDialog = () => {
  importDialogVisible.value = true;
  fileList.value = [];
};

const handleFileChange = file => {
  fileList.value = [file];
};

const handleImport = async () => {
  if (fileList.value.length === 0) {
    ElMessage.warning('请先选择要导入的文件');
    return;
  }

  importing.value = true;
  try {
    // 模拟导入过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    ElMessage.success('数据导入成功');
    importDialogVisible.value = false;
    emit('refresh');
  } catch (error) {
    ElMessage.error('导入失败，请检查文件格式');
  } finally {
    importing.value = false;
  }
};

const exportData = () => {
  // 模拟导出功能
  ElMessage.success('数据导出中...');
  setTimeout(() => {
    ElMessage.success('数据导出成功');
  }, 1500);
};

const downloadTemplate = () => {
  // 模拟下载模板
  ElMessage.success('模板下载中...');
  setTimeout(() => {
    ElMessage.success('模板下载成功');
  }, 1000);
};

const handleSizeChange = size => {
  pageSize.value = size;
  currentPage.value = 1;
};

const handleCurrentChange = page => {
  currentPage.value = page;
};
</script>

<style scoped>
.resident-management {
  margin: -20px;
}

.toolbar {
  padding: 20px;
  background-color: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  float: right;
}

.resident-list {
  padding: 20px;
}

.resident-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phone-number {
  font-family: 'Courier New', monospace;
}

.id-card {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.special-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-item {
  margin: 0;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: right;
}

.import-content {
  text-align: center;
}

.template-download {
  margin-top: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .toolbar .el-col {
    margin-bottom: 12px;
  }

  .toolbar-actions {
    float: none;
    justify-content: center;
  }

  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
