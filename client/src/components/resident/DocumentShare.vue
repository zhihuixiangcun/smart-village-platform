<template>
  <div class="document-share">
    <el-form ref="formRef" :model="shareData" label-width="100px">
      <!-- 分享设置 -->
      <el-form-item label="分享状态">
        <el-switch
          v-model="shareData.isShared"
          active-text="允许分享"
          inactive-text="禁止分享"
        />
      </el-form-item>

      <template v-if="shareData.isShared">
        <!-- 分享范围 -->
        <el-form-item label="分享范围">
          <el-radio-group v-model="shareData.shareScope">
            <el-radio label="all">所有人</el-radio>
            <el-radio label="specific">指定用户</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 指定用户 -->
        <el-form-item
          v-if="shareData.shareScope === 'specific'"
          label="分享用户"
          prop="sharedWith"
        >
          <el-select
            v-model="shareData.sharedWith"
            multiple
            filterable
            placeholder="搜索并选择用户"
            style="width: 100%"
            :remote-method="searchUsers"
            :loading="searchLoading"
          >
            <el-option
              v-for="user in userOptions"
              :key="user.value"
              :label="user.label"
              :value="user.value"
            >
              <div class="user-option">
                <span class="user-name">{{ user.label }}</span>
                <span class="user-role">{{ user.role }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <!-- 有效期设置 -->
        <el-form-item label="有效期">
          <el-radio-group v-model="shareData.expiryType">
            <el-radio label="permanent">永久有效</el-radio>
            <el-radio label="custom">自定义期限</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item
          v-if="shareData.expiryType === 'custom'"
          label="过期时间"
          prop="expiresAt"
        >
          <el-date-picker
            v-model="shareData.expiresAt"
            type="datetime"
            placeholder="选择过期时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>

        <!-- 权限设置 -->
        <el-form-item label="访问权限">
          <el-checkbox-group v-model="shareData.permissions">
            <el-checkbox label="view">查看</el-checkbox>
            <el-checkbox label="download">下载</el-checkbox>
            <el-checkbox label="print">打印</el-checkbox>
            <el-checkbox label="reshare">再次分享</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <!-- 访问密码 -->
        <el-form-item label="访问密码">
          <el-switch
            v-model="shareData.requirePassword"
            active-text="需要密码"
            inactive-text="不需要密码"
          />
        </el-form-item>

        <el-form-item
          v-if="shareData.requirePassword"
          label="设置密码"
          prop="password"
        >
          <el-input
            v-model="shareData.password"
            type="password"
            placeholder="输入访问密码（6位数字）"
            maxlength="6"
            show-password
          >
            <template #append>
              <el-button @click="generatePassword" icon="Refresh">
                随机生成
              </el-button>
            </template>
          </el-input>
        </el-form-item>

        <!-- 访问限制 -->
        <el-form-item label="访问限制">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="每日访问次数" label-width="100px">
                <el-input-number
                  v-model="shareData.dailyLimit"
                  :min="0"
                  :max="1000"
                  placeholder="不限制"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="总访问次数" label-width="100px">
                <el-input-number
                  v-model="shareData.totalLimit"
                  :min="0"
                  :max="10000"
                  placeholder="不限制"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form-item>
      </template>
    </el-form>

    <!-- 分享链接 -->
    <div v-if="shareData.isShared && shareLink" class="share-link-section">
      <h4>分享链接</h4>
      <div class="share-link">
        <el-input
          v-model="shareLink"
          readonly
          placeholder="生成的分享链接"
        >
          <template #append>
            <el-button @click="copyLink" icon="CopyDocument">
              复制
            </el-button>
          </template>
        </el-input>
      </div>
      <div class="qr-code" v-if="showQRCode">
        <el-button @click="generateQRCode" icon="Picture">
          生成二维码
        </el-button>
        <div v-if="qrCodeUrl" class="qr-image">
          <img :src="qrCodeUrl" alt="分享二维码" />
          <p>扫描二维码快速访问</p>
        </div>
      </div>
    </div>

    <!-- 分享记录 -->
    <div v-if="shareData.isShared && shareHistory.length > 0" class="share-history">
      <h4>分享记录</h4>
      <el-table :data="shareHistory" style="width: 100%">
        <el-table-column prop="sharedAt" label="分享时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.sharedAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="sharedWith" label="分享对象" width="150">
          <template #default="{ row }">
            {{ getUserName(row.sharedWith) }}
          </template>
        </el-table-column>
        <el-table-column prop="accessCount" label="访问次数" width="100" align="center" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '有效' : '已过期' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastAccessAt" label="最后访问" width="180">
          <template #default="{ row }">
            {{ row.lastAccessAt ? formatDate(row.lastAccessAt) : '未访问' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              link
              type="danger"
              @click="revokeShare(row)"
              size="small"
            >
              撤销
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 操作按钮 -->
    <div class="share-actions">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm" :loading="submitting">
        确认分享
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { CopyDocument, Refresh, Picture } from '@element-plus/icons-vue'

// Props
const props = defineProps({
  document: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['confirm', 'cancel'])

// 表单引用
const formRef = ref(null)

// 响应式数据
const submitting = ref(false)
const searchLoading = ref(false)
const showQRCode = ref(false)
const qrCodeUrl = ref('')

// 用户选项
const userOptions = ref([])

// 分享数据
const shareData = reactive({
  isShared: props.document?.sharing?.isShared || false,
  shareScope: props.document?.sharing?.shareScope || 'specific',
  sharedWith: props.document?.sharing?.sharedWith || [],
  expiryType: props.document?.sharing?.expiryType || 'permanent',
  expiresAt: props.document?.sharing?.expiresAt || '',
  permissions: props.document?.sharing?.permissions || ['view'],
  requirePassword: props.document?.sharing?.requirePassword || false,
  password: props.document?.sharing?.password || '',
  dailyLimit: props.document?.sharing?.dailyLimit || 0,
  totalLimit: props.document?.sharing?.totalLimit || 0
})

// 分享历史（示例数据）
const shareHistory = ref([
  {
    id: 1,
    sharedAt: '2025-01-15 10:30:00',
    sharedWith: 'user1',
    accessCount: 15,
    status: 'active',
    lastAccessAt: '2025-01-20 09:15:00'
  },
  {
    id: 2,
    sharedAt: '2025-01-10 14:20:00',
    sharedWith: 'user2',
    accessCount: 3,
    status: 'expired',
    lastAccessAt: '2025-01-15 11:30:00'
  }
])

// 分享链接
const shareLink = computed(() => {
  if (!shareData.isShared) return ''
  const baseUrl = window.location.origin
  const docId = props.document._id
  const token = generateShareToken()
  return `${baseUrl}/shared/document/${docId}?token=${token}`
})

// 生成分享令牌
const generateShareToken = () => {
  // 实际应该从后端获取
  return 'share_' + Math.random().toString(36).substr(2, 16)
}

// 搜索用户
const searchUsers = async (query) => {
  if (!query) {
    userOptions.value = []
    return
  }

  searchLoading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 300))

    userOptions.value = [
      { label: '张三（村民）', value: 'user1', role: '村民' },
      { label: '李四（村干部）', value: 'user2', role: '村干部' },
      { label: '王五（村医）', value: 'user3', role: '村医' },
      { label: '赵六（网格员）', value: 'user4', role: '网格员' }
    ].filter(user => user.label.includes(query))
  } catch (error) {
    ElMessage.error('搜索用户失败')
  } finally {
    searchLoading.value = false
  }
}

// 生成随机密码
const generatePassword = () => {
  shareData.password = Math.random().toString().substr(2, 6)
}

// 复制链接
const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    ElMessage.success('链接已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 生成二维码
const generateQRCode = () => {
  showQRCode.value = true
  // 实际应该调用二维码生成API
  qrCodeUrl.value = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareLink.value)}`
}

// 获取用户名称
const getUserName = (userId) => {
  const userMap = {
    'user1': '张三',
    'user2': '李四',
    'user3': '王五',
    'user4': '赵六'
  }
  return userMap[userId] || userId
}

// 格式化日期
const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

// 撤销分享
const revokeShare = (record) => {
  ElMessageBox.confirm(
    '确定要撤销这个分享吗？',
    '撤销分享',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 实际应该调用API
    const index = shareHistory.value.findIndex(h => h.id === record.id)
    if (index > -1) {
      shareHistory.value.splice(index, 1)
      ElMessage.success('分享已撤销')
    }
  })
}

// 确认分享
const handleConfirm = async () => {
  // 表单验证
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true

  try {
    // 准备分享数据
    const shareConfig = {
      sharing: {
        ...shareData,
        sharedAt: new Date(),
        shareLink: shareLink.value
      }
    }

    // 发送确认事件
    emit('confirm', shareConfig)
  } catch (error) {
    ElMessage.error('分享设置失败')
    console.error(error)
  } finally {
    submitting.value = false
  }
}

// 取消
const handleCancel = () => {
  emit('cancel')
}

// 监听分享状态变化
watch(() => shareData.isShared, (newVal) => {
  if (!newVal) {
    // 关闭分享时清空相关设置
    shareData.sharedWith = []
    shareData.shareLink = ''
    qrCodeUrl.value = ''
    showQRCode.value = false
  }
})

// 初始化
onMounted(() => {
  if (props.document?.sharing?.isShared) {
    // 生成二维码
    if (shareData.isShared) {
      generateQRCode()
    }
  }
})
</script>

<style lang="scss" scoped>
.document-share {
  .share-link-section {
    margin: 20px 0;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 4px;

    h4 {
      margin: 0 0 15px 0;
      color: #303133;
    }

    .share-link {
      margin-bottom: 15px;
    }

    .qr-code {
      .qr-image {
        margin-top: 15px;
        text-align: center;

        img {
          width: 150px;
          height: 150px;
        }

        p {
          margin: 10px 0 0 0;
          font-size: 14px;
          color: #606266;
        }
      }
    }
  }

  .share-history {
    margin: 20px 0;

    h4 {
      margin: 0 0 15px 0;
      color: #303133;
    }
  }

  .share-actions {
    margin-top: 30px;
    text-align: center;

    .el-button {
      margin: 0 10px;
      min-width: 100px;
    }
  }
}

.user-option {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .user-name {
    flex: 1;
  }

  .user-role {
    color: #909399;
    font-size: 12px;
  }
}

:deep(.el-select-dropdown__item) {
  height: auto;
  padding: 12px;
}
</style>