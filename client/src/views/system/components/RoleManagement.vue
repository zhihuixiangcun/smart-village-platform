<template>
  <div class="role-management">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索角色..."
          style="width: 300px"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="filterStatus"
          placeholder="状态筛选"
          style="width: 150px; margin-left: 12px"
          clearable
          @change="handleFilter"
        >
          <el-option label="全部" value="" />
          <el-option label="启用" value="active" />
          <el-option label="禁用" value="inactive" />
        </el-select>
      </div>

      <div class="toolbar-right">
        <el-button type="primary" @click="showCreateRoleDialog">
          <el-icon><Plus /></el-icon>
          创建角色
        </el-button>
        <el-button @click="showBatchOperationDialog">
          <el-icon><Operation /></el-icon>
          批量操作
        </el-button>
        <el-button @click="exportRoles">
          <el-icon><Download /></el-icon>
          导出角色
        </el-button>
      </div>
    </div>

    <!-- 角色列表和权限矩阵 -->
    <el-row :gutter="24">
      <!-- 左侧角色列表 -->
      <el-col :span="8">
        <el-card class="role-list-card">
          <template #header>
            <div class="card-header">
              <h3>角色列表</h3>
              <span class="role-count">共 {{ filteredRoles.length }} 个角色</span>
            </div>
          </template>

          <div class="role-list">
            <div
              v-for="role in filteredRoles"
              :key="role.id"
              class="role-item"
              :class="{ active: selectedRole?.id === role.id }"
              @click="selectRole(role)"
            >
              <div class="role-avatar">
                <el-avatar :size="40" :style="{ backgroundColor: role.color }">
                  {{ role.name.charAt(0) }}
                </el-avatar>
              </div>
              <div class="role-info">
                <div class="role-name">{{ role.name }}</div>
                <div class="role-description">{{ role.description }}</div>
                <div class="role-meta">
                  <el-tag :type="role.status === 'active' ? 'success' : 'info'" size="small">
                    {{ role.status === 'active' ? '启用' : '禁用' }}
                  </el-tag>
                  <span class="user-count">{{ role.userCount }} 用户</span>
                </div>
              </div>
              <div class="role-actions">
                <el-dropdown @command="handleRoleAction">
                  <el-button type="text" size="small">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="`edit-${role.id}`">编辑</el-dropdown-item>
                      <el-dropdown-item :command="`copy-${role.id}`">复制</el-dropdown-item>
                      <el-dropdown-item :command="`users-${role.id}`">查看用户</el-dropdown-item>
                      <el-dropdown-item :command="`toggle-${role.id}`" :divided="true">
                        {{ role.status === 'active' ? '禁用' : '启用' }}
                      </el-dropdown-item>
                      <el-dropdown-item :command="`delete-${role.id}`" class="danger-item">
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

      <!-- 右侧权限矩阵 -->
      <el-col :span="16">
        <el-card class="permission-matrix-card">
          <template #header>
            <div class="card-header">
              <h3 v-if="selectedRole">{{ selectedRole.name }} - 权限矩阵</h3>
              <h3 v-else>权限矩阵</h3>
              <div class="matrix-actions">
                <el-button
                  v-if="selectedRole"
                  type="primary"
                  size="small"
                  @click="saveRolePermissions"
                >
                  保存权限
                </el-button>
                <el-button v-if="selectedRole" size="small" @click="resetPermissions">
                  重置
                </el-button>
              </div>
            </div>
          </template>

          <div v-if="selectedRole" class="permission-matrix">
            <!-- 权限分类标签 -->
            <el-tabs
              v-model="activePermissionTab"
              type="card"
              @tab-change="handlePermissionTabChange"
            >
              <el-tab-pane
                v-for="category in permissionCategories"
                :key="category.key"
                :label="category.name"
                :name="category.key"
              >
                <div class="permission-group">
                  <div
                    v-for="module in category.modules"
                    :key="module.key"
                    class="permission-module"
                  >
                    <div class="module-header">
                      <h4>{{ module.name }}</h4>
                      <el-checkbox
                        :indeterminate="getModuleIndeterminate(module)"
                        :model-value="getModuleChecked(module)"
                        @change="handleModuleCheck(module, $event)"
                      >
                        全选
                      </el-checkbox>
                    </div>
                    <div class="permission-list">
                      <div
                        v-for="permission in module.permissions"
                        :key="permission.key"
                        class="permission-item"
                      >
                        <el-checkbox
                          v-model="permission.checked"
                          @change="handlePermissionChange(permission)"
                        >
                          <div class="permission-info">
                            <span class="permission-name">{{ permission.name }}</span>
                            <span class="permission-description">
                              {{ permission.description }}
                            </span>
                          </div>
                        </el-checkbox>
                        <div class="permission-constraints">
                          <el-tooltip content="添加约束条件" placement="top">
                            <el-button
                              type="text"
                              size="small"
                              @click="showConstraintsDialog(permission)"
                            >
                              <el-icon><Setting /></el-icon>
                            </el-button>
                          </el-tooltip>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>

          <div v-else class="no-role-selected">
            <el-empty description="请选择一个角色查看权限配置" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 创建/编辑角色对话框 -->
    <el-dialog
      v-model="roleDialogVisible"
      :title="isEditing ? '编辑角色' : '创建角色'"
      width="500px"
      :destroy-on-close="true"
    >
      <el-form ref="roleFormRef" :model="roleForm" :rules="roleRules" label-width="80px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" placeholder="输入角色名称" />
        </el-form-item>

        <el-form-item label="角色描述" prop="description">
          <el-input
            v-model="roleForm.description"
            type="textarea"
            :rows="3"
            placeholder="描述角色职责"
          />
        </el-form-item>

        <el-form-item label="角色级别" prop="level">
          <el-select v-model="roleForm.level" placeholder="选择角色级别">
            <el-option label="村级管理员" value="village_admin" />
            <el-option label="部门主管" value="department_head" />
            <el-option label="工作人员" value="staff" />
            <el-option label="村民" value="villager" />
          </el-select>
        </el-form-item>

        <el-form-item label="继承角色">
          <el-select
            v-model="roleForm.inheritFrom"
            multiple
            placeholder="选择要继承的角色"
            style="width: 100%"
          >
            <el-option
              v-for="role in availableInheritRoles"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="角色颜色">
          <el-color-picker v-model="roleForm.color" />
        </el-form-item>

        <el-form-item label="状态">
          <el-radio-group v-model="roleForm.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRole">确定</el-button>
      </template>
    </el-dialog>

    <!-- 权限约束对话框 -->
    <el-dialog
      v-model="constraintsDialogVisible"
      title="权限约束配置"
      width="600px"
      :destroy-on-close="true"
    >
      <div v-if="selectedPermission" class="constraints-config">
        <h4>{{ selectedPermission.name }}</h4>
        <p class="permission-desc">{{ selectedPermission.description }}</p>

        <el-form label-width="100px">
          <el-form-item label="时间限制">
            <el-checkbox v-model="constraintsForm.timeLimit"> 启用时间限制 </el-checkbox>
            <div v-if="constraintsForm.timeLimit" class="time-range">
              <el-time-picker
                v-model="constraintsForm.startTime"
                placeholder="开始时间"
                format="HH:mm"
                value-format="HH:mm"
              />
              <span class="time-separator">至</span>
              <el-time-picker
                v-model="constraintsForm.endTime"
                placeholder="结束时间"
                format="HH:mm"
                value-format="HH:mm"
              />
            </div>
          </el-form-item>

          <el-form-item label="IP限制">
            <el-checkbox v-model="constraintsForm.ipLimit"> 启用IP白名单 </el-checkbox>
            <div v-if="constraintsForm.ipLimit" class="ip-list">
              <el-input
                v-model="constraintsForm.ipList"
                type="textarea"
                :rows="3"
                placeholder="输入允许的IP地址，每行一个"
              />
            </div>
          </el-form-item>

          <el-form-item label="次数限制">
            <el-checkbox v-model="constraintsForm.rateLimit"> 启用操作频率限制 </el-checkbox>
            <div v-if="constraintsForm.rateLimit" class="rate-config">
              <el-input-number
                v-model="constraintsForm.maxCount"
                :min="1"
                :max="1000"
                controls-position="right"
              />
              <span class="rate-unit">次/</span>
              <el-select v-model="constraintsForm.timeUnit">
                <el-option label="分钟" value="minute" />
                <el-option label="小时" value="hour" />
                <el-option label="天" value="day" />
              </el-select>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="constraintsDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConstraints">保存约束</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Plus, Operation, Download, MoreFilled, Setting } from '@element-plus/icons-vue';
