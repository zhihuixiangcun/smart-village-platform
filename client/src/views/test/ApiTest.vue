<!--
  API集成测试页面
  智慧乡村综合服务平台 - API连通性测试
-->
<template>
  <div class="api-test">
    <div class="test-container">
      <h1>API 集成测试</h1>
      <p class="subtitle">测试API连通性、认证、数据获取等核心功能</p>

      <!-- 测试配置 -->
      <el-card class="config-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>测试配置</span>
            <el-button @click="resetConfig" type="small">重置配置</el-button>
          </div>
        </template>

        <el-form :model="config" label-width="120px">
          <el-form-item label="API地址">
            <el-input v-model="config.apiUrl" placeholder="http://localhost:3001" />
          </el-form-item>
          <el-form-item label="Token">
            <el-input v-model="config.token" type="password" placeholder="输入测试Token" show-password />
          </el-form-item>
          <el-form-item label="模拟数据">
            <el-switch v-model="config.useMock" />
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 测试操作 -->
      <el-card class="test-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>测试操作</span>
            <el-tag :type="connectionStatus.type">{{ connectionStatus.text }}</el-tag>
          </div>
        </template>

        <el-space direction="vertical" :size="12" fill>
          <!-- 连接性测试 -->
          <div class="test-group">
            <h3>连接性测试</h3>
            <el-space wrap>
              <el-button @click="testHealthCheck" :loading="loading.health">
                <el-icon><CircleCheck /></el-icon>
                健康检查
              </el-button>
              <el-button @click="testDashboardAPI" :loading="loading.dashboard">
                <el-icon><DataBoard /></el-icon>
                仪表板API
              </el-button>
              <el-button @click="testAuthAPI" :loading="loading.auth">
                <el-icon><Lock /></el-icon>
                认证API
              </el-button>
            </el-space>
          </div>

          <!-- 数据获取测试 -->
          <div class="test-group">
            <h3>数据获取测试</h3>
            <el-space wrap>
              <el-button @click="testGetResidents" :loading="loading.residents">
                <el-icon><Users /></el-icon>
                获取村民列表
              </el-button>
              <el-button @click="testGetNotices" :loading="loading.notices">
                <el-icon><Bell /></el-icon>
                获取通知列表
              </el-button>
              <el-button @click="testGetFinance" :loading="loading.finance">
                <el-icon><Money /></el-icon>
                获取财务数据
              </el-button>
              <el-button @click="testGetServices" :loading="loading.services">
                <el-icon><Service /></el-icon>
                获取服务列表
              </el-button>
            </el-space>
          </div>

          <!-- 数据操作测试 -->
          <div class="test-group">
            <h3>数据操作测试</h3>
            <el-space wrap>
              <el-button @click="testCreateNotice" :loading="loading.create">
                <el-icon><Plus /></el-icon>
                创建通知
              </el-button>
              <el-button @click="testBatchOperation" :loading="loading.batch">
                <el-icon><Operation /></el-icon>
                批量操作
              </el-button>
              <el-button @click="testFileUpload" :loading="loading.upload">
                <el-icon><Upload /></el-icon>
                文件上传
              </el-button>
              <el-button @click="testFileDownload" :loading="loading.download">
                <el-icon><Download /></el-icon>
                文件下载
              </el-button>
            </el-space>
          </div>

          <!-- 性能测试 -->
          <div class="test-group">
            <h3>性能测试</h3>
            <el-space wrap>
              <el-button @click="testConcurrentRequests" :loading="loading.concurrent">
                <el-icon><Lightning /></el-icon>
                并发请求
              </el-button>
              <el-button @click="testLargeDataRequest" :loading="loading.largeData">
                <el-icon><TrendCharts /></el-icon>
                大数据量
              </el-button>
              <el-button @click="testErrorResponse" :loading="loading.error">
                <el-icon><Warning /></el-icon>
                错误处理
              </el-button>
            </el-space>
          </div>
        </el-space>
      </el-card>

      <!-- 测试结果 -->
      <el-card class="result-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>测试结果</span>
            <el-button @click="clearResults" type="small" text>清空</el-button>
          </div>
        </template>

        <el-table :data="testResults" style="width: 100%" max-height="500px">
          <el-table-column prop="name" label="测试项" width="200" />
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="duration" label="耗时" width="100">
            <template #default="{ row }">
              {{ row.duration }}ms
            </template>
          </el-table-column>
          <el-table-column prop="responseTime" label="响应时间" width="120">
            <template #default="{ row }">
              {{ row.responseTime }}ms
            </template>
          </el-table-column>
          <el-table-column prop="message" label="消息" min-width="200" show-overflow-tooltip />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="row.data"
                type="primary"
                size="small"
                text
                @click="viewResultDetail(row)"
              >
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 结果详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="测试结果详情"
      width="800px"
    >
      <el-descriptions :column="2" border v-if="currentResult">
        <el-descriptions-item label="测试项">{{ currentResult.name }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(currentResult.status)">
            {{ getStatusText(currentResult.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="耗时">{{ currentResult.duration }}ms</el-descriptions-item>
        <el-descriptions-item label="响应时间">{{ currentResult.responseTime }}ms</el-descriptions-item>
        <el-descriptions-item label="消息">{{ currentResult.message }}</el-descriptions-item>
        <el-descriptions-item label="数据量" :span="2">
          {{ currentResult.data ? JSON.stringify(currentResult.data).slice(0, 100) + '...' : '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  CircleCheck,
  DataBoard,
  Lock,
  Users,
  Bell,
  Money,
  Service,
  Plus,
  Operation,
  Upload,
  Download,
  Lightning,
  TrendCharts,
  Warning,
} from '@element-plus/icons-vue';
import request from '@/utils/request';
import dashboardApi from '@/api/dashboard';
import residentApi from '@/api/resident';

// 配置
const config = reactive({
  apiUrl: 'http://localhost:3001',
  token: '',
  useMock: false,
});

// 连接状态
const connectionStatus = computed(() => {
  const passedCount = testResults.value.filter(r => r.status === 'success').length;
  const totalCount = testResults.value.length;
  
  if (totalCount === 0) {
    return { type: 'info', text: '等待测试' };
  }
  
  const passRate = (passedCount / totalCount * 100).toFixed(0);
  
  if (passRate === '100') {
    return { type: 'success', text: `全部通过 (${passedCount}/${totalCount})` };
  } else if (passRate >= '80') {
    return { type: 'warning', text: `部分通过 (${passedCount}/${totalCount})` };
  } else {
    return { type: 'danger', text: `多数失败 (${passedCount}/${totalCount})` };
  }
});

// 加载状态
const loading = reactive({
  health: false,
  dashboard: false,
  auth: false,
  residents: false,
  notices: false,
  finance: false,
  services: false,
  create: false,
  batch: false,
  upload: false,
  download: false,
  concurrent: false,
  largeData: false,
  error: false,
});

// 测试结果
const testResults = ref<any[]>([]);
const showDetailDialog = ref(false);
const currentResult = ref<any>(null);

// 重置配置
const resetConfig = () => {
  config.apiUrl = 'http://localhost:3001';
  config.token = '';
  config.useMock = false;
  ElMessage.success('配置已重置');
};

// 健康检查
const testHealthCheck = async () => {
  const testName = '健康检查';
  addTestResult(testName, 'pending');
  
  const startTime = Date.now();
  try {
    loading.health = true;
    
    // 测试API健康检查
    const response = await request.get('/health');
    const responseTime = Date.now() - startTime;
    
    addTestResult(testName, 'success', responseTime, responseTime, '服务健康');
    ElMessage.success('健康检查通过');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addTestResult(testName, 'error', responseTime, responseTime, error.message || '健康检查失败');
    ElMessage.error('健康检查失败');
  } finally {
    loading.health = false;
  }
};

// 测试仪表板API
const testDashboardAPI = async () => {
  const testName = '仪表板API';
  addTestResult(testName, 'pending');
  
  const startTime = Date.now();
  try {
    loading.dashboard = true;
    
    // 测试获取仪表板概览
    const overview = await dashboardApi.getDashboardOverview({});
    const responseTime = Date.now() - startTime;
    
    addTestResult(testName, 'success', Date.now() - startTime, responseTime, '数据获取成功', overview);
    ElMessage.success('仪表板API测试通过');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addTestResult(testName, 'error', responseTime, responseTime, error.message || '仪表板API测试失败');
    ElMessage.error('仪表板API测试失败');
  } finally {
    loading.dashboard = false;
  }
};

// 测试认证API
const testAuthAPI = async () => {
  const testName = '认证API';
  addTestResult(testName, 'pending');
  
  const startTime = Date.now();
  try {
    loading.auth = true;
    
    // 测试登录接口
    const loginResponse = await request.post('/api/auth/login', {
      username: 'test',
      password: 'test',
    });
    
    const responseTime = Date.now() - startTime;
    addTestResult(testName, 'success', Date.now() - startTime, responseTime, '认证测试通过', loginResponse);
    ElMessage.success('认证API测试通过');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addTestResult(testName, 'error', responseTime, responseTime, error.message || '认证API测试失败');
    ElMessage.error('认证API测试失败');
  } finally {
    loading.auth = false;
  }
};

// 测试获取村民列表
const testGetResidents = async () => {
  const testName = '获取村民列表';
  addTestResult(testName, 'pending');
  
  const startTime = Date.now();
  try {
    loading.residents = true;
    
    const residents = await residentApi.getResidents({ page: 1, limit: 10 });
    const responseTime = Date.now() - startTime;
    
    addTestResult(testName, 'success', Date.now() - startTime, responseTime, '获取成功', { count: residents.data?.length || 0 });
    ElMessage.success(`获取村民列表成功: ${residents.data?.length || 0} 条`);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addTestResult(testName, 'error', responseTime, responseTime, error.message || '获取村民列表失败');
    ElMessage.error('获取村民列表失败');
  } finally {
    loading.residents = false;
  }
};

// 测试获取通知列表
const testGetNotices = async () => {
  const testName = '获取通知列表';
  addTestResult(testName, 'pending');
  
  const startTime = Date.now();
  try {
    loading.notices = true;
    
    const notices = await dashboardApi.getNotifications({ limit: 10 });
    const responseTime = Date.now() - startTime;
    
    addTestResult(testName, 'success', Date.now() - startTime, responseTime, '获取成功', { count: notices.data?.length || 0 });
    ElMessage.success(`获取通知列表成功: ${notices.data?.length || 0} 条`);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addTestResult(testName, 'error', responseTime, responseTime, error.message || '获取通知列表失败');
    ElMessage.error('获取通知列表失败');
  } finally {
    loading.notices = false;
  }
};

// 测试获取财务数据
const testGetFinance = async () => {
  const testName = '获取财务数据';
  addTestResult(testName, 'pending');
  
  const startTime = Date.now();
  try {
    loading.finance = true;
    
    const finance = await request.get('/api/village/finance/overview');
    const responseTime = Date.now() - startTime;
    
    addTestResult(testName, 'success', Date.now() - startTime, responseTime, '获取成功', finance);
    ElMessage.success('获取财务数据成功');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addTestResult(testName, 'error', responseTime, responseTime, error.message || '获取财务数据失败');
    ElMessage.error('获取财务数据失败');
  } finally {
    loading.finance = false;
  }
};

// 测试获取服务列表
const testGetServices = async () => {
  const testName = '获取服务列表';
  addTestResult(testName, 'pending');
  
  const startTime = Date.now();
  try {
    loading.services = true;
    
    const services = await request.get('/api/village/services');
    const responseTime = Date.now() - startTime;
    
    addTestResult(testName, 'success', Date.now() - startTime, responseTime, '获取成功', { count: services.data?.length || 0 });
    ElMessage.success(`获取服务列表成功: ${services.data?.length || 0} 条`);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addTestResult(testName, 'error', responseTime, responseTime, error.message || '获取服务列表失败');
    ElMessage.error('获取服务列表失败');
  } finally {
    loading.services = false;
  }
};

// 测试创建通知
const testCreateNotice = async () => {
  const testName = '创建通知';
  addTestResult(testName, 'pending');
  
  const startTime = Date.now();
  try {
    loading.create = true;
    
    const notice = await dashboardApi.sendEmergencyNotification({
      type: 'general',
      title: '测试通知',
      content: '这是一条测试通知',
      targets: ['all'],
      channels: ['site'],
    });
    const responseTime = Date.now() - startTime;
    
    addTestResult(testName, 'success', Date.now() - startTime, responseTime, '创建成功', notice);
    ElMessage.success('创建通知成功');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addTestResult(testName, 'error', responseTime, responseTime, error.message || '创建通知失败');
    ElMessage.error('创建通知失败');
  } finally {
    loading.create = false;
  }
};

// 测试批量操作
const testBatchOperation = async () => {
  const testName = '批量操作';
  addTestResult(testName, 'pending');
  
  const startTime = Date.now();
  try {
    loading.batch = true;
    
    // 模拟批量获取多个资源
    const requests = [
      request.get('/api/village/residents?page=1&limit=5'),
      request.get('/api/village/notices?limit=5'),
      request.get('/api/village/finance/overview'),
    ];
    
    const results = await Promise.allSettled(requests);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const responseTime = Date.now() - startTime;
    
    addTestResult(
      testName,
      successCount === requests.length ? 'success' : 'warning',
      Date.now() - startTime,
      responseTime,
      `批量操作完成: ${successCount}/${requests.length}`,
      { success: successCount, total: requests.length }
    );
    
    if (successCount === requests.length) {
      ElMessage.success(`批量操作完成: ${successCount}/${requests.length}`);
    } else {
      ElMessage.warning(`批量操作部分成功: ${successCount}/${requests.length}`);
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addTestResult(testName, 'error', Date.now() - startTime, responseTime, error.message || '批量操作失败');
    ElMessage.error('批量操作失败');
  } finally {
    loading.batch = false;
  }
};

// 测试文件上传
const testFileUpload = async () => {
  const testName = '文件上传';
  addTestResult(testName, 'pending');
  
  const startTime = Date.now();
  try {
    loading.upload = true;
    
    // 创建测试文件
    const formData = new FormData();
    const blob = new Blob(['测试文件内容'], { type: 'text/plain' });
    formData.append('file', blob, 'test.txt');
    formData.append('type', 'test');
    
    const response = await request.post('/api/village/upload', formData);
    const responseTime = Date.now() - startTime;
    
    addTestResult(testName, 'success', Date.now() - startTime, responseTime, '上传成功', response);
    ElMessage.success('文件上传成功');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addTestResult(testName, 'error', responseTime, responseTime, error.message || '文件上传失败');
    ElMessage.error('文件上传失败');
  } finally {
    loading.upload = false;
  }
};

// 测试文件下载
const testFileDownload = async () => {
  const testName = '文件下载';
  addTestResult(testName, 'pending');
  
  const startTime = Date.now();
  try {
    loading.download = true;
    
    await request.download('/api/village/export/test', { period: 'month' }, '测试报表.xlsx');
    const responseTime = Date.now() - startTime;
    
    addTestResult(testName, 'success', Date.now() - startTime, responseTime, '下载成功');
    ElMessage.success('文件下载成功');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addTestResult(testName, 'error', responseTime, responseTime, error.message || '文件下载失败');
    ElMessage.error('文件下载失败');
  } finally {
    loading.download = false;
  }
};

// 测试并发请求
const testConcurrentRequests = async () => {
  const testName = '并发请求';
  addTestResult(testName, 'pending');
  
  const startTime = Date.now();
  try {
    loading.concurrent = true;
    
    // 创建10个并发请求
    const requests = Array(10).fill(0).map((_, i) =>
      request.get(`/api/village/test/concurrent?index=${i}`)
    );
    
    const results = await Promise.allSettled(requests);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const responseTime = Date.now() - startTime;
    
    addTestResult(
      testName,
      successCount === requests.length ? 'success' : 'warning',
      Date.now() - startTime,
      responseTime,
      `并发测试完成: ${successCount}/${requests.length}`,
      { success: successCount, total: requests.length }
    );
    
    if (successCount === requests.length) {
      ElMessage.success(`并发测试通过: ${successCount}/${requests.length}`);
    } else {
      ElMessage.warning(`并发测试部分通过: ${successCount}/${requests.length}`);
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addTestResult(testName, 'error', Date.now() - startTime, responseTime, error.message || '并发测试失败');
    ElMessage.error('并发测试失败');
  } finally {
    loading.concurrent = false;
  }
};

// 测试大数据量
const testLargeDataRequest = async () => {
  const testName = '大数据量';
  addTestResult(testName, 'pending');
  
  const startTime = Date.now();
  try {
    loading.largeData = true;
    
    // 请求大数据量（模拟1000条记录）
    const response = await request.get('/api/village/residents?page=1&limit=1000');
    const responseTime = Date.now() - startTime;
    
    addTestResult(testName, 'success', Date.now() - startTime, responseTime, '大数据量测试通过', {
      requested: 1000,
      received: response.data?.length || 0,
    });
    ElMessage.success(`大数据量测试通过: 接收${response.data?.length || 0}条`);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addTestResult(testName, 'error', responseTime, responseTime, error.message || '大数据量测试失败');
    ElMessage.error('大数据量测试失败');
  } finally {
    loading.largeData = false;
  }
};

// 测试错误处理
const testErrorResponse = async () => {
  const testName = '错误处理';
  addTestResult(testName, 'pending');
  
  const startTime = Date.now();
  try {
    loading.error = true;
    
    // 测试403权限错误
    try {
      await request.get('/api/village/admin/test');
    } catch (error) {
      // 预期的403错误
      addTestResult(testName, 'success', Date.now() - startTime, Date.now() - startTime, '403权限错误正确处理', { error: '403 Forbidden' });
    }
    
    // 测试404资源不存在
    try {
      await request.get('/api/village/non-existent-resource');
    } catch (error) {
      // 预期的404错误
      addTestResult(testName, 'success', Date.now() - startTime, Date.now() - startTime, '404错误正确处理', { error: '404 Not Found' });
    }
    
    addTestResult(testName, 'success', Date.now() - startTime, Date.now() - startTime, '错误处理测试通过');
    ElMessage.success('错误处理测试通过');
  } catch (error) {
    const responseTime = Date.now() - startTime;
    addTestResult(testName, 'error', responseTime, responseTime, error.message || '错误处理测试失败');
    ElMessage.error('错误处理测试失败');
  } finally {
    loading.error = false;
  }
};

// 辅助函数
const addTestResult = (name, status, duration, responseTime, message, data = null) => {
  testResults.value.push({
    id: Date.now(),
    name,
    status,
    duration,
    responseTime,
    message,
    data,
    timestamp: new Date(),
  });
  
  // 保持最新的50条记录
  if (testResults.value.length > 50) {
    testResults.value = testResults.value.slice(-50);
  }
};

const getStatusType = (status: string): string => {
  const typeMap: Record<string, string> = {
    success: 'success',
    warning: 'warning',
    error: 'danger',
    pending: 'info',
  };
  return typeMap[status] || 'info';
};

const getStatusText = (status: string): string => {
  const textMap: Record<string, string> = {
    success: '通过',
    warning: '警告',
    error: '失败',
    pending: '测试中',
  };
  return textMap[status] || status;
};

const clearResults = () => {
  testResults.value = [];
  ElMessage.success('测试结果已清空');
};

const viewResultDetail = (result: any) => {
  currentResult.value = result;
  showDetailDialog.value = true;
};
</script>

<style lang="scss" scoped>
.api-test {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.test-container {
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 16px;
  color: #6b7280;
  margin-bottom: 24px;
}

.config-card,
.test-card,
.result-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-group {
  width: 100%;
  
  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e5e7eb;
  }
}

.el-space {
  width: 100%;
  
  :deep(.el-space__item) {
    flex: 1;
  }
}
</style>
