<template>
  <div class="demo-page">
    <el-container>
      <el-header>
        <h1>🎙️ 智慧乡村 - 语音助手组件演示</h1>
        <p class="subtitle">悬浮按钮 + 语音波形 + 识别结果 + 命令反馈</p>
      </el-header>

      <el-main>
        <!-- 演示说明 -->
        <el-card class="intro-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><DocumentCopy /></el-icon>
              <span>组件功能</span>
            </div>
          </template>
          <div class="card-content">
            <ul class="feature-list">
              <li><strong>悬浮按钮设计</strong> - 页面右下角悬浮的麦克风按钮</li>
              <li><strong>语音波形动画</strong> - 录音时显示动态波形动画</li>
              <li><strong>识别结果实时显示</strong> - 实时显示识别中的文本</li>
              <li><strong>命令执行反馈</strong> - 语音命令解析和执行结果</li>
              <li><strong>22种方言支持</strong> - 普通话、粤语、闽南语、客家话等</li>
              <li><strong>语音合成</strong> - 文字转语音播报</li>
            </ul>
          </div>
        </el-card>

        <!-- 组件演示区域 -->
        <el-row :gutter="20">
          <!-- 左侧：示例场景 -->
          <el-col :xs="24" :lg="16">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <el-icon><List /></el-icon>
                  <span>使用示例</span>
                </div>
              </template>
              <div class="card-content">
                <el-radio-group v-model="currentDemo">
                  <el-radio-button label="1">基础使用</el-radio-button>
                  <el-radio-button label="2">方言切换</el-radio-button>
                  <el-radio-button label="3">语音播报</el-radio-button>
                  <el-radio-button label="4">命令执行</el-radio-button>
                </el-radio-group>

                <div class="demo-descriptions">
                  <div v-if="currentDemo === '1'" class="demo-item">
                    <h4>基础使用</h4>
                    <p>点击右下角的悬浮按钮开始语音识别，语音会实时转换为文字显示。</p>
                    <p>支持语音识别、语音合成、命令解析等功能。</p>
                  </div>

                  <div v-if="currentDemo === '2'" class="demo-item">
                    <h4>方言切换</h4>
                    <p>点击设置按钮选择不同的方言，系统会自动识别并播报对应方言。</p>
                    <p>支持22种中文方言，包括普通话、粤语、闽南语、客家话等。</p>
                  </div>

                  <div v-if="currentDemo === '3'" class="demo-item">
                    <h4>语音播报</h4>
                    <p>识别结果会自动播报为语音，可选择音色、语速、音调等参数。</p>
                    <p>支持多种音色：男声、女声、儿童声、老年人声。</p>
                  </div>

                  <div v-if="currentDemo === '4'" class="demo-item">
                    <h4>命令执行</h4>
                    <p>支持语音命令，如"查询公告"、"打开首页"等。</p>
                    <p>系统会自动识别命令意图并执行相应操作。</p>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>

          <!-- 右侧：组件展示 -->
          <el-col :xs="24" :lg="8">
            <el-card class="demo-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <el-icon><Monitor /></el-icon>
                  <span>实时状态</span>
                </div>
              </template>

              <div class="card-content">
                <div class="status-section">
                  <div class="status-item">
                    <span class="status-label">录音状态:</span>
                    <el-tag :type="isListening ? 'danger' : 'primary'" size="small">
                      {{ isListening ? '录音中' : '未录音' }}
                    </el-tag>
                  </div>
                  <div class="status-item">
                    <span class="status-label">语音状态:</span>
                    <el-tag :type="isSpeaking ? 'success' : 'info'" size="small">
                      {{ isSpeaking ? '播放中' : '未播放' }}
                    </el-tag>
                  </div>
                  <div class="status-item">
                    <span class="status-label">处理状态:</span>
                    <el-tag :type="isProcessing ? 'warning' : ''" size="small">
                      {{ isProcessing ? '处理中...' : '就绪' }}
                    </el-tag>
                  </div>
                  <div class="status-item">
                    <span class="status-label">识别结果:</span>
                    <el-tag type="info" size="small">
                      {{ recognitionResult.text || '等待输入...' }}
                    </el-tag>
                  </div>
                  <div class="status-item">
                    <span class="status-label">检测方言:</span>
                    <el-tag type="success" size="small" v-if="detectedDialect">
                      {{ detectedDialect }}
                    </el-tag>
                    <el-tag type="info" size="small" v-else>
                      {{ detectedDialect || '未检测' }}
                    </el-tag>
                  </div>
                </div>

                <div class="divider"></div>

                <div class="actions-section">
                  <el-alert
                    title="操作提示"
                    type="info"
                    :closable="false"
                    show-icon
                  >
                    <ul>
                      <li>点击右下角的悬浮按钮开始语音识别</li>
                      <li>点击麦克风图标可以切换录音/停止状态</li>
                      <li>支持快捷键：空格键录音/停止，ESC关闭面板</li>
                      <li>语音会实时显示在面板中</li>
                    </ul>
                  </el-alert>

                  <el-alert
                    title="示例语音"
                    type="success"
                    :closable="false"
                    show-icon
                  >
                    <p>试试说：</p>
                    <ul>
                      <li>"查询最新公告"</li>
                      <li>"打开村民信息"</li>
                      <li>"播放语音"</li>
                      <li>"语音转文字"</li>
                    </ul>
                  </el-alert>

                  <el-alert
                    title="支持方言"
                    type="warning"
                    :closable="false"
                    show-icon
                  >
                    <p>当前方言：<strong>{{ settings.dialect === 'mandarin' ? '普通话' : settings.dialect }}</strong></p>
                    <p>音色：<strong>{{ settings.voice === 'female' ? '女声' : settings.voice }}</strong></p>
                  </el-alert>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- API调用演示 -->
        <el-row :gutter="20">
          <el-col :xs="24">
            <el-card class="api-demo-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <el-icon><Connection /></el-icon>
                  <span>API调用演示</span>
                </div>
              </template>
              <div class="card-content">
                <el-form :model="apiForm" label-width="120px">
                  <el-form-item label="识别文本">
                    <el-input
                      v-model="apiForm.recognizeText"
                      placeholder="输入要识别的文本"
                      type="textarea"
                      :rows="3"
                    />
                  </el-form-item>

                  <el-form-item label="方言">
                    <el-select v-model="apiForm.dialect">
                      <el-option label="普通话" value="mandarin" />
                      <el-option label="粤语" value="yue" />
                      <el-option label="闽南语" value="nan" />
                      <el-option label="客家话" value="hak" />
                      <el-option label="吴语" value="wuu" />
                      <el-option label="湘语" value="hsn" />
                      <el-option label="赣语" value="gan" />
                      <el-option label="东北话" value="zh-northeast" />
                      <el-option label="四川话" value="zh-sichuan" />
                      <el-option label="山东话" value="zh-shandong" />
                      <el-option label="河南话" value="zh-henan" />
                      <el-option label="湖北话" value="zh-hubei" />
                      <el-option label="江浙话" value="zh-jiangzhe" />
                      <el-option label="安徽话" value="zh-anhui" />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="音色">
                    <el-select v-model="apiForm.voice">
                      <el-option label="女声" value="female" />
                      <el-option label="男声" value="male" />
                      <el-option label="儿童声" value="child" />
                      <el-option label="老年人声" value="elderly" />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="语速">
                    <el-slider v-model="apiForm.speed" :min="0" :max="100" />
                  </el-form-item>

                  <el-form-item label="音调">
                    <el-slider v-model="apiForm.pitch" :min="0" :max="100" />
                  </el-form-item>

                  <el-form-item>
                    <el-button type="primary" @click="testSynthesis">生成语音</el-button>
                  </el-form-item>
                </el-form>
              </div>
            </el-card>
          </el-col>

          <!-- API响应展示 -->
          <el-col :xs="24">
            <el-card class="response-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <el-icon><Tickets /></el-icon>
                  <span>API响应</span>
                </div>
              </template>
              <div class="card-content">
                <div v-if="apiResponse">
                  <el-descriptions title="API响应信息" :column="1" border>
                    <el-descriptions-item label="状态">
                      <el-tag :type="apiResponse.success ? 'success' : 'danger'" size="small">
                        {{ apiResponse.success ? '成功' : '失败' }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="消息">
                      <span>{{ apiResponse.message || '-' }}</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="数据大小">
                      <span>{{ apiResponse.audioSize ? formatSize(apiResponse.audioSize) : '-' }}</span>
                    </el-descriptions-item>
                  </el-descriptions>

                  <el-divider content="语音数据预览"></el-divider>

                  <div v-if="apiResponse.data && apiResponse.data.audioData">
                    <h4>音频数据</h4>
                    <div class="audio-preview">
                      <audio controls controls>
                        <source
                          :src="`data:audio/mp3;base64,${apiResponse.data.audioData}`"
                          type="audio/mp3"
                        />
                      </audio>
                      <p class="audio-hint">播放器不支持预览</p>
                    </div>
                  </div>
                </div>

                <div v-else class="placeholder">
                  <el-empty description="点击左侧"生成语音" :image-size="100" />
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>

    <!-- 语音助手组件 -->
    <VoiceAssistant
      ref="voiceAssistant"
      :api-endpoint="apiEndpoint"
      :synthesis-endpoint="synthesisEndpoint"
      :auto-init="true"
      @recording-started="handleRecordingStarted"
      @recording-stopped="handleRecordingStopped"
      @recognition-result="handleRecognitionResult"
      @command-executed="handleCommandExecuted"
      @synthesis-started="handleSynthesisStarted"
      @synthesis-completed="handleSynthesisCompleted"
    />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import VoiceAssistant from '@/components/voice/VoiceAssistant.vue';

// 组件引用
const voiceAssistant = ref(null);

// API端点
const apiEndpoint = '/api/speech/recognize';
const synthesisEndpoint = '/api/tts/synthesize';

// 演示模式
const currentDemo = ref('1');

// 组件状态
const isListening = ref(false);
const isSpeaking = ref(false);
const isProcessing = ref(false);
const recognitionResult = reactive({
  text: '',
  confidence: 0,
  dialect: '',
  processingTime: 0
});
const detectedDialect = ref('');

// 命令状态
const currentCommand = reactive({
  intent: '',
  entities: [],
  confidence: 0,
  status: '',
  response: '',
  success: false,
  isExecuting: false
});

// 设置
const settings = reactive({
  dialect: 'mandarin',
  voice: 'female',
  speed: 50,
  pitch: 50,
  volume: 50,
  emotion: 'neutral',
  format: 'mp3'
});

// API表单
const apiForm = reactive({
  recognizeText: '欢迎使用智慧乡村平台',
  dialect: 'mandarin',
  voice: 'female',
  speed: 50,
  pitch: 50
  volume: 50
});

// API响应
const apiResponse = ref(null);

/**
 * 处理录音开始
 */
const handleRecordingStarted = () => {
  console.log('🎙️ 录音开始');
  isListening.value = true;
  recognitionResult.text = '';
  detectedDialect.value = '';
  currentCommand.status = '';
  currentCommand.response = '';
};

/**
 * 处理录音停止
 */
const handleRecordingStopped = () => {
  console.log('⏹️ 录音停止');
  isListening.value = false;
  isProcessing.value = true;
};

/**
 * 处理识别结果
 */
const handleRecognitionResult = (result) => {
  console.log('📝 识别结果:', result);
  recognitionResult.text = result.text;
  recognitionResult.confidence = result.confidence || 0;
  recognitionResult.dialect = result.dialect || '';
  recognitionResult.processingTime = result.processingTime || 0;

  if (result.dialect) {
    const dialectNames = {
      'zh': '普通话',
      'yue': '粤语',
      'nan': '闽南语',
      'hak': '客家话',
      'wuu': '吴语',
      'hsn': '湘语',
      'gan': '赣语',
      'zh-northeast': '东北话',
      'zh-sichuan': '四川话',
      'zh-shandong': '山东话',
      'zh-henan': '河南话',
      'zh-hubei': '湖北话',
      'zh-jiangzhe': '江浙话',
      'zh-anhui': '安徽话'
    };
    detectedDialect.value = dialectNames[result.dialect] || result.dialect;
  }

  isProcessing.value = false;
  ElMessage.success(`识别成功: ${result.text}`);
};

/**
 * 处理命令执行
 */
const handleCommandExecuted = (command) => {
  console.log('🎯 命令执行:', command);
  currentCommand.intent = command.intent;
  currentCommand.entities = command.entities || [];
  currentCommand.confidence = command.confidence || 0;
  currentCommand.status = command.status || '';
  currentCommand.response = command.response || '';
  currentCommand.success = command.success || false;

  if (command.status === 'completed') {
    ElNotification({
      title: '命令执行成功',
      message: command.response,
      type: 'success',
      duration: 3000
    });
  }
};

/**
 * 处理语音合成开始
 */
const handleSynthesisStarted = () => {
  console.log('🔊 开始语音合成');
  isSpeaking.value = true;
  currentCommand.status = 'completed';
};

/**
 * 处理语音合成完成
 */
const handleSynthesisCompleted = (data) => {
  console.log('🔊 语音合成完成');
  isSpeaking.value = false;
};

/**
 * 测试语音合成
 */
const testSynthesis = async () => {
  if (!apiForm.recognizeText) {
    ElMessage.warning('请输入要合成的文本');
    return;
  }

  try {
    ElMessage.info('正在生成语音...');

    const response = await fetch('http://localhost:3001' + synthesisEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE'
      },
      body: JSON.stringify({
        text: apiForm.recognizeText,
        voice: apiForm.voice,
        dialect: apiForm.dialect,
        speed: apiForm.speed,
        pitch: apiForm.pitch,
        volume: apiForm.volume,
        format: apiForm.format,
        enableCache: true
      })
    });

    const data = await response.json();

    apiResponse.value = data;

    if (data.success) {
      ElMessage.success('语音生成成功');
    } else {
      ElMessage.error('语音生成失败');
    }

  } catch (error) {
    console.error('语音合成测试失败:', error);
    ElMessage.error(`语音合成失败: ${error.message}`);
    apiResponse.value = {
      success: false,
      message: error.message
    };
  }
};

/**
 * 格式化文件大小
 */
const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};
</script>

<style scoped>
.demo-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.intro-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.card-content {
  padding: 20px;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-list li {
  padding: 8px 0;
  position: relative;
  padding-left: 24px;
}

.feature-list li::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 10px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #409eff;
}

.subtitle {
  color: #666;
  font-size: 14px;
  margin-top: 8px;
}

.demo-card {
  height: 100%;
}

.api-demo-card,
.response-card {
  height: 100%;
}

.status-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
}

.status-label {
  font-weight: 500;
  color: #333;
}

.divider {
  margin: 16px 0;
  border-top: 1px solid #e4e7ec;
}

.actions-section {
  margin-top: 20px;
}

.audio-preview {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.audio-preview audio {
  width: 100%;
  max-width: 400px;
}

.audio-hint {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.placeholder {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ddd;
}

.demo-item {
  padding: 16px;
}

.demo-item h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.demo-item p {
  margin: 0;
  color: #666;
  line-height: 1.6;
}

.status-item .el-tag {
  min-width: 60px;
}
</style>
