import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';

/**
 * 语音识别组合式函数
 * 支持普通话和方言识别
 */
export function useSpeechRecognition() {
  // 识别状态
  const isSupported = ref(false);
  const isListening = ref(false);
  const isProcessing = ref(false);
  const error = ref(null);

  // 识别结果
  const transcript = ref('');
  const interimTranscript = ref('');
  const finalTranscript = ref('');
  const confidence = ref(0);

  // 语音识别实例
  let recognition = null;
  let timeoutId = null;

  // 支持的语言配置
  const languages = reactive({
    'zh-CN': '普通话',
    'zh-TW': '繁体中文',
    'zh-HK': '粤语',
    'zh-YUE': '粤语',
    'en-US': '英语'
  });

  // 当前语言设置
  const currentLanguage = ref('zh-CN');
  const autoStopDelay = ref(3000); // 自动停止延迟时间（毫秒）

  // 语音识别配置
  const config = reactive({
    continuous: true,           // 持续识别
    interimResults: true,       // 显示临时结果
    maxAlternatives: 3,         // 最大备选项数量
    grammars: null,            // 语法规则
    serviceURI: null           // 服务URI
  });

  // 检查浏览器支持
  const checkSupport = () => {
    if ('webkitSpeechRecognition' in window) {
      isSupported.value = true;
      return true;
    } else if ('SpeechRecognition' in window) {
      isSupported.value = true;
      return true;
    } else {
      isSupported.value = false;
      error.value = '您的浏览器不支持语音识别功能';
      return false;
    }
  };

  // 初始化语音识别
  const initializeRecognition = () => {
    if (!checkSupport()) return false;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();

    // 配置识别参数
    recognition.continuous = config.continuous;
    recognition.interimResults = config.interimResults;
    recognition.maxAlternatives = config.maxAlternatives;
    recognition.lang = currentLanguage.value;

    // 识别开始
    recognition.onstart = () => {
      isListening.value = true;
      isProcessing.value = false;
      error.value = null;
      interimTranscript.value = '';
      console.log('语音识别开始');
    };

    // 识别结果
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];

        if (result.isFinal) {
          final += result[0].transcript;
          confidence.value = result[0].confidence * 100;
        } else {
          interim += result[0].transcript;
        }
      }

      interimTranscript.value = interim;

      if (final) {
        finalTranscript.value = final;
        transcript.value = final;

        // 设置自动停止计时器
        if (autoStopDelay.value > 0) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            if (isListening.value) {
              stopListening();
            }
          }, autoStopDelay.value);
        }
      }
    };

    // 识别错误
    recognition.onerror = (event) => {
      isProcessing.value = false;

      const errorMessages = {
        'no-speech': '未检测到语音，请重试',
        'audio-capture': '无法访问麦克风',
        'not-allowed': '麦克风访问被拒绝，请检查权限设置',
        'network': '网络连接错误',
        'aborted': '语音识别已取消',
        'language-not-supported': '不支持当前语言',
        'service-not-allowed': '语音识别服务不可用'
      };

      error.value = errorMessages[event.error] || `识别错误: ${event.error}`;
      ElMessage.error(error.value);
      console.error('语音识别错误:', event.error);
    };

    // 识别结束
    recognition.onend = () => {
      isListening.value = false;
      isProcessing.value = false;
      clearTimeout(timeoutId);
      console.log('语音识别结束');
    };

    return true;
  };

  // 开始监听
  const startListening = (options = {}) => {
    if (!recognition) {
      if (!initializeRecognition()) {
        return false;
      }
    }

    if (isListening.value) {
      ElMessage.warning('语音识别正在进行中');
      return false;
    }

    // 应用临时配置
    if (options.language) {
      recognition.lang = options.language;
    }
    if (options.continuous !== undefined) {
      recognition.continuous = options.continuous;
    }

    try {
      isProcessing.value = true;
      transcript.value = '';
      interimTranscript.value = '';
      finalTranscript.value = '';
      confidence.value = 0;
      error.value = null;

      recognition.start();
      return true;
    } catch (err) {
      isProcessing.value = false;
      error.value = '启动语音识别失败';
      ElMessage.error(error.value);
      console.error('启动语音识别失败:', err);
      return false;
    }
  };

  // 停止监听
  const stopListening = () => {
    if (recognition && isListening.value) {
      recognition.stop();
      clearTimeout(timeoutId);
    }
  };

  // 取消识别
  const abortListening = () => {
    if (recognition && isListening.value) {
      recognition.abort();
      clearTimeout(timeoutId);
    }
  };

  // 重置状态
  const reset = () => {
    stopListening();
    transcript.value = '';
    interimTranscript.value = '';
    finalTranscript.value = '';
    confidence.value = 0;
    error.value = null;
  };

  // 切换语言
  const setLanguage = (lang) => {
    if (languages[lang]) {
      currentLanguage.value = lang;
      if (recognition) {
        recognition.lang = lang;
      }
      return true;
    }
    return false;
  };

  // 方言识别优化
  const dialectOptimization = {
    // 粤语优化
    'zh-HK': {
      commonPhrases: ['系啊', '唔系', '点解', '乜嘢', '边度'],
      replacements: {
        '系': '是',
        '唔系': '不是',
        '点解': '为什么',
        '乜嘢': '什么',
        '边度': '哪里'
      }
    },
    // 可以扩展其他方言
  };

  // 处理方言转换
  const processDialect = (text) => {
    const dialect = dialectOptimization[currentLanguage.value];
    if (!dialect) return text;

    let processedText = text;
    Object.entries(dialect.replacements).forEach(([from, to]) => {
      processedText = processedText.replace(new RegExp(from, 'g'), to);
    });

    return processedText;
  };

  // 智能断句
  const smartSegmentation = (text) => {
    // 基于标点符号和语音停顿进行智能断句
    return text
      .replace(/([。！？；])\s*/g, '$1\n')
      .replace(/([，、])\s*/g, '$1 ')
      .trim();
  };

  // 语音命令识别
  const commandPatterns = {
    '删除': (text) => text.replace(/删除(.*)/, ''),
    '清空': () => '',
    '重新开始': () => '',
    '提交': (text) => ({ action: 'submit', text }),
    '保存': (text) => ({ action: 'save', text }),
    '取消': () => ({ action: 'cancel', text: '' })
  };

  // 处理语音命令
  const processCommand = (text) => {
    for (const [command, handler] of Object.entries(commandPatterns)) {
      if (text.includes(command)) {
        return handler(text);
      }
    }
    return text;
  };

  // 计算属性
  const displayText = computed(() => {
    const processed = processDialect(transcript.value);
    return smartSegmentation(processed);
  });

  const isActive = computed(() => isListening.value || isProcessing.value);

  const supportedLanguages = computed(() => Object.entries(languages));

  const canStart = computed(() => isSupported.value && !isActive.value);

  // 生命周期
  onMounted(() => {
    checkSupport();
  });

  onUnmounted(() => {
    if (recognition) {
      recognition.abort();
    }
    clearTimeout(timeoutId);
  });

  return {
    // 状态
    isSupported,
    isListening,
    isProcessing,
    error,
    isActive,
    canStart,

    // 结果
    transcript,
    interimTranscript,
    finalTranscript,
    confidence,
    displayText,

    // 配置
    currentLanguage,
    supportedLanguages,
    autoStopDelay,

    // 方法
    startListening,
    stopListening,
    abortListening,
    reset,
    setLanguage,
    processCommand,

    // 工具方法
    checkSupport,
    processDialect,
    smartSegmentation
  };
}

