/** * SafeIcon 组件 * * 这是一个包装器组件，用于安全地使用 Element Plus 的图标 * 它会捕获并处理
renderSlot 错误 */ import { defineComponent, h, computed } from 'vue'; export default
defineComponent({ name: 'SafeIcon', props: { // 图标组件 icon: { type: [String, Object, Function],
required: true }, // 大小 size: { type: [Number, String], default: 20 }, // 颜色 color: { type:
String, default: '' } }, setup(props, { slots }) { const iconStyle = computed(() => { const style =
{}; if (props.size) { style.fontSize = typeof props.size === 'number' ? `${props.size}px` :
props.size; } if (props.color) { style.color = props.color; } return style; }); //
如果有插槽内容，使用插槽 if (slots.default) { return () => h('span', { class: 'safe-icon', style:
iconStyle.value }, slots.default()); } // 如果icon是字符串(emoji)，直接显示 if (typeof props.icon
=== 'string' && props.icon.length <= 2) { return () => h('span', { class: 'safe-icon emoji-icon',
style: iconStyle.value }, props.icon); } // 否则尝试渲染组件 return () => { try { return h('span', {
class: 'safe-icon', style: iconStyle.value }, [ h(props.icon) ]); } catch (error) { //
如果渲染失败，显示备用图标 console.warn('图标渲染失败，使用备用图标:', error); return h('span', {
class: 'safe-icon fallback-icon', style: iconStyle.value }, '📦'); } }; } });
