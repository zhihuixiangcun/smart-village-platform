<template>
  <el-dialog
    v-model="visible"
    title="智能发票识别"
    width="60%"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="ocr-dialog">
      <!-- OCR配置 -->
      <div class="ocr-config">
        <el-form :model="ocrConfig" label-width="100px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="识别引擎">
                <el-select v-model="ocrConfig.provider" placeholder="选择OCR服务">
                  <el-option label="百度OCR" value="baidu" />
                  <el-option label="腾讯OCR" value="tencent" />
                  <el-option label="阿里云OCR" value="aliyun" />
                  <el-option label="本地识别" value="local" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="识别模式">
                <el-select v-model="ocrConfig.mode" placeholder="选择识别模式">
                  <el-option label="高精度" value="high_accuracy" />
                  <el-option label="快速识别" value="fast" />
                  <el-option label="通用文字" value="general" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <!-- 文件上传区域 -->
      <div class="upload-section">
        <el-upload
          ref="uploadRef"
          class="invoice-upload"
          drag
          :auto-upload="false"
          :limit="1"
          :file-list="fileList"
          accept="image/*,.pdf"
          @change="handleFileChange"
          @exceed="handleExceed"
        >
          <div class="upload-content">
            <el-icon class="upload-icon"><UploadFilled /></el-icon>
            <div class="upload-text">
              <p>点击或拖拽发票图片到此处</p>
              <p class="upload-tip">支持 JPG、PNG、PDF 格式，文件大小不超过 10MB</p>
            </div>
          </div>
        </el-upload>
      </div>

      <!-- 预览区域 -->
      <div v-if="previewUrl" class="preview-section">
        <h4>图片预览</h4>
        <div class="image-preview">
          <img :src="previewUrl" alt="发票预览" @load="onImageLoad" />
          <div class="preview-tools">
            <el-button-group>
              <el-button size="small" @click="rotateImage">
                <el-icon><Refresh /></el-icon>
                旋转
              </el-button>
              <el-button size="small" @click="enhanceImage">
                <el-icon><Picture /></el-icon>
                增强
              </el-button>
              <el-button size="small" @click="cropImage">
                <el-icon><Crop /></el-icon>
                裁剪
              </el-button>
            </el-button-group>
          </div>
        </div>
      </div>

      <!-- OCR识别结果 -->
      <div v-if="ocrResult" class="result-section">
        <h4>识别结果</h4>
        
        <!-- 置信度显示 -->
        <div class="confidence-bar">
          <span>识别置信度：</span>
          <el-progress 
            :percentage="Math.round(ocrResult.confidence * 100)"
            :color="getConfidenceColor(ocrResult.confidence)"
            :show-text="false"
          />
          <span class="confidence-value">{{ Math.round(ocrResult.confidence * 100) }}%</span>
        </div>

        <!-- 基本信息 -->
        <el-card class="result-card">
          <template #header>
            <div class="card-header">
              <span>发票基本信息</span>
              <el-tag v-if="ocrResult.confidence < 0.8" type="warning">
                低置信度，请检查
              </el-tag>
            </div>
          </template>
          
          <el-form :model="ocrResult" label-width="120px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="商户名称">
                  <el-input 
                    v-model="ocrResult.merchantName" 
                    placeholder="商户名称"
                    :class="{ 'low-confidence': getFieldConfidence('merchantName') < 0.8 }"
                  />
                </el-form-item>
              </el-col>
              
              <el-col :span="12">
                <el-form-item label="发票号码">
                  <el-input 
                    v-model="ocrResult.invoiceNumber" 
                    placeholder="发票号码"
                    :class="{ 'low-confidence': getFieldConfidence('invoiceNumber') < 0.8 }"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="总金额">
                  <el-input-number
                    v-model="ocrResult.amount"
                    :precision="2"
                    :min="0"
                    placeholder="总金额"
                    class="full-width"
                    :class="{ 'low-confidence': getFieldConfidence('amount') < 0.8 }"
                  />
                </el-form-item>
              </el-col>
              
              <el-col :span="12">
                <el-form-item label="税额">
                  <el-input-number
                    v-model="ocrResult.taxAmount"
                    :precision="2"
                    :min="0"
                    placeholder="税额"
                    class="full-width"
                    :class="{ 'low-confidence': getFieldConfidence('taxAmount') < 0.8 }"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="开票日期">
                  <el-date-picker
                    v-model="ocrResult.date"
                    type="date"
                    placeholder="开票日期"
                    format="YYYY-MM-DD"
                    value-format="YYYY-MM-DD"
                    class="full-width"
                    :class="{ 'low-confidence': getFieldConfidence('date') < 0.8 }"
                  />
                </el-form-item>
              </el-col>
              
              <el-col :span="12">
                <el-form-item label="发票类型">
                  <el-input 
                    v-model="ocrResult.invoiceType" 
                    placeholder="发票类型"
                    :class="{ 'low-confidence': getFieldConfidence('invoiceType') < 0.8 }"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <!-- 扩展信息 -->
            <el-collapse v-if="hasExtendedInfo">
              <el-collapse-item title="详细信息" name="details">
                <el-row :gutter="20" v-if="ocrResult.buyerName">
                  <el-col :span="12">
                    <el-form-item label="购买方">
                      <el-input v-model="ocrResult.buyerName" placeholder="购买方名称" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="纳税人识别号">
                      <el-input v-model="ocrResult.buyerTaxId" placeholder="纳税人识别号" />
                    </el-form-item>
                  </el-col>
                </el-row>
                
                <el-row :gutter="20" v-if="ocrResult.sellerName">
                  <el-col :span="12">
                    <el-form-item label="销售方">
                      <el-input v-model="ocrResult.sellerName" placeholder="销售方名称" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="销售方税号">
                      <el-input v-model="ocrResult.sellerTaxId" placeholder="销售方税号" />
                    </el-form-item>
                  </el-col>
                </el-row>
                
                <!-- 商品明细 -->
                <div v-if="ocrResult.items && ocrResult.items.length > 0">
                  <h5>商品明细</h5>
                  <el-table :data="ocrResult.items" size="small">
                    <el-table-column prop="name" label="商品名称" />
                    <el-table-column prop="specification" label="规格型号" />
                    <el-table-column prop="unit" label="单位" width="80" />
                    <el-table-column prop="quantity" label="数量" width="80" />
                    <el-table-column prop="unitPrice" label="单价" width="100" />
                    <el-table-column prop="amount" label="金额" width="100" />
                  </el-table>
                </div>
              </el-collapse-item>
            </el-collapse>
          </el-form>
        </el-card>

        <!-- 验证提示 -->
        <div v-if="validationErrors.length > 0" class="validation-section">
          <el-alert
            title="数据验证警告"
            type="warning"
            :closable="false"
            show-icon
          >
            <ul>
              <li v-for="error in validationErrors" :key="error">{{ error }}</li>
            </ul>
          </el-alert>
        </div>
      </div>

      <!-- 处理状态 -->
      <div v-if="processing" class="processing-section">
        <div class="processing-content">
          <el-icon class="is-loading"><Loading /></el-icon>
          <p>正在识别发票信息，请稍候...</p>
          <p class="processing-tip">{{ processingTip }}</p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button 
          type="primary" 
          @click="startOCR"
          :loading="processing"
          :disabled="!selectedFile"
        >
          开始识别
        </el-button>
        <el-button 
          v-if="ocrResult"
          type="success" 
          @click="useResult"
        >
          使用结果
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, Refresh, Picture, Crop, Loading } from '@element-plus/icons-vue'
import { financeApi } from '@/api/project'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'recognized'])

