# Chat Module 文件上传功能实现总结

## 实现概述

为智慧乡村平台的Chat模块实现了完整的文件上传功能，包括图片上传、文件上传、拖拽上传、进度追踪和UI优化。

## 实现的功能

### 1. 图片上传功能

**功能特性**：
- ✅ 支持上传图片文件（jpeg, png, gif, webp）
- ✅ 文件大小限制：最大10MB
- ✅ 实时预览上传的图片
- ✅ 显示文件名和大小
- ✅ 上传进度追踪（0-100%）
- ✅ 图片缩略图显示（60x60px）

**实现位置**：
- 组件：`client/src/views/chat/components/MessageInput.vue`
- API：`client/src/api/uploadApi.js`

**核心代码**：
```javascript
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

    uploadPreview.value.uploadData = result.data || result;
    ElMessage.success('图片上传成功');
  } catch (error) {
    console.error('图片上传失败:', error);
    ElMessage.error(error.message || '图片上传失败');
    cancelUpload();
  } finally {
    uploading.value = false;
  }

  return false;
};
```

### 2. 文件上传功能

**功能特性**：
- ✅ 支持上传多种文件类型（pdf, doc, docx, xlsx, zip等）
- ✅ 文件大小限制：最大100MB
- ✅ 显示文件图标和信息
- ✅ 显示文件名和大小
- ✅ 上传进度追踪（0-100%）
- ✅ 文件类型图标显示

**实现位置**：
- 组件：`client/src/views/chat/components/MessageInput.vue`
- API：`client/src/api/uploadApi.js`

**核心代码**：
```javascript
const handleFileUpload = async file => {
  if (file.size > 100 * 1024 * 1024) {
    ElMessage.warning('文件大小不能超过100MB');
    return false;
  }

  try {
    uploading.value = true;
    uploadProgress.value = 0;

    uploadPreview.value = {
      file: file,
      url: '',
      type: 'file',
      uploadData: null,
    };

    const result = await uploadApi.uploadChatFile(
      props.conversationId,
      file,
      progress => {
        uploadProgress.value = progress;
      }
    );

    uploadPreview.value.uploadData = result.data || result;
    ElMessage.success('文件上传成功');
  } catch (error) {
    console.error('文件上传失败:', error);
    ElMessage.error(error.message || '文件上传失败');
    cancelUpload();
  } finally {
    uploading.value = false;
  }

  return false;
};
```

### 3. 发送消息功能

**功能特性**：
- ✅ 上传完成后自动显示发送按钮
- ✅ 支持发送图片消息
- ✅ 支持发送文件消息
- ✅ 集成回复功能
- ✅ 错误处理

**实现位置**：
- 组件：`client/src/views/chat/components/MessageInput.vue`
- 父组件：`client/src/views/chat/components/ChatWindow.vue`

**核心代码**：
```javascript
const handleSendFile = () => {
  if (!uploadPreview.value.uploadData) {
    ElMessage.warning('请等待文件上传完成');
    return;
  }

  const fileData = uploadPreview.value.uploadData;
  const messageData = {
    type: uploadPreview.value.type,
    content: uploadPreview.value.type === 'image'
      ? {
          text: '',
          imageUrl: fileData.url,
          thumbnail: fileData.thumbnail || fileData.url,
          width: fileData.width,
          height: fileData.height,
          size: uploadPreview.value.file.size,
          fileName: uploadPreview.value.file.name,
        }
      : {
          text: '',
          fileUrl: fileData.url,
          fileName: uploadPreview.value.file.name,
          fileSize: uploadPreview.value.file.size,
          fileType: uploadPreview.value.file.type,
        },
    replyTo: props.replyTo,
  };

  emit('send-file', messageData);
  cancelUpload();
};
```

### 4. 技术实现

**使用的技术**：
- ✅ Axios HTTP客户端
- ✅ FormData对象
- ✅ 进度事件追踪（onUploadProgress）
- ✅ FileReader API（图片预览）
- ✅ Vue 3 Composition API
- ✅ Element Plus UI组件

**API实现**：
```javascript
export const uploadApi = {
  uploadImage(file, onUploadProgress) {
    const formData = new FormData();
    formData.append('file', file);

    return axiosInstance.post('/api/v1/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: progressEvent => {
        if (onUploadProgress) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(progress);
        }
      },
    });
  },

  uploadChatImage(conversationId, file, onUploadProgress) {
    const formData = new FormData();
    formData.append('file', file);

    return axiosInstance.post(
      `/api/v1/chat/conversations/${conversationId}/upload-image`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: progressEvent => {
          if (onUploadProgress) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onUploadProgress(progress);
          }
        },
      }
    );
  },

  uploadChatFile(conversationId, file, onUploadProgress) {
    const formData = new FormData();
    formData.append('file', file);

    return axiosInstance.post(
      `/api/v1/chat/conversations/${conversationId}/upload-file`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: progressEvent => {
          if (onUploadProgress) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onUploadProgress(progress);
          }
        },
      }
    );
  },
};
```

### 5. 消息格式定义

**图片消息数据结构**：
```javascript
{
  type: 'image',
  content: {
    text: '',
    imageUrl: 'https://example.com/image.jpg',
    thumbnail: 'https://example.com/thumb.jpg',
    width: 800,
    height: 600,
    size: 102400,
    fileName: 'image.jpg'
  },
  replyTo: null
}
```

