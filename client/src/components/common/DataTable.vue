<template>
  <div class="data-table">
    <!-- 搜索栏 -->
    <div v-if="showSearch" class="search-bar mb-4">
      <el-row :gutter="16">
        <el-col :span="searchColSpan">
          <el-input
            v-model="searchQuery"
            :placeholder="searchPlaceholder"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-col>
      </el-row>

      <!-- 高级搜索 -->
      <div v-if="showAdvancedSearch" class="advanced-search mt-4">
        <el-form :model="advancedSearchForm" :inline="true" size="small">
          <el-form-item
            v-for="field in advancedSearchFields"
            :key="field.prop"
            :label="field.label"
          >
            <!-- 输入框 -->
            <el-input
              v-if="field.type === 'input'"
              v-model="advancedSearchForm[field.prop]"
              :placeholder="field.placeholder"
              clearable
            />

            <!-- 选择器 -->
            <el-select
              v-else-if="field.type === 'select'"
              v-model="advancedSearchForm[field.prop]"
              :placeholder="field.placeholder"
              clearable
            >
              <el-option
                v-for="option in field.options"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>

            <!-- 日期选择器 -->
            <el-date-picker
              v-else-if="field.type === 'date'"
              v-model="advancedSearchForm[field.prop]"
              type="date"
              :placeholder="field.placeholder"
              value-format="YYYY-MM-DD"
            />

            <!-- 日期范围选择器 -->
            <el-date-picker
              v-else-if="field.type === 'daterange'"
              v-model="advancedSearchForm[field.prop]"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleAdvancedSearch">搜索</el-button>
            <el-button @click="handleAdvancedReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 工具栏 -->
    <div v-if="showToolbar" class="toolbar mb-4">
      <div class="toolbar-left">
        <slot name="toolbar-left">
          <el-button
            v-if="showAdd"
            type="primary"
            @click="$emit('add')"
          >
            <el-icon><Plus /></el-icon>
            {{ addText }}
          </el-button>

          <el-button
            v-if="showBatchDelete"
            type="danger"
            :disabled="!selectedRows.length"
            @click="handleBatchDelete"
          >
            <el-icon><Delete /></el-icon>
            批量删除
          </el-button>
        </slot>
      </div>

      <div class="toolbar-right">
        <slot name="toolbar-right">
          <el-button
            v-if="showExport"
            @click="handleExport"
          >
            <el-icon><Download /></el-icon>
            导出
          </el-button>

          <el-button
            v-if="showRefresh"
            @click="handleRefresh"
          >
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </slot>
      </div>
    </div>

    <!-- 数据表格 -->
    <el-table
      ref="tableRef"
      v-loading="loading"
      :data="tableData"
      :stripe="stripe"
      :border="border"
      :size="size"
      :height="height"
      :max-height="maxHeight"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      @row-click="handleRowClick"
      @row-dblclick="handleRowDblClick"
    >
      <!-- 多选列 -->
      <el-table-column
        v-if="showSelection"
        type="selection"
        width="55"
        align="center"
      />

      <!-- 序号列 -->
      <el-table-column
        v-if="showIndex"
        type="index"
        label="序号"
        width="60"
        align="center"
        :index="getIndexMethod"
      />

      <!-- 数据列 -->
      <el-table-column
        v-for="column in columns"
        :key="column.prop"
        :prop="column.prop"
        :label="column.label"
        :width="column.width"
        :min-width="column.minWidth"
        :fixed="column.fixed"
        :align="column.align || 'left'"
        :sortable="column.sortable"
        :show-overflow-tooltip="column.showOverflowTooltip !== false"
      >
        <template #default="scope">
          <!-- 自定义内容插槽 -->
          <slot
            v-if="column.slot"
            :name="column.slot"
            :row="scope.row"
            :column="column"
            :$index="scope.$index"
          />

          <!-- 格式化显示 -->
          <span v-else-if="column.formatter">
            {{ column.formatter(scope.row, column, scope.row[column.prop], scope.$index) }}
          </span>

          <!-- 默认显示 -->
          <span v-else>
            {{ scope.row[column.prop] }}
          </span>
        </template>
      </el-table-column>

      <!-- 操作列 -->
      <el-table-column
        v-if="showActions"
        label="操作"
        :width="actionWidth"
        :fixed="actionFixed"
        align="center"
      >
        <template #default="scope">
          <slot
            name="actions"
            :row="scope.row"
            :$index="scope.$index"
          >
            <el-button
              v-if="showEdit"
              type="primary"
              size="small"
              @click="$emit('edit', scope.row)"
            >
              编辑
            </el-button>

            <el-button
              v-if="showDelete"
              type="danger"
              size="small"
              @click="handleDelete(scope.row)"
            >
              删除
            </el-button>
          </slot>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页器 -->
    <div v-if="showPagination" class="pagination mt-4 text-right">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="pageSizes"
        :total="total"
        :background="true"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Delete, Download } from '@element-plus/icons-vue'

