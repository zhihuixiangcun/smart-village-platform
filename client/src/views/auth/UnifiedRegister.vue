<template>
  <div class="unified-register-container">
    <div class="register-wrapper">
      <div class="brand-section">
        <div class="logo-wrapper">
          <img src="/village-icon.svg" alt="智慧乡村" class="logo" />
        </div>
        <h1 class="brand-title">{{ roleConfig[currentRole]?.title || '用户注册' }}</h1>
        <p class="brand-subtitle">{{ roleConfig[currentRole]?.subtitle || '欢迎加入智慧乡村平台' }}</p>

        <div class="role-selector" v-if="!currentRole">
          <h3 class="selector-title">选择注册身份</h3>
          <div class="role-grid">
            <div
              v-for="role in availableRoles"
              :key="role.value"
              class="role-item"
              :class="role.value"
              @click="selectRole(role.value)"
            >
              <div class="role-icon" :style="{ background: role.gradient }">
                <el-icon :size="32"><component :is="role.icon" /></el-icon>
              </div>
              <span class="role-name">{{ role.label }}</span>
              <span class="role-desc">{{ role.shortDesc }}</span>
            </div>
          </div>
        </div>

        <div class="role-info" v-else>
          <el-button link type="primary" @click="currentRole = null" class="back-btn">
            <el-icon><ArrowLeft /></el-icon>
            返回选择
          </el-button>
          <div class="features-list">
            <div v-for="feature in roleConfig[currentRole]?.features" :key="feature" class="feature-item">
              <el-icon><Check /></el-icon>
              <span>{{ feature }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="register-section">
        <el-card class="register-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">{{ roleConfig[currentRole]?.formTitle || '填写注册信息' }}</span>
              <el-tag :type="roleConfig[currentRole]?.tagType" size="small">{{ roleConfig[currentRole]?.label }}</el-tag>
            </div>
          </template>

          <el-form
            ref="registerFormRef"
            :model="registerForm"
            :rules="registerRules"
            label-position="top"
            size="large"
          >
            <el-row :gutter="20">
              <el-col :span="12" v-if="showField('name')">
                <el-form-item label="真实姓名" prop="name">
                  <el-input v-model="registerForm.name" placeholder="请输入真实姓名" clearable>
                    <template #prefix><el-icon><User /></el-icon></template>
                  </el-input>
                </el-form-item>
              </el-col>

              <el-col :span="12" v-if="showField('phone')">
                <el-form-item label="手机号" prop="phone">
                  <el-input v-model="registerForm.phone" placeholder="请输入11位手机号" maxlength="11" clearable>
                    <template #prefix><el-icon><Phone /></el-icon></template>
                  </el-input>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12" v-if="showField('idCard')">
                <el-form-item label="身份证号" prop="idCard">
                  <el-input v-model="registerForm.idCard" placeholder="请输入身份证号" maxlength="18" clearable>
                    <template #prefix><el-icon><Postcard /></el-icon></template>
                  </el-input>
                </el-form-item>
              </el-col>

              <el-col :span="12" v-if="showField('email')">
                <el-form-item label="电子邮箱" prop="email">
                  <el-input v-model="registerForm.email" placeholder="请输入电子邮箱" clearable>
                    <template #prefix><el-icon><Message /></el-icon></template>
                  </el-input>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12" v-if="showField('villageId')">
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
              </el-col>

              <el-col :span="12" v-if="showField('gender')">
                <el-form-item label="性别" prop="gender">
                  <el-select v-model="registerForm.gender" placeholder="请选择性别" style="width: 100%" clearable>
                    <el-option label="男" value="男" />
                    <el-option label="女" value="女" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12" v-if="showField('position')">
                <el-form-item label="申请职务" prop="position">
                  <el-select v-model="registerForm.position" placeholder="请选择职务" style="width: 100%" clearable>
                    <el-option v-for="pos in positionOptions[currentRole]" :key="pos" :label="pos" :value="pos" />
                  </el-select>
                </el-form-item>
              </el-col>

              <el-col :span="12" v-if="showField('department')">
                <el-form-item label="所属部门" prop="department">
                  <el-input v-model="registerForm.department" placeholder="请输入部门名称" clearable />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12" v-if="showField('companyName')">
                <el-form-item label="公司名称" prop="companyName">
                  <el-input v-model="registerForm.companyName" placeholder="请输入公司/组织名称" clearable>
                    <template #prefix><el-icon><OfficeBuilding /></el-icon></template>
                  </el-input>
                </el-form-item>
              </el-col>

              <el-col :span="12" v-if="showField('businessLicense')">
                <el-form-item label="营业执照号" prop="businessLicense">
                  <el-input v-model="registerForm.businessLicense" placeholder="请输入营业执照注册号" clearable />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item v-if="showField('address')" label="详细地址" prop="address">
              <el-input
                v-model="registerForm.address"
                type="textarea"
                :rows="2"
                placeholder="请输入详细地址"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>

            <el-form-item v-if="showField('reason')" label="申请理由" prop="reason">
              <el-input
                v-model="registerForm.reason"
                type="textarea"
                :rows="4"
                :placeholder="getReasonPlaceholder()"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>

            <el-form-item v-if="showField('experience')" label="工作经验" prop="experience">
              <el-input
                v-model="registerForm.experience"
                type="textarea"
                :rows="3"
                placeholder="请简述相关工作经验"
                maxlength="300"
                show-word-limit
              />
            </el-form-item>

            <el-form-item v-if="showField('skills')" label="个人特长" prop="skills">
              <el-checkbox-group v-model="registerForm.skills">
                <el-checkbox v-for="skill in skillOptions" :key="skill" :label="skill">{{ skill }}</el-checkbox>
              </el-checkbox-group>
            </el-form-item>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="设置密码" prop="password">
                  <el-input
                    v-model="registerForm.password"
                    type="password"
                    placeholder="6-20位密码"
                    show-password
                    maxlength="20"
                  >
                    <template #prefix><el-icon><Lock /></el-icon></template>
                  </el-input>
                </el-form-item>
              </el-col>

              <el-col :span="12">
                <el-form-item label="确认密码" prop="confirmPassword">
                  <el-input
                    v-model="registerForm.confirmPassword"
                    type="password"
                    placeholder="再次输入密码"
                    show-password
                    maxlength="20"
                  >
                    <template #prefix><el-icon><Lock /></el-icon></template>
                  </el-input>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item v-if="showField('verifyCode')" label="验证码" prop="verifyCode">
              <div style="display: flex; gap: 10px; width: 100%">
                <el-input v-model="registerForm.verifyCode" placeholder="请输入验证码" maxlength="6" style="flex: 1" />
                <el-button :disabled="codeCountdown > 0" @click="sendVerifyCode" style="min-width: 120px">
                  {{ codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码' }}
                </el-button>
              </div>
            </el-form-item>

            <el-form-item v-if="showField('agreement')">
              <el-checkbox v-model="registerForm.agreement">
                我已阅读并同意
                <el-link type="primary" @click="showTerms = true">《用户协议》</el-link>
                和
                <el-link type="primary" @click="showPrivacy = true">《隐私政策》</el-link>
              </el-checkbox>
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :loading="loading"
                :disabled="!canSubmit"
                class="submit-button"
                @click="handleRegister"
              >
                {{ loading ? '注册中...' : '立即注册' }}
              </el-button>
            </el-form-item>
          </el-form>

          <div class="login-link">
            已有账号？<el-link type="primary" @click="goToLogin">立即登录</el-link>
          </div>
        </el-card>
      </div>
    </div>

    <el-dialog v-model="showTerms" title="用户协议" width="600px">
      <div class="dialog-content">
        <h3>智慧乡村平台用户协议</h3>
        <p>欢迎使用智慧乡村平台！请您仔细阅读以下条款：</p>
        <h4>1. 用户注册</h4>
        <p>用户在注册时必须提供真实、准确的个人信息，并保证信息的及时更新。</p>
        <h4>2. 用户行为</h4>
        <p>用户在使用平台过程中应遵守国家法律法规，不得发布违法信息。</p>
        <h4>3. 隐私保护</h4>
        <p>平台将依法保护用户的个人信息，未经用户同意不会向第三方泄露。</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="showTerms = false">我已阅读</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showPrivacy" title="隐私政策" width="600px">
      <div class="dialog-content">
        <h3>智慧乡村平台隐私政策</h3>
        <p>我们重视您的隐私保护，本隐私政策说明我们如何收集、使用和保护您的个人信息。</p>
        <h4>1. 信息收集</h4>
        <p>我们收集您主动提供的信息，包括姓名、手机号、身份证号、住址等。</p>
        <h4>2. 信息使用</h4>
        <p>我们使用您的信息为您提供村务服务，改进服务质量。</p>
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
  Check,
} from '@element-plus/icons-vue';
import villageUserApi from '@/api/villageUser';

const router = useRouter();

const loading = ref(false);
const showTerms = ref(false);
const showPrivacy = ref(false);
const codeCountdown = ref(0);
const currentRole = ref(null);
const registerFormRef = ref(null);
const villages = ref([]);

const registerForm = reactive({
  name: '',
  phone: '',
  idCard: '',
  email: '',
  villageId: '',
  gender: '',
  position: '',
  department: '',
  companyName: '',
  businessLicense: '',
  address: '',
  reason: '',
  experience: '',
  skills: [],
  password: '',
  confirmPassword: '',
  verifyCode: '',
  agreement: false,
});

const roleConfig = {
  resident: {
    label: '村民',
    title: '村民注册',
    subtitle: '加入智慧乡村，享受便民服务',
    formTitle: '村民信息登记',
    tagType: 'success',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
    icon: 'UserFilled',
    shortDesc: '村务办理',
    features: ['村务办理', '信息查询', '邻里互助', '补贴申请'],
  },
  village_official: {
    label: '村干部',
    title: '村干部申请',
    subtitle: '申请成为村干部，为村民服务',
    formTitle: '村干部申请',
    tagType: 'warning',
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    icon: 'OfficeBuilding',
    shortDesc: '村务管理',
    features: ['村务管理', '资料收集', '值班安排', '数据统计'],
  },
  purchaser: {
    label: '采购商',
    title: '采购商入驻',
    subtitle: '入驻采购平台，对接优质农产品',
    formTitle: '采购商信息',
    tagType: 'danger',
    gradient: 'linear-gradient(135deg, #ec4899, #f472b6)',
    icon: 'ShoppingCart',
    shortDesc: '产品采购',
    features: ['产品浏览', '在线下单', '订单管理', '供应商对接'],
  },
  admin: {
    label: '管理员',
    title: '管理员注册',
    subtitle: '申请系统管理权限',
    formTitle: '管理员信息',
    tagType: 'info',
    gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    icon: 'Setting',
    shortDesc: '系统管理',
    features: ['系统配置', '用户管理', '权限控制', '数据监控'],
  },
};

const availableRoles = [
  { value: 'resident', ...roleConfig.resident },
  { value: 'village_official', ...roleConfig.village_official },
  { value: 'purchaser', ...roleConfig.purchaser },
  { value: 'admin', ...roleConfig.admin },
];

const positionOptions = {
  village_official: ['村书记', '村主任', '副主任', '会计', '村委成员', '工作人员'],
  admin: ['系统管理员', '数据管理员', '运营管理员'],
};

const skillOptions = ['财务管理', '文书写作', '电脑操作', '沟通协调', '组织管理', '农业生产', '其他'];

const roleFields = {
  resident: ['name', 'phone', 'idCard', 'villageId', 'gender', 'address', 'password', 'confirmPassword', 'verifyCode', 'agreement'],
  village_official: ['name', 'phone', 'idCard', 'villageId', 'position', 'department', 'address', 'reason', 'experience', 'skills', 'password', 'confirmPassword', 'verifyCode', 'agreement'],
  purchaser: ['name', 'phone', 'email', 'companyName', 'businessLicense', 'villageId', 'address', 'password', 'confirmPassword', 'verifyCode', 'agreement'],
  admin: ['name', 'phone', 'idCard', 'email', 'department', 'reason', 'password', 'confirmPassword', 'verifyCode', 'agreement'],
};

const showField = field => {
  return roleFields[currentRole.value]?.includes(field) || false;
};

const getReasonPlaceholder = () => {
  if (currentRole.value === 'village_official') {
    return '请详细说明申请村干部职务的理由和计划（至少50字）';
  }
  if (currentRole.value === 'admin') {
    return '请说明申请系统管理权限的理由和胜任能力';
  }
  return '请输入申请理由';
};

const validateConfirmPassword = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码'));
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'));
  } else {
    callback();
  }
};

