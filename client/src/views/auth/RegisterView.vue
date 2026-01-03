<template>
  <div class="register-view">
    <!-- 背景装饰 -->
    <div class="background-decoration">
      <div class="decoration-circle circle-1"></div>
      <div class="decoration-circle circle-2"></div>
      <div class="decoration-circle circle-3"></div>
    </div>

    <div class="register-container">
      <!-- 页面标题 -->
      <div class="register-header">
        <h1>选择您的注册类型</h1>
        <p>请选择最符合您身份的注册类型，完成5步注册流程</p>
      </div>

      <!-- 注册类型卡片 -->
      <div class="register-types">
        <div
          v-for="type in registerTypes"
          :key="type.value"
          class="type-card"
          :class="{ disabled: type.disabled }"
          @click="selectRegisterType(type)"
        >
          <div class="card-icon">
            <el-icon :size="48">
              <component :is="type.icon" />
            </el-icon>
          </div>
          <h3>{{ type.title }}</h3>
          <p class="type-description">{{ type.description }}</p>
          <div class="type-features">
            <div v-for="(feature, idx) in type.features" :key="idx" class="feature-item">
              <el-icon :size="14"><Check /></el-icon>
              <span>{{ feature }}</span>
            </div>
          </div>
          <div class="card-footer">
            <span class="step-badge">5步注册</span>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
          <div v-if="type.disabled" class="disabled-badge">即将开放</div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="register-footer">
        <div class="footer-text">
          <span>已有账号？</span>
          <el-link type="primary" @click="goToLogin">立即登录</el-link>
        </div>
        <div class="register-info">
          <el-icon><InfoFilled /></el-icon>
          <span>所有注册类型均需经过审核，请准备好相关证件材料</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  UserFilled,
  ChatDotSquare,
  OfficeBuilding,
  ShoppingCart,
  User,
  Check,
  ArrowRight,
  InfoFilled
} from '@element-plus/icons-vue'
import { markRaw } from 'vue'

const router = useRouter()

// 注册类型定义
const registerTypes = ref([
  {
    value: 'resident',
    title: '村民注册',
    icon: markRaw(UserFilled),
    description: '适用于村庄常住居民',
    features: ['一户一码管理', '村务公开查询', '便民服务申请', '语音助手支持'],
    disabled: false,
    route: 'common-registration'
  },
  {
    value: 'cadre',
    title: '村干部注册',
    icon: markRaw(ChatDotSquare),
    description: '适用于村委会工作人员',
    features: ['村务管理权限', '任务调度系统', '智能值班表', '数据统计报表'],
    disabled: false,
    route: 'common-registration'
  },
  {
    value: 'official',
    title: '乡镇官员注册',
    icon: markRaw(OfficeBuilding),
    description: '适用于乡镇政府工作人员',
    features: ['多村管理权限', '政策发布功能', '数据监控大屏', '汇总统计报表'],
    disabled: false,
    route: 'common-registration'
  },
  {
    value: 'purchaser',
    title: '采购商注册',
    icon: markRaw(ShoppingCart),
    description: '适用于农产品采购企业/个人',
    features: ['农产品采购', '智能推荐系统', '订单管理', '质量追溯'],
    disabled: false,
    route: 'registration-wizard'
  },
  {
    value: 'admin',
    title: '管理员注册',
    icon: markRaw(User),
    description: '系统管理员（需授权码）',
    features: ['系统配置管理', '用户权限管理', '数据维护', '系统监控'],
    disabled: false,
    route: 'common-registration'
  }
])

// 选择注册类型
const selectRegisterType = (type) => {
  if (type.disabled) {
    ElMessage.warning('该注册类型即将开放，敬请期待')
    return
  }

  // 跳转到对应的注册向导
  if (type.route === 'registration-wizard') {
    // 采购商专用注册向导
    router.push({ name: type.route })
  } else {
    // 通用注册向导（村民、村干部、乡镇官员、管理员）
    router.push({
      name: type.route,
      query: { role: type.value }
    })
  }
}

// 跳转到登录页
const goToLogin = () => {
  router.push({ name: 'unified-login' })
}
</script>