import enhancedPermissionService from '@/services/enhancedPermissionService';

// 响应式数据
const searchKeyword = ref('');
const filterStatus = ref('');
const selectedRole = ref(null);
const activePermissionTab = ref('basic');
const roleDialogVisible = ref(false);
const constraintsDialogVisible = ref(false);
const isEditing = ref(false);
const selectedPermission = ref(null);

// 角色数据
const roles = ref([
  {
    id: '1',
    name: '村级管理员',
    description: '拥有村内所有管理权限',
    level: 'village_admin',
    status: 'active',
    userCount: 5,
    color: '#409eff',
    inheritFrom: ['department_head'],
    permissions: {},
  },
  {
    id: '2',
    name: '部门主管',
    description: '负责特定部门的管理工作',
    level: 'department_head',
    status: 'active',
    userCount: 12,
    color: '#67c23a',
    inheritFrom: ['staff'],
    permissions: {},
  },
  {
    id: '3',
    name: '工作人员',
    description: '负责日常业务处理',
    level: 'staff',
    status: 'active',
    userCount: 28,
    color: '#e6a23c',
    inheritFrom: ['villager'],
    permissions: {},
  },
  {
    id: '4',
    name: '村民',
    description: '普通村民用户',
    level: 'villager',
    status: 'active',
    userCount: 1250,
    color: '#909399',
    inheritFrom: [],
    permissions: {},
  },
]);

