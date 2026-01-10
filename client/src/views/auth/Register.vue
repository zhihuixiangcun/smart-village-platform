<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <h2>用户注册</h2>
        <p>创建您的智慧乡村平台账号</p>
      </div>

      <el-form ref="formRef" :model="formData" :rules="formRules" label-position="top" size="large">
        <el-form-item label="手机号码" prop="phone">
          <el-input
            v-model="formData.phone"
            placeholder="请输入手机号码"
            :prefix-icon="Phone"
            maxlength="11"
          />
        </el-form-item>

        <el-form-item label="验证码" prop="verifyCode">
          <div class="verify-code-input">
            <el-input
              v-model="formData.verifyCode"
              placeholder="请输入验证码"
              :prefix-icon="Lock"
              maxlength="6"
            />
            <el-button type="primary" :disabled="countdown > 0" @click="sendVerifyCode">
              {{ countdown > 0 ? `${countdown}s后重发` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="设置密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请设置8-20位密码"
            :prefix-icon="Lock"
            show-password
          />
          <div class="password-strength" v-if="formData.password">
            <div
              class="strength-bar"
              :style="{ width: `${passwordStrength}%` }"
              :class="strengthClass"
            ></div>
          </div>
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="formData.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item label="真实姓名" prop="realName">
          <el-input
            v-model="formData.realName"
            placeholder="请输入您的真实姓名"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item label="身份证号" prop="idCard">
          <el-input
            v-model="formData.idCard"
            placeholder="请输入身份证号码"
            :prefix-icon="Postcard"
            maxlength="18"
          />
        </el-form-item>

        <el-form-item label="所在村庄" prop="villageId">
          <el-select
            v-model="formData.villageId"
            placeholder="请选择所在村庄"
            :prefix-icon="OfficeBuilding"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="village in villageList"
              :key="village.id"
              :label="village.name"
              :value="village.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item prop="agreeTerms">
          <el-checkbox v-model="formData.agreeTerms">
            我已阅读并同意
            <el-link type="primary">《用户服务协议》</el-link>
            和
            <el-link type="primary">《隐私政策》</el-link>
          </el-checkbox>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="submitting"
            @click="handleSubmit"
            style="width: 100%"
          >
            {{ submitting ? '注册中...' : '立即注册' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="register-footer">
        <span>已有账号？</span>
        <el-link type="primary" @click="goToLogin">立即登录</el-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Phone, Lock, User, Postcard, OfficeBuilding } from '@element-plus/icons-vue';

const router = useRouter();
const formRef = ref(null);
const submitting = ref(false);
const countdown = ref(0);

const formData = reactive({
  phone: '',
  verifyCode: '',
  password: '',
  confirmPassword: '',
  realName: '',
  idCard: '',
  villageId: '',
  agreeTerms: false,
});

const villageList = ref([
  { id: '1', name: '幸福村' },
  { id: '2', name: '和平村' },
  { id: '3', name: '建设村' },
  { id: '4', name: '红旗村' },
  { id: '5', name: '先锋村' },
]);

const validatePhone = (rule, value, callback) => {
  if (!/^1[3-9]\d{9}$/.test(value)) {
    callback(new Error('请输入正确的手机号码'));
  } else {
    callback();
  }
};

const validatePassword = (rule, value, callback) => {
  if (value.length < 8 || value.length > 20) {
    callback(new Error('密码长度必须在8-20位之间'));
  } else if (!/[A-Z]/.test(value)) {
    callback(new Error('密码必须包含大写字母'));
  } else if (!/[a-z]/.test(value)) {
    callback(new Error('密码必须包含小写字母'));
  } else if (!/[0-9]/.test(value)) {
    callback(new Error('密码必须包含数字'));
  } else {
    callback();
  }
};

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== formData.password) {
    callback(new Error('两次输入的密码不一致'));
  } else {
    callback();
  }
};

const validateIdCard = (rule, value, callback) => {
  if (!/(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/.test(value)) {
    callback(new Error('请输入正确的身份证号码'));
  } else {
    callback();
  }
};

const formRules = {
  phone: [
    { required: true, message: '请输入手机号码', trigger: 'blur' },
    { validator: validatePhone, trigger: 'blur' },
  ],
  verifyCode: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
  password: [
    { required: true, message: '请设置密码', trigger: 'blur' },
    { validator: validatePassword, trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    { validator: validateIdCard, trigger: 'blur' },
  ],
  villageId: [{ required: true, message: '请选择所在村庄', trigger: 'change' }],
  agreeTerms: [{ required: true, message: '请同意用户协议', trigger: 'change' }],
};

const passwordStrength = computed(() => {
  const pwd = formData.password;
  let strength = 0;
  if (pwd.length >= 8) strength += 25;
  if (/[A-Z]/.test(pwd)) strength += 25;
  if (/[a-z]/.test(pwd)) strength += 25;
  if (/[0-9]/.test(pwd)) strength += 25;
  return strength;
});

const strengthClass = computed(() => {
  if (passwordStrength.value <= 25) return 'weak';
  if (passwordStrength.value <= 50) return 'fair';
  if (passwordStrength.value <= 75) return 'good';
  return 'strong';
});

async function sendVerifyCode() {
  if (!formData.phone) {
    ElMessage.warning('请先输入手机号码');
    return;
  }

  if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
    ElMessage.warning('请输入正确的手机号码');
    return;
  }

  countdown.value = 60;
  const timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(timer);
    }
  }, 1000);

  ElMessage.success('验证码已发送，请注意查收');
}

async function handleSubmit() {
  if (!formRef.value) return;

  await formRef.value.validate(async valid => {
    if (valid) {
      if (!formData.agreeTerms) {
        ElMessage.warning('请同意用户服务协议和隐私政策');
        return;
      }

      submitting.value = true;

      try {
        await new Promise(resolve => setTimeout(resolve, 1500));

        ElMessage.success('注册成功！');
        router.push('/auth/login');
      } catch (error) {
        ElMessage.error('注册失败，请重试');
      } finally {
        submitting.value = false;
      }
    }
  });
}

function goToLogin() {
  router.push('/auth/login');
}
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-card {
  width: 100%;
  max-width: 440px;
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.register-header h2 {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px;
}

.register-header p {
  color: #6b7280;
  margin: 0;
}

.verify-code-input {
  display: flex;
  gap: 12px;
}

.verify-code-input .el-input {
  flex: 1;
}

.verify-code-input .el-button {
  white-space: nowrap;
}

.password-strength {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  margin-top: 8px;
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

.register-footer {
  text-align: center;
  margin-top: 24px;
  color: #6b7280;
}

.register-footer .el-link {
  font-weight: 500;
}

@media (max-width: 480px) {
  .register-card {
    padding: 24px;
  }

  .register-header h2 {
    font-size: 24px;
  }
}
</style>
