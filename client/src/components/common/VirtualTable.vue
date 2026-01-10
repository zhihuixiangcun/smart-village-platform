<template>
  <div class="virtual-table-container" ref="containerRef">
    <div class="table-header" :style="{ transform: `translateX(-${scrollLeft}px)` }">
      <table class="virtual-table">
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              :style="{ width: column.width + 'px', minWidth: column.minWidth + 'px' }"
              :class="column.className"
            >
              <div class="header-cell">
                <span>{{ column.title }}</span>
                <el-icon
                  v-if="column.sortable"
                  class="sort-icon"
                  :class="getSortClass(column.key)"
                  @click="handleSort(column.key)"
                >
                  <Sort />
                </el-icon>
              </div>
            </th>
          </tr>
        </thead>
      </table>
    </div>

    <div
      class="table-body"
      ref="bodyRef"
      @scroll="handleScroll"
      :style="{ height: containerHeight + 'px' }"
    >
      <div class="virtual-spacer" :style="{ height: totalHeight + 'px' }">
        <table class="virtual-table" :style="{ transform: `translateY(${offsetY}px)` }">
          <tbody>
            <tr
              v-for="(item, index) in visibleItems"
              :key="getRowKey ? getRowKey(item) : index"
              class="table-row"
              :class="{
                selected: selectedItems.includes(item),
                hover: hoveredIndex === startIndex + index,
              }"
              @click="handleRowClick(item, startIndex + index)"
              @mouseenter="hoveredIndex = startIndex + index"
              @mouseleave="hoveredIndex = -1"
            >
              <td
                v-for="column in columns"
                :key="column.key"
                :style="{ width: column.width + 'px', minWidth: column.minWidth + 'px' }"
                :class="column.className"
              >
                <div class="cell-content">
                  <slot
                    v-if="column.slot"
                    :name="column.slot"
                    :row="item"
                    :index="startIndex + index"
                    :column="column"
                  />
                  <template v-else>
                    {{ getCellValue(item, column.key) }}
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 加载更多指示器 -->
    <div v-if="loading" class="loading-indicator">
      <el-loading-spinner />
      <span>加载中...</span>
    </div>

    <!-- 性能监控面板 -->
    <div v-if="showPerformancePanel" class="performance-panel">
      <div class="perf-item">
        <span>渲染项数: {{ visibleItems.length }} / {{ totalItems }}</span>
      </div>
      <div class="perf-item">
        <span>滚动位置: {{ Math.round(scrollTop) }}px</span>
      </div>
      <div class="perf-item">
        <span>内存使用: {{ memoryUsage }}MB</span>
      </div>
      <div class="perf-item">
        <span>FPS: {{ fps }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Sort } from '@element-plus/icons-vue';

// Props
const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  columns: {
    type: Array,
    required: true,
  },
  itemHeight: {
    type: Number,
    default: 50,
  },
  containerHeight: {
    type: Number,
    default: 400,
  },
  buffer: {
    type: Number,
    default: 5,
  },
  getRowKey: {
    type: Function,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  showPerformancePanel: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(['row-click', 'selection-change', 'sort-change', 'scroll-bottom']);

// 响应式数据
const containerRef = ref();
const bodyRef = ref();
const scrollTop = ref(0);
const scrollLeft = ref(0);
const selectedItems = ref([]);
const hoveredIndex = ref(-1);
const sortField = ref('');
const sortOrder = ref(''); // 'asc' | 'desc' | ''

// 性能监控
const fps = ref(0);
const memoryUsage = ref(0);
const lastFrameTime = ref(0);
const frameCount = ref(0);

// 计算属性
const totalItems = computed(() => props.data.length);
const totalHeight = computed(() => totalItems.value * props.itemHeight);

const visibleCount = computed(() => {
  return Math.ceil(props.containerHeight / props.itemHeight) + props.buffer * 2;
});

const startIndex = computed(() => {
  return Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.buffer);
});

const endIndex = computed(() => {
  return Math.min(totalItems.value, startIndex.value + visibleCount.value);
});

const visibleItems = computed(() => {
  return props.data.slice(startIndex.value, endIndex.value);
});

const offsetY = computed(() => {
  return startIndex.value * props.itemHeight;
});

// 方法
const handleScroll = event => {
  const target = event.target;
  scrollTop.value = target.scrollTop;
  scrollLeft.value = target.scrollLeft;

  // 检测是否滚动到底部
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 10) {
    emit('scroll-bottom');
  }

  // 性能监控
  updatePerformanceMetrics();
};

const handleRowClick = (item, index) => {
  emit('row-click', item, index);
};

