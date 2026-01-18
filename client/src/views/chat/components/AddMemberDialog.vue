<template>
  <el-dialog v-model="visible" title="添加群成员" width="500px" @close="handleClose" append-to-body>
    <div class="add-member-dialog">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索好友..."
        :prefix-icon="Search"
        clearable
        class="search-input"
      />

      <div class="friend-list" v-loading="loading">
        <el-checkbox-group v-model="selectedFriends">
          <div
            v-for="friend in filteredFriends"
            :key="friend.friend?._id"
            class="friend-item"
          >
            <el-checkbox :label="friend.friend?._id" :disabled="isMemberExists(friend.friend?._id)">
              <div class="friend-content">
                <el-avatar :src="friend.friend?.profile?.avatar" :size="48">
                  {{ friend.friend?.profile?.nickName?.charAt(0) || friend.friend?.username?.charAt(0) }}
                </el-avatar>
                <div class="friend-info">
                  <div class="friend-name">
                    {{ friend.friend?.profile?.nickName || friend.friend?.username }}
                  </div>
                  <div class="friend-alias" v-if="friend.alias">备注: {{ friend.alias }}</div>
                  <div v-if="isMemberExists(friend.friend?._id)" class="exists-tag">
                    已在群中
                  </div>
                </div>
              </div>
            </el-checkbox>
          </div>
        </el-checkbox-group>

        <el-empty v-if="filteredFriends.length === 0" description="暂无好友" />
      </div>

      <div class="selection-info">
        已选择 {{ selectedFriends.length }} 人
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleAdd" :loading="adding" :disabled="selectedFriends.length === 0">
        添加
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { chatApi, friendApi } from '@/api';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  conversationId: {
    type: String,
    required: true,
  },
  existingMembers: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:modelValue', 'added']);

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

const loading = ref(false);
const adding = ref(false);
const searchKeyword = ref('');
const selectedFriends = ref([]);
const friends = ref([]);

const filteredFriends = computed(() => {
  if (!searchKeyword.value) {
    return friends.value;
  }
  const keyword = searchKeyword.value.toLowerCase();
  return friends.value.filter(friend => {
    const name = friend.friend?.profile?.nickName || friend.friend?.username || '';
    return name.toLowerCase().includes(keyword);
  });
});

const isMemberExists = userId => {
  return props.existingMembers.some(member => member.user._id === userId);
};

const loadFriends = async () => {
  loading.value = true;
  try {
    const { data } = await friendApi.getFriends();
    if (data.success) {
      friends.value = data.data || [];
    }
  } catch (error) {
    console.error('加载好友列表失败:', error);
    ElMessage.error('加载好友列表失败');
  } finally {
    loading.value = false;
  }
};

const handleAdd = async () => {
  if (selectedFriends.value.length === 0) {
    ElMessage.warning('请选择要添加的成员');
    return;
  }

  adding.value = true;
  try {
    await chatApi.addGroupMembers(props.conversationId, {
      userIds: selectedFriends.value,
    });
    ElMessage.success(`成功添加 ${selectedFriends.value.length} 位成员`);
    emit('added');
    handleClose();
  } catch (error) {
    console.error('添加成员失败:', error);
    ElMessage.error(error.response?.data?.message || '添加失败');
  } finally {
    adding.value = false;
  }
};

const handleClose = () => {
  selectedFriends.value = [];
  searchKeyword.value = '';
  visible.value = false;
};

watch(
  () => props.modelValue,
  val => {
    if (val && friends.value.length === 0) {
      loadFriends();
    }
  }
);
</script>

<style scoped>
.add-member-dialog {
  max-height: 500px;
  display: flex;
  flex-direction: column;
}

.search-input {
  margin-bottom: 16px;
}

.friend-list {
  flex: 1;
  overflow-y: auto;
  max-height: 350px;
  padding: 0 8px;
}

.friend-item {
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.friend-item:hover {
  background: #f5f7fa;
}

.friend-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.friend-info {
  flex: 1;
  min-width: 0;
}

.friend-name {
  font-size: 15px;
  color: #333;
  margin-bottom: 4px;
}

.friend-alias {
  font-size: 12px;
  color: #999;
}

.exists-tag {
  display: inline-block;
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.selection-info {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
  text-align: right;
  font-size: 14px;
  color: #666;
}

:deep(.el-checkbox) {
  width: 100%;
  display: flex;
  align-items: center;
}

:deep(.el-checkbox__label) {
  flex: 1;
  padding-left: 12px;
}
</style>
