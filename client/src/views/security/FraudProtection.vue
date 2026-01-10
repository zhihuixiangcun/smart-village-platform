<template>
  <div class="fraud-protection-container">
    <el-card class="header-card">
      <h2>防诈骗管理系统</h2>
      <p class="description">保护村民免受电信诈骗侵害，共建平安乡村</p>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #ff6b6b">
              <el-icon><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalFraudNumbers }}</div>
              <div class="stat-label">诈骗号码总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #feca57">
              <el-icon><View /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.todayReports }}</div>
              <div class="stat-label">今日举报数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #48dbfb">
              <el-icon><SuccessFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.blockedToday }}</div>
              <div class="stat-label">今日拦截数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background: #1dd1a1">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.trend }}%</div>
              <div class="stat-label">周环比</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 操作区域 -->
    <el-card class="action-card">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-button type="primary" @click="showCheckDialog = true" :icon="Search">
            检测号码
          </el-button>
        </el-col>
        <el-col :span="8">
          <el-button type="warning" @click="showReportDialog = true" :icon="WarningFilled">
            举报诈骗
          </el-button>
        </el-col>
        <el-col :span="8">
          <el-button @click="loadFraudNumbers" :icon="Refresh"> 刷新数据 </el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 诈骗类型分布 -->
    <el-card class="chart-card">
      <template #header>
        <span>诈骗类型分布</span>
      </template>
      <div ref="fraudTypeChart" style="height: 300px"></div>
    </el-card>

    <!-- 诈骗号码列表 -->
    <el-card class="table-card">
      <template #header>
        <div class="table-header">
          <span>诈骗号码库</span>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索号码"
            style="width: 200px"
            :prefix-icon="Search"
            @input="handleSearch"
          />
        </div>
      </template>

      <el-table :data="filteredFraudNumbers" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="phoneNumber" label="电话号码" width="130" />
        <el-table-column prop="fraudTypeName" label="诈骗类型" width="120" />
        <el-table-column label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getRiskTagType(row.riskLevel)">
              {{ row.riskLevelName }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reportCount" label="举报次数" width="100" sortable />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'danger' : 'info'">
              {{ row.status === 'active' ? '活跃' : '已处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetails(row)">详情</el-button>
            <el-button
              v-if="userRole === 'admin'"
              size="small"
              type="primary"
              @click="verifyNumber(row)"
              :disabled="row.verified"
            >
              {{ row.verified ? '已验证' : '验证' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadFraudNumbers"
        @current-change="loadFraudNumbers"
        style="margin-top: 20px; justify-content: center"
      />
    </el-card>

    <!-- 号码检测对话框 -->
    <el-dialog v-model="showCheckDialog" title="检测电话号码" width="500px">
      <el-form :model="checkForm" label-width="100px">
        <el-form-item label="电话号码">
          <el-input
            v-model="checkForm.phoneNumber"
            placeholder="请输入要检测的电话号码"
            maxlength="11"
          />
        </el-form-item>
        <el-form-item v-if="checkResult" label="检测结果">
          <el-alert
            :type="checkResult.isFraud ? 'error' : 'success'"
            :title="checkResult.isFraud ? '检测到诈骗风险' : '未检测到风险'"
            :description="getCheckDescription()"
            show-icon
            :closable="false"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCheckDialog = false">取消</el-button>
        <el-button type="primary" @click="checkPhoneNumber" :loading="checking"> 检测 </el-button>
      </template>
    </el-dialog>

    <!-- 举报对话框 -->
    <el-dialog v-model="showReportDialog" title="举报诈骗号码" width="600px">
      <el-form :model="reportForm" :rules="reportRules" ref="reportFormRef" label-width="120px">
        <el-form-item label="电话号码" prop="phoneNumber">
          <el-input
            v-model="reportForm.phoneNumber"
            placeholder="请输入要举报的电话号码"
            maxlength="11"
          />
        </el-form-item>
        <el-form-item label="诈骗类型" prop="fraudType">
          <el-select
            v-model="reportForm.fraudType"
            placeholder="请选择诈骗类型"
            style="width: 100%"
          >
            <el-option label="冒充公检法" value="impersonation" />
            <el-option label="刷单返利" value="brush_order" />
            <el-option label="投资理财" value="investment" />
            <el-option label="贷款诈骗" value="loan" />
            <el-option label="冒充客服" value="customer_service" />
            <el-option label="退款诈骗" value="refund" />
            <el-option label="中奖诈骗" value="lottery" />
            <el-option label="杀猪盘" value="relationship" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="举报原因" prop="reason">
          <el-input
            v-model="reportForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请详细描述诈骗手法和经过"
          />
        </el-form-item>
        <el-form-item label="损失金额" prop="lossAmount">
          <el-input-number
            v-model="reportForm.lossAmount"
            :min="0"
            :precision="2"
            placeholder="如有经济损失请填写"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showReportDialog = false">取消</el-button>
        <el-button type="primary" @click="submitReport" :loading="reporting"> 提交举报 </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="号码详情" width="700px">
      <el-descriptions :column="2" border v-if="currentNumber">
        <el-descriptions-item label="电话号码">
          {{ currentNumber.phoneNumber }}
        </el-descriptions-item>
        <el-descriptions-item label="诈骗类型">
          {{ currentNumber.fraudTypeName }}
        </el-descriptions-item>
        <el-descriptions-item label="风险等级">
          <el-tag :type="getRiskTagType(currentNumber.riskLevel)">
            {{ currentNumber.riskLevelName }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="举报次数">
          {{ currentNumber.reportCount }}
        </el-descriptions-item>
        <el-descriptions-item label="拦截次数">
          {{ currentNumber.blockCount }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentNumber.status === 'active' ? 'danger' : 'info'">
            {{ currentNumber.status === 'active' ? '活跃' : '已处理' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="验证状态" :span="2">
          <el-tag :type="currentNumber.verified ? 'success' : 'warning'">
            {{ currentNumber.verified ? '已验证' : '未验证' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">
          {{ currentNumber.description || '无' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">
          {{ formatDate(currentNumber.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item
          label="防范建议"
          :span="2"
          v-if="currentNumber.caseDetails?.preventionTips"
        >
          <ul>
            <li v-for="(tip, index) in currentNumber.caseDetails.preventionTips" :key="index">
              {{ tip }}
            </li>
          </ul>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 防骗知识 -->
    <el-card class="knowledge-card">
      <template #header>
        <span>防骗知识库</span>
      </template>
      <el-collapse v-model="activeKnowledge">
        <el-collapse-item title="如何识别诈骗电话？" name="1">
          <div class="knowledge-content">
            <p>1. 来电显示异常号码（如+00、000开头等）</p>
            <p>2. 自称公检法要求转账到"安全账户"</p>
            <p>3. 声称涉嫌案件需要配合调查</p>
            <p>4. 要求提供银行卡号、验证码等敏感信息</p>
            <p>5. 诱导点击不明链接或下载可疑APP</p>
          </div>
        </el-collapse-item>
        <el-collapse-item title="遇到诈骗电话怎么办？" name="2">
          <div class="knowledge-content">
            <p>1. 立即挂断电话，不要继续交谈</p>
            <p>2. 不要点击链接、不要下载APP、不要转账</p>
            <p>3. 通过本系统举报该号码</p>
            <p>4. 拨打110或到当地派出所报案</p>
            <p>5. 保留通话记录、转账凭证等证据</p>
          </div>
        </el-collapse-item>
        <el-collapse-item title="如何保护个人信息？" name="3">
          <div class="knowledge-content">
            <p>1. 不随意透露身份证号、银行卡号</p>
            <p>2. 短信验证码不要告诉任何人</p>
            <p>3. 定期更换重要账户密码</p>
            <p>4. 开启银行账户短信通知</p>
            <p>5. 谨慎添加陌生微信好友</p>
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search,
  Refresh,
  Warning,
  View,
  SuccessFilled,
  TrendCharts,
  WarningFilled,
} from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { securityApi } from '@/api/security';

// 用户角色
const userRole = computed(() => {
  // 从store获取用户角色
  return localStorage.getItem('userRole') || 'user';
});

// 统计数据
const stats = ref({
  totalFraudNumbers: 0,
  todayReports: 0,
  blockedToday: 0,
  trend: 0,
});

// 诈骗号码列表
const fraudNumbers = ref([]);
const loading = ref(false);
const searchKeyword = ref('');

// 分页
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
});

// 对话框状态
const showCheckDialog = ref(false);
const showReportDialog = ref(false);
const showDetailDialog = ref(false);

// 检测表单
const checkForm = ref({
  phoneNumber: '',
});
const checkResult = ref(null);
const checking = ref(false);

// 举报表单
const reportForm = ref({
  phoneNumber: '',
  fraudType: '',
  reason: '',
  lossAmount: 0,
});
const reportRules = {
  phoneNumber: [
    { required: true, message: '请输入电话号码', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码', trigger: 'blur' },
  ],
  fraudType: [{ required: true, message: '请选择诈骗类型', trigger: 'change' }],
  reason: [{ required: true, message: '请输入举报原因', trigger: 'blur' }],
};
const reportFormRef = ref(null);
const reporting = ref(false);

// 当前查看的号码
const currentNumber = ref(null);

// 防骗知识
const activeKnowledge = ref(['1']);

// 图表
const fraudTypeChart = ref(null);

// 过滤后的号码列表
const filteredFraudNumbers = computed(() => {
  if (!searchKeyword.value) {
    return fraudNumbers.value;
  }
  return fraudNumbers.value.filter(item => item.phoneNumber.includes(searchKeyword.value));
});

// 获取风险等级标签类型
const getRiskTagType = level => {
  const typeMap = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  };
  return typeMap[level] || 'info';
};

// 格式化日期
const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

// 获取检测描述
const getCheckDescription = () => {
  if (!checkResult.value) return '';
  if (checkResult.value.isFraud) {
    return `风险等级：${checkResult.value.riskLevelName}\n诈骗类型：${checkResult.value.fraudTypeName}\n举报次数：${checkResult.value.reportCount}`;
  }
  return '该号码未在诈骗号码库中，但仍需保持警惕';
};

// 加载诈骗号码列表
const loadFraudNumbers = async () => {
  try {
    loading.value = true;
    const response = await securityApi.getFraudNumbers({
      page: pagination.value.page,
      limit: pagination.value.limit,
    });

    if (response.success) {
      fraudNumbers.value = response.data;
      pagination.value.total = response.pagination.total;
    }
  } catch (error) {
    ElMessage.error('加载失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 加载统计数据
const loadStats = async () => {
  try {
    const response = await securityApi.getFraudStats();
    if (response.success) {
      // 这里应该从API获取真实统计数据
      stats.value = {
        totalFraudNumbers: 156,
        todayReports: 12,
        blockedToday: 45,
        trend: -15,
      };
    }
  } catch (error) {
    console.error(error);
  }
};

// 检测电话号码
const checkPhoneNumber = async () => {
  if (!checkForm.value.phoneNumber) {
    ElMessage.warning('请输入电话号码');
    return;
  }

  try {
    checking.value = true;
    const response = await securityApi.checkPhoneNumber(checkForm.value.phoneNumber);

    if (response.success) {
      checkResult.value = response.data;
    }
  } catch (error) {
    ElMessage.error('检测失败');
    console.error(error);
  } finally {
    checking.value = false;
  }
};

// 提交举报
const submitReport = async () => {
  try {
    await reportFormRef.value.validate();

    reporting.value = true;
    const response = await securityApi.reportFraudNumber(reportForm.value);

    if (response.success) {
      ElMessage.success('举报成功，感谢您的反馈');
      showReportDialog.value = false;
      reportForm.value = {
        phoneNumber: '',
        fraudType: '',
        reason: '',
        lossAmount: 0,
      };
      loadFraudNumbers();
      loadStats();
    } else {
      ElMessage.error(response.message || '举报失败');
    }
  } catch (error) {
    console.error(error);
  } finally {
    reporting.value = false;
  }
};

// 查看详情
const viewDetails = number => {
  currentNumber.value = number;
  showDetailDialog.value = true;
};

// 验证号码
const verifyNumber = async number => {
  try {
    await ElMessageBox.confirm('确认验证此号码为诈骗号码？', '确认', {
      type: 'warning',
    });

    const response = await securityApi.verifyFraudNumber(number._id);

    if (response.success) {
      ElMessage.success('验证成功');
      loadFraudNumbers();
    } else {
      ElMessage.error(response.message || '验证失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error);
    }
  }
};

// 搜索
const handleSearch = () => {
  // 搜索由computed自动处理
};

// 初始化图表
const initChart = () => {
  const chart = echarts.init(fraudTypeChart.value);

  const option = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
    },
    series: [
      {
        name: '诈骗类型',
        type: 'pie',
        radius: '50%',
        data: [
          { value: 45, name: '冒充公检法' },
          { value: 32, name: '刷单返利' },
          { value: 28, name: '投资理财' },
          { value: 20, name: '贷款诈骗' },
          { value: 15, name: '冒充客服' },
          { value: 16, name: '其他' },
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };

  chart.setOption(option);

  // 响应式
  window.addEventListener('resize', () => {
    chart.resize();
  });
};

onMounted(() => {
  loadFraudNumbers();
  loadStats();
  initChart();
});
</script>

<style scoped>
.fraud-protection-container {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-card h2 {
  margin: 0 0 10px 0;
  color: #303133;
}

.description {
  margin: 0;
  color: #909399;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  cursor: pointer;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-content {
  display: flex;
  align-items: center;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.action-card {
  margin-bottom: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.knowledge-card {
  margin-bottom: 20px;
}

.knowledge-content p {
  margin: 8px 0;
  line-height: 1.6;
}
</style>
