<template>
  <div class="property-submit">
    <van-nav-bar title="提交问题" fixed left-arrow @click-left="onClickLeft" />

    <van-form @submit="onSubmit">
      <div class="form-section">
        <van-field
          v-model="form.type"
          name="type"
          label="问题类型"
          placeholder="请选择问题类型"
          :rules="[{ required: true, message: '请选择问题类型' }]"
          clickable
          readonly
          @click="showTypePicker"
        >
          <template #input>
            <div class="field-input">
              <span>{{ getTypeLabel(form.type) }}</span>
              <van-icon name="arrow" size="16" />
            </div>
          </template>
        </van-field>

        <van-field
          v-model="form.priority"
          name="priority"
          label="优先级"
          placeholder="请选择优先级"
          :rules="[{ required: true, message: '请选择优先级' }]"
          clickable
          readonly
          @click="showPriorityPicker"
        >
          <template #input>
            <div class="field-input">
              <span>{{ getPriorityLabel(form.priority) }}</span>
              <van-icon name="arrow" size="16" />
            </div>
          </template>
        </van-field>

        <van-field
          v-model="form.location"
          name="location"
          label="问题位置"
          placeholder="请输入问题位置"
          :rules="[{ required: true, message: '请输入问题位置' }]"
        />

        <van-field
          v-model="form.title"
          name="title"
          label="问题标题"
          placeholder="请输入问题标题"
          :rules="[{ required: true, message: '请输入问题标题' }]"
        />

        <van-field
          v-model="form.description"
          name="description"
          label="详细描述"
          type="textarea"
          placeholder="请详细描述问题情况"
          :rules="[{ required: true, message: '请详细描述问题情况' }]"
          rows="4"
          autosize
        />

        <van-field name="images" label="上传照片">
          <van-uploader
            v-model="form.images"
            multiple
            :max-count="6"
            accept="image/*"
            :max-size="10 * 1024 * 1024"
            upload-text="上传照片"
          :after-read="afterRead"
            :before-delete="beforeDelete"
            @click-upload="onClickUpload"
          preview-size="100px"
          fit="cover"
          style="margin-top: 12px;"
          v-for="(file, index) in form.images"
            :key="index"
          :src="file.url"
          :name="file.file"
          @delete="onDelete(index)"
          />
        </van-field>

        <van-field
          v-model="form.isPublic"
          name="isPublic"
          label="公开显示"
        >
          <template #input>
            <van-switch v-model="form.isPublic" size="20" />
          </template>
          <van-field>
          <template #right-icon>
            <van-icon name="info-o" @click="showPublicTip" />
          </template>
          <van-field>
        </van-field>
      </div>

      <div class="action-buttons">
        <van-button type="default" block @click="onClickLeft">取消</van-button>
        <van-button type="primary" block native-type="submit" :loading="submitting">提交问题</van-button>
      </div>
    </van-form>

    <van-popup v-model:show-type-picker="showTypePicker" position="bottom" :style="{ height: '40%' }">
      <van-picker
        v-model="selectedType"
        :columns="1"
        :show-toolbar="false"
        :default-index="typeOptions.findIndex(t => t.value === 'facility')"
        @confirm="onTypeConfirm"
        @cancel="onTypeCancel"
      >
        <van-picker-column>
          <van-picker-option v-for="option in typeOptions" :key="option.value" :value="option.value">{{ option.label }}</van-picker-option>
        </van-picker-column>
      </van-picker>
    </van-popup>

    <van-popup v-model="showPriorityPicker" position="bottom" :style="{ height: '40%' }">
      <van-picker
        v-model="selectedPriority"
        :columns="1"
        :show-toolbar="false"
        :default-index="priorityOptions.findIndex(t => t.value === 'medium')"
        @confirm="onPriorityConfirm"
        @cancel="onPriorityCancel"
      >
        <van-picker-column>
          <van-picker-option v-for="option in priorityOptions" :key="option.value" :value="option.value">{{ option.label }}</van-picker-option>
        </van-picker-column>
      </van-picker>
    </van-popup>

    <van-dialog v-model:show-public-tip="showPublicTip" title="公开显示说明" :show-cancel-button="false">
      <div class="tip-content">
        <p>开启后，您的问题将对所有村民可见</p>
        <p>关闭后，仅对物业和您自己可见</p>
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { Toast, showDialog, showSuccessToast } from 'vant';
import propertyApi from '@/api/propertyApi';

