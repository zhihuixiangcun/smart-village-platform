<template>
  <div class="policy-calculator">
    <!-- 顶部导航 -->
    <van-nav-bar title="政策计算器" left-arrow @click-left="$router.go(-1)">
      <template #right>
        <van-icon name="upgrade" size="20" @click="showSyncDialog = true" />
      </template>
    </van-nav-bar>

    <!-- 政策列表 -->
    <div class="policy-list">
      <van-tabs v-model:active="activeTab" sticky>
        <van-tab title="农业补贴" name="agriculture">
          <PolicyCard
            v-for="policy in agriculturePolicies"
            :key="policy._id"
            :policy="policy"
            @calculate="handleCalculate"
            @apply="handleApply"
          />
        </van-tab>

        <van-tab title="住房保障" name="housing">
          <PolicyCard
            v-for="policy in housingPolicies"
            :key="policy._id"
            :policy="policy"
            @calculate="handleCalculate"
            @apply="handleApply"
          />
        </van-tab>

        <van-tab title="教育资助" name="education">
          <PolicyCard
            v-for="policy in educationPolicies"
            :key="policy._id"
            :policy="policy"
            @calculate="handleCalculate"
            @apply="handleApply"
          />
        </van-tab>

        <van-tab title="医疗救助" name="medical">
          <PolicyCard
            v-for="policy in medicalPolicies"
            :key="policy._id"
            :policy="policy"
            @calculate="handleCalculate"
            @apply="handleApply"
          />
        </van-tab>

        <van-tab title="养老福利" name="elderly">
          <PolicyCard
            v-for="policy in elderlyPolicies"
            :key="policy._id"
            :policy="policy"
            @calculate="handleCalculate"
            @apply="handleApply"
          />
        </van-tab>
      </van-tabs>
    </div>

    <!-- 快速计算入口 -->
    <div class="quick-calculate-section">
      <van-cell-group inset title="快速计算">
        <van-cell
          title="耕地补贴计算"
          is-link
          @click="
            showQuickCalc = true;
            quickCalcType = 'land';
          "
        >
          <template #icon>
            <van-icon name="flower-o" class="cell-icon" />
          </template>
        </van-cell>
        <van-cell
          title="家庭人口补贴"
          is-link
          @click="
            showQuickCalc = true;
            quickCalcType = 'household';
          "
        >
          <template #icon>
            <van-icon name="friends-o" class="cell-icon" />
          </template>
        </van-cell>
        <van-cell
          title="教育补贴"
          is-link
          @click="
            showQuickCalc = true;
            quickCalcType = 'education';
          "
        >
          <template #icon>
            <van-icon name="bookmark-o" class="cell-icon" />
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 快速计算弹窗 -->
    <van-popup v-model:show="showQuickCalc" position="bottom" round :style="{ height: '80%' }">
      <div class="quick-calc-popup">
        <div class="popup-header">
          <h3>{{ quickCalcTitle }}</h3>
          <van-icon name="cross" @click="showQuickCalc = false" />
        </div>
        <div class="quick-calc-content">
          <!-- 耕地补贴计算 -->
          <van-form v-if="quickCalcType === 'land'" @submit="handleQuickCalcLand">
            <van-cell-group inset>
              <van-field
                v-model="quickCalcForm.landArea"
                name="landArea"
                label="耕地面积"
                placeholder="请输入耕地面积（亩）"
                type="number"
                :rules="[{ required: true, message: '请输入耕地面积' }]"
              >
                <template #button>亩</template>
              </van-field>
              <van-field
                v-model="quickCalcForm.householdSize"
                name="householdSize"
                label="家庭人口"
                placeholder="请输入家庭人口数"
                type="number"
                :rules="[{ required: true, message: '请输入家庭人口数' }]"
              >
                <template #button>人</template>
              </van-field>
            </van-cell-group>
            <div class="dialog-actions">
              <van-button round block type="primary" native-type="submit" :loading="calculating">
                计算补贴
              </van-button>
            </div>
          </van-form>

          <!-- 家庭人口补贴计算 -->
          <van-form v-else-if="quickCalcType === 'household'" @submit="handleQuickCalcHousehold">
            <van-cell-group inset>
              <van-field
                v-model="quickCalcForm.householdSize"
                name="householdSize"
                label="家庭人口"
                placeholder="请输入家庭人口数"
                type="number"
                :rules="[{ required: true, message: '请输入家庭人口数' }]"
              >
                <template #button>人</template>
              </van-field>
            </van-cell-group>
            <div class="dialog-actions">
              <van-button round block type="primary" native-type="submit" :loading="calculating">
                计算补贴
              </van-button>
            </div>
          </van-form>

          <!-- 教育补贴计算 -->
          <van-form v-else-if="quickCalcType === 'education'" @submit="handleQuickCalcEducation">
            <van-cell-group inset>
              <van-field name="educationLevel" label="教育阶段">
                <template #input>
                  <van-radio-group v-model="quickCalcForm.educationLevel" direction="horizontal">
                    <van-radio name="primary">小学</van-radio>
                    <van-radio name="junior">初中</van-radio>
                    <van-radio name="senior">高中</van-radio>
                    <van-radio name="university">大学</van-radio>
                  </van-radio-group>
                </template>
              </van-field>
            </van-cell-group>
            <div class="dialog-actions">
              <van-button round block type="primary" native-type="submit" :loading="calculating">
                计算补贴
              </van-button>
            </div>
          </van-form>
        </div>
      </div>
    </van-popup>

    <!-- 计算结果弹窗 -->
    <van-popup v-model:show="showCalcResult" position="bottom" round>
      <div class="calc-result-popup">
        <div class="popup-header">
          <h3>计算结果</h3>
          <van-icon name="cross" @click="showCalcResult = false" />
        </div>
        <div class="calc-result-content">
          <div class="result-amount">
            <span class="amount-label">预计补贴金额</span>
            <span class="amount-value">¥{{ calcResult?.finalAmount || 0 }}</span>
          </div>

          <van-collapse v-model="activeCollapse" accordion>
            <van-collapse-item title="计算详情" name="details">
              <div class="calc-details">
                <div
                  v-for="step in calcResult?.calculations?.steps"
                  :key="step.step"
                  class="calc-step"
                >
                  <div class="step-title">{{ step.step }}. {{ step.title }}</div>
                  <div class="step-desc">{{ step.description }}</div>
                </div>
              </div>
            </van-collapse-item>
          </van-collapse>

          <div class="result-actions">
            <van-button type="primary" block @click="handleApplyFromResult"> 立即申请 </van-button>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 政府政策同步弹窗 -->
    <van-popup v-model:show="showSyncDialog" position="center" :style="{ width: '85%' }">
      <div class="sync-dialog">
        <div class="sync-header">
          <van-icon name="upgrade" size="40" color="#1989fa" />
          <h3>政府政策同步</h3>
        </div>
        <div class="sync-content">
          <p>从政府服务器同步最新政策数据</p>
          <van-cell-group inset>
            <van-cell title="最后更新" :value="lastPolicyUpdate" />
            <van-cell title="政策数量" :value="`${policyCount}条`" />
          </van-cell-group>
        </div>
        <div class="sync-actions">
          <van-button type="primary" block :loading="syncing" @click="handleSyncPolicies">
            立即同步
          </van-button>
          <van-button block @click="showSyncDialog = false"> 取消 </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 加载状态 -->
    <van-loading v-if="loadingPolicies" size="24" vertical>加载政策中...</van-loading>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import policyCalculatorApi from '@/api/policyCalculator';
