<template>
  <div class="purchaser-register-container">
    <div class="register-wrapper">
      <!-- 左侧介绍区域 -->
      <div class="info-section">
        <div class="info-content">
          <div class="brand-header">
            <div class="logo-container">
              <div class="logo-shopping">
                <el-icon class="purchaser-icon" :size="48"><ShoppingCart /></el-icon>
              </div>
              <h1 class="brand-title">采购商入驻</h1>
              <p class="brand-subtitle">对接优质农产品，实现合作共赢</p>
            </div>
          </div>
          
          <div class="features-section">
            <h3 class="section-title">平台优势</h3>
            <div class="features-grid">
              <div class="feature-item">
                <div class="feature-icon">
                  <el-icon><Trophy /></el-icon>
                </div>
                <div class="feature-text">
                  <h4>品质保证</h4>
                  <p>严格筛选优质供应商，保障产品质量</p>
                </div>
              </div>
              
              <div class="feature-item">
                <div class="feature-icon">
                  <el-icon><Discount /></el-icon>
                </div>
                <div class="feature-text">
                  <h4>价格透明</h4>
                  <p>直接对接产地，省去中间环节成本</p>
                </div>
              </div>
              
              <div class="feature-item">
                <div class="feature-icon">
                  <el-icon><Van /></el-icon>
                </div>
                <div class="feature-text">
                  <h4>高效物流</h4>
                  <p>完善物流体系，快速送达目的地</p>
                </div>
              </div>
              
              <div class="feature-item">
                <div class="feature-icon">
                  <el-icon><Wallet /></el-icon>
                </div>
                <div class="feature-text">
                  <h4>安全交易</h4>
                  <p>第三方资金托管，保障交易安全</p>
                </div>
              </div>
              
              <div class="feature-item">
                <div class="feature-icon">
                  <el-icon><ChatLineRound /></el-icon>
                </div>
                <div class="feature-text">
                  <h4>在线沟通</h4>
                  <p>直接联系农户，沟通采购需求</p>
                </div>
              </div>
              
              <div class="feature-item">
                <div class="feature-icon">
                  <el-icon><DataLine /></el-icon>
                </div>
                <div class="feature-text">
                  <h4>数据分析</h4>
                  <p>市场行情分析，辅助采购决策</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="requirements-section">
            <h3 class="section-title">入驻要求</h3>
            <ul class="requirements-list">
              <li><el-icon><Check /></el-icon>具有合法的营业执照和经营资质</li>
              <li><el-icon><Check /></el-icon>诚信经营，具有良好的商业信誉</li>
              <li><el-icon><Check /></el-icon>具备一定的采购能力和资金实力</li>
              <li><el-icon><Check /></el-icon>遵守平台规则和交易规范</li>
              <li><el-icon><Check /></el-icon>提供真实有效的企业信息</li>
            </ul>
          </div>
        </div>
      </div>
      
      <!-- 右侧注册表单区域 -->
      <div class="form-section">
        <el-card class="register-card" shadow="never">
          <template #header>
            <div class="form-header">
              <div class="form-title">
                <h2>采购商入驻申请</h2>
                <p class="form-subtitle">填写企业信息，开启农产品采购之旅</p>
              </div>
              <div class="purchaser-badge">
                <el-tag type="danger" effect="plain" size="large">
                  <el-icon><ShoppingCart /></el-icon>
                  采购商
                </el-tag>
              </div>
            </div>
          </template>
          
          <el-form
            ref="purchaserFormRef"
            :model="purchaserForm"
            :rules="purchaserRules"
            label-position="top"
            size="large"
          >
            <!-- 联系人信息 -->
            <div class="form-section-block">
              <h3 class="block-title">
                <el-icon><User /></el-icon>
                联系人信息
              </h3>
              
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="联系人姓名" prop="name">
                    <el-input
                      v-model="purchaserForm.name"
                      placeholder="请输入联系人真实姓名"
                      clearable
                    >
                      <template #prefix>
                        <el-icon><User /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
                
                <el-col :span="12">
                  <el-form-item label="联系电话" prop="phone">
                    <el-input
                      v-model="purchaserForm.phone"
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
              
              <el-form-item label="电子邮箱" prop="email">
                <el-input
                  v-model="purchaserForm.email"
                  placeholder="请输入电子邮箱（用于接收通知）"
                  clearable
                >
                  <template #prefix>
                    <el-icon><Message /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </div>
            
            <!-- 企业信息 -->
            <div class="form-section-block">
              <h3 class="block-title">
                <el-icon><OfficeBuilding /></el-icon>
                企业信息
              </h3>
              
              <el-form-item label="公司名称" prop="companyName">
                <el-input
                  v-model="purchaserForm.companyName"
                  placeholder="请输入营业执照上的公司全称"
                  clearable
                  maxlength="50"
                  show-word-limit
                >
                  <template #prefix>
                    <el-icon><OfficeBuilding /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
              
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="营业执照号" prop="businessLicense">
                    <el-input
                      v-model="purchaserForm.businessLicense"
                      placeholder="请输入统一社会信用代码"
                      clearable
                      maxlength="20"
                    >
                      <template #prefix>
                        <el-icon><Document /></el-icon>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
                
                <el-col :span="12">
                  <el-form-item label="公司类型" prop="companyType">
                    <el-select
                      v-model="purchaserForm.companyType"
                      placeholder="请选择公司类型"
                      style="width: 100%"
                      clearable
                    >
                      <el-option label="有限责任公司" value="limited" />
                      <el-option label="股份有限公司" value="joint" />
                      <el-option label="个体工商户" value="individual" />
                      <el-option label="合伙企业" value="partnership" />
                      <el-option label="其他" value="other" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              
              <el-form-item label="经营范围" prop="businessScope">
                <el-input
                  v-model="purchaserForm.businessScope"
                  type="textarea"
                  :rows="3"
                  placeholder="请简述主要经营范围和采购品类"
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>
              
              <el-form-item label="公司地址" prop="address">
                <el-input
                  v-model="purchaserForm.address"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入公司详细地址"
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>
            </div>
            
            <!-- 采购信息 -->
            <div class="form-section-block">
              <h3 class="block-title">
                <el-icon><ShoppingBag /></el-icon>
                采购信息
              </h3>
              
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="主要采购地区" prop="villageId">
                    <el-select
                      v-model="purchaserForm.villageId"
                      placeholder="请选择主要采购地区"
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
                </el-col>
                
                <el-col :span="12">
                  <el-form-item label="月采购金额" prop="monthlyBudget">
                    <el-input
                      v-model="purchaserForm.monthlyBudget"
                      placeholder="请输入月采购预算"
                      clearable
                    >
                      <template #prefix>
                        <el-icon><Money /></el-icon>
                      </template>
                      <template #append>万元</template>
                    </el-input>
                  </el-form-item>
                </el-col>
              </el-row>
              
              <el-form-item label="采购品类" prop="purchaseCategories">
                <el-checkbox-group v-model="purchaserForm.purchaseCategories">
                  <el-checkbox v-for="category in categoryOptions" :key="category" :label="category">
                    {{ category }}
                  </el-checkbox>
                </el-checkbox-group>
              </el-form-item>
              
              <el-form-item label="合作意向" prop="cooperationIntent">
                <el-input
                  v-model="purchaserForm.cooperationIntent"
                  type="textarea"
                  :rows="3"
                  placeholder="请简述您的合作意向和采购需求（至少50字）"
                  maxlength="300"
                  show-word-limit
                />
              </el-form-item>
            </div>
            
            <!-- 账户设置 -->
            <div class="form-section-block">
              <h3 class="block-title">
                <el-icon><Lock /></el-icon>
                账户设置
              </h3>
              
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="设置密码" prop="password">
                    <el-input
                      v-model="purchaserForm.password"
                      type="password"
                      placeholder="请设置8-20位密码"
                      show-password
                      maxlength="20"
                      @input="updatePasswordStrength"
                    >
                      <template #prefix>
                        <el-icon><Lock /></el-icon>
                      </template>
                    </el-input>
                    
                    <div class="password-strength" v-if="purchaserForm.password">
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
                      v-model="purchaserForm.confirmPassword"
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
              
              <el-form-item label="手机验证" prop="verifyCode">
                <div class="verify-code-container">
                  <el-input
                    v-model="purchaserForm.verifyCode"
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
              
              <el-form-item prop="agreement">
                <el-checkbox v-model="purchaserForm.agreement">
                  我已阅读并同意
                  <el-link type="primary" @click="showTerms = true">《用户服务协议》</el-link>
                  和
                  <el-link type="primary" @click="showPrivacy = true">《隐私政策》</el-link>
                  ，并承诺所填信息真实有效
                </el-checkbox>
              </el-form-item>
            </div>
            
            <div class="form-submit">
              <el-button
                type="primary"
                :loading="submitting"
                :disabled="!canSubmit"
                size="large"
                class="submit-btn"
                @click="handleSubmit"
              >
                <el-icon><ShoppingCart /></el-icon>
                {{ submitting ? '提交申请中...' : '提交申请' }}
              </el-button>
              
              <div class="submit-note">
                <el-icon><InfoFilled /></el-icon>
                提交后我们将进行资质审核，审核结果将通过短信通知您
              </div>
            </div>
          </el-form>
          
          <div class="form-footer">
            <span>已有账号？</span>
            <el-link type="primary" @click="goToLogin">立即登录</el-link>
            <span class="separator">|</span>
            <el-link type="info" @click="goToRegister">其他角色注册</el-link>
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
  ShoppingCart,
  OfficeBuilding,
  Message,
  Document,
  ShoppingBag,
  Money,
  Trophy,
  Discount,
  Van,
  Wallet,
  ChatLineRound,
  DataLine,
  Check,
  InfoFilled,
} from '@element-plus/icons-vue';
import villageUserApi from '@/api/villageUser';
import TermsContent from './TermsContent.vue';
import PrivacyContent from './PrivacyContent.vue';

