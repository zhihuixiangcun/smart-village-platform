<template>
  <div class="resident-quick-form">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-position="top"
      class="mobile-form"
    >
      <!-- 基本信息 -->
      <div class="form-section">
        <h3 class="section-title">基本信息</h3>

        <el-form-item label="姓名" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入姓名"
            clearable
            :prefix-icon="User"
          />
        </el-form-item>

        <div class="form-row">
          <el-form-item label="性别" prop="gender" class="flex-1">
            <el-select v-model="formData.gender" placeholder="请选择" style="width: 100%">
              <el-option label="男" value="male" />
              <el-option label="女" value="female" />
            </el-select>
          </el-form-item>

          <el-form-item label="出生日期" prop="birthDate" class="flex-1">
            <el-date-picker
              v-model="formData.birthDate"
              type="date"
              placeholder="选择日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </div>

        <el-form-item label="身份证号" prop="idCard">
          <el-input
            v-model="formData.idCard"
            placeholder="请输入身份证号"
            clearable
            maxlength="18"
            show-word-limit
            @blur="extractInfoFromIdCard"
          />
        </el-form-item>

        <el-form-item label="手机号" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入手机号" clearable maxlength="11">
            <template #suffix>
              <el-button type="text" size="small" @click="pickFromContacts" icon="AddressBook">
                通讯录
              </el-button>
            </template>
          </el-input>
        </el-form-item>
      </div>

      <!-- 居住信息 -->
      <div class="form-section">
        <h3 class="section-title">居住信息</h3>

        <el-form-item label="家庭住址" prop="address">
          <div class="address-selector">
            <el-cascader
              v-model="formData.region"
              :options="regionOptions"
              placeholder="请选择地区"
              style="width: 100%"
              @change="handleRegionChange"
            />
          </div>
          <el-input
            v-model="formData.detailAddress"
            placeholder="请输入详细地址"
            clearable
            style="margin-top: 12px"
          />
        </el-form-item>

        <el-form-item label="户籍类型" prop="householdType">
          <el-select v-model="formData.householdType" placeholder="请选择" style="width: 100%">
            <el-option label="农业户口" value="agricultural" />
            <el-option label="非农业户口" value="nonAgricultural" />
            <el-option label="集体户口" value="collective" />
          </el-select>
        </el-form-item>
      </div>

      <!-- 家庭信息 -->
      <div class="form-section">
        <h3 class="section-title">家庭信息</h3>

        <el-form-item label="婚姻状况" prop="maritalStatus">
          <el-radio-group v-model="formData.maritalStatus" class="mobile-radio-group">
            <el-radio value="single">未婚</el-radio>
            <el-radio value="married">已婚</el-radio>
            <el-radio value="divorced">离异</el-radio>
            <el-radio value="widowed">丧偶</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="教育程度" prop="education">
          <el-select v-model="formData.education" placeholder="请选择" style="width: 100%">
            <el-option label="小学及以下" value="primary" />
            <el-option label="初中" value="junior" />
            <el-option label="高中/中专" value="senior" />
            <el-option label="大专" value="college" />
            <el-option label="本科" value="bachelor" />
            <el-option label="研究生及以上" value="master" />
          </el-select>
        </el-form-item>

        <el-form-item label="职业" prop="occupation">
          <el-input v-model="formData.occupation" placeholder="请输入职业" clearable />
        </el-form-item>
      </div>

      <!-- 特殊标签 -->
      <div class="form-section">
        <h3 class="section-title">特殊标签</h3>

        <div class="tag-selector">
          <div class="tag-group">
            <h4>身份标签</h4>
            <div class="tag-list">
              <el-tag
                v-for="tag in identityTags"
                :key="tag.key"
                :type="formData.tags.includes(tag.key) ? '' : 'info'"
                :effect="formData.tags.includes(tag.key) ? 'dark' : 'plain'"
                @click="toggleTag(tag.key)"
                class="tag-item"
              >
                {{ tag.label }}
              </el-tag>
            </div>
          </div>

          <div class="tag-group">
            <h4>健康标签</h4>
            <div class="tag-list">
              <el-tag
                v-for="tag in healthTags"
                :key="tag.key"
                :type="formData.tags.includes(tag.key) ? 'danger' : 'info'"
                :effect="formData.tags.includes(tag.key) ? 'dark' : 'plain'"
                @click="toggleTag(tag.key)"
                class="tag-item"
              >
                {{ tag.label }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 紧急联系人 -->
      <div class="form-section">
        <h3 class="section-title">紧急联系人</h3>

        <div class="emergency-contact">
          <el-form-item label="联系人姓名" prop="emergencyContact.name">
            <el-input
              v-model="formData.emergencyContact.name"
              placeholder="请输入联系人姓名"
              clearable
            />
          </el-form-item>

          <el-form-item label="联系人电话" prop="emergencyContact.phone">
            <el-input
              v-model="formData.emergencyContact.phone"
              placeholder="请输入联系人电话"
              clearable
            />
          </el-form-item>

          <el-form-item label="关系" prop="emergencyContact.relationship">
            <el-select
              v-model="formData.emergencyContact.relationship"
              placeholder="请选择"
              style="width: 100%"
            >
              <el-option label="配偶" value="spouse" />
              <el-option label="父母" value="parent" />
              <el-option label="子女" value="child" />
              <el-option label="兄弟姐妹" value="sibling" />
              <el-option label="其他亲属" value="other" />
            </el-select>
          </el-form-item>
        </div>
      </div>

      <!-- 备注信息 -->
      <div class="form-section">
        <h3 class="section-title">备注信息</h3>

        <el-form-item label="备注" prop="remarks">
          <el-input
            v-model="formData.remarks"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </div>

      <!-- 照片上传 -->
      <div class="form-section">
        <h3 class="section-title">照片上传</h3>

        <div class="photo-upload">
          <el-upload
            :action="uploadUrl"
            :headers="uploadHeaders"
            :show-file-list="false"
            :before-upload="beforePhotoUpload"
            :on-success="handlePhotoSuccess"
            class="photo-uploader"
          >
            <div v-if="formData.photo" class="photo-preview">
              <img :src="formData.photo" alt="照片预览" />
              <div class="photo-overlay">
                <el-icon><Camera /></el-icon>
                <span>重新上传</span>
              </div>
            </div>
            <div v-else class="photo-upload-btn">
              <el-icon size="32"><Plus /></el-icon>
              <span>上传照片</span>
            </div>
          </el-upload>
        </div>
      </div>
    </el-form>

    <!-- 底部操作栏 -->
    <div class="form-footer">
      <el-button @click="handleCancel" size="large">取消</el-button>
      <el-button
        type="primary"
        @click="handleSubmit"
        size="large"
        :loading="submitting"
        style="flex: 1"
      >
        {{ isEdit ? '更新' : '添加' }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { User, Camera, Plus, AddressBook } from '@element-plus/icons-vue';

// Props
const props = defineProps({
  resident: {
    type: Object,
    default: null,
  },
});

// Emits
const emit = defineEmits(['success', 'cancel']);

// 响应式数据
const formRef = ref(null);
const submitting = ref(false);
const uploadUrl = '/api/upload/photo';
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
}));

