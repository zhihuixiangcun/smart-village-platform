<template>
  <div class="user-permission-assignment">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchUser"
          placeholder="搜索用户..."
          style="width: 300px"
          clearable
          @input="handleUserSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="filterRole"
          placeholder="筛选角色"
          style="width: 150px; margin-left: 12px"
          clearable
          @change="handleRoleFilter"
        >
          <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
        </el-select>

        <el-select
          v-model="filterStatus"
          placeholder="状态筛选"
          style="width: 120px; margin-left: 12px"
          clearable
          @change="handleStatusFilter"
        >
          <el-option label="全部" value="" />
          <el-option label="激活" value="active" />
          <el-option label="禁用" value="inactive" />
        </el-select>
      </div>

      <div class="toolbar-right">
        <el-button type="primary" @click="showBatchAssignDialog">
          <el-icon><UserFilled /></el-icon>
          批量分配
        </el-button>
        <el-button @click="exportUserPermissions">
          <el-icon><Download /></el-icon>
          导出权限
        </el-button>
        <el-button @click="refreshUserList">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 用户列表和权限详情 -->
    <el-row :gutter="24">
      <!-- 左侧用户列表 -->
      <el-col :span="8">
        <el-card class="user-list-card">
          <template #header>
            <div class="card-header">
              <h3>用户列表</h3>
              <span class="user-count">共 {{ filteredUsers.length }} 个用户</span>
            </div>
          </template>

          <div class="user-list">
            <div
              v-for="user in filteredUsers"
              :key="user.id"
              class="user-item"
              :class="{ active: selectedUser?.id === user.id }"
              @click="selectUser(user)"
            >
              <div class="user-avatar">
                <el-avatar :size="40" :src="user.avatar">
                  {{ user.name.charAt(0) }}
                </el-avatar>
                <div class="user-status" :class="user.status"></div>
              </div>
              <div class="user-info">
                <div class="user-name">{{ user.name }}</div>
                <div class="user-email">{{ user.email }}</div>
                <div class="user-roles">
                  <el-tag
                    v-for="role in user.roles"
                    :key="role.id"
                    size="small"
                    :style="{ backgroundColor: role.color, borderColor: role.color }"
                  >
                    {{ role.name }}
                  </el-tag>
                </div>
              </div>
              <div class="user-actions">
                <el-dropdown @command="handleUserAction">
                  <el-button type="text" size="small">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="`edit-${user.id}`">编辑用户</el-dropdown-item>
                      <el-dropdown-item :command="`permissions-${user.id}`">
                        权限详情
                      </el-dropdown-item>
                      <el-dropdown-item :command="`copy-${user.id}`">复制权限</el-dropdown-item>
                      <el-dropdown-item :command="`toggle-${user.id}`" :divided="true">
                        {{ user.status === 'active' ? '禁用' : '激活' }}
                      </el-dropdown-item>
                      <el-dropdown-item :command="`reset-${user.id}`" class="warning-item">
                        重置权限
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧权限详情 -->
      <el-col :span="16">
        <el-card class="permission-detail-card">
          <template #header>
            <div class="card-header">
              <h3 v-if="selectedUser">{{ selectedUser.name }} - 权限详情</h3>
              <h3 v-else>权限详情</h3>
              <div class="permission-actions">
                <el-button
                  v-if="selectedUser"
                  type="primary"
                  size="small"
                  @click="showAssignRoleDialog"
                >
                  分配角色
                </el-button>
                <el-button
                  v-if="selectedUser"
                  type="success"
                  size="small"
                  @click="showGrantPermissionDialog"
                >
                  授予权限
                </el-button>
                <el-button v-if="selectedUser" size="small" @click="showInheritanceDialog">
                  权限继承
                </el-button>
              </div>
            </div>
          </template>

          <div v-if="selectedUser" class="permission-content">
            <!-- 用户基本信息 -->
            <div class="user-basic-info">
              <el-descriptions :column="3" border>
                <el-descriptions-item label="用户ID">
                  {{ selectedUser.id }}
                </el-descriptions-item>
                <el-descriptions-item label="用户名">
                  {{ selectedUser.username }}
                </el-descriptions-item>
                <el-descriptions-item label="状态">
                  <el-tag :type="selectedUser.status === 'active' ? 'success' : 'danger'">
                    {{ selectedUser.status === 'active' ? '激活' : '禁用' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="部门">
                  {{ selectedUser.department || '未分配' }}
                </el-descriptions-item>
                <el-descriptions-item label="最后登录">
                  {{ formatDate(selectedUser.lastLogin) }}
                </el-descriptions-item>
                <el-descriptions-item label="权限总数">
                  {{ userPermissionCount }} 个
                </el-descriptions-item>
              </el-descriptions>
            </div>

            <!-- 权限标签页 -->
            <el-tabs
              v-model="activePermissionTab"
              class="permission-tabs"
              @tab-change="handlePermissionTabChange"
            >
              <!-- 角色权限 -->
              <el-tab-pane label="角色权限" name="roles">
                <div class="role-permissions">
                  <div
                    v-for="role in selectedUser.roles"
                    :key="role.id"
                    class="role-permission-item"
                  >
                    <div class="role-header">
                      <el-tag :style="{ backgroundColor: role.color, borderColor: role.color }">
                        {{ role.name }}
                      </el-tag>
                      <el-button type="text" size="small" @click="removeUserRole(role)">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                    <div class="role-permissions-list">
                      <el-tag
                        v-for="permission in role.permissions"
                        :key="permission"
                        size="small"
                        type="info"
                        class="permission-tag"
                      >
                        {{ permission }}
                      </el-tag>
                    </div>
                  </div>
                  <div v-if="selectedUser.roles.length === 0" class="no-roles">
                    <el-empty description="暂未分配角色" />
                  </div>
                </div>
              </el-tab-pane>

              <!-- 直接权限 -->
              <el-tab-pane label="直接权限" name="direct">
                <div class="direct-permissions">
                  <div class="permission-group">
                    <div
                      v-for="category in permissionCategories"
                      :key="category.key"
                      class="permission-category"
                    >
                      <h4>{{ category.name }}</h4>
                      <div class="permission-grid">
                        <el-checkbox
                          v-for="permission in category.permissions"
                          :key="permission.key"
                          v-model="permission.granted"
                          @change="handleDirectPermissionChange(permission)"
                        >
                          {{ permission.name }}
                        </el-checkbox>
                      </div>
                    </div>
                  </div>
                </div>
              </el-tab-pane>

              <!-- 继承权限 -->
              <el-tab-pane label="继承权限" name="inherited">
                <div class="inherited-permissions">
                  <div class="inheritance-tree">
                    <el-tree
                      :data="inheritanceTreeData"
                      :props="treeProps"
                      show-checkbox
                      node-key="id"
                      :default-checked-keys="checkedInheritanceNodes"
                      @check="handleInheritanceChange"
                    >
                      <template #default="{ node, data }">
                        <div class="tree-node-content">
                          <span class="node-label">{{ data.label }}</span>
                          <el-tag size="small" type="info" v-if="data.count">
                            {{ data.count }} 项权限
                          </el-tag>
                        </div>
                      </template>
                    </el-tree>
                  </div>
                </div>
              </el-tab-pane>

              <!-- 权限历史 -->
              <el-tab-pane label="权限历史" name="history">
                <div class="permission-history">
                  <el-timeline>
                    <el-timeline-item
                      v-for="history in permissionHistory"
                      :key="history.id"
                      :timestamp="formatDateTime(history.timestamp)"
                      :type="history.type"
                    >
                      <div class="history-content">
                        <div class="history-action">{{ history.action }}</div>
                        <div class="history-detail">{{ history.detail }}</div>
                        <div class="history-operator">操作人: {{ history.operator }}</div>
                      </div>
                    </el-timeline-item>
                  </el-timeline>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>

          <div v-else class="no-user-selected">
            <el-empty description="请选择一个用户查看权限详情" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 分配角色对话框 -->
    <el-dialog
      v-model="assignRoleDialogVisible"
      title="分配角色"
      width="500px"
      :destroy-on-close="true"
    >
      <el-form label-width="80px">
        <el-form-item label="选择角色">
          <el-select
            v-model="selectedRoles"
            multiple
            placeholder="选择要分配的角色"
            style="width: 100%"
          >
            <el-option
              v-for="role in availableRoles"
              :key="role.id"
              :label="role.name"
              :value="role.id"
              :disabled="isRoleAssigned(role.id)"
            >
              <span style="float: left">{{ role.name }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">
                {{ role.userCount }} 用户
              </span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="生效时间">
          <el-date-picker
            v-model="roleEffectiveTime"
            type="datetime"
            placeholder="选择生效时间"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="过期时间">
          <el-date-picker
            v-model="roleExpireTime"
            type="datetime"
            placeholder="选择过期时间（可选）"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="assignRoleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUserRoleAssignment">确定</el-button>
      </template>
    </el-dialog>

    <!-- 授予权限对话框 -->
    <el-dialog
      v-model="grantPermissionDialogVisible"
      title="授予权限"
      width="600px"
      :destroy-on-close="true"
    >
      <div class="grant-permission-form">
        <el-form label-width="100px">
          <el-form-item label="权限类型">
            <el-radio-group v-model="permissionGrantType">
              <el-radio label="single">单个权限</el-radio>
              <el-radio label="batch">批量权限</el-radio>
              <el-radio label="template">权限模板</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 单个权限 -->
          <el-form-item v-if="permissionGrantType === 'single'" label="选择权限">
            <el-cascader
              v-model="selectedSinglePermission"
              :options="permissionCascadeOptions"
              :props="cascaderProps"
              placeholder="选择权限"
              style="width: 100%"
            />
          </el-form-item>

          <!-- 批量权限 -->
          <el-form-item v-if="permissionGrantType === 'batch'" label="权限模块">
            <el-checkbox-group v-model="selectedBatchPermissions">
              <el-checkbox
                v-for="module in permissionModules"
                :key="module.key"
                :label="module.key"
              >
                {{ module.name }} ({{ module.count }} 项)
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <!-- 权限模板 -->
          <el-form-item v-if="permissionGrantType === 'template'" label="选择模板">
            <el-select
              v-model="selectedPermissionTemplate"
              placeholder="选择权限模板"
              style="width: 100%"
            >
              <el-option
                v-for="template in permissionTemplates"
                :key="template.id"
                :label="template.name"
                :value="template.id"
              >
                <span style="float: left">{{ template.name }}</span>
                <span style="float: right; color: #8492a6; font-size: 13px">
                  {{ template.permissionCount }} 权限
                </span>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="权限约束">
            <el-checkbox v-model="applyConstraints">应用权限约束</el-checkbox>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="grantPermissionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePermissionGrant">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑用户对话框 -->
    <el-dialog
      v-model="editUserDialogVisible"
      title="编辑用户"
      width="600px"
      :destroy-on-close="true"
    >
      <el-form :model="editUserForm" :rules="editUserRules" label-width="100px" ref="editUserFormRef">
        <el-form-item label="用户ID">
          <el-input v-model="editUserForm.id" disabled />
        </el-form-item>

        <el-form-item label="用户名" prop="username">
          <el-input v-model="editUserForm.username" placeholder="请输入用户名" />
        </el-form-item>

        <el-form-item label="姓名" prop="name">
          <el-input v-model="editUserForm.name" placeholder="请输入姓名" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="editUserForm.email" placeholder="请输入邮箱" />
        </el-form-item>

        <el-form-item label="部门">
          <el-input v-model="editUserForm.department" placeholder="请输入部门" />
        </el-form-item>

        <el-form-item label="状态">
          <el-switch
            v-model="editUserForm.status"
            active-value="active"
            inactive-value="inactive"
            active-text="激活"
            inactive-text="禁用"
          />
        </el-form-item>

        <el-form-item label="头像">
          <el-upload
            class="avatar-uploader"
            :show-file-list="false"
            :before-upload="handleAvatarUpload"
          >
            <img v-if="editUserForm.avatar" :src="editUserForm.avatar" class="avatar" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editUserDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEditUser" :loading="editUserLoading">保存</el-button>
      </template>
    </el-dialog>

    <!-- 复制权限对话框 -->
    <el-dialog
      v-model="copyPermissionDialogVisible"
      title="复制用户权限"
      width="600px"
      :destroy-on-close="true"
    >
      <el-alert
        title="选择要复制权限的用户"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        将复制选定用户的所有角色权限和直接权限
      </el-alert>

      <el-table
        ref="copyPermissionTable"
        :data="copyPermissionUsers"
        @selection-change="handleCopyPermissionSelection"
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="department" label="部门" />
        <el-table-column label="角色数" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ row.roles?.length || 0 }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权限数" width="80">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.permissionCount || 0 }}</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="copyPermissionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="executeCopyPermission" :loading="copyPermissionLoading">
          复制权限
        </el-button>
      </template>
    </el-dialog>

    <!-- 权限继承配置对话框 -->
    <el-dialog
      v-model="inheritanceConfigDialogVisible"
      title="权限继承配置"
      width="700px"
      :destroy-on-close="true"
    >
      <el-form label-width="120px">
        <el-form-item label="继承模式">
          <el-radio-group v-model="inheritanceConfig.mode">
            <el-radio label="inherit">继承模式</el-radio>
            <el-radio label="override">覆盖模式</el-radio>
            <el-radio label="merge">合并模式</el-radio>
          </el-radio-group>
          <div class="form-tip">
            继承模式：保留用户直接权限并继承角色权限<br />
            覆盖模式：用户权限完全由角色决定<br />
            合并模式：用户直接权限与角色权限合并，冲突时以直接权限为准
          </div>
        </el-form-item>

        <el-form-item label="优先级配置">
          <el-tree
            :data="inheritancePriorityTree"
            :props="treeProps"
            show-checkbox
            node-key="id"
            :default-checked-keys="inheritanceConfig.priorities"
            @check="handleInheritancePriorityChange"
          >
            <template #default="{ node, data }">
              <span class="priority-tree-node">
                <span>{{ data.label }}</span>
                <el-tag size="small" v-if="data.level" type="info">优先级: {{ data.level }}</el-tag>
              </span>
            </template>
          </el-tree>
        </el-form-item>

        <el-form-item label="生效时间">
          <el-date-picker
            v-model="inheritanceConfig.effectiveTime"
            type="datetime"
            placeholder="选择生效时间"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="过期时间">
          <el-date-picker
            v-model="inheritanceConfig.expireTime"
            type="datetime"
            placeholder="选择过期时间（可选）"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="继承范围">
          <el-checkbox-group v-model="inheritanceConfig.scope">
            <el-checkbox label="roles">角色权限</el-checkbox>
            <el-checkbox label="direct">直接权限</el-checkbox>
            <el-checkbox label="inherited">继承权限</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="inheritanceConfigDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveInheritanceConfig" :loading="inheritanceConfigLoading">
          保存配置
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量分配对话框 -->
    <el-dialog
      v-model="batchAssignDialogVisible"
      title="批量分配权限"
      width="700px"
      :destroy-on-close="true"
    >
      <div class="batch-assign-form">
        <el-steps :active="batchAssignStep" align-center>
          <el-step title="选择用户" />
          <el-step title="选择权限" />
          <el-step title="确认分配" />
        </el-steps>

        <div class="batch-assign-content">
          <!-- 步骤1: 选择用户 -->
          <div v-if="batchAssignStep === 0" class="step-content">
            <h4>选择要分配权限的用户</h4>
            <el-transfer
              v-model="selectedBatchUsers"
              :data="allUsers"
              :titles="['可选用户', '已选用户']"
              :props="transferProps"
              filterable
              :filter-method="filterTransferUsers"
            />
          </div>

          <!-- 步骤2: 选择权限 -->
          <div v-if="batchAssignStep === 1" class="step-content">
            <h4>选择要分配的权限</h4>
            <el-checkbox-group v-model="selectedBatchPermissions">
              <div
                v-for="category in permissionCategories"
                :key="category.key"
                class="permission-category-group"
              >
                <h5>{{ category.name }}</h5>
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
              </div>
            </el-checkbox-group>
          </div>

          <!-- 步骤3: 确认分配 -->
          <div v-if="batchAssignStep === 2" class="step-content">
            <h4>确认分配信息</h4>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="选中用户">
                {{ selectedBatchUsers.length }} 个用户
              </el-descriptions-item>
              <el-descriptions-item label="分配权限">
                {{ selectedBatchPermissions.length }} 项权限
              </el-descriptions-item>
              <el-descriptions-item label="预计生效时间">
                {{ formatDateTime(new Date()) }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <div class="batch-assign-actions">
          <el-button v-if="batchAssignStep > 0" @click="batchAssignStep--"> 上一步 </el-button>
          <el-button v-if="batchAssignStep < 2" type="primary" @click="batchAssignStep++">
            下一步
          </el-button>
          <el-button v-if="batchAssignStep === 2" type="primary" @click="executeBatchAssign">
            确认分配
          </el-button>
        </div>
      </div>

      <template #footer>
        <el-button @click="batchAssignDialogVisible = false">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, UserFilled, Download, Refresh, MoreFilled, Delete, Plus } from '@element-plus/icons-vue';
import * as XLSX from 'xlsx';

// 响应式数据
const searchUser = ref('');
const filterRole = ref('');
const filterStatus = ref('');
const selectedUser = ref(null);
const activePermissionTab = ref('roles');

// 对话框状态
const assignRoleDialogVisible = ref(false);
const grantPermissionDialogVisible = ref(false);
const batchAssignDialogVisible = ref(false);
const batchAssignStep = ref(0);
const editUserDialogVisible = ref(false);
const copyPermissionDialogVisible = ref(false);
const inheritanceConfigDialogVisible = ref(false);

// 表单数据
const selectedRoles = ref([]);
const roleEffectiveTime = ref(new Date());
const roleExpireTime = ref(null);
const permissionGrantType = ref('single');
const selectedSinglePermission = ref([]);
const selectedBatchPermissions = ref([]);
const selectedPermissionTemplate = ref('');
const applyConstraints = ref(false);
const selectedBatchUsers = ref([]);
const checkedInheritanceNodes = ref([]);

// 编辑用户相关
const editUserForm = ref({
  id: '',
  username: '',
  name: '',
  email: '',
  department: '',
  status: 'active',
  avatar: '',
});
const editUserRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' },
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
};
const editUserLoading = ref(false);
const editUserFormRef = ref(null);

// 复制权限相关
const copyPermissionUsers = ref([]);
const copyPermissionSelectedUsers = ref([]);
const copyPermissionLoading = ref(false);

// 权限继承配置相关
const inheritanceConfig = ref({
  mode: 'inherit',
  priorities: [],
  effectiveTime: new Date(),
  expireTime: null,
  scope: ['roles'],
});
const inheritanceConfigLoading = ref(false);

const inheritancePriorityTree = ref([
  {
    id: 'role-inherit',
    label: '角色继承',
    level: 1,
    children: [
      { id: 'role-inherit-priority', label: '角色优先级', level: 2 },
      { id: 'role-inherit-direct', label: '直接权限优先', level: 2 },
    ],
  },
  {
    id: 'direct-inherit',
    label: '直接权限继承',
    level: 1,
    children: [
      { id: 'direct-inherit-grant', label: '授予权限', level: 2 },
      { id: 'direct-inherit-deny', label: '拒绝权限', level: 2 },
    ],
  },
]);

// 角色数据
const roles = ref([
  {
    id: '1',
    name: '村级管理员',
    color: '#409eff',
    userCount: 5,
    permissions: ['user:read', 'user:write', 'system:config'],
  },
  {
    id: '2',
    name: '部门主管',
    color: '#67c23a',
    userCount: 12,
    permissions: ['resident:read', 'resident:write', 'finance:read'],
  },
  {
    id: '3',
    name: '工作人员',
    color: '#e6a23c',
    userCount: 28,
    permissions: ['service:read', 'service:write'],
  },
  {
    id: '4',
    name: '村民',
    color: '#909399',
    userCount: 1250,
    permissions: ['announcement:read', 'service:apply'],
  },
]);

// 用户数据
const users = ref([
  {
    id: '1',
    name: '张三',
    username: 'zhangsan',
    email: 'zhangsan@example.com',
    status: 'active',
    department: '村委会',
    lastLogin: new Date(Date.now() - 1000 * 60 * 60),
    roles: [{ id: '1', name: '村级管理员', color: '#409eff' }],
    avatar: '',
  },
  {
    id: '2',
    name: '李四',
    username: 'lisi',
    email: 'lisi@example.com',
    status: 'active',
    department: '财务部',
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2),
    roles: [{ id: '2', name: '部门主管', color: '#67c23a' }],
    avatar: '',
  },
  {
    id: '3',
    name: '王五',
    username: 'wangwu',
    email: 'wangwu@example.com',
    status: 'inactive',
    department: '服务部',
    lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24),
    roles: [{ id: '3', name: '工作人员', color: '#e6a23c' }],
    avatar: '',
  },
]);

