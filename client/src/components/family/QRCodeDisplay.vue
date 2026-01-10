<template>
  <el-dialog :model-value="modelValue" title="家庭二维码" width="500px" @close="handleClose">
    <div v-if="family" class="qrcode-container">
      <!-- 二维码图片 -->
      <div class="qrcode-wrapper">
        <div v-html="qrcodeImage" class="qrcode-image"></div>
      </div>

      <!-- 家庭信息 -->
      <div class="family-info">
        <h3>{{ family.headOfHousehold?.name }}家</h3>
        <p class="house-number">{{ family.houseNumber }}</p>
        <p class="address">{{ family.fullAddress }}</p>
        <p class="member-count">家庭成员: {{ family.memberCount }}人</p>
      </div>

      <!-- 二维码状态 -->
      <el-alert v-if="!isQRCodeValid" title="二维码已失效" type="error" :closable="false" show-icon>
        <template #default>
          <span v-if="family.qrCode?.status === 'EXPIRED'">二维码已过期</span>
          <span v-else-if="family.qrCode?.status === 'REVOKED'">二维码已撤销</span>
        </template>
      </el-alert>

      <el-alert
        v-else-if="family.qrCode?.expiresAt"
        :title="`有效期至: ${formatDate(family.qrCode.expiresAt)}`"
        type="info"
        :closable="false"
        show-icon
      />

      <el-alert v-else title="永久有效" type="success" :closable="false" show-icon />
    </div>

    <template #footer>
      <el-button @click="handleDownload" :disabled="!isQRCodeValid">
        <el-icon><Download /></el-icon>
        下载二维码
      </el-button>
      <el-button type="primary" @click="handlePrint" :disabled="!isQRCodeValid">
        <el-icon><Printer /></el-icon>
        打印
      </el-button>
      <el-button @click="handleRegenerate">
        <el-icon><Refresh /></el-icon>
        重新生成
      </el-button>
    </template>

    <!-- 重新生成对话框 -->
    <el-dialog v-model="showRegenerateDialog" title="重新生成二维码" width="400px" append-to-body>
      <el-form label-width="100px">
        <el-form-item label="有效期">
          <el-radio-group v-model="expiresInDays">
            <el-radio :label="null">永久有效</el-radio>
            <el-radio :label="30">30天</el-radio>
            <el-radio :label="90">90天</el-radio>
            <el-radio :label="180">180天</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRegenerateDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmRegenerate">确定</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Download, Printer, Refresh } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  family: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'regenerate', 'print']);

const showRegenerateDialog = ref(false);
const expiresInDays = ref(null);

const qrcodeImage = computed(() => {
  if (!props.family?.qrCode?.imageUrl) return '';
  // 如果是base64图片，直接返回
  if (props.family.qrCode.imageUrl.startsWith('data:')) {
    return `<img src="${props.family.qrCode.imageUrl}" alt="二维码" />`;
  }
  return `<img src="${props.family.qrCode.imageUrl}" alt="二维码" />`;
});

const isQRCodeValid = computed(() => {
  if (!props.family?.qrCode) return false;
  return (
    props.family.qrCode.status === 'ACTIVE' &&
    (!props.family.qrCode.expiresAt || new Date() < new Date(props.family.qrCode.expiresAt))
  );
});

function formatDate(date) {
  return new Date(date).toLocaleDateString('zh-CN');
}

function handleClose() {
  emit('update:modelValue', false);
}

function handleDownload() {
  if (!props.family?.qrCode?.imageUrl) {
    ElMessage.warning('二维码图片不存在');
    return;
  }

  try {
    const link = document.createElement('a');
    link.href = props.family.qrCode.imageUrl;
    link.download = `家庭二维码_${props.family.houseNumber}_${Date.now()}.png`;
    link.click();
    ElMessage.success('下载成功');
  } catch (error) {
    ElMessage.error('下载失败');
  }
}

function handlePrint() {
  emit('print', props.family._id);

  // 实际应用中应该调用打印功能
  window.print();
}

function handleRegenerate() {
  showRegenerateDialog.value = true;
}

async function confirmRegenerate() {
  emit('regenerate', props.family._id, expiresInDays.value);
  showRegenerateDialog.value = false;
}
</script>

<style scoped lang="scss">
.qrcode-container {
  text-align: center;

  .qrcode-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;

    .qrcode-image {
      :deep(img) {
        width: 300px;
        height: 300px;
        border: 1px solid #dcdfe6;
        border-radius: 8px;
      }
    }
  }

  .family-info {
    margin: 20px 0;
    padding: 20px;
    background-color: #f5f7fa;
    border-radius: 8px;

    h3 {
      margin: 0 0 10px 0;
      font-size: 20px;
      color: #303133;
    }

    .house-number {
      margin: 5px 0;
      font-size: 16px;
      font-weight: bold;
      color: #409eff;
    }

    .address {
      margin: 5px 0;
      font-size: 14px;
      color: #606266;
    }

    .member-count {
      margin: 5px 0;
      font-size: 14px;
      color: #909399;
    }
  }

  .el-alert {
    margin-bottom: 10px;
  }
}
</style>
