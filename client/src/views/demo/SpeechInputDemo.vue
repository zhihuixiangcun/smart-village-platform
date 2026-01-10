<template>
  <div class="speech-demo">
    <el-card shadow="always">
      <template #header>
        <div class="card-header">
          <span>🎤 语音输入功能演示</span>
        </div>
      </template>

      <!-- 语音输入示例 -->
      <div class="demo-section">
        <h3>支出描述语音输入</h3>
        <div class="input-group">
          <el-input
            ref="descriptionRef"
            v-model="formData.description"
            placeholder="请输入支出描述，或点击语音按钮"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
          <speech-input
            :target-ref="descriptionRef"
            button-text="语音输入"
            show-language-selector
            show-tips
            @confirmed="handleDescriptionConfirmed"
            @error="handleSpeechError"
          />
        </div>
      </div>

      <!-- 搜索语音输入 -->
      <div class="demo-section">
        <h3>搜索关键词语音输入</h3>
        <div class="input-group">
          <el-input
            ref="searchRef"
            v-model="searchKeyword"
            placeholder="请输入搜索关键词"
            clearable
          />
          <speech-input
            :target-ref="searchRef"
            button-text="🎤"
            size="small"
            @confirmed="handleSearchConfirmed"
          />
          <el-button @click="performSearch" type="primary">搜索</el-button>
        </div>
      </div>

      <!-- 金额语音输入 -->
      <div class="demo-section">
        <h3>金额语音输入</h3>
        <div class="input-group">
          <el-input
            ref="amountRef"
            v-model="formData.amount"
            placeholder="请输入金额，支持语音识别数字"
            type="number"
          />
          <speech-input
            :target-ref="amountRef"
            button-text="语音"
            size="small"
            @confirmed="handleAmountConfirmed"
          />
        </div>
      </div>

      <!-- 申请人语音输入 -->
      <div class="demo-section">
        <h3>申请人姓名语音输入</h3>
        <div class="input-group">
          <el-input
            ref="applicantRef"
            v-model="formData.applicant"
            placeholder="请输入申请人姓名"
          />
          <speech-input
            :target-ref="applicantRef"
            button-text="语音"
            size="small"
            @confirmed="handleApplicantConfirmed"
          />
        </div>
      </div>

      <!-- 语音命令演示 -->
      <div class="demo-section">
        <h3>语音命令演示</h3>
        <el-alert title="支持的语音命令" type="info" :closable="false">
          <ul class="command-list">
            <li>🗣️ "删除XXX" - 删除特定内容</li>
            <li>🗣️ "清空" - 清空输入框</li>
            <li>🗣️ "重新开始" - 重新开始输入</li>
            <li>🗣️ "提交" - 提交表单</li>
            <li>🗣️ "保存" - 保存内容</li>
            <li>🗣️ "取消" - 取消操作</li>
          </ul>
        </el-alert>
      </div>

      <!-- 表单预览 -->
      <div class="demo-section">
        <h3>表单数据预览</h3>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="支出描述">
            {{ formData.description || '(未填写)' }}
          </el-descriptions-item>
          <el-descriptions-item label="金额">
            {{ formData.amount ? `¥${formData.amount}` : '(未填写)' }}
          </el-descriptions-item>
          <el-descriptions-item label="申请人">
            {{ formData.applicant || '(未填写)' }}
          </el-descriptions-item>
          <el-descriptions-item label="搜索关键词">
            {{ searchKeyword || '(未搜索)' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 操作按钮 -->
      <div class="demo-actions">
        <el-button @click="clearForm" icon="Delete">清空表单</el-button>
        <el-button @click="fillDemoData" type="info" icon="Magic">填入示例数据</el-button>
        <el-button @click="simulateSubmit" type="primary" icon="Check">模拟提交</el-button>
      </div>
    </el-card>

    <!-- 语音识别状态显示 -->
    <el-card v-if="speechStatus.isActive" shadow="hover" class="speech-status-card">
      <template #header>
        <span>🎙️ 语音识别状态</span>
      </template>
      <el-descriptions :column="1">
        <el-descriptions-item label="识别状态">
          <el-tag :type="speechStatus.isListening ? 'success' : 'warning'">
            {{ speechStatus.isListening ? '正在听取' : '处理中' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="speechStatus.confidence > 0" label="置信度">
          <el-progress :percentage="speechStatus.confidence" :stroke-width="8" :show-text="true" />
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import SpeechInput from '@/components/common/SpeechInput.vue';

// 表单数据
const formData = reactive({
  description: '',
  amount: '',
  applicant: '',
});

// 搜索关键词
const searchKeyword = ref('');

// 输入框引用
const descriptionRef = ref();
const searchRef = ref();
const amountRef = ref();
const applicantRef = ref();

// 语音识别状态
const speechStatus = reactive({
  isActive: false,
  isListening: false,
  confidence: 0,
});

// 方法
const handleDescriptionConfirmed = text => {
  ElMessage.success(`语音输入完成: ${text}`);
};

const handleSearchConfirmed = text => {
  ElMessage.success(`搜索关键词: ${text}`);
  performSearch();
};

const handleAmountConfirmed = text => {
  // 处理数字转换
  const processedAmount = processNumberFromSpeech(text);
  if (processedAmount) {
    formData.amount = processedAmount;
    ElMessage.success(`金额识别: ¥${processedAmount}`);
  } else {
    ElMessage.warning('无法识别金额，请重新输入');
  }
};

const handleApplicantConfirmed = text => {
  ElMessage.success(`申请人: ${text}`);
};

const handleSpeechError = error => {
  ElMessage.error(`语音识别错误: ${error}`);
};

// 处理语音识别的数字
const processNumberFromSpeech = text => {
  // 数字转换映射
  const numberMap = {
    零: '0',
    一: '1',
    二: '2',
    三: '3',
    四: '4',
    五: '5',
    六: '6',
    七: '7',
    八: '8',
    九: '9',
    十: '10',
    百: '100',
    千: '1000',
    万: '10000',
  };

  // 简单的数字识别逻辑
  let processedText = text.replace(/[，。]/g, '');

  // 替换中文数字
  Object.entries(numberMap).forEach(([chinese, arabic]) => {
    processedText = processedText.replace(new RegExp(chinese, 'g'), arabic);
  });

  // 提取数字
  const numbers = processedText.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    return numbers[0];
  }

  return null;
};

const performSearch = () => {
  if (searchKeyword.value.trim()) {
    ElMessage.info(`执行搜索: ${searchKeyword.value}`);
  }
};

const clearForm = () => {
  Object.assign(formData, {
    description: '',
    amount: '',
    applicant: '',
  });
  searchKeyword.value = '';
  ElMessage.success('表单已清空');
};

const fillDemoData = () => {
  Object.assign(formData, {
    description: '村道维修费用申请，包括路面修补和护栏更换',
    amount: '15000',
    applicant: '张建设',
  });
  searchKeyword.value = '维修';
  ElMessage.success('已填入示例数据');
};

const simulateSubmit = () => {
  if (!formData.description || !formData.amount || !formData.applicant) {
    ElMessage.warning('请完善表单信息');
    return;
  }

  ElMessage.success('模拟提交成功!');
  console.log('提交的表单数据:', formData);
};
</script>

<style lang="scss" scoped>
.speech-demo {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;

  .demo-section {
    margin-bottom: 30px;

    h3 {
      margin-bottom: 16px;
      color: #303133;
      font-weight: 600;
    }

    .input-group {
      display: flex;
      gap: 12px;
      align-items: flex-start;

      .el-input {
        flex: 1;
      }
    }
  }

  .command-list {
    margin: 0;
    padding-left: 20px;

    li {
      margin-bottom: 8px;
      color: #606266;
    }
  }

  .demo-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 30px;
  }

  .speech-status-card {
    margin-top: 20px;
    border: 2px solid #409eff;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .speech-demo {
    padding: 16px;

    .demo-section {
      .input-group {
        flex-direction: column;

        .el-input {
          margin-bottom: 8px;
        }
      }
    }

    .demo-actions {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
