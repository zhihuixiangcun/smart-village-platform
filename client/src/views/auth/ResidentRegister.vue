<template>
  <div class="resident-register-container">
    <div class="register-wrapper">
      <div class="brand-section">
        <div class="logo-wrapper">
          <img src="/village-icon.svg" alt="智慧乡村" class="logo" />
        </div>
        <h1 class="brand-title">村民注册</h1>
        <p class="brand-subtitle">欢迎使用智慧乡村平台</p>
      </div>

      <div class="register-section">
        <el-card class="register-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">村民注册</span>
              <el-button link type="primary" @click="$router.push('/auth/login')">
                已有账号？去登录
              </el-button>
            </div>
          </template>

          <el-form
            ref="registerFormRef"
            :model="registerForm"
            :rules="registerRules"
            label-position="top"
            size="large"
          >
            <el-form-item label="真实姓名" prop="name">
              <el-input v-model="registerForm.name" placeholder="请输入真实姓名" clearable />
            </el-form-item>

            <el-form-item label="手机号" prop="phone">
              <el-input
                v-model="registerForm.phone"
                placeholder="请输入11位手机号"
                maxlength="11"
                clearable
              />
            </el-form-item>

            <el-form-item label="身份证号" prop="idCard">
              <el-input
                v-model="registerForm.idCard"
                placeholder="请输入18位身份证号"
                maxlength="18"
                clearable
              />
            </el-form-item>

            <el-form-item label="所属村庄" prop="villageId">
              <el-select
                v-model="registerForm.villageId"
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

            <el-form-item label="家庭住址" prop="address">
              <el-input
                v-model="registerForm.address"
                type="textarea"
                :rows="3"
                placeholder="请输入详细家庭住址"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="设置密码" prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="请设置登录密码（6-20位）"
                show-password
                maxlength="20"
              />
            </el-form-item>

            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                v-model="registerForm.confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                show-password
                maxlength="20"
              />
            </el-form-item>

            <el-form-item label="验证码" prop="verifyCode">
              <div style="display: flex; gap: 10px; width: 100%">
                <el-input
                  v-model="registerForm.verifyCode"
                  placeholder="请输入短信验证码"
                  maxlength="6"
                />
                <el-button
                  :disabled="codeCountdown > 0"
                  @click="sendVerifyCode"
                  style="min-width: 120px"
                >
                  {{ codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码' }}
                </el-button>
              </div>
            </el-form-item>

            <el-form-item label prop="agreement">
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
        </el-card>
      </div>
    </div>

    <!-- 用户协议对话框 -->
    <el-dialog v-model="showTerms" title="用户协议" width="600px">
      <div class="terms-content">
        <h3>智慧乡村平台用户协议</h3>
        <p>欢迎使用智慧乡村平台！请您仔细阅读以下条款：</p>
        <h4>1. 用户注册</h4>
        <p>用户在注册时必须提供真实、准确的个人信息，并保证信息的及时更新。</p>
        <h4>2. 用户行为</h4>
        <p>用户在使用平台过程中应遵守国家法律法规，不得发布违法信息，不得从事违法活动。</p>
        <h4>3. 隐私保护</h4>
        <p>平台将依法保护用户的个人信息，未经用户同意不会向第三方泄露。</p>
        <h4>4. 免责条款</h4>
        <p>因不可抗力或政府行为导致的服务中断，平台不承担责任。</p>
        <h4>5. 协议修改</h4>
        <p>平台有权根据需要修改本协议，修改后的协议公布后即生效。</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="showTerms = false">我已阅读</el-button>
      </template>
    </el-dialog>

    <!-- 隐私政策对话框 -->
    <el-dialog v-model="showPrivacy" title="隐私政策" width="600px">
      <div class="privacy-content">
        <h3>智慧乡村平台隐私政策</h3>
        <p>我们重视您的隐私保护，本隐私政策说明我们如何收集、使用和保护您的个人信息：</p>
        <h4>1. 信息收集</h4>
        <p>我们收集您主动提供的信息，包括姓名、手机号、身份证号、住址等。</p>
        <h4>2. 信息使用</h4>
        <p>我们使用您的信息为您提供村务服务，改进服务质量，保障账号安全。</p>
        <h4>3. 信息保护</h4>
        <p>我们采取技术措施保护您的信息安全，防止信息泄露、丢失或被盗用。</p>
        <h4>4. 信息共享</h4>
        <p>未经您同意，我们不会向第三方共享您的个人信息，法律法规要求的除外。</p>
        <h4>5. 权利行使</h4>
        <p>您有权查询、更正、删除您的个人信息，可通过平台客服或管理员处理。</p>
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
import villageUserApi from '@/api/villageUser';

const router = useRouter();

// 响应式数据
const loading = ref(false);
const showTerms = ref(false);
const showPrivacy = ref(false);
const codeCountdown = ref(0);

// 表单引用
const registerFormRef = ref(null);

// 村庄列表
const villages = ref([]);

// 注册表单
const registerForm = reactive({
  name: '',
  phone: '',
  idCard: '',
  villageId: '',
  address: '',
  password: '',
  confirmPassword: '',
  verifyCode: '',
  agreement: false,
});

// 密码确认验证
const validateConfirmPassword = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码'));
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'));
  } else {
    callback();
  }
};

