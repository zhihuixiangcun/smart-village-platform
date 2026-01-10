<template>
  <div class="suggestion-submit">
    <div class="submit-header">
      <h2>提交建议</h2>
      <p class="submit-desc">您的建议是我们改进村务服务的重要参考，请详细描述您的想法和建议。</p>
    </div>

    <el-form
      ref="suggestionForm"
      :model="form"
      :rules="rules"
      label-width="120px"
      size="medium"
      class="suggestion-form"
    >
      <!-- 基本信息 -->
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>

        <el-form-item label="建议标题" prop="title" required>
          <el-input
            v-model="form.title"
            placeholder="请简要描述您的建议主题"
            maxlength="100"
            show-word-limit
            clearable
          ></el-input>
        </el-form-item>

        <el-form-item label="建议分类" prop="category" required>
          <el-select
            v-model="form.category"
            placeholder="请选择建议分类"
            style="width: 100%"
            @change="handleCategoryChange"
          >
            <el-option
              v-for="category in categories"
              :key="category._id"
              :label="category.name"
              :value="category._id"
            >
              <div class="category-option">
                <i :class="category.icon" :style="{ color: category.color }"></i>
                <span>{{ category.name }}</span>
                <small>{{ category.department }}</small>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="子分类" v-if="form.category">
          <el-input
            v-model="form.subcategory"
            placeholder="可选择具体的子分类（如道路维修-村内主干道）"
            maxlength="50"
            clearable
          ></el-input>
        </el-form-item>

        <el-form-item label="优先级" prop="priority">
          <el-radio-group v-model="form.priority">
            <el-radio label="low">
              <div class="priority-option">
                <span class="priority-badge priority-low"></span>
                <span>低优先级</span>
                <small>建议类改进</small>
              </div>
            </el-radio>
            <el-radio label="medium">
              <div class="priority-option">
                <span class="priority-badge priority-medium"></span>
                <span>中优先级</span>
                <small>需要关注</small>
              </div>
            </el-radio>
            <el-radio label="high">
              <div class="priority-option">
                <span class="priority-badge priority-high"></span>
                <span>高优先级</span>
                <small>重要问题</small>
              </div>
            </el-radio>
            <el-radio label="urgent">
              <div class="priority-option">
                <span class="priority-badge priority-urgent"></span>
                <span>紧急</span>
                <small>需立即处理</small>
              </div>
            </el-radio>
          </el-radio-group>
        </el-form-item>
      </div>

      <!-- 详细描述 -->
      <div class="form-section">
        <h3 class="section-title">详细描述</h3>

        <el-form-item label="建议内容" prop="content" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="6"
            placeholder="请详细描述您的建议内容，包括现状问题、改进方案、预期效果等"
            maxlength="2000"
            show-word-limit
          ></el-input>
          <div class="content-tips">
            <p><strong>建议包含以下内容：</strong></p>
            <ul>
              <li>1. 现状描述：当前存在什么问题或需要改进的地方</li>
              <li>2. 具体建议：您提出的解决方案或改进措施</li>
              <li>3. 预期效果：实施后可能带来的积极影响</li>
              <li>4. 其他补充：相关背景信息或参考案例</li>
            </ul>
          </div>
        </el-form-item>

        <el-form-item label="期望结果">
          <el-input
            v-model="form.expectedOutcome"
            type="textarea"
            :rows="3"
            placeholder="描述您希望通过这个建议达到的具体效果"
            maxlength="500"
            show-word-limit
          ></el-input>
        </el-form-item>

        <el-form-item label="影响范围">
          <el-input
            v-model="form.affectedArea"
            placeholder="建议会影响到的区域或人群（如：全村、某个组、特定设施等）"
            maxlength="100"
            clearable
          ></el-input>
        </el-form-item>

        <el-form-item label="预估预算">
          <el-input-number
            v-model="form.estimatedBudget"
            :min="0"
            :max="10000000"
            :step="100"
            controls-position="right"
            placeholder="预估所需资金"
            style="width: 200px"
          ></el-input-number>
          <span style="margin-left: 10px; color: #909399; font-size: 14px">
            元（可选，有助于评估可行性）
          </span>
        </el-form-item>
      </div>

      <!-- 标签和附件 -->
      <div class="form-section">
        <h3 class="section-title">标签和附件</h3>

        <el-form-item label="相关标签">
          <div class="tags-input">
            <el-tag
              v-for="tag in form.tags"
              :key="tag"
              closable
              @close="removeTag(tag)"
              class="tag-item"
            >
              {{ tag }}
            </el-tag>
            <el-input
              v-if="showTagInput"
              ref="tagInput"
              v-model="newTag"
              size="mini"
              style="width: 120px"
              @keyup.enter="addTag"
              @blur="addTag"
              placeholder="输入标签"
            ></el-input>
            <el-button v-else size="mini" @click="showAddTag" class="add-tag-btn">
              + 添加标签
            </el-button>
          </div>
          <div class="tag-suggestions">
            <span>建议标签：</span>
            <el-button
              v-for="tag in suggestedTags"
              :key="tag"
              type="text"
              size="mini"
              @click="addSuggestedTag(tag)"
            >
              {{ tag }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="附件上传">
          <el-upload
            :action="uploadUrl"
            :headers="uploadHeaders"
            :on-success="handleUploadSuccess"
            :on-remove="handleUploadRemove"
            :before-upload="beforeUpload"
            :file-list="form.attachments"
            drag
            multiple
          >
            <i class="el-icon-upload"></i>
            <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
            <div class="el-upload__tip" slot="tip">
              支持jpg、png、pdf、doc、docx格式，单个文件不超过10MB
            </div>
          </el-upload>
        </el-form-item>
      </div>

      <!-- 联系方式和隐私设置 -->
      <div class="form-section">
        <h3 class="section-title">联系方式和隐私设置</h3>

        <el-form-item>
          <el-checkbox v-model="form.isAnonymous" @change="handleAnonymousChange">
            匿名提交建议
          </el-checkbox>
          <div class="anonymous-tip">
            <el-alert
              v-if="form.isAnonymous"
              title="匿名提交"
              description="您的身份信息将不会公开显示，但村委会仍可查看用于联系和处理"
              type="info"
              :closable="false"
              show-icon
            ></el-alert>
          </div>
        </el-form-item>

        <div v-if="!form.isAnonymous" class="contact-section">
          <el-form-item label="联系电话">
            <el-input
              v-model="form.contactInfo.phone"
              placeholder="请输入您的联系电话"
              maxlength="20"
              clearable
            >
              <template #prepend>+86</template>
            </el-input>
          </el-form-item>

          <el-form-item label="电子邮箱">
            <el-input
              v-model="form.contactInfo.email"
              placeholder="请输入您的电子邮箱"
              maxlength="100"
              clearable
            ></el-input>
          </el-form-item>

          <el-form-item label="联系偏好">
            <el-radio-group v-model="form.contactInfo.preferredContactMethod">
              <el-radio label="app">应用内通知</el-radio>
              <el-radio label="phone">电话联系</el-radio>
              <el-radio label="email">邮件联系</el-radio>
              <el-radio label="none">无需回复</el-radio>
            </el-radio-group>
          </el-form-item>
        </div>
      </div>

      <!-- 提交按钮 -->
      <div class="form-actions">
        <el-button @click="saveDraft" :loading="saving">保存草稿</el-button>
        <el-button type="primary" @click="submitSuggestion" :loading="submitting">
          提交建议
        </el-button>
        <el-button @click="resetForm">重置</el-button>
      </div>
    </el-form>

    <!-- 相关建议推荐 -->
    <div v-if="relatedSuggestions.length > 0" class="related-suggestions">
      <h3>相关建议</h3>
      <p>以下是其他村民提交的类似建议，您可以参考或在评论中表达支持：</p>
      <div class="suggestion-cards">
        <div
          v-for="suggestion in relatedSuggestions"
          :key="suggestion._id"
          class="suggestion-card"
          @click="viewSuggestion(suggestion._id)"
        >
          <div class="card-header">
            <h4>{{ suggestion.title }}</h4>
            <el-tag :type="getStatusType(suggestion.status)" size="mini">
              {{ getStatusText(suggestion.status) }}
            </el-tag>
          </div>
          <p class="card-content">{{ suggestion.content.substring(0, 100) }}...</p>
          <div class="card-footer">
            <span class="submit-date">{{ formatDate(suggestion.submittedAt) }}</span>
            <span class="likes">👍 {{ suggestion.feedback?.likes?.length || 0 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { suggestionAPI } from '@/api/suggestion';
import { formatDate } from '@/utils/dateUtils';

export default {
  name: 'SuggestionSubmit',
  data() {
    return {
      form: {
        title: '',
        content: '',
        category: '',
        subcategory: '',
        priority: 'medium',
        expectedOutcome: '',
        affectedArea: '',
        estimatedBudget: null,
        isAnonymous: false,
        contactInfo: {
          phone: '',
          email: '',
          preferredContactMethod: 'app',
        },
        tags: [],
        attachments: [],
      },
      rules: {
        title: [
          { required: true, message: '请输入建议标题', trigger: 'blur' },
          { min: 1, max: 100, message: '标题长度在1到100个字符', trigger: 'blur' },
        ],
        content: [
          { required: true, message: '请输入建议内容', trigger: 'blur' },
          { min: 10, max: 2000, message: '内容长度在10到2000个字符', trigger: 'blur' },
        ],
        category: [{ required: true, message: '请选择建议分类', trigger: 'change' }],
      },
      categories: [],
      saving: false,
      submitting: false,
      showTagInput: false,
      newTag: '',
      relatedSuggestions: [],
    };
  },
  computed: {
    uploadUrl() {
      return '/api/v1/suggestions/attachments';
    },
    uploadHeaders() {
      return {
        Authorization: `Bearer ${this.$store.getters.token}`,
      };
    },
    suggestedTags() {
      const categoryTags = {
        infrastructure: ['道路', '照明', '供水', '排水', '绿化'],
        services: ['教育', '医疗', '养老', '文化', '体育'],
        governance: ['政务', '公开', '效率', '便民', '监督'],
        environment: ['卫生', '污染', '美化', '垃圾', '环保'],
        security: ['安全', '监控', '巡逻', '消防', '防盗'],
      };

      const selectedCategory = this.categories.find(cat => cat._id === this.form.category);
      return (
        categoryTags[selectedCategory?.code?.toLowerCase()] || [
          '改进',
          '建议',
          '优化',
          '便民',
          '效率',
        ]
      );
    },
  },
  async mounted() {
    await this.loadCategories();
    this.initUserInfo();
  },
  methods: {
    async loadCategories() {
      try {
        const response = await suggestionAPI.getActiveCategories();
        if (response.data.success) {
          this.categories = response.data.data;
        }
      } catch (error) {
        this.$message.error('获取分类失败');
        console.error(error);
      }
    },

    initUserInfo() {
      const user = this.$store.getters.userInfo;
      if (user && !this.form.isAnonymous) {
        this.form.contactInfo.phone = user.phone || '';
        this.form.contactInfo.email = user.email || '';
      }
    },

    handleCategoryChange() {
      this.form.subcategory = '';
      this.searchRelatedSuggestions();
    },

    async searchRelatedSuggestions() {
      if (!this.form.title || !this.form.category) return;

      try {
        const response = await suggestionAPI.searchSimilar({
          title: this.form.title,
          category: this.form.category,
          content: this.form.content.substring(0, 100),
        });

        if (response.data.success) {
          this.relatedSuggestions = response.data.data.suggestions || [];
        }
      } catch (error) {
        console.error('搜索相关建议失败:', error);
      }
    },

    handleAnonymousChange(isAnonymous) {
      if (isAnonymous) {
        this.form.contactInfo = {
          phone: '',
          email: '',
          preferredContactMethod: 'none',
        };
      } else {
        this.initUserInfo();
      }
    },

    // 标签管理
    showAddTag() {
      this.showTagInput = true;
      this.$nextTick(() => {
        this.$refs.tagInput.focus();
      });
    },

    addTag() {
      const tag = this.newTag.trim();
      if (tag && !this.form.tags.includes(tag) && this.form.tags.length < 10) {
        this.form.tags.push(tag);
      }
      this.newTag = '';
      this.showTagInput = false;
    },

    addSuggestedTag(tag) {
      if (!this.form.tags.includes(tag) && this.form.tags.length < 10) {
        this.form.tags.push(tag);
      }
    },

    removeTag(tag) {
      const index = this.form.tags.indexOf(tag);
      if (index > -1) {
        this.form.tags.splice(index, 1);
      }
    },

    // 文件上传
    beforeUpload(file) {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      if (!allowedTypes.includes(file.type)) {
        this.$message.error('不支持的文件格式');
        return false;
      }

      if (file.size > 10 * 1024 * 1024) {
        this.$message.error('文件大小不能超过10MB');
        return false;
      }

      return true;
    },

    handleUploadSuccess(response, file) {
      if (response.success) {
        this.form.attachments.push({
          name: file.name,
          url: response.data.url,
          type: file.type,
          size: file.size,
        });
        this.$message.success('文件上传成功');
      } else {
        this.$message.error('文件上传失败');
      }
    },

    handleUploadRemove(file) {
      const index = this.form.attachments.findIndex(attachment => attachment.name === file.name);
      if (index > -1) {
        this.form.attachments.splice(index, 1);
      }
    },

    // 保存草稿
    async saveDraft() {
      this.saving = true;
      try {
        const draftData = {
          ...this.form,
          status: 'draft',
        };

        // 简单验证
        if (!this.form.title.trim()) {
          this.$message.error('请填写建议标题');
          return;
        }

        const response = await suggestionAPI.saveDraft(draftData);
        if (response.data.success) {
          this.$message.success('草稿保存成功');
          // 可以保存到本地或跳转到草稿列表
        }
      } catch (error) {
        this.$message.error('保存草稿失败');
        console.error(error);
      } finally {
        this.saving = false;
      }
    },

    // 提交建议
    async submitSuggestion() {
      try {
        await this.$refs.suggestionForm.validate();
      } catch (error) {
        this.$message.error('请填写完整信息');
        return;
      }

      this.submitting = true;
      try {
        const response = await suggestionAPI.submitSuggestion(this.form);

        if (response.data.success) {
          this.$message.success('建议提交成功');
          this.$router.push(`/suggestions/${response.data.data.suggestionId}`);
        }
      } catch (error) {
        const message = error.response?.data?.message || '提交建议失败';
        this.$message.error(message);
        console.error(error);
      } finally {
        this.submitting = false;
      }
    },

    // 重置表单
    resetForm() {
      this.$refs.suggestionForm.resetFields();
      this.form.tags = [];
      this.form.attachments = [];
      this.relatedSuggestions = [];
    },

    // 查看建议详情
    viewSuggestion(suggestionId) {
      this.$router.push(`/suggestions/${suggestionId}`);
    },

    // 状态处理
    getStatusType(status) {
      const statusTypes = {
        submitted: 'primary',
        under_review: 'warning',
        approved: 'success',
        rejected: 'danger',
        in_progress: 'warning',
        completed: 'success',
      };
      return statusTypes[status] || 'info';
    },

    getStatusText(status) {
      const statusTexts = {
        submitted: '已提交',
        under_review: '审核中',
        approved: '已通过',
        rejected: '已拒绝',
        in_progress: '实施中',
        completed: '已完成',
      };
      return statusTexts[status] || '未知';
    },

    formatDate,
  },
};
</script>

<style scoped>
.suggestion-submit {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.submit-header {
  text-align: center;
  margin-bottom: 30px;
}

.submit-header h2 {
  color: #333;
  margin-bottom: 10px;
}

.submit-desc {
  color: #666;
  font-size: 16px;
  line-height: 1.5;
}

.suggestion-form {
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-section {
  margin-bottom: 40px;
  padding-bottom: 30px;
  border-bottom: 1px solid #eee;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  color: #333;
  font-size: 18px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #409eff;
}

.category-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-option small {
  color: #999;
  margin-left: auto;
}

.priority-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.priority-badge {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.priority-low {
  background-color: #909399;
}
.priority-medium {
  background-color: #e6a23c;
}
.priority-high {
  background-color: #f56c6c;
}
.priority-urgent {
  background-color: #ff4757;
}

.content-tips {
  margin-top: 10px;
  padding: 15px;
  background: #f0f9ff;
  border-radius: 6px;
  border-left: 4px solid #409eff;
}

.content-tips p {
  margin: 0 0 10px 0;
  color: #333;
  font-weight: bold;
}

.content-tips ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
}

.content-tips li {
  margin-bottom: 5px;
}

.tags-input {
  margin-bottom: 10px;
}

.tag-item {
  margin-right: 8px;
  margin-bottom: 8px;
}

.add-tag-btn {
  margin-bottom: 8px;
}

.tag-suggestions {
  color: #666;
  font-size: 14px;
}

.tag-suggestions span {
  margin-right: 10px;
}

.anonymous-tip {
  margin-top: 10px;
}

.contact-section {
  margin-top: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 6px;
}

.form-actions {
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid #eee;
}

.form-actions .el-button {
  margin: 0 10px;
  min-width: 120px;
}

.related-suggestions {
  margin-top: 40px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.related-suggestions h3 {
  color: #333;
  margin-bottom: 10px;
}

.suggestion-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.suggestion-card {
  background: white;
  padding: 15px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #eee;
}

.suggestion-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #409eff;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.card-header h4 {
  margin: 0;
  color: #333;
  font-size: 14px;
  flex: 1;
}

.card-content {
  color: #666;
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 10px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #999;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .suggestion-submit {
    padding: 10px;
  }

  .suggestion-form {
    padding: 20px;
  }

  .form-section {
    margin-bottom: 30px;
    padding-bottom: 20px;
  }

  .suggestion-cards {
    grid-template-columns: 1fr;
  }

  .form-actions .el-button {
    margin: 5px;
    min-width: 100px;
  }
}
</style>
