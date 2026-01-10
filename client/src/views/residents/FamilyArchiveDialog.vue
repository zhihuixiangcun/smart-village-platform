<template>
  <el-dialog
    v-model="dialogVisible"
    title="家族档案管理"
    width="1200px"
    :close-on-click-modal="false"
    fullscreen
  >
    <div class="family-archive-management">
      <!-- 头部信息 -->
      <div class="archive-header">
        <div class="header-content">
          <div class="family-info">
            <div class="family-avatar">
              <el-avatar :size="60" :src="familyData.avatar" icon="UserFilled" />
            </div>
            <div class="family-details">
              <h2>{{ familyData.surname }}氏家族</h2>
              <p class="family-stats">
                <span>共 {{ familyData.memberCount }} 人</span>
                <span>{{ familyData.generationCount }} 代</span>
                <span>建档时间：{{ formatDate(familyData.createTime) }}</span>
              </p>
            </div>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="showAddMemberDialog" icon="Plus">
              添加成员
            </el-button>
            <el-button type="success" @click="generateFamilyTree" icon="Share">
              生成族谱
            </el-button>
            <el-button @click="exportArchive" icon="Download"> 导出档案 </el-button>
          </div>
        </div>
      </div>

      <!-- 功能选项卡 -->
      <el-tabs v-model="activeTab" class="archive-tabs">
        <!-- 家族成员 -->
        <el-tab-pane label="家族成员" name="members">
          <div class="members-section">
            <!-- 搜索筛选 -->
            <div class="search-filters">
              <el-form :model="searchForm" :inline="true">
                <el-form-item label="搜索">
                  <el-input
                    v-model="searchForm.keyword"
                    placeholder="姓名、身份证或电话"
                    prefix-icon="Search"
                    clearable
                    style="width: 200px"
                  />
                </el-form-item>
                <el-form-item label="世代">
                  <el-select v-model="searchForm.generation" placeholder="请选择" clearable>
                    <el-option
                      v-for="gen in generations"
                      :key="gen.value"
                      :label="gen.label"
                      :value="gen.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="关系">
                  <el-select v-model="searchForm.relationship" placeholder="请选择" clearable>
                    <el-option label="直系血亲" value="direct" />
                    <el-option label="旁系血亲" value="collateral" />
                    <el-option label="姻亲" value="affinity" />
                  </el-select>
                </el-form-item>
                <el-form-item label="在世状态">
                  <el-select v-model="searchForm.livingStatus" placeholder="请选择" clearable>
                    <el-option label="在世" value="alive" />
                    <el-option label="已故" value="deceased" />
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="searchMembers" icon="Search"> 搜索 </el-button>
                  <el-button @click="resetSearch" icon="Refresh"> 重置 </el-button>
                </el-form-item>
              </el-form>
            </div>

            <!-- 成员列表 -->
            <el-table
              :data="filteredMembers"
              border
              stripe
              v-loading="loading"
              @selection-change="handleSelectionChange"
              height="400"
            >
              <el-table-column type="selection" width="50" />

              <el-table-column label="头像" width="80">
                <template #default="scope">
                  <el-avatar :size="40" :src="scope.row.avatar" icon="UserFilled" />
                </template>
              </el-table-column>

              <el-table-column prop="name" label="姓名" width="100" sortable />

              <el-table-column prop="generation" label="世代" width="80">
                <template #default="scope">
                  <el-tag size="small" :type="getGenerationTagType(scope.row.generation)">
                    第{{ scope.row.generation }}代
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="relationship" label="家族关系" width="120" />

              <el-table-column prop="gender" label="性别" width="60">
                <template #default="scope">
                  <el-tag :type="scope.row.gender === 'male' ? 'primary' : 'danger'" size="small">
                    {{ scope.row.gender === 'male' ? '男' : '女' }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="birthDate" label="出生日期" width="120">
                <template #default="scope">
                  {{ formatDate(scope.row.birthDate) }}
                </template>
              </el-table-column>

              <el-table-column prop="livingStatus" label="状态" width="80">
                <template #default="scope">
                  <el-tag
                    :type="scope.row.livingStatus === 'alive' ? 'success' : 'info'"
                    size="small"
                  >
                    {{ scope.row.livingStatus === 'alive' ? '在世' : '已故' }}
                  </el-tag>
                </template>
              </el-table-column>

              <el-table-column prop="occupation" label="职业" />

              <el-table-column prop="education" label="学历" width="100" />

              <el-table-column
                prop="achievements"
                label="成就荣誉"
                min-width="150"
                show-overflow-tooltip
              />

              <el-table-column label="操作" width="200" fixed="right">
                <template #default="scope">
                  <el-button type="primary" size="small" @click="viewMember(scope.row)" icon="View">
                    详情
                  </el-button>
                  <el-button type="success" size="small" @click="editMember(scope.row)" icon="Edit">
                    编辑
                  </el-button>
                  <el-dropdown @command="cmd => handleMemberAction(cmd, scope.row)">
                    <el-button size="small" icon="MoreFilled" />
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="tree" icon="Share">查看族谱</el-dropdown-item>
                        <el-dropdown-item command="photo" icon="Picture">照片相册</el-dropdown-item>
                        <el-dropdown-item command="story" icon="Document"
                          >生平故事</el-dropdown-item
                        >
                        <el-dropdown-item
                          command="memorial"
                          icon="Star"
                          v-if="scope.row.livingStatus === 'deceased'"
                        >
                          纪念馆
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- 族谱图谱 -->
        <el-tab-pane label="族谱图谱" name="tree">
          <div class="family-tree-section">
            <div class="tree-controls">
              <el-form :inline="true">
                <el-form-item label="显示方式">
                  <el-radio-group v-model="treeViewMode">
                    <el-radio-button label="vertical">纵向</el-radio-button>
                    <el-radio-button label="horizontal">横向</el-radio-button>
                    <el-radio-button label="circular">环形</el-radio-button>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="显示世代">
                  <el-select v-model="displayGenerations" multiple placeholder="选择要显示的世代">
                    <el-option
                      v-for="gen in generations"
                      :key="gen.value"
                      :label="gen.label"
                      :value="gen.value"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button @click="refreshTree" icon="Refresh">刷新图谱</el-button>
                  <el-button type="success" @click="exportTree" icon="Download">导出图谱</el-button>
                </el-form-item>
              </el-form>
            </div>

            <!-- 族谱画布 -->
            <div class="tree-canvas" ref="treeCanvasRef">
              <div v-if="treeData.length === 0" class="no-tree-data">
                <el-empty description="暂无族谱数据" />
                <el-button type="primary" @click="generateInitialTree"> 生成初始族谱 </el-button>
              </div>

              <!-- 族谱节点 -->
              <div v-else class="family-tree-visualization" :class="treeViewMode">
                <div
                  v-for="member in treeData"
                  :key="member.id"
                  class="tree-member-node"
                  :class="{
                    deceased: member.livingStatus === 'deceased',
                    selected: selectedMemberIds.includes(member.id),
                  }"
                  :style="getNodePosition(member)"
                  @click="selectTreeNode(member)"
                >
                  <div class="node-content">
                    <el-avatar :size="50" :src="member.avatar" icon="UserFilled" />
                    <div class="node-info">
                      <div class="name">{{ member.name }}</div>
                      <div class="generation">第{{ member.generation }}代</div>
                      <div class="relationship">{{ member.relationship }}</div>
                      <div class="dates">
                        {{ formatYear(member.birthDate) }}
                        <span v-if="member.livingStatus === 'deceased'">
                          - {{ formatYear(member.deathDate) }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- 连接线 -->
                  <div v-if="member.children && member.children.length" class="connection-lines">
                    <div
                      v-for="child in member.children"
                      :key="child.id"
                      class="child-connection"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 历史记录 -->
        <el-tab-pane label="历史记录" name="history">
          <div class="history-section">
            <!-- 时间轴 -->
            <el-timeline>
              <el-timeline-item
                v-for="event in familyHistory"
                :key="event.id"
                :timestamp="formatDate(event.date)"
                :type="getEventType(event.type)"
                :icon="getEventIcon(event.type)"
              >
                <el-card shadow="never" class="history-card">
                  <h4>{{ event.title }}</h4>
                  <p>{{ event.description }}</p>
                  <div v-if="event.participants && event.participants.length" class="participants">
                    <span>相关人员：</span>
                    <el-tag
                      v-for="person in event.participants"
                      :key="person.id"
                      size="small"
                      style="margin-right: 5px"
                    >
                      {{ person.name }}
                    </el-tag>
                  </div>
                  <div v-if="event.photos && event.photos.length" class="event-photos">
                    <el-image
                      v-for="photo in event.photos"
                      :key="photo.id"
                      :src="photo.url"
                      :preview-src-list="event.photos.map(p => p.url)"
                      class="event-photo"
                      fit="cover"
                    />
                  </div>
                </el-card>
              </el-timeline-item>
            </el-timeline>

            <div class="add-history">
              <el-button type="primary" @click="showAddHistoryDialog" icon="Plus">
                添加历史事件
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- 统计分析 -->
        <el-tab-pane label="统计分析" name="statistics">
          <div class="statistics-section">
            <el-row :gutter="20">
              <!-- 基础统计 -->
              <el-col :span="12">
                <el-card class="stat-card">
                  <template #header>
                    <span>基础统计</span>
                  </template>
                  <div class="stat-items">
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.totalMembers }}</div>
                      <div class="stat-label">家族总人数</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.aliveMembers }}</div>
                      <div class="stat-label">在世人数</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.maleCount }}</div>
                      <div class="stat-label">男性</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-value">{{ statistics.femaleCount }}</div>
                      <div class="stat-label">女性</div>
                    </div>
                  </div>
                </el-card>
              </el-col>

              <!-- 年龄分布 -->
              <el-col :span="12">
                <el-card class="stat-card">
                  <template #header>
                    <span>年龄分布</span>
                  </template>
                  <div ref="ageChartRef" style="height: 200px"></div>
                </el-card>
              </el-col>
            </el-row>

            <el-row :gutter="20" style="margin-top: 20px">
              <!-- 世代分布 -->
              <el-col :span="12">
                <el-card class="stat-card">
                  <template #header>
                    <span>世代分布</span>
                  </template>
                  <div ref="generationChartRef" style="height: 200px"></div>
                </el-card>
              </el-col>

              <!-- 职业分布 -->
              <el-col :span="12">
                <el-card class="stat-card">
                  <template #header>
                    <span>职业分布</span>
                  </template>
                  <div ref="occupationChartRef" style="height: 200px"></div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

        <!-- 纪念馆 -->
        <el-tab-pane label="纪念馆" name="memorial">
          <div class="memorial-section">
            <div class="memorial-grid">
              <div
                v-for="deceased in deceasedMembers"
                :key="deceased.id"
                class="memorial-card"
                @click="openMemorial(deceased)"
              >
                <div class="memorial-photo">
                  <el-image :src="deceased.avatar" fit="cover" />
                  <div class="memorial-overlay">
                    <el-icon><Star /></el-icon>
                  </div>
                </div>
                <div class="memorial-info">
                  <h4>{{ deceased.name }}</h4>
                  <p>{{ formatYear(deceased.birthDate) }} - {{ formatYear(deceased.deathDate) }}</p>
                  <p class="memorial-title">{{ deceased.memorialTitle || '永远怀念' }}</p>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="saveArchive" :loading="saving"> 保存档案 </el-button>
      </div>
    </template>

    <!-- 添加/编辑成员对话框 -->
    <enhanced-member-form-dialog
      v-model="memberFormVisible"
      :member="currentMember"
      :mode="memberFormMode"
      @confirm="handleMemberSave"
    />

    <!-- 成员详情对话框 -->
    <member-detail-dialog v-model="memberDetailVisible" :member="currentMember" />

    <!-- 历史事件对话框 -->
    <history-event-dialog v-model="historyEventVisible" @confirm="handleHistoryEventSave" />

    <!-- 纪念馆对话框 -->
    <memorial-dialog v-model="memorialVisible" :member="currentMember" />
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  UserFilled,
  Plus,
  Share,
  Download,
  Search,
  Refresh,
  View,
  Edit,
  MoreFilled,
  Picture,
  Document,
  Star,
} from '@element-plus/icons-vue';

