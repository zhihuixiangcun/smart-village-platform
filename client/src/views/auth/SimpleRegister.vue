<template>
  <div class="simple-register-container">
    <div class="register-wrapper">
      <!-- 左侧品牌区 -->
      <div class="brand-section">
        <div class="brand-content">
          <h1 class="brand-title">智慧乡村</h1>
          <p class="brand-subtitle">Smart Village Platform</p>
          <div class="brand-features">
            <div class="feature">
              <span class="feature-icon">📄</span>
              <span>村务办理</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🔍</span>
              <span>信息查询</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🤝</span>
              <span>邻里互助</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🏅️</span>
              <span>补贴申请</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧表单区 -->
      <div class="form-section">
        <div class="form-wrapper">
          <h1 class="form-title">村民注册</h1>
          <p class="form-subtitle">加入智慧乡村，享受便民服务</p>

          <el-form
            ref="formRef"
            :model="formData"
            :rules="rules"
            label-position="top"
            size="large"
            class="register-form"
            @submit.prevent="handleSubmit"
          >
            <el-form-item label="真实姓名" prop="name">
              <el-input
                v-model="formData.name"
                placeholder="请输入真实姓名"
                clearable
                @input="checkCanSubmit"
              />
            </el-form-item>

            <el-form-item label="手机号码" prop="phone">
              <el-input
                v-model="formData.phone"
                placeholder="请输入11位手机号"
                maxlength="11"
                clearable
                @input="checkCanSubmit"
              />
            </el-form-item>

            <el-form-item label="身份证号" prop="idCard">
              <el-input
                v-model="formData.idCard"
                placeholder="请输入18位身份证号"
                maxlength="18"
                clearable
                @input="checkCanSubmit"
              />
            </el-form-item>

            <el-form-item label="性别" prop="gender">
              <el-select
                v-model="formData.gender"
                placeholder="请选择性别"
                style="width: 100%"
                clearable
                @change="checkCanSubmit"
              >
                <el-option label="男" value="male" />
                <el-option label="女" value="female" />
              </el-select>
            </el-form-item>

            <el-form-item label="所属村庄" prop="villageId">
              <el-select
                v-model="formData.villageId"
                placeholder="请选择所属村庄"
                style="width: 100%"
                filterable
                clearable
                @change="checkCanSubmit"
              >
                <el-option
                  v-for="village in villages"
                  :key="village.id"
                  :label="village.name"
                  :value="village.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="详细住址" prop="address">
              <el-input
                v-model="formData.address"
                type="textarea"
                :rows="3"
                placeholder="请输入详细家庭住址"
                maxlength="200"
                show-word-limit
                @input="checkCanSubmit"
              />
            </el-form-item>

            <el-form-item label="设置密码" prop="password">
              <el-input
                v-model="formData.password"
                type="password"
                placeholder="请设置6-20位密码"
                show-password
                maxlength="20"
                @input="checkCanSubmit"
              />
            </el-form-item>

            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                v-model="formData.confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                show-password
                maxlength="20"
                @input="checkCanSubmit"
              />
            </el-form-item>

            <el-form-item label="手机验证码" prop="verifyCode">
              <div class="verify-code-wrapper">
                <el-input
                  v-model="formData.verifyCode"
                  placeholder="请输入6位验证码"
                  maxlength="6"
                  clearable
                  @input="checkCanSubmit"
                />
                <el-button
                  :disabled="!canSendCode || countdown > 0"
                  @click="sendVerifyCode"
                >
                  {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                </el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-checkbox v-model="formData.agreement" @change="checkCanSubmit">
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
                class="submit-button"
                @click="handleSubmit"
              >
                {{ loading ? '注册中...' : '立即注册' }}
              </el-button>
            </el-form-item>

            <div class="form-footer">
              已有账号？
              <el-link type="primary" @click="goToLogin">立即登录</el-link>
            </div>
          </el-form>

          <div class="debug-section" v-if="showDebug">
            <h3>🔍 调试信息</h3>
            <p><strong>表单数据:</strong></p>
            <pre>{{ JSON.stringify(formData, null, 2) }}</pre>
            <p><strong>表单验证:</strong></p>
            <pre>{{ canSubmit ? '✅ 可以提交' : '❌ 不能提交' }}</pre>
            <el-button @click="showDebug = false">关闭调试</el-button>
          </div>

          <el-button class="debug-toggle" @click="showDebug = true" v-if="!showDebug">
            🔍 显示调试信息
          </el-button>
        </div>
      </div>
    </div>

    <!-- 用户协议对话框 -->
    <el-dialog
      v-model="showTerms"
      title="用户服务协议"
      width="600px"
    >
      <TermsContent />
      <template #footer>
        <el-button type="primary" @click="showTerms = false">我已阅读</el-button>
      </template>
    </el-dialog>

    <!-- 隐私政策对话框 -->
    <el-dialog
      v-model="showPrivacy"
      title="隐私政策"
      width="600px"
    >
      <PrivacyContent />
      <template #footer>
        <el-button type="primary" @click="showPrivacy = false">我已阅读</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import TermsContent from './TermsContent.vue';
import PrivacyContent from './PrivacyContent.vue';

const router = useRouter();
const formRef = ref(null);
const loading = ref(false);
const showTerms = ref(false);
const showPrivacy = ref(false);
const showDebug = ref(false);
const countdown = ref(0);
const canSubmit = ref(false);

const formData = reactive({
  name: '',
  phone: '',
  idCard: '',
  gender: '',
  villageId: '',
  address: '',
  password: '',
  confirmPassword: '',
  verifyCode: '',
  agreement: false
});

const villages = [
  { id: 'v001', name: '贵州省贞丰县鲁贡镇么扒村' },
  { id: 'v002', name: '贵州省贞丰县鲁贡镇弄洋村' },
  { id: 'v003', name: '贵州省望谟县乐元镇乐元村' },
  { id: 'v004', name: '贵州省兴义市顶效镇绿化村' },
  { id: 'v005', name: '贵州省贞丰县白层镇兴龙村' }
];

const canSendCode = computed(() => {
  return /^1[3-9]\d{9}$/.test(formData.phone) && countdown.value === 0;
});

const validateConfirmPassword = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码'));
  } else if (value !== formData.password) {
    callback(new Error('两次输入的密码不一致'));
  } else {
    callback();
  }
};

