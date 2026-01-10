<template>
  <div class="family-tags">
    <!-- 家庭类型标签 -->
    <div class="tag-section">
      <h4>家庭类型</h4>
      <div class="tags-container">
        <el-tag
          v-for="type in familyTypes"
          :key="type"
          :type="getFamilyTypeColor(type)"
          size="large"
          closable
          @close="handleRemoveType(type)"
        >
          {{ type }}
        </el-tag>
        <el-dropdown trigger="click" @command="handleAddType">
          <el-button size="small" type="primary" plain>
            <el-icon><Plus /></el-icon>
            添加类型
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="type in availableFamilyTypes"
                :key="type.value"
                :command="type.value"
                :disabled="familyTypes.includes(type.value)"
              >
                {{ type.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 自定义标签 -->
    <div class="tag-section">
      <h4>自定义标签</h4>
      <div class="tags-container">
        <el-tag
          v-for="tag in customTags"
          :key="tag.name"
          :color="tag.color"
          size="large"
          closable
          @close="handleRemoveCustomTag(tag.name)"
        >
          {{ tag.name }}
        </el-tag>
        <el-button size="small" type="success" plain @click="showAddTagDialog">
          <el-icon><Plus /></el-icon>
          添加标签
        </el-button>
      </div>
    </div>

    <!-- 成员特殊标签 -->
    <div v-if="showMemberTags" class="tag-section">
      <h4>成员特殊标记</h4>
      <div class="member-tags-list">
        <div v-for="member in members" :key="member._id" class="member-tag-item">
          <div class="member-info">
            <el-avatar :size="40" :src="member.avatar">
              {{ member.name?.charAt(0) }}
            </el-avatar>
            <div class="member-details">
              <div class="member-name">{{ member.name }}</div>
              <div class="member-relation">{{ member.relationship }}</div>
            </div>
          </div>
          <div class="member-tags">
            <el-tag
              v-for="specialTag in member.specialTags"
              :key="specialTag"
              :type="getSpecialTagColor(specialTag)"
              size="small"
              closable
              @close="handleRemoveMemberTag(member._id, specialTag)"
            >
              {{ specialTag }}
            </el-tag>
            <el-dropdown trigger="click" @command="tag => handleAddMemberTag(member._id, tag)">
              <el-button size="small" plain circle>
                <el-icon><Plus /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="tag in availableSpecialTags"
                    :key="tag"
                    :command="tag"
                    :disabled="member.specialTags?.includes(tag)"
                  >
                    {{ tag }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加自定义标签对话框 -->
    <el-dialog v-model="addTagDialogVisible" title="添加自定义标签" width="400px">
      <el-form :model="newTag" label-width="80px">
        <el-form-item label="标签名称">
          <el-input v-model="newTag.name" placeholder="请输入标签名称" maxlength="20" />
        </el-form-item>
        <el-form-item label="标签颜色">
          <el-color-picker v-model="newTag.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addTagDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddCustomTag">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { useFamilyStore } from '@/stores/familyStore';

const props = defineProps({
  familyId: {
    type: String,
    required: true,
  },
  familyTypes: {
    type: Array,
    default: () => [],
  },
  customTags: {
    type: Array,
    default: () => [],
  },
  members: {
    type: Array,
    default: () => [],
  },
  showMemberTags: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['update:familyTypes', 'update:customTags', 'update:members']);

const familyStore = useFamilyStore();

const addTagDialogVisible = ref(false);
const newTag = ref({
  name: '',
  color: '#409EFF',
});

// 可用的家庭类型
const availableFamilyTypes = [
  { label: '一般家庭', value: '一般家庭' },
  { label: '低保户', value: '低保户' },
  { label: '残疾人家庭', value: '残疾人家庭' },
  { label: '独居老人家庭', value: '独居老人家庭' },
  { label: '独生子女家庭', value: '独生子女家庭' },
  { label: '空巢家庭', value: '空巢家庭' },
  { label: '困难家庭', value: '困难家庭' },
  { label: '重点帮扶对象', value: '重点帮扶对象' },
  { label: '模范家庭', value: '模范家庭' },
  { label: '创业家庭', value: '创业家庭' },
];

// 可用的特殊标签
const availableSpecialTags = [
  '独居老人',
  '残疾人',
  '慢性病患者',
  '重大疾病患者',
  '孕妇',
  '婴幼儿',
  '在校学生',
  '退役军人',
  '共产党员',
  '志愿者',
  '空巢老人',
];

// 添加家庭类型
async function handleAddType(type) {
  try {
    // 如果是低保户等特殊类型，需要更新经济状况
    const updatedTypes = [...props.familyTypes, type];
    emit('update:familyTypes', updatedTypes);

    // 调用API更新
    await familyStore.updateFamily(props.familyId, {
      familyTypes: updatedTypes,
    });

    ElMessage.success('添加成功');
  } catch (error) {
    ElMessage.error('添加失败');
    console.error('Add family type error:', error);
  }
}

// 移除家庭类型
async function handleRemoveType(type) {
  try {
    const updatedTypes = props.familyTypes.filter(t => t !== type);
    emit('update:familyTypes', updatedTypes);

    await familyStore.updateFamily(props.familyId, {
      familyTypes: updatedTypes,
    });

    ElMessage.success('移除成功');
  } catch (error) {
    ElMessage.error('移除失败');
    console.error('Remove family type error:', error);
  }
}

// 显示添加标签对话框
function showAddTagDialog() {
  newTag.value = {
    name: '',
    color: '#409EFF',
  };
  addTagDialogVisible.value = true;
}

// 添加自定义标签
async function handleAddCustomTag() {
  if (!newTag.value.name) {
    ElMessage.warning('请输入标签名称');
    return;
  }

  try {
    await familyStore.addFamilyTag(props.familyId, newTag.value.name, newTag.value.color);

    const updatedTags = [...props.customTags, { ...newTag.value }];
    emit('update:customTags', updatedTags);

    addTagDialogVisible.value = false;
    ElMessage.success('添加成功');
  } catch (error) {
    ElMessage.error('添加失败');
    console.error('Add custom tag error:', error);
  }
}

// 移除自定义标签
async function handleRemoveCustomTag(tagName) {
  try {
    await familyStore.removeFamilyTag(props.familyId, tagName);

    const updatedTags = props.customTags.filter(t => t.name !== tagName);
    emit('update:customTags', updatedTags);

    ElMessage.success('移除成功');
  } catch (error) {
    ElMessage.error('移除失败');
    console.error('Remove custom tag error:', error);
  }
}

// 添加成员特殊标签
async function handleAddMemberTag(memberId, tag) {
  try {
    await familyStore.addMemberSpecialTag(memberId, tag);

    // 更新成员列表
    const updatedMembers = props.members.map(m => {
      if (m._id === memberId) {
        return {
          ...m,
          specialTags: [...(m.specialTags || []), tag],
        };
      }
      return m;
    });

    emit('update:members', updatedMembers);
    ElMessage.success('添加成功');
  } catch (error) {
    ElMessage.error('添加失败');
    console.error('Add member tag error:', error);
  }
}

// 移除成员特殊标签
async function handleRemoveMemberTag(memberId, tag) {
  try {
    await familyStore.removeMemberSpecialTag(memberId, tag);

    const updatedMembers = props.members.map(m => {
      if (m._id === memberId) {
        return {
          ...m,
          specialTags: m.specialTags.filter(t => t !== tag),
        };
      }
      return m;
    });

    emit('update:members', updatedMembers);
    ElMessage.success('移除成功');
  } catch (error) {
    ElMessage.error('移除失败');
    console.error('Remove member tag error:', error);
  }
}

// 获取家庭类型颜色
function getFamilyTypeColor(type) {
  const colorMap = {
    低保户: 'danger',
    残疾人家庭: 'warning',
    独居老人家庭: 'warning',
    重点帮扶对象: 'danger',
    模范家庭: 'success',
    创业家庭: 'success',
  };
  return colorMap[type] || 'primary';
}

// 获取特殊标签颜色
function getSpecialTagColor(tag) {
  const colorMap = {
    独居老人: 'warning',
    残疾人: 'danger',
    慢性病患者: 'warning',
    重大疾病患者: 'danger',
    孕妇: 'success',
    婴幼儿: 'success',
    共产党员: 'danger',
    志愿者: 'success',
  };
  return colorMap[tag] || 'info';
}
</script>

<style scoped lang="scss">
.family-tags {
  .tag-section {
    margin-bottom: 30px;

    h4 {
      margin: 0 0 15px 0;
      font-size: 16px;
      color: #303133;
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
  }

  .member-tags-list {
    .member-tag-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      border: 1px solid #ebeef5;
      border-radius: 8px;
      margin-bottom: 15px;

      .member-info {
        display: flex;
        align-items: center;
        gap: 15px;

        .member-details {
          .member-name {
            font-size: 16px;
            font-weight: bold;
            color: #303133;
            margin-bottom: 5px;
          }

          .member-relation {
            font-size: 14px;
            color: #909399;
          }
        }
      }

      .member-tags {
        display: flex;
        gap: 8px;
        align-items: center;
      }
    }
  }
}
</style>
