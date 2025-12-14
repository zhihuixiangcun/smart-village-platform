<template>
  <el-dialog
    v-model="dialogVisible"
    title="村民分类标签管理"
    width="900px"
    :close-on-click-modal="false"
    top="5vh"
  >
    <div class="resident-category-manager">
      <el-row :gutter="20">
        <!-- 左侧：村民信息和当前标签 -->
        <el-col :span="12">
          <el-card title="村民信息" shadow="never">
            <template #header>
              <div class="card-header">
                <span>村民信息</span>
                <el-button size="small" @click="refreshResidentInfo" icon="Refresh">
                  刷新
                </el-button>
              </div>
            </template>

            <!-- 村民基本信息 -->
            <div class="resident-info">
              <div class="info-header">
                <el-avatar :size="60" :src="resident?.avatar" :icon="UserFilled" />
                <div class="basic-info">
                  <h3>{{ resident?.name }}</h3>
                  <p>
                    <el-tag :type="resident?.gender === 'male' ? 'primary' : 'danger'" size="small">
                      {{ resident?.gender === 'male' ? '男' : '女' }}
                    </el-tag>
                    <span class="info-item">{{ resident?.age }} 岁</span>
                    <span class="info-item">户码: {{ resident?.householdCode }}</span>
                  </p>
                </div>
              </div>

              <!-- 当前标签 -->
              <div class="current-tags">
                <h4>当前标签</h4>
                <div class="tags-container">
                  <el-tag
                    v-for="tag in currentTags"
                    :key="tag.id"
                    :type="tag.type"
                    :effect="tag.effect"
                    class="category-tag"
                    closable
                    @close="removeTag(tag)"
                  >
                    <el-icon v-if="tag.icon">
                      <component :is="tag.icon" />
                    </el-icon>
                    {{ tag.label }}
                  </el-tag>
                  <el-tag v-if="currentTags.length === 0" type="info" effect="plain">
                    暂无标签
                  </el-tag>
                </div>
              </div>

              <!-- 自动识别的标签建议 -->
              <div v-if="suggestedTags.length > 0" class="suggested-tags">
                <h4>
                  <el-icon><MagicStick /></el-icon>
                  智能推荐
                </h4>
                <div class="suggestions-list">
                  <div
                    v-for="suggestion in suggestedTags"
                    :key="suggestion.id"
                    class="suggestion-item"
                  >
                    <div class="suggestion-info">
                      <el-tag :type="suggestion.type" size="small">
                        {{ suggestion.label }}
                      </el-tag>
                      <span class="suggestion-reason">{{ suggestion.reason }}</span>
                      <span class="suggestion-confidence">
                        可信度: {{ (suggestion.confidence * 100).toFixed(0) }}%
                      </span>
                    </div>
                    <div class="suggestion-actions">
                      <el-button size="small" type="primary" @click="acceptSuggestion(suggestion)">
                        接受
                      </el-button>
                      <el-button size="small" @click="rejectSuggestion(suggestion)">
                        忽略
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 右侧：标签分类管理 -->
        <el-col :span="12">
          <el-card title="标签分类" shadow="never">
            <template #header>
              <div class="card-header">
                <span>标签分类</span>
                <el-button-group size="small">
                  <el-button @click="createCustomTag" icon="Plus">
                    自定义标签
                  </el-button>
                  <el-button @click="manageTags" icon="Setting">
                    管理标签
                  </el-button>
                </el-button-group>
              </div>
            </template>

            <div class="category-tabs">
              <el-tabs v-model="activeCategory" type="border-card">
                <!-- 社会保障类 -->
                <el-tab-pane label="社会保障" name="social_security">
                  <div class="tag-group">
                    <div
                      v-for="tag in socialSecurityTags"
                      :key="tag.id"
                      class="tag-item"
                      :class="{ 'is-selected': isTagSelected(tag) }"
                      @click="toggleTag(tag)"
                    >
                      <el-tag :type="tag.type" :effect="tag.effect" class="selectable-tag">
                        <el-icon v-if="tag.icon">
                          <component :is="tag.icon" />
                        </el-icon>
                        {{ tag.label }}
                      </el-tag>
                      <div class="tag-description">{{ tag.description }}</div>
                    </div>
                  </div>
                </el-tab-pane>

                <!-- 身体状况类 -->
                <el-tab-pane label="身体状况" name="health">
                  <div class="tag-group">
                    <div
                      v-for="tag in healthTags"
                      :key="tag.id"
                      class="tag-item"
                      :class="{ 'is-selected': isTagSelected(tag) }"
                      @click="toggleTag(tag)"
                    >
                      <el-tag :type="tag.type" :effect="tag.effect" class="selectable-tag">
                        <el-icon v-if="tag.icon">
                          <component :is="tag.icon" />
                        </el-icon>
                        {{ tag.label }}
                      </el-tag>
                      <div class="tag-description">{{ tag.description }}</div>
                    </div>
                  </div>
                </el-tab-pane>

                <!-- 家庭状况类 -->
                <el-tab-pane label="家庭状况" name="family">
                  <div class="tag-group">
                    <div
                      v-for="tag in familyTags"
                      :key="tag.id"
                      class="tag-item"
                      :class="{ 'is-selected': isTagSelected(tag) }"
                      @click="toggleTag(tag)"
                    >
                      <el-tag :type="tag.type" :effect="tag.effect" class="selectable-tag">
                        <el-icon v-if="tag.icon">
                          <component :is="tag.icon" />
                        </el-icon>
                        {{ tag.label }}
                      </el-tag>
                      <div class="tag-description">{{ tag.description }}</div>
                    </div>
                  </div>
                </el-tab-pane>

                <!-- 职业特征类 -->
                <el-tab-pane label="职业特征" name="occupation">
                  <div class="tag-group">
                    <div
                      v-for="tag in occupationTags"
                      :key="tag.id"
                      class="tag-item"
                      :class="{ 'is-selected': isTagSelected(tag) }"
                      @click="toggleTag(tag)"
                    >
                      <el-tag :type="tag.type" :effect="tag.effect" class="selectable-tag">
                        <el-icon v-if="tag.icon">
                          <component :is="tag.icon" />
                        </el-icon>
                        {{ tag.label }}
                      </el-tag>
                      <div class="tag-description">{{ tag.description }}</div>
                    </div>
                  </div>
                </el-tab-pane>

                <!-- 自定义标签 -->
                <el-tab-pane label="自定义" name="custom">
                  <div class="custom-tags-section">
                    <div class="tag-group">
                      <div
                        v-for="tag in customTags"
                        :key="tag.id"
                        class="tag-item custom-tag-item"
                        :class="{ 'is-selected': isTagSelected(tag) }"
                      >
                        <div class="tag-content" @click="toggleTag(tag)">
                          <el-tag :type="tag.type" :effect="tag.effect" class="selectable-tag">
                            {{ tag.label }}
                          </el-tag>
                          <div class="tag-description">{{ tag.description }}</div>
                        </div>
                        <div class="tag-actions">
                          <el-button size="small" type="primary" @click="editCustomTag(tag)" icon="Edit" />
                          <el-button size="small" type="danger" @click="deleteCustomTag(tag)" icon="Delete" />
                        </div>
                      </div>
                    </div>

                    <div v-if="customTags.length === 0" class="empty-custom-tags">
                      <el-empty description="暂无自定义标签" />
                      <el-button type="primary" @click="createCustomTag">
                        创建第一个自定义标签
                      </el-button>
                    </div>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 批量操作区域 -->
      <div class="batch-operations">
        <el-card title="批量操作" shadow="never">
          <div class="batch-content">
            <div class="operation-info">
              <span>选择操作类型并应用到符合条件的村民：</span>
            </div>
            <div class="operation-controls">
              <el-select v-model="batchOperation.type" placeholder="选择操作类型" style="width: 200px;">
                <el-option label="添加标签" value="add" />
                <el-option label="移除标签" value="remove" />
                <el-option label="替换标签" value="replace" />
              </el-select>
              <el-select
                v-model="batchOperation.targetTag"
                placeholder="选择标签"
                style="width: 200px;"
              >
                <el-option
                  v-for="tag in allAvailableTags"
                  :key="tag.id"
                  :label="tag.label"
                  :value="tag.id"
                />
              </el-select>
              <el-input
                v-model="batchOperation.condition"
                placeholder="筛选条件 (如：年龄>65)"
                style="width: 200px;"
              />
              <el-button type="primary" @click="executeBatchOperation" :loading="batchLoading">
                执行批量操作
              </el-button>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 创建/编辑自定义标签对话框 -->
      <el-dialog
        v-model="customTagDialogVisible"
        :title="customTagDialogMode === 'create' ? '创建自定义标签' : '编辑自定义标签'"
        width="500px"
      >
        <el-form
          ref="customTagFormRef"
          :model="customTagForm"
          :rules="customTagRules"
          label-width="100px"
        >
          <el-form-item label="标签名称" prop="label">
            <el-input v-model="customTagForm.label" placeholder="请输入标签名称" />
          </el-form-item>

          <el-form-item label="标签类型" prop="type">
            <el-select v-model="customTagForm.type" placeholder="选择标签类型" style="width: 100%">
              <el-option label="成功(绿色)" value="success" />
              <el-option label="警告(橙色)" value="warning" />
              <el-option label="危险(红色)" value="danger" />
              <el-option label="信息(蓝色)" value="primary" />
              <el-option label="默认(灰色)" value="info" />
            </el-select>
          </el-form-item>

          <el-form-item label="显示效果" prop="effect">
            <el-radio-group v-model="customTagForm.effect">
              <el-radio label="dark">深色</el-radio>
              <el-radio label="light">浅色</el-radio>
              <el-radio label="plain">朴素</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="标签描述" prop="description">
            <el-input
              v-model="customTagForm.description"
              type="textarea"
              placeholder="请输入标签描述"
              :rows="3"
            />
          </el-form-item>

          <el-form-item label="自动规则">
            <el-input
              v-model="customTagForm.autoRule"
              placeholder="如：age > 60 AND health.status == 'chronic'"
            />
            <div class="form-tip">
              可选：设置自动添加此标签的条件规则
            </div>
          </el-form-item>
        </el-form>

        <template #footer>
          <span class="dialog-footer">
            <el-button @click="customTagDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="saveCustomTag" :loading="saving">
              {{ customTagDialogMode === 'create' ? '创建' : '保存' }}
            </el-button>
          </span>
        </template>
      </el-dialog>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="saveChanges" :loading="saving">
          保存更改
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  UserFilled, MagicStick, Plus, Setting, Edit, Delete, Refresh
} from '@element-plus/icons-vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  resident: {
    type: Object,
    default: () => ({})
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'refresh'])

