<template>
  <el-dialog
    v-model="visible"
    title="创建群聊"
    width="500px"
    @close="handleClose"
  >
    <el-form :model="groupForm" label-width="80px">
      <!-- 群名称 -->
      <el-form-item label="群名称" required>
        <el-input
          v-model="groupForm.name"
          placeholder="请输入群名称"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <!-- 群头像 -->
      <el-form-item label="群头像">
        <el-upload
          :show-file-list="false"
          :before-upload="handleAvatarUpload"
          accept="image/*"
          :auto-upload="false"
        >
          <el-avatar
            v-if="groupForm.avatar"
            :src="groupForm.avatar"
            :size="80"
          />
          <el-avatar v-else :size="80" class="avatar-placeholder">
            <el-icon><Plus /></el-icon>
          </el-avatar>
        </el-upload>
      </el-form-item>

      <!-- 群描述 -->
      <el-form-item label="群描述">
        <el-input
          v-model="groupForm.description"
          type="textarea"
          :rows="3"
          placeholder="请输入群描述（可选）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <!-- 选择群成员 -->
      <el-form-item label="群成员" required>
        <div class="member-selector">
          <div class="selected-members">
            <el-tag
              v-for="member in selectedMembers"
              :key="member._id"
              closable
              @close="removeMember(member)"
              class="member-tag"
            >
              {{ member.profile?.nickName || member.username }}
            </el-tag>
          </div>
          <el-button
            type="primary"
            plain
            size="small"
            @click="showFriendSelector = true"
          >
            <el-icon><Plus /></el-icon>
            添加成员
          </el-button>
        </div>
        <div class="member-count">
          已选择 {{ selectedMembers.length }} 人，最多 {{ maxMembers }} 人
        </div>
      </el-form-item>

      <!-- 群公告 -->
      <el-form-item label="群公告">
        <el-input
          v-model="groupForm.announcement"
          type="textarea"
          :rows="2"
          placeholder="请输入群公告（可选）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleCreate" :loading="creating">
        创建
      </el-button>
    </template>
  </el-dialog>

  <!-- 选择好友弹窗 -->
  <el-dialog
    v-model="showFriendSelector"
    title="选择好友"
    width="400px"
    append-to-body
  >
    <div class="friend-list">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索好友..."
        :prefix-icon="Search"
        clearable
        style="margin-bottom: 12px"
      />
      <div class="friend-items">
        <div
          v-for="friend in filteredFriends"
          :key="friend._id"
          class="friend-item"
          :class="{ selected: isMemberSelected(friend._id) }"
          @click="toggleMember(friend)"
        >
          <el-avatar :src="friend.friend?.profile?.avatar" :size="40">
            {{ friend.friend?.profile?.nickName?.charAt(0) || friend.friend?.username?.charAt(0) }}
          </el-avatar>
          <div class="friend-info">
            <div class="friend-name">
              {{ friend.friend?.profile?.nickName || friend.friend?.username }}
            </div>
            <div class="friend-alias" v-if="friend.alias">
              备注: {{ friend.alias }}
            </div>
          </div>
          <el-icon v-if="isMemberSelected(friend._id)" class="check-icon">
            <Check />
          </el-icon>
        </div>
      </div>
      <el-empty v-if="filteredFriends.length === 0" description="暂无好友" />
    </div>
    <template #footer>
      <el-button type="primary" @click="showFriendSelector = false">
        确定 ({{ selectedMembers.length }})
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Plus, Search, Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { chatApi } from '@/api'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'created'])

// 对话框可见性
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 群表单
const groupForm = ref({
  name: '',
  avatar: '',
  description: '',
  announcement: ''
})

// 已选择的成员
const selectedMembers = ref([])

// 最大成员数
const maxMembers = ref(500)

// 创建中
const creating = ref(false)

// 好友选择器
const showFriendSelector = ref(false)

// 搜索关键词
const searchKeyword = ref('')

// 好友列表（从 store 获取或传入）
const friends = ref([])

