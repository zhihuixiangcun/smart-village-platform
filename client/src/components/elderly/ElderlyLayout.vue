<template>
  <div class="elderly-layout" :class="{ 'elderly-mode': isElderlyMode }">
    <!-- 顶部导航栏 -->
    <header class="elderly-layout__header safe-area-top">
      <div class="header-left">
        <ElderlyButton
          v-if="showBack"
          type="text"
          size="large"
          icon="el-icon-arrow-left"
          @click="handleBack"
        >
          返回
        </ElderlyButton>
      </div>

      <h1 class="header-title">{{ title }}</h1>

      <div class="header-right">
        <ElderlyButton
          v-if="showMenu"
          type="text"
          size="large"
          icon="el-icon-more"
          @click="handleMenu"
        />
        <ElderlyButton
          v-if="showVoice"
          type="text"
          size="large"
          icon="el-icon-microphone"
          @click="handleVoice"
        />
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="elderly-layout__main" :class="mainClass">
      <slot></slot>
    </main>

    <!-- 底部导航栏 -->
    <nav v-if="showBottomNav" class="elderly-layout__nav safe-area-bottom">
      <div
        v-for="item in navItems"
        :key="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        @click="handleNav(item)"
      >
        <div class="nav-icon">
          <i :class="item.icon"></i>
        </div>
        <span class="nav-label">{{ item.label }}</span>
      </div>
    </nav>

    <!-- 离线提示 -->
    <div v-if="!isOnline" class="offline-banner">
      <i class="el-icon-warning-outline"></i>
      <span>网络已断开，部分功能受限</span>
    </div>

    <!-- 离线队列提示 -->
    <div v-if="queueLength > 0" class="queue-banner">
      <i class="el-icon-upload2"></i>
      <span>您有 {{ queueLength }} 条内容待同步</span>
      <ElderlyButton type="text" size="small" @click="syncNow"> 立即同步 </ElderlyButton>
    </div>

    <!-- 语音输入提示 -->
    <div v-if="voiceActive" class="voice-overlay" @click="stopVoice">
      <div class="voice-content" @click.stop>
        <div class="voice-wave">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p class="voice-text">{{ voiceText }}</p>
        <p class="voice-hint">点击停止录音</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useOnline, useOfflineQueue } from '@/composables/useDevice';
import ElderlyButton from './ElderlyButton.vue';

const props = defineProps({
  // 页面标题
  title: {
    type: String,
    default: '智慧乡村',
  },
  // 是否显示返回按钮
  showBack: {
    type: Boolean,
    default: true,
  },
  // 是否显示菜单按钮
  showMenu: {
    type: Boolean,
    default: false,
  },
  // 是否显示语音按钮
  showVoice: {
    type: Boolean,
    default: true,
  },
  // 是否显示底部导航
  showBottomNav: {
    type: Boolean,
    default: true,
  },
  // 主内容区域样式类
  mainClass: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['back', 'menu', 'voice']);

const router = useRouter();
const route = useRoute();

// 网络状态
const { isOnline } = useOnline();

// 离线队列
const { queueLength, syncQueue } = useOfflineQueue();

// 语音状态
const voiceActive = ref(false);
const voiceText = ref('正在聆听...');

// 大字模式
const isElderlyMode = ref(localStorage.getItem('elderly-mode') === 'true');

// 底部导航项
const navItems = ref([
  { path: '/home', label: '首页', icon: 'el-icon-house' },
  { path: '/services', label: '服务', icon: 'el-icon-service' },
  { path: '/notifications', label: '通知', icon: 'el-icon-bell' },
  { path: '/profile', label: '我的', icon: 'el-icon-user' },
]);

// 检查路由是否激活
const isActive = path => {
  return route.path.startsWith(path);
};

// 处理返回
const handleBack = () => {
  emit('back');
  router.back();
};

// 处理菜单
const handleMenu = () => {
  emit('menu');
};

// 处理语音
const handleVoice = async () => {
  emit('voice');

  try {
    // 检查浏览器支持
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别');
      return;
    }

    // 创建识别实例
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // 配置
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;

    // 开始识别
    recognition.start();
    voiceActive.value = true;
    voiceText.value = '正在聆听...';

    // 识别结果
    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;
      voiceText.value = transcript;
    };

    // 识别结束
    recognition.onend = () => {
      voiceActive.value = false;
      emit('voice-result', voiceText.value);
    };

    // 识别错误
    recognition.onerror = event => {
      console.error('语音识别错误:', event.error);
      voiceActive.value = false;
      alert('语音识别失败: ' + event.error);
    };
  } catch (error) {
    console.error('语音识别启动失败:', error);
  }
};

