<template>
  <div class="ai-assistant-page">
    <!-- 顶部导航 -->
    <van-nav-bar 
      :title="currentTab === 'chat' ? 'AI智能助手' : 'AI服务中心'" 
      left-arrow 
      @click-left="$router.go(-1)"
    >
      <template #right>
        <van-icon name="setting-o" size="20" @click="showSettings = true" />
      </template>
    </van-nav-bar>

    <!-- 标签页 -->
    <van-tabs v-model:active="currentTab" sticky>
      <van-tab title="智能对话" name="chat">
        <!-- AI聊天组件 -->
        <div class="chat-container">
          <AIChat />
        </div>
      </van-tab>

      <van-tab title="专业服务" name="services">
        <!-- AI服务选择 -->
        <div class="services-grid">
          <van-grid :column-num="2" :gutter="10">
            <van-grid-item 
              v-for="service in aiServices" 
              :key="service.type"
              :icon="service.icon" 
              :text="service.name"
              @click="openService(service)"
            />
          </van-grid>
        </div>

        <!-- 最近使用的服务 -->
        <div class="recent-services">
          <van-cell-group inset title="最近使用">
            <van-empty v-if="recentServices.length === 0" description="暂无使用记录" />
            <van-cell
              v-for="service in recentServices"
              :key="service.type"
              :title="service.name"
              :label="service.description"
              is-link
              @click="openService(service)"
            >
              <template #icon>
                <van-icon :name="service.icon" />
              </template>
              <template #right-icon>
                <van-tag size="small" type="primary">{{ service.useCount }}次</van-tag>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
      </van-tab>

      <van-tab title="语音助手" name="voice">
        <!-- 语音助手快捷入口 -->
        <div class="voice-assistant-section">
          <div class="voice-card">
            <div class="voice-info">
              <van-icon name="volume-o" size="48" color="#4caf50" />
              <h3>方言语音助手</h3>
              <p>支持多种方言识别，AI智能回复</p>
            </div>
            <van-button 
              type="primary" 
              round 
              size="large"
              @click="goToVoiceInteraction"
            >
              开始语音对话
            </van-button>
          </div>

          <!-- 语音设置 -->
          <van-cell-group inset title="语音设置">
            <van-cell title="默认方言" is-link @click="showDialectPicker = true">
              <template #value>{{ currentDialectName }}</template>
            </van-cell>
            <van-cell title="语音播报" is-link>
              <template #right-icon>
                <van-switch v-model="voiceSettings.enableTTS" />
              </template>
            </van-cell>
            <van-cell title="语速调节">
              <template #right-icon>
                <van-slider v-model="voiceSettings.speed" :min="0" :max="100" />
              </template>
            </van-cell>
          </van-cell-group>
        </div>
      </van-tab>
    </van-tabs>

    <!-- AI服务详情弹窗 -->
    <van-popup 
      v-model:show="showServiceDetail" 
      position="bottom" 
      round 
      :style="{ height: '70%' }"
    >
      <div class="service-detail" v-if="selectedService">
        <div class="service-header">
          <van-icon :name="selectedService.icon" size="32" color="#4caf50" />
          <h3>{{ selectedService.name }}</h3>
          <p>{{ selectedService.description }}</p>
        </div>

        <div class="service-content">
          <!-- 农业咨询 -->
          <div v-if="selectedService.type === 'agriculture'" class="agriculture-service">
            <van-field
              v-model="agricultureForm.crop"
              label="作物类型"
              placeholder="请输入作物名称"
            />
            <van-field
              v-model="agricultureForm.problem"
              label="问题描述"
              type="textarea"
              placeholder="请详细描述遇到的问题"
              :rows="3"
            />
            <van-button 
              type="primary" 
              block 
              round
              @click="getAgricultureAdvice"
              :loading="adviceLoading"
            >
              获取农业建议
            </van-button>
          </div>

          <!-- 政策咨询 -->
          <div v-else-if="selectedService.type === 'policy'" class="policy-service">
            <van-field
              v-model="policyForm.content"
              label="政策内容"
              type="textarea"
              placeholder="请输入政策内容或问题"
              :rows="4"
            />
            <van-button 
              type="primary" 
              block 
              round
              @click="analyzePolicy"
              :loading="adviceLoading"
            >
              分析政策
            </van-button>
          </div>

          <!-- 财务指导 -->
          <div v-else-if="selectedService.type === 'finance'" class="finance-service">
            <van-field
              v-model="financeForm.type"
              label="财务类型"
              placeholder="如：补贴、贷款、保险等"
            />
            <van-field
              v-model="financeForm.details"
              label="详细信息"
              type="textarea"
              placeholder="请详细描述财务问题"
              :rows="3"
            />
            <van-button 
              type="primary" 
              block 
              round
              @click="getFinancialGuidance"
              :loading="adviceLoading"
            >
              获取财务指导
            </van-button>
          </div>

          <!-- 紧急咨询 -->
          <div v-else-if="selectedService.type === 'emergency'" class="emergency-service">
            <van-field
              v-model="emergencyForm.situation"
              label="紧急情况"
              type="textarea"
              placeholder="请详细描述紧急情况"
              :rows="4"
            />
            <van-button 
              type="danger" 
              block 
              round
              @click="getEmergencyGuidance"
              :loading="adviceLoading"
            >
              获取应急指导
            </van-button>
          </div>

          <!-- 天气咨询 -->
          <div v-else-if="selectedService.type === 'weather'" class="weather-service">
            <van-field
              v-model="weatherForm.location"
              label="地区位置"
              placeholder="请输入地区名称"
            />
            <van-field
              v-model="weatherForm.crop"
              label="作物类型"
              placeholder="请输入作物名称"
            />
            <van-button 
              type="primary" 
              block 
              round
              @click="getWeatherAdvice"
              :loading="adviceLoading"
            >
              获取天气建议
            </van-button>
          </div>

          <!-- 市场咨询 -->
          <div v-else-if="selectedService.type === 'market'" class="market-service">
            <van-field
              v-model="marketForm.product"
              label="农产品"
              placeholder="请输入农产品名称"
            />
            <van-field
              v-model="marketForm.region"
              label="地区"
              placeholder="请输入地区名称"
            />
            <van-button 
              type="primary" 
              block 
              round
              @click="getMarketPrice"
              :loading="adviceLoading"
            >
              获取市场价格
            </van-button>
          </div>
        </div>

        <!-- 建议结果 -->
        <div class="advice-result" v-if="adviceResult">
          <van-cell-group inset title="AI建议结果">
            <van-cell>
              <template #title>
                <div class="advice-content" v-html="formatAdvice(adviceResult)"></div>
              </template>
            </van-cell>
            <van-cell title="语音播报" is-link @click="playAdvice">
              <template #icon><van-icon name="play" /></template>
            </van-cell>
            <van-cell title="复制内容" is-link @click="copyAdvice">
              <template #icon><van-icon name="description" /></template>
            </van-cell>
          </van-cell-group>
        </div>
      </div>
    </van-popup>

    <!-- 方言选择器 -->
    <van-popup v-model:show="showDialectPicker" position="bottom" round>
      <van-picker
        :columns="dialectOptions"
        @confirm="onDialectConfirm"
        @cancel="showDialectPicker = false"
      />
    </van-popup>

    <!-- 设置弹窗 -->
    <van-popup v-model:show="showSettings" position="center" :style="{ width: '85%' }">
      <div class="settings-dialog">
        <div class="dialog-header">
          <h3>AI助手设置</h3>
          <van-icon name="cross" @click="showSettings = false" />
        </div>
        <div class="settings-content">
          <van-form @submit="saveSettings">
            <van-cell-group inset>
              <van-field name="autoPlayVoice" label="自动语音播报">
                <template #input>
                  <van-switch v-model="settings.autoPlayVoice" />
                </template>
              </van-field>
              <van-field name="saveHistory" label="保存对话历史">
                <template #input>
                  <van-switch v-model="settings.saveHistory" />
                </template>
              </van-field>
              <van-field name="streamingResponse" label="流式响应">
                <template #input>
                  <van-switch v-model="settings.streamingResponse" />
                </template>
              </van-field>
              <van-field
                name="maxHistory"
                v-model="settings.maxHistory"
                type="number"
                label="最大历史记录"
                placeholder="最多保存的对话数量"
              />
            </van-cell-group>
            <div class="dialog-actions">
              <van-button round block type="primary" native-type="submit">保存设置</van-button>
            </div>
          </van-form>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { showToast, showLoadingToast, closeToast } from 'vant';
