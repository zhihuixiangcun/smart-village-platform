<template>
  <el-dialog
    v-model="dialogVisible"
    title="一户一码管理"
    width="1000px"
    :close-on-click-modal="false"
  >
    <!-- 搜索筛选 -->
    <div class="search-section">
      <el-form :model="searchForm" :inline="true">
        <el-form-item label="搜索">
          <el-input
            v-model="searchForm.keyword"
            placeholder="户码、户主姓名或地址"
            prefix-icon="Search"
            clearable
            style="width: 240px"
            @keyup.enter="searchHouseholds"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择"
            clearable
            style="width: 120px"
          >
            <el-option label="正常" value="active" />
            <el-option label="异常" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="searchHouseholds" icon="Search"> 搜索 </el-button>
          <el-button @click="resetSearch" icon="Refresh"> 重置 </el-button>
          <el-button type="success" @click="generateNewCode" icon="Plus"> 生成新户码 </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-item">
            <el-icon size="24" color="#409eff"><House /></el-icon>
            <div class="stat-content">
              <div class="stat-number">{{ statistics.totalHouseholds }}</div>
              <div class="stat-label">总户数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <el-icon size="24" color="#67c23a"><UserFilled /></el-icon>
            <div class="stat-content">
              <div class="stat-number">{{ statistics.totalMembers }}</div>
              <div class="stat-label">总人数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <el-icon size="24" color="#e6a23c"><Warning /></el-icon>
            <div class="stat-content">
              <div class="stat-number">{{ statistics.activeHouseholds }}</div>
              <div class="stat-label">正常户</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-item">
            <el-icon size="24" color="#f56c6c"><CircleClose /></el-icon>
            <div class="stat-content">
              <div class="stat-number">{{ statistics.inactiveHouseholds }}</div>
              <div class="stat-label">异常户</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 户码列表 -->
    <div class="household-grid">
      <div
        v-for="household in filteredHouseholds"
        :key="household.code"
        class="household-card"
        :class="{ inactive: household.status === 'inactive' }"
      >
        <div class="card-header">
          <div class="household-code">
            <el-icon><QrCode /></el-icon>
            <span>{{ household.code }}</span>
          </div>
          <div class="status-badge">
            <el-tag :type="household.status === 'active' ? 'success' : 'danger'" size="small">
              {{ household.status === 'active' ? '正常' : '异常' }}
            </el-tag>
          </div>
        </div>

        <div class="card-content">
          <div class="household-info">
            <h4>{{ household.householder }}</h4>
            <p>
              <el-icon><User /></el-icon> {{ household.memberCount }} 人
            </p>
            <p>
              <el-icon><LocationFilled /></el-icon> {{ household.address }}
            </p>
            <p>
              <el-icon><Calendar /></el-icon> {{ formatDate(household.createTime) }}
            </p>
          </div>

          <div class="qr-preview" @click="showQRCode(household)">
            <canvas :ref="el => setCanvasRef(household.code, el)" width="80" height="80"></canvas>
            <span>点击预览</span>
          </div>
        </div>

        <div class="card-actions">
          <el-button-group size="small">
            <el-button type="primary" @click="showQRCode(household)" icon="QrCode">
              二维码
            </el-button>
            <el-button type="success" @click="editHousehold(household)" icon="Edit">
              编辑
            </el-button>
            <el-dropdown @command="cmd => handleAction(cmd, household)">
              <el-button icon="MoreFilled" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="print" icon="Printer">打印二维码</el-dropdown-item>
                  <el-dropdown-item command="download" icon="Download">下载二维码</el-dropdown-item>
                  <el-dropdown-item command="regenerate" icon="Refresh">重新生成</el-dropdown-item>
                  <el-dropdown-item command="deactivate" icon="CircleClose" divided>
                    {{ household.status === 'active' ? '停用' : '启用' }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-button-group>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[12, 24, 48]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="exportAllCodes" icon="Download"> 批量导出 </el-button>
      </div>
    </template>

    <!-- 二维码预览对话框 -->
    <el-dialog v-model="qrPreviewVisible" title="户码二维码" width="500px" append-to-body>
      <div v-if="selectedHousehold" class="qr-preview-content">
        <div class="household-summary">
          <h3>{{ selectedHousehold.householder }}</h3>
          <p>户码：{{ selectedHousehold.code }}</p>
          <p>成员：{{ selectedHousehold.memberCount }} 人</p>
          <p>地址：{{ selectedHousehold.address }}</p>
        </div>

        <div class="qr-code-large">
          <canvas ref="qrPreviewCanvas" width="300" height="300"></canvas>
        </div>

        <div class="qr-actions">
          <el-button type="primary" @click="downloadQRCode" icon="Download"> 下载二维码 </el-button>
          <el-button type="success" @click="printQRCode" icon="Printer"> 打印二维码 </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 编辑户码对话框 -->
    <household-edit-dialog
      v-model="editDialogVisible"
      :household="selectedHousehold"
      @confirm="handleEditConfirm"
    />
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  House,
  UserFilled,
  Warning,
  CircleClose,
  QrCode,
  User,
  LocationFilled,
  Calendar,
  Search,
  Refresh,
  Plus,
  Edit,
  MoreFilled,
  Printer,
  Download,
} from '@element-plus/icons-vue';
import QRCode from 'qrcode';
import { residentAPI } from '@/api/resident';
import HouseholdEditDialog from './HouseholdEditDialog.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