/**
 * 语音输入组件专用组合函数
 */
export function useSpeechInput(targetRef) {
  const {
    isSupported,
    isListening,
    isProcessing,
    transcript,
    interimTranscript,
    confidence,
    startListening,
    stopListening,
    reset,
    setLanguage
  } = useSpeechRecognition();

  // 插入文本到目标元素
  const insertTextAtCursor = (text) => {
    if (!targetRef?.value) return;

    const element = targetRef.value;

    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      const start = element.selectionStart;
      const end = element.selectionEnd;
      const currentValue = element.value;

      const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
      element.value = newValue;

      // 设置光标位置
      const newCursorPos = start + text.length;
      element.setSelectionRange(newCursorPos, newCursorPos);

      // 触发input事件
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  // 开始语音输入
  const startSpeechInput = (options = {}) => {
    return startListening({
      continuous: false,
      ...options
    });
  };

  // 确认输入
  const confirmInput = () => {
    if (transcript.value.trim()) {
      insertTextAtCursor(transcript.value);
      reset();
      ElMessage.success('语音输入完成');
    }
  };

  // 取消输入
  const cancelInput = () => {
    stopListening();
    reset();
  };

  return {
    isSupported,
    isListening,
    isProcessing,
    transcript,
    interimTranscript,
    confidence,
    startSpeechInput,
    stopListening,
    confirmInput,
    cancelInput,
    setLanguage,
    insertTextAtCursor
  };
}