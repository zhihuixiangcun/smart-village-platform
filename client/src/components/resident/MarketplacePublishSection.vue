<template>
  <section class="marketplace-publish-section" aria-label="发布商品">
    <!-- 发布按钮 -->
    <div class="publish-trigger">
      <el-button
        type="primary"
        size="large"
        :icon="Plus"
        @click="showPublishDialog"
        style="width: 100%"
      >
        发布商品到集市
      </el-button>
    </div>

    <!-- 发布商品对话框 -->
    <el-dialog
      v-model="publishDialogVisible"
      title="发布商品"
      width="95%"
      :close-on-click-modal="false"
      @close="resetForm"
    >
      <!-- 步骤指示器 -->
      <div class="steps-indicator">
        <div
          v-for="(step, index) in steps"
          :key="index"
          :class="['step', { active: currentStep === index, completed: currentStep > index }]"
        >
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-label">{{ step }}</div>
          <div v-if="index < steps.length - 1" class="step-line"></div>
        </div>
      </div>

      <el-form
        ref="formRef"
        :model="productForm"
        :rules="formRules"
        label-width="80px"
        label-position="top"
      >
        <!-- 步骤1: 上传照片 -->
        <div v-show="currentStep === 0" class="step-content">
          <h3>上传商品照片</h3>
          <p class="step-tip">最多上传9张照片，第一张为封面</p>

          <div class="image-upload-grid">
            <div v-for="(image, index) in productForm.images" :key="index" class="image-item">
              <img :src="getImageUrl(image)" :alt="`商品图片${index + 1}`" />
              <div class="image-actions">
                <span v-if="index === 0" class="cover-badge">封面</span>
                <el-button
                  type="danger"
                  :icon="Delete"
                  circle
                  size="small"
                  @click="removeImage(index)"
                />
              </div>
            </div>

            <div v-if="productForm.images.length < 9" class="upload-trigger" @click="selectImage">
              <el-icon :size="32"><Plus /></el-icon>
              <span>添加照片</span>
            </div>
          </div>

          <!-- 拍照按钮 -->
          <el-button
            type="success"
            :icon="Camera"
            @click="takePhoto"
            style="width: 100%; margin-top: 12px"
          >
            拍照上传
          </el-button>

          <!-- 语音描述按钮 -->
          <el-button
            v-if="supportsSpeechRecognition"
            :icon="Microphone"
            @click="startVoiceDescription"
            style="width: 100%; margin-top: 8px"
            :disabled="isRecording"
          >
            {{ isRecording ? '正在录音...' : '语音描述商品' }}
          </el-button>
        </div>

        <!-- 步骤2: 商品信息 -->
        <div v-show="currentStep === 1" class="step-content">
          <h3>商品信息</h3>

          <el-form-item label="商品名称" prop="name">
            <el-input
              v-model="productForm.name"
              placeholder="如：新鲜红富士苹果"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="价格" required>
            <div class="price-input-group">
              <span class="price-symbol">¥</span>
              <el-input-number
                v-model="productForm.price"
                :min="0"
                :precision="2"
                :step="1"
                controls-position="right"
                style="flex: 1"
              />
              <el-select v-model="productForm.unit" style="width: 100px">
                <el-option label="斤" value="斤" />
                <el-option label="公斤" value="公斤" />
                <el-option label="个" value="个" />
                <el-option label="件" value="件" />
                <el-option label="箱" value="箱" />
              </el-select>
            </div>
          </el-form-item>

          <el-form-item label="分类" prop="category">
            <el-radio-group v-model="productForm.category" size="large">
              <el-radio-button label="agricultural">农产品</el-radio-button>
              <el-radio-button label="supplies">农资</el-radio-button>
              <el-radio-button label="daily">日用品</el-radio-button>
              <el-radio-button label="food">食品</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="数量">
            <el-input-number
              v-model="productForm.stock"
              :min="1"
              label="数量"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="商品标签">
            <el-select
              v-model="productForm.tags"
              multiple
              filterable
              allow-create
              placeholder="选择或输入标签"
              style="width: 100%"
            >
              <el-option label="新鲜" value="新鲜" />
              <el-option label="有机" value="有机" />
              <el-option label="绿色" value="绿色" />
              <el-option label="无公害" value="无公害" />
              <el-option label="自家种植" value="自家种植" />
              <el-option label="包邮" value="包邮" />
              <el-option label="可议价" value="可议价" />
            </el-select>
          </el-form-item>

          <el-form-item label="商品描述" prop="description">
            <el-input
              v-model="productForm.description"
              type="textarea"
              :rows="5"
              placeholder="详细描述您的商品，如品质特点、产地、采摘时间等"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </div>

        <!-- 步骤3: 确认发布 -->
        <div v-show="currentStep === 2" class="step-content">
          <h3>确认信息</h3>

          <div class="preview-card">
            <div class="preview-images">
              <img
                :src="getImageUrl(productForm.images[0])"
                :alt="productForm.name"
                class="main-image"
              />
              <div v-if="productForm.images.length > 1" class="thumbnail-list">
                <img
                  v-for="(image, index) in productForm.images.slice(1, 4)"
                  :key="index"
                  :src="getImageUrl(image)"
                  class="thumbnail"
                />
                <div v-if="productForm.images.length > 4" class="more-count">
                  +{{ productForm.images.length - 4 }}
                </div>
              </div>
            </div>

            <div class="preview-info">
              <h4>{{ productForm.name }}</h4>
              <div class="price-tag">
                <span class="price">¥{{ productForm.price }}</span>
                <span class="unit">/{{ productForm.unit }}</span>
              </div>
              <div class="tags" v-if="productForm.tags.length">
                <el-tag v-for="tag in productForm.tags" :key="tag" size="small" effect="plain">
                  {{ tag }}
                </el-tag>
              </div>
              <p class="description">{{ productForm.description }}</p>
              <div class="meta">
                <span>分类: {{ getCategoryLabel(productForm.category) }}</span>
                <span>库存: {{ productForm.stock }}</span>
              </div>
            </div>
          </div>

          <!-- 发布须知 -->
          <el-alert type="info" :closable="false" show-icon>
            <template #title>
              <div class="notice-content">
                <p>• 发布后商品将在集市展示，其他村民可以查看和购买</p>
                <p>• 请确保商品信息真实准确，虚假信息将被下架</p>
                <p>• 建议及时回复买家咨询，提升成交率</p>
              </div>
            </template>
          </el-alert>
        </div>
      </el-form>

      <!-- 对话框底部 -->
      <template #footer>
        <div class="dialog-footer">
          <el-button v-if="currentStep > 0" @click="previousStep"> 上一步 </el-button>
          <el-button @click="publishDialogVisible = false"> 取消 </el-button>
          <el-button v-if="currentStep < steps.length - 1" type="primary" @click="nextStep">
            下一步
          </el-button>
          <el-button v-else type="primary" :loading="publishing" @click="publishProduct">
            确认发布
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      multiple
      style="display: none"
      @change="handleFileSelect"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Delete, Camera, Microphone } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules, UploadUserFile } from 'element-plus';
