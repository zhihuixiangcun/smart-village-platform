<template>
  <div class="voice-assistant-page">
    <div class="page-header">
      <h1>智慧语音助手</h1>
      <p>使用语音交互，支持22种方言识别</p>
    </div>

    <div class="page-content">
      <el-row :gutter="20">
        <!-- 语音助手主体 -->
        <el-col :span="16" :xs="24">
          <el-card class="voice-card">
            <VoiceAssistant />
          </el-card>
        </el-col>

        <!-- 功能说明 -->
        <el-col :span="8" :xs="24">
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <span>功能特性</span>
              </div>
            </template>

            <div class="feature-list">
              <div class="feature-item">
                <el-icon class="feature-icon"><Microphone /></el-icon>
                <div class="feature-content">
                  <h4>方言识别</h4>
                  <p>支持普通话、粤语、四川话等22种方言</p>
                </div>
              </div>

              <div class="feature-item">
                <el-icon class="feature-icon"><ChatLineRound /></el-icon>
                <div class="feature-content">
                  <h4>智能对话</h4>
                  <p>理解村民常用语言，提供准确回应</p>
                </div>
              </div>

              <div class="feature-item">
                <el-icon class="feature-icon"><Service /></el-icon>
                <div class="feature-content">
                  <h4>村务服务</h4>
                  <p>查询政策、办理业务、获取信息</p>
                </div>
              </div>

              <div class="feature-item">
                <el-icon class="feature-icon"><Bell /></el-icon>
                <div class="feature-content">
                  <h4>语音唤醒</h4>
                  <p>说"小智"即可激活语音助手</p>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 使用指南 -->
          <el-card class="guide-card" style="margin-top: 20px">
            <template #header>
              <div class="card-header">
                <span>使用指南</span>
              </div>
            </template>

            <div class="guide-content">
              <h4>支持的语音命令：</h4>
              <ul class="command-list">
                <li><strong>查询类：</strong>"查询村民信息"、"看看最新公告"</li>
                <li><strong>办理类：</strong>"办理医保"、"申请补贴"</li>
                <li><strong>导航类：</strong>"打开服务大厅"、"进入个人中心"</li>
                <li><strong>紧急类：</strong>"紧急求助"、"需要帮助"</li>
                <li><strong>帮助类：</strong>"帮助"、"怎么用"</li>
              </ul>

              <h4>使用提示：</h4>
              <ul class="tips-list">
                <li>首次使用需要授权麦克风权限</li>
                <li>在安静环境下使用效果更佳</li>
                <li>说话清晰，语速适中</li>
                <li>支持方言切换和个性化设置</li>
              </ul>
            </div>
          </el-card>

          <!-- 支持的方言 -->
          <el-card class="dialect-card" style="margin-top: 20px">
            <template #header>
              <div class="card-header">
                <span>支持的方言</span>
                <el-button type="text" @click="showAllDialects = !showAllDialects">
                  {{ showAllDialects ? '收起' : '展开' }}
                </el-button>
              </div>
            </template>

            <div class="dialect-grid">
              <div
                v-for="dialect in displayDialects"
                :key="dialect.code"
                class="dialect-item"
                :class="{ active: currentDialect === dialect.code }"
                @click="selectDialect(dialect)"
              >
                <span class="dialect-name">{{ dialect.name }}</span>
                <span class="dialect-region">{{ dialect.region }}</span>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 方言展示弹窗 -->
    <el-dialog v-model="showAllDialects" title="所有支持的方言" width="600px">
      <div class="all-dialects">
        <div v-for="dialect in allDialects" :key="dialect.code" class="dialect-item-full">
          <div class="dialect-info">
            <span class="dialect-name">{{ dialect.name }}</span>
            <span class="dialect-code">({{ dialect.code }})</span>
          </div>
          <span class="dialect-region">{{ dialect.region }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Microphone, ChatLineRound, Service, Bell } from '@element-plus/icons-vue';
import VoiceAssistant from '@/components/voice/VoiceAssistant.vue';

// 页面状态
const showAllDialects = ref(false);
const currentDialect = ref('zh');