// 表单验证规则
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
    {
      pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
      message: '请输入正确的身份证号',
      trigger: 'blur',
    },
  ],
  villageId: [{ required: true, message: '请选择所属村庄', trigger: 'change' }],
  address: [
    { required: true, message: '请输入家庭住址', trigger: 'blur' },
    { min: 5, max: 200, message: '住址长度在5-200个字符', trigger: 'blur' },
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

// 计算属性
const canSubmit = computed(() => {
  return (
    registerForm.name &&
    registerForm.phone &&
    registerForm.idCard &&
    registerForm.villageId &&
    registerForm.address &&
    registerForm.password &&
    registerForm.confirmPassword &&
    registerForm.verifyCode &&
    registerForm.agreement
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

const sendVerifyCode = async () => {
  if (!registerForm.phone) {
    ElMessage.warning('请先输入手机号');
    return;
  }

  if (!/^1[3-9]\d{9}$/.test(registerForm.phone)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }

  try {
    await villageUserApi.sendVerifyCode(registerForm.phone);
    ElMessage.success('验证码已发送');

    // 开始倒计时
    codeCountdown.value = 60;
    const timer = setInterval(() => {
      codeCountdown.value--;
      if (codeCountdown.value <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  } catch (error) {
    console.error('发送验证码失败:', error);
    ElMessage.error(error.response?.data?.message || '发送验证码失败');
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
    const { confirmPassword, verifyCode, agreement, ...registerData } = registerForm;
    registerData.role = 'resident';

    await villageUserApi.register(registerData);

    ElMessage.success('注册成功！请使用手机号和密码登录');

    // 延迟跳转到登录页面
    setTimeout(() => {
      router.push('/auth/login');
    }, 1500);
  } catch (error) {
    console.error('注册失败:', error);
    ElMessage.error(error.response?.data?.message || '注册失败，请稍后重试');
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
.resident-register-container {
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
  max-width: 1000px;
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
  align-items: center;
  color: white;
  text-align: center;
}

.logo-wrapper {
  margin-bottom: 30px;
}

.logo {
  width: 100px;
  height: 100px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.brand-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 12px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.brand-subtitle {
  font-size: 18px;
  margin: 0;
  opacity: 0.9;
}

.register-section {
  flex: 1.5;
  padding: 60px;
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
  color: #333;
}

.submit-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  transition: all 0.3s ease;
}

.submit-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.submit-button:disabled {
  background: #e0e0e0;
  box-shadow: none;
  transform: none;
}

.terms-content,
.privacy-content {
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.8;
}

.terms-content h3,
.privacy-content h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #333;
}

.terms-content h4,
.privacy-content h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 16px 0 8px 0;
  color: #555;
}

.terms-content p,
.privacy-content p {
  margin: 8px 0;
  color: #666;
  text-indent: 2em;
}

@media (max-width: 768px) {
  .register-wrapper {
    flex-direction: column;
    gap: 0;
  }

  .brand-section {
    padding: 40px 20px;
  }

  .register-section {
    padding: 40px 20px;
  }
}
</style>