// 权限分类
const permissionCategories = ref([
  {
    key: 'basic',
    name: '基础权限',
    permissions: [
      { key: 'user:read', name: '查看用户', granted: false },
      { key: 'user:write', name: '编辑用户', granted: false },
      { key: 'role:read', name: '查看角色', granted: false },
      { key: 'role:write', name: '编辑角色', granted: false },
    ],
  },
  {
    key: 'business',
    name: '业务权限',
    permissions: [
      { key: 'resident:read', name: '查看村民', granted: false },
      { key: 'resident:write', name: '编辑村民', granted: false },
      { key: 'finance:read', name: '查看财务', granted: false },
      { key: 'finance:write', name: '编辑财务', granted: false },
    ],
  },
]);

// 权限历史
const permissionHistory = ref([
  {
    id: '1',
    action: '分配角色',
    detail: '分配角色"村级管理员"',
    operator: '系统管理员',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    type: 'primary',
  },
  {
    id: '2',
    action: '授予权限',
    detail: '授予"system:config"权限',
    operator: '张三',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    type: 'success',
  },
]);

// 计算属性
const filteredUsers = computed(() => {
  let result = users.value;

  if (searchUser.value) {
    const keyword = searchUser.value.toLowerCase();
    result = result.filter(
      user =>
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.username.toLowerCase().includes(keyword)
    );
  }

  if (filterRole.value) {
    result = result.filter(user => user.roles.some(role => role.id === filterRole.value));
  }

  if (filterStatus.value) {
    result = result.filter(user => user.status === filterStatus.value);
  }

  return result;
});