import { useUserStore } from '@/stores/user';

// 子组件
const PolicyCard = {
  props: {
    policy: Object,
  },
  emits: ['calculate', 'apply'],
  template: `
    <div class="policy-card" @click="$emit('apply', policy)">
      <div class="policy-header">
        <h4 class="policy-name">{{ policy.name }}</h4>
        <van-tag v-if="policy.isActive" type="success">有效</van-tag>
        <van-tag v-else type="warning">已过期</van-tag>
      </div>
      <p class="policy-desc">{{ policy.description }}</p>
      <div class="policy-footer">
        <span class="policy-amount">最高 ¥{{ policy.maxAmount || '请咨询' }}</span>
        <van-button size="small" type="primary" @click.stop="$emit('calculate', policy)">
          计算
        </van-button>
      </div>
    </div>
  `,
};

const router = useRouter();
const userStore = useUserStore();

// ============ 响应式数据 ============
const activeTab = ref('agriculture');
const loadingPolicies = ref(false);
const calculating = ref(false);
const syncing = ref(false);
const policies = ref([]);

// 弹窗控制
const showQuickCalc = ref(false);
const showCalcResult = ref(false);
const showSyncDialog = ref(false);

// 表单数据
const quickCalcType = ref('');
const quickCalcForm = reactive({
  landArea: '',
  householdSize: '',
  educationLevel: 'primary',
});

