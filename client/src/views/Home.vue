<template>
  <div class="home">
    <el-container>
      <el-header class="header">
        <div class="logo">
          <h1>智慧乡村服务平台</h1>
        </div>
        <div class="nav-menu">
          <el-menu
            mode="horizontal"
            :default-active="activeIndex"
            @select="handleSelect"
            background-color="#409EFF"
            text-color="#fff"
            active-text-color="#ffd04b"
          >
            <el-menu-item index="1">首页</el-menu-item>
            <el-menu-item index="2">村民管理</el-menu-item>
            <el-menu-item index="3">村务治理</el-menu-item>
            <el-menu-item index="4">信息公示</el-menu-item>
            <el-menu-item index="5">生活服务</el-menu-item>
            <el-menu-item index="6">登录</el-menu-item>
          </el-menu>
        </div>
      </el-header>
      
      <el-main class="main">
        <div class="hero-section">
          <h2 class="text-4xl md:text-5xl font-bold mb-4">欢迎使用智慧乡村服务平台</h2>
          <p class="text-lg md:text-xl mb-8 opacity-90">打造现代化、智能化的乡村管理与服务体系</p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <el-button type="primary" size="large" @click="$router.push('/dashboard')">
              进入系统
            </el-button>
            <button class="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              了解更多
            </button>
          </div>
        </div>
        
        <div class="features">
          <el-row :gutter="24">
            <el-col :xs="24" :sm="12" :md="6" v-for="feature in features" :key="feature.id">
              <div class="feature-card card hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                <div class="feature-icon">
                  <el-icon :size="40" :color="feature.color">
                    <component :is="feature.icon" />
                  </el-icon>
                </div>
                <h3 class="text-xl font-semibold mb-3 text-gray-800">{{ feature.title }}</h3>
                <p class="text-gray-600 leading-relaxed">{{ feature.description }}</p>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-main>
      
      <el-footer class="footer">
        <p>&copy; 2024 智慧乡村服务平台. 保留所有权利.</p>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup>
import { ref, markRaw } from 'vue'
import { User, House, DocumentCopy, Bell } from '@element-plus/icons-vue'

const activeIndex = ref('1')

const features = ref([
  {
    id: 1,
    title: '村民管理',
    description: '全面管理村民信息，实现数字化档案管理',
    icon: markRaw(User),
    color: '#409EFF'
  },
  {
    id: 2,
    title: '村务治理',
    description: '透明公开的村务管理，推进民主决策',
    icon: markRaw(House),
    color: '#67C23A'
  },
  {
    id: 3,
    title: '信息公示',
    description: '及时发布通知公告，保证信息传达',
    icon: markRaw(Bell),
    color: '#E6A23C'
  },
  {
    id: 4,
    title: '生活服务',
    description: '丰富的便民服务，提高生活品质',
    icon: markRaw(DocumentCopy),
    color: '#F56C6C'
  }
])

const handleSelect = (key) => {
  activeIndex.value = key
  
  const routes = {
    '1': '/',
    '2': '/villagers',
    '3': '/affairs', 
    '4': '/news',
    '5': '/services',
    '6': '/login'
  }
  
  if (routes[key]) {
    window.location.href = routes[key]
  }
}
</script>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #409EFF;
  padding: 0 20px;
  
  .logo h1 {
    color: white;
    font-size: 24px;
  }
  
  .nav-menu {
    flex: 1;
    margin-left: 40px;
  }
}

.main {
  padding: 0;
}

.hero-section {
  text-align: center;
  padding: 80px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  
  h2 {
    font-size: 36px;
    margin-bottom: 16px;
  }
  
  p {
    font-size: 18px;
    margin-bottom: 32px;
    opacity: 0.9;
  }
}

.features {
  padding: 80px 20px;
  background-color: #f5f7fa;
}

.feature-card {
  text-align: center;
  padding: 40px 20px;
  border-radius: 12px;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
  }
  
  .feature-icon {
    margin-bottom: 20px;
  }
  
  h3 {
    font-size: 20px;
    margin-bottom: 12px;
    color: #333;
  }
  
  p {
    color: #666;
    line-height: 1.6;
  }
}

.footer {
  background-color: #333;
  color: white;
  text-align: center;
  padding: 20px;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    padding: 10px;
    
    .nav-menu {
      margin-left: 0;
      margin-top: 10px;
      width: 100%;
    }
  }
  
  .hero-section {
    padding: 40px 20px;
    
    h2 {
      font-size: 28px;
    }
    
    p {
      font-size: 16px;
    }
  }
  
  .features {
    padding: 40px 10px;
  }
}
</style>