// 导入组件
import EnhancedMemberFormDialog from './EnhancedMemberFormDialog.vue';
import MemberDetailDialog from './MemberDetailDialog.vue';
import HistoryEventDialog from './HistoryEventDialog.vue';
import MemorialDialog from './MemorialDialog.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  resident: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'refresh']);

// 响应式数据
const loading = ref(false);
const saving = ref(false);
const activeTab = ref('members');
const treeViewMode = ref('vertical');
const displayGenerations = ref([]);
const selectedMemberIds = ref([]);

// 对话框状态
const memberFormVisible = ref(false);
const memberDetailVisible = ref(false);
const historyEventVisible = ref(false);
const memorialVisible = ref(false);
const memberFormMode = ref('add');
const currentMember = ref(null);

// 画布引用
const treeCanvasRef = ref();
const ageChartRef = ref();
const generationChartRef = ref();
const occupationChartRef = ref();

// 搜索表单
const searchForm = reactive({
  keyword: '',
  generation: '',
  relationship: '',
  livingStatus: '',
});

// 家族数据
const familyData = reactive({
  surname: '张',
  avatar: '',
  memberCount: 0,
  generationCount: 0,
  createTime: new Date(),
});

// 成员列表
const familyMembers = ref([]);
const treeData = ref([]);
const familyHistory = ref([]);

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

