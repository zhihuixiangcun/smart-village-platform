<template>
  <div class="permission-template-management">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索模板..."
          style="width: 300px"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="filterCategory"
          placeholder="模板分类"
          style="width: 150px; margin-left: 12px"
          clearable
          @change="handleFilter"
        >
          <el-option label="全部" value="" />
          <el-option label="系统模板" value="system" />
          <el-option label="自定义模板" value="custom" />
          <el-option label="部门模板" value="department" />
        </el-select>
      </div>

      <div class="toolbar-right">
        <el-button type="primary" @click="showCreateTemplateDialog">
          <el-icon><Plus /></el-icon>
          创建模板
        </el-button>
        <el-button @click="showImportTemplateDialog">
          <el-icon><Upload /></el-icon>
          导入模板
        </el-button>
        <el-button @click="exportTemplates">
          <el-icon><Download /></el-icon>
          导出模板
        </el-button>
      </div>
    </div>

    <!-- 模板列表 -->
    <el-row :gutter="24">
      <!-- 左侧模板列表 -->
      <el-col :span="8">
        <el-card class="template-list-card">
          <template #header>
            <div class="card-header">
              <h3>权限模板列表</h3>
              <span class="template-count">共 {{ filteredTemplates.length }} 个模板</span>
            </div>
          </template>

          <div class="template-list">
            <div
              v-for="template in filteredTemplates"
              :key="template.id"
              class="template-item"
              :class="{ active: selectedTemplate?.id === template.id }"
              @click="selectTemplate(template)"
            >
              <div class="template-icon">
                <el-icon :size="24" :color="template.category === 'system' ? '#409eff' : '#67c23a'">
                  <Document />
                </el-icon>
              </div>
              <div class="template-info">
                <div class="template-name">{{ template.name }}</div>
                <div class="template-description">{{ template.description }}</div>
                <div class="template-meta">
                  <el-tag :type="getCategoryTagType(template.category)" size="small">
                    {{ getCategoryLabel(template.category) }}
                  </el-tag>
                  <span class="permission-count">{{ template.permissionCount }} 项权限</span>
                </div>
              </div>
              <div class="template-actions">
                <el-dropdown @command="handleTemplateAction">
                  <el-button type="text" size="small">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="`edit-${template.id}`">编辑</el-dropdown-item>
                      <el-dropdown-item :command="`copy-${template.id}`">复制</el-dropdown-item>
                      <el-dropdown-item :command="`apply-${template.id}`"
                        >应用模板</el-dropdown-item
                      >
                      <el-dropdown-item :command="`delete-${template.id}`" class="danger-item">
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧模板详情 -->
      <el-col :span="16">
        <el-card class="template-detail-card">
          <template #header>
            <div class="card-header">
              <h3 v-if="selectedTemplate">
                {{ selectedTemplate.name }}
              </h3>
              <h3 v-else>模板详情</h3>
              <div class="template-actions" v-if="selectedTemplate">
                <el-button type="primary" size="small" @click="handleApplyTemplate">
                  应用模板
                </el-button>
                <el-button size="small" @click="previewTemplate"> 预览效果 </el-button>
              </div>
            </div>
          </template>

          <div v-if="selectedTemplate" class="template-content">
            <!-- 基本信息 -->
            <div class="template-basic-info">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="模板ID">
                  {{ selectedTemplate.id }}
                </el-descriptions-item>
                <el-descriptions-item label="分类">
                  <el-tag :type="getCategoryTagType(selectedTemplate.category)">
                    {{ getCategoryLabel(selectedTemplate.category) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="创建时间">
                  {{ formatDateTime(selectedTemplate.createdAt) }}
                </el-descriptions-item>
                <el-descriptions-item label="更新时间">
                  {{ formatDateTime(selectedTemplate.updatedAt) }}
                </el-descriptions-item>
                <el-descriptions-item label="使用次数">
                  {{ selectedTemplate.usageCount || 0 }}
                </el-descriptions-item>
                <el-descriptions-item label="权限数量">
                  {{ selectedTemplate.permissionCount }}
                </el-descriptions-item>
              </el-descriptions>
            </div>

            <!-- 权限配置 -->
            <div class="template-permissions">
              <h4>权限配置</h4>
              <el-tabs v-model="activePermissionTab" type="card">
                <el-tab-pane label="权限列表" name="list">
                  <div class="permission-list">
                    <div
                      v-for="category in selectedTemplate.permissions"
                      :key="category.module"
                      class="permission-category"
                    >
                      <h5>{{ category.module }}</h5>
                      <el-checkbox-group v-model="category.enabledPermissions">
                        <div class="permission-grid">
                          <el-checkbox
                            v-for="permission in category.permissions"
                            :key="permission.key"
                            :label="permission.key"
                          >
                            <div class="permission-item">
                              <span class="permission-name">{{ permission.name }}</span>
                              <span class="permission-description">{{
                                permission.description
                              }}</span>
                            </div>
                          </el-checkbox>
                        </div>
                      </el-checkbox-group>
                    </div>
                  </div>
                </el-tab-pane>

                <el-tab-pane label="权限统计" name="stats">
                  <div class="permission-stats">
                    <div ref="permissionChart" class="chart-container"></div>
                  </div>
                </el-tab-pane>

                <el-tab-pane label="使用历史" name="history">
                  <div class="usage-history">
                    <el-timeline>
                      <el-timeline-item
                        v-for="history in selectedTemplate.usageHistory || []"
                        :key="history.id"
                        :timestamp="formatDateTime(history.timestamp)"
                      >
                        <div class="history-content">
                          <div class="history-action">
                            {{ history.action }} - {{ history.target }}
                          </div>
                          <div class="history-operator">操作人: {{ history.operator }}</div>
                        </div>
                      </el-timeline-item>
                    </el-timeline>
                    <div v-if="!selectedTemplate.usageHistory?.length" class="no-history">
                      <el-empty description="暂无使用记录" />
                    </div>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>
          </div>

          <div v-else class="no-template-selected">
            <el-empty description="请选择一个模板查看详情" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 创建/编辑模板对话框 -->
    <el-dialog
      v-model="templateDialogVisible"
      :title="isEditing ? '编辑模板' : '创建模板'"
      width="800px"
      :destroy-on-close="true"
    >
      <el-form
        ref="templateFormRef"
        :model="templateForm"
        :rules="templateRules"
        label-width="100px"
      >
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="templateForm.name" placeholder="输入模板名称" />
        </el-form-item>

        <el-form-item label="模板描述" prop="description">
          <el-input
            v-model="templateForm.description"
            type="textarea"
            :rows="2"
            placeholder="描述模板用途"
          />
        </el-form-item>

        <el-form-item label="模板分类" prop="category">
          <el-radio-group v-model="templateForm.category">
            <el-radio label="system">系统模板</el-radio>
            <el-radio label="custom">自定义模板</el-radio>
            <el-radio label="department">部门模板</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="适用角色">
          <el-select
            v-model="templateForm.targetRoles"
            multiple
            placeholder="选择适用角色"
            style="width: 100%"
          >
            <el-option
              v-for="role in roleOptions"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="权限配置">
          <div class="permission-config">
            <el-tabs v-model="configTab" type="border-card">
              <el-tab-pane
                v-for="category in permissionCategories"
                :key="category.key"
                :label="category.name"
                :name="category.key"
              >
                <div class="category-permissions">
                  <div class="category-header">
                    <el-checkbox
                      :indeterminate="getCategoryIndeterminate(category)"
                      :model-value="getCategoryChecked(category)"
                      @update:model-value="val => handleCategoryCheck(category, val)"
                    >
                      全选
                    </el-checkbox>
                  </div>
                  <el-checkbox-group v-model="templateForm.permissions">
                    <el-row :gutter="16">
                      <el-col
                        v-for="permission in category.permissions"
                        :key="permission.key"
                        :span="8"
                      >
                        <el-checkbox :label="permission.key">
                          {{ permission.name }}
                        </el-checkbox>
                      </el-col>
                    </el-row>
                  </el-checkbox-group>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitTemplate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 应用模板对话框 -->
    <el-dialog
      v-model="applyDialogVisible"
      title="应用权限模板"
      width="600px"
      :destroy-on-close="true"
    >
      <div v-if="applyTemplate" class="apply-template-form">
        <h4>{{ applyTemplate.name }}</h4>
        <p class="template-desc">{{ applyTemplate.description }}</p>

        <el-form label-width="100px">
          <el-form-item label="应用对象">
            <el-radio-group v-model="applyForm.target">
              <el-radio label="role">角色</el-radio>
              <el-radio label="user">用户</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="applyForm.target === 'role'" label="选择角色">
            <el-select v-model="applyForm.roleId" placeholder="选择角色" style="width: 100%">
              <el-option
                v-for="role in roleOptions"
                :key="role.value"
                :label="role.label"
                :value="role.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item v-if="applyForm.target === 'user'" label="选择用户">
            <el-select
              v-model="applyForm.userIds"
              multiple
              placeholder="选择用户"
              style="width: 100%"
            >
              <el-option
                v-for="user in userOptions"
                :key="user.id"
                :label="user.name"
                :value="user.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="应用方式">
            <el-radio-group v-model="applyForm.mode">
              <el-radio label="replace">替换现有权限</el-radio>
              <el-radio label="merge">合并权限</el-radio>
              <el-radio label="append">追加权限</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="生效时间">
            <el-date-picker
              v-model="applyForm.effectiveTime"
              type="datetime"
              placeholder="选择生效时间"
              style="width: 100%"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="applyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="executeApplyTemplate">应用</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Plus, Upload, Download, MoreFilled, Document } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import enhancedPermissionService from '@/services/enhancedPermissionService';

// 响应式数据
const searchKeyword = ref('');
const filterCategory = ref('');
const selectedTemplate = ref(null);
const activePermissionTab = ref('list');
const configTab = ref('basic');
const templateDialogVisible = ref(false);
const applyDialogVisible = ref(false);
const isEditing = ref(false);
const applyTemplate = ref(null);

// 模板数据
const templates = ref([
  {
    id: '1',
    name: '基础管理员权限',
    description: '包含基本的管理功能权限',
    category: 'system',
    permissionCount: 25,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
    usageCount: 156,
    permissions: [
      {
        module: '用户管理',
        permissions: [
          { key: 'user:read', name: '查看用户', description: '查看用户基本信息' },
          { key: 'user:write', name: '编辑用户', description: '修改用户信息' },
        ],
        enabledPermissions: ['user:read', 'user:write'],
      },
      {
        module: '角色管理',
        permissions: [{ key: 'role:read', name: '查看角色', description: '查看角色信息' }],
        enabledPermissions: ['role:read'],
      },
    ],
  },
  {
    id: '2',
    name: '财务主管权限',
    description: '财务部门主管专用权限模板',
    category: 'department',
    permissionCount: 18,
    createdAt: new Date('2025-01-05'),
    updatedAt: new Date('2025-01-10'),
    usageCount: 23,
    permissions: [
      {
        module: '财务管理',
        permissions: [
          { key: 'finance:read', name: '查看财务', description: '查看财务数据' },
          { key: 'finance:approve', name: '财务审批', description: '审批财务申请' },
        ],
        enabledPermissions: ['finance:read', 'finance:approve'],
      },
    ],
  },
  {
    id: '3',
    name: '只读权限模板',
    description: '仅包含查看权限的安全模板',
    category: 'custom',
    permissionCount: 15,
    createdAt: new Date('2025-01-08'),
    updatedAt: new Date('2025-01-08'),
    usageCount: 89,
    permissions: [],
  },
]);

// 权限分类
const permissionCategories = ref([
  {
    key: 'basic',
    name: '基础权限',
    permissions: [
      { key: 'user:read', name: '查看用户' },
      { key: 'user:write', name: '编辑用户' },
      { key: 'role:read', name: '查看角色' },
      { key: 'role:write', name: '编辑角色' },
    ],
  },
  {
    key: 'business',
    name: '业务权限',
    permissions: [
      { key: 'resident:read', name: '查看村民' },
      { key: 'resident:write', name: '编辑村民' },
      { key: 'finance:read', name: '查看财务' },
      { key: 'finance:write', name: '编辑财务' },
    ],
  },
  {
    key: 'system',
    name: '系统权限',
    permissions: [
      { key: 'system:config', name: '系统配置' },
      { key: 'system:log', name: '查看日志' },
    ],
  },
]);

// 表单数据
const templateFormRef = ref(null);
const templateForm = reactive({
  name: '',
  description: '',
  category: 'custom',
  targetRoles: [],
  permissions: [],
});

const applyForm = reactive({
  target: 'role',
  roleId: '',
  userIds: [],
  mode: 'merge',
  effectiveTime: new Date(),
});

const templateRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入模板描述', trigger: 'blur' }],
  category: [{ required: true, message: '请选择模板分类', trigger: 'change' }],
};

const roleOptions = ref([
  { label: '村级管理员', value: 'village_admin' },
  { label: '部门主管', value: 'department_head' },
  { label: '工作人员', value: 'staff' },
  { label: '村民', value: 'villager' },
]);

const userOptions = ref([
  { id: '1', name: '张管理员' },
  { id: '2', name: '李主管' },
  { id: '3', name: '王工作人员' },
]);

// 图表实例
let permissionChart = null;

// 计算属性
const filteredTemplates = computed(() => {
  let result = templates.value;

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(
      template =>
        template.name.toLowerCase().includes(keyword) ||
        template.description.toLowerCase().includes(keyword)
    );
  }

  if (filterCategory.value) {
    result = result.filter(template => template.category === filterCategory.value);
  }

  return result;
});

