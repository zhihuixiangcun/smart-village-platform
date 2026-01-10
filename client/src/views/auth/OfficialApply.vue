<template>
  <div class="official-apply-container">
    <el-page-header @back="goBack" title="村干部申请" class="page-header" />

    <div class="apply-wrapper">
      <el-card class="apply-card">
        <template #header>
          <div class="card-header">
            <span>申请信息</span>
            <el-tag type="warning">待审核</el-tag>
          </div>
        </template>

        <el-form
          ref="applyFormRef"
          :model="applyForm"
          :rules="applyRules"
          label-width="120px"
          label-position="top"
        >
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="真实姓名" prop="name">
                <el-input v-model="applyForm.name" placeholder="请输入真实姓名" clearable />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="手机号" prop="phone">
                <el-input
                  v-model="applyForm.phone"
                  placeholder="请输入11位手机号"
                  maxlength="11"
                  clearable
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="身份证号" prop="idCard">
                <el-input
                  v-model="applyForm.idCard"
                  placeholder="请输入18位身份证号"
                  maxlength="18"
                  clearable
                />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item label="所属村庄" prop="villageId">
                <el-select
                  v-model="applyForm.villageId"
                  placeholder="请选择所属村庄"
                  style="width: 100%"
                  filterable
                >
                  <el-option
                    v-for="village in villages"
                    :key="village.id"
                    :label="village.name"
                    :value="village.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="申请职务" prop="position">
            <el-select
              v-model="applyForm.position"
              placeholder="请选择申请职务"
              style="width: 100%"
            >
              <el-option label="村书记" value="村书记" />
              <el-option label="村主任" value="村主任" />
              <el-option label="副主任" value="副主任" />
              <el-option label="会计" value="会计" />
              <el-option label="村委成员" value="村委成员" />
              <el-option label="工作人员" value="工作人员" />
            </el-select>
          </el-form-item>

          <el-form-item label="所属部门" prop="department">
            <el-input v-model="applyForm.department" placeholder="请输入所属部门" clearable />
          </el-form-item>

          <el-form-item label="家庭住址" prop="address">
            <el-input
              v-model="applyForm.address"
              type="textarea"
              :rows="3"
              placeholder="请输入详细家庭住址"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="申请理由" prop="reason">
            <el-input
              v-model="applyForm.reason"
              type="textarea"
              :rows="5"
              placeholder="请详细说明申请村干部职务的理由和计划（至少50字）"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="工作经验" prop="experience">
            <el-input
              v-model="applyForm.experience"
              type="textarea"
              :rows="4"
              placeholder="请简述相关工作经验（如有）"
              maxlength="300"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="个人特长" prop="skills">
            <el-checkbox-group v-model="applyForm.skills">
              <el-checkbox label="财务管理">财务管理</el-checkbox>
              <el-checkbox label="文书写作">文书写作</el-checkbox>
              <el-checkbox label="电脑操作">电脑操作</el-checkbox>
              <el-checkbox label="沟通协调">沟通协调</el-checkbox>
              <el-checkbox label="组织管理">组织管理</el-checkbox>
              <el-checkbox label="农业生产">农业生产</el-checkbox>
              <el-checkbox label="其他">其他</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item
            label="其他特长"
            prop="otherSkills"
            v-if="applyForm.skills.includes('其他')"
          >
            <el-input
              v-model="applyForm.otherSkills"
              placeholder="请说明其他特长"
              maxlength="100"
              clearable
            />
          </el-form-item>

          <el-form-item label="上传证件" prop="documents">
            <el-upload
              v-model:file-list="fileList"
              action="/api/v1/upload"
              list-type="picture-card"
              :limit="3"
              :on-exceed="handleExceed"
              :on-success="handleUploadSuccess"
              :before-upload="beforeUpload"
              :on-remove="handleRemove"
            >
              <el-icon><Plus /></el-icon>
              <template #tip>
                <div class="upload-tip">请上传身份证正反面照片（最多3张）</div>
              </template>
            </el-upload>
          </el-form-item>

          <el-form-item>
            <el-checkbox v-model="applyForm.agreement">
              我保证以上信息真实有效，愿意承担信息不实的法律责任
            </el-checkbox>
          </el-form-item>

          <el-form-item>
            <div style="width: 100%; display: flex; gap: 10px">
              <el-button size="large" @click="goBack"> 取消 </el-button>
              <el-button
                type="primary"
                size="large"
                :loading="loading"
                :disabled="!canSubmit"
                @click="handleSubmit"
              >
                提交申请
              </el-button>
            </div>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="info-card">
        <template #header>
          <span>申请须知</span>
        </template>

        <div class="info-content">
          <el-alert title="申请条件" type="info" :closable="false" show-icon>
            <ul>
              <li>年龄在18周岁以上，65周岁以下</li>
              <li>具备完全民事行为能力</li>
              <li>初中及以上学历</li>
              <li>熟悉电脑基本操作</li>
              <li>无不良信用记录</li>
              <li>热爱村务工作，有责任心</li>
            </ul>
          </el-alert>

          <el-alert
            title="审核流程"
            type="success"
            :closable="false"
            show-icon
            style="margin-top: 20px"
          >
            <el-timeline>
              <el-timeline-item timestamp="提交申请" placement="top">
                填写申请表并提交
              </el-timeline-item>
              <el-timeline-item timestamp="资格初审" placement="top">
                村管理员审核基本信息
              </el-timeline-item>
              <el-timeline-item timestamp="现场考察" placement="top">
                村委会组织考察和面试
              </el-timeline-item>
              <el-timeline-item timestamp="公示期" placement="top">
                在村务公开栏公示7天
              </el-timeline-item>
              <el-timeline-item timestamp="正式任命" placement="top">
                上级审核通过后正式任命
              </el-timeline-item>
            </el-timeline>
          </el-alert>

          <el-alert
            title="注意事项"
            type="warning"
            :closable="false"
            show-icon
            style="margin-top: 20px"
          >
            <ul>
              <li>申请信息必须真实有效，如发现弄虚作假将取消申请资格</li>
              <li>申请提交后可在"我的申请"中查看审核进度</li>
              <li>审核通过后需参加培训和考核</li>
              <li>任职期间需遵守村干部行为规范</li>
            </ul>
          </el-alert>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import villageUserApi from '@/api/villageUser';