import AIChat from '@/components/AI/AIChat.vue';
import aiApi from '@/api/ai';
import speechApi from '@/api/speech';

const router = useRouter();

// ============ 响应式数据 ============
const currentTab = ref('chat');
const showServiceDetail = ref(false);
const showSettings = ref(false);
const showDialectPicker = ref(false);
const selectedService = ref(null);
const adviceLoading = ref(false);
const adviceResult = ref('');

// 表单数据
const agricultureForm = reactive({ crop: '', problem: '' });
const policyForm = reactive({ content: '' });
const financeForm = reactive({ type: '', details: '' });
const emergencyForm = reactive({ situation: '' });
const weatherForm = reactive({ location: '', crop: '' });
const marketForm = reactive({ product: '', region: '' });

// 设置
const settings = reactive({
  autoPlayVoice: true,
  saveHistory: true,
  streamingResponse: true,
  maxHistory: 100,
});

const voiceSettings = reactive({
  enableTTS: true,
  speed: 50,
  dialect: 'mandarin',
});

// ============ AI服务定义 ============
const aiServices = [
  {
    type: 'agriculture',
    name: '农业咨询',
    description: '专业农业技术指导和病虫害防治建议',
    icon: 'flower-o',
  },
  {
    type: 'policy',
    name: '政策解读',
    description: '农村政策解读和补贴计算',
    icon: 'description',
  },
  {
    type: 'finance',
    name: '财务指导',
    description: '农村财务管理指导和咨询',
    icon: 'balance-o',
  },
  {
    type: 'emergency',
    name: '应急咨询',
    description: '紧急情况处理和应急指导',
    icon: 'warning-o',
  },
  {
    type: 'weather',
    name: '天气咨询',
    description: '天气预报和农事建议',
    icon: 'cloud-o',
  },
  {
    type: 'market',
    name: '市场咨询',
    description: '农产品市场价格和行情',
    icon: 'chart-trending-o',
  },
];

