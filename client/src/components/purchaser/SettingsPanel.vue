<template>
  <div class="settings-panel">
    <el-card>
      <template #header>
        <div class="panel-header">
          <el-icon><Setting /></el-icon>
          <span>设置</span>
        </div>
      </template>

      <el-form :model="formData" label-width="120px" label-position="left">
        <!-- 通知设置 -->
        <div class="setting-section">
          <h4 class="section-title">通知设置</h4>
          <el-form-item label="推送通知">
            <el-switch v-model="formData.pushNotifications" />
            <span class="form-tip">接收应用内推送通知</span>
          </el-form-item>
          <el-form-item label="邮件通知">
            <el-switch v-model="formData.emailNotifications" />
            <span class="form-tip">接收邮件通知</span>
          </el-form-item>
          <el-form-item label="短信通知">
            <el-switch v-model="formData.smsNotifications" />
            <span class="form-tip">接收短信通知（重要订单）</span>
          </el-form-item>
        </div>

        <el-divider />

        <!-- 推荐设置 -->
        <div class="setting-section">
          <h4 class="section-title">推荐设置</h4>
          <el-form-item label="推荐范围">
            <el-slider
              v-model="formData.recommendationRadius"
              :min="10"
              :max="200"
              :step="10"
              :marks="radiusMarks"
              show-stops
            />
            <span class="form-tip">推荐距离范围（公里）</span>
          </el-form-item>
        </div>

        <el-divider />

        <!-- 语言设置 -->
        <div class="setting-section">
          <h4 class="section-title">语言设置</h4>
          <el-form-item label="语言偏好">
            <el-select v-model="formData.language" placeholder="选择语言">
              <el-option label="简体中文" value="zh-CN" />
              <el-option label="繁体中文" value="zh-TW" />
              <el-option label="English" value="en" />
            </el-select>
          </el-form-item>
        </div>

        <el-divider />

        <!-- 账户安全 -->
        <div class="setting-section">
          <h4 class="section-title">账户安全</h4>
          <el-form-item label="修改密码">
            <el-button @click="showChangePasswordDialog = true"> 修改密码 </el-button>
          </el-form-item>
          <el-form-item label="绑定手机">
            <div class="phone-display">
              <span>{{ maskedPhone }}</span>
              <el-button type="primary" text>更换</el-button>
            </div>
          </el-form-item>
        </div>

        <el-divider />

        <!-- 隐私设置 -->
        <div class="setting-section">
          <h4 class="section-title">隐私设置</h4>
          <el-form-item label="位置信息">
            <el-switch v-model="formData.shareLocation" />
            <span class="form-tip">允许供应商查看您的大致位置</span>
          </el-form-item>
          <el-form-item label="采购历史">
            <el-switch v-model="formData.shareHistory" />
            <span class="form-tip">在个人主页显示采购历史</span>
          </el-form-item>
        </div>

        <!-- 操作按钮 -->
        <div class="setting-actions">
          <el-button type="primary" @click="handleSave" :loading="saving"> 保存设置 </el-button>
          <el-button @click="handleReset">重置</el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 修改密码对话框 -->
    <el-dialog v-model="showChangePasswordDialog" title="修改密码" width="400px">
      <el-form :model="passwordForm" label-width="100px">
        <el-form-item label="当前密码">
          <el-input v-model="passwordForm.currentPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="passwordForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showChangePasswordDialog = false">取消</el-button>
        <el-button type="primary" @click="handleChangePassword">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Setting } from '@element-plus/icons-vue';
import api from '@/api';

const props = defineProps({
  preferences: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['save']);

const saving = ref(false);
const showChangePasswordDialog = ref(false);

const formData = reactive({
  pushNotifications: true,
  emailNotifications: true,
  smsNotifications: false,
  recommendationRadius: 50,
  language: 'zh-CN',
  shareLocation: false,
  shareHistory: true,
});

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const radiusMarks = {
  10: '10km',
  50: '50km',
  100: '100km',
  200: '200km',
};

// 模拟手机号脱敏
const maskedPhone = computed(() => {
  return '138****5678';
});

// 初始化表单数据
onMounted(() => {
  if (props.preferences) {
    Object.assign(formData, props.preferences);
  }
});

// 保存设置
const handleSave = async () => {
  saving.value = true;
  try {
    emit('save', formData);
  } finally {
    saving.value = false;
  }
};

// 重置
const handleReset = () => {
  if (props.preferences) {
    Object.assign(formData, props.preferences);
  }
  ElMessage.info('已重置为默认设置');
};

// 修改密码
const handleChangePassword = async () => {
  if (!passwordForm.currentPassword) {
    ElMessage.warning('请输入当前密码');
    return;
  }
  if (!passwordForm.newPassword) {
    ElMessage.warning('请输入新密码');
    return;
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致');
    return;
  }

  try {
    const response = await api.put('/api/v1/purchaser/change-password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
    if (response.success) {
      ElMessage.success('密码修改成功');
      showChangePasswordDialog.value = false;
      // 清空表单
      passwordForm.currentPassword = '';
      passwordForm.newPassword = '';
      passwordForm.confirmPassword = '';
    }
  } catch (error) {
    console.error('修改密码失败', error);
    ElMessage.error('修改密码失败');
  }
};
</script>

<style scoped>
.settings-panel {
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.setting-section {
  padding: 16px 0;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 16px;
}

.form-tip {
  margin-left: 12px;
  font-size: 13px;
  color: #909399;
}

.phone-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.phone-display span {
  font-size: 14px;
  color: #606266;
}

.setting-actions {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f5f7fa;
  display: flex;
  gap: 12px;
}

:deep(.el-slider__marks-text) {
  font-size: 12px;
}

@media (max-width: 768px) {
  :deep(.el-form-item__label) {
    width: 100% !important;
    text-align: left;
  }

  :deep(.el-form-item__content) {
    margin-left: 0 !important;
  }

  .form-tip {
    display: block;
    margin: 8px 0 0;
  }
}
</style>