const router = useRouter();

// 响应式数据
const loading = ref(false);
const villages = ref([]);
const fileList = ref([]);

// 表单引用
const applyFormRef = ref(null);

// 申请表单
const applyForm = reactive({
  name: '',
  phone: '',
  idCard: '',
  villageId: '',
  position: '',
  department: '',
  address: '',
  reason: '',
  experience: '',
  skills: [],
  otherSkills: '',
  documents: [],
  agreement: false,
});

// 表单验证规则
const applyRules = reactive({
  name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在2-20个字符', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号', trigger: 'blur' },
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    {
      pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
      message: '请输入正确的身份证号',
      trigger: 'blur',
    },
  ],
  villageId: [{ required: true, message: '请选择所属村庄', trigger: 'change' }],
  position: [{ required: true, message: '请选择申请职务', trigger: 'change' }],
  department: [{ required: true, message: '请输入所属部门', trigger: 'blur' }],
  address: [
    { required: true, message: '请输入家庭住址', trigger: 'blur' },
    { min: 5, max: 200, message: '住址长度在5-200个字符', trigger: 'blur' },
  ],
  reason: [
    { required: true, message: '请输入申请理由', trigger: 'blur' },
    { min: 50, max: 500, message: '申请理由在50-500个字符', trigger: 'blur' },
  ],
  skills: [
    {
      type: 'array',
      min: 1,
      message: '请至少选择一项个人特长',
      trigger: 'change',
    },
  ],
  documents: [
    {
      type: 'array',
      required: true,
      message: '请上传身份证照片',
      trigger: 'change',
    },
  ],
  agreement: [
    {
      type: 'enum',
      enum: [true],
      message: '请确认信息真实性并勾选同意',
      trigger: 'change',
    },
  ],
});

// 计算属性
const canSubmit = computed(() => {
  return (
    applyForm.name &&
    applyForm.phone &&
    applyForm.idCard &&
    applyForm.villageId &&
    applyForm.position &&
    applyForm.department &&
    applyForm.address &&
    applyForm.reason &&
    applyForm.skills.length > 0 &&
    fileList.value.length > 0 &&
    applyForm.agreement
  );
});

// 方法
const loadVillages = async () => {
  try {
    const response = await villageUserApi.getVillages();
    villages.value = response.data || [];
  } catch (error) {
    console.error('获取村庄列表失败:', error);
    ElMessage.error('获取村庄列表失败');
  }
};

const handleExceed = () => {
  ElMessage.warning('最多只能上传3张图片');
};

const beforeUpload = file => {
  const isImage = file.type.startsWith('image/');
  const isLt5M = file.size / 1024 / 1024 < 5;

  if (!isImage) {
    ElMessage.error('只能上传图片文件!');
    return false;
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过5MB!');
    return false;
  }
  return true;
};

const handleUploadSuccess = (response, file) => {
  if (response.success) {
    applyForm.documents.push(response.data.url);
    ElMessage.success('上传成功');
  } else {
    ElMessage.error(response.message || '上传失败');
    // 移除失败的文件
    fileList.value = fileList.value.filter(item => item.uid !== file.uid);
  }
};

const handleRemove = file => {
  const index = fileList.value.findIndex(item => item.uid === file.uid);
  if (index > -1) {
    applyForm.documents.splice(index, 1);
  }
};

const goBack = () => {
  router.back();
};

const handleSubmit = async () => {
  if (!applyFormRef.value) return;

  try {
    await applyFormRef.value.validate();
  } catch (error) {
    return;
  }

  loading.value = true;
  try {
    const { agreement, ...submitData } = applyForm;
    submitData.role = 'village_official';
    submitData.status = 'pending'; // 待审核状态

    await villageUserApi.applyOfficial(submitData);

    ElMessage.success('申请提交成功！请耐心等待审核结果');

    // 跳转到我的申请页面
    setTimeout(() => {
      router.push('/profile/my-applications');
    }, 1500);
  } catch (error) {
    console.error('提交申请失败:', error);
    ElMessage.error(error.response?.data?.message || '提交申请失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

// 生命周期
onMounted(() => {
  loadVillages();
});
</script>

<style scoped>
.official-apply-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.page-header {
  background: white;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 8px;
}

.apply-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.apply-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.info-content {
  margin-top: 20px;
}

.upload-tip {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.info-content ul {
  margin: 0;
  padding-left: 20px;
}

.info-content li {
  margin-bottom: 8px;
  color: #666;
  line-height: 1.6;
}

@media (max-width: 1200px) {
  .apply-wrapper {
    grid-template-columns: 1fr;
  }
}
</style>
