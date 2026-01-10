<template>
  <div class="policy-calculator-overlay" @click.self="closeCalculator">
    <div class="policy-calculator-modal">
      <div class="modal-header">
        <h2>
          <i class="fas fa-calculator"></i>
          农业政策计算器
        </h2>
        <button class="close-btn" @click="closeCalculator">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-content">
        <!-- 计算类型选择 -->
        <div class="calculator-tabs">
          <button
            v-for="tab in calculatorTabs"
            :key="tab.key"
            class="tab-btn"
            :class="{ active: activeTab === tab.key }"
            @click="switchTab(tab.key)"
          >
            <i :class="tab.icon"></i>
            {{ tab.label }}
          </button>
        </div>

        <!-- 补贴计算器 -->
        <div v-if="activeTab === 'subsidy'" class="calculator-content">
          <div class="form-section">
            <h3>补贴信息</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>种植作物</label>
                <el-select v-model="subsidyForm.crop" placeholder="请选择作物">
                  <el-option
                    v-for="crop in cropOptions"
                    :key="crop.value"
                    :label="crop.label"
                    :value="crop.value"
                  />
                </el-select>
              </div>
              <div class="form-group">
                <label>种植面积（亩）</label>
                <el-input-number
                  v-model="subsidyForm.area"
                  :min="0.1"
                  :step="0.1"
                  :precision="1"
                  placeholder="请输入面积"
                />
              </div>
              <div class="form-group">
                <label>种植地区</label>
                <el-select v-model="subsidyForm.region" placeholder="请选择地区">
                  <el-option
                    v-for="region in regionOptions"
                    :key="region.value"
                    :label="region.label"
                    :value="region.value"
                  />
                </el-select>
              </div>
              <div class="form-group">
                <label>农户类型</label>
                <el-select v-model="subsidyForm.farmerType" placeholder="请选择农户类型">
                  <el-option
                    v-for="type in farmerTypeOptions"
                    :key="type.value"
                    :label="type.label"
                    :value="type.value"
                  />
                </el-select>
              </div>
            </div>

            <button
              class="calculate-btn"
              @click="calculateSubsidy"
              :disabled="!canCalculateSubsidy"
            >
              <i class="fas fa-calculator"></i>
              计算补贴
            </button>
          </div>

          <!-- 计算结果 -->
          <div v-if="subsidyResult" class="result-section">
            <h3>计算结果</h3>
            <div class="result-summary">
              <div class="summary-card total">
                <div class="card-icon">
                  <i class="fas fa-coins"></i>
                </div>
                <div class="card-content">
                  <h4>预计总补贴</h4>
                  <div class="amount">
                    ¥ {{ subsidyResult.totalAmount?.toLocaleString() || '0' }}
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="subsidyResult.subsidies && subsidyResult.subsidies.length > 0"
              class="subsidy-breakdown"
            >
              <h4>补贴明细</h4>
              <div class="breakdown-list">
                <div
                  v-for="(subsidy, index) in subsidyResult.subsidies"
                  :key="index"
                  class="breakdown-item"
                >
                  <div class="item-header">
                    <span class="policy-name">{{ subsidy.policy }}</span>
                    <span class="amount">¥ {{ subsidy.amount?.toLocaleString() || '0' }}</span>
                  </div>
                  <div class="item-details">
                    <span class="calculation">{{ subsidy.calculation }}</span>
                    <span class="unit">{{ subsidy.unit }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="result-actions">
              <button class="action-btn" @click="saveCalculation">
                <i class="fas fa-save"></i>
                保存结果
              </button>
              <button class="action-btn" @click="shareResult">
                <i class="fas fa-share-alt"></i>
                分享结果
              </button>
              <button class="action-btn" @click="exportResult">
                <i class="fas fa-download"></i>
                导出报告
              </button>
            </div>
          </div>
        </div>

        <!-- 保险计算器 -->
        <div v-if="activeTab === 'insurance'" class="calculator-content">
          <div class="form-section">
            <h3>保险信息</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>投保作物</label>
                <el-select v-model="insuranceForm.crop" placeholder="请选择作物">
                  <el-option
                    v-for="crop in cropOptions"
                    :key="crop.value"
                    :label="crop.label"
                    :value="crop.value"
                  />
                </el-select>
              </div>
              <div class="form-group">
                <label>投保面积（亩）</label>
                <el-input-number
                  v-model="insuranceForm.area"
                  :min="0.1"
                  :step="0.1"
                  :precision="1"
                  placeholder="请输入面积"
                />
              </div>
              <div class="form-group">
                <label>保障水平</label>
                <el-select v-model="insuranceForm.coverageLevel" placeholder="请选择保障水平">
                  <el-option label="基础保障" value="basic" />
                  <el-option label="标准保障" value="standard" />
                  <el-option label="全面保障" value="comprehensive" />
                </el-select>
              </div>
              <div class="form-group">
                <label>保险期限</label>
                <el-select v-model="insuranceForm.duration" placeholder="请选择保险期限">
                  <el-option label="半年" value="6" />
                  <el-option label="一年" value="12" />
                  <el-option label="多年" value="36" />
                </el-select>
              </div>
            </div>

            <button
              class="calculate-btn"
              @click="calculateInsurance"
              :disabled="!canCalculateInsurance"
            >
              <i class="fas fa-calculator"></i>
              计算保费
            </button>
          </div>

          <!-- 保险计算结果 -->
          <div v-if="insuranceResult" class="result-section">
            <h3>保险费用</h3>
            <div class="result-summary">
              <div class="summary-card insurance">
                <div class="card-icon">
                  <i class="fas fa-shield-alt"></i>
                </div>
                <div class="card-content">
                  <h4>预计保费</h4>
                  <div class="amount">¥ {{ insuranceResult.premium?.toLocaleString() || '0' }}</div>
                </div>
              </div>
            </div>

            <div class="insurance-details">
              <div class="detail-item">
                <span class="label">保障额度</span>
                <span class="value">¥ {{ insuranceResult.coverage?.toLocaleString() || '0' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">费率</span>
                <span class="value">{{ insuranceResult.rate || '0' }}%</span>
              </div>
              <div class="detail-item">
                <span class="label">每亩保费</span>
                <span class="value"
                  >¥ {{ insuranceResult.premiumPerAcre?.toLocaleString() || '0' }}</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- 贷款计算器 -->
        <div v-if="activeTab === 'loan'" class="calculator-content">
          <div class="form-section">
            <h3>贷款信息</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>贷款用途</label>
                <el-select v-model="loanForm.purpose" placeholder="请选择贷款用途">
                  <el-option
                    v-for="purpose in loanPurposeOptions"
                    :key="purpose.value"
                    :label="purpose.label"
                    :value="purpose.value"
                  />
                </el-select>
              </div>
              <div class="form-group">
                <label>抵押物</label>
                <el-select v-model="loanForm.collateral" placeholder="请选择抵押物">
                  <el-option label="土地承包经营权" value="land" />
                  <el-option label="农机设备" value="equipment" />
                  <el-option label="农产品" value="products" />
                  <el-option label="信用贷款" value="credit" />
                </el-select>
              </div>
              <div class="form-group">
                <label>信用评级</label>
                <el-select v-model="loanForm.creditLevel" placeholder="请选择信用评级">
                  <el-option label="优秀" value="excellent" />
                  <el-option label="良好" value="good" />
                  <el-option label="一般" value="fair" />
                  <el-option label="较差" value="poor" />
                </el-select>
              </div>
              <div class="form-group">
                <label>申请期限（月）</label>
                <el-input-number
                  v-model="loanForm.term"
                  :min="1"
                  :max="360"
                  placeholder="请输入期限"
                />
              </div>
            </div>

            <button class="calculate-btn" @click="calculateLoan" :disabled="!canCalculateLoan">
              <i class="fas fa-calculator"></i>
              计算额度
            </button>
          </div>

          <!-- 贷款计算结果 -->
          <div v-if="loanResult" class="result-section">
            <h3>贷款额度</h3>
            <div class="result-summary">
              <div class="summary-card loan">
                <div class="card-icon">
                  <i class="fas fa-hand-holding-usd"></i>
                </div>
                <div class="card-content">
                  <h4>可贷额度</h4>
                  <div class="amount">¥ {{ loanResult.maxAmount?.toLocaleString() || '0' }}</div>
                </div>
              </div>
            </div>

            <div class="loan-details">
              <div class="detail-item">
                <span class="label">预计利率</span>
                <span class="value">{{ loanResult.interestRate || '0' }}%</span>
              </div>
              <div class="detail-item">
                <span class="label">月供估算</span>
                <span class="value"
                  >¥ {{ loanResult.monthlyPayment?.toLocaleString() || '0' }}</span
                >
              </div>
              <div class="detail-item">
                <span class="label">审批时间</span>
                <span class="value">{{ loanResult.approvalTime || '未知' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 历史记录 -->
      <div class="history-section">
        <div class="history-header">
          <h3>计算历史</h3>
          <button class="clear-btn" @click="clearHistory">
            <i class="fas fa-trash"></i>
            清空
          </button>
        </div>
        <div class="history-list">
          <div
            v-for="(item, index) in calculationHistory"
            :key="index"
            class="history-item"
            @click="loadHistoryItem(item)"
          >
            <div class="item-info">
              <span class="item-type">{{ getCalculationTypeName(item.type) }}</span>
              <span class="item-date">{{ formatDate(item.timestamp) }}</span>
            </div>
            <div class="item-result">¥ {{ item.result?.toLocaleString() || '0' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

export default {
  name: 'PolicyCalculator',
  emits: ['close'],
  setup(props, { emit }) {
    const activeTab = ref('subsidy');
    const isCalculating = ref(false);

    // 表单数据
    const subsidyForm = reactive({
      crop: '',
      area: null,
      region: '',
      farmerType: '',
    });

    const insuranceForm = reactive({
      crop: '',
      area: null,
      coverageLevel: '',
      duration: '12',
    });

    const loanForm = reactive({
      purpose: '',
      collateral: '',
      creditLevel: '',
      term: 12,
    });

    // 计算结果
    const subsidyResult = ref(null);
    const insuranceResult = ref(null);
    const loanResult = ref(null);

    // 历史记录
    const calculationHistory = ref([]);

    // 选项数据
    const calculatorTabs = [
      { key: 'subsidy', label: '补贴计算', icon: 'fas fa-coins' },
      { key: 'insurance', label: '保险计算', icon: 'fas fa-shield-alt' },
      { key: 'loan', label: '贷款计算', icon: 'fas fa-hand-holding-usd' },
    ];

    const cropOptions = [
      { value: 'rice', label: '水稻' },
      { value: 'wheat', label: '小麦' },
      { value: 'corn', label: '玉米' },
      { value: 'soybean', label: '大豆' },
      { value: 'cotton', label: '棉花' },
      { value: 'vegetables', label: '蔬菜' },
      { value: 'fruits', label: '水果' },
    ];

    const regionOptions = [
      { value: 'national', label: '全国' },
      { value: 'guangdong', label: '广东省' },
      { value: 'guangxi', label: '广西省' },
      { value: 'hunan', label: '湖南省' },
      { value: 'hubei', label: '湖北省' },
      { value: 'henan', label: '河南省' },
      { value: 'shandong', label: '山东省' },
      { value: 'jiangsu', label: '江苏省' },
    ];

    const farmerTypeOptions = [
      { value: 'individual', label: '个体农户' },
      { value: 'family', label: '家庭农场' },
      { value: 'cooperative', label: '合作社' },
      { value: 'company', label: '农业企业' },
    ];

    const loanPurposeOptions = [
      { value: 'planting', label: '种植业' },
      { value: 'livestock', label: '养殖业' },
      { value: 'machinery', label: '农机购置' },
      { value: 'processing', label: '农产品加工' },
      { value: 'infrastructure', label: '基础设施建设' },
    ];

    // 计算属性
    const canCalculateSubsidy = computed(() => {
      return subsidyForm.crop && subsidyForm.area && subsidyForm.region && subsidyForm.farmerType;
    });

    const canCalculateInsurance = computed(() => {
      return insuranceForm.crop && insuranceForm.area && insuranceForm.coverageLevel;
    });

    const canCalculateLoan = computed(() => {
      return loanForm.purpose && loanForm.collateral && loanForm.creditLevel && loanForm.term;
    });

    onMounted(() => {
      loadCalculationHistory();
    });

    const switchTab = tab => {
      activeTab.value = tab;
    };

    const closeCalculator = () => {
      emit('close');
    };

    // 补贴计算
    const calculateSubsidy = async () => {
      if (!canCalculateSubsidy.value) return;

      isCalculating.value = true;

      try {
        const response = await fetch('/api/v1/ai-chat/policy/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'subsidy',
            params: subsidyForm,
          }),
        });

        const data = await response.json();

        if (data.success) {
          subsidyResult.value = data.data;
          saveToHistory('subsidy', subsidyForm, data.data);
          ElMessage.success('补贴计算完成');
        } else {
          ElMessage.error(data.message || '计算失败');
        }
      } catch (error) {
        console.error('补贴计算失败:', error);
        ElMessage.error('计算失败，请稍后重试');
      } finally {
        isCalculating.value = false;
      }
    };

    // 保险计算
    const calculateInsurance = async () => {
      if (!canCalculateInsurance.value) return;

      isCalculating.value = true;

      try {
        const response = await fetch('/api/v1/ai-chat/policy/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'insurance',
            params: insuranceForm,
          }),
        });

        const data = await response.json();

        if (data.success) {
          insuranceResult.value = data.data;
          saveToHistory('insurance', insuranceForm, data.data);
          ElMessage.success('保费计算完成');
        } else {
          ElMessage.error(data.message || '计算失败');
        }
      } catch (error) {
        console.error('保险计算失败:', error);
        ElMessage.error('计算失败，请稍后重试');
      } finally {
        isCalculating.value = false;
      }
    };

    // 贷款计算
    const calculateLoan = async () => {
      if (!canCalculateLoan.value) return;

      isCalculating.value = true;

      try {
        const response = await fetch('/api/v1/ai-chat/policy/calculate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'loan',
            params: loanForm,
          }),
        });

        const data = await response.json();

        if (data.success) {
          loanResult.value = data.data;
          saveToHistory('loan', loanForm, data.data);
          ElMessage.success('贷款额度计算完成');
        } else {
          ElMessage.error(data.message || '计算失败');
        }
      } catch (error) {
        console.error('贷款计算失败:', error);
        ElMessage.error('计算失败，请稍后重试');
      } finally {
        isCalculating.value = false;
      }
    };

    // 历史记录管理
    const saveToHistory = (type, form, result) => {
      const historyItem = {
        type,
        form: { ...form },
        result:
          type === 'subsidy'
            ? result.totalAmount
            : type === 'insurance'
              ? result.premium
              : result.maxAmount,
        timestamp: new Date(),
      };

      calculationHistory.value.unshift(historyItem);

      // 限制历史记录数量
      if (calculationHistory.value.length > 10) {
        calculationHistory.value = calculationHistory.value.slice(0, 10);
      }

      // 保存到本地存储
      try {
        localStorage.setItem('policyCalculatorHistory', JSON.stringify(calculationHistory.value));
      } catch (error) {
        console.error('保存历史记录失败:', error);
      }
    };

    const loadCalculationHistory = () => {
      try {
        const saved = localStorage.getItem('policyCalculatorHistory');
        if (saved) {
          calculationHistory.value = JSON.parse(saved);
        }
      } catch (error) {
        console.error('加载历史记录失败:', error);
      }
    };

    const clearHistory = async () => {
      try {
        await ElMessageBox.confirm('确定要清空所有计算历史吗？', '确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        });

        calculationHistory.value = [];
        localStorage.removeItem('policyCalculatorHistory');
        ElMessage.success('历史记录已清空');
      } catch {
        // 用户取消
      }
    };

    const loadHistoryItem = item => {
      // 根据类型切换标签页
      switchTab(item.type);

      // 恢复表单数据
      setTimeout(() => {
        if (item.type === 'subsidy') {
          Object.assign(subsidyForm, item.form);
          subsidyResult.value = { totalAmount: item.result };
        } else if (item.type === 'insurance') {
          Object.assign(insuranceForm, item.form);
          insuranceResult.value = { premium: item.result };
        } else if (item.type === 'loan') {
          Object.assign(loanForm, item.form);
          loanResult.value = { maxAmount: item.result };
        }
      }, 100);
    };

    // 结果操作
    const saveCalculation = () => {
      let result = null;
      if (activeTab.value === 'subsidy') result = subsidyResult.value;
      else if (activeTab.value === 'insurance') result = insuranceResult.value;
      else if (activeTab.value === 'loan') result = loanResult.value;

      if (result) {
        // 保存到用户账户或其他存储
        ElMessage.success('计算结果已保存');
      }
    };

    const shareResult = () => {
      // 分享功能
      ElMessage.info('分享功能开发中');
    };

    const exportResult = () => {
      // 导出PDF报告
      ElMessage.info('导出功能开发中');
    };

    // 工具函数
    const getCalculationTypeName = type => {
      const names = {
        subsidy: '补贴计算',
        insurance: '保险计算',
        loan: '贷款计算',
      };
      return names[type] || type;
    };

    const formatDate = timestamp => {
      return new Date(timestamp).toLocaleString();
    };

    return {
      // 状态
      activeTab,
      isCalculating,
      subsidyForm,
      insuranceForm,
      loanForm,
      subsidyResult,
      insuranceResult,
      loanResult,
      calculationHistory,

      // 选项
      calculatorTabs,
      cropOptions,
      regionOptions,
      farmerTypeOptions,
      loanPurposeOptions,

      // 计算属性
      canCalculateSubsidy,
      canCalculateInsurance,
      canCalculateLoan,

      // 方法
      switchTab,
      closeCalculator,
      calculateSubsidy,
      calculateInsurance,
      calculateLoan,
      saveCalculation,
      shareResult,
      exportResult,
      clearHistory,
      loadHistoryItem,
      getCalculationTypeName,
      formatDate,
    };
  },
};
</script>

