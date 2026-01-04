<template>
  <div class="image-uploader" :class="{ 'large-text-mode': isLargeText }">
    <!-- 已上传的图片列表 -->
    <div class="upload-list">
      <div
        v-for="(file, index) in fileList"
        :key="index"
        class="upload-item"
      >
        <div class="image-wrapper">
          <img :src="file.url" :alt="file.name">
          <div class="image-mask">
            <div class="mask-actions">
              <el-icon @click="handlePreview(file)" :size="24"><View /></el-icon>
              <el-icon @click="handleRemove(index)" :size="24"><Delete /></el-icon>
            </div>
          </div>
        </div>
        <div class="file-info">
          <p class="file-name">{{ file.name }}</p>
          <p class="file-size">{{ formatSize(file.size) }}</p>
        </div>
        <el-tag v-if="file.status === 'success'" type="success" size="small">
          已上传
        </el-tag>
        <el-tag v-else-if="file.status === 'uploading'" type="primary" size="small">
          上传中...
        </el-tag>
      </div>
    </div>

    <!-- 上传按钮 -->
    <el-upload
      v-if="!limitReached || !multiple"
      class="upload-button"
      :action="uploadUrl"
      :headers="uploadHeaders"
      :show-file-list="false"
      :before-upload="beforeUpload"
      :on-success="handleSuccess"
      :on-error="handleError"
      :on-progress="handleProgress"
      :accept="accept"
      :multiple="multiple"
    >
      <div class="upload-trigger">
        <el-icon class="upload-icon"><Plus /></el-icon>
        <div class="upload-text">
          <p class="text-main">点击上传</p>
          <p class="text-sub" v-if="!isLargeText">{{ hint || '支持JPG/PNG,最大5MB' }}</p>
        </div>
      </div>
    </el-upload>

    <!-- OCR识别提示 -->
    <div v-if="enableOCR && showOCR" class="ocr-tip">
      <el-alert
        title="智能识别"
        type="info"
        :closable="false"
        show-icon
      >
        <template #default>
          <p>上传证件照片后,系统将自动识别信息</p>
        </template>
      </el-alert>
    </div>

    <!-- 图片预览对话框 -->
    <el-dialog
      v-model="previewVisible"
      title="图片预览"
      width="600px"
      append-to-body
    >
      <div class="preview-container">
        <img :src="previewUrl" style="width: 100%">
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, View, Delete } from '@element-plus/icons-vue'
import { useLargeText } from '@/composables/useLargeText'
import { serviceApi } from '@/api/service'

const props = defineProps({
  modelValue: {
    type: [String, Array],
    default: ''
  },
  // 是否允许多选
  multiple: {
    type: Boolean,
    default: false
  },
  // 最大数量
  maxCount: {
    type: Number,
    default: 1
  },
  // 是否必填
  required: {
    type: Boolean,
    default: false
  },
  // 接受的文件类型
  accept: {
    type: String,
    default: 'image/jpeg,image/jpg,image/png'
  },
  // 提示文字
  hint: {
    type: String,
    default: ''
  },
  // 启用OCR识别
  enableOCR: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'validate'])

const { isLargeText } = useLargeText()

// 上传配置
const uploadUrl = import.meta.env.VITE_API_URL + '/api/v1/upload/image'
const uploadHeaders = {
  Authorization: 'Bearer ' + localStorage.getItem('token')
}

// 状态
const fileList = ref([])
const previewVisible = ref(false)
const previewUrl = ref('')
const uploadingCount = ref(0)

// 是否显示OCR提示
const showOCR = computed(() => {
  return props.enableOCR && props.required
})

// 是否达到数量限制
const limitReached = computed(() => {
  return fileList.value.length >= props.maxCount
})

// 初始化文件列表
const initFileList = () => {
  if (!props.modelValue) return

  if (typeof props.modelValue === 'string') {
    // 单个文件
    if (props.modelValue) {
      fileList.value = [{
        url: props.modelValue,
        name: getFileName(props.modelValue),
        size: 0,
        status: 'success'
      }]
    }
  } else if (Array.isArray(props.modelValue)) {
    // 多个文件
    fileList.value = props.modelValue.map(url => ({
      url,
      name: getFileName(url),
      size: 0,
      status: 'success'
    }))
  }
}

// 从URL提取文件名
const getFileName = (url) => {
  const parts = url.split('/')
  return parts[parts.length - 1] || 'image.jpg'
}

