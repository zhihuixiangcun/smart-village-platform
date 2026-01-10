<template>
  <el-dialog
    v-model="dialogVisible"
    title="家族关系图谱"
    width="1200px"
    :close-on-click-modal="false"
    fullscreen
  >
    <!-- 控制面板 -->
    <div class="control-panel">
      <div class="panel-left">
        <el-select
          v-model="selectedFamily"
          placeholder="选择家族"
          style="width: 200px"
          @change="loadFamilyTree"
        >
          <el-option
            v-for="family in families"
            :key="family.id"
            :label="family.name"
            :value="family.id"
          />
        </el-select>

        <el-input
          v-model="searchKeyword"
          placeholder="搜索家庭成员"
          prefix-icon="Search"
          style="width: 200px; margin-left: 12px"
          clearable
        />
      </div>

      <div class="panel-right">
        <el-button-group>
          <el-button @click="zoomIn" icon="ZoomIn">放大</el-button>
          <el-button @click="zoomOut" icon="ZoomOut">缩小</el-button>
          <el-button @click="resetView" icon="Refresh">重置</el-button>
        </el-button-group>

        <el-button type="primary" @click="showRelationshipDialog" icon="Plus"> 添加关系 </el-button>

        <el-button type="success" @click="exportFamilyTree" icon="Download"> 导出图谱 </el-button>
      </div>
    </div>

    <!-- 家族树容器 -->
    <div class="family-tree-container" ref="treeContainer">
      <div
        class="family-tree"
        ref="familyTree"
        :style="{
          transform: `scale(${zoomLevel}) translate(${translateX}px, ${translateY}px)`,
          transformOrigin: 'center center',
        }"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="endDrag"
        @wheel="onWheel"
      >
        <!-- 家族根节点 -->
        <div v-if="familyTreeData && familyTreeData.root" class="tree-level root-level">
          <div class="tree-node root-node" @click="selectMember(familyTreeData.root)">
            <div
              class="node-content"
              :class="{ selected: selectedMember?.id === familyTreeData.root.id }"
            >
              <el-avatar
                :size="60"
                :src="familyTreeData.root.avatar"
                :icon="UserFilled"
                class="member-avatar"
              />
              <div class="member-info">
                <h4>{{ familyTreeData.root.name }}</h4>
                <p>{{ familyTreeData.root.relationship }}</p>
                <span class="member-age">{{ familyTreeData.root.age }}岁</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 连接线 -->
        <svg class="connection-lines" v-if="familyTreeData">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#409eff" />
            </marker>
          </defs>

          <!-- 这里会动态生成连接线 -->
          <path
            v-for="connection in connections"
            :key="`${connection.from}-${connection.to}`"
            :d="connection.path"
            stroke="#409eff"
            stroke-width="2"
            fill="none"
            marker-end="url(#arrowhead)"
          />
        </svg>

        <!-- 第二代（子女层） -->
        <div v-if="familyTreeData && familyTreeData.children" class="tree-level children-level">
          <div
            v-for="child in familyTreeData.children"
            :key="child.id"
            class="tree-node child-node"
            @click="selectMember(child)"
          >
            <div class="node-content" :class="{ selected: selectedMember?.id === child.id }">
              <el-avatar :size="50" :src="child.avatar" :icon="UserFilled" class="member-avatar" />
              <div class="member-info">
                <h5>{{ child.name }}</h5>
                <p>{{ child.relationship }}</p>
                <span class="member-age">{{ child.age }}岁</span>
              </div>
            </div>

            <!-- 配偶 -->
            <div v-if="child.spouse" class="spouse-node" @click="selectMember(child.spouse)">
              <div
                class="node-content spouse-content"
                :class="{ selected: selectedMember?.id === child.spouse.id }"
              >
                <el-avatar
                  :size="45"
                  :src="child.spouse.avatar"
                  :icon="UserFilled"
                  class="member-avatar"
                />
                <div class="member-info">
                  <h5>{{ child.spouse.name }}</h5>
                  <p>配偶</p>
                  <span class="member-age">{{ child.spouse.age }}岁</span>
                </div>
              </div>
            </div>

            <!-- 第三代（孙辈） -->
            <div v-if="child.children && child.children.length" class="grandchildren-container">
              <div
                v-for="grandchild in child.children"
                :key="grandchild.id"
                class="tree-node grandchild-node"
                @click="selectMember(grandchild)"
              >
                <div
                  class="node-content"
                  :class="{ selected: selectedMember?.id === grandchild.id }"
                >
                  <el-avatar
                    :size="40"
                    :src="grandchild.avatar"
                    :icon="UserFilled"
                    class="member-avatar"
                  />
                  <div class="member-info">
                    <h6>{{ grandchild.name }}</h6>
                    <p>{{ grandchild.relationship }}</p>
                    <span class="member-age">{{ grandchild.age }}岁</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 无数据状态 -->
      <div v-if="!familyTreeData" class="no-tree-data">
        <el-empty description="暂无家族数据">
          <el-button type="primary" @click="showRelationshipDialog"> 开始建立家族关系 </el-button>
        </el-empty>
      </div>
    </div>

    <!-- 成员详情面板 -->
    <div v-if="selectedMember" class="member-detail-panel">
      <div class="panel-header">
        <h4>{{ selectedMember.name }}</h4>
        <el-button type="text" @click="selectedMember = null" icon="Close" />
      </div>

      <div class="panel-content">
        <el-descriptions :column="1" size="small">
          <el-descriptions-item label="关系">
            {{ selectedMember.relationship }}
          </el-descriptions-item>
          <el-descriptions-item label="年龄"> {{ selectedMember.age }} 岁 </el-descriptions-item>
          <el-descriptions-item label="性别">
            <el-tag :type="selectedMember.gender === 'male' ? 'primary' : 'danger'" size="small">
              {{ selectedMember.gender === 'male' ? '男' : '女' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="户码" v-if="selectedMember.householdCode">
            {{ selectedMember.householdCode }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="panel-actions">
          <el-button size="small" @click="viewMemberDetail(selectedMember)" icon="View">
            查看详情
          </el-button>
          <el-button
            size="small"
            type="primary"
            @click="editMemberRelation(selectedMember)"
            icon="Edit"
          >
            编辑关系
          </el-button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="saveFamilyTree" icon="Check"> 保存图谱 </el-button>
      </div>
    </template>

    <!-- 关系编辑对话框 -->
    <relationship-edit-dialog
      v-model="relationshipDialogVisible"
      :families="families"
      :members="allMembers"
      @confirm="handleRelationshipSave"
    />
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  UserFilled,
  Search,
  ZoomIn,
  ZoomOut,
  Refresh,
  Plus,
  Download,
  Close,
  View,
  Edit,
  Check,
} from '@element-plus/icons-vue';
import { residentAPI } from '@/api/resident';
import RelationshipEditDialog from './RelationshipEditDialog.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

// 响应式数据
const loading = ref(false);
const selectedFamily = ref('');
const searchKeyword = ref('');
const familyTreeData = ref(null);
const selectedMember = ref(null);
const relationshipDialogVisible = ref(false);

// 视图控制
const zoomLevel = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });

