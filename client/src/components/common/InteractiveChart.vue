<template>
  <div class="interactive-chart-component">
    <!-- 图表工具栏 -->
    <div v-if="showToolbar" class="chart-toolbar">
      <div class="toolbar-left">
        <el-button-group size="small">
          <el-button
            v-for="type in availableTypes"
            :key="type.value"
            :type="currentType === type.value ? 'primary' : 'default'"
            :icon="type.icon"
            @click="switchChartType(type.value)"
          >
            {{ type.label }}
          </el-button>
        </el-button-group>
      </div>

      <div class="toolbar-right">
        <el-tooltip content="刷新数据" placement="top">
          <el-button
            size="small"
            icon="Refresh"
            :loading="isChartsLoading"
            @click="handleRefresh"
          />
        </el-tooltip>

        <el-tooltip content="全屏查看" placement="top">
          <el-button
            size="small"
            icon="FullScreen"
            @click="toggleFullscreen"
          />
        </el-tooltip>

        <el-dropdown @command="handleExport">
          <el-button size="small" icon="Download">
            导出<el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="png" icon="Picture">导出为PNG</el-dropdown-item>
              <el-dropdown-item command="jpg" icon="Picture">导出为JPG</el-dropdown-item>
              <el-dropdown-item command="svg" icon="Document">导出为SVG</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-tooltip content="图表设置" placement="top">
          <el-button
            size="small"
            icon="Setting"
            @click="showSettingsDialog = true"
          />
        </el-tooltip>
      </div>
    </div>

    <!-- 图表容器 -->
    <div
      ref="chartContainer"
      class="chart-container"
      :class="{
        'fullscreen': isFullscreen,
        'loading': isChartsLoading
      }"
      :style="containerStyle"
    >
      <!-- 加载状态 -->
      <div v-if="isChartsLoading" class="chart-loading">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <span>图表加载中...</span>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="chartError" class="chart-error">
        <el-icon class="error-icon"><Warning /></el-icon>
        <span>{{ chartError }}</span>
        <el-button type="primary" size="small" @click="retryLoad">重试</el-button>
      </div>

      <!-- 空数据状态 -->
      <div v-else-if="!hasData" class="chart-empty">
        <el-empty description="暂无图表数据">
          <el-button type="primary" @click="$emit('loadData')">加载数据</el-button>
        </el-empty>
      </div>
    </div>

    <!-- 图表信息面板 -->
    <div v-if="showInfo && hasData" class="chart-info">
      <el-row :gutter="16">
        <el-col :span="6">
          <div class="info-item">
            <span class="info-label">数据点数量</span>
            <span class="info-value">{{ dataPointCount }}</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <span class="info-label">最后更新</span>
            <span class="info-value">{{ lastUpdateTime }}</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <span class="info-label">图表类型</span>
            <span class="info-value">{{ currentTypeLabel }}</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <span class="info-label">交互模式</span>
            <span class="info-value">{{ interactionMode }}</span>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 图表设置对话框 -->
    <el-dialog
      v-model="showSettingsDialog"
      title="图表设置"
      width="500px"
    >
      <el-form :model="settings" label-width="100px">
        <el-form-item label="动画效果">
          <el-switch
            v-model="settings.animation"
            @change="handleAnimationChange"
          />
        </el-form-item>

        <el-form-item label="显示图例">
          <el-switch
            v-model="settings.showLegend"
            @change="handleLegendChange"
          />
        </el-form-item>

        <el-form-item label="显示工具提示">
          <el-switch
            v-model="settings.showTooltip"
            @change="handleTooltipChange"
          />
        </el-form-item>

        <el-form-item label="主题颜色">
          <el-radio-group v-model="settings.theme" @change="handleThemeChange">
            <el-radio label="light">浅色主题</el-radio>
            <el-radio label="dark">深色主题</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="图表高度">
          <el-slider
            v-model="settings.height"
            :min="300"
            :max="800"
            :step="50"
            show-input
            @change="handleHeightChange"
          />
        </el-form-item>

        <el-form-item label="动画时长">
          <el-slider
            v-model="settings.animationDuration"
            :min="0"
            :max="2000"
            :step="100"
            show-input
            @change="handleAnimationDurationChange"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="resetSettings">重置</el-button>
        <el-button type="primary" @click="showSettingsDialog = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Refresh, FullScreen, Download, Setting, Loading, Warning,
  ArrowDown, Picture, Document, TrendCharts, BarChart, PieChart
} from '@element-plus/icons-vue'
import { useInteractiveCharts } from '@/composables/useInteractiveCharts'

