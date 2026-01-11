<template>
  <div class="modern-login-container" role="main" aria-label="登录页面" :class="{ 'has-form': selectedRole }">
    <div class="login-wrapper">
      <aside class="brand-section" aria-labelledby="brand-title">
        <div class="brand-content">
          <div class="brand-logo">
            <div class="logo-icon" aria-hidden="true">
              <el-icon :size="60"><Grid /></el-icon>
            </div>
            <h1 id="brand-title" class="brand-name">智慧乡村</h1>
            <p class="brand-tag">Smart Village Platform</p>
          </div>

          <div class="brand-slogan">
            <h2>数字赋能乡村 · 科技点亮生活</h2>
            <p>构建智慧化、数字化、现代化的新农村服务体系</p>
          </div>

          <div class="features-showcase">
            <article class="feature-card" role="article">
              <div class="feature-icon-wrapper" aria-hidden="true">
                <el-icon :size="32"><DataAnalysis /></el-icon>
              </div>
              <div class="feature-info">
                <h4>数据驱动</h4>
                <p>大数据分析，智能决策</p>
              </div>
            </article>
            <article class="feature-card" role="article">
              <div class="feature-icon-wrapper" aria-hidden="true">
                <el-icon :size="32"><TrendCharts /></el-icon>
              </div>
              <div class="feature-info">
                <h4>智慧管理</h4>
                <p>村务高效透明，监督有力</p>
              </div>
            </article>
            <article class="feature-card" role="article">
              <div class="feature-icon-wrapper" aria-hidden="true">
                <el-icon :size="32"><Connection /></el-icon>
              </div>
              <div class="feature-info">
                <h4>便民服务</h4>
                <p>一站式办事，省时省力</p>
              </div>
            </article>
            <article class="feature-card" role="article">
              <div class="feature-icon-wrapper" aria-hidden="true">
                <el-icon :size="32"><Medal /></el-icon>
              </div>
              <div class="feature-info">
                <h4>乡村振兴</h4>
                <p>促进产业发展，带动致富</p>
              </div>
            </article>
          </div>

          <div class="stats-display" aria-label="平台统计数据">
            <div class="stat-item">
              <div class="stat-value">100+</div>
              <div class="stat-label">覆盖村庄</div>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <div class="stat-value">50K+</div>
              <div class="stat-label">服务村民</div>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <div class="stat-value">98%</div>
              <div class="stat-label">满意度</div>
            </div>
          </div>
        </div>

        <div class="background-effects" aria-hidden="true">
          <div class="effect-circle effect-1"></div>
          <div class="effect-circle effect-2"></div>
          <div class="effect-circle effect-3"></div>
          <div class="effect-circle effect-4"></div>
        </div>
      </aside>

      <section class="login-section" aria-labelledby="login-heading">
        <div class="login-content">
          <header class="login-header">
            <h2 id="login-heading" class="login-title">欢迎登录</h2>
            <p class="login-subtitle">选择您的身份，开始智慧生活</p>
          </header>

          <div class="role-selection" v-if="!selectedRole" role="radiogroup" aria-label="选择角色">
            <div class="role-grid">
              <button
                v-for="role in roles"
                :key="role.id"
                type="button"
                class="role-card"
                :class="{ active: selectedRole === role.id }"
                :aria-pressed="selectedRole === role.id"
                :aria-label="`选择${role.name}角色`"
                @click="selectRole(role.id)"
                @keydown.enter="selectRole(role.id)"
              >
                <div class="role-icon-box" :class="role.id" aria-hidden="true">
                  <el-icon :size="42">
                    <component :is="role.icon" />
                  </el-icon>
                </div>
                <div class="role-badge">{{ role.features }}</div>
                <h3 class="role-title">{{ role.name }}</h3>
                <p class="role-description">{{ role.description }}</p>
                <div class="role-tags" aria-hidden="true">
                  <span v-for="tag in role.tags" :key="tag" class="role-tag">{{ tag }}</span>
                </div>
                <div class="role-arrow" aria-hidden="true">
                  <el-icon><ArrowRight /></el-icon>
                </div>
              </button>
            </div>
          </div>

          <div v-else class="login-form-section" role="form" aria-label="登录表单">
            <div class="role-indicator">
              <el-button text @click="selectedRole = null" class="back-btn" type="button">
                <el-icon><ArrowLeft /></el-icon>
                返回选择
              </el-button>
              <el-tag :type="roleTagType(selectedRole)" effect="light" class="role-tag-display">
                {{ roleTitles[selectedRole] }}
              </el-tag>
            </div>

            <el-form
              ref="loginFormRef"
              :model="loginForm"
              :rules="loginRules"
              label-position="top"
              size="large"
              class="login-form"
              @submit.prevent="handleLogin"
            >
              <el-form-item label="手机号" prop="phone">
                <el-input
                  v-model="loginForm.phone"
                  placeholder="请输入11位手机号"
                  maxlength="11"
                  clearable
                  :prefix-icon="Phone"
                  class="custom-input"
                  aria-label="手机号输入"
                  autocomplete="tel"
                />
              </el-form-item>

              <el-form-item label="密码" prop="password">
                <el-input
                  v-model="loginForm.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="请输入登录密码"
                  clearable
                  :prefix-icon="Lock"
                  class="custom-input"
                  aria-label="密码输入"
                  autocomplete="current-password"
                >
                  <template #suffix>
                    <button
                      type="button"
                      class="password-toggle"
                      :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                      @click="togglePassword"
                    >
                      <el-icon><component :is="showPassword ? View : Hide" /></el-icon>
                    </button>
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item v-if="showVillageSelect" label="选择村庄" prop="villageId">
                <el-select
                  v-model="loginForm.villageId"
                  placeholder="请选择村庄"
                  clearable
                  class="custom-select"
                  style="width: 100%"
                  aria-label="村庄选择"
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

              <el-form-item>
                <div class="form-actions">
                  <el-checkbox v-model="rememberMe" class="remember-check" id="remember-check">
                    记住登录
                  </el-checkbox>
                  <el-link type="primary" @click="showForgotPassword = true" class="forgot-link">
                    忘记密码？
                  </el-link>
                </div>
              </el-form-item>

              <el-form-item>
                <el-checkbox v-model="agreeToTerms" class="terms-check">
                  我已阅读并同意
                  <el-link type="primary" @click="showTermsDialog = true" class="terms-link">
                    《用户服务协议》
                  </el-link>
                  和
                  <el-link type="primary" @click="showPrivacyDialog = true" class="terms-link">
                    《隐私政策》
                  </el-link>
                </el-checkbox>
              </el-form-item>

              <el-form-item>
                <el-button
                  type="primary"
                  native-type="submit"
                  :loading="loading"
                  :disabled="!canLogin"
                  class="login-btn"
                  aria-label="登录按钮"
                >
                  {{ loading ? '登录中...' : '立即登录' }}
                </el-button>
              </el-form-item>

              <div class="form-footer">
                <span class="footer-text">还没有账号？</span>
                <el-link type="primary" @click="showRegisterDialog = true" class="register-link">
                  立即注册
                </el-link>
              </div>
            </el-form>

            <div class="security-info" aria-live="polite">
              <el-icon><Lock /></el-icon>
              <span>安全加密传输，保护您的隐私</span>
            </div>
          </div>

          <footer class="login-footer">
            <p>© 智慧乡村平台</p>
          </footer>
        </div>
      </section>
    </div>

    <el-dialog
      v-model="showForgotPassword"
      title="重置密码"
      width="480px"
      :close-on-click-modal="false"
      class="custom-dialog"
      role="dialog"
      aria-labelledby="reset-password-title"
      aria-modal="true"
    >
      <el-form :model="resetForm" label-position="top" size="large">
        <el-form-item label="手机号" required>
          <el-input
            v-model="resetForm.phone"
            placeholder="请输入注册手机号"
            maxlength="11"
            aria-label="重置密码手机号"
            autocomplete="tel"
          />
        </el-form-item>
        <el-form-item label="验证码" required>
          <div style="display: flex; gap: 10px">
            <el-input
              v-model="resetForm.verifyCode"
              placeholder="请输入验证码"
              aria-label="验证码输入"
              autocomplete="one-time-code"
            />
            <el-button
              :disabled="codeCountdown > 0"
              @click="sendVerifyCode"
              type="button"
              :aria-label="codeCountdown > 0 ? `等待${codeCountdown}秒后重试` : '获取验证码'"
            >
              {{ codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="新密码" required>
          <el-input
            v-model="resetForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            aria-label="新密码输入"
            autocomplete="new-password"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForgotPassword = false">取消</el-button>
        <el-button type="primary" @click="handleResetPassword">确认重置</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showRegisterDialog"
      title="选择注册方式"
      width="600px"
      :close-on-click-modal="false"
      class="custom-dialog"
      role="dialog"
      aria-labelledby="register-title"
      aria-modal="true"
    >
      <div class="register-options" role="list" aria-label="注册方式选择">
        <button
          class="register-card"
          type="button"
          role="listitem"
          :aria-label="`选择${ROLES.resident}注册`"
          @click="goToRegister('resident')"
        >
          <div class="register-icon resident" aria-hidden="true">
            <el-icon :size="44"><UserFilled /></el-icon>
          </div>
          <h4>村民注册</h4>
          <p>简化流程，快速开通</p>
        </button>
        <button
          class="register-card"
          type="button"
          role="listitem"
          :aria-label="`选择${ROLES.village_official}注册`"
          @click="goToRegister('village_official')"
        >
          <div class="register-icon official" aria-hidden="true">
            <el-icon :size="44"><OfficeBuilding /></el-icon>
          </div>
          <h4>村干部申请</h4>
          <p>资质审核，正式上岗</p>
        </button>
        <button
          class="register-card"
          type="button"
          role="listitem"
          :aria-label="`选择${ROLES.purchaser}注册`"
          @click="goToRegister('purchaser')"
        >
          <div class="register-icon purchaser" aria-hidden="true">
            <el-icon :size="44"><ShoppingCart /></el-icon>
          </div>
          <h4>采购商入驻</h4>
          <p>快速填写，立即开通</p>
        </button>
      </div>
    </el-dialog>

    <el-dialog
      v-model="showTermsDialog"
      title="用户服务协议"
      width="720px"
      class="custom-dialog"
      role="dialog"
      aria-labelledby="terms-title"
      aria-modal="true"
    >
      <div class="dialog-content terms-content">
        <h3>智慧乡村平台用户服务协议</h3>
        <p>欢迎使用智慧乡村平台！请您在使用前仔细阅读以下协议条款。</p>
        
        <h4>一、服务说明</h4>
        <p>智慧乡村平台是一个综合性乡村服务平台，旨在为村民、村干部、乡镇干部及采购商提供便捷的数字化服务。</p>
        
        <h4>二、用户义务</h4>
        <p>用户应妥善保管账号密码，不得将账号借予他人使用。用户应对通过其账号进行的所有活动承担责任。</p>
        
        <h4>三、隐私保护</h4>
        <p>平台重视用户隐私保护，承诺依法保护用户的个人信息安全。</p>
        
        <h4>四、免责声明</h4>
        <p>平台尽力确保服务的稳定性和准确性，但不对因不可抗力或网络原因导致的服务中断承担责任。</p>
        
        <h4>五、协议更新</h4>
        <p>平台保留根据实际情况修改本协议的权利，修改将通过平台公告方式通知用户。</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="showTermsDialog = false">我已阅读</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showPrivacyDialog"
      title="隐私政策"
      width="720px"
      class="custom-dialog"
      role="dialog"
      aria-labelledby="privacy-title"
      aria-modal="true"
    >
      <div class="dialog-content privacy-content">
        <h3>隐私政策</h3>
        <p>智慧乡村平台重视您的隐私权益，特制定本隐私政策说明。</p>
        
        <h4>一、信息收集</h4>
        <p>我们收集您注册时提供的手机号、姓名等信息，以及使用服务过程中产生的数据。</p>
        
        <h4>二、信息使用</h4>
        <p>您的信息仅用于提供服务、身份验证及平台运营分析，不会用于其他商业目的。</p>
        
        <h4>三、信息保护</h4>
        <p>我们采用加密技术保护您的个人信息，防止未经授权的访问和使用。</p>
        
        <h4>四、信息共享</h4>
        <p>未经您的同意，我们不会向第三方共享您的个人信息，法律法规另有规定的除外。</p>
        
        <h4>五、您的权利</h4>
        <p>您有权查询、更正、删除您的个人信息，或注销账号。</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="showPrivacyDialog = false">我已阅读</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  Phone,
  Lock,
  View,
  Hide,
  UserFilled,
  OfficeBuilding,
  ShoppingCart,
  User,
  Location,
  Setting,
  ArrowRight,
  ArrowLeft,
  Grid,
  DataAnalysis,
  TrendCharts,
  Connection,
  Medal
} from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';

defineOptions({
  name: 'ModernLogin'
});

const ROLE_COLORS = {
  resident: '#10b981',
  village_official: '#f59e0b',
  township_official: '#8b5cf6',
  purchaser: '#ec4899',
  admin: '#3b82f6'
};

const ROLE_COLORS_LIGHT = {
  resident: '#34d399',
  village_official: '#fbbf24',
  township_official: '#a78bfa',
  purchaser: '#f472b6',
  admin: '#60a5fa'
};

const ROLES = {
  resident: '村民',
  village_official: '村干部',
  township_official: '乡镇干部',
  purchaser: '采购商',
  admin: '管理员'
};

const REDIRECT_MAP = {
  resident: '/village/affairs',
  village_official: '/village/management',
  township_official: '/township/management',
  purchaser: '/market/purchasing',
  admin: '/admin/dashboard'
};

const CODE_COUNTDOWN = 60;
const LOGIN_DELAY = 800;

const router = useRouter();
const userStore = useUserStore();

const selectedRole = ref(null);
const showPassword = ref(false);
const rememberMe = ref(false);
const agreeToTerms = ref(false);
const loading = ref(false);
const codeCountdown = ref(0);
const showForgotPassword = ref(false);
const showRegisterDialog = ref(false);
const showTermsDialog = ref(false);
const showPrivacyDialog = ref(false);

const loginFormRef = ref(null);
let countdownTimer = null;

const roles = [
  {
    id: 'resident',
    name: ROLES.resident,
    description: '村民专属服务，办事大厅在线办理，便民信息一键查询',
    tags: ['办事大厅', '在线查询', '邻里互助', '便民服务'],
    features: '村民服务平台',
    icon: User
  },
  {
    id: 'village_official',
    name: ROLES.village_official,
    description: '村干部管理平台，村务高效管理，值班灵活安排',
    tags: ['村务管理', '资料收集', '值班管理', '数据分析'],
    features: '村庄管理中心',
    icon: OfficeBuilding
  },
  {
    id: 'township_official',
    name: ROLES.township_official,
    description: '乡镇干部统筹平台，多村统一管理，政策快速传达',
    tags: ['多村管理', '政策传达', '监督指导', '数据汇总'],
    features: '乡镇管理平台',
    icon: Location
  },
  {
    id: 'purchaser',
    name: ROLES.purchaser,
    description: '农产品采购平台，优质产品浏览，订单智能管理',
    tags: ['产品浏览', '订单管理', '供应商对接', '智能推荐'],
    features: '采购交易平台',
    icon: ShoppingCart
  },
  {
    id: 'admin',
    name: ROLES.admin,
    description: '系统管理平台，权限精细控制，用户统一管理',
    tags: ['系统配置', '用户管理', '权限控制', '安全审计'],
    features: '系统控制中心',
    icon: Setting
  }
];

const roleTitles = ROLES;

const loginForm = reactive({
  phone: '',
  password: '',
  villageId: '',
  role: ''
});

const resetForm = reactive({
  phone: '',
  verifyCode: '',
  newPassword: ''
});

const villages = ref([
  { id: 'v001', name: '贵州省贞丰县鲁贡镇么扒村' },
  { id: 'v002', name: '贵州省贞丰县鲁贡镇弄洋村' },
  { id: 'v003', name: '贵州省望谟县乐元镇乐元村' },
  { id: 'v004', name: '贵州省兴义市顶效镇绿化村' },
  { id: 'v005', name: '贵州省贞丰县白层镇兴龙村' }
]);

const loginRules = reactive({
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
});

const canLogin = computed(() => {
  const hasCredentials = loginForm.phone.length === 11 && loginForm.password.length >= 6;
  const hasAgreed = agreeToTerms.value;
  
  if (showVillageSelect.value) {
    return hasCredentials && hasAgreed && loginForm.villageId;
  }
  
  return hasCredentials && hasAgreed;
});

const showVillageSelect = computed(() => {
  return ['resident', 'village_official', 'admin'].includes(selectedRole.value);
});

const roleTagType = (role) => {
  const typeMap = {
    resident: 'success',
    village_official: 'warning',
    township_official: 'info',
    purchaser: 'danger',
    admin: 'primary'
  };
  return typeMap[role] || 'info';
};

const selectRole = (roleId) => {
  selectedRole.value = roleId;
  loginForm.role = roleId;
};

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

const handleLogin = async () => {
  if (!loginFormRef.value) return;

  try {
    await loginFormRef.value.validate();
  } catch (error) {
    return;
  }

  loading.value = true;
  try {
    const result = await userStore.login({
      ...loginForm,
      role: selectedRole.value
    });

    if (result.success) {
      ElMessage.success('登录成功！');

      if (rememberMe.value) {
        localStorage.setItem('remember_phone', loginForm.phone);
        localStorage.setItem('remember_me', 'true');
        localStorage.setItem('user_role', selectedRole.value);
      } else {
        localStorage.removeItem('remember_phone');
        localStorage.removeItem('remember_me');
        localStorage.removeItem('user_role');
      }

      setTimeout(() => {
        router.replace(REDIRECT_MAP[selectedRole.value] || '/village/affairs');
      }, LOGIN_DELAY);
    } else {
      ElMessage.error(result.message || '登录失败，请检查账号密码');
    }
  } catch (error) {
    console.error('登录失败:', error);
    ElMessage.error('网络异常，请稍后重试');
  } finally {
    loading.value = false;
  }
};

const sendVerifyCode = async () => {
  if (!resetForm.phone) {
    ElMessage.warning('请输入手机号');
    return;
  }

  if (!/^1[3-9]\d{9}$/.test(resetForm.phone)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }

  ElMessage.success('验证码已发送');
  codeCountdown.value = CODE_COUNTDOWN;
  
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  
  countdownTimer = setInterval(() => {
    codeCountdown.value--;
    if (codeCountdown.value <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);
};

const handleResetPassword = async () => {
  if (!resetForm.phone || !resetForm.verifyCode || !resetForm.newPassword) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  if (resetForm.newPassword.length < 6) {
    ElMessage.warning('密码长度不能少于6位');
    return;
  }

  ElMessage.success('密码重置成功');
  showForgotPassword.value = false;
  Object.keys(resetForm).forEach(key => {
    resetForm[key] = '';
  });
};

const goToRegister = (role) => {
  showRegisterDialog.value = false;
  router.push({
    path: '/auth/enhanced-register',
    query: { role }
  });
};

onBeforeUnmount(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
});
</script>

<style>
:root {
  --primary-color: #0369A1;
  --primary-hover: #0ea5e9;
  --primary-dark: #01579B;
  --text-primary: #020617;
  --text-secondary: #334155;
  --text-tertiary: #64748b;
  --border-color: #E2E8F0;
  --bg-hover: #F8FAFC;
  --bg-primary: #F8FAFC;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s ease;
}
</style>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');

.modern-login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%);
  font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 15px;
  overflow-x: hidden;
}