// 方法
const handleSearch = () => {
  // 搜索逻辑已通过计算属性实现
};

const handleFilter = () => {
  // 过滤逻辑已通过计算属性实现
};

const selectTemplate = template => {
  selectedTemplate.value = template;
  nextTick(() => {
    initPermissionChart();
  });
};

const getCategoryTagType = category => {
  const types = {
    system: 'primary',
    custom: 'success',
    department: 'warning',
  };
  return types[category] || 'info';
};

const getCategoryLabel = category => {
  const labels = {
    system: '系统模板',
    custom: '自定义模板',
    department: '部门模板',
  };
  return labels[category] || '未知';
};

const getCategoryIndeterminate = category => {
  const checkedCount = category.permissions.filter(p =>
    templateForm.permissions.includes(p.key)
  ).length;
  return checkedCount > 0 && checkedCount < category.permissions.length;
};

const getCategoryChecked = category => {
  return category.permissions.every(p => templateForm.permissions.includes(p.key));
};

const handleCategoryCheck = (category, checked) => {
  if (checked) {
    category.permissions.forEach(p => {
      if (!templateForm.permissions.includes(p.key)) {
        templateForm.permissions.push(p.key);
      }
    });
  } else {
    category.permissions.forEach(p => {
      const index = templateForm.permissions.indexOf(p.key);
      if (index > -1) {
        templateForm.permissions.splice(index, 1);
      }
    });
  }
};

