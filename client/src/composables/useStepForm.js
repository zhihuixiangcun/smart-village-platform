/**
 * 分步办事表单 Composable
 * 支持分步引导、数据保存、进度管理
 */
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';

export function useStepForm(steps = [], options = {}) {
  const {
    autoSave = true, // 自动保存
    saveKey = 'step-form-data', // 保存key
    allowJump = false, // 允许跳步
    onStepChange = null, // 步骤变化回调
  } = options;

  // 当前步骤索引
  const currentStep = ref(0);

  // 表单数据
  const formData = ref({});

  // 每个步骤的验证状态
  const stepValidation = ref(new Array(steps.length).fill(false));

  // 加载保存的数据
  const loadSavedData = () => {
    if (!autoSave) return;

    try {
      const saved = localStorage.getItem(saveKey);
      if (saved) {
        const data = JSON.parse(saved);
        formData.value = data.formData || {};
        currentStep.value = data.currentStep || 0;
        stepValidation.value = data.stepValidation || new Array(steps.length).fill(false);
      }
    } catch (error) {
      console.error('Load saved data error:', error);
    }
  };

  // 保存当前数据
  const saveData = () => {
    if (!autoSave) return;

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
      console.error('Save data error:', error);
    }
  };

  // 更新表单数据
  const updateFormData = data => {
    formData.value = { ...formData.value, ...data };
    saveData();
  };

  // 设置步骤验证状态
  const setStepValidation = (index, isValid) => {
    stepValidation.value[index] = isValid;
    saveData();
  };

  // 验证当前步骤
  const validateCurrentStep = () => {
    return stepValidation.value[currentStep.value];
  };

  // 下一步
  const nextStep = async () => {
    // 验证当前步骤
    if (!validateCurrentStep()) {
      ElMessage.warning('请完成当前步骤的必填项');
      return false;
    }

    // 检查是否可以进入下一步
    if (currentStep.value < steps.length - 1) {
      currentStep.value++;
      saveData();

      // 触发回调
      if (onStepChange) {
        onStepChange(currentStep.value, formData.value);
      }

      return true;
    }

    return false;
  };

  // 上一步
  const prevStep = () => {
    if (currentStep.value > 0) {
      currentStep.value--;
      saveData();

      if (onStepChange) {
        onStepChange(currentStep.value, formData.value);
      }

      return true;
    }

    return false;
  };

  // 跳转到指定步骤
  const goToStep = index => {
    if (!allowJump) {
      ElMessage.warning('请按顺序完成表单');
      return false;
    }

    if (index >= 0 && index < steps.length) {
      currentStep.value = index;
      saveData();
      return true;
    }

    return false;
  };

  // 提交表单
  const submitForm = async submitFn => {
    try {
      // 验证所有步骤
      const allValid = stepValidation.value.every(v => v);
      if (!allValid) {
        ElMessage.warning('请完成所有必填项');
        return false;
      }

      // 调用提交函数
      const result = await submitFn(formData.value);

      // 清除保存的数据
      clearSavedData();

      return result;
    } catch (error) {
      ElMessage.error(`提交失败: ${error.message}`);
      return false;
    }
  };

  // 清除保存的数据
  const clearSavedData = () => {
    localStorage.removeItem(saveKey);
    formData.value = {};
    currentStep.value = 0;
    stepValidation.value = new Array(steps.length).fill(false);
  };

  // 重置表单
  const resetForm = () => {
    clearSavedData();
  };

  // 计算属性
  const isFirstStep = computed(() => currentStep.value === 0);
  const isLastStep = computed(() => currentStep.value === steps.length - 1);
  const progress = computed(() => ((currentStep.value + 1) / steps.length) * 100);
  const completedSteps = computed(() => stepValidation.value.filter(v => v).length);

  // 初始化
  loadSavedData();

  return {
    // 状态
    currentStep,
    formData,
    stepValidation,
    isFirstStep,
    isLastStep,
    progress,
    completedSteps,

    // 方法
    updateFormData,
    setStepValidation,
    validateCurrentStep,
    nextStep,
    prevStep,
    goToStep,
    submitForm,
    resetForm,
    saveData,
  };
}

export default useStepForm;