// 格式化文件大小
const formatSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// 上传前验证
const beforeUpload = (file) => {
  // 检查数量限制
  if (!props.multiple && fileList.value.length > 0) {
    ElMessage.warning('只能上传一张图片')
    return false
  }

  if (fileList.value.length >= props.maxCount) {
    ElMessage.warning(\`最多只能上传\${props.maxCount}张图片\`)
    return false
  }

  // 检查文件类型
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }

  // 检查文件大小
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }

  // 添加到文件列表
  const fileItem = {
    url: URL.createObjectURL(file),
    name: file.name,
    size: file.size,
    status: 'uploading',
    rawFile: file
  }
  fileList.value.push(fileItem)
  uploadingCount.value++

  return true
}

// 上传成功
const handleSuccess = (response, file, fileList) => {
  uploadingCount.value--

  // 找到对应的文件项
  const fileItem = findFileItem(file.name)
  if (fileItem && response.data?.url) {
    fileItem.url = response.data.url
    fileItem.status = 'success'
    fileItem.ocrData = response.data.ocrData // OCR识别结果

    // 如果启用了OCR且有识别结果,触发OCR事件
    if (response.data.ocrData) {
      ElMessage.success('已自动识别证件信息')
      emit('ocr-recognized', response.data.ocrData)
    }

    updateModelValue()
    emit('change', fileItem)
  }
}

// 上传失败
const handleError = (error, file, fileList) => {
  uploadingCount.value--

  const fileItem = findFileItem(file.name)
  if (fileItem) {
    fileItem.status = 'error'
    ElMessage.error('上传失败,请重试')
  }

  validateForm()
}

// 上传进度
const handleProgress = (event, file, fileList) => {
  // 可以在这里更新上传进度
}

// 预览图片
const handlePreview = (file) => {
  previewUrl.value = file.url
  previewVisible.value = true
}

// 删除图片
const handleRemove = (index) => {
  fileList.value.splice(index, 1)
  updateModelValue()
  emit('change', null)
  validateForm()
}

// 查找文件项
const findFileItem = (fileName) => {
  return fileList.value.find(f => f.name === fileName)
}

// 更新v-model
const updateModelValue = () => {
  const urls = fileList.value
    .filter(f => f.status === 'success')
    .map(f => f.url)

  const value = props.multiple ? urls : (urls[0] || '')
  emit('update:modelValue', value)
}

// 表单验证
const validateForm = () => {
  const isValid = !props.required || fileList.value.length > 0
  emit('validate', isValid)
  return isValid
}

// 监听modelValue变化
watch(() => props.modelValue, () => {
  initFileList()
}, { immediate: true })

// 监听文件列表变化
watch(fileList, () => {
  validateForm()
}, { deep: true })

// 暴露方法
defineExpose({
  validate: validateForm
})
</script>

<style lang="scss" scoped>
.image-uploader {
  .upload-list {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 16px;

    .upload-item {
      position: relative;
      width: 148px;

      .image-wrapper {
        position: relative;
        width: 100%;
        height: 148px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #dcdfe6;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-mask {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s;

          .mask-actions {
            display: flex;
            gap: 16px;

            .el-icon {
              color: white;
              cursor: pointer;
              font-size: 24px;

              &:hover {
                transform: scale(1.2);
              }
            }
          }
        }

        &:hover .image-mask {
          opacity: 1;
        }
      }

      .file-info {
        margin-top: 8px;

        .file-name {
          margin: 0 0 4px 0;
          font-size: 13px;
          color: #303133;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-size {
          margin: 0;
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }

  .upload-button {
    display: inline-block;

    .upload-trigger {
      width: 148px;
      height: 148px;
      border: 2px dashed #dcdfe6;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        border-color: #409eff;
        background: #ecf5ff;

        .upload-icon {
          color: #409eff;
        }
      }

      .upload-icon {
        font-size: 32px;
        color: #8c939d;
        margin-bottom: 8px;
      }

      .upload-text {
        text-align: center;

        .text-main {
          margin: 0 0 4px 0;
          font-size: 14px;
          color: #606266;
        }

        .text-sub {
          margin: 0;
          font-size: 12px;
          color: #909399;
          line-height: 1.4;
        }
      }
    }
  }

  .ocr-tip {
    margin-top: 16px;
    max-width: 400px;

    p {
      margin: 0;
      font-size: 14px;
    }
  }

  .preview-container {
    text-align: center;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .image-uploader {
    .upload-list {
      .upload-item {
        width: calc(50% - 8px);
      }
    }
  }
}

// 大字模式适配
.large-text-mode {
  .image-uploader {
    .upload-list {
      gap: 20px;

      .upload-item {
        width: 200px;

        .image-wrapper {
          height: 200px;
        }

        .file-info {
          .file-name {
            font-size: 15px;
          }

          .file-size {
            font-size: 14px;
          }
        }
      }
    }

    .upload-button {
      .upload-trigger {
        width: 200px;
        height: 200px;

        .upload-icon {
          font-size: 40px;
        }

        .upload-text {
          .text-main {
            font-size: 17px;
          }

          .text-sub {
            font-size: 14px;
          }
        }
      }
    }

    .ocr-tip {
      p {
        font-size: 16px;
      }
    }
  }
}
</style>
