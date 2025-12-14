<template>
  <div class="theme-switcher">
    <!-- 简单切换按钮 -->
    <el-button
      v-if="type === 'button'"
      :type="buttonType"
      :size="size"
      :icon="themeIcon"
      @click="toggleTheme"
      :class="getThemeClass('theme-toggle-btn')"
    >
      <span v-if="showText">{{ themeText }}</span>
    </el-button>

    <!-- 开关样式 -->
    <el-switch
      v-else-if="type === 'switch'"
      v-model="isDark"
      :size="size"
      :active-icon="DarkIcon"
      :inactive-icon="LightIcon"
      :active-text="showText ? '深色' : ''"
      :inactive-text="showText ? '浅色' : ''"
      @change="handleSwitchChange"
      :class="getThemeClass('theme-toggle-switch')"
    />

    <!-- 下拉选择器 -->
    <el-select
      v-else-if="type === 'select'"
      :model-value="getCurrentTheme()"
      @change="setTheme"
      :size="size"
      :class="getThemeClass('theme-select')"
      style="width: 120px"
    >
      <el-option
        v-for="option in themeOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      >
        <span style="float: left">{{ option.icon }} {{ option.label }}</span>
      </el-option>
    </el-select>

    <!-- 图标按钮 -->
    <el-tooltip
      v-else-if="type === 'icon'"
      :content="themeToggleText"
      placement="bottom"
    >
      <el-button
        :size="size"
        :type="iconButtonType"
        circle
        @click="toggleTheme"
        :class="getThemeClass('theme-icon-btn')"
      >
        <el-icon>
          <component :is="currentThemeIcon" />
        </el-icon>
      </el-button>
    </el-tooltip>

    <!-- 悬浮按钮 -->
    <div
      v-else-if="type === 'floating'"
      class="floating-theme-switcher"
      :class="getThemeClass('floating-switcher')"
      @click="toggleTheme"
    >
      <div class="floating-icon">
        <el-icon size="20">
          <component :is="currentThemeIcon" />
        </el-icon>
      </div>
      <div v-if="showFloatingText" class="floating-text">
        {{ themeText }}
      </div>
    </div>

    <!-- 分段控制器 -->
    <div
      v-else-if="type === 'segment'"
      class="theme-segment-control"
      :class="getThemeClass('segment-control')"
    >
      <div
        v-for="option in segmentOptions"
        :key="option.value"
        class="segment-option"
        :class="{
          active: getCurrentTheme() === option.value,
          ...getThemeClass('segment-option')
        }"
        @click="setTheme(option.value)"
      >
        <el-icon>
          <component :is="option.icon" />
        </el-icon>
        <span v-if="showText">{{ option.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Sunny, Moon, Monitor } from '@element-plus/icons-vue'
import { useDarkMode } from '@/composables/useDarkMode'

// Props
const props = defineProps({
  // 切换器类型
  type: {
    type: String,
    default: 'button',
    validator: (value) => ['button', 'switch', 'select', 'icon', 'floating', 'segment'].includes(value)
  },
  // 尺寸
  size: {
    type: String,
    default: 'default',
    validator: (value) => ['large', 'default', 'small'].includes(value)
  },
  // 按钮类型
  buttonType: {
    type: String,
    default: 'default'
  },
  // 图标按钮类型
  iconButtonType: {
    type: String,
    default: 'text'
  },
  // 是否显示文本
  showText: {
    type: Boolean,
    default: true
  },
  // 悬浮按钮是否显示文本
  showFloatingText: {
    type: Boolean,
    default: false
  },
  // 自定义图标
  customLightIcon: {
    type: [String, Object],
    default: null
  },
  customDarkIcon: {
    type: [String, Object],
    default: null
  }
})

// 使用深色模式
const {
  isDark,
  themeIcon,
  themeText,
  themeToggleText,
  toggleTheme,
  setTheme,
  getCurrentTheme,
  getThemeClass
} = useDarkMode()

// 图标组件
const LightIcon = Sunny
const DarkIcon = Moon
const AutoIcon = Monitor

// 计算属性
const currentThemeIcon = computed(() => {
  const currentTheme = getCurrentTheme()
  if (currentTheme === 'auto') return AutoIcon
  if (currentTheme === 'dark') return props.customDarkIcon || DarkIcon
  return props.customLightIcon || LightIcon
})

// 主题选项
const themeOptions = computed(() => [
  {
    value: 'light',
    label: '浅色模式',
    icon: '☀️'
  },
  {
    value: 'dark',
    label: '深色模式',
    icon: '🌙'
  },
  {
    value: 'auto',
    label: '跟随系统',
    icon: '🖥️'
  }
])

// 分段控制器选项
const segmentOptions = computed(() => [
  {
    value: 'light',
    label: '浅色',
    icon: LightIcon
  },
  {
    value: 'dark',
    label: '深色',
    icon: DarkIcon
  },
  {
    value: 'auto',
    label: '自动',
    icon: AutoIcon
  }
])

// 方法
const handleSwitchChange = (value) => {
  setTheme(value ? 'dark' : 'light')
}
</script>

<style lang="scss" scoped>
.theme-switcher {
  display: inline-block;

  .theme-toggle-btn {
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-1px);
    }

    &.theme-toggle-btn--dark {
      background-color: var(--bg-color-overlay);
      border-color: var(--border-color);
      color: var(--text-color-primary);

      &:hover {
        background-color: var(--fill-color-light);
      }
    }
  }

  .theme-toggle-switch {
    &.theme-toggle-switch--dark {
      :deep(.el-switch__core) {
        background-color: var(--fill-color);
        border-color: var(--border-color);
      }
    }
  }

  .theme-select {
    &.theme-select--dark {
      :deep(.el-input__wrapper) {
        background-color: var(--bg-color-overlay);
        border-color: var(--border-color);
        color: var(--text-color-primary);
      }
    }
  }

  .theme-icon-btn {
    transition: all 0.3s ease;

    &:hover {
      transform: rotate(180deg);
    }

    &.theme-icon-btn--dark {
      background-color: var(--bg-color-overlay);
      border-color: var(--border-color);
      color: var(--text-color-primary);

      &:hover {
        background-color: var(--fill-color-light);
      }
    }
  }

  .floating-theme-switcher {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background-color: var(--bg-color-overlay);
    border: 1px solid var(--border-color);
    border-radius: 50px;
    box-shadow: var(--box-shadow-light);
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--box-shadow-dark);
    }

    &.floating-switcher--dark {
      background-color: var(--bg-color-overlay);
      border-color: var(--border-color);
    }

    .floating-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-color-primary);
    }

    .floating-text {
      margin-left: 8px;
      font-size: 14px;
      color: var(--text-color-primary);
      white-space: nowrap;
    }
  }

  .theme-segment-control {
    display: flex;
    background-color: var(--fill-color-light);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 4px;
    gap: 2px;

    &.segment-control--dark {
      background-color: var(--fill-color);
      border-color: var(--border-color);
    }

    .segment-option {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
      color: var(--text-color-secondary);
      font-size: 14px;

      &:hover {
        background-color: var(--fill-color-lighter);
        color: var(--text-color-primary);
      }

      &.active {
        background-color: var(--bg-color);
        color: var(--text-color-primary);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      &.segment-option--dark {
        &:hover {
          background-color: var(--fill-color-light);
        }

        &.active {
          background-color: var(--bg-color-overlay);
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .theme-switcher {
    .floating-theme-switcher {
      bottom: 16px;
      right: 16px;
      padding: 10px 12px;

      .floating-text {
        display: none;
      }
    }

    .theme-segment-control {
      .segment-option {
        padding: 6px 8px;
        font-size: 12px;

        span {
          display: none;
        }
      }
    }
  }
}
</style>