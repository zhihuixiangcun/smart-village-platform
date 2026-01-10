<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    :width="width"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :before-close="handleClose"
    destroy-on-close
    append-to-body
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :label-width="labelWidth"
      :size="size"
      :disabled="loading"
    >
      <slot :form-data="formData" :loading="loading">
        <!-- 默认表单项渲染 -->
        <el-row v-if="fields && fields.length" :gutter="16">
          <el-col v-for="field in fields" :key="field.prop" :span="field.span || 24">
            <el-form-item :label="field.label" :prop="field.prop" :required="field.required">
              <!-- 输入框 -->
              <el-input
                v-if="field.type === 'input' || !field.type"
                v-model="formData[field.prop]"
                :placeholder="field.placeholder"
                :type="field.inputType || 'text'"
                :maxlength="field.maxlength"
                :show-word-limit="field.showWordLimit"
                :disabled="field.disabled"
                clearable
              />

              <!-- 文本域 -->
              <el-input
                v-else-if="field.type === 'textarea'"
                v-model="formData[field.prop]"
                type="textarea"
                :placeholder="field.placeholder"
                :rows="field.rows || 4"
                :maxlength="field.maxlength"
                :show-word-limit="field.showWordLimit"
                :disabled="field.disabled"
              />

              <!-- 数字输入框 -->
              <el-input-number
                v-else-if="field.type === 'number'"
                v-model="formData[field.prop]"
                :placeholder="field.placeholder"
                :min="field.min"
                :max="field.max"
                :step="field.step || 1"
                :precision="field.precision"
                :disabled="field.disabled"
                controls-position="right"
                style="width: 100%"
              />

              <!-- 选择器 -->
              <el-select
                v-else-if="field.type === 'select'"
                v-model="formData[field.prop]"
                :placeholder="field.placeholder"
                :multiple="field.multiple"
                :disabled="field.disabled"
                clearable
                style="width: 100%"
              >
                <el-option
                  v-for="option in field.options"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                  :disabled="option.disabled"
                />
              </el-select>

              <!-- 级联选择器 -->
              <el-cascader
                v-else-if="field.type === 'cascader'"
                v-model="formData[field.prop]"
                :options="field.options"
                :props="field.cascaderProps"
                :placeholder="field.placeholder"
                :disabled="field.disabled"
                clearable
                style="width: 100%"
              />

              <!-- 日期选择器 -->
              <el-date-picker
                v-else-if="field.type === 'date'"
                v-model="formData[field.prop]"
                type="date"
                :placeholder="field.placeholder"
                :disabled="field.disabled"
                :disabled-date="field.disabledDate"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />

              <!-- 日期时间选择器 -->
              <el-date-picker
                v-else-if="field.type === 'datetime'"
                v-model="formData[field.prop]"
                type="datetime"
                :placeholder="field.placeholder"
                :disabled="field.disabled"
                :disabled-date="field.disabledDate"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 100%"
              />

              <!-- 日期范围选择器 -->
              <el-date-picker
                v-else-if="field.type === 'daterange'"
                v-model="formData[field.prop]"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                :disabled="field.disabled"
                :disabled-date="field.disabledDate"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />

              <!-- 时间选择器 -->
              <el-time-picker
                v-else-if="field.type === 'time'"
                v-model="formData[field.prop]"
                :placeholder="field.placeholder"
                :disabled="field.disabled"
                value-format="HH:mm:ss"
                style="width: 100%"
              />

              <!-- 单选框组 -->
              <el-radio-group
                v-else-if="field.type === 'radio'"
                v-model="formData[field.prop]"
                :disabled="field.disabled"
              >
                <el-radio
                  v-for="option in field.options"
                  :key="option.value"
                  :label="option.value"
                  :disabled="option.disabled"
                >
                  {{ option.label }}
                </el-radio>
              </el-radio-group>

              <!-- 复选框组 -->
              <el-checkbox-group
                v-else-if="field.type === 'checkbox'"
                v-model="formData[field.prop]"
                :disabled="field.disabled"
              >
                <el-checkbox
                  v-for="option in field.options"
                  :key="option.value"
                  :label="option.value"
                  :disabled="option.disabled"
                >
                  {{ option.label }}
                </el-checkbox>
              </el-checkbox-group>

              <!-- 开关 -->
              <el-switch
                v-else-if="field.type === 'switch'"
                v-model="formData[field.prop]"
                :disabled="field.disabled"
                :active-text="field.activeText"
                :inactive-text="field.inactiveText"
              />

              <!-- 滑块 -->
              <el-slider
                v-else-if="field.type === 'slider'"
                v-model="formData[field.prop]"
                :min="field.min || 0"
                :max="field.max || 100"
                :step="field.step || 1"
                :disabled="field.disabled"
                :show-input="field.showInput"
              />

              <!-- 评分 -->
              <el-rate
                v-else-if="field.type === 'rate'"
                v-model="formData[field.prop]"
                :max="field.max || 5"
                :disabled="field.disabled"
                :allow-half="field.allowHalf"
                :show-text="field.showText"
                :texts="field.texts"
              />

              <!-- 颜色选择器 -->
              <el-color-picker
                v-else-if="field.type === 'color'"
                v-model="formData[field.prop]"
                :disabled="field.disabled"
                :show-alpha="field.showAlpha"
              />

              <!-- 文件上传 -->
              <el-upload
                v-else-if="field.type === 'upload'"
                :action="field.action"
                :headers="field.headers"
                :data="field.data"
                :name="field.name || 'file'"
                :multiple="field.multiple"
                :accept="field.accept"
                :limit="field.limit"
                :disabled="field.disabled"
                :before-upload="field.beforeUpload"
                :on-success="response => handleUploadSuccess(response, field)"
                :on-error="field.onError"
                :on-remove="file => handleUploadRemove(file, field)"
              >
                <el-button type="primary" :disabled="field.disabled">
                  {{ field.uploadText || '选择文件' }}
                </el-button>
                <template #tip>
                  <div v-if="field.tip" class="el-upload__tip">
                    {{ field.tip }}
                  </div>
                </template>
              </el-upload>

              <!-- 自定义插槽 -->
              <slot
                v-else-if="field.type === 'slot'"
                :name="field.slotName"
                :field="field"
                :form-data="formData"
                :loading="loading"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </slot>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="loading"> 取消 </el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading">
          {{ isEdit ? '更新' : '保存' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { deepClone } from '@/utils/common';

// Props定义
const props = defineProps({
  // 对话框相关
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  width: {
    type: String,
    default: '600px',
  },

  // 表单相关
  fields: {
    type: Array,
    default: () => [],
  },
  formData: {
    type: Object,
    default: () => ({}),
  },
  rules: {
    type: Object,
    default: () => ({}),
  },
  labelWidth: {
    type: String,
    default: '100px',
  },
  size: {
    type: String,
    default: 'default',
  },

  // 状态相关
  loading: {
    type: Boolean,
    default: false,
  },
  isEdit: {
    type: Boolean,
    default: false,
  },
});

// Emits定义
const emit = defineEmits([
  'update:modelValue',
  'submit',
  'close',
  'upload-success',
  'upload-remove',
]);

// 响应式数据
const formRef = ref();

// 计算属性
const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

const dialogTitle = computed(() => {
  if (props.title) return props.title;
  return props.isEdit ? '编辑' : '新增';
});

const formRules = computed(() => props.rules);

// 方法
const handleSubmit = async () => {
  try {
    // 表单验证
    await formRef.value?.validate();

    // 触发提交事件
    emit('submit', deepClone(props.formData));
  } catch (error) {
    console.error('表单验证失败:', error);
  }
};

const handleClose = () => {
  // 重置表单验证状态
  nextTick(() => {
    formRef.value?.clearValidate();
  });

  emit('close');
  visible.value = false;
};

const handleUploadSuccess = (response, field) => {
  emit('upload-success', response, field);
};

const handleUploadRemove = (file, field) => {
  emit('upload-remove', file, field);
};

// 暴露的方法
const validate = () => {
  return formRef.value?.validate();
};

const validateField = prop => {
  return formRef.value?.validateField(prop);
};

const resetFields = () => {
  formRef.value?.resetFields();
};

const clearValidate = props => {
  formRef.value?.clearValidate(props);
};

// 暴露方法给父组件
defineExpose({
  validate,
  validateField,
  resetFields,
  clearValidate,
});
</script>

<style scoped>
.dialog-footer {
  text-align: right;
}

.el-upload__tip {
  color: #909399;
  font-size: 12px;
  margin-top: 7px;
}
</style>
