<template>
  <div class="emergency-call">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>紧急呼叫</h2>
        </div>
      </template>
      <div class="call-content">
        <el-empty description="紧急呼叫功能开发中" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const loading = ref(false);
</script>

<style scoped>
.emergency-call {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-header h2 {
  margin: 0;
  font-size: 18px;
}
.call-content {
  min-height: 400px;
}
</style>
