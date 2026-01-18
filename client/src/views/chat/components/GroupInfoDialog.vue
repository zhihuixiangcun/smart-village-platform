<template>
  <el-dialog
    v-model="visible"
    :title="isEditing ? '编辑群聊' : '群聊信息'"
    width="600px"
    @close="handleClose"
    :close-on-click-modal="false"
  >
    <el-tabs v-model="activeTab" class="group-info-tabs">
      <!-- 成员标签页 -->
      <el-tab-pane label="成员" name="members">
        <!-- 群基本信息 -->
        <div class="group-header">
          <el-upload
            v-if="isAdmin"
            :show-file-list="false"
            :before-upload="handleAvatarUpload"
            accept="image/*"
            :auto-upload="false"
            class="avatar-upload"
          >
            <el-avatar :src="groupInfo.avatar" :size="80">
              <el-icon><Camera /></el-icon>
            </el-avatar>
          </el-upload>
          <el-avatar v-else :src="groupInfo.avatar" :size="80" />

          <div class="header-info">
            <el-input
              v-if="isAdmin && isEditing"
              v-model="editGroupInfo.name"
              class="group-name-input"
              maxlength="30"
              show-word-limit
            />
            <h3 v-else class="group-name">{{ groupInfo.name }}</h3>
            <p class="group-meta">
              成员 {{ members.length }} 人 · 创建于 {{ formatDate(groupInfo.createdAt) }}
            </p>
            <p class="group-owner">群主：{{ ownerName }}</p>
          </div>
        </div>

        <!-- 群公告 -->
        <div class="announcement-section">
          <div class="section-title">
            <el-icon><Bell /></el-icon>
            群公告
          </div>
          <div v-if="isAdmin && isEditing" class="announcement-edit">
            <el-input
              v-model="editGroupInfo.announcement"
              type="textarea"
              :rows="2"
              maxlength="500"
              show-word-limit
              placeholder="请输入群公告"
            />
          </div>
          <div v-else class="announcement-content">
            {{ groupInfo.announcement || '暂无群公告' }}
          </div>
        </div>

        <!-- 成员列表 -->
        <div class="members-section">
          <div class="section-header">
            <span class="section-title">
              <el-icon><User /></el-icon>
              成员列表
            </span>
            <el-button v-if="isAdmin" type="primary" link size="small" @click="showAddMemberDialog">
              <el-icon><Plus /></el-icon>
              添加成员
            </el-button>
          </div>

          <el-input
            v-model="searchKeyword"
            placeholder="搜索成员..."
            :prefix-icon="Search"
            clearable
            class="search-input"
          />

          <div class="members-list" v-loading="loading">
            <div
              v-for="member in filteredMembers"
              :key="member._id"
              class="member-item"
              @click="handleMemberClick(member)"
              @contextmenu.prevent="handleMemberRightClick(member, $event)"
            >
              <el-badge is-dot :type="member.online ? 'success' : 'info'" class="member-badge">
                <el-avatar :src="member.user?.profile?.avatar" :size="48">
                  {{ member.user?.profile?.nickName?.charAt(0) || member.user?.username?.charAt(0) }}
                </el-avatar>
              </el-badge>
              <div class="member-info">
                <div class="member-name">
                  {{ member.user?.profile?.nickName || member.user?.username }}
                  <el-tag v-if="member.role === 'owner'" size="small" type="danger">群主</el-tag>
                  <el-tag v-if="member.role === 'admin'" size="small" type="warning">管理员</el-tag>
                </div>
                <div class="member-join-time">
                  加入时间：{{ formatDate(member.joinedAt) }}
                </div>
              </div>
              <el-dropdown v-if="canManageMember(member)" trigger="click" @command="cmd => handleMemberAction(cmd, member)">
                <el-button circle size="small">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-if="isOwner && member.role === 'member'"
                      command="setAdmin"
                    >
                      <el-icon><UserFilled /></el-icon>
                      设为管理员
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="isOwner && member.role === 'admin'"
                      command="removeAdmin"
                    >
                      <el-icon><UserFilled /></el-icon>
                      取消管理员
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="isOwner && member.role !== 'owner'"
                      command="transferOwnership"
                    >
                      <el-icon><Promotion /></el-icon>
                      转让群主
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="canRemoveMember(member)"
                      command="removeMember"
                      divided
                    >
                      <el-icon><Delete /></el-icon>
                      移除成员
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 设置标签页 -->
      <el-tab-pane label="设置" name="settings">
        <div class="settings-section">
          <div v-if="isAdmin">
            <el-button type="primary" @click="isEditing = !isEditing">
              <el-icon><Edit /></el-icon>
              {{ isEditing ? '完成编辑' : '编辑群信息' }}
            </el-button>

            <el-divider />

            <div class="setting-item">
              <div class="setting-label">消息免打扰</div>
              <el-switch
                v-model="groupSettings.muted"
                @change="toggleMute"
              />
            </div>

            <el-divider />

            <div class="setting-item">
              <div class="setting-label">置顶聊天</div>
              <el-switch
                v-model="groupSettings.pinned"
                @change="togglePin"
              />
            </div>

            <el-divider />

            <div class="setting-actions">
              <el-button type="primary" @click="saveChanges" :loading="saving">
                保存更改
              </el-button>
            </div>
          </div>

          <div v-else class="no-permission">
            <el-empty description="暂无管理权限" />
          </div>

          <el-divider />

          <div class="danger-zone">
            <h4>危险操作</h4>
            <el-button
              v-if="!isOwner"
              type="danger"
              plain
              @click="handleLeaveGroup"
            >
              退出群聊
            </el-button>
            <el-button
              v-if="isOwner"
              type="danger"
              plain
              @click="handleDissolveGroup"
            >
              解散群聊
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>

    <!-- 添加成员弹窗 -->
    <AddMemberDialog
      v-model="showAddMember"
      :conversation-id="conversationId"
      :existing-members="members"
      @added="handleMemberAdded"
    />

    <!-- 成员信息弹窗 -->
    <el-dialog v-model="showMemberInfo" title="成员信息" width="400px" append-to-body>
      <div v-if="selectedMember" class="member-detail">
        <el-avatar :src="selectedMember.user?.profile?.avatar" :size="80" />
        <h3>{{ selectedMember.user?.profile?.nickName || selectedMember.user?.username }}</h3>
        <p class="detail-item">
          <el-icon><User /></el-icon>
          身份：{{ getRoleText(selectedMember.role) }}
        </p>
        <p class="detail-item">
          <el-icon><Clock /></el-icon>
          加入时间：{{ formatDate(selectedMember.joinedAt) }}
        </p>
        <p class="detail-item">
          <el-icon><Connection /></el-icon>
          在线状态：{{ selectedMember.online ? '在线' : '离线' }}
        </p>
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import {
  Camera,
  Bell,
  User,
  Plus,
  Search,
  MoreFilled,
  Edit,
  Delete,
  UserFilled,
  Promotion,
  Clock,
  Connection,
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { chatApi, friendApi } from '@/api';
import { useChatStore } from '@/stores/chat';
import { useUserStore } from '@/stores/user';
import AddMemberDialog from './AddMemberDialog.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  conversationId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue', 'updated']);