// 过滤后的好友列表
const filteredFriends = computed(() => {
  if (!searchKeyword.value) {
    return friends.value
  }
  const keyword = searchKeyword.value.toLowerCase()
  return friends.value.filter(friend => {
    const name = friend.friend?.profile?.nickName || friend.friend?.username || ''
    return name.toLowerCase().includes(keyword)
  })
})

// 加载好友列表
const loadFriends = async () => {
  try {
    const { data } = await chatApi.getFriends()
    if (data.success) {
      friends.value = data.data || []
    }
  } catch (error) {
    console.error('加载好友列表失败:', error)
  }
}

// 是否已选中成员
const isMemberSelected = (userId) => {
  return selectedMembers.value.some(m => m._id === userId)
}

// 切换成员选择
const toggleMember = (friend) => {
  const index = selectedMembers.value.findIndex(m => m._id === friend.friend?._id)
  if (index !== -1) {
    selectedMembers.value.splice(index, 1)
  } else {
    if (selectedMembers.value.length >= maxMembers.value) {
      ElMessage.warning(`最多只能选择 ${maxMembers.value} 人`)
      return
    }
    selectedMembers.value.push(friend.friend)
  }
}

// 移除成员
const removeMember = (member) => {
  const index = selectedMembers.value.findIndex(m => m._id === member._id)
  if (index !== -1) {
    selectedMembers.value.splice(index, 1)
  }
}

// 上传头像
const handleAvatarUpload = (file) => {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return false
  }

  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过5MB')
    return false
  }

  // TODO: 实现图片上传
  const reader = new FileReader()
  reader.onload = (e) => {
    groupForm.value.avatar = e.target.result
  }
  reader.readAsDataURL(file)
  return false
}

// 创建群聊
const handleCreate = async () => {
  if (!groupForm.value.name.trim()) {
    ElMessage.warning('请输入群名称')
    return
  }

  if (selectedMembers.value.length < 2) {
    ElMessage.warning('请至少选择2个成员（包括自己）')
    return
  }

  creating.value = true
  try {
    const { data } = await chatApi.createConversation({
      type: 'group',
      participants: selectedMembers.value.map(m => m._id),
      groupInfo: {
        name: groupForm.value.name,
        avatar: groupForm.value.avatar,
        description: groupForm.value.description,
        announcement: groupForm.value.announcement
      }
    })

    if (data.success) {
      ElMessage.success('群聊创建成功')
      emit('created', data.data)
      handleClose()
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '创建失败')
  } finally {
    creating.value = false
  }
}

// 关闭对话框
const handleClose = () => {
  groupForm.value = {
    name: '',
    avatar: '',
    description: '',
    announcement: ''
  }
  selectedMembers.value = []
  searchKeyword.value = ''
  visible.value = false
}

// 监听对话框打开，加载好友列表
watch(() => props.modelValue, (val) => {
  if (val && friends.value.length === 0) {
    loadFriends()
  }
})
</script>

<style scoped>
.member-selector {
  width: 100%;
}

.selected-members {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  min-height: 32px;
}

.member-tag {
  font-size: 14px;
}

.member-count {
  font-size: 12px;
  color: #999;
}

.friend-list {
  max-height: 400px;
  overflow-y: auto;
}

.friend-items {
  max-height: 320px;
  overflow-y: auto;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;
  position: relative;
}

.friend-item:hover {
  background: #f5f5f5;
}

.friend-item.selected {
  background: #e6f7ff;
}

.friend-info {
  flex: 1;
  min-width: 0;
}

.friend-name {
  font-size: 14px;
  color: #333;
  margin-bottom: 2px;
}

.friend-alias {
  font-size: 12px;
  color: #999;
}

.check-icon {
  font-size: 20px;
  color: #07c160;
}

.avatar-placeholder {
  background: #f0f0f0;
  color: #999;
  cursor: pointer;
}

.avatar-placeholder:hover {
  background: #e0e0e0;
}
</style>