// 最近使用的服务
const recentServices = ref([]);

// 方言选项
const dialectOptions = [
  { text: '普通话', value: 'mandarin' },
  { text: '粤语', value: 'cantonese' },
  { text: '上海话', value: 'shanghainese' },
  { text: '四川话', value: 'sichuanese' },
  { text: '自动检测', value: 'auto' },
];

// ============ 计算属性 ============
const currentDialectName = computed(() => {
  const option = dialectOptions.find(d => d.value === voiceSettings.dialect);
  return option ? option.text : '普通话';
});

// ============ 方法 ============

/**
 * 打开AI服务
 */
const openService = (service) => {
  selectedService.value = service;
  showServiceDetail.value = true;
  adviceResult.value = '';
  
  // 更新最近使用
  updateRecentServices(service);
};

/**
 * 更新最近使用的服务
 */
const updateRecentServices = (service) => {
  const existing = recentServices.value.find(s => s.type === service.type);
  
  if (existing) {
    existing.useCount++;
    // 移到最前面
    recentServices.value = recentServices.value.filter(s => s.type !== service.type);
    recentServices.value.unshift(existing);
  } else {
    recentServices.value.unshift({
      ...service,
      useCount: 1,
      lastUsed: Date.now(),
    });
  }
  
  // 限制数量
  if (recentServices.value.length > 5) {
    recentServices.value = recentServices.value.slice(0, 5);
  }
  
  // 保存到本地存储
  localStorage.setItem('recentAIServices', JSON.stringify(recentServices.value));
};

/**
 * 获取农业建议
 */
