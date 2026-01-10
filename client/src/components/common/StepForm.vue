<template>
  <div class="step-form-container" :class="{ 'large-text-mode': isLargeText }">
    <!-- 进度条 -->
    <div class="form-progress" v-if="showProgress">
      <el-steps :active="currentStep" align-center finish-status="success">
        <el-step
          v-for="(step, index) in steps"
          :key="index"
          :title="step.title"
          :description="step.description"
        />
      </el-steps>
    </div>

    <!-- 步骤内容 -->
    <div class="step-content">
      <transition name="el-fade-in-linear" mode="out-in">
        <keep-alive>
          <component
            :is="currentStepComponent"
            :key="currentStep"
            v-bind="currentStepProps"
            :form-data="formData"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </keep-alive>
      </transition>
    </div>

    <!-- 操作按钮 -->
    <div class="form-actions">
      <div class="actions-left">
        <el-button
          v-if="!isFirstStep && showPrev"
          size="large"
          icon="ArrowLeft"
          @click="handlePrev"
        >
          上一步
        </el-button>
      </div>

      <div class="actions-center">
        <div class="progress-text" v-if="showProgressText">
          {{ currentStep + 1 }} / {{ steps.length }} 步
        </div>
      </div>

      <div class="actions-right">
        <!-- 语音输入按钮 -->
        <el-button
          v-if="enableVoice"
          :type="isListening ? 'danger' : 'default'"
          :icon="Microphone"
          circle
          @click="handleVoiceInput"
        />

        <el-button
          v-if="isLastStep"
          type="primary"
          size="large"
          icon="Check"
          :loading="submitting"
          @click="handleSubmit"
        >
          提交申请
        </el-button>
        <el-button v-else type="primary" size="large" icon="ArrowRight" @click="handleNext">
          下一步
        </el-button>
      </div>
    </div>

    <!-- 语音识别对话框 -->
    <el-dialog v-model="isListening" title="语音输入" width="400px" :close-on-click-modal="false">
      <div class="voice-input-dialog">
        <div class="listening-animation">
          <div class="wave"></div>
          <div class="wave"></div>
          <div class="wave"></div>
        </div>
        <p class="listening-tip">请说出您要填写的内容</p>
        <p v-if="recognizedText" class="recognized-text">"{{ recognizedText }}"</p>
      </div>
      <template #footer>
        <el-button @click="stopListening" type="danger">停止</el-button>
        <el-button type="primary" @click="confirmVoiceInput">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowLeft, ArrowRight, Check, Microphone } from '@element-plus/icons-vue';
import { useVoiceInput } from '@/composables/useVoiceInput';
import { useLargeText } from '@/composables/useLargeText';

const props = defineProps({
  // 步骤配置
  steps: {
    type: Array,
    required: true,
    default: () => [],
  },
  // 步骤组件
  stepComponents: {
    type: Array,
    required: true,
  },
  // 初始数据
  initialData: {
    type: Object,
    default: () => ({}),
  },
  // 显示进度条
  showProgress: {
    type: Boolean,
    default: true,
  },
  // 显示进度文字
  showProgressText: {
    type: Boolean,
    default: true,
  },
  // 显示上一步按钮
  showPrev: {
    type: Boolean,
    default: true,
  },
  // 启用语音输入
  enableVoice: {
    type: Boolean,
    default: true,
  },
  // 自动保存
  autoSave: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['update', 'submit', 'step-change']);

// Composables
const { isLargeText } = useLargeText();
const { isListening, recognizedText, startListening, stopListening } = useVoiceInput();

// 状态
const currentStep = ref(0);
const formData = ref({ ...props.initialData });
const stepValidation = ref(new Array(props.steps.length).fill(false));
const submitting = ref(false);

// 当前步骤组件
const currentStepComponent = computed(() => {
  return props.stepComponents[currentStep.value];
});

// 当前步骤配置
const currentStepConfig = computed(() => {
  return props.steps[currentStep.value];
});

// 当前步骤属性
const currentStepProps = computed(() => {
  return currentStepConfig.value?.props || {};
});

// 是否第一步
const isFirstStep = computed(() => currentStep.value === 0);

// 是否最后一步
const isLastStep = computed(() => currentStep.value === props.steps.length - 1);

// 进度
const progress = computed(() => {
  return ((currentStep.value + 1) / props.steps.length) * 100;
});

// 处理数据更新
const handleUpdate = data => {
  formData.value = { ...formData.value, ...data };
  emit('update', formData.value, currentStep.value);

  if (props.autoSave) {
    saveFormData();
  }
};

// 处理验证
const handleValidate = isValid => {
  stepValidation.value[currentStep.value] = isValid;
};

// 下一步
const handleNext = () => {
  if (!stepValidation.value[currentStep.value]) {
    ElMessage.warning('请完成当前步骤的必填项');
    return;
  }

  if (currentStep.value < props.steps.length - 1) {
    currentStep.value++;
    emit('step-change', currentStep.value, formData.value);
  }
};

// 上一步
const handlePrev = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
    emit('step-change', currentStep.value, formData.value);
  }
};

// 跳转到指定步骤
const goToStep = index => {
  if (index >= 0 && index < props.steps.length) {
    currentStep.value = index;
    emit('step-change', currentStep.value, formData.value);
  }
};