const availableRoles = computed(() => {
  if (!selectedUser.value) return roles.value;

  return roles.value.filter(
    role => !selectedUser.value.roles.some(userRole => userRole.id === role.id)
  );
});

const userPermissionCount = computed(() => {
  if (!selectedUser.value) return 0;

  let count = 0;

  // 角色权限
  selectedUser.value.roles.forEach(role => {
    const roleData = roles.value.find(r => r.id === role.id);
    if (roleData) {
      count += roleData.permissions.length;
    }
  });

  // 直接权限
  permissionCategories.value.forEach(category => {
    count += category.permissions.filter(p => p.granted).length;
  });

  return count;
});

const permissionCascadeOptions = computed(() => {
  return permissionCategories.value.map(category => ({
    label: category.name,
    value: category.key,
    children: category.permissions.map(permission => ({
      label: permission.name,
      value: permission.key,
    })),
  }));
});

const cascaderProps = {
  expandTrigger: 'hover',
  multiple: true,
};

const permissionModules = computed(() => {
  return permissionCategories.value.map(category => ({
    key: category.key,
    name: category.name,
    count: category.permissions.length,
  }));
});

const permissionTemplates = ref([
  { id: '1', name: '基础权限模板', permissionCount: 10 },
  { id: '2', name: '管理权限模板', permissionCount: 25 },
  { id: '3', name: '只读权限模板', permissionCount: 15 },
]);