// 计算属性
const generations = computed(() => {
  const gens = [...new Set(familyMembers.value.map(m => m.generation))].sort();
  return gens.map(gen => ({ value: gen, label: `第${gen}代` }));
});

const filteredMembers = computed(() => {
  let result = familyMembers.value;

  if (searchForm.keyword) {
    result = result.filter(
      member =>
        member.name.includes(searchForm.keyword) ||
        member.idCard?.includes(searchForm.keyword) ||
        member.phone?.includes(searchForm.keyword)
    );
  }

  if (searchForm.generation) {
    result = result.filter(member => member.generation === searchForm.generation);
  }

  if (searchForm.relationship) {
    result = result.filter(member => member.relationshipType === searchForm.relationship);
  }

  if (searchForm.livingStatus) {
    result = result.filter(member => member.livingStatus === searchForm.livingStatus);
  }

  return result;
});

const deceasedMembers = computed(() => {
  return familyMembers.value.filter(member => member.livingStatus === 'deceased');
});

const statistics = computed(() => {
  const total = familyMembers.value.length;
  const alive = familyMembers.value.filter(m => m.livingStatus === 'alive').length;
  const male = familyMembers.value.filter(m => m.gender === 'male').length;
  const female = familyMembers.value.filter(m => m.gender === 'female').length;

  return {
    totalMembers: total,
    aliveMembers: alive,
    maleCount: male,
    femaleCount: female,
  };
});

