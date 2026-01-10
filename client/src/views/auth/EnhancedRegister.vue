<template>
  <div class="enhanced-register-container">
    <div class="register-wrapper">
      <!-- 左侧品牌展示区 -->
      <div class="brand-section">
        <div class="brand-content">
          <div class="logo-container">
            <div class="logo-animation">
              <div class="logo-pulse"></div>
              <el-icon class="main-logo" :size="48">
                <HomeFilled />
              </el-icon>
            </div>
          </div>
          
          <div v-if="!selectedRole" class="role-selection">
            <h1 class="brand-title">智慧乡村平台</h1>
            <p class="brand-subtitle">选择您的角色，开启智慧生活</p>
            
            <div class="role-grid">
              <div
                v-for="role in roleConfig"
                :key="role.value"
                class="role-card"
                :class="{ 
                  'role-card-hover': hoveredRole === role.value,
                  'role-card-selected': selectedRole === role.value
                }"
                @mouseenter="hoveredRole = role.value"
                @mouseleave="hoveredRole = null"
                @click="selectRole(role)"
              >
                <div class="role-icon-wrapper">
                  <div 
                    class="role-icon"
                    :style="{ background: role.gradient }"
                  >
                    <el-icon :size="28">
                      <component :is="role.icon" />
                    </el-icon>
                  </div>
                </div>
                
                <h3 class="role-title">{{ role.title }}</h3>
                <p class="role-description">{{ role.description }}</p>
                
                <div class="role-features">
                  <div 
                    v-for="feature in role.features.slice(0, 3)" 
                    :key="feature"
                    class="role-feature"
                  >
                    <el-icon><Check /></el-icon>
                    <span>{{ feature }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="role-info">
            <el-button 
              link 
              type="primary" 
              @click="selectedRole = null"
              class="back-button"
            >
              <el-icon><ArrowLeft /></el-icon>
              重新选择角色
            </el-button>
            
            <div class="selected-role-header">
              <div 
                class="selected-role-icon"
                :style="{ background: selectedRoleConfig.gradient }"
              >
                <el-icon :size="36">
                  <component :is="selectedRoleConfig.icon" />
                </el-icon>
              </div>
              <div>
                <h2>{{ selectedRoleConfig.title }}</h2>
                <p>{{ selectedRoleConfig.subtitle }}</p>
              </div>
            </div>
            
            <div class="role-benefits">
              <h4>主要功能</h4>
              <div class="benefits-list">
                <div 
                  v-for="benefit in selectedRoleConfig.features" 
                  :key="benefit"
                  class="benefit-item"
                >
                  <el-icon><Star /></el-icon>
                  <span>{{ benefit }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右侧注册表单区 -->
      <div class="form-section">
        <el-card class="register-card" shadow="never">
          <template #header>
            <div class="form-header">
              <div class="form-title-group">
                <h2>{{ selectedRoleConfig?.formTitle || '用户注册' }}</h2>
                <el-tag 
                  :type="selectedRoleConfig?.tagType" 
                  effect="plain"
                  size="small"
                >
                  {{ selectedRoleConfig?.title }}
                </el-tag>
              </div>
              <div class="progress-indicator" v-if="selectedRole">
                <div class="progress-steps">
                  <div 
                    v-for="(step, index) in formSteps"
                    :key="step.key"
                    class="step-item"
                    :class="{ 
                      'step-active': currentStep >= index,
                      'step-completed': currentStep > index
                    }"
                  >
                    <div class="step-number">{{ index + 1 }}</div>
                    <span class="step-label">{{ step.label }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
          
          <!-- 分步表单 -->
          <el-form
            ref="registerFormRef"
            :model="registerForm"
            :rules="formRules"
            label-position="top"
            size="large"
            @submit.prevent="handleSubmit"
          >
            <!-- 第一步：基本信息 -->
            <div v-show="currentStep === 0" class="form-step">
              <h3 class="step-title">基本信息</h3>
              
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="真实姓名" prop="name">
                    <el-input
                      v-model="registerForm.name"
                      placeholder="请输入您的真实姓名"
                      clearable
                    >
                      <template #prefix>
                        <el-icon><User /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
                
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
              </el-row>
              
              <el-row :gutter="20">
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
            
            <!-- 第二步：详细信息 -->
            <div v-show="currentStep === 1" class="form-step">
              <h3 class="step-title">详细信息</h3>
              
              <el-form-item label="所属村庄" prop="villageId">
                <el-select
                  v-model="registerForm.villageId"
                  placeholder="请选择所属村庄"
                  style="width: 100%"
                  filterable
                  clearable
                >
                  <el-option
                    v-for="village in villages"
                    :key="village.id"
                    :label="village.name"
                    :value="village.id"
                  />
                </el-select>
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
              
              <!-- 角色特定字段 -->
              <template v-if="selectedRoleConfig?.specificFields">
                <template v-for="field in selectedRoleConfig.specificFields" :key="field.name">
                  <el-form-item :label="field.label" :prop="field.name">
                    <component
                      :is="field.type === 'textarea' ? 'el-input' : 'el-input'"
                      v-model="registerForm[field.name]"
                      :type="field.type === 'textarea' ? 'textarea' : 'text'"
                      :placeholder="field.placeholder"
                      :rows="field.type === 'textarea' ? 3 : undefined"
                      :maxlength="field.maxlength"
                      :show-word-limit="field.type === 'textarea'"
                      style="width: 100%"
                    />
                  </el-form-item>
                </template>
              </template>
            </div>
            
            <!-- 第三步：账户设置 -->
            <div v-show="currentStep === 2" class="form-step">
              <h3 class="step-title">账户设置</h3>
              
              <el-form-item label="设置密码" prop="password">
                <el-input
                  v-model="registerForm.password"
                  type="password"
                  placeholder="请设置密码（8-20位）"
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
              
              <el-form-item label="手机验证" prop="verifyCode">
                <div class="verify-code-container">
                  <el-input
                    v-model="registerForm.verifyCode"
                    placeholder="请输入验证码"
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
              
              <el-form-item prop="agreement">
                <el-checkbox v-model="registerForm.agreement">
                  我已阅读并同意
                  <el-link type="primary" @click="showTerms = true">《用户服务协议》</el-link>
                  和
                  <el-link type="primary" @click="showPrivacy = true">《隐私政策》</el-link>
                </el-checkbox>
              </el-form-item>
            </div>
            
            <!-- 表单导航按钮 -->
            <div class="form-navigation">
              <el-button 
                v-if="currentStep > 0"
                @click="previousStep"
                :disabled="loading"
              >
                上一步
              </el-button>
              
              <el-button 
                v-if="currentStep < formSteps.length - 1"
                type="primary"
                @click="nextStep"
                :disabled="!canGoNext"
              >
                下一步
                <el-icon><ArrowRight /></el-icon>
              </el-button>
              
              <el-button
                v-if="currentStep === formSteps.length - 1"
                type="primary"
                :loading="loading"
                :disabled="!canSubmit"
                @click="handleSubmit"
              >
                <el-icon><UserFilled /></el-icon>
                {{ loading ? '注册中...' : '立即注册' }}
              </el-button>
            </div>
          </el-form>
          
          <div class="login-link">
            已有账号？
            <el-link type="primary" @click="goToLogin">立即登录</el-link>
          </div>
        </el-card>
      </div>
    </div>
    
    <!-- 协议弹窗 -->
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
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  User,
  Phone,
  Lock,
  UserFilled,
  OfficeBuilding,
  ShoppingCart,
  Setting,
  Postcard,
  Message,
  ArrowLeft,
  ArrowRight,
  Check,
  Star,
  HomeFilled,
} from '@element-plus/icons-vue';
import villageUserApi from '@/api/villageUser';
import TermsContent from './TermsContent.vue';
import PrivacyContent from './PrivacyContent.vue';

const router = useRouter();
const loading = ref(false);
const showTerms = ref(false);
const showPrivacy = ref(false);
const codeCountdown = ref(0);
const hoveredRole = ref(null);
const selectedRole = ref(null);
const currentStep = ref(0);
const registerFormRef = ref(null);
const villages = ref([]);

const registerForm = reactive({
  name: '',
  phone: '',
  email: '',
  idCard: '',
  gender: '',
  villageId: '',
  address: '',
  password: '',
  confirmPassword: '',
  verifyCode: '',
  agreement: false,
  role: '',
  reason: '',
  department: '',
  companyName: '',
  businessLicense: '',
  skills: [],
});

const passwordStrength = reactive({
  score: 0,
  width: '0%',
  class: '',
  color: '',
  text: '',
});

const roleConfig = [
  {
    value: 'resident',
    title: '村民注册',
    subtitle: '加入智慧乡村，享受便民服务',
    description: '普通村民身份，使用基础村务服务',
    formTitle: '村民信息登记',
    tagType: 'success',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
    icon: 'UserFilled',
    features: ['村务办理', '信息查询', '邻里互助', '补贴申请', '生活服务'],
    specificFields: [
      {
        name: 'familyMembers',
        label: '家庭成员人数',
        placeholder: '请输入家庭成员人数',
        type: 'number',
        maxlength: 2,
      },
    ],
  },
  {
    value: 'village_official',
    title: '村干部申请',
    subtitle: '申请成为村干部，为村民服务',
    description: '村级管理人员，负责村务管理和协调',
    formTitle: '村干部申请表',
    tagType: 'warning',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    icon: 'OfficeBuilding',
    features: ['村务管理', '资料收集', '值班安排', '数据统计', '政策执行'],
    specificFields: [
      {
        name: 'position',
        label: '申请职务',
        placeholder: '请选择申请职务',
        type: 'select',
        options: ['村书记', '村主任', '副主任', '会计', '村委成员', '工作人员'],
      },
      {
        name: 'department',
        label: '所属部门',
        placeholder: '请输入部门名称',
        type: 'text',
        maxlength: 20,
      },
      {
        name: 'reason',
        label: '申请理由',
        placeholder: '请详细说明申请村干部职务的理由和计划（至少50字）',
        type: 'textarea',
        maxlength: 500,
      },
      {
        name: 'experience',
        label: '工作经验',
        placeholder: '请简述相关工作经验',
        type: 'textarea',
        maxlength: 300,
      },
    ],
  },
  {
    value: 'purchaser',
    title: '采购商入驻',
    subtitle: '入驻采购平台，对接优质农产品',
    description: '农产品采购商，享受供应链服务',
    formTitle: '采购商信息',
    tagType: 'danger',
    gradient: 'linear-gradient(135deg, #ec4899, #f472b6)',
    icon: 'ShoppingCart',
    features: ['产品浏览', '在线下单', '订单管理', '供应商对接', '质量保证'],
    specificFields: [
      {
        name: 'companyName',
        label: '公司名称',
        placeholder: '请输入公司/组织名称',
        type: 'text',
        maxlength: 50,
      },
      {
        name: 'businessLicense',
        label: '营业执照号',
        placeholder: '请输入营业执照注册号',
        type: 'text',
        maxlength: 20,
      },
      {
        name: 'businessScope',
        label: '经营范围',
        placeholder: '请简述主要经营范围',
        type: 'textarea',
        maxlength: 200,
      },
    ],
  },
  {
    value: 'admin',
    title: '管理员注册',
    subtitle: '申请系统管理权限',
    description: '系统管理员，负责平台维护和管理',
    formTitle: '管理员申请',
    tagType: 'info',
    gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    icon: 'Setting',
    features: ['系统配置', '用户管理', '权限控制', '数据监控', '安全保障'],
    specificFields: [
      {
        name: 'department',
        label: '所属部门',
        placeholder: '请输入部门名称',
        type: 'text',
        maxlength: 20,
      },
      {
        name: 'reason',
        label: '申请理由',
        placeholder: '请说明申请系统管理权限的理由和胜任能力',
        type: 'textarea',
        maxlength: 300,
      },
      {
        name: 'technicalSkills',
        label: '技术专长',
        placeholder: '请简述相关技术能力',
        type: 'textarea',
        maxlength: 200,
      },
    ],
  },
];

const formSteps = [
  { key: 'basic', label: '基本信息' },
  { key: 'detail', label: '详细信息' },
  { key: 'account', label: '账户设置' },
];

const selectedRoleConfig = computed(() => {
  return roleConfig.find(role => role.value === selectedRole.value);
});

const canGoNext = computed(() => {
  if (currentStep.value === 0) {
    return registerForm.name && registerForm.phone && registerForm.gender;
  }
  if (currentStep.value === 1) {
    return registerForm.villageId && registerForm.address;
  }
  return true;
});

const canSendCode = computed(() => {
  return /^1[3-9]\d{9}$/.test(registerForm.phone) && codeCountdown.value === 0;
});

const canSubmit = computed(() => {
  const requiredFields = ['name', 'phone', 'villageId', 'address', 'password', 'confirmPassword', 'verifyCode'];
  const hasRequired = requiredFields.every(field => registerForm[field]);
  const hasAgreement = registerForm.agreement;
  const passwordsMatch = registerForm.password === registerForm.confirmPassword;
  
  return hasRequired && hasAgreement && passwordsMatch && selectedRole.value;
});

const formRules = reactive({
  name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在2-20个字符', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号', trigger: 'blur' },
  ],
  email: [
    { type: 'email', message: '请输入正确的电子邮箱', trigger: 'blur' },
  ],
  idCard: [
    { required: selectedRole.value !== 'purchaser', message: '请输入身份证号', trigger: 'blur' },
    { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号', trigger: 'blur' },
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' },
  ],
  villageId: [
    { required: true, message: '请选择所属村庄', trigger: 'change' },
  ],
  address: [
    { required: true, message: '请输入地址', trigger: 'blur' },
    { min: 5, message: '地址长度至少5个字符', trigger: 'blur' },
  ],
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
      trigger: 'blur'
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
  verifyCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' },
  ],
  agreement: [
    {
      type: 'enum',
      enum: [true],
      message: '请阅读并同意用户协议和隐私政策',
      trigger: 'change',
    },
  ],
});

