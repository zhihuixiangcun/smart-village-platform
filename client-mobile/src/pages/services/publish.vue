<template>
  <div class="publish-page">
    <!-- 顶部导航栏 -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <span class="header-title">发布公告</span>
      <button class="draft-btn" @click="saveDraft">
        <span class="btn-text">草稿</span>
      </button>
    </div>

    <!-- 发布表单 -->
    <div class="publish-form">
      <!-- 标题 -->
      <div class="form-item">
        <label class="form-label required">公告标题</label>
        <input
          v-model="form.title"
          type="text"
          class="form-input"
          placeholder="请输入公告标题"
          :class="{ 'large-text': isElderlyMode }"
        />
      </div>

      <!-- 类型 -->
      <div class="form-item">
        <label class="form-label required">公告类型</label>
        <div class="type-options">
          <div
            v-for="type in announcementTypes"
            :key="type.value"
            :class="['type-option', { 'type-option--active': form.type === type.value }]"
            @click="selectType(type.value)"
          >
            <span class="type-icon">{{ type.icon }}</span>
            <span class="type-label">{{ type.label }}</span>
          </div>
        </div>
      </div>

      <!-- 范围 -->
      <div class="form-item">
        <label class="form-label required">发布范围</label>
        <div class="range-selector">
          <div
            v-for="range in ranges"
            :key="range.value"
            :class="['range-item', { 'range-item--active': form.range === range.value }]"
            @click="selectRange(range.value)"
          >
            <span class="range-text">{{ range.label }}</span>
          </div>
        </div>
      </div>

      <!-- 内容 -->
      <div class="form-item">
        <label class="form-label required">公告内容</label>
        <textarea
          v-model="form.content"
          class="form-textarea"
          placeholder="请输入公告内容..."
          rows="8"
          :class="{ 'large-text': isElderlyMode }"
        ></textarea>
        <div class="char-count">{{ form.content.length }}/2000</div>
      </div>

      <!-- 图片上传 -->
      <div class="form-item">
        <label class="form-label">添加图片（可选）</label>
        <div class="image-upload">
          <div
            v-for="(image, index) in form.images"
            :key="index"
            class="upload-item"
          >
            <img :src="image" class="upload-image" />
            <button class="remove-btn" @click="removeImage(index)">×</button>
          </div>
          <div v-if="form.images.length < 9" class="upload-btn" @click="chooseImage">
            <span class="upload-icon">📷</span>
            <span class="upload-text">添加图片</span>
          </div>
        </div>
      </div>

      <!-- 附件上传 -->
      <div class="form-item">
        <label class="form-label">添加附件（可选）</label>
        <div class="attachment-list">
          <div
            v-for="(file, index) in form.attachments"
            :key="index"
            class="attachment-item"
          >
            <span class="file-icon">📎</span>
            <span class="file-name">{{ file.name }}</span>
            <button class="file-remove" @click="removeAttachment(index)">×</button>
          </div>
          <div class="add-attachment" @click="chooseFile">
            <span class="add-icon">➕</span>
            <span class="add-text">添加附件</span>
          </div>
        </div>
      </div>

      <!-- 优先级 -->
      <div class="form-item">
        <label class="form-label">优先级</label>
        <div class="priority-options">
          <div
            v-for="priority in priorities"
            :key="priority.value"
            :class="['priority-option', { 'priority-option--active': form.priority === priority.value }]"
            @click="selectPriority(priority.value)"
          >
            <span class="priority-dot" :style="{ background: priority.color }"></span>
            <span class="priority-label">{{ priority.label }}</span>
          </div>
        </div>
      </div>

      <!-- 定时发布 -->
      <div class="form-item">
        <label class="form-label">定时发布</label>
        <div class="switch-row">
          <span class="switch-label">{{ form.scheduled ? '已开启' : '未开启' }}</span>
          <input v-model="form.scheduled" type="checkbox" class="switch" />
        </div>
        <div v-if="form.scheduled" class="datetime-picker">
          <input
            v-model="form.publishTime"
            type="datetime-local"
            class="datetime-input"
          />
        </div>
      </div>

      <!-- 置顶 -->
      <div class="form-item">
        <label class="form-label">是否置顶</label>
        <div class="switch-row">
          <span class="switch-label">{{ form.pinned ? '是' : '否' }}</span>
          <input v-model="form.pinned" type="checkbox" class="switch" />
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="footer-actions">
      <button class="action-btn secondary" @click="preview">
        <span class="btn-text">预览</span>
      </button>
      <button class="action-btn primary" :disabled="!canSubmit" @click="submit">
        <span class="btn-text">发布</span>
      </button>
    </div>

    <!-- 预览弹窗 -->
    <div v-if="showPreview" class="preview-overlay" @click="showPreview = false">
      <div class="preview-content" @click.stop>
        <div class="preview-header">
          <span class="preview-title">公告预览</span>
          <button class="preview-close" @click="showPreview = false">×</button>
        </div>
        <div class="preview-body">
          <div class="preview-type">
            <span class="type-badge">{{ getTypeLabel(form.type) }}</span>
          </div>
          <div class="preview-title-text">{{ form.title || '无标题' }}</div>
          <div class="preview-meta">
            <span class="meta-item">{{ getUserInfo().name }}</span>
            <span class="meta-item">刚刚</span>
          </div>
          <div class="preview-content-text">{{ form.content || '暂无内容' }}</div>
          <div v-if="form.images.length > 0" class="preview-images">
            <img
              v-for="(image, index) in form.images"
              :key="index"
              :src="image"
              class="preview-image"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'

