<template>
  <div class="error-view">
    <div class="error-container">
      <div class="error-content">
        <h1 class="error-code">{{ errorCode }}</h1>
        <h2 class="error-title">页面未找到</h2>
        <p class="error-description">{{ description }}</p>
        <div class="error-actions">
          <el-button type="primary" @click="goHome">返回首页</el-button>
          <el-button @click="goBack">返回上一页</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const title = ref('页面未找到');

const errorCode = computed(() => {
  if (title.value.includes('403')) return '403';
  if (title.value.includes('404')) return '404';
  if (title.value.includes('500')) return '500';
  return 'Error';
});

const description = computed(() => {
  if (title.value.includes('403')) return '抱歉，您没有权限访问此页面';
  if (title.value.includes('404')) return '抱歉，您访问的页面不存在';
  if (title.value.includes('500')) return '抱歉，服务器出现了错误';
  return '系统出现了未知错误';
});

const goHome = () => {
  router.push('/');
};

const goBack = () => {
  router.go(-1);
};
</script>

<style lang="scss" scoped>
.error-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-container {
  text-align: center;
  color: white;
}

.error-code {
  font-size: 120px;
  font-weight: bold;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.error-title {
  font-size: 32px;
  margin: 20px 0 10px;
}

.error-description {
  font-size: 18px;
  margin: 0 0 40px;
  opacity: 0.9;
}

.error-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}
</style>
