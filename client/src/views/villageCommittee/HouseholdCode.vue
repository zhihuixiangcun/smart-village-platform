<template>
  <div class="household-code-container">
    <!-- 搜索和操作栏 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="户主姓名">
          <el-input
            v-model="searchForm.householder"
            placeholder="请输入户主姓名"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="家庭编号">
          <el-input
            v-model="searchForm.code"
            placeholder="请输入家庭编号"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="家庭类型">
          <el-select v-model="searchForm.category" placeholder="请选择类型" clearable>
            <el-option label="普通住户" value="normal" />
            <el-option label="低保户" value="lowIncome" />
            <el-option label="独生子女户" value="singleChild" />
            <el-option label="独居老人" value="elderly" />
            <el-option label="残疾家庭" value="disabled" />
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
          添加住户
        </el-button>
        <el-button type="success" @click="showBatchDialog = true">
          <el-icon><Operation /></el-icon>
          批量生成
        </el-button>
        <el-button @click="handleImport">
          <el-icon><Upload /></el-icon>
          导入数据
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
        <el-button type="warning" @click="showPrintDialog = true">
          <el-icon><Printer /></el-icon>
          打印二维码
        </el-button>
      </div>
    </el-card>

    <!-- 统计信息 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="12" :sm="8" :md="6" v-for="stat in householdStats" :key="stat.key">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <el-icon class="stat-icon" :size="30" :color="stat.color">
              <component :is="stat.icon" />
            </el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 住户列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="committeeStore.loading"
        :data="filteredHouseholds"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="code" label="家庭编号" width="150">
          <template #default="scope">
            <el-tag type="primary">{{ scope.row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="householder" label="户主" width="100" />
        <el-table-column prop="address" label="家庭住址" min-width="200" />
        <el-table-column prop="population" label="人口" width="80" sortable>
          <template #default="scope">
            <el-badge :value="scope.row.population" :max="99" type="primary" />
          </template>
        </el-table-column>
        <el-table-column prop="category" label="家庭类型" width="120">
          <template #default="scope">
            <el-tag :type="getCategoryTagType(scope.row.category)">
              {{ getCategoryText(scope.row.category) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="qrCode" label="二维码" width="100">
          <template #default="scope">
            <el-image
              :src="scope.row.qrCode"
              :preview-src-list="[scope.row.qrCode]"
              fit="cover"
              style="width: 40px; height: 40px; cursor: pointer"
            />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastUpdate" label="最后更新" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.lastUpdate) }}
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
                  <el-dropdown-item command="qrcode">查看二维码</el-dropdown-item>
                  <el-dropdown-item command="members">家庭成员</el-dropdown-item>
                  <el-dropdown-item command="history">更新历史</el-dropdown-item>
                  <el-dropdown-item command="print" divided>打印二维码</el-dropdown-item>
                  <el-dropdown-item command="delete">删除</el-dropdown-item>
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

    <!-- 添加/编辑住户对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="isEdit ? '编辑住户信息' : '添加住户'"
      width="700px"
      :fullscreen="isMobile"
    >
      <el-form
        ref="householdFormRef"
        :model="householdForm"
        :rules="householdRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="户主姓名" prop="householder">
              <el-input v-model="householdForm.householder" placeholder="请输入户主姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身份证号" prop="idCard">
              <el-input v-model="householdForm.idCard" placeholder="请输入身份证号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="householdForm.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="家庭类型" prop="category">
              <el-select v-model="householdForm.category" placeholder="请选择家庭类型">
                <el-option label="普通住户" value="normal" />
                <el-option label="低保户" value="lowIncome" />
                <el-option label="独生子女户" value="singleChild" />
                <el-option label="独居老人" value="elderly" />
                <el-option label="残疾家庭" value="disabled" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="家庭住址" prop="address">
          <el-input v-model="householdForm.address" placeholder="请输入详细住址" />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="家庭人口" prop="population">
              <el-input-number
                v-model="householdForm.population"
                :min="1"
                :max="20"
                controls-position="right"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="住房面积" prop="houseArea">
              <el-input-number v-model="householdForm.houseArea" :min="0" controls-position="right">
                <template #append>m²</template>
              </el-input-number>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="家庭备注" prop="remark">
          <el-input
            v-model="householdForm.remark"
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

    <!-- 住户详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="住户详情" width="900px" :fullscreen="isMobile">
      <div class="detail-content" v-if="currentHousehold">
        <!-- 基本信息 -->
        <el-descriptions title="基本信息" :column="2" border>
          <el-descriptions-item label="家庭编号">{{ currentHousehold.code }}</el-descriptions-item>
          <el-descriptions-item label="户主">{{
            currentHousehold.householder
          }}</el-descriptions-item>
          <el-descriptions-item label="身份证号">{{
            maskIdCard(currentHousehold.idCard)
          }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentHousehold.phone }}</el-descriptions-item>
          <el-descriptions-item label="家庭住址" :span="2">{{
            currentHousehold.address
          }}</el-descriptions-item>
          <el-descriptions-item label="家庭类型">
            <el-tag :type="getCategoryTagType(currentHousehold.category)">
              {{ getCategoryText(currentHousehold.category) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="家庭人口"
            >{{ currentHousehold.population }}人</el-descriptions-item
          >
          <el-descriptions-item label="住房面积"
            >{{ currentHousehold.houseArea }}m²</el-descriptions-item
          >
          <el-descriptions-item label="创建时间">{{
            formatDate(currentHousehold.createdAt)
          }}</el-descriptions-item>
        </el-descriptions>

        <!-- 二维码展示 -->
        <div class="qr-code-section">
          <h4>家庭专属二维码</h4>
          <div class="qr-code-display">
            <el-image
              :src="currentHousehold.qrCode"
              :preview-src-list="[currentHousehold.qrCode]"
              fit="contain"
              style="width: 200px; height: 200px"
            />
            <div class="qr-code-info">
              <p>扫描二维码可快速查看/更新家庭信息</p>
              <el-button type="primary" @click="downloadQRCode(currentHousehold)">
                <el-icon><Download /></el-icon>
                下载二维码
              </el-button>
            </div>
          </div>
        </div>

        <!-- 家庭成员 -->
        <div class="members-section">
          <div class="section-header">
            <h4>家庭成员</h4>
            <el-button type="primary" size="small" @click="handleAddMember">
              <el-icon><Plus /></el-icon>
              添加成员
            </el-button>
          </div>
          <el-table :data="currentHousehold.members || []" style="width: 100%">
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="relation" label="关系" width="100" />
            <el-table-column prop="gender" label="性别" width="80" />
            <el-table-column prop="birthDate" label="出生日期" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.birthDate) }}
              </template>
            </el-table-column>
            <el-table-column prop="idCard" label="身份证号" width="180">
              <template #default="scope">
                {{ maskIdCard(scope.row.idCard) }}
              </template>
            </el-table-column>
            <el-table-column prop="phone" label="联系电话" width="130" />
            <el-table-column prop="education" label="学历" width="100" />
            <el-table-column prop="occupation" label="职业" width="120" />
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button type="primary" size="small" @click="handleEditMember(scope.row)">
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>

    <!-- 批量生成对话框 -->
    <el-dialog
      v-model="showBatchDialog"
      title="批量生成二维码"
      width="600px"
      :fullscreen="isMobile"
    >
      <el-form ref="batchFormRef" :model="batchForm" :rules="batchRules" label-width="100px">
        <el-form-item label="生成方式" prop="mode">
          <el-radio-group v-model="batchForm.mode">
            <el-radio label="new">新增住户生成</el-radio>
            <el-radio label="existing">为现有住户生成</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="住户数据" prop="data">
          <el-upload
            class="upload-demo"
            drag
            :auto-upload="false"
            :on-change="handleBatchFileChange"
            :file-list="batchFileList"
            accept=".xlsx,.xls"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">将Excel文件拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">请上传包含住户信息的Excel文件</div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item label="打印设置">
          <el-checkbox-group v-model="batchForm.printOptions">
            <el-checkbox label="qrcode">包含二维码</el-checkbox>
            <el-checkbox label="address">包含地址信息</el-checkbox>
            <el-checkbox label="contact">包含联系方式</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showBatchDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchGenerate" :loading="batchGenerating">
          开始生成
        </el-button>
      </template>
    </el-dialog>

    <!-- 打印设置对话框 -->
    <el-dialog v-model="showPrintDialog" title="打印二维码" width="500px" :fullscreen="isMobile">
      <el-form ref="printFormRef" :model="printForm" label-width="100px">
        <el-form-item label="打印范围">
          <el-radio-group v-model="printForm.range">
            <el-radio label="selected">选中住户</el-radio>
            <el-radio label="all">全部住户</el-radio>
            <el-radio label="category">按家庭类型</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="家庭类型" v-if="printForm.range === 'category'">
          <el-select v-model="printForm.category" placeholder="请选择家庭类型">
            <el-option label="普通住户" value="normal" />
            <el-option label="低保户" value="lowIncome" />
            <el-option label="独生子女户" value="singleChild" />
            <el-option label="独居老人" value="elderly" />
            <el-option label="残疾家庭" value="disabled" />
          </el-select>
        </el-form-item>

        <el-form-item label="打印样式">
          <el-radio-group v-model="printForm.style">
            <el-radio label="standard">标准样式</el-radio>
            <el-radio label="compact">紧凑样式</el-radio>
            <el-radio label="detailed">详细样式</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="纸张大小">
          <el-select v-model="printForm.paperSize">
            <el-option label="A4" value="A4" />
            <el-option label="A5" value="A5" />
            <el-option label="标签纸" value="label" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showPrintDialog = false">取消</el-button>
        <el-button type="primary" @click="handlePrint"> 预览并打印 </el-button>
      </template>
    </el-dialog>

    <!-- 文件上传 -->
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
  Operation,
  Printer,
  ArrowDown,
  UploadFilled,
} from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const committeeStore = useCommitteeStore();

// 响应式数据
const searchForm = ref({
  householder: '',
  code: '',
  category: '',
});

const showAddDialog = ref(false);
const showDetailDialog = ref(false);
const showBatchDialog = ref(false);
const showPrintDialog = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const batchGenerating = ref(false);
const isMobile = ref(false);

const householdFormRef = ref();
const batchFormRef = ref();
const printFormRef = ref();
const fileInput = ref();

const currentHousehold = ref(null);
const selectedHouseholds = ref([]);
const batchFileList = ref([]);

const pagination = ref({
  page: 1,
  size: 20,
  total: 0,
});

const householdForm = ref({
  householder: '',
  idCard: '',
  phone: '',
  address: '',
  category: 'normal',
  population: 1,
  houseArea: 0,
  remark: '',
});

const batchForm = ref({
  mode: 'new',
  data: null,
  printOptions: ['qrcode', 'address'],
});

const printForm = ref({
  range: 'selected',
  category: '',
  style: 'standard',
  paperSize: 'A4',
});

// 家庭统计数据
const householdStats = ref([
  {
    key: 'total',
    label: '住户总数',
    value: '486',
    icon: 'House',
    color: '#409eff',
  },
  {
    key: 'lowIncome',
    label: '低保户',
    value: '32',
    icon: 'Money',
    color: '#f56c6c',
  },
  {
    key: 'elderly',
    label: '独居老人',
    value: '18',
    icon: 'UserFilled',
    color: '#e6a23c',
  },
  {
    key: 'disabled',
    label: '残疾家庭',
    value: '23',
    icon: 'Warning',
    color: '#909399',
  },
]);

// 表单验证规则
const householdRules = {
  householder: [{ required: true, message: '请输入户主姓名', trigger: 'blur' }],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /^\d{17}[\dXx]$/, message: '请输入正确的身份证号', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' },
  ],
  address: [{ required: true, message: '请输入家庭住址', trigger: 'blur' }],
  category: [{ required: true, message: '请选择家庭类型', trigger: 'change' }],
  population: [{ required: true, message: '请输入家庭人口', trigger: 'blur' }],
};