const inheritanceTreeData = ref([
  {
    id: '1',
    label: '村级管理员',
    count: 15,
    children: [
      {
        id: '1-1',
        label: '用户管理',
        count: 4,
        children: [
          { id: '1-1-1', label: '查看用户', count: 1 },
          { id: '1-1-2', label: '编辑用户', count: 1 },
          { id: '1-1-3', label: '创建用户', count: 1 },
          { id: '1-1-4', label: '删除用户', count: 1 },
        ],
      },
    ],
  },
]);

const treeProps = {
  children: 'children',
  label: 'label',
};

const allUsers = ref([]);
const transferProps = {
  key: 'id',
  label: 'name',
};

// 方法
const handleUserSearch = () => {
  // 搜索逻辑已通过计算属性实现
};

const handleRoleFilter = () => {
  // 过滤逻辑已通过计算属性实现
};

const handleStatusFilter = () => {
  // 过滤逻辑已通过计算属性实现
};

const selectUser = user => {
  selectedUser.value = user;
  loadUserPermissions(user);
};

const loadUserPermissions = user => {
  // 加载用户权限数据
  console.log('加载用户权限:', user.id);
};

const handlePermissionTabChange = tabName => {
  activePermissionTab.value = tabName;
};

const handleDirectPermissionChange = permission => {
  console.log('直接权限变更:', permission.key, permission.granted);
};

