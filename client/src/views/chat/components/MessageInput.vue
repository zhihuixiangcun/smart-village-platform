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

  <!-- 图片/视频/语音/文件预览区域 -->
  <div v-if="uploadPreview.file" class="upload-preview">
    <!-- 图片预览 -->
    <div v-if="uploadPreview.type === 'image'" class="preview-image-container">
      <img :src="uploadPreview.url" class="preview-image" alt="图片预览" />
      <div class="preview-info">
        <span class="file-name">{{ uploadPreview.file.name }}</span>
        <span class="file-size">{{ formatFileSize(uploadPreview.file.size) }}</span>
      </div>
      <!-- 删除按钮 -->
      <el-icon class="preview-close" @click="cancelUpload">
        <Close />
      </el-icon>
    </div>

    <!-- 视频预览 -->
    <div v-else-if="uploadPreview.type === 'video'" class="preview-video-container">
      <video :src="uploadPreview.url" controls class="preview-video" autoplay muted loop />
      <div class="preview-info">
        <span class="file-name">{{ uploadPreview.file.name }}</span>
        <span class="file-size">{{ formatFileSize(uploadPreview.file.size) }}</span>
      </div>
      <el-icon class="preview-close" @click="cancelUpload">
        <Close />
      </el-icon>
    </div>

    <!-- 语音预览 -->
    <div v-else-if="uploadPreview.type === 'voice'" class="preview-voice-container">
      <div class="voice-preview">
        <el-icon class="voice-icon" :size="48"><Microphone /></el-icon>
        <div class="voice-info">
          <div class="voice-duration">{{ formatDuration(uploadPreview.duration) }}</div>
          <div class="voice-size">{{ formatFileSize(uploadPreview.size) }}</div>
        </div>
      </div>
      <!-- 删除按钮 -->
      <div class="voice-actions">
        <el-button type="danger" @click="cancelUpload">删除</el-button>
      </div>
    </div>

    <!-- 文件预览 -->
    <div v-else class="preview-file-container">
      <el-icon class="file-icon" :size="48"><Document /></el-icon>
      <div class="preview-info">
        <span class="file-name">{{ uploadPreview.file.name }}</span>
        <span class="file-size">{{ formatFileSize(uploadPreview.file.size) }}</span>
      </div>
      <el-icon class="preview-close" @click="cancelUpload">
        <Close />
      </el-icon>
    </div>

    <!-- 上传进度 -->
    <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
      <el-progress
        :percentage="uploadProgress"
        :stroke-width="6"
        :color="uploadPreview.type === 'voice' ? '#67c23a' : '#409eff'"
      >
        <span class="progress-text">
          {{ uploadProgress }}%
        </span>
      </el-progress>
    </div>
  </div>

  <!-- 拖拽上传覆盖层 -->
  <div
    v-if="isDragging"
    class="drag-overlay"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <el-icon class="drag-icon" :size="80"><UploadFilled /></el-icon>
    <p class="drag-text">释放以上传文件</p>
    <p class="drag-hint">支持图片、视频、语音、文件</p>
  </div>

  <!-- 输入工具栏 -->
  <div class="input-toolbar" @dragover.prevent @dragenter="handleDragEnter">
    <!-- 工具栏左侧 -->
    <div class="toolbar-left">
      <!-- 图片上传 -->
      <el-upload
        :show-file-list="false"
        :before-upload="handleImageUpload"
        accept="image/*"
        :disabled="uploading"
      >
        <el-button circle>
          <el-icon><Picture /></el-icon>
        </el-button>
      </el-upload>

      <!-- 视频上传 -->
      <el-upload
        :show-file-list="false"
        :before-upload="handleVideoUpload"
        accept="video/*"
        :disabled="uploading"
      >
        <el-button circle>
          <el-icon><VideoCamera /></el-icon>
        </el-button>
      </el-upload>

      <!-- 语音录制 -->
      <el-button
        circle
        @click="toggleVoiceRecording"
        :disabled="uploading"
      >
        <el-icon :type="isRecording ? 'Microphone' : 'Microphone'">
          {{ isRecording ? '停止' : '按住说话' }}
        </el-button>

      <!-- 文件上传 -->
      <el-upload
        :show-file-list="false"
        :before-upload="handleFileUpload"
        accept="*.*"
        :disabled="uploading"
      >
        <el-button circle>
          <el-icon><Folder /></el-icon>
        </el-button>
      </el-upload>

      <!-- 表情按钮 -->
      <el-button
        circle
        @click="showEmojiPicker = !showEmojiPicker"
      >
        <el-icon><ChatLineRound /></el-icon>
      </el-button>

      <!-- 语音录制指示器 -->
      <el-badge
        v-if="voiceRecordingTime > 0"
        :value="voiceRecordingTime"
        :max="60"
        :type="isRecording ? 'danger' : 'primary'"
      >
        {{ isRecording ? '录音中' : '按住说话' }}
      </el-badge>
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
        :disabled="uploading"
      />
    </div>

    <!-- 发送按钮 -->
    <div class="toolbar-right">
      <el-button
        v-if="uploadPreview.file"
        type="success"
        :loading="uploading"
        :disabled="uploadProgress < 100 || uploading"
        @click="handleSendFile"
      >
        发送{{ getTypeName(uploadPreview.type) }}
      </el-button>

      <el-button
        v-else
        type="primary"
        :loading="sending"
        :disabled="!canSend || uploading"
        @click="handleSend"
      >
        发送
      </el-button>
    </div>
  </div>

  <!-- 表情选择器 -->
  <div v-if="showEmojiPicker" class="emoji-picker">
    <div class="emoji-picker-header">
      <span>选择表情</span>
      <el-button type="text" @click="showEmojiPicker = false">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>
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

  <!-- 语音录制器 -->
  <div v-if="isRecording" class="voice-recorder">
    <div class="recording-controls">
      <el-button type="danger" @click="cancelRecording">
        <el-icon><Microphone /></el-icon>
        停止录音
      </el-button>
    </div>
    <div class="recording-info">
      <div class="recording-time">{{ formatRecordingTime(voiceRecordingTime) }}</div>
      <el-progress
        :percentage="voiceRecordingTime"
        :show-text="false"
        :stroke-width="8"
      />
      <div class="recording-wave">
        <div
          v-for="n in 10"
          :key="n"
          class="wave-item"
        ></div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Close, Picture, Folder, ChatLineRound, VideoCamera, Microphone, Delete, Document } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import uploadApi from '@/api/uploadApi';

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
  conversationId: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue', 'send', 'cancel-reply', 'send-file']);

