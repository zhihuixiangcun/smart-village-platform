<template>
  <el-form
    ref="formRef"
    :model="formData"
    :rules="rules"
    :label-position="labelPosition"
    :label-width="labelWidth"
    :class="formClass"
  >
    <el-form-item
      v-for="item in formItems"
      :key="item.prop"
      :prop="item.prop"
      :label="item.label"
      :required="item.required"
    >
      <!-- 输入框 -->
      <el-input
        v-if="item.type === 'input'"
        v-model="formData[item.prop]"
        :type="item.inputType || 'text'"
        :placeholder="item.placeholder || `请输入${item.label}`"
        :disabled="item.disabled"
        :readonly="item.readonly"
        :maxlength="item.maxlength"
        :show-word-limit="item.showWordLimit"
        :clearable="item.clearable !== false"
        size="large"
        @blur="handleBlur(item.prop)"
        @focus="handleFocus(item.prop)"
      />

      <!-- 文本域 -->
      <el-input
        v-else-if="item.type === 'textarea'"
        v-model="formData[item.prop]"
        type="textarea"
        :placeholder="item.placeholder || `请输入${item.label}`"
        :disabled="item.disabled"
        :readonly="item.readonly"
        :rows="item.rows || 4"
        :maxlength="item.maxlength"
        :show-word-limit="item.showWordLimit"
        size="large"
        @blur="handleBlur(item.prop)"
        @focus="handleFocus(item.prop)"
      />

      <!-- 选择器 -->
      <el-select
        v-else-if="item.type === 'select'"
        v-model="formData[item.prop]"
        :placeholder="item.placeholder || `请选择${item.label}`"
        :disabled="item.disabled"
        :clearable="item.clearable !== false"
        :multiple="item.multiple"
        size="large"
        style="width: 100%"
      >
        <el-option
          v-for="opt in item.options"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
          :disabled="opt.disabled"
        />
      </el-select>

      <!-- 日期选择器 -->
      <el-date-picker
        v-else-if="item.type === 'date'"
        v-model="formData[item.prop]"
        type="date"
        :placeholder="item.placeholder || `请选择${item.label}`"
        :disabled="item.disabled"
        :clearable="item.clearable !== false"
        size="large"
        style="width: 100%"
      />

      <!-- 日期时间选择器 -->
      <el-date-picker
        v-else-if="item.type === 'datetime'"
        v-model="formData[item.prop]"
        type="datetime"
        :placeholder="item.placeholder || `请选择${item.label}`"
        :disabled="item.disabled"
        :clearable="item.clearable !== false"
        size="large"
        style="width: 100%"
      />

      <!-- 单选框组 -->
      <el-radio-group
        v-else-if="item.type === 'radio'"
        v-model="formData[item.prop]"
        :disabled="item.disabled"
        size="large"
      >
        <el-radio
          v-for="opt in item.options"
          :key="opt.value"
          :label="opt.value"
          :disabled="opt.disabled"
        >
          {{ opt.label }}
        </el-radio>
      </el-radio-group>

      <!-- 复选框组 -->
      <el-checkbox-group
        v-else-if="item.type === 'checkbox'"
        v-model="formData[item.prop]"
        :disabled="item.disabled"
        size="large"
      >
        <el-checkbox
          v-for="opt in item.options"
          :key="opt.value"
          :label="opt.value"
          :disabled="opt.disabled"
        >
          {{ opt.label }}
        </el-checkbox>
      </el-checkbox-group>

      <!-- 开关 -->
      <el-switch
        v-else-if="item.type === 'switch'"
        v-model="formData[item.prop]"
        :disabled="item.disabled"
        size="large"
      />

      <!-- 滑块 -->
      <el-slider
        v-else-if="item.type === 'slider'"
        v-model="formData[item.prop]"
        :disabled="item.disabled"
        :min="item.min"
        :max="item.max"
        :step="item.step"
        :marks="item.marks"
      />

      <!-- 自定义插槽 -->
      <slot
        v-else-if="item.type === 'slot'"
        :name="item.slot"
        :prop="item.prop"
        :value="formData[item.prop]"
      />

      <!-- 帮助文本 -->
      <div v-if="item.helper" class="elderly-form__helper">
        <i class="el-icon-info"></i>
        {{ item.helper }}
      </div>

      <!-- 验证错误提示 -->
      <div v-if="errors[item.prop]" class="elderly-form__error">
        <i class="el-icon-warning"></i>
        {{ errors[item.prop] }}
      </div>
    </el-form-item>

    <!-- 表单操作按钮 -->
    <div v-if="showActions" class="elderly-form__actions">
      <elderly-button v-if="showCancel" type="secondary" size="large" @click="handleCancel">
        {{ cancelText }}
      </elderly-button>
      <elderly-button type="primary" size="large" :loading="submitting" @click="handleSubmit">
        {{ submitText }}
      </elderly-button>
    </div>
  </el-form>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import ElderlyButton from './ElderlyButton.vue';

