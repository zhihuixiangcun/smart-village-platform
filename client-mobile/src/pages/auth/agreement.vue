<template>
  <div class="agreement-page">
    <div class="agreement-container">
      <!-- 标题 -->
      <div class="agreement-header">
        <button class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
            <path d="M19 12H5M12 19l-7-7-7 7"/>
          </svg>
          <span class="back-text">返回</span>
        </button>
        <h1 class="agreement-title">{{ agreementTitle }}</h1>
        <p class="agreement-subtitle">智慧乡村平台</p>
      </div>

      <!-- 内容 -->
      <div class="agreement-content">
        <div v-if="agreementType === 'user'" class="content-section">
          <h2>1. 服务条款</h2>
          <p>欢迎使用智慧乡村平台。在使用本平台之前，请您仔细阅读并理解本协议的全部内容。</p>
          
          <h2>2. 用户注册</h2>
          <p>2.1 您注册时需要提供真实、准确、完整的个人资料。</p>
          <p>2.2 您有责任维护并更新您的个人资料，确保其真实、准确、完整。</p>
          
          <h2>3. 用户行为规范</h2>
          <p>3.1 您承诺遵守国家法律法规、社会公序良俗和本协议约定。</p>
          
          <h2>4. 隐私保护</h2>
          <p>4.1 本平台重视用户隐私保护，将按照相关法律法规处理您的个人信息。</p>
          
          <h2>5. 协议修改</h2>
          <p>5.1 本平台有权根据需要修改本协议条款。</p>
          
          <h2>6. 争议解决</h2>
          <p>6.1 因本协议引起的争议，双方应友好协商解决。</p>
        </div>

        <div v-else class="content-section">
          <h2>1. 信息收集</h2>
          <p>1.1 我们收集的信息包括：注册信息、联系方式、使用记录等。</p>
          
          <h2>2. 信息使用</h2>
          <p>2.1 我们将使用收集的信息来提供和改进我们的服务。</p>
          
          <h2>3. 信息保护</h2>
          <p>3.1 我们采取合理的安全措施保护您的个人信息。</p>
          
          <h2>4. 联系方式</h2>
          <p>如有任何疑问或建议，请通过以下方式联系我们：</p>
          <p>邮箱：support@smartvillage.com</p>
          <p>电话：400-xxx-xxxx</p>
        </div>
      </div>

      <!-- 返回按钮 -->
      <div class="agreement-actions">
        <button class="back-btn-only" @click="goBack">
          <span class="btn-text">返回登录页</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <path d="M19 12H5M12 19l-7-7 7 7"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

defineOptions({
  name: 'AgreementPage'
})

const router = useRouter()
const route = useRoute()

const agreementType = ref('user')

const agreementTitle = computed(() => {
  return agreementType.value === 'user' ? '用户协议' : '隐私政策'
})

onMounted(() => {
  console.log('协议页面加载')
  const type = route.params.type || route.query.type || 'user'
  agreementType.value = type
})

const goBack = () => {
  console.log('返回登录页，保持勾选状态')
  router.push('/auth/multi-login')
}
</script>

<style scoped>
.agreement-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.agreement-container {
  max-width: 800px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  padding: 40px 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  min-height: 80vh;
  display: flex;
  flex-direction: column;
}

.agreement-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
  color: #667eea;
}

.back-btn:hover {
  background: rgba(102, 126, 234, 0.1);
}

.agreement-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.agreement-subtitle {
  font-size: 14px;
  color: #999;
  margin: 8px 0 0 0;
}

.agreement-content {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 40px;
}

.content-section {
  color: #333;
}

.content-section h2 {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #667eea;
}

.content-section p {
  margin-bottom: 15px;
  line-height: 1.8;
}

.agreement-actions {
  display: flex;
  justify-content: center;
  padding-top: 20px;
  border-top: 2px solid #f0f0f0;
}

.back-btn-only {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 40px;
  background: #f5f5f5;
  color: #667eea;
  border: 2px solid #667eea;
  border-radius: 12px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-btn-only:hover {
  background: #667eea;
  color: #fff;
}

.btn-text {
  font-size: 16px;
}

@media (max-width: 768px) {
  .agreement-container {
    padding: 30px 20px;
  }

  .agreement-title {
    font-size: 24px;
  }

  .content-section h2 {
    font-size: 20px;
  }
}
</style>