const handleSort = field => {
  if (sortField.value === field) {
    // 切换排序方向
    if (sortOrder.value === 'asc') {
      sortOrder.value = 'desc';
    } else if (sortOrder.value === 'desc') {
      sortOrder.value = '';
      sortField.value = '';
    } else {
      sortOrder.value = 'asc';
    }
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }

  emit('sort-change', {
    field: sortField.value,
    order: sortOrder.value,
  });
};

const getSortClass = field => {
  if (sortField.value !== field) return '';
  return {
    'sort-asc': sortOrder.value === 'asc',
    'sort-desc': sortOrder.value === 'desc',
  };
};

const getCellValue = (row, key) => {
  const keys = key.split('.');
  let value = row;
  for (const k of keys) {
    value = value?.[k];
  }
  return value;
};

const updatePerformanceMetrics = () => {
  const now = performance.now();

  if (lastFrameTime.value) {
    frameCount.value++;
    if (now - lastFrameTime.value >= 1000) {
      fps.value = Math.round((frameCount.value * 1000) / (now - lastFrameTime.value));
      frameCount.value = 0;
      lastFrameTime.value = now;
    }
  } else {
    lastFrameTime.value = now;
  }

  // 内存使用情况 (近似值)
  if (performance.memory) {
    memoryUsage.value = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
  }
};

// 滚动到指定位置
const scrollToIndex = index => {
  if (bodyRef.value) {
    const targetScrollTop = index * props.itemHeight;
    bodyRef.value.scrollTop = targetScrollTop;
  }
};

// 选择/取消选择行
const toggleRowSelection = item => {
  const index = selectedItems.value.indexOf(item);
  if (index > -1) {
    selectedItems.value.splice(index, 1);
  } else {
    selectedItems.value.push(item);
  }
  emit('selection-change', selectedItems.value);
};

// 清除选择
const clearSelection = () => {
  selectedItems.value = [];
  emit('selection-change', selectedItems.value);
};

// 全选/取消全选
const toggleSelectAll = () => {
  if (selectedItems.value.length === props.data.length) {
    clearSelection();
  } else {
    selectedItems.value = [...props.data];
    emit('selection-change', selectedItems.value);
  }
};

// 暴露方法
defineExpose({
  scrollToIndex,
  toggleRowSelection,
  clearSelection,
  toggleSelectAll,
  getSelectedItems: () => selectedItems.value,
});

// 生命周期
onMounted(() => {
  // 初始化性能监控
  if (props.showPerformancePanel) {
    updatePerformanceMetrics();
  }
});

// 监听数据变化
watch(
  () => props.data,
  () => {
    // 数据变化时重置滚动位置
    if (bodyRef.value) {
      bodyRef.value.scrollTop = 0;
    }
    scrollTop.value = 0;
    clearSelection();
  }
);
</script>

<style lang="scss" scoped>
.virtual-table-container {
  position: relative;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;

  .table-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #fafafa;
    border-bottom: 1px solid #ebeef5;

    .virtual-table {
      width: 100%;
      border-collapse: collapse;

      th {
        padding: 12px 8px;
        text-align: left;
        font-weight: 600;
        color: #909399;
        background: #fafafa;
        border-right: 1px solid #ebeef5;

        &:last-child {
          border-right: none;
        }

        .header-cell {
          display: flex;
          align-items: center;
          justify-content: space-between;

          .sort-icon {
            cursor: pointer;
            color: #c0c4cc;
            transition: color 0.3s;

            &:hover {
              color: #409eff;
            }

            &.sort-asc {
              color: #409eff;
              transform: rotate(180deg);
            }

            &.sort-desc {
              color: #409eff;
            }
          }
        }
      }
    }
  }

  .table-body {
    overflow: auto;
    position: relative;

    .virtual-spacer {
      position: relative;
    }

    .virtual-table {
      width: 100%;
      border-collapse: collapse;

      .table-row {
        transition: background-color 0.2s;

        &:nth-child(even) {
          background-color: #fafafa;
        }

        &.hover {
          background-color: #f5f7fa;
        }

        &.selected {
          background-color: #ecf5ff;
        }

        td {
          padding: 12px 8px;
          border-right: 1px solid #ebeef5;
          border-bottom: 1px solid #ebeef5;

          &:last-child {
            border-right: none;
          }

          .cell-content {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
    }
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    color: #909399;
    gap: 8px;
  }

  .performance-panel {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;

    .perf-item {
      margin-bottom: 4px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

// 滚动条样式
.table-body::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-body::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.table-body::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;

  &:hover {
    background: #a8a8a8;
  }
}
</style>
