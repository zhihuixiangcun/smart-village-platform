<template>
  <div class="suggestion-submit-page">
    <div class="header">
      <h2>意见建议征集</h2>
      <p>请详细填写您的意见和建议，我们将认真对待每一条反馈</p>
    </div>

    <el-card class="form-card">
      <el-form
        ref="suggestionForm"
        :model="form"
        :rules="rules"
        label-width="100px"
        label-position="top"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="建议标题" prop="title">
              <el-input
                v-model="form.title"
                placeholder="请输入建议标题"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="建议分类" prop="category">
              <el-select v-model="form.category" placeholder="请选择建议分类" style="width: 100%">
                <el-option
                  v-for="category in categories"
                  :key="category.nameEn"
                  :label="category.name"
                  :value="category.nameEn"
                >
                  <span style="float: left">{{ category.name }}</span>
                  <span style="float: right; color: #8492a6; font-size: 13px">
                    {{ category.description }}
                  </span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="详细内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="6"
            placeholder="请详细描述您的建议内容，包括现状、问题、改进方案等"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="优先级" prop="priority">
              <el-radio-group v-model="form.priority">
                <el-radio label="low">一般</el-radio>
                <el-radio label="medium">重要</el-radio>
                <el-radio label="high">紧急</el-radio>
                <el-radio label="urgent">特急</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预估成本">
              <el-input v-model="form.estimatedCost" placeholder="预估实施成本（元）" type="number">
                <template #prepend>￥</template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="预估时间">
          <el-input v-model="form.estimatedTimeframe" placeholder="预估实施时间周期，如：1-2个月" />
        </el-form-item>

        <el-form-item label="相关标签">
          <el-tag
            v-for="tag in form.tags"
            :key="tag"
            closable
            :disable-transitions="false"
            @close="handleTagClose(tag)"
            style="margin-right: 8px; margin-bottom: 8px"
          >
            {{ tag }}
          </el-tag>
          <el-input
            v-if="tagInputVisible"
            ref="tagInput"
            v-model="tagInputValue"
            class="tag-input"
            size="small"
            @keyup.enter="handleTagConfirm"
            @blur="handleTagConfirm"
            style="width: 120px"
          />
          <el-button v-else class="button-new-tag" size="small" @click="showTagInput">
            + 添加标签
          </el-button>
        </el-form-item>

        <el-form-item label="附件上传">
          <el-upload
            ref="upload"
            :file-list="form.attachments"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :before-upload="beforeUpload"
            :auto-upload="false"
            multiple
            :limit="5"
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
            drag
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">
                支持jpg/png/gif/pdf/doc/docx格式，单个文件不超过10MB，最多5个文件
              </div>
            </template>
          </el-upload>
        </el-form-item>

        <el-divider content-position="left">联系信息</el-divider>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="姓名" prop="submitterName">
              <el-input
                v-model="form.submitterName"
                placeholder="请输入您的姓名"
                :disabled="form.isAnonymous"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="联系电话" prop="submitterPhone">
              <el-input
                v-model="form.submitterPhone"
                placeholder="请输入您的联系电话"
                :disabled="form.isAnonymous"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="联系地址">
              <el-input
                v-model="form.submitterAddress"
                placeholder="请输入您的地址"
                :disabled="form.isAnonymous"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-checkbox v-model="form.isAnonymous">
            匿名提交（选择后将不显示您的个人信息）
          </el-checkbox>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitSuggestion" :loading="submitting" size="large">
            {{ submitting ? '提交中...' : '提交建议' }}
          </el-button>
          <el-button @click="resetForm" size="large">重置</el-button>
          <el-button @click="saveDraft" size="large">保存草稿</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="tips-card" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>💡 温馨提示</span>
        </div>
      </template>
      <ul class="tips-list">
        <li>请详细描述您的建议，包括现状分析、存在问题、改进方案等</li>
        <li>如有相关图片或文档，建议一并上传以便我们更好地理解您的建议</li>
        <li>我们会在3个工作日内对您的建议进行初步回复</li>
        <li>重要建议将进入专门的评估流程，并及时反馈处理进度</li>
        <li>您可以随时查看建议的处理状态和回复信息</li>
      </ul>
    </el-card>
  </div>
</template>

