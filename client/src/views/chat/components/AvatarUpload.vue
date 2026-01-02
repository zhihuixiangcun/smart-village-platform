<template>
  <el-dialog
    v-model="visible"
    title="更换头像"
    width="400px"
    @close="handleClose"
  >
    <div class="avatar-upload-content">
      <!-- 当前头像预览 -->
      <div class="avatar-preview">
        <el-avatar :src="previewUrl" :size="120">
          <el-icon><User /></el-icon>
        </el-avatar>
        <div class="current-label">当前头像</div>
      </div>

      <!-- 上传区域 -->
      <div class="upload-section">
        <el-upload
          :show-file-list="false"
          :before-upload="beforeUpload"
          :auto-upload="false"
          @change="handleFileChange"
          accept="image/*"
        >
          <el-button type="primary" plain>
            <el-icon><Upload /></el-icon>
            选择图片
          </el-button>
        </el-upload>
        <div class="upload-hint">支持 JPG、PNG 格式，大小不超过 5MB</div>
      </div>

      <!-- 图片裁剪预览（可选） -->
      <div v-if="cropPreview" class="crop-preview">
        <img :src="cropPreview" alt="预览" />
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleUpload" :loading="uploading" :disabled="!selectedFile">
        确认上传
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { User, Upload } from '@element-plus/icons-vue'
import { friendApi } from '@/api'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  currentAvatar: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const userStore = useUserStore()

// 对话框可见性
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 预览URL
const previewUrl = ref(props.currentAvatar || '')
const cropPreview = ref('')

// 选中的文件
const selectedFile = ref(null)

// 上传状态
const uploading = ref(false)

// 监听当前头像变化
watch(() => props.currentAvatar, (newVal) => {
  previewUrl.value = newVal || ''
})

// 文件选择变化
const handleFileChange = (file) => {
  if (file.raw) {
    selectedFile.value = file.raw
    // 生成预览
    const reader = new FileReader()
    reader.onload = (e) => {
      cropPreview.value = e.target.result
      previewUrl.value = e.target.result
    }
    reader.readAsDataURL(file.raw)
  }
}

// 上传前验证
const beforeUpload = (file) => {
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return false
  }

  // 验证文件大小
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    ElMessage.warning('图片大小不能超过5MB')
    return false
  }

  return true
}

// 执行上传
const handleUpload = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请选择要上传的图片')
    return
  }

  if (!beforeUpload(selectedFile.value)) {
    return
  }

  uploading.value = true
  try {
    const { data } = await friendApi.uploadAvatar(selectedFile.value)

    if (data.success) {
      ElMessage.success('头像上传成功')

      // 更新用户头像
      if (userStore.user) {
        userStore.user.profile.avatar = data.data.avatar
      }

      emit('success', data.data.avatar)
      handleClose()
    } else {
      ElMessage.error(data.message || '上传失败')
    }
  } catch (error) {
    console.error('Avatar upload error:', error)
    ElMessage.error(error.message || '上传失败，请稍后再试')
  } finally {
    uploading.value = false
  }
}

// 关闭对话框
const handleClose = () => {
  selectedFile.value = null
  cropPreview.value = ''
  previewUrl.value = props.currentAvatar || ''
  visible.value = false
}
</script>

<style scoped>
.avatar-upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.avatar-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
}

.avatar-preview .el-avatar {
  border: 3px solid #e0e0e0;
}

.current-label {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
}

.upload-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-hint {
  font-size: 12px;
  color: #999;
}

.crop-preview {
  margin-top: 20px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #e0e0e0;
}

.crop-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