const chatStore = useChatStore();
const userStore = useUserStore();

const currentUserId = computed(() => userStore.user?.id);

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

const activeTab = ref('members');
const loading = ref(false);
const saving = ref(false);
const isEditing = ref(false);
const searchKeyword = ref('');

const groupInfo = ref({
  name: '',
  avatar: '',
  announcement: '',
  createdAt: '',
  ownerId: '',
});

const editGroupInfo = ref({
  name: '',
  avatar: '',
  announcement: '',
});

const members = ref([]);
const selectedMember = ref(null);
const showMemberInfo = ref(false);
const showAddMember = ref(false);

const groupSettings = ref({
  muted: false,
  pinned: false,
});

const currentUserRole = computed(() => {
  const member = members.value.find(m => m.user._id === currentUserId.value);
  return member?.role || 'member';
});

const isOwner = computed(() => currentUserRole.value === 'owner');
const isAdmin = computed(() => isOwner.value || currentUserRole.value === 'admin');

const ownerName = computed(() => {
  const owner = members.value.find(m => m.role === 'owner');
  return owner?.user?.profile?.nickName || owner?.user?.username || '未知';
});

const filteredMembers = computed(() => {
  if (!searchKeyword.value) {
    return members.value;
  }
  const keyword = searchKeyword.value.toLowerCase();
  return members.value.filter(member => {
    const name = member.user?.profile?.nickName || member.user?.username || '';
    return name.toLowerCase().includes(keyword);
  });
});