// 计算结果
const calcResult = ref(null);
const selectedPolicy = ref(null);
const activeCollapse = ref([]);

// 同步状态
const lastPolicyUpdate = ref(localStorage.getItem('lastPolicyUpdate') || '从未同步');
const policyCount = ref(0);

// ============ 计算属性 ============
const quickCalcTitle = computed(() => {
  const titles = {
    land: '耕地补贴计算',
    household: '家庭人口补贴',
    education: '教育补贴计算',
  };
  return titles[quickCalcType.value] || '快速计算';
});

// 按类别分类的政策
const agriculturePolicies = computed(() =>
  policies.value.filter(p => p.policyInfo?.category === 'agriculture' || p.tags?.includes('农业'))
);
const housingPolicies = computed(() =>
  policies.value.filter(p => p.policyInfo?.category === 'housing' || p.tags?.includes('住房'))
);
const educationPolicies = computed(() =>
  policies.value.filter(p => p.policyInfo?.category === 'education' || p.tags?.includes('教育'))
);
const medicalPolicies = computed(() =>
  policies.value.filter(p => p.policyInfo?.category === 'medical' || p.tags?.includes('医疗'))
);
const elderlyPolicies = computed(() =>
  policies.value.filter(p => p.policyInfo?.category === 'elderly' || p.tags?.includes('养老'))
);

// ============ 方法 ============

/**
 * 加载政策列表
 */
const loadPolicies = async () => {
  try {
    loadingPolicies.value = true;
    const villageId = userStore.userInfo?.villageId;
    const response = await policyCalculatorApi.getAvailablePolicies(villageId);
    if (response.success) {
      policies.value = response.data || [];
      policyCount.value = policies.value.length;
    }
  } catch (error) {
    console.error('加载政策失败:', error);
    showToast('加载政策失败');
  } finally {
    loadingPolicies.value = false;
  }
};

/**
 * 处理计算
 */
const handleCalculate = policy => {
  selectedPolicy.value = policy;
  showQuickCalc.value = true;

  // 根据政策类型选择快速计算类型
  if (policy.policyInfo?.category === 'agriculture' || policy.tags?.includes('耕地')) {
    quickCalcType.value = 'land';
  } else if (policy.policyInfo?.category === 'elderly' || policy.tags?.includes('人口')) {
    quickCalcType.value = 'household';
  } else if (policy.policyInfo?.category === 'education' || policy.tags?.includes('教育')) {
    quickCalcType.value = 'education';
  }
};

/**
 * 处理申请
 */
const handleApply = policy => {
  selectedPolicy.value = policy;
  showToast('跳转到申请页面');
};

/**
 * 耕地补贴快速计算
 */
const handleQuickCalcLand = async () => {
  try {
    calculating.value = true;
    const result = await policyCalculatorApi.quickCalculateLandSubsidy(
      parseFloat(quickCalcForm.landArea),
      parseInt(quickCalcForm.householdSize)
    );

    if (result.success) {
      calcResult.value = result.data;
      showCalcResult.value = true;
      showQuickCalc.value = false;
    } else {
      showToast(result.reason || '计算失败');
    }
  } catch (error) {
    console.error('计算失败:', error);
    showToast(error.message || '计算失败');
  } finally {
    calculating.value = false;
  }
};

/**
 * 家庭人口补贴计算
 */