// 权限分类配置
const permissionCategories = ref([
  {
    key: 'basic',
    name: '基础权限',
    modules: [
      {
        key: 'user',
        name: '用户管理',
        permissions: [
          { key: 'user:read', name: '查看用户', description: '查看用户基本信息' },
          { key: 'user:write', name: '编辑用户', description: '修改用户信息' },
          { key: 'user:delete', name: '删除用户', description: '删除用户账号' },
          { key: 'user:create', name: '创建用户', description: '创建新用户' },
        ],
      },
      {
        key: 'role',
        name: '角色管理',
        permissions: [
          { key: 'role:read', name: '查看角色', description: '查看角色信息' },
          { key: 'role:write', name: '编辑角色', description: '修改角色配置' },
          { key: 'role:delete', name: '删除角色', description: '删除角色' },
          { key: 'role:create', name: '创建角色', description: '创建新角色' },
        ],
      },
    ],
  },
  {
    key: 'business',
    name: '业务权限',
    modules: [
      {
        key: 'resident',
        name: '村民管理',
        permissions: [
          { key: 'resident:read', name: '查看村民', description: '查看村民档案' },
          { key: 'resident:write', name: '编辑村民', description: '修改村民信息' },
          { key: 'resident:delete', name: '删除村民', description: '删除村民档案' },
          { key: 'resident:create', name: '添加村民', description: '添加新村民' },
        ],
      },
      {
        key: 'finance',
        name: '财务管理',
        permissions: [
          { key: 'finance:read', name: '查看财务', description: '查看财务数据' },
          { key: 'finance:write', name: '编辑财务', description: '修改财务记录' },
          { key: 'finance:approve', name: '财务审批', description: '审批财务申请' },
          { key: 'finance:report', name: '财务报表', description: '生成财务报表' },
        ],
      },
    ],
  },
  {
    key: 'system',
    name: '系统权限',
    modules: [
      {
        key: 'system',
        name: '系统管理',
        permissions: [
          { key: 'system:config', name: '系统配置', description: '修改系统配置' },
          { key: 'system:log', name: '查看日志', description: '查看系统日志' },
          { key: 'system:backup', name: '系统备份', description: '执行系统备份' },
          { key: 'system:monitor', name: '系统监控', description: '查看系统监控' },
        ],
      },
    ],
  },
]);

// 表单数据
const roleFormRef = ref(null);
const roleForm = reactive({
  name: '',
  description: '',
  level: '',
  inheritFrom: [],
  color: '#409eff',
  status: 'active',
});