// Props定义
const props = defineProps({
  // 数据相关
  data: {
    type: Array,
    default: () => []
  },
  columns: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },

  // 分页相关
  showPagination: {
    type: Boolean,
    default: true
  },
  total: {
    type: Number,
    default: 0
  },
  pageSize: {
    type: Number,
    default: 10
  },
  pageSizes: {
    type: Array,
    default: () => [10, 20, 50, 100]
  },

  // 搜索相关
  showSearch: {
    type: Boolean,
    default: true
  },
  searchPlaceholder: {
    type: String,
    default: '请输入搜索关键词'
  },
  searchColSpan: {
    type: Number,
    default: 6
  },
  showAdvancedSearch: {
    type: Boolean,
    default: false
  },
  advancedSearchFields: {
    type: Array,
    default: () => []
  },

  // 工具栏相关
  showToolbar: {
    type: Boolean,
    default: true
  },
  showAdd: {
    type: Boolean,
    default: true
  },
  addText: {
    type: String,
    default: '新增'
  },
  showBatchDelete: {
    type: Boolean,
    default: true
  },
  showExport: {
    type: Boolean,
    default: true
  },
  showRefresh: {
    type: Boolean,
    default: true
  },

  // 表格样式
  stripe: {
    type: Boolean,
    default: true
  },
  border: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'default'
  },
  height: {
    type: [String, Number],
    default: undefined
  },
  maxHeight: {
    type: [String, Number],
    default: undefined
  },

  // 列相关
  showSelection: {
    type: Boolean,
    default: true
  },
  showIndex: {
    type: Boolean,
    default: true
  },
  showActions: {
    type: Boolean,
    default: true
  },
  actionWidth: {
    type: [String, Number],
    default: 150
  },
  actionFixed: {
    type: String,
    default: 'right'
  },
  showEdit: {
    type: Boolean,
    default: true
  },
  showDelete: {
    type: Boolean,
    default: true
  }
})

// Emits定义
const emit = defineEmits([
  'search',
  'reset',
  'add',
  'edit',
  'delete',
  'batch-delete',
  'export',
  'refresh',
  'selection-change',
  'sort-change',
  'row-click',
  'row-dblclick',
  'page-change'
])

// 响应式数据
const tableRef = ref()
const searchQuery = ref('')
const advancedSearchForm = ref({})
const selectedRows = ref([])
const currentPage = ref(1)

// 计算属性
const tableData = computed(() => props.data)

// 初始化高级搜索表单
const initAdvancedSearchForm = () => {
  const form = {}
  props.advancedSearchFields.forEach(field => {
    form[field.prop] = field.type === 'daterange' ? [] : ''
  })
  advancedSearchForm.value = form
}

// 序号计算方法
const getIndexMethod = (index) => {
  return (currentPage.value - 1) * props.pageSize + index + 1
}

// 事件处理方法
const handleSearch = () => {
  emit('search', searchQuery.value)
}

const handleReset = () => {
  searchQuery.value = ''
  emit('reset')
}

const handleAdvancedSearch = () => {
  emit('search', { ...advancedSearchForm.value, keyword: searchQuery.value })
}

const handleAdvancedReset = () => {
  initAdvancedSearchForm()
  searchQuery.value = ''
  emit('reset')
}

const handleRefresh = () => {
  emit('refresh')
}

const handleExport = () => {
  emit('export', selectedRows.value)
}

const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    emit('delete', row)
  }).catch(() => {
    // 取消删除
  })
}

const handleBatchDelete = () => {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先选择要删除的记录')
    return
  }

  ElMessageBox.confirm(`确定要删除选中的 ${selectedRows.value.length} 条记录吗？`, '批量删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    emit('batch-delete', selectedRows.value)
  }).catch(() => {
    // 取消删除
  })
}

const handleSelectionChange = (selection) => {
  selectedRows.value = selection
  emit('selection-change', selection)
}

const handleSortChange = (sortData) => {
  emit('sort-change', sortData)
}

const handleRowClick = (row, column, event) => {
  emit('row-click', row, column, event)
}

const handleRowDblClick = (row, column, event) => {
  emit('row-dblclick', row, column, event)
}

const handleSizeChange = (size) => {
  emit('page-change', { page: currentPage.value, size })
}

const handleCurrentChange = (page) => {
  currentPage.value = page
  emit('page-change', { page, size: props.pageSize })
}

// 暴露的方法
const clearSelection = () => {
  tableRef.value?.clearSelection()
}

const toggleRowSelection = (row, selected) => {
  tableRef.value?.toggleRowSelection(row, selected)
}

const toggleAllSelection = () => {
  tableRef.value?.toggleAllSelection()
}

const setCurrentRow = (row) => {
  tableRef.value?.setCurrentRow(row)
}

const scrollTo = (options) => {
  tableRef.value?.scrollTo(options)
}

// 初始化
initAdvancedSearchForm()

// 暴露方法给父组件
defineExpose({
  clearSelection,
  toggleRowSelection,
  toggleAllSelection,
  setCurrentRow,
  scrollTo
})
</script>

<style scoped>
.data-table {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.search-bar {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
}

.advanced-search {
  border-top: 1px solid #e4e7ed;
  padding-top: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left {
  display: flex;
  gap: 8px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}
</style>