// 方法
const loadFamilyData = async () => {
  if (!props.resident?.id) return;

  loading.value = true;
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 模拟数据
    familyMembers.value = [
      {
        id: 1,
        name: '张老爷子',
        generation: 1,
        relationship: '祖父',
        relationshipType: 'direct',
        gender: 'male',
        birthDate: '1920-03-15',
        deathDate: '2010-08-20',
        livingStatus: 'deceased',
        occupation: '农民',
        education: '小学',
        achievements: '村支书20年',
        avatar: '',
        memorialTitle: '德高望重的老支书',
      },
      {
        id: 2,
        name: '张大伯',
        generation: 2,
        relationship: '父亲',
        relationshipType: 'direct',
        gender: 'male',
        birthDate: '1950-07-10',
        livingStatus: 'alive',
        occupation: '教师',
        education: '大学',
        achievements: '优秀教师',
        avatar: '',
      },
      {
        id: 3,
        name: props.resident.name,
        generation: 3,
        relationship: '本人',
        relationshipType: 'direct',
        gender: props.resident.gender,
        birthDate: props.resident.birthDate,
        livingStatus: 'alive',
        occupation: props.resident.occupation,
        education: props.resident.education,
        avatar: props.resident.avatar,
      },
    ];

    // 更新家族基本信息
    familyData.memberCount = familyMembers.value.length;
    familyData.generationCount = Math.max(...familyMembers.value.map(m => m.generation));

    // 生成族谱数据
    generateTreeData();

    // 加载历史事件
    loadFamilyHistory();
  } catch (error) {
    console.error('加载家族数据失败:', error);
    ElMessage.error('加载家族数据失败');
  } finally {
    loading.value = false;
  }
};

const generateTreeData = () => {
  // 根据家族成员生成树形数据结构
  treeData.value = familyMembers.value.map(member => ({
    ...member,
    x: 0,
    y: 0,
    children: familyMembers.value.filter(
      m => m.generation === member.generation + 1 && isChildOf(m, member)
    ),
  }));

  // 计算节点位置
  calculateNodePositions();
};