const constraintsForm = reactive({
  timeLimit: false,
  startTime: '',
  endTime: '',
  ipLimit: false,
  ipList: '',
  rateLimit: false,
  maxCount: 10,
  timeUnit: 'hour',
});

const roleRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' },
  ],
  description: [{ required: true, message: '请输入角色描述', trigger: 'blur' }],
  level: [{ required: true, message: '请选择角色级别', trigger: 'change' }],
};

// 计算属性
const filteredRoles = computed(() => {
  let result = roles.value;

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(
      role =>
        role.name.toLowerCase().includes(keyword) ||
        role.description.toLowerCase().includes(keyword)
    );
  }

  if (filterStatus.value) {
    result = result.filter(role => role.status === filterStatus.value);
  }

  return result;
});

const availableInheritRoles = computed(() => {
  return roles.value
    .filter(role => role.id !== (isEditing.value ? roleForm.id : null))
    .map(role => ({
      label: role.name,
      value: role.id,
    }));
});

// 方法
const handleSearch = () => {
  // 搜索逻辑已通过计算属性实现
};

const handleFilter = () => {
  // 过滤逻辑已通过计算属性实现
};

const selectRole = role => {
  selectedRole.value = role;
  loadRolePermissions(role);
};

const loadRolePermissions = role => {
  // 加载角色权限并更新权限矩阵
  permissionCategories.value.forEach(category => {
    category.modules.forEach(module => {
      module.permissions.forEach(permission => {
        permission.checked = false; // 根据实际权限数据设置
      });
    });
  });
};

const handlePermissionTabChange = tabName => {
  activePermissionTab.value = tabName;
};

const getModuleIndeterminate = module => {
  const checked = module.permissions.filter(p => p.checked).length;
  return checked > 0 && checked < module.permissions.length;
};

const getModuleChecked = module => {
  return module.permissions.every(p => p.checked);
};

const handleModuleCheck = (module, checked) => {
  module.permissions.forEach(permission => {
    permission.checked = checked;
  });
};

const handlePermissionChange = permission => {
  // 处理权限变更
  console.log('权限变更:', permission.key, permission.checked);
};

const showCreateRoleDialog = () => {
  isEditing.value = false;
  Object.assign(roleForm, {
    name: '',
    description: '',
    level: '',
    inheritFrom: [],
    color: '#409eff',
    status: 'active',
  });
  roleDialogVisible.value = true;
};

const handleRoleAction = async command => {
  const [action, roleId] = command.split('-');
  const role = roles.value.find(r => r.id === roleId);

  switch (action) {
    case 'edit':
      isEditing.value = true;
      Object.assign(roleForm, role);
      roleDialogVisible.value = true;
      break;

    case 'copy':
      isEditing.value = false;
      Object.assign(roleForm, {
        ...role,
        name: role.name + '_副本',
        id: null,
      });
      roleDialogVisible.value = true;
      break;

    case 'users':
      ElMessage.info('查看角色用户功能待实现');
      break;

    case 'toggle':
      try {
        role.status = role.status === 'active' ? 'inactive' : 'active';
        ElMessage.success(`角色"${role.name}"已${role.status === 'active' ? '启用' : '禁用'}`);
      } catch (error) {
        role.status = role.status === 'active' ? 'inactive' : 'active';
        ElMessage.error('更新角色状态失败');
      }
      break;

    case 'delete':
      try {
        await ElMessageBox.confirm(`确定要删除角色"${role.name}"吗？此操作不可恢复。`, '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        });

        const index = roles.value.findIndex(r => r.id === roleId);
        roles.value.splice(index, 1);

        if (selectedRole.value?.id === roleId) {
          selectedRole.value = null;
        }

        ElMessage.success('角色删除成功');
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除角色失败');
        }
      }
      break;
  }
};

const submitRole = async () => {
  try {
    await roleFormRef.value.validate();

    if (isEditing.value) {
      const index = roles.value.findIndex(r => r.id === roleForm.id);
      roles.value[index] = { ...roleForm };
      ElMessage.success('角色更新成功');
    } else {
      const newRole = {
        ...roleForm,
        id: Date.now().toString(),
        userCount: 0,
      };
      roles.value.push(newRole);
      ElMessage.success('角色创建成功');
    }

    roleDialogVisible.value = false;
  } catch (error) {
    console.error('保存角色失败:', error);
  }
};