// 语音输入
const handleVoiceInput = async () => {
  try {
    await startListening();
  } catch (error) {
    console.error('Voice input error:', error);
  }
};

// 确认语音输入
const confirmVoiceInput = () => {
  stopListening();
  if (recognizedText.value) {
    // 将识别的文本传递给当前步骤组件
    emit('voice-input', recognizedText.value, currentStep.value);
    ElMessage.success('已识别语音内容');
  }
};

// 提交表单
const handleSubmit = async () => {
  // 验证所有步骤
  const allValid = stepValidation.value.every(v => v);
  if (!allValid) {
    ElMessage.warning('请完成所有必填项');
    return;
  }

  submitting.value = true;

  try {
    await emit('submit', formData.value);
    ElMessage.success('提交成功');

    // 清除保存的数据
    if (props.autoSave) {
      clearSavedData();
    }
  } catch (error) {
    ElMessage.error('提交失败: ' + error.message);
  } finally {
    submitting.value = false;
  }
};

// 保存表单数据
const saveFormData = () => {
  const saveKey = `step-form-${props.steps[0]?.title || 'form'}`;
  try {
    localStorage.setItem(
      saveKey,
      JSON.stringify({
        formData: formData.value,
        currentStep: currentStep.value,
        stepValidation: stepValidation.value,
      })
    );
  } catch (error) {
    console.error('Save form data error:', error);
  }
};

// 清除保存的数据
const clearSavedData = () => {
  const saveKey = `step-form-${props.steps[0]?.title || 'form'}`;
  localStorage.removeItem(saveKey);
};

// 加载保存的数据
const loadSavedData = () => {
  if (!props.autoSave) return;

  const saveKey = `step-form-${props.steps[0]?.title || 'form'}`;
  try {
    const saved = localStorage.getItem(saveKey);
    if (saved) {
      const data = JSON.parse(saved);
      formData.value = { ...formData.value, ...data.formData };
      currentStep.value = data.currentStep || 0;
      stepValidation.value = data.stepValidation || stepValidation.value;
    }
  } catch (error) {
    console.error('Load saved data error:', error);
  }
};

// 暴露方法
const updateFormData = data => {
  handleUpdate(data);
};

const setStepValidation = isValid => {
  handleValidate(isValid);
};

// 初始化
loadSavedData();

// 暴露给父组件
defineExpose({
  currentStep,
  formData,
  progress,
  updateFormData,
  setStepValidation,
  goToStep,
  resetForm: clearSavedData,
});
</script>

<style lang="scss" scoped>
.step-form-container {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;

  .form-progress {
    margin-bottom: 32px;

    :deep(.el-steps) {
      .el-step__title {
        font-size: 15px;
        font-weight: 500;
      }

      .el-step__description {
        font-size: 13px;
        margin-top: 8px;
      }
    }
  }

  .step-content {
    min-height: 400px;
    margin-bottom: 32px;
    padding: 24px;
    background: #f5f7fa;
    border-radius: 12px;
  }

  .form-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 0;

    .actions-left,
    .actions-right {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .actions-center {
      flex: 1;
      text-align: center;

      .progress-text {
        font-size: 16px;
        color: #606266;
        font-weight: 500;
      }
    }
  }

  .voice-input-dialog {
    text-align: center;

    .listening-animation {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;

      .wave {
        width: 8px;
        height: 40px;
        background: linear-gradient(180deg, #409eff 0%, #67c23a 100%);
        border-radius: 4px;
        animation: wave 1s ease-in-out infinite;

        &:nth-child(2) {
          animation-delay: 0.2s;
        }

        &:nth-child(3) {
          animation-delay: 0.4s;
        }
      }
    }

    .listening-tip {
      font-size: 16px;
      color: #606266;
      margin-bottom: 16px;
    }

    .recognized-text {
      font-size: 18px;
      color: #409eff;
      margin-bottom: 20px;
      font-weight: 500;
    }
  }
}

@keyframes wave {
  0%,
  100% {
    transform: scaleY(0.5);
  }
  50% {
    transform: scaleY(1);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .step-form-container {
    padding: 16px;

    .form-progress {
      :deep(.el-steps) {
        .el-step__title {
          font-size: 13px;
        }

        .el-step__description {
          display: none;
        }
      }
    }

    .step-content {
      padding: 16px;
      min-height: 300px;
    }

    .form-actions {
      flex-direction: column;
      gap: 16px;

      .actions-left,
      .actions-right {
        width: 100%;
        justify-content: center;

        .el-button {
          flex: 1;
        }
      }

      .actions-center {
        order: -1;
      }
    }
  }
}

// 大字模式适配
.large-text-mode {
  .step-form-container {
    padding: 32px;

    .form-progress {
      margin-bottom: 40px;

      :deep(.el-steps) {
        .el-step__title {
          font-size: 18px;
        }

        .el-step__description {
          font-size: 15px;
        }
      }
    }

    .step-content {
      padding: 32px;
      min-height: 500px;
    }

    .form-actions {
      padding: 24px 0;

      .actions-center {
        .progress-text {
          font-size: 20px;
        }
      }
    }
  }
}
</style>
