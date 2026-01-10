/**
 * LoginOptimized.vue API集成补丁
 *
 * 此文件展示了如何将LoginOptimized.vue中的模拟数据替换为真实API调用
 *
 * 使用方法：
 * 1. 在LoginOptimized.vue中导入增强的API模块
 * 2. 替换对应的模拟数据处理函数
 */

// ========== 第一步：导入API模块 ==========
// 在 <script setup> 部分添加以下导入

import authApi, { AuthService } from '@/api/authEnhanced';
import { validatePhone, validateIdCard, validatePassword } from '@/api/authEnhanced';


// ========== 第二步：替换登录处理函数 ==========
// 原来的 handleLogin 函数（使用模拟数据）
/*
const handleLogin = async () => {
  if (!loginFormRef.value) return;

  try {
    await loginFormRef.value.validate();
    loading.value = true;

    // 调用登录API
    const response = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        loginMode.value === 'password'
          ? {
              username: loginForm.username,
              password: loginForm.password,
              role: loginForm.role,
            }
          : {
              phone: loginForm.phone,
              code: loginForm.verifyCode,
            }
      ),
    });

    const data = await response.json();

    if (!data.success) {
      ElMessage.error(data.message || '登录失败，请检查账号密码');
      return;
    }

    // 保存用户信息
    userStore.setToken(data.data.token);
    userStore.setUserInfo(data.data.user);
    userStore.setPermissions(data.data.user.permissions || ['*']);
    userStore.setRoles([data.data.user.role]);

    ElMessage.success(`欢迎回来，${data.data.user.name || data.data.user.username}！`);

    // 跳转
    const redirect = route.query.redirect as string || '/dashboard';
    setTimeout(() => router.replace(redirect), 500);
  } catch (error) {
    console.error('登录失败:', error);
    ElMessage.error('网络异常，请稍后重试');
  } finally {
    loading.value = false;
  }
};
*/

// 新的 handleLogin 函数（使用真实API）
const handleLogin = async () => {
  if (!loginFormRef.value) return;

  try {
    // 表单验证
    await loginFormRef.value.validate();

    loading.value = true;

    let response;

    // 根据登录模式调用不同的API
    if (loginMode.value === 'password') {
      // 账号密码登录
      response = await authApi.loginByPassword({
        username: loginForm.username,
        password: loginForm.password,
        role: loginForm.role,
        rememberMe: rememberMe.value,
      });
    } else {
      // 手机验证码登录
      response = await authApi.loginByCode({
        phone: loginForm.phone,
        code: loginForm.verifyCode,
        role: loginForm.role,
      });
    }

    // 检查响应
    if (response.success && response.data) {
      const { token, user } = response.data;

      // 保存用户信息到store
      userStore.setToken(token);
      userStore.setUserInfo(user);
      userStore.setPermissions(user.permissions || ['*']);
      userStore.setRoles([user.role]);

      // 记住登录状态
      if (rememberMe.value) {
        localStorage.setItem('remember_login', 'true');
        localStorage.setItem('last_username', loginForm.username);
      } else {
        localStorage.removeItem('remember_login');
        localStorage.removeItem('last_username');
      }

      ElMessage.success(`欢迎回来，${user.name || user.username}！`);

      // 跳转到目标页面
      const redirect = route.query.redirect as string || '/dashboard';
      setTimeout(() => router.replace(redirect), 500);
    } else {
      ElMessage.error(response.message || '登录失败，请检查账号密码');
    }
  } catch (error) {
    console.error('登录失败:', error);
    // API错误已经在request.js的拦截器中处理
  } finally {
    loading.value = false;
  }
};


// ========== 第三步：替换发送验证码函数 ==========
// 原来的 sendVerifyCode 函数
/*
const sendVerifyCode = async () => {
  if (!/^1[3-9]\d{9}$/.test(loginForm.phone)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }

  sendingCode.value = true;
  try {
    // 调用发送验证码API
    ElMessage.success('验证码已发送');

    codeCountdown.value = 60;
    const timer = setInterval(() => {
      codeCountdown.value--;
      if (codeCountdown.value <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  } catch (error) {
    ElMessage.error('发送失败，请重试');
  } finally {
    sendingCode.value = false;
  }
};
*/

// 新的 sendVerifyCode 函数
const sendVerifyCode = async () => {
  // 使用API模块的验证函数
  if (!authApi.validatePhone(loginForm.phone)) {
    ElMessage.warning('请输入正确的11位手机号');
    return;
  }

  sendingCode.value = true;
  try {
    // 调用真实的发送验证码API
    const response = await authApi.sendVerifyCode({
      phone: loginForm.phone,
      type: 'login',
    });

    if (response.success) {
      ElMessage.success('验证码已发送，请注意查收');

      // 开始倒计时
      codeCountdown.value = 60;
      const timer = setInterval(() => {
        codeCountdown.value--;
        if (codeCountdown.value <= 0) {
          clearInterval(timer);
        }
      }, 1000);
    } else {
      ElMessage.error(response.message || '发送失败，请重试');
    }
  } catch (error) {
    // 错误已在拦截器处理
    console.error('发送验证码失败:', error);
  } finally {
    sendingCode.value = false;
  }
};


