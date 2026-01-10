<template>
  <transition name="hint-slide">
    <div class="accessibility-hint" v-if="show">
      <div class="hint-content">
        <div class="hint-icon">♿</div>
        <div class="hint-text">
          <h4>无障碍模式已启用</h4>
          <p>当前为大字模式，您可以：</p>
          <ul>
            <li>使用底部控制按钮调整字体大小</li>
            <li>点击右上角语音按钮使用语音交互</li>
            <li>长按页面元素获取语音提示</li>
          </ul>
        </div>
        <button class="dismiss-btn" @click="dismiss">知道了</button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const show = ref(true);

const dismiss = () => {
  show.value = false;
  localStorage.setItem('accessibilityHintDismissed', 'true');
  setTimeout(() => {
    emit('close');
  }, 300);
};

onMounted(() => {
  const dismissed = localStorage.getItem('accessibilityHintDismissed');
  if (dismissed) {
    show.value = false;
    emit('close');
  }
});
</script>

<style scoped lang="scss">
.accessibility-hint {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 1001;
  max-width: 360px;

  .hint-content {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    display: flex;
    gap: 16px;

    .hint-icon {
      font-size: 32px;
      flex-shrink: 0;
    }

    .hint-text {
      flex: 1;

      h4 {
        margin: 0 0 8px;
        font-size: 16px;
        color: #333;
      }

      p {
        margin: 0 0 8px;
        font-size: 13px;
        color: #666;
      }

      ul {
        margin: 0;
        padding-left: 16px;
        font-size: 12px;
        color: #888;

        li {
          margin-bottom: 4px;
        }
      }
    }

    .dismiss-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      background: #409eff;
      color: white;
      cursor: pointer;
      font-size: 12px;
      height: fit-content;
      align-self: flex-start;

      &:hover {
        background: #66b1ff;
      }
    }
  }
}

.hint-slide-enter-active,
.hint-slide-leave-active {
  transition: all 0.3s ease;
}

.hint-slide-enter-from,
.hint-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