// 响应式数据
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const customTagFormRef = ref()
const customTagDialogVisible = ref(false)
const customTagDialogMode = ref('create') // 'create' | 'edit'
const activeCategory = ref('social_security')
const saving = ref(false)
const batchLoading = ref(false)

// 当前标签
const currentTags = ref([])
const suggestedTags = ref([])

// 批量操作
const batchOperation = reactive({
  type: '',
  targetTag: '',
  condition: ''
})

// 自定义标签表单
const customTagForm = reactive({
  label: '',
  type: 'info',
  effect: 'dark',
  description: '',
  autoRule: ''
})

const customTagRules = {
  label: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { min: 2, max: 10, message: '标签名称长度应为 2-10 个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择标签类型', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入标签描述', trigger: 'blur' }
  ]
}

// 预定义标签分类
const socialSecurityTags = ref([
  {
    id: 'low_income',
    label: '低保户',
    type: 'warning',
    effect: 'dark',
    description: '享受最低生活保障的家庭',
    category: 'social_security'
  },
  {
    id: 'poverty_relief',
    label: '建档立卡',
    type: 'warning',
    effect: 'dark',
    description: '建档立卡贫困户',
    category: 'social_security'
  },
  {
    id: 'five_guarantee',
    label: '五保户',
    type: 'danger',
    effect: 'dark',
    description: '农村五保供养对象',
    category: 'social_security'
  },
  {
    id: 'orphan',
    label: '孤儿',
    type: 'danger',
    effect: 'dark',
    description: '失去父母的未成年人',
    category: 'social_security'
  }
])

