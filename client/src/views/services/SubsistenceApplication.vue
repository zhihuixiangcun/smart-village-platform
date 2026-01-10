<template>
  <div class="subsistence-application" :class="{ 'large-text-mode': isLargeText }">
    <StepForm
      ref="stepFormRef"
      :steps="steps"
      :step-components="[BasicInfoStep, FamilyInfoStep, UploadStep, ConfirmStep]"
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
import { ref, reactive, onMounted, computed } from 'vue';
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
    title: '家庭情况',
    description: '填写家庭成员及经济状况',
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
  householdType: '', // 户口性质: 农业, 非农业
  householdRegistration: '', // 户口所在地

  // 家庭情况
  familyCount: 0, // 家庭人口数
  familyMembers: [], // 家庭成员列表
  monthlyIncome: 0, // 月收入(元)
  yearlyIncome: 0, // 年收入(元)
  incomeSource: '', // 收入来源
  property: 0, // 房产情况(套数)
  housingArea: 0, // 住房面积(平方米)
  vehicle: 0, // 车辆数量
  deposits: 0, // 存款(万元)
  debts: 0, // 债务(万元)

  // 困难原因
  difficulties: [], // 困难类型
  difficultyReason: '', // 困难原因说明
  specialSituation: '', // 特殊情况说明

  // 材料上传
  idCardPhotos: [],
  householdPhotos: [],
  incomeProof: [],
  medicalProof: [],
  disabilityProof: [],
  otherMaterials: [],

  // 备注
  remark: '',
});

