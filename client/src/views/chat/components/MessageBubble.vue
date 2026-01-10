<template>
  <div class="message-bubble" :class="{ self: isSelf }">
    <div class="avatar" v-if="!isSelf">
      <el-avatar :src="message.sender?.profile?.avatar" :size="40">
        {{ message.sender?.profile?.nickName?.charAt(0) || message.sender?.username?.charAt(0) }}
      </el-avatar>
    </div>

    <div class="message-content">
      <div v-if="!isSelf && isGroup" class="sender-name">
        {{ message.sender?.profile?.nickName || message.sender?.username }}
      </div>

      <div class="bubble" :class="`type-${message.type}`">
        <!-- 文本消息 -->
        <template v-if="message.type === 'text'">
          <div class="text-content">{{ message.content?.text }}</div>
        </template>

        <!-- 图片消息 -->
        <template v-else-if="message.type === 'image'">
          <el-image
            :src="message.content?.image?.url"
            :preview-src-list="[message.content?.image?.url]"
            fit="cover"
            class="image-content"
          />
        </template>

        <!-- 语音消息 -->
        <template v-else-if="message.type === 'voice'">
          <div class="voice-content">
            <el-icon><Microphone /></el-icon>
            <span>{{ message.content?.voice?.duration || 0 }}"</span>
          </div>
        </template>

        <!-- 视频消息 -->
        <template v-else-if="message.type === 'video'">
          <div class="video-content">
            <video :src="message.content?.video?.url" controls />
          </div>
        </template>

        <!-- 文件消息 -->
        <template v-else-if="message.type === 'file'">
          <div class="file-content">
            <el-icon><Document /></el-icon>
            <div class="file-info">
              <div class="file-name">{{ message.content?.file?.name }}</div>
              <div class="file-size">{{ formatFileSize(message.content?.file?.size) }}</div>
            </div>
          </div>
        </template>

        <!-- 位置消息 -->
        <template v-else-if="message.type === 'location'">
          <div class="location-content">
            <div class="location-name">{{ message.content?.location?.name }}</div>
            <div class="location-address">{{ message.content?.location?.address }}</div>
          </div>
        </template>

        <!-- 系统消息 -->
        <template v-else-if="message.type === 'system'">
          <div class="system-content">
            {{ message.content?.system?.text }}
          </div>
        </template>

        <!-- 撤回消息 -->
        <template v-else-if="message.type === 'recall'">
          <div class="recall-content">
            {{
              isSelf
                ? '你撤回了一条消息'
                : `${message.sender?.profile?.nickName || '对方'}撤回了一条消息`
            }}
          </div>
        </template>

        <!-- 回复引用 -->
        <div v-if="message.replyTo" class="reply-ref">
          <div class="reply-ref-content">
            {{ getReplyRefText(message.replyTo) }}
          </div>
        </div>
      </div>

      <div class="message-meta">
        <span class="time">{{ formattedTime }}</span>
        <span v-if="isSelf" class="status">
          <el-icon v-if="message.status === 'sent'"><Check /></el-icon>
          <el-icon v-else-if="message.status === 'delivered'"><CircleCheck /></el-icon>
          <el-icon v-else-if="message.status === 'read'" class="read"><CircleCheck /></el-icon>
        </span>
      </div>

      <!-- 操作菜单 -->
      <el-dropdown
        v-if="!message.isRecalled && (isSelf || message.type !== 'system')"
        trigger="click"
        @command="handleCommand"
      >
        <div class="more-btn">
          <el-icon><MoreFilled /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="reply">
              <el-icon><ChatDotRound /></el-icon>
              回复
            </el-dropdown-item>
            <el-dropdown-item v-if="isSelf && canRecall" command="recall">
              <el-icon><Delete /></el-icon>
              撤回
            </el-dropdown-item>
            <el-dropdown-item command="copy" v-if="message.type === 'text'">
              <el-icon><CopyDocument /></el-icon>
              复制
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import {
  Microphone,
  Document,
  Check,
  CircleCheck,
  MoreFilled,
  ChatDotRound,
  Delete,
  CopyDocument,
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  isSelf: {
    type: Boolean,
    default: false,
  },
  isGroup: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['reply', 'recall']);