const router = useRouter();
const submitting = ref(false);
const showTerms = ref(false);
const showPrivacy = ref(false);
const codeCountdown = ref(0);
const purchaserFormRef = ref(null);
const villages = ref([]);

const purchaserForm = reactive({
  name: '',
  phone: '',
  email: '',
  companyName: '',
  businessLicense: '',
  companyType: '',
  businessScope: '',
  address: '',
  villageId: '',
  monthlyBudget: '',
  purchaseCategories: [],
  cooperationIntent: '',
  password: '',
  confirmPassword: '',
  verifyCode: '',
  agreement: false,
  role: 'purchaser',
});

const passwordStrength = reactive({
  score: 0,
  width: '0%',
  class: '',
  color: '',
  text: '',
});

const categoryOptions = [
  '粮食作物',
  '蔬菜',
  '水果',
  '畜禽产品',
  '水产养殖',
  '食用菌',
  '茶叶',
  '中药材',
  '苗木花卉',
  '其他',
];

const purchaserRules = reactive({
  name: [
    { required: true, message: '请输入联系人姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在2-20个字符', trigger: 'blur' },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入电子邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的电子邮箱', trigger: 'blur' },
  ],
  companyName: [
    { required: true, message: '请输入公司名称', trigger: 'blur' },
    { min: 5, max: 50, message: '公司名称长度在5-50个字符', trigger: 'blur' },
  ],
  businessLicense: [
    { required: true, message: '请输入营业执照号', trigger: 'blur' },
    { 
      pattern: /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/,
      message: '请输入正确的统一社会信用代码',
      trigger: 'blur' 
    },
  ],
  companyType: [
    { required: true, message: '请选择公司类型', trigger: 'change' },
  ],
  businessScope: [
    { required: true, message: '请输入经营范围', trigger: 'blur' },
    { min: 10, message: '经营范围至少10个字符', trigger: 'blur' },
  ],
  address: [
    { required: true, message: '请输入公司地址', trigger: 'blur' },
    { min: 10, message: '地址长度至少10个字符', trigger: 'blur' },
  ],
  villageId: [
    { required: true, message: '请选择主要采购地区', trigger: 'change' },
  ],
  monthlyBudget: [
    { required: true, message: '请输入月采购预算', trigger: 'blur' },
    { 
      pattern: /^[0-9]+(\.[0-9]{1,2})?$/,
      message: '请输入正确的金额',
      trigger: 'blur' 
    },
  ],
  purchaseCategories: [
    {
      validator: (rule, value, callback) => {
        if (value.length === 0) {
          callback(new Error('请至少选择一项采购品类'));
        } else {
          callback();
        }
      },
      trigger: 'change',
    },
  ],
  cooperationIntent: [
    { required: true, message: '请输入合作意向', trigger: 'blur' },
    { min: 50, message: '合作意向至少50个字符', trigger: 'blur' },
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
        if (value !== purchaserForm.password) {
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

const canSendCode = computed(() => {
  return /^1[3-9]\d{9}$/.test(purchaserForm.phone) && codeCountdown.value === 0;
});

const canSubmit = computed(() => {
  const requiredFields = ['name', 'phone', 'email', 'companyName', 'businessLicense', 
                          'companyType', 'businessScope', 'address', 'villageId', 
                          'monthlyBudget', 'cooperationIntent', 'password', 
                          'confirmPassword', 'verifyCode'];
  const hasRequired = requiredFields.every(field => purchaserForm[field]);
  const hasCategories = purchaserForm.purchaseCategories.length > 0;
  const hasAgreement = purchaserForm.agreement;
  const passwordsMatch = purchaserForm.password === purchaserForm.confirmPassword;
  
  return hasRequired && hasCategories && hasAgreement && passwordsMatch;
});

const updatePasswordStrength = () => {
  const pwd = purchaserForm.password;
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
  if (!purchaserFormRef.value) return;
  
  try {
    await purchaserFormRef.value.validate();
  } catch (error) {
    ElMessage.error('请检查表单信息是否完整');
    return;
  }
  
  submitting.value = true;
  try {
    const { confirmPassword, agreement, ...data } = purchaserForm;
    await villageUserApi.register(data);
    
    ElMessage.success('申请提交成功！审核结果将通过短信通知您。');
    setTimeout(() => {
      router.push('/auth/login');
    }, 2000);
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '提交申请失败，请重试');
  } finally {
    submitting.value = false;
  }
};

const handleDialogClose = (done) => {
  done();
};

const goToLogin = () => {
  router.push('/auth/login');
};

const goToRegister = () => {
  router.push('/auth/unified-register');
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
    console.error('获取地区列表失败:', error);
  }
};

onMounted(() => {
  loadVillages();
});
</script>

<style scoped>
.purchaser-register-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.register-wrapper {
  display: flex;
  max-width: 1200px;
  width: 100%;
  min-height: 700px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

/* 左侧信息区域 */
.info-section {
  flex: 1;
  background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: white;
  position: relative;
  overflow: hidden;
}

.info-section::before {
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

.info-content {
  position: relative;
  z-index: 1;
}

.brand-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo-container {
  margin-bottom: 24px;
}

.logo-shopping {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.purchaser-icon {
  color: white;
}

.brand-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.brand-subtitle {
  font-size: 16px;
  margin: 0;
  opacity: 0.9;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 32px 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 24px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 2px;
}

/* 特性网格 */
.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.feature-item {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  transition: all 0.3s ease;
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.feature-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-text h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.feature-text p {
  font-size: 12px;
  margin: 0;
  opacity: 0.9;
  line-height: 1.4;
}

/* 入驻要求 */
.requirements-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.requirements-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  opacity: 0.9;
}

.requirements-list .el-icon {
  color: #f472b6;
  font-size: 16px;
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
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f3f4f6;
}

.form-title h2 {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.form-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.purchaser-badge {
  flex-shrink: 0;
}

/* 表单区块 */
.form-section-block {
  margin-bottom: 32px;
  padding: 20px;
  background: #fdf2f8;
  border-radius: 12px;
  border: 1px solid #fbcfe8;
}

.block-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.block-title .el-icon {
  color: #ec4899;
}

/* 密码强度 */
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

/* 提交区域 */
.form-submit {
  text-align: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.submit-btn {
  width: 200px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #ec4899, #be185d);
  border: none;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(236, 72, 153, 0.3);
}

.submit-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 12px;
  color: #6b7280;
}

.submit-note .el-icon {
  color: #3b82f6;
}

/* 表单底部 */
.form-footer {
  text-align: center;
  margin-top: 24px;
  color: #6b7280;
  font-size: 14px;
}

.form-footer .el-link {
  font-weight: 500;
}

.separator {
  margin: 0 8px;
  color: #d1d5db;
}

/* 对话框内容 */
.dialog-content {
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.6;
  color: #374151;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .register-wrapper {
    flex-direction: column;
  }
  
  .info-section {
    padding: 40px 20px;
    min-height: 400px;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .form-section {
    padding: 32px 24px;
  }
}

@media (max-width: 640px) {
  .purchaser-register-container {
    padding: 10px;
  }
  
  .info-section {
    padding: 30px 15px;
  }
  
  .brand-title {
    font-size: 28px;
  }
  
  .feature-item {
    padding: 12px;
  }
  
  .feature-icon {
    width: 32px;
    height: 32px;
  }
  
  .form-section {
    padding: 20px 15px;
  }
  
  .form-section-block {
    padding: 15px;
  }
  
  .form-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .submit-btn {
    width: 100%;
  }
}
</style>