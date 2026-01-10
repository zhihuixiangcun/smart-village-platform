<template>
  <div class="font-size-controller">
    <div class="controller-panel">
      <h4>字体大小调节</h4>
      <div class="size-controls">
        <button @click="decreaseSize" :disabled="currentSize <= 12">A-</button>
        <span class="size-display">{{ currentSize }}px</span>
        <button @click="increaseSize" :disabled="currentSize >= 24">A+</button>
      </div>
      <div class="preset-buttons">
        <button @click="setSize(14)">标准</button>
        <button @click="setSize(18)">较大</button>
        <button @click="setSize(22)">大字</button>
      </div>
      <button class="close-btn" @click="$emit('close')">关闭</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const emit = defineEmits<{
  (e: 'change-font-size', size: number): void;
  (e: 'close'): void;
}>();

const currentSize = ref(14);

const decreaseSize = () => {
  if (currentSize.value > 12) {
    currentSize.value -= 2;
    applySize();
  }
};

const increaseSize = () => {
  if (currentSize.value < 24) {
    currentSize.value += 2;
    applySize();
  }
};

const setSize = (size: number) => {
  currentSize.value = size;
  applySize();
};

const applySize = () => {
  document.documentElement.style.fontSize = `${currentSize.value}px`;
  localStorage.setItem('fontSize', String(currentSize.value));
  emit('change-font-size', currentSize.value);
};

onMounted(() => {
  const savedSize = localStorage.getItem('fontSize');
  if (savedSize) {
    currentSize.value = parseInt(savedSize);
    applySize();
  }
});
</script>

<style scoped lang="scss">
.font-size-controller {
  position: fixed;
  bottom: 100px;
  right: 24px;
  z-index: 1001;

  .controller-panel {
    background: white;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

    h4 {
      margin: 0 0 12px;
      font-size: 14px;
      color: #333;
    }

    .size-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;

      button {
        width: 36px;
        height: 36px;
        border: 1px solid #dcdfe6;
        border-radius: 6px;
        background: white;
        cursor: pointer;
        font-size: 16px;

        &:hover:not(:disabled) {
          border-color: #409eff;
          color: #409eff;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .size-display {
        min-width: 50px;
        text-align: center;
        font-weight: bold;
      }
    }

    .preset-buttons {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;

      button {
        flex: 1;
        padding: 8px;
        border: 1px solid #dcdfe6;
        border-radius: 6px;
        background: white;
        cursor: pointer;
        font-size: 12px;

        &:hover {
          border-color: #409eff;
          color: #409eff;
        }
      }
    }

    .close-btn {
      width: 100%;
      padding: 8px;
      border: none;
      border-radius: 6px;
      background: #f5f7fa;
      color: #666;
      cursor: pointer;

      &:hover {
        background: #e4e7ed;
      }
    }
  }
}
</style>