<style scoped lang="scss">
.register-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #4facfe);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
  padding: 40px 20px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }

  .background-decoration {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;

    .decoration-circle {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);

      &.circle-1 {
        width: 600px;
        height: 600px;
        top: -200px;
        right: -200px;
        animation: float 20s ease-in-out infinite;
      }

      &.circle-2 {
        width: 400px;
        height: 400px;
        bottom: -100px;
        left: -100px;
        animation: float 15s ease-in-out infinite reverse;
      }

      &.circle-3 {
        width: 200px;
        height: 200px;
        top: 50%;
        left: 10%;
        animation: float 12s ease-in-out infinite;
        animation-delay: -5s;
      }
    }
  }

  .register-container {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 1400px;
    animation: slideUp 0.6s ease-out;
  }

  .register-header {
    text-align: center;
    margin-bottom: 50px;
    color: white;

    h1 {
      font-size: 42px;
      font-weight: 800;
      margin-bottom: 16px;
      text-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      letter-spacing: 1px;
    }

    p {
      font-size: 18px;
      opacity: 0.95;
      font-weight: 300;
    }
  }

  .register-types {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 30px;
    margin-bottom: 50px;

    .type-card {
      position: relative;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      padding: 35px 30px;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #667eea, #764ba2);
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.4s ease;
      }

      &:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 60px rgba(102, 126, 234, 0.25);

        &::before {
          transform: scaleX(1);
        }

        .card-icon {
          transform: scale(1.1) rotate(5deg);
        }

        .arrow-icon {
          transform: translateX(5px);
        }
      }

      &.disabled {
        opacity: 0.6;
        cursor: not-allowed;

        &:hover {
          transform: none;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }
      }

      .card-icon {
        width: 90px;
        height: 90px;
        border-radius: 20px;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px;
        color: #667eea;
        transition: all 0.4s ease;
      }

      h3 {
        font-size: 22px;
        font-weight: 700;
        text-align: center;
        color: #303133;
        margin-bottom: 10px;
      }

      .type-description {
        text-align: center;
        color: #909399;
        font-size: 14px;
        margin-bottom: 20px;
        line-height: 1.6;
      }

      .type-features {
        margin-bottom: 24px;

        .feature-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          font-size: 14px;
          color: #606266;

          .el-icon {
            color: #67C23A;
            flex-shrink: 0;
          }
        }
      }

      .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 20px;
        border-top: 1px solid #E4E7ED;

        .step-badge {
          padding: 6px 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .arrow-icon {
          color: #667eea;
          transition: transform 0.3s ease;
        }
      }

      .disabled-badge {
        position: absolute;
        top: 15px;
        right: 15px;
        padding: 4px 10px;
        background: #F56C6C;
        color: white;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
      }
    }
  }

  .register-footer {
    text-align: center;
    color: white;

    .footer-text {
      margin-bottom: 15px;
      font-size: 16px;

      span {
        margin-right: 8px;
      }

      :deep(.el-link) {
        font-size: 16px;
        font-weight: 600;
      }
    }

    .register-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
      opacity: 0.9;
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 30px;
      backdrop-filter: blur(10px);
      max-width: 500px;
      margin: 0 auto;

      .el-icon {
        font-size: 16px;
      }
    }
  }
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(20px, -20px) rotate(5deg);
  }
  50% {
    transform: translate(-10px, 20px) rotate(-5deg);
  }
  75% {
    transform: translate(-20px, -10px) rotate(3deg);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .register-view {
    padding: 20px 15px;

    .register-header {
      h1 {
        font-size: 28px;
      }

      p {
        font-size: 15px;
      }
    }

    .register-types {
      grid-template-columns: 1fr;
      gap: 20px;

      .type-card {
        padding: 25px 20px;

        .card-icon {
          width: 70px;
          height: 70px;

          .el-icon {
            font-size: 36px;
          }
        }

        h3 {
          font-size: 18px;
        }

        .type-features {
          .feature-item {
            font-size: 13px;
          }
        }
      }
    }

    .register-footer {
      .footer-text {
        font-size: 14px;
      }

      .register-info {
        font-size: 13px;
        padding: 10px 16px;
      }
    }
  }
}
</style>