**文件消息数据结构**：
```javascript
{
  type: 'file',
  content: {
    text: '',
    fileUrl: 'https://example.com/document.pdf',
    fileName: 'document.pdf',
    fileSize: 2048000,
    fileType: 'application/pdf'
  },
  replyTo: null
}
```

### 6. UI优化

**实现的功能**：
- ✅ 进度条显示（绿色主题 #07c160）
- ✅ 图片预览（缩略图）
- ✅ 文件信息显示
- ✅ 文件图标（Document图标）
- ✅ 拖拽上传（拖拽覆盖层）
- ✅ 上传状态提示
- ✅ 错误提示（Element Plus ElMessage）
- ✅ 取消上传按钮

**拖拽上传实现**：
```javascript
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
  } else {
    await handleFileUpload(file);
  }
};
```

**UI样式**：
```css
/* 拖拽覆盖层 */
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

/* 预览区域 */
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

/* 进度条 */
:deep(.el-progress-bar__inner) {
  background-color: #07c160;
}
```

### 7. MessageBubble组件更新

**更新内容**：
- ✅ 支持新的图片消息数据结构
- ✅ 支持新的文件消息数据结构
- ✅ 添加文件下载功能
- ✅ 优化文件消息显示
- ✅ 添加下载图标

**文件下载实现**：
```javascript
const handleFileDownload = async () => {
  const fileUrl =
    props.message.content?.fileUrl || props.message.content?.file?.url;
  const fileName =
    props.message.content?.fileName ||
    props.message.content?.file?.name ||
    '文件';

  try {
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    ElMessage.success('文件下载成功');
  } catch (error) {
    console.error('文件下载失败:', error);
    ElMessage.error('文件下载失败');
  }
};
```

## 文件清单

### 新增文件

1. **client/src/api/uploadApi.js**
   - 文件上传API模块
   - 包含上传图片和文件的函数
   - 支持进度追踪

2. **client/src/views/chat/MESSAGE_FORMAT.md**
   - 消息数据结构规范文档
   - 包含所有消息类型的定义
   - API端点说明

3. **client/src/views/chat/MessageInput_USAGE.md**
   - MessageInput组件使用指南
   - 包含示例代码
   - 故障排除指南

### 修改文件

1. **client/src/views/chat/components/MessageInput.vue**
   - 添加图片上传功能
   - 添加文件上传功能
   - 添加拖拽上传功能
   - 添加进度追踪
   - 添加预览功能
   - 添加UI优化

2. **client/src/views/chat/components/ChatWindow.vue**
   - 添加 send-file 事件处理
   - 添加 sendFileMessage 函数
   - 传递 conversationId 属性

3. **client/src/views/chat/components/MessageBubble.vue**
   - 更新图片消息显示逻辑
   - 更新文件消息显示逻辑
   - 添加文件下载功能
   - 添加下载图标

## API端点

### 图片上传

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

### 文件上传

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

## 支持的文件类型

### 图片类型
- image/jpeg
- image/png
- image/gif
- image/webp

### 文档类型
- application/pdf
- application/msword
- application/vnd.openxmlformats-officedocument.wordprocessingml.document
- application/vnd.ms-excel
- application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

### 其他类型
- application/zip
- application/x-rar-compressed

## 文件大小限制

- **图片**: 最大 10MB
- **文件**: 最大 100MB

## 使用示例

### 基本使用

```vue
<template>
  <MessageInput
    v-model="inputText"
    :loading="sending"
    :reply-to="replyToMessage"
    :conversation-id="conversationId"
    @send="sendMessage"
    @send-file="sendFileMessage"
    @cancel-reply="replyToMessage = null"
  />
</template>

<script setup>
const inputText = ref('');
const sending = ref(false);
const replyToMessage = ref(null);

const sendMessage = async content => {
  // 发送文本消息
};

const sendFileMessage = async messageData => {
  // 发送文件消息
};
</script>
```

## 错误处理

### 文件验证错误

- **图片类型错误**: '请选择图片文件'
- **图片大小错误**: '图片大小不能超过10MB'
- **文件大小错误**: '文件大小不能超过100MB'

### 上传错误

- **上传失败**: error.message || '文件上传失败'
- **发送失败**: '发送失败'

## 后续建议

### 服务端实现

1. 需要实现以下API端点：
   - POST /api/v1/chat/conversations/{conversationId}/upload-image
   - POST /api/v1/chat/conversations/{conversationId}/upload-file

2. 文件存储：
   - 图片应生成缩略图
   - 文件应存储在安全的位置
   - 考虑使用CDN加速

3. 安全措施：
   - 文件类型验证
   - 文件大小验证
   - 病毒扫描
   - 访问控制

### 功能增强

1. **多文件上传** - 支持一次上传多个文件
2. **粘贴上传** - 支持Ctrl+V粘贴图片
3. **分片上传** - 支持大文件分片上传
4. **断点续传** - 支持断点续传功能
5. **压缩优化** - 上传前自动压缩图片
6. **水印功能** - 为图片添加水印

## 总结

本次实现为智慧乡村平台的Chat模块提供了完整的文件上传功能，包括：

✅ 完整的图片上传功能（预览、进度、验证）
✅ 完整的文件上传功能（信息显示、进度、验证）
✅ 拖拽上传支持
✅ 进度追踪功能
✅ 发送消息功能
✅ 文件下载功能
✅ 完善的错误处理
✅ 优化的UI体验
✅ 详细的使用文档

所有代码都遵循项目的代码规范，使用了Vue 3 Composition API和Element Plus组件库，确保了代码的可维护性和扩展性。