.modern-login-container.has-form {
  align-items: stretch;
  padding: 0;
}

.login-wrapper {
  display: flex;
  width: 100%;
  max-width: 1600px;
  min-height: auto;
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  position: relative;
  margin: 15px 0;
}

.modern-login-container.has-form .login-wrapper {
  max-height: none;
  margin: 0;
  border-radius: 0;
}

.brand-section {
  flex: 1;
  background: linear-gradient(135deg, #0369A1 0%, #0F172A 100%);
  padding: 40px 70px;
  display: flex;
  align-items: center;
  position: relative;
  box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.1);
}

.modern-login-container.has-form .brand-section {
  flex: 0.85;
  padding: 35px 60px;
}

.brand-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.2) 0%, transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.15) 0%, transparent 45%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%);
  pointer-events: none;
}

.brand-section::after {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
  animation: shimmer 8s ease-in-out infinite;
  pointer-events: none;
}

@keyframes shimmer {
  0%, 100% {
    transform: translate(-10%, -10%) rotate(0deg);
    opacity: 0.3;
  }
  50% {
    transform: translate(10%, 10%) rotate(180deg);
    opacity: 0.6;
  }
}

.brand-content {
  width: 100%;
  color: white;
  z-index: 1;
  position: relative;
}

.brand-logo {
  margin-bottom: 28px;
}