// 响应式数据
const loading = ref(false);
const qrPreviewVisible = ref(false);
const editDialogVisible = ref(false);
const selectedHousehold = ref(null);
const qrPreviewCanvas = ref();
const canvasRefs = ref({});

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: '',
});

// 统计数据
const statistics = reactive({
  totalHouseholds: 0,
  totalMembers: 0,
  activeHouseholds: 0,
  inactiveHouseholds: 0,
});

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 12,
  total: 0,
});

// 户码数据
const households = ref([]);

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

// 过滤后的户码列表
const filteredHouseholds = computed(() => {
  let result = households.value;

  if (searchForm.keyword) {
    result = result.filter(
      household =>
        household.code.includes(searchForm.keyword) ||
        household.householder.includes(searchForm.keyword) ||
        household.address.includes(searchForm.keyword)
    );
  }

  if (searchForm.status) {
    result = result.filter(household => household.status === searchForm.status);
  }

  return result;
});

// 方法
const setCanvasRef = (code, el) => {
  if (el) {
    canvasRefs.value[code] = el;
    nextTick(() => {
      generateMiniQR(code, el);
    });
  }
};

const generateMiniQR = async (code, canvas) => {
  try {
    // 构建更丰富的二维码数据
    const household = households.value.find(h => h.code === code);
    const qrData = JSON.stringify({
      type: 'household_code',
      version: '2.0',
      code: code,
      data: {
        householder: household?.householder,
        memberCount: household?.memberCount,
        address: household?.address,
        status: household?.status,
        createTime: household?.createTime,
      },
      security: {
        signature: generateSignature(code),
        timestamp: Date.now(),
        expires: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30天过期
      },
      metadata: {
        village: '智慧村庄',
        platform: 'Smart Village Management System',
      },
    });

    await QRCode.toCanvas(canvas, qrData, {
      width: 80,
      height: 80,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (error) {
    console.error('生成二维码失败:', error);
  }
};

// 生成安全签名
const generateSignature = code => {
  // 简单的签名生成，实际项目中应使用更安全的方法
  const secret = 'smart_village_secret_key';
  const data = code + Date.now().toString();
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

const showQRCode = async household => {
  selectedHousehold.value = household;
  qrPreviewVisible.value = true;

  await nextTick();
  if (qrPreviewCanvas.value) {
    try {
      // 生成详细的二维码数据
      const qrData = JSON.stringify({
        type: 'household_code',
        version: '2.0',
        code: household.code,
        data: {
          householder: household.householder,
          memberCount: household.memberCount,
          address: household.address,
          status: household.status,
          createTime: household.createTime,
        },
        security: {
          signature: generateSignature(household.code),
          timestamp: Date.now(),
          expires: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30天过期
          checksum: generateChecksum(household),
        },
        metadata: {
          village: '智慧村庄',
          platform: 'Smart Village Management System',
          generatedBy: 'system',
          purpose: 'household_identification',
        },
      });

      await QRCode.toCanvas(qrPreviewCanvas.value, qrData, {
        width: 300,
        height: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H', // 高纠错级别
      });
    } catch (error) {
      console.error('生成大尺寸二维码失败:', error);
      ElMessage.error('生成二维码失败');
    }
  }
};

// 生成校验和
const generateChecksum = household => {
  const data = `${household.code}-${household.householder}-${household.memberCount}`;
  let checksum = 0;
  for (let i = 0; i < data.length; i++) {
    checksum += data.charCodeAt(i);
  }
  return (checksum % 9999).toString().padStart(4, '0');
};

const editHousehold = household => {
  selectedHousehold.value = household;
  editDialogVisible.value = true;
};

const handleAction = async (command, household) => {
  selectedHousehold.value = household;

  switch (command) {
    case 'print':
      await showQRCode(household);
      printQRCode();
      break;
    case 'download':
      await showQRCode(household);
      downloadQRCode();
      break;
    case 'regenerate':
      regenerateCode(household);
      break;
    case 'deactivate':
      toggleHouseholdStatus(household);
      break;
  }
};

const downloadQRCode = () => {
  if (!qrPreviewCanvas.value || !selectedHousehold.value) return;

  try {
    const link = document.createElement('a');
    link.download = `户码_${selectedHousehold.value.code}_${selectedHousehold.value.householder}.png`;
    link.href = qrPreviewCanvas.value.toDataURL();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    ElMessage.success('二维码下载成功');
  } catch (error) {
    console.error('下载二维码失败:', error);
    ElMessage.error('下载二维码失败');
  }
};

const printQRCode = () => {
  if (!qrPreviewCanvas.value || !selectedHousehold.value) return;

  try {
    const household = selectedHousehold.value;
    const printWindow = window.open('', '_blank');
    const imageData = qrPreviewCanvas.value.toDataURL();

    printWindow.document.write(`
      <html>
        <head>
          <title>户码二维码 - ${household.householder}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              text-align: center;
            }
            .print-container {
              max-width: 400px;
              margin: 0 auto;
            }
            .household-info {
              margin-bottom: 30px;
              text-align: left;
            }
            .qr-code {
              margin: 30px 0;
            }
            .footer {
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <h1>一户一码</h1>
            <div class="household-info">
              <p><strong>户主：</strong>${household.householder}</p>
              <p><strong>户码：</strong>${household.code}</p>
              <p><strong>成员：</strong>${household.memberCount} 人</p>
              <p><strong>地址：</strong>${household.address}</p>
            </div>
            <div class="qr-code">
              <img src="${imageData}" alt="户码二维码" style="width: 300px; height: 300px;" />
            </div>
            <div class="footer">
              <p>智慧村庄管理平台</p>
              <p>扫描二维码查看户籍信息</p>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();

    ElMessage.success('正在打印二维码');
  } catch (error) {
    console.error('打印二维码失败:', error);
    ElMessage.error('打印二维码失败');
  }
};

const regenerateCode = async household => {
  try {
    await ElMessageBox.confirm(
      `确定要重新生成户码 ${household.code} 吗？原二维码将失效。`,
      '重新生成确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    const response = await residentAPI.regenerateHouseholdCode(household.id);
    if (response.success) {
      ElMessage.success('户码重新生成成功');
      loadHouseholds();
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重新生成失败');
    }
  }
};

const toggleHouseholdStatus = async household => {
  const action = household.status === 'active' ? '停用' : '启用';

  try {
    await ElMessageBox.confirm(`确定要${action}户码 ${household.code} 吗？`, `${action}确认`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const response = await residentAPI.updateHouseholdStatus(
      household.id,
      household.status === 'active' ? 'inactive' : 'active'
    );

    if (response.success) {
      ElMessage.success(`${action}成功`);
      loadHouseholds();
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(`${action}失败`);
    }
  }
};

const generateNewCode = () => {
  editDialogVisible.value = true;
  selectedHousehold.value = null;
};

const searchHouseholds = () => {
  pagination.currentPage = 1;
  loadHouseholds();
};

const resetSearch = () => {
  Object.assign(searchForm, {
    keyword: '',
    status: '',
  });
  searchHouseholds();
};

const loadHouseholds = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      ...searchForm,
    };

    const response = await residentAPI.getHouseholdList(params);
    if (response.success) {
      households.value = response.data.list;
      pagination.total = response.data.total;
      updateStatistics();
    }
  } catch (error) {
    ElMessage.error('获取户码数据失败');
  } finally {
    loading.value = false;
  }
};

const updateStatistics = () => {
  statistics.totalHouseholds = households.value.length;
  statistics.totalMembers = households.value.reduce((sum, h) => sum + h.memberCount, 0);
  statistics.activeHouseholds = households.value.filter(h => h.status === 'active').length;
  statistics.inactiveHouseholds = households.value.filter(h => h.status === 'inactive').length;
};

const handleSizeChange = size => {
  pagination.pageSize = size;
  loadHouseholds();
};

const handleCurrentChange = page => {
  pagination.currentPage = page;
  loadHouseholds();
};

const handleEditConfirm = () => {
  editDialogVisible.value = false;
  loadHouseholds();
};

const exportAllCodes = async () => {
  try {
    await residentAPI.exportHouseholdCodes(searchForm);
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  }
};

const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleDateString();
};

// 生命周期
onMounted(() => {
  if (props.modelValue) {
    loadHouseholds();
  }
});
</script>

<style lang="scss" scoped>
.search-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stats-section {
  margin-bottom: 30px;

  .stat-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    .stat-content {
      .stat-number {
        font-size: 24px;
        font-weight: bold;
        color: #303133;
        line-height: 1;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 14px;
        color: #909399;
      }
    }
  }
}

.household-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 30px;

  .household-card {
    border: 1px solid #e4e7ed;
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.3s ease;
    background: white;

    &:hover {
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    &.inactive {
      opacity: 0.7;
      background: #f5f7fa;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: #f8f9fa;
      border-bottom: 1px solid #e4e7ed;

      .household-code {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: bold;
        color: #409eff;
        font-size: 16px;
      }
    }

    .card-content {
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .household-info {
        flex: 1;

        h4 {
          margin: 0 0 12px 0;
          color: #303133;
          font-size: 18px;
        }

        p {
          margin: 8px 0;
          color: #606266;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
      }

      .qr-preview {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        transition: background-color 0.3s;

        &:hover {
          background: #f0f9ff;
        }

        canvas {
          border: 1px solid #e4e7ed;
          border-radius: 4px;
        }

        span {
          font-size: 12px;
          color: #909399;
        }
      }
    }

    .card-actions {
      padding: 16px 20px;
      border-top: 1px solid #e4e7ed;
      background: #fafafa;
    }
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

.qr-preview-content {
  text-align: center;

  .household-summary {
    margin-bottom: 30px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;

    h3 {
      margin: 0 0 12px 0;
      color: #303133;
    }

    p {
      margin: 6px 0;
      color: #606266;
    }
  }

  .qr-code-large {
    margin-bottom: 30px;

    canvas {
      border: 1px solid #e4e7ed;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }

  .qr-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
  }
}

.dialog-footer {
  text-align: right;
}

// 响应式设计
@media (max-width: 768px) {
  .household-grid {
    grid-template-columns: 1fr;
  }

  .stats-section {
    :deep(.el-col) {
      margin-bottom: 16px;
    }
  }

  .household-card {
    .card-content {
      flex-direction: column;
      gap: 20px;
      text-align: center;
    }
  }
}
</style>