const handleInheritanceChange = (data, checked) => {
  console.log('继承权限变更:', data, checked);
};

const handleUserAction = async command => {
  const [action, userId] = command.split('-');
  const user = users.value.find(u => u.id === userId);

  switch (action) {
    case 'edit':
      showEditUserDialog(user);
      break;

    case 'permissions':
      selectUser(user);
      break;

    case 'copy':
      showCopyPermissionDialog(user);
      break;

    case 'toggle':
      try {
        user.status = user.status === 'active' ? 'inactive' : 'active';
        ElMessage.success(`用户"${user.name}"已${user.status === 'active' ? '激活' : '禁用'}`);
      } catch (error) {
        user.status = user.status === 'active' ? 'inactive' : 'active';
        ElMessage.error('更新用户状态失败');
      }
      break;

    case 'reset':
      try {
        await ElMessageBox.confirm(`确定要重置用户"${user.name}"的所有权限吗？`, '确认重置', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        });

        ElMessage.success('权限重置成功');
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('重置权限失败');
        }
      }
      break;
  }
};

const isRoleAssigned = roleId => {
  return selectedUser.value?.roles.some(role => role.id === roleId);
};

const showAssignRoleDialog = () => {
  selectedRoles.value = [];
  roleEffectiveTime.value = new Date();
  roleExpireTime.value = null;
  assignRoleDialogVisible.value = true;
};