// 困难类型选项
const difficultyOptions = [
  { label: '疾病', value: 'illness' },
  { label: '残疾', value: 'disability' },
  { label: '失业', value: 'unemployment' },
  { label: '子女教育', value: 'education' },
  { label: '老年人', value: 'elderly' },
  { label: '单亲家庭', value: 'single' },
  { label: '遭遇自然灾害', value: 'disaster' },
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
          <p>1. 低保申请需家庭人均月收入低于当地最低生活保障标准</p>
          <p>2. 需如实申报家庭财产和经济状况</p>
          <p>3. 提供虚假材料将承担法律责任</p>
          <p>4. 审核通过后将进行公示</p>
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

        <el-form-item label="户口性质" prop="householdType">
          <el-radio-group v-model="formData.householdType">
            <el-radio label="农业">农业户口</el-radio>
            <el-radio label="非农业">非农业户口</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="户口所在地" prop="householdRegistration">
          <el-input
            v-model="formData.householdRegistration"
            placeholder="请输入户口所在地"
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
      householdType: [{ required: true, message: '请选择户口性质', trigger: 'change' }],
      householdRegistration: [{ required: true, message: '请输入户口所在地', trigger: 'blur' }],
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

const FamilyInfoStep = {
  template: `
    <div class="family-info-step">
      <el-alert
        title="家庭情况说明"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        <template #default>
          <p>请如实填写家庭成员及经济状况,隐瞒或虚报将影响申请结果</p>
        </template>
      </el-alert>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="140px"
        label-position="left"
      >
        <h3 class="section-title">家庭成员</h3>
        <el-form-item label="家庭人口数" prop="familyCount">
          <el-input-number
            v-model="formData.familyCount"
            :min="1"
            :max="20"
            :step="1"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="家庭成员">
          <div class="family-members">
            <el-button
              type="primary"
              icon="Plus"
              @click="addFamilyMember"
              style="margin-bottom: 12px"
            >
              添加家庭成员
            </el-button>

            <el-table
              :data="formData.familyMembers"
              border
              style="width: 100%"
            >
              <el-table-column label="姓名" width="120">
                <template #default="{ row }">
                  <el-input v-model="row.name" placeholder="姓名" />
                </template>
              </el-table-column>
              <el-table-column label="关系" width="120">
                <template #default="{ row }">
                  <el-select v-model="row.relationship" placeholder="关系">
                    <el-option label="配偶" value="配偶" />
                    <el-option label="子女" value="子女" />
                    <el-option label="父母" value="父母" />
                    <el-option label="其他" value="其他" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="身份证号" width="180">
                <template #default="{ row }">
                  <el-input v-model="row.idCard" placeholder="身份证号" />
                </template>
              </el-table-column>
              <el-table-column label="月收入(元)" width="150">
                <template #default="{ row }">
                  <el-input-number v-model="row.monthlyIncome" :min="0" :precision="2" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ $index }">
                  <el-button
                    type="danger"
                    icon="Delete"
                    size="small"
                    @click="removeFamilyMember($index)"
                  />
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form-item>

        <el-divider />

        <h3 class="section-title">经济状况</h3>
        <el-form-item label="月总收入(元)" prop="monthlyIncome">
          <el-input-number
            v-model="formData.monthlyIncome"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="年收入(元)" prop="yearlyIncome">
          <el-input-number
            v-model="formData.yearlyIncome"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="收入来源" prop="incomeSource">
          <el-input
            v-model="formData.incomeSource"
            type="textarea"
            :rows="3"
            placeholder="请详细说明家庭收入来源(如务农、务工、经商等)"
          />
        </el-form-item>

        <el-form-item label="房产情况" prop="property">
          <el-input-number
            v-model="formData.property"
            :min="0"
            :step="1"
            style="width: 200px; margin-right: 12px"
          />
          <span>套</span>
        </el-form-item>

        <el-form-item label="住房面积" prop="housingArea">
          <el-input-number
            v-model="formData.housingArea"
            :min="0"
            :precision="2"
            style="width: 200px; margin-right: 12px"
          />
          <span>平方米</span>
        </el-form-item>

        <el-form-item label="车辆数量" prop="vehicle">
          <el-input-number
            v-model="formData.vehicle"
            :min="0"
            :step="1"
            style="width: 200px; margin-right: 12px"
          />
          <span>辆</span>
        </el-form-item>

        <el-form-item label="存款(万元)" prop="deposits">
          <el-input-number
            v-model="formData.deposits"
            :min="0"
            :precision="2"
            style="width: 200px; margin-right: 12px"
          />
          <span>万元</span>
        </el-form-item>

        <el-form-item label="债务(万元)" prop="debts">
          <el-input-number
            v-model="formData.debts"
            :min="0"
            :precision="2"
            style="width: 200px; margin-right: 12px"
          />
          <span>万元</span>
        </el-form-item>

        <el-divider />

        <h3 class="section-title">困难情况</h3>
        <el-form-item label="困难类型" prop="difficulties">
          <el-checkbox-group v-model="formData.difficulties">
            <el-checkbox label="illness">疾病</el-checkbox>
            <el-checkbox label="disability">残疾</el-checkbox>
            <el-checkbox label="unemployment">失业</el-checkbox>
            <el-checkbox label="education">子女教育</el-checkbox>
            <el-checkbox label="elderly">老年人</el-checkbox>
            <el-checkbox label="single">单亲家庭</el-checkbox>
            <el-checkbox label="disaster">遭遇自然灾害</el-checkbox>
            <el-checkbox label="other">其他</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="困难原因" prop="difficultyReason">
          <el-input
            v-model="formData.difficultyReason"
            type="textarea"
            :rows="4"
            placeholder="请详细说明家庭困难原因"
          />
        </el-form-item>

        <el-form-item label="特殊情况">
          <el-input
            v-model="formData.specialSituation"
            type="textarea"
            :rows="3"
            placeholder="如有其他特殊情况请说明"
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
    const rules = {
      familyCount: [{ required: true, message: '请输入家庭人口数', trigger: 'blur' }],
      monthlyIncome: [{ required: true, message: '请输入月总收入', trigger: 'blur' }],
      yearlyIncome: [{ required: true, message: '请输入年收入', trigger: 'blur' }],
      incomeSource: [{ required: true, message: '请说明收入来源', trigger: 'blur' }],
      difficulties: [{ required: true, message: '请选择困难类型', trigger: 'change' }],
      difficultyReason: [{ required: true, message: '请说明困难原因', trigger: 'blur' }],
    };

    const addFamilyMember = () => {
      props.formData.familyMembers.push({
        name: '',
        relationship: '',
        idCard: '',
        monthlyIncome: 0,
      });
      emit('update', { ...props.formData });
    };

    const removeFamilyMember = index => {
      props.formData.familyMembers.splice(index, 1);
      emit('update', { ...props.formData });
    };

    return { rules, addFamilyMember, removeFamilyMember };
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
          <p>3. 医疗证明需包含医院盖章和医生签名</p>
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
          <h4>收入证明 <span class="required">*</span></h4>
          <p class="upload-tip">请上传收入证明或银行流水</p>
          <ImageUploader
            v-model="formData.incomeProof"
            :required="true"
            :multiple="true"
            :max-count="5"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>医疗证明</h4>
          <p class="upload-tip">如有疾病请上传医疗证明</p>
          <ImageUploader
            v-model="formData.medicalProof"
            :multiple="true"
            :max-count="10"
            @update="handleUpdate"
            @validate="handleValidate"
          />
        </div>

        <div class="upload-item">
          <h4>残疾证明</h4>
          <p class="upload-tip">如有残疾请上传残疾证</p>
          <ImageUploader
            v-model="formData.disabilityProof"
            :multiple="true"
            :max-count="5"
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
        <el-descriptions-item label="户口性质">
          {{ formData.householdType === '农业' ? '农业户口' : '非农业户口' }}
        </el-descriptions-item>

        <el-descriptions-item label="家庭人口数">
          {{ formData.familyCount }}人
        </el-descriptions-item>
        <el-descriptions-item label="月总收入">
          {{ formData.monthlyIncome }}元
        </el-descriptions-item>

        <el-descriptions-item label="年收入">
          {{ formData.yearlyIncome }}元
        </el-descriptions-item>
        <el-descriptions-item label="人均月收入">
          {{ perCapitaIncome }}元
        </el-descriptions-item>

        <el-descriptions-item label="困难类型" :span="2">
          <el-tag
            v-for="difficulty in formData.difficulties"
            :key="difficulty"
            type="warning"
            style="margin-right: 8px"
          >
            {{ getDifficultyLabel(difficulty) }}
          </el-tag>
        </el-descriptions-item>

        <el-descriptions-item label="困难原因" :span="2">
          {{ formData.difficultyReason }}
        </el-descriptions-item>

        <el-descriptions-item label="住房面积" :span="2">
          {{ formData.housingArea }}平方米
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

      <el-alert
        title="重要提示"
        type="error"
        :closable="false"
        show-icon
        style="margin-top: 24px"
      >
        <template #default>
          <p>本人郑重承诺:以上填写信息及所提供材料真实有效</p>
          <p>如隐瞒或虚报,愿意承担法律责任并退回已领取的保障金</p>
        </template>
      </el-alert>

      <el-checkbox
        v-model="confirmed"
        style="margin-top: 24px"
        @change="handleConfirmChange"
      >
        我已阅读并同意以上声明
      </el-checkbox>
    </div>
  `,
  props: ['formData'],
  emits: ['validate'],
  setup(props, { emit }) {
    const confirmed = ref(false);

    const perCapitaIncome = computed(() => {
      return (props.formData.monthlyIncome / (props.formData.familyCount || 1)).toFixed(2);
    });

    const maskIdCard = idCard => {
      if (!idCard) return '';
      return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
    };

    const maskPhone = phone => {
      if (!phone) return '';
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    };

    const getDifficultyLabel = difficulty => {
      const map = {
        illness: '疾病',
        disability: '残疾',
        unemployment: '失业',
        education: '子女教育',
        elderly: '老年人',
        single: '单亲家庭',
        disaster: '遭遇自然灾害',
        other: '其他',
      };
      return map[difficulty] || difficulty;
    };

    const getUploadedFiles = () => {
      const files = [];
      if (props.formData.idCardPhotos?.length) {
        files.push({ name: '身份证照片' });
      }
      if (props.formData.householdPhotos?.length) {
        files.push({ name: '户口本照片' });
      }
      if (props.formData.incomeProof?.length) {
        files.push({ name: '收入证明' });
      }
      if (props.formData.medicalProof?.length) {
        files.push({ name: '医疗证明' });
      }
      if (props.formData.disabilityProof?.length) {
        files.push({ name: '残疾证明' });
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
      perCapitaIncome,
      maskIdCard,
      maskPhone,
      getDifficultyLabel,
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
      familyMembers: data.familyMembers.map(member => ({
        ...member,
        idCard: encryptionService.encrypt(member.idCard),
      })),
    };

    await serviceApi.submitSubsistenceApplication({
      ...encryptedData,
      serviceType: 'subsistence',
      serviceName: '低保申请',
    });

    // 记录操作日志
    await auditLogService.logApplicationSubmit('subsistence', '低保申请');

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
.subsistence-application {
  .basic-info-step,
  .family-info-step {
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

    .family-members {
      width: 100%;
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
  .subsistence-application {
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
