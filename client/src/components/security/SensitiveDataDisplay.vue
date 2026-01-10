<template>
  <div class="sensitive-data-display">
    <!-- 已脱敏显示 -->
    <div v-if="!showFullData" class="masked-view" @click="handleClick">
      <slot name="masked">
        <div class="masked-content">
          <span class="masked-value">{{ maskedValue }}</span>
          <el-icon class="view-icon"><View /></el-icon>
        </div>
      </slot>
    </div>

    <!-- 完整数据显示 -->
    <div v-else class="full-view">
      <slot name="full">
        <div class="full-content">
          <span class="full-value">{{ fullValue }}</span>
          <el-icon class="hide-icon" @click="hideFullData"><Hide /></el-icon>
        </div>
      </slot>
    </div>

    <!-- 人脸识别验证对话框 -->
    <el-dialog
      v-model="showFaceAuthDialog"
      title="身份验证"
      width="400px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <div class="face-auth-container">
        <el-alert
          type="info"
          title="需要人脸识别验证"
          description="查看完整敏感信息需要进行人脸识别验证"
          show-icon
          :closable="false"
          style="margin-bottom: 20px"
        />

        <!-- 人脸识别组件占位 -->
        <div class="face-auth-placeholder">
          <el-icon :size="80"><User /></el-icon>
          <p>请将脸部对准摄像头</p>
          <el-button type="primary" @click="startFaceAuth" :loading="authenticating" size="large">
            {{ authenticating ? '验证中...' : '开始验证' }}
          </el-button>
        </div>

        <div class="auth-tips">
          <h4>验证提示：</h4>
          <ul>
            <li>请确保光线充足</li>
            <li>请正对摄像头</li>
            <li>请保持面部清晰可见</li>
          </ul>
        </div>
      </div>

      <template #footer>
        <el-button @click="cancelAuth" :disabled="authenticating">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { View, Hide, User } from '@element-plus/icons-vue';
import { securityApi } from '@/api/security';

const props = defineProps({
  // 字段类型
  fieldType: {
    type: String,
    required: true,
  },
  // 完整值
  value: {
    type: String,
    default: '',
  },
  // 记录ID
  recordId: {
    type: String,
    required: true,
  },
  // 是否需要点击验证
  requireAuth: {
    type: Boolean,
    default: true,
  },
  // 是否已通过验证
  preVerified: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['view', 'hide']);

// 显示状态
const showFullData = ref(props.preVerified);
const showFaceAuthDialog = ref(false);
const authenticating = ref(false);

// 脱敏值
const maskedValue = computed(() => {
  if (!props.value) return '';

  const fieldType = props.fieldType;
  const value = props.value;

  // 根据字段类型进行脱敏
  switch (fieldType) {
    case 'id_card':
      return value.replace(/^(.{6})(.*)(.{4})$/, '$1****$3');
    case 'phone':
      return value.replace(/^(.{3})(.*)(.{4})$/, '$1****$3');
    case 'bank_card':
      return value.replace(/^(.{4})(.*)(.{4})$/, '$1********$3');
    case 'email':
      return value.replace(/^([^@]+)(@.*)$/, '$1***$2');
    case 'name':
      return value.replace(/^(.{1})(.*)$/, '$1*');
    case 'address':
      return value.replace(/(.{2}省.{2,6}市).*(区|县).*/, '$1****$2');
    default:
      return value.substring(0, 3) + '****' + value.substring(value.length - 3);
  }
});

// 完整值
const fullValue = computed(() => {
  return props.value;
});

// 点击处理
const handleClick = () => {
  if (!props.requireAuth) {
    showFullData.value = true;
    emit('view', props.fieldType);
    return;
  }

  if (showFullData.value) {
    return;
  }

  // 显示人脸识别对话框
  showFaceAuthDialog.value = true;
};

// 开始人脸识别
const startFaceAuth = async () => {
  try {
    authenticating.value = true;

    // 调用API验证权限
    const response = await securityApi.requestViewFullInfo({
      fieldType: props.fieldType,
      recordId: props.recordId,
      faceVerified: false,
    });

    if (response.success && !response.requireFaceAuth) {
      // 不需要人脸识别，直接显示
      showFullData.value = true;
      showFaceAuthDialog.value = false;
      emit('view', props.fieldType);
      ElMessage.success('验证通过');
    } else if (response.requireFaceAuth) {
      // 需要人脸识别
      // 这里应该调用真实的人脸识别SDK
      // 模拟人脸识别过程
      await simulateFaceAuth();
    } else {
      ElMessage.error(response.message || '验证失败');
    }
  } catch (error) {
    ElMessage.error('验证失败');
    console.error(error);
  } finally {
    authenticating.value = false;
  }
};

// 模拟人脸识别（实际项目中应该使用真实的人脸识别SDK）
const simulateFaceAuth = async () => {
  return new Promise(resolve => {
    setTimeout(async () => {
      // 模拟人脸识别成功
      const response = await securityApi.requestViewFullInfo({
        fieldType: props.fieldType,
        recordId: props.recordId,
        faceVerified: true,
      });

      if (response.success) {
        showFullData.value = true;
        showFaceAuthDialog.value = false;
        emit('view', props.fieldType);
        ElMessage.success('人脸识别成功');
      } else {
        ElMessage.error(response.message || '验证失败');
      }

      resolve();
    }, 2000);
  });
};

// 取消验证
const cancelAuth = () => {
  showFaceAuthDialog.value = false;
};

// 隐藏完整数据
const hideFullData = () => {
  showFullData.value = false;
  emit('hide', props.fieldType);
};
</script>

<style scoped>
.sensitive-data-display {
  display: inline-block;
}

.masked-view {
  cursor: pointer;
  transition: all 0.3s;
}

.masked-view:hover .masked-content {
  background: #e8f4ff;
  border-color: #409eff;
}

.masked-content {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  transition: all 0.3s;
}

.masked-value {
  font-family: 'Courier New', monospace;
  font-size: 16px;
  color: #606266;
  letter-spacing: 2px;
}

.view-icon {
  margin-left: 10px;
  color: #409eff;
  font-size: 18px;
}

.full-view {
  display: inline-block;
}

.full-content {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: #f0f9ff;
  border: 1px solid #409eff;
  border-radius: 6px;
}

.full-value {
  font-family: 'Courier New', monospace;
  font-size: 16px;
  color: #303133;
  letter-spacing: 2px;
  font-weight: bold;
}

.hide-icon {
  margin-left: 10px;
  color: #909399;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s;
}

.hide-icon:hover {
  color: #409eff;
}

.face-auth-container {
  text-align: center;
}

.face-auth-placeholder {
  padding: 30px;
  background: #f5f7fa;
  border-radius: 12px;
  margin-bottom: 20px;
}

.face-auth-placeholder .el-icon {
  color: #409eff;
  margin-bottom: 15px;
}

.face-auth-placeholder p {
  margin: 10px 0 20px;
  color: #606266;
  font-size: 14px;
}

.auth-tips {
  text-align: left;
  padding: 15px;
  background: #fffbeb;
  border-left: 4px solid #e6a23c;
  border-radius: 4px;
}

.auth-tips h4 {
  margin: 0 0 10px 0;
  color: #e6a23c;
  font-size: 14px;
}

.auth-tips ul {
  margin: 0;
  padding-left: 20px;
}

.auth-tips li {
  margin: 5px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}
</style>
