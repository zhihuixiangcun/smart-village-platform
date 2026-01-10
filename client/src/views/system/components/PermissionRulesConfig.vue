<template>
  <div class="permission-rules-config">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索规则..."
          style="width: 300px"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="filterType"
          placeholder="规则类型"
          style="width: 150px; margin-left: 12px"
          clearable
          @change="handleFilter"
        >
          <el-option label="全部" value="" />
          <el-option label="时间规则" value="time_based" />
          <el-option label="位置规则" value="location_based" />
          <el-option label="设备规则" value="device_trust" />
          <el-option label="频率规则" value="rate_limit" />
        </el-select>

        <el-select
          v-model="filterStatus"
          placeholder="启用状态"
          style="width: 120px; margin-left: 12px"
          clearable
          @change="handleFilter"
        >
          <el-option label="全部" value="" />
          <el-option label="启用" value="enabled" />
          <el-option label="禁用" value="disabled" />
        </el-select>
      </div>

      <div class="toolbar-right">
        <el-button type="primary" @click="showCreateRuleDialog">
          <el-icon><Plus /></el-icon>
          创建规则
        </el-button>
        <el-button @click="showImportRulesDialog">
          <el-icon><Upload /></el-icon>
          导入规则
        </el-button>
        <el-button @click="exportRules">
          <el-icon><Download /></el-icon>
          导出规则
        </el-button>
      </div>
    </div>

    <!-- 规则列表 -->
    <el-card class="rules-card">
      <template #header>
        <div class="card-header">
          <h3>权限规则列表</h3>
          <div class="header-actions">
            <el-switch v-model="showAdvanced" active-text="高级模式" inactive-text="基础模式" />
          </div>
        </div>
      </template>

      <el-table :data="filteredRules" style="width: 100%" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />

        <el-table-column prop="name" label="规则名称" min-width="200">
          <template #default="{ row }">
            <div class="rule-name">
              <el-icon :color="getTypeColor(row.type)">
                <component :is="getTypeIcon(row.type)" />
              </el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="description" label="描述" min-width="250" />

        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">
            <el-tag
              :type="
                row.priority === 'high' ? 'danger' : row.priority === 'medium' ? 'warning' : 'info'
              "
              size="small"
            >
              {{ row.priority }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" @change="toggleRuleStatus(row)" size="small" />
          </template>
        </el-table-column>

        <el-table-column prop="targetRoles" label="目标角色" width="200">
          <template #default="{ row }">
            <el-tag
              v-for="role in row.targetRoles.slice(0, 2)"
              :key="role"
              size="small"
              style="margin-right: 4px; margin-bottom: 4px"
            >
              {{ getRoleName(role) }}
            </el-tag>
            <el-tag v-if="row.targetRoles.length > 2" size="small" type="info">
              +{{ row.targetRoles.length - 2 }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="editRule(row)"> 编辑 </el-button>
            <el-button type="success" size="small" @click="openTestRuleDialog(row)">
              测试
            </el-button>
            <el-dropdown @command="handleRuleAction">
              <el-button type="text" size="small">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="`copy-${row.id}`">复制规则</el-dropdown-item>
                  <el-dropdown-item :command="`export-${row.id}`">导出规则</el-dropdown-item>
                  <el-dropdown-item :command="`delete-${row.id}`" class="danger-item">
                    删除规则
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 批量操作栏 -->
      <div v-if="selectedRules.length > 0" class="batch-actions">
        <span>已选择 {{ selectedRules.length }} 项</span>
        <el-button size="small" @click="batchEnable">批量启用</el-button>
        <el-button size="small" @click="batchDisable">批量禁用</el-button>
        <el-button size="small" type="danger" @click="batchDelete">批量删除</el-button>
      </div>
    </el-card>

    <!-- 规则详情抽屉 -->
    <el-drawer v-model="ruleDetailVisible" title="规则详情" size="600px" :destroy-on-close="true">
      <div v-if="currentRule" class="rule-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="规则名称">
            {{ currentRule.name }}
          </el-descriptions-item>
          <el-descriptions-item label="规则描述">
            {{ currentRule.description }}
          </el-descriptions-item>
          <el-descriptions-item label="规则类型">
            <el-tag :type="getTypeTagType(currentRule.type)">
              {{ getTypeLabel(currentRule.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag
              :type="
                currentRule.priority === 'high'
                  ? 'danger'
                  : currentRule.priority === 'medium'
                    ? 'warning'
                    : 'info'
              "
            >
              {{ currentRule.priority }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="目标角色">
            <el-tag
              v-for="role in currentRule.targetRoles"
              :key="role"
              size="small"
              style="margin-right: 8px"
            >
              {{ getRoleName(role) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 规则配置详情 -->
        <div class="rule-config-section">
          <h4>规则配置</h4>
          <div class="config-content">
            <pre>{{ formatRuleConfig(currentRule.config) }}</pre>
          </div>
        </div>

        <!-- 规则统计 -->
        <div class="rule-stats-section">
          <h4>执行统计</h4>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-statistic title="执行次数" :value="currentRule.stats?.executions || 0" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="允许次数" :value="currentRule.stats?.allowed || 0" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="拒绝次数" :value="currentRule.stats?.denied || 0" />
            </el-col>
          </el-row>
        </div>
      </div>
    </el-drawer>

    <!-- 创建/编辑规则对话框 -->
    <el-dialog
      v-model="ruleDialogVisible"
      :title="isEditing ? '编辑规则' : '创建规则'"
      width="800px"
      :destroy-on-close="true"
    >
      <el-form ref="ruleFormRef" :model="ruleForm" :rules="ruleRules" label-width="100px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="ruleForm.name" placeholder="输入规则名称" />
        </el-form-item>

        <el-form-item label="规则描述" prop="description">
          <el-input
            v-model="ruleForm.description"
            type="textarea"
            :rows="2"
            placeholder="描述规则用途"
          />
        </el-form-item>

        <el-form-item label="规则类型" prop="type">
          <el-select
            v-model="ruleForm.type"
            placeholder="选择规则类型"
            style="width: 100%"
            @change="handleRuleTypeChange"
          >
            <el-option label="时间访问控制" value="time_based" />
            <el-option label="位置访问控制" value="location_based" />
            <el-option label="设备信任控制" value="device_trust" />
            <el-option label="操作频率限制" value="rate_limit" />
          </el-select>
        </el-form-item>

        <el-form-item label="优先级" prop="priority">
          <el-radio-group v-model="ruleForm.priority">
            <el-radio label="high">高</el-radio>
            <el-radio label="medium">中</el-radio>
            <el-radio label="low">低</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="目标角色" prop="targetRoles">
          <el-select
            v-model="ruleForm.targetRoles"
            multiple
            placeholder="选择目标角色"
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

        <!-- 规则配置（根据类型动态显示） -->
        <el-form-item label="规则配置">
          <div class="rule-config-form">
            <!-- 时间规则配置 -->
            <div v-if="ruleForm.type === 'time_based'">
              <el-form-item label="生效时间">
                <el-time-picker
                  v-model="timeConfig.startTime"
                  placeholder="开始时间"
                  format="HH:mm"
                  value-format="HH:mm"
                />
                <span class="time-separator">至</span>
                <el-time-picker
                  v-model="timeConfig.endTime"
                  placeholder="结束时间"
                  format="HH:mm"
                  value-format="HH:mm"
                />
              </el-form-item>
              <el-form-item label="生效日期">
                <el-checkbox-group v-model="timeConfig.days">
                  <el-checkbox :label="1">周一</el-checkbox>
                  <el-checkbox :label="2">周二</el-checkbox>
                  <el-checkbox :label="3">周三</el-checkbox>
                  <el-checkbox :label="4">周四</el-checkbox>
                  <el-checkbox :label="5">周五</el-checkbox>
                  <el-checkbox :label="6">周六</el-checkbox>
                  <el-checkbox :label="0">周日</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </div>

            <!-- 位置规则配置 -->
            <div v-if="ruleForm.type === 'location_based'">
              <el-form-item label="位置类型">
                <el-radio-group v-model="locationConfig.type">
                  <el-radio label="village">村内访问</el-radio>
                  <el-radio label="office">办公室访问</el-radio>
                  <el-radio label="custom">自定义位置</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item v-if="locationConfig.type === 'custom'" label="经纬度">
                <el-input
                  v-model="locationConfig.coordinates"
                  placeholder="纬度,经度（例如：39.9042,116.4074）"
                />
              </el-form-item>
              <el-form-item label="允许范围">
                <el-input-number
                  v-model="locationConfig.radius"
                  :min="100"
                  :max="10000"
                  controls-position="right"
                />
                <span class="unit">米</span>
              </el-form-item>
            </div>

            <!-- 设备信任配置 -->
            <div v-if="ruleForm.type === 'device_trust'">
              <el-form-item label="信任级别">
                <el-radio-group v-model="deviceConfig.trustLevel">
                  <el-radio label="trusted">可信设备</el-radio>
                  <el-radio label="known">已知设备</el-radio>
                  <el-radio label="unknown">未知设备</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="设备标识">
                <el-input v-model="deviceConfig.deviceId" placeholder="设备ID或指纹（可选）" />
              </el-form-item>
            </div>

            <!-- 频率限制配置 -->
            <div v-if="ruleForm.type === 'rate_limit'">
              <el-form-item label="限制类型">
                <el-radio-group v-model="rateConfig.type">
                  <el-radio label="count">次数限制</el-radio>
                  <el-radio label="interval">间隔限制</el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item v-if="rateConfig.type === 'count'" label="限制次数">
                <el-input-number
                  v-model="rateConfig.maxCount"
                  :min="1"
                  :max="1000"
                  controls-position="right"
                />
                <span class="unit">次/</span>
                <el-select v-model="rateConfig.timeWindow">
                  <el-option label="分钟" value="minute" />
                  <el-option label="小时" value="hour" />
                  <el-option label="天" value="day" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="rateConfig.type === 'interval'" label="最小间隔">
                <el-input-number
                  v-model="rateConfig.minInterval"
                  :min="1"
                  :max="3600"
                  controls-position="right"
                />
                <span class="unit">秒</span>
              </el-form-item>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="生效条件">
          <el-checkbox-group v-model="ruleForm.conditions">
            <el-checkbox label="working_hours">工作时间</el-checkbox>
            <el-checkbox label="business_days">工作日</el-checkbox>
            <el-checkbox label="network_secure">安全网络</el-checkbox>
            <el-checkbox label="mfa_verified">MFA验证</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="启用状态">
          <el-switch v-model="ruleForm.enabled" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="ruleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRule">确定</el-button>
      </template>
    </el-dialog>

    <!-- 测试规则对话框 -->
    <el-dialog
      v-model="testRuleDialogVisible"
      title="测试规则"
      width="600px"
      :destroy-on-close="true"
    >
      <div v-if="testRule" class="rule-test">
        <h4>{{ testRule.name }}</h4>
        <p class="rule-description">{{ testRule.description }}</p>

        <el-form label-width="100px">
          <el-form-item label="测试用户">
            <el-select v-model="testData.userId" placeholder="选择测试用户" style="width: 100%">
              <el-option
                v-for="user in testUsers"
                :key="user.id"
                :label="user.name"
                :value="user.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="资源">
            <el-input v-model="testData.resource" placeholder="输入资源名称（如：user:read）" />
          </el-form-item>

          <el-form-item label="操作">
            <el-input v-model="testData.action" placeholder="输入操作（如：read, write, delete）" />
          </el-form-item>

          <el-form-item label="上下文">
            <el-input
              v-model="testData.context"
              type="textarea"
              :rows="3"
              placeholder="输入额外的上下文信息（JSON格式）"
            />
          </el-form-item>
        </el-form>

        <div class="test-actions">
          <el-button type="primary" @click="executeRuleTest"> 执行测试 </el-button>
        </div>

        <!-- 测试结果 -->
        <div v-if="testResult" class="test-result">
          <h5>测试结果</h5>
          <el-alert
            :title="testResult.allowed ? '允许' : '拒绝'"
            :type="testResult.allowed ? 'success' : 'error'"
            :description="testResult.reason"
            show-icon
            :closable="false"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search,
  Plus,
  Upload,
  Download,
  MoreFilled,
  Clock,
  Location,
  Iphone,
  Timer,
} from '@element-plus/icons-vue';
import enhancedPermissionService from '@/services/enhancedPermissionService';

// 响应式数据
const searchKeyword = ref('');
const filterType = ref('');
const filterStatus = ref('');
const showAdvanced = ref(false);
const selectedRules = ref([]);
const ruleDetailVisible = ref(false);
const currentRule = ref(null);
const ruleDialogVisible = ref(false);
const isEditing = ref(false);
const testRuleDialogVisible = ref(false);
const testRule = ref(null);
const testResult = ref(null);

// 规则列表
const rules = ref([
  {
    id: '1',
    name: '工作时间限制',
    description: '财务审批仅在工作时间允许',
    type: 'time_based',
    priority: 'high',
    enabled: true,
    targetRoles: ['village_admin', 'department_head'],
    config: {
      startTime: '09:00',
      endTime: '18:00',
      days: [1, 2, 3, 4, 5],
    },
    conditions: ['working_hours', 'business_days'],
    createdAt: new Date('2025-01-01'),
    stats: {
      executions: 1250,
      allowed: 1180,
      denied: 70,
    },
  },
  {
    id: '2',
    name: '设备信任验证',
    description: '敏感操作需要可信设备',
    type: 'device_trust',
    priority: 'high',
    enabled: true,
    targetRoles: ['village_admin'],
    config: {
      trustLevel: 'trusted',
    },
    conditions: ['network_secure'],
    createdAt: new Date('2025-01-05'),
    stats: {
      executions: 890,
      allowed: 850,
      denied: 40,
    },
  },
  {
    id: '3',
    name: '操作频率限制',
    description: '防止用户频繁操作',
    type: 'rate_limit',
    priority: 'medium',
    enabled: false,
    targetRoles: ['staff', 'villager'],
    config: {
      maxCount: 10,
      timeWindow: 'minute',
    },
    conditions: [],
    createdAt: new Date('2025-01-10'),
    stats: {
      executions: 0,
      allowed: 0,
      denied: 0,
    },
  },
  {
    id: '4',
    name: '位置访问控制',
    description: '只能在村内访问敏感资源',
    type: 'location_based',
    priority: 'medium',
    enabled: true,
    targetRoles: ['department_head', 'staff'],
    config: {
      type: 'village',
      radius: 1000,
    },
    conditions: [],
    createdAt: new Date('2025-01-15'),
    stats: {
      executions: 456,
      allowed: 445,
      denied: 11,
    },
  },
]);

// 表单数据
const ruleFormRef = ref(null);
const ruleForm = reactive({
  name: '',
  description: '',
  type: '',
  priority: 'medium',
  targetRoles: [],
  conditions: [],
  enabled: true,
});

const timeConfig = reactive({
  startTime: '',
  endTime: '',
  days: [],
});

const locationConfig = reactive({
  type: 'village',
  coordinates: '',
  radius: 1000,
});

const deviceConfig = reactive({
  trustLevel: 'trusted',
  deviceId: '',
});

const rateConfig = reactive({
  type: 'count',
  maxCount: 10,
  timeWindow: 'hour',
  minInterval: 60,
});

// 测试数据
const testData = reactive({
  userId: '',
  resource: '',
  action: '',
  context: '',
});

const testUsers = ref([
  { id: '1', name: '张管理员' },
  { id: '2', name: '李主管' },
  { id: '3', name: '王工作人员' },
]);

const roleOptions = ref([
  { label: '村级管理员', value: 'village_admin' },
  { label: '部门主管', value: 'department_head' },
  { label: '工作人员', value: 'staff' },
  { label: '村民', value: 'villager' },
]);

const ruleRules = {
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入规则描述', trigger: 'blur' }],
  type: [{ required: true, message: '请选择规则类型', trigger: 'change' }],
  targetRoles: [{ type: 'array', required: true, message: '请选择目标角色', trigger: 'change' }],
};

// 计算属性
const filteredRules = computed(() => {
  let result = rules.value;

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(
      rule =>
        rule.name.toLowerCase().includes(keyword) ||
        rule.description.toLowerCase().includes(keyword)
    );
  }

  if (filterType.value) {
    result = result.filter(rule => rule.type === filterType.value);
  }

  if (filterStatus.value) {
    const enabled = filterStatus.value === 'enabled';
    result = result.filter(rule => rule.enabled === enabled);
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

const handleSelectionChange = selection => {
  selectedRules.value = selection;
};

const getTypeColor = type => {
  const colors = {
    time_based: '#409eff',
    location_based: '#67c23a',
    device_trust: '#e6a23c',
    rate_limit: '#f56c6c',
  };
  return colors[type] || '#909399';
};

const getTypeIcon = type => {
  const icons = {
    time_based: Clock,
    location_based: Location,
    device_trust: Iphone,
    rate_limit: Timer,
  };
  return icons[type] || 'Document';
};

const getTypeLabel = type => {
  const labels = {
    time_based: '时间规则',
    location_based: '位置规则',
    device_trust: '设备规则',
    rate_limit: '频率规则',
  };
  return labels[type] || '未知规则';
};

const getTypeTagType = type => {
  const types = {
    time_based: 'primary',
    location_based: 'success',
    device_trust: 'warning',
    rate_limit: 'danger',
  };
  return types[type] || 'info';
};

const getRoleName = roleId => {
  const role = roleOptions.value.find(r => r.value === roleId);
  return role ? role.label : roleId;
};

const toggleRuleStatus = async rule => {
  try {
    // 调用API更新规则状态
    ElMessage.success(`规则"${rule.name}"已${rule.enabled ? '启用' : '禁用'}`);
  } catch (error) {
    rule.enabled = !rule.enabled;
    ElMessage.error('更新规则状态失败');
  }
};

const editRule = rule => {
  isEditing.value = true;
  Object.assign(ruleForm, rule);

  // 根据类型加载配置
  if (rule.type === 'time_based') {
    Object.assign(timeConfig, rule.config);
  } else if (rule.type === 'location_based') {
    Object.assign(locationConfig, rule.config);
  } else if (rule.type === 'device_trust') {
    Object.assign(deviceConfig, rule.config);
  } else if (rule.type === 'rate_limit') {
    Object.assign(rateConfig, rule.config);
  }

  ruleDialogVisible.value = true;
};

const handleRuleTypeChange = type => {
  // 重置配置
  Object.assign(timeConfig, { startTime: '', endTime: '', days: [] });
  Object.assign(locationConfig, { type: 'village', coordinates: '', radius: 1000 });
  Object.assign(deviceConfig, { trustLevel: 'trusted', deviceId: '' });
  Object.assign(rateConfig, { type: 'count', maxCount: 10, timeWindow: 'hour', minInterval: 60 });
};

const submitRule = async () => {
  try {
    await ruleFormRef.value.validate();

    // 构建规则配置
    let config = {};
    if (ruleForm.type === 'time_based') {
      config = { ...timeConfig };
    } else if (ruleForm.type === 'location_based') {
      config = { ...locationConfig };
    } else if (ruleForm.type === 'device_trust') {
      config = { ...deviceConfig };
    } else if (ruleForm.type === 'rate_limit') {
      config = { ...rateConfig };
    }

    const ruleData = {
      ...ruleForm,
      config,
      createdAt: isEditing.value ? ruleForm.createdAt : new Date(),
    };

    if (isEditing.value) {
      const index = rules.value.findIndex(r => r.id === ruleForm.id);
      rules.value[index] = ruleData;
      ElMessage.success('规则更新成功');
    } else {
      ruleData.id = Date.now().toString();
      ruleData.stats = { executions: 0, allowed: 0, denied: 0 };
      rules.value.push(ruleData);
      ElMessage.success('规则创建成功');
    }

    ruleDialogVisible.value = false;
  } catch (error) {
    console.error('保存规则失败:', error);
  }
};

const openTestRuleDialog = rule => {
  testRule.value = rule;
  testResult.value = null;
  Object.assign(testData, {
    userId: '',
    resource: '',
    action: '',
    context: '',
  });
  testRuleDialogVisible.value = true;
};

const executeRuleTest = async () => {
  try {
    if (!testData.userId || !testData.resource || !testData.action) {
      ElMessage.warning('请填写完整的测试参数');
      return;
    }

    // 模拟测试执行
    await new Promise(resolve => setTimeout(resolve, 1000));

    testResult.value = {
      allowed: Math.random() > 0.3,
      reason: Math.random() > 0.3 ? '规则验证通过' : '规则条件不满足',
      executionTime: Math.floor(Math.random() * 100) + 'ms',
    };

    ElMessage.success('测试执行完成');
  } catch (error) {
    ElMessage.error('测试执行失败');
  }
};

const handleRuleAction = async command => {
  const [action, ruleId] = command.split('-');
  const rule = rules.value.find(r => r.id === ruleId);

  switch (action) {
    case 'copy':
      isEditing.value = false;
      Object.assign(ruleForm, {
        ...rule,
        name: rule.name + '_副本',
        id: null,
      });
      ruleDialogVisible.value = true;
      break;

    case 'export':
      ElMessage.info('导出规则功能待实现');
      break;

    case 'delete':
      try {
        await ElMessageBox.confirm(`确定要删除规则"${rule.name}"吗？`, '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        });

        const index = rules.value.findIndex(r => r.id === ruleId);
        rules.value.splice(index, 1);
        ElMessage.success('规则删除成功');
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除规则失败');
        }
      }
      break;
  }
};

const showCreateRuleDialog = () => {
  isEditing.value = false;
  Object.assign(ruleForm, {
    name: '',
    description: '',
    type: '',
    priority: 'medium',
    targetRoles: [],
    conditions: [],
    enabled: true,
  });
  handleRuleTypeChange('');
  ruleDialogVisible.value = true;
};

const showImportRulesDialog = () => {
  ElMessage.info('导入规则功能待实现');
};

const exportRules = () => {
  ElMessage.info('导出规则功能待实现');
};

const batchEnable = async () => {
  try {
    selectedRules.value.forEach(rule => {
      rule.enabled = true;
    });
    ElMessage.success(`已启用 ${selectedRules.value.length} 个规则`);
    selectedRules.value = [];
  } catch (error) {
    ElMessage.error('批量启用失败');
  }
};

const batchDisable = async () => {
  try {
    selectedRules.value.forEach(rule => {
      rule.enabled = false;
    });
    ElMessage.success(`已禁用 ${selectedRules.value.length} 个规则`);
    selectedRules.value = [];
  } catch (error) {
    ElMessage.error('批量禁用失败');
  }
};

const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRules.value.length} 个规则吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    selectedRules.value.forEach(rule => {
      const index = rules.value.findIndex(r => r.id === rule.id);
      rules.value.splice(index, 1);
    });

    ElMessage.success(`已删除 ${selectedRules.value.length} 个规则`);
    selectedRules.value = [];
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败');
    }
  }
};

// 工具方法
const formatDateTime = date => {
  return new Date(date).toLocaleString();
};

const formatRuleConfig = config => {
  return JSON.stringify(config, null, 2);
};

// 生命周期
onMounted(() => {
  // 初始化数据
});
</script>

<style lang="scss" scoped>
.permission-rules-config {
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

  .rules-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h3 {
        margin: 0;
        font-size: 16px;
        color: #2c3e50;
      }
    }

    .rule-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .batch-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #f5f7fa;
      border-radius: 4px;
      margin-top: 16px;
    }
  }

  .rule-detail {
    .rule-config-section {
      margin-top: 24px;

      h4 {
        margin-bottom: 12px;
        color: #2c3e50;
      }

      .config-content {
        padding: 16px;
        background: #f5f7fa;
        border-radius: 4px;

        pre {
          margin: 0;
          font-family: monospace;
          font-size: 14px;
          color: #2c3e50;
          white-space: pre-wrap;
        }
      }
    }

    .rule-stats-section {
      margin-top: 24px;

      h4 {
        margin-bottom: 16px;
        color: #2c3e50;
      }
    }
  }

  .rule-config-form {
    padding: 16px;
    background: #f5f7fa;
    border-radius: 4px;

    .time-separator,
    .unit {
      margin: 0 8px;
      color: #606266;
    }
  }

  .rule-test {
    .rule-description {
      color: #606266;
      margin-bottom: 24px;
    }

    .test-actions {
      text-align: center;
      margin: 24px 0;
    }

    .test-result {
      margin-top: 24px;

      h5 {
        margin-bottom: 12px;
        color: #2c3e50;
      }
    }
  }

  :deep(.danger-item) {
    color: #f56c6c;
  }
}
</style>