// Props
const props = defineProps({
  // 图表数据
  data: {
    type: Object,
    required: true
  },
  // 图表类型
  type: {
    type: String,
    default: 'line',
    validator: (value) => ['line', 'bar', 'pie', 'scatter', 'heatmap'].includes(value)
  },
  // 图表高度
  height: {
    type: [Number, String],
    default: 400
  },
  // 是否显示工具栏
  showToolbar: {
    type: Boolean,
    default: true
  },
  // 是否显示信息面板
  showInfo: {
    type: Boolean,
    default: false
  },
  // 可用的图表类型
  enabledTypes: {
    type: Array,
    default: () => ['line', 'bar', 'pie']
  },
  // 自定义交互配置
  interactions: {
    type: Object,
    default: () => ({})
  },
  // 自动刷新间隔（秒）
  autoRefreshInterval: {
    type: Number,
    default: 0
  }
})

// Emits
const emit = defineEmits(['typeChange', 'dataPointClick', 'refresh', 'loadData', 'export'])

// 使用交互式图表组合函数
const {
  isChartsLoading,
  chartError,
  chartConfig,
  createChart,
  updateChart,
  resizeChart,
  disposeChart,
  exportChart,
  switchTheme,
  toggleAnimation
} = useInteractiveCharts()

// 响应式数据
const chartContainer = ref()
const currentType = ref(props.type)
const isFullscreen = ref(false)
const showSettingsDialog = ref(false)
const chartInstance = ref(null)
const lastUpdateTime = ref('')
const autoRefreshTimer = ref(null)

// 图表设置
const settings = reactive({
  animation: true,
  showLegend: true,
  showTooltip: true,
  theme: 'light',
  height: props.height,
  animationDuration: 800
})

// 可用图表类型配置
const chartTypes = {
  line: { label: '线性图', icon: 'TrendCharts' },
  bar: { label: '柱状图', icon: 'BarChart' },
  pie: { label: '饼图', icon: 'PieChart' },
  scatter: { label: '散点图', icon: 'Document' },
  heatmap: { label: '热力图', icon: 'Picture' }
}

// 计算属性
const availableTypes = computed(() => {
  return props.enabledTypes.map(type => ({
    value: type,
    ...chartTypes[type]
  }))
})

const hasData = computed(() => {
  return props.data && Object.keys(props.data).length > 0
})

const dataPointCount = computed(() => {
  if (!props.data) return 0

  if (props.data.series) {
    return props.data.series.reduce((total, serie) => total + (serie.data?.length || 0), 0)
  }

  if (Array.isArray(props.data)) {
    return props.data.length
  }

  return 0
})

const currentTypeLabel = computed(() => {
  return chartTypes[currentType.value]?.label || '未知'
})

const interactionMode = computed(() => {
  return chartConfig.interaction.tooltip.enabled ? '交互式' : '静态'
})

const containerStyle = computed(() => ({
  height: `${settings.height}px`,
  transition: 'height 0.3s ease'
}))

// 方法
const initChart = async () => {
  if (!chartContainer.value || !hasData.value) return

  try {
    chartInstance.value = await createChart(
      chartContainer.value,
      currentType.value,
      props.data,
      {
        showLegend: settings.showLegend,
        tooltipFormatter: null,
        interactions: {
          onClick: handleDataPointClick,
          onDoubleClick: handleDoubleClick,
          ...props.interactions
        }
      }
    )

    if (chartInstance.value) {
      lastUpdateTime.value = new Date().toLocaleTimeString()
    }
  } catch (error) {
    console.error('图表初始化失败:', error)
  }
}

const switchChartType = async (type) => {
  if (type === currentType.value) return

  currentType.value = type
  emit('typeChange', type)

  if (chartContainer.value && hasData.value) {
    await initChart()
  }
}

const handleRefresh = () => {
  emit('refresh')
  if (chartContainer.value) {
    initChart()
  }
}

const handleDataPointClick = (params) => {
  emit('dataPointClick', params)
  ElMessage.info(`点击了数据点: ${params.name} = ${params.value}`)
}

const handleDoubleClick = (params) => {
  // 双击放大功能
  if (chartInstance.value) {
    chartInstance.value.dispatchAction({
      type: 'dataZoom',
      dataZoomIndex: 0,
      startValue: params.dataIndex - 2,
      endValue: params.dataIndex + 2
    })
  }
}