const formatDate = dateStr => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN');
};

const getRoleText = role => {
  const roleMap = {
    owner: '群主',
    admin: '管理员',
    member: '普通成员',
  };
  return roleMap[role] || '普通成员';
};

const canManageMember = member => {
  if (!isAdmin.value) return false;
  if (member.user._id === currentUserId.value) return false;
  if (member.role === 'owner') return false;
  if (currentUserRole.value === 'admin' && member.role === 'admin') return false;
  return true;
};

const canRemoveMember = member => {
  if (member.user._id === currentUserId.value) return false;
  if (member.role === 'owner') return false;
  if (currentUserRole.value === 'admin' && member.role === 'admin') return false;
  return isAdmin.value;
};

const loadGroupInfo = async () => {
  loading.value = true;
  try {
    const { data } = await chatApi.getGroupInfo(props.conversationId);
    if (data.success) {
      groupInfo.value = data.data;
      editGroupInfo.value = { ...data.data };
    }
  } catch (error) {
    console.error('加载群信息失败:', error);
    ElMessage.error('加载群信息失败');
  } finally {
    loading.value = false;
  }
};

const loadMembers = async () => {
  loading.value = true;
  try {
    const { data } = await chatApi.getGroupMembers(props.conversationId, {
      page: 1,
      limit: 100,
    });
    if (data.success) {
      members.value = data.data.members || [];
    }
  } catch (error) {
    console.error('加载成员列表失败:', error);
    ElMessage.error('加载成员列表失败');
  } finally {
    loading.value = false;
  }
};

const handleAvatarUpload = file => {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件');
    return false;
  }

  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过5MB');
    return false;
  }

  const reader = new FileReader();
  reader.onload = e => {
    editGroupInfo.value.avatar = e.target.result;
  };
  reader.readAsDataURL(file);
  return false;
};

const handleMemberClick = member => {
  selectedMember.value = member;
  showMemberInfo.value = true;
};

const handleMemberRightClick = (member, event) => {
  if (canManageMember(member)) {
    selectedMember.value = member;
  }
};

const handleMemberAction = async (action, member) => {
  try {
    switch (action) {
      case 'setAdmin':
        await chatApi.setGroupAdmin(props.conversationId, member._id, { role: 'admin' });
        ElMessage.success('已设置管理员');
        await loadMembers();
        break;
      case 'removeAdmin':
        await chatApi.setGroupAdmin(props.conversationId, member._id, { role: 'member' });
        ElMessage.success('已取消管理员');
        await loadMembers();
        break;
      case 'transferOwnership':
        await ElMessageBox.confirm(
          `确认将群主转让给 ${member.user?.profile?.nickName || member.user?.username} 吗？`,
          '转让群主',
          { type: 'warning' }
        );
        await chatApi.transferOwnership(props.conversationId, { newOwnerId: member.user._id });
        ElMessage.success('群主已转让');
        await loadGroupInfo();
        await loadMembers();
        break;
      case 'removeMember':
        await ElMessageBox.confirm(
          `确认移除 ${member.user?.profile?.nickName || member.user?.username} 吗？`,
          '移除成员',
          { type: 'warning' }
        );
        await chatApi.removeGroupMember(props.conversationId, member._id);
        ElMessage.success('成员已移除');
        await loadMembers();
        break;
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('操作失败:', error);
      ElMessage.error(error.response?.data?.message || '操作失败');
    }
  }
};

const showAddMemberDialog = () => {
  showAddMember.value = true;
};

const handleMemberAdded = () => {
  loadMembers();
  ElMessage.success('成员添加成功');
};

const toggleMute = async () => {
  try {
    await chatApi.toggleMute(props.conversationId);
    ElMessage.success(groupSettings.value.muted ? '已开启免打扰' : '已关闭免打扰');
  } catch (error) {
    groupSettings.value.muted = !groupSettings.value.muted;
    ElMessage.error('操作失败');
  }
};