const selectRole = (role) => {
  selectedRole.value = role.value;
  registerForm.role = role.value;
  currentStep.value = 0;
};

const nextStep = async () => {
  if (!registerFormRef.value) return;
  
  try {
    const stepFields = getStepFields(currentStep.value);
    await registerFormRef.value.validateField(stepFields);
    currentStep.value++;
  } catch (error) {
    ElMessage.warning('请完善当前步骤的必填信息');
  }
};

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const getStepFields = (step) => {
  const stepFieldsMap = {
    0: ['name', 'phone', 'gender', 'idCard', 'email'],
    1: ['villageId', 'address'],
    2: ['password', 'confirmPassword', 'verifyCode', 'agreement'],
  };
  return stepFieldsMap[step] || [];
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

const handleSubmit = async () => {
  if (!registerFormRef.value) return;
  
  try {
    await registerFormRef.value.validate();
  } catch (error) {
    ElMessage.error('请检查表单信息是否完整');
    return;
  }
  
  loading.value = true;
  try {
    const { confirmPassword, agreement, ...data } = registerForm;
    await villageUserApi.register(data);
    
    ElMessage.success('注册成功！正在跳转到登录页面...');
    setTimeout(() => {
      router.push('/auth/login');
    }, 1500);
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '注册失败，请重试');
  } finally {
    loading.value = false;
  }
};