const saveUserRoleAssignment = async () => {
  try {
    if (!selectedUser.value || selectedRoles.value.length === 0) {
      ElMessage.warning('请选择要分配的角色');
      return;
    }

    // 更新用户角色
    selectedRoles.value.forEach(roleId => {
      const role = roles.value.find(r => r.id === roleId);
      if (role && !isRoleAssigned(roleId)) {
        selectedUser.value.roles.push({
          id: role.id,
          name: role.name,
          color: role.color,
        });
      }
    });

    ElMessage.success('角色分配成功');
    assignRoleDialogVisible.value = false;
  } catch (error) {
    ElMessage.error('角色分配失败');
  }
};

const removeUserRole = async role => {
  try {
    await ElMessageBox.confirm(`确定要移除角色"${role.name}"吗？`, '确认移除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    const index = selectedUser.value.roles.findIndex(r => r.id === role.id);
    selectedUser.value.roles.splice(index, 1);

    ElMessage.success('角色移除成功');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('移除角色失败');
    }
  }
};

const showGrantPermissionDialog = () => {
  permissionGrantType.value = 'single';
  selectedSinglePermission.value = [];
  selectedBatchPermissions.value = [];
  selectedPermissionTemplate.value = '';
  applyConstraints.value = false;
  grantPermissionDialogVisible.value = true;
};

const savePermissionGrant = async () => {
  try {
    ElMessage.success('权限授予成功');
    grantPermissionDialogVisible.value = false;
  } catch (error) {
    ElMessage.error('权限授予失败');
  }
};

const showBatchAssignDialog = () => {
  batchAssignStep.value = 0;
  selectedBatchUsers.value = [];
  selectedBatchPermissions.value = [];
  allUsers.value = users.value.map(user => ({
    id: user.id,
    name: `${user.name} (${user.username})`,
  }));
  batchAssignDialogVisible.value = true;
};

const filterTransferUsers = (query, item) => {
  return item.name.toLowerCase().includes(query.toLowerCase());
};