// 输入值
const inputValue = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

// 是否显示表情选择器
const showEmojiPicker = ref(false);

// 是否正在上传
const uploading = ref(false);

// 上传相关状态
const uploadProgress = ref(0);
const uploadPreview = ref({
  file: null,
  url: '',
  type: '',
  duration: 0,
  uploadData: null,
});

// 是否正在拖拽
const isDragging = ref(false);

// 语音录制相关状态
const isRecording = ref(false);
const voiceRecordingTime = ref(0);
const mediaRecorder = ref(null);
const audioChunks = ref([]);

// 常用表情
const commonEmojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🥇', '👍', '🏆', '🥈', '🥉', '📺', '🖤', '🤍', '🤓', '👎', '🙏', '💪', '🤨', '🧡', '💜', '✌️', '🤞', '🎉', '🎊',
];

// 是否可以发送
const canSend = computed(() => {
  return (
    inputValue.value.trim().length > 0 &&
    !props.loading &&
    !uploading.value &&
    !isRecording.value &&
    !uploadPreview.file
  );
});

// 格式化文件大小
const formatFileSize = bytes => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// 格式化时长
const formatDuration = seconds => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatRecordingTime = seconds => {
  if (seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// 获取类型名称
const getTypeName = type => {
  const names = {
    image: '图片',
    video: '视频',
    voice: '语音',
    file: '文件',
  };
  return names[type] || '消息';
};

// 处理回车发送
const handleEnter = () => {
  if (canSend.value) {
    handleSend();
  }
};

// 处理发送文字
const handleSend = async () => {
  if (!canSend.value || !props.conversationId) return;

  try {
    const message = {
      type: 'text',
      content: { text: inputValue.value.trim() },
      conversationId: props.conversationId,
      sender: getCurrentUser(),
    };

    await chatStore.sendMessage(message);
    inputValue.value = '';
    showEmojiPicker.value = false;
  } catch (error) {
    console.error('发送失败:', error);
    ElMessage.error('发送失败');
  }
};

// 处理发送文件/图片/语音/视频
const handleSendFile = async () => {
  if (!uploadPreview.file || !uploadPreview.uploadData) {
    ElMessage.warning('请等待上传完成');
    return;
  }

  const messageData = {
    type: uploadPreview.type,
    content: uploadPreview.uploadData,
    conversationId: props.conversationId,
    sender: getCurrentUser(),
  };

  emit('send-file', messageData);

  cancelUpload();
};

// 图片上传
const handleImageUpload = async file => {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件');
    return false;
  }

  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过10MB');
    return false;
  }

  try {
    uploading.value = true;
    uploadProgress.value = 0;

    const reader = new FileReader();
    reader.onload = e => {
      uploadPreview.value = {
        file: file,
        url: e.target.result,
        type: 'image',
        uploadData: null,
      };
    };
    reader.readAsDataURL(file);

    const result = await uploadApi.uploadChatImage(
      props.conversationId,
      file,
      progress => {
        uploadProgress.value = progress;
      }
    );

    uploadPreview.value.uploadData = result.data;
    ElMessage.success('图片上传成功');
  } catch (error) {
    console.error('图片上传失败:', error);
    ElMessage.error('图片上传失败');
    cancelUpload();
  } finally {
    uploading.value = false;
  }

  return false;
};