.logo-icon {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  backdrop-filter: blur(20px);
  border: 2px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.5);
  transition: all var(--transition-normal);
}

.logo-icon:hover {
  transform: scale(1.08) rotate(5deg);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 0 0 4px rgba(255, 255, 255, 0.25);
}

.brand-name {
  font-size: 38px;
  font-weight: 700;
  margin: 0 0 6px 0;
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.25);
  letter-spacing: -0.5px;
  color: #ffffff;
}

.brand-tag {
  font-size: 13px;
  margin: 0;
  opacity: 0.95;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #f3e8ff;
}

.brand-slogan {
  padding: 20px 28px;
  background: linear-gradient(135deg, rgba(255,255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%);
  backdrop-filter: blur(15px);
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 28px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.brand-slogan h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  background: linear-gradient(135deg, #ffffff 0%, #E0F2FE 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-family: 'Lexend', sans-serif;
}

.brand-slogan p {
  font-size: 14px;
  margin: 0;
  opacity: 0.95;
  line-height: 1.5;
  font-weight: 400;
}

.features-showcase {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 28px;
}

.feature-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%);
  backdrop-filter: blur(15px);
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  gap: 14px;
  transition: all var(--transition-normal);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.feature-card:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.15) 100%);
  transform: translateX(6px) translateY(-2px);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  border-color: rgba(255, 255, 255, 0.4);
}

