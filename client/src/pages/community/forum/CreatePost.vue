<template>
  <div class="create-post">
    <div class="page-header">
      <el-button link @click="handleBack">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h1>{{ isEdit ? '编辑帖子' : '发布帖子' }}</h1>
    </div>

    <div class="create-form">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="formData.title" placeholder="请输入帖子标题" maxlength="100" show-word-count></el-input>
        </el-form-item>

        <el-form-item label="分类" prop="category">
          <el-select v-model="formData.category" placeholder="请选择分类">
            <el-option label="乡村新闻" value="news"></el-option>
            <el-option label="生活经验" value="life"></el-option>
            <el-option label="农业知识" value="agriculture"></el-option>
            <el-option label="文化活动" value="culture"></el-option>
            <el-option label="其他" value="other"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="标签" prop="tags">
          <el-select v-model="formData.tags" multiple filterable allow-create placeholder="请选择或输入标签">
            <el-option v-for="tag in commonTags" :key="tag" :label="tag" :value="tag"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="内容" prop="content">
          <RichTextEditor v-model="formData.content" :height="400" placeholder="请输入帖子内容..."></RichTextEditor>
        </el-form-item>

        <el-form-item label="图片">
          <ImageUploader v-model="formData.images" :max-count="9" multiple></ImageUploader>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ isEdit ? '更新' : '发布' }}
          </el-button>
          <el-button @click="handleSaveDraft" :loading="submitting">存草稿</el-button>
          <el-button @click="handleBack">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import RichTextEditor from '@/components/common/RichTextEditor.vue';
import ImageUploader from '@/components/common/ImageUploader.vue';
import { communityApi } from '@/api/community';

const router = useRouter();
const route = useRoute();
const formRef = ref(null);
const submitting = ref(false);
const isEdit = ref(false);

const formData = reactive({
  title: '',
  category: '',
  tags: [],
  content: '',
  images: [],
});

const commonTags = ['乡村振兴', '农业技术', '生活经验', '文化活动', '环境整治', '便民服务', '健康养生'];

const formRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
};

const handleSubmit = async () => {
  const valid = await formRef.value.validate();
  if (!valid) return;

  submitting.value = true;
  try {
    const data = {
      title: formData.title,
      category: formData.category,
      tags: formData.tags,
      content: formData.content,
      images: formData.images,
      status: 'published',
    };

    if (isEdit.value) {
      await communityApi.updatePost(route.params.id, data);
      ElMessage.success('更新成功');
    } else {
      await communityApi.createPost(data);
      ElMessage.success('发布成功');
    }

    router.push('/community/forum');
  } catch (error) {
    ElMessage.error(isEdit.value ? '更新失败' : '发布失败');
  } finally {
    submitting.value = false;
  }
};

const handleSaveDraft = async () => {
  const valid = await formRef.value.validate();
  if (!valid) return;

  submitting.value = true;
  try {
    const data = {
      title: formData.title,
      category: formData.category,
      tags: formData.tags,
      content: formData.content,
      images: formData.images,
      status: 'draft',
    };

    if (isEdit.value) {
      await communityApi.updatePost(route.params.id, data);
    } else {
      await communityApi.createPost(data);
    }

    ElMessage.success('保存草稿成功');
    router.push('/community/forum');
  } catch (error) {
    ElMessage.error('保存草稿失败');
  } finally {
    submitting.value = false;
  }
};

const handleBack = () => {
  router.push('/community/forum');
};

onMounted(() => {
  isEdit.value = !!route.params.id;
  if (isEdit.value) {
    loadPost();
  }
});
</script>

<style lang="scss" scoped>
.create-post {
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