const handleExport = (format) => {
  if (!chartContainer.value) return

  const result = exportChart(chartContainer.value, {
    type: format,
    download: true,
    filename: `chart_${currentType.value}_${Date.now()}`
  })

  if (result) {
    emit('export', { format, dataURL: result })
    ElMessage.success(`图表已导出为 ${format.toUpperCase()} 格式`)
  }
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value

  nextTick(() => {
    if (chartInstance.value) {
      resizeChart(chartContainer.value)
    }
  })
}

const retryLoad = () => {
  initChart()
}

// 设置处理
const handleAnimationChange = (enabled) => {
  toggleAnimation(enabled)
  initChart()
}

const handleLegendChange = () => {
  initChart()
}

const handleTooltipChange = () => {
  chartConfig.interaction.tooltip.enabled = settings.showTooltip
  initChart()
}

const handleThemeChange = (theme) => {
  switchTheme(theme)
  initChart()
}

const handleHeightChange = () => {
  nextTick(() => {
    if (chartInstance.value) {
      resizeChart(chartContainer.value)
    }
  })
}

const handleAnimationDurationChange = (duration) => {
  chartConfig.animation.duration = duration
  initChart()
}

const resetSettings = () => {
  Object.assign(settings, {
    animation: true,
    showLegend: true,
    showTooltip: true,
    theme: 'light',
    height: props.height,
    animationDuration: 800
  })
  initChart()
}

// 自动刷新
const startAutoRefresh = () => {
  if (props.autoRefreshInterval > 0) {
    autoRefreshTimer.value = setInterval(() => {
      handleRefresh()
    }, props.autoRefreshInterval * 1000)
  }
}

const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

// 监听数据变化
watch(
  () => props.data,
  (newData) => {
    if (newData && chartContainer.value) {
      updateChart(chartContainer.value, newData, { chartType: currentType.value })
      lastUpdateTime.value = new Date().toLocaleTimeString()
    }
  },
  { deep: true }
)

// 监听容器大小变化
const resizeObserver = new ResizeObserver(() => {
  if (chartInstance.value) {
    resizeChart(chartContainer.value)
  }
})

// 生命周期
onMounted(async () => {
  await nextTick()
  await initChart()

  if (chartContainer.value) {
    resizeObserver.observe(chartContainer.value)
  }

  startAutoRefresh()
})

onUnmounted(() => {
  if (chartContainer.value) {
    disposeChart(chartContainer.value)
    resizeObserver.unobserve(chartContainer.value)
  }
  stopAutoRefresh()
})
</script>

<style lang="scss" scoped>
.interactive-chart-component {
  .chart-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #fafafa;
    border: 1px solid #ebeef5;
    border-radius: 8px 8px 0 0;

    .toolbar-right {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  }

  .chart-container {
    position: relative;
    border: 1px solid #ebeef5;
    border-radius: 0 0 8px 8px;
    background: white;
    overflow: hidden;

    &.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2000;
      border-radius: 0;
      height: 100vh !important;
    }

    &.loading {
      pointer-events: none;
    }

    .chart-loading,
    .chart-error,
    .chart-empty {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #909399;
    }

    .chart-loading {
      .loading-icon {
        font-size: 32px;
        animation: rotate 1s linear infinite;
        margin-bottom: 12px;
      }
    }

    .chart-error {
      .error-icon {
        font-size: 32px;
        color: #f56c6c;
        margin-bottom: 12px;
      }
    }
  }

  .chart-info {
    padding: 16px;
    background: #f8f9fa;
    border: 1px solid #ebeef5;
    border-top: none;
    border-radius: 0 0 8px 8px;

    .info-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      .info-label {
        font-size: 12px;
        color: #909399;
        margin-bottom: 4px;
      }

      .info-value {
        font-size: 14px;
        font-weight: 600;
        color: #303133;
      }
    }
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// 响应式设计
@media (max-width: 768px) {
  .interactive-chart-component {
    .chart-toolbar {
      flex-direction: column;
      gap: 12px;

      .toolbar-left,
      .toolbar-right {
        width: 100%;
        justify-content: center;
      }
    }

    .chart-info {
      .el-row {
        .el-col {
          margin-bottom: 16px;
        }
      }
    }
  }
}
</style>