const props = defineProps({
  // 表单项配置
  items: {
    type: Array,
    required: true,
  },
  // 表单数据
  modelValue: {
    type: Object,
    default: () => ({}),
  },
  // 验证规则
  rules: {
    type: Object,
    default: () => ({}),
  },
  // 标签位置
  labelPosition: {
    type: String,
    default: 'top',
    validator: value => ['left', 'right', 'top'].includes(value),
  },
  // 标签宽度
  labelWidth: {
    type: String,
    default: '120px',
  },
  // 是否显示操作按钮
  showActions: {
    type: Boolean,
    default: true,
  },
  // 是否显示取消按钮
  showCancel: {
    type: Boolean,
    default: true,
  },
  // 提交按钮文本
  submitText: {
    type: String,
    default: '提交',
  },
  // 取消按钮文本
  cancelText: {
    type: String,
    default: '取消',
  },
});

const emit = defineEmits(['update:modelValue', 'submit', 'cancel', 'blur', 'focus']);

const formRef = ref(null);
const formData = reactive({ ...props.modelValue });
const errors = reactive({});
const submitting = ref(false);

// 表单项别名
const formItems = computed(() => props.items);

// 表单样式类
const formClass = computed(() => ['elderly-form', `elderly-form--${props.labelPosition}`]);

// 监听表单数据变化
watch(
  () => props.modelValue,
  newVal => {
    Object.assign(formData, newVal);
  },
  { deep: true }
);

// 监听表单数据变化，触发更新
watch(
  formData,
  newVal => {
    emit('update:modelValue', { ...newVal });
  },
  { deep: true }
);

// 处理提交
const handleSubmit = async () => {
  try {
    submitting.value = true;

    // 验证表单
    const valid = await formRef.value?.validate();
    if (!valid) {
      // 触觉反馈
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
      return;
    }

    // 清除错误提示
    Object.keys(errors).forEach(key => {
      delete errors[key];
    });

    // 触觉反馈
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 30, 10]);
    }

    // 触发提交事件
    emit('submit', { ...formData });
  } catch (err) {
    console.error('表单验证失败:', err);
  } finally {
    submitting.value = false;
  }
};

// 处理取消
const handleCancel = () => {
  emit('cancel');
};

// 处理失焦
const handleBlur = prop => {
  emit('blur', prop, formData[prop]);
};

// 处理聚焦
const handleFocus = prop => {
  emit('focus', prop, formData[prop]);
};

// 暴露方法
defineExpose({
  validate: () => formRef.value?.validate(),
  clearValidate: () => formRef.value?.clearValidate(),
  resetFields: () => formRef.value?.resetFields(),
});
</script>