// ========== 第四步：替换忘记密码函数 ==========
// 原来的 sendResetCode 和 handleResetPassword 函数
/*
const sendResetCode = async () => {
  if (!resetForm.account) {
    ElMessage.warning('请输入账号或手机号');
    return;
  }

  ElMessage.success('验证码已发送');
  resetCodeCountdown.value = 60;
  const timer = setInterval(() => {
    resetCodeCountdown.value--;
    if (resetCodeCountdown.value <= 0) clearInterval(timer);
  }, 1000);
};

const handleResetPassword = async () => {
  if (!resetForm.account || !resetForm.code || !resetForm.newPassword) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  if (resetForm.newPassword !== resetForm.confirmPassword) {
    ElMessage.warning('两次密码输入不一致');
    return;
  }

  resetting.value = true;
  try {
    // 调用重置密码API
    ElMessage.success('密码重置成功');
    dialogs.forgotPassword = false;
    Object.assign(resetForm, { account: '', code: '', newPassword: '', confirmPassword: '' });
  } catch (error) {
    ElMessage.error('重置失败，请重试');
  } finally {
    resetting.value = false;
  }
};
*/

// 新的发送重置验证码函数
const sendResetCode = async () => {
  if (!resetForm.account) {
    ElMessage.warning('请输入账号或手机号');
    return;
  }

  try {
    // 调用忘记密码API（发送验证码）
    const response = await authApi.forgotPassword({
      account: resetForm.account,
    });

    if (response.success) {
      ElMessage.success('验证码已发送');

      // 开始倒计时
      resetCodeCountdown.value = 60;
      const timer = setInterval(() => {
        resetCodeCountdown.value--;
        if (resetCodeCountdown.value <= 0) {
          clearInterval(timer);
        }
      }, 1000);
    } else {
      ElMessage.error(response.message || '发送失败');
    }
  } catch (error) {
    console.error('发送验证码失败:', error);
  }
};

// 新的重置密码函数
const handleResetPassword = async () => {
  // 表单验证
  if (!resetForm.account || !resetForm.code || !resetForm.newPassword) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  if (resetForm.newPassword !== resetForm.confirmPassword) {
    ElMessage.warning('两次密码输入不一致');
    return;
  }

  // 密码强度验证
  const passwordCheck = authApi.validatePassword(resetForm.newPassword);
  if (!passwordCheck.valid) {
    ElMessage.warning(passwordCheck.message);
    return;
  }

  resetting.value = true;
  try {
    // 调用重置密码API
    const response = await authApi.resetPassword({
      account: resetForm.account,
      code: resetForm.code,
      newPassword: resetForm.newPassword,
      confirmPassword: resetForm.confirmPassword,
    });

    if (response.success) {
      ElMessage.success('密码重置成功，请使用新密码登录');
      dialogs.forgotPassword = false;

      // 清空表单
      Object.assign(resetForm, {
        account: '',
        code: '',
        newPassword: '',
        confirmPassword: ''
      });
    } else {
      ElMessage.error(response.message || '重置失败');
    }
  } catch (error) {
    console.error('重置密码失败:', error);
  } finally {
    resetting.value = false;
  }
};


// ========== 第五步：替换注册函数 ==========
// 原来的 handleRegister 函数
/*
const handleRegister = async () => {
  if (!registerFormRef.value) return;

  try {
    await registerFormRef.value.validate();

    if (!registerForm.agreeTerms) {
      ElMessage.warning('请阅读并同意用户协议和隐私政策');
      return;
    }

    registering.value = true;
    // 调用注册API
    ElMessage.success('注册成功，请使用手机号后6位登录');
    dialogs.register = false;
  } catch (error) {
    ElMessage.error('注册失败，请检查信息后重试');
  } finally {
    registering.value = false;
  }
};
*/

// 新的注册函数
const handleRegister = async () => {
  if (!registerFormRef.value) return;

  try {
    // 表单验证
    await registerFormRef.value.validate();

    // 协议确认
    if (!registerForm.agreeTerms) {
      ElMessage.warning('请阅读并同意用户协议和隐私政策');
      return;
    }

    registering.value = true;

    // 调用注册API
    const response = await authApi.register({
      name: registerForm.name,
      phone: registerForm.phone,
      idCard: registerForm.idCard,
      password: registerForm.password,
      villageId: registerForm.villageId,
    });

    if (response.success) {
      ElMessage.success('注册成功，请使用手机号后6位登录');
      dialogs.register = false;

      // 清空表单
      Object.keys(registerForm).forEach(key => {
        if (key !== 'villageId') {
          registerForm[key] = '';
        }
      });
      registerForm.agreeTerms = false;
    } else {
      ElMessage.error(response.message || '注册失败');
    }
  } catch (error) {
    console.error('注册失败:', error);
  } finally {
    registering.value = false;
  }
};


