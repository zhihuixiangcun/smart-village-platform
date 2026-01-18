<template>
  <div class="members-container">
    <!-- 搜索和操作栏 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="姓名">
          <el-input
            v-model="searchForm.name"
            placeholder="请输入姓名"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="职务">
          <el-select v-model="searchForm.position" placeholder="请选择职务" clearable>
            <el-option
              v-for="pos in positionOptions"
              :key="pos.value"
              :label="pos.label"
              :value="pos.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="在职" value="active" />
            <el-option label="调任" value="transferred" />
            <el-option label="离职" value="resigned" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <div class="action-bar">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          添加人员
        </el-button>
        <el-button @click="handleImport">
          <el-icon><Upload /></el-icon>
          批量导入
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </div>
    </el-card>

    <!-- 人员列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="committeeStore.loading"
        :data="filteredMembers"
        style="width: 100%"
        :default-sort="{ prop: 'createdAt', order: 'descending' }"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="姓名" width="120" sortable />
        <el-table-column prop="position" label="职务" width="120" sortable>
          <template #default="scope">
            <el-tag :type="getPositionTagType(scope.row.position)">
              {{ scope.row.position }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="idCard" label="身份证号" width="180">
          <template #default="scope">
            {{ maskIdCard(scope.row.idCard) }}
          </template>
        </el-table-column>
        <el-table-column prop="partyMember" label="政治面貌" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.partyMember" type="danger">党员</el-tag>
            <el-tag v-else type="info">群众</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="joinDate" label="任职时间" width="120" sortable>
          <template #default="scope">
            {{ formatDate(scope.row.joinDate) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="handleView(scope.row)"> 查看 </el-button>
            <el-button type="warning" size="small" @click="handleEdit(scope.row)"> 编辑 </el-button>
            <el-dropdown @command="command => handleAction(command, scope.row)">
              <el-button type="info" size="small">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="transfer">调任</el-dropdown-item>
                  <el-dropdown-item command="resign">离职</el-dropdown-item>
                  <el-dropdown-item command="permissions">权限设置</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 添加/编辑人员对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="isEdit ? '编辑人员' : '添加人员'"
      width="600px"
      :fullscreen="isMobile"
    >
      <el-form ref="memberFormRef" :model="memberForm" :rules="memberRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="memberForm.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="memberForm.gender">
                <el-radio label="男">男</el-radio>
                <el-radio label="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="职务" prop="position">
              <el-select v-model="memberForm.position" placeholder="请选择职务">
                <el-option
                  v-for="pos in positionOptions"
                  :key="pos.value"
                  :label="pos.label"
                  :value="pos.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="memberForm.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="身份证号" prop="idCard">
              <el-input v-model="memberForm.idCard" placeholder="请输入身份证号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="政治面貌" prop="partyMember">
              <el-radio-group v-model="memberForm.partyMember">
                <el-radio :label="true">党员</el-radio>
                <el-radio :label="false">群众</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="入职时间" prop="joinDate">
              <el-date-picker
                v-model="memberForm.joinDate"
                type="date"
                placeholder="选择日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学历" prop="education">
              <el-select v-model="memberForm.education" placeholder="请选择学历">
                <el-option label="初中" value="junior" />
                <el-option label="高中" value="high" />
                <el-option label="大专" value="college" />
                <el-option label="本科" value="bachelor" />
                <el-option label="研究生" value="master" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="家庭住址" prop="address">
          <el-input
            v-model="memberForm.address"
            type="textarea"
            :rows="2"
            placeholder="请输入家庭住址"
          />
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="memberForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? '更新' : '添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 人员详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="人员详情" width="800px" :fullscreen="isMobile">
      <div class="detail-content" v-if="currentMember">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">{{ currentMember.name }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ currentMember.gender }}</el-descriptions-item>
          <el-descriptions-item label="职务">
            <el-tag :type="getPositionTagType(currentMember.position)">
              {{ currentMember.position }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentMember.phone }}</el-descriptions-item>
          <el-descriptions-item label="身份证号">{{
            maskIdCard(currentMember.idCard)
          }}</el-descriptions-item>
          <el-descriptions-item label="政治面貌">
            <el-tag v-if="currentMember.partyMember" type="danger">党员</el-tag>
            <el-tag v-else type="info">群众</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(currentMember.status)">
              {{ getStatusText(currentMember.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="任职时间">{{
            formatDate(currentMember.joinDate)
          }}</el-descriptions-item>
          <el-descriptions-item label="学历">{{
            getEducationText(currentMember.education)
          }}</el-descriptions-item>
          <el-descriptions-item label="家庭住址" :span="2">{{
            currentMember.address
          }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{
            currentMember.remark || '暂无'
          }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-actions" v-if="!isMobile">
          <el-button type="primary" @click="handleEdit(currentMember)">编辑信息</el-button>
          <el-button type="warning" @click="handleTransfer(currentMember)">申请调任</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 调任对话框 -->
    <el-dialog v-model="showTransferDialog" title="人员调任" width="500px" :fullscreen="isMobile">
      <el-form
        ref="transferFormRef"
        :model="transferForm"
        :rules="transferRules"
        label-width="100px"
      >
        <el-form-item label="调任类型" prop="type">
          <el-radio-group v-model="transferForm.type">
            <el-radio label="promotion">升职</el-radio>
            <el-radio label="demotion">降职</el-radio>
            <el-radio label="lateral">平调</el-radio>
            <el-radio label="resign">离职</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="新职务" prop="newPosition" v-if="transferForm.type !== 'resign'">
          <el-select v-model="transferForm.newPosition" placeholder="请选择新职务">
            <el-option
              v-for="pos in positionOptions"
              :key="pos.value"
              :label="pos.label"
              :value="pos.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="生效日期" prop="effectiveDate">
          <el-date-picker
            v-model="transferForm.effectiveDate"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="调任原因" prop="reason">
          <el-input
            v-model="transferForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入调任原因"
          />
        </el-form-item>

        <el-form-item label="附件" prop="attachments">
          <el-upload
            class="upload-demo"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :file-list="fileList"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">支持jpg/png/pdf文件，且不超过500kb</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showTransferDialog = false">取消</el-button>
        <el-button type="primary" @click="handleTransferSubmit" :loading="submitting">
          提交申请
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量导入文件上传 -->
    <input
      ref="fileInput"
      type="file"
      accept=".xlsx,.xls"
      style="display: none"
      @change="handleFileImport"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useCommitteeStore } from '@/stores/villageCommittee/committeeStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search,
  Refresh,
  Plus,
  Upload,
  Download,
  ArrowDown,
  UploadFilled,
} from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const committeeStore = useCommitteeStore();

// 响应式数据
const searchForm = ref({
  name: '',
  position: '',
  status: '',
});

const showAddDialog = ref(false);
const showDetailDialog = ref(false);
const showTransferDialog = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const isMobile = ref(false);

const memberFormRef = ref();
const transferFormRef = ref();
const fileInput = ref();

const currentMember = ref(null);
const selectedMembers = ref([]);
const fileList = ref([]);

const pagination = ref({
  page: 1,
  size: 20,
  total: 0,
});

const memberForm = ref({
  name: '',
  gender: '男',
  position: '',
  phone: '',
  idCard: '',
  partyMember: false,
  joinDate: '',
  education: '',
  address: '',
  remark: '',
});

const transferForm = ref({
  type: '',
  newPosition: '',
  effectiveDate: '',
  reason: '',
  attachments: [],
});

// 职务选项
const positionOptions = [
  { label: '村支书', value: 'secretary' },
  { label: '村主任', value: 'director' },
  { label: '副主任', value: 'deputy_director' },
  { label: '会计', value: 'accountant' },
  { label: '妇联主任', value: 'women_director' },
  { label: '治保主任', value: 'security_director' },
  { label: '民兵连长', value: 'militia_commander' },
  { label: '文书', value: 'clerk' },
  { label: '委员', value: 'member' },
];

// 表单验证规则
const memberRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 10, message: '长度在 2 到 10 个字符', trigger: 'blur' },
  ],
  position: [{ required: true, message: '请选择职务', trigger: 'change' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' },
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dXx]$/, message: '请输入正确的身份证号', trigger: 'blur' },
  ],
  joinDate: [{ required: true, message: '请选择入职时间', trigger: 'change' }],
};