const executeBatchAssign = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要为 ${selectedBatchUsers.value.length} 个用户分配 ${selectedBatchPermissions.value.length} 项权限吗？`,
      '确认批量分配',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    ElMessage.success('批量权限分配成功');
    batchAssignDialogVisible.value = false;
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量权限分配失败');
    }
  }
};

// 编辑用户功能
const showEditUserDialog = user => {
  editUserForm.value = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    department: user.department,
    status: user.status,
    avatar: user.avatar,
  };
  editUserDialogVisible.value = true;
};

const saveEditUser = async () => {
  if (!editUserFormRef.value) return;

  try {
    const valid = await editUserFormRef.value.validate();
    if (!valid) return;

    editUserLoading.value = true;

    const userIndex = users.value.findIndex(u => u.id === editUserForm.value.id);
    if (userIndex !== -1) {
      users.value[userIndex] = {
        ...users.value[userIndex],
        username: editUserForm.value.username,
        name: editUserForm.value.name,
        email: editUserForm.value.email,
        department: editUserForm.value.department,
        status: editUserForm.value.status,
        avatar: editUserForm.value.avatar,
      };
    }

    if (selectedUser.value?.id === editUserForm.value.id) {
      selectedUser.value = users.value[userIndex];
    }

    ElMessage.success('用户信息更新成功');
    editUserDialogVisible.value = false;
  } catch (error) {
    console.error('编辑用户失败:', error);
    ElMessage.error('用户信息更新失败');
  } finally {
    editUserLoading.value = false;
  }
};

const handleAvatarUpload = file => {
  const isJPG = file.type === 'image/jpeg';
  const isPNG = file.type === 'image/png';
  const isLt2M = file.size / 1024 / 1024 < 2;

  if (!isJPG && !isPNG) {
    ElMessage.error('头像图片只能是 JPG/PNG 格式!');
    return false;
  }
  if (!isLt2M) {
    ElMessage.error('头像图片大小不能超过 2MB!');
    return false;
  }

  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    editUserForm.value.avatar = reader.result;
  };

  return false;
};

// 复制权限功能
const showCopyPermissionDialog = sourceUser => {
  selectUser(sourceUser);
  copyPermissionUsers.value = users.value
    .filter(u => u.id !== sourceUser.id)
    .map(user => ({
      ...user,
      permissionCount: calculateUserPermissionCount(user),
    }));
  copyPermissionSelectedUsers.value = [];
  copyPermissionDialogVisible.value = true;
};

const handleCopyPermissionSelection = selection => {
  copyPermissionSelectedUsers.value = selection;
};

const calculateUserPermissionCount = user => {
  let count = 0;

  user.roles.forEach(role => {
    const roleData = roles.value.find(r => r.id === role.id);
    if (roleData) {
      count += roleData.permissions.length;
    }
  });

  permissionCategories.value.forEach(category => {
    count += category.permissions.filter(p => p.granted).length;
  });

  return count;
};

const executeCopyPermission = async () => {
  if (!selectedUser.value) {
    ElMessage.warning('请选择源用户');
    return;
  }

  if (copyPermissionSelectedUsers.value.length === 0) {
    ElMessage.warning('请选择要复制权限的目标用户');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要将用户"${selectedUser.value.name}"的权限复制给 ${copyPermissionSelectedUsers.value.length} 个用户吗？`,
      '确认复制权限',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    copyPermissionLoading.value = true;

    copyPermissionSelectedUsers.value.forEach(targetUser => {
      const targetIndex = users.value.findIndex(u => u.id === targetUser.id);
      if (targetIndex !== -1) {
        users.value[targetIndex].roles = JSON.parse(JSON.stringify(selectedUser.value.roles));
      }
    });

    ElMessage.success(`成功将权限复制给 ${copyPermissionSelectedUsers.value.length} 个用户`);
    copyPermissionDialogVisible.value = false;
  } catch (error) {
    if (error !== 'cancel') {
      console.error('复制权限失败:', error);
      ElMessage.error('复制权限失败');
    }
  } finally {
    copyPermissionLoading.value = false;
  }
};

// 权限继承配置功能
const showInheritanceDialog = () => {
  if (!selectedUser.value) {
    ElMessage.warning('请先选择用户');
    return;
  }

  inheritanceConfig.value = {
    mode: 'inherit',
    priorities: ['role-inherit'],
    effectiveTime: new Date(),
    expireTime: null,
    scope: ['roles'],
  };

  inheritanceConfigDialogVisible.value = true;
};

const handleInheritancePriorityChange = (data, checked) => {
  inheritanceConfig.value.priorities = checked.checkedKeys;
};

const saveInheritanceConfig = async () => {
  try {
    inheritanceConfigLoading.value = true;

    ElMessage.success('权限继承配置保存成功');
    inheritanceConfigDialogVisible.value = false;

    await loadUserPermissions(selectedUser.value);
  } catch (error) {
    console.error('保存权限继承配置失败:', error);
    ElMessage.error('保存权限继承配置失败');
  } finally {
    inheritanceConfigLoading.value = false;
  }
};

