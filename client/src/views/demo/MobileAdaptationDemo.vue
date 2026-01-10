<template>
  <div class="mobile-adaptation-demo">
    <!-- 顶部状态栏 -->
    <div class="demo-header">
      <div class="device-info">
        <span class="device-type">设备类型: {{ deviceInfo.deviceType }}</span>
        <span class="screen-size"
          >屏幕尺寸: {{ deviceInfo.screenWidth }}x{{ deviceInfo.screenHeight }}</span
        >
        <span class="orientation">方向: {{ deviceInfo.orientation }}</span>
      </div>
      <div class="demo-controls">
        <el-button @click="toggleTheme" size="small">切换主题</el-button>
        <el-button @click="testHaptic" size="small" type="primary">触觉反馈</el-button>
      </div>
    </div>

    <!-- 响应式网格演示 -->
    <div class="demo-section">
      <h2>响应式网格布局</h2>
      <div
        class="responsive-grid"
        v-responsive="{
          breakpoints: {
            mobile: { maxWidth: 767 },
            tablet: { minWidth: 768, maxWidth: 1023 },
            desktop: { minWidth: 1024 },
          },
        }"
      >
        <div class="grid-item" v-for="i in 12" :key="i">
          <div class="item-content">{{ i }}</div>
        </div>
      </div>
    </div>

    <!-- 触摸交互演示 -->
    <div class="demo-section">
      <h2>触摸交互功能</h2>
      <div class="touch-demo-grid">
        <!-- 基础触摸 -->
        <div class="touch-demo-box" v-touch="() => handleTouch('基础触摸')">
          <span class="touch-label">基础触摸</span>
          <span class="touch-count">{{ touchCount.basic }}</span>
        </div>

        <!-- 长按 -->
        <div
          class="touch-demo-box longpress"
          v-longpress="{ duration: 1000 }"
          @longpress="handleLongPress"
        >
          <span class="touch-label">长按 1 秒</span>
          <span class="touch-count">{{ touchCount.longpress }}</span>
        </div>

        <!-- 滑动 -->
        <div
          class="touch-demo-box swipe"
          v-swipe="{ direction: 'horizontal' }"
          @swipe="handleSwipe"
        >
          <span class="touch-label">左右滑动</span>
          <span class="touch-count">{{ touchCount.swipe }}</span>
        </div>

        <!-- 方向滑动 -->
        <div
          class="touch-demo-box directional-swipe"
          v-swipe="{ direction: 'both' }"
          @swipe="handleDirectionalSwipe"
        >
          <span class="touch-label">任意方向滑动</span>
          <span class="touch-count">{{ touchCount.directional }}</span>
        </div>
      </div>
    </div>

    <!-- 自适应布局演示 -->
    <div class="demo-section">
      <h2>自适应布局</h2>
      <div class="adaptive-container">
        <div class="adaptive-sidebar">
          <h3>侧边栏</h3>
          <p>在小屏幕上会隐藏或折叠</p>
        </div>
        <div class="adaptive-content">
          <h3>主内容区</h3>
          <p>内容会根据屏幕大小自动调整</p>
          <div class="content-grid">
            <div class="content-card" v-for="i in 8" :key="i">
              <h4>卡片 {{ i }}</h4>
              <p>响应式卡片内容</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 设备特性演示 -->
    <div class="demo-section">
      <h2>设备特性</h2>
      <div class="feature-list">
        <div class="feature-item" :class="{ active: deviceInfo.touchSupported }">
          <span class="feature-icon">👆</span>
          <span class="feature-name">触摸支持</span>
          <span class="feature-status">{{ deviceInfo.touchSupported ? '支持' : '不支持' }}</span>
        </div>
        <div class="feature-item" :class="{ active: deviceInfo.isMobile }">
          <span class="feature-icon">📱</span>
          <span class="feature-name">移动设备</span>
          <span class="feature-status">{{ deviceInfo.isMobile ? '是' : '否' }}</span>
        </div>
        <div class="feature-item" :class="{ active: deviceInfo.isTablet }">
          <span class="feature-icon">📱</span>
          <span class="feature-name">平板设备</span>
          <span class="feature-status">{{ deviceInfo.isTablet ? '是' : '否' }}</span>
        </div>
        <div class="feature-item" :class="{ active: deviceInfo.pixelRatio > 1 }">
          <span class="feature-icon">👁️</span>
          <span class="feature-name">高分辨率</span>
          <span class="feature-status">{{ deviceInfo.pixelRatio > 1 ? '是' : '否' }}</span>
        </div>
      </div>
    </div>

    <!-- 触摸反馈区域 -->
    <div class="demo-section">
      <h2>触摸反馈演示</h2>
      <div class="feedback-demo">
        <button class="feedback-btn" @click="testHapticFeedback('light')">轻量反馈</button>
        <button class="feedback-btn" @click="testHapticFeedback('medium')">中等反馈</button>
        <button class="feedback-btn" @click="testHapticFeedback('heavy')">强烈反馈</button>
        <button class="feedback-btn" @click="testHapticFeedback('success')">成功反馈</button>
        <button class="feedback-btn" @click="testHapticFeedback('warning')">警告反馈</button>
        <button class="feedback-btn" @click="testHapticFeedback('error')">错误反馈</button>
      </div>
    </div>

    <!-- 方向变化监听 -->
    <div class="demo-section">
      <h2>方向变化监听</h2>
      <div class="orientation-demo">
        <div class="orientation-indicator" :class="deviceInfo.orientation">
          <span class="orientation-icon">{{ orientationIcon }}</span>
          <span class="orientation-text">当前方向: {{ deviceInfo.orientation }}</span>
        </div>
        <div class="orientation-history">
          <h4>方向变化历史</h4>
          <div class="history-item" v-for="(item, index) in orientationHistory" :key="index">
            <span class="time">{{ formatTime(item.time) }}</span>
            <span class="from">{{ item.from }}</span>
            <span class="arrow">→</span>
            <span class="to">{{ item.to }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 自定义样式演示 -->
    <div class="demo-section">
      <h2>自定义样式演示</h2>
      <div class="style-demo">
        <div class="style-card">
          <h3>动态字体大小</h3>
          <p :style="{ fontSize: dynamicFontSize }">这段文字会根据屏幕大小动态调整</p>
          <el-slider
            v-model="fontScale"
            :min="0.5"
            :max="2"
            :step="0.1"
            @change="updateFontSize"
          ></el-slider>
        </div>
        <div class="style-card">
          <h3>动态间距</h3>
          <div class="spacing-demo" :style="{ padding: dynamicSpacing }">
            <div class="spacing-box">内边距动态调整</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useMobileAdaptation } from '@/composables/useMobileAdaptation';