const handleDialogClose = (done) => {
  done();
};

const goToLogin = () => {
  router.push('/auth/login');
};

const loadVillages = async () => {
  try {
    villages.value = [
      { id: '1', name: '幸福村' },
      { id: '2', name: '民主村' },
      { id: '3', name: '文明村' },
      { id: '4', name: '和平村' },
      { id: '5', name: '建设村' },
    ];
  } catch (error) {
    console.error('获取村庄列表失败:', error);
  }
};

onMounted(() => {
  loadVillages();
});
</script>

<style scoped>
.enhanced-register-container {
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

/* 左侧品牌区域 */
.brand-section {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: white;
  position: relative;
  overflow: hidden;
}

.brand-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></svg>');
  background-size: 40px 40px;
  opacity: 0.1;
}

.brand-content {
  position: relative;
  z-index: 1;
}

.logo-container {
  text-align: center;
  margin-bottom: 40px;
}

.logo-animation {
  position: relative;
  display: inline-block;
}

.logo-pulse {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.4;
  }
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
}

.main-logo {
  position: relative;
  z-index: 1;
}

.brand-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 12px 0;
  text-align: center;
}

.brand-subtitle {
  font-size: 16px;
  margin: 0 0 40px 0;
  text-align: center;
  opacity: 0.9;
}