.feature-icon-wrapper {
  width: 52px;
  height: 52px;
  min-width: 52px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: transform var(--transition-fast);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.feature-card:hover .feature-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.25) 100%);
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

.feature-card:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.15) 100%);
  transform: translateX(8px) translateY(-3px);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
  border-color: rgba(255, 255, 255, 0.4);
}

.stats-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.feature-icon-wrapper {
  width: 60px;
  height: 60px;
  min-width: 60px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: transform var(--transition-fast);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.feature-card:hover .feature-icon-wrapper {
  transform: scale(1.12) rotate(5deg);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.25) 100%);
}

.feature-info h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.feature-info p {
  font-size: 13px;
  margin: 0;
  opacity: 0.9;
}

.stats-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stat-item {
  text-align: center;
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 3px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 12px;
  opacity: 0.9;
}

.stat-divider {
  width: 1px;
  height: 48px;
  background: rgba(255, 255, 255, 0.3);
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
  animation: float 25s infinite ease-in-out;
  will-change: transform, opacity;
}

.effect-1 {
  width: 240px;
  height: 240px;
  top: 8%;
  left: 5%;
  animation-delay: 0s;
}

.effect-2 {
  width: 180px;
  height: 180px;
  top: 55%;
  left: 85%;
  animation-delay: 8s;
}