const transferRules = {
  type: [{ required: true, message: '请选择调任类型', trigger: 'change' }],
  newPosition: [{ required: true, message: '请选择新职务', trigger: 'change' }],
  effectiveDate: [{ required: true, message: '请选择生效日期', trigger: 'change' }],
  reason: [
    { required: true, message: '请输入调任原因', trigger: 'blur' },
    { min: 10, max: 500, message: '长度在 10 到 500 个字符', trigger: 'blur' },
  ],
};

// 计算属性
const filteredMembers = computed(() => {
  let result = committeeStore.members;

  if (searchForm.value.name) {
    result = result.filter(m => m.name.includes(searchForm.value.name));
  }

  if (searchForm.value.position) {
    result = result.filter(m => m.position === searchForm.value.position);
  }

  if (searchForm.value.status) {
    result = result.filter(m => m.status === searchForm.value.status);
  }

  pagination.value.total = result.length;
  const start = (pagination.value.page - 1) * pagination.value.size;
  const end = start + pagination.value.size;
  return result.slice(start, end);
});

// 方法
const handleSearch = () => {
  pagination.value.page = 1;
};

const handleReset = () => {
  searchForm.value = {
    name: '',
    position: '',
    status: '',
  };
  pagination.value.page = 1;
};

const handleSelectionChange = selection => {
  selectedMembers.value = selection;
};