const router = useRouter()
const userStore = useUserStore()
const elderlyStore = useElderlyStore()

// 公告类型
const announcementTypes = [
  { value: 'notice', label: '通知公告', icon: '📢' },
  { value: 'policy', label: '政策宣传', icon: '📋' },
  { value: 'activity', label: '活动通知', icon: '🎉' },
  { value: 'warning', label: '紧急通知', icon: '⚠️' },
  { value: 'other', label: '其他', icon: '📄' }
]

// 发布范围
const ranges = [
  { value: 'all', label: '全村' },
  { value: 'group', label: '指定组' },
  { value: 'custom', label: '自定义' }
]

// 优先级
const priorities = [
  { value: 'low', label: '普通', color: '#52c41a' },
  { value: 'medium', label: '重要', color: '#faad14' },
  { value: 'high', label: '紧急', color: '#ff4d4f' }
]

// 表单数据
const form = ref({
  title: '',
  type: 'notice',
  range: 'all',
  content: '',
  images: [],
  attachments: [],
  priority: 'low',
  scheduled: false,
  publishTime: '',
  pinned: false
})

// 预览显示状态
const showPreview = ref(false)

// 是否适老化模式
const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 是否可以提交
const canSubmit = computed(() => {
  return form.value.title.trim() && form.value.content.trim()
})

// 获取用户信息
const getUserInfo = () => {
  return userStore.userInfo || { name: '村民' }
}

// 获取类型标签
const getTypeLabel = (type) => {
  const typeObj = announcementTypes.find(t => t.value === type)
  return typeObj ? typeObj.label : '公告'
}

// 选择类型
const selectType = (value) => {
  form.value.type = value
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 选择范围
const selectRange = (value) => {
  form.value.range = value
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 选择优先级
const selectPriority = (value) => {
  form.value.priority = value
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 选择图片
const chooseImage = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const url = URL.createObjectURL(file)
      form.value.images.push(url)
    }
  }
  input.click()
}

// 移除图片
const removeImage = (index) => {
  form.value.images.splice(index, 1)
}

// 选择附件
const chooseFile = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      form.value.attachments.push({
        name: file.name,
        file
      })
    }
  }
  input.click()
}

// 移除附件
const removeAttachment = (index) => {
  form.value.attachments.splice(index, 1)
}

// 保存草稿
const saveDraft = () => {
  // TODO: 保存草稿
  localStorage.setItem('announcement_draft', JSON.stringify(form.value))
  alert('草稿已保存')
}

// 预览
const preview = () => {
  if (!form.value.title.trim()) {
    alert('请先输入公告标题')
    return
  }
  showPreview.value = true
}

// 提交发布
const submit = () => {
  if (!canSubmit.value) {
    alert('请填写标题和内容')
    return
  }

  // TODO: 调用API发布公告
  console.log('发布公告:', form.value)

  alert('公告发布成功')
  router.back()
}

// 返回
const goBack = () => {
  router.back()
}
</script>

<style lang="scss" scoped>
.publish-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.page-header {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #eee;

  .back-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: none;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 20px;

    &:active {
      background: #f5f5f5;
    }
  }

  .header-title {
    flex: 1;
    font-size: 18px;
    font-weight: 600;
    color: #333;
    text-align: center;
  }

  .draft-btn {
    padding: 8px 16px;
    border: none;
    background: none;
    color: #1890ff;
    font-size: 14px;
    cursor: pointer;
  }
}

