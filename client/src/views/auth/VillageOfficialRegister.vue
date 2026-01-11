<template>
  <div class="register-container">
    <div class="register-wrapper">
      <aside class="brand-section" aria-labelledby="brand-title">
        <div class="brand-content">
          <div class="brand-logo">
            <div class="logo-icon" aria-hidden="true">
              <el-icon :size="56"><OfficeBuilding /></el-icon>
            </div>
            <h1 id="brand-title" class="brand-name">智慧乡村</h1>
            <p class="brand-tag">Smart Village Platform</p>
          </div>

          <div class="brand-slogan">
            <h2>村干部申请</h2>
            <p>服务乡村建设，促进乡村振兴</p>
          </div>

          <div class="features-showcase">
            <article class="feature-card" role="article">
              <div class="feature-icon-wrapper" aria-hidden="true">
                <el-icon :size="28"><Document /></el-icon>
              </div>
              <div class="feature-info">
                <h4>村务管理</h4>
                <p>负责村级日常事务管理和决策</p>
              </div>
            </article>
            <article class="feature-card" role="article">
              <div class="feature-icon-wrapper" aria-hidden="true">
                <el-icon :size="28"><UserFilled /></el-icon>
              </div>
              <div class="feature-info">
                <h4>民生服务</h4>
                <p>为村民提供便民服务和政策咨询</p>
              </div>
            </article>
            <article class="feature-card" role="article">
              <div class="feature-icon-wrapper" aria-hidden="true">
                <el-icon :size="28"><DataAnalysis /></el-icon>
              </div>
              <div class="feature-info">
                <h4>数据统计</h4>
                <p>收集整理村级数据和人口信息</p>
              </div>
            </article>
            <article class="feature-card" role="article">
              <div class="feature-icon-wrapper" aria-hidden="true">
                <el-icon :size="28"><Promotion /></el-icon>
              </div>
              <div class="feature-info">
                <h4>政策执行</h4>
                <p>传达执行上级政策和农业补贴</p>
              </div>
            </article>
          </div>

          <div class="requirements-section">
            <h3>任职要求</h3>
            <ul class="requirements-list">
              <li><el-icon><Check /></el-icon>具有中华人民共和国国籍，年满18周岁</li>
              <li><el-icon><Check /></el-icon>具有良好的政治素质和道德品质</li>
              <li><el-icon><Check /></el-icon>熟悉当地村情，热爱农村工作</li>
              <li><el-icon><Check /></el-icon>具备基本的组织协调和沟通能力</li>
              <li><el-icon><Check /></el-icon>能够熟练使用智能手机和基本办公软件</li>
            </ul>
          </div>
        </div>

        <div class="background-effects" aria-hidden="true">
          <div class="effect-circle effect-1"></div>
          <div class="effect-circle effect-2"></div>
        </div>
      </aside>

      <section class="form-section" aria-labelledby="form-heading">
        <div class="form-content">
          <header class="form-header">
            <h2 id="form-heading" class="form-title">村干部申请表</h2>
            <p class="form-subtitle">请如实填写以下信息，我们将严格审核您的申请</p>
            <el-tag type="warning" effect="plain" size="large" class="role-tag">
              <el-icon><OfficeBuilding /></el-icon>
              村干部
            </el-tag>
          </header>

          <el-form
            ref="registerFormRef"
            :model="registerForm"
            :rules="registerRules"
            label-position="top"
            size="large"
            class="register-form"
            @submit.prevent="handleSubmit"
          >
            <div class="form-section-block">
              <h3 class="block-title">
                <el-icon><User /></el-icon>
                个人基本信息
              </h3>

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
                </el-col>
              </el-row>

              <el-form-item label="身份证号码" prop="idCard">
                <el-input
                  v-model="registerForm.idCard"
                  placeholder="请输入18位身份证号"
                  maxlength="18"
                  clearable
                >
                  <template #prefix>
                    <el-icon><Postcard /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </div>

            <div class="form-section-block">
              <h3 class="block-title">
                <el-icon><OfficeBuilding /></el-icon>
                工作信息
              </h3>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="申请职务" prop="position">
                    <el-select
                      v-model="registerForm.position"
                      placeholder="请选择申请职务"
                      style="width: 100%"
                      clearable
                    >
                      <el-option label="村书记" value="村书记" />
                      <el-option label="村主任" value="村主任" />
                      <el-option label="副主任" value="副主任" />
                      <el-option label="会计" value="会计" />
                      <el-option label="村委成员" value="村委成员" />
                      <el-option label="工作人员" value="工作人员" />
                    </el-select>
                  </el-form-item>
                </el-col>

                <el-col :span="12">
                  <el-form-item label="所属部门" prop="department">
                    <el-input
                      v-model="registerForm.department"
                      placeholder="如：村委会、党支部等"
                      clearable
                    />
                  </el-form-item>
                </el-col>
              </el-row>

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
                  placeholder="请输入详细家庭住址"
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>
            </div>

            <div class="form-section-block">
              <h3 class="block-title">
                <el-icon><Document /></el-icon>
                申请信息
              </h3>

              <el-form-item label="申请理由" prop="reason">
                <el-input
                  v-model="registerForm.reason"
                  type="textarea"
                  :rows="4"
                  placeholder="请详细说明申请村干部职务的理由、工作计划和个人优势（至少100字）"
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>

              <el-form-item label="工作经验" prop="experience">
                <el-input
                  v-model="registerForm.experience"
                  type="textarea"
                  :rows="3"
                  placeholder="请简述您的工作经验，特别是与村务管理、民生服务相关的经历"
                  maxlength="300"
                  show-word-limit
                />
              </el-form-item>

              <el-form-item label="个人特长" prop="skills">
                <el-checkbox-group v-model="registerForm.skills">
                  <el-checkbox v-for="skill in skillOptions" :key="skill" :label="skill">
                    {{ skill }}
                  </el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </div>

            <div class="form-section-block">
              <h3 class="block-title">
                <el-icon><Lock /></el-icon>
                账户设置
              </h3>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="设置密码" prop="password">
                    <el-input
                      v-model="registerForm.password"
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

                    <div v-if="registerForm.password" class="password-strength">
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

              <el-form-item label="手机验证码" prop="verifyCode">
                <div class="verify-code-container">
                  <el-input
                    v-model="registerForm.verifyCode"
                    placeholder="请输入6位验证码"
                    maxlength="6"
                    clearable
                  >
                    <template #prefix>
                      <el-icon><Postcard /></el-icon>
                    </template>
                  </el-input>

                  <el-button
                    type="primary"
                    :disabled="!canSendCode || codeCountdown > 0"
                    @click="sendVerifyCode"
                  >
                    {{ codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码' }}
                  </el-button>
                </div>

                <div class="verify-tips">
                  <p><el-icon><InfoFilled /></el-icon>验证码已发送到您的手机</p>
                </div>
              </el-form-item>
            </div>

            <el-form-item class="agreement-item">
              <el-checkbox v-model="registerForm.agreement">
                我已阅读并同意
                <el-link type="primary" @click="showTerms = true">《用户服务协议》</el-link>
                和
                <el-link type="primary" @click="showPrivacy = true">《隐私政策》</el-link>
              </el-checkbox>
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :loading="loading"
                :disabled="!canSubmit"
                class="submit-btn"
                @click="handleSubmit"
              >
                <el-icon><UserFilled /></el-icon>
                {{ loading ? '提交申请中...' : '提交申请' }}
              </el-button>

              <div class="submit-note">
                <el-icon><InfoFilled /></el-icon>
                提交后我们将进行审核，审核结果将通过短信通知您
              </div>
            </el-form-item>
          </el-form>

          <div class="form-footer">
            <span>已有账号？</span>
            <el-link type="primary" @click="goToLogin">立即登录</el-link>
          </div>
        </div>
      </section>
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

    <footer class="page-footer">
      <p>© 2025 智慧乡村平台 技术支持 v2.0</p>
    </footer>
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
  UserFilled,
  OfficeBuilding,
  Postcard,
  Message,
  Document,
  UserFilled as UserGroup,
  DataAnalysis,
  Promotion,
  Check,
  InfoFilled,
  Location
} from '@element-plus/icons-vue';
import villageUserApi from '@/api/villageUser';
import TermsContent from './TermsContent.vue';
import PrivacyContent from './PrivacyContent.vue';

defineOptions({
  name: 'VillageOfficialRegister'
});

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const showTerms = ref(false);
const showPrivacy = ref(false);
const codeCountdown = ref(0);
const registerFormRef = ref(null);
const villages = ref([]);

const registerForm = reactive({
  name: '',
  phone: '',
  email: '',
  idCard: '',
  gender: '',
  position: '',
  department: '',
  villageId: '',
  address: '',
  reason: '',
  experience: '',
  skills: [],
  password: '',
  confirmPassword: '',
  verifyCode: '',
  agreement: false,
  role: 'village_official'
});

const passwordStrength = reactive({
  score: 0,
  width: '0%',
  class: '',
  color: '',
  text: ''
});

const skillOptions = [
  '财务管理',
  '文书写作',
  '电脑操作',
  '沟通协调',
  '组织管理',
  '农业生产',
  '政策解读',
  '群众工作'
];

const villagesData = [
  { id: 'v001', name: '贵州省贞丰县鲁贡镇么扒村' },
  { id: 'v002', name: '贵州省贞丰县鲁贡镇弄洋村' },
  { id: 'v003', name: '贵州省望谟县乐元镇乐元村' },
  { id: 'v004', name: '贵州省兴义市顶效镇绿化村' },
  { id: 'v005', name: '贵州省贞丰县白层镇兴龙村' },
  { id: 'v006', name: '贵州省贞丰县沙坪镇者央村' },
  { id: 'v007', name: '贵州省望谟县乐元镇里好村' },
  { id: 'v008', name: '贵州省兴义市顶效镇绿荫村' }
];

const registerRules = reactive({
  name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在2-20个字符', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入电子邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的电子邮箱', trigger: 'blur' }
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号', trigger: 'blur' }
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' }
  ],
  position: [
    { required: true, message: '请选择申请职务', trigger: 'change' }
  ],
  department: [
    { required: true, message: '请输入所属部门', trigger: 'blur' }
  ],
  villageId: [
    { required: true, message: '请选择所属村庄', trigger: 'change' }
  ],
  address: [
    { required: true, message: '请输入详细地址', trigger: 'blur' },
    { min: 5, message: '地址长度至少5个字符', trigger: 'blur' }
  ],
  reason: [
    { required: true, message: '请输入申请理由', trigger: 'blur' },
    { min: 100, message: '申请理由至少100字', trigger: 'blur' }
  ],
  experience: [
    { required: true, message: '请输入工作经验', trigger: 'blur' },
    { min: 20, message: '工作经验至少20字', trigger: 'blur' }
  ],
  skills: [
    {
      type: 'array',
      required: true,
      message: '请至少选择一项个人特长',
      trigger: 'change'
    }
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
    }
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
      trigger: 'blur'
    }
  ],
  verifyCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' }
  ],
  agreement: [
    {
      type: 'enum',
      enum: [true],
      message: '请阅读并同意用户协议和隐私政策',
      trigger: 'change'
    }
  ]
});

