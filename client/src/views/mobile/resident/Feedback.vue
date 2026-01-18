<template>
  <div class="feedback-page">
    <header class="page-header">
      <h2>意见反馈</h2>
    </header>

    <main class="feedback-content">
      <section class="feedback-form">
        <div class="form-group">
          <label class="form-label">反馈类型</label>
          <div class="type-selector">
            <div
              v-for="type in feedbackTypes"
              :key="type.value"
              class="type-item"
              :class="{ active: feedbackForm.type === type.value }"
              @click="feedbackForm.type = type.value"
            >
              <el-icon :size="24" :color="feedbackForm.type === type.value ? type.color : '#909399'">
                <component :is="type.icon" />
              </el-icon>
              <span>{{ type.label }}</span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">问题描述</label>
          <el-input
            v-model="feedbackForm.content"
            type="textarea"
            :rows="6"
            placeholder="请详细描述您遇到的问题或建议..."
            maxlength="500"
            show-word-limit
          />
        </div>

        <div class="form-group">
          <label class="form-label">相关图片</label>
          <div class="image-upload">
            <div
              v-for="(image, index) in feedbackForm.images"
              :key="index"
              class="image-item"
            >
              <img :src="image" alt="上传图片" />
              <div class="image-remove" @click="removeImage(index)">
                <el-icon><Close /></el-icon>
              </div>
            </div>
            <div class="upload-btn" @click="handleUpload" v-if="feedbackForm.images.length < 3">
              <el-icon :size="32"><Plus /></el-icon>
              <span>添加图片</span>
            </div>
          </div>
          <p class="upload-tip">最多上传3张图片</p>
        </div>

        <div class="form-group">
          <label class="form-label">联系电话</label>
          <el-input
            v-model="feedbackForm.phone"
            placeholder="请输入您的联系电话"
            maxlength="11"
          />
        </div>

        <div class="form-actions">
          <el-button type="primary" size="large" @click="handleSubmit" :loading="submitting">
            提交反馈
          </el-button>
        </div>
      </section>

      <section class="feedback-history">
        <h3>历史反馈</h3>
        <div class="history-list">
          <div
            v-for="item in history"
            :key="item.id"
            class="history-item"
            @click="viewDetail(item)"
          >
            <div class="history-type" :class="item.type">
              <span>{{ getTypeLabel(item.type) }}</span>
            </div>
            <div class="history-content">
              <p class="history-text">{{ item.content }}</p>
              <div class="history-meta">
                <span class="history-time">{{ item.time }}</span>
                <el-tag :type="getStatusType(item.status)" size="small">
                  {{ item.statusText }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  ChatDotSquare,
  Warning,
  InfoFilled,
  Plus,
  Close
} from '@element-plus/icons-vue';

const feedbackTypes = [
  { label: '功能建议', value: 'suggestion', icon: ChatDotSquare, color: '#409EFF' },
  { label: '问题反馈', value: 'issue', icon: Warning, color: '#E6A23C' },
  { label: '其他', value: 'other', icon: InfoFilled, color: '#909399' }
];

const feedbackForm = ref({
  type: 'suggestion',
  content: '',
  images: [],
  phone: ''
});

const submitting = ref(false);

const history = ref([
  {
    id: 1,
    type: 'suggestion',
    content: '建议增加村民活动报名功能',
    time: '2024-01-10',
    status: 'pending',
    statusText: '待处理'
  },
  {
    id: 2,
    type: 'issue',
    content: '公告列表加载缓慢',
    time: '2024-01-08',
    status: 'resolved',
    statusText: '已解决'
  }
]);

const handleUpload = () => {
  // TODO: Implement image upload
  console.log('Upload image');
};

const removeImage = (index) => {
  feedbackForm.value.images.splice(index, 1);
};

const handleSubmit = () => {
  if (!feedbackForm.value.content.trim()) {
    ElMessage.warning('请输入反馈内容');
    return;
  }

  submitting.value = true;

  // TODO: Submit to API
  setTimeout(() => {
    submitting.value = false;
    ElMessage.success('反馈提交成功');
    feedbackForm.value = {
      type: 'suggestion',
      content: '',
      images: [],
      phone: ''
    };
  }, 1500);
};

const viewDetail = (item) => {
  console.log('View detail:', item);
  // TODO: Navigate to detail page
};

const getTypeLabel = (type) => {
  const found = feedbackTypes.find(t => t.value === type);
  return found ? found.label : '其他';
};

const getStatusType = (status) => {
  const typeMap = {
    pending: 'warning',
    processing: 'primary',
    resolved: 'success',
    closed: 'info'
  };
  return typeMap[status] || 'info';
};
</script>

<style scoped lang="scss">
.feedback-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 80px;
}

.page-header {
  background: white;
  padding: 16px;
  text-align: center;
  border-bottom: 1px solid #e4e7ed;

  h2 {
    margin: 0;
    font-size: 18px;
    color: #303133;
  }
}

.feedback-content {
  padding: 16px;
}

.feedback-form {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  display: block;
  font-size: 14px;
    color: #606266;
  margin-bottom: 8px;
  font-weight: 500;
}

.type-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.type-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    border-color: #409EFF;
    background: #ecf5ff;
  }

  span {
    font-size: 12px;
    color: #606266;
  }
}

.image-upload {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.image-item {
  position: relative;
  width: 80px;
  height: 80px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }
}

.image-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  background: #F56C6C;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
}

.upload-btn {
  width: 80px;
  height: 80px;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: #909399;
  transition: all 0.2s;

  &:active {
    border-color: #409EFF;
    color: #409EFF;
  }

  span {
    font-size: 11px;
  }
}

.upload-tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: #909399;
}

.form-actions {
  margin-top: 24px;

  .el-button {
    width: 100%;
  }
}

.feedback-history {
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 12px;
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s;

  &:active {
    background: #f5f7fa;
  }
}

.history-type {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  height: fit-content;
  white-space: nowrap;

  &.suggestion {
    background: #ecf5ff;
    color: #409EFF;
  }

  &.issue {
    background: #fdf6ec;
    color: #E6A23C;
  }

  &.other {
    background: #f4f4f5;
    color: #909399;
  }
}

.history-content {
  flex: 1;
}

.history-text {
  margin: 0 0 8px;
  font-size: 14px;
  color: #303133;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.history-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.history-time {
  font-size: 12px;
  color: #909399;
}
</style>
