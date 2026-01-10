<template>
  <el-dialog
    v-model="visible"
    title="我的户码"
    :width="isMobile ? '95%' : '400px'"
    center
    destroy-on-close
  >
    <div class="household-qr-dialog">
      <el-empty description="户码功能开发中" :image-size="80" />
    </div>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { useMobileAdaptation } from '@/composables/useMobileAdaptation';

const props = defineProps({
  visible: { type: Boolean, default: false },
  userInfo: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:visible']);

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
});

const { isMobile } = useMobileAdaptation();
</script>

<style scoped>
.household-qr-dialog {
  text-align: center;
  padding: 20px;
}
</style>
