<template>
  <el-card class="encryption-status-card">
    <template #header>
      <div class="card-header">
        <span class="title">
          <el-icon><Lock /></el-icon>
          数据加密状态
        </span>
        <el-button type="primary" size="small" @click="refreshStatus" :loading="loading">
          刷新
        </el-button>
      </div>
    </template>

    <!-- 加密状态概览 -->
    <div class="status-overview">
      <div class="status-item">
        <div class="status-icon" :class="encryptionStatus.status">
          <el-icon v-if="encryptionStatus.status === 'active'"><SuccessFilled /></el-icon>
          <el-icon v-else><Warning /></el-icon>
        </div>
        <div class="status-info">
          <div class="status-label">加密状态</div>
          <div class="status-value">{{ getStatusName(encryptionStatus.status) }}</div>
        </div>
      </div>

      <div class="status-item">
        <div class="status-icon algorithm">
          <el-icon><Key /></el-icon>
        </div>
        <div class="status-info">
          <div class="status-label">加密算法</div>
          <div class="status-value">{{ encryptionStatus.algorithm?.aes }}</div>
        </div>
      </div>

      <div class="status-item">
        <div class="status-icon key-length">
          <el-icon><Histogram /></el-icon>
        </div>
        <div class="status-info">
          <div class="status-label">密钥长度</div>
          <div class="status-value">{{ encryptionStatus.keyInfo?.keyLength }} 位</div>
        </div>
      </div>
    </div>

    <!-- 密钥轮换提醒 -->
    <el-alert
      v-if="needRotation"
      type="warning"
      title="密钥轮换提醒"
      :description="`距离上次密钥更新已过${daysSinceRotation}天，建议定期轮换密钥以确保数据安全`"
      show-icon
      :closable="false"
      style="margin-bottom: 20px"
    >
      <template #default>
        <el-button
          type="warning"
          size="small"
          @click="rotateKeys"
          :loading="rotating"
          style="margin-left: 10px"
        >
          立即轮换
        </el-button>
      </template>
    </el-alert>

    <!-- 安全等级评估 -->
    <div class="security-level">
      <h4>安全等级评估</h4>
      <el-progress
        :percentage="securityScore"
        :color="getProgressColor(securityScore)"
        :stroke-width="20"
        text-inside
      />
      <div class="level-description">
        {{ getLevelDescription(securityScore) }}
      </div>
    </div>

    <!-- 加密配置详情 -->
    <el-divider>加密配置</el-divider>

    <el-descriptions :column="2" border>
      <el-descriptions-item label="AES算法">
        {{ encryptionStatus.algorithm?.aes }}
      </el-descriptions-item>
      <el-descriptions-item label="RSA算法">
        {{ encryptionStatus.algorithm?.rsa }}
      </el-descriptions-item>
      <el-descriptions-item label="哈希算法">
        {{ encryptionStatus.algorithm?.hash }}
      </el-descriptions-item>
      <el-descriptions-item label="最后更新">
        {{ formatDate(encryptionStatus.keyInfo?.lastRotated) }}
      </el-descriptions-item>
    </el-descriptions>

    <!-- 操作建议 -->
    <el-divider>安全建议</el-divider>

    <div class="recommendations">
      <div
        v-for="(recommendation, index) in recommendations"
        :key="index"
        class="recommendation-item"
      >
        <el-icon :color="recommendation.color">
          <component :is="recommendation.icon" />
        </el-icon>
        <span>{{ recommendation.text }}</span>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Lock,
  SuccessFilled,
  Warning,
  Key,
  Histogram,
  CircleCheck,
  CircleClose,
  InfoFilled,
} from '@element-plus/icons-vue';
import { securityApi } from '@/api/security';

// 加密状态
const encryptionStatus = ref({
  status: 'active',
  algorithm: {
    aes: 'aes-256-gcm',
    rsa: 'rsa-oaep-2048',
    hash: 'sha256',
  },
  keyInfo: {
    keyLength: 256,
    lastRotated: new Date(),
  },
});

// 加载状态
const loading = ref(false);
const rotating = ref(false);

// 安全评分
const securityScore = computed(() => {
  let score = 100;

  // 根据各种因素计算安全评分
  if (encryptionStatus.value.status !== 'active') {
    score -= 30;
  }

  const daysSince = daysSinceRotation.value;
  if (daysSince > 180) {
    score -= 20;
  } else if (daysSince > 90) {
    score -= 10;
  }

  const keyLength = encryptionStatus.value.keyInfo?.keyLength || 0;
  if (keyLength < 256) {
    score -= 20;
  }

  return Math.max(0, score);
});