const saveRolePermissions = async () => {
  try {
    if (!selectedRole.value) return;

    // 收集所有选中的权限
    const permissions = [];
    permissionCategories.value.forEach(category => {
      category.modules.forEach(module => {
        module.permissions.forEach(permission => {
          if (permission.checked) {
            permissions.push(permission.key);
          }
        });
      });
    });

    // 调用API保存权限
    ElMessage.success('权限保存成功');
  } catch (error) {
    ElMessage.error('保存权限失败');
  }
};

const resetPermissions = () => {
  loadRolePermissions(selectedRole.value);
  ElMessage.info('权限已重置');
};

const showConstraintsDialog = permission => {
  selectedPermission.value = permission;
  Object.assign(constraintsForm, {
    timeLimit: false,
    startTime: '',
    endTime: '',
    ipLimit: false,
    ipList: '',
    rateLimit: false,
    maxCount: 10,
    timeUnit: 'hour',
  });
  constraintsDialogVisible.value = true;
};

const saveConstraints = () => {
  ElMessage.success('权限约束保存成功');
  constraintsDialogVisible.value = false;
};

const showBatchOperationDialog = () => {
  ElMessage.info('批量操作功能待实现');
};

const exportRoles = () => {
  ElMessage.info('导出角色功能待实现');
};

// 生命周期
onMounted(() => {
  // 初始化数据
});
</script>

<style lang="scss" scoped>
.role-management {
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

    .role-count {
      font-size: 14px;
      color: #909399;
    }
  }

  .role-list-card {
    height: calc(100vh - 300px);
    overflow: hidden;

    .role-list {
      height: calc(100% - 60px);
      overflow-y: auto;
    }

    .role-item {
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

      .role-avatar {
        margin-right: 12px;
      }

      .role-info {
        flex: 1;

        .role-name {
          font-weight: 500;
          color: #2c3e50;
          margin-bottom: 4px;
        }

        .role-description {
          font-size: 14px;
          color: #606266;
          margin-bottom: 8px;
        }

        .role-meta {
          display: flex;
          align-items: center;
          gap: 8px;

          .user-count {
            font-size: 12px;
            color: #909399;
          }
        }
      }

      .role-actions {
        opacity: 0;
        transition: opacity 0.3s ease;

        .role-item:hover & {
          opacity: 1;
        }
      }
    }
  }

  .permission-matrix-card {
    height: calc(100vh - 300px);
    overflow: hidden;

    .card-header {
      .matrix-actions {
        display: flex;
        gap: 8px;
      }
    }

    .permission-matrix {
      height: calc(100% - 60px);
      overflow: hidden;

      .el-tabs {
        height: 100%;
        display: flex;
        flex-direction: column;

        :deep(.el-tabs__content) {
          flex: 1;
          overflow-y: auto;
        }
      }

      .permission-group {
        .permission-module {
          margin-bottom: 24px;
          padding: 16px;
          background: #f5f7fa;
          border-radius: 6px;

          .module-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e4e7ed;

            h4 {
              margin: 0;
              font-size: 14px;
              color: #2c3e50;
            }
          }

          .permission-list {
            .permission-item {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 8px 0;

              .permission-info {
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

              .permission-constraints {
                margin-left: 12px;
                opacity: 0;
                transition: opacity 0.3s ease;

                .permission-item:hover & {
                  opacity: 1;
                }
              }
            }
          }
        }
      }
    }

    .no-role-selected {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .constraints-config {
    h4 {
      margin: 0 0 8px 0;
      color: #2c3e50;
    }

    .permission-desc {
      color: #606266;
      margin-bottom: 24px;
    }

    .time-range {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 8px;

      .time-separator {
        color: #909399;
      }
    }

    .ip-list {
      margin-top: 8px;
    }

    .rate-config {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;

      .rate-unit {
        color: #606266;
      }
    }
  }

  :deep(.danger-item) {
    color: #f56c6c;
  }
}
</style>