// 视频上传
const handleVideoUpload = async file => {
  const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

  if (!videoTypes.some(type => file.type.includes(type))) {
    ElMessage.warning('请选择视频文件（支持MP4、WebM、QuickTime）');
    return false;
  }

  if (file.size > 200 * 1024 * 1024) {
    ElMessage.warning('视频大小不能超过200MB');
    return false;
  }

  try {
    uploading.value = true;
    uploadProgress.value = 0;

    const reader = new FileReader();
    reader.onload = e => {
      uploadPreview.value = {
        file: file,
        url: e.target.result,
        type: 'video',
        uploadData: null,
      };
    };
    reader.readAsDataURL(file);

    const result = await uploadApi.uploadChatVideo(
      props.conversationId,
      file,
      progress => {
        uploadProgress.value = progress;
      }
    );

    uploadPreview.value.uploadData = result.data;
    ElMessage.success('视频上传成功');
  } catch (error) {
    console.error('视频上传失败:', error);
    ElMessage.error('视频上传失败');
    cancelUpload();
  } finally {
    uploading.value = false;
  }

  return false;
};

// 语音录制
const toggleVoiceRecording = () => {
  if (isRecording.value) {
    cancelRecording();
  } else {
    startRecording();
  }
};

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.value = new MediaRecorder(stream);
    audioChunks.value = [];

    mediaRecorder.ondataavailable = event => {
      audioChunks.value.push(event.data);
      if (mediaRecorder.value.state === 'inactive') {
        processAudioRecording(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      uploadRecording();
    };

    mediaRecorder.start(1000);

    isRecording.value = true;
    voiceRecordingTime.value = 0;

    startRecordingTimer();
  } catch (error) {
    console.error('无法访问麦克风:', error);
    ElMessage.error('无法访问麦克风');
  }
};

const startRecordingTimer = () => {
  voiceRecordingTime.value = 0;
  timer = setInterval(() => {
    voiceRecordingTime.value++;
    if (voiceRecordingTime.value >= 60) {
      clearInterval(timer);
      cancelRecording();
    }
  }, 1000);
};

const stopRecording = () => {
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop();
  }
};

const processAudioRecording = async audioData => {
  try {
    const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' });
    const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });

    uploadPreview.value = {
      file: audioFile,
      url: URL.createObjectURL(audioBlob),
      type: 'voice',
      duration: Math.round(audioChunks.value.reduce((total, chunk) => total + chunk.duration, 0),
    };

    ElMessage.success('语音录制完成，可以发送');

    audioChunks.value = [];
  } catch (error) {
    console.error('处理音频失败:', error);
    ElMessage.error('处理音频失败');
  }
};