<style scoped>
.policy-calculator-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.policy-calculator-modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  color: white;
}

.modal-header h2 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.calculator-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 0;
}

.tab-btn {
  padding: 12px 20px;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  border-bottom: 3px solid transparent;
}

.tab-btn.active {
  color: #4caf50;
  background: #f0f7f0;
  border-bottom-color: #4caf50;
}

.tab-btn:hover {
  background: #f5f5f5;
}

.calculator-content {
  margin-bottom: 24px;
}

.form-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.form-section h3 {
  margin: 0 0 16px;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 6px;
  color: #555;
  font-size: 14px;
  font-weight: 500;
}

.calculate-btn {
  background: #4caf50;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.calculate-btn:hover:not(:disabled) {
  background: #45a049;
}

.calculate-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.result-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
}

.result-section h3 {
  margin: 0 0 16px;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.result-summary {
  margin-bottom: 20px;
}

.summary-card {
  background: linear-gradient(135deg, #f0f7f0, #e8f5e8);
  padding: 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-left: 4px solid #4caf50;
}

.summary-card.total {
  border-left-color: #ff9800;
}

.summary-card.insurance {
  border-left-color: #2196f3;
}

.summary-card.loan {
  border-left-color: #9c27b0;
}

.card-icon {
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #4caf50;
}

.summary-card.insurance .card-icon {
  color: #2196f3;
}

.summary-card.loan .card-icon {
  color: #9c27b0;
}

.card-content h4 {
  margin: 0 0 4px;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

.amount {
  font-size: 24px;
  font-weight: bold;
  color: #4caf50;
}

.subsidy-breakdown h4 {
  margin: 0 0 12px;
  color: #333;
  font-size: 14px;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.breakdown-item {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.policy-name {
  font-weight: 500;
  color: #333;
}

.amount {
  font-weight: 600;
  color: #4caf50;
}

.item-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #666;
}

.result-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.action-btn {
  padding: 8px 16px;
  border: 1px solid #4caf50;
  background: white;
  color: #4caf50;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn:hover {
  background: #4caf50;
  color: white;
}

.insurance-details,
.loan-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item .label {
  color: #666;
  font-size: 14px;
}

.detail-item .value {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.history-section {
  border-top: 1px solid #e0e0e0;
  padding: 20px;
  background: #f8f9fa;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.history-header h3 {
  margin: 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.clear-btn {
  padding: 6px 12px;
  border: 1px solid #ff4444;
  background: white;
  color: #ff4444;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.clear-btn:hover {
  background: #ff4444;
  color: white;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-item:hover {
  background: #f0f7f0;
  border-color: #4caf50;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-type {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.item-date {
  font-size: 12px;
  color: #666;
}

.item-result {
  font-weight: 600;
  color: #4caf50;
  font-size: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .policy-calculator-modal {
    margin: 10px;
    max-height: calc(100vh - 20px);
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .result-actions {
    flex-wrap: wrap;
  }

  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