const healthTags = ref([
  {
    id: 'disabled',
    label: '残疾人',
    type: 'danger',
    effect: 'dark',
    description: '持有残疾证的村民',
    category: 'health'
  },
  {
    id: 'chronic_disease',
    label: '慢性病',
    type: 'warning',
    effect: 'dark',
    description: '患有慢性疾病需要长期治疗',
    category: 'health'
  },
  {
    id: 'mental_illness',
    label: '精神疾病',
    type: 'danger',
    effect: 'dark',
    description: '患有精神类疾病',
    category: 'health'
  },
  {
    id: 'bedridden',
    label: '卧床不起',
    type: 'danger',
    effect: 'dark',
    description: '长期卧床需要护理',
    category: 'health'
  }
])

const familyTags = ref([
  {
    id: 'elderly_alone',
    label: '独居老人',
    type: 'warning',
    effect: 'dark',
    description: '60岁以上独自居住的老人',
    category: 'family'
  },
  {
    id: 'single_parent',
    label: '单亲家庭',
    type: 'info',
    effect: 'dark',
    description: '单亲带孩子的家庭',
    category: 'family'
  },
  {
    id: 'empty_nest',
    label: '空巢老人',
    type: 'warning',
    effect: 'dark',
    description: '子女不在身边的老年夫妇',
    category: 'family'
  },
  {
    id: 'left_behind_children',
    label: '留守儿童',
    type: 'danger',
    effect: 'dark',
    description: '父母外出打工的儿童',
    category: 'family'
  }
])

