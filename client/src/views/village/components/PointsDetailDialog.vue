<template>
  <el-dialog
    v-model="visible"
    title="积分明细"
    :width="isMobile ? '95%' : '500px'"
    center
    destroy-on-close
  >
    <div class="points-detail-dialog">
      <el-empty description="积分明细功能开发中" :image-size="80" />
    </div>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { useMobileAdaptation } from '@/composables/useMobileAdaptation';

const props = defineProps({
  visible: { type: Boolean, default: false },
  userPoints: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:visible']);

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
});

const { isMobile } = useMobileAdaptation();
</script>

<style scoped>
.points-detail-dialog {
  text-align: center;
  padding: 20px;
}
</style>
