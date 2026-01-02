<template>
  <div class="profile-edit-page">
    <!-- 顶部导航栏 -->
    <div class="navbar">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <span class="title">个人资料</span>
      <button class="save-btn" @click="saveProfile" :disabled="saving">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </div>

    <!-- 主要内容 -->
    <div class="content">
      <!-- 头像区域 -->
      <div class="avatar-section">
        <div class="avatar-wrapper" @click="changeAvatar">
          <img v-if="form.avatar" :src="form.avatar" class="avatar-image" />
          <span v-else class="avatar-placeholder">{{ form.name?.charAt(0) || '?' }}</span>
          <div class="avatar-edit">
            <span class="edit-icon">📷</span>
          </div>
        </div>
        <div class="avatar-tip">点击更换头像</div>
      </div>

      <!-- 基本信息表单 -->
      <div class="form-section">
        <div class="section-title">基本信息</div>

        <!-- 姓名 -->
        <div class="form-item">
          <label class="form-label">姓名</label>
          <input
            v-model="form.name"
            type="text"
            class="form-input"
            :class="{ 'large-text': isElderlyMode }"
            placeholder="请输入姓名"
            maxlength="20"
          />
        </div>

        <!-- 性别 -->
        <div class="form-item">
          <label class="form-label">性别</label>
          <div class="gender-selector">
            <div
              :class="['gender-option', { 'gender-option--selected': form.gender === 'male' }]"
              @click="form.gender = 'male'"
            >
              <span class="gender-icon">👨</span>
              <span class="gender-text">男</span>
            </div>
            <div
              :class="['gender-option', { 'gender-option--selected': form.gender === 'female' }]"
              @click="form.gender = 'female'"
            >
              <span class="gender-icon">👩</span>
              <span class="gender-text">女</span>
            </div>
          </div>
        </div>

        <!-- 手机号 -->
        <div class="form-item">
          <label class="form-label">手机号</label>
          <div class="input-with-action">
            <input
              v-model="form.phone"
              type="tel"
              class="form-input"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请输入手机号"
              maxlength="11"
              readonly
            />
            <button class="action-btn" @click="changePhone">修改</button>
          </div>
        </div>

        <!-- 乡村号 -->
        <div class="form-item">
          <label class="form-label">乡村号</label>
          <input
            :value="userStore.userInfo?.villageId || 'DZ2024001'"
            type="text"
            class="form-input"
            readonly
          />
        </div>

        <!-- 所属村庄 -->
        <div class="form-item">
          <label class="form-label">所属村庄</label>
          <input
            :value="userStore.userInfo?.villageName || '东村'"
            type="text"
            class="form-input"
            readonly
          />
        </div>

        <!-- 职务（村干部显示） -->
        <div v-if="isCadre" class="form-item">
          <label class="form-label">职务</label>
          <input
            :value="userStore.userInfo?.roleName || '村干部'"
            type="text"
            class="form-input"
            readonly
          />
        </div>
      </div>

      <!-- 详细信息 -->
      <div class="form-section">
        <div class="section-title">详细信息</div>

        <!-- 村组（村民显示） -->
        <div v-if="!isCadre" class="form-item">
          <label class="form-label">所属村组</label>
          <div class="input-with-action" @click="showGroupPicker = true">
            <input
              v-model="form.group"
              type="text"
              class="form-input"
              :class="{ 'large-text': isElderlyMode }"
              placeholder="请选择村组"
              readonly
            />
            <span class="input-arrow">›</span>
          </div>
        </div>

        <!-- 详细地址 -->
        <div class="form-item">
          <label class="form-label">详细地址</label>
          <textarea
            v-model="form.address"
            class="form-textarea"
            :class="{ 'large-text': isElderlyMode }"
            placeholder="请输入详细地址（门牌号）"
            rows="3"
            maxlength="100"
          />
        </div>

        <!-- 个性签名 -->
        <div class="form-item">
          <label class="form-label">个性签名</label>
          <textarea
            v-model="form.signature"
            class="form-textarea"
            :class="{ 'large-text': isElderlyMode }"
            placeholder="介绍一下自己..."
            rows="3"
            maxlength="50"
          />
          <div class="char-count">{{ form.signature.length }}/50</div>
        </div>
      </div>

      <!-- 证件信息 -->
      <div class="form-section">
        <div class="section-title">证件信息</div>

        <!-- 身份证号（脱敏） -->
        <div class="form-item">
          <label class="form-label">身份证号</label>
          <div class="input-with-action">
            <input
              :value="maskIdCard(form.idCard)"
              type="text"
              class="form-input"
              readonly
            />
            <button class="action-btn" @click="showIdCard = !showIdCard">
              {{ showIdCard ? '隐藏' : '查看' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 村组选择器 -->
    <div v-if="showGroupPicker" class="picker-overlay" @click="showGroupPicker = false">
      <div class="picker-content" @click.stop>
        <div class="picker-header">
          <span class="picker-title">选择村组</span>
          <button class="picker-close" @click="showGroupPicker = false">×</button>
        </div>
        <div class="picker-list">
          <div
            v-for="group in groups"
            :key="group"
            class="picker-item"
            @click="form.group = group; showGroupPicker = false"
          >
            {{ group }}
          </div>
        </div>
      </div>
    </div>

    <!-- 头像裁剪弹窗 -->
    <div v-if="showAvatarCropper" class="cropper-overlay" @click="showAvatarCropper = false">
      <div class="cropper-content" @click.stop>
        <div class="cropper-header">
          <span class="cropper-title">裁剪头像</span>
          <button class="cropper-close" @click="showAvatarCropper = false">×</button>
        </div>
        <div class="cropper-body">
          <div class="image-preview">
            <img v-if="tempAvatar" :src="tempAvatar" class="preview-image" />
          </div>
        </div>
        <div class="cropper-footer">
          <button class="cropper-btn cancel" @click="showAvatarCropper = false">取消</button>
          <button class="cropper-btn confirm" @click="confirmAvatar">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useElderlyStore } from '@/store/elderly'

const router = useRouter()
const userStore = useUserStore()
const elderlyStore = useElderlyStore()

// 表单数据
const form = ref({
  avatar: '',
  name: '',
  gender: 'male',
  phone: '',
  group: '',
  address: '',
  signature: '',
  idCard: ''
})

// UI状态
const saving = ref(false)
const showGroupPicker = ref(false)
const showAvatarCropper = ref(false)
const showIdCard = ref(false)
const tempAvatar = ref('')

// 村组列表
const groups = ref(['第一组', '第二组', '第三组', '第四组', '第五组'])

// 是否是村干部
const isCadre = computed(() => {
  const role = userStore.userInfo?.role
  return role === 'cadre' || role === 'official' || role === 'admin'
})

// 是否适老化模式
const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 脱敏身份证号
const maskIdCard = (idCard) => {
  if (!idCard) return '未设置'
  if (showIdCard.value) return idCard
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
}

// 更换头像
const changeAvatar = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // 检查文件大小（限制2MB）
      if (file.size > 2 * 1024 * 1024) {
        alert('图片大小不能超过2MB')
        return
      }

      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件')
        return
      }

      // 创建预览
      tempAvatar.value = URL.createObjectURL(file)
      showAvatarCropper.value = true
    }
  }
  input.click()
}