// 方言数据
const allDialects = ref([
  { code: 'zh', name: '普通话', region: '全国' },
  { code: 'yue', name: '粤语', region: '广东、广西、香港、澳门' },
  { code: 'nan', name: '闽南语', region: '福建、台湾、潮汕' },
  { code: 'hak', name: '客家话', region: '广东、江西、福建' },
  { code: 'wuu', name: '吴语', region: '江苏、浙江、上海' },
  { code: 'hsn', name: '湘语', region: '湖南' },
  { code: 'gan', name: '赣语', region: '江西' },
  { code: 'zh-northeast', name: '东北话', region: '东北三省' },
  { code: 'zh-sichuan', name: '四川话', region: '四川、重庆' },
  { code: 'zh-chongqing', name: '重庆话', region: '重庆' },
  { code: 'zh-shandong', name: '山东话', region: '山东' },
  { code: 'zh-henan', name: '河南话', region: '河南' },
  { code: 'zh-hubei', name: '湖北话', region: '湖北' },
  { code: 'zh-jiangzhe', name: '江浙话', region: '江苏、浙江' },
  { code: 'zh-anhui', name: '安徽话', region: '安徽' },
  { code: 'zh-hebei', name: '河北话', region: '河北' },
  { code: 'zh-shanxi', name: '山西话', region: '山西' },
  { code: 'zh-neimeng', name: '内蒙古话', region: '内蒙古' },
  { code: 'zh-gansu', name: '甘肃话', region: '甘肃' },
  { code: 'zh-ningxia', name: '宁夏话', region: '宁夏' },
  { code: 'zh-xinjiang', name: '新疆话', region: '新疆' },
  { code: 'zh-xizang', name: '西藏话', region: '西藏' },
]);

// 显示的方言（限制数量）
const displayDialects = ref([]);

// 页面挂载时加载数据
onMounted(() => {
  loadDialects();
});

// 加载方言列表
const loadDialects = () => {
  // 默认显示前8个方言
  displayDialects.value = allDialects.value.slice(0, 8);
};

// 选择方言
const selectDialect = dialect => {
  currentDialect.value = dialect.code;
  ElMessage.success(`已切换到 ${dialect.name}`);

  // 这里可以调用语音服务设置方言
  // voiceService.setDialect(dialect.code)
};
</script>

<style scoped>
.voice-assistant-page {
  padding: 20px;
  min-height: 100vh;
  background: #f0f2f5;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 32px;
  color: #2c3e50;
  margin-bottom: 10px;
}

.page-header p {
  font-size: 16px;
  color: #7f8c8d;
}

.page-content {
  max-width: 1200px;
  margin: 0 auto;
}

/* 卡片样式 */
.voice-card {
  min-height: 600px;
}

.info-card,
.guide-card,
.dialect-card {
  height: fit-content;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

/* 功能列表 */
.feature-list {
  space-y: 16px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}

.feature-icon {
  font-size: 20px;
  color: #1890ff;
  margin-top: 2px;
}

.feature-content h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #2c3e50;
}

.feature-content p {
  margin: 0;
  font-size: 14px;
  color: #7f8c8d;
  line-height: 1.4;
}

/* 指南内容 */
.guide-content h4 {
  color: #2c3e50;
  margin: 20px 0 10px 0;
  font-size: 16px;
}

.command-list,
.tips-list {
  margin: 0;
  padding-left: 20px;
}

.command-list li,
.tips-list li {
  margin-bottom: 8px;
  line-height: 1.5;
  color: #555;
}

.command-list strong {
  color: #1890ff;
}

/* 方言网格 */
.dialect-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.dialect-item {
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.dialect-item:hover {
  border-color: #1890ff;
  background: #f0f8ff;
}

.dialect-item.active {
  border-color: #1890ff;
  background: #e6f7ff;
}

.dialect-name {
  display: block;
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 4px;
}

.dialect-region {
  font-size: 12px;
  color: #7f8c8d;
}

/* 全部方言弹窗 */
.all-dialects {
  max-height: 400px;
  overflow-y: auto;
}

.dialect-item-full {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.dialect-item-full:last-child {
  border-bottom: none;
}

.dialect-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dialect-name {
  font-weight: 500;
  color: #2c3e50;
}

.dialect-code {
  font-size: 12px;
  color: #7f8c8d;
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 3px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .voice-assistant-page {
    padding: 12px;
  }

  .page-header h1 {
    font-size: 24px;
  }

  .dialect-grid {
    grid-template-columns: 1fr;
  }

  .feature-item {
    margin-bottom: 16px;
  }
}

@media (max-width: 480px) {
  .page-content .el-col {
    margin-bottom: 20px;
  }
}
</style>