const occupationTags = ref([
  {
    id: 'veteran',
    label: '退伍军人',
    type: 'success',
    effect: 'dark',
    description: '退役军人',
    category: 'occupation'
  },
  {
    id: 'party_member',
    label: '党员',
    type: 'danger',
    effect: 'dark',
    description: '中国共产党党员',
    category: 'occupation'
  },
  {
    id: 'village_cadre',
    label: '村干部',
    type: 'primary',
    effect: 'dark',
    description: '村委会干部',
    category: 'occupation'
  },
  {
    id: 'migrant_worker',
    label: '外出务工',
    type: 'info',
    effect: 'dark',
    description: '外出打工人员',
    category: 'occupation'
  }
])

const customTags = ref([])

// 计算属性
const allAvailableTags = computed(() => {
  return [
    ...socialSecurityTags.value,
    ...healthTags.value,
    ...familyTags.value,
    ...occupationTags.value,
    ...customTags.value
  ]
})

// 方法
const isTagSelected = (tag) => {
  return currentTags.value.some(t => t.id === tag.id)
}

const toggleTag = (tag) => {
  const index = currentTags.value.findIndex(t => t.id === tag.id)
  if (index > -1) {
    currentTags.value.splice(index, 1)
    ElMessage.success(`已移除标签：${tag.label}`)
  } else {
    currentTags.value.push({ ...tag })
    ElMessage.success(`已添加标签：${tag.label}`)
  }
}

const removeTag = (tag) => {
  const index = currentTags.value.findIndex(t => t.id === tag.id)
  if (index > -1) {
    currentTags.value.splice(index, 1)
    ElMessage.success(`已移除标签：${tag.label}`)
  }
}

const acceptSuggestion = (suggestion) => {
  const tag = allAvailableTags.value.find(t => t.id === suggestion.id)
  if (tag && !isTagSelected(tag)) {
    currentTags.value.push({ ...tag })
    ElMessage.success(`已接受建议：${tag.label}`)
  }

  // 从建议列表中移除
  const index = suggestedTags.value.findIndex(s => s.id === suggestion.id)
  if (index > -1) {
    suggestedTags.value.splice(index, 1)
  }
}

const rejectSuggestion = (suggestion) => {
  const index = suggestedTags.value.findIndex(s => s.id === suggestion.id)
  if (index > -1) {
    suggestedTags.value.splice(index, 1)
  }
  ElMessage.info('已忽略该建议')
}

const createCustomTag = () => {
  customTagDialogMode.value = 'create'
  Object.assign(customTagForm, {
    label: '',
    type: 'info',
    effect: 'dark',
    description: '',
    autoRule: ''
  })
  customTagDialogVisible.value = true
}

const editCustomTag = (tag) => {
  customTagDialogMode.value = 'edit'
  Object.assign(customTagForm, {
    id: tag.id,
    label: tag.label,
    type: tag.type,
    effect: tag.effect,
    description: tag.description,
    autoRule: tag.autoRule || ''
  })
  customTagDialogVisible.value = true
}

const deleteCustomTag = async (tag) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除自定义标签 "${tag.label}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const index = customTags.value.findIndex(t => t.id === tag.id)
    if (index > -1) {
      customTags.value.splice(index, 1)
    }

    // 如果当前村民有这个标签，也要移除
    const currentIndex = currentTags.value.findIndex(t => t.id === tag.id)
    if (currentIndex > -1) {
      currentTags.value.splice(currentIndex, 1)
    }

    ElMessage.success('自定义标签删除成功')
  } catch {
    // 用户取消操作
  }
}