// 确认头像
const confirmAvatar = () => {
  form.value.avatar = tempAvatar.value
  showAvatarCropper.value = false
  tempAvatar.value = ''
}

// 修改手机号
const changePhone = () => {
  alert('修改手机号需要验证原手机号')
  // TODO: 跳转到修改手机号页面
}

// 保存资料
const saveProfile = async () => {
  if (saving.value) return

  // 验证
  if (!form.value.name?.trim()) {
    alert('请输入姓名')
    return
  }

  if (!/^1[3-9]\d{9}$/.test(form.value.phone)) {
    alert('请输入正确的手机号')
    return
  }

  saving.value = true

  try {
    // TODO: 调用API保存
    console.log('保存资料:', form.value)

    // 模拟保存
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 更新store
    await userStore.updateProfile(form.value)

    alert('保存成功')

    // 震动反馈
    if (elderlyStore.hapticFeedback) {
      elderlyStore.vibrate('short')
    }

    router.back()
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 初始化
onMounted(() => {
  // 从用户信息加载表单数据
  const userInfo = userStore.userInfo
  if (userInfo) {
    form.value = {
      avatar: userInfo.avatar || '',
      name: userInfo.name || '',
      gender: userInfo.gender || 'male',
      phone: userInfo.phone || '',
      group: userInfo.group || '',
      address: userInfo.address || '',
      signature: userInfo.signature || '',
      idCard: userInfo.idCard || ''
    }
  }
})
</script>

<style lang="scss" scoped>
.profile-edit-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #eee;

  .back-btn {
    background: none;
    border: none;
    font-size: 20px;
    padding: 8px;
    cursor: pointer;
  }

  .title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .save-btn {
    padding: 8px 16px;
    border: none;
    background: #1890ff;
    color: #fff;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;

    &:disabled {
      background: #ccc;
    }
  }
}

.content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 16px;

  .avatar-wrapper {
    position: relative;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    cursor: pointer;
    margin-bottom: 12px;

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: #fff;
    }

    .avatar-edit {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.5);
      padding: 4px 0;
      text-align: center;

      .edit-icon {
        font-size: 16px;
      }
    }
  }

  .avatar-tip {
    font-size: 12px;
    color: #999;
  }
}