// 格式化时间
const formattedTime = computed(() => {
  const createdAt = props.message.createdAt;
  if (!createdAt) return '';

  const now = dayjs();
  const msgTime = dayjs(createdAt);
  const diffMins = now.diff(msgTime, 'minute');

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return msgTime.fromNow();

  // 超过1小时显示具体时间
  return msgTime.format('HH:mm');
});

// 是否可以撤回（2分钟内）
const canRecall = computed(() => {
  if (!props.message.createdAt) return false;
  const diffMins = dayjs().diff(dayjs(props.message.createdAt), 'minute');
  return diffMins <= 2;
});

// 格式化文件大小
const formatFileSize = bytes => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// 获取回复引用文本
const getReplyRefText = replyTo => {
  if (!replyTo) return '';
  const sender = replyTo.sender?.profile?.nickName || replyTo.sender?.username || '对方';
  const prefix = props.isSelf ? '' : `${sender}: `;

  if (replyTo.type === 'text') {
    return prefix + replyTo.content?.text;
  } else if (replyTo.type === 'image') {
    return prefix + '[图片]';
  } else if (replyTo.type === 'voice') {
    return prefix + '[语音]';
  } else if (replyTo.type === 'video') {
    return prefix + '[视频]';
  } else if (replyTo.type === 'file') {
    return prefix + '[文件]';
  } else if (replyTo.type === 'recall') {
    return prefix + '[撤回的消息]';
  }
  return prefix + '[消息]';
};

// 处理操作命令
const handleCommand = command => {
  switch (command) {
    case 'reply':
      emit('reply', props.message);
      break;
    case 'recall':
      emit('recall', props.message);
      break;
    case 'copy':
      navigator.clipboard.writeText(props.message.content?.text || '');
      ElMessage.success('已复制');
      break;
  }
};
</script>

<style scoped>
.message-bubble {
  display: flex;
  margin-bottom: 16px;
  align-items: flex-start;
}

.message-bubble.self {
  flex-direction: row-reverse;
}

.avatar {
  margin-right: 8px;
  flex-shrink: 0;
}

.self .avatar {
  margin-right: 0;
  margin-left: 8px;
}

.message-content {
  max-width: 70%;
  position: relative;
}

.sender-name {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
  padding-left: 12px;
}

.bubble {
  padding: 8px 12px;
  border-radius: 8px;
  position: relative;
  word-wrap: break-word;
  word-break: break-all;
}

.message-bubble:not(.self) .bubble {
  background: #fff;
  border: 1px solid #e0e0e0;
}

.message-bubble.self .bubble {
  background: #95ec69; /* 微信绿色 */
  border: none;
}

/* 文本消息 */
.text-content {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

/* 图片消息 */
.image-content {
  max-width: 200px;
  max-height: 200px;
  border-radius: 4px;
}

/* 语音消息 */
.voice-content {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 80px;
}

/* 视频消息 */
.video-content video {
  max-width: 200px;
  border-radius: 4px;
}

/* 文件消息 */
.file-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  min-width: 200px;
}

.file-info {
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
  margin-top: 2px;
}

/* 位置消息 */
.location-content {
  padding: 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  min-width: 150px;
}

.location-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.location-address {
  font-size: 12px;
  color: #666;
}

/* 系统消息 */
.system-content {
  font-size: 12px;
  color: #999;
  text-align: center;
  padding: 4px 8px;
}

/* 撤回消息 */
.recall-content {
  font-size: 12px;
  color: #999;
  font-style: italic;
}

/* 回复引用 */
.reply-ref {
  margin-bottom: 4px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  border-left: 3px solid #07c160;
}

.reply-ref-content {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

/* 消息元信息 */
.message-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 0 12px;
}

.self .message-meta {
  justify-content: flex-end;
}

.time {
  font-size: 10px;
  color: #999;
}

.status {
  font-size: 12px;
  color: #999;
}

.status.read {
  color: #07c160;
}

/* 更多按钮 */
.more-btn {
  position: absolute;
  top: -20px;
  right: 0;
  opacity: 0;
  transition: opacity 0.2s;
  cursor: pointer;
  padding: 4px;
}

.message-bubble:hover .more-btn {
  opacity: 1;
}
</style>
