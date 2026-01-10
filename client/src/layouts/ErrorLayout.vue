<template>
  <div class="error-layout">
    <div class="error-container">
      <div class="error-content">
        <!-- 错误图标 -->
        <div class="error-icon">
          <el-icon :size="120">
            <component :is="errorIcon" />
          </el-icon>
        </div>

        <!-- 错误信息 -->
        <h1 class="error-code">{{ errorCode }}</h1>
        <h2 class="error-title">{{ errorTitle }}</h2>
        <p class="error-message">{{ errorMessage }}</p>

        <!-- 错误详情（仅开发环境） -->
        <div class="error-details" v-if="showDetails && isDevelopment">
          <el-collapse>
            <el-collapse-item title="查看详情" name="details">
              <pre class="error-stack">{{ errorDetails }}</pre>
            </el-collapse-item>
          </el-collapse>
        </div>

        <!-- 操作按钮 -->
        <div class="error-actions">
          <el-button type="primary" size="large" @click="handleGoHome">
            <el-icon><Home /></el-icon>
            返回首页
          </el-button>
          <el-button size="large" @click="handleGoBack">
            <el-icon><ArrowLeft /></el-icon>
            返回上一页
          </el-button>
          <el-button size="large" @click="handleRefresh">
            <el-icon><Refresh /></el-icon>
            刷新页面
          </el-button>
        </div>

        <!-- 快捷链接 -->
        <div class="quick-links">
          <el-link @click="$router.push('/auth/login')">登录</el-link>
          <el-link @click="$router.push('/help')">帮助中心</el-link>
          <el-link @click="handleReportError">报告错误</el-link>
        </div>
      </div>

      <!-- 底部信息 -->
      <footer class="error-footer">
        <p>© {{ currentYear }} 智慧乡村平台</p>
        <p class="version">版本 {{ version }}</p>
      </footer>
    </div>

    <!-- 背景装饰 -->
    <div class="error-bg">
      <div class="bg-shape shape-1"></div>
      <div class="bg-shape shape-2"></div>
      <div class="bg-shape shape-3"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  HomeFilled,
  ArrowLeft,
  Refresh,
  Warning,
  CircleClose,
  Connection,
  Lock,
  Document,
} from '@element-plus/icons-vue';

const router = useRouter();
const route = useRoute();

const currentYear = ref(new Date().getFullYear());
const version = ref('2.0.0');
const isDevelopment = ref(import.meta.env.DEV);

// 错误类型配置
const errorConfig = {
  400: {
    icon: Document,
    title: '请求错误',
    message: '您发送的请求有误，请检查后重试。',
  },
  401: {
    icon: Lock,
    title: '未授权访问',
    message: '您需要登录后才能访问此页面。',
  },
  403: {
    icon: CircleClose,
    title: '访问被拒绝',
    message: '您没有权限访问此页面，请联系管理员。',
  },
  404: {
    icon: Connection,
    title: '页面未找到',
    message: '您访问的页面不存在或已被移除。',
  },
  500: {
    icon: Warning,
    title: '服务器错误',
    message: '服务器出了点问题，请稍后重试。',
  },
  503: {
    icon: Warning,
    title: '服务不可用',
    message: '服务暂时不可用，请稍后重试。',
  },
};

// 获取错误码
const errorCode = computed(() => {
  return route.query.code || route.meta.errorCode || 404;
});

// 获取错误配置
const errorConfigItem = computed(() => {
  return errorConfig[errorCode.value] || errorConfig[404];
});

const errorIcon = computed(() => errorConfigItem.value.icon);
const errorTitle = computed(() => errorConfigItem.value.title);
const errorMessage = computed(() => errorConfigItem.value.message);

// 错误详情
const errorDetails = computed(() => {
  return route.query.message || route.meta.errorMessage || '无详细信息';
});

const showDetails = computed(() => {
  return route.query.showDetails === 'true' || route.meta.showDetails;
});

// 导航操作
const handleGoHome = () => {
  router.push('/');
};

const handleGoBack = () => {
  router.back();
};

const handleRefresh = () => {
  window.location.reload();
};

const handleReportError = () => {
  // 报告错误逻辑
  const errorInfo = {
    code: errorCode.value,
    path: route.path,
    time: new Date().toISOString(),
    userAgent: navigator.userAgent,
  };

  console.log('Error reported:', errorInfo);

  ElMessage({
    message: '错误已报告，感谢您的反馈！',
    type: 'success',
    duration: 3000,
  });
};

onMounted(() => {
  // 记录错误日志
  console.error(`Error ${errorCode.value}:`, errorMessage.value);
});
</script>

<style scoped>
.error-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
  padding: 20px;
}

.error-container {
  position: relative;
  z-index: 1;
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.error-content {
  background: white;
  border-radius: 20px;
  padding: 48px 32px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.error-icon {
  color: #667eea;
  margin-bottom: 24px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.error-code {
  font-size: 72px;
  font-weight: 800;
  margin: 0 0 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.error-title {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px;
}

.error-message {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 32px;
  line-height: 1.6;
}

.error-details {
  text-align: left;
  margin-bottom: 32px;
}

.error-stack {
  font-family: monospace;
  font-size: 12px;
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}

.error-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.quick-links {
  display: flex;
  gap: 24px;
  justify-content: center;
}

.quick-links .el-link {
  color: #6b7280;
}

.quick-links .el-link:hover {
  color: #667eea;
}

.error-footer {
  margin-top: 32px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}

.error-footer p {
  margin: 4px 0;
}

.version {
  opacity: 0.6;
}

/* 背景装饰 */
.error-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.bg-shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.shape-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -100px;
}

.shape-2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: -50px;
}

.shape-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .error-content {
    padding: 32px 20px;
  }

  .error-code {
    font-size: 56px;
  }

  .error-title {
    font-size: 24px;
  }

  .error-actions {
    flex-direction: column;
  }

  .error-actions .el-button {
    width: 100%;
  }

  .quick-links {
    flex-direction: column;
    gap: 12px;
  }
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
