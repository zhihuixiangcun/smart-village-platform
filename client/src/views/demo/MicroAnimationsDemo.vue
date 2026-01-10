<template>
  <div class="micro-animations-demo">
    <el-card shadow="always">
      <template #header>
        <div class="card-header">
          <span>✨ 微交互动画演示</span>
          <el-switch
            v-model="animationsEnabled"
            active-text="启用动画"
            @change="toggleAnimations"
          />
        </div>
      </template>

      <!-- 按钮动画演示 -->
      <div class="demo-section">
        <h3>🔘 按钮交互动画</h3>
        <div class="demo-buttons">
          <el-button v-button-animate type="primary" icon="Plus" class="demo-btn">
            主要按钮
          </el-button>
          <el-button v-button-animate type="success" icon="Check" class="demo-btn">
            成功按钮
          </el-button>
          <el-button v-button-animate type="warning" icon="Warning" class="demo-btn">
            警告按钮
          </el-button>
          <el-button
            v-button-animate
            type="danger"
            icon="Delete"
            class="demo-btn"
            @click="triggerErrorShake"
          >
            错误震动
          </el-button>
        </div>
      </div>

      <!-- 卡片悬停动画 -->
      <div class="demo-section">
        <h3>🎴 卡片悬停效果</h3>
        <el-row :gutter="20">
          <el-col :span="8" v-for="(card, index) in demoCards" :key="index">
            <el-card v-card-animate shadow="hover" class="demo-card" @click="handleCardClick(card)">
              <div class="card-content">
                <el-icon size="32" class="card-icon">
                  <component :is="card.icon" />
                </el-icon>
                <h4>{{ card.title }}</h4>
                <p>{{ card.description }}</p>
                <div class="card-value">
                  <span v-count-animate="card.value" class="count-number">0</span>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 输入框聚焦动画 -->
      <div class="demo-section">
        <h3>📝 输入框聚焦效果</h3>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户名">
              <el-input
                v-input-animate
                v-model="demoForm.username"
                placeholder="请输入用户名"
                clearable
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱">
              <el-input
                v-input-animate
                v-model="demoForm.email"
                placeholder="请输入邮箱"
                type="email"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- 表格行点击动画 -->
      <div class="demo-section">
        <h3>📋 表格行交互</h3>
        <el-table :data="tableData" style="width: 100%">
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="department" label="部门" width="120" />
          <el-table-column prop="amount" label="金额" width="120">
            <template #default="scope"> ¥{{ scope.row.amount.toLocaleString() }} </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ scope.row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作">
            <template #default="scope">
              <el-button v-button-animate type="text" @click="approveItem(scope.row)">
                审批
              </el-button>
              <el-button v-button-animate type="text" @click="rejectItem(scope.row)">
                驳回
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 滚动触发动画 -->
      <div class="demo-section">
        <h3>📜 滚动触发动画</h3>
        <div class="scroll-demo-container">
          <div
            v-for="(item, index) in scrollItems"
            :key="index"
            v-scroll-animate="{ name: item.animation, threshold: 0.3 }"
            class="scroll-item"
            :class="`scroll-item-${index + 1}`"
          >
            <el-icon size="48" class="scroll-icon">
              <component :is="item.icon" />
            </el-icon>
            <h4>{{ item.title }}</h4>
            <p>{{ item.description }}</p>
          </div>
        </div>
      </div>

      <!-- 数字计数动画 -->
      <div class="demo-section">
        <h3>🔢 数字计数动画</h3>
        <el-row :gutter="20">
          <el-col :span="6" v-for="(stat, index) in stats" :key="index">
            <div class="stat-card">
              <div class="stat-icon">
                <el-icon size="32">
                  <component :is="stat.icon" />
                </el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-label">{{ stat.label }}</div>
                <div v-count-animate="stat.value" class="stat-value">0</div>
                <div class="stat-unit">{{ stat.unit }}</div>
              </div>
            </div>
          </el-col>
        </el-row>
        <div class="stat-controls">
          <el-button @click="randomizeStats" type="primary">随机更新数据</el-button>
          <el-button @click="resetStats">重置数据</el-button>
        </div>
      </div>

      <!-- 反馈动画 -->
      <div class="demo-section">
        <h3>📢 反馈动画</h3>
        <div class="feedback-demo">
          <el-button ref="successBtn" @click="showSuccessAnimation" type="success" icon="Check">
            成功反馈
          </el-button>
          <el-button ref="errorBtn" @click="showErrorAnimation" type="danger" icon="Close">
            错误反馈
          </el-button>
          <el-button @click="showProgressAnimation" type="info" icon="Loading">
            进度动画
          </el-button>
          <el-button @click="showNotificationAnimation" type="warning" icon="Bell">
            通知动画
          </el-button>
        </div>

        <!-- 进度条演示 -->
        <div v-if="showProgress" class="progress-demo">
          <el-progress
            ref="progressBar"
            :percentage="progressValue"
            :show-text="true"
            :stroke-width="8"
            class="demo-progress"
          />
        </div>
      </div>

      <!-- 动画控制面板 -->
      <div class="demo-section">
        <h3>🎛️ 动画控制</h3>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card shadow="never">
              <template #header>
                <span>动画统计</span>
              </template>
              <el-descriptions :column="1">
                <el-descriptions-item label="当前活跃动画">
                  {{ activeAnimationCount }}
                </el-descriptions-item>
                <el-descriptions-item label="动画状态">
                  <el-tag :type="isAnimating ? 'success' : 'info'">
                    {{ isAnimating ? '运行中' : '空闲' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="全局动画">
                  <el-tag :type="animationsEnabled ? 'success' : 'danger'">
                    {{ animationsEnabled ? '启用' : '禁用' }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="never">
              <template #header>
                <span>动画操作</span>
              </template>
              <div class="animation-controls">
                <el-button @click="stopAllAnimations" type="warning"> 停止所有动画 </el-button>
                <el-button @click="testAllAnimations" type="primary"> 测试所有动画 </el-button>
                <el-button @click="resetDemoData"> 重置演示数据 </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Plus,
  Check,
  Warning,
  Delete,
  User,
  CreditCard,
  TrendCharts,
  DataBoard,
  Money,
  ShoppingCart,
  Loading,
  Bell,
  Close,
} from '@element-plus/icons-vue';
import { useMicroAnimations } from '@/composables/useMicroAnimations';

// 使用微交互动画
const {
  globalAnimationEnabled,
  isAnimating,
  activeAnimationCount,
  shakeError,
  showSuccess,
  animateNumber,
  animateProgress,
  stopAllAnimations: stopAnimations,
  toggleGlobalAnimation,
} = useMicroAnimations();

// 响应式数据
const animationsEnabled = ref(true);
const showProgress = ref(false);
const progressValue = ref(0);

// 表单数据
const demoForm = reactive({
  username: '',
  email: '',
});

// 卡片数据
const demoCards = ref([
  {
    title: '总收入',
    description: '本月村务收入统计',
    value: 156780,
    icon: 'Money',
  },
  {
    title: '支出统计',
    description: '本月各项支出总计',
    value: 89456,
    icon: 'ShoppingCart',
  },
  {
    title: '净收益',
    description: '本月净收益情况',
    value: 67324,
    icon: 'TrendCharts',
  },
]);

// 表格数据
const tableData = ref([
  { name: '张建设', department: '基建部', amount: 25000, status: '待审批' },
  { name: '李文化', department: '文化部', amount: 8000, status: '已通过' },
  { name: '王会计', department: '财务部', amount: 3500, status: '已支付' },
  { name: '赵电工', department: '维修部', amount: 1200, status: '待审批' },
]);

// 滚动动画项目
const scrollItems = ref([
  {
    title: '数据统计',
    description: '实时监控村务数据变化',
    icon: 'DataBoard',
    animation: 'fadeIn',
  },
  {
    title: '用户管理',
    description: '管理村民信息和权限',
    icon: 'User',
    animation: 'slideInLeft',
  },
  {
    title: '财务报表',
    description: '生成各类财务报表',
    icon: 'CreditCard',
    animation: 'slideInRight',
  },
]);

// 统计数据
const stats = ref([
  { label: '村民人数', value: 1250, unit: '人', icon: 'User' },
  { label: '月收入', value: 156780, unit: '元', icon: 'Money' },
  { label: '月支出', value: 89456, unit: '元', icon: 'ShoppingCart' },
  { label: '审批数量', value: 28, unit: '项', icon: 'Check' },
]);

// 元素引用
const successBtn = ref();
const errorBtn = ref();
const progressBar = ref();

// 方法
const toggleAnimations = enabled => {
  toggleGlobalAnimation(enabled);
  ElMessage.info(`动画已${enabled ? '启用' : '禁用'}`);
};

const triggerErrorShake = () => {
  shakeError(errorBtn.value?.$el);
};

const handleCardClick = card => {
  ElMessage.success(`点击了${card.title}卡片`);
  // 随机更新卡片数值
  card.value = Math.floor(Math.random() * 200000) + 50000;
};

const getStatusType = status => {
  const typeMap = {
    待审批: 'warning',
    已通过: 'success',
    已支付: 'info',
    已拒绝: 'danger',
  };
  return typeMap[status] || 'default';
};

const approveItem = row => {
  row.status = '已通过';
  ElMessage.success(`已通过${row.name}的申请`);
};

const rejectItem = row => {
  row.status = '已拒绝';
  ElMessage.error(`已拒绝${row.name}的申请`);
};

const showSuccessAnimation = () => {
  showSuccess(successBtn.value?.$el);
  ElMessage.success('操作成功！');
};

const showErrorAnimation = () => {
  shakeError(errorBtn.value?.$el);
  ElMessage.error('操作失败！');
};

const showProgressAnimation = async () => {
  showProgress.value = true;
  progressValue.value = 0;

  await nextTick();

  // 模拟进度更新
  const interval = setInterval(() => {
    progressValue.value += 10;
    if (progressValue.value >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        showProgress.value = false;
        progressValue.value = 0;
      }, 1000);
    }
  }, 200);
};

