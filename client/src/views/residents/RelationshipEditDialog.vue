<template>
  <el-dialog
    v-model="dialogVisible"
    title="血缘关系管理"
    width="700px"
    :close-on-click-modal="false"
  >
    <div class="relationship-management">
      <!-- 关系添加表单 -->
      <el-card shadow="never" class="add-relationship-card">
        <template #header>
          <span>添加家庭关系</span>
        </template>

        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="成员A" prop="memberA">
                <el-select
                  v-model="form.memberA"
                  placeholder="请选择成员"
                  style="width: 100%"
                  filterable
                >
                  <el-option
                    v-for="member in members"
                    :key="member.id"
                    :label="`${member.name} (${member.householdCode || '无户码'})`"
                    :value="member.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="关系类型" prop="relationship">
                <el-select v-model="form.relationship" placeholder="请选择关系" style="width: 100%">
                  <el-option-group label="夫妻关系">
                    <el-option label="夫妻" value="spouse" />
                  </el-option-group>
                  <el-option-group label="父子关系">
                    <el-option label="父子" value="father_son" />
                    <el-option label="父女" value="father_daughter" />
                    <el-option label="母子" value="mother_son" />
                    <el-option label="母女" value="mother_daughter" />
                  </el-option-group>
                  <el-option-group label="兄弟姐妹">
                    <el-option label="兄弟" value="brother" />
                    <el-option label="姐妹" value="sister" />
                    <el-option label="兄妹" value="brother_sister" />
                  </el-option-group>
                  <el-option-group label="祖孙关系">
                    <el-option label="祖父孙子" value="grandfather_grandson" />
                    <el-option label="祖父孙女" value="grandfather_granddaughter" />
                    <el-option label="祖母孙子" value="grandmother_grandson" />
                    <el-option label="祖母孙女" value="grandmother_granddaughter" />
                  </el-option-group>
                  <el-option-group label="其他">
                    <el-option label="其他亲属" value="other_relative" />
                  </el-option-group>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="成员B" prop="memberB">
                <el-select
                  v-model="form.memberB"
                  placeholder="请选择成员"
                  style="width: 100%"
                  filterable
                >
                  <el-option
                    v-for="member in members"
                    :key="member.id"
                    :label="`${member.name} (${member.householdCode || '无户码'})`"
                    :value="member.id"
                    :disabled="member.id === form.memberA"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="所属家族" prop="family">
                <el-select v-model="form.family" placeholder="请选择家族" style="width: 100%">
                  <el-option
                    v-for="family in families"
                    :key="family.id"
                    :label="family.name"
                    :value="family.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="关系描述">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="2"
              placeholder="可选：关系的详细描述"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="addRelationship" :loading="submitting">
              添加关系
            </el-button>
            <el-button @click="resetForm"> 重置 </el-button>
            <el-button type="success" @click="autoDetectRelationships"> 智能识别 </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 已建立的关系列表 -->
      <el-card shadow="never" class="relationships-list-card">
        <template #header>
          <div class="card-header">
            <span>已建立的关系 ({{ relationships.length }})</span>
            <el-button size="small" @click="refreshRelationships" icon="Refresh"> 刷新 </el-button>
          </div>
        </template>

        <el-table :data="relationships" border style="width: 100%" v-loading="loading">
          <el-table-column prop="memberA.name" label="成员A" width="120" />

          <el-table-column prop="relationship" label="关系" width="120">
            <template #default="scope">
              <el-tag :type="getRelationshipType(scope.row.relationship)" size="small">
                {{ getRelationshipText(scope.row.relationship) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="memberB.name" label="成员B" width="120" />

          <el-table-column prop="family.name" label="所属家族" width="100">
            <template #default="scope">
              <el-tag size="small" type="info">
                {{ scope.row.family?.name || '未分组' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />

          <el-table-column prop="createTime" label="建立时间" width="110">
            <template #default="scope">
              {{ formatDate(scope.row.createTime) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="120" fixed="right">
            <template #default="scope">
              <el-button type="text" size="small" @click="editRelationship(scope.row)" icon="Edit">
                编辑
              </el-button>
              <el-button
                type="text"
                size="small"
                @click="deleteRelationship(scope.row)"
                icon="Delete"
                class="danger-btn"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="!relationships.length" class="no-data">暂无家庭关系数据</div>
      </el-card>

      <!-- 智能识别结果 -->
      <el-card v-if="suggestedRelationships.length" shadow="never" class="suggestions-card">
        <template #header>
          <span>智能识别建议 ({{ suggestedRelationships.length }})</span>
        </template>

        <div class="suggestions-list">
          <div
            v-for="suggestion in suggestedRelationships"
            :key="`${suggestion.memberA.id}-${suggestion.memberB.id}`"
            class="suggestion-item"
          >
            <div class="suggestion-content">
              <div class="suggestion-relationship">
                <span class="member-name">{{ suggestion.memberA.name }}</span>
                <el-icon><Right /></el-icon>
                <el-tag size="small">{{ getRelationshipText(suggestion.relationship) }}</el-tag>
                <el-icon><Right /></el-icon>
                <span class="member-name">{{ suggestion.memberB.name }}</span>
              </div>
              <div class="suggestion-reason">
                <el-text size="small" type="info">
                  {{ suggestion.reason }}
                </el-text>
              </div>
            </div>

            <div class="suggestion-actions">
              <el-button size="small" type="primary" @click="acceptSuggestion(suggestion)">
                采用
              </el-button>
              <el-button size="small" @click="rejectSuggestion(suggestion)"> 忽略 </el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="saveAllChanges" :loading="saving">
          保存所有更改
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Right, Refresh, Edit, Delete } from '@element-plus/icons-vue';
import { residentAPI } from '@/api/resident';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  families: {
    type: Array,
    default: () => [],
  },
  members: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:modelValue', 'confirm']);

// 响应式数据
const loading = ref(false);
const submitting = ref(false);
const saving = ref(false);
const formRef = ref();
const relationships = ref([]);
const suggestedRelationships = ref([]);

// 表单数据
const form = reactive({
  memberA: '',
  relationship: '',
  memberB: '',
  family: '',
  description: '',
});

// 表单验证规则
const rules = {
  memberA: [{ required: true, message: '请选择成员A', trigger: 'change' }],
  relationship: [{ required: true, message: '请选择关系类型', trigger: 'change' }],
  memberB: [{ required: true, message: '请选择成员B', trigger: 'change' }],
  family: [{ required: true, message: '请选择所属家族', trigger: 'change' }],
};

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

// 方法
const addRelationship = async () => {
  try {
    await formRef.value.validate();

    if (form.memberA === form.memberB) {
      ElMessage.warning('不能选择相同的成员');
      return;
    }

    submitting.value = true;

    const response = await residentAPI.addFamilyRelationship(form);
    if (response.success) {
      ElMessage.success('关系添加成功');
      resetForm();
      refreshRelationships();
    }
  } catch (error) {
    if (error !== false) {
      ElMessage.error('添加关系失败');
    }
  } finally {
    submitting.value = false;
  }
};

const resetForm = () => {
  Object.assign(form, {
    memberA: '',
    relationship: '',
    memberB: '',
    family: '',
    description: '',
  });

  if (formRef.value) {
    formRef.value.clearValidate();
  }
};

const refreshRelationships = async () => {
  loading.value = true;
  try {
    const response = await residentAPI.getFamilyRelationships();
    if (response.success) {
      relationships.value = response.data;
    }
  } catch (error) {
    ElMessage.error('获取关系数据失败');
  } finally {
    loading.value = false;
  }
};

const autoDetectRelationships = async () => {
  try {
    const response = await residentAPI.detectFamilyRelationships();
    if (response.success) {
      suggestedRelationships.value = response.data;
      ElMessage.success(`智能识别完成，发现 ${response.data.length} 个潜在关系`);
    }
  } catch (error) {
    ElMessage.error('智能识别失败');
  }
};

const editRelationship = relationship => {
  Object.assign(form, {
    memberA: relationship.memberA.id,
    relationship: relationship.relationship,
    memberB: relationship.memberB.id,
    family: relationship.family?.id || '',
    description: relationship.description || '',
  });
};

const deleteRelationship = async relationship => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${relationship.memberA.name} 与 ${relationship.memberB.name} 的关系吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    const response = await residentAPI.deleteFamilyRelationship(relationship.id);
    if (response.success) {
      ElMessage.success('关系删除成功');
      refreshRelationships();
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const acceptSuggestion = async suggestion => {
  try {
    const response = await residentAPI.addFamilyRelationship({
      memberA: suggestion.memberA.id,
      relationship: suggestion.relationship,
      memberB: suggestion.memberB.id,
      family: suggestion.family?.id,
      description: `智能识别：${suggestion.reason}`,
    });

    if (response.success) {
      ElMessage.success('关系添加成功');
      rejectSuggestion(suggestion);
      refreshRelationships();
    }
  } catch (error) {
    ElMessage.error('添加关系失败');
  }
};

const rejectSuggestion = suggestion => {
  const index = suggestedRelationships.value.findIndex(
    s => s.memberA.id === suggestion.memberA.id && s.memberB.id === suggestion.memberB.id
  );
  if (index > -1) {
    suggestedRelationships.value.splice(index, 1);
  }
};

const saveAllChanges = async () => {
  saving.value = true;
  try {
    // 这里可以批量保存所有更改
    ElMessage.success('所有更改已保存');
    emit('confirm');
  } catch (error) {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};

// 工具函数
const getRelationshipText = relationship => {
  const map = {
    spouse: '夫妻',
    father_son: '父子',
    father_daughter: '父女',
    mother_son: '母子',
    mother_daughter: '母女',
    brother: '兄弟',
    sister: '姐妹',
    brother_sister: '兄妹',
    grandfather_grandson: '祖父孙子',
    grandfather_granddaughter: '祖父孙女',
    grandmother_grandson: '祖母孙子',
    grandmother_granddaughter: '祖母孙女',
    other_relative: '其他亲属',
  };
  return map[relationship] || relationship;
};

const getRelationshipType = relationship => {
  if (['spouse'].includes(relationship)) return 'danger';
  if (['father_son', 'father_daughter', 'mother_son', 'mother_daughter'].includes(relationship))
    return 'primary';
  if (['brother', 'sister', 'brother_sister'].includes(relationship)) return 'success';
  if (
    [
      'grandfather_grandson',
      'grandfather_granddaughter',
      'grandmother_grandson',
      'grandmother_granddaughter',
    ].includes(relationship)
  )
    return 'warning';
  return 'info';
};

const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleDateString();
};

// 生命周期
onMounted(() => {
  refreshRelationships();
});
</script>

<style lang="scss" scoped>
.relationship-management {
  .add-relationship-card,
  .relationships-list-card,
  .suggestions-card {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .danger-btn {
    color: #f56c6c !important;

    &:hover {
      color: #f78989 !important;
    }
  }

  .no-data {
    text-align: center;
    color: #909399;
    padding: 40px 0;
  }

  .suggestions-list {
    .suggestion-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border: 1px solid #e4e7ed;
      border-radius: 8px;
      margin-bottom: 12px;
      background: #fafafa;

      &:last-child {
        margin-bottom: 0;
      }

      .suggestion-content {
        flex: 1;

        .suggestion-relationship {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;

          .member-name {
            font-weight: 500;
            color: #303133;
          }
        }

        .suggestion-reason {
          font-size: 12px;
        }
      }

      .suggestion-actions {
        display: flex;
        gap: 8px;
      }
    }
  }
}

.dialog-footer {
  text-align: right;
}

// 响应式设计
@media (max-width: 768px) {
  .relationship-management {
    .suggestion-item {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;

      .suggestion-actions {
        justify-content: center;
      }
    }
  }
}
</style>