const canSendCode = computed(() => {
  return /^1[3-9]\d{9}$/.test(registerForm.phone) && codeCountdown.value === 0;
});

const canSubmit = computed(() => {
  const requiredFields = ['name', 'phone', 'idCard', 'gender', 'position', 'department',
                          'villageId', 'address', 'reason', 'experience', 'password',
                          'confirmPassword', 'verifyCode'];
  const hasRequired = requiredFields.every(field => registerForm[field]);
  const hasSkills = registerForm.skills.length > 0;
  const hasAgreement = registerForm.agreement;
  const passwordsMatch = registerForm.password === registerForm.confirmPassword;

  return hasRequired && hasSkills && hasAgreement && passwordsMatch;
});

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

    ElMessage.success('申请提交成功！审核结果将通过短信通知您。');
    setTimeout(() => {
      router.push('/auth/login');
    }, 2000);
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '提交申请失败，请重试');
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

onMounted(() => {
  villages.value = villagesData;
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');

.register-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%);
  font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
}

.register-wrapper {
  display: flex;
  width: 100%;
  max-width: 1400px;
  min-height: 700px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  position: relative;
}

.brand-section {
  flex: 1;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  padding: 40px;
  display: flex;
  align-items: center;
  position: relative;
  box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.1);
}

.brand-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.1) 0%, transparent 45%);
  pointer-events: none;
}