// 响应式数据
const uploadRef = ref()
const fileList = ref([])
const selectedFile = ref(null)
const previewUrl = ref('')
const processing = ref(false)
const ocrResult = ref(null)
const validationErrors = ref([])
const processingTip = ref('')

// OCR配置
const ocrConfig = reactive({
  provider: 'baidu',
  mode: 'high_accuracy'
})

// 计算属性
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const hasExtendedInfo = computed(() => {
  return ocrResult.value && (
    ocrResult.value.buyerName || 
    ocrResult.value.sellerName || 
    (ocrResult.value.items && ocrResult.value.items.length > 0)
  )
})

// 监听器
watch(visible, (newVal) => {
  if (!newVal) {
    resetDialog()
  }
})

// 方法
const handleFileChange = (file, fileListData) => {
  fileList.value = fileListData
  selectedFile.value = file
  
  // 创建预览URL
  if (file.raw) {
    previewUrl.value = URL.createObjectURL(file.raw)
  }
  
  // 清除之前的结果
  ocrResult.value = null
  validationErrors.value = []
}

const handleExceed = () => {
  ElMessage.warning('只能选择一个文件进行识别')
}

const onImageLoad = () => {
  // 图片加载完成后可以进行预处理
  console.log('图片加载完成')
}

const rotateImage = () => {
  // 图片旋转功能
  ElMessage.info('图片旋转功能开发中')
}

const enhanceImage = () => {
  // 图片增强功能
  ElMessage.info('图片增强功能开发中')
}

const cropImage = () => {
  // 图片裁剪功能
  ElMessage.info('图片裁剪功能开发中')
}

const startOCR = async () => {
  if (!selectedFile.value) {
    ElMessage.error('请先选择发票图片')
    return
  }

  try {
    processing.value = true
    processingTip.value = '正在上传图片...'
    
    setTimeout(() => {
      processingTip.value = '正在分析图片内容...'
    }, 1000)
    
    setTimeout(() => {
      processingTip.value = '正在提取文字信息...'
    }, 2000)
    
    setTimeout(() => {
      processingTip.value = '正在验证识别结果...'
    }, 3000)

    const response = await financeApi.processInvoiceOCR(
      selectedFile.value.raw,
      ocrConfig.provider
    )

    if (response.data.success) {
      ocrResult.value = response.data.data
      validateOCRResult()
      
      ElMessage.success(`发票识别成功，置信度：${Math.round(ocrResult.value.confidence * 100)}%`)
    } else {
      throw new Error(response.data.error || '识别失败')
    }

  } catch (error) {
    ElMessage.error('发票识别失败：' + error.message)
  } finally {
    processing.value = false
    processingTip.value = ''
  }
}