.form-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f5f5f5;
  }

  .form-item {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }

    .form-label {
      display: block;
      font-size: 14px;
      color: #333;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .form-input,
    .form-textarea {
      width: 100%;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 12px;
      font-size: 14px;
      outline: none;

      &.large-text {
        font-size: 18px;
      }

      &:focus {
        border-color: #1890ff;
      }

      &[readonly] {
        background: #f5f5f5;
        color: #666;
      }
    }

    .form-textarea {
      resize: none;
      font-family: inherit;
    }

    .char-count {
      text-align: right;
      font-size: 12px;
      color: #999;
      margin-top: 4px;
    }

    .input-with-action {
      display: flex;
      gap: 8px;

      .form-input {
        flex: 1;
      }

      .action-btn {
        padding: 0 16px;
        border: 1px solid #1890ff;
        background: #fff;
        color: #1890ff;
        border-radius: 8px;
        font-size: 13px;
        white-space: nowrap;
        cursor: pointer;
      }
    }
  }
}

.gender-selector {
  display: flex;
  gap: 16px;

  .gender-option {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    background: #f5f5f5;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;

    &--selected {
      border-color: #1890ff;
      background: #e6f7ff;
    }

    .gender-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .gender-text {
      font-size: 14px;
      color: #333;
    }
  }
}

.input-arrow {
  display: flex;
  align-items: center;
  color: #999;
  font-size: 18px;
  padding: 0 8px;
}

.picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;

  .picker-content {
    width: 100%;
    background: #fff;
    border-radius: 16px 16px 0 0;
    max-height: 50vh;
    display: flex;
    flex-direction: column;

    .picker-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #eee;

      .picker-title {
        font-size: 16px;
        font-weight: 600;
      }

      .picker-close {
        background: none;
        border: none;
        font-size: 24px;
        padding: 4px;
      }
    }

    .picker-list {
      flex: 1;
      overflow-y: auto;

      .picker-item {
        padding: 14px 16px;
        border-bottom: 1px solid #f5f5f5;
        cursor: pointer;

        &:active {
          background: #f5f5f5;
        }
      }
    }
  }
}

.cropper-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;

  .cropper-content {
    width: 90%;
    max-width: 400px;
    background: #fff;
    border-radius: 12px;
    overflow: hidden;

    .cropper-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #eee;

      .cropper-title {
        font-size: 16px;
        font-weight: 600;
      }

      .cropper-close {
        background: none;
        border: none;
        font-size: 24px;
        padding: 4px;
      }
    }

    .cropper-body {
      padding: 20px;

      .image-preview {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 8px;
        overflow: hidden;
        background: #f5f5f5;

        .preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
    }

    .cropper-footer {
      display: flex;
      border-top: 1px solid #eee;

      .cropper-btn {
        flex: 1;
        padding: 16px;
        border: none;
        font-size: 16px;
        cursor: pointer;

        &.cancel {
          background: #fff;
          color: #666;
          border-right: 1px solid #eee;
        }

        &.confirm {
          background: #fff;
          color: #1890ff;
        }
      }
    }
  }
}

// 适老化模式
:deep(.elderly-mode-large) {
  .navbar .title {
    font-size: 22px;
  }

  .form-section .section-title {
    font-size: 18px;
  }

  .form-item .form-label {
    font-size: 16px;
  }
}

:deep(.elderly-mode-xl) {
  .navbar .title {
    font-size: 28px;
  }

  .form-section .section-title {
    font-size: 22px;
  }

  .form-item .form-label {
    font-size: 20px;
  }
}
</style>