const batchRules = {
  mode: [{ required: true, message: '请选择生成方式', trigger: 'change' }],
  data: [{ required: true, message: '请上传数据文件', trigger: 'change' }],
};

// 计算属性
const filteredHouseholds = computed(() => {
  let result = committeeStore.householdCodes;

  if (searchForm.value.householder) {
    result = result.filter(h => h.householder.includes(searchForm.value.householder));
  }

  if (searchForm.value.code) {
    result = result.filter(h => h.code.includes(searchForm.value.code));
  }

  if (searchForm.value.category) {
    result = result.filter(h => h.category === searchForm.value.category);
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
    householder: '',
    code: '',
    category: '',
  };
  pagination.value.page = 1;
};

const handleSelectionChange = selection => {
  selectedHouseholds.value = selection;
};

const handleSizeChange = size => {
  pagination.value.size = size;
  pagination.value.page = 1;
};

const handleCurrentChange = page => {
  pagination.value.page = page;
};

const handleView = row => {
  currentHousehold.value = {
    ...row,
    members: [
      {
        name: row.householder,
        relation: '户主',
        gender: '男',
        birthDate: '1975-05-15',
        idCard: row.idCard,
        phone: row.phone,
        education: '高中',
        occupation: '农民',
      },
      {
        name: '张小红',
        relation: '配偶',
        gender: '女',
        birthDate: '1978-08-20',
        idCard: '330327197808206543',
        phone: '13812345678',
        education: '初中',
        occupation: '农民',
      },
    ],
  };
  showDetailDialog.value = true;
};

const handleEdit = row => {
  isEdit.value = true;
  currentHousehold.value = row;
  householdForm.value = { ...row };
  showAddDialog.value = true;
};

const handleAction = (command, row) => {
  currentHousehold.value = row;

  switch (command) {
    case 'qrcode':
      handleViewQRCode(row);
      break;
    case 'members':
      handleViewMembers(row);
      break;
    case 'history':
      handleViewHistory(row);
      break;
    case 'print':
      handlePrintSingle(row);
      break;
    case 'delete':
      handleDelete(row);
      break;
  }
};

const handleViewQRCode = row => {
  ElMessageBox.alert(
    `<img src="${row.qrCode}" style="width: 200px; height: 200px;" />`,
    '家庭二维码',
    {
      dangerouslyUseHTMLString: true,
      center: true,
    }
  );
};

const handleViewMembers = row => {
  handleView(row);
};

const handleViewHistory = row => {
  ElMessage.info('查看更新历史');
};

const handlePrintSingle = row => {
  ElMessage.info(`打印 ${row.householder} 的二维码`);
};

const handleDelete = row => {
  ElMessageBox.confirm(`确定要删除户主为 ${row.householder} 的家庭信息吗？`, '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      ElMessage.success('删除成功');
      await committeeStore.fetchHouseholdCodes();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  });
};