const initPermissionChart = () => {
  if (!selectedTemplate.value) return;

  const chartDom = document.querySelector('[ref="permissionChart"]');
  if (!chartDom) return;

  permissionChart = echarts.init(chartDom);

  const data = [];
  selectedTemplate.value.permissions.forEach(category => {
    category.permissions.forEach(permission => {
      data.push({
        name: permission.name,
        value: 1,
      });
    });
  });

  const option = {
    tooltip: {
      trigger: 'item',
    },
    series: [
      {
        name: '权限分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: data,
      },
    ],
  };

  permissionChart.setOption(option);
};

const handleTemplateAction = async command => {
  const [action, templateId] = command.split('-');
  const template = templates.value.find(t => t.id === templateId);

  switch (action) {
    case 'edit':
      isEditing.value = true;
      Object.assign(templateForm, {
        name: template.name,
        description: template.description,
        category: template.category,
        targetRoles: [],
        permissions: [],
      });
      templateDialogVisible.value = true;
      break;

    case 'copy':
      isEditing.value = false;
      Object.assign(templateForm, {
        name: template.name + '_副本',
        description: template.description,
        category: 'custom',
        targetRoles: [],
        permissions: [],
      });
      templateDialogVisible.value = true;
      break;

    case 'apply':
      showApplyTemplateDialog(template);
      break;

    case 'delete':
      try {
        await ElMessageBox.confirm(`确定要删除模板"${template.name}"吗？`, '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        });

        const index = templates.value.findIndex(t => t.id === templateId);
        templates.value.splice(index, 1);

        if (selectedTemplate.value?.id === templateId) {
          selectedTemplate.value = null;
        }

        ElMessage.success('模板删除成功');
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除模板失败');
        }
      }
      break;
  }
};

