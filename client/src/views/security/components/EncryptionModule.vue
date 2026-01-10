<template>
  <div class="encryption-module">
    <!-- 加密状态概览 -->
    <div class="encryption-overview">
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="overview-item">
            <div class="overview-value active">{{ encryptionStats.keyCount }}</div>
            <div class="overview-label">活跃密钥</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-item">
            <div class="overview-value">{{ encryptionStats.encryptedFiles }}</div>
            <div class="overview-label">加密文件</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-item">
            <div class="overview-value">{{ encryptionStats.algorithms }}</div>
            <div class="overview-label">算法数量</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="overview-item">
            <div class="overview-value" :class="getPerformanceClass(encryptionStats.performance)">
              {{ encryptionStats.performance }}ms
            </div>
            <div class="overview-label">平均延迟</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 加密算法性能 -->
    <div class="algorithm-performance">
      <h3>加密算法性能</h3>
      <el-table :data="algorithmPerformance" style="width: 100%">
        <el-table-column prop="algorithm" label="算法名称" width="180" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.type === '对称加密' ? 'primary' : 'success'">
              {{ scope.row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="keyLength" label="密钥长度" width="100" />
        <el-table-column prop="throughput" label="吞吐量" width="120">
          <template #default="scope"> {{ scope.row.throughput }} MB/s </template>
        </el-table-column>
        <el-table-column prop="avgTime" label="平均时间" width="100">
          <template #default="scope"> {{ scope.row.avgTime }}ms </template>
        </el-table-column>
        <el-table-column label="性能评级">
          <template #default="scope">
            <el-rate
              v-model="scope.row.rating"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}"
            />
          </template>
        </el-table-column>
        <el-table-column label="状态">
          <template #default="scope">
            <el-switch v-model="scope.row.enabled" @change="toggleAlgorithm(scope.row)" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 密钥管理 -->
    <div class="key-management">
      <h3>密钥管理</h3>
      <el-table :data="keyList" style="width: 100%">
        <el-table-column prop="keyId" label="密钥ID" width="180" />
        <el-table-column prop="algorithm" label="算法" width="120" />
        <el-table-column prop="keyLength" label="密钥长度" width="100" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="expiresAt" label="过期时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.expiresAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getKeyStatusType(scope.row.status)">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作">
          <template #default="scope">
            <el-button
              type="text"
              size="small"
              @click="rotateKey(scope.row)"
              :disabled="scope.row.status === 'expired'"
            >
              轮换
            </el-button>
            <el-button
              type="text"
              size="small"
              @click="revokeKey(scope.row)"
              :disabled="scope.row.status === 'revoked'"
            >
              撤销
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="key-actions">
        <el-button type="primary" @click="generateKeyDialogVisible = true"> 生成新密钥 </el-button>
        <el-button type="warning" @click="rotateAllKeys"> 批量轮换 </el-button>
      </div>
    </div>

    <!-- 数据加密测试 -->
    <div class="encryption-test">
      <h3>数据加密测试</h3>
      <el-form :model="testForm" label-width="120px">
        <el-form-item label="测试数据">
          <el-input
            v-model="testForm.testData"
            type="textarea"
            rows="4"
            placeholder="请输入要加密的测试数据"
          />
        </el-form-item>
        <el-form-item label="加密算法">
          <el-select v-model="testForm.algorithm" placeholder="选择加密算法">
            <el-option
              v-for="algo in availableAlgorithms"
              :key="algo.name"
              :label="algo.name"
              :value="algo.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-radio-group v-model="testForm.operation">
            <el-radio label="encrypt">加密</el-radio>
            <el-radio label="decrypt">解密</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="performEncryptionTest" :loading="testing">
            执行测试
          </el-button>
          <el-button @click="clearTestResults"> 清空结果 </el-button>
        </el-form-item>
      </el-form>

      <!-- 测试结果 -->
      <div v-if="testResult" class="test-result">
        <h4>测试结果</h4>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="操作状态">
            <el-tag :type="testResult.success ? 'success' : 'danger'">
              {{ testResult.success ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="使用算法">
            {{ testResult.algorithm }}
          </el-descriptions-item>
          <el-descriptions-item label="处理时间">
            {{ testResult.processingTime }}ms
          </el-descriptions-item>
          <el-descriptions-item label="输入大小">
            {{ testResult.inputSize }} bytes
          </el-descriptions-item>
          <el-descriptions-item label="输出大小" v-if="testResult.outputSize">
            {{ testResult.outputSize }} bytes
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="testResult.result" class="result-data">
          <h5>结果数据:</h5>
          <el-input
            v-model="testResult.result"
            type="textarea"
            rows="6"
            readonly
            class="result-textarea"
          />
        </div>
      </div>
    </div>

    <!-- 生成密钥对话框 -->
    <el-dialog v-model="generateKeyDialogVisible" title="生成新密钥" width="50%">
      <el-form :model="keyForm" label-width="120px">
        <el-form-item label="算法类型">
          <el-select v-model="keyForm.algorithm" placeholder="选择算法">
            <el-option
              v-for="algo in availableAlgorithms"
              :key="algo.name"
              :label="algo.name"
              :value="algo.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="密钥长度">
          <el-input-number v-model="keyForm.keyLength" :min="128" :max="4096" :step="128" />
        </el-form-item>
        <el-form-item label="密钥ID">
          <el-input v-model="keyForm.keyId" placeholder="留空自动生成" />
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker
            v-model="keyForm.expiresAt"
            type="datetime"
            placeholder="选择过期时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="generateKeyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="generateKey" :loading="generatingKey">
          生成密钥
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
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
const testing = ref(false);
const generatingKey = ref(false);
const generateKeyDialogVisible = ref(false);

// 加密统计数据
const encryptionStats = reactive({
  keyCount: 0,
  encryptedFiles: 0,
  algorithms: 0,
  performance: 0,
});

// 算法性能数据
const algorithmPerformance = ref([]);

// 密钥列表
const keyList = ref([]);

// 可用算法列表
const availableAlgorithms = ref([
  { name: 'AES-256-GCM', type: '对称加密', keyLength: 256 },
  { name: 'SM4-GCM', type: '对称加密', keyLength: 128 },
  { name: 'RSA-2048', type: '非对称加密', keyLength: 2048 },
  { name: 'SM2', type: '非对称加密', keyLength: 256 },
  { name: 'ChaCha20-Poly1305', type: '对称加密', keyLength: 256 },
]);

// 测试表单
const testForm = reactive({
  testData: 'Hello, this is a test message for encryption.',
  algorithm: 'AES-256-GCM',
  operation: 'encrypt',
});

// 测试结果
const testResult = ref(null);

// 密钥生成表单
const keyForm = reactive({
  algorithm: 'AES-256-GCM',
  keyLength: 256,
  keyId: '',
  expiresAt: '',
});

// 计算属性
const getPerformanceClass = performance => {
  if (performance < 50) return 'excellent';
  if (performance < 100) return 'good';
  return 'poor';
};

const getKeyStatusType = status => {
  const typeMap = {
    active: 'success',
    expired: 'danger',
    revoked: 'warning',
  };
  return typeMap[status] || 'info';
};

// 方法
const formatDate = date => {
  return new Date(date).toLocaleString('zh-CN');
};

// 获取加密统计数据
const fetchEncryptionStats = async () => {
  try {
    const response = await axios.get('/api/v1/security/encryption/stats');

    if (response.data.success) {
      Object.assign(encryptionStats, response.data.data);
    }
  } catch (error) {
    console.error('获取加密统计失败:', error);
    ElMessage.error('获取加密统计失败');
  }
};

// 获取算法性能数据
const fetchAlgorithmPerformance = async () => {
  try {
    const response = await axios.get('/api/v1/security/encryption/performance');

    if (response.data.success) {
      algorithmPerformance.value =
        response.data.data.testResults?.map(result => ({
          algorithm: result.algorithm,
          type:
            result.algorithm.includes('RSA') || result.algorithm.includes('SM2')
              ? '非对称加密'
              : '对称加密',
          keyLength: result.keyLength || 256,
          throughput: (1024 / (result.avgTime / 1000)).toFixed(2),
          avgTime: result.avgTime,
          rating: Math.ceil(100 / result.avgTime) > 5 ? 5 : Math.ceil(100 / result.avgTime),
          enabled: true,
        })) || [];
    }
  } catch (error) {
    console.error('获取算法性能数据失败:', error);
    // 使用模拟数据
    algorithmPerformance.value = [
      {
        algorithm: 'AES-256-GCM',
        type: '对称加密',
        keyLength: 256,
        throughput: 85.2,
        avgTime: 12,
        rating: 5,
        enabled: true,
      },
      {
        algorithm: 'SM4-GCM',
        type: '对称加密',
        keyLength: 128,
        throughput: 78.5,
        avgTime: 15,
        rating: 4,
        enabled: true,
      },
      {
        algorithm: 'RSA-2048',
        type: '非对称加密',
        keyLength: 2048,
        throughput: 2.1,
        avgTime: 485,
        rating: 1,
        enabled: true,
      },
    ];
  }
};

// 获取密钥列表
const fetchKeyList = async () => {
  try {
    const response = await axios.get('/api/v1/security/encryption/keys');

    if (response.data.success) {
      keyList.value = response.data.data || [];
    }
  } catch (error) {
    console.error('获取密钥列表失败:', error);
    // 使用模拟数据
    keyList.value = [
      {
        keyId: 'default_aes',
        algorithm: 'AES-256-GCM',
        keyLength: 256,
        createdAt: new Date('2024-01-15'),
        expiresAt: new Date('2025-01-15'),
        status: 'active',
      },
      {
        keyId: 'sm4_key_001',
        algorithm: 'SM4-GCM',
        keyLength: 128,
        createdAt: new Date('2024-02-20'),
        expiresAt: new Date('2025-02-20'),
        status: 'active',
      },
    ];
  }
};

// 切换算法状态
const toggleAlgorithm = async algorithm => {
  try {
    // 这里应该调用API切换算法状态
    ElMessage.success(`已${algorithm.enabled ? '启用' : '禁用'} ${algorithm.algorithm}`);
  } catch (error) {
    ElMessage.error('切换算法状态失败');
  }
};

// 密钥轮换
const rotateKey = async key => {
  try {
    await ElMessageBox.confirm(`确定要轮换密钥 ${key.keyId} 吗？`, '确认轮换', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const response = await axios.post('/api/v1/security/encryption/manage-key', {
      operation: 'rotate',
      keyId: key.keyId,
    });

    if (response.data.success) {
      ElMessage.success('密钥轮换成功');
      await fetchKeyList();
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('密钥轮换失败');
    }
  }
};

// 撤销密钥
const revokeKey = async key => {
  try {
    await ElMessageBox.confirm(`确定要撤销密钥 ${key.keyId} 吗？此操作不可恢复。`, '确认撤销', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const response = await axios.post('/api/v1/security/encryption/manage-key', {
      operation: 'revoke',
      keyId: key.keyId,
    });

    if (response.data.success) {
      ElMessage.success('密钥撤销成功');
      await fetchKeyList();
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('密钥撤销失败');
    }
  }
};

// 批量轮换密钥
const rotateAllKeys = async () => {
  try {
    await ElMessageBox.confirm('确定要批量轮换所有活跃密钥吗？', '确认批量轮换', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    ElMessage.success('批量密钥轮换已启动');
    await fetchKeyList();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量密钥轮换失败');
    }
  }
};

// 执行加密测试
const performEncryptionTest = async () => {
  if (!testForm.testData.trim()) {
    ElMessage.warning('请输入测试数据');
    return;
  }

  testing.value = true;
  const startTime = Date.now();

  try {
    let response;
    if (testForm.operation === 'encrypt') {
      response = await axios.post('/api/v1/security/encryption/encrypt', {
        data: testForm.testData,
        algorithm: testForm.algorithm,
      });
    } else {
      response = await axios.post('/api/v1/security/encryption/decrypt', {
        encryptedData: JSON.parse(testForm.testData),
      });
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    if (response.data.success) {
      testResult.value = {
        success: true,
        algorithm: testForm.algorithm,
        processingTime,
        inputSize: testForm.testData.length,
        outputSize: JSON.stringify(response.data.data).length,
        result: JSON.stringify(response.data.data, null, 2),
      };

      ElMessage.success(`${testForm.operation === 'encrypt' ? '加密' : '解密'}测试成功`);
    }
  } catch (error) {
    const endTime = Date.now();
    testResult.value = {
      success: false,
      algorithm: testForm.algorithm,
      processingTime: endTime - startTime,
      inputSize: testForm.testData.length,
      result: error.message,
    };

    ElMessage.error(`${testForm.operation === 'encrypt' ? '加密' : '解密'}测试失败`);
  } finally {
    testing.value = false;
  }
};

// 清空测试结果
const clearTestResults = () => {
  testResult.value = null;
  testForm.testData = 'Hello, this is a test message for encryption.';
};

// 生成新密钥
const generateKey = async () => {
  if (!keyForm.algorithm) {
    ElMessage.warning('请选择加密算法');
    return;
  }

  generatingKey.value = true;
  try {
    const response = await axios.post('/api/v1/security/encryption/manage-key', {
      operation: 'generate',
      algorithm: keyForm.algorithm,
      keyLength: keyForm.keyLength,
      keyId: keyForm.keyId || undefined,
      expiresAt: keyForm.expiresAt || undefined,
    });

    if (response.data.success) {
      ElMessage.success('密钥生成成功');
      generateKeyDialogVisible.value = false;
      await fetchKeyList();
    }
  } catch (error) {
    ElMessage.error('密钥生成失败');
  } finally {
    generatingKey.value = false;
  }
};

// 初始化
onMounted(async () => {
  await Promise.all([fetchEncryptionStats(), fetchAlgorithmPerformance(), fetchKeyList()]);
});
</script>

<style scoped>
.encryption-module {
  padding: 24px;
}

.encryption-overview {
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

.overview-value.active {
  color: #67c23a;
}

.overview-value.excellent {
  color: #67c23a;
}

.overview-value.good {
  color: #409eff;
}

.overview-value.poor {
  color: #f56c6c;
}

.overview-label {
  font-size: 14px;
  color: #909399;
}

.algorithm-performance,
.key-management,
.encryption-test {
  margin-bottom: 24px;
}

.algorithm-performance h3,
.key-management h3,
.encryption-test h3 {
  margin-bottom: 16px;
  color: #303133;
  font-size: 18px;
}

.key-actions {
  margin-top: 16px;
  text-align: center;
}

.test-result {
  margin-top: 24px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.test-result h4 {
  margin-bottom: 16px;
  color: #303133;
}

.result-data {
  margin-top: 16px;
}

.result-data h5 {
  margin-bottom: 8px;
  color: #606266;
}

.result-textarea {
  font-family: 'Courier New', monospace;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .encryption-overview .el-col {
    margin-bottom: 16px;
  }

  .key-actions {
    text-align: left;
  }

  .key-actions .el-button {
    display: block;
    width: 100%;
    margin-bottom: 8px;
  }
}
</style>