.effect-3 {
  width: 120px;
  height: 120px;
  top: 80%;
  left: 20%;
  animation-delay: 16s;
}

.effect-4 {
  width: 160px;
  height: 160px;
  top: 15%;
  left: 75%;
  animation-delay: 24s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
    opacity: 0.06;
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
    opacity: 0.14;
  }
}

.login-section {
  width: 800px;
  background: white;
  padding: 50px 50px 40px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.modern-login-container.has-form .login-section {
  width: 600px;
  padding: 40px 50px;
  overflow-y: auto;
}

.login-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.modern-login-container.has-form .login-header {
  margin-bottom: 24px;
}

.login-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 10px 0;
}

.modern-login-container.has-form .login-title {
  font-size: 28px;
}

.login-subtitle {
  font-size: 15px;
  color: var(--text-tertiary);
  margin: 0;
}

.role-selection {
  flex: 1;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.role-grid .role-card:nth-last-child(2) {
  grid-column: span 2;
}

.role-card {
  background: white;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px 20px 20px;
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
  text-align: left;
  width: 100%;
  font-family: inherit;
  outline: none;
}

.role-card:hover {
  border-color: #0369A1;
  transform: translateY(-5px);
  box-shadow: 0 16px 40px rgba(3, 105, 161, 0.2);
}

.role-card:focus-visible {
  outline: 2px solid #0369A1;
  outline-offset: 2px;
}

.role-card.active {
  border-color: #0369A1;
  background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #BAE6FD 100%);
  box-shadow: 0 16px 48px rgba(3, 105, 161, 0.25);
}

.role-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #9d7dff 0%, #7b61ff 100%);
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(123, 97, 255, 0.3);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.role-icon-box {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: transform var(--transition-normal);
  position: relative;
}

.role-icon-box::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%);
  pointer-events: none;
}