const showCreateTemplateDialog = () => {
  isEditing.value = false;
  Object.assign(templateForm, {
    name: '',
    description: '',
    category: 'custom',
    targetRoles: [],
    permissions: [],
  });
  templateDialogVisible.value = true;
};

const showImportTemplateDialog = () => {
  ElMessage.info('导入模板功能待实现');
};

const exportTemplates = () => {
  ElMessage.info('导出模板功能待实现');
};

const submitTemplate = async () => {
  try {
    await templateFormRef.value.validate();

    const templateData = {
      ...templateForm,
      createdAt: isEditing.value ? templateForm.createdAt : new Date(),
      updatedAt: new Date(),
      permissionCount: templateForm.permissions.length,
      usageCount: isEditing.value ? templateForm.usageCount : 0,
      permissions: [],
    };

    // 构建权限结构
    permissionCategories.value.forEach(category => {
      const categoryPermissions = {
        module: category.name,
        permissions: [],
        enabledPermissions: [],
      };

      category.permissions.forEach(permission => {
        categoryPermissions.permissions.push({
          key: permission.key,
          name: permission.name,
          description: `${permission.name}权限`,
        });

        if (templateForm.permissions.includes(permission.key)) {
          categoryPermissions.enabledPermissions.push(permission.key);
        }
      });

      if (categoryPermissions.enabledPermissions.length > 0) {
        templateData.permissions.push(categoryPermissions);
      }
    });

    if (isEditing.value) {
      const index = templates.value.findIndex(t => t.id === templateForm.id);
      templates.value[index] = templateData;
      ElMessage.success('模板更新成功');
    } else {
      templateData.id = Date.now().toString();
      templates.value.push(templateData);
      ElMessage.success('模板创建成功');
    }

    templateDialogVisible.value = false;
  } catch (error) {
    console.error('保存模板失败:', error);
  }
};

