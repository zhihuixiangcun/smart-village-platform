<template>
  <div class="personnel-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>人员管理</h2>
        </div>
      </template>
      <div class="personnel-content">
        <el-empty description="人员管理功能开发中" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const loading = ref(false)
</script>

<style scoped>
.personnel-management {
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
.personnel-content {
  min-height: 400px;
}
</style>
