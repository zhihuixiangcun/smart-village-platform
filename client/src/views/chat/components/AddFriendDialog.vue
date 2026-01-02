<template>
  <el-dialog
    v-model="visible"
    title="添加好友"
    width="500px"
    @close="handleClose"
  >
    <el-tabs v-model="activeTab">
      <!-- 手机号搜索 -->
      <el-tab-pane label="手机号搜索" name="phone">
        <el-form :model="phoneForm" label-width="80px">
          <el-form-item label="手机号">
            <el-input
              v-model="phoneForm.phone"
              placeholder="请输入手机号"
              clearable
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchByPhone" :loading="searching">
              搜索
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 搜索结果 -->
        <div v-if="searchResult" class="search-result">
          <div class="user-card">
            <el-avatar :src="searchResult.avatar" :size="60">
              {{ searchResult.nickName?.charAt(0) || searchResult.username?.charAt(0) }}
            </el-avatar>
            <div class="user-info">
              <div class="user-name">{{ searchResult.nickName || searchResult.username }}</div>
              <div class="user-qrcode" v-if="searchResult.qrCode">
                乡村号: {{ searchResult.qrCode }}
              </div>
            </div>
          </div>
          <el-button
            v-if="!searchResult.isFriend"
            type="primary"
            @click="sendFriendRequest"
            :loading="sending"
            style="width: 100%"
          >
            添加好友
          </el-button>
          <el-button v-else disabled style="width: 100%">
            已是好友
          </el-button>
        </div>
      </el-tab-pane>

      <!-- 乡村号搜索 -->
      <el-tab-pane label="乡村号搜索" name="qrcode">
        <el-form :model="qrcodeForm" label-width="80px">
          <el-form-item label="乡村号">
            <el-input
              v-model="qrcodeForm.qrcode"
              placeholder="请输入乡村号"
              clearable
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchByQRCode" :loading="searching">
              搜索
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 搜索结果 -->
        <div v-if="searchResult" class="search-result">
          <div class="user-card">
            <el-avatar :src="searchResult.avatar" :size="60">
              {{ searchResult.nickName?.charAt(0) || searchResult.username?.charAt(0) }}
            </el-avatar>
            <div class="user-info">
              <div class="user-name">{{ searchResult.nickName || searchResult.username }}</div>
              <div class="user-qrcode" v-if="searchResult.qrCode">
                乡村号: {{ searchResult.qrCode }}
              </div>
            </div>
          </div>
          <el-button
            v-if="!searchResult.isFriend"
            type="primary"
            @click="sendFriendRequest"
            :loading="sending"
            style="width: 100%"
          >
            添加好友
          </el-button>
          <el-button v-else disabled style="width: 100%">
            已是好友
          </el-button>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 验证消息输入 -->
    <div v-if="searchResult && !searchResult.isFriend" class="verify-message">
      <el-input
        v-model="verifyMessage"
        type="textarea"
        :rows="3"
        placeholder="输入验证消息（可选）"
        maxlength="100"
        show-word-limit
      />
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { friendApi } from '@/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

// 对话框可见性
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 当前标签页
const activeTab = ref('phone')

// 手机号搜索表单
const phoneForm = ref({
  phone: ''
})

// 乡村号搜索表单
const qrcodeForm = ref({
  qrcode: ''
})

// 搜索结果
const searchResult = ref(null)

// 搜索中
const searching = ref(false)

// 发送请求中
const sending = ref(false)

// 验证消息
const verifyMessage = ref('')

// 手机号搜索
const searchByPhone = async () => {
  if (!phoneForm.value.phone) {
    ElMessage.warning('请输入手机号')
    return
  }

  searching.value = true
  try {
    const { data } = await friendApi.searchByPhone(phoneForm.value.phone)
    if (data.success) {
      searchResult.value = data.data
    } else {
      ElMessage.error(data.message || '搜索失败')
    }
  } catch (error) {
    ElMessage.error('搜索失败')
  } finally {
    searching.value = false
  }
}

// 乡村号搜索
const searchByQRCode = async () => {
  if (!qrcodeForm.value.qrcode) {
    ElMessage.warning('请输入乡村号')
    return
  }

  searching.value = true
  try {
    const { data } = await friendApi.searchByQRCode(qrcodeForm.value.qrcode)
    if (data.success) {
      searchResult.value = data.data
    } else {
      ElMessage.error(data.message || '搜索失败')
    }
  } catch (error) {
    ElMessage.error('搜索失败')
  } finally {
    searching.value = false
  }
}

// 发送好友请求
const sendFriendRequest = async () => {
  if (!searchResult.value) return

  sending.value = true
  try {
    const { data } = await friendApi.sendFriendRequest({
      toUserId: searchResult.value._id,
      message: verifyMessage.value,
      source: activeTab.value === 'phone' ? 'phone_search' : 'qrcode_search'
    })

    if (data.success) {
      ElMessage.success('好友请求已发送')
      visible.value = false
    } else {
      ElMessage.error(data.message || '发送失败')
    }
  } catch (error) {
    ElMessage.error('发送失败')
  } finally {
    sending.value = false
  }
}

// 关闭对话框
const handleClose = () => {
  phoneForm.value.phone = ''
  qrcodeForm.value.qrcode = ''
  searchResult.value = null
  verifyMessage.value = ''
  activeTab.value = 'phone'
}
</script>

<style scoped>
.search-result {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.user-qrcode {
  font-size: 14px;
  color: #666;
}

.verify-message {
  margin-top: 16px;
}
</style>