// DOM引用
const treeContainer = ref();
const familyTree = ref();

// 家族数据
const families = ref([]);
const allMembers = ref([]);
const connections = ref([]);

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

// 方法
const loadFamilies = async () => {
  try {
    const response = await residentAPI.getFamilyList();
    if (response.success) {
      families.value = response.data;
    }
  } catch (error) {
    console.error('获取家族列表失败:', error);
  }
};

const loadFamilyTree = async () => {
  if (!selectedFamily.value) return;

  loading.value = true;
  try {
    const response = await residentAPI.getFamilyTree(selectedFamily.value);
    if (response.success) {
      familyTreeData.value = response.data;
      allMembers.value = flattenFamilyMembers(response.data);
      generateConnections();
    }
  } catch (error) {
    console.error('获取家族树失败:', error);
    ElMessage.error('获取家族树失败');
  } finally {
    loading.value = false;
  }
};

const flattenFamilyMembers = treeData => {
  const members = [];

  if (treeData.root) {
    members.push(treeData.root);
  }

  if (treeData.children) {
    treeData.children.forEach(child => {
      members.push(child);
      if (child.spouse) {
        members.push(child.spouse);
      }
      if (child.children) {
        members.push(...child.children);
      }
    });
  }

  return members;
};

const generateConnections = () => {
  connections.value = [];

  if (!familyTreeData.value) return;

  // 生成父子连接线
  if (familyTreeData.value.children) {
    familyTreeData.value.children.forEach(child => {
      connections.value.push({
        from: familyTreeData.value.root.id,
        to: child.id,
        path: generateConnectionPath(familyTreeData.value.root.id, child.id, 'parent-child'),
      });

      // 生成配偶连接线
      if (child.spouse) {
        connections.value.push({
          from: child.id,
          to: child.spouse.id,
          path: generateConnectionPath(child.id, child.spouse.id, 'spouse'),
        });
      }

      // 生成孙辈连接线
      if (child.children) {
        child.children.forEach(grandchild => {
          connections.value.push({
            from: child.id,
            to: grandchild.id,
            path: generateConnectionPath(child.id, grandchild.id, 'parent-child'),
          });
        });
      }
    });
  }
};

const generateConnectionPath = (fromId, toId, type) => {
  // 这里简化处理，实际项目中需要根据节点位置计算路径
  return `M 100 100 Q 150 150 200 200`;
};

const selectMember = member => {
  selectedMember.value = member;
};

const viewMemberDetail = member => {
  // 触发查看成员详情
  emit('view-member', member);
};

