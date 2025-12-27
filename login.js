/**
 * 智慧乡村综合服务平台 - 登录页面脚本
 * 集成多种登录方式：密码登录、人脸识别、语音交互
 * 支持多语言、无障碍访问、安全加密
 */

// 全局变量
let currentLoginMode = 'password';
let isRecording = false;
let mediaStream = null;
let currentLanguage = 'zh-CN';
let voiceRecognition = null;

// 语言配置
const languages = {
    'zh-CN': { name: '普通话', icon: 'fa-language' },
    'yue': { name: '粤语', icon: 'fa-language' },
    'nan': { name: '闽南语', icon: 'fa-language' },
    'hakka': { name: '客家话', icon: 'fa-language' },
    'sichuan': { name: '四川话', icon: 'fa-language' }
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 初始化语音识别
    initializeVoiceRecognition();

    // 恢复记住的登录信息
    loadRememberedCredentials();

    // 检查浏览器兼容性
    checkBrowserCompatibility();

    // 设置焦点
    document.getElementById('phone')?.focus();

    // 添加键盘事件监听
    addKeyboardListeners();

    console.log('智慧乡村登录系统已初始化');
}

/**
 * 初始化语音识别
 */
function initializeVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        voiceRecognition = new SpeechRecognition();

        voiceRecognition.continuous = false;
        voiceRecognition.interimResults = true;
        voiceRecognition.maxAlternatives = 1;

        voiceRecognition.onresult = handleVoiceResult;
        voiceRecognition.onerror = handleVoiceError;
        voiceRecognition.onend = handleVoiceEnd;

        console.log('语音识别初始化成功');
    } else {
        console.warn('浏览器不支持语音识别功能');
    }
}

/**
 * 切换登录模式
 */
function switchLoginMode(mode) {
    currentLoginMode = mode;

    // 更新标签状态
    const tabs = ['password', 'face', 'voice'];
    tabs.forEach(tab => {
        const tabElement = document.getElementById(tab + 'Tab');
        const formElement = document.getElementById(tab + 'Form');

        if (tab === mode) {
            tabElement.classList.add('bg-white/20');
            tabElement.classList.remove('text-white/70');
            tabElement.classList.add('text-white');
            formElement.classList.remove('hidden');
        } else {
            tabElement.classList.remove('bg-white/20');
            tabElement.classList.add('text-white/70');
            tabElement.classList.remove('text-white');
            formElement.classList.add('hidden');
        }
    });

    // 特殊处理
    if (mode === 'face') {
        initializeFaceRecognition();
    } else if (mode === 'voice') {
        // 语音登录时的额外设置
    } else {
        // 停止摄像头和语音
        stopCamera();
        stopVoiceRecording();
    }
}

/**
 * 密码登录处理
 */
async function handlePasswordLogin() {
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const userType = document.querySelector('input[name="userType"]:checked')?.value;
    const villageId = document.getElementById('villageSelect').value;
    const remember = document.getElementById('remember').checked;

    // 表单验证
    if (!validateLoginForm(phone, password, userType, villageId)) {
        return;
    }

    // 显示加载状态
    showLoadingState(true);

    try {
        // 加密密码（在实际应用中应该使用更安全的加密方式）
        const encryptedPassword = await encryptPassword(password);

        // 调用登录API
        const loginData = {
            phone,
            password: encryptedPassword,
            userType,
            villageId,
            remember,
            timestamp: Date.now()
        };

        const result = await callLoginAPI(loginData);

        if (result.success) {
            // 记住登录信息
            if (remember) {
                saveCredentials(phone, userType, villageId);
            } else {
                clearSavedCredentials();
            }

            // 保存用户信息和token
            localStorage.setItem('userToken', result.token);
            localStorage.setItem('userInfo', JSON.stringify(result.user));

            // 显示成功消息
            showSuccessMessage('登录成功！正在跳转...');

            // 延迟跳转
            setTimeout(() => {
                redirectToDashboard(result.user);
            }, 1500);

        } else {
            showErrorMessage(result.message || '登录失败，请检查账号密码');
        }

    } catch (error) {
        console.error('登录错误:', error);
        showErrorMessage('网络异常，请稍后重试');
    } finally {
        showLoadingState(false);
    }
}

