/**
 * 语音输入 Composable
 * 支持方言识别的语音输入功能
 */
import { ref } from 'vue';
import { ElMessage } from 'element-plus';

export function useVoiceInput() {
  const isListening = ref(false);
  const recognizedText = ref('');
  const isSupported = ref(false);

  // 检查浏览器支持
  const checkSupport = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    isSupported.value = !!SpeechRecognition;
    return isSupported.value;
  };

  // 开始语音识别
  const startListening = (options = {}) => {
    return new Promise((resolve, reject) => {
      if (!checkSupport()) {
        ElMessage.error('您的浏览器不支持语音识别功能');
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      // 配置
      recognition.lang = options.lang || 'zh-CN'; // 支持方言: zh-CN, zh-cantonese等
      recognition.continuous = options.continuous || false;
      recognition.interimResults = options.interimResults || true;
      recognition.maxAlternatives = 1;

      // 事件监听
      recognition.onstart = () => {
        isListening.value = true;
        ElMessage.info('正在聆听,请说话...');
      };

      recognition.onresult = (event) => {
        const results = event.results;
        const latest = results[results.length - 1];
        const transcript = latest[0].transcript;

        recognizedText.value = transcript;

        if (latest.isFinal) {
          isListening.value = false;
          resolve(transcript);
        }
      };

      recognition.onerror = (event) => {
        isListening.value = false;
        ElMessage.error(`语音识别失败: ${event.error}`);
        reject(new Error(event.error));
      };

      recognition.onend = () => {
        isListening.value = false;
      };

      // 开始识别
      try {
        recognition.start();
      } catch (error) {
        ElMessage.error('启动语音识别失败');
        reject(error);
      }
    });
  };

  // 停止语音识别
  const stopListening = () => {
    // 在实际实现中需要保存recognition实例并调用stop()
    isListening.value = false;
  };

  // 语音意图解析
  const parseVoiceIntent = (text) => {
    const lowerText = text.toLowerCase();

    // 功能意图
    const intents = {
      // 一户一码
      '一户一码|家庭二维码|扫码': { action: 'navigate', route: '/my-qrcode' },
      // 我的证件
      '我的证件|证件|身份证': { action: 'navigate', route: '/my-documents' },
      // 办事大厅
      '办事大厅|在线办事|办事': { action: 'navigate', route: '/services' },
      // 补贴查询
      '补贴|补贴查询|领补贴': { action: 'navigate', route: '/subsidy' },
      // 家庭档案
      '家庭档案|家庭成员|家人': { action: 'navigate', route: '/family' },
      // 医疗服务
      '医疗|看病|医院|医生': { action: 'navigate', route: '/medical' },
      // 编辑资料
      '编辑|修改|更新资料': { action: 'edit', field: 'profile' },
      // 大字模式
      '大字|大字体|放大|字体变大': { action: 'toggle', feature: 'largeText' },
      // 搜索
      '搜索|查找|查询': { action: 'search', query: extractQuery(text) }
    };

    // 匹配意图
    for (const [pattern, intent] of Object.entries(intents)) {
      const regex = new RegExp(pattern);
      if (regex.test(lowerText)) {
        return { ...intent, originalText: text };
      }
    }

    // 未匹配到意图
    return { action: 'unknown', originalText: text };
  };

  // 提取搜索关键词
  const extractQuery = (text) => {
    const patterns = ['搜索', '查找', '查询', '找'];
    for (const pattern of patterns) {
      const index = text.indexOf(pattern);
      if (index !== -1) {
        return text.substring(index + pattern.length).trim();
      }
    }
    return text;
  };

  return {
    isListening,
    recognizedText,
    isSupported,
    startListening,
    stopListening,
    parseVoiceIntent
  };
}

export default useVoiceInput;
