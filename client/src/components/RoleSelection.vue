<template>
  <div class="role-selection-container">
    <div class="selection-header">
      <h2 class="section-title">请选择您的身份</h2>
      <p class="section-desc">选择您的身份，体验相应的服务功能</p>
    </div>

    <div class="role-grid">
      <div
        v-for="role in roles"
        :key="role.id"
        class="role-card"
        :class="{ active: selectedRole === role.id }"
        @click="selectRole(role.id)"
      >
        <div class="role-icon" :class="role.id">
          <el-icon :size="40">
            <component :is="role.icon" />
          </el-icon>
        </div>
        <h3 class="role-name">{{ role.name }}</h3>
        <p class="role-desc">{{ role.description }}</p>
        <div class="role-features">
          <span v-for="feature in role.features" :key="feature">{{ feature }}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>© 智慧乡村平台</p>
      <span class="version">v2.0</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import {
  User,
  OfficeBuilding,
  Location,
  ShoppingCart,
  Setting
} from '@element-plus/icons-vue';

const emit = defineEmits(['select']);

const selectedRole = ref(null);

const roles = [
  {
    id: 'resident',
    name: '村民',
    description: '村务办理、信息查询、邻里互助',
    features: ['办事大厅', '信息查询', '邻里互助'],
    icon: User
  },
  {
    id: 'village_official',
    name: '村干部',
    description: '村务管理、资料收集、值班安排',
    features: ['村务管理', '资料收集', '值班管理'],
    icon: OfficeBuilding
  },
  {
    id: 'township_official',
    name: '乡镇干部',
    description: '多村管理、政策传达、监督指导',
    features: ['多村管理', '政策传达', '监督指导'],
    icon: Location
  },
  {
    id: 'purchaser',
    name: '采购商',
    description: '农产品采购、订单管理、供应商对接',
    features: ['产品浏览', '订单管理', '供应商对接'],
    icon: ShoppingCart
  },
  {
    id: 'admin',
    name: '管理员',
    description: '系统配置、用户管理、权限控制',
    features: ['系统配置', '用户管理', '权限控制'],
    icon: Setting
  }
];

const selectRole = (roleId) => {
  selectedRole.value = roleId;
  emit('select', roleId);
};
</script>

<style scoped>
.role-selection-container {
  padding: 40px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  min-height: 100vh;
}

.selection-header {
  text-align: center;
  margin-bottom: 40px;
}

.section-title {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 12px 0;
}

.section-desc {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.role-card {
  background: white;
  border-radius: 16px;
  padding: 30px 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.role-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.role-card.active {
  border-color: #409eff;
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.2);
}

.role-icon {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: transform 0.3s ease;
}

.role-card:hover .role-icon {
  transform: scale(1.1);
}

.role-icon.resident {
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
}

.role-icon.village_official {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
}

.role-icon.township_official {
  background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
}

.role-icon.purchaser {
  background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
}

.role-icon.admin {
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
}

.role-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 10px 0;
  text-align: center;
}

.role-desc {
  font-size: 14px;
  color: #606266;
  margin: 0 0 16px 0;
  text-align: center;
  line-height: 1.6;
  min-height: 44px;
}

.role-features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.role-features span {
  font-size: 12px;
  background: #f5f7fa;
  color: #909399;
  padding: 5px 12px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.role-card.active .role-features span {
  background: #e6f7ff;
  color: #409eff;
}

.footer {
  text-align: center;
  margin-top: 40px;
  padding: 20px;
  color: #909399;
  font-size: 13px;
}

.version {
  margin-left: 8px;
  padding: 2px 8px;
  background: #e4e7ed;
  border-radius: 4px;
  font-size: 12px;
}

@media (max-width: 768px) {
  .role-grid {
    grid-template-columns: 1fr;
  }

  .section-title {
    font-size: 24px;
  }
}
</style>
