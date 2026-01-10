<template>
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑公告' : '发布公告'"
    width="800px"
    :close-on-click-modal="false"
    @open="handleOpen"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      :size="largeTextMode ? 'large' : 'default'"
    >
      <el-form-item label="公告标题" prop="title">
        <el-input
          v-model="formData.title"
          placeholder="请输入公告标题"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="公告分类" prop="category">
        <el-select v-model="formData.category" placeholder="选择公告分类" style="width: 100%">
          <el-option label="政策通知" value="政策通知" />
          <el-option label="村务公告" value="村务公告" />
          <el-option label="紧急通知" value="紧急通知" />
          <el-option label="活动通知" value="活动通知" />
          <el-option label="其他" value="其他" />
        </el-select>
      </el-form-item>

      <el-form-item label="优先级" prop="priority">
        <el-radio-group v-model="formData.priority">
          <el-radio label="high">高</el-radio>
          <el-radio label="medium">中</el-radio>
          <el-radio label="low">低</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="发布目标" prop="target">
        <el-checkbox-group v-model="formData.target">
          <el-checkbox label="all">全体村民</el-checkbox>
          <el-checkbox label="committee">村委内部</el-checkbox>
          <el-checkbox label="special">特殊群体</el-checkbox>
          <el-checkbox label="volunteer">志愿者</el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="公告内容" prop="content">
        <div class="rich-editor-container">
          <div class="editor-toolbar">
            <el-button-group>
              <el-button size="small" @click="insertImage">
                <el-icon><Picture /></el-icon>
                插入图片
              </el-button>
              <el-button size="small" @click="insertLink">
                <el-icon><Link /></el-icon>
                插入链接
              </el-button>
            </el-button-group>
          </div>

          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="8"
            placeholder="请输入公告内容..."
            show-word-limit
            maxlength="2000"
          />
        </div>
      </el-form-item>

      <el-form-item label="发布方式" prop="publishType">
        <el-radio-group v-model="formData.publishType">
          <el-radio label="immediate">立即发布</el-radio>
          <el-radio label="scheduled">定时发布</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="formData.publishType === 'scheduled'" label="发布时间" prop="publishTime">
        <el-date-picker
          v-model="formData.publishTime"
          type="datetime"
          placeholder="选择发布时间"
          style="width: 100%"
          :disabled-date="disabledDate"
        />
      </el-form-item>

      <el-form-item label="附件上传">
        <el-upload
          ref="uploadRef"
          v-model:file-list="fileList"
          :auto-upload="false"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          multiple
          limit="5"
        >
          <el-button size="small">
            <el-icon><Upload /></el-icon>
            选择文件
          </el-button>
          <template #tip>
            <div class="upload-tip">支持图片、文档等格式，单个文件不超过10MB，最多5个文件</div>
          </template>
        </el-upload>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button @click="handleSaveDraft" :loading="saving"> 保存草稿 </el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        {{ isEdit ? '更新公告' : '发布公告' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { EditPen, Picture, Link, Upload } from '@element-plus/icons-vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  announcement: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'submit']);

const largeTextMode = ref(false);
const formRef = ref(null);
const uploadRef = ref(null);
const saving = ref(false);
const submitting = ref(false);
const fileList = ref([]);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
});

const isEdit = computed(() => !!props.announcement);

const formData = ref({
  title: '',
  category: '',
  priority: 'medium',
  target: ['all'],
  content: '',
  publishType: 'immediate',
  publishTime: '',
  attachments: [],
});

const formRules = {
  title: [
    { required: true, message: '请输入公告标题', trigger: 'blur' },
    { min: 5, max: 100, message: '标题长度在5到100个字符之间', trigger: 'blur' },
  ],
  category: [{ required: true, message: '请选择公告分类', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
  target: [{ type: 'array', required: true, message: '请选择发布目标', trigger: 'change' }],
  content: [
    { required: true, message: '请输入公告内容', trigger: 'blur' },
    { min: 10, max: 2000, message: '内容长度在10到2000个字符之间', trigger: 'blur' },
  ],
  publishTime: [{ required: true, message: '请选择发布时间', trigger: 'change' }],
};

// 监听传入的公告数据
watch(
  () => props.announcement,
  newVal => {
    if (newVal) {
      formData.value = {
        ...newVal,
        target: newVal.target || ['all'],
        attachments: newVal.attachments || [],
      };

      // 设置文件列表
      if (newVal.attachments && newVal.attachments.length > 0) {
        fileList.value = newVal.attachments.map((attachment, index) => ({
          name: attachment,
          url: attachment,
          uid: Date.now() + index,
        }));
      }
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

const resetForm = () => {
  formData.value = {
    title: '',
    category: '',
    priority: 'medium',
    target: ['all'],
    content: '',
    publishType: 'immediate',
    publishTime: '',
    attachments: [],
  };
  fileList.value = [];
};

const handleOpen = () => {
  nextTick(() => {
    if (formRef.value) {
      formRef.value.clearValidate();
    }
  });
};

const disabledDate = time => {
  return time.getTime() < Date.now() - 24 * 60 * 60 * 1000;
};

const insertImage = () => {
  ElMessage.info('图片插入功能开发中...');
};

const insertLink = () => {
  ElMessage.info('链接插入功能开发中...');
};

const insertText = (before, after = '') => {
  const textarea = document.querySelector('.el-textarea__inner');
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.value.content;
    const beforeText = text.substring(0, start);
    const afterText = text.substring(end);

    formData.value.content = beforeText + before + afterText + after;

    nextTick(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + after.length);
    });
  }
};

const handleFileChange = (file, fileList) => {
  // 文件大小检查
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过10MB');
    return false;
  }

  formData.value.attachments = fileList.map(f => f.name);
};

const handleFileRemove = (file, fileList) => {
  formData.value.attachments = fileList.map(f => f.name);
};

const handleCancel = () => {
  dialogVisible.value = false;
};

const handleSaveDraft = async () => {
  try {
    saving.value = true;
    await formRef.value.validate();

    const submitData = {
      ...formData.value,
      status: 'draft',
      attachments: formData.value.attachments,
    };

    emit('submit', submitData);
    ElMessage.success('草稿保存成功');
  } catch (error) {
    ElMessage.error('请检查表单填写');
  } finally {
    saving.value = false;
  }
};

const handleSubmit = async () => {
  try {
    submitting.value = true;
    await formRef.value.validate();

    const submitData = {
      ...formData.value,
      status: 'published',
      attachments: formData.value.attachments,
    };

    // 如果是立即发布，设置发布时间
    if (formData.value.publishType === 'immediate') {
      submitData.publishTime = new Date().toISOString();
    } else {
      submitData.publishTime = formData.value.publishTime;
    }

    emit('submit', submitData);
    ElMessage.success(isEdit.value ? '公告更新成功' : '公告发布成功');
    dialogVisible.value = false;
  } catch (error) {
    ElMessage.error('请检查表单填写');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.rich-editor-container {
  width: 100%;
}

.editor-toolbar {
  margin-bottom: 8px;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .editor-toolbar .el-button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .editor-toolbar .el-button {
    margin-bottom: 4px;
  }
}
</style>