.role-card:hover .role-icon-box,
.role-card:focus .role-icon-box {
  transform: scale(1.1);
}

.role-icon-box.resident {
  background: linear-gradient(135deg, #10b981 0%, #34d399 50%, #6ee7b7 100%);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
}

.role-icon-box.village_official {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%);
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.3);
}

.role-icon-box.township_official {
  background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%);
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
}

.role-icon-box.purchaser {
  background: linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #f9a8d4 100%);
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.3);
}

.role-icon-box.admin {
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
}

.role-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 6px 0;
  text-align: left;
}

.role-description {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  text-align: left;
  line-height: 1.5;
  min-height: 42px;
  font-weight: 400;
}

.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-start;
}

.role-tag {
  font-size: 11px;
  background: var(--bg-hover);
  color: var(--text-tertiary);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-normal);
  font-weight: 400;
}

.role-card.active .role-tag {
  background: linear-gradient(135deg, #e8f0ff 0%, #e0e7ff 100%);
  color: #7b61ff;
  font-weight: 500;
}

.login-form-section {
  flex: 1;
}

.role-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.modern-login-container.has-form .role-indicator {
  margin-bottom: 24px;
  padding-bottom: 14px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--text-tertiary);
}

.back-btn:hover {
  color: #7b61ff;
}

