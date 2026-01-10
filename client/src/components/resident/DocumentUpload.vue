<template>
  <div class="document-upload">
    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="120px" size="default">
      <!-- 文件上传 -->
      <div class="form-section">
        <h3>文件上传</h3>
        <el-form-item label="选择文件" prop="file" required>
          <el-upload
            ref="uploadRef"
            class="upload-demo"
            drag
            :action="uploadUrl"
            :headers="uploadHeaders"
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :file-list="fileList"
            :limit="1"
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">支持jpg/png/pdf/word格式，文件大小不超过10MB</div>
            </template>
          </el-upload>
        </el-form-item>

        <!-- OCR选项 -->
        <el-form-item label="OCR识别">
          <el-switch v-model="enableOCR" active-text="启用OCR识别" inactive-text="不启用" />
          <div class="ocr-tip" v-if="enableOCR">
            <el-alert
              title="OCR识别将自动提取文档中的文字信息，识别过程可能需要几秒钟"
              type="info"
              :closable="false"
              show-icon
            />
          </div>
        </el-form-item>
      </div>

      <!-- 文档信息 -->
      <div class="form-section">
        <h3>文档信息</h3>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="文档名称" prop="documentInfo.name" required>
              <el-input v-model="formData.documentInfo.name" placeholder="请输入文档名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="文档类型" prop="documentInfo.type" required>
              <el-select v-model="formData.documentInfo.type" placeholder="请选择文档类型">
                <el-option label="身份证" value="身份证" />
                <el-option label="户口本" value="户口本" />
                <el-option label="毕业证" value="毕业证" />
                <el-option label="学位证" value="学位证" />
                <el-option label="结婚证" value="结婚证" />
                <el-option label="离婚证" value="离婚证" />
                <el-option label="房产证" value="房产证" />
                <el-option label="土地证" value="土地证" />
                <el-option label="驾驶证" value="驾驶证" />
                <el-option label="行驶证" value="行驶证" />
                <el-option label="营业执照" value="营业执照" />
                <el-option label="税务登记证" value="税务登记证" />
                <el-option label="组织机构代码证" value="组织机构代码证" />
                <el-option label="社保卡" value="社保卡" />
                <el-option label="医保卡" value="医保卡" />
                <el-option label="低保证" value="低保证" />
                <el-option label="残疾证" value="残疾证" />
                <el-option label="优抚证" value="优抚证" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="证件号码" prop="documentInfo.number">
              <el-input
                v-model="formData.documentInfo.number"
                placeholder="请输入证件号码（可选）"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="有效期" prop="documentInfo.validUntil">
              <el-date-picker
                v-model="formData.documentInfo.validUntil"
                type="date"
                placeholder="选择有效期（可选）"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="发证机关" prop="documentInfo.issuer">
              <el-input
                v-model="formData.documentInfo.issuer"
                placeholder="请输入发证机关（可选）"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="证件状态" prop="documentInfo.status">
              <el-select v-model="formData.documentInfo.status" placeholder="请选择证件状态">
                <el-option label="有效" value="有效" />
                <el-option label="即将过期" value="即将过期" />
                <el-option label="已过期" value="已过期" />
                <el-option label="遗失" value="遗失" />
                <el-option label="注销" value="注销" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注" prop="documentInfo.remarks">
          <el-input
            v-model="formData.documentInfo.remarks"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息（可选）"
          />
        </el-form-item>
      </div>

      <!-- 分享设置 -->
      <div class="form-section">
        <h3>分享设置</h3>
        <el-form-item label="允许分享">
          <el-switch v-model="formData.sharing.isShared" />
        </el-form-item>
        <el-form-item v-if="formData.sharing.isShared" label="分享对象" prop="sharing.sharedWith">
          <el-select
            v-model="formData.sharing.sharedWith"
            multiple
            placeholder="选择分享对象（可选）"
            style="width: 100%"
          >
            <el-option
              v-for="user in shareableUsers"
              :key="user.value"
              :label="user.label"
              :value="user.value"
            />
          </el-select>
        </el-form-item>
      </div>

      <!-- OCR结果预览 -->
      <div v-if="ocrResult" class="form-section">
        <h3>OCR识别结果</h3>
        <el-form-item label="识别文本">
          <el-input v-model="ocrResult.text" type="textarea" :rows="5" readonly />
        </el-form-item>
        <el-form-item label="识别字段" v-if="ocrResult.extractedFields">
          <el-table :data="ocrFieldList" style="width: 100%">
            <el-table-column prop="field" label="字段" width="150" />
            <el-table-column prop="value" label="值" />
            <el-table-column prop="confidence" label="置信度" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="getConfidenceType(row.confidence)">
                  {{ (row.confidence * 100).toFixed(1) }}%
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
      </div>
    </el-form>

    <!-- 表单操作 -->
    <div class="form-actions">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting"> 上传文档 </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';