/**
 * 初始化人脸识别
 */
async function initializeFaceRecognition() {
    try {
        const video = document.getElementById('faceVideo');
        if (!video) return;

        // 请求摄像头权限
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });

        video.srcObject = mediaStream;

        console.log('摄像头初始化成功');
    } catch (error) {
        console.error('摄像头初始化失败:', error);
        showErrorMessage('无法访问摄像头，请检查权限设置');
    }
}

/**
 * 开始人脸扫描
 */
async function startFaceScan() {
    const overlay = document.getElementById('faceOverlay');
    const scanning = document.getElementById('faceScanning');

    try {
        overlay.classList.add('hidden');
        scanning.classList.remove('hidden');

        // 获取当前帧
        const video = document.getElementById('faceVideo');
        const canvas = document.getElementById('faceCanvas');
        const ctx = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // 转换为Base64
        const imageData = canvas.toDataURL('image/jpeg', 0.8);

        // 调用人脸识别API
        const result = await callFaceRecognitionAPI({
            image: imageData,
            timestamp: Date.now()
        });

        if (result.success) {
            showSuccessMessage('人脸识别成功！');

            // 保存登录信息
            localStorage.setItem('userToken', result.token);
            localStorage.setItem('userInfo', JSON.stringify(result.user));

            setTimeout(() => {
                redirectToDashboard(result.user);
            }, 1500);
        } else {
            showErrorMessage(result.message || '人脸识别失败，请重试');
            overlay.classList.remove('hidden');
            scanning.classList.add('hidden');
        }

    } catch (error) {
        console.error('人脸扫描错误:', error);
        showErrorMessage('人脸扫描失败，请重试');
        overlay.classList.remove('hidden');
        scanning.classList.add('hidden');
    }
}

/**
 * 语音录制处理
 */
function toggleVoiceRecording() {
    if (isRecording) {
        stopVoiceRecording();
    } else {
        startVoiceRecording();
    }
}

/**
 * 开始语音录制
 */
function startVoiceRecording() {
    if (!voiceRecognition) {
        showErrorMessage('浏览器不支持语音识别功能');
        return;
    }

    isRecording = true;
    const voiceButton = document.getElementById('voiceButton');
    const voiceIcon = document.getElementById('voiceIcon');
    const voiceWave = document.getElementById('voiceWave');

    voiceButton.classList.add('animate-pulse-glow');
    voiceIcon.classList.remove('fa-microphone');
    voiceIcon.classList.add('fa-stop');
    voiceWave.classList.remove('hidden');

    // 根据当前语言设置语音识别语言
    voiceRecognition.lang = currentLanguage === 'zh-CN' ? 'zh-CN' : 'zh';

    try {
        voiceRecognition.start();
        console.log('语音识别已启动');
    } catch (error) {
        console.error('语音识别启动失败:', error);
        stopVoiceRecording();
    }
}

/**
 * 停止语音录制
 */
function stopVoiceRecording() {
    if (voiceRecognition && isRecording) {
        voiceRecognition.stop();
    }

    isRecording = false;
    const voiceButton = document.getElementById('voiceButton');
    const voiceIcon = document.getElementById('voiceIcon');
    const voiceWave = document.getElementById('voiceWave');

    voiceButton.classList.remove('animate-pulse-glow');
    voiceIcon.classList.add('fa-microphone');
    voiceIcon.classList.remove('fa-stop');
    voiceWave.classList.add('hidden');
}

/**
 * 处理语音识别结果
 */
