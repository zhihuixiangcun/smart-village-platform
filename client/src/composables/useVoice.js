/**
 * 智慧乡村语音交互 Composable (精简版)
 * 专注于核心功能：录音管理、识别处理、命令执行、历史记录
 */

import { ref, reactive, computed, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import axios from 'axios';

/**
 * useVoice - 语音交互Composable
 *
 * 功能：
 * 1. 管理录音状态
 * 2. 处理语音识别结果
 * 3. 执行语音命令（如"跳转到首页"）
 * 4. 保存语音历史记录
 *
 * @param {Object} options - 配置选项
 * @returns {Object} - 语音交互API
 */
export function useVoice(options = {}) {
  // ==================== 配置选项 ====================
  const config = {
    backendUrl: options.backendUrl || 'http://localhost:3001',
    maxRecordingDuration: options.maxRecordingDuration || 60000, // 60秒
    autoStopSilence: options.autoStopSilence !== false, // 自动静音停止
    silenceThreshold: options.silenceThreshold || 0.01, // 静音阈值
    silenceTimeout: options.silenceTimeout || 3000, // 静音超时（秒）
    autoPlayResponse: options.autoPlayResponse !== false, // 自动播放响应
    saveHistory: options.saveHistory !== false, // 保存历史记录
    maxHistoryLength: options.maxHistoryLength || 100, // 最大历史记录数
    dialect: options.dialect || 'zh', // 方言代码
    ...options,
  };

  // ==================== 路由实例 ====================
  const router = useRouter();

  // ==================== 状态管理 ====================
  const state = reactive({
    // 录音状态
    isRecording: false,
    isProcessing: false,
    isPlaying: false,

    // 权限状态
    hasPermission: false,
    isSupported: false,

    // 音频数据
    audioLevel: 0, // 0-1，实时音量级别
    recordingTime: 0, // 录音时长（毫秒）

    // 识别结果
    lastTranscript: '', // 最后识别的文字
    lastInterimTranscript: '', // 最后的临时识别结果
    confidence: 0, // 识别置信度 0-1

    // 对话状态
    commandExecuted: null, // 执行的命令
    errorMessage: '', // 错误消息
  });

  // ==================== 语音历史记录 ====================
  const history = ref([]);

  // ==================== 音频相关 ====================
  const audioContext = ref(null);
  const mediaRecorder = ref(null);
  const audioStream = ref(null);
  const analyser = ref(null);
  const microphone = ref(null);
  const animationFrameId = ref(null);

  // ==================== 定时器 ====================
  const recordingTimer = ref(null);
  const silenceTimer = ref(null);
  const audioLevelTimer = ref(null);

  // ==================== 录音数据 ====================
  const audioChunks = ref([]);
  const silenceStartTime = ref(null);

  // ==================== 计算属性 ====================
  const isIdle = computed(() => !state.isRecording && !state.isProcessing);
  const recordingDuration = computed(() => (state.recordingTime / 1000).toFixed(1));
  const canRecord = computed(() => state.isSupported && state.hasPermission);
  const hasTranscript = computed(() => state.lastTranscript.length > 0);

  // ==================== 初始化 ====================
  /**
   * 初始化语音服务
   */
  const initialize = async () => {
    try {
      console.log('🎤 初始化语音服务...');

      // 1. 检查浏览器支持
      const supported = checkBrowserSupport();
      if (!supported) {
        throw new Error('您的浏览器不支持语音功能');
      }

      // 2. 请求麦克风权限
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) {
        throw new Error('请允许使用麦克风权限');
      }

      // 3. 初始化音频上下文
      await initializeAudioContext();

      // 4. 加载历史记录
      if (config.saveHistory) {
        loadHistoryFromStorage();
      }

      console.log('✅ 语音服务初始化完成');
      ElMessage.success('语音服务初始化成功');

      return true;
    } catch (error) {
      console.error('❌ 语音服务初始化失败:', error);
      state.errorMessage = error.message;
      ElMessage.error(error.message);
      return false;
    }
  };

  /**
   * 检查浏览器支持
   */
  const checkBrowserSupport = () => {
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);

    state.isSupported = hasGetUserMedia && hasMediaRecorder && hasAudioContext;

    console.log('浏览器支持检查:', {
      getUserMedia: hasGetUserMedia,
      MediaRecorder: hasMediaRecorder,
      AudioContext: hasAudioContext,
      fullySupported: state.isSupported,
    });

    return state.isSupported;
  };

  /**
   * 请求麦克风权限
   */
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      // 停止测试流
      stream.getTracks().forEach(track => track.stop());

      state.hasPermission = true;
      return true;
    } catch (error) {
      console.error('麦克风权限请求失败:', error);
      state.hasPermission = false;
      return false;
    }
  };

  /**
   * 初始化音频上下文
   */
  const initializeAudioContext = async () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContext.value = new AudioContext();

      // 创建分析器
      analyser.value = audioContext.value.createAnalyser();
      analyser.value.fftSize = 256;
      analyser.value.smoothingTimeConstant = 0.8;

      console.log('音频上下文初始化完成');
    } catch (error) {
      console.error('音频上下文初始化失败:', error);
      throw error;
    }
  };

  // ==================== 录音控制 ====================
  /**
   * 开始录音
   */
  const startRecording = async () => {
    try {
      if (state.isRecording) {
        console.warn('已经在录音中');
        return;
      }

      if (!state.hasPermission) {
        const granted = await requestMicrophonePermission();
        if (!granted) {
          throw new Error('请先允许使用麦克风');
        }
      }

      console.log('🎙️ 开始录音...');

      // 获取音频流
      audioStream.value = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      // 创建录音器
      const mimeType = getSupportedMimeType();
      mediaRecorder.value = new MediaRecorder(audioStream.value, { mimeType });

      // 重置音频数据
      audioChunks.value = [];
      silenceStartTime.value = null;
      state.lastInterimTranscript = '';
      state.recordingTime = 0;
      state.audioLevel = 0;

      // 收集音频数据
      mediaRecorder.value.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunks.value.push(event.data);
        }
      };

      // 录音结束处理
      mediaRecorder.value.onstop = async () => {
        console.log('录音结束，开始处理...');
        await handleRecordingEnd();
      };

      // 连接音频分析器
      const source = audioContext.value.createMediaStreamSource(audioStream.value);
      source.connect(analyser.value);

      // 开始录音
      mediaRecorder.value.start(100); // 每100ms收集一次数据
      state.isRecording = true;

      // 启动监听器
      startAudioLevelMonitoring();
      startRecordingTimer();
      if (config.autoStopSilence) {
        startSilenceDetection();
      }

      console.log('录音已开始');
    } catch (error) {
      console.error('开始录音失败:', error);
      state.errorMessage = error.message;
      ElMessage.error(`开始录音失败: ${error.message}`);
    }
  };

  /**
   * 停止录音
   */
  const stopRecording = () => {
    try {
      if (!state.isRecording || !mediaRecorder.value) {
        console.warn('当前没有在录音');
        return;
      }

      console.log('⏹️ 停止录音...');

      mediaRecorder.value.stop();
      state.isRecording = false;

      // 停止监听器
      stopAudioLevelMonitoring();
      stopRecordingTimer();
      stopSilenceDetection();

      // 停止音频流
      if (audioStream.value) {
        audioStream.value.getTracks().forEach(track => track.stop());
        audioStream.value = null;
      }

      console.log('录音已停止');
    } catch (error) {
      console.error('停止录音失败:', error);
    }
  };

  /**
   * 录音结束处理
   */
  const handleRecordingEnd = async () => {
    try {
      if (audioChunks.value.length === 0) {
        console.warn('没有录制到音频数据');
        return;
      }

      state.isProcessing = true;
      console.log('🔄 处理录音数据...');

      // 创建音频Blob
      const mimeType = getSupportedMimeType();
      const audioBlob = new Blob(audioChunks.value, { type: mimeType });

      // 发送到后端识别
      await processAudioData(audioBlob);
    } catch (error) {
      console.error('录音结束处理失败:', error);
      state.isProcessing = false;
      state.errorMessage = error.message;
      ElMessage.error(`语音处理失败: ${error.message}`);
    }
  };

  // ==================== 音频处理 ====================
  /**
   * 处理音频数据（识别和命令执行）
   */
  const processAudioData = async audioBlob => {
    try {
      // 1. 语音识别
      const recognitionResult = await recognizeSpeech(audioBlob);
      state.lastTranscript = recognitionResult.text;
      state.confidence = recognitionResult.confidence || 0.8;

      console.log(`识别结果: "${recognitionResult.text}" (置信度: ${state.confidence})`);

      // 2. 保存到历史记录
      if (config.saveHistory && recognitionResult.text) {
        saveToHistory({
          type: 'recognition',
          text: recognitionResult.text,
          confidence: state.confidence,
          timestamp: new Date().toISOString(),
          dialect: config.dialect,
        });
      }

      // 3. 解析语音命令
      const command = parseVoiceCommand(recognitionResult.text);

      // 4. 执行命令
      if (command && command.valid) {
        console.log('识别到命令:', command);
        await executeCommand(command);
      }

      state.isProcessing = false;
    } catch (error) {
      console.error('音频数据处理失败:', error);
      state.isProcessing = false;
      throw error;
    }
  };

  /**
   * 语音识别
   */
  const recognizeSpeech = async audioBlob => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('language', 'zh-CN');
      formData.append('dialect', config.dialect);
      formData.append('sampleRate', '16000');
      formData.append('format', 'wav');

      // 调用后端语音识别API
      const response = await axios.post(
        `${config.backendUrl}/api/speech/recognize`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 10000, // 10秒超时
        }
      );

      if (response.data.success) {
        return {
          text: response.data.data.text,
          confidence: response.data.data.confidence || 0.8,
          language: response.data.data.language,
          dialect: response.data.data.dialect,
        };
      } else {
        throw new Error(response.data.message || '语音识别失败');
      }
    } catch (error) {
      console.error('语音识别失败:', error);

      // 如果API失败，尝试使用Web Speech API
      return await fallbackSpeechRecognition();
    }
  };

  /**
   * 备用语音识别（Web Speech API）
   */
  const fallbackSpeechRecognition = () => {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('浏览器不支持语音识别'));
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = event => {
        const transcript = event.results[0][0].transcript;
        resolve({
          text: transcript,
          confidence: event.results[0][0].confidence || 0.5,
          language: recognition.lang,
          dialect: 'unknown',
        });
      };

      recognition.onerror = event => {
        reject(new Error(`语音识别错误: ${event.error}`));
      };

      recognition.start();
    });
  };

  // ==================== 命令处理 ====================
  /**
   * 解析语音命令
   */
  const parseVoiceCommand = text => {
    const cleanedText = text.trim().toLowerCase();

    // 导航命令模式
    const navigatePatterns = {
      home: /首页|主页|开始|回到首页/,
      villager: /村民|村民管理|村民信息/,
      finance: /财务|财务管理|财务公开/,
      notice: /公告|通知|村务公告/,
      service: /服务|办事|在线办事/,
      settings: /设置|个人设置|我的设置/,
      profile: /个人|个人中心|我的/,
    };

    // 查询命令模式
    const queryPatterns = {
      weather: /天气|温度|降雨/,
      news: /新闻|最新消息|村情/,
      policy: /政策|补贴|福利/,
    };

    // 动作命令模式
    const actionPatterns = {
      help: /帮助|怎么用|使用指南|指导/,
      emergency: /紧急|求救|报警|急救|救命/,
      report: /上报|反映问题|投诉/,
    };

    // 匹配命令
    let matchedCommand = null;

    // 优先检查导航命令
    for (const [action, pattern] of Object.entries(navigatePatterns)) {
      if (pattern.test(cleanedText)) {
        matchedCommand = {
          type: 'navigate',
          action: action,
          target: getRoutePath(action),
          valid: true,
        };
        break;
      }
    }

    // 检查查询命令
    if (!matchedCommand) {
      for (const [action, pattern] of Object.entries(queryPatterns)) {
        if (pattern.test(cleanedText)) {
          matchedCommand = {
            type: 'query',
            action: action,
            text: text,
            valid: true,
          };
          break;
        }
      }
    }

    // 检查动作命令
    if (!matchedCommand) {
      for (const [action, pattern] of Object.entries(actionPatterns)) {
        if (pattern.test(cleanedText)) {
          matchedCommand = {
            type: 'action',
            action: action,
            text: text,
            valid: true,
          };
          break;
        }
      }
    }

    return matchedCommand || { valid: false, originalText: text };
  };

  /**
   * 获取路由路径
   */
  const getRoutePath = action => {
    const routeMap = {
      home: '/',
      villager: '/villagers',
      finance: '/finance',
      notice: '/notices',
      service: '/services',
      settings: '/settings',
      profile: '/profile',
    };
    return routeMap[action] || '/';
  };

  /**
   * 执行命令
   */
  const executeCommand = async command => {
    try {
      console.log('执行命令:', command);

      state.commandExecuted = command;

      // 保存命令到历史记录
      if (config.saveHistory) {
        saveToHistory({
          type: 'command',
          command: command,
          timestamp: new Date().toISOString(),
        });
      }

      // 根据命令类型执行不同操作
      switch (command.type) {
        case 'navigate':
          await executeNavigateCommand(command);
          break;
        case 'query':
          await executeQueryCommand(command);
          break;
        case 'action':
          await executeActionCommand(command);
          break;
        default:
          console.warn('未知命令类型:', command.type);
      }

      ElMessage.success(`已执行: ${command.action}`);
    } catch (error) {
      console.error('命令执行失败:', error);
      state.errorMessage = error.message;
      ElMessage.error(`命令执行失败: ${error.message}`);
    }
  };

  /**
   * 执行导航命令
   */
  const executeNavigateCommand = async command => {
    try {
      console.log(`跳转到: ${command.target}`);
      await router.push(command.target);
    } catch (error) {
      console.error('导航失败:', error);
      throw new Error(`无法跳转到 ${command.target}`);
    }
  };

  /**
   * 执行查询命令
   */
  const executeQueryCommand = async command => {
    try {
      // 根据查询类型执行相应操作
      console.log(`执行查询: ${command.action}`);

      // 这里可以调用后端API获取数据
      // 例如：查询天气、新闻、政策等

      ElMessage.info(`正在查询: ${command.text}`);
    } catch (error) {
      console.error('查询失败:', error);
      throw error;
    }
  };

  /**
   * 执行动作命令
   */
  const executeActionCommand = async command => {
    try {
      console.log(`执行动作: ${command.action}`);

      switch (command.action) {
        case 'help':
          await router.push('/help');
          break;
        case 'emergency':
          await handleEmergency();
          break;
        case 'report':
          await router.push('/report');
          break;
        default:
          console.warn('未知动作:', command.action);
      }
    } catch (error) {
      console.error('动作执行失败:', error);
      throw error;
    }
  };

  /**
   * 处理紧急求助
   */
  const handleEmergency = async () => {
    try {
      ElMessageBox.confirm(
        '确定要发起紧急求助吗？',
        '紧急求助',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      ).then(async () => {
        // 发送紧急求助请求
        await axios.post(`${config.backendUrl}/api/emergency/create`, {
          type: 'emergency',
          timestamp: new Date().toISOString(),
        });

        ElMessage.success('紧急求助已发送，请保持冷静！');

        // 保存到历史记录
        if (config.saveHistory) {
          saveToHistory({
            type: 'emergency',
            timestamp: new Date().toISOString(),
          });
        }
      });
    } catch (error) {
      console.error('紧急求助处理失败:', error);
      throw error;
    }
  };

  // ==================== 监听器 ====================
  /**
   * 开始音频级别监听
   */
  const startAudioLevelMonitoring = () => {
    const updateAudioLevel = () => {
      if (!state.isRecording || !analyser.value) return;

      const dataArray = new Uint8Array(analyser.value.frequencyBinCount);
      analyser.value.getByteFrequencyData(dataArray);

      // 计算平均音量级别
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      state.audioLevel = average / 255; // 归一化到0-1

      animationFrameId.value = requestAnimationFrame(updateAudioLevel);
    };

    updateAudioLevel();
  };

  /**
   * 停止音频级别监听
   */
  const stopAudioLevelMonitoring = () => {
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value);
      animationFrameId.value = null;
    }
    state.audioLevel = 0;
  };

  /**
   * 开始录音计时
   */
  const startRecordingTimer = () => {
    recordingTimer.value = setInterval(() => {
      state.recordingTime += 100;

      // 检查最大录音时长
      if (state.recordingTime >= config.maxRecordingDuration) {
        console.log('达到最大录音时长，自动停止');
        stopRecording();
      }
    }, 100);
  };

  /**
   * 停止录音计时
   */
  const stopRecordingTimer = () => {
    if (recordingTimer.value) {
      clearInterval(recordingTimer.value);
      recordingTimer.value = null;
    }
  };

  /**
   * 开始静音检测
   */
  const startSilenceDetection = () => {
    const checkSilence = () => {
      if (!state.isRecording) return;

      if (state.audioLevel < config.silenceThreshold) {
        if (!silenceStartTime.value) {
          silenceStartTime.value = Date.now();
        } else if (Date.now() - silenceStartTime.value > config.silenceTimeout) {
          console.log('检测到静音，自动停止录音');
          stopRecording();
        }
      } else {
        silenceStartTime.value = null;
      }

      audioLevelTimer.value = setTimeout(checkSilence, 100);
    };

    checkSilence();
  };

  /**
   * 停止静音检测
   */
  const stopSilenceDetection = () => {
    if (audioLevelTimer.value) {
      clearTimeout(audioLevelTimer.value);
      audioLevelTimer.value = null;
    }
    silenceStartTime.value = null;
  };

  // ==================== 历史记录管理 ====================
  /**
   * 保存到历史记录
   */
  const saveToHistory = item => {
    history.value.unshift(item);

    // 限制历史记录长度
    if (history.value.length > config.maxHistoryLength) {
      history.value = history.value.slice(0, config.maxHistoryLength);
    }

    // 保存到本地存储
    if (config.saveHistory) {
      saveHistoryToStorage();
    }

    console.log('保存到历史记录:', item);
  };

  /**
   * 保存历史记录到本地存储
   */
  const saveHistoryToStorage = () => {
    try {
      const data = JSON.stringify(history.value);
      localStorage.setItem('voice_history', data);
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  };

  /**
   * 从本地存储加载历史记录
   */
  const loadHistoryFromStorage = () => {
    try {
      const data = localStorage.getItem('voice_history');
      if (data) {
        history.value = JSON.parse(data);
        console.log(`加载了 ${history.value.length} 条历史记录`);
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
  };

  /**
   * 清空历史记录
   */
  const clearHistory = () => {
    history.value = [];
    localStorage.removeItem('voice_history');
    console.log('历史记录已清空');
  };

  /**
   * 导出历史记录
   */
  const exportHistory = () => {
    try {
      const data = JSON.stringify(history.value, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `voice-history-${Date.now()}.json`;
      link.click();

      URL.revokeObjectURL(url);
      ElMessage.success('历史记录导出成功');
    } catch (error) {
      console.error('导出历史记录失败:', error);
      ElMessage.error('导出历史记录失败');
    }
  };

  // ==================== 工具函数 ====================
  /**
   * 获取支持的MIME类型
   */
  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  };

  // ==================== 清理 ====================
  /**
   * 清理资源
   */
  const cleanup = () => {
    console.log('🧹 清理语音资源...');

    // 停止录音
    if (state.isRecording) {
      stopRecording();
    }

    // 停止所有监听器
    stopAudioLevelMonitoring();
    stopRecordingTimer();
    stopSilenceDetection();

    // 关闭音频流
    if (audioStream.value) {
      audioStream.value.getTracks().forEach(track => track.stop());
      audioStream.value = null;
    }

    // 关闭音频上下文
    if (audioContext.value && audioContext.value.state !== 'closed') {
      audioContext.value.close();
      audioContext.value = null;
    }

    console.log('语音资源清理完成');
  };

  // ==================== 生命周期 ====================
  onUnmounted(() => {
    cleanup();
  });

  // ==================== 导出API ====================
  return {
    // 状态
    state,
    history,
    isIdle,
    recordingDuration,
    canRecord,
    hasTranscript,

    // 配置
    config,

    // 初始化
    initialize,

    // 录音控制
    startRecording,
    stopRecording,

    // 历史记录
    clearHistory,
    exportHistory,

    // 工具
    cleanup,
  };
}