.brand-content {
  width: 100%;
  color: white;
  z-index: 1;
  position: relative;
}

.brand-logo {
  margin-bottom: 32px;
}

.logo-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  backdrop-filter: blur(20px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.brand-name {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.25);
}

.brand-tag {
  font-size: 13px;
  margin: 0;
  opacity: 0.95;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.brand-slogan {
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.06) 100%);
  backdrop-filter: blur(15px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 32px;
}

.brand-slogan h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.brand-slogan p {
  font-size: 14px;
  margin: 0;
  opacity: 0.9;
}

.features-showcase {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 32px;
}

.feature-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%);
  backdrop-filter: blur(15px);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 14px;
  transition: all 0.3s ease;
}

.feature-card:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%);
  transform: translateX(6px);
}

.feature-icon-wrapper {
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.feature-info h4 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 3px 0;
}

.feature-info p {
  font-size: 12px;
  margin: 0;
  opacity: 0.9;
}

.requirements-section {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.requirements-section h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.requirements-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.requirements-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 14px;
  opacity: 0.95;
}

.requirements-list .el-icon {
  color: #fbbf24;
  font-size: 16px;
}

.background-effects {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.effect-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  animation: float 20s infinite ease-in-out;
}

.effect-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  left: 10%;
}

.effect-2 {
  width: 150px;
  height: 150px;
  bottom: 20%;
  right: 10%;
  animation-delay: 10s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
    opacity: 0.06;
  }
  50% {
    transform: translateY(-15px) rotate(180deg);
    opacity: 0.12;
  }
}