const togglePin = async () => {
  try {
    await chatApi.togglePin(props.conversationId);
    ElMessage.success(groupSettings.value.pinned ? '已置顶' : '已取消置顶');
  } catch (error) {
    groupSettings.value.pinned = !groupSettings.value.pinned;
    ElMessage.error('操作失败');
  }
};

const saveChanges = async () => {
  if (isEditing.value) {
    try {
      saving.value = true;
      await chatApi.updateGroupInfo(props.conversationId, editGroupInfo.value);
      groupInfo.value = { ...editGroupInfo.value };
      ElMessage.success('群信息已更新');
      isEditing.value = false;
      emit('updated');
    } catch (error) {
      console.error('更新群信息失败:', error);
      ElMessage.error(error.response?.data?.message || '更新失败');
    } finally {
      saving.value = false;
    }
  }
};

const handleLeaveGroup = async () => {
  try {
    await ElMessageBox.confirm('确认退出群聊吗？退出后将无法接收群消息。', '退出群聊', {
      type: 'warning',
    });
    await chatApi.leaveGroup(props.conversationId);
    ElMessage.success('已退出群聊');
    emit('updated');
    handleClose();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('退出群聊失败:', error);
      ElMessage.error(error.response?.data?.message || '退出失败');
    }
  }
};

const handleDissolveGroup = async () => {
  try {
    await ElMessageBox.confirm('确认解散群聊吗？解散后群聊将无法恢复，所有成员将被移除。', '解散群聊', {
      type: 'warning',
      confirmButtonText: '确认解散',
      confirmButtonClass: 'el-button--danger',
    });
    await chatApi.dissolveGroup(props.conversationId);
    ElMessage.success('群聊已解散');
    emit('updated');
    handleClose();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('解散群聊失败:', error);
      ElMessage.error(error.response?.data?.message || '解散失败');
    }
  }
};

const handleClose = () => {
  isEditing.value = false;
  searchKeyword.value = '';
  visible.value = false;
};

watch(
  () => props.modelValue,
  val => {
    if (val) {
      loadGroupInfo();
      loadMembers();
    }
  }
);
</script>

<style scoped>
.group-info-tabs {
  min-height: 500px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.avatar-upload {
  cursor: pointer;
}

.avatar-upload:hover {
  opacity: 0.8;
}

.header-info {
  flex: 1;
}

.group-name-input {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.group-name {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #333;
}

.group-meta {
  margin: 4px 0;
  font-size: 14px;
  color: #666;
}

.group-owner {
  margin: 4px 0;
  font-size: 14px;
  color: #999;
}

.announcement-section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.announcement-content {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

.members-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.search-input {
  margin-bottom: 16px;
}

.members-list {
  max-height: 400px;
  overflow-y: auto;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: background-color 0.2s;
  cursor: pointer;
}

.member-item:hover {
  background: #f5f7fa;
}

.member-badge {
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-join-time {
  font-size: 12px;
  color: #999;
}

.settings-section {
  padding: 0 10px;
}

.no-permission {
  text-align: center;
  padding: 40px 0;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
}

.setting-label {
  font-size: 15px;
  color: #333;
}

.setting-actions {
  text-align: center;
  padding: 20px 0;
}

.danger-zone {
  margin-top: 30px;
  padding: 20px;
  border: 1px solid #f56c6c;
  border-radius: 8px;
  background: #fef0f0;
}

.danger-zone h4 {
  margin: 0 0 16px 0;
  color: #f56c6c;
  font-size: 16px;
}

.danger-zone .el-button {
  width: 100%;
  margin-bottom: 12px;
}

.member-detail {
  text-align: center;
}

.member-detail h3 {
  margin: 16px 0;
  font-size: 20px;
  color: #333;
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 12px 0;
  color: #666;
  font-size: 14px;
}

@media (max-width: 768px) {
  .group-header {
    flex-direction: column;
    text-align: center;
  }

  .header-info {
    width: 100%;
  }

  .members-list {
    max-height: 300px;
  }
}
</style>