export default {
  name: 'MobileAdaptationDemo',
  setup() {
    const { deviceInfo, hapticFeedback, addHapticClass, removeHapticClass } = useMobileAdaptation();

    // 触摸计数
    const touchCount = reactive({
      basic: 0,
      longpress: 0,
      swipe: 0,
      directional: 0,
    });

    // 方向历史
    const orientationHistory = ref([]);

    // 字体缩放
    const fontScale = ref(1);
    const dynamicFontSize = ref('16px');
    const dynamicSpacing = ref('16px');

    // 计算属性
    const orientationIcon = computed(() => {
      const icons = {
        portrait: '📱',
        landscape: '📱',
      };
      return icons[deviceInfo.orientation] || '📱';
    });

    // 监听方向变化
    let lastOrientation = deviceInfo.orientation;

    const handleOrientationChange = () => {
      if (deviceInfo.orientation !== lastOrientation) {
        orientationHistory.value.unshift({
          from: lastOrientation,
          to: deviceInfo.orientation,
          time: new Date(),
        });
        lastOrientation = deviceInfo.orientation;

        // 限制历史记录数量
        if (orientationHistory.value.length > 10) {
          orientationHistory.value = orientationHistory.value.slice(0, 10);
        }
      }
    };

    // 处理触摸事件
    const handleTouch = type => {
      touchCount.basic++;
      addHapticClass(event.target, 'light');
      console.log(`触摸事件: ${type}`);
    };

    // 处理长按
    const handleLongPress = () => {
      touchCount.longpress++;
      hapticFeedback('medium');
      console.log('长按事件触发');
    };

    // 处理滑动
    const handleSwipe = result => {
      touchCount.swipe++;
      hapticFeedback('light');
      console.log(`滑动事件: ${result.direction}`);
    };

    // 处理方向滑动
    const handleDirectionalSwipe = result => {
      touchCount.directional++;
      hapticFeedback('light');
      console.log(`方向滑动: ${result.direction}`);
    };

    // 测试触觉反馈
    const testHapticFeedback = type => {
      hapticFeedback(type);

      // 为按钮添加视觉反馈
      const btn = event.target;
      addHapticClass(btn, type);
      setTimeout(() => {
        removeHapticClass(btn, type);
      }, 300);
    };

    // 切换主题
    const toggleTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      }
      hapticFeedback('medium');
    };

    // 更新字体大小
    const updateFontSize = scale => {
      const baseSize = 16;
      dynamicFontSize.value = `${baseSize * scale}px`;
      dynamicSpacing.value = `${baseSize * scale}px`;
    };

    // 格式化时间
    const formatTime = date => {
      return date.toLocaleTimeString();
    };

    onMounted(() => {
      // 初始化主题
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }

      // 初始化字体大小
      updateFontSize(fontScale.value);

      // 开始监听方向变化
      const orientationTimer = setInterval(handleOrientationChange, 100);

      onUnmounted(() => {
        clearInterval(orientationTimer);
      });
    });

    return {
      deviceInfo,
      touchCount,
      orientationHistory,
      fontScale,
      dynamicFontSize,
      dynamicSpacing,
      orientationIcon,
      handleTouch,
      handleLongPress,
      handleSwipe,
      handleDirectionalSwipe,
      testHapticFeedback,
      toggleTheme,
      updateFontSize,
      formatTime,
    };
  },
};
</script>