/* 角色选择网格 */
.role-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 20px;
}

.role-card {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 24px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.role-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0);
  transition: background 0.3s ease;
}

.role-card-hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.role-card-hover::before {
  background: rgba(255, 255, 255, 0.1);
}

.role-card-selected {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.role-icon-wrapper {
  margin-bottom: 16px;
}

.role-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.role-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.role-description {
  font-size: 12px;
  opacity: 0.8;
  margin: 0 0 16px 0;
  line-height: 1.4;
}

.role-features {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.role-feature {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  opacity: 0.9;
}

.role-feature .el-icon {
  font-size: 12px;
}

/* 角色信息展示 */
.back-button {
  color: white;
  margin-bottom: 24px;
  font-weight: 500;
}

.selected-role-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.selected-role-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.selected-role-header h2 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.selected-role-header p {
  margin: 0;
  opacity: 0.9;
}

.role-benefits h4 {
  font-size: 16px;
  margin: 0 0 16px 0;
  font-weight: 600;
}

.benefits-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.benefit-item .el-icon {
  font-size: 16px;
  color: #fbbf24;
}

/* 右侧表单区域 */
.form-section {
  flex: 1.2;
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

.form-header {
  margin-bottom: 32px;
}

.form-title-group {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.form-title-group h2 {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.progress-indicator {
  margin-bottom: 24px;
}

.progress-steps {
  display: flex;
  gap: 24px;
  align-items: center;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.step-item:not(:last-child)::after {
  content: '';
  position: absolute;
  right: -16px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 1px;
  background: #e5e7eb;
}

.step-item.step-active:not(:last-child)::after {
  background: #3b82f6;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.step-item.step-active .step-number {
  background: #3b82f6;
  color: white;
}

.step-item.step-completed .step-number {
  background: #10b981;
  color: white;
}

.step-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.step-item.step-active .step-label {
  color: #3b82f6;
}

.form-step {
  min-height: 300px;
}

.step-title {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 24px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

/* 密码强度指示器 */
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

/* 验证码输入 */
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

/* 表单导航 */
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
  min-width: 100px;
}

.form-navigation .el-button[type="primary"] {
  flex: 1;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  font-weight: 600;
  height: 44px;
}

.form-navigation .el-button[type="primary"]:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.login-link {
  text-align: center;
  margin-top: 24px;
  color: #6b7280;
  font-size: 14px;
}

/* 对话框内容 */
.dialog-content {
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.6;
  color: #374151;
}

.dialog-content :deep(h3) {
  font-size: 18px;
  margin: 0 0 16px 0;
  color: #1f2937;
}

.dialog-content :deep(h4) {
  font-size: 16px;
  margin: 16px 0 8px 0;
  color: #374151;
}

.dialog-content :deep(p) {
  margin: 8px 0;
  color: #6b7280;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .register-wrapper {
    flex-direction: column;
  }
  
  .brand-section {
    padding: 40px 20px;
    min-height: 400px;
  }
  
  .role-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .form-section {
    padding: 32px 24px;
  }
}

@media (max-width: 640px) {
  .enhanced-register-container {
    padding: 10px;
  }
  
  .role-card {
    padding: 16px 12px;
  }
  
  .role-icon {
    width: 48px;
    height: 48px;
  }
  
  .role-icon .el-icon {
    font-size: 24px;
  }
  
  .selected-role-header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .progress-steps {
    gap: 16px;
  }
  
  .step-item:not(:last-child)::after {
    right: -12px;
    width: 4px;
  }
  
  .form-navigation {
    flex-direction: column;
    gap: 12px;
  }
  
  .form-navigation .el-button {
    width: 100%;
  }
}
</style>