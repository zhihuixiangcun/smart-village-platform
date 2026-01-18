# Chat Module - 消息数据结构规范

## 消息类型定义

### 1. 文本消息 (text)

```javascript
{
  type: 'text',
  content: {
    text: '消息内容'
  },
  sender: { ... },
  conversationId: '...',
  createdAt: '2024-01-01T00:00:00.000Z',
  status: 'sent' // sent, delivered, read
}
```

### 2. 图片消息 (image)

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
  sender: { ... },
  conversationId: '...',
  createdAt: '2024-01-01T00:00:00.000Z',
  status: 'sent'
}
```

### 3. 文件消息 (file)

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
  sender: { ... },
  conversationId: '...',
  createdAt: '2024-01-01T00:00:00.000Z',
  status: 'sent'
}
```

### 4. 语音消息 (voice)

```javascript
{
  type: 'voice',
  content: {
    text: '',
    voiceUrl: 'https://example.com/voice.mp3',
    duration: 5, // 秒
    size: 51200
  },
  sender: { ... },
  conversationId: '...',
  createdAt: '2024-01-01T00:00:00.000Z',
  status: 'sent'
}
```

### 5. 视频消息 (video)

```javascript
{
  type: 'video',
  content: {
    text: '',
    videoUrl: 'https://example.com/video.mp4',
    thumbnail: 'https://example.com/video-thumb.jpg',
    duration: 30, // 秒
    size: 5120000
  },
  sender: { ... },
  conversationId: '...',
  createdAt: '2024-01-01T00:00:00.000Z',
  status: 'sent'
}
```

### 6. 位置消息 (location)

```javascript
{
  type: 'location',
  content: {
    text: '',
    latitude: 39.9042,
    longitude: 116.4074,
    name: '北京市',
    address: '北京市东城区长安街1号'
  },
  sender: { ... },
  conversationId: '...',
  createdAt: '2024-01-01T00:00:00.000Z',
  status: 'sent'
}
```

### 7. 系统消息 (system)

```javascript
{
  type: 'system',
  content: {
    system: {
      text: '张三加入了群聊'
    }
  },
  sender: { ... },
  conversationId: '...',
  createdAt: '2024-01-01T00:00:00.000Z'
}
```

### 8. 撤回消息 (recall)

```javascript
{
  type: 'recall',
  content: {
    text: '',
    originalMessage: { ... } // 原消息内容
  },
  sender: { ... },
  conversationId: '...',
  createdAt: '2024-01-01T00:00:00.000Z'
}
```

## 回复引用结构

```javascript
{
  replyTo: {
    _id: 'message_id',
    type: 'text', // 或其他类型
    content: { ... },
    sender: {
      _id: 'sender_id',
      profile: {
        nickName: '张三'
      },
      username: 'zhangsan'
    }
  }
}
```

## 文件上传响应格式

### 图片上传成功

```javascript
{
  success: true,
  data: {
    url: 'https://example.com/uploads/images/image_123.jpg',
    thumbnail: 'https://example.com/uploads/images/thumb_123.jpg',
    width: 800,
    height: 600,
    size: 102400
  }
}
```

### 文件上传成功

```javascript
{
  success: true,
  data: {
    url: 'https://example.com/uploads/files/document_456.pdf',
    fileName: 'document.pdf',
    fileSize: 2048000,
    fileType: 'application/pdf'
  }
}
```

## 文件大小限制

- **图片**: 最大 10MB
- **文件**: 最大 100MB
- **语音**: 最大 5MB
- **视频**: 最大 50MB

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

## API端点

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

### 发送消息
```
POST /api/v1/chat/conversations/{conversationId}/messages

Request:
{
  type: 'text' | 'image' | 'file' | 'voice' | 'video' | 'location',
  content: { ... },
  replyTo: string | null // 消息ID
}

Response:
{
  success: true,
  data: {
    _id: string,
    type: string,
    content: object,
    sender: object,
    conversationId: string,
    createdAt: string,
    status: string
  }
}
```

## 使用示例

### 发送图片消息

```javascript
const messageData = {
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
};

emit('send-file', messageData);
```

### 发送文件消息

```javascript
const messageData = {
  type: 'file',
  content: {
    text: '',
    fileUrl: 'https://example.com/document.pdf',
    fileName: 'document.pdf',
    fileSize: 2048000,
    fileType: 'application/pdf'
  },
  replyTo: null
};

emit('send-file', messageData);
```

## 错误处理

### 常见错误码

- `400` - 参数错误
- `401` - 未授权
- `413` - 文件过大
- `415` - 不支持的文件类型
- `500` - 服务器错误

### 错误响应格式

```javascript
{
  success: false,
  error: '文件大小超过限制',
  message: '文件大小不能超过100MB'
}
```

## 注意事项

1. **安全性**: 所有上传的文件都应该进行病毒扫描和类型验证
2. **存储**: 大文件应该使用分块上传
3. **CDN**: 建议使用CDN加速文件访问
4. **过期**: 可以设置临时上传链接的过期时间
5. **压缩**: 图片应该在上传前进行压缩
6. **水印**: 可以考虑为图片添加水印
7. **加密**: 敏感文件应该加密存储
