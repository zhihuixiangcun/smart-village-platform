<template>
  <div class="message-input">
    <!-- 回复引用预览 -->
    <div v-if="replyTo" class="reply-preview">
      <div class="reply-preview-content">
        <span class="reply-label">回复:</span>
        <span class="reply-text">{{ getReplyPreviewText() }}</span>
      </div>
      <el-icon class="close-btn" @click="$emit('cancel-reply')">
        <Close />
      </el-icon>
    </div>

    <div class="input-toolbar">
      <!-- 工具栏 -->
      <div class="toolbar-left">
        <el-upload :show-file-list="false" :before-upload="handleImageUpload" accept="image/*">
          <el-button circle>
            <el-icon><Picture /></el-icon>
          </el-button>
        </el-upload>

        <el-upload :show-file-list="false" :before-upload="handleFileUpload">
          <el-button circle>
            <el-icon><Folder /></el-icon>
          </el-button>
        </el-upload>

        <el-button circle @click="showEmojiPicker = !showEmojiPicker">
          <el-icon><ChatLineRound /></el-icon>
        </el-button>
      </div>

      <!-- 输入框 -->
      <div class="input-wrapper">
        <el-input
          v-model="inputValue"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 4 }"
          placeholder="输入消息..."
          @keydown.enter.exact="handleEnter"
          @keydown.enter.shift.prevent="inputValue += '\n'"
        />
      </div>

      <!-- 发送按钮 -->
      <div class="toolbar-right">
        <el-button type="primary" :loading="loading" :disabled="!canSend" @click="handleSend">
          发送
        </el-button>
      </div>
    </div>

    <!-- 表情选择器 -->
    <div v-if="showEmojiPicker" class="emoji-picker">
      <div class="emoji-grid">
        <span
          v-for="emoji in commonEmojis"
          :key="emoji"
          class="emoji-item"
          @click="insertEmoji(emoji)"
        >
          {{ emoji }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Close, Picture, Folder, ChatLineRound } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  replyTo: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'send', 'cancel-reply']);

// 输入值
const inputValue = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

// 是否显示表情选择器
const showEmojiPicker = ref(false);

// 是否可以发送
const canSend = computed(() => {
  return inputValue.value.trim().length > 0 && !props.loading;
});

// 常用表情
const commonEmojis = [
  '😀',
  '😃',
  '😄',
  '😁',
  '😆',
  '😅',
  '😂',
  '🤣',
  '😊',
  '😇',
  '🙂',
  '🙃',
  '😉',
  '😌',
  '😍',
  '🥰',
  '😘',
  '😗',
  '😙',
  '😚',
  '😋',
  '😛',
  '😝',
  '😜',
  '🤪',
  '🤨',
  '🧐',
  '🤓',
  '😎',
  '🤩',
  '🥳',
  '😏',
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🖤',
  '🤍',
  '👍',
  '👎',
  '👏',
  '🙏',
  '💪',
  '🤝',
  '✌️',
  '🤞',
  '🎉',
  '🎊',
  '🎈',
  '🎁',
  '🏆',
  '🥇',
  '🥈',
  '🥉',
];

// 处理回车发送
const handleEnter = () => {
  if (canSend.value) {
    handleSend();
  }
};

// 处理发送
const handleSend = () => {
  if (!canSend.value) return;
  emit('send', inputValue.value.trim());
  showEmojiPicker.value = false;
};

// 插入表情
const insertEmoji = emoji => {
  inputValue.value += emoji;
};

// 图片上传
const handleImageUpload = file => {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件');
    return false;
  }

  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过10MB');
    return false;
  }

  // TODO: 实现图片上传和发送
  ElMessage.info('图片上传功能开发中');
  return false;
};

// 文件上传
const handleFileUpload = file => {
  if (file.size > 100 * 1024 * 1024) {
    ElMessage.warning('文件大小不能超过100MB');
    return false;
  }

  // TODO: 实现文件上传和发送
  ElMessage.info('文件上传功能开发中');
  return false;
};

// 获取回复预览文本
const getReplyPreviewText = () => {
  if (!props.replyTo) return '';

  const type = props.replyTo.type;
  const content = props.replyTo.content;

  if (type === 'text') {
    return content?.text || '';
  } else if (type === 'image') {
    return '[图片]';
  } else if (type === 'voice') {
    return '[语音]';
  } else if (type === 'video') {
    return '[视频]';
  } else if (type === 'file') {
    return '[文件]';
  } else if (type === 'location') {
    return '[位置]';
  }
  return '[消息]';
};
</script>

<style scoped>
.message-input {
  padding: 12px 16px;
  background: #fff;
  position: relative;
}

.reply-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 8px;
}

.reply-preview-content {
  flex: 1;
  min-width: 0;
}

.reply-label {
  font-size: 12px;
  color: #07c160;
  margin-right: 4px;
}

.reply-text {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-btn {
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #666;
}

.input-toolbar {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.input-wrapper {
  flex: 1;
  min-width: 0;
}

.toolbar-right {
  flex-shrink: 0;
}

.emoji-picker {
  position: absolute;
  bottom: 100%;
  left: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}

.emoji-item {
  font-size: 20px;
  cursor: pointer;
  text-align: center;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.emoji-item:hover {
  background: #f5f5f5;
}

/* 微信样式优化 */
:deep(.el-textarea__inner) {
  border-radius: 8px;
  border-color: #e0e0e0;
}

:deep(.el-textarea__inner):focus {
  border-color: #07c160;
}

:deep(.el-button--primary) {
  background-color: #07c160;
  border-color: #07c160;
}

:deep(.el-button--primary):hover {
  background-color: #06ad56;
  border-color: #06ad56;
}

:deep(.el-button--primary.is-disabled) {
  background-color: #c0c4cc;
  border-color: #c0c4cc;
}
</style>
