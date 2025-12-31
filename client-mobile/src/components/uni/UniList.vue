<template>
  <view class="uni-list" :class="{ 'uni-list--border': border }">
    <slot></slot>
  </view>
</template>

<script setup>
const props = defineProps({
  border: {
    type: Boolean,
    default: true
  }
})
</script>

<style lang="scss" scoped>
.uni-list {
  background-color: #fff;
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.uni-list--border {
  position: relative;
  border-top: 1px solid #e5e5e5;
  border-bottom: 1px solid #e5e5e5;
}

.uni-list--border::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  height: 1px;
  background-color: #e5e5e5;
  transform: scaleY(0.5);
}

.uni-list--border::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  right: 0;
  height: 1px;
  background-color: #e5e5e5;
  transform: scaleY(0.5);
}
</style>
