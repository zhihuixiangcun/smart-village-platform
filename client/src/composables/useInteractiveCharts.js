import { ref, reactive, computed, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';

/**
 * 交互式图表增强组合函数
 */
export function useInteractiveCharts() {
  // 图表实例管理
  const chartInstances = ref(new Map());
  const isChartsLoading = ref(false);
  const chartError = ref(null);

  // 图表配置
  const chartConfig = reactive({
    // 动画配置
    animation: {
      duration: 800,
      easing: 'cubicOut',
      delay: 100
    },
    // 主题配置
    theme: {
      colorPalette: [
        '#5470c6', '#91cc75', '#fac858', '#ee6666',
        '#73c0de', '#3ba272', '#fc8452', '#9a60b4'
      ],
      backgroundColor: 'transparent'
    },
    // 交互配置
    interaction: {
      tooltip: {
        enabled: true,
        trigger: 'axis',
        showContent: true,
        alwaysShowContent: false
      },
      dataZoom: {
        enabled: true,
        type: 'inside'
      },
      brush: {
        enabled: false
      }
    }
  });

  // 图表数据处理
  const processChartData = (rawData, chartType) => {
    switch (chartType) {
    case 'line':
      return processLineData(rawData);
    case 'bar':
      return processBarData(rawData);
    case 'pie':
      return processPieData(rawData);
    case 'scatter':
      return processScatterData(rawData);
    case 'heatmap':
      return processHeatmapData(rawData);
    default:
      return rawData;
    }
  };

  // 线性图数据处理
  const processLineData = (data) => {
    return {
      xAxis: {
        type: 'category',
        data: data.categories || [],
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#e4e7ed' } },
        axisTick: { show: false },
        axisLabel: { color: '#606266', fontSize: 12 }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#606266', fontSize: 12 },
        splitLine: { lineStyle: { color: '#f5f7fa', type: 'dashed' } }
      },
      series: data.series.map((serie, index) => ({
        name: serie.name,
        type: 'line',
        data: serie.data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3 },
        areaStyle: {
          opacity: 0.3,
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${chartConfig.theme.colorPalette[index]  }40` },
            { offset: 1, color: `${chartConfig.theme.colorPalette[index]  }10` }
          ])
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      }))
    };
  };

  // 柱状图数据处理
  const processBarData = (data) => {
    return {
      xAxis: {
        type: 'category',
        data: data.categories || [],
        axisLine: { lineStyle: { color: '#e4e7ed' } },
        axisTick: { show: false },
        axisLabel: { color: '#606266', fontSize: 12 }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#606266', fontSize: 12 },
        splitLine: { lineStyle: { color: '#f5f7fa', type: 'dashed' } }
      },
      series: data.series.map((serie, index) => ({
        name: serie.name,
        type: 'bar',
        data: serie.data,
        barWidth: '60%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: chartConfig.theme.colorPalette[index] },
            { offset: 1, color: `${chartConfig.theme.colorPalette[index]  }80` }
          ])
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        }
      }))
    };
  };

  // 饼图数据处理
  const processPieData = (data) => {
    return {
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        data: data.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: chartConfig.theme.colorPalette[index % chartConfig.theme.colorPalette.length],
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 20,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
              scale: 1.1
            },
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold'
            }
          }
        })),
        labelLine: {
          show: true,
          length: 15,
          length2: 15
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: 12,
          color: '#606266'
        }
      }]
    };
  };

  // 散点图数据处理
  const processScatterData = (data) => {
    return {
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f5f7fa', type: 'dashed' } }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f5f7fa', type: 'dashed' } }
      },
      series: data.series.map((serie, index) => ({
        name: serie.name,
        type: 'scatter',
        data: serie.data,
        symbolSize: 10,
        itemStyle: {
          color: chartConfig.theme.colorPalette[index],
          opacity: 0.8
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            scale: 1.3
          }
        }
      }))
    };
  };

  // 热力图数据处理
  const processHeatmapData = (data) => {
    return {
      xAxis: {
        type: 'category',
        data: data.xCategories || [],
        splitArea: { show: true }
      },
      yAxis: {
        type: 'category',
        data: data.yCategories || [],
        splitArea: { show: true }
      },
      visualMap: {
        min: data.min || 0,
        max: data.max || 100,
        calculable: true,
        realtime: false,
        inRange: {
          color: ['#50a3ba', '#eac736', '#d94e5d']
        }
      },
      series: [{
        name: data.name || '热力图',
        type: 'heatmap',
        data: data.data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
  };

  // 创建图表实例
  const createChart = async (container, chartType, data, options = {}) => {
    if (!container) {
      chartError.value = '图表容器不存在';
      return null;
    }

    isChartsLoading.value = true;

    try {
      await nextTick();

      // 销毁现有实例
      if (chartInstances.value.has(container)) {
        chartInstances.value.get(container).dispose();
      }

      // 创建新实例
      const chart = echarts.init(container, 'light', {
        renderer: 'canvas',
        useDirtyRect: true
      });

      // 处理数据
      const processedData = processChartData(data, chartType);

      // 构建完整配置
      const config = {
        animation: chartConfig.animation.duration > 0,
        animationDuration: chartConfig.animation.duration,
        animationEasing: chartConfig.animation.easing,
        animationDelay: chartConfig.animation.delay,
        backgroundColor: chartConfig.theme.backgroundColor,
        color: chartConfig.theme.colorPalette,
        tooltip: {
          trigger: chartConfig.interaction.tooltip.trigger,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderColor: 'transparent',
          textStyle: { color: '#fff', fontSize: 12 },
          padding: [8, 12],
          extraCssText: 'border-radius: 6px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);',
          formatter: options.tooltipFormatter || null
        },
        legend: {
          show: options.showLegend !== false,
          top: 'top',
          left: 'center',
          textStyle: { color: '#606266', fontSize: 12 },
          itemGap: 20
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: options.showLegend !== false ? '12%' : '3%',
          containLabel: true
        },
        ...processedData,
        ...options.extraConfig
      };

      // 应用配置
      chart.setOption(config);

      // 添加交互事件
      setupChartInteractions(chart, options.interactions || {});

      // 存储实例
      chartInstances.value.set(container, chart);

      return chart;
    } catch (error) {
      chartError.value = `图表创建失败: ${error.message}`;
      console.error('图表创建失败:', error);
      return null;
    } finally {
      isChartsLoading.value = false;
    }
  };

  // 设置图表交互
  const setupChartInteractions = (chart, interactions) => {
    // 点击事件
    if (interactions.onClick) {
      chart.on('click', interactions.onClick);
    }

    // 双击事件
    if (interactions.onDoubleClick) {
      chart.on('dblclick', interactions.onDoubleClick);
    }

    // 鼠标悬停事件
    if (interactions.onMouseOver) {
      chart.on('mouseover', interactions.onMouseOver);
    }

    // 鼠标离开事件
    if (interactions.onMouseOut) {
      chart.on('mouseout', interactions.onMouseOut);
    }

    // 数据缩放事件
    if (chartConfig.interaction.dataZoom.enabled) {
      chart.on('datazoom', (params) => {
        if (interactions.onDataZoom) {
          interactions.onDataZoom(params);
        }
      });
    }

    // 图例选择事件
    chart.on('legendselectchanged', (params) => {
      if (interactions.onLegendSelect) {
        interactions.onLegendSelect(params);
      }
    });

    // 刷选事件
    if (chartConfig.interaction.brush.enabled) {
      chart.on('brushSelected', (params) => {
        if (interactions.onBrushSelect) {
          interactions.onBrushSelect(params);
        }
      });
    }
  };

  // 更新图表数据
  const updateChart = (container, newData, options = {}) => {
    const chart = chartInstances.value.get(container);
    if (!chart) {
      console.warn('图表实例不存在');
      return false;
    }

    try {
      const processedData = processChartData(newData, options.chartType || 'line');

      chart.setOption({
        ...processedData,
        ...options.extraConfig
      }, options.notMerge || false);

      return true;
    } catch (error) {
      chartError.value = `图表更新失败: ${error.message}`;
      console.error('图表更新失败:', error);
      return false;
    }
  };

  // 调整图表大小
  const resizeChart = (container) => {
    const chart = chartInstances.value.get(container);
    if (chart) {
      chart.resize();
    }
  };

  // 销毁图表
  const disposeChart = (container) => {
    const chart = chartInstances.value.get(container);
    if (chart) {
      chart.dispose();
      chartInstances.value.delete(container);
    }
  };

  // 批量销毁所有图表
  const disposeAllCharts = () => {
    chartInstances.value.forEach(chart => chart.dispose());
    chartInstances.value.clear();
  };

  // 导出图表为图片
  const exportChart = (container, options = {}) => {
    const chart = chartInstances.value.get(container);
    if (!chart) {
      ElMessage.error('图表实例不存在');
      return null;
    }

    try {
      const dataURL = chart.getDataURL({
        type: options.type || 'png',
        pixelRatio: options.pixelRatio || 2,
        backgroundColor: options.backgroundColor || '#fff'
      });

      // 自动下载
      if (options.download) {
        const link = document.createElement('a');
        link.download = options.filename || `chart_${Date.now()}.${options.type || 'png'}`;
        link.href = dataURL;
        link.click();
      }

      return dataURL;
    } catch (error) {
      ElMessage.error(`图表导出失败: ${error.message}`);
      return null;
    }
  };

  // 图表主题切换
  const switchTheme = (themeName) => {
    chartInstances.value.forEach(chart => {
      chart.dispose();
    });
    chartInstances.value.clear();

    // 更新主题配置
    if (themeName === 'dark') {
      chartConfig.theme.colorPalette = [
        '#4992ff', '#7cffb2', '#fddd60', '#ff6e76',
        '#58d9f9', '#05c091', '#ff8a45', '#8d48e3'
      ];
      chartConfig.theme.backgroundColor = '#1a1a1a';
    } else {
      chartConfig.theme.colorPalette = [
        '#5470c6', '#91cc75', '#fac858', '#ee6666',
        '#73c0de', '#3ba272', '#fc8452', '#9a60b4'
      ];
      chartConfig.theme.backgroundColor = 'transparent';
    }
  };

  // 图表动画控制
  const toggleAnimation = (enabled) => {
    chartConfig.animation.duration = enabled ? 800 : 0;
  };

  // 计算属性
  const hasCharts = computed(() => chartInstances.value.size > 0);

  const chartCount = computed(() => chartInstances.value.size);

  return {
    // 状态
    isChartsLoading,
    chartError,
    hasCharts,
    chartCount,
    chartConfig,

    // 方法
    createChart,
    updateChart,
    resizeChart,
    disposeChart,
    disposeAllCharts,
    exportChart,
    switchTheme,
    toggleAnimation,

    // 数据处理方法
    processLineData,
    processBarData,
    processPieData,
    processScatterData,
    processHeatmapData
  };
}