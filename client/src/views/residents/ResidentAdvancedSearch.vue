<template>
  <div class="advanced-search-panel">
    <el-form
      ref="searchFormRef"
      :model="searchForm"
      :inline="true"
      label-width="80px"
      class="search-form"
    >
      <!-- 基础搜索行 -->
      <div class="search-row basic-search">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="姓名、身份证号、电话号码"
            prefix-icon="Search"
            clearable
            style="width: 280px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="性别">
          <el-select v-model="searchForm.gender" placeholder="全部" clearable style="width: 120px">
            <el-option label="男" value="male" />
            <el-option label="女" value="female" />
          </el-select>
        </el-form-item>

        <el-form-item label="年龄段">
          <el-select
            v-model="searchForm.ageGroup"
            placeholder="全部"
            clearable
            style="width: 140px"
          >
            <el-option label="儿童(0-14)" value="children" />
            <el-option label="青年(15-34)" value="youth" />
            <el-option label="中年(35-59)" value="middle" />
            <el-option label="老年(60+)" value="elderly" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch" icon="Search"> 搜索 </el-button>
          <el-button @click="handleReset" icon="Refresh"> 重置 </el-button>
          <el-button
            type="text"
            @click="toggleAdvanced"
            :icon="showAdvanced ? 'ArrowUp' : 'ArrowDown'"
          >
            {{ showAdvanced ? '收起高级搜索' : '展开高级搜索' }}
          </el-button>
        </el-form-item>
      </div>

      <!-- 高级搜索区域 -->
      <div v-show="showAdvanced" class="search-row advanced-search">
        <el-divider content-position="left">
          <el-icon><Filter /></el-icon>
          高级筛选条件
        </el-divider>

        <!-- 第一行 -->
        <div class="advanced-row">
          <el-form-item label="年龄范围">
            <el-slider
              v-model="searchForm.ageRange"
              range
              :min="0"
              :max="120"
              :marks="ageMarks"
              style="width: 200px"
            />
            <span class="age-range-text">
              {{ searchForm.ageRange[0] }} - {{ searchForm.ageRange[1] }} 岁
            </span>
          </el-form-item>

          <el-form-item label="健康状态">
            <el-select
              v-model="searchForm.healthStatus"
              placeholder="全部"
              clearable
              multiple
              collapse-tags
              style="width: 180px"
            >
              <el-option label="健康" value="healthy" />
              <el-option label="慢性病" value="chronic" />
              <el-option label="残疾" value="disabled" />
              <el-option label="需要照护" value="need_care" />
            </el-select>
          </el-form-item>

          <el-form-item label="婚姻状况">
            <el-select
              v-model="searchForm.maritalStatus"
              placeholder="全部"
              clearable
              multiple
              collapse-tags
              style="width: 160px"
            >
              <el-option label="未婚" value="unmarried" />
              <el-option label="已婚" value="married" />
              <el-option label="离异" value="divorced" />
              <el-option label="丧偶" value="widowed" />
            </el-select>
          </el-form-item>
        </div>

        <!-- 第二行 -->
        <div class="advanced-row">
          <el-form-item label="户籍类型">
            <el-radio-group v-model="searchForm.householdType">
              <el-radio label="">全部</el-radio>
              <el-radio label="agricultural">农业户口</el-radio>
              <el-radio label="non_agricultural">非农户口</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="文化程度">
            <el-select
              v-model="searchForm.education"
              placeholder="全部"
              clearable
              multiple
              collapse-tags
              style="width: 180px"
            >
              <el-option label="小学及以下" value="primary_below" />
              <el-option label="初中" value="junior" />
              <el-option label="高中/中专" value="senior" />
              <el-option label="大专" value="college" />
              <el-option label="本科及以上" value="bachelor_above" />
            </el-select>
          </el-form-item>
        </div>

        <!-- 第三行 - 特殊身份标签 -->
        <div class="advanced-row">
          <el-form-item label="特殊身份">
            <el-checkbox-group v-model="searchForm.specialTags" class="special-tags">
              <el-checkbox label="low_income">
                <el-tag type="warning" size="small">低保户</el-tag>
              </el-checkbox>
              <el-checkbox label="disabled">
                <el-tag type="danger" size="small">残疾人</el-tag>
              </el-checkbox>
              <el-checkbox label="elderly_alone">
                <el-tag type="info" size="small">独居老人</el-tag>
              </el-checkbox>
              <el-checkbox label="veteran">
                <el-tag type="success" size="small">退伍军人</el-tag>
              </el-checkbox>
              <el-checkbox label="poverty">
                <el-tag type="warning" size="small">建档立卡</el-tag>
              </el-checkbox>
              <el-checkbox label="party_member">
                <el-tag type="danger" size="small">党员</el-tag>
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </div>

        <!-- 第四行 - 地址和时间 -->
        <div class="advanced-row">
          <el-form-item label="居住地址">
            <el-cascader
              v-model="searchForm.address"
              :options="addressOptions"
              placeholder="请选择"
              clearable
              style="width: 220px"
              :props="{
                expandTrigger: 'hover',
                emitPath: false,
                checkStrictly: true,
              }"
            />
          </el-form-item>

          <el-form-item label="建档时间">
            <el-date-picker
              v-model="searchForm.createTimeRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 240px"
            />
          </el-form-item>

          <el-form-item label="数据状态">
            <el-select
              v-model="searchForm.dataStatus"
              placeholder="全部"
              clearable
              style="width: 140px"
            >
              <el-option label="已验证" value="verified" />
              <el-option label="待验证" value="pending" />
              <el-option label="需更新" value="need_update" />
            </el-select>
          </el-form-item>
        </div>

        <!-- 操作按钮 -->
        <div class="advanced-actions">
          <el-button type="primary" @click="handleSearch" icon="Search"> 执行搜索 </el-button>
          <el-button @click="handleReset" icon="Refresh"> 重置所有条件 </el-button>
          <el-button @click="saveSearchTemplate" icon="Collection"> 保存搜索模板 </el-button>
          <el-dropdown @command="loadSearchTemplate">
            <el-button icon="FolderOpened">
              加载模板<el-icon class="el-icon--right"><arrow-down /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="template in searchTemplates"
                  :key="template.id"
                  :command="template"
                >
                  {{ template.name }}
                </el-dropdown-item>
                <el-dropdown-item divided @click="manageTemplates"> 管理模板 </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-form>

    <!-- 搜索统计信息 -->
    <div v-if="searchResults" class="search-stats">
      <el-alert
        :title="`找到 ${searchResults.total} 条符合条件的记录`"
        type="info"
        show-icon
        :closable="false"
      >
        <template #default>
          <div class="stats-detail">
            <span v-if="searchResults.gender">
              男性 {{ searchResults.gender.male || 0 }} 人， 女性
              {{ searchResults.gender.female || 0 }} 人
            </span>
            <span v-if="searchResults.ageGroups">
              | 平均年龄 {{ searchResults.averageAge?.toFixed(1) || 0 }} 岁
            </span>
            <span v-if="searchResults.specialCount > 0">
              | 特殊群体 {{ searchResults.specialCount }} 人
            </span>
          </div>
        </template>
      </el-alert>
    </div>

    <!-- 搜索模板管理对话框 -->
    <el-dialog v-model="templateDialogVisible" title="搜索模板管理" width="600px">
      <el-table :data="searchTemplates" style="width: 100%">
        <el-table-column prop="name" label="模板名称" />
        <el-table-column prop="description" label="描述" />
        <el-table-column prop="createTime" label="创建时间" width="120">
          <template #default="scope">
            {{ formatDate(scope.row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button size="small" @click="loadSearchTemplate(scope.row)"> 加载 </el-button>
            <el-button size="small" type="danger" @click="deleteTemplate(scope.row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search,
  Refresh,
  Filter,
  ArrowUp,
  ArrowDown,
  Collection,
  FolderOpened,
} from '@element-plus/icons-vue';

// Props
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({}),
  },
});