const handleSizeChange = size => {
  pagination.value.size = size;
  pagination.value.page = 1;
};

const handleCurrentChange = page => {
  pagination.value.page = page;
};

const handleView = row => {
  currentMember.value = row;
  showDetailDialog.value = true;
};

const handleEdit = row => {
  isEdit.value = true;
  memberForm.value = { ...row };
  showAddDialog.value = true;
  showDetailDialog.value = false;
};

const handleAction = async (command, row) => {
  currentMember.value = row;

  switch (command) {
    case 'transfer':
      handleTransfer(row);
      break;
    case 'resign':
      handleResign(row);
      break;
    case 'permissions':
      handlePermissions(row);
      break;
    case 'delete':
      handleDelete(row);
      break;
  }
};

const handleTransfer = row => {
  currentMember.value = row;
  transferForm.value = {
    type: '',
    newPosition: '',
    effectiveDate: dayjs().format('YYYY-MM-DD'),
    reason: '',
    attachments: [],
  };
  showTransferDialog.value = true;
};

const handleResign = row => {
  ElMessageBox.confirm(`确定要将 ${row.name} 办理离职吗？`, '离职确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await committeeStore.transferMember(row.id, {
        type: 'resign',
        effectiveDate: dayjs().format('YYYY-MM-DD'),
        reason: '个人原因申请离职',
      });
      ElMessage.success('离职手续已办理');
      await committeeStore.fetchMembers();
    } catch (error) {
      ElMessage.error('操作失败');
    }
  });
};

const handlePermissions = row => {
  ElMessage.info('权限管理功能开发中...');
};

const handleDelete = row => {
  ElMessageBox.confirm(`确定要删除 ${row.name} 的信息吗？此操作不可恢复！`, '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'error',
  }).then(async () => {
    try {
      await committeeStore.deleteMember(row.id);
      ElMessage.success('删除成功');
      await committeeStore.fetchMembers();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  });
};