// 停止语音
const stopVoice = () => {
  voiceActive.value = false;
};

// 立即同步
const syncNow = async () => {
  try {
    await syncQueue();
    alert('同步成功！');
  } catch (error) {
    alert('同步失败: ' + error.message);
  }
};

// 处理导航
const handleNav = item => {
  router.push(item.path);
};

onMounted(() => {
  // 监听大字模式变化
  window.addEventListener('storage', e => {
    if (e.key === 'elderly-mode') {
      isElderlyMode.value = e.newValue === 'true';
    }
  });
});
</script>

<style lang="scss" scoped>
.elderly-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;

  // 顶部导航
  &__header {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    padding: 0 20px;
    background: #ffffff;
    border-bottom: 2px solid #e4e7ed;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

    .header-left,
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .header-left {
      justify-content: flex-start;
    }

    .header-right {
      justify-content: flex-end;
    }

    .header-title {
      flex: 2;
      text-align: center;
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  // 主内容
  &__main {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    padding-bottom: env(safe-area-inset-bottom);
  }

  // 底部导航
  &__nav {
    position: sticky;
    bottom: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-around;
    height: 72px;
    background: #ffffff;
    border-top: 2px solid #e4e7ed;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);

    .nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #909399;
      cursor: pointer;
      transition: all 0.3s ease;

      &:active {
        background: #f5f7fa;
      }

      &.active {
        color: #e85d4c;

        .nav-label {
          font-weight: 600;
        }

        &::after {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 48px;
          height: 4px;
          background: #e85d4c;
          border-radius: 0 0 4px 4px;
        }
      }

      .nav-icon {
        font-size: 28px;
        margin-bottom: 4px;
      }

      .nav-label {
        font-size: 14px;
        font-weight: 500;
      }
    }
  }
}

// 离线横幅
.offline-banner {
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: #fdf6ec;
  border-bottom: 2px solid #e6a23c;
  color: #e6a23c;
  font-size: 16px;
  font-weight: 500;

  i {
    font-size: 20px;
  }
}

// 队列横幅
.queue-banner {
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px 20px;
  background: #fef0f0;
  border-bottom: 2px solid #f56c6c;
  color: #f56c6c;
  font-size: 16px;
  font-weight: 500;

  i {
    font-size: 20px;
  }

  :deep(.elderly-button) {
    padding: 8px 16px;
    font-size: 14px;
  }
}

// 语音遮罩
.voice-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);

  .voice-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px;
    background: #ffffff;
    border-radius: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

    .voice-wave {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 32px;

      span {
        display: block;
        width: 8px;
        height: 32px;
        background: linear-gradient(135deg, #e85d4c 0%, #ff6b6b 100%);
        border-radius: 4px;
        animation: voiceWave 1s ease-in-out infinite;

        &:nth-child(1) {
          animation-delay: 0s;
        }
        &:nth-child(2) {
          animation-delay: 0.2s;
        }
        &:nth-child(3) {
          animation-delay: 0.4s;
        }
      }
    }

    .voice-text {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 16px;
      text-align: center;
    }

    .voice-hint {
      font-size: 16px;
      color: #757575;
    }
  }
}

@keyframes voiceWave {
  0%,
  100% {
    height: 32px;
  }
  50% {
    height: 48px;
  }
}

// 安全区域
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

// 大字模式
.elderly-mode {
  .elderly-layout {
    &__header {
      height: 72px;

      .header-title {
        font-size: 24px;
      }
    }

    &__nav {
      height: 80px;

      .nav-item {
        .nav-icon {
          font-size: 32px;
        }

        .nav-label {
          font-size: 16px;
        }
      }
    }
  }

  .voice-overlay {
    .voice-content {
      .voice-text {
        font-size: 28px;
      }

      .voice-hint {
        font-size: 18px;
      }
    }
  }
}
</style>
