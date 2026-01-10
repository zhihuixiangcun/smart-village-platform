<template>
  <div class="qr-code-generator">
    <div class="qr-container" ref="qrContainer">
      <canvas ref="qrCanvas"></canvas>
    </div>
    <div class="qr-info" v-if="showInfo">
      <p class="qr-title">{{ title }}</p>
      <p class="qr-description">{{ description }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import QRCode from 'qrcode';

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    default: 200,
  },
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  showInfo: {
    type: Boolean,
    default: true,
  },
  color: {
    type: String,
    default: '#000000',
  },
  backgroundColor: {
    type: String,
    default: '#FFFFFF',
  },
});

const qrCanvas = ref();
const qrContainer = ref();

const generateQRCode = async () => {
  if (!qrCanvas.value || !props.text) return;

  try {
    await QRCode.toCanvas(qrCanvas.value, props.text, {
      width: props.size,
      margin: 2,
      color: {
        dark: props.color,
        light: props.backgroundColor,
      },
      errorCorrectionLevel: 'M',
    });
  } catch (error) {
    console.error('QR Code generation failed:', error);
  }
};

const downloadQRCode = () => {
  if (!qrCanvas.value) return;

  const link = document.createElement('a');
  link.download = `${props.title || 'qrcode'}.png`;
  link.href = qrCanvas.value.toDataURL();
  link.click();
};

const getQRCodeDataURL = () => {
  return qrCanvas.value?.toDataURL() || '';
};

defineExpose({
  downloadQRCode,
  getQRCodeDataURL,
});

onMounted(() => {
  generateQRCode();
});

watch(() => props.text, generateQRCode);
watch(() => props.size, generateQRCode);
watch(() => props.color, generateQRCode);
watch(() => props.backgroundColor, generateQRCode);
</script>

<style lang="scss" scoped>
.qr-code-generator {
  display: inline-block;
  text-align: center;

  .qr-container {
    display: inline-block;
    padding: 10px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    canvas {
      display: block;
    }
  }

  .qr-info {
    margin-top: 10px;

    .qr-title {
      font-weight: 600;
      color: #303133;
      margin: 0 0 5px 0;
    }

    .qr-description {
      font-size: 12px;
      color: #909399;
      margin: 0;
    }
  }
}
</style>
