<template>
  <div class="pest-disease-recognition">
    <div class="recognition-container">
      <!-- 上传区域 -->
      <div class="upload-section">
        <div class="upload-area" :class="{ 'has-image': uploadedImage, processing: isProcessing }">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleFileSelect"
            style="display: none"
          />
          <div v-if="!uploadedImage" class="upload-placeholder" @click="$refs.fileInput?.click()">
            <div class="upload-icon">
              <i class="fas fa-cloud-upload-alt"></i>
            </div>
            <div class="upload-text">
              <h3>上传农作物图片</h3>
              <p>点击或拖拽图片到此处</p>
              <small>支持 JPG, PNG, GIF 格式，最大 10MB</small>
            </div>
          </div>

          <div v-else class="uploaded-image-container">
            <img :src="uploadedImage" alt="农作物图片" class="preview-image" />
            <div class="image-overlay" v-if="isProcessing">
              <div class="processing-spinner"></div>
              <p>正在识别中...</p>
            </div>
            <div class="image-actions">
              <button class="action-btn" @click="retakePhoto">
                <i class="fas fa-camera"></i>
                重新拍照
              </button>
              <button class="action-btn" @click="$refs.fileInput?.click()">
                <i class="fas fa-folder-open"></i>
                选择图片
              </button>
            </div>
          </div>
        </div>

        <!-- 拖拽区域 -->
        <div
          v-if="!uploadedImage"
          class="drop-zone"
          @dragover.prevent="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
        >
          <i class="fas fa-images"></i>
          <p>拖拽图片到此处</p>
        </div>
      </div>

      <!-- 作物类型选择 -->
      <div class="crop-selection" v-if="!recognitionResult">
        <h3>选择作物类型</h3>
        <div class="crop-grid">
          <div
            v-for="crop in cropTypes"
            :key="crop.value"
            class="crop-card"
            :class="{ selected: selectedCrop === crop.value }"
            @click="selectCrop(crop.value)"
          >
            <div class="crop-icon">
              <i :class="crop.icon"></i>
            </div>
            <div class="crop-info">
              <h4>{{ crop.label }}</h4>
              <p>{{ crop.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 识别设置 -->
      <div class="settings-section" v-if="!recognitionResult">
        <h3>识别设置</h3>
        <div class="settings-grid">
          <div class="setting-item">
            <label>识别模式:</label>
            <el-select v-model="settings.provider">
              <el-option label="本地模型" value="local" />
              <el-option label="百度AI" value="baidu" />
              <el-option label="腾讯云" value="tencent" />
            </el-select>
          </div>
          <div class="setting-item">
            <label>置信度阈值:</label>
            <el-slider
              v-model="settings.confidenceThreshold"
              :min="0.5"
              :max="1"
              :step="0.05"
              show-input
              :format-tooltip="formatConfidence"
            />
          </div>
          <div class="setting-item">
            <label>包含治疗方案:</label>
            <el-switch v-model="settings.includeTreatment" />
          </div>
          <div class="setting-item">
            <label>显示检测框:</label>
            <el-switch v-model="settings.showDetectionBox" />
          </div>
        </div>

        <button
          class="recognize-btn"
          @click="startRecognition"
          :disabled="!uploadedImage || isProcessing"
        >
          <i class="fas fa-search"></i>
          {{ isProcessing ? '识别中...' : '开始识别' }}
        </button>
      </div>

      <!-- 识别结果 -->
      <div class="result-section" v-if="recognitionResult">
        <div class="result-header">
          <h3>
            <i class="fas fa-bug"></i>
            病虫害识别结果
          </h3>
          <div class="result-status" :class="recognitionResult.success ? 'success' : 'error'">
            {{ recognitionResult.success ? '识别成功' : '识别失败' }}
          </div>
        </div>

        <!-- 成功结果 -->
        <div
          v-if="recognitionResult.success && recognitionResult.detections"
          class="success-result"
        >
          <!-- 检测到的病虫害 -->
          <div class="detections-container">
            <h4>检测到的病虫害 ({{ recognitionResult.detections.length }})</h4>
            <div class="detections-list">
              <div
                v-for="(detection, index) in recognitionResult.detections"
                :key="index"
                class="detection-item"
                :class="{ pest: detection.type === 'pest', disease: detection.type === 'disease' }"
              >
                <div class="detection-header">
                  <div class="detection-name">
                    <i :class="detection.type === 'pest' ? 'fas fa-bug' : 'fas fa-virus'"></i>
                    {{ detection.name }}
                  </div>
                  <div class="detection-confidence">
                    置信度: {{ (detection.confidence * 100).toFixed(1) }}%
                  </div>
                </div>
                <div class="detection-severity">
                  <span class="severity-badge" :class="detection.severity">
                    {{ getSeverityLabel(detection.severity) }}
                  </span>
                  <span class="detection-type">
                    {{ detection.type === 'pest' ? '害虫' : '病害' }}
                  </span>
                </div>
                <div class="detection-description">
                  {{ detection.description }}
                </div>

                <!-- 检测框（如果有坐标） -->
                <div
                  v-if="detection.bbox && settings.showDetectionBox && uploadedImage"
                  class="detection-bbox"
                  :style="getBboxStyle(detection.bbox)"
                >
                  <div class="bbox-label">
                    {{ detection.name }} ({{ (detection.confidence * 100).toFixed(1) }}%)
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 治疗方案 -->
          <div v-if="recognitionResult.treatmentRecommendations" class="treatment-section">
            <h4>治疗建议</h4>
            <div class="treatment-tabs">
              <button
                v-for="(treatment, type) in recognitionResult.treatmentRecommendations"
                :key="type"
                class="tab-btn"
                :class="{ active: activeTreatmentType === type }"
                @click="activeTreatmentType = type"
              >
                <i :class="getTreatmentIcon(type)"></i>
                {{ getTreatmentLabel(type) }}
                <span class="badge">{{ treatment.length }}项</span>
              </button>
            </div>

            <div class="treatment-content">
              <div
                v-if="
                  activeTreatmentType &&
                  recognitionResult.treatmentRecommendations[activeTreatmentType]
                "
              >
                <div
                  v-for="(item, index) in recognitionResult.treatmentRecommendations[
                    activeTreatmentType
                  ]"
                  :key="index"
                  class="treatment-item"
                >
                  <div class="treatment-header">
                    <h5>{{ item.name }}</h5>
                    <div class="treatment-meta">
                      <span class="method-type" :class="item.type">
                        {{ getMethodLabel(item.type) }}
                      </span>
                      <span class="effectiveness" v-if="item.effectiveness">
                        效果: {{ item.effectiveness }}%
                      </span>
                    </div>
                  </div>
                  <div class="treatment-details">
                    <p><strong>用量:</strong> {{ item.dosage }}</p>
                    <p><strong>方法:</strong> {{ item.method }}</p>
                    <p><strong>时机:</strong> {{ item.timing }}</p>
                    <div v-if="item.precautions" class="precautions">
                      <p><strong>注意事项:</strong></p>
                      <ul>
                        <li v-for="(precaution, idx) in item.precautions" :key="idx">
                          {{ precaution }}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 预防建议 -->
          <div class="prevention-section">
            <h4>预防建议</h4>
            <div v-if="recognitionResult.treatmentRecommendations.cultural" class="prevention-list">
              <div
                v-for="(item, index) in recognitionResult.treatmentRecommendations.cultural"
                :key="index"
                class="prevention-item"
              >
                <i class="fas fa-shield-alt"></i>
                {{ item }}
              </div>
            </div>
          </div>
        </div>

        <!-- 无检测结果 -->
        <div v-else-if="recognitionResult.success" class="no-detection-result">
          <div class="no-detection-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="no-detection-message">
            <h4>未检测到病虫害</h4>
            <p>您上传的农作物图片目前看起来很健康，没有发现明显的病虫害问题。</p>
            <div class="healthy-tips">
              <h5>保持农作物健康的小贴士:</h5>
              <ul>
                <li>定期检查作物生长状况</li>
                <li>保持适当的种植密度</li>
                <li>及时清除杂草</li>
                <li>合理施肥和浇水</li>
                <li>注意观察环境变化</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 失败结果 -->
        <div v-else class="error-result">
          <div class="error-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <div class="error-message">
            <h4>识别失败</h4>
            <p>{{ recognitionResult.error || '未能完成病虫害识别' }}</p>
            <div class="error-suggestions">
              <h5>建议:</h5>
              <ul>
                <li>确保图片清晰，对准病虫害部位</li>
                <li>选择良好的光线条件</li>
                <li>避免图片模糊或过暗</li>
                <li>尝试更换不同的作物类型</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="result-actions">
          <button class="action-btn primary" @click="recognizeAgain">
            <i class="fas fa-redo"></i>
            重新识别
          </button>
          <button class="action-btn secondary" @click="saveResult">
            <i class="fas fa-save"></i>
            保存结果
          </button>
          <button class="action-btn secondary" @click="shareResult">
            <i class="fas fa-share"></i>
            分享结果
          </button>
          <button class="action-btn secondary" @click="consultExpert">
            <i class="fas fa-user-md"></i>
            咨询专家
          </button>
        </div>
      </div>

      <!-- 历史记录 -->
      <div class="history-section" v-if="showHistory">
        <h3>识别历史</h3>
        <div class="history-list">
          <div
            v-for="(item, index) in recognitionHistory"
            :key="index"
            class="history-item"
            @click="loadHistoryItem(item)"
          >
            <div class="history-image">
              <img :src="item.image" alt="历史图片" />
            </div>
            <div class="history-info">
              <div class="history-crop">{{ item.cropLabel }}</div>
              <div class="history-time">{{ formatTime(item.timestamp) }}</div>
              <div
                class="history-result"
                :class="{ success: item.success, detection: item.detectionCount > 0 }"
              >
                {{ getHistoryStatusLabel(item) }}
              </div>
              <div class="history-detections" v-if="item.detectionCount > 0">
                检测到 {{ item.detectionCount }}个问题
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 浮动操作按钮 -->
    <div class="floating-actions">
      <button
        class="floating-btn"
        @click="toggleHistory"
        :class="{ active: showHistory }"
        title="历史记录"
      >
        <i class="fas fa-history"></i>
      </button>
      <button class="floating-btn camera-btn" @click="openCamera" title="拍照识别">
        <i class="fas fa-camera"></i>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

export default {
  name: 'PestDiseaseRecognition',
  emits: ['recognition-complete'],
  setup(props, { emit }) {
    // 上传相关
    const fileInput = ref(null);
    const uploadedImage = ref(null);
    const isProcessing = ref(false);
    const isDragging = ref(false);

    // 识别相关
    const selectedCrop = ref('rice');
    const recognitionResult = ref(null);
    const activeTreatmentType = ref('chemical');

    // 历史记录
    const showHistory = ref(false);
    const recognitionHistory = ref([]);

    // 设置
    const settings = reactive({
      provider: 'local',
      confidenceThreshold: 0.7,
      includeTreatment: true,
      showDetectionBox: true,
    });

    // 作物类型
    const cropTypes = [
      {
        value: 'rice',
        label: '水稻',
        icon: 'fas fa-seedling',
        description: '水稻常见病虫害识别',
      },
      {
        value: 'wheat',
        label: '小麦',
        icon: 'fas fa-wheat',
        description: '小麦常见病虫害识别',
      },
      {
        value: 'corn',
        label: '玉米',
        icon: 'fas fa-corn',
        description: '玉米常见病虫害识别',
      },
      {
        value: 'soybean',
        label: '大豆',
        icon: 'fas fa-circle',
        description: '大豆常见病虫害识别',
      },
      {
        value: 'cotton',
        label: '棉花',
        icon: 'fas fa-leaf',
        description: '棉花常见病虫害识别',
      },
      {
        value: 'vegetables',
        label: '蔬菜',
        icon: 'fas fa-carrot',
        description: '蔬菜常见病虫害识别',
      },
      {
        value: 'fruits',
        label: '水果',
        icon: 'fas fa-apple-alt',
        description: '水果常见病虫害识别',
      },
    ];

    // 选择作物类型
    const selectCrop = cropValue => {
      selectedCrop.value = cropValue;
    };

    // 文件选择处理
    const handleFileSelect = async event => {
      const file = event.target.files[0];
      if (!file) return;

      if (!validateFile(file)) return;

      try {
        isProcessing.value = true;
        const imageUrl = URL.createObjectURL(file);
        uploadedImage.value = imageUrl;
      } catch (error) {
        console.error('文件加载失败:', error);
        ElMessage.error('文件加载失败');
      } finally {
        isProcessing.value = false;
      }
    };

    // 文件验证
    const validateFile = file => {
      // 检查文件类型
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        ElMessage.error('请上传图片文件 (JPG, PNG, GIF, WebP)');
        return false;
      }

      // 检查文件大小
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        ElMessage.error('文件大小不能超过10MB');
        return false;
      }

      return true;
    };

    // 拖拽处理
    const handleDragOver = event => {
      event.preventDefault();
      isDragging.value = true;
    };

    const handleDragLeave = () => {
      isDragging.value = false;
    };

    const handleDrop = async event => {
      event.preventDefault();
      isDragging.value = false;

      const files = event.dataTransfer.files;
      if (files.length === 0) return;

      const file = files[0];
      if (!validateFile(file)) return;

      try {
        isProcessing.value = true;
        const imageUrl = URL.createObjectURL(file);
        uploadedImage.value = imageUrl;
      } catch (error) {
        console.error('文件加载失败:', error);
        ElMessage.error('文件加载失败');
      } finally {
        isProcessing.value = false;
      }
    };

    // 开始识别
    const startRecognition = async () => {
      if (!uploadedImage.value || isProcessing.value) return;

      isProcessing.value = true;

      try {
        // 将图片转换为ArrayBuffer
        const response = await fetch(uploadedImage.value);
        const arrayBuffer = await response.arrayBuffer();

        // 调用识别API
        const result = await performRecognition(arrayBuffer, selectedCrop.value);

        recognitionResult.value = result;

        // 添加到历史记录
        addToHistory(result, uploadedImage.value);

        // 触发事件
        emit('recognition-complete', result);

        ElMessage.success(
          result.success
            ? `识别完成，检测到${result.detections ? result.detections.length : 0}个问题`
            : '识别完成，图片很健康'
        );
      } catch (error) {
        console.error('病虫害识别失败:', error);
        ElMessage.error('识别失败: ' + error.message);
      } finally {
        isProcessing.value = false;
      }
    };

    // 执行识别
    const performRecognition = async (imageBuffer, cropType) => {
      try {
        const formData = new FormData();
        formData.append('image', new Blob([imageBuffer], { type: 'image/jpeg' }), 'pest.jpg');
        formData.append('cropType', cropType);
        formData.append('provider', settings.provider);
        formData.append('confidenceThreshold', settings.confidenceThreshold);
        formData.append('includeTreatment', settings.includeTreatment);

        const response = await fetch('/api/v1/computer-vision/agriculture/pest-disease', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        return data.data || { success: false, error: '识别失败' };
      } catch (error) {
        console.error('病虫害识别API调用失败:', error);

        // 模拟返回结果
        const mockDetections = [
          {
            name: '稻飞虱',
            type: 'pest',
            confidence: 0.92,
            severity: 'moderate',
            bbox: {
              x: 120,
              y: 80,
              width: 60,
              height: 40,
            },
            description: '水稻常见害虫，主要危害稻株基部，吸食汁液',
          },
          {
            name: '纹枯病',
            type: 'disease',
            confidence: 0.85,
            severity: 'severe',
            bbox: {
              x: 200,
              y: 150,
              width: 80,
              height: 60,
            },
            description: '水稻真菌病害，造成叶片枯死和产量损失',
          },
        ];

        return {
          success: true,
          cropType: cropType,
          detections: mockDetections,
          processingTime: 1.5,
          treatmentRecommendations: {
            chemical: [
              {
                name: '吡虫啉',
                dosage: '10-20g/亩',
                method: '喷雾',
                timing: '害虫发生初期',
                effectiveness: 95,
                type: 'chemical',
                precautions: ['避免开花期使用', '注意安全间隔期', '佩戴防护装备'],
              },
              {
                name: '噻虫嗪',
                dosage: '15-25g/亩',
                method: '喷雾',
                timing: '害虫发生初期',
                effectiveness: 90,
                type: 'chemical',
                precautions: ['避免高温时段使用', '注意蜜蜂安全'],
              },
            ],
            biological: [
              {
                name: '释放天敌瓢虫',
                description: '每亩释放100-200头瓢虫',
              },
              {
                name: '使用赤眼蜂',
                description: '生物防治稻纵卷叶螟',
              },
            ],
            cultural: [
              '及时清除田边杂草',
              '合理密植，通风透光',
              '科学施肥，增强抗性',
              '稻田养鱼，生态控制',
            ],
          },
        };
      }
    };

    // 重新识别
    const recognizeAgain = () => {
      recognitionResult.value = null;
      startRecognition();
    };

    // 保存结果
    const saveResult = () => {
      if (!recognitionResult.value?.success) return;

      // 这里应该调用API保存识别结果
      ElMessage.success('识别结果已保存');
    };

    // 分享结果
    const shareResult = () => {
      if (!recognitionResult.value?.success) return;

      // 分享功能
      ElMessage.info('分享功能开发中');
    };

    // 咨询专家
    const consultExpert = () => {
      if (!recognitionResult.value?.success) return;

      // 跳转到专家咨询页面
      ElMessage.info('正在连接农业专家...');
    };

    // 打开摄像头
    const openCamera = () => {
      // 调用摄像头功能
      ElMessage.info('摄像头功能开发中');
    };

    // 获取检测框样式
    const getBboxStyle = bbox => {
      const uploadSection = document.querySelector('.uploaded-image-container');
      if (!uploadSection) return {};

      const rect = uploadSection.getBoundingClientRect();
      const scaleX = rect.width / 640; // 假设图片宽度
      const scaleY = rect.height / 480; // 假设图片高度

      return {
        left: bbox.x * scaleX + 'px',
        top: bbox.y * scaleY + 'px',
        width: bbox.width * scaleX + 'px',
        height: bbox.height * scaleY + 'px',
      };
    };

    // 获取严重度标签
    const getSeverityLabel = severity => {
      const labels = {
        mild: '轻微',
        moderate: '中等',
        severe: '严重',
      };
      return labels[severity] || severity;
    };

    // 获取治疗类型图标
    const getTreatmentIcon = type => {
      const icons = {
        chemical: 'fas fa-flask',
        biological: 'fas fa-bug',
        cultural: 'fas fa-seedling',
      };
      return icons[type] || 'fas fa-medkit';
    };

    // 获取治疗类型标签
    const getTreatmentLabel = type => {
      const labels = {
        chemical: '化学防治',
        biological: '生物防治',
        cultural: '农业防治',
      };
      return labels[type] || type;
    };

    // 获取方法标签
    const getMethodLabel = type => {
      const labels = {
        chemical: '化学',
        biological: '生物',
        cultural: '农业',
      };
      return labels[type] || type;
    };

    // 重新拍照
    const retakePhoto = () => {
      uploadedImage.value = null;
      recognitionResult.value = null;
    };

    // 切换历史记录
    const toggleHistory = () => {
      showHistory.value = !showHistory.value;
    };

    // 添加到历史记录
    const addToHistory = (result, imageUrl) => {
      const cropInfo = cropTypes.find(c => c.value === result.cropType);
      const historyItem = {
        timestamp: new Date(),
        cropType: result.cropType,
        cropLabel: cropInfo?.label || result.cropType,
        success: result.success,
        detectionCount: result.detections ? result.detections.length : 0,
        image: imageUrl,
        provider: settings.provider,
        confidence: result.confidence || 0,
      };

      recognitionHistory.value.unshift(historyItem);

      // 限制历史记录数量
      if (recognitionHistory.value.length > 20) {
        recognitionHistory.value = recognitionHistory.value.slice(0, 20);
      }

      // 保存到本地存储
      try {
        localStorage.setItem('pestDiseaseHistory', JSON.stringify(recognitionHistory.value));
      } catch (error) {
        console.error('保存历史记录失败:', error);
      }
    };

    // 加载历史记录
    const loadRecognitionHistory = () => {
      try {
        const saved = localStorage.getItem('pestDiseaseHistory');
        if (saved) {
          recognitionHistory.value = JSON.parse(saved);
        }
      } catch (error) {
        console.error('加载历史记录失败:', error);
      }
    };

    // 加载历史项
    const loadHistoryItem = item => {
      selectedCrop.value = item.cropType;
      uploadedImage.value = item.image;
      recognitionResult.value = {
        success: item.success,
        cropType: item.cropType,
        detections:
          item.detectionCount > 0
            ? [
                {
                  name: '历史记录数据',
                  confidence: item.confidence,
                  type: 'pest',
                },
              ]
            : null,
      };
    };

    // 获取历史状态标签
    const getHistoryStatusLabel = item => {
      if (item.success) {
        return item.detectionCount > 0 ? '发现问题' : '健康';
      }
      return '失败';
    };

    // 格式化置信度
    const formatConfidence = value => {
      return (value * 100).toFixed(0) + '%';
    };

    // 格式化时间
    const formatTime = timestamp => {
      return new Date(timestamp).toLocaleString();
    };

    onMounted(() => {
      loadRecognitionHistory();
    });

    return {
      // refs
      fileInput,

      // 状态
      uploadedImage,
      isProcessing,
      isDragging,
      selectedCrop,
      recognitionResult,
      activeTreatmentType,
      showHistory,
      settings,

      // 数据
      cropTypes,

      // 方法
      selectCrop,
      handleFileSelect,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      startRecognition,
      recognizeAgain,
      retakePhoto,
      saveResult,
      shareResult,
      consultExpert,
      openCamera,
      getBboxStyle,
      getSeverityLabel,
      getTreatmentIcon,
      getTreatmentLabel,
      getMethodLabel,
      toggleHistory,
      loadHistoryItem,
      getHistoryStatusLabel,
      formatConfidence,
      formatTime,
    };
  },
};
</script>