const calculateNodePositions = () => {
  // 简化的位置计算算法
  treeData.value.forEach((member, index) => {
    member.x = (member.generation - 1) * 200;
    member.y = index * 100;
  });
};

const loadFamilyHistory = () => {
  // 模拟历史事件数据
  familyHistory.value = [
    {
      id: 1,
      title: '张老爷子出生',
      description: '家族第一代创始人出生于贫苦农家',
      date: '1920-03-15',
      type: 'birth',
      participants: [{ id: 1, name: '张老爷子' }],
    },
    {
      id: 2,
      title: '担任村支书',
      description: '张老爷子当选为村支书，开始为村民服务',
      date: '1960-01-01',
      type: 'achievement',
      participants: [{ id: 1, name: '张老爷子' }],
    },
  ];
};

const isChildOf = (child, parent) => {
  // 简化的父子关系判断
  return child.generation === parent.generation + 1;
};

const showAddMemberDialog = () => {
  currentMember.value = null;
  memberFormMode.value = 'add';
  memberFormVisible.value = true;
};

const editMember = member => {
  currentMember.value = member;
  memberFormMode.value = 'edit';
  memberFormVisible.value = true;
};

const viewMember = member => {
  currentMember.value = member;
  memberDetailVisible.value = true;
};

const handleMemberAction = (command, member) => {
  currentMember.value = member;

  switch (command) {
    case 'tree':
      activeTab.value = 'tree';
      selectTreeNode(member);
      break;
    case 'photo':
      ElMessage.info('照片相册功能开发中...');
      break;
    case 'story':
      ElMessage.info('生平故事功能开发中...');
      break;
    case 'memorial':
      memorialVisible.value = true;
      break;
  }
};

const handleSelectionChange = selection => {
  selectedMemberIds.value = selection.map(s => s.id);
};

const searchMembers = () => {
  // 搜索逻辑已在计算属性中实现
};

const resetSearch = () => {
  Object.assign(searchForm, {
    keyword: '',
    generation: '',
    relationship: '',
    livingStatus: '',
  });
};

const generateFamilyTree = () => {
  generateTreeData();
  activeTab.value = 'tree';
  ElMessage.success('族谱已生成');
};

const refreshTree = () => {
  generateTreeData();
  ElMessage.success('族谱已刷新');
};

const exportTree = () => {
  ElMessage.info('导出族谱功能开发中...');
};

const generateInitialTree = () => {
  generateTreeData();
  ElMessage.success('初始族谱已生成');
};

const selectTreeNode = member => {
  const index = selectedMemberIds.value.indexOf(member.id);
  if (index > -1) {
    selectedMemberIds.value.splice(index, 1);
  } else {
    selectedMemberIds.value.push(member.id);
  }
};

const getNodePosition = member => {
  return {
    left: member.x + 'px',
    top: member.y + 'px',
  };
};

const showAddHistoryDialog = () => {
  historyEventVisible.value = true;
};

const openMemorial = member => {
  currentMember.value = member;
  memorialVisible.value = true;
};

const exportArchive = () => {
  ElMessage.info('导出家族档案功能开发中...');
};

const saveArchive = async () => {
  saving.value = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    ElMessage.success('家族档案保存成功');
  } catch (error) {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};

const handleMemberSave = () => {
  memberFormVisible.value = false;
  loadFamilyData();
};

const handleHistoryEventSave = () => {
  historyEventVisible.value = false;
  loadFamilyHistory();
};

// 工具函数
const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleDateString();
};

const formatYear = date => {
  if (!date) return '';
  return new Date(date).getFullYear();
};

const getGenerationTagType = generation => {
  const types = ['', 'success', 'primary', 'warning', 'danger', 'info'];
  return types[generation] || 'info';
};

const getEventType = type => {
  const typeMap = {
    birth: 'success',
    death: 'info',
    marriage: 'warning',
    achievement: 'primary',
  };
  return typeMap[type] || 'primary';
};

const getEventIcon = type => {
  const iconMap = {
    birth: 'Plus',
    death: 'Star',
    marriage: 'Share',
    achievement: 'Trophy',
  };
  return iconMap[type] || 'Document';
};