const showNotificationAnimation = () => {
  // 创建临时通知元素
  const notification = document.createElement('div');
  notification.className = 'demo-notification';
  notification.innerHTML = '📢 这是一个动画通知';
  document.body.appendChild(notification);

  // 应用滑入动画
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #409eff;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 3000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;

  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);

  // 3秒后移除
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
};

const randomizeStats = () => {
  stats.value.forEach(stat => {
    const randomValue = Math.floor(Math.random() * 200000) + 10000;
    stat.value = randomValue;
  });
  ElMessage.info('统计数据已随机更新');
};

const resetStats = () => {
  stats.value = [
    { label: '村民人数', value: 1250, unit: '人', icon: 'User' },
    { label: '月收入', value: 156780, unit: '元', icon: 'Money' },
    { label: '月支出', value: 89456, unit: '元', icon: 'ShoppingCart' },
    { label: '审批数量', value: 28, unit: '项', icon: 'Check' },
  ];
  ElMessage.info('统计数据已重置');
};

const testAllAnimations = () => {
  ElMessage.info('正在测试所有动画效果...');
  // 这里可以添加测试所有动画的逻辑
};

const resetDemoData = () => {
  demoForm.username = '';
  demoForm.email = '';
  showProgress.value = false;
  progressValue.value = 0;
  ElMessage.info('演示数据已重置');
};