import type { PublishProductForm, ProductCategory } from '@/types/marketplace';

// 状态
const publishDialogVisible = ref(false);
const currentStep = ref(0);
const publishing = ref(false);
const isRecording = ref(false);
const supportsSpeechRecognition = ref(false);
const fileInputRef = ref<HTMLInputElement>();
const formRef = ref<FormInstance>();

// 步骤
const steps = ref(['上传照片', '商品信息', '确认发布']);

// 商品表单
const productForm = ref<PublishProductForm>({
  name: '',
  description: '',
  price: 0,
  unit: '斤',
  category: 'agricultural',
  images: [],
  stock: 1,
  tags: [],
});

// 表单验证规则
const formRules = ref<FormRules>({
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' },
  ],
  category: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
  description: [
    { required: true, message: '请输入商品描述', trigger: 'blur' },
    { min: 10, max: 500, message: '长度在 10 到 500 个字符', trigger: 'blur' },
  ],
});

// 方法
const showPublishDialog = () => {
  publishDialogVisible.value = true;
  currentStep.value = 0;
};

const resetForm = () => {
  productForm.value = {
    name: '',
    description: '',
    price: 0,
    unit: '斤',
    category: 'agricultural',
    images: [],
    stock: 1,
    tags: [],
  };
  currentStep.value = 0;
  formRef.value?.resetFields();
};

