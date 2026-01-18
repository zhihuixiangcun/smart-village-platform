<template>
  <div class="profile-page">
    <header class="page-header">
      <h2>个人中心</h2>
    </header>

    <main class="profile-content">
      <section class="user-info-section">
        <div class="user-card">
          <div class="user-avatar">
            <el-icon :size="48"><User /></el-icon>
          </div>
          <div class="user-details">
            <h3>{{ userName }}</h3>
            <p>{{ userPhone }}</p>
            <el-tag size="small" type="success">已认证</el-tag>
          </div>
        </div>
      </section>

      <section class="menu-section">
        <div class="menu-group">
          <div class="menu-item" @click="handleMenuClick('my-info')">
            <div class="item-left">
              <el-icon :size="20" color="#409EFF"><User /></el-icon>
              <span>我的信息</span>
            </div>
            <el-icon><ArrowRight /></el-icon>
          </div>
          <div class="menu-item" @click="handleMenuClick('my-family')">
            <div class="item-left">
              <el-icon :size="20" color="#67C23A"><UserFilled /></el-icon>
              <span>家庭成员</span>
            </div>
            <el-icon><ArrowRight /></el-icon>
          </div>
          <div class="menu-item" @click="handleMenuClick('my-services')">
            <div class="item-left">
              <el-icon :size="20" color="#E6A23C"><List /></el-icon>
              <span>我的服务</span>
            </div>
            <el-badge :value="serviceCount" class="badge" />
          </div>
        </div>

        <div class="menu-group">
          <div class="menu-item" @click="handleMenuClick('security')">
            <div class="item-left">
              <el-icon :size="20" color="#F56C6C"><Lock /></el-icon>
              <span>账号安全</span>
            </div>
            <el-icon><ArrowRight /></el-icon>
          </div>
          <div class="menu-item" @click="handleMenuClick('privacy')">
            <div class="item-left">
              <el-icon :size="20" color="#909399"><Hide /></el-icon>
              <span>隐私设置</span>
            </div>
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>

        <div class="menu-group">
          <div class="menu-item" @click="handleMenuClick('feedback')">
            <div class="item-left">
              <el-icon :size="20" color="#409EFF"><ChatDotSquare /></el-icon>
              <span>意见反馈</span>
            </div>
            <el-icon><ArrowRight /></el-icon>
          </div>
          <div class="menu-item" @click="handleMenuClick('about')">
            <div class="item-left">
              <el-icon :size="20" color="#909399"><InfoFilled /></el-icon>
              <span>关于平台</span>
            </div>
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>

        <div class="menu-group">
          <div class="menu-item logout" @click="handleLogout">
            <div class="item-left">
              <el-icon :size="20" color="#F56C6C"><SwitchButton /></el-icon>
              <span>退出登录</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import {
  User,
  UserFilled,
  List,
  Lock,
  Hide,
  ChatDotSquare,
  InfoFilled,
  SwitchButton,
  ArrowRight
} from '@element-plus/icons-vue';

const router = useRouter();

const userName = ref('张三');
const userPhone = ref('138****1234');
const serviceCount = ref(3);

const handleMenuClick = (menu) => {
  console.log('Menu clicked:', menu);
  // TODO: Implement menu navigation
};

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // TODO: Implement logout logic
    console.log('Logout');
  }).catch(() => {
    // User cancelled
  });
};
</script>

<style scoped lang="scss">
.profile-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 80px;
}

.page-header {
  background: linear-gradient(135deg, #409EFF 0%, #67C23A 100%);
  padding: 20px 16px;
  text-align: center;

  h2 {
    margin: 0;
    font-size: 20px;
    color: white;
    font-weight: 600;
  }
}

.profile-content {
  padding: 16px;
}

.user-info-section {
  margin-bottom: 20px;
}

.user-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.user-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409EFF 0%, #67C23A 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.user-details {
  flex: 1;

  h3 {
    margin: 0 0 4px;
    font-size: 18px;
    color: #303133;
  }

  p {
    margin: 0 0 8px;
    font-size: 14px;
    color: #909399;
  }
}

.menu-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.menu-group {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f5f7fa;
  cursor: pointer;
  transition: background 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: #f5f7fa;
  }

  &.logout {
    justify-content: center;

    .item-left {
      justify-content: center;
      color: #F56C6C;
    }
  }
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  color: #303133;
}
</style>