const handleApplyTemplate = () => {
  showApplyTemplateDialog(selectedTemplate.value);
};

const previewTemplate = () => {
  ElMessage.info('预览功能待实现');
};

const showApplyTemplateDialog = template => {
  applyTemplate.value = template;
  Object.assign(applyForm, {
    target: 'role',
    roleId: '',
    userIds: [],
    mode: 'merge',
    effectiveTime: new Date(),
  });
  applyDialogVisible.value = true;
};

const executeApplyTemplate = async () => {
  try {
    if (applyForm.target === 'role' && !applyForm.roleId) {
      ElMessage.warning('请选择角色');
      return;
    }

    if (applyForm.target === 'user' && applyForm.userIds.length === 0) {
      ElMessage.warning('请选择用户');
      return;
    }

    // 更新使用次数
    const template = templates.value.find(t => t.id === applyTemplate.value.id);
    if (template) {
      template.usageCount = (template.usageCount || 0) + 1;

      // 添加使用历史
      if (!template.usageHistory) {
        template.usageHistory = [];
      }
      template.usageHistory.push({
        id: Date.now().toString(),
        action: '应用模板',
        target:
          applyForm.target === 'role'
            ? `角色: ${applyForm.roleId}`
            : `用户: ${applyForm.userIds.length}个`,
        operator: '当前用户',
        timestamp: new Date(),
      });
    }

    ElMessage.success('模板应用成功');
    applyDialogVisible.value = false;
  } catch (error) {
    ElMessage.error('应用模板失败');
  }
};