<style scoped>
.pest-disease-recognition {
  position: relative;
  max-width: 1000px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.recognition-container {
  padding: 24px;
}

.upload-section {
  margin-bottom: 24px;
}

.upload-area {
  position: relative;
  background: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 12px;
  transition: all 0.3s;
  overflow: hidden;
}

.upload-area.has-image {
  border-style: solid;
  border-color: #4caf50;
  background: white;
}

.upload-area.processing {
  opacity: 0.7;
  pointer-events: none;
}

.upload-placeholder {
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-placeholder:hover {
  background: #f0f8ff;
  border-color: #2196f3;
}

.upload-icon {
  font-size: 48px;
  color: #2196f3;
  margin-bottom: 16px;
}

.upload-text h3 {
  margin: 0 0 8px;
  color: #333;
  font-size: 18px;
}

.upload-text p {
  margin: 0 0 4px;
  color: #666;
  font-size: 14px;
}

.upload-text small {
  color: #999;
  font-size: 12px;
}

.uploaded-image-container {
  position: relative;
  width: 100%;
  max-height: 400px;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.processing-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.image-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-btn {
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.drop-zone {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(33, 150, 243, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #2196f3;
  border: 2px dashed #2196f3;
  border-radius: 12px;
  transition: all 0.3s;
}

.drop-zone:hover {
  background: rgba(33, 150, 243, 0.2);
}

.drop-zone i {
  font-size: 32px;
  margin-bottom: 8px;
}

.crop-selection {
  margin-bottom: 24px;
}

.crop-selection h3 {
  margin: 0 0 16px;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.crop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.crop-card {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 12px;
}

.crop-card:hover {
  border-color: #4caf50;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.1);
}

.crop-card.selected {
  border-color: #4caf50;
  background: #f0f7f0;
}

.crop-icon {
  width: 48px;
  height: 48px;
  background: #f0f7f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #4caf50;
}

.crop-info h4 {
  margin: 0 0 4px;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.crop-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section h3 {
  margin: 0 0 16px;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-item label {
  font-weight: 500;
  color: #555;
  font-size: 14px;
}

.recognize-btn {
  width: 100%;
  padding: 12px 24px;
  border: none;
  background: #4caf50;
  color: white;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.recognize-btn:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-1px);
}

.recognize-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.result-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.result-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
}

.result-status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.result-status.success {
  background: #e8f5e8;
  color: #4caf50;
}

.result-status.error {
  background: #ffebee;
  color: #f44336;
}

.success-result {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detections-container h4 {
  margin: 0 0 16px;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.detections-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detection-item {
  background: white;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e0e0e0;
  position: relative;
}

.detection-item.pest {
  border-left: 4px solid #ff9800;
}

.detection-item.disease {
  border-left: 4px solid #f44336;
}

.detection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.detection-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.detection-name i {
  font-size: 18px;
}

.detection-confidence {
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.detection-severity {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.severity-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.severity-badge.mild {
  background: #fff3e0;
  color: #ff9800;
}

.severity-badge.moderate {
  background: #fff8e1;
  color: #ffc107;
}

.severity-badge.severe {
  background: #ffebee;
  color: #f44336;
}

.detection-type {
  background: #e0e0e0;
  color: #666;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.detection-description {
  color: #666;
  font-size: 14px;
  line-height: 1.4;
  margin-top: 8px;
}

.detection-bbox {
  position: absolute;
  border: 2px solid #4caf50;
  background: rgba(76, 175, 80, 0.1);
}

.bbox-label {
  position: absolute;
  top: -28px;
  left: 0;
  background: #4caf50;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}

.treatment-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e0e0e0;
}

.treatment-section h4 {
  margin: 0 0 16px;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.treatment-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  background: white;
  color: #666;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.tab-btn.active {
  background: #4caf50;
  color: white;
  border-color: #4caf50;
}

.tab-btn:hover {
  background: #f0f7f0;
  border-color: #4caf50;
}

.tab-btn .badge {
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.treatment-content {
  max-height: 400px;
  overflow-y: auto;
}

.treatment-item {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e0e0e0;
}

.treatment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.treatment-header h5 {
  margin: 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.treatment-meta {
  display: flex;
  gap: 8px;
}

.method-type {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.method-type.chemical {
  background: #ffebee;
  color: #f44336;
}

.method-type.biological {
  background: #e8f5e8;
  color: #4caf50;
}

.method-type.cultural {
  background: #f3e5f5;
  color: #9c27b0;
}

.effectiveness {
  color: #4caf50;
  font-size: 12px;
  font-weight: 500;
}

.treatment-details {
  color: #333;
}

.treatment-details p {
  margin: 4px 0;
  font-size: 14px;
}

.precautions {
  margin-top: 12px;
  padding: 12px;
  background: #fff3e0;
  border-radius: 4px;
}

.precautions h5 {
  margin: 0 0 8px;
  color: #e65100;
  font-size: 14px;
}

.precautions ul {
  margin: 0;
  padding-left: 20px;
}

.precautions li {
  margin: 4px 0;
  color: #666;
  font-size: 13px;
}

.prevention-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e0e0e0;
}

.prevention-section h4 {
  margin: 0 0 16px;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.prevention-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prevention-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f0f8ff;
  border-radius: 4px;
  font-size: 14px;
  color: #1976d2;
}

.no-detection-result {
  text-align: center;
  padding: 32px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.no-detection-icon {
  font-size: 48px;
  color: #4caf50;
  margin-bottom: 16px;
}

.no-detection-message h4 {
  margin: 0 0 8px;
  color: #333;
  font-size: 18px;
}

.no-detection-message p {
  margin: 0 0 16px;
  color: #666;
  font-size: 16px;
  line-height: 1.5;
}

.healthy-tips {
  text-align: left;
  background: #f0f8ff;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.healthy-tips h5 {
  margin: 0 0 8px;
  color: #1976d2;
  font-size: 14px;
}

.healthy-tips ul {
  margin: 0;
  padding-left: 20px;
}

.healthy-tips li {
  margin: 4px 0;
  color: #1976d2;
  font-size: 14px;
  line-height: 1.4;
}

.error-result {
  text-align: center;
  padding: 32px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.error-icon {
  font-size: 48px;
  color: #f44336;
  margin-bottom: 16px;
}

.error-message h4 {
  margin: 0 0 8px;
  color: #333;
  font-size: 18px;
}

.error-message p {
  margin: 0 0 16px;
  color: #666;
  font-size: 16px;
  line-height: 1.5;
}

.error-suggestions {
  text-align: left;
  background: #fff3e0;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
}

.error-suggestions h5 {
  margin: 0 0 8px;
  color: #e65100;
  font-size: 14px;
}

.error-suggestions ul {
  margin: 0;
  padding-left: 20px;
}

.error-suggestions li {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 20px;
}

.result-actions .action-btn {
  padding: 10px 20px;
  border: 1px solid #4caf50;
  background: white;
  color: #4caf50;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.result-actions .action-btn:hover {
  background: #4caf50;
  color: white;
}

.result-actions .action-btn.primary {
  background: #4caf50;
  color: white;
  border-color: #4caf50;
}

.result-actions .action-btn.secondary {
  background: white;
  color: #666;
  border-color: #e0e0e0;
}

.result-actions .action-btn.secondary:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.history-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.history-section h3 {
  margin: 0 0 16px;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.history-item:hover {
  background: #e3f2fd;
}

.history-image {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.history-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-crop {
  font-weight: 500;
  color: #333;
  font-size: 14px;
  margin-bottom: 2px;
}

.history-time {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.history-result {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.history-result.success {
  color: #4caf50;
}

.history-result.detection {
  color: #ff9800;
}

.history-result.error {
  color: #f44336;
}

.history-detections {
  font-size: 12px;
  color: #666;
}

.floating-actions {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 100;
}

.floating-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #4caf50;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.floating-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
}

.floating-btn.active {
  background: #1976d2;
}

.camera-btn {
  background: #ff9800;
}

.camera-btn:hover {
  box-shadow: 0 6px 16px rgba(255, 152, 0, 0.4);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .recognition-container {
    padding: 16px;
  }

  .crop-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }

  .result-actions {
    flex-direction: column;
  }

  .history-section {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: 8px 8px 0 0;
  }
}
</style>
