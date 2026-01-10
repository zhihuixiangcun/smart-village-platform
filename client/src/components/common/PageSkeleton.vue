<template>
  <div class="skeleton-wrapper" :class="{ active: loading }">
    <div class="skeleton-header">
      <el-skeleton animated>
        <template #template>
          <el-skeleton-item variant="circle" :size="60" />
        </template>
      </el-skeleton>
      <div class="skeleton-info">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="text" style="width: 40%" />
          </template>
        </el-skeleton>
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="text" style="width: 60%; margin-top: 8px" />
          </template>
        </el-skeleton>
      </div>
    </div>

    <el-skeleton animated>
      <template #template>
        <div class="skeleton-cards">
          <el-skeleton-item v-for="i in 4" :key="i" variant="card" class="skeleton-card" />
        </div>
      </template>
    </el-skeleton>

    <el-skeleton animated>
      <template #template>
        <div class="skeleton-list">
          <el-skeleton-item v-for="i in 6" :key="i" variant="row" class="skeleton-row" />
        </div>
      </template>
    </el-skeleton>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  loading?: boolean;
}>();
</script>

<style scoped>
.skeleton-wrapper {
  padding: 20px;
}

.skeleton-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.skeleton-info {
  flex: 1;
}

.skeleton-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.skeleton-card {
  height: 120px;
  border-radius: 8px;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-row {
  height: 60px;
  border-radius: 4px;
}
</style>
