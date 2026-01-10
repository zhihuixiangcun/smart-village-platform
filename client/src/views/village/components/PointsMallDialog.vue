<template>
  <el-dialog
    v-model="visible"
    title="积分商城"
    :width="isMobile ? '95%' : '600px'"
    center
    destroy-on-close
  >
    <div class="points-mall-dialog">
      <el-empty description="积分商城功能开发中" :image-size="100" />
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
.points-mall-dialog {
  text-align: center;
  padding: 20px;
}
</style>
