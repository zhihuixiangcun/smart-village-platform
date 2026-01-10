<template>
  <div class="multi-step-register-container">
    <div class="register-wrapper">
      <div class="progress-section">
        <div class="progress-header">
          <h2>注册流程</h2>
          <p>共5步，请按顺序完成</p>
        </div>
        
        <div class="steps-indicator">
          <div 
            v-for="(step, index) in steps" 
            :key="index"
            class="step-item"
            :class="{ 
              'step-active': currentStep === index,
              'step-completed': currentStep > index,
              'step-disabled': currentStep < index
            }"
            @click="goToStep(index)"
          >
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-content">
              <span class="step-title">{{ step.title }}</span>
              <span class="step-desc">{{ step.description }}</span>
            </div>
          </div>
        </div>
        
        <div class="role-badge">
          <el-tag :type="roleConfig[role]?.tagType" effect="plain" size="large">
            {{ roleConfig[role]?.title }}
          </el-tag>
        </div>
      </div>
      
      <div class="form-section">
        <el-card class="register-card" shadow="never">
          <template #header>
            <div class="card-header">
              <h2>{{ steps[currentStep].title }}</h2>
              <el-button link type="primary" @click="goToRegister">
                <el-icon><ArrowLeft /></el-icon>
                重新选择角色
              </el-button>
            </div>
          </template>          
          <el-form
            ref="registerFormRef"
            :model="registerForm"
            :rules="currentStepRules"
            label-position="top"
            size="large"
            @submit.prevent="nextStep"
          >
            <div v-show="currentStep === 0" class="form-step">
              <div class="step-intro">
                <el-icon><User /></el-icon>
                <p>请填写您的基本身份信息</p>
              </div>
              
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="真实姓名" prop="name">
                    <el-input
                      v-model="registerForm.name"
                      placeholder="请输入真实姓名"
                      clearable
                    >
                      <template #prefix>
                        <el-icon><User /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
                
                <el-col :span="12">
                  <el-form-item label="性别" prop="gender">
                    <el-select
                      v-model="registerForm.gender"
                      placeholder="请选择性别"
                      style="width: 100%"
                      clearable
                    >
                      <el-option label="男" value="male" />
                      <el-option label="女" value="female" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="手机号码" prop="phone">
                    <el-input
                      v-model="registerForm.phone"
                      placeholder="请输入11位手机号"
                      maxlength="11"
                      clearable
                    >
                      <template #prefix>
                        <el-icon><Phone /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
                
                <el-col :span="12">
                  <el-form-item label="身份证号" prop="idCard">
                    <el-input
                      v-model="registerForm.idCard"
                      placeholder="请输入身份证号"
                      maxlength="18"
                      clearable
                    >
                      <template #prefix>
                        <el-icon><Postcard /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
              </el-row>
              
              <el-form-item label="电子邮箱" prop="email">
                <el-input
                  v-model="registerForm.email"
                  placeholder="请输入电子邮箱"
                  clearable
                >
                  <template #prefix>
                    <el-icon><Message /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </div>
            
            <div v-show="currentStep === 1" class="form-step">
              <div class="step-intro">
                <el-icon><Shield /></el-icon>
                <p>请完成身份验证以确保账户安全</p>
              </div>
              
              <el-form-item label="手机验证" prop="verifyCode">
                <div class="verify-code-container">
                  <el-input
                    v-model="registerForm.verifyCode"
                    placeholder="请输入手机验证码"
                    maxlength="6"
                  />
                  <el-button
                    :type="codeCountdown > 0 ? 'default' : 'primary'"
                    :disabled="!canSendCode || codeCountdown > 0"
                    @click="sendVerifyCode"
                  >
                    {{ codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码' }}
                  </el-button>
                </div>
              </el-form-item>
              
              <el-alert
                title="验证码已发送到您的手机"
                type="info"
                :closable="false"
                v-if="codeSent"
              />
              
              <div class="verify-tips">
                <p>• 验证码有效期为10分钟</p>
                <p>• 同一手机号60秒内只能发送一次</p>
                <p>• 请勿将验证码告知他人</p>
              </div>
            </div>
            
            <div v-show="currentStep === 2" class="form-step">
              <div class="step-intro">
                <el-icon><Briefcase /></el-icon>
                <p>请填写您的工作或业务信息</p>
              </div>
              
              <el-form-item label="所属地区" prop="locationId">
                <RegionSelectorAPI
                  @change="handleRegionChange"
                  @township-change="handleTownshipChange"
                  @village-change="handleVillageChange"
                />
              </el-form-item>
              
              <el-form-item label="详细地址" prop="address">
                <el-input
                  v-model="registerForm.address"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入详细地址"
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>
              
              <template v-if="role !== 'resident'">
                <el-form-item label="部门/单位" prop="department">
                  <el-input
                    v-model="registerForm.department"
                    placeholder="请输入部门或单位名称"
                    clearable
                  />
                </el-form-item>
              </template>
              
              <template v-if="role === 'township_official' || role === 'village_official' || role === 'admin'">
                <el-form-item label="上传委托书" prop="commissionLetter">
                  <el-upload
                    class="upload-demo"
                    drag-action="http://www.example.com/upload"
                    :before-upload="beforeUpload"
                    :on-change="handleCommissionChange"
                    :file-list="commissionLetterList"
                    :limit="1"
                    accept=".pdf,.doc,.docx,.jpg,.png"
                  >
                    <el-button type="primary" size="small">选择文件</el-button>
                    <template #tip>
                      <div class="upload-tip">
                        只能上传pdf/doc/docx/图片，且不超过5MB
                      </div>
                    </template>
                  </el-upload>
                  <div class="upload-preview" v-if="commissionLetterList.length > 0">
                    <el-icon><Document /></el-icon>
                    <span>{{ commissionLetterList[0].name }}</span>
                    <el-button type="danger" link @click="removeCommissionLetter">
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-button>
                  </div>
                </el-form-item>
              </template>
              
              <template v-if="role === 'township_official' || role === 'village_official'">
                <el-form-item label="申请职务" prop="position">
                  <el-select
                    v-model="registerForm.position"
                    placeholder="请选择申请职务"
                    style="width: 100%"
                    clearable
                  >
                    <el-option
                      v-for="pos in positionOptions"
                      :key="pos"
                      :label="pos"
                      :value="pos"
                    />
                  </el-select>
                </el-form-item>
              </template>
              
              <template v-if="role === 'purchaser'">
                <el-form-item label="公司名称" prop="companyName">
                  <el-input
                    v-model="registerForm.companyName"
                    placeholder="请输入公司全称"
                    clearable
                    maxlength="50"
                    show-word-limit
                  />
                </el-form-item>
                
                <el-form-item label="营业执照号" prop="businessLicense">
                  <el-input
                    v-model="registerForm.businessLicense"
                    placeholder="请输入统一社会信用代码"
                    clearable
                    maxlength="20"
                  />
                </el-form-item>
              </template>
            </div>
            
            <div v-show="currentStep === 3" class="form-step">
              <div class="step-intro">
                <el-icon><Lock /></el-icon>
                <p>请设置您的登录账户和密码</p>
              </div>
              
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="设置密码" prop="password">
                    <el-input
                      v-model="registerForm.password"
                      type="password"
                      placeholder="8-20位，包含大小写字母和数字"
                      show-password
                      maxlength="20"
                      @input="updatePasswordStrength"
                    >
                      <template #prefix>
                        <el-icon><Lock /></el-icon>
                      </template>
                    </el-input>
                    
                    <div class="password-strength" v-if="registerForm.password">
                      <div class="strength-label">密码强度：</div>
                      <div class="strength-bar-container">
                        <div 
                          class="strength-bar"
                          :class="passwordStrength.class"
                          :style="{ width: passwordStrength.width }"
                        ></div>
                      </div>
                      <span class="strength-text" :style="{ color: passwordStrength.color }">
                        {{ passwordStrength.text }}
                      </span>
                    </div>
                  </el-form-item>
                </el-col>
                
                <el-col :span="12">
                  <el-form-item label="确认密码" prop="confirmPassword">
                    <el-input
                      v-model="registerForm.confirmPassword"
                      type="password"
                      placeholder="请再次输入密码"
                      show-password
                      maxlength="20"
                    >
                      <template #prefix>
                        <el-icon><Lock /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
              </el-row>
              
              <div class="password-tips">
                <p>• 密码长度为8-20个字符</p>
                <p>• 必须包含大写字母、小写字母和数字</p>
                <p>• 建议使用特殊符号增强安全性</p>
              </div>
            </div>
            
            <div v-show="currentStep === 4" class="form-step">
              <div class="step-intro">
                <el-icon><CircleCheck /></el-icon>
                <p>请确认您的注册信息</p>
              </div>
              
              <div class="summary-section">
                <div class="summary-group">
                  <h4>基本信息</h4>
                  <div class="summary-row">
                    <span class="label">姓名：</span>
                    <span class="value">{{ registerForm.name }}</span>
                  </div>
                  <div class="summary-row">
                    <span class="label">手机号：</span>
                    <span class="value">{{ registerForm.phone }}</span>
                  </div>
                  <div class="summary-row">
                    <span class="label">身份证：</span>
                    <span class="value">{{ maskIdCard(registerForm.idCard) }}</span>
                  </div>
                  <div class="summary-row">
                    <span class="label">邮箱：</span>
                    <span class="value">{{ registerForm.email }}</span>
                  </div>
                </div>
                
                <div class="summary-group">
                  <h4>工作信息</h4>
                  <div class="summary-row" v-if="registerForm.locationId">
                    <span class="label">{{ role === 'township_official' ? '所属乡镇：' : '所属村庄：' }}</span>
                    <span class="value">{{ getLocationName(registerForm.locationId) }}</span>
                  </div>
                  <div class="summary-row" v-if="registerForm.address">
                    <span class="label">地址：</span>
                    <span class="value">{{ registerForm.address }}</span>
                  </div>
                  <div class="summary-row" v-if="registerForm.department">
                    <span class="label">部门：</span>
                    <span class="value">{{ registerForm.department }}</span>
                  </div>
                  <div class="summary-row" v-if="registerForm.position">
                    <span class="label">职务：</span>
                    <span class="value">{{ registerForm.position }}</span>
                  </div>
                  <div class="summary-row" v-if="registerForm.companyName">
                    <span class="label">公司：</span>
                    <span class="value">{{ registerForm.companyName }}</span>
                  </div>
                </div>
                
                <div class="summary-group">
                  <h4>账户信息</h4>
                  <div class="summary-row">
                    <span class="label">登录账号：</span>
                    <span class="value">{{ registerForm.phone }}</span>
                  </div>
                  <div class="summary-row">
                    <span class="label">密码强度：</span>
                    <span class="value" :style="{ color: passwordStrength.color }">
                      {{ passwordStrength.text }}
                    </span>
                  </div>
                </div>
              </div>
              
              <el-form-item prop="agreement">
                <el-checkbox v-model="registerForm.agreement" size="large">
                  我已阅读并同意
                  <el-link type="primary" @click="showTerms = true">《用户服务协议》</el-link>
                  和
                  <el-link type="primary" @click="showPrivacy = true">《隐私政策》</el-link>
                </el-checkbox>
              </el-form-item>
            </div>
            
            <div class="form-navigation">
              <el-button 
                v-if="currentStep > 0"
                @click="previousStep"
                :disabled="submitting"
              >
                上一步
              </el-button>
              
              <el-button 
                v-if="currentStep < 4"
                type="primary"
                @click="nextStep"
                :disabled="!canGoNext"
              >
                下一步
                <el-icon><ArrowRight /></el-icon>
              </el-button>
              
              <el-button
                v-if="currentStep === 4"
                type="primary"
                :loading="submitting"
                :disabled="!canSubmit"
                class="submit-button"
                @click="handleSubmit"
              >
                <el-icon><CircleCheck /></el-icon>
                {{ submitting ? '注册中...' : '提交注册' }}
              </el-button>
            </div>
          </el-form>
        </el-card>
      </div>
    </div>
    
    <el-dialog
      v-model="showTerms"
      title="用户服务协议"
      width="600px"
      :before-close="handleDialogClose"
    >
      <div class="dialog-content">
        <terms-content />
      </div>
      <template #footer>
        <el-button type="primary" @click="showTerms = false">我已阅读</el-button>
      </template>
    </el-dialog>
    
    <el-dialog
      v-model="showPrivacy"
      title="隐私政策"
      width="600px"
      :before-close="handleDialogClose"
    >
      <div class="dialog-content">
        <privacy-content />
      </div>
      <template #footer>
        <el-button type="primary" @click="showPrivacy = false">我已阅读</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  User,
  Phone,
  Lock,
  Postcard,
  Message,
  Shield,
  Briefcase,
  ArrowLeft,
  ArrowRight,
  CircleCheck,
} from '@element-plus/icons-vue';
 import villageUserApi from '@/api/villageUser';
 import TermsContent from './TermsContent.vue';
 import PrivacyContent from './PrivacyContent.vue';
 import RegionSelectorAPI from '@/components/RegionSelectorAPI.vue';

const router = useRouter();
const route = useRoute();
const submitting = ref(false);
const showTerms = ref(false);
const showPrivacy = ref(false);
const codeCountdown = ref(0);
const codeSent = ref(false);
const currentStep = ref(0);
const registerFormRef = ref(null);

const role = ref(route.query.role || 'resident');

const steps = [
  { title: '基本信息', description: '填写个人身份信息' },
  { title: '身份验证', description: '验证手机号码' },
  { title: '工作信息', description: '填写工作业务信息' },
  { title: '账户设置', description: '设置登录密码' },
  { title: '确认提交', description: '确认并完成注册' },
];

const roleConfig = {
  resident: {
    title: '村民',
    tagType: 'success',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
  },
  village_official: {
    title: '村干部',
    tagType: 'warning',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  },
  township_official: {
    title: '乡镇干部',
    tagType: 'info',
    gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
  },
  purchaser: {
    title: '采购商',
    tagType: 'danger',
    gradient: 'linear-gradient(135deg, #ec4899, #f472b6)',
  },
};

const registerForm = reactive({
  name: '',
  phone: '',
  idCard: '',
  gender: '',
  locationId: '',
  address: '',
  department: '',
  position: '',
  companyName: '',
  businessLicense: '',
  password: '',
  confirmPassword: '',
  verifyCode: '',
  agreement: false,
  role: role.value,
  regionInfo: null,
  townshipCode: '',
  townshipName: '',
  townshipInfo: null,
  villageCode: '',
  villageName: '',
  villageInfo: null,
  fullAddress: ''
});

const passwordStrength = reactive({
  score: 0,
  width: '0%',
  class: '',
  color: '',
  text: '',
});

const locations = ref([]);
const positionOptions = ref([]);
const commissionLetterList = ref([]);

const stepRules = {
  0: {
    name: [
      { required: true, message: '请输入真实姓名', trigger: 'blur' },
      { min: 2, max: 20, message: '姓名长度在2-20个字符', trigger: 'blur' },
    ],
    gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
    phone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号', trigger: 'blur' },
    ],
    idCard: [
      { required: true, message: '请输入身份证号', trigger: 'blur' },
      { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号', trigger: 'blur' },
    ],
    email: [
      { required: true, message: '请输入电子邮箱', trigger: 'blur' },
      { type: 'email', message: '请输入正确的电子邮箱', trigger: 'blur' },
    ],
  },
  1: {
    verifyCode: [
      { required: true, message: '请输入验证码', trigger: 'blur' },
      { pattern: /^\d{6}$/, message: '请输入6位数字验证码', trigger: 'blur' },
    ],
  },
  2: {
    verifyCode: [
      { required: true, message: '请输入验证码', trigger: 'blur' },
      { pattern: /^\d{6}$/, message: '请输入6位数字验证码', trigger: 'blur' },
    ],
    locationId: [{ required: true, message: '请选择所属地区', trigger: 'change' }],
    address: [
      { required: true, message: '请输入地址', trigger: 'blur' },
      { min: 5, message: '地址长度至少5个字符', trigger: 'blur' },
    ],
    department: [{ required: true, message: '请输入部门', trigger: 'blur' }],
    position: [{ required: true, message: '请选择职务', trigger: 'change' }],
    commissionLetter: [
      { required: role === 'admin' || role === 'township_official', message: '请上传委托书', trigger: 'change' }
    ],
    companyName: [{ required: true, message: '请输入公司名称', trigger: 'blur' }],
    businessLicense: [{ required: true, message: '请输入营业执照号', trigger: 'blur' }],
  },
  3: {
    locationId: [{ required: true, message: '请选择所属地区', trigger: 'change' }],
    address: [
      { required: true, message: '请输入地址', trigger: 'blur' },
      { min: 5, message: '地址长度至少5个字符', trigger: 'blur' },
    ],
    department: [{ required: true, message: '请输入部门', trigger: 'blur' }],
    position: [{ required: true, message: '请选择职务', trigger: 'change' }],
    commissionLetter: [
      { required: role === 'admin' || role === 'township_official', message: '请上传委托书', trigger: 'change' }
    ],
    companyName: [{ required: true, message: '请输入公司名称', trigger: 'blur' }],
    businessLicense: [{ required: true, message: '请输入营业执照号', trigger: 'blur' }],
  },
  3: {
    password: [
      { required: true, message: '请设置密码', trigger: 'blur' },
      { min: 8, max: 20, message: '密码长度在8-20个字符', trigger: 'blur' },
      { 
        validator: (rule, value, callback) => {
          if (value && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,20}$/.test(value)) {
            callback(new Error('密码必须包含大小写字母和数字'));
          } else {
            callback();
          }
        },
        trigger: 'blur',
      },
    ],
    confirmPassword: [
      { required: true, message: '请再次输入密码', trigger: 'blur' },
      {
        validator: (rule, value, callback) => {
          if (value !== registerForm.password) {
            callback(new Error('两次输入的密码不一致'));
          } else {
            callback();
          }
        },
        trigger: 'blur',
      },
    ],
  },
  4: {
    agreement: [
      {
        type: 'enum',
        enum: [true],
        message: '请阅读并同意用户协议和隐私政策',
        trigger: 'change',
      },
    ],
  },
};