.form-section {
  flex: 1.3;
  padding: 40px;
  background: white;
  overflow-y: auto;
  max-height: 100vh;
}

.form-content {
  max-width: 700px;
  margin: 0 auto;
}

.form-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid #f3f4f6;
}

.form-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.form-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 16px 0;
}

.role-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.form-section-block {
  margin-bottom: 28px;
  padding: 24px;
  background: #fefce8;
  border-radius: 12px;
  border: 1px solid #fef3c7;
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
  color: #f59e0b;
}

.password-strength {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
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

.verify-code-container {
  display: flex;
  gap: 12px;
}

.verify-code-container .el-input {
  flex: 1;
}

.verify-tips {
  margin-top: 12px;
  padding: 10px 12px;
  background: #f0f9ff;
  border-radius: 6px;
  border-left: 3px solid #0369A1;
}

.verify-tips p {
  margin: 0;
  color: #0369A1;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.agreement-item {
  margin-top: 8px;
}

.submit-btn {
  width: 100%;
  height: 52px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: none;
  border-radius: 10px;
  font-family: 'Source Sans 3', sans-serif;
  transition: all 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(245, 151, 11, 0.3);
}

.submit-note {
  margin-top: 14px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.submit-note .el-icon {
  color: #3b82f6;
}

.form-footer {
  text-align: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
  color: #6b7280;
  font-size: 14px;
}

.dialog-content {
  max-height: 60vh;
  overflow-y: auto;
}

.page-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  background: transparent;
  z-index: 10;
}

@media (max-width: 1024px) {
  .register-wrapper {
    flex-direction: column;
    max-width: 800px;
  }

  .brand-section {
    padding: 30px;
    min-height: 300px;
  }

  .form-section {
    padding: 30px;
    max-height: none;
  }
}

@media (max-width: 640px) {
  .register-container {
    padding: 10px;
  }

  .features-showcase {
    grid-template-columns: 1fr;
  }

  .form-section {
    padding: 20px;
  }

  .form-title {
    font-size: 24px;
  }
}
</style>