const handleSubmit = async () => {
  if (!householdFormRef.value) return;

  await householdFormRef.value.validate(async valid => {
    if (valid) {
      submitting.value = true;
      try {
        if (isEdit.value) {
          await committeeStore.updateHouseholdCode(currentHousehold.value.id, householdForm.value);
          ElMessage.success('更新成功');
        } else {
          await committeeStore.generateHouseholdCode(householdForm.value);
          ElMessage.success('添加成功');
        }
        showAddDialog.value = false;
        await committeeStore.fetchHouseholdCodes();
      } catch (error) {
        ElMessage.error('操作失败');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const handleAddMember = () => {
  ElMessage.info('添加家庭成员');
};

const handleEditMember = member => {
  ElMessage.info(`编辑 ${member.name} 的信息`);
};

const handleImport = () => {
  fileInput.value.click();
};

const handleFileImport = async event => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    ElMessage.success('导入成功');
    await committeeStore.fetchHouseholdCodes();
  } catch (error) {
    ElMessage.error('导入失败');
  }

  event.target.value = '';
};

const handleExport = () => {
  ElMessage.success('导出成功');
};

const downloadQRCode = household => {
  const link = document.createElement('a');
  link.href = household.qrCode;
  link.download = `${household.code}.png`;
  link.click();
};

const handleBatchFileChange = file => {
  batchFileList.value = [file];
};

const handleBatchGenerate = async () => {
  if (!batchFormRef.value) return;

  await batchFormRef.value.validate(async valid => {
    if (valid) {
      batchGenerating.value = true;
      try {
        ElMessage.success('批量生成成功');
        showBatchDialog.value = false;
        await committeeStore.fetchHouseholdCodes();
      } catch (error) {
        ElMessage.error('生成失败');
      } finally {
        batchGenerating.value = false;
      }
    }
  });
};

const handlePrint = () => {
  ElMessage.success('准备打印');
};

// 辅助函数
const formatDate = date => {
  return date ? dayjs(date).format('YYYY-MM-DD') : '';
};

const maskIdCard = idCard => {
  if (!idCard) return '';
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
};

const getCategoryTagType = category => {
  const typeMap = {
    normal: 'primary',
    lowIncome: 'danger',
    singleChild: 'success',
    elderly: 'warning',
    disabled: 'info',
  };
  return typeMap[category] || '';
};

const getCategoryText = category => {
  const textMap = {
    normal: '普通住户',
    lowIncome: '低保户',
    singleChild: '独生子女户',
    elderly: '独居老人',
    disabled: '残疾家庭',
  };
  return textMap[category] || category;
};

const getStatusTagType = status => {
  const typeMap = {
    active: 'success',
    inactive: 'warning',
    moved: 'info',
  };
  return typeMap[status] || '';
};

const getStatusText = status => {
  const textMap = {
    active: '正常',
    inactive: '未激活',
    moved: '已搬迁',
  };
  return textMap[status] || status;
};

// 生命周期
onMounted(async () => {
  isMobile.value = window.innerWidth < 768;

  try {
    await committeeStore.fetchHouseholdCodes();
  } catch (error) {
    console.error('加载数据失败:', error);
  }
});
</script>

<style lang="scss" scoped>
.household-code-container {
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eaf6 100%);
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 10px;
  }
}

.search-card {
  margin-bottom: 20px;
  background: rgba(255,255,255,0.97);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(99,102,241,0.1);
  box-shadow: 0 4px 20px rgba(99,102,241,0.08);

  .search-form {
    margin-bottom: 20px;
  }

  .action-bar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
}

.stats-row {
  margin-bottom: 20px;

  .stat-card {
    height: 100px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(99,102,241,0.08);
    box-shadow: 0 4px 20px rgba(99,102,241,0.08);

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 30px rgba(99,102,241,0.15);
      border-color: rgba(99,102,241,0.3);
    }
  }

  .stat-content {
    display: flex;
    align-items: center;
    height: 100%;
    gap: 16px;

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;

      .total & {
        background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
        color: white;
        box-shadow: 0 4px 12px rgba(99, 102,241,0.2);
      }

      .lowIncome & {
        background: linear-gradient(135deg, #f43f5f5 0%, #ef4444 100%);
        color: white;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
      }

      .elderly & {
        background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
        color: white;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
      }

      .disabled & {
        background: linear-gradient(135deg, #9ca3af 0%, #8b5cf6 100%);
        color: white;
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
      }
    }

    .stat-info {
      flex: 1;

      .stat-value {
        font-size: 28px;
        font-weight: 700;
        background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        line-height: 1.2;
      }

      .stat-label {
        font-size: 14px;
        color: #6b7280;
        margin-top: 4px;
        font-weight: 500;
      }
    }
  }
}

.table-card {
  background: rgba(255,255,255,0.97);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(99,102,241,0.1);
  box-shadow: 0 4px 20px rgba(99,102,241,0.08);

  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
    padding: 16px;
  }

  .qr-code-section {
    margin-top: 20px;

    h4 {
      margin-bottom: 15px;
      color: #1f2937;
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;

      &::before {
        content: '';
        width: 4px;
        height: 20px;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        border-radius: 2px;
        margin-right: 8px;
      }
    }
  }

  .qr-code-display {
    display: flex;
    align-items: center;
    gap: 30px;
    padding: 20px;
    background: linear-gradient(135deg, rgba(99,102,241,0.02) 0%, rgba(99,102,241,0.03) 100%);
    border-radius: 12px;
  }

    .qr-code-info {
      p {
        color: #64748b;
        margin-bottom: 15px;
        font-size: 14px;
      }
    }
  }

  .detail-content {
    .members-section {
    margin-top: 30px;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;

      h4 {
        margin: 0;
        color: #1f2937;
        font-size: 16px;
        font-weight: 600;
      }
    }
  }

  .detail-actions {
    margin-top: 20px;
    text-align: center;

    .el-button {
      margin: 0 10px;
      border-radius: 8px;
      padding: 8px 16px;
      font-weight: 500;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(99, 102,241,0.15);
      }
    }
  }
}