.publish-form {
  flex: 1;
  overflow-y: auto;
  padding: 16px;

  .form-item {
    background: #fff;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;

    .form-label {
      display: block;
      font-size: 14px;
      color: #333;
      margin-bottom: 12px;
      font-weight: 500;

      &.required::before {
        content: '*';
        color: #ff4d4f;
        margin-right: 4px;
      }
    }

    .form-input,
    .form-textarea {
      width: 100%;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      outline: none;

      &.large-text {
        font-size: 18px;
      }

      &:focus {
        border-color: #1890ff;
      }
    }

    .form-textarea {
      resize: vertical;
      font-family: inherit;
      min-height: 120px;
    }

    .char-count {
      text-align: right;
      font-size: 12px;
      color: #999;
      margin-top: 4px;
    }

    .type-options {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;

      .type-option {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12px 16px;
        background: #f5f5f5;
        border: 2px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        min-width: 80px;

        &--active {
          background: #e6f7ff;
          border-color: #1890ff;
        }

        .type-icon {
          font-size: 24px;
          margin-bottom: 4px;
        }

        .type-label {
          font-size: 12px;
          color: #666;
        }
      }
    }

    .range-selector {
      display: flex;
      gap: 12px;

      .range-item {
        flex: 1;
        padding: 10px;
        background: #f5f5f5;
        border: 2px solid transparent;
        border-radius: 8px;
        text-align: center;
        cursor: pointer;

        &--active {
          background: #e6f7ff;
          border-color: #1890ff;
          color: #1890ff;
        }

        .range-text {
          font-size: 14px;
        }
      }
    }

    .image-upload {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .upload-item {
        position: relative;
        width: 80px;
        height: 80px;

        .upload-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
        }

        .remove-btn {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 20px;
          height: 20px;
          border: none;
          background: #ff4d4f;
          color: #fff;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          padding: 0;
        }
      }

      .upload-btn {
        width: 80px;
        height: 80px;
        border: 2px dashed #d9d9d9;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;

        &:active {
          border-color: #1890ff;
        }

        .upload-icon {
          font-size: 24px;
          margin-bottom: 4px;
        }

        .upload-text {
          font-size: 11px;
          color: #999;
        }
      }
    }

    .attachment-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .attachment-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f5f5f5;
        border-radius: 8px;

        .file-icon {
          font-size: 16px;
        }

        .file-name {
          font-size: 13px;
          color: #333;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-remove {
          width: 18px;
          height: 18px;
          border: none;
          background: none;
          color: #999;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
        }
      }

      .add-attachment {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 8px 12px;
        border: 1px dashed #d9d9d9;
        border-radius: 8px;
        cursor: pointer;

        &:active {
          border-color: #1890ff;
        }

        .add-icon {
          font-size: 14px;
        }

        .add-text {
          font-size: 13px;
          color: #999;
        }
      }
    }

    .priority-options {
      display: flex;
      gap: 16px;

      .priority-option {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: #f5f5f5;
        border-radius: 20px;
        cursor: pointer;

        &--active {
          background: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .priority-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .priority-label {
          font-size: 14px;
          color: #333;
        }
      }
    }

    .switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .switch-label {
        font-size: 14px;
        color: #666;
      }

      .switch {
        width: 44px;
        height: 24px;
        appearance: none;
        background: #ccc;
        border-radius: 12px;
        position: relative;
        cursor: pointer;
        transition: background 0.2s;

        &::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.2s;
        }

        &:checked {
          background: #1890ff;

          &::after {
            transform: translateX(20px);
          }
        }
      }
    }

    .datetime-picker {
      margin-top: 12px;

      .datetime-input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        font-size: 14px;
      }
    }
  }
}

.footer-actions {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #eee;

  .action-btn {
    flex: 1;
    height: 48px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;

    &.secondary {
      background: #fff;
      color: #666;
      border: 1px solid #ddd;
    }

    &.primary {
      background: #1890ff;
      color: #fff;

      &:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
    }
  }
}

.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;

  .preview-content {
    width: 90%;
    max-width: 400px;
    max-height: 80vh;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #eee;

      .preview-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }

      .preview-close {
        width: 32px;
        height: 32px;
        border: none;
        background: none;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 24px;
        color: #999;
      }
    }

    .preview-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;

      .preview-type {
        margin-bottom: 12px;

        .type-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #e6f7ff;
          color: #1890ff;
          font-size: 12px;
          border-radius: 4px;
        }
      }

      .preview-title-text {
        font-size: 18px;
        font-weight: 600;
        color: #333;
        margin-bottom: 12px;
        line-height: 1.4;
      }

      .preview-meta {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
        font-size: 12px;
        color: #999;
      }

      .preview-content-text {
        font-size: 15px;
        color: #666;
        line-height: 1.8;
        margin-bottom: 16px;
        white-space: pre-wrap;
      }

      .preview-images {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        .preview-image {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 8px;
        }
      }
    }
  }
}

// 适老化模式样式
:deep(.elderly-mode-large) {
  .page-header .header-title {
    font-size: 22px;
  }

  .form-item .form-label {
    font-size: 16px;
  }

  .form-item .form-input,
  .form-item .form-textarea {
    font-size: 16px;
  }
}

:deep(.elderly-mode-xl) {
  .page-header .header-title {
    font-size: 28px;
  }

  .form-item {
    padding: 20px;

    .form-label {
      font-size: 18px;
    }

    .form-input,
    .form-textarea {
      font-size: 18px;
    }
  }
}
</style>