// Props
const props = defineProps({
  owner: {
    type: String,
    required: true,
  },
});

// Emits
const emit = defineEmits(['submit', 'cancel']);

// 表单引用
const formRef = ref(null);
const uploadRef = ref(null);

// 提交状态
const submitting = ref(false);
const enableOCR = ref(true);
const ocrResult = ref(null);

// 文件列表
const fileList = ref([]);

// 上传配置
const uploadUrl = import.meta.env.VITE_API_URL + '/api/v1/documents/upload';
const uploadHeaders = {
  Authorization: 'Bearer ' + localStorage.getItem('token'),
};

// 可分享用户列表（示例）
const shareableUsers = ref([
  { label: '张三（村民）', value: 'user1' },
  { label: '李四（村干部）', value: 'user2' },
  { label: '王五（村医）', value: 'user3' },
]);

// 表单数据
const formData = reactive({
  documentInfo: {
    name: '',
    type: '',
    number: '',
    validUntil: '',
    issuer: '',
    status: '有效',
    remarks: '',
  },
  sharing: {
    isShared: false,
    sharedWith: [],
  },
});

// OCR字段列表
const ocrFieldList = computed(() => {
  if (!ocrResult.value?.extractedFields) return [];

  return Object.entries(ocrResult.value.extractedFields).map(([field, data]) => ({
    field,
    value: data.value,
    confidence: data.confidence,
  }));
});

// 表单验证规则
const formRules = {
  'documentInfo.name': [
    { required: true, message: '请输入文档名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' },
  ],
  'documentInfo.type': [{ required: true, message: '请选择文档类型', trigger: 'change' }],
};

// 文件选择变化
const handleFileChange = file => {
  // 自动填充文档名称
  if (!formData.documentInfo.name && file.raw) {
    const name = file.raw.name.split('.')[0];
    formData.documentInfo.name = name;
  }

  // 根据文件名推测文档类型
  if (file.raw && !formData.documentInfo.type) {
    const filename = file.raw.name.toLowerCase();
    if (filename.includes('身份证')) {
      formData.documentInfo.type = '身份证';
    } else if (filename.includes('户口')) {
      formData.documentInfo.type = '户口本';
    } else if (filename.includes('毕业证')) {
      formData.documentInfo.type = '毕业证';
    } else if (filename.includes('驾驶证')) {
      formData.documentInfo.type = '驾驶证';
    }
  }
};

// 移除文件
const handleFileRemove = () => {
  fileList.value = [];
  ocrResult.value = null;
};

// 获取置信度类型
const getConfidenceType = confidence => {
  if (confidence >= 0.9) return 'success';
  if (confidence >= 0.7) return 'warning';
  return 'danger';
};

// 提交表单
const handleSubmit = async () => {
  // 检查是否有文件
  if (fileList.value.length === 0) {
    ElMessage.error('请选择要上传的文件');
    return;
  }

  // 表单验证
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;

  try {
    // 构建FormData
    const formDataToSend = new FormData();

    // 添加文件
    formDataToSend.append('file', fileList.value[0].raw);

    // 添加文档信息
    formDataToSend.append('owner', props.owner);
    formDataToSend.append('documentInfo', JSON.stringify(formData.documentInfo));
    formDataToSend.append('sharing', JSON.stringify(formData.sharing));
    formDataToSend.append('enableOCR', enableOCR.value);

    // 发送提交事件
    emit('submit', formDataToSend);
  } catch (error) {
    ElMessage.error('上传失败');
    console.error(error);
  } finally {
    submitting.value = false;
  }
};

// 取消
const handleCancel = () => {
  emit('cancel');
};
</script>

<style lang="scss" scoped>
.document-upload {
  .form-section {
    margin-bottom: 30px;

    h3 {
      margin: 0 0 20px 0;
      padding-bottom: 10px;
      border-bottom: 2px solid #409eff;
      font-size: 16px;
      color: #303133;
    }

    .ocr-tip {
      margin-top: 10px;
    }
  }

  .upload-demo {
    width: 100%;
  }

  .form-actions {
    margin-top: 40px;
    text-align: center;

    .el-button {
      margin: 0 10px;
      min-width: 100px;
    }
  }
}

:deep(.el-upload-dragger) {
  width: 100%;
}
</style>