const isEdit = computed(() => !!props.resident);

// 表单数据
const formData = reactive({
  name: '',
  gender: '',
  birthDate: '',
  idCard: '',
  phone: '',
  region: [],
  detailAddress: '',
  householdType: '',
  maritalStatus: '',
  education: '',
  occupation: '',
  tags: [],
  emergencyContact: {
    name: '',
    phone: '',
    relationship: '',
  },
  remarks: '',
  photo: '',
});

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 10, message: '姓名长度应在2-10个字符', trigger: 'blur' },
  ],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    {
      pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
      message: '身份证号格式错误',
      trigger: 'blur',
    },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式错误', trigger: 'blur' },
  ],
  maritalStatus: [{ required: true, message: '请选择婚姻状况', trigger: 'change' }],
};

// 地区选项
const regionOptions = ref([]);

// 标签选项
const identityTags = ref([
  { key: 'party', label: '党员' },
  { key: 'veteran', label: '退伍军人' },
  { key: 'cadre', label: '村干部' },
  { key: 'volunteer', label: '志愿者' },
  { key: 'grid', label: '网格员' },
]);

const healthTags = ref([
  { key: 'elderly', label: '老年人' },
  { key: 'disabled', label: '残疾人' },
  { key: 'lowIncome', label: '低保户' },
  { key: 'chronic', label: '慢性病' },
  { key: 'lonely', label: '独居' },
]);

// 方法
const loadRegionOptions = async () => {
  // 模拟加载地区数据
  regionOptions.value = [
    {
      value: '330000',
      label: '浙江省',
      children: [
        {
          value: '330100',
          label: '杭州市',
          children: [
            { value: '330102', label: '上城区' },
            { value: '330103', label: '下城区' },
            { value: '330104', label: '江干区' },
            { value: '330105', label: '拱墅区' },
            { value: '330106', label: '西湖区' },
          ],
        },
        {
          value: '330200',
          label: '宁波市',
          children: [
            { value: '330203', label: '海曙区' },
            { value: '330205', label: '江北区' },
            { value: '330206', label: '北仑区' },
            { value: '330211', label: '镇海区' },
            { value: '330212', label: '鄞州区' },
          ],
        },
      ],
    },
  ];
};

const extractInfoFromIdCard = () => {
  const idCard = formData.idCard;
  if (!idCard || idCard.length !== 18) return;

  // 提取出生日期
  const birthDate = `${idCard.slice(6, 10)}-${idCard.slice(10, 12)}-${idCard.slice(12, 14)}`;
  formData.birthDate = birthDate;

  // 提取性别
  const genderCode = parseInt(idCard.slice(16, 17));
  formData.gender = genderCode % 2 === 1 ? 'male' : 'female';

  ElMessage.success('已自动提取身份证信息');
};

const handleRegionChange = value => {
  // 根据选择的地区做相应处理
};

