<template>
  <el-dialog v-model="dialogVisible" title="选择位置" width="600px" @close="handleClose">
    <div class="location-picker">
      <el-input v-model="searchKeyword" placeholder="搜索地址..." class="search-input">
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <div class="map-container">
        <div v-if="loading" class="map-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>地图加载中...</span>
        </div>
        <div v-else class="map-placeholder">
          <el-icon><Location /></el-icon>
          <span>地图组件占位</span>
          <p>请在项目中集成高德地图或百度地图</p>
        </div>
      </div>

      <div class="location-info">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="纬度">
            {{ selectedLocation?.latitude || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="经度">
            {{ selectedLocation?.longitude || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="地址">
            {{ selectedLocation?.address || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { Search, Loading, Location } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  defaultLocation: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'selected']);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

const searchKeyword = ref('');
const loading = ref(false);
const selectedLocation = ref(props.defaultLocation);

watch(
  () => props.defaultLocation,
  newVal => {
    selectedLocation.value = newVal;
  },
  { immediate: true }
);

const handleClose = () => {
  dialogVisible.value = false;
};

const handleConfirm = () => {
  if (selectedLocation.value) {
    emit('selected', selectedLocation.value);
  }
  handleClose();
};
</script>

<style scoped>
.location-picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-input {
  width: 100%;
}

.map-container {
  width: 100%;
  height: 300px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-loading,
.map-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #909399;
}

.map-placeholder p {
  margin: 0;
  font-size: 12px;
}

.location-info {
  margin-top: 8px;
}
</style>