// 装饰性渐变
.household-code-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(99, 102,241,0.02) 0%, rgba(139, 92,246, 0.03) 0%),
              linear-gradient(45deg, rgba(99,102,241,0.02) 0%, rgba(139, 92,246, 0.03) 100%);
  background-size: 400px 400px;
  animation: gradient-pulse 15s linear infinite;
  pointer-events: none;
  z-index: -1;
}

@keyframes gradient-pulse {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
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

  .qr-code-display {
    flex-direction: column;
    text-align: center;
  }
}
}
}

.search-card {
  margin-bottom: 20px;

  .search-form {
    margin-bottom: 20px;
  }

  .action-bar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
}

.stats-row {
  margin-bottom: 20px;

  .stat-card {
    height: 100px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      transform: translateY(-5px);
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 15px;

      .stat-info {
        .stat-value {
          font-size: 24px;
          font-weight: 600;
          color: #303133;
        }

        .stat-label {
          font-size: 14px;
          color: #909399;
          margin-top: 5px;
        }
      }
    }
  }
}

.table-card {
  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}

.detail-content {
  .qr-code-section {
    margin-top: 20px;

    h4 {
      margin-bottom: 15px;
      color: #303133;
    }

    .qr-code-display {
      display: flex;
      align-items: center;
      gap: 30px;

      .qr-code-info {
        p {
          color: #606266;
          margin-bottom: 15px;
        }
      }
    }
  }

  .members-section {
    margin-top: 30px;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;

      h4 {
        margin: 0;
        color: #303133;
      }
    }
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

  .qr-code-display {
    flex-direction: column;
    text-align: center;
  }
}
</style>
