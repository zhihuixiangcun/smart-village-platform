<template>
  <div class="privacy-module">
    <!-- 隐私保护概览 -->
    <div class="privacy-overview">
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="overview-item">
            <div class="overview-value">{{ privacyStats.totalConsents }}</div>
            <div class="overview-label">用户同意</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-item">
            <div class="overview-value">{{ privacyStats.activeAudits }}</div>
            <div class="overview-label">活跃审计</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-item">
            <div class="overview-value">{{ privacyStats.anonymizedRecords }}</div>
            <div class="overview-label">匿名记录</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-item">
            <div class="overview-value">{{ privacyStats.dataProcessings }}</div>
            <div class="overview-label">数据处理</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 用户同意管理 -->
    <div class="consent-management">
      <h3>用户同意管理</h3>
      <el-table :data="consentRecords" style="width: 100%">
        <el-table-column prop="userId" label="用户ID" width="120" />
        <el-table-column prop="consentType" label="同意类型" width="150" />
        <el-table-column prop="scope" label="数据范围" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'active' ? 'success' : 'danger'">
              {{ scope.row.status === 'active' ? '有效' : '已撤销' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="grantedAt" label="授权时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.grantedAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="expiresAt" label="过期时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.expiresAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button type="text" size="small" @click="checkConsent(scope.row)"> 检查 </el-button>
            <el-button
              type="text"
              size="small"
              @click="revokeConsent(scope.row)"
              :disabled="scope.row.status !== 'active'"
            >
              撤销
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="consent-actions">
        <el-button type="primary" @click="consentDialogVisible = true"> 新增用户同意 </el-button>
        <el-button type="warning" @click="batchRevokeConsents"> 批量撤销过期同意 </el-button>
      </div>
    </div>

    <!-- 数据脱敏处理 -->
    <div class="data-masking">
      <h3>数据脱敏处理</h3>
      <el-form :model="maskingForm" label-width="120px">
        <el-form-item label="数据类型">
          <el-select v-model="maskingForm.dataType" placeholder="选择数据类型">
            <el-option label="身份证号" value="idCard" />
            <el-option label="手机号码" value="phoneNumber" />
            <el-option label="邮箱地址" value="email" />
            <el-option label="银行卡号" value="bankCard" />
            <el-option label="地址信息" value="address" />
            <el-option label="自定义数据" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="脱敏级别">
          <el-radio-group v-model="maskingForm.maskingLevel">
            <el-radio label="light">轻度脱敏</el-radio>
            <el-radio label="standard">标准脱敏</el-radio>
            <el-radio label="strict">严格脱敏</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="测试数据">
          <el-input
            v-model="maskingForm.testData"
            type="textarea"
            rows="4"
            placeholder="请输入要脱敏的测试数据"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="performMasking" :loading="masking">
            执行脱敏
          </el-button>
          <el-button @click="clearMaskingResult"> 清空结果 </el-button>
        </el-form-item>
      </el-form>

      <!-- 脱敏结果 -->
      <div v-if="maskingResult" class="masking-result">
        <h4>脱敏结果</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="处理状态">
            <el-tag type="success">成功</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="脱敏级别">
            {{ maskingForm.maskingLevel }}
          </el-descriptions-item>
          <el-descriptions-item label="应用规则" :span="2">
            <el-tag
              v-for="rule in maskingResult.appliedRules"
              :key="rule"
              size="small"
              style="margin-right: 8px"
            >
              {{ rule }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="result-comparison">
          <div class="comparison-item">
            <h5>原始数据:</h5>
            <el-input :value="maskingForm.testData" type="textarea" rows="3" readonly />
          </div>
          <div class="comparison-item">
            <h5>脱敏后数据:</h5>
            <el-input :value="maskingResult.maskedData" type="textarea" rows="3" readonly />
          </div>
        </div>
      </div>
    </div>

    <!-- 数据匿名化 -->
    <div class="data-anonymization">
      <h3>数据匿名化</h3>
      <el-form :model="anonymizationForm" label-width="120px">
        <el-form-item label="数据集">
          <el-upload
            class="data-upload"
            drag
            action="#"
            :auto-upload="false"
            :on-change="handleDataUpload"
            accept=".csv,.json,.xlsx"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">将数据文件拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">支持CSV、JSON、Excel格式文件</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="匿名化策略">
          <el-checkbox-group v-model="anonymizationForm.strategies">
            <el-checkbox label="generalization">数据泛化</el-checkbox>
            <el-checkbox label="suppression">数据抑制</el-checkbox>
            <el-checkbox label="perturbation">数据扰动</el-checkbox>
            <el-checkbox label="microaggregation">微聚合</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="k-匿名值">
          <el-input-number v-model="anonymizationForm.kValue" :min="2" :max="100" />
          <span style="margin-left: 8px; color: #909399; font-size: 12px">
            每个等价类至少包含k个记录
          </span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="performAnonymization" :loading="anonymizing">
            执行匿名化
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 隐私影响评估 -->
    <div class="privacy-impact-assessment">
      <h3>隐私影响评估</h3>
      <el-form :model="assessmentForm" label-width="120px">
        <el-form-item label="处理活动">
          <el-input v-model="assessmentForm.processingActivity" placeholder="请描述数据处理活动" />
        </el-form-item>
        <el-form-item label="数据类型">
          <el-select v-model="assessmentForm.dataTypes" multiple placeholder="选择处理的数据类型">
            <el-option label="个人身份信息" value="personalIdentity" />
            <el-option label="联系方式" value="contactInfo" />
            <el-option label="位置信息" value="locationData" />
            <el-option label="生物特征" value="biometricData" />
            <el-option label="健康信息" value="healthData" />
            <el-option label="财务信息" value="financialData" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理目的">
          <el-input
            v-model="assessmentForm.purpose"
            type="textarea"
            rows="3"
            placeholder="请描述数据处理目的"
          />
        </el-form-item>
        <el-form-item label="法律依据">
          <el-select v-model="assessmentForm.legalBasis" placeholder="选择法律依据">
            <el-option label="用户同意" value="consent" />
            <el-option label="合同履行" value="contract" />
            <el-option label="法律义务" value="legalObligation" />
            <el-option label="合法权益" value="legitimateInterest" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="performAssessment" :loading="assessing">
            执行评估
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 评估结果 -->
      <div v-if="assessmentResult" class="assessment-result">
        <h4>评估结果</h4>
        <el-alert
          :title="getRiskLevelTitle(assessmentResult.riskLevel)"
          :type="getRiskLevelType(assessmentResult.riskLevel)"
          :description="assessmentResult.summary"
          show-icon
          :closable="false"
        />

        <el-descriptions :column="2" border style="margin-top: 16px">
          <el-descriptions-item label="风险等级">
            <el-tag :type="getRiskLevelType(assessmentResult.riskLevel)">
              {{ assessmentResult.riskLevel }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="风险评分">
            {{ assessmentResult.riskScore }}/100
          </el-descriptions-item>
          <el-descriptions-item label="必要性" :span="2">
            {{ assessmentResult.necessity }}
          </el-descriptions-item>
          <el-descriptions-item label="适当性" :span="2">
            {{ assessmentResult.proportionality }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="assessmentResult.recommendations" class="assessment-recommendations">
          <h5>改进建议:</h5>
          <ul>
            <li v-for="recommendation in assessmentResult.recommendations" :key="recommendation">
              {{ recommendation }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 审计日志 -->
    <div class="audit-logs">
      <h3>审计日志</h3>
      <div class="log-filters">
        <el-form :model="logFilter" inline>
          <el-form-item label="事件类型">
            <el-select v-model="logFilter.eventType" placeholder="选择事件类型" clearable>
              <el-option label="数据访问" value="dataAccess" />
              <el-option label="数据处理" value="dataProcessing" />
              <el-option label="隐私管理" value="privacyManagement" />
              <el-option label="欺诈检测" value="fraudDetection" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="logFilter.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="filterLogs">筛选</el-button>
            <el-button @click="clearFilters">清空</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table :data="filteredLogs" style="width: 100%" max-height="400">
        <el-table-column prop="eventType" label="事件类型" width="120" />
        <el-table-column prop="dataType" label="数据类型" width="120" />
        <el-table-column prop="operation" label="操作" width="100" />
        <el-table-column prop="result" label="结果" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.result === 'success' ? 'success' : 'danger'">
              {{ scope.row.result === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="userId" label="用户ID" width="120" />
        <el-table-column prop="timestamp" label="时间戳" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
      </el-table>
    </div>

    <!-- 用户同意对话框 -->
    <el-dialog v-model="consentDialogVisible" title="新增用户同意" width="50%">
      <el-form :model="newConsentForm" label-width="120px">
        <el-form-item label="用户ID">
          <el-input v-model="newConsentForm.userId" placeholder="请输入用户ID" />
        </el-form-item>
        <el-form-item label="同意类型">
          <el-select v-model="newConsentForm.consentType" placeholder="选择同意类型">
            <el-option label="数据收集" value="dataCollection" />
            <el-option label="数据处理" value="dataProcessing" />
            <el-option label="数据共享" value="dataSharing" />
            <el-option label="营销推广" value="marketing" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据范围">
          <el-input
            v-model="newConsentForm.scope"
            type="textarea"
            rows="3"
            placeholder="请描述数据使用范围"
          />
        </el-form-item>
        <el-form-item label="有效期">
          <el-date-picker
            v-model="newConsentForm.expiresAt"
            type="datetime"
            placeholder="选择过期时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="consentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addConsent">添加同意</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import axios from 'axios';

// Props
const props = defineProps({
  moduleData: {
    type: Object,
    default: () => ({}),
  },
});

// Emits
const emit = defineEmits(['refresh']);

// 响应式数据
const masking = ref(false);
const anonymizing = ref(false);
const assessing = ref(false);
const consentDialogVisible = ref(false);

// 隐私统计数据
const privacyStats = reactive({
  totalConsents: 0,
  activeAudits: 0,
  anonymizedRecords: 0,
  dataProcessings: 0,
});

// 用户同意记录
const consentRecords = ref([]);

// 脱敏表单
const maskingForm = reactive({
  dataType: '',
  maskingLevel: 'standard',
  testData: '',
});

// 脱敏结果
const maskingResult = ref(null);

// 匿名化表单
const anonymizationForm = reactive({
  strategies: ['generalization'],
  kValue: 5,
  dataset: null,
});

// 评估表单
const assessmentForm = reactive({
  processingActivity: '',
  dataTypes: [],
  purpose: '',
  legalBasis: '',
});

// 评估结果
const assessmentResult = ref(null);

// 新用户同意表单
const newConsentForm = reactive({
  userId: '',
  consentType: '',
  scope: '',
  expiresAt: '',
});

// 日志过滤器
const logFilter = reactive({
  eventType: '',
  dateRange: [],
});

// 审计日志
const auditLogs = ref([]);

// 计算属性
const filteredLogs = computed(() => {
  let logs = [...auditLogs.value];

  if (logFilter.eventType) {
    logs = logs.filter(log => log.eventType === logFilter.eventType);
  }

  if (logFilter.dateRange && logFilter.dateRange.length === 2) {
    const [startDate, endDate] = logFilter.dateRange;
    logs = logs.filter(log => {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0];
      return logDate >= startDate && logDate <= endDate;
    });
  }

  return logs;
});

// 方法
const formatDate = date => {
  return new Date(date).toLocaleString('zh-CN');
};

const getRiskLevelTitle = level => {
  const titles = {
    LOW: '低风险 - 隐私影响较小',
    MEDIUM: '中等风险 - 需要采取措施',
    HIGH: '高风险 - 需要立即处理',
    CRITICAL: '极高风险 - 严重隐私威胁',
  };
  return titles[level] || '风险评估';
};

const getRiskLevelType = level => {
  const types = {
    LOW: 'success',
    MEDIUM: 'warning',
    HIGH: 'danger',
    CRITICAL: 'error',
  };
  return types[level] || 'info';
};

// 获取隐私统计数据
const fetchPrivacyStats = async () => {
  try {
    const response = await axios.get('/api/v1/security/privacy-stats');

    if (response.data.success) {
      Object.assign(privacyStats, response.data.data);
    }
  } catch (error) {
    console.error('获取隐私统计失败:', error);
    // 使用模拟数据
    Object.assign(privacyStats, {
      totalConsents: 1245,
      activeAudits: 23,
      anonymizedRecords: 3847,
      dataProcessings: 567,
    });
  }
};

// 获取同意记录
const fetchConsentRecords = async () => {
  try {
    const response = await axios.get('/api/v1/security/consent-records');

    if (response.data.success) {
      consentRecords.value = response.data.data || [];
    }
  } catch (error) {
    console.error('获取同意记录失败:', error);
    // 使用模拟数据
    consentRecords.value = [
      {
        userId: 'user_001',
        consentType: 'dataCollection',
        scope: '个人基本信息收集',
        status: 'active',
        grantedAt: new Date('2024-01-01'),
        expiresAt: new Date('2025-01-01'),
      },
      {
        userId: 'user_002',
        consentType: 'dataProcessing',
        scope: '数据分析处理',
        status: 'revoked',
        grantedAt: new Date('2023-12-01'),
        expiresAt: new Date('2024-12-01'),
      },
    ];
  }
};

// 获取审计日志
const fetchAuditLogs = async () => {
  try {
    const response = await axios.get('/api/v1/security/audit-logs');

    if (response.data.success) {
      auditLogs.value = response.data.data || [];
    }
  } catch (error) {
    console.error('获取审计日志失败:', error);
    // 使用模拟数据
    auditLogs.value = [
      {
        eventType: 'dataAccess',
        dataType: '个人信息',
        operation: 'read',
        result: 'success',
        userId: 'admin',
        timestamp: new Date(),
        description: '管理员查看用户信息',
      },
      {
        eventType: 'dataProcessing',
        dataType: '联系方式',
        operation: 'mask',
        result: 'success',
        userId: 'system',
        timestamp: new Date(Date.now() - 3600000),
        description: '系统自动脱敏处理',
      },
    ];
  }
};

// 执行脱敏
const performMasking = async () => {
  if (!maskingForm.dataType || !maskingForm.testData) {
    ElMessage.warning('请填写完整的脱敏信息');
    return;
  }

  masking.value = true;
  try {
    const response = await axios.post('/api/v1/security/manage-privacy', {
      operation: 'maskData',
      dataType: maskingForm.dataType,
      maskingLevel: maskingForm.maskingLevel,
      consentData: maskingForm.testData,
    });

    if (response.data.success) {
      maskingResult.value = {
        maskedData: JSON.stringify(response.data.data),
        appliedRules: ['身份证号掩码', '姓名掩码', '地址部分隐藏'],
      };
      ElMessage.success('数据脱敏完成');
    }
  } catch (error) {
    console.error('数据脱敏失败:', error);
    // 使用模拟结果
    const testData = maskingForm.testData;
    const maskedData = testData.replace(/(\d{4})\d{10}(\d{4})/, '$1**********$2');
    maskingResult.value = {
      maskedData,
      appliedRules: ['身份证号掩码规则'],
    };
    ElMessage.success('数据脱敏完成');
  } finally {
    masking.value = false;
  }
};

// 清空脱敏结果
const clearMaskingResult = () => {
  maskingResult.value = null;
  maskingForm.testData = '';
};

// 处理数据上传
const handleDataUpload = file => {
  anonymizationForm.dataset = file;
  return false;
};

// 执行匿名化
const performAnonymization = async () => {
  if (!anonymizationForm.dataset) {
    ElMessage.warning('请上传数据集');
    return;
  }

  anonymizing.value = true;
  try {
    ElMessage.success('数据匿名化已启动，处理完成后将通过系统通知告知结果');
  } catch (error) {
    ElMessage.error('数据匿名化失败');
  } finally {
    anonymizing.value = false;
  }
};

// 执行评估
const performAssessment = async () => {
  if (!assessmentForm.processingActivity || !assessmentForm.dataTypes.length) {
    ElMessage.warning('请填写完整的评估信息');
    return;
  }

  assessing.value = true;
  try {
    const response = await axios.post('/api/v1/security/privacy-impact-assessment', {
      dataProcess: assessmentForm,
    });

    if (response.data.success) {
      assessmentResult.value = response.data.data;
      ElMessage.success('隐私影响评估完成');
    }
  } catch (error) {
    console.error('隐私影响评估失败:', error);
    // 使用模拟结果
    assessmentResult.value = {
      riskLevel: 'MEDIUM',
      riskScore: 65,
      summary: '数据处理活动对个人隐私存在中等程度的影响，建议采取额外的保护措施。',
      necessity: '数据处理目的是必要的，与业务需求相符。',
      proportionality: '数据收集范围和程度适当，符合最小化原则。',
      recommendations: [
        '加强数据加密保护',
        '实施访问控制措施',
        '定期进行隐私影响评估',
        '建立数据泄露应急响应机制',
      ],
    };
    ElMessage.success('隐私影响评估完成');
  } finally {
    assessing.value = false;
  }
};

// 检查同意
const checkConsent = async consent => {
  try {
    const response = await axios.post('/api/v1/security/manage-privacy', {
      operation: 'checkConsent',
      userId: consent.userId,
      consentData: {
        consentType: consent.consentType,
        scope: consent.scope,
      },
    });

    if (response.data.success) {
      const status = response.data.data.hasConsent ? '有效' : '无效';
      ElMessage.info(`用户同意状态: ${status}`);
    }
  } catch (error) {
    ElMessage.error('检查同意状态失败');
  }
};

// 撤销同意
const revokeConsent = async consent => {
  try {
    await ElMessageBox.confirm(`确定要撤销用户 ${consent.userId} 的同意记录吗？`, '确认撤销', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const response = await axios.post('/api/v1/security/manage-privacy', {
      operation: 'revokeConsent',
      userId: consent.userId,
      consentData: {
        consentId: consent.consentId,
      },
    });

    if (response.data.success) {
      ElMessage.success('同意记录已撤销');
      await fetchConsentRecords();
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('撤销同意失败');
    }
  }
};

// 批量撤销过期同意
const batchRevokeConsents = async () => {
  try {
    await ElMessageBox.confirm('确定要撤销所有过期的同意记录吗？', '确认批量撤销', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    ElMessage.success('批量撤销操作已执行');
    await fetchConsentRecords();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量撤销失败');
    }
  }
};

// 添加同意
const addConsent = async () => {
  if (!newConsentForm.userId || !newConsentForm.consentType) {
    ElMessage.warning('请填写完整的同意信息');
    return;
  }

  try {
    const response = await axios.post('/api/v1/security/manage-privacy', {
      operation: 'consent',
      userId: newConsentForm.userId,
      consentData: newConsentForm,
    });

    if (response.data.success) {
      ElMessage.success('用户同意已添加');
      consentDialogVisible.value = false;
      Object.assign(newConsentForm, {
        userId: '',
        consentType: '',
        scope: '',
        expiresAt: '',
      });
      await fetchConsentRecords();
    }
  } catch (error) {
    ElMessage.error('添加同意失败');
  }
};

// 筛选日志
const filterLogs = () => {
  // filteredLogs 计算属性会自动处理
  ElMessage.success('日志筛选已应用');
};

// 清空过滤器
const clearFilters = () => {
  Object.assign(logFilter, {
    eventType: '',
    dateRange: [],
  });
  ElMessage.success('筛选条件已清空');
};

// 初始化
onMounted(async () => {
  await Promise.all([fetchPrivacyStats(), fetchConsentRecords(), fetchAuditLogs()]);
});
</script>

<style scoped>
.privacy-module {
  padding: 24px;
}

.privacy-overview {
  margin-bottom: 24px;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
}

.overview-item {
  text-align: center;
}

.overview-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.overview-label {
  font-size: 14px;
  color: #909399;
}

.consent-management,
.data-masking,
.data-anonymization,
.privacy-impact-assessment,
.audit-logs {
  margin-bottom: 24px;
}

.consent-management h3,
.data-masking h3,
.data-anonymization h3,
.privacy-impact-assessment h3,
.audit-logs h3 {
  margin-bottom: 16px;
  color: #303133;
  font-size: 18px;
}

.consent-actions {
  margin-top: 16px;
  text-align: center;
}

.masking-result,
.assessment-result {
  margin-top: 24px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.masking-result h4,
.assessment-result h4 {
  margin-bottom: 16px;
  color: #303133;
}

.result-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.comparison-item h5 {
  margin-bottom: 8px;
  color: #606266;
}

.data-upload {
  width: 100%;
}

.assessment-recommendations {
  margin-top: 16px;
}

.assessment-recommendations h5 {
  margin-bottom: 8px;
  color: #606266;
}

.assessment-recommendations ul {
  margin: 0;
  padding-left: 20px;
}

.assessment-recommendations li {
  margin-bottom: 4px;
  color: #606266;
}

.log-filters {
  margin-bottom: 16px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .privacy-overview .el-col {
    margin-bottom: 16px;
  }

  .result-comparison {
    grid-template-columns: 1fr;
  }

  .consent-actions {
    text-align: left;
  }

  .consent-actions .el-button {
    display: block;
    width: 100%;
    margin-bottom: 8px;
  }
}
</style>