// 工具方法
const formatDateTime = date => {
  return new Date(date).toLocaleString();
};

// 生命周期
onMounted(() => {
  // 初始化数据
});
</script>

<style lang="scss" scoped>
.permission-template-management {
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding: 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    .toolbar-left {
      display: flex;
      align-items: center;
    }

    .toolbar-right {
      display: flex;
      gap: 12px;
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
      font-size: 16px;
      color: #2c3e50;
    }

    .template-count {
      font-size: 14px;
      color: #909399;
    }
  }

  .template-list-card {
    height: calc(100vh - 300px);
    overflow: hidden;

    .template-list {
      height: calc(100% - 60px);
      overflow-y: auto;
    }

    .template-item {
      display: flex;
      align-items: center;
      padding: 16px;
      margin-bottom: 8px;
      border-radius: 8px;
      background: #f5f7fa;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        background: #e6e8eb;
      }

      &.active {
        background: #ecf5ff;
        border: 1px solid #409eff;
      }

      .template-icon {
        margin-right: 12px;
      }

      .template-info {
        flex: 1;

        .template-name {
          font-weight: 500;
          color: #2c3e50;
          margin-bottom: 4px;
        }

        .template-description {
          font-size: 14px;
          color: #606266;
          margin-bottom: 8px;
        }

        .template-meta {
          display: flex;
          align-items: center;
          gap: 8px;

          .permission-count {
            font-size: 12px;
            color: #909399;
          }
        }
      }

      .template-actions {
        opacity: 0;
        transition: opacity 0.3s ease;

        .template-item:hover & {
          opacity: 1;
        }
      }
    }
  }

  .template-detail-card {
    height: calc(100vh - 300px);
    overflow: hidden;

    .template-actions {
      display: flex;
      gap: 8px;
    }

    .template-content {
      height: calc(100% - 60px);
      overflow-y: auto;

      .template-basic-info {
        margin-bottom: 24px;
      }

      .template-permissions {
        h4 {
          margin-bottom: 16px;
          color: #2c3e50;
        }

        .permission-list {
          .permission-category {
            margin-bottom: 24px;
            padding: 16px;
            background: #f5f7fa;
            border-radius: 6px;

            h5 {
              margin-bottom: 12px;
              color: #2c3e50;
            }

            .permission-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
              gap: 12px;

              .permission-item {
                .permission-name {
                  display: block;
                  font-weight: 500;
                  color: #2c3e50;
                  margin-bottom: 4px;
                }

                .permission-description {
                  font-size: 12px;
                  color: #909399;
                }
              }
            }
          }
        }

        .permission-stats {
          .chart-container {
            height: 300px;
          }
        }

        .usage-history {
          .history-content {
            .history-action {
              font-weight: 500;
              color: #2c3e50;
              margin-bottom: 4px;
            }

            .history-operator {
              font-size: 12px;
              color: #909399;
            }
          }

          .no-history {
            padding: 40px;
            text-align: center;
          }
        }
      }
    }

    .no-template-selected {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .permission-config {
    .category-permissions {
      .category-header {
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e4e7ed;
      }
    }
  }

  .apply-template-form {
    h4 {
      margin-bottom: 8px;
      color: #2c3e50;
    }

    .template-desc {
      color: #606266;
      margin-bottom: 24px;
    }
  }

  :deep(.danger-item) {
    color: #f56c6c;
  }
}
</style>