const getAgricultureAdvice = async () => {
  if (!agricultureForm.crop || !agricultureForm.problem) {
    showToast('请填写完整信息');
    return;
  }

  try {
    adviceLoading.value = true;
    showLoadingToast({
      message: 'AI分析中...',
      forbidClick: true,
      duration: 0,
    });

    const result = await aiApi.getAgricultureAdvice({
      crop: agricultureForm.crop,
      stage: 'general',
      problem: agricultureForm.problem,
    });

    closeToast();
    
    if (result) {
      adviceResult.value = result;
      showToast('建议获取成功');
    } else {
      adviceResult.value = '抱歉，暂时无法获取农业建议。';
      showToast('获取失败');
    }
  } catch (error) {
    console.error('获取农业建议失败:', error);
    adviceResult.value = '获取农业建议失败，请稍后再试。';
    showToast('服务错误');
  } finally {
    adviceLoading.value = false;
  }
};

/**
 * 分析政策
 */
const analyzePolicy = async () => {
  if (!policyForm.content.trim()) {
    showToast('请输入政策内容');
    return;
  }

  try {
    adviceLoading.value = true;
    showLoadingToast({
      message: '政策分析中...',
      forbidClick: true,
      duration: 0,
    });

    const result = await aiApi.analyzePolicy({
      content: policyForm.content,
      targetAudience: '村民',
    });

    closeToast();
    
    if (result) {
      adviceResult.value = result;
      showToast('政策分析完成');
    } else {
      adviceResult.value = '政策分析失败，请稍后再试。';
      showToast('分析失败');
    }
  } catch (error) {
    console.error('政策分析失败:', error);
    adviceResult.value = '政策分析失败，请稍后再试。';
    showToast('服务错误');
  } finally {
    adviceLoading.value = false;
  }
};

/**
 * 获取财务指导
 */
const getFinancialGuidance = async () => {
  if (!financeForm.type || !financeForm.details) {
    showToast('请填写完整信息');
    return;
  }

  try {
    adviceLoading.value = true;
    showLoadingToast({
      message: '财务分析中...',
      forbidClick: true,
      duration: 0,
    });

    const result = await aiApi.getFinancialGuidance({
      type: financeForm.type,
      details: financeForm.details,
    });

    closeToast();
    
    if (result) {
      adviceResult.value = result;
      showToast('财务指导获取成功');
    } else {
      adviceResult.value = '获取财务指导失败，请稍后再试。';
      showToast('获取失败');
    }
  } catch (error) {
    console.error('获取财务指导失败:', error);
    adviceResult.value = '获取财务指导失败，请稍后再试。';
    showToast('服务错误');
  } finally {
    adviceLoading.value = false;
  }
};

/**
 * 获取应急指导
 */
const getEmergencyGuidance = async () => {
  if (!emergencyForm.situation.trim()) {
    showToast('请描述紧急情况');
    return;
  }

  try {
    adviceLoading.value = true;
    showLoadingToast({
      message: '应急分析中...',
      forbidClick: true,
      duration: 0,
    });

    const result = await aiApi.getEmergencyGuidance(emergencyForm.situation);

    closeToast();
    
    if (result) {
      adviceResult.value = result;
      showToast('应急指导获取成功');
    } else {
      adviceResult.value = '获取应急指导失败，请稍后再试。';
      showToast('获取失败');
    }
  } catch (error) {
    console.error('获取应急指导失败:', error);
    adviceResult.value = '获取应急指导失败，请稍后再试。';
    showToast('服务错误');
  } finally {
    adviceLoading.value = false;
  }
};

/**
 * 获取天气建议
 */
const getWeatherAdvice = async () => {
  if (!weatherForm.location || !weatherForm.crop) {
    showToast('请填写完整信息');
    return;
  }

  try {
    adviceLoading.value = true;
    showLoadingToast({
      message: '天气分析中...',
      forbidClick: true,
      duration: 0,
    });

    const result = await aiApi.getWeatherAdvice({
      location: weatherForm.location,
      condition: 'normal',
      crop: weatherForm.crop,
    });

    closeToast();
    
    if (result) {
      adviceResult.value = result;
      showToast('天气建议获取成功');
    } else {
      adviceResult.value = '获取天气建议失败，请稍后再试。';
      showToast('获取失败');
    }
  } catch (error) {
    console.error('获取天气建议失败:', error);
    adviceResult.value = '获取天气建议失败，请稍后再试。';
    showToast('服务错误');
  } finally {
    adviceLoading.value = false;
  }
};

/**
 * 获取市场价格
 */