function handleVoiceResult(event) {
    const results = event.results;
    let transcript = '';

    for (let i = event.resultIndex; i < results.length; i++) {
        transcript += results[i][0].transcript;
    }

    if (results[0].isFinal) {
        document.getElementById('voiceText').textContent = transcript;
        document.getElementById('voiceResult').classList.remove('hidden');

        // 自动处理语音登录
        processVoiceLogin(transcript);
    }
}

/**
 * 处理语音识别错误
 */
function handleVoiceError(event) {
    console.error('语音识别错误:', event.error);
    let errorMessage = '语音识别失败';

    switch (event.error) {
        case 'no-speech':
            errorMessage = '未检测到语音，请重试';
            break;
        case 'audio-capture':
            errorMessage = '无法访问麦克风';
            break;
        case 'not-allowed':
            errorMessage = '麦克风权限被拒绝';
            break;
        case 'network':
            errorMessage = '网络错误，请检查连接';
            break;
    }

    showErrorMessage(errorMessage);
    stopVoiceRecording();
}

/**
 * 语音识别结束处理
 */
function handleVoiceEnd() {
    if (isRecording) {
        stopVoiceRecording();
    }
}

/**
 * 处理语音登录
 */
async function processVoiceLogin(transcript) {
    if (!transcript) {
        transcript = document.getElementById('voiceText').textContent;
    }

    if (!transcript) {
        showErrorMessage('未识别到有效语音，请重试');
        return;
    }

    showLoadingState(true);

    try {
        // 调用语音登录API
        const result = await callVoiceLoginAPI({
            voiceText: transcript,
            language: currentLanguage,
            timestamp: Date.now()
        });

        if (result.success) {
            showSuccessMessage('语音登录成功！');

            localStorage.setItem('userToken', result.token);
            localStorage.setItem('userInfo', JSON.stringify(result.user));

            setTimeout(() => {
                redirectToDashboard(result.user);
            }, 1500);
        } else {
            showErrorMessage(result.message || '语音登录失败，请重试');
        }

    } catch (error) {
        console.error('语音登录错误:', error);
        showErrorMessage('语音登录处理失败，请重试');
    } finally {
        showLoadingState(false);
    }
}

/**
 * 密码可见性切换
 */
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('passwordToggle');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

/**
 * 切换语言
 */
function switchLanguage() {
    const langKeys = Object.keys(languages);
    const currentIndex = langKeys.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % langKeys.length;
    currentLanguage = langKeys[nextIndex];

    const lang = languages[currentLanguage];
    document.getElementById('langText').textContent = lang.name;

    showSuccessMessage(`已切换到${lang.name}模式`);
}

/**
 * 切换无障碍模式
 */
function toggleAccessibility() {
    // 大字模式
    document.body.classList.toggle('text-2xl');

    // 高对比度
    document.body.classList.toggle('contrast-more');

    // 语音提示
    speakText('无障碍模式已' + (document.body.classList.contains('text-2xl') ? '开启' : '关闭'));

    showSuccessMessage('无障碍模式已' + (document.body.classList.contains('text-2xl') ? '开启' : '关闭'));
}

/**
 * 显示忘记密码弹窗
 */
function showForgotPassword() {
    document.getElementById('forgotPasswordModal').classList.remove('hidden');
}

/**
 * 关闭忘记密码弹窗
 */
function closeForgotPassword() {
    document.getElementById('forgotPasswordModal').classList.add('hidden');
}

/**
 * 发送验证码
 */