// ========== 第六步：加载村庄数据 ==========
// 原来的 loadVillages 函数
/*
const loadVillages = async () => {
  try {
    // 模拟数据
    villages.value = [
      { id: '1', name: '幸福村', code: 'XFC' },
      { id: '2', name: '民主村', code: 'MZC' },
      { id: '3', name: '文明村', code: 'WMC' },
    ];
  } catch (error) {
    console.error('获取村庄列表失败:', error);
  }
};
*/

// 新的加载村庄函数
const loadVillages = async () => {
  try {
    const response = await authApi.getVillages({
      pageSize: 100,
    });

    if (response.success && response.data) {
      villages.value = response.data.list || [];
    } else {
      // 使用默认数据
      villages.value = [
        { id: '1', name: '幸福村', code: 'XFC' },
        { id: '2', name: '民主村', code: 'MZC' },
        { id: '3', name: '文明村', code: 'WMC' },
      ];
    }
  } catch (error) {
    console.error('获取村庄列表失败:', error);
    // 使用默认数据
    villages.value = [
      { id: '1', name: '幸福村', code: 'XFC' },
      { id: '2', name: '民主村', code: 'MZC' },
      { id: '3', name: '文明村', code: 'WMC' },
    ];
  }
};


// ========== 第七步：人脸识别集成 ==========
// 原来的 startFaceRecognition 函数
/*
const startFaceRecognition = async () => {
  if (!cameraReady.value) return;

  faceScanning.value = true;
  faceError.value = '';

  try {
    // 模拟人脸识别过程
    await new Promise(resolve => setTimeout(resolve, 3000));
    ElMessage.success('人脸识别登录成功');
    closeFaceLogin();
    router.replace('/dashboard');
  } catch (error) {
    faceError.value = '人脸识别失败，请重试';
  } finally {
    faceScanning.value = false;
  }
};
*/

// 新的人脸识别函数
const startFaceRecognition = async () => {
  if (!cameraReady.value) return;

  faceScanning.value = true;
  faceError.value = '';

  try {
    // 从视频中捕获帧
    const video = faceVideoRef.value;
    const canvas = faceCanvasRef.value;

    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // 转换为base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    // 调用人脸识别API
    const response = await authApi.loginByFace({
      image: imageData,
      feature: [], // 特征向量可以由后端提取
    });

    if (response.success && response.data) {
      const { token, user } = response.data;

      // 保存用户信息
      userStore.setToken(token);
      userStore.setUserInfo(user);
      userStore.setPermissions(user.permissions || ['*']);
      userStore.setRoles([user.role]);

      ElMessage.success(`人脸识别登录成功，欢迎 ${user.name || user.username}！`);

      closeFaceLogin();

      // 跳转到目标页面
      const redirect = route.query.redirect as string || '/dashboard';
      setTimeout(() => router.replace(redirect), 500);
    } else {
      faceError.value = response.message || '人脸识别失败，请重试';
    }
  } catch (error) {
    console.error('人脸识别失败:', error);
    faceError.value = '人脸识别失败，请重试';
  } finally {
    faceScanning.value = false;
  }
};


// ========== 使用总结 ==========

/**
 * API集成完成后的功能：
 *
 * 1. 账号密码登录 - 使用 authApi.loginByPassword()
 * 2. 手机验证码登录 - 使用 authApi.loginByCode()
 * 3. 发送验证码 - 使用 authApi.sendVerifyCode()
 * 4. 忘记密码 - 使用 authApi.forgotPassword() + authApi.resetPassword()
 * 5. 用户注册 - 使用 authApi.register()
 * 6. 人脸识别登录 - 使用 authApi.loginByFace()
 * 7. 村庄列表 - 使用 authApi.getVillages()
 *
 * 错误处理：
 * - 所有API错误都会在 request.js 的拦截器中统一处理
 * - 自动处理 401/403 等状态码
 * - 友好的错误提示
 *
 * 状态管理：
 * - 用户信息保存在 Pinia store (userStore)
 * - Token 保存在 localStorage
 * - 自动刷新 token 机制
 *
 * 安全特性：
 * - HTTPS 传输
 * - Token 自动添加到请求头
 * - 密码强度验证
 * - 手机号和身份证号格式验证
 */

export default {
  handleLogin,
  sendVerifyCode,
  sendResetCode,
  handleResetPassword,
  handleRegister,
  loadVillages,
  startFaceRecognition,
};
