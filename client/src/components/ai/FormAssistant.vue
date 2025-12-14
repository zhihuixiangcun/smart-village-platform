<template>
  <div class="form-assistant-overlay" @click.self="closeAssistant">
    <div class="form-assistant-modal">
      <div class="modal-header">
        <h2>
          <i class="fas fa-file-alt"></i>
          AI填表助手
        </h2>
        <button class="close-btn" @click="closeAssistant">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-content">
        <!-- 功能选择 -->
        <div class="assistant-tabs">
          <button
            v-for="tab in assistantTabs"
            :key="tab.key"
            class="tab-btn"
            :class="{ active: activeTab === tab.key }"
            @click="switchTab(tab.key)"
          >
            <i :class="tab.icon"></i>
            {{ tab.label }}
          </button>
        </div>

        <!-- 智能填表 -->
        <div v-if="activeTab === 'fill'" class="assistant-content">
          <div class="form-section">
            <h3>选择表单类型</h3>
            <div class="form-templates">
              <div
                v-for="template in formTemplates"
                :key="template.id"
                class="template-card"
                :class="{ selected: selectedTemplate?.id === template.id }"
                @click="selectTemplate(template)"
              >
                <div class="template-icon">
                  <i :class="template.icon"></i>
                </div>
                <div class="template-info">
                  <h4>{{ template.name }}</h4>
                  <p>{{ template.description }}</p>
                  <div class="template-meta">
                    <span class="field-count">{{ template.fieldCount }} 个字段</span>
                    <span class="difficulty">{{ template.difficulty }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="selectedTemplate" class="form-fill-section">
              <div class="template-header">
                <h4>{{ selectedTemplate.name }}</h4>
                <button class="ai-fill-btn" @click="aiAutoFill">
                  <i class="fas fa-magic"></i>
                  AI智能填写
                </button>
              </div>

              <div class="form-fields">
                <div
                  v-for="field in selectedTemplate.fields"
                  :key="field.name"
                  class="form-field"
                  :class="{ filled: formData[field.name], required: field.required }"
                >
                  <label>
                    {{ field.name }}
                    <span v-if="field.required" class="required-mark">*</span>
                  </label>
                  <div class="field-input">
                    <el-input
                      v-if="field.type === 'text'"
                      v-model="formData[field.name]"
                      :placeholder="field.placeholder || `请输入${field.name}`"
                      :disabled="isProcessing"
                    />
                    <el-input-number
                      v-else-if="field.type === 'number'"
                      v-model="formData[field.name]"
                      :placeholder="field.placeholder || `请输入${field.name}`"
                      :disabled="isProcessing"
                    />
                    <el-select
                      v-else-if="field.type === 'select'"
                      v-model="formData[field.name]"
                      :placeholder="field.placeholder || `请选择${field.name}`"
                      :disabled="isProcessing"
                    >
                      <el-option
                        v-for="option in field.options"
                        :key="option"
                        :label="option"
                        :value="option"
                      />
                    </el-select>
                    <el-date-picker
                      v-else-if="field.type === 'date'"
                      v-model="formData[field.name]"
                      type="date"
                      :placeholder="field.placeholder || `请选择${field.name}`"
                      :disabled="isProcessing"
                    />
                  </div>
                  <div class="field-status">
                    <i v-if="formData[field.name]" class="fas fa-check-circle filled"></i>
                    <i v-else-if="field.required" class="fas fa-exclamation-circle required"></i>
                    <i v-else class="fas fa-circle optional"></i>
                  </div>
                </div>
              </div>

              <div class="form-actions">
                <div class="form-stats">
                  <span>完成度: {{ formCompleteness }}%</span>
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: formCompleteness + '%' }"></div>
                  </div>
                </div>
                <div class="action-buttons">
                  <button class="action-btn secondary" @click="clearForm">
                    <i class="fas fa-eraser"></i>
                    清空
                  </button>
                  <button class="action-btn secondary" @click="saveForm">
                    <i class="fas fa-save"></i>
                    保存
                  </button>
                  <button class="action-btn primary" @click="submitForm" :disabled="formCompleteness < 100">
                    <i class="fas fa-paper-plane"></i>
                    提交
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 智能生成表单 -->
        <div v-if="activeTab === 'generate'" class="assistant-content">
          <div class="form-section">
            <h3>表单描述</h3>
            <div class="description-input">
              <el-input
                v-model="formDescription"
                type="textarea"
                :rows="4"
                placeholder="请描述您需要生成的表单，例如：农业补贴申请表，需要填写申请人信息、种植面积、作物类型等..."
                maxlength="500"
                show-word-limit
              />
            </div>

            <div class="ai-generate-section">
              <button class="generate-btn" @click="generateForm" :disabled="!formDescription || isProcessing">
                <i class="fas fa-magic"></i>
                {{ isProcessing ? '生成中...' : 'AI智能生成表单' }}
              </button>
            </div>

            <!-- 生成的表单预览 -->
            <div v-if="generatedForm" class="generated-form-preview">
              <h4>生成的表单预览</h4>
              <div class="preview-fields">
                <div
                  v-for="field in generatedForm.fields"
                  :key="field.name"
                  class="preview-field"
                >
                  <div class="field-info">
                    <span class="field-name">{{ field.name }}</span>
                    <span class="field-type">{{ getFieldTypeLabel(field.type) }}</span>
                    <span v-if="field.required" class="required-tag">必填</span>
                  </div>
                </div>
              </div>
              <div class="preview-actions">
                <button class="action-btn secondary" @click="editGeneratedForm">
                  <i class="fas fa-edit"></i>
                  编辑
                </button>
                <button class="action-btn secondary" @click="saveGeneratedForm">
                  <i class="fas fa-save"></i>
                  保存模板
                </button>
                <button class="action-btn primary" @click="useGeneratedForm">
                  <i class="fas fa-check"></i>
                  使用此表单
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 表单模板管理 -->
        <div v-if="activeTab === 'templates'" class="assistant-content">
          <div class="form-section">
            <div class="section-header">
              <h3>我的表单模板</h3>
              <button class="create-btn" @click="createNewTemplate">
                <i class="fas fa-plus"></i>
                新建模板
              </button>
            </div>

            <div class="template-search">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索模板..."
                prefix-icon="el-icon-search"
                clearable
              />
            </div>

            <div class="template-grid">
              <div
                v-for="template in filteredTemplates"
                :key="template.id"
                class="template-grid-item"
              >
                <div class="template-card">
                  <div class="template-header">
                    <h4>{{ template.name }}</h4>
                    <div class="template-actions">
                      <button class="icon-btn" @click="editTemplate(template)">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button class="icon-btn" @click="deleteTemplate(template)">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                  <p>{{ template.description }}</p>
                  <div class="template-meta">
                    <span>{{ template.fieldCount }} 个字段</span>
                    <span>{{ formatDate(template.createdAt) }}</span>
                  </div>
                  <button class="use-btn" @click="useTemplate(template)">
                    使用模板
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 填表历史 -->
        <div v-if="activeTab === 'history'" class="assistant-content">
          <div class="form-section">
            <div class="section-header">
              <h3>填表历史</h3>
              <button class="clear-btn" @click="clearHistory">
                <i class="fas fa-trash"></i>
                清空历史
              </button>
            </div>

            <div class="history-list">
              <div
                v-for="item in fillHistory"
                :key="item.id"
                class="history-item"
                @click="viewHistoryItem(item)"
              >
                <div class="history-info">
                  <div class="history-title">{{ item.formName }}</div>
                  <div class="history-meta">
                    <span class="form-type">{{ item.formType }}</span>
                    <span class="completion">{{ item.completeness }}% 完成</span>
                    <span class="date">{{ formatDate(item.createdAt) }}</span>
                  </div>
                </div>
                <div class="history-status">
                  <span class="status-badge" :class="item.status">
                    {{ getStatusLabel(item.status) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

export default {
  name: 'FormAssistant',
  emits: ['close'],
  setup(props, { emit }) {
    const activeTab = ref('fill')
    const isProcessing = ref(false)

    // 智能填表相关
    const selectedTemplate = ref(null)
    const formData = reactive({})
    const formDescription = ref('')
    const generatedForm = ref(null)

    // 模板管理
    const searchKeyword = ref('')
    const userTemplates = ref([])
    const fillHistory = ref([])

    // 表单模板数据
    const formTemplates = [
      {
        id: 'agricultural_subsidy',
        name: '农业补贴申请',
        description: '申请农业种植补贴，包括粮食直补、农资综合补贴等',
        icon: 'fas fa-coins',
        fieldCount: 8,
        difficulty: '简单',
        fields: [
          { name: '申请人姓名', type: 'text', required: true, placeholder: '请输入真实姓名' },
          { name: '身份证号', type: 'text', required: true, placeholder: '请输入18位身份证号' },
          { name: '联系电话', type: 'text', required: true, placeholder: '请输入手机号码' },
          { name: '种植作物', type: 'select', required: true, options: ['水稻', '小麦', '玉米', '大豆', '棉花'] },
          { name: '种植面积', type: 'number', required: true, placeholder: '请输入种植面积（亩）' },
          { name: '种植地点', type: 'text', required: true, placeholder: '请输入详细地址' },
          { name: '银行账号', type: 'text', required: true, placeholder: '请用于接收补贴的银行账号' },
          { name: '申请理由', type: 'text', required: false, placeholder: '请简要说明申请理由' }
        ]
      },
      {
        id: 'agricultural_insurance',
        name: '农业保险投保',
        description: '为农作物投保，降低自然灾害风险',
        icon: 'fas fa-shield-alt',
        fieldCount: 6,
        difficulty: '简单',
        fields: [
          { name: '投保人姓名', type: 'text', required: true, placeholder: '请输入投保人姓名' },
          { name: '身份证号', type: 'text', required: true, placeholder: '请输入身份证号' },
          { name: '联系方式', type: 'text', required: true, placeholder: '请输入联系电话' },
          { name: '保险标的', type: 'select', required: true, options: ['水稻', '小麦', '玉米', '设施农业'] },
          { name: '保险面积', type: 'number', required: true, placeholder: '请输入保险面积（亩）' },
          { name: '保险期限', type: 'date', required: true, placeholder: '请选择保险期限' }
        ]
      },
      {
        id: 'land_transfer',
        name: '土地流转申请',
        description: '农村土地承包经营权流转申请',
        icon: 'fas fa-file-contract',
        fieldCount: 10,
        difficulty: '中等',
        fields: [
          { name: '转出方姓名', type: 'text', required: true },
          { name: '转出方身份证号', type: 'text', required: true },
          { name: '转入方姓名', type: 'text', required: true },
          { name: '转入方身份证号', type: 'text', required: true },
          { name: '流转土地位置', type: 'text', required: true },
          { name: '流转面积', type: 'number', required: true },
          { name: '流转期限', type: 'number', required: true },
          { name: '流转价格', type: 'number', required: true },
          { name: '流转用途', type: 'select', required: true, options: ['种植', '养殖', '其他'] },
          { name: '流转方式', type: 'select', required: true, options: ['转包', '出租', '互换', '转让'] }
        ]
      }
    ]

    const assistantTabs = [
      { key: 'fill', label: '智能填表', icon: 'fas fa-edit' },
      { key: 'generate', label: '生成表单', icon: 'fas fa-magic' },
      { key: 'templates', label: '模板管理', icon: 'fas fa-folder-open' },
      { key: 'history', label: '填表历史', icon: 'fas fa-history' }
    ]

    onMounted(() => {
      loadUserTemplates()
      loadFillHistory()
    })

    // 计算属性
    const formCompleteness = computed(() => {
      if (!selectedTemplate.value) return 0

      const fields = selectedTemplate.value.fields
      const filledFields = fields.filter(field => formData[field.name])
      return Math.round((filledFields.length / fields.length) * 100)
    })

    const filteredTemplates = computed(() => {
      if (!searchKeyword.value) return userTemplates.value

      return userTemplates.value.filter(template =>
        template.name.includes(searchKeyword.value) ||
        template.description.includes(searchKeyword.value)
      )
    })

    // 标签页切换
    const switchTab = (tab) => {
      activeTab.value = tab
    }

    const closeAssistant = () => {
      emit('close')
    }

    // 选择模板
    const selectTemplate = (template) => {
      selectedTemplate.value = template

      // 初始化表单数据
      Object.keys(formData).forEach(key => delete formData[key])
      template.fields.forEach(field => {
        formData[field.name] = ''
      })
    }

    // AI智能填写
    const aiAutoFill = async () => {
      if (!selectedTemplate.value) return

      isProcessing.value = true

      try {
        // 模拟AI填写过程
        await new Promise(resolve => setTimeout(resolve, 2000))

        // 根据用户信息自动填写一些字段
        if (selectedTemplate.value.id === 'agricultural_subsidy') {
          formData['申请人姓名'] = '张三'
          formData['联系电话'] = '13800138000'
          formData['身份证号'] = '110101199001011234'
          formData['银行账号'] = '6222021234567890123'
        }

        ElMessage.success('AI智能填写完成')
      } catch (error) {
        console.error('AI填写失败:', error)
        ElMessage.error('AI填写失败，请手动填写')
      } finally {
        isProcessing.value = false
      }
    }

    // 智能生成表单
    const generateForm = async () => {
      if (!formDescription.value.trim()) return

      isProcessing.value = true

      try {
        const response = await fetch('/api/v1/ai-chat/form/fill', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            formDescription: formDescription.value
          })
        })

        const data = await response.json()

        if (data.success) {
          generatedForm.value = data.data
          ElMessage.success('表单生成成功')
        } else {
          ElMessage.error(data.message || '生成失败')
        }
      } catch (error) {
        console.error('生成表单失败:', error)
        // 模拟生成的表单
        generatedForm.value = {
          formName: '生成的表单',
          fields: [
            { name: '姓名', type: 'text', required: true },
            { name: '联系电话', type: 'text', required: true },
            { name: '申请日期', type: 'date', required: true }
          ]
        }
        ElMessage.success('表单生成成功（模拟数据）')
      } finally {
        isProcessing.value = false
      }
    }

    // 表单操作
    const clearForm = () => {
      Object.keys(formData).forEach(key => {
        formData[key] = ''
      })
    }

    const saveForm = () => {
      ElMessage.success('表单已保存到草稿箱')
    }

    const submitForm = async () => {
      if (formCompleteness.value < 100) {
        ElMessage.warning('请填写所有必填字段')
        return
      }

      try {
        // 提交表单逻辑
        await new Promise(resolve => setTimeout(resolve, 1000))

        // 添加到历史记录
        const historyItem = {
          id: Date.now(),
          formName: selectedTemplate.value.name,
          formType: '智能填表',
          completeness: 100,
          status: 'submitted',
          createdAt: new Date(),
          data: { ...formData }
        }

        fillHistory.value.unshift(historyItem)
        saveFillHistory()

        ElMessage.success('表单提交成功')
        clearForm()
      } catch (error) {
        console.error('提交失败:', error)
        ElMessage.error('提交失败，请稍后重试')
      }
    }

    // 模板管理
    const loadUserTemplates = () => {
      try {
        const saved = localStorage.getItem('userFormTemplates')
        if (saved) {
          userTemplates.value = JSON.parse(saved)
        }
      } catch (error) {
        console.error('加载模板失败:', error)
      }
    }

    const saveUserTemplates = () => {
      try {
        localStorage.setItem('userFormTemplates', JSON.stringify(userTemplates.value))
      } catch (error) {
        console.error('保存模板失败:', error)
      }
    }

    const createNewTemplate = () => {
      // 创建新模板逻辑
      ElMessage.info('创建模板功能开发中')
    }

    const editTemplate = (template) => {
      // 编辑模板逻辑
      ElMessage.info('编辑模板功能开发中')
    }

    const deleteTemplate = async (template) => {
      try {
        await ElMessageBox.confirm('确定要删除此模板吗？', '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        const index = userTemplates.value.findIndex(t => t.id === template.id)
        if (index > -1) {
          userTemplates.value.splice(index, 1)
          saveUserTemplates()
          ElMessage.success('模板已删除')
        }
      } catch {
        // 用户取消
      }
    }

    const useTemplate = (template) => {
      switchTab('fill')
      selectTemplate(template)
    }

    // 填表历史
    const loadFillHistory = () => {
      try {
        const saved = localStorage.getItem('formFillHistory')
        if (saved) {
          fillHistory.value = JSON.parse(saved)
        }
      } catch (error) {
        console.error('加载历史失败:', error)
      }
    }

    const saveFillHistory = () => {
      try {
        localStorage.setItem('formFillHistory', JSON.stringify(fillHistory.value))
      } catch (error) {
        console.error('保存历史失败:', error)
      }
    }

    const clearHistory = async () => {
      try {
        await ElMessageBox.confirm('确定要清空所有填表历史吗？', '确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })

        fillHistory.value = []
        localStorage.removeItem('formFillHistory')
        ElMessage.success('历史记录已清空')
      } catch {
        // 用户取消
      }
    }

    const viewHistoryItem = (item) => {
      // 查看历史详情
      ElMessage.info('查看历史详情功能开发中')
    }

    // 工具函数
    const getFieldTypeLabel = (type) => {
      const labels = {
        text: '文本',
        number: '数字',
        select: '选择',
        date: '日期',
        textarea: '多行文本'
      }
      return labels[type] || type
    }

    const formatDate = (date) => {
      return new Date(date).toLocaleString()
    }

    const getStatusLabel = (status) => {
      const labels = {
        draft: '草稿',
        submitted: '已提交',
        approved: '已通过',
        rejected: '已拒绝'
      }
      return labels[status] || status
    }

    return {
      // 状态
      activeTab,
      isProcessing,
      selectedTemplate,
      formData,
      formDescription,
      generatedForm,
      searchKeyword,
      userTemplates,
      fillHistory,

      // 数据
      formTemplates,
      assistantTabs,

      // 计算属性
      formCompleteness,
      filteredTemplates,

      // 方法
      switchTab,
      closeAssistant,
      selectTemplate,
      aiAutoFill,
      generateForm,
      clearForm,
      saveForm,
      submitForm,
      createNewTemplate,
      editTemplate,
      deleteTemplate,
      useTemplate,
      loadUserTemplates,
      clearHistory,
      viewHistoryItem,
      getFieldTypeLabel,
      formatDate,
      getStatusLabel
    }
  }
}
</script>

<style scoped>
.form-assistant-overlay {
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

.form-assistant-modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
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
  background: linear-gradient(135deg, #2196F3, #1976D2);
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

.assistant-tabs {
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
  color: #2196F3;
  background: #f0f8ff;
  border-bottom-color: #2196F3;
}

.tab-btn:hover {
  background: #f5f5f5;
}

.assistant-content {
  animation: fadeInUp 0.3s ease;
}

.form-section {
  margin-bottom: 24px;
}

.form-section h3 {
  margin: 0 0 16px;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.create-btn {
  background: #2196F3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.create-btn:hover {
  background: #1976D2;
}

.form-templates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.template-card {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 16px;
}

.template-card:hover {
  border-color: #2196F3;
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.1);
}

.template-card.selected {
  border-color: #2196F3;
  background: #f0f8ff;
}

.template-icon {
  width: 48px;
  height: 48px;
  background: #f0f8ff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #2196F3;
}

.template-info {
  flex: 1;
}

.template-info h4 {
  margin: 0 0 4px;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.template-info p {
  margin: 0 0 8px;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

.template-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.form-fill-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.template-header h4 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.ai-fill-btn {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.ai-fill-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.form-field {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  transition: all 0.3s;
}

.form-field.filled {
  border-color: #4CAF50;
  background: #f0f7f0;
}

.form-field.required {
  border-left: 4px solid #ff9800;
}

.form-field label {
  min-width: 120px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.required-mark {
  color: #ff4444;
  margin-left: 4px;
}

.field-input {
  flex: 1;
}

.field-status {
  width: 20px;
  text-align: center;
}

.field-status i {
  font-size: 16px;
}

.field-status .filled {
  color: #4CAF50;
}

.field-status .required {
  color: #ff9800;
}

.field-status .optional {
  color: #ccc;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-stats span {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #45a049);
  transition: width 0.3s ease;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.action-btn {
  padding: 10px 20px;
  border: 1px solid #2196F3;
  background: white;
  color: #2196F3;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn:hover {
  background: #2196F3;
  color: white;
}

.action-btn.primary {
  background: #2196F3;
  color: white;
  border-color: #2196F3;
}

.action-btn.secondary {
  background: white;
  color: #666;
  border-color: #e0e0e0;
}

.action-btn.secondary:hover {
  background: #f5f5f5;
}

.description-input {
  margin-bottom: 20px;
}

.ai-generate-section {
  text-align: center;
  margin-bottom: 24px;
}

.generate-btn {
  background: linear-gradient(135deg, #9C27B0, #7B1FA2);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(156, 39, 176, 0.3);
}

.generate-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.generated-form-preview {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.generated-form-preview h4 {
  margin: 0 0 16px;
  color: #333;
  font-size: 16px;
}

.preview-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.preview-field {
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.field-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-name {
  font-weight: 500;
  color: #333;
}

.field-type {
  background: #e0e0e0;
  color: #666;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.required-tag {
  background: #ff9800;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.preview-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.template-search {
  margin-bottom: 20px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.template-grid-item .template-card {
  flex-direction: column;
  text-align: left;
  padding: 16px;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.template-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f0f0f0;
  color: #666;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.icon-btn:hover {
  background: #e0e0e0;
  color: #333;
}

.use-btn {
  width: 100%;
  background: #2196F3;
  color: white;
  border: none;
  padding: 8px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
  margin-top: 12px;
}

.use-btn:hover {
  background: #1976D2;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-item:hover {
  background: #f0f8ff;
  border-color: #2196F3;
}

.history-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.history-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
}

.form-type {
  background: #e0e0e0;
  color: #666;
  padding: 2px 8px;
  border-radius: 12px;
}

.completion {
  color: #4CAF50;
  font-weight: 500;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.submitted {
  background: #e3f2fd;
  color: #1976D2;
}

.status-badge.approved {
  background: #e8f5e8;
  color: #4CAF50;
}

.status-badge.rejected {
  background: #ffebee;
  color: #d32f2f;
}

.status-badge.draft {
  background: #f5f5f5;
  color: #666;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .form-assistant-modal {
    margin: 10px;
    max-height: calc(100vh - 20px);
  }

  .assistant-tabs {
    flex-wrap: wrap;
  }

  .form-templates,
  .template-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>