// Emits
const emit = defineEmits(['update:modelValue', 'search', 'reset']);

// 响应式数据
const searchFormRef = ref();
const showAdvanced = ref(false);
const templateDialogVisible = ref(false);

// 搜索表单
const searchForm = reactive({
  keyword: '',
  gender: '',
  ageGroup: '',
  ageRange: [0, 120],
  healthStatus: [],
  maritalStatus: [],
  householdType: '',
  education: [],
  specialTags: [],
  address: [],
  createTimeRange: [],
  dataStatus: '',
});

// 搜索结果统计
const searchResults = ref(null);

// 年龄标记
const ageMarks = {
  0: '0岁',
  18: '18岁',
  35: '35岁',
  60: '60岁',
  120: '120岁',
};

// 地址选项
const addressOptions = ref([
  {
    value: 'zone1',
    label: '第一片区',
    children: [
      { value: 'street1', label: '主街道' },
      { value: 'street2', label: '次街道' },
      { value: 'street3', label: '后街' },
    ],
  },
  {
    value: 'zone2',
    label: '第二片区',
    children: [
      { value: 'avenue1', label: '中心大道' },
      { value: 'avenue2', label: '商业街' },
    ],
  },
  {
    value: 'zone3',
    label: '第三片区',
    children: [
      { value: 'road1', label: '农贸路' },
      { value: 'road2', label: '工业路' },
      { value: 'road3', label: '学校路' },
    ],
  },
]);

// 搜索模板
const searchTemplates = ref([
  {
    id: 1,
    name: '低保户查询',
    description: '查询所有低保户村民',
    conditions: {
      specialTags: ['low_income'],
    },
    createTime: '2024-01-15',
  },
  {
    id: 2,
    name: '老年人统计',
    description: '60岁以上老年人',
    conditions: {
      ageRange: [60, 120],
    },
    createTime: '2024-01-16',
  },
  {
    id: 3,
    name: '独居老人关爱',
    description: '需要特别关注的独居老人',
    conditions: {
      specialTags: ['elderly_alone'],
      ageRange: [65, 120],
    },
    createTime: '2024-01-17',
  },
]);