const registerRules = reactive({
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
    { pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/, message: '请输入正确的身份证号', trigger: 'blur' },
  ],
  email: [
    { type: 'email', message: '请输入正确的电子邮箱', trigger: 'blur' },
  ],
  villageId: [{ required: true, message: '请选择所属村庄', trigger: 'change' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  position: [{ required: true, message: '请选择职务', trigger: 'change' }],
  department: [{ required: true, message: '请输入部门', trigger: 'blur' }],
  companyName: [{ required: true, message: '请输入公司名称', trigger: 'blur' }],
  businessLicense: [{ required: true, message: '请输入营业执照号', trigger: 'blur' }],
  address: [
    { required: true, message: '请输入地址', trigger: 'blur' },
    { min: 5, message: '地址长度至少5个字符', trigger: 'blur' },
  ],
  reason: [
    { required: true, message: '请输入申请理由', trigger: 'blur' },
    { min: 20, message: '申请理由至少20个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请设置密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在6-20个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
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

const canSubmit = computed(() => {
  const required = roleFields[currentRole.value] || [];
  return required.every(field => {
    if (field === 'agreement') return registerForm.agreement;
    if (field === 'skills') return registerForm.skills.length > 0;
    return registerForm[field];
  });
});

const selectRole = role => {
  currentRole.value = role;
  registerForm.role = role;
};

const loadVillages = async () => {
  try {
    villages.value = [
      { id: '1', name: '幸福村' },
      { id: '2', name: '民主村' },
      { id: '3', name: '文明村' },
    ];
  } catch (error) {
    console.error('获取村庄列表失败:', error);
  }
};

const sendVerifyCode = async () => {
  if (!registerForm.phone) {
    ElMessage.warning('请先输入手机号');
    return;
  }

  try {
    ElMessage.success('验证码已发送');
    codeCountdown.value = 60;
    const timer = setInterval(() => {
      codeCountdown.value--;
      if (codeCountdown.value <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  } catch (error) {
    ElMessage.error('发送验证码失败');
  }
};

const handleRegister = async () => {
  if (!registerFormRef.value) return;

  try {
    await registerFormRef.value.validate();
  } catch (error) {
    return;
  }

  loading.value = true;
  try {
    const { confirmPassword, verifyCode, agreement, ...data } = registerForm;
    await villageUserApi.register(data);
    ElMessage.success('注册成功！请登录');
    setTimeout(() => {
      router.push('/auth/login');
    }, 1500);
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '注册失败');
  } finally {
    loading.value = false;
  }
};

const goToLogin = () => {
  router.push('/auth/login');
};

onMounted(() => {
  loadVillages();
});
</script>

<style scoped>
.unified-register-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.register-wrapper {
  display: flex;
  gap: 60px;
  max-width: 1200px;
  width: 100%;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.brand-section {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: white;
}

.logo-wrapper {
  margin-bottom: 20px;
}

.logo {
  width: 80px;
  height: 80px;
  border-radius: 20px;
}

.brand-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 12px 0;
}

.brand-subtitle {
  font-size: 16px;
  margin: 0;
  opacity: 0.9;
}

.selector-title {
  font-size: 20px;
  margin: 40px 0 24px 0;
  text-align: center;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.role-item {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.role-item:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-3px);
}

.role-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.role-name {
  display: block;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.role-desc {
  display: block;
  font-size: 12px;
  opacity: 0.8;
}

.back-btn {
  color: white;
  margin-bottom: 24px;
}

.features-list {
  margin-top: 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
}

.register-section {
  flex: 1.2;
  padding: 40px;
}

.register-card {
  box-shadow: none;
  border: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 20px;
  font-weight: 600;
}

.submit-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
}

.submit-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.login-link {
  text-align: center;
  margin-top: 20px;
  color: #666;
}

.dialog-content {
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.8;
}

.dialog-content h3 {
  font-size: 18px;
  margin: 0 0 16px 0;
}

.dialog-content h4 {
  font-size: 16px;
  margin: 16px 0 8px 0;
}

.dialog-content p {
  margin: 8px 0;
  color: #666;
}

@media (max-width: 1024px) {
  .register-wrapper {
    flex-direction: column;
    gap: 0;
  }

  .brand-section {
    padding: 40px 20px;
  }

  .role-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .register-section {
    padding: 40px 20px;
  }
}
</style>