const uploadRecording = async () => {
  if (voiceRecordingTime.value < 1) {
    ElMessage.warning('语音时长不能少于1秒');
    audioChunks.value = [];
    isRecording.value = false;
    voiceRecordingTime.value = 0;
    return;
  }

  try {
    const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' });
    const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });

    uploadPreview.value = {
      file: audioFile,
      url: URL.createObjectURL(audioBlob),
      type: 'voice',
      duration: voiceRecordingTime.value,
      size: audioBlob.size,
      uploadData: null,
    };

    uploading.value = true;
    uploadProgress.value = 0;

    const result = await uploadApi.uploadChatVoice(
      props.conversationId,
      audioFile,
      progress => {
        uploadProgress.value = progress;
      }
    );

    uploadPreview.value.uploadData = result.data;
    ElMessage.success('语音上传成功');
  } catch (error) {
    console.error('语音上传失败:', error);
    ElMessage.error('语音上传失败');
    cancelUpload();
  } finally {
    uploading.value = false;
  }

  audioChunks.value = [];
};

const cancelRecording = () => {
  if (mediaRecorder.value) {
    mediaRecorder.value.stop();
  }
  if (timer) {
    clearInterval(timer);
  }
  isRecording.value = false;
  voiceRecordingTime.value = 0;

  audioChunks.value = [];
  uploadProgress.value = 0;
};

// 文件上传
const handleFileUpload = async file => {
  if (file.size > 100 * 1024 * 1024) {
    ElMessage.warning('文件大小不能超过100MB');
    return false;
  }

  try {
    uploading.value = true;
    uploadProgress.value = 0;

    const reader = new FileReader();
    reader.onload = e => {
      uploadPreview.value = {
        file: file,
        url: '',
        type: 'file',
        uploadData: null,
      };
    };
    reader.readAsDataURL(file);

    const result = await uploadApi.uploadChatFile(
      props.conversationId,
      file,
      progress => {
        uploadProgress.value = progress;
      }
    );

    uploadPreview.value.uploadData = result.data;
    ElMessage.success('文件上传成功');
  } catch (error) {
    console.error('文件上传失败:', error);
    ElMessage.error('文件上传失败');
    cancelUpload();
  } finally {
    uploading.value = false;
  }

  return false;
};

// 取消上传
const cancelUpload = () => {
  uploadPreview.value = {
    file: null,
    url: '',
    type: '',
    uploadData: null,
  };
  uploadProgress.value = 0;
};

// 拖拽处理
const handleDragEnter = e => {
  e.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = e => {
  e.preventDefault();
  if (e.relatedTarget === null || !e.relatedTarget.closest('.drag-overlay')) {
    isDragging.value = false;
  }
};

const handleDrop = async e => {
  e.preventDefault();
  isDragging.value = false;

  const files = e.dataTransfer.files;
  if (!files || files.length === 0) return;

  const file = files[0];

  if (file.type.startsWith('image/')) {
    await handleImageUpload(file);
  } else if (file.type.startsWith('video/')) {
    await handleVideoUpload(file);
  } else {
    await handleFileUpload(file);
  }
};

// 插入表情
const insertEmoji = emoji => {
  inputValue.value += emoji;
  showEmojiPicker.value = false;
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
    return `[语音]`;
  } else if (type === 'video') {
    return '[视频]';
  } else if (type === 'file') {
    return '[文件]';
  } else if (type === 'location') {
    return '[位置]';
  } else if (type === 'system') {
    return '[系统消息]';
  }
  return '[消息]';
};

// 获取当前用户信息
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('user') || '{}';
    const user = JSON.parse(userStr);
    return user || { id: null };
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return { id: null };
  }
};
</script>
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

.upload-preview {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 8px;
  border: 1px solid #e0e0e0;
}

.preview-image-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.preview-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.preview-file-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.file-icon {
  color: #409eff;
  flex-shrink: 0;
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 12px;
  color: #999;
}

.upload-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.9);
}

.preview-close {
  position: absolute;
  top: 4px;
  right: 4px;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
  background: #fff;
  border-radius: 50%;
  padding: 4px;
}

.preview-close:hover {
  color: #f56c6c;
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(7, 193, 96, 0.1);
  border: 2px dashed #07c160;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.drag-icon {
  color: #07c160;
  margin-bottom: 12px;
}

.drag-overlay p {
  color: #07c160;
  font-size: 14px;
  font-weight: 500;
}

.input-toolbar {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  position: relative;
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
  z-index: 20;
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

:deep(.el-button--success) {
  background-color: #67c23a;
  border-color: #67c23a;
}

:deep(.el-button--success):hover {
  background-color: #5daf34;
  border-color: #5daf34;
}

:deep(.el-progress-bar__inner) {
  background-color: #07c160;
}
</style>
