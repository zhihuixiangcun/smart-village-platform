<template>
  <el-dialog
    v-model="dialogVisible"
    title="家庭关系管理"
    width="1000px"
    :close-on-click-modal="false"
    top="5vh"
  >
    <div class="family-relationship-manager">
      <!-- 当前村民信息 -->
      <div class="current-resident-info">
        <el-card class="resident-card" shadow="never">
          <div class="resident-header">
            <el-avatar :size="60" :src="resident?.avatar" :icon="UserFilled" />
            <div class="resident-info">
              <h3>{{ resident?.name }}</h3>
              <p>
                <el-tag :type="resident?.gender === 'male' ? 'primary' : 'danger'" size="small">
                  {{ resident?.gender === 'male' ? '男' : '女' }}
                </el-tag>
                <span class="info-item">{{ resident?.age }} 岁</span>
                <span class="info-item">户码: {{ resident?.householdCode }}</span>
                <span class="info-item">{{ resident?.familyRole || '村民' }}</span>
              </p>
            </div>
          </div>
        </el-card>
      </div>

      <el-row :gutter="20">
        <!-- 左侧：家庭关系图谱 -->
        <el-col :span="14">
          <el-card title="家庭关系图谱" shadow="never">
            <template #header>
              <div class="card-header">
                <span>家庭关系图谱</span>
                <el-button-group size="small">
                  <el-button @click="refreshFamily" icon="Refresh">刷新</el-button>
                  <el-button @click="autoDetectRelations" icon="MagicStick">智能识别</el-button>
                  <el-button @click="exportFamilyTree" icon="Download">导出图谱</el-button>
                </el-button-group>
              </div>
            </template>

            <div class="family-tree-container">
              <!-- 家庭树状图 -->
              <div v-if="familyTree.length > 0" class="family-tree">
                <!-- 祖父母层 -->
                <div
                  v-if="getGenerationMembers(-2).length > 0"
                  class="generation-level grandparents"
                >
                  <div class="generation-title">祖父母辈</div>
                  <div class="members-row">
                    <div
                      v-for="member in getGenerationMembers(-2)"
                      :key="member.id"
                      class="family-member grandparent"
                      @click="selectMember(member)"
                    >
                      <el-avatar :size="40" :src="member.avatar" :icon="UserFilled" />
                      <div class="member-info">
                        <div class="member-name">{{ member.name }}</div>
                        <div class="member-relation">{{ member.relationToTarget }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 父母层 -->
                <div v-if="getGenerationMembers(-1).length > 0" class="generation-level parents">
                  <div class="generation-title">父母辈</div>
                  <div class="members-row">
                    <div
                      v-for="member in getGenerationMembers(-1)"
                      :key="member.id"
                      class="family-member parent"
                      @click="selectMember(member)"
                    >
                      <el-avatar :size="45" :src="member.avatar" :icon="UserFilled" />
                      <div class="member-info">
                        <div class="member-name">{{ member.name }}</div>
                        <div class="member-relation">{{ member.relationToTarget }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 当前层（本人及兄弟姐妹、配偶） -->
                <div class="generation-level current">
                  <div class="generation-title">本人及同辈</div>
                  <div class="members-row">
                    <div
                      v-for="member in getGenerationMembers(0)"
                      :key="member.id"
                      class="family-member current-gen"
                      :class="{ 'is-current': member.id === resident?.id }"
                      @click="selectMember(member)"
                    >
                      <el-avatar :size="50" :src="member.avatar" :icon="UserFilled" />
                      <div class="member-info">
                        <div class="member-name">{{ member.name }}</div>
                        <div class="member-relation">{{ member.relationToTarget }}</div>
                      </div>
                      <el-icon v-if="member.id === resident?.id" class="current-indicator">
                        <Star />
                      </el-icon>
                    </div>
                  </div>
                </div>

                <!-- 子女层 -->
                <div v-if="getGenerationMembers(1).length > 0" class="generation-level children">
                  <div class="generation-title">子女辈</div>
                  <div class="members-row">
                    <div
                      v-for="member in getGenerationMembers(1)"
                      :key="member.id"
                      class="family-member child"
                      @click="selectMember(member)"
                    >
                      <el-avatar :size="40" :src="member.avatar" :icon="UserFilled" />
                      <div class="member-info">
                        <div class="member-name">{{ member.name }}</div>
                        <div class="member-relation">{{ member.relationToTarget }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 孙辈层 -->
                <div
                  v-if="getGenerationMembers(2).length > 0"
                  class="generation-level grandchildren"
                >
                  <div class="generation-title">孙辈</div>
                  <div class="members-row">
                    <div
                      v-for="member in getGenerationMembers(2)"
                      :key="member.id"
                      class="family-member grandchild"
                      @click="selectMember(member)"
                    >
                      <el-avatar :size="35" :src="member.avatar" :icon="UserFilled" />
                      <div class="member-info">
                        <div class="member-name">{{ member.name }}</div>
                        <div class="member-relation">{{ member.relationToTarget }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-else class="empty-family-tree">
                <el-empty description="暂无家庭关系数据" />
                <el-button type="primary" @click="showAddRelationDialog"> 添加家庭成员 </el-button>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 右侧：关系管理 -->
        <el-col :span="10">
          <el-card title="关系管理" shadow="never">
            <template #header>
              <div class="card-header">
                <span>关系管理</span>
                <el-button size="small" type="primary" @click="showAddRelationDialog" icon="Plus">
                  添加关系
                </el-button>
              </div>
            </template>

            <!-- 选中成员信息 -->
            <div v-if="selectedMember" class="selected-member-info">
              <el-alert type="info" :closable="false">
                <template #title>
                  <div class="selected-member">
                    <el-avatar :size="30" :src="selectedMember.avatar" :icon="UserFilled" />
                    <span>{{ selectedMember.name }} ({{ selectedMember.relationToTarget }})</span>
                  </div>
                </template>
              </el-alert>
            </div>

            <!-- 关系列表 -->
            <div class="relations-list">
              <el-table :data="currentRelations" style="width: 100%" size="small">
                <el-table-column prop="name" label="姓名" width="80" />
                <el-table-column prop="relationToTarget" label="关系" width="80" />
                <el-table-column prop="verified" label="状态" width="60">
                  <template #default="scope">
                    <el-tag :type="scope.row.verified ? 'success' : 'warning'" size="small">
                      {{ scope.row.verified ? '已验证' : '待验证' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="100">
                  <template #default="scope">
                    <el-button-group size="small">
                      <el-button
                        type="primary"
                        size="small"
                        @click="editRelation(scope.row)"
                        icon="Edit"
                      />
                      <el-button
                        type="danger"
                        size="small"
                        @click="deleteRelation(scope.row)"
                        icon="Delete"
                      />
                    </el-button-group>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 智能推荐 -->
            <div v-if="recommendedRelations.length > 0" class="relation-recommendations">
              <el-divider content-position="left">智能推荐</el-divider>
              <div class="recommendation-list">
                <div v-for="rec in recommendedRelations" :key="rec.id" class="recommendation-item">
                  <div class="rec-info">
                    <el-avatar :size="30" :src="rec.avatar" :icon="UserFilled" />
                    <div class="rec-details">
                      <div class="rec-name">{{ rec.name }}</div>
                      <div class="rec-reason">{{ rec.reason }}</div>
                    </div>
                  </div>
                  <div class="rec-actions">
                    <el-button size="small" type="primary" @click="acceptRecommendation(rec)">
                      接受
                    </el-button>
                    <el-button size="small" @click="rejectRecommendation(rec)"> 忽略 </el-button>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 添加/编辑关系对话框 -->
      <el-dialog
        v-model="relationDialogVisible"
        :title="relationDialogMode === 'add' ? '添加家庭关系' : '编辑家庭关系'"
        width="500px"
      >
        <el-form
          ref="relationFormRef"
          :model="relationForm"
          :rules="relationRules"
          label-width="100px"
        >
          <el-form-item label="选择成员" prop="memberId">
            <el-select
              v-model="relationForm.memberId"
              placeholder="请选择家庭成员"
              filterable
              style="width: 100%"
            >
              <el-option
                v-for="member in availableMembers"
                :key="member.id"
                :label="`${member.name} (${member.idCard?.slice(-4)})`"
                :value="member.id"
              >
                <div class="member-option">
                  <el-avatar :size="20" :src="member.avatar" :icon="UserFilled" />
                  <span>{{ member.name }}</span>
                  <span class="member-info"
                    >{{ member.age }}岁 - {{ member.gender === 'male' ? '男' : '女' }}</span
                  >
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="关系类型" prop="relation">
            <el-select v-model="relationForm.relation" placeholder="请选择关系" style="width: 100%">
              <el-option-group label="直系亲属">
                <el-option label="父亲" value="father" />
                <el-option label="母亲" value="mother" />
                <el-option label="儿子" value="son" />
                <el-option label="女儿" value="daughter" />
              </el-option-group>
              <el-option-group label="配偶及其他">
                <el-option label="配偶" value="spouse" />
                <el-option label="兄弟" value="brother" />
                <el-option label="姐妹" value="sister" />
              </el-option-group>
              <el-option-group label="隔代亲属">
                <el-option label="祖父" value="grandfather" />
                <el-option label="祖母" value="grandmother" />
                <el-option label="外祖父" value="maternal_grandfather" />
                <el-option label="外祖母" value="maternal_grandmother" />
                <el-option label="孙子" value="grandson" />
                <el-option label="孙女" value="granddaughter" />
                <el-option label="外孙" value="maternal_grandson" />
                <el-option label="外孙女" value="maternal_granddaughter" />
              </el-option-group>
            </el-select>
          </el-form-item>

          <el-form-item label="验证状态">
            <el-switch
              v-model="relationForm.verified"
              active-text="已验证"
              inactive-text="待验证"
            />
          </el-form-item>

          <el-form-item label="备注">
            <el-input
              v-model="relationForm.note"
              type="textarea"
              placeholder="请输入备注信息"
              :rows="2"
            />
          </el-form-item>
        </el-form>

        <template #footer>
          <span class="dialog-footer">
            <el-button @click="relationDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="saveRelation" :loading="saving">
              {{ relationDialogMode === 'add' ? '添加' : '保存' }}
            </el-button>
          </span>
        </template>
      </el-dialog>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="saveAllChanges" :loading="saving">
          保存所有更改
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  UserFilled,
  Plus,
  Edit,
  Delete,
  Refresh,
  MagicStick,
  Download,
  Star,
} from '@element-plus/icons-vue';

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  resident: {
    type: Object,
    default: () => ({}),
  },
});

// Emits
const emit = defineEmits(['update:modelValue', 'refresh']);

// 响应式数据
const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

const relationFormRef = ref();
const relationDialogVisible = ref(false);
const relationDialogMode = ref('add'); // 'add' | 'edit'
const saving = ref(false);
const selectedMember = ref(null);

// 家庭树数据
const familyTree = ref([]);
const currentRelations = ref([]);
const availableMembers = ref([]);
const recommendedRelations = ref([]);

// 关系表单
const relationForm = reactive({
  memberId: '',
  relation: '',
  verified: false,
  note: '',
});

const relationRules = {
  memberId: [{ required: true, message: '请选择家庭成员', trigger: 'change' }],
  relation: [{ required: true, message: '请选择关系类型', trigger: 'change' }],
};

// 计算属性
const getGenerationMembers = generation => {
  return familyTree.value.filter(member => member.generation === generation);
};

// 方法
const loadFamilyData = async () => {
  try {
    // 模拟加载家庭数据
    familyTree.value = [
      {
        id: 1,
        name: '张老爷子',
        generation: -2,
        relationToTarget: '祖父',
        avatar: '',
        verified: true,
      },
      {
        id: 2,
        name: '张奶奶',
        generation: -2,
        relationToTarget: '祖母',
        avatar: '',
        verified: true,
      },
      {
        id: 3,
        name: '张父亲',
        generation: -1,
        relationToTarget: '父亲',
        avatar: '',
        verified: true,
      },
      {
        id: 4,
        name: '张母亲',
        generation: -1,
        relationToTarget: '母亲',
        avatar: '',
        verified: true,
      },
      {
        id: props.resident.id,
        name: props.resident.name,
        generation: 0,
        relationToTarget: '本人',
        avatar: props.resident.avatar,
        verified: true,
      },
      {
        id: 5,
        name: '李美丽',
        generation: 0,
        relationToTarget: '配偶',
        avatar: '',
        verified: true,
      },
      {
        id: 6,
        name: '张小明',
        generation: 1,
        relationToTarget: '儿子',
        avatar: '',
        verified: true,
      },
      {
        id: 7,
        name: '张小红',
        generation: 1,
        relationToTarget: '女儿',
        avatar: '',
        verified: false,
      },
    ];

    currentRelations.value = familyTree.value.filter(member => member.id !== props.resident.id);

    // 模拟推荐关系
    recommendedRelations.value = [
      {
        id: 8,
        name: '张三叔',
        avatar: '',
        reason: '同户籍，年龄相符，可能是叔叔',
        confidence: 0.8,
      },
    ];

    // 加载可用成员
    availableMembers.value = [
      {
        id: 9,
        name: '王大妈',
        age: 65,
        gender: 'female',
        idCard: '320123195501011234',
      },
      {
        id: 10,
        name: '李小六',
        age: 25,
        gender: 'male',
        idCard: '320123199801011234',
      },
    ];
  } catch (error) {
    ElMessage.error('加载家庭数据失败');
  }
};

const selectMember = member => {
  selectedMember.value = member;
};

const showAddRelationDialog = () => {
  relationDialogMode.value = 'add';
  Object.assign(relationForm, {
    memberId: '',
    relation: '',
    verified: false,
    note: '',
  });
  relationDialogVisible.value = true;
};

const editRelation = relation => {
  relationDialogMode.value = 'edit';
  Object.assign(relationForm, {
    memberId: relation.id,
    relation: relation.relationToTarget,
    verified: relation.verified,
    note: relation.note || '',
  });
  relationDialogVisible.value = true;
};

const deleteRelation = async relation => {
  try {
    await ElMessageBox.confirm(`确定要删除与 ${relation.name} 的关系吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const index = currentRelations.value.findIndex(r => r.id === relation.id);
    if (index > -1) {
      currentRelations.value.splice(index, 1);
    }

    const treeIndex = familyTree.value.findIndex(m => m.id === relation.id);
    if (treeIndex > -1) {
      familyTree.value.splice(treeIndex, 1);
    }

    ElMessage.success('关系删除成功');
  } catch {
    // 用户取消操作
  }
};

const saveRelation = async () => {
  try {
    await relationFormRef.value.validate();

    saving.value = true;

    // 模拟保存关系
    await new Promise(resolve => setTimeout(resolve, 1000));

    const member = availableMembers.value.find(m => m.id === relationForm.memberId);
    if (member) {
      const newRelation = {
        id: member.id,
        name: member.name,
        generation: getGenerationByRelation(relationForm.relation),
        relationToTarget: relationForm.relation,
        avatar: member.avatar || '',
        verified: relationForm.verified,
        note: relationForm.note,
      };

      if (relationDialogMode.value === 'add') {
        familyTree.value.push(newRelation);
        currentRelations.value.push(newRelation);
      } else {
        // 编辑模式
        const index = currentRelations.value.findIndex(r => r.id === relationForm.memberId);
        if (index > -1) {
          Object.assign(currentRelations.value[index], newRelation);
        }
        const treeIndex = familyTree.value.findIndex(m => m.id === relationForm.memberId);
        if (treeIndex > -1) {
          Object.assign(familyTree.value[treeIndex], newRelation);
        }
      }

      ElMessage.success(`关系${relationDialogMode.value === 'add' ? '添加' : '更新'}成功`);
      relationDialogVisible.value = false;
    }
  } catch (error) {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};

const getGenerationByRelation = relation => {
  const generationMap = {
    grandfather: -2,
    grandmother: -2,
    maternal_grandfather: -2,
    maternal_grandmother: -2,
    father: -1,
    mother: -1,
    spouse: 0,
    brother: 0,
    sister: 0,
    son: 1,
    daughter: 1,
    grandson: 2,
    granddaughter: 2,
    maternal_grandson: 2,
    maternal_granddaughter: 2,
  };
  return generationMap[relation] || 0;
};

const acceptRecommendation = async recommendation => {
  try {
    // 自动设置关系信息
    relationForm.memberId = recommendation.id;
    relationForm.relation = recommendation.suggestedRelation || '';
    relationForm.verified = false;

    showAddRelationDialog();

    // 从推荐列表中移除
    const index = recommendedRelations.value.findIndex(r => r.id === recommendation.id);
    if (index > -1) {
      recommendedRelations.value.splice(index, 1);
    }
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const rejectRecommendation = recommendation => {
  const index = recommendedRelations.value.findIndex(r => r.id === recommendation.id);
  if (index > -1) {
    recommendedRelations.value.splice(index, 1);
  }
  ElMessage.info('已忽略该推荐');
};

const refreshFamily = () => {
  loadFamilyData();
  ElMessage.success('家庭数据已刷新');
};

const autoDetectRelations = async () => {
  try {
    ElMessage.info('正在智能识别家庭关系...');

    // 模拟智能识别
    await new Promise(resolve => setTimeout(resolve, 2000));

    recommendedRelations.value = [
      {
        id: 11,
        name: '张三叔',
        avatar: '',
        reason: '同户籍，年龄相符，可能是叔叔',
        suggestedRelation: 'uncle',
        confidence: 0.85,
      },
      {
        id: 12,
        name: '李阿姨',
        avatar: '',
        reason: '同村，经常来往，可能是姨妈',
        suggestedRelation: 'aunt',
        confidence: 0.7,
      },
    ];

    ElMessage.success(`智能识别完成，发现 ${recommendedRelations.value.length} 个可能的关系`);
  } catch (error) {
    ElMessage.error('智能识别失败');
  }
};

const exportFamilyTree = () => {
  ElMessage.info('导出功能开发中...');
};

const saveAllChanges = async () => {
  try {
    saving.value = true;

    // 模拟保存所有更改
    await new Promise(resolve => setTimeout(resolve, 1000));

    ElMessage.success('所有更改已保存');
    emit('refresh');
  } catch (error) {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};

const handleClose = () => {
  dialogVisible.value = false;
};

// 监听器
watch(
  () => props.resident,
  newResident => {
    if (newResident && Object.keys(newResident).length > 0) {
      loadFamilyData();
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (props.resident && Object.keys(props.resident).length > 0) {
    loadFamilyData();
  }
});
</script>

<style lang="scss" scoped>
.family-relationship-manager {
  .current-resident-info {
    margin-bottom: 20px;

    .resident-card {
      .resident-header {
        display: flex;
        align-items: center;
        gap: 16px;

        .resident-info {
          h3 {
            margin: 0 0 8px 0;
            color: #303133;
          }

          p {
            margin: 0;
            color: #606266;
            display: flex;
            align-items: center;
            gap: 12px;

            .info-item {
              font-size: 14px;
            }
          }
        }
      }
    }
  }

  .family-tree-container {
    min-height: 400px;

    .family-tree {
      .generation-level {
        margin-bottom: 30px;
        text-align: center;

        .generation-title {
          font-size: 16px;
          font-weight: bold;
          color: #409eff;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e4e7ed;
        }

        .members-row {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 20px;

          .family-member {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 12px;
            border: 2px solid #e4e7ed;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
            min-width: 80px;

            &:hover {
              border-color: #409eff;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
            }

            &.is-current {
              border-color: #f56c6c;
              background: #fef0f0;

              .current-indicator {
                position: absolute;
                top: -8px;
                right: -8px;
                color: #f56c6c;
                background: white;
                border-radius: 50%;
                padding: 2px;
              }
            }

            .member-info {
              margin-top: 8px;
              text-align: center;

              .member-name {
                font-size: 14px;
                font-weight: bold;
                color: #303133;
                margin-bottom: 4px;
              }

              .member-relation {
                font-size: 12px;
                color: #909399;
              }
            }

            // 不同辈分的样式
            &.grandparent {
              border-color: #e6a23c;

              &:hover {
                border-color: #e6a23c;
                box-shadow: 0 4px 12px rgba(230, 162, 60, 0.2);
              }
            }

            &.parent {
              border-color: #67c23a;

              &:hover {
                border-color: #67c23a;
                box-shadow: 0 4px 12px rgba(103, 194, 58, 0.2);
              }
            }

            &.current-gen {
              border-color: #409eff;

              &:hover {
                border-color: #409eff;
                box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
              }
            }

            &.child {
              border-color: #f56c6c;

              &:hover {
                border-color: #f56c6c;
                box-shadow: 0 4px 12px rgba(245, 108, 108, 0.2);
              }
            }

            &.grandchild {
              border-color: #909399;

              &:hover {
                border-color: #909399;
                box-shadow: 0 4px 12px rgba(144, 147, 153, 0.2);
              }
            }
          }
        }
      }
    }

    .empty-family-tree {
      text-align: center;
      padding: 40px;
    }
  }

  .selected-member-info {
    margin-bottom: 16px;

    .selected-member {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .relations-list {
    margin-bottom: 20px;
  }

  .relation-recommendations {
    .recommendation-list {
      .recommendation-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        border: 1px solid #e4e7ed;
        border-radius: 6px;
        margin-bottom: 8px;

        .rec-info {
          display: flex;
          align-items: center;
          gap: 12px;

          .rec-details {
            .rec-name {
              font-size: 14px;
              font-weight: bold;
              color: #303133;
            }

            .rec-reason {
              font-size: 12px;
              color: #909399;
            }
          }
        }

        .rec-actions {
          display: flex;
          gap: 8px;
        }
      }
    }
  }

  .member-option {
    display: flex;
    align-items: center;
    gap: 8px;

    .member-info {
      margin-left: auto;
      font-size: 12px;
      color: #909399;
    }
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

// 响应式设计
@media (max-width: 768px) {
  .family-relationship-manager {
    .family-tree {
      .generation-level {
        .members-row {
          justify-content: center;
          gap: 12px;

          .family-member {
            min-width: 70px;
            padding: 8px;
          }
        }
      }
    }
  }
}
</style>
