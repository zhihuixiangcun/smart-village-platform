/**
 * 语音配置文件 - Speech Configuration
 *
 * 配置项：
 * - API密钥配置
 * - 支持的方言列表
 * - 语音参数设置
 * - 命令模式配置
 */

export default {
  // API配置
  api: {
    baseUrl: import.meta.env.VITE_SPEECH_API_BASE_URL || '/api/speech',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000
  },

  // 方言配置
  dialects: {
    // 主要方言
    mandarin: {
      code: 1537,
      name: '普通话',
      desc: '标准普通话',
      flag: '🇨🇳'
    },
    cantonese: {
      code: 1637,
      name: '粤语',
      desc: '广东话、香港话',
      flag: '🇭🇰'
    },
    sichuan: {
      code: 1737,
      name: '四川话',
      desc: '西南官话',
      flag: '🌶️'
    },
    hubei: {
      code: 1837,
      name: '湖北话',
      desc: '江淮官话',
      flag: '🌸'
    },
    hunan: {
      code: 1937,
      name: '湖南话',
      desc: '湘语',
      flag: '🌶️'
    },
    jiangxi: {
      code: 2037,
      name: '江西话',
      desc: '赣语',
      flag: '🏔️'
    },
    henan: {
      code: 2137,
      name: '河南话',
      desc: '中原官话',
      flag: '🏛️'
    },
    anhui: {
      code: 2237,
      name: '安徽话',
      desc: '江淮官话',
      flag: '🏞️'
    },
    shandong: {
      code: 2337,
      name: '山东话',
      desc: '胶辽官话',
      flag: '🌊'
    },
    shanxi: {
      code: 2437,
      name: '山西话',
      desc: '晋语',
      flag: '🏔️'
    },
    hebei: {
      code: 2537,
      name: '河北话',
      desc: '北方官话',
      flag: '🌾'
    },
    northeast: {
      code: 2637,
      name: '东北话',
      desc: '东北官话',
      flag: '❄️'
    },
    tianjin: {
      code: 2737,
      name: '天津话',
      desc: '北方官话',
      flag: '🏙️'
    },
    nanjing: {
      code: 2837,
      name: '南京话',
      desc: '江淮官话',
      flag: '🏯'
    },
    xi'an: {
      code: 2937,
      name: '西安话',
      desc: '中原官话',
      flag: '🏛️'
    },
    lanzhou: {
      code: 3037,
      name: '兰州话',
      desc: '中原官话',
      flag: '🏜️'
    },
    chongqing: {
      code: 3137,
      name: '重庆话',
      desc: '西南官话',
      flag: '🌶️'
    },
    guiyang: {
      code: 3237,
      name: '贵阳话',
      desc: '西南官话',
      flag: '🏔️'
    },
    kunming: {
      code: 3337,
      name: '昆明话',
      desc: '西南官话',
      flag: '🌺'
    },
    guangxi: {
      code: 3437,
      name: '广西话',
      desc: '西南官话',
      flag: '🏞️'
    },
    fuzhou: {
      code: 3537,
      name: '福州话',
      desc: '闽东语',
      flag: '🌊'
    },
    xiamen: {
      code: 3637,
      name: '厦门话',
      desc: '闽南语',
      flag: '🌊'
    }
  },

  // 发音人配置
  speakers: {
    female: {
      id: 0,
      name: '女声',
      desc: '温柔女声',
      icon: '👩'
    },
    male: {
      id: 1,
      name: '男声',
      desc: '沉稳男声',
      icon: '👨'
    },
    female_emotional: {
      id: 3,
      name: '情感女声',
      desc: '情感丰富的女声',
      icon: '💝'
    },
    male_emotional: {
      id: 4,
      name: '情感男声',
      desc: '情感丰富的男声',
      icon: '💙'
    },
    child: {
      id: 5,
      name: '童声',
      desc: '可爱童声',
      icon: '👶'
    }
  },

  // 语音参数
  recognition: {
    // 音频格式
    format: 'pcm',
    // 采样率
    sampleRate: 16000,
    // 是否连续识别
    continuous: false,
    // 是否返回临时结果
    interimResults: true,
    // 最大候选数
    maxAlternatives: 1,
    // 语言
    lang: 'zh-CN',
    // 优先使用原生API
    useNative: true
  },

  synthesis: {
    // 发音人
    person: 0,
    // 语速 (0-15)
    speed: 5,
    // 音调 (0-15)
    pitch: 5,
    // 音量 (0-15)
    volume: 5,
    // 音频格式
    format: 'mp3',
    // 自动播放
    autoPlay: true,
    // 语言
    lang: 'zh-CN',
    // 优先使用原生API
    useNative: true
  },

  // 语音命令配置
  commands: {
    // 命令类型
    types: {
      CALL: 'call',
      QUERY: 'query',
      NAVIGATION: 'navigation',
      EMERGENCY: 'emergency',
      FORM_INPUT: 'form_input',
      SEARCH: 'search'
    },

    // 命令模式
    patterns: {
      call: [/呼叫(.*)/i, /打电话给(.*)/i, /联系(.*)/i],
      query: [/查询(.*)/i, /查一下(.*)/i, /查看(.*)/i, /(.*)的信息/i],
      navigation: [/去(.*)/i, /导航到(.*)/i, /前往(.*)/i],
      emergency: [/紧急求助/i, /救命/i, /报警/i, /呼叫村干部/i],
      form_input: [/填写(.*)/i, /输入(.*)/i],
      search: [/搜索(.*)/i, /找(.*)/i]
    },

    // 命令处理超时时间（毫秒）
    timeout: 5000,

    // 是否自动执行命令
    autoExecute: false
  },

  // 录音配置
  recording: {
    // 最大录音时长（秒）
    maxDuration: 60,
    // 最小录音时长（秒）
    minDuration: 1,
    // 音频质量
    audioQuality: 'high',
    // 是否显示音量波形
    showWaveform: true,
    // 是否震动反馈
    vibrate: true
  },

  // 离线配置
  offline: {
    // 是否启用离线语音
    enabled: false,
    // 离线模型URL
    modelUrl: '',
    // 离线词汇表
    vocabulary: []
  },

  // 缓存配置
  cache: {
    // 是否启用缓存
    enabled: true,
    // 缓存时长（毫秒）
    duration: 3600000, // 1小时
    // 最大缓存条目数
    maxSize: 100
  },

  // 调试配置
  debug: {
    // 是否启用调试模式
    enabled: import.meta.env.DEV,
    // 是否记录日志
    log: true,
    // 是否显示状态提示
    showStatus: true
  }
};

// 导出方言列表（不含元数据）
export const dialectList = Object.entries(speechConfig.dialects).map(([key, value]) => ({
  code: key,
  ...value
}));

// 导出发音人列表（不含元数据）
export const speakerList = Object.entries(speechConfig.speakers).map(([key, value]) => ({
  code: key,
  ...value
}));