// 监听器
watch(
  () => props.modelValue,
  newVal => {
    if (newVal && props.resident) {
      loadFamilyData();
    }
  }
);

watch(displayGenerations, () => {
  generateTreeData();
});

// 生命周期
onMounted(() => {
  if (props.modelValue && props.resident) {
    loadFamilyData();
  }
});
</script>

<style lang="scss" scoped>
.family-archive-management {
  .archive-header {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    color: white;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .family-info {
        display: flex;
        align-items: center;
        gap: 20px;

        .family-details {
          h2 {
            margin: 0 0 8px 0;
            font-size: 24px;
          }

          .family-stats {
            margin: 0;
            opacity: 0.9;

            span {
              margin-right: 20px;
            }
          }
        }
      }

      .header-actions {
        display: flex;
        gap: 12px;
      }
    }
  }

  .archive-tabs {
    .members-section {
      .search-filters {
        background: #f8f9fa;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;
      }
    }

    .family-tree-section {
      .tree-controls {
        background: #f8f9fa;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;
      }

      .tree-canvas {
        min-height: 600px;
        position: relative;
        border: 1px solid #e4e7ed;
        border-radius: 8px;
        overflow: auto;

        .no-tree-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
        }

        .family-tree-visualization {
          position: relative;
          padding: 40px;
          min-width: 1000px;
          min-height: 600px;

          .tree-member-node {
            position: absolute;
            cursor: pointer;
            transition: all 0.3s ease;

            &:hover {
              transform: scale(1.05);
              z-index: 10;
            }

            &.selected {
              transform: scale(1.1);
              z-index: 10;

              .node-content {
                box-shadow: 0 0 20px rgba(64, 158, 255, 0.5);
                border-color: #409eff;
              }
            }

            &.deceased {
              opacity: 0.7;

              .node-content {
                background: #f5f7fa;
                border-color: #909399;
              }
            }

            .node-content {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 12px;
              background: white;
              border: 2px solid #e4e7ed;
              border-radius: 8px;
              box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
              min-width: 180px;

              .node-info {
                .name {
                  font-weight: 600;
                  color: #303133;
                  margin-bottom: 4px;
                }

                .generation,
                .relationship,
                .dates {
                  font-size: 12px;
                  color: #909399;
                  line-height: 1.4;
                }
              }
            }
          }
        }
      }
    }

    .history-section {
      .history-card {
        margin-bottom: 16px;

        h4 {
          margin: 0 0 8px 0;
          color: #303133;
        }

        p {
          color: #606266;
          line-height: 1.6;
        }

        .participants {
          margin: 12px 0;
        }

        .event-photos {
          display: flex;
          gap: 8px;
          margin-top: 12px;

          .event-photo {
            width: 60px;
            height: 60px;
            border-radius: 4px;
          }
        }
      }

      .add-history {
        text-align: center;
        margin-top: 20px;
      }
    }

    .statistics-section {
      .stat-card {
        height: 280px;

        .stat-items {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          height: 200px;

          .stat-item {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;

            .stat-value {
              font-size: 32px;
              font-weight: bold;
              color: #409eff;
              margin-bottom: 8px;
            }

            .stat-label {
              color: #909399;
              font-size: 14px;
            }
          }
        }
      }
    }

    .memorial-section {
      .memorial-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 20px;

        .memorial-card {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.3s ease;

          &:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          }

          .memorial-photo {
            position: relative;
            height: 200px;

            .memorial-overlay {
              position: absolute;
              top: 8px;
              right: 8px;
              background: rgba(0, 0, 0, 0.5);
              color: white;
              padding: 4px;
              border-radius: 4px;
            }
          }

          .memorial-info {
            padding: 16px;

            h4 {
              margin: 0 0 8px 0;
              color: #303133;
            }

            p {
              margin: 4px 0;
              color: #606266;
              font-size: 14px;

              &.memorial-title {
                color: #909399;
                font-style: italic;
              }
            }
          }
        }
      }
    }
  }
}

.dialog-footer {
  text-align: right;
}

// 响应式设计
@media (max-width: 768px) {
  .family-archive-management {
    .archive-header .header-content {
      flex-direction: column;
      gap: 20px;
      text-align: center;
    }

    .family-tree-visualization {
      transform: scale(0.8);
      transform-origin: top left;
    }

    .memorial-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important;
    }
  }
}
</style>