const nextStep = async () => {
  // 步骤0: 验证至少有一张图片
  if (currentStep.value === 0) {
    if (productForm.value.images.length === 0) {
      ElMessage.warning('请至少上传一张商品照片');
      return;
    }
  }

  // 步骤1: 验证表单
  if (currentStep.value === 1) {
    const valid = await formRef.value?.validate();
    if (!valid) return;
  }

  if (currentStep.value < steps.value.length - 1) {
    currentStep.value++;
  }
};

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const getImageUrl = (image: File | string): string => {
  if (typeof image === 'string') {
    return image;
  }
  return URL.createObjectURL(image);
};

const selectImage = () => {
  fileInputRef.value?.click();
};

const takePhoto = () => {
  // 移动端调用相机
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment'; // 调用后置摄像头
  input.onchange = (e: any) => handleFileSelect(e);
  input.click();
};

// 允许的文件扩展名白名单
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * 严格验证上传的文件
 */
const validateFile = (file: File): { valid: boolean; error?: string } => {
  // 检查文件扩展名
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `不支持的文件格式: ${ext}，仅支持 ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // 检查MIME类型
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: '文件类型不合法，请上传图片文件',
    };
  }

  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `文件过大，请选择${MAX_FILE_SIZE / 1024 / 1024}MB以内的图片`,
    };
  }

  // 检查文件名是否包含特殊字符
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(file.name)) {
    return {
      valid: false,
      error: '文件名包含非法字符',
    };
  }

  return { valid: true };
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files || []);

  if (files.length === 0) return;

  // 限制最多9张
  const availableSlots = 9 - productForm.value.images.length;
  const filesToAdd = files.slice(0, availableSlots);

  // 严格验证每个文件
  const validFiles: File[] = [];
  for (const file of filesToAdd) {
    const validation = validateFile(file);
    if (!validation.valid) {
      ElMessage.warning(`${file.name}: ${validation.error}`);
      continue;
    }
    validFiles.push(file);
  }

  // 添加验证通过的文件
  productForm.value.images.push(...validFiles);

  if (files.length > availableSlots) {
    ElMessage.warning('最多只能上传9张照片');
  }

  // 清空input以允许重复选择同一文件
  if (target) {
    target.value = '';
  }
};

const removeImage = (index: number) => {
  productForm.value.images.splice(index, 1);
};

const startVoiceDescription = () => {
  if (!supportsSpeechRecognition.value) {
    ElMessage.warning('您的浏览器不支持语音识别');
    return;
  }

  isRecording.value = true;

  // TODO: 集成语音识别
  setTimeout(() => {
    isRecording.value = false;
    // 模拟语音转文字
    const mockDescriptions = [
      '自家果园种植的新鲜苹果，不打农药不催熟，口感脆甜多汁',
      '绿色有机蔬菜，今日采摘，新鲜直达',
      '农家散养土鸡蛋，营养丰富，品质保证',
    ];
    const randomDesc = mockDescriptions[Math.floor(Math.random() * mockDescriptions.length)];
    productForm.value.description = randomDesc;
    ElMessage.success('语音识别成功！已自动填充商品描述');
  }, 3000);
};

const getCategoryLabel = (category: ProductCategory): string => {
  const labels: Record<ProductCategory, string> = {
    agricultural: '农产品',
    supplies: '农资',
    daily: '日用品',
    food: '食品',
  };
  return labels[category];
};

const publishProduct = async () => {
  publishing.value = true;

  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500));

    // TODO: 上传图片到服务器
    // TODO: 提交商品数据到后端

    ElMessage.success('商品发布成功！');
    publishDialogVisible.value = false;

    // 触发刷新事件
    // emit('published')
  } catch (error) {
    console.error('发布失败:', error);
    ElMessage.error('发布失败，请重试');
  } finally {
    publishing.value = false;
  }
};

// 生命周期
onMounted(() => {
  // 检查语音识别支持
  supportsSpeechRecognition.value =
    'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
});
</script>

<style lang="scss" scoped>
.market-publish-section {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 16px;
}

.publish-trigger {
  :deep(.el-button) {
    height: 48px;
    font-size: 16px;
  }
}

.steps-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  padding: 0 20px;

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    flex: 1;

    .step-number {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--el-fill-color-light);
      color: var(--el-text-color-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      margin-bottom: 8px;
      transition: all 0.3s;
    }

    .step-label {
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }

    .step-line {
      position: absolute;
      top: 18px;
      left: 50%;
      width: 100%;
      height: 2px;
      background: var(--el-border-color-lighter);
      z-index: 0;
    }

    &.active {
      .step-number {
        background: var(--el-color-primary);
        color: #fff;
      }

      .step-label {
        color: var(--el-color-primary);
        font-weight: 600;
      }
    }

    &.completed {
      .step-number {
        background: var(--el-color-success);
        color: #fff;
      }
    }
  }
}

.step-content {
  h3 {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  .step-tip {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    margin: 0 0 16px 0;
  }

  .image-upload-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;

    .image-item {
      position: relative;
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .image-actions {
        position: absolute;
        top: 4px;
        right: 4px;
        display: flex;
        gap: 4px;

        .cover-badge {
          padding: 2px 6px;
          background: var(--el-color-primary);
          color: #fff;
          font-size: 11px;
          border-radius: 4px;
        }
      }
    }

    .upload-trigger {
      aspect-ratio: 1;
      border: 2px dashed var(--el-border-color);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      color: var(--el-text-color-secondary);
      transition: all 0.3s;

      &:hover {
        border-color: var(--el-color-primary);
        color: var(--el-color-primary);
      }
    }
  }

  .price-input-group {
    display: flex;
    align-items: center;
    gap: 8px;

    .price-symbol {
      font-size: 20px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
  }

  .preview-card {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 16px;

    .preview-images {
      position: relative;
      height: 200px;

      .main-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .thumbnail-list {
        position: absolute;
        bottom: 8px;
        right: 8px;
        display: flex;
        gap: 4px;

        .thumbnail {
          width: 48px;
          height: 48px;
          border-radius: 4px;
          object-fit: cover;
          border: 2px solid #fff;
        }

        .more-count {
          width: 48px;
          height: 48px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          border: 2px solid #fff;
        }
      }
    }

    .preview-info {
      padding: 16px;

      h4 {
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 8px 0;
      }

      .price-tag {
        margin-bottom: 12px;

        .price {
          font-size: 24px;
          font-weight: 600;
          color: var(--el-color-danger);
        }

        .unit {
          font-size: 14px;
          color: var(--el-text-color-secondary);
        }
      }

      .tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }

      .description {
        font-size: 14px;
        color: var(--el-text-color-secondary);
        margin: 0 0 12px 0;
        line-height: 1.6;
      }

      .meta {
        display: flex;
        gap: 16px;
        font-size: 13px;
        color: var(--el-text-color-secondary);
      }
    }
  }

  .notice-content {
    p {
      margin: 4px 0;
      font-size: 13px;
      color: var(--el-text-color-regular);
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

// 大字模式适配
.large-text-mode {
  .steps-indicator .step .step-number {
    width: 44px;
    height: 44px;
    font-size: 16px;
  }

  .step-content h3 {
    font-size: 20px;
  }

  .image-upload-grid .upload-trigger {
    min-height: 100px;
  }

  .preview-card .preview-info h4 {
    font-size: 20px;
  }
}
</style>