// 方法
const toggleAdvanced = () => {
  showAdvanced.value = !showAdvanced.value;
};

const handleSearch = () => {
  const searchParams = {
    ...searchForm,
    // 转换特殊处理的字段
    ageMin: searchForm.ageRange[0],
    ageMax: searchForm.ageRange[1],
  };

  emit('search', searchParams);
  emit('update:modelValue', searchParams);
};

const handleReset = () => {
  // 重置表单
  Object.assign(searchForm, {
    keyword: '',
    gender: '',
    ageGroup: '',
    ageRange: [0, 120],
    healthStatus: [],
    maritalStatus: [],
    householdType: '',
    education: [],
    specialTags: [],
    address: [],
    createTimeRange: [],
    dataStatus: '',
  });

  searchResults.value = null;
  emit('reset');
  emit('update:modelValue', {});
};

const saveSearchTemplate = async () => {
  try {
    const { value: templateName } = await ElMessageBox.prompt(
      '请输入搜索模板名称',
      '保存搜索模板',
      {
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        inputPattern: /^.{1,20}$/,
        inputErrorMessage: '模板名称长度应为 1-20 个字符',
      }
    );

    const template = {
      id: Date.now(),
      name: templateName,
      description: generateTemplateDescription(),
      conditions: { ...searchForm },
      createTime: new Date().toISOString().split('T')[0],
    };

    searchTemplates.value.push(template);
    ElMessage.success('搜索模板保存成功');
  } catch {
    // 用户取消操作
  }
};

const generateTemplateDescription = () => {
  const conditions = [];

  if (searchForm.keyword) conditions.push(`关键词: ${searchForm.keyword}`);
  if (searchForm.gender) conditions.push(`性别: ${searchForm.gender}`);
  if (searchForm.ageGroup) conditions.push(`年龄段: ${searchForm.ageGroup}`);
  if (searchForm.specialTags.length)
    conditions.push(`特殊身份: ${searchForm.specialTags.join(', ')}`);

  return conditions.join('; ') || '自定义查询条件';
};

const loadSearchTemplate = template => {
  Object.assign(searchForm, template.conditions);
  ElMessage.success(`已加载模板: ${template.name}`);
  handleSearch();
};

const deleteTemplate = async template => {
  try {
    await ElMessageBox.confirm(`确定要删除模板 "${template.name}" 吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const index = searchTemplates.value.findIndex(t => t.id === template.id);
    if (index > -1) {
      searchTemplates.value.splice(index, 1);
      ElMessage.success('模板删除成功');
    }
  } catch {
    // 用户取消操作
  }
};

const manageTemplates = () => {
  templateDialogVisible.value = true;
};

const formatDate = date => {
  return new Date(date).toLocaleDateString();
};

// 更新搜索结果统计
const updateSearchResults = results => {
  searchResults.value = results;
};

// 监听外部搜索条件变化
watch(
  () => props.modelValue,
  newValue => {
    if (newValue && Object.keys(newValue).length > 0) {
      Object.assign(searchForm, newValue);
    }
  },
  { immediate: true }
);

// 暴露方法给父组件
defineExpose({
  updateSearchResults,
  resetForm: handleReset,
  getSearchParams: () => searchForm,
});

onMounted(() => {
  // 初始化时如果有搜索条件则执行搜索
  if (props.modelValue && Object.keys(props.modelValue).length > 0) {
    handleSearch();
  }
});
</script>

<style lang="scss" scoped>
.advanced-search-panel {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .search-form {
    .search-row {
      margin-bottom: 16px;

      &.basic-search {
        padding-bottom: 16px;
        border-bottom: 1px solid #ebeef5;
      }

      &.advanced-search {
        padding-top: 16px;
        background: #fafbfc;
        border-radius: 6px;
        padding: 20px;
        margin-top: 16px;

        .advanced-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 16px;
          gap: 20px;

          .el-form-item {
            margin-right: 0;
            margin-bottom: 8px;
          }
        }

        .special-tags {
          .el-checkbox {
            margin-right: 16px;
            margin-bottom: 8px;

            .el-tag {
              margin-left: 4px;
            }
          }
        }

        .advanced-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e4e7ed;
        }
      }
    }

    .age-range-text {
      margin-left: 16px;
      color: #606266;
      font-size: 14px;
    }
  }

  .search-stats {
    margin-top: 16px;

    .stats-detail {
      color: #606266;
      font-size: 14px;
      line-height: 1.5;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .advanced-search-panel {
    padding: 12px;

    .search-form {
      .search-row {
        &.basic-search {
          .el-form-item {
            width: 100%;
            margin-bottom: 12px;
          }
        }

        &.advanced-search {
          .advanced-row {
            flex-direction: column;
            align-items: stretch;

            .el-form-item {
              width: 100%;
            }
          }

          .advanced-actions {
            flex-direction: column;

            .el-button {
              width: 100%;
            }
          }
        }
      }
    }
  }
}
</style>