<style scoped>
.mobile-adaptation-demo {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.demo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 16px;
  background: var(--el-bg-color-page);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.device-info {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.device-info span {
  background: var(--el-color-primary-light-9);
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 14px;
  color: var(--el-color-primary);
}

.demo-controls {
  display: flex;
  gap: 10px;
}

.demo-section {
  margin-bottom: 40px;
}

.demo-section h2 {
  margin-bottom: 20px;
  color: var(--el-text-color-primary);
  font-size: 24px;
  font-weight: 600;
}

/* 响应式网格 */
.responsive-grid {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}

.grid-item {
  background: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  border: 1px solid var(--el-border-color-light);
}

.item-content {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-color-primary);
}

/* 触摸演示 */
.touch-demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.touch-demo-box {
  background: var(--el-bg-color-page);
  border: 2px solid var(--el-border-color-light);
  border-radius: 12px;
  padding: 30px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  position: relative;
  overflow: hidden;
}

.touch-demo-box:hover {
  border-color: var(--el-color-primary);
  transform: translateY(-2px);
  box-shadow: var(--el-box-shadow-light);
}

.touch-demo-box.longpress {
  background: linear-gradient(
    135deg,
    var(--el-color-warning-light-9) 0%,
    var(--el-color-warning-light-8) 100%
  );
}

.touch-demo-box.swipe {
  background: linear-gradient(
    135deg,
    var(--el-color-success-light-9) 0%,
    var(--el-color-success-light-8) 100%
  );
}

.touch-demo-box.directional-swipe {
  background: linear-gradient(
    135deg,
    var(--el-color-info-light-9) 0%,
    var(--el-color-info-light-8) 100%
  );
}

.touch-label {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.touch-count {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: var(--el-color-primary);
}

/* 自适应布局 */
.adaptive-container {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 20px;
  margin-top: 20px;
}

.adaptive-sidebar {
  background: var(--el-bg-color-page);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.adaptive-content {
  background: var(--el-bg-color-page);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.content-card {
  background: var(--el-bg-color);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.content-card h4 {
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
}

.content-card p {
  color: var(--el-text-color-regular);
  font-size: 14px;
}

/* 设备特性 */
.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--el-bg-color-page);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  opacity: 0.6;
  transition: all 0.3s ease;
}

.feature-item.active {
  opacity: 1;
  border-color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.feature-icon {
  font-size: 24px;
}

.feature-name {
  flex: 1;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.feature-status {
  font-size: 12px;
  padding: 2px 8px;
  background: var(--el-color-info-light-9);
  border-radius: 12px;
  color: var(--el-color-info);
}

.feature-item.active .feature-status {
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

/* 触摸反馈演示 */
.feedback-demo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.feedback-btn {
  padding: 16px 24px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color-page);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.feedback-btn:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  transform: translateY(-2px);
  box-shadow: var(--el-box-shadow-light);
}

/* 方向演示 */
.orientation-demo {
  margin-top: 20px;
}

.orientation-indicator {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: var(--el-bg-color-page);
  border-radius: 12px;
  border: 2px solid var(--el-border-color-light);
  margin-bottom: 20px;
}

.orientation-icon {
  font-size: 48px;
}

.orientation-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.orientation-history {
  background: var(--el-bg-color-page);
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.orientation-history h4 {
  margin-bottom: 16px;
  color: var(--el-text-color-primary);
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.history-item:last-child {
  border-bottom: none;
}

.time {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.from,
.to {
  padding: 2px 8px;
  background: var(--el-color-primary-light-9);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-color-primary);
}

.arrow {
  color: var(--el-text-color-placeholder);
}

/* 样式演示 */
.style-demo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.style-card {
  background: var(--el-bg-color-page);
  padding: 24px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.style-card h3 {
  margin-bottom: 16px;
  color: var(--el-text-color-primary);
}

.spacing-demo {
  background: var(--el-bg-color);
  border-radius: 8px;
  margin-top: 16px;
  transition: all 0.3s ease;
}

.spacing-box {
  background: var(--el-color-primary-light-9);
  padding: 16px;
  border-radius: 4px;
  text-align: center;
  font-weight: 500;
  color: var(--el-color-primary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .demo-header {
    flex-direction: column;
    gap: 16px;
  }

  .device-info {
    justify-content: center;
  }

  .adaptive-container {
    grid-template-columns: 1fr;
  }

  .touch-demo-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .feedback-demo {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }

  .feature-list {
    grid-template-columns: 1fr;
  }

  .style-demo {
    grid-template-columns: 1fr;
  }

  .orientation-indicator {
    flex-direction: column;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .mobile-adaptation-demo {
    padding: 16px;
  }

  .device-info {
    flex-direction: column;
    gap: 8px;
  }

  .device-info span {
    font-size: 12px;
  }
}

/* 触觉反馈动画类 */
@keyframes haptic-light {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes haptic-medium {
  0%,
  100% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.08);
  }
  75% {
    transform: scale(1.08);
  }
}

@keyframes haptic-heavy {
  0%,
  100% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.1);
  }
  50% {
    transform: scale(1.05);
  }
  75% {
    transform: scale(1.1);
  }
}

@keyframes haptic-success {
  0% {
    transform: scale(1) rotate(0deg);
  }
  50% {
    transform: scale(1.08) rotate(2deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

@keyframes haptic-warning {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-3px);
  }
  75% {
    transform: translateX(3px);
  }
}

@keyframes haptic-error {
  0%,
  100% {
    transform: translateX(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-2px);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(2px);
  }
}

.haptic-light {
  animation: haptic-light 0.3s ease;
}

.haptic-medium {
  animation: haptic-medium 0.4s ease;
}

.haptic-heavy {
  animation: haptic-heavy 0.5s ease;
}

.haptic-success {
  animation: haptic-success 0.4s ease;
}

.haptic-warning {
  animation: haptic-warning 0.3s ease;
}

.haptic-error {
  animation: haptic-error 0.4s ease;
}
</style>