// 生命周期
onMounted(() => {
  ElMessage.success('微交互动画演示系统已加载');
});
</script>

<style lang="scss" scoped>
.micro-animations-demo {
  padding: 20px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .demo-section {
    margin-bottom: 40px;

    h3 {
      margin-bottom: 20px;
      color: #303133;
      font-weight: 600;
    }
  }

  .demo-buttons {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;

    .demo-btn {
      margin-bottom: 8px;
    }
  }

  .demo-card {
    cursor: pointer;
    transition: all 0.3s ease;

    .card-content {
      text-align: center;
      padding: 20px;

      .card-icon {
        margin-bottom: 12px;
        color: #409eff;
      }

      h4 {
        margin: 0 0 8px 0;
        color: #303133;
      }

      p {
        margin: 0 0 12px 0;
        color: #606266;
        font-size: 14px;
      }

      .card-value {
        .count-number {
          font-size: 24px;
          font-weight: bold;
          color: #f56c6c;
        }
      }
    }
  }

  .scroll-demo-container {
    max-height: 400px;
    overflow-y: auto;
    padding: 20px;
    border: 1px solid #ebeef5;
    border-radius: 8px;

    .scroll-item {
      text-align: center;
      padding: 40px 20px;
      margin-bottom: 20px;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      opacity: 0;

      .scroll-icon {
        margin-bottom: 16px;
        color: #409eff;
      }

      h4 {
        margin: 0 0 8px 0;
        color: #303133;
      }

      p {
        margin: 0;
        color: #606266;
      }
    }
  }

  .stat-card {
    display: flex;
    align-items: center;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #ebeef5;

    .stat-icon {
      margin-right: 16px;
      color: #409eff;
    }

    .stat-content {
      flex: 1;

      .stat-label {
        font-size: 14px;
        color: #909399;
        margin-bottom: 4px;
      }

      .stat-value {
        font-size: 24px;
        font-weight: bold;
        color: #303133;
        margin-bottom: 2px;
      }

      .stat-unit {
        font-size: 12px;
        color: #606266;
      }
    }
  }

  .stat-controls {
    text-align: center;
    margin-top: 20px;

    .el-button {
      margin: 0 8px;
    }
  }

  .feedback-demo {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  .progress-demo {
    margin-top: 20px;

    .demo-progress {
      margin: 20px 0;
    }
  }

  .animation-controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .micro-animations-demo {
    padding: 16px;

    .demo-buttons {
      justify-content: center;
    }

    .feedback-demo {
      justify-content: center;
    }

    .stat-card {
      flex-direction: column;
      text-align: center;

      .stat-icon {
        margin-right: 0;
        margin-bottom: 12px;
      }
    }
  }
}
</style>
