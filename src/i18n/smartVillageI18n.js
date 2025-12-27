/**
 * 智慧乡村综合服务平台 - 国际化支持
 * 支持普通话、粤语、闽南语、客家话、四川话等方言
 */

const i18n = {

  // 当前语言设置
  currentLocale: 'zh-CN',

  // 支持的语言列表
  supportedLocales: [
    { code: 'zh-CN', name: '普通话', family: 'mandarin' },
    { code: 'yue', name: '粤语', family: 'yue' },
    { code: 'nan', name: '闽南语', family: 'min' },
    { code: 'hakka', name: '客家话', family: 'hakka' },
    { code: 'sichuan', name: '四川话', family: 'southwest' }
  ],

  // 词汇翻译表
  translations: {

    // 登录相关
    login: {
      'zh-CN': {
        title: '智慧乡村综合服务平台',
        subtitle: '数字化村务管理 · 便民服务 · 村务公开',
        password_login: '密码登录',
        face_login: '人脸登录',
        voice_login: '语音登录',
        phone_number: '手机号码',
        password: '登录密码',
        remember_login: '记住登录',
        forgot_password: '忘记密码？',
        login_button: '立即登录',
        login_success: '登录成功',
        login_failed: '登录失败，请检查账号密码',
        login_in_progress: '登录中...',
        user_type: '登录身份',
        villager: '村民',
        committee: '村委',
        admin: '管理员',
        village: '所属村庄',
        select_village: '请选择村庄'
      },

      'yue': {
        title: '智慧鄉村綜合服務平台',
        subtitle: '數字化村務管理 · 便民服務 · 村務公開',
        password_login: '密碼登錄',
        face_login: '人臉登錄',
        voice_login: '語音登錄',
        phone_number: '手機號碼',
        password: '登錄密碼',
        remember_login: '記住登錄',
        forgot_password: '忘記密碼？',
        login_button: '立即登錄',
        login_success: '登錄成功',
        login_failed: '登錄失敗，請檢查賬號密碼',
        login_in_progress: '登錄中...',
        user_type: '登錄身份',
        villager: '村民',
        committee: '村委',
        admin: '管理員',
        village: '所屬村莊',
        select_village: '請選擇村莊'
      },

      'nan': {
        title: '智慧鄉村綜合服務平台',
        subtitle: '數位化村務管理 · 便民服務 · 村務公開',
        password_login: '密碼登入',
        face_login: '人臉登入',
        voice_login: '語音登入',
        phone_number: '手機號碼',
        password: '登入密碼',
        remember_login: '記住登入',
        forgot_password: '忘記密碼？',
        login_button: '立即登入',
        login_success: '登入成功',
        login_failed: '登入失敗，請檢查帳號密碼',
        login_in_progress: '登入中...',
        user_type: '登入身份',
        villager: '村民',
        committee: '村委',
        admin: '管理員',
        village: '所屬村莊',
        select_village: '請選擇村莊'
      },

      'hakka': {
        title: '智慧鄉村綜合服務平台',
        subtitle: '數字化村務管理 · 便民服務 · 村務公開',
        password_login: '密碼登錄',
        face_login: '人面登錄',
        voice_login: '語音登錄',
        phone_number: '手機號碼',
        password: '登錄密碼',
        remember_login: '記得登錄',
        forgot_password: '忘記密碼？',
        login_button: '馬上登錄',
        login_success: '登錄成功',
        login_failed: '登錄失敗，請檢查帳號密碼',
        login_in_progress: '登錄中...',
        user_type: '登錄身份',
        villager: '村民',
        committee: '村委',
        admin: '管理員',
        village: '所屬村莊',
        select_village: '請揀擇村莊'
      },

      'sichuan': {
        title: '智慧乡村综合服务平台',
        subtitle: '数字化村务管理 · 便民服务 · 村务公开',
        password_login: '密码登录',
        face_login: '人脸登录',
        voice_login: '语音登录',
        phone_number: '手机号',
        password: '登录密码',
        remember_login: '记住登录',
        forgot_password: '忘记密码？',
        login_button: '马上登录',
        login_success: '登录成功',
        login_failed: '登录失败，请检查账号密码',
        login_in_progress: '正在登录...',
        user_type: '登录身份',
        villager: '村民',
        committee: '村委',
        admin: '管理员',
        village: '所属村庄',
        select_village: '请选择村庄'
      }
    },

    // 人脸识别相关
    faceRecognition: {
      'zh-CN': {
        title: '人脸登录',
        instruction: '请将面部对准摄像头',
        requirement: '保持光线充足，面部清晰可见',
        start_scan: '开始扫描',
        scanning: '正在识别中...',
        success: '人脸识别成功',
        failed: '人脸识别失败，请重试',
        no_camera: '无法访问摄像头，请检查权限设置',
        position_face: '请将面部对准摄像头',
        lighting_good: '光线良好',
        lighting_bad: '光线不足，请调整光线'
      },

      'yue': {
        title: '人臉登錄',
        instruction: '請將面部對準鏡頭',
        requirement: '保持光線充足，面部清晰可見',
        start_scan: '開始掃描',
        scanning: '正在識別中...',
        success: '人臉識別成功',
        failed: '人臉識別失敗，請重試',
        no_camera: '無法訪問鏡頭，請檢查權限設置',
        position_face: '請將面部對準鏡頭',
        lighting_good: '光線良好',
        lighting_bad: '光線不足，請調整光線'
      },

      'nan': {
        title: '人臉登入',
        instruction: '請將面對準鏡頭',
        requirement: '保持光線充足，面對清晰可見',
        start_scan: '開始掃描',
        scanning: '正在辨識中...',
        success: '人臉辨識成功',
        failed: '人臉辨識失敗，請重試',
        no_camera: '無法存取鏡頭，請檢查權限設定',
        position_face: '請將面對準鏡頭',
        lighting_good: '光線良好',
        lighting_bad: '光線不足，請調整光線'
      },

      'hakka': {
        title: '人面登錄',
        instruction: '請將面對準鏡頭',
        requirement: '保持光線充足，面對清晰看得到',
        start_scan: '開始掃描',
        scanning: '正在辨識中...',
        success: '人面辨識成功',
        failed: '人面辨識失敗，請再試',
        no_camera: '無法用鏡頭，請檢查權限',
        position_face: '請將面對準鏡頭',
        lighting_good: '光線好',
        lighting_bad: '光線不足，請調整'
      },

      'sichuan': {
        title: '人脸登录',
        instruction: '请把脸对准摄像头',
        requirement: '光线要好，脸要看得清楚',
        start_scan: '开始扫描',
        scanning: '正在识别...',
        success: '人脸识别成功',
        failed: '人脸识别失败，再试一下',
        no_camera: '用不了摄像头，检查权限',
        position_face: '请把脸对准摄像头',
        lighting_good: '光线还可以',
        lighting_bad: '光线太暗了，调一下'
      }
    },

    // 语音识别相关
    voiceRecognition: {
      'zh-CN': {
        title: '语音登录',
        instruction: '请说出您的手机号和姓名',
        start_recording: '点击开始录音',
        recording: '正在录音...',
        processing: '处理中...',
        success: '语音识别成功',
        failed: '语音识别失败，请重试',
        no_microphone: '无法访问麦克风，请检查权限设置',
        speak_clearly: '请清晰说话',
        supported_dialects: '支持方言',
        dialects_list: '普通话、粤语、闽南语、客家话、四川话',
        result: '识别结果',
        confirm_login: '确认登录'
      },

      'yue': {
        title: '語音登錄',
        instruction: '請講出您嘅手機號碼同姓名',
        start_recording: '擊開始錄音',
        recording: '正在錄音...',
        processing: '處理中...',
        success: '語音識別成功',
        failed: '語音識別失敗，請重試',
        no_microphone: '無法訪問咪高峰，請檢查權限設置',
        speak_clearly: '請講清楚啲',
        supported_dialects: '支持方言',
        dialects_list: '普通話、粵語、閩南語、客家話、四川話',
        result: '識別結果',
        confirm_login: '確認登錄'
      },

      'nan': {
        title: '語音登入',
        instruction: '請講出你的手機號碼佮姓名',
        start_recording: '點擊開始錄音',
        recording: '正在錄音...',
        processing: '處理中...',
        success: '語音辨識成功',
        failed: '語音辨識失敗，請重試',
        no_microphone: '無法使用麥克風，請檢查權限',
        speak_clearly: '請講清楚一點',
        supported_dialects: '支持方言',
        dialects_list: '普通話、粵語、閩南語、客家話、四川話',
        result: '辨識結果',
        confirm_login: '確認登入'
      },

      'hakka': {
        title: '語音登錄',
        instruction: '請講出你嘅手機號碼同姓名',
        start_recording: '開始錄音',
        recording: '正在錄音...',
        processing: '處理中...',
        success: '語音辨識成功',
        failed: '語音辨識失敗，請再試',
        no_microphone: '用不到麥克風，請檢查權限',
        speak_clearly: '請講清楚',
        supported_dialects: '支持方言',
        dialects_list: '普通話、粵語、閩南語、客家話、四川話',
        result: '辨識結果',
        confirm_login: '確認登錄'
      },

      'sichuan': {
        title: '语音登录',
        instruction: '请说出你的手机号和名字',
        start_recording: '点开始录音',
        recording: '正在录音...',
        processing: '正在处理...',
        success: '语音识别成功',
        failed: '语音识别失败，再试哈',
        no_microphone: '用不了麦克风，检查下权限',
        speak_clearly: '请说清楚点',
        supported_dialects: '支持方言',
        dialects_list: '普通话、广东话、闽南话、客家话、四川话',
        result: '识别结果',
        confirm_login: '确认登录'
      }
    },

    // 错误消息
    errors: {
      'zh-CN': {
        network_error: '网络异常，请稍后重试',
        server_error: '服务器错误，请稍后重试',
        invalid_phone: '请输入正确的11位手机号',
        invalid_password: '密码长度不能少于6位',
        user_not_found: '用户不存在或账号密码错误',
        account_disabled: '账号已被禁用，请联系管理员',
        account_pending: '账号正在审批中，请联系管理员',
        too_many_attempts: '登录尝试次数过多，请15分钟后再试',
        no_speech_detected: '未检测到语音，请重试',
        microphone_denied: '麦克风权限被拒绝',
        camera_denied: '摄像头权限被拒绝',
        face_not_found: '未检测到人脸，请重试',
        face_match_failed: '人脸匹配失败',
        voice_recognition_failed: '语音识别失败',
        verification_code_error: '验证码错误或已过期',
        registration_failed: '注册失败，请稍后重试'
      },

      'yue': {
        network_error: '網絡異常，請稍後重試',
        server_error: '服務器錯誤，請稍後重試',
        invalid_phone: '請輸入正確嘅11位手機號',
        invalid_password: '密碼長度不能少於6位',
        user_not_found: '用戶不存在或賬號密碼錯誤',
        account_disabled: '賬號已被禁用，請聯繫管理員',
        account_pending: '賬號正在審批中，請聯繫管理員',
        too_many_attempts: '登錄嘗試次數過多，請15分鐘後再試',
        no_speech_detected: '未檢測到語音，請重試',
        microphone_denied: '咪高峰權限被拒絕',
        camera_denied: '鏡頭權限被拒絕',
        face_not_found: '未檢測到人臉，請重試',
        face_match_failed: '人臉匹配失敗',
        voice_recognition_failed: '語音識別失敗',
        verification_code_error: '驗證碼錯誤或已過期',
        registration_failed: '註冊失敗，請稍後重試'
      },

      'nan': {
        network_error: '網路異常，請稍後重試',
        server_error: '伺服器錯誤，請稍後重試',
        invalid_phone: '請輸入正確的11位手機號',
        invalid_password: '密碼長度毋得少過6位',
        user_not_found: '用戶毋存在或帳號密碼錯誤',
        account_disabled: '帳號被禁用，請聯絡管理員',
        account_pending: '帳號正在審批中，請聯絡管理員',
        too_many_attempts: '登入嘗試次數過多，請15分鐘後再試',
        no_speech_detected: '毋檢測到語音，請重試',
        microphone_denied: '麥克風權限被拒絕',
        camera_denied: '鏡頭權限被拒絕',
        face_not_found: '毋檢測到人臉，請重試',
        face_match_failed: '人臉匹配失敗',
        voice_recognition_failed: '語音辨識失敗',
        verification_code_error: '驗證碼錯誤或已過期',
        registration_failed: '註冊失敗，請稍後重試'
      },

      'hakka': {
        network_error: '網絡異常，請等一下再試',
        server_error: '服務器錯誤，請等一下再試',
        invalid_phone: '請輸入對嘅11位手機號',
        invalid_password: '密碼長度唔可以少過6位',
        user_not_found: '用戶毋存在或帳號密碼錯',
        account_disabled: '帳號被禁用，請聯繫管理員',
        account_pending: '帳號正在審批，請聯繫管理員',
        too_many_attempts: '登錄嘗試太多，請等15分鐘再試',
        no_speech_detected: '毋聽到語音，請再試',
        microphone_denied: '麥克風權限被拒絕',
        camera_denied: '鏡頭權限被拒絕',
        face_not_found: '毋看到人面，請再試',
        face_match_failed: '人面匹配失敗',
        voice_recognition_failed: '語音辨識失敗',
        verification_code_error: '驗證碼錯或過期了',
        registration_failed: '註冊失敗，請等一下再試'
      },

      'sichuan': {
        network_error: '网有问题，等哈再试',
        server_error: '服务器出问题，等哈再试',
        invalid_phone: '手机号不对哦，要11位数字',
        invalid_password: '密码太短了，至少6位',
        user_not_found: '找不到用户，或者密码错了',
        account_disabled: '账号被禁用了，找管理员',
        account_pending: '账号还在审核，找管理员',
        too_many_attempts: '试太多次了，等15分钟再来',
        no_speech_detected: '没听到声音，再试哈',
        microphone_denied: '麦克风不让用，检查下权限',
        camera_denied: '摄像头不让用，检查下权限',
        face_not_found: '没看到人脸，再试哈',
        face_match_failed: '人脸对不上',
        voice_recognition_failed: '语音识别失败',
        verification_code_error: '验证码错了或者过期了',
        registration_failed: '注册失败，等哈再试'
      }
    },

    // 成功消息
    success: {
      'zh-CN': {
        login_success: '登录成功！正在跳转...',
        logout_success: '退出登录成功',
        password_reset_success: '密码重置成功',
        code_sent: '验证码已发送',
        profile_updated: '资料更新成功',
        password_changed: '密码修改成功',
        face_registered: '人脸信息注册成功',
        registration_success: '注册成功，等待管理员审批',
        language_switched: '语言切换成功',
        accessibility_enabled: '无障碍模式已启用',
        accessibility_disabled: '无障碍模式已禁用'
      },

      'yue': {
        login_success: '登錄成功！正在跳轉...',
        logout_success: '退出登錄成功',
        password_reset_success: '密碼重置成功',
        code_sent: '驗證碼已發送',
        profile_updated: '資料更新成功',
        password_changed: '密碼修改成功',
        face_registered: '人臉信息註冊成功',
        registration_success: '註冊成功，等待管理員審批',
        language_switched: '語言切換成功',
        accessibility_enabled: '無障礙模式已啟用',
        accessibility_disabled: '無障礙模式已禁用'
      },

      'nan': {
        login_success: '登入成功！正在跳轉...',
        logout_success: '退出登入成功',
        password_reset_success: '密碼重設成功',
        code_sent: '驗證碼已寄送',
        profile_updated: '資料更新成功',
        password_changed: '密碼修改成功',
        face_registered: '人臉信息註冊成功',
        registration_success: '註冊成功，等待管理員審批',
        language_switched: '語言切換成功',
        accessibility_enabled: '無障礙模式已啟用',
        accessibility_disabled: '無障礙模式已禁用'
      },

      'hakka': {
        login_success: '登錄成功！正在跳轉...',
        logout_success: '退出登錄成功',
        password_reset_success: '密碼重置成功',
        code_sent: '驗證碼已發送',
        profile_updated: '資料更新成功',
        password_changed: '密碼修改成功',
        face_registered: '人面信息註冊成功',
        registration_success: '註冊成功，等管理員審批',
        language_switched: '語言切換成功',
        accessibility_enabled: '無障礙模式已開啟',
        accessibility_disabled: '無障礙模式已關閉'
      },

      'sichuan': {
        login_success: '登录成功了！马上跳转...',
        logout_success: '退出登录成功',
        password_reset_success: '密码重置成功',
        code_sent: '验证码发了',
        profile_updated: '资料更新成功',
        password_changed: '密码修改成功',
        face_registered: '人脸信息注册成功',
        registration_success: '注册成功，等管理员审批',
        language_switched: '语言切换成功',
        accessibility_enabled: '无障碍模式开了',
        accessibility_disabled: '无障碍模式关了'
      }
    }
  },

  /**
   * 获取翻译文本
   * @param {string} key - 翻译键，支持点号分隔的嵌套键
   * @param {string} locale - 语言代码，默认使用当前语言
   * @param {Object} params - 参数对象，用于替换文本中的占位符
   * @returns {string} 翻译后的文本
   */
  t(key, locale = null, params = {}) {
    const targetLocale = locale || this.currentLocale;

    // 获取嵌套的翻译对象
    const keys = key.split('.');
    let translation = this.translations;

    for (const k of keys) {
      if (translation && translation[k]) {
        translation = translation[k];
      } else {
        // 如果没找到翻译，尝试使用中文作为后备
        translation = this.getFallbackTranslation(key);
        break;
      }
    }

    // 如果找到了指定语言的翻译
    if (translation && typeof translation === 'object' && translation[targetLocale]) {
      let text = translation[targetLocale];

      // 替换参数
      for (const [param, value] of Object.entries(params)) {
        text = text.replace(new RegExp(`{${param}}`, 'g'), value);
      }

      return text;
    }

    // 后备方案
    return translation || key;
  },

  /**
   * 获取后备翻译（中文）
   */
  getFallbackTranslation(key) {
    const keys = key.split('.');
    let translation = this.translations;

    for (const k of keys) {
      if (translation && translation[k]) {
        translation = translation[k];
      } else {
        return key;
      }
    }

    if (translation && typeof translation === 'object' && translation['zh-CN']) {
      return translation['zh-CN'];
    }

    return key;
  },

  /**
   * 设置当前语言
   * @param {string} locale - 语言代码
   */
  setLocale(locale) {
    if (this.supportedLocales.some(l => l.code === locale)) {
      this.currentLocale = locale;
      return true;
    }
    return false;
  },

  /**
   * 获取当前语言
   */
  getCurrentLocale() {
    return this.currentLocale;
  },

  /**
   * 获取支持的语言列表
   */
  getSupportedLocales() {
    return this.supportedLocales;
  },

  /**
   * 检测用户语言偏好
   * @param {string} userAgent - 用户代理字符串
   * @param {string} acceptLanguage - Accept-Language 头
   * @returns {string} 检测到的语言代码
   */
  detectUserLanguage(userAgent = null, acceptLanguage = null) {
    // 从 Accept-Language 头检测
    if (acceptLanguage) {
      const preferredLanguages = acceptLanguage
        .split(',')
        .map(lang => lang.split(';')[0].trim().toLowerCase());

      for (const prefLang of preferredLanguages) {
        // 检查是否匹配支持的语言
        const supportedLang = this.supportedLocales.find(l =>
          l.code.toLowerCase() === prefLang ||
          prefLang.startsWith(l.code.split('-')[0].toLowerCase())
        );

        if (supportedLang) {
          return supportedLang.code;
        }
      }
    }

    // 从 User-Agent 检测（简化实现）
    if (userAgent) {
      const ua = userAgent.toLowerCase();

      // 检查简体中文环境
      if (ua.includes('zh-cn') || ua.includes('chinese')) {
        return 'zh-CN';
      }

      // 检查繁体中文环境
      if (ua.includes('zh-tw') || ua.includes('zh-hk')) {
        return 'yue';
      }
    }

    // 默认返回中文
    return 'zh-CN';
  },

  /**
   * 获取语言族的方言映射
   * @param {string} family - 语言族
   * @returns {Array} 该语言族的语言列表
   */
  getLocalesByFamily(family) {
    return this.supportedLocales.filter(locale => locale.family === family);
  },

  /**
   * 格式化数字
   * @param {number} number - 要格式化的数字
   * @param {string} locale - 语言代码
   * @returns {string} 格式化后的字符串
   */
  formatNumber(number, locale = null) {
    const targetLocale = locale || this.currentLocale;

    // 根据不同地区的习惯格式化数字
    switch (targetLocale) {
    case 'yue':
    case 'nan':
    case 'hakka':
      // 港台地区习惯
      return number.toLocaleString('zh-TW');
    case 'sichuan':
    case 'zh-CN':
    default:
      return number.toLocaleString('zh-CN');
    }
  },

  /**
   * 获取本地化的时间格式
   * @param {Date} date - 日期对象
   * @param {string} locale - 语言代码
   * @returns {string} 格式化后的时间字符串
   */
  formatTime(date, locale = null) {
    const targetLocale = locale || this.currentLocale;

    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) {
      return this.t('common.just_now', targetLocale);
    } else if (minutes < 60) {
      return this.t('common.minutes_ago', targetLocale, { count: minutes });
    } else if (hours < 24) {
      return this.t('common.hours_ago', targetLocale, { count: hours });
    } else if (days < 7) {
      return this.t('common.days_ago', targetLocale, { count: days });
    } else {
      // 超过一周显示具体日期
      return date.toLocaleDateString(targetLocale === 'zh-CN' ? 'zh-CN' : 'zh-TW');
    }
  }
};

module.exports = i18n;