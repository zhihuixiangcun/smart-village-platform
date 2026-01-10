/**
 * 智慧乡村平台 - 国际化配置
 * Internationalization (i18n) Configuration
 *
 * 支持语言：
 * - 简体中文 (zh-CN)
 * - 繁体中文 (zh-TW)
 * - English (en-US)
 * - 日本語 (ja-JP)
 * - 한국어 (ko-KR)
 */

// ========== 语言包 ==========
export const messages = {
  'zh-CN': {
    // 通用
    common: {
      appName: '智慧乡村综合服务平台',
      welcome: '欢迎',
      loading: '加载中...',
      save: '保存',
      cancel: '取消',
      confirm: '确认',
      delete: '删除',
      edit: '编辑',
      add: '添加',
      search: '搜索',
      reset: '重置',
      submit: '提交',
      back: '返回',
      close: '关闭',
      more: '更多',
      refresh: '刷新',
      export: '导出',
      import: '导入',
      download: '下载',
      upload: '上传',
      view: '查看',
      detail: '详情',
      operation: '操作',
      status: '状态',
      createTime: '创建时间',
      updateTime: '更新时间',
      remark: '备注',
      yes: '是',
      no: '否',
      all: '全部',
      selected: '已选择 {count} 项',
      total: '共 {total} 条',
    },

    // 登录页面
    login: {
      title: '用户登录',
      subtitle: '欢迎回来，请登录您的账号',
      modePassword: '账号登录',
      modeCode: '验证码登录',
      username: '账号',
      usernamePlaceholder: '请输入用户名',
      password: '密码',
      passwordPlaceholder: '请输入密码',
      showPassword: '显示密码',
      hidePassword: '隐藏密码',
      role: '角色',
      rolePlaceholder: '请选择您的角色',
      roleAdmin: '系统管理员',
      roleVillageAdmin: '村委会成员',
      roleVillageOfficial: '村务官员',
      roleResident: '村民',
      phone: '手机号',
      phonePlaceholder: '请输入11位手机号',
      verifyCode: '验证码',
      verifyCodePlaceholder: '请输入验证码',
      sendCode: '获取验证码',
      resendCode: '{seconds}s后重新获取',
      rememberMe: '记住登录状态',
      forgotPassword: '忘记密码？',
      loginButton: '立即登录',
      loginButtonLoading: '登录中...',
      securityNotice: '您的数据将通过SSL加密传输',
      divider: '更多选项',
      quickRegister: '用户注册',
      faceLogin: '人脸登录',
      help: '使用帮助',
      testAccounts: '测试账户快速登录',
      testAdmin: '管理员',
      testVillage: '村委',
      testResident: '村民',
      testCredentials: '测试账户凭证',
      loginSuccess: '欢迎回来，{name}！',
      loginFailed: '登录失败，请检查账号密码',
    },

    // 角色选项
    roles: {
      admin: '系统管理员',
      village_admin: '村委会成员',
      village_official: '村务官员',
      resident: '村民',
    },

    // 验证消息
    validation: {
      required: '{field}不能为空',
      minLength: '{field}长度不能少于{min}位',
      maxLength: '{field}长度不能超过{max}位',
      invalidPhone: '请输入正确的11位手机号',
      invalidIdCard: '请输入正确的18位身份证号',
      invalidEmail: '请输入正确的邮箱地址',
      passwordMismatch: '两次密码输入不一致',
      passwordWeak: '密码强度：弱',
      passwordMedium: '密码强度：中',
      passwordStrong: '密码强度：强',
      codeExpired: '验证码已过期',
      codeInvalid: '验证码错误',
      usernameExists: '用户名已存在',
      phoneExists: '手机号已被注册',
    },

    // 错误消息
    errors: {
      networkError: '网络连接失败，请检查网络设置',
      requestTimeout: '请求超时，请稍后再试',
      serverError: '服务器错误，请稍后再试',
      unauthorized: '未授权，请先登录',
      forbidden: '没有权限访问',
      notFound: '请求的资源不存在',
      unknownError: '未知错误，请稍后再试',
    },

    // 注册页面
    register: {
      title: '用户注册',
      name: '姓名',
      namePlaceholder: '请输入真实姓名',
      idCard: '身份证号',
      idCardPlaceholder: '请输入18位身份证号',
      password: '设置密码',
      passwordPlaceholder: '请设置登录密码',
      confirmPassword: '确认密码',
      confirmPasswordPlaceholder: '请再次输入密码',
      village: '所属村庄',
      villagePlaceholder: '请选择村庄',
      agreeTerms: '我已阅读并同意',
      userAgreement: '《用户协议》',
      privacyPolicy: '《隐私政策》',
      registerButton: '提交注册',
      registerSuccess: '注册成功，请使用手机号后6位登录',
      registerFailed: '注册失败，请检查信息后重试',
    },

    // 忘记密码
    forgotPassword: {
      title: '重置密码',
      account: '账号/手机号',
      accountPlaceholder: '请输入注册账号或手机号',
      newPassword: '新密码',
      newPasswordPlaceholder: '请输入新密码（至少6位）',
      confirmPassword: '确认密码',
      confirmPasswordPlaceholder: '请再次输入新密码',
      sendCode: '获取验证码',
      resetButton: '确认重置',
      resetSuccess: '密码重置成功，请使用新密码登录',
      resetFailed: '重置失败，请重试',
    },

    // 人脸登录
    faceLogin: {
      title: '人脸识别登录',
      scanning: '识别中...',
      alignFace: '请将面部对准摄像头',
      cameraError: '无法访问摄像头，请检查权限设置',
      recognitionFailed: '人脸识别失败，请重试',
      recognitionSuccess: '人脸识别登录成功',
    },

    // 帮助中心
    help: {
      title: '使用帮助',
      firstLogin: {
        title: '首次登录',
        content: '首次登录密码为手机号后6位数字，登录后请及时修改密码',
      },
      quickLogin: {
        title: '快速登录',
        content: '支持人脸识别快速登录，安全便捷，无需记住密码',
      },
      systemFeatures: {
        title: '系统功能',
        content: '提供村务管理、资料收集、值班管理、数据统计等完整功能',
      },
      technicalSupport: {
        title: '技术支持',
        content: '如遇问题请联系村委会管理员或拨打技术支持热线',
      },
      gotIt: '我知道了',
    },
  },

  'en-US': {
    // Common
    common: {
      appName: 'Smart Village Platform',
      welcome: 'Welcome',
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      reset: 'Reset',
      submit: 'Submit',
      back: 'Back',
      close: 'Close',
      more: 'More',
      refresh: 'Refresh',
      export: 'Export',
      import: 'Import',
      download: 'Download',
      upload: 'Upload',
      view: 'View',
      detail: 'Detail',
      operation: 'Operation',
      status: 'Status',
      createTime: 'Create Time',
      updateTime: 'Update Time',
      remark: 'Remark',
      yes: 'Yes',
      no: 'No',
      all: 'All',
      selected: '{count} selected',
      total: 'Total {total} items',
    },

    // Login Page
    login: {
      title: 'User Login',
      subtitle: 'Welcome back, please login to your account',
      modePassword: 'Account Login',
      modeCode: 'SMS Login',
      username: 'Username',
      usernamePlaceholder: 'Enter username',
      password: 'Password',
      passwordPlaceholder: 'Enter password',
      showPassword: 'Show Password',
      hidePassword: 'Hide Password',
      role: 'Role',
      rolePlaceholder: 'Select your role',
      roleAdmin: 'System Admin',
      roleVillageAdmin: 'Village Committee',
      roleVillageOfficial: 'Village Official',
      roleResident: 'Resident',
      phone: 'Phone',
      phonePlaceholder: 'Enter 11-digit phone number',
      verifyCode: 'Verification Code',
      verifyCodePlaceholder: 'Enter verification code',
      sendCode: 'Get Code',
      resendCode: 'Resend in {seconds}s',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot Password?',
      loginButton: 'Login',
      loginButtonLoading: 'Logging in...',
      securityNotice: 'Your data is transmitted via SSL encryption',
      divider: 'More Options',
      quickRegister: 'Register',
      faceLogin: 'Face Login',
      help: 'Help',
      testAccounts: 'Test Accounts Quick Login',
      testAdmin: 'Admin',
      testVillage: 'Village',
      testResident: 'Resident',
      testCredentials: 'Test Credentials',
      loginSuccess: 'Welcome back, {name}!',
      loginFailed: 'Login failed, please check your credentials',
    },

    // Roles
    roles: {
      admin: 'System Administrator',
      village_admin: 'Village Committee',
      village_official: 'Village Official',
      resident: 'Resident',
    },

    // Validation
    validation: {
      required: '{field} is required',
      minLength: '{field} must be at least {min} characters',
      maxLength: '{field} must not exceed {max} characters',
      invalidPhone: 'Please enter a valid 11-digit phone number',
      invalidIdCard: 'Please enter a valid 18-digit ID number',
      invalidEmail: 'Please enter a valid email address',
      passwordMismatch: 'Passwords do not match',
      passwordWeak: 'Password strength: Weak',
      passwordMedium: 'Password strength: Medium',
      passwordStrong: 'Password strength: Strong',
      codeExpired: 'Verification code has expired',
      codeInvalid: 'Invalid verification code',
      usernameExists: 'Username already exists',
      phoneExists: 'Phone number already registered',
    },

    // Errors
    errors: {
      networkError: 'Network connection failed, please check your network settings',
      requestTimeout: 'Request timeout, please try again later',
      serverError: 'Server error, please try again later',
      unauthorized: 'Unauthorized, please login first',
      forbidden: 'Access forbidden',
      notFound: 'Requested resource not found',
      unknownError: 'Unknown error, please try again later',
    },

    // Register
    register: {
      title: 'User Registration',
      name: 'Name',
      namePlaceholder: 'Enter your real name',
      idCard: 'ID Card',
      idCardPlaceholder: 'Enter 18-digit ID number',
      password: 'Password',
      passwordPlaceholder: 'Set login password',
      confirmPassword: 'Confirm Password',
      confirmPasswordPlaceholder: 'Enter password again',
      village: 'Village',
      villagePlaceholder: 'Select village',
      agreeTerms: 'I have read and agree to',
      userAgreement: 'User Agreement',
      privacyPolicy: 'Privacy Policy',
      registerButton: 'Submit',
      registerSuccess: 'Registration successful, please login with last 6 digits of phone',
      registerFailed: 'Registration failed, please check your information',
    },

    // Forgot Password
    forgotPassword: {
      title: 'Reset Password',
      account: 'Account/Phone',
      accountPlaceholder: 'Enter registered account or phone',
      newPassword: 'New Password',
      newPasswordPlaceholder: 'Enter new password (at least 6 characters)',
      confirmPassword: 'Confirm Password',
      confirmPasswordPlaceholder: 'Enter new password again',
      sendCode: 'Get Code',
      resetButton: 'Reset Password',
      resetSuccess: 'Password reset successful, please login with new password',
      resetFailed: 'Reset failed, please try again',
    },

    // Face Login
    faceLogin: {
      title: 'Face Recognition Login',
      scanning: 'Recognizing...',
      alignFace: 'Please align your face with the camera',
      cameraError: 'Cannot access camera, please check permissions',
      recognitionFailed: 'Face recognition failed, please try again',
      recognitionSuccess: 'Face recognition successful',
    },

    // Help
    help: {
      title: 'Help',
      firstLogin: {
        title: 'First Login',
        content: 'Default password is last 6 digits of phone number, please change after login',
      },
      quickLogin: {
        title: 'Quick Login',
        content: 'Support face recognition for quick and secure login',
      },
      systemFeatures: {
        title: 'System Features',
        content: 'Provides complete village management, data collection, and statistics',
      },
      technicalSupport: {
        title: 'Technical Support',
        content: 'Please contact village administrator for technical support',
      },
      gotIt: 'Got It',
    },
  },
};

// ========== 导出配置 ==========
export const i18nConfig = {
  locale: 'zh-CN', // 默认语言
  fallbackLocale: 'zh-CN', // 回退语言
  messages,
};

export default messages;