// 距离上次轮换的天数
const daysSinceRotation = computed(() => {
  if (!encryptionStatus.value.keyInfo?.lastRotated) return 0;

  const lastRotated = new Date(encryptionStatus.value.keyInfo.lastRotated);
  const now = new Date();
  const diff = now - lastRotated;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// 是否需要轮换
const needRotation = computed(() => {
  return daysSinceRotation.value >= 90;
});

// 安全建议
const recommendations = computed(() => {
  const list = [];

  if (encryptionStatus.value.status !== 'active') {
    list.push({
      icon: CircleClose,
      color: '#f56c6c',
      text: '加密服务未激活，请立即检查',
    });
  }

  if (daysSinceRotation.value >= 180) {
    list.push({
      icon: Warning,
      color: '#e6a23c',
      text: '密钥使用时间过长，建议尽快轮换',
    });
  } else if (daysSinceRotation.value >= 90) {
    list.push({
      icon: InfoFilled,
      color: '#409eff',
      text: '密钥使用时间较长，建议定期轮换',
    });
  }

  if (securityScore.value >= 90) {
    list.push({
      icon: CircleCheck,
      color: '#67c23a',
      text: '系统加密状态良好，继续保持',
    });
  }

  return list;
});

// 获取状态名称
const getStatusName = status => {
  const nameMap = {
    active: '正常',
    inactive: '未激活',
    error: '错误',
  };
  return nameMap[status] || status;
};

// 获取进度条颜色
const getProgressColor = score => {
  if (score >= 90) return '#67c23a';
  if (score >= 70) return '#409eff';
  if (score >= 50) return '#e6a23c';
  return '#f56c6c';
};

// 获取等级描述
const getLevelDescription = score => {
  if (score >= 90) return '安全等级：优秀 - 数据保护措施完善';
  if (score >= 70) return '安全等级：良好 - 数据保护措施基本完善';
  if (score >= 50) return '安全等级：一般 - 建议加强数据保护措施';
  return '安全等级：较差 - 请立即检查并加强安全措施';
};

// 格式化日期
const formatDate = date => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

// 刷新状态
const refreshStatus = async () => {
  try {
    loading.value = true;
    const response = await securityApi.getEncryptionStats();

    if (response.success) {
      encryptionStatus.value = response.data;
      ElMessage.success('刷新成功');
    } else {
      ElMessage.error('刷新失败');
    }
  } catch (error) {
    ElMessage.error('刷新失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 密钥轮换
const rotateKeys = async () => {
  try {
    await ElMessageBox.confirm(
      '密钥轮换将生成新的加密密钥，旧密钥将被备份。此操作不可逆，是否继续？',
      '确认密钥轮换',
      {
        type: 'warning',
        confirmButtonText: '确认轮换',
        cancelButtonText: '取消',
      }
    );

    rotating.value = true;
    const response = await securityApi.rotateKeys();

    if (response.success) {
      ElMessage.success('密钥轮换成功');
      refreshStatus();
    } else {
      ElMessage.error(response.message || '密钥轮换失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('密钥轮换失败');
      console.error(error);
    }
  } finally {
    rotating.value = false;
  }
};

onMounted(() => {
  refreshStatus();
});
</script>

<style scoped>
.encryption-status-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.title .el-icon {
  margin-right: 8px;
  color: #409eff;
}

.status-overview {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.status-item {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
}

.status-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.status-icon.active {
  background: #67c23a;
}

.status-icon.inactive,
.status-icon.error {
  background: #f56c6c;
}

.status-icon.algorithm {
  background: #409eff;
}

.status-icon.key-length {
  background: #e6a23c;
}

.status-info {
  flex: 1;
}

.status-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 5px;
}

.status-value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.security-level {
  margin-bottom: 20px;
}

.security-level h4 {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #606266;
}

.level-description {
  margin-top: 10px;
  font-size: 13px;
  color: #909399;
  text-align: center;
}

.recommendations {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recommendation-item {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 14px;
  color: #606266;
}

.recommendation-item .el-icon {
  margin-right: 10px;
  font-size: 18px;
}
</style>