const getMarketPrice = async () => {
  if (!marketForm.product || !marketForm.region) {
    showToast('请填写完整信息');
    return;
  }

  try {
    adviceLoading.value = true;
    showLoadingToast({
      message: '价格查询中...',
      forbidClick: true,
      duration: 0,
    });

    const result = await aiApi.getMarketPrice({
      product: marketForm.product,
      region: marketForm.region,
    });

    closeToast();
    
    if (result) {
      adviceResult.value = result;
      showToast('价格信息获取成功');
    } else {
      adviceResult.value = '获取价格信息失败，请稍后再试。';
      showToast('获取失败');
    }
  } catch (error) {
    console.error('获取市场价格失败:', error);
    adviceResult.value = '获取市场价格失败，请稍后再试。';
    showToast('服务错误');
  } finally {
    adviceLoading.value = false;
  }
};

/**
 * 播放建议
 */
const playAdvice = async () => {
  if (!adviceResult.value || !voiceSettings.enableTTS) return;

  try {
    showToast('生成语音中...');

    const audioUrl = await speechApi.synthesize(adviceResult.value, {
      voice: voiceSettings.dialect,
      speed: voiceSettings.speed,
      pitch: 50,
      volume: 50,
      emotion: 'neutral',
    });

    const audio = new Audio(audioUrl);
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
    audio.play();
  } catch (error) {
    console.error('语音合成失败:', error);
    showToast('语音合成失败');
  }
};

/**
 * 复制建议
 */
const copyAdvice = () => {
  if (!adviceResult.value) return;

  navigator.clipboard.writeText(adviceResult.value).then(() => {
    showToast('已复制建议内容');
  });
};

/**
 * 格式化建议内容
 */
const formatAdvice = (content) => {
  return content
    ?.replace(/\n/g, '<br>')
    ?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    ?.replace(/\*(.*?)\*/g, '<em>$1</em>');
};

/**
 * 跳转到语音交互页面
 */
const goToVoiceInteraction = () => {
  router.push('/village/voice-interaction');
};

/**
 * 方言选择确认
 */
const onDialectConfirm = ({ selectedOptions }) => {
  voiceSettings.dialect = selectedOptions[0].value;
  showDialectPicker.value = false;
  localStorage.setItem('voiceSettings', JSON.stringify(voiceSettings));
};

/**
 * 保存设置
 */
const saveSettings = () => {
  localStorage.setItem('aiAssistantSettings', JSON.stringify(settings));
  showToast('设置已保存');
  showSettings.value = false;
};

/**
 * 加载设置
 */
const loadSettings = () => {
  const savedSettings = localStorage.getItem('aiAssistantSettings');
  if (savedSettings) {
    Object.assign(settings, JSON.parse(savedSettings));
  }

  const savedVoiceSettings = localStorage.getItem('voiceSettings');
  if (savedVoiceSettings) {
    Object.assign(voiceSettings, JSON.parse(savedVoiceSettings));
  }

  const savedRecentServices = localStorage.getItem('recentAIServices');
  if (savedRecentServices) {
    recentServices.value = JSON.parse(savedRecentServices);
  }
};

// ============ 生命周期 ============
onMounted(() => {
  loadSettings();
});
</script>

<style scoped>
.ai-assistant-page {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.chat-container {
  height: calc(100vh - 46px);
  background: white;
}

.services-grid {
  padding: 16px;
}

.recent-services {
  padding: 0 16px 16px;
}

.voice-assistant-section {
  padding: 16px;
}

.voice-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.voice-info {
  margin-bottom: 20px;
}

.voice-info h3 {
  margin: 12px 0 8px 0;
  font-size: 18px;
  color: #333;
}

.voice-info p {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.service-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.service-header {
  text-align: center;
  padding: 24px;
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  color: white;
}

.service-header h3 {
  margin: 12px 0 8px 0;
  font-size: 20px;
}

.service-header p {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
}

.service-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.service-content .van-button {
  margin-top: 16px;
}

.advice-result {
  padding: 0 16px 16px;
}

.advice-content {
  line-height: 1.6;
  font-size: 14px;
  color: #333;
  word-break: break-word;
}

.settings-dialog {
  padding: 24px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
}

.settings-content {
  margin-bottom: 16px;
}

.dialog-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>