const editMemberRelation = member => {
  selectedMember.value = member;
  relationshipDialogVisible.value = true;
};

const showRelationshipDialog = () => {
  selectedMember.value = null;
  relationshipDialogVisible.value = true;
};

const handleRelationshipSave = () => {
  relationshipDialogVisible.value = false;
  loadFamilyTree();
};

// 视图控制方法
const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 0.2, 3);
};

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 0.2, 0.3);
};

const resetView = () => {
  zoomLevel.value = 1;
  translateX.value = 0;
  translateY.value = 0;
};

const startDrag = event => {
  isDragging.value = true;
  dragStart.value = {
    x: event.clientX - translateX.value,
    y: event.clientY - translateY.value,
  };
};

const onDrag = event => {
  if (!isDragging.value) return;

  translateX.value = event.clientX - dragStart.value.x;
  translateY.value = event.clientY - dragStart.value.y;
};

const endDrag = () => {
  isDragging.value = false;
};

const onWheel = event => {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  zoomLevel.value = Math.max(0.3, Math.min(3, zoomLevel.value + delta));
};

const saveFamilyTree = async () => {
  try {
    const response = await residentAPI.saveFamilyTree(selectedFamily.value, familyTreeData.value);
    if (response.success) {
      ElMessage.success('家族图谱保存成功');
    }
  } catch (error) {
    ElMessage.error('保存失败');
  }
};

const exportFamilyTree = () => {
  ElMessage.info('导出功能开发中...');
};

// 监听搜索关键词
watch(searchKeyword, keyword => {
  if (!keyword) return;

  const member = allMembers.value.find(
    m => m.name.includes(keyword) || m.relationship.includes(keyword)
  );

  if (member) {
    selectMember(member);
  }
});

// 生命周期
onMounted(() => {
  loadFamilies();
});
</script>

<style lang="scss" scoped>
.control-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;

  .panel-left {
    display: flex;
    align-items: center;
  }

  .panel-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.family-tree-container {
  position: relative;
  height: 70vh;
  overflow: hidden;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  .family-tree {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.3s ease;

    .connection-lines {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    }

    .tree-level {
      position: relative;
      z-index: 2;

      &.root-level {
        display: flex;
        justify-content: center;
        padding: 40px 0;
      }

      &.children-level {
        display: flex;
        justify-content: center;
        gap: 80px;
        padding: 40px 20px;
        flex-wrap: wrap;
      }
    }

    .tree-node {
      position: relative;
      cursor: pointer;

      .node-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 20px;
        background: white;
        border: 2px solid #e4e7ed;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;

        &:hover {
          border-color: #409eff;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(64, 158, 255, 0.2);
        }

        &.selected {
          border-color: #409eff;
          background: #e1f3fe;
        }

        .member-avatar {
          border: 2px solid #f0f0f0;
          transition: all 0.3s ease;
        }

        .member-info {
          text-align: center;

          h4,
          h5,
          h6 {
            margin: 0 0 4px 0;
            color: #303133;
            font-weight: 600;
          }

          p {
            margin: 0 0 4px 0;
            color: #606266;
            font-size: 12px;
          }

          .member-age {
            font-size: 11px;
            color: #909399;
          }
        }

        &.spouse-content {
          background: #fff2e8;
          border-color: #e6a23c;
        }
      }

      &.root-node .node-content {
        background: #e1f3fe;
        border-color: #409eff;
      }

      &.child-node {
        .spouse-node {
          position: absolute;
          top: 0;
          right: -160px;

          .node-content {
            background: #fff2e8;
            border-color: #e6a23c;
          }
        }

        .grandchildren-container {
          display: flex;
          gap: 20px;
          justify-content: center;
          margin-top: 60px;

          .grandchild-node .node-content {
            background: #f0f9ff;
            border-color: #67c23a;
          }
        }
      }
    }
  }

  .no-tree-data {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }
}

.member-detail-panel {
  position: absolute;
  top: 80px;
  right: 20px;
  width: 280px;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 10;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e4e7ed;
    background: #f8f9fa;

    h4 {
      margin: 0;
      color: #303133;
    }
  }

  .panel-content {
    padding: 20px;

    .panel-actions {
      margin-top: 16px;
      display: flex;
      gap: 8px;
    }
  }
}

.dialog-footer {
  text-align: right;
}

// 响应式设计
@media (max-width: 768px) {
  .control-panel {
    flex-direction: column;
    gap: 16px;

    .panel-left,
    .panel-right {
      width: 100%;
      justify-content: center;
    }
  }

  .family-tree-container {
    height: 60vh;

    .tree-level.children-level {
      flex-direction: column;
      align-items: center;
      gap: 40px;
    }
  }

  .member-detail-panel {
    position: static;
    width: 100%;
    margin-top: 20px;
  }
}
</style>
