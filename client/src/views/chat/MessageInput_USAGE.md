# MessageInput 组件 - 文件上传功能使用指南

## 功能概述

MessageInput 组件现已支持完整的文件上传功能，包括：

1. **图片上传** - 支持上传并预览图片（最大10MB）
2. **文件上传** - 支持上传多种文件类型（最大100MB）
3. **拖拽上传** - 支持拖拽文件到输入区域
4. **进度追踪** - 实时显示上传进度
5. **预览功能** - 上传前预览图片和文件信息
6. **自动发送** - 上传完成后自动发送文件消息

## 基本使用

### 在 ChatWindow 中使用

```vue
<template>
  <div class="input-area">
    <MessageInput
      v-model="inputText"
      :loading="sending"
      :reply-to="replyToMessage"
      :conversation-id="props.conversationId"
      @send="sendMessage"
      @cancel-reply="replyToMessage = null"
      @send-file="sendFileMessage"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';

const inputText = ref('');
const sending = ref(false);
const replyToMessage = ref(null);

// 发送文本消息
const sendMessage = async content => {
  sending.value = true;
  try {
    await chatStore.sendMessage({
      conversationId: props.conversationId,
      type: 'text',
      content: { text: content },
      replyTo: replyToMessage.value?._id,
    });

    inputText.value = '';
    replyToMessage.value = null;
  } catch (error) {
    ElMessage.error('发送失败');
  } finally {
    sending.value = false;
  }
};

// 发送文件消息
const sendFileMessage = async messageData => {
  sending.value = true;
  try {
    await chatStore.sendMessage({
      conversationId: props.conversationId,
      type: messageData.type,
      content: messageData.content,
      replyTo: messageData.replyTo?._id,
    });

    replyToMessage.value = null;
  } catch (error) {
    ElMessage.error('发送失败');
  } finally {
    sending.value = false;
  }
};
</script>
```

## Props 属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `modelValue` | `String` | `''` | 输入框的值（v-model） |
| `loading` | `Boolean` | `false` | 发送中的状态 |
| `replyTo` | `Object` | `null` | 回复的消息对象 |
| `conversationId` | `String` | `''` | 当前会话ID |

## Events 事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `update:modelValue` | `value: String` | 输入框值变化 |
| `send` | `content: String` | 发送文本消息 |
| `send-file` | `messageData: Object` | 发送文件消息 |
| `cancel-reply` | - | 取消回复 |

## 文件消息数据结构

### 图片消息

```javascript
{
  type: 'image',
  content: {
    text: '',
    imageUrl: 'https://example.com/image.jpg',
    thumbnail: 'https://example.com/thumb.jpg',
    width: 800,
    height: 600,
    size: 102400, // 字节
    fileName: 'image.jpg'
  },
  replyTo: null
}
```

### 文件消息

```javascript
{
  type: 'file',
  content: {
    text: '',
    fileUrl: 'https://example.com/document.pdf',
    fileName: 'document.pdf',
    fileSize: 2048000, // 字节
    fileType: 'application/pdf'
  },
  replyTo: null
}
```

## 上传流程

### 图片上传流程

1. 用户点击图片按钮或拖拽图片
2. 组件验证文件类型（必须是图片）和大小（最大10MB）
3. 显示图片预览
4. 调用 `uploadChatImage` API 上传图片
5. 显示上传进度条
6. 上传成功后，显示"发送图片"按钮
7. 用户点击发送按钮，触发 `send-file` 事件

### 文件上传流程

1. 用户点击文件按钮或拖拽文件
2. 组件验证文件大小（最大100MB）
3. 显示文件信息
4. 调用 `uploadChatFile` API 上传文件
5. 显示上传进度条
6. 上传成功后，显示"发送文件"按钮
7. 用户点击发送按钮，触发 `send-file` 事件

## 拖拽上传

用户可以将文件直接拖拽到输入区域：

- **拖拽图片**：自动识别为图片消息
- **拖拽其他文件**：自动识别为文件消息
- **拖拽区域**：整个输入框区域

## UI 功能

### 预览区域

上传文件后，会显示预览信息：

**图片预览**：
- 显示图片缩略图（60x60px）
- 显示文件名和大小
- 显示上传进度条
- 可关闭预览

**文件预览**：
- 显示文件图标
- 显示文件名和大小
- 显示上传进度条
- 可关闭预览

### 进度条

- 实时显示上传进度（0-100%）
- 进度条颜色：绿色（#07c160）
- 显示在预览区域底部

### 按钮

- **发送按钮**：发送文本消息
- **发送图片/文件按钮**：发送上传的文件
- 按钮状态：
  - 上传中：禁用
  - 上传完成：启用