async function sendVerifyCode() {
    const phone = document.getElementById('resetPhone').value.trim();

    if (!phone || phone.length !== 11) {
        showErrorMessage('请输入正确的手机号');
        return;
    }

    const btn = document.getElementById('codeBtn');
    const originalText = btn.textContent;

    try {
        btn.disabled = true;
        btn.textContent = '发送中...';

        // 调用发送验证码API
        const result = await callSendCodeAPI({ phone });

        if (result.success) {
            showSuccessMessage('验证码已发送');
            startCodeCountdown(btn);
        } else {
            showErrorMessage(result.message || '发送失败，请重试');
        }

    } catch (error) {
        console.error('发送验证码错误:', error);
        showErrorMessage('发送失败，请重试');
    } finally {
        if (!btn.textContent.match(/\d+s/)) {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

/**
 * 验证码倒计时
 */
function startCodeCountdown(btn) {
    let countdown = 60;
    const timer = setInterval(() => {
        countdown--;
        btn.textContent = `${countdown}s`;

        if (countdown <= 0) {
            clearInterval(timer);
            btn.disabled = false;
            btn.textContent = '重新发送';
        }
    }, 1000);
}

/**
 * 处理重置密码
 */
async function handleResetPassword() {
    const phone = document.getElementById('resetPhone').value.trim();
    const code = document.getElementById('verifyCode').value.trim();
    const password = document.getElementById('newPassword').value;

    if (!phone || !code || !password) {
        showErrorMessage('请填写完整信息');
        return;
    }

    try {
        const result = await callResetPasswordAPI({
            phone,
            code,
            password,
            timestamp: Date.now()
        });

        if (result.success) {
            showSuccessMessage('密码重置成功');
            closeForgotPassword();

            // 清空表单
            document.getElementById('resetPhone').value = '';
            document.getElementById('verifyCode').value = '';
            document.getElementById('newPassword').value = '';
        } else {
            showErrorMessage(result.message || '重置失败，请重试');
        }

    } catch (error) {
        console.error('重置密码错误:', error);
        showErrorMessage('重置失败，请重试');
    }
}

/**
 * 显示注册引导
 */
function showRegister() {
    showSuccessMessage('请联系村委管理员进行账号注册');
}

/**
 * 显示帮助弹窗
 */
function showHelp() {
    document.getElementById('helpModal').classList.remove('hidden');
}

/**
 * 关闭帮助弹窗
 */
function closeHelp() {
    document.getElementById('helpModal').classList.add('hidden');
}

/**
 * 表单验证
 */
function validateLoginForm(phone, password, userType, villageId) {
    if (!phone) {
        showErrorMessage('请输入手机号');
        return false;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
        showErrorMessage('请输入正确的11位手机号');
        return false;
    }

    if (!password) {
        showErrorMessage('请输入密码');
        return false;
    }

    if (password.length < 6) {
        showErrorMessage('密码长度不能少于6位');
        return false;
    }

    if (!userType) {
        showErrorMessage('请选择登录身份');
        return false;
    }

    if (!villageId) {
        showErrorMessage('请选择所属村庄');
        return false;
    }

    return true;
}

/**
 * 显示加载状态
 */
function showLoadingState(loading) {
    const btn = document.getElementById('loginBtn');
    const btnText = document.getElementById('loginBtnText');

    if (loading) {
        btn.disabled = true;
        btnText.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>登录中<span class="loading-dots"></span>';
    } else {
        btn.disabled = false;
        btnText.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>立即登录';
    }
}

/**
 * 显示成功消息
 */
function showSuccessMessage(message) {
    showToast(message, 'success');
}

/**
 * 显示错误消息
 */
function showErrorMessage(message) {
    showToast(message, 'error');
}

/**
 * Toast消息提示
 */
function showToast(message, type = 'info') {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 animate-slide-up max-w-sm`;

    // 根据类型设置背景色
    switch (type) {
        case 'success':
            toast.classList.add('bg-green-500');
            toast.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
            break;
        case 'error':
            toast.classList.add('bg-red-500');
            toast.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${message}`;
            break;
        default:
            toast.classList.add('bg-blue-500');
            toast.innerHTML = `<i class="fas fa-info-circle mr-2"></i>${message}`;
    }

    document.body.appendChild(toast);

    // 3秒后移除
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

/**
 * 停止摄像头
 */
function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
}

/**
 * 文字转语音
 */
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

/**
 * 保存登录凭据
 */
function saveCredentials(phone, userType, villageId) {
    const credentials = {
        phone,
        userType,
        villageId,
        timestamp: Date.now()
    };
    localStorage.setItem('rememberedCredentials', JSON.stringify(credentials));
}

/**
 * 加载保存的凭据
 */
function loadRememberedCredentials() {
    try {
        const saved = localStorage.getItem('rememberedCredentials');
        if (saved) {
            const credentials = JSON.parse(saved);
            document.getElementById('phone').value = credentials.phone || '';
            document.querySelector(`input[name="userType"][value="${credentials.userType}"]`)?.click();
            document.getElementById('villageSelect').value = credentials.villageId || '';
            document.getElementById('remember').checked = true;
        }
    } catch (error) {
        console.error('加载凭据失败:', error);
    }
}

/**
 * 清除保存的凭据
 */
function clearSavedCredentials() {
    localStorage.removeItem('rememberedCredentials');
}

/**
 * 重定向到用户面板
 */
function redirectToDashboard(user) {
    // 根据用户类型重定向到不同页面
    const redirectMap = {
        'villager': '/village/management',
        'committee': '/village/committee',
        'admin': '/dashboard'
    };

    const redirectUrl = redirectMap[user.userType] || '/dashboard';
    window.location.href = redirectUrl;
}

/**
 * 添加键盘事件监听
 */
function addKeyboardListeners() {
    document.addEventListener('keydown', function(event) {
        // Enter键登录
        if (event.key === 'Enter' && currentLoginMode === 'password') {
            handlePasswordLogin();
        }

        // Esc键关闭弹窗
        if (event.key === 'Escape') {
            closeForgotPassword();
            closeHelp();
        }
    });
}

/**
 * 检查浏览器兼容性
 */
function checkBrowserCompatibility() {
    const requiredFeatures = [
        'localStorage',
        'fetch',
        'Promise',
        'URLSearchParams'
    ];

    const missingFeatures = requiredFeatures.filter(feature => !(feature in window));

    if (missingFeatures.length > 0) {
        showErrorMessage('您的浏览器版本过低，请升级到最新版本');
        return false;
    }

    return true;
}

/**
 * 密码加密（示例实现，实际应该使用更安全的方法）
 */
async function encryptPassword(password) {
    // 在实际应用中，这里应该使用专业的加密库
    return btoa(password + '_' + Date.now());
}

// API调用函数（模拟实现）

async function callLoginAPI(loginData) {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 模拟登录成功响应
    return {
        success: true,
        token: 'mock_token_' + Date.now(),
        user: {
            id: 'user_' + loginData.phone,
            phone: loginData.phone,
            userType: loginData.userType,
            villageId: loginData.villageId,
            name: '测试用户'
        }
    };
}

async function callFaceRecognitionAPI(data) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
        success: true,
        token: 'face_token_' + Date.now(),
        user: {
            id: 'face_user',
            phone: '13800138000',
            userType: 'villager',
            villageId: 'xf001',
            name: '人脸识别用户'
        }
    };
}

async function callVoiceLoginAPI(data) {
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
        success: true,
        token: 'voice_token_' + Date.now(),
        user: {
            id: 'voice_user',
            phone: '13900139000',
            userType: 'committee',
            villageId: 'xf001',
            name: '语音登录用户'
        }
    };
}

async function callSendCodeAPI(data) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
}

async function callResetPasswordAPI(data) {
    await new Promise(resolve => setTimeout(resolve, 800));
    return { success: true };
}

// 页面卸载时清理资源
window.addEventListener('beforeunload', function() {
    stopCamera();
    stopVoiceRecording();
});

// 监听网络状态变化
window.addEventListener('online', function() {
    showSuccessMessage('网络连接已恢复');
});

window.addEventListener('offline', function() {
    showErrorMessage('网络连接已断开');
});

console.log('登录脚本加载完成');