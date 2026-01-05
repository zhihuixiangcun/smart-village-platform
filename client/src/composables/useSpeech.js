/**
 * 语音交互组合函数 - useSpeech
 *
 * 功能：
 * - 语音识别
 * - 语音播报
 * - 语音命令
 * - 方言支持
 */

import { ref, computed, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import SpeechRecognizer from '@/utils/speechRecognizer';
import SpeechSynthesizer from '@/utils/speechSynthesizer';
import { RECOGNITION_STATUS, COMMAND_TYPES } from '@/utils/speechRecognizer';
import { SYNTHESIS_STATUS } from '@/utils/speechSynthesizer';

export function useSpeech(options = {}) {
  const {
    dialect = 'mandarin',
    speaker = 'female',
    speed = 5,
    autoPlay = true
  } = options;

  // 状态
  const isListening = ref(false);
  const isSpeaking = ref(false);
  const recognitionStatus = ref(RECOGNITION_STATUS.IDLE);
  const synthesisStatus = ref(SYNTHESIS_STATUS.IDLE);
  const recognizedText = ref('');
  const interimText = ref('');
  const currentCommand = ref(null);

  // 实例
  let recognizer = null;
  let synthesizer = null;

  /**
   * 初始化
   */
  const init = () => {
    // 初始化识别器
    recognizer = new SpeechRecognizer({
      dialect
    });

    recognizer.on('statusChange', (status) => {
      recognitionStatus.value = status;
      isListening.value = status === RECOGNITION_STATUS.LISTENING;
    });

    recognizer.on('result', (data) => {
      if (data.isFinal) {
        recognizedText.value = data.text;
        interimText.value = '';
      }
    });

    recognizer.on('interim', (text) => {
      interimText.value = text;
    });

    recognizer.on('error', (error) => {
      ElMessage.error(error.message);
      recognitionStatus.value = RECOGNITION_STATUS.ERROR;
    });

    // 初始化合成器
    synthesizer = new SpeechSynthesizer({
      speaker,
      speed,
      autoPlay
    });

    synthesizer.on('statusChange', (status) => {
      synthesisStatus.value = status;
      isSpeaking.value = status === SYNTHESIS_STATUS.PLAYING;
    });

    synthesizer.on('error', (error) => {
      ElMessage.error(error.message);
    });
  };

  /**
   * 开始识别
   */
  const startListening = () => {
    if (!recognizer) {
      init();
    }

    recognizedText.value = '';
    interimText.value = '';
    currentCommand.value = null;

    return recognizer.start();
  };

  /**
   * 停止识别
   */
  const stopListening = () => {
    if (recognizer) {
      recognizer.stop();
    }
  };

  /**
   * 朗读文本
   */
  const speak = (text) => {
    if (!synthesizer) {
      init();
    }

    return synthesizer.speak(text);
  };

  /**
   * 停止朗读
   */
  const stopSpeaking = () => {
    if (synthesizer) {
      synthesizer.stop();
    }
  };

  /**
   * 暂停朗读
   */
  const pauseSpeaking = () => {
    if (synthesizer) {
      synthesizer.pause();
    }
  };

  /**
   * 恢复朗读
   */
  const resumeSpeaking = () => {
    if (synthesizer) {
      synthesizer.resume();
    }
  };

  /**
   * 解析语音命令
   */
  const parseCommand = (text) => {
    if (!recognizer) {
      init();
    }

    const command = recognizer.parseCommand(text);
    currentCommand.value = command;
    return command;
  };

  /**
   * 执行语音命令
   */
  const executeCommand = async (text, handlers = {}) => {
    const command = parseCommand(text);

    if (!command) {
      ElMessage.warning('未识别到有效命令');
      return null;
    }

    const { type, target } = command;

    // 根据命令类型执行对应处理
    const handler = handlers[type];
    if (handler && typeof handler === 'function') {
      try {
        const result = await handler(command);
        return result;
      } catch (error) {
        ElMessage.error(`命令执行失败: ${  error.message}`);
        throw error;
      }
    } else {
      ElMessage.warning(`未实现的命令类型: ${type}`);
      return null;
    }
  };

  /**
   * 设置方言
   */
  const setDialect = (dialectCode) => {
    if (recognizer) {
      recognizer.setDialect(dialectCode);
    }
  };

  /**
   * 设置发音人
   */
  const setSpeaker = (speakerCode) => {
    if (synthesizer) {
      synthesizer.setSpeaker(speakerCode);
    }
  };

  /**
   * 设置语速
   */
  const setSpeed = (speedValue) => {
    if (synthesizer) {
      synthesizer.setSpeed(speedValue);
    }
  };

  /**
   * 批量朗读
   */
  const speakBatch = async (texts) => {
    if (!synthesizer) {
      init();
    }

    return synthesizer.speakBatch(texts);
  };

  /**
   * 检查浏览器支持
   */
  const checkSupport = () => {
    const recognitionSupported = SpeechRecognizer.isSupported();
    const synthesisSupported = SpeechSynthesizer.isSupported();

    return {
      recognition: recognitionSupported,
      synthesis: synthesisSupported,
      all: recognitionSupported && synthesisSupported
    };
  };

  /**
   * 检查麦克风权限
   */
  const checkMicrophonePermission = async () => {
    return await SpeechRecognizer.checkMicrophonePermission();
  };

  /**
   * 获取支持的方言
   */
  const getSupportedDialects = () => {
    if (!recognizer) {
      init();
    }
    return recognizer.getSupportedDialects();
  };

  /**
   * 获取支持的发音人
   */
  const getSupportedSpeakers = () => {
    if (!synthesizer) {
      init();
    }
    return synthesizer.getSupportedSpeakers();
  };

  /**
   * 清理资源
   */
  onUnmounted(() => {
    if (recognizer) {
      recognizer.destroy();
    }
    if (synthesizer) {
      synthesizer.destroy();
    }
  });

  /**
   * 计算属性
   */
  const canListen = computed(() => {
    return recognitionStatus.value !== RECOGNITION_STATUS.LISTENING &&
           recognitionStatus.value !== RECOGNITION_STATUS.PROCESSING;
  });

  const canSpeak = computed(() => {
    return synthesisStatus.value !== SYNTHESIS_STATUS.SYNTHESIZING &&
           synthesisStatus.value !== SYNTHESIS_STATUS.PLAYING;
  });

  const statusText = computed(() => {
    if (isListening.value) return '正在聆听...';
    if (isSpeaking.value) return '正在播报...';
    if (recognitionStatus.value === RECOGNITION_STATUS.PROCESSING) return '正在识别...';
    if (synthesisStatus.value === SYNTHESIS_STATUS.SYNTHESIZING) return '正在合成...';
    return '就绪';
  });

  return {
    // 状态
    isListening,
    isSpeaking,
    recognitionStatus,
    synthesisStatus,
    recognizedText,
    interimText,
    currentCommand,

    // 计算属性
    canListen,
    canSpeak,
    statusText,

    // 方法
    init,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    parseCommand,
    executeCommand,
    setDialect,
    setSpeaker,
    setSpeed,
    speakBatch,
    checkSupport,
    checkMicrophonePermission,
    getSupportedDialects,
    getSupportedSpeakers,

    // 常量
    RECOGNITION_STATUS,
    SYNTHESIS_STATUS,
    COMMAND_TYPES
  };
}
