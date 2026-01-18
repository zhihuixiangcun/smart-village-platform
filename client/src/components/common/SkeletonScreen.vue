<template>
  <div class="skeleton-screen">
    <!-- 卡片类型 -->
    <template v-if="type === 'card'">
      <el-skeleton animated>
        <template #template>
          <el-skeleton-item
            v-for="i in rows"
            :key="i"
            variant="card"
            class="skeleton-card-item"
          />
        </template>
      </el-skeleton>
    </template>

    <!-- 列表类型 -->
    <template v-if="type === 'list'">
      <el-skeleton animated>
        <template #template>
          <el-skeleton-item
            v-for="i in rows"
            :key="i"
            variant="row"
            class="skeleton-list-item"
            style="width: 100%"
          />
        </template>
      </el-skeleton>
    </template>

    <!-- 图片类型 -->
    <template v-if="type === 'image'">
      <el-skeleton animated>
        <template #template>
          <el-skeleton-item
            v-for="i in rows"
            :key="i"
            variant="image"
            class="skeleton-image-item"
            style="width: 100%; height: 200px"
          />
        </template>
      </el-skeleton>
    </template>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'card' | 'list' | 'image';
  rows?: number;
}

withDefaults(defineProps<Props>(), {
  type: 'list',
  rows: 5,
});
</script>

<style scoped>
.skeleton-card-item {
  margin-bottom: 16px;
  border-radius: 8px;
  height: 120px;
}

.skeleton-list-item {
  margin-bottom: 12px;
  border-radius: 4px;
  height: 60px;
}

.skeleton-image-item {
  margin-bottom: 16px;
  border-radius: 8px;
}
</style>
