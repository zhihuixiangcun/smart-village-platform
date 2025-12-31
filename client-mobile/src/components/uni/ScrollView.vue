<template>
  <div
    ref="scrollRef"
    class="scroll-view"
    :class="[scrollX ? 'scroll-view--x' : 'scroll-view--y']"
    :style="{ height: height }"
    @scroll="handleScroll"
  >
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  scrollX: {
    type: Boolean,
    default: false
  },
  scrollY: {
    type: Boolean,
    default: true
  },
  upperThreshold: {
    type: Number,
    default: 50
  },
  lowerThreshold: {
    type: Number,
    default: 50
  },
  height: {
    type: String,
    default: '100%'
  }
})

const emit = defineEmits(['scroll', 'scrolltoupper', 'scrolltolower'])

const scrollRef = ref(null)

const handleScroll = (e) => {
  const target = e.target
  const scrollTop = target.scrollTop
  const scrollLeft = target.scrollLeft
  const scrollHeight = target.scrollHeight
  const scrollWidth = target.scrollWidth
  const clientHeight = target.clientHeight
  const clientWidth = target.clientWidth

  // 触发滚动事件
  emit('scroll', {
    detail: {
      scrollTop,
      scrollLeft,
      scrollHeight,
      scrollWidth,
      clientHeight,
      clientWidth
    }
  })

  // 触发顶部事件
  if (scrollTop < props.upperThreshold) {
    emit('scrolltoupper', {
      detail: {
        scrollTop,
        scrollLeft
      }
    })
  }

  // 触发底部事件
  if (props.scrollY && scrollHeight - scrollTop - clientHeight < props.lowerThreshold) {
    emit('scrolltolower', {
      detail: {
        scrollTop,
        scrollLeft
      }
    })
  }

  // 横向滚动底部事件
  if (props.scrollX && scrollWidth - scrollLeft - clientWidth < props.lowerThreshold) {
    emit('scrolltolower', {
      detail: {
        scrollTop,
        scrollLeft
      }
    })
  }
}

// 暴露滚动方法
const scrollTo = (options) => {
  if (!scrollRef.value) return

  if (options.scrollTop !== undefined) {
    scrollRef.value.scrollTop = options.scrollTop
  }
  if (options.scrollLeft !== undefined) {
    scrollRef.value.scrollLeft = options.scrollLeft
  }
}

defineExpose({
  scrollTo
})
</script>

<style lang="scss" scoped>
.scroll-view {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  will-change: scroll-position;
}

.scroll-view--x {
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
}

.scroll-view--y {
  overflow-x: hidden;
  overflow-y: auto;
}

/* 隐藏滚动条但保留滚动功能 */
.scroll-view::-webkit-scrollbar {
  display: none;
}

.scroll-view {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