const handleSubmit = async () => {
  if (!memberFormRef.value) return;

  await memberFormRef.value.validate(async valid => {
    if (valid) {
      submitting.value = true;
      try {
        if (isEdit.value) {
          await committeeStore.updateMember(currentMember.value.id, memberForm.value);
          ElMessage.success('更新成功');
        } else {
          await committeeStore.createMember(memberForm.value);
          ElMessage.success('添加成功');
        }
        showAddDialog.value = false;
        await committeeStore.fetchMembers();
      } catch (error) {
        ElMessage.error('操作失败');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const handleTransferSubmit = async () => {
  if (!transferFormRef.value) return;

  await transferFormRef.value.validate(async valid => {
    if (valid) {
      submitting.value = true;
      try {
        const formData = new FormData();
        Object.keys(transferForm.value).forEach(key => {
          if (key !== 'attachments') {
            formData.append(key, transferForm.value[key]);
          }
        });

        fileList.value.forEach(file => {
          formData.append('attachments', file.raw);
        });

        await committeeStore.transferMember(currentMember.value.id, formData);
        ElMessage.success('调任申请已提交');
        showTransferDialog.value = false;
        await committeeStore.fetchMembers();
      } catch (error) {
        ElMessage.error('提交失败');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const handleFileChange = (file, fileList) => {
  fileList.value = fileList;
};

const handleImport = () => {
  fileInput.value.click();
};

const handleFileImport = async event => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    await committeeStore.importMembers(file);
    ElMessage.success('导入成功');
    await committeeStore.fetchMembers();
  } catch (error) {
    ElMessage.error('导入失败');
  }

  event.target.value = '';
};

const handleExport = async () => {
  try {
    await committeeStore.exportMembers();
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  }
};

// 辅助函数
const maskIdCard = idCard => {
  if (!idCard) return '';
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
};

const formatDate = date => {
  return date ? dayjs(date).format('YYYY-MM-DD') : '';
};

const getPositionTagType = position => {
  const typeMap = {
    secretary: 'danger',
    director: 'warning',
    deputy_director: 'info',
    accountant: 'success',
  };
  return typeMap[position] || '';
};

const getStatusTagType = status => {
  const typeMap = {
    active: 'success',
    transferred: 'warning',
    resigned: 'info',
  };
  return typeMap[status] || '';
};

const getStatusText = status => {
  const textMap = {
    active: '在职',
    transferred: '调任',
    resigned: '离职',
  };
  return textMap[status] || status;
};

const getEducationText = education => {
  const textMap = {
    junior: '初中',
    high: '高中',
    college: '大专',
    bachelor: '本科',
    master: '研究生',
  };
  return textMap[education] || '';
};

// 生命周期
onMounted(async () => {
  // 检测移动端
  isMobile.value = window.innerWidth < 768;

  // 加载数据
  try {
    await committeeStore.fetchMembers();
  } catch (error) {
    console.error('加载数据失败:', error);
  }
});
</script>

<style lang="scss" scoped>
.members-container {
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eaf6 100%);
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 10px;
  }
}

.search-card {
  margin-bottom: 20px;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(99,102,241,0.1);
  box-shadow:0 4px 20px rgba(99,102,241,0.08);

  .search-form {
    margin-bottom: 20px;
  }

  .action-bar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  :deep(.el-button) {
    border-radius: 8px;
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99,102,241,0.2);
    }
  }
}

.table-card {
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(99,102,241,0.1);
  box-shadow: 0 4px 20px rgba(99,102,241,0.08);

  :deep(.el-table) {
    border-radius: 8px;
    overflow: hidden;

    th {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      font-weight: 600;
      border: none;

      .cell {
        color: rgba(255,255,255,0.9);
      }
    }

    tr {
      transition: all 0.3s ease;

      &:hover {
        td {
          background: rgba(99, 102, 241, 0.03);
        }
      }
    }

    &.el-table__body tr:hover > td {
      background: rgba(99, 102, 241, 0.03) !important;
    }

    &--striped .el-table__body tr.el-table__row--striped td {
      background: rgba(99, 102, 241, 0.02);
    }

    td {
      border-bottom: 1px solid rgba(99, 102,241,0.08);
      padding: 16px 12px;
      font-size: 14px;
    }

    .el-tag {
      border-radius: 6px;
      padding: 4px 12px;
      font-weight: 500;
    }
  }

  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
    padding: 16px;

    :deep(.el-pagination) {
      .el-pager li {
        &.active {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border-radius: 6px;
          font-weight: 600;
        }
      }
    }
  }
}

.detail-content {
  .detail-actions {
    margin-top: 20px;
    text-align: center;

    .el-button {
      margin: 0 10px;
      border-radius: 8px;
      font-weight: 500;
    }
  }

  :deep(.el-descriptions) {
    .el-descriptions__label {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      font-weight: 500;
      padding: 12px 16px;
      border-radius: 6px;
    }
  }
}

// 装饰性渐变
.members-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.02) 0%, rgba(139, 92, 246, 0.03) 0%),
              linear-gradient(45deg, rgba(139, 92, 246, 0.03) 0%, rgba(139, 92, 246, 0.05) 100%);
  background-size: 400px 400px;
  animation: gradient-pulse 20s linear infinite;
  pointer-events: none;
  z-index: -1;
}

@keyframes gradient-pulse {
  0%, 100% {
    background-position: 0% 50%;
    opacity: 0.3;
  }
  50% {
    background-position: 100% 100%;
    opacity: 0.6;
  }
}

// 响应式调整
@media (max-width: 768px) {
  .search-form {
    .el-form-item {
      margin-right: 0;
      width: 100%;

      .el-input,
      .el-select {
        width: 100%;
      }
    }
  }

  .action-bar {
    .el-button {
      flex: 1;
      margin: 5px 0;
    }
  }

  .stats-row {
    .el-col {
      margin-bottom: 10px;
    }
  }

  .el-table {
    font-size: 12px;

    .el-table__cell {
      padding: 8px 5px;
    }
  }

  .pagination-container {
    justify-content: center;

    .el-pagination {
      flex-wrap: wrap;
      justify-content: center;
    }
  }

  .detail-actions {
    .el-button {
      display: block;
      width: 100%;
      margin-left: 0;
    }
  }
}
</style>