const router = useRouter();
const submitting = ref(false);
const showTypePicker = ref(false);
const showPriorityPicker = ref(false);
const showPublicTip = ref(false);
const selectedType = ref('');
const selectedPriority = ref('');

const form = reactive({
  type: '',
  priority: 'medium',
  title: '',
  description: '',
  images: [],
  isPublic: true,
});

const typeOptions = [
  { value: 'facility', label: '公共设施' },
  { value: 'repair', label: '物业维修' },
  { value: 'suggestion', label: '建议意见' },
  { value: 'complaint', label: '投诉建议' },
];

const priorityOptions = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

const onClickLeft = () => router.back();

const getTypeLabel = (type) => {
  const labels = {
    facility: '公共设施',
    repair: '物业维修',
    suggestion: '建议意见',
    complaint: '投诉建议',
  };
  return labels[type] || type;
};

const getPriorityLabel = (priority) => {
  const labels = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急',
  };
  return labels[priority] || '中';
};

const showTypePicker = () => {
  if (form.type) {
    selectedType.value = form.type;
  }
  showTypePicker.value = true;
};

const showPriorityPicker = () => {
  if (form.priority) {
    selectedPriority.value = form.priority;
  }
  showPriorityPicker.value = true;
};

const onTypeConfirm = ({ selectedOptions }) => {
  const option = selectedOptions[0];
  form.type = option.value;
  selectedType.value = option.value;
  showTypePicker.value = false;
};

const onTypeCancel = () => {
  showTypePicker.value = false;
};

const onPriorityConfirm = ({ selectedOptions }) => {
  const option = selectedOptions[0];
  form.priority = option.value;
  selectedPriority.value = option.value;
  showPriorityPicker.value = false;
};

const onPriorityCancel = () => {
  showPriorityPicker.value = false;
};

const afterRead = (file, detail) => {
  file.status = 'done';
  file.url = URL.createObjectURL(file.content);
};

const beforeDelete = (file) => {
  form.images = form.images.filter(item => item !== file);
};

const onClickUpload = () => {
  if (form.images.length >= 6) {
    Toast('最多上传6张照片');
    return;
  }
};

const showPublicTip = () => {
  showPublicTip.value = true;
};

const onSubmit = async () => {
  if (!form.type || !form.title || !form.description) {
    Toast('请填写必填项');
    return;
  }

  submitting.value = true;
  try {
    const res = await propertyApi.createIssue({
      type: form.type,
      priority: form.priority,
      title: form.title,
      description: form.description,
      location: form.location,
      images: form.images.map(img => img.url),
      isPublic: form.isPublic,
    });
    
    if (res.success) {
      Toast.success('问题提交成功');
      setTimeout(() => {
        router.back();
      }, 1500);
    }
  } catch (error) {
    console.error('提交问题失败:', error);
    Toast.fail('提交失败');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.property-submit {
  min-height: 100vh;
  background: #E3F2FD;
  padding-top: 46px;
}

.form-section {
  padding: 16px;
  background: #fff;
  margin: 12px;
  border-radius: 12px;
}

.field-input {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  color: #1A237E;
}

.action-buttons {
  display: flex;
  gap: 12px;
  padding: 16px;
}

.tip-content {
  padding: 16px;
}

.tip-content p {
  margin: 8px 0;
  color: #718096;
  line-height: 1.6;
}
</style>