const currentStepRules = computed(() => {
  return stepRules[currentStep.value] || {};
});

const canSendCode = computed(() => {
  return /^1[3-9]\d{9}$/.test(registerForm.phone) && codeCountdown.value === 0;
});

const canGoNext = computed(() => {
  const stepFields = getStepFields(currentStep.value);
  const hasRequiredFields = stepFields.every(field => registerForm[field]);
  
  if (currentStep.value === 0) {
    return hasRequiredFields;
  }
  
  if (currentStep.value === 1) {
    return hasRequiredFields;
  }
  
  if (currentStep.value === 2) {
    const hasRequired = stepFields.every(field => {
      if (field === 'commissionLetter') {
        return registerForm[field].length > 0;
      }
      return registerForm[field];
    });
    return hasRequired;
  }
  
  if (currentStep.value === 3) {
    return hasRequiredFields;
  }
  
  if (currentStep.value === 4) {
    return hasRequiredFields && registerForm.agreement;
  }
  
  return true;
});

const canSubmit = computed(() => {
  return registerForm.agreement;
});

const getStepFields = step => {
  const fieldMap = {
    0: ['name', 'gender', 'phone', 'idCard', 'email'],
    1: ['verifyCode'],
    2: ['locationId', 'address', 'department', 'position', 'companyName', 'businessLicense'],
    3: ['password', 'confirmPassword'],
    4: [],
  };
  
  const fields = fieldMap[step] || [];
  if (step === 2) {
    if (role.value === 'resident') {
      return ['locationId', 'address'];
    } else if (role.value === 'purchaser') {
      return ['locationId', 'address', 'department', 'companyName', 'businessLicense'];
    } else {
      return ['locationId', 'address', 'department', 'position'];
    }
  }
  
  return fields;
};