.back-btn:focus-visible {
  outline: 2px solid #7b61ff;
  outline-offset: 2px;
}

.role-tag-display {
  font-size: 14px;
  padding: 6px 16px;
  border-radius: var(--radius-sm);
  font-weight: 500;
}

.login-form {
  margin-bottom: 16px;
}

.modern-login-container.has-form .login-form {
  margin-bottom: 12px;
}

.custom-input :deep(.el-input__wrapper) {
  border-radius: var(--radius-md);
  padding: 12px 16px;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.custom-input :deep(.el-input__wrapper:hover) {
  box-shadow: var(--shadow-md);
}

.custom-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 3px rgba(123, 97, 255, 0.15);
}

.custom-select :deep(.el-input__wrapper) {
  border-radius: var(--radius-md);
  padding: 12px 16px;
}

.password-toggle {
  cursor: pointer;
  color: #c0c4cc;
  transition: color var(--transition-normal);
  background: none;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
}

.password-toggle:hover,
.password-toggle:focus {
  color: #7b61ff;
}

.password-toggle:focus-visible {
  outline: 2px solid #7b61ff;
  outline-offset: 2px;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.remember-check {
  color: var(--text-secondary);
}

.forgot-link {
  font-size: 14px;
}

.terms-check {
  width: 100%;
  padding: 8px 0;
}

.terms-check .el-checkbox__label {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.terms-link {
  font-size: 14px;
}

.dialog-content {
  max-height: 60vh;
  overflow-y: auto;
  padding: 10px 0;
}

.dialog-content h3 {
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}

.dialog-content h4 {
  margin: 20px 0 10px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.dialog-content p {
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.login-btn {
  width: 100%;
  height: 50px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #0369A1 0%, #0ea5e9 100%);
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-normal);
  font-family: 'Source Sans 3', sans-serif;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(3, 105, 161, 0.3);
}

.login-btn:focus-visible {
  outline: 2px solid #0369A1;
  outline-offset: 2px;
}

.form-footer {
  text-align: center;
  margin-top: 16px;
}

.footer-text {
  color: var(--text-tertiary);
  font-size: 14px;
}

.register-link {
  margin-left: 4px;
  font-size: 14px;
}

.security-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 10px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.modern-login-container.has-form .security-info {
  margin-top: 12px;
  padding: 10px;
}

.login-footer {
  margin-top: auto;
  padding-top: 24px;
  text-align: center;
  color: #c0c4cc;
  font-size: 13px;
  border-top: 1px solid #f0f0f0;
}

.modern-login-container.has-form .login-footer {
  padding-top: 20px;
  font-size: 12px;
}

.version-badge {
  margin-left: 8px;
  padding: 3px 10px;
  background: #f0f0f0;
  border-radius: 4px;
  font-size: 12px;
}

.register-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  padding: 20px 0;
}

.register-card {
  background: #f8f9fa;
  border-radius: var(--radius-lg);
  padding: 28px 20px;
  cursor: pointer;
  transition: all var(--transition-normal);
  text-align: center;
  border: 2px solid transparent;
  width: 100%;
  font-family: inherit;
  outline: none;
}

.register-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: #7b61ff;
}

.register-card:focus-visible {
  outline: 2px solid #7b61ff;
  outline-offset: 2px;
}

.register-icon {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-lg);
  margin: 0 auto 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.register-icon.resident {
  background: linear-gradient(135deg, var(--role-resident, #10b981), var(--role-resident-light, #34d399));
}

.register-icon.official {
  background: linear-gradient(135deg, var(--role-village-official, #f59e0b), var(--role-village-official-light, #fbbf24));
}

.register-icon.purchaser {
  background: linear-gradient(135deg, var(--role-purchaser, #ec4899), var(--role-purchaser-light, #f472b6));
}

.register-card h4 {
  margin: 14px 0 10px;
  font-size: 17px;
  color: var(--text-primary);
}

.register-card p {
  margin: 0;
  font-size: 14px;
  color: var(--text-tertiary);
}

@media (max-width: 1200px) {
  .login-wrapper {
    max-width: 1200px;
  }

  .brand-section {
    padding: 40px 55px;
  }

  .brand-name {
    font-size: 34px;
  }
}

@media (max-width: 1024px) {
  .login-wrapper {
    flex-direction: column;
    max-width: 800px;
    max-height: auto;
    margin: 0;
  }

  .brand-section {
    padding: 35px 45px;
    min-height: 280px;
  }

  .login-section {
    width: 100%;
    padding: 35px 45px 30px;
  }

  .modern-login-container.has-form .brand-section {
    min-height: 240px;
    padding: 30px 40px;
  }

  .modern-login-container.has-form .login-section {
    padding: 30px 40px;
  }

  .role-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }

  .role-grid .role-card:nth-last-child(2) {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .modern-login-container {
    padding: 10px;
  }

  .login-wrapper {
    border-radius: var(--radius-lg);
    max-width: 100%;
  }

  .login-section {
    padding: 30px 25px 25px;
    width: auto;
  }

  .modern-login-container.has-form .login-section {
    padding: 25px 20px;
  }

  .role-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .role-grid .role-card:nth-last-child(2) {
    grid-column: span 1;
  }

  .role-card {
    padding: 20px 16px;
  }

  .role-icon-box {
    width: 56px;
    height: 56px;
    margin: 0 auto 14px;
  }

  .role-icon-box .el-icon {
    font-size: 32px;
  }

  .role-title {
    font-size: 16px;
  }

  .role-description {
    font-size: 12px;
    min-height: 36px;
  }

  .register-options {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .brand-section {
    padding: 28px 25px;
  }

  .modern-login-container.has-form .brand-section {
    padding: 25px 22px;
    min-height: 240px;
  }

  .brand-logo {
    margin-bottom: 20px;
  }

  .logo-icon {
    width: 64px;
    height: 64px;
  }

  .brand-name {
    font-size: 28px;
  }

  .brand-slogan {
    margin-bottom: 20px;
    padding: 18px 20px;
  }

  .brand-slogan h2 {
    font-size: 20px;
  }

  .brand-slogan p {
    font-size: 13px;
  }

  .features-showcase {
    margin-bottom: 20px;
    gap: 12px;
  }

  .feature-icon-wrapper {
    width: 48px;
    height: 48px;
  }

  .feature-icon-wrapper .el-icon {
    font-size: 24px;
  }

  .stats-display {
    padding: 16px 20px;
  }

  .stat-value {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .modern-login-container {
    padding: 0;
  }
}

@media (max-width: 375px) {
  .modern-login-container {
    padding: 8px;
  }

  .login-wrapper {
    border-radius: var(--radius-sm);
  }

  .login-section {
    padding: 20px 12px;
  }

  .brand-name {
    font-size: 20px;
  }

  .login-title {
    font-size: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

@media (prefers-color-scheme: dark) {
  .modern-login-container {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  }

  .login-wrapper {
    background: #1f2937;
  }

  .login-section {
    background: #1f2937;
  }

  .login-title {
    color: #f3f4f6;
  }

  .login-subtitle {
    color: #9ca3af;
  }

  .role-title {
    color: #f3f4f6;
  }

  .role-description {
    color: #d1d5db;
  }

  .role-card {
    background: #2d3748;
    border-color: #4a5568;
  }

  .role-card:hover {
    background: #374151;
  }

  .security-info {
    background: #2d3748;
    color: #9ca3af;
  }

  .login-footer {
    color: #6b7280;
    border-top-color: #374151;
  }

  .register-card {
    background: #2d3748;
  }

  .register-card h4 {
    color: #f3f4f6;
  }

  .register-card p {
    color: #9ca3af;
  }
}
</style>
