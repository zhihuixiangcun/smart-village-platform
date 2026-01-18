<template>
  <div class="create-request">
    <div class="page-header">
      <el-button link @click="handleBack">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h1>发布互助需求</h1>
    </div>

    <div class="create-form">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="formData.title" placeholder="请输入需求标题" maxlength="100" show-word-count></el-input>
        </el-form-item>

        <el-form-item label="类型" prop="type">
          <el-select v-model="formData.type" placeholder="请选择类型">
            <el-option label="劳务帮助" value="labor"></el-option>
            <el-option label="物品借用" value="borrow"></el-option>
            <el-option label="信息咨询" value="consult"></el-option>
            <el-option label="紧急求助" value="emergency"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="紧急程度" prop="urgency">
          <el-radio-group v-model="formData.urgency">
            <el-radio label="urgent">紧急</el-radio>
            <el-radio label="normal">一般</el-radio>
            <el-radio label="low">不急</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="地点" prop="location">
          <el-input v-model="formData.location" placeholder="请输入求助地点"></el-input>
        </el-form-item>

        <el-form-item label="截止时间" prop="deadline">
          <el-date-picker
            v-model="formData.deadline"
            type="datetime"
            placeholder="选择截止时间"
            format="YYYY-MM-DD HH:mm"
          ></el-date-picker>
        </el-form-item>

        <el-form-item label="详细描述" prop="description">
          <RichTextEditor v-model="formData.description" :height="400" placeholder="请详细描述您的需求..."></RichTextEditor>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">发布需求</el-button>
          <el-button @click="handleBack">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import RichTextEditor from '@/components/common/RichTextEditor.vue';
import { communityApi } from '@/api/community';

const router = useRouter();
const formRef = ref(null);
const submitting = ref(false);

const formData = reactive({
  title: '',
  type: '',
  urgency: 'normal',
  location: '',
  deadline: '',
  description: '',
});

const formRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  urgency: [{ required: true, message: '请选择紧急程度', trigger: 'change' }],
  location: [{ required: true, message: '请输入地点', trigger: 'blur' }],
  deadline: [{ required: true, message: '请选择截止时间', trigger: 'change' }],
  description: [{ required: true, message: '请输入详细描述', trigger: 'blur' }],
};

const handleSubmit = async () => {
  const valid = await formRef.value.validate();
  if (!valid) return;

  submitting.value = true;
  try {
    await communityApi.createAidRequest(formData);
    ElMessage.success('发布成功');
    router.push('/community/mutual-aid');
  } catch (error) {
    ElMessage.error('发布失败');
  } finally {
    submitting.value = false;
  }
};

const handleBack = () => {
  router.push('/community/mutual-aid');
};
</script>

<style lang="scss" scoped>
.create-request {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;

  h1 {
    margin: 0;
    font-size: 28px;
    color: #0f172a;
  }
}

.create-form {
  background: white;
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  :deep(.el-form-item__label) {
    font-weight: 600;
    color: #0f172a;
  }
}
</style>