const validateOCRResult = () => {
  validationErrors.value = []
  
  if (!ocrResult.value) return
  
  // 商户名称验证
  if (!ocrResult.value.merchantName || ocrResult.value.merchantName.trim().length === 0) {
    validationErrors.value.push('商户名称不能为空')
  }
  
  // 金额验证
  if (!ocrResult.value.amount || ocrResult.value.amount <= 0) {
    validationErrors.value.push('金额必须大于0')
  }
  
  if (ocrResult.value.amount > 1000000) {
    validationErrors.value.push('金额过大，请检查识别结果')
  }
  
  // 税额验证
  if (ocrResult.value.taxAmount && ocrResult.value.amount) {
    const taxRate = ocrResult.value.taxAmount / ocrResult.value.amount
    if (taxRate < 0 || taxRate > 0.5) {
      validationErrors.value.push('税额与总额比例异常，请检查')
    }
  }
  
  // 日期验证
  if (!ocrResult.value.date) {
    validationErrors.value.push('开票日期不能为空')
  } else {
    const invoiceDate = new Date(ocrResult.value.date)
    const now = new Date()
    if (invoiceDate > now) {
      validationErrors.value.push('开票日期不能晚于当前日期')
    }
  }
  
  // 发票号码验证
  if (ocrResult.value.invoiceNumber && !/^[A-Za-z0-9]{6,20}$/.test(ocrResult.value.invoiceNumber)) {
    validationErrors.value.push('发票号码格式可能有误')
  }
}

const getFieldConfidence = (field) => {
  // 模拟字段级置信度
  return ocrResult.value?.confidence || 0
}

const getConfidenceColor = (confidence) => {
  if (confidence >= 0.9) return '#67c23a'
  if (confidence >= 0.8) return '#e6a23c'
  return '#f56c6c'
}

const useResult = () => {
  if (validationErrors.value.length > 0) {
    ElMessageBox.confirm(
      '检测到数据验证警告，是否仍要使用此结果？',
      '确认使用',
      {
        confirmButtonText: '确定使用',
        cancelButtonText: '继续修改',
        type: 'warning'
      }
    ).then(() => {
      emit('recognized', ocrResult.value)
    }).catch(() => {
      // 用户选择继续修改
    })
  } else {
    emit('recognized', ocrResult.value)
  }
}

const handleClose = () => {
  visible.value = false
}

const resetDialog = () => {
  fileList.value = []
  selectedFile.value = null
  previewUrl.value = ''
  ocrResult.value = null
  validationErrors.value = []
  processing.value = false
  
  // 清理预览URL
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
}
</script>

<style scoped>
.ocr-dialog {
  padding: 20px 0;
}

.ocr-config {
  margin-bottom: 24px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.upload-section {
  margin-bottom: 24px;
}

.invoice-upload {
  width: 100%;
}

:deep(.el-upload-dragger) {
  width: 100%;
  height: 200px;
  border-radius: 12px;
  border: 2px dashed #d9d9d9;
  transition: all 0.3s ease;
}

:deep(.el-upload-dragger:hover) {
  border-color: #409eff;
  background-color: #f5f7fa;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
}

.upload-icon {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.upload-text p {
  margin: 0;
  color: #606266;
}

.upload-text p:first-child {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
}

.preview-section {
  margin-bottom: 24px;
}

.preview-section h4 {
  margin: 0 0 16px 0;
  color: #303133;
}

.image-preview {
  position: relative;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
}

.image-preview img {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  display: block;
}

.preview-tools {
  position: absolute;
  top: 12px;
  right: 12px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  padding: 4px;
  backdrop-filter: blur(4px);
}

.result-section {
  margin-bottom: 24px;
}

.result-section h4 {
  margin: 0 0 16px 0;
  color: #303133;
}

.confidence-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.confidence-value {
  font-weight: 600;
  min-width: 45px;
}

.result-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.full-width {
  width: 100%;
}

.low-confidence {
  background-color: #fef5e7 !important;
  border-color: #e6a23c !important;
}

.validation-section {
  margin-top: 16px;
}

.validation-section ul {
  margin: 0;
  padding-left: 20px;
}

.processing-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  margin-bottom: 24px;
}

.processing-content {
  text-align: center;
}

.processing-content .el-icon {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 16px;
}

.processing-content p {
  margin: 8px 0;
  color: #606266;
}

.processing-tip {
  font-size: 14px;
  color: #909399;
}

.dialog-footer {
  text-align: right;
}

.dialog-footer .el-button {
  margin-left: 12px;
}

/* 动画效果 */
.result-card {
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ocr-dialog {
    padding: 12px 0;
  }
  
  .upload-content {
    padding: 16px;
  }
  
  .upload-icon {
    font-size: 36px;
  }
  
  .preview-tools {
    position: static;
    margin-top: 12px;
    background-color: transparent;
    backdrop-filter: none;
  }
  
  .confidence-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
}
</style>