## 错误处理

### 文件验证错误

```javascript
// 图片类型错误
ElMessage.warning('请选择图片文件');

// 图片大小错误
ElMessage.warning('图片大小不能超过10MB');

// 文件大小错误
ElMessage.warning('文件大小不能超过100MB');
```

### 上传错误

```javascript
// 上传失败
ElMessage.error(error.message || '文件上传失败');

// 发送失败
ElMessage.error('发送失败');
```

## API 端点

### 上传图片

```
POST /api/v1/chat/conversations/{conversationId}/upload-image
Content-Type: multipart/form-data

Request:
- file: File (image/*)

Response:
{
  success: true,
  data: {
    url: string,
    thumbnail: string,
    width: number,
    height: number,
    size: number
  }
}
```

### 上传文件

```
POST /api/v1/chat/conversations/{conversationId}/upload-file
Content-Type: multipart/form-data

Request:
- file: File (any type)

Response:
{
  success: true,
  data: {
    url: string,
    fileName: string,
    fileSize: number,
    fileType: string
  }
}
```

## 样式定制

组件使用了微信风格的绿色主题（#07c160），可以通过覆盖以下CSS变量来定制：

```css
/* 进度条颜色 */
:deep(.el-progress-bar__inner) {
  background-color: #07c160;
}

/* 拖拽区域颜色 */
.drag-overlay {
  border-color: #07c160;
}

.drag-icon {
  color: #07c160;
}

.drag-overlay p {
  color: #07c160;
}
```

## 注意事项

1. **conversationId 是必需的**：必须提供有效的会话ID才能上传文件
2. **文件大小限制**：严格遵守大小限制，超出限制会提示用户
3. **并发上传**：同一时间只能上传一个文件
4. **取消上传**：用户可以随时关闭预览来取消上传
5. **网络异常**：上传失败后会自动清理上传状态

## 完整示例

```vue
<template>
  <ChatWindow :conversation-id="conversationId">
    <template #input-area>
      <MessageInput
        v-model="inputText"
        :loading="sending"
        :reply-to="replyToMessage"
        :conversation-id="conversationId"
        @send="handleSendText"
        @send-file="handleSendFile"
        @cancel-reply="handleCancelReply"
      />
    </template>
  </ChatWindow>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useChatStore } from '@/stores/chat';
import MessageInput from './components/MessageInput.vue';

const chatStore = useChatStore();
const inputText = ref('');
const sending = ref(false);
const replyToMessage = ref(null);
const conversationId = ref('conversation_123');

const handleSendText = async content => {
  sending.value = true;
  try {
    await chatStore.sendMessage({
      conversationId: conversationId.value,
      type: 'text',
      content: { text: content },
      replyTo: replyToMessage.value?._id,
    });
    inputText.value = '';
    replyToMessage.value = null;
  } catch (error) {
    ElMessage.error('发送失败');
  } finally {
    sending.value = false;
  }
};

const handleSendFile = async messageData => {
  sending.value = true;
  try {
    await chatStore.sendMessage({
      conversationId: conversationId.value,
      type: messageData.type,
      content: messageData.content,
      replyTo: messageData.replyTo?._id,
    });
    replyToMessage.value = null;
  } catch (error) {
    ElMessage.error('发送失败');
  } finally {
    sending.value = false;
  }
};

const handleCancelReply = () => {
  replyToMessage.value = null;
};
</script>
```

## 测试建议

1. **图片上传测试**
   - 上传不同格式的图片（jpg, png, gif, webp）
   - 测试大小限制（<10MB, >10MB）
   - 测试拖拽上传
   - 测试取消上传

2. **文件上传测试**
   - 上传不同类型的文件（pdf, doc, docx, xlsx, zip）
   - 测试大小限制（<100MB, >100MB）
   - 测试拖拽上传
   - 测试取消上传

3. **网络测试**
   - 测试慢速网络
   - 测试网络中断
   - 测试上传超时

4. **UI 测试**
   - 测试进度条显示
   - 测试预览显示
   - 测试按钮状态
   - 测试拖拽提示

## 故障排除

### 问题：上传失败

**可能原因**：
1. conversationId 无效
2. 网络连接问题
3. 服务器端错误

**解决方法**：
1. 检查 conversationId 是否正确
2. 检查网络连接
3. 查看服务器日志

### 问题：文件太大

**可能原因**：
1. 文件大小超出限制

**解决方法**：
1. 压缩图片
2. 使用更小的文件

### 问题：文件类型不支持

**可能原因**：
1. 文件类型不在支持列表中

**解决方法**：
1. 检查文件类型
2. 转换为支持的格式
