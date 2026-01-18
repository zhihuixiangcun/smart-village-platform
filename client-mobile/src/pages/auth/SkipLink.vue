<template>
  <a
    href="#main-content"
    class="skip-link"
    @click="$emit('skip')"
  >
    跳转到主要内容
  </a>
</template>

<script setup>
defineOptions({
  name: 'SkipLink'
})

defineEmits(['skip'])
</script>

<style scoped>
.skip-link {
  position: absolute;
  top: -100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: #1890ff;
  color: #fff;
  text-decoration: none;
  border-radius: 0 0 8px 8px;
  z-index: 9999;
  transition: top 0.3s ease;
}

.skip-link:focus {
  top: 0;
  outline: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
