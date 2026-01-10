<template>
  <div class="privacy-settings-container">
    <el-card class="header-card">
      <h2>隐私保护设置</h2>
      <p class="description">管理数据脱敏规则和访问权限</p>
    </el-card>

    <!-- 隐私规则列表 -->
    <el-card class="rules-card">
      <template #header>
        <div class="rules-header">
          <span>脱敏规则</span>
          <el-button type="primary" @click="showRuleDialog = true" :icon="Plus">
            添加规则
          </el-button>
        </div>
      </template>

      <el-table :data="privacyRules" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="name" label="规则名称" width="200" />
        <el-table-column prop="code" label="规则代码" width="180" />
        <el-table-column prop="ruleType" label="数据类型" width="120">
          <template #default="{ row }">
            {{ getRuleTypeName(row.ruleType) }}
          </template>
        </el-table-column>
        <el-table-column prop="maskPattern" label="脱敏模式" width="200" />
        <el-table-column label="需要人脸验证" width="120">
          <template #default="{ row }">
            <el-tag :type="row.requireFaceAuth ? 'warning' : 'info'">
              {{ row.requireFaceAuth ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="enabled" label="状态" width="100">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" @change="toggleRule(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editRule(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteRule(row)"> 删除 </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 查看历史 -->
    <el-card class="history-card">
      <template #header>
        <div class="history-header">
          <span>我的查看记录</span>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="loadViewHistory"
          />
        </div>
      </template>

      <el-table :data="viewHistory" v-loading="historyLoading" stripe style="width: 100%">
        <el-table-column prop="operationName" label="操作" width="150" />
        <el-table-column prop="target.targetName" label="查看内容" width="150" />
        <el-table-column prop="operator.userName" label="操作人" width="120" />
        <el-table-column prop="ipAddress" label="IP地址" width="150" />
        <el-table-column prop="sensitivityLevel" label="敏感级别" width="100">
          <template #default="{ row }">
            <el-tag :type="getSensitivityTagType(row.sensitivityLevel)">
              {{ getSensitivityName(row.sensitivityLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="result" label="结果" width="100">
          <template #default="{ row }">
            <el-tag :type="row.result === 'success' ? 'success' : 'danger'">
              {{ row.result === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="historyPagination.page"
        v-model:page-size="historyPagination.limit"
        :page-sizes="[10, 20, 50]"
        :total="historyPagination.total"
        layout="total, sizes, prev, pager, next"
        @size-change="loadViewHistory"
        @current-change="loadViewHistory"
        style="margin-top: 20px; justify-content: center"
      />
    </el-card>

    <!-- 规则编辑对话框 -->
    <el-dialog
      v-model="showRuleDialog"
      :title="editingRule ? '编辑规则' : '添加规则'"
      width="700px"
    >
      <el-form :model="ruleForm" :rules="ruleRules" ref="ruleFormRef" label-width="140px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="ruleForm.name" placeholder="请输入规则名称" />
        </el-form-item>
        <el-form-item label="规则代码" prop="code">
          <el-input
            v-model="ruleForm.code"
            placeholder="请输入规则代码（英文）"
            :disabled="editingRule !== null"
          />
        </el-form-item>
        <el-form-item label="数据类型" prop="ruleType">
          <el-select v-model="ruleForm.ruleType" placeholder="请选择数据类型" style="width: 100%">
            <el-option label="身份证号" value="id_card" />
            <el-option label="手机号" value="phone" />
            <el-option label="银行卡号" value="bank_card" />
            <el-option label="地址" value="address" />
            <el-option label="邮箱" value="email" />
            <el-option label="姓名" value="name" />
          </el-select>
        </el-form-item>
        <el-form-item label="脱敏模式" prop="maskPattern">
          <el-input v-model="ruleForm.maskPattern" placeholder="例如：***1234" />
        </el-form-item>
        <el-form-item label="保留前几位">
          <el-input-number v-model="ruleForm.displayRule.keepFirst" :min="0" :max="20" />
        </el-form-item>
        <el-form-item label="保留后几位">
          <el-input-number v-model="ruleForm.displayRule.keepLast" :min="0" :max="20" />
        </el-form-item>
        <el-form-item label="掩码字符">
          <el-input v-model="ruleForm.displayRule.maskChar" style="width: 100px" />
        </el-form-item>
        <el-form-item label="允许查看的角色">
          <el-checkbox-group v-model="ruleForm.allowedRoles">
            <el-checkbox label="admin">管理员</el-checkbox>
            <el-checkbox label="village_admin">村委管理员</el-checkbox>
            <el-checkbox label="village_staff">村委工作人员</el-checkbox>
            <el-checkbox label="user">普通用户</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="需要人脸验证">
          <el-switch v-model="ruleForm.requireFaceAuth" />
        </el-form-item>
        <el-form-item label="查看次数限制">
          <el-input-number
            v-model="ruleForm.viewLimit"
            :min="0"
            :max="100"
            placeholder="0表示不限制"
          />
        </el-form-item>
        <el-form-item label="规则描述">
          <el-input
            v-model="ruleForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入规则描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRuleDialog = false">取消</el-button>
        <el-button type="primary" @click="saveRule" :loading="saving"> 保存 </el-button>
      </template>
    </el-dialog>

    <!-- 查看完整信息对话框 -->
    <el-dialog v-model="showViewDialog" title="查看完整信息" width="400px">
      <el-alert
        type="warning"
        title="此操作将被记录"
        description="您的查看行为将被记录在审计日志中"
        show-icon
        :closable="false"
        style="margin-bottom: 20px"
      />

      <el-form label-width="100px">
        <el-form-item label="信息类型">
          <span>{{ viewRequest.fieldType }}</span>
        </el-form-item>
        <el-form-item label="需要验证">
          <el-tag :type="viewRequest.requireFaceAuth ? 'warning' : 'info'">
            {{ viewRequest.requireFaceAuth ? '人脸识别' : '直接查看' }}
          </el-tag>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showViewDialog = false">取消</el-button>
        <el-button
          v-if="!viewRequest.faceVerified && viewRequest.requireFaceAuth"
          type="primary"
          @click="startFaceAuth"
        >
          开始人脸识别
        </el-button>
        <el-button v-else type="primary" @click="confirmView" :loading="viewing">
          确认查看
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { securityApi } from '@/api/security';

// 隐私规则
const privacyRules = ref([]);
const loading = ref(false);

// 查看历史
const viewHistory = ref([]);
const historyLoading = ref(false);
const dateRange = ref([]);
const historyPagination = ref({
  page: 1,
  limit: 20,
  total: 0,
});

// 规则编辑
const showRuleDialog = ref(false);
const editingRule = ref(null);
const saving = ref(false);
const ruleFormRef = ref(null);
const ruleForm = ref({
  name: '',
  code: '',
  ruleType: '',
  maskPattern: '',
  displayRule: {
    keepFirst: 0,
    keepLast: 0,
    maskChar: '*',
  },
  allowedRoles: [],
  requireFaceAuth: false,
  viewLimit: 0,
  description: '',
});

const ruleRules = {
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入规则代码', trigger: 'blur' }],
  ruleType: [{ required: true, message: '请选择数据类型', trigger: 'change' }],
  maskPattern: [{ required: true, message: '请输入脱敏模式', trigger: 'blur' }],
};

// 查看完整信息
const showViewDialog = ref(false);
const viewing = ref(false);
const viewRequest = ref({
  fieldType: '',
  recordId: '',
  requireFaceAuth: false,
  faceVerified: false,
});

// 获取规则类型名称
const getRuleTypeName = type => {
  const nameMap = {
    id_card: '身份证号',
    phone: '手机号',
    bank_card: '银行卡号',
    address: '地址',
    email: '邮箱',
    name: '姓名',
  };
  return nameMap[type] || type;
};

// 获取敏感级别标签类型
const getSensitivityTagType = level => {
  const typeMap = {
    low: 'info',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  };
  return typeMap[level] || 'info';
};

// 获取敏感级别名称
const getSensitivityName = level => {
  const nameMap = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '极高',
  };
  return nameMap[level] || level;
};

// 格式化日期
const formatDate = date => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
};

// 加载隐私规则
const loadPrivacyRules = async () => {
  try {
    loading.value = true;
    const response = await securityApi.getPrivacyRules();

    if (response.success) {
      privacyRules.value = response.data;
    }
  } catch (error) {
    ElMessage.error('加载失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 加载查看历史
const loadViewHistory = async () => {
  try {
    historyLoading.value = true;
    const response = await securityApi.getViewHistory({
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
      page: historyPagination.value.page,
      limit: historyPagination.value.limit,
    });

    if (response.success) {
      viewHistory.value = response.data;
      // 假设API返回分页信息
      historyPagination.value.total = response.data?.length || 0;
    }
  } catch (error) {
    ElMessage.error('加载失败');
    console.error(error);
  } finally {
    historyLoading.value = false;
  }
};

// 切换规则状态
const toggleRule = async rule => {
  try {
    const response = await securityApi.upsertPrivacyRule({
      ...rule,
      _id: rule._id,
    });

    if (response.success) {
      ElMessage.success('状态更新成功');
    } else {
      // 恢复原状态
      rule.enabled = !rule.enabled;
      ElMessage.error(response.message || '更新失败');
    }
  } catch (error) {
    // 恢复原状态
    rule.enabled = !rule.enabled;
    ElMessage.error('更新失败');
    console.error(error);
  }
};

// 编辑规则
const editRule = rule => {
  editingRule.value = rule;
  ruleForm.value = {
    name: rule.name,
    code: rule.code,
    ruleType: rule.ruleType,
    maskPattern: rule.maskPattern,
    displayRule: { ...rule.displayRule },
    allowedRoles: [...rule.allowedRoles],
    requireFaceAuth: rule.requireFaceAuth,
    viewLimit: rule.viewLimit,
    description: rule.description || '',
    _id: rule._id,
  };
  showRuleDialog.value = true;
};

// 保存规则
const saveRule = async () => {
  try {
    await ruleFormRef.value.validate();

    saving.value = true;
    const response = await securityApi.upsertPrivacyRule(ruleForm.value);

    if (response.success) {
      ElMessage.success(editingRule.value ? '更新成功' : '添加成功');
      showRuleDialog.value = false;
      editingRule.value = null;
      loadPrivacyRules();
    } else {
      ElMessage.error(response.message || '保存失败');
    }
  } catch (error) {
    console.error(error);
  } finally {
    saving.value = false;
  }
};

// 删除规则
const deleteRule = async rule => {
  try {
    await ElMessageBox.confirm('确认删除此规则？', '确认', {
      type: 'warning',
    });

    const response = await securityApi.deletePrivacyRule(rule._id);

    if (response.success) {
      ElMessage.success('删除成功');
      loadPrivacyRules();
    } else {
      ElMessage.error(response.message || '删除失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error);
    }
  }
};

// 开始人脸识别
const startFaceAuth = () => {
  // 这里应该调用人脸识别组件
  ElMessage.info('人脸识别功能开发中...');
  // 模拟人脸识别成功
  setTimeout(() => {
    viewRequest.value.faceVerified = true;
    ElMessage.success('人脸识别成功');
  }, 2000);
};

// 确认查看
const confirmView = async () => {
  try {
    viewing.value = true;
    const response = await securityApi.requestViewFullInfo({
      fieldType: viewRequest.value.fieldType,
      recordId: viewRequest.value.recordId,
      faceVerified: viewRequest.value.faceVerified,
    });

    if (response.success) {
      ElMessage.success('验证通过');
      showViewDialog.value = false;
      // 这里应该显示完整信息
    } else {
      ElMessage.error(response.message || '验证失败');
    }
  } catch (error) {
    ElMessage.error('请求失败');
    console.error(error);
  } finally {
    viewing.value = false;
  }
};

onMounted(() => {
  loadPrivacyRules();
  loadViewHistory();
});
</script>

<style scoped>
.privacy-settings-container {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-card h2 {
  margin: 0 0 10px 0;
  color: #303133;
}

.description {
  margin: 0;
  color: #909399;
}

.rules-card,
.history-card {
  margin-bottom: 20px;
}

.rules-header,
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