const handleQuickCalcHousehold = async () => {
  try {
    calculating.value = true;
    const policy = policies.value.find(
      p => p.policyInfo?.category === 'elderly' || p.tags?.includes('人口')
    );

    if (!policy) {
      showToast('未找到相关补贴政策');
      return;
    }

    const result = await policyCalculatorApi.calculateSubsidy(policy._id, {
      applicantInfo: { name: '申请人', idNumber: '110101199001011234' },
      householdInfo: { registeredHouseholdSize: parseInt(quickCalcForm.householdSize) },
    });

    if (result.success) {
      calcResult.value = result.data;
      showCalcResult.value = true;
      showQuickCalc.value = false;
    }
  } catch (error) {
    console.error('计算失败:', error);
    showToast('计算失败');
  } finally {
    calculating.value = false;
  }
};

/**
 * 教育补贴计算
 */
const handleQuickCalcEducation = async () => {
  try {
    calculating.value = true;
    const policy = policies.value.find(
      p => p.policyInfo?.category === 'education' || p.tags?.includes('教育')
    );

    if (!policy) {
      showToast('未找到相关补贴政策');
      return;
    }

    const result = await policyCalculatorApi.calculateSubsidy(policy._id, {
      applicantInfo: { name: '学生', idNumber: '110101201001011234' },
      householdInfo: { registeredHouseholdSize: 1 },
      metadata: { educationLevel: quickCalcForm.educationLevel },
    });

    if (result.success) {
      calcResult.value = result.data;
      showCalcResult.value = true;
      showQuickCalc.value = false;
    }
  } catch (error) {
    console.error('计算失败:', error);
    showToast('计算失败');
  } finally {
    calculating.value = false;
  }
};

/**
 * 从结果申请
 */
const handleApplyFromResult = () => {
  showCalcResult.value = false;
  router.push({
    path: '/policy-application',
    query: {
      policyId: selectedPolicy.value?._id,
      calcResult: JSON.stringify(calcResult.value),
    },
  });
};

/**
 * 同步政府政策
 */
const handleSyncPolicies = async () => {
  try {
    syncing.value = true;

    const response = await policyCalculatorApi.syncGovernmentPolicies({
      region: 'national',
      forceUpdate: false,
    });

    if (response.success) {
      const now = new Date().toLocaleString('zh-CN');
      lastPolicyUpdate.value = now;
      localStorage.setItem('lastPolicyUpdate', now);

      showToast(
        `同步成功：新建 ${response.data.summary.created} 条，更新 ${response.data.summary.updated} 条`
      );
      showSyncDialog.value = false;

      // 重新加载政策列表
      await loadPolicies();
    }
  } catch (error) {
    console.error('同步失败:', error);
    showToast('同步失败，请稍后重试');
  } finally {
    syncing.value = false;
  }
};

// ============ 生命周期 ============
onMounted(() => {
  loadPolicies();
});
</script>

<style scoped>
.policy-calculator {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 20px;
}

.policy-list {
  margin-bottom: 16px;
}

.policy-card {
  background: white;
  margin: 12px;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.policy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.policy-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.policy-desc {
  color: #646566;
  font-size: 14px;
  margin: 8px 0;
  line-height: 1.5;
}

.policy-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.policy-amount {
  color: #ee0a24;
  font-size: 18px;
  font-weight: 600;
}

.quick-calculate-section {
  margin-bottom: 16px;
}

.cell-icon {
  margin-right: 8px;
  color: #1989fa;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.popup-header h3 {
  margin: 0;
  font-size: 16px;
}

.quick-calc-popup,
.calc-result-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.quick-calc-content,
.calc-result-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.dialog-actions {
  padding: 16px;
}

.result-amount {
  text-align: center;
  padding: 24px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
  margin-bottom: 16px;
}

.amount-label {
  display: block;
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.amount-value {
  display: block;
  font-size: 36px;
  font-weight: 700;
}

.calc-step {
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.calc-step:last-child {
  border-bottom: none;
}

.step-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.step-desc {
  color: #646566;
  font-size: 14px;
}

.result-actions {
  padding: 16px;
}

.sync-dialog {
  padding: 24px;
  text-align: center;
}

.sync-header {
  margin-bottom: 16px;
}

.sync-header h3 {
  margin: 12px 0 0 0;
}

.sync-content {
  margin-bottom: 16px;
}

.sync-content p {
  color: #646566;
  margin-bottom: 12px;
}

.sync-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
