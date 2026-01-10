<template>
  <div class="transport-application" :class="{ 'large-text-mode': isLargeText }">
    <StepForm
      ref="stepFormRef"
      :steps="steps"
      :step-components="[BasicInfoStep, UploadStep, ConfirmStep]"
      :initial-data="formData"
      :show-progress="true"
      :enable-voice="true"
      @update="handleUpdate"
      @submit="handleSubmit"
      @voice-input="handleVoiceInput"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import StepForm from '@/components/common/StepForm.vue';
import { useLargeText } from '@/composables/useLargeText';
import { profileApi } from '@/api/residentProfile';
import { serviceApi } from '@/api/service';
import { encryptionService } from '@/utils/encryption';
import { auditLogService } from '@/utils/security';

const props = defineProps({
  service: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['close', 'submitted']);

const { isLargeText } = useLargeText();

const stepFormRef = ref(null);

// 步骤配置
const steps = [
  {
    title: '基本信息',
    description: '填写申请人基本资料',
  },
  {
    title: '补贴详情',
    description: '填写补贴相关信息',
  },
  {
    title: '材料上传',
    description: '上传证明材料',
  },
  {
    title: '确认提交',
    description: '核对信息并提交',
  },
];

// 表单数据
const formData = reactive({
  // 基本信息
  applicantName: '',
  applicantIdCard: '',
  applicantPhone: '',
  address: '',

  // 补贴类型
  subsidyType: '', // 补贴类型: 公交, 铁路, 航空, 其他

  // 出行信息
  tripPurpose: '', // 出行目的
  tripRoute: '', // 出行路线
  tripFrequency: '', // 出行频率: 每天, 每周, 每月, 偶尔

  // 特殊情况
  specialCondition: '', // 特殊情况: 残疾, 老年(60+), 学生, 孕妇, 其他
  conditionDescription: '', // 特殊情况说明

  // 银行信息
  bankName: '',
  bankAccount: '',
  accountHolder: '',

  // 材料上传
  idCardPhotos: [],
  householdPhotos: [],
  bankCardPhotos: [],
  disabilityCard: [], // 残疾证(如适用)
  studentCard: [], // 学生证(如适用)
  elderlyCard: [], // 老人证(如适用)
  otherMaterials: [],

  // 备注
  remark: '',
});

// 补贴类型选项
const subsidyTypes = [
  { label: '公交补贴', value: 'bus' },
  { label: '铁路优惠', value: 'railway' },
  { label: '航空优惠', value: 'aviation' },
  { label: '其他', value: 'other' },
];

// 出行目的选项
const tripPurposes = ['上班通勤', '上学', '就医', '探亲', '购物', '其他'];

// 出行频率选项
const tripFrequencies = ['每天', '每周', '每月', '偶尔'];

// 特殊情况选项
const specialConditions = [
  { label: '残疾', value: 'disability' },
  { label: '老年(60周岁以上)', value: 'elderly' },
  { label: '学生', value: 'student' },
  { label: '孕妇', value: 'pregnant' },
  { label: '其他', value: 'other' },
];

// 组件
const BasicInfoStep = {
  template: `
    <div class="basic-info-step">
      <el-alert
        title="申请须知"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        <template #default>
          <p>1. 交通补贴面向特殊群体提供优惠出行服务</p>
          <p>2. 需提供相关证明材料(如残疾证、学生证等)</p>
          <p>3. 补贴标准根据不同地区和政策有所不同</p>
        </template>
      </el-alert>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="140px"
        label-position="left"
      >
        <el-form-item label="申请人姓名" prop="applicantName">
          <el-input
            v-model="formData.applicantName"
            placeholder="请输入申请人姓名"
            :disabled="true"
          >
            <template #append>
              <el-button icon="Microphone" @click="$emit('voice-input', 'applicantName')" />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="身份证号" prop="applicantIdCard">
          <el-input
            v-model="formData.applicantIdCard"
            placeholder="请输入身份证号"
            :disabled="true"
          />
        </el-form-item>

        <el-form-item label="联系电话" prop="applicantPhone">
          <el-input
            v-model="formData.applicantPhone"
            placeholder="请输入联系电话"
            type="tel"
          >
            <template #prepend>
              <el-icon><Phone /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="现住址" prop="address">
          <el-input
            v-model="formData.address"
            type="textarea"
            :rows="3"
            placeholder="请输入详细地址"
          />
        </el-form-item>
      </el-form>
    </div>
  `,
  props: ['formData'],
  emits: ['update', 'validate', 'voice-input'],
  setup(props, { emit }) {
    const { Phone } = useElementPlusIcons();

    const rules = {
      applicantName: [{ required: true, message: '请输入申请人姓名', trigger: 'blur' }],
      applicantIdCard: [
        { required: true, message: '请输入身份证号', trigger: 'blur' },
        {
          pattern: /^(\d{15}$|^\d{18}$|^\d{17}(\d|X|x)$)/,
          message: '请输入正确的身份证号',
          trigger: 'blur',
        },
      ],
      applicantPhone: [
        { required: true, message: '请输入联系电话', trigger: 'blur' },
        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
      ],
      address: [{ required: true, message: '请输入现住址', trigger: 'blur' }],
    };

    // 加载用户信息
    const loadUserInfo = async () => {
      try {
        const response = await profileApi.getMyProfile();
        const profile = response.data;

        if (profile) {
          props.formData.applicantName = profile.personalInfo?.name || '';
          props.formData.applicantIdCard = profile.personalInfo?.idCard || '';
          props.formData.applicantPhone = profile.contact?.phone || '';
          props.formData.address = profile.contact?.address || '';
        }
      } catch (error) {
        console.error('Load user info error:', error);
      }
    };

    onMounted(() => {
      loadUserInfo();
    });

    return { rules, Phone };
  },
};

const SubsidyDetailStep = {
  template: `
    <div class="subsidy-detail-step">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="140px"
        label-position="left"
      >
        <h3 class="section-title">补贴信息</h3>

        <el-form-item label="补贴类型" prop="subsidyType">
          <el-select v-model="formData.subsidyType" placeholder="选择补贴类型" style="width: 100%">
            <el-option
              v-for="type in subsidyTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="出行目的" prop="tripPurpose">
          <el-select v-model="formData.tripPurpose" placeholder="选择出行目的" style="width: 100%">
            <el-option
              v-for="purpose in tripPurposes"
              :key="purpose"
              :label="purpose"
              :value="purpose"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="出行路线" prop="tripRoute">
          <el-input
            v-model="formData.tripRoute"
            type="textarea"
            :rows="2"
            placeholder="请描述常用出行路线(如:从XX村到XX镇)"
          />
        </el-form-item>

        <el-form-item label="出行频率" prop="tripFrequency">
          <el-radio-group v-model="formData.tripFrequency">
            <el-radio
              v-for="freq in tripFrequencies"
              :key="freq"
              :label="freq"
            >
              {{ freq }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-divider />

        <h3 class="section-title">特殊情况</h3>

        <el-form-item label="特殊情况" prop="specialCondition">
          <el-radio-group v-model="formData.specialCondition">
            <el-radio
              v-for="condition in specialConditions"
              :key="condition.value"
              :label="condition.value"
            >
              {{ condition.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="情况说明">
          <el-input
            v-model="formData.conditionDescription"
            type="textarea"
            :rows="3"
            placeholder="请详细说明特殊情况"
          />
        </el-form-item>

        <el-divider />

        <h3 class="section-title">银行信息</h3>

        <el-form-item label="开户银行">
          <el-input
            v-model="formData.bankName"
            placeholder="请输入开户银行"
          />
        </el-form-item>

        <el-form-item label="银行账号">
          <el-input
            v-model="formData.bankAccount"
            placeholder="请输入银行账号"
          />
        </el-form-item>

        <el-form-item label="账户持有人">
          <el-input
            v-model="formData.accountHolder"
            placeholder="请输入账户持有人姓名"
          />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="3"
            placeholder="其他需要说明的情况"
          />
        </el-form-item>
      </el-form>
    </div>
  `,
  props: ['formData'],
  emits: ['update', 'validate'],
  setup(props, { emit }) {
    const subsidyTypes = [
      { label: '公交补贴', value: 'bus' },
      { label: '铁路优惠', value: 'railway' },
      { label: '航空优惠', value: 'aviation' },
      { label: '其他', value: 'other' },
    ];

    const tripPurposes = ['上班通勤', '上学', '就医', '探亲', '购物', '其他'];

    const tripFrequencies = ['每天', '每周', '每月', '偶尔'];

    const specialConditions = [
      { label: '残疾', value: 'disability' },
      { label: '老年(60周岁以上)', value: 'elderly' },
      { label: '学生', value: 'student' },
      { label: '孕妇', value: 'pregnant' },
      { label: '其他', value: 'other' },
    ];

    const rules = {
      subsidyType: [{ required: true, message: '请选择补贴类型', trigger: 'change' }],
      tripPurpose: [{ required: true, message: '请选择出行目的', trigger: 'change' }],
      tripRoute: [{ required: true, message: '请输入出行路线', trigger: 'blur' }],
      tripFrequency: [{ required: true, message: '请选择出行频率', trigger: 'change' }],
      specialCondition: [{ required: true, message: '请选择特殊情况', trigger: 'change' }],
    };

    return { subsidyTypes, tripPurposes, tripFrequencies, specialConditions, rules };
  },
};

const UploadStep = {
  template: `
    <div class="upload-step">
      <el-alert
        title="材料上传要求"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 24px"
      >
        <template #default>
          <p>1. 所有材料需真实有效,提供原件照片或扫描件</p>
          <p>2. 支持JPG、PNG格式,单个文件不超过5MB</p>
          <p>3. 根据申请的特殊情况上传相应证明</p>
        </template>
      </el-alert>

      <div class="upload-section">
        <div class="upload-item">
          <h4>身份证照片 <span class="required">*</span></h4>
          <p class="upload-tip">请上传身份证正反面照片</p>
          <ImageUploader
            v-model="formData.idCardPhotos"
            :required="true"
            :multiple="true"
            :max-count="2"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>户口本照片 <span class="required">*</span></h4>
          <p class="upload-tip">请上传户口本首页和本人页</p>
          <ImageUploader
            v-model="formData.householdPhotos"
            :required="true"
            :multiple="true"
            :max-count="4"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>银行卡照片 <span class="required">*</span></h4>
          <p class="upload-tip">请上传银行卡正面照片</p>
          <ImageUploader
            v-model="formData.bankCardPhotos"
            :required="true"
            :multiple="true"
            :max-count="2"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item" v-if="formData.specialCondition === 'disability'">
          <h4>残疾证 <span class="required">*</span></h4>
          <p class="upload-tip">请上传残疾证照片</p>
          <ImageUploader
            v-model="formData.disabilityCard"
            :required="true"
            :multiple="true"
            :max-count="4"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item" v-if="formData.specialCondition === 'student'">
          <h4>学生证 <span class="required">*</span></h4>
          <p class="upload-tip">请上传学生证照片</p>
          <ImageUploader
            v-model="formData.studentCard"
            :required="true"
            :multiple="true"
            :max-count="4"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item" v-if="formData.specialCondition === 'elderly'">
          <h4>老人证</h4>
          <p class="upload-tip">如有老人证请上传</p>
          <ImageUploader
            v-model="formData.elderlyCard"
            :multiple="true"
            :max-count="2"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>其他材料</h4>
          <p class="upload-tip">如有其他证明材料可上传</p>
          <ImageUploader
            v-model="formData.otherMaterials"
            :multiple="true"
            :max-count="10"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>
      </div>
    </div>
  `,
  props: ['formData'],
  emits: ['update', 'validate'],
  setup(props, { emit }) {
    const handleUpdate = () => {
      emit('update', { ...props.formData });
    };

    const handleValidate = isValid => {
      emit('validate', isValid);
    };

    return { handleUpdate, handleValidate };
  },
};

const ConfirmStep = {
  template: `
    <div class="confirm-step">
      <el-result
        icon="warning"
        title="请核对您的申请信息"
        sub-title="确认信息无误后点击提交按钮"
      />

      <el-descriptions
        :column="2"
        border
        style="margin: 24px 0"
      >
        <el-descriptions-item label="申请人姓名">
          {{ formData.applicantName }}
        </el-descriptions-item>
        <el-descriptions-item label="身份证号">
          {{ maskIdCard(formData.applicantIdCard) }}
        </el-descriptions-item>

        <el-descriptions-item label="联系电话">
          {{ maskPhone(formData.applicantPhone) }}
        </el-descriptions-item>
        <el-descriptions-item label="补贴类型">
          {{ getSubsidyTypeLabel(formData.subsidyType) }}
        </el-descriptions-item>

        <el-descriptions-item label="出行目的">
          {{ formData.tripPurpose }}
        </el-descriptions-item>
        <el-descriptions-item label="出行频率">
          {{ formData.tripFrequency }}
        </el-descriptions-item>

        <el-descriptions-item label="出行路线" :span="2">
          {{ formData.tripRoute }}
        </el-descriptions-item>

        <el-descriptions-item label="特殊情况">
          {{ getSpecialConditionLabel(formData.specialCondition) }}
        </el-descriptions-item>
        <el-descriptions-item label="开户银行">
          {{ formData.bankName }}
        </el-descriptions-item>

        <el-descriptions-item label="银行账号" :span="2">
          {{ maskBankCard(formData.bankAccount) }}
        </el-descriptions-item>
      </el-descriptions>

      <el-divider>已上传材料</el-divider>

      <div class="uploaded-files">
        <el-tag
          v-for="(file, index) in getUploadedFiles()"
          :key="index"
          type="success"
          size="large"
          style="margin: 0 8px 8px 0"
        >
          {{ file.name }}
        </el-tag>
      </div>

      <el-checkbox
        v-model="confirmed"
        style="margin-top: 24px"
        @change="handleConfirmChange"
      >
        我确认以上信息真实有效,如有虚假愿意承担法律责任
      </el-checkbox>
    </div>
  `,
  props: ['formData'],
  emits: ['validate'],
  setup(props, { emit }) {
    const confirmed = ref(false);

    const maskIdCard = idCard => {
      if (!idCard) return '';
      return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
    };

    const maskPhone = phone => {
      if (!phone) return '';
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    };

    const maskBankCard = card => {
      if (!card) return '';
      return card.replace(/(\d{4})\d+(\d{4})/, '$1 **** **** $2');
    };

    const getSubsidyTypeLabel = type => {
      const map = {
        bus: '公交补贴',
        railway: '铁路优惠',
        aviation: '航空优惠',
        other: '其他',
      };
      return map[type] || type;
    };

    const getSpecialConditionLabel = condition => {
      const map = {
        disability: '残疾',
        elderly: '老年(60周岁以上)',
        student: '学生',
        pregnant: '孕妇',
        other: '其他',
      };
      return map[condition] || condition;
    };

    const getUploadedFiles = () => {
      const files = [];
      if (props.formData.idCardPhotos?.length) {
        files.push({ name: '身份证照片' });
      }
      if (props.formData.householdPhotos?.length) {
        files.push({ name: '户口本照片' });
      }
      if (props.formData.bankCardPhotos?.length) {
        files.push({ name: '银行卡照片' });
      }
      if (props.formData.disabilityCard?.length) {
        files.push({ name: '残疾证' });
      }
      if (props.formData.studentCard?.length) {
        files.push({ name: '学生证' });
      }
      if (props.formData.elderlyCard?.length) {
        files.push({ name: '老人证' });
      }
      if (props.formData.otherMaterials?.length) {
        files.push({ name: '其他材料' });
      }
      return files;
    };

    const handleConfirmChange = val => {
      emit('validate', val);
    };

    return {
      confirmed,
      maskIdCard,
      maskPhone,
      maskBankCard,
      getSubsidyTypeLabel,
      getSpecialConditionLabel,
      getUploadedFiles,
      handleConfirmChange,
    };
  },
};

// 处理数据更新
const handleUpdate = data => {
  Object.assign(formData, data);
};

// 处理语音输入
const handleVoiceInput = (field, text) => {
  if (field === 'applicantName') {
    const nameMatch = text.match(/(?:我叫|我是|姓名是)([\u4e00-\u9fa5]{2,4})/);
    if (nameMatch) {
      formData.applicantName = nameMatch[1];
      ElMessage.success(`已识别姓名: ${formData.applicantName}`);
    }
  }
};

// 提交申请
const handleSubmit = async data => {
  try {
    // 加密敏感信息
    const encryptedData = {
      ...data,
      applicantIdCard: encryptionService.encrypt(data.applicantIdCard),
      applicantPhone: encryptionService.encrypt(data.applicantPhone),
      bankAccount: encryptionService.encrypt(data.bankAccount),
    };

    await serviceApi.submitTransportApplication({
      ...encryptedData,
      serviceType: 'transport',
      serviceName: '交通补贴申请',
    });

    // 记录操作日志
    await auditLogService.logApplicationSubmit('transport', '交通补贴申请');

    ElMessage.success('申请已提交,请耐心等待审核');
    emit('submitted', data);
    emit('close');
  } catch (error) {
    ElMessage.error('提交失败: ' + error.message);
    throw error;
  }
};
</script>

<style lang="scss" scoped>
.transport-application {
  .basic-info-step,
  .subsidy-detail-step {
    :deep(.el-form-item__label) {
      font-weight: 500;
    }

    .section-title {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
      padding-bottom: 8px;
      border-bottom: 2px solid #409eff;
    }
  }

  .upload-step {
    .upload-section {
      display: flex;
      flex-direction: column;
      gap: 32px;

      .upload-item {
        h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          color: #303133;

          .required {
            color: #f56c6c;
            margin-left: 4px;
          }
        }

        .upload-tip {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #909399;
        }
      }
    }
  }

  .confirm-step {
    .uploaded-files {
      margin: 16px 0;
    }
  }
}

// 大字模式适配
.large-text-mode {
  .transport-application {
    .upload-step {
      .upload-section {
        gap: 40px;

        .upload-item {
          h4 {
            font-size: 19px;
          }

          .upload-tip {
            font-size: 16px;
          }
        }
      }
    }
  }
}
</style>