<style lang="scss" scoped>
.elderly-form {
  padding: 24px;
  background: #ffffff;
  border-radius: 12px;

  // 标签样式
  :deep(.el-form-item__label) {
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
    line-height: 1.5;
  }

  // 必填标记
  :deep(.el-form-item.is-required:not(.is-no-asterisk) .el-form-item__label:before) {
    color: #f56c6c;
    font-size: 20px;
    margin-right: 4px;
  }

  // 输入框样式
  :deep(.el-input__inner) {
    height: 56px;
    padding: 14px 16px;
    font-size: 18px;
    border: 2px solid #dcdfe6;
    border-radius: 8px;

    &:focus {
      border-color: #e85d4c;
      box-shadow: 0 0 0 3px rgba(232, 93, 76, 0.1);
    }

    &::placeholder {
      font-size: 16px;
      color: #c0c4cc;
    }
  }

  // 文本域样式
  :deep(.el-textarea__inner) {
    padding: 14px 16px;
    font-size: 18px;
    border: 2px solid #dcdfe6;
    border-radius: 8px;
    line-height: 1.8;

    &:focus {
      border-color: #e85d4c;
      box-shadow: 0 0 0 3px rgba(232, 93, 76, 0.1);
    }
  }

  // 选择器样式
  :deep(.el-select .el-input__inner) {
    height: 56px;
    padding: 14px 16px;
    font-size: 18px;
  }

  // 日期选择器样式
  :deep(.el-date-editor) {
    .el-input__inner {
      height: 56px;
      padding: 14px 16px;
      font-size: 18px;
    }
  }

  // 单选框样式
  :deep(.el-radio) {
    margin-right: 24px;
    height: 48px;

    .el-radio__label {
      font-size: 18px;
      padding-left: 12px;
    }

    .el-radio__inner {
      width: 24px;
      height: 24px;

      &::after {
        width: 10px;
        height: 10px;
      }
    }
  }

  // 复选框样式
  :deep(.el-checkbox) {
    margin-right: 24px;
    height: 48px;

    .el-checkbox__label {
      font-size: 18px;
      padding-left: 12px;
    }

    .el-checkbox__inner {
      width: 24px;
      height: 24px;

      &::after {
        left: 8px;
        top: 4px;
      }
    }
  }

  // 开关样式
  :deep(.el-switch) {
    height: 32px;

    .el-switch__core {
      height: 28px;
      min-width: 56px;
      border-radius: 14px;

      &::after {
        width: 24px;
        height: 24px;
      }
    }
  }

  // 滑块样式
  :deep(.el-slider__runway) {
    height: 8px;
  }

  :deep(.el-slider__button) {
    width: 24px;
    height: 24px;
    border: 4px solid #e85d4c;
  }

  // 表单项间距
  :deep(.el-form-item) {
    margin-bottom: 28px;
  }

  // 帮助文本
  &__helper {
    display: flex;
    align-items: center;
    margin-top: 12px;
    font-size: 16px;
    color: #909399;

    i {
      margin-right: 6px;
      font-size: 18px;
    }
  }

  // 错误提示
  &__error {
    display: flex;
    align-items: center;
    margin-top: 12px;
    font-size: 16px;
    color: #f56c6c;

    i {
      margin-right: 6px;
      font-size: 18px;
    }
  }

  // 操作按钮区
  &__actions {
    display: flex;
    gap: 16px;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 2px solid #f5f7fa;

    .elderly-button {
      flex: 1;
    }
  }

  // 标签位置
  &--top {
    :deep(.el-form-item__label) {
      display: block;
      text-align: left;
      margin-bottom: 12px;
    }
  }

  &--left {
    :deep(.el-form-item__label) {
      float: left;
      text-align: right;
    }
  }

  &--right {
    :deep(.el-form-item__label) {
      float: right;
      text-align: left;
    }
  }
}

// 大字模式适配
.elderly-mode {
  .elderly-form {
    padding: 32px;

    :deep(.el-form-item__label) {
      font-size: 24px;
    }

    :deep(.el-input__inner),
    :deep(.el-textarea__inner) {
      height: 64px;
      padding: 16px 20px;
      font-size: 24px;
      border-width: 3px;
    }

    :deep(.el-radio),
    :deep(.el-checkbox) {
      height: 56px;

      .el-radio__label,
      .el-checkbox__label {
        font-size: 24px;
      }
    }

    &__helper,
    &__error {
      font-size: 20px;
    }
  }
}
</style>