const saveCustomTag = async () => {
  try {
    await customTagFormRef.value.validate()

    saving.value = true

    const tagData = {
      ...customTagForm,
      id: customTagForm.id || Date.now().toString(),
      category: 'custom'
    }

    if (customTagDialogMode.value === 'create') {
      customTags.value.push(tagData)
      ElMessage.success('自定义标签创建成功')
    } else {
      const index = customTags.value.findIndex(t => t.id === tagData.id)
      if (index > -1) {
        customTags.value.splice(index, 1, tagData)
      }
      ElMessage.success('自定义标签更新成功')
    }

    customTagDialogVisible.value = false
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const executeBatchOperation = async () => {
  if (!batchOperation.type || !batchOperation.targetTag) {
    ElMessage.warning('请选择操作类型和目标标签')
    return
  }

  try {
    batchLoading.value = true

    // 模拟批量操作
    await new Promise(resolve => setTimeout(resolve, 2000))

    ElMessage.success(`批量${batchOperation.type === 'add' ? '添加' : '移除'}标签操作完成`)
  } catch (error) {
    ElMessage.error('批量操作失败')
  } finally {
    batchLoading.value = false
  }
}

const refreshResidentInfo = () => {
  loadResidentTags()
  ElMessage.success('村民信息已刷新')
}

const manageTags = () => {
  ElMessage.info('标签管理功能开发中...')
}

const loadResidentTags = () => {
  // 模拟加载当前村民的标签
  currentTags.value = [
    {
      id: 'elderly_alone',
      label: '独居老人',
      type: 'warning',
      effect: 'dark'
    },
    {
      id: 'chronic_disease',
      label: '慢性病',
      type: 'warning',
      effect: 'dark'
    }
  ]

  // 模拟智能建议
  generateSuggestions()
}

const generateSuggestions = () => {
  // 基于村民信息生成智能建议
  const suggestions = []

  if (props.resident?.age >= 60) {
    suggestions.push({
      id: 'elderly_care',
      label: '老年关爱',
      type: 'info',
      reason: '年龄超过60岁，建议加入老年关爱对象',
      confidence: 0.9
    })
  }

  if (props.resident?.gender === 'female' && props.resident?.age >= 65) {
    suggestions.push({
      id: 'elderly_female',
      label: '高龄女性',
      type: 'warning',
      reason: '65岁以上女性，需要特别关注',
      confidence: 0.8
    })
  }

  suggestedTags.value = suggestions
}

const saveChanges = async () => {
  try {
    saving.value = true

    // 模拟保存标签更改
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success('标签更改已保存')
    emit('refresh')
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  dialogVisible.value = false
}

// 监听器
watch(
  () => props.resident,
  (newResident) => {
    if (newResident && Object.keys(newResident).length > 0) {
      loadResidentTags()
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (props.resident && Object.keys(props.resident).length > 0) {
    loadResidentTags()
  }
})
</script>

<style lang="scss" scoped>
.resident-category-manager {
  .resident-info {
    .info-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;

      .basic-info {
        h3 {
          margin: 0 0 8px 0;
          color: #303133;
        }

        p {
          margin: 0;
          color: #606266;
          display: flex;
          align-items: center;
          gap: 12px;

          .info-item {
            font-size: 14px;
          }
        }
      }
    }

    .current-tags {
      margin-bottom: 20px;

      h4 {
        margin: 0 0 12px 0;
        color: #303133;
        font-size: 16px;
      }

      .tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        .category-tag {
          margin: 0;
        }
      }
    }

    .suggested-tags {
      h4 {
        margin: 0 0 12px 0;
        color: #409eff;
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .suggestions-list {
        .suggestion-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border: 1px solid #e4e7ed;
          border-radius: 6px;
          margin-bottom: 8px;

          .suggestion-info {
            display: flex;
            align-items: center;
            gap: 12px;

            .suggestion-reason {
              font-size: 14px;
              color: #606266;
            }

            .suggestion-confidence {
              font-size: 12px;
              color: #909399;
              background: #f5f7fa;
              padding: 2px 6px;
              border-radius: 4px;
            }
          }

          .suggestion-actions {
            display: flex;
            gap: 8px;
          }
        }
      }
    }
  }

  .category-tabs {
    .tag-group {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;

      .tag-item {
        padding: 12px;
        border: 2px solid #e4e7ed;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          border-color: #409eff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
        }

        &.is-selected {
          border-color: #409eff;
          background: #f0f9ff;
        }

        .selectable-tag {
          margin-bottom: 8px;
        }

        .tag-description {
          font-size: 12px;
          color: #909399;
          line-height: 1.4;
        }

        &.custom-tag-item {
          .tag-content {
            margin-bottom: 8px;
          }

          .tag-actions {
            display: flex;
            gap: 8px;
            justify-content: center;
          }
        }
      }
    }

    .empty-custom-tags {
      text-align: center;
      padding: 40px;
    }
  }

  .batch-operations {
    margin-top: 20px;

    .batch-content {
      .operation-info {
        margin-bottom: 16px;
        color: #606266;
      }

      .operation-controls {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        align-items: center;
      }
    }
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

// 响应式设计
@media (max-width: 768px) {
  .resident-category-manager {
    .category-tabs {
      .tag-group {
        grid-template-columns: 1fr;
      }
    }

    .batch-operations {
      .batch-content {
        .operation-controls {
          flex-direction: column;
          align-items: stretch;

          .el-select,
          .el-input,
          .el-button {
            width: 100%;
          }
        }
      }
    }
  }
}
</style>