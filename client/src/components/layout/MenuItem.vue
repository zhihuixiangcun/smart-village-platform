<template>
  <div class="menu-item">
    <!-- 如果有子菜单 -->
    <el-sub-menu
      v-if="hasChildren"
      :index="resolvePath"
      :popper-append-to-body="true"
    >
      <template #title>
        <el-icon v-if="item.icon" class="menu-icon">
          <component :is="item.icon" />
        </el-icon>
        <span class="menu-title">{{ item.title }}</span>
      </template>

      <menu-item
        v-for="child in item.children"
        :key="child.path"
        :item="child"
        :base-path="resolvePath"
        class="submenu-item"
      />
    </el-sub-menu>

    <!-- 如果是单一菜单项 -->
    <router-link
      v-else
      :to="resolvePath"
      class="menu-link"
    >
      <el-menu-item
        :index="resolvePath"
        class="menu-item-content"
      >
        <el-icon v-if="item.icon" class="menu-icon">
          <component :is="item.icon" />
        </el-icon>
        <template #title>
          <span class="menu-title">{{ item.title }}</span>
        </template>
      </el-menu-item>
    </router-link>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Monitor,
  User,
  UserFilled,
  Money,
  Bell,
  Service,
  ShoppingCart,
  Setting
} from '@element-plus/icons-vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  basePath: {
    type: String,
    default: ''
  }
})

// 图标映射
const iconMap = {
  Monitor,
  User,
  UserFilled,
  Money,
  Bell,
  Service,
  ShoppingCart,
  Setting
}

// 是否有子菜单
const hasChildren = computed(() => {
  return props.item.children && props.item.children.length > 0
})

// 解析路径
const resolvePath = computed(() => {
  if (props.item.path.startsWith('/')) {
    return props.item.path
  }

  return props.basePath + '/' + props.item.path
})

// 处理图标
const iconComponent = computed(() => {
  if (!props.item.icon) return null

  if (typeof props.item.icon === 'string') {
    return iconMap[props.item.icon] || null
  }

  return props.item.icon
})
</script>

<style lang="scss" scoped>
.menu-item {
  .menu-link {
    text-decoration: none;
    color: inherit;
    display: block;

    &:hover {
      text-decoration: none;
    }
  }

  .menu-item-content {
    display: flex;
    align-items: center;
  }

  .menu-icon {
    margin-right: 8px;
    font-size: 16px;
  }

  .menu-title {
    font-size: 14px;
    font-weight: 400;
  }

  // 子菜单样式
  &.submenu-item {
    :deep(.el-menu-item) {
      padding-left: 50px !important;
      background-color: rgba(0, 0, 0, 0.1);

      &:hover {
        background-color: rgba(255, 255, 255, 0.05) !important;
      }

      &.is-active {
        background-color: var(--el-color-primary) !important;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .menu-title {
    font-size: 13px;
  }

  .menu-icon {
    font-size: 14px;
  }
}
</style>