const rules = {
  name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在2-20个字符', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号', trigger: 'blur' }
  ],
  idCard: [
    { required: true, message: '请输入身份证号', trigger: 'blur' },
    {
      pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
      message: '请输入正确的身份证号',
      trigger: 'blur'
    }
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' }
  ],
  villageId: [
    { required: true, message: '请选择所属村庄', trigger: 'change' }
  ],
  address: [
    { required: true, message: '请输入家庭住址', trigger: 'blur' },
    { min: 5, max: 200, message: '住址长度在5-200个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请设置密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在6-20个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
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
};

const checkCanSubmit = () => {
  canSubmit.value = (
    formData.name &&
    formData.phone &&
    formData.idCard &&
    formData.gender &&
    formData.villageId &&
    formData.address &&
    formData.password &&
    formData.confirmPassword &&
    formData.verifyCode &&
    formData.agreement
  );
};

const sendVerifyCode = async () => {
  if (!formData.phone) {
    ElMessage.warning('请先输入手机号');
    return;
  }

  if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }

  try {
    ElMessage.success('验证码已发送');
    countdown.value = 60;
    const timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  } catch (error) {
    console.error('发送验证码失败:', error);
    ElMessage.error('发送验证码失败');
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
  } catch (error) {
    return;
  }

  loading.value = true;
  try {
    // 这里模拟注册成功
    await new Promise(resolve => setTimeout(resolve, 1500));
    ElMessage.success('注册成功！请使用手机号和密码登录');

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

const goToLogin = () => {
  router.push('/auth/login');
};
</script>

<style scoped>
.simple-register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  padding: 20px;
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
}

.brand-section {
  flex: 1;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  padding: 40px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-content {
  text-align: center;
}

.brand-title {
  font-size: 48px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.brand-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0 0 40px 0;
}

.brand-features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.feature-icon {
  font-size: 28px;
}

.form-section {
  flex: 1.5;
  padding: 40px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-wrapper {
  width: 100%;
  max-width: 600px;
}

.form-title {
  font-size: 36px;
  font-weight: 700;
  color: #1f2937;
  text-align: center;
  margin: 0 0 12px 0;
}

.form-subtitle {
  font-size: 14px;
  color: #6b7280;
  text-align: center;
  margin: 0 0 40px 0;
}

.register-form {
  margin-bottom: 20px;
}

.verify-code-wrapper {
  display: flex;
  gap: 12px;
}

.verify-code-wrapper .el-input {
  flex: 1;
}

.submit-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  border-radius: 8px;
  color: white;
  transition: all 0.3s;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(16, 185, 129, 0.3);
}

.form-footer {
  text-align: center;
  margin-top: 20px;
  color: #6b7280;
  font-size: 14px;
}

.debug-section {
  margin-top: 30px;
  padding: 20px;
  background: #fef3c7;
  border-radius: 8px;
  border: 1px solid #fde68a;
}

.debug-section h3 {
  margin: 0 0 15px 0;
  color: #92400e;
  font-size: 18px;
}

.debug-section pre {
  background: white;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 10px 0;
}

.debug-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

@media (max-width: 1024px) {
  .register-wrapper {
    flex-direction: column;
  }

  .brand-section {
    padding: 30px;
  }

  .form-section {
    padding: 30px;
  }
}

@media (max-width: 640px) {
  .simple-register-container {
    padding: 10px;
  }

  .register-wrapper {
    min-height: 600px;
  }

  .brand-features {
    grid-template-columns: 1fr;
  }
}
</style>