const toggleTag = tagKey => {
  const index = formData.tags.indexOf(tagKey);
  if (index > -1) {
    formData.tags.splice(index, 1);
  } else {
    formData.tags.push(tagKey);
  }
};

const pickFromContacts = async () => {
  // 检查是否支持通讯录API
  if (!('contacts' in navigator)) {
    ElMessage.warning('当前浏览器不支持通讯录功能');
    return;
  }

  try {
    const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
    if (contacts.length > 0) {
      const contact = contacts[0];
      formData.phone = contact.tel[0];
      ElMessage.success('已从通讯录获取手机号');
    }
  } catch (error) {
    ElMessage.error('获取通讯录失败');
  }
};

const beforePhotoUpload = file => {
  const isImage = file.type.startsWith('image/');
  const isLt2M = file.size / 1024 / 1024 < 2;

  if (!isImage) {
    ElMessage.error('只能上传图片文件');
    return false;
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过2MB');
    return false;
  }
  return true;
};

const handlePhotoSuccess = response => {
  if (response.code === 200) {
    formData.photo = response.data.url;
    ElMessage.success('照片上传成功');
  } else {
    ElMessage.error(response.message || '上传失败');
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitting.value = true;

    // 构建完整地址
    const address = {
      region: formData.region,
      detail: formData.detailAddress,
    };

    const submitData = {
      ...formData,
      address,
      age: calculateAge(formData.birthDate),
    };

    // 调用API
    if (isEdit.value) {
      await updateResident(props.resident.id, submitData);
      ElMessage.success('更新成功');
    } else {
      await createResident(submitData);
      ElMessage.success('添加成功');
    }

    emit('success', submitData);
  } catch (error) {
    if (error.message) {
      ElMessage.error(error.message);
    }
  } finally {
    submitting.value = false;
  }
};

const handleCancel = () => {
  emit('cancel');
};

const calculateAge = birthDate => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const createResident = async data => {
  // 模拟API调用
  await new Promise(resolve => setTimeout(resolve, 1000));
};

const updateResident = async (id, data) => {
  // 模拟API调用
  await new Promise(resolve => setTimeout(resolve, 1000));
};

// 初始化数据
const initFormData = () => {
  if (props.resident) {
    Object.assign(formData, props.resident);
    if (props.resident.address) {
      formData.region = props.resident.address.region || [];
      formData.detailAddress = props.resident.address.detail || '';
    }
  }
};

// 生命周期
onMounted(() => {
  loadRegionOptions();
  initFormData();
});
</script>

<style lang="scss" scoped>
.resident-quick-form {
  max-height: 100vh;
  display: flex;
  flex-direction: column;

  .mobile-form {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    padding-bottom: 80px;

    .form-section {
      margin-bottom: 24px;

      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin: 0 0 16px 0;
        padding-bottom: 8px;
        border-bottom: 2px solid #409eff;
      }

      .form-row {
        display: flex;
        gap: 12px;

        .flex-1 {
          flex: 1;
        }
      }

      .mobile-radio-group {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;

        :deep(.el-radio) {
          margin-right: 0;
        }

        :deep(.el-radio__label) {
          font-size: 14px;
        }
      }

      .address-selector {
        :deep(.el-cascader) {
          width: 100%;
        }
      }

      .tag-selector {
        .tag-group {
          margin-bottom: 16px;

          h4 {
            font-size: 14px;
            color: #666;
            margin: 0 0 8px 0;
          }

          .tag-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;

            .tag-item {
              cursor: pointer;
              user-select: none;
              transition: all 0.2s;

              &:active {
                transform: scale(0.95);
              }
            }
          }
        }
      }

      .emergency-contact {
        background: #f5f7fa;
        padding: 12px;
        border-radius: 8px;
      }

      .photo-upload {
        .photo-uploader {
          width: 100%;

          :deep(.el-upload) {
            width: 100%;
            border: 2px dashed #dcdfe6;
            border-radius: 8px;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            transition: all 0.3s;

            &:hover {
              border-color: #409eff;
            }
          }

          .photo-preview {
            width: 100%;
            height: 200px;
            position: relative;

            img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .photo-overlay {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.5);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: white;
              opacity: 0;
              transition: opacity 0.3s;

              .el-icon {
                font-size: 24px;
                margin-bottom: 8px;
              }
            }

            &:hover .photo-overlay {
              opacity: 1;
            }
          }

          .photo-upload-btn {
            height: 200px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #8c939d;

            .el-icon {
              margin-bottom: 8px;
            }
          }
        }
      }
    }
  }

  .form-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    padding: 16px;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    display: flex;
    gap: 12px;
    z-index: 100;

    .el-button {
      height: 44px;
      font-size: 16px;
    }
  }
}

// 移动端表单优化
:deep(.el-form-item__label) {
  font-weight: 500;
  color: #333;
  padding-bottom: 8px;
}

:deep(.el-input__inner) {
  height: 44px;
  font-size: 16px;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-date-editor.el-input) {
  width: 100%;
}

:deep(.el-upload) {
  width: 100%;
}
</style>