<script>
import { reactive, ref, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import { suggestionApi } from '../api/suggestion';

export default {
  name: 'SuggestionSubmit',
  components: {
    UploadFilled,
  },
  setup() {
    const suggestionForm = ref(null);
    const tagInput = ref(null);
    const upload = ref(null);

    const form = reactive({
      title: '',
      content: '',
      category: '',
      priority: 'medium',
      submitterName: '',
      submitterPhone: '',
      submitterAddress: '',
      isAnonymous: false,
      estimatedCost: '',
      estimatedTimeframe: '',
      tags: [],
      attachments: [],
      village: 'default_village',
    });

    const rules = reactive({
      title: [
        { required: true, message: '请输入建议标题', trigger: 'blur' },
        { min: 5, max: 100, message: '标题长度在 5 到 100 个字符', trigger: 'blur' },
      ],
      content: [
        { required: true, message: '请输入建议内容', trigger: 'blur' },
        { min: 10, max: 1000, message: '内容长度在 10 到 1000 个字符', trigger: 'blur' },
      ],
      category: [{ required: true, message: '请选择建议分类', trigger: 'change' }],
      submitterName: [{ required: true, message: '请输入您的姓名', trigger: 'blur' }],
      submitterPhone: [
        { required: true, message: '请输入您的联系电话', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' },
      ],
    });

    const categories = ref([]);
    const submitting = ref(false);
    const tagInputVisible = ref(false);
    const tagInputValue = ref('');

    const loadCategories = async () => {
      try {
        const response = await suggestionApi.getCategories(form.village);
        categories.value = response.data;
      } catch (error) {
        ElMessage.error('加载分类失败：' + error.message);
      }
    };

    const handleTagClose = tag => {
      form.tags.splice(form.tags.indexOf(tag), 1);
    };

    const showTagInput = () => {
      tagInputVisible.value = true;
      nextTick(() => {
        tagInput.value.input.focus();
      });
    };

    const handleTagConfirm = () => {
      if (tagInputValue.value && !form.tags.includes(tagInputValue.value)) {
        form.tags.push(tagInputValue.value);
      }
      tagInputVisible.value = false;
      tagInputValue.value = '';
    };

    const handleFileChange = (file, fileList) => {
      form.attachments = fileList;
    };

    const handleFileRemove = (file, fileList) => {
      form.attachments = fileList;
    };

    const beforeUpload = file => {
      const isValidType = /\.(jpg|jpeg|png|gif|pdf|doc|docx)$/i.test(file.name);
      const isValidSize = file.size / 1024 / 1024 < 10;

      if (!isValidType) {
        ElMessage.error('只能上传jpg/png/gif/pdf/doc/docx格式的文件!');
        return false;
      }
      if (!isValidSize) {
        ElMessage.error('上传文件大小不能超过10MB!');
        return false;
      }
      return false; // 阻止自动上传
    };

    const submitSuggestion = async () => {
      try {
        const valid = await suggestionForm.value.validate();
        if (!valid) return;

        submitting.value = true;

        const formData = new FormData();
        Object.keys(form).forEach(key => {
          if (key === 'attachments') {
            form.attachments.forEach(file => {
              if (file.raw) {
                formData.append('attachments', file.raw);
              }
            });
          } else if (key === 'tags') {
            formData.append('tags', form.tags.join(','));
          } else {
            formData.append(key, form[key]);
          }
        });

        await suggestionApi.submit(formData);

        ElMessage.success('建议提交成功！我们会尽快处理您的建议');
        resetForm();
      } catch (error) {
        ElMessage.error('提交失败：' + error.message);
      } finally {
        submitting.value = false;
      }
    };

    const resetForm = () => {
      suggestionForm.value.resetFields();
      form.tags = [];
      form.attachments = [];
      upload.value.clearFiles();
    };

    const saveDraft = () => {
      const draft = { ...form };
      localStorage.setItem('suggestion_draft', JSON.stringify(draft));
      ElMessage.success('草稿已保存');
    };

    const loadDraft = () => {
      const draft = localStorage.getItem('suggestion_draft');
      if (draft) {
        const draftData = JSON.parse(draft);
        Object.assign(form, draftData);
        ElMessage.info('已加载上次保存的草稿');
      }
    };

    onMounted(() => {
      loadCategories();
      loadDraft();
    });

    return {
      form,
      rules,
      categories,
      submitting,
      tagInputVisible,
      tagInputValue,
      suggestionForm,
      tagInput,
      upload,
      handleTagClose,
      showTagInput,
      handleTagConfirm,
      handleFileChange,
      handleFileRemove,
      beforeUpload,
      submitSuggestion,
      resetForm,
      saveDraft,
    };
  },
};
</script>

<style scoped>
.suggestion-submit-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h2 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.header p {
  color: #7f8c8d;
  font-size: 14px;
}

.form-card {
  margin-bottom: 20px;
}

.tag-input {
  width: 120px;
  margin-left: 8px;
  vertical-align: bottom;
}

.button-new-tag {
  margin-left: 8px;
  height: 32px;
  line-height: 30px;
  padding-top: 0;
  padding-bottom: 0;
}

.tips-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.tips-card :deep(.el-card__header) {
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.tips-card :deep(.el-card__body) {
  background: rgba(255, 255, 255, 0.05);
}

.card-header {
  font-weight: bold;
  font-size: 16px;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
}

.tips-list li {
  margin-bottom: 8px;
  line-height: 1.6;
}

.el-upload :deep(.el-upload-dragger) {
  width: 100%;
  height: 120px;
}
</style>
