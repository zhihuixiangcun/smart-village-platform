<template>
  <div class="error-boundary">
    <template v-if="hasError">
      <el-result icon="error" title="页面出错了" sub-title="很抱歉，页面发生了未预期的错误">
        <template #extra>
          <el-button type="primary" @click="handleRetry">
            <el-icon><Refresh /></el-icon>
            重新加载
          </el-button>
          <el-button @click="handleGoHome">
            <el-icon><Home /></el-icon>
            返回首页
          </el-button>
        </template>
      </el-result>

      <div v-if="showDetails" class="error-details">
        <el-collapse>
          <el-collapse-item title="错误详情" name="details">
            <pre>{{ errorMessage }}</pre>
          </el-collapse-item>
        </el-collapse>
      </div>
    </template>

    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';
import { useRouter } from 'vue-router';
import { Refresh, Home } from '@element-plus/icons-vue';

const router = useRouter();

const hasError = ref(false);
const errorMessage = ref('');
const showDetails = ref(false);

const handleRetry = () => {
  hasError.value = false;
  errorMessage.value = '';
  window.location.reload();
};

const handleGoHome = () => {
  router.push('/');
};

onErrorCaptured(err => {
  console.error('[ErrorBoundary] 捕获到错误:', err);
  hasError.value = true;
  errorMessage.value = err instanceof Error ? err.message : String(err);
  return false;
});
</script>

<style scoped>
.error-boundary {
  min-height: 100%;
}

.error-details {
  margin-top: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.error-details pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  color: #606266;
}
</style>
