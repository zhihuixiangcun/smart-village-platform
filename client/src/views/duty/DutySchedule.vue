<template>
  <div class="duty-schedule">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>值班安排</h2>
        </div>
      </template>
      <div class="schedule-content">
        <el-empty description="值班安排功能开发中" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const loading = ref(false)
</script>

<style scoped>
.duty-schedule {
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
.schedule-content {
  min-height: 400px;
}
</style>