const updatePasswordStrength = () => {
  const pwd = registerForm.password;
  let score = 0;
  
  if (pwd.length >= 8) score += 25;
  if (/[A-Z]/.test(pwd)) score += 25;
  if (/[a-z]/.test(pwd)) score += 25;
  if (/[0-9]/.test(pwd)) score += 25;
  
  passwordStrength.score = score;
  
  if (score <= 25) {
    passwordStrength.width = '25%';
    passwordStrength.class = 'weak';
    passwordStrength.color = '#ef4444';
    passwordStrength.text = '弱';
  } else if (score <= 50) {
    passwordStrength.width = '50%';
    passwordStrength.class = 'fair';
    passwordStrength.color = '#f59e0b';
    passwordStrength.text = '中等';
  } else if (score <= 75) {
    passwordStrength.width = '75%';
    passwordStrength.class = 'good';
    passwordStrength.color = '#10b981';
    passwordStrength.text = '良好';
  } else {
    passwordStrength.width = '100%';
    passwordStrength.class = 'strong';
    passwordStrength.color = '#059669';
    passwordStrength.text = '很强';
  }
};

const sendVerifyCode = async () => {
  if (!canSendCode.value) {
    ElMessage.warning('请先输入正确的手机号码');
    return;
  }
  
  try {
    ElMessage.success('验证码已发送到您的手机');
    codeSent.value = true;
    codeCountdown.value = 60;
    const timer = setInterval(() => {
      codeCountdown.value--;
      if (codeCountdown.value <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  } catch (error) {
    ElMessage.error('发送验证码失败，请重试');
  }
};

const handleCommissionChange = (file, fileList) => {
  if (file) {
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      ElMessage.error('文件大小不能超过5MB');
      return;
    }
  }
  
  const fileReader = new FileReader();
  fileReader.readAsDataURL(file.raw);
  fileReader.onload = () => {
    commissionLetterList.value = [{
      name: file.name,
      url: fileReader.result,
      uid: Date.now(),
      status: 'done',
    }];
    ElMessage.success('委托书上传成功');
  };
};

const removeCommissionLetter = index => {
  commissionLetterList.value.splice(index, 1);
  ElMessage.success('已删除委托书');
  };

const beforeUpload = file => {
  const isLt5M = file.size / 1024 / 1024 < 5;
  const isPdf = file.type === 'application/pdf' || file.type === 'application/msword';
  const isImage = file.type.startsWith('image/');
  
  if (!isLt5M) {
    ElMessage.error('文件大小不能超过5MB');
    return false;
  }
  
  if (!isPdf && !isImage) {
    ElMessage.error('只能上传pdf/doc/docx/图片格式的文件');
    return false;
  }
  
  return true;
};

const goToStep = step => {
  if (step < currentStep.value) {
    currentStep.value = step;
  }
};

const nextStep = async () => {
  if (!registerFormRef.value) return;
  
  try {
    await registerFormRef.value.validate();
  } catch (error) {
    ElMessage.warning('请完善当前步骤的必填信息');
    return;
  }
  
  currentStep.value++;
};

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const handleSubmit = async () => {
  if (!registerFormRef.value) return;
  
  try {
    await registerFormRef.value.validate();
  } catch (error) {
    ElMessage.error('请检查信息是否完整');
    return;
  }
  
  submitting.value = true;
  try {
    const { confirmPassword, agreement, ...data } = registerForm;
    await villageUserApi.register(data);
    
    ElMessage.success('注册成功！正在跳转到登录页面...');
    setTimeout(() => {
      router.push('/auth/login');
    }, 2000);
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '注册失败，请重试');
  } finally {
    submitting.value = false;
  }
};

const maskIdCard = idCard => {
  if (!idCard) return '';
  if (idCard.length === 15) {
    return idCard.replace(/(\d{6})\d{6}(\d{3})/, '$1******$2');
  } else if (idCard.length === 18) {
    return idCard.replace(/(\d{6})\d{10}(\d{2})/, '$1**********$2');
  }
  return idCard;
};

const getLocationName = locationId => {
  const location = locations.value.find(l => l.id === locationId);
  return location ? location.name : '';
};

const handleDialogClose = done => {
  done();
};

const goToRegister = () => {
  router.push('/auth/enhanced-register');
};

const loadLocations = async () => {
  try {
    if (role.value === 'township_official') {
      locations.value = [
        { id: '1', name: '鲁贡镇', district: '贞丰县' },
        { id: '2', name: '沙坪镇', district: '贞丰县' },
        { id: '3', name: '白层镇', district: '贞丰县' },
        { id: '4', name: '乐元镇', district: '望谟县' },
        { id: '5', name: '顶效镇', district: '兴义市' },
      ];
    } else {
      locations.value = [
        { id: '1', name: '么扒村', district: '贞丰县鲁贡镇' },
        { id: '2', name: '弄洋村', district: '贞丰县鲁贡镇' },
        { id: '3', name: '者央村', district: '贞丰县鲁贡镇' },
        { id: '4', name: '林桃村', district: '贞丰县鲁贡镇' },
        { id: '5', name: '乐元村', district: '望谟县乐元镇' },
        { id: '6', name: '绿化村', district: '兴义市顶效镇' },
        { id: '7', name: '绿荫村', district: '兴义市顶效镇' },
        { id: '8', name: '查白村', district: '兴义市顶效镇' },
        { id: '9', name: '楼纳村', district: '兴义市顶效镇' },
        { id: '10', name: '者索村', district: '贞丰县沙坪镇' },
        { id: '11', name: '板昌村', district: '贞丰县沙坪镇' },
        { id: '12', name: '这年村', district: '贞丰县沙坪镇' },
        { id: '13', name: '者砍村', district: '贞丰县沙坪镇' },
        { id: '14', name: '兴龙村', district: '贞丰县白层镇' },
        { id: '15', name: '坝桥村', district: '贞丰县白层镇' },
        { id: '16', name: '坡们村', district: '贞丰县白层镇' },
        { id: '17', name: '纳杠村', district: '贞丰县白层镇' },
        { id: '18', name: '里好村', district: '望谟县乐元镇' },
        { id: '19', name: '纳管村', district: '望谟县乐元镇' },
        { id: '20', name: '董万村', district: '望谟县乐元镇' },
      ];
    }
  } catch (error) {
    console.error('获取地区列表失败:', error);
  }
};

const handleRegionChange = (regionInfo) => {
  if (regionInfo) {
    console.log('[地区选择]', regionInfo);
    registerForm.regionInfo = regionInfo;
    const address = [
      regionInfo.provinceName,
      regionInfo.cityName,
      regionInfo.districtName,
      regionInfo.townshipName,
      regionInfo.villageName
    ].filter(Boolean).join('');
    registerForm.fullAddress = address;
  }
};

const handleTownshipChange = (townshipInfo) => {
  if (townshipInfo) {
    console.log('[乡镇选择]', townshipInfo);
    registerForm.townshipInfo = townshipInfo;
    registerForm.townshipCode = townshipInfo.townshipCode;
    registerForm.townshipName = townshipInfo.townshipName;
    
    const address = [
      townshipInfo.provinceName,
      townshipInfo.cityName,
      townshipInfo.districtName,
      townshipInfo.townshipName
    ].filter(Boolean).join('');
    registerForm.fullAddress = address;
  }
};

const handleVillageChange = (villageInfo) => {
  if (villageInfo && villageInfo.village) {
    console.log('[村庄选择]', villageInfo);
    registerForm.villageInfo = villageInfo;
    registerForm.villageCode = villageInfo.villageCode;
    registerForm.villageName = villageInfo.villageName;
    
    if (villageInfo.village.address) {
      registerForm.address = villageInfo.village.address;
    }
    
    const address = [
      villageInfo.provinceName,
      villageInfo.cityName,
      villageInfo.districtName,
      villageInfo.townshipName,
      villageInfo.villageName
    ].filter(Boolean).join('');
    registerForm.fullAddress = address;
  }
};

const loadPositionOptions = async () => {
  if (role.value === 'township_official') {
    positionOptions.value = ['乡镇书记', '乡镇长', '副乡镇长', '部门负责人', '工作人员'];
  } else if (role.value === 'village_official') {
    positionOptions.value = ['村书记', '村主任', '副主任', '会计', '村委成员', '工作人员'];
  }
};

onMounted(() => {
  loadLocations();
  loadPositionOptions();
});
</script>

<style scoped>
.multi-step-register-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.register-wrapper {
  display: flex;
  max-width: 1200px;
  width: 100%;
  min-height: 600px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.progress-section {
  flex: 0.4;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px;
  display: flex;
  flex-direction: column;
  color: white;
}

.progress-header {
  margin-bottom: 40px;
}

.progress-header h2 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.progress-header p {
  font-size: 14px;
  margin: 0;
  opacity: 0.8;
}

.steps-indicator {
  flex: 1;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 12px;
  border-radius: 12px;
}

.step-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.step-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.step-active .step-number {
  background: #fbbf24;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
}

.step-completed .step-number {
  background: #10b981;
}

.step-content {
  flex: 1;
}

.step-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.step-desc {
  display: block;
  font-size: 12px;
  opacity: 0.8;
}

.step-active .step-title {
  color: #fbbf24;
}

.role-badge {
  margin-top: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-section {
  flex: 0.6;
  padding: 40px;
  background: white;
}

.register-card {
  box-shadow: none;
  border: none;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f3f4f6;
}

.card-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.form-step {
  flex: 1;
  min-height: 400px;
}

.step-intro {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f0f9ff;
  border-left: 4px solid #0ea5e9;
  border-radius: 8px;
  margin-bottom: 32px;
}

.step-intro .el-icon {
  font-size: 24px;
  color: #0ea5e9;
}

.step-intro p {
  font-size: 14px;
  color: #0369a1;
  margin: 0;
  font-weight: 500;
}

.verify-code-container {
  display: flex;
  gap: 12px;
  align-items: center;
}

.verify-code-container .el-input {
  flex: 1;
}

.verify-code-container .el-button {
  white-space: nowrap;
  min-width: 120px;
}

.verify-tips {
  margin-top: 16px;
  padding: 16px;
  background: #fef3c7;
  border-radius: 8px;
}

.verify-tips p {
  font-size: 13px;
  color: #92400e;
  margin: 4px 0;
}

.password-strength {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.strength-label {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}

.strength-bar-container {
  flex: 1;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.strength-bar {
  height: 100%;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.strength-bar.weak {
  background: #ef4444;
}

.strength-bar.fair {
  background: #f59e0b;
}

.strength-bar.good {
  background: #10b981;
}

.strength-bar.strong {
  background: #059669;
}

.strength-text {
  font-size: 12px;
  font-weight: 600;
}

.password-tips {
  margin-top: 12px;
  padding: 16px;
  background: #f0fdf4;
  border-radius: 8px;
}

.password-tips p {
  font-size: 13px;
  color: #166534;
  margin: 4px 0;
}

.summary-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.summary-group {
  background: #f9fafb;
  border-radius: 12px;
  padding: 20px;
}

.summary-group h4 {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 16px 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.summary-row:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.summary-row .label {
  font-size: 14px;
  color: #6b7280;
}

.summary-row .value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.form-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.form-navigation .el-button {
  min-width: 120px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}

.submit-button {
  flex: 1;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
}

.submit-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.dialog-content {
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.6;
  color: #374151;
}

@media (max-width: 1024px) {
  .register-wrapper {
    flex-direction: column;
  }
  
  .progress-section {
    padding: 30px 20px;
    flex: none;
  }
  
  .form-section {
    padding: 30px 24px;
  }
}

@media (max-width: 640px) {
  .multi-step-register-container {
    padding: 10px;
  }

  .step-item {
    padding: 8px;
  }

  .step-number {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .form-section {
    padding: 20px 15px;
  }
}

/* 地区选择器样式优化 */
.register-section :deep(.el-form-item) {
  margin-bottom: 20px;
}

.register-section :deep(.el-form-item__label) {
  font-weight: 500;
  color: #303133;
  padding-bottom: 8px;
  font-size: 14px;
}

.register-section :deep(.el-select .el-input__wrapper) {
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  transition: all 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.register-section :deep(.el-select .el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  border-color: #c0c4cc;
}

.register-section :deep(.el-select .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
  border-color: #409eff;
}

.register-section :deep(.el-select__placeholder) {
  color: #a8abb2;
}

.register-section :deep(.el-select-dropdown) {
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  border: 1px solid #e4e7ed;
}

.register-section :deep(.el-select-dropdown__item) {
  padding: 10px 12px;
  transition: all 0.2s;
}

.register-section :deep(.el-select-dropdown__item:hover) {
  background: #f5f7fa;
  color: #409eff;
}

.register-section :deep(.el-select-dropdown__item.is-selected) {
  background: #e6f7ff;
  color: #409eff;
  font-weight: 500;
}

.register-section :deep(.el-select__popper) {
  max-width: 600px;
}
</style>