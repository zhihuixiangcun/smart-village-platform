<template>
  <div class="settings-panel">
    <div class="settings-section">
      <h3>显示设置</h3>
      <div class="setting-item">
        <span>适老化模式</span>
        <el-switch v-model="isElderlyMode" @change="handleElderlyModeChange" />
      </div>
      <div class="setting-item">
        <span>大字模式</span>
        <el-switch v-model="isLargeText" @change="handleLargeTextChange" />
      </div>
    </div>

    <div class="settings-section">
      <h3>语音设置</h3>
      <div class="setting-item">
        <span>语音播报</span>
        <el-switch v-model="voiceEnabled" />
      </div>
      <div class="setting-item">
        <span>方言选择</span>
        <el-select v-model="dialect" placeholder="选择方言" size="small">
          <el-option label="普通话" value="mandarin" />
          <el-option label="粤语" value="cantonese" />
          <el-option label="闽南语" value="minnan" />
        </el-select>
      </div>
    </div>

    <div class="settings-section">
      <h3>关于</h3>
      <div class="setting-item">
        <span>版本号</span>
        <span class="version">v1.0.0</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const emit = defineEmits(['close']);

const isElderlyMode = ref(false);
const isLargeText = ref(false);
const voiceEnabled = ref(true);
const dialect = ref('mandarin');

const handleElderlyModeChange = (value) => {
  document.body.classList.toggle('large-text-mode', value);
  localStorage.setItem('elderlyMode', value.toString());
};

const handleLargeTextChange = (value) => {
  document.body.classList.toggle('extra-large-text', value);
  localStorage.setItem('largeText', value.toString());
};

onMounted(() => {
  const savedElderly = localStorage.getItem('elderlyMode');
  const savedLargeText = localStorage.getItem('largeText');

  if (savedElderly === 'true') {
    isElderlyMode.value = true;
  }
  if (savedLargeText === 'true') {
    isLargeText.value = true;
  }
});
</script>

<style scoped lang="scss">
.settings-panel {
  padding: 16px;
}

.settings-section {
  margin-bottom: 24px;

  h3 {
    font-size: 14px;
    font-weight: 600;
    color: #909399;
    margin: 0 0 12px;
    text-transform: uppercase;
  }
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f5f7fa;

  &:last-child {
    border-bottom: none;
  }

  .version {
    font-size: 14px;
    color: #909399;
  }
}
</style>