// 导出用户权限功能
const exportUserPermissions = () => {
  try {
    const exportData = users.value.map(user => {
      const roleNames = user.roles.map(role => role.name).join(', ');
      const userPermissions = [];

      user.roles.forEach(role => {
        const roleData = roles.value.find(r => r.id === role.id);
        if (roleData) {
          userPermissions.push(...roleData.permissions);
        }
      });

      return {
        '用户ID': user.id,
        '用户名': user.username,
        '姓名': user.name,
        '邮箱': user.email,
        '部门': user.department,
        '状态': user.status === 'active' ? '激活' : '禁用',
        '角色': roleNames,
        '权限列表': userPermissions.join(', '),
        '权限数量': userPermissions.length,
        '最后登录': formatDate(user.lastLogin),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '用户权限');
    XLSX.writeFile(workbook, `用户权限_${new Date().toISOString().split('T')[0]}.xlsx`);

    ElMessage.success('导出成功');
  } catch (error) {
    console.error('导出用户权限失败:', error);
    ElMessage.error('导出用户权限失败');
  }
};

const refreshUserList = () => {
  ElMessage.success('用户列表已刷新');
};

// 工具方法
const formatDate = date => {
  if (!date) return '-';
  return new Date(date).toLocaleString();
};

const formatDateTime = date => {
  return new Date(date).toLocaleString();
};

// 生命周期
onMounted(() => {
  // 初始化数据
});
</script>

<style lang="scss" scoped>
.user-permission-assignment {
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

    .user-count {
      font-size: 14px;
      color: #909399;
    }
  }

  .user-list-card {
    height: calc(100vh - 300px);
    overflow: hidden;

    .user-list {
      height: calc(100% - 60px);
      overflow-y: auto;
    }

    .user-item {
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

      .user-avatar {
        position: relative;
        margin-right: 12px;

        .user-status {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;

          &.active {
            background: #67c23a;
          }

          &.inactive {
            background: #f56c6c;
          }
        }
      }

      .user-info {
        flex: 1;

        .user-name {
          font-weight: 500;
          color: #2c3e50;
          margin-bottom: 4px;
        }

        .user-email {
          font-size: 14px;
          color: #606266;
          margin-bottom: 8px;
        }

        .user-roles {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
      }

      .user-actions {
        opacity: 0;
        transition: opacity 0.3s ease;

        .user-item:hover & {
          opacity: 1;
        }
      }
    }
  }

  .permission-detail-card {
    height: calc(100vh - 300px);
    overflow: hidden;

    .card-header {
      .permission-actions {
        display: flex;
        gap: 8px;
      }
    }

    .permission-content {
      height: calc(100% - 60px);
      overflow: hidden;

      .user-basic-info {
        margin-bottom: 24px;
      }

      .permission-tabs {
        height: calc(100% - 120px);

        :deep(.el-tabs__content) {
          height: calc(100% - 40px);
          overflow-y: auto;
        }
      }

      .role-permissions {
        .role-permission-item {
          padding: 16px;
          margin-bottom: 12px;
          background: #f5f7fa;
          border-radius: 6px;

          .role-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .role-permissions-list {
            .permission-tag {
              margin-right: 8px;
              margin-bottom: 4px;
            }
          }
        }

        .no-roles {
          padding: 40px;
          text-align: center;
        }
      }

      .direct-permissions {
        .permission-group {
          .permission-category {
            margin-bottom: 24px;

            h4 {
              margin-bottom: 12px;
              color: #2c3e50;
            }

            .permission-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 12px;
            }
          }
        }
      }

      .inherited-permissions {
        .inheritance-tree {
          padding: 16px;
          background: #f5f7fa;
          border-radius: 6px;

          .tree-node-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
          }
        }
      }

      .permission-history {
        padding: 0 16px;

        .history-content {
          .history-action {
            font-weight: 500;
            color: #2c3e50;
            margin-bottom: 4px;
          }

          .history-detail {
            color: #606266;
            margin-bottom: 4px;
          }

          .history-operator {
            font-size: 12px;
            color: #909399;
          }
        }
      }
    }

    .no-user-selected {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .grant-permission-form {
    .permission-category-group {
      margin-bottom: 24px;

      h5 {
        margin-bottom: 12px;
        color: #2c3e50;
      }
    }
  }

  .batch-assign-form {
    .batch-assign-content {
      margin-top: 24px;
      min-height: 300px;

      .step-content {
        h4 {
          margin-bottom: 16px;
          color: #2c3e50;
        }

        .permission-category-group {
          margin-bottom: 24px;
          padding: 16px;
          background: #f5f7fa;
          border-radius: 6px;
        }
      }
    }

    .batch-assign-actions {
      margin-top: 24px;
      text-align: center;
    }
  }

  :deep(.warning-item) {
    color: #e6a23c;
  }

  // 编辑用户对话框样式
  .avatar-uploader {
    :deep(.el-upload) {
      border: 1px dashed #d9d9d9;
      border-radius: 6px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: all 0.3s;

      &:hover {
        border-color: #409eff;
      }
    }
  }

  .avatar {
    width: 178px;
    height: 178px;
    display: block;
  }

  .avatar-uploader-icon {
    font-size: 28px;
    color: #8c939d;
    width: 178px;
    height: 178px;
    line-height: 178px;
    text-align: center;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 8px;
    line-height: 1.6;
  }

  .priority-tree-node {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
}
</style>
