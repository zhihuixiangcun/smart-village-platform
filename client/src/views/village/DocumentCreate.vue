<template>
  <div class="document-create">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="新建资料收集"
      left-arrow
      @click-left="$router.go(-1)"
    />

    <!-- 表单内容 -->
    <div class="form-content">
      <van-form @submit="onSubmit">
        <van-cell-group inset>
          <van-field
            v-model="form.title"
            name="title"
            label="资料标题"
            placeholder="请输入资料标题"
            :rules="[{ required: true, message: '请输入资料标题' }]"
          />
          <van-field
            v-model="form.description"
            name="description"
            label="描述信息"
            type="textarea"
            placeholder="请输入详细描述"
            rows="3"
            autosize
          />
          <van-field
            name="category"
            label="资料类别"
            readonly
            clickable
            :value="getCategoryText(form.category)"
            @click="showCategoryPicker = true"
          />
          <van-field
            name="deadline"
            label="截止日期"
            readonly
            clickable
            :value="form.deadline ? formatDate(form.deadline) : '请选择截止日期'"
            @click="showDatePicker = true"
          />
          <van-field
            name="priority"
            label="优先级"
            readonly
            clickable
            :value="getPriorityText(form.priority)"
            @click="showPriorityPicker = true"
          />
        </van-cell-group>

        <!-- 文件上传 -->
        <van-cell-group inset title="文件上传">
          <van-uploader
            v-model="fileList"
            :after-read="afterRead"
            :before-delete="beforeDelete"
            multiple
            :max-count="10"
            preview-size="80px"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            :preview-options="{ closeable: true }"
          />
        </van-cell-group>

        <!-- 数据字段 -->
        <van-cell-group inset title="数据字段">
          <van-cell
            v-for="(field, index) in form.dataFields"
            :key="index"
            :title="`字段 ${index + 1}`"
            :value="field.name || `字段${index + 1}`"
            is-link
            @click="editDataField(index)"
          />
          <van-button
            type="default"
            size="small"
            icon="plus"
            @click="addDataField"
          >
            添加字段
          </van-button>
        </van-cell-group>

        <!-- 标签 -->
        <van-cell-group inset title="标签">
          <van-field
            v-model="tagInput"
            placeholder="输入标签后按回车添加"
            @keyup.enter="addTag"
          />
          <div class="tags-container">
            <van-tag
              v-for="(tag, index) in form.tags"
              :key="index"
              closeable
              @close="removeTag(index)"
              type="primary"
              size="medium"
              style="margin: 4px"
            >
              {{ tag }}
            </van-tag>
          </div>
        </van-cell-group>

        <!-- 备注 -->
        <van-cell-group inset>
          <van-field
            v-model="form.notes"
            name="notes"
            label="备注"
            type="textarea"
            placeholder="请输入备注信息"
            rows="2"
            autosize
          />
        </van-cell-group>

        <!-- 提交按钮 -->
        <div class="submit-section">
          <van-button
            type="primary"
            size="large"
            block
            :loading="submitting"
            @click="onSubmit"
          >
            创建资料收集
          </van-button>
        </div>
      </van-form>
    </div>

    <!-- 类别选择器 -->
    <van-popup v-model:showCategoryPicker" position="bottom">
      <van-picker
        :columns="categoryColumns"
        title="选择类别"
        @confirm="onCategoryConfirm"
        @cancel="showCategoryPicker = false"
      />
    </van-popup>

    <!-- 日期选择器 -->
    <van-popup v-model:showDatePicker" position="bottom">
      <van-date-picker
        v-model="form.deadline"
        title="选择截止日期"
        @confirm="showDatePicker = false"
        @cancel="showDatePicker = false"
      />
    </van-popup>

    <!-- 优先级选择器 -->
    <van-popup v-model:showPriorityPicker" position="bottom">
      <van-picker
        :columns="priorityColumns"
        title="选择优先级"
        @confirm="onPriorityConfirm"
        @cancel="showPriorityPicker = false"
      />
    </van-popup>

    <!-- 数据字段编辑弹窗 -->
    <van-popup v-model:showDataFieldEditor" position="bottom" :style="{ height: '80%' }">
      <div class="data-field-editor">
        <div class="editor-header">
          <h3>编辑数据字段</h3>
          <van-icon name="cross" @click="showDataFieldEditor = false" />
        </div>
        <van-form>
          <van-field
            v-model="editingField.name"
            label="字段名称"
            placeholder="请输入字段名称"
          />
          <van-field
            v-model="editingField.type"
            label="字段类型"
            readonly
            clickable
            :value="getFieldTypeText(editingField.type)"
            @click="showFieldTypePicker = true"
          />
          <van-field
            v-model="editingField.description"
            label="描述"
            placeholder="请输入字段描述"
          />
        </van-form>
        <div class="editor-actions">
          <van-button @click="showDataFieldEditor = false">取消</van-button>
          <van-button type="primary" @click="saveDataField">保存</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 字段类型选择器 -->
    <van-popup v-model:showFieldTypePicker" position="bottom">
      <van-picker
        :columns="fieldTypeColumns"
        title="选择字段类型"
        @confirm="onFieldTypeConfirm"
        @cancel="showFieldTypePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import villageApi from '@/api/villageManagement'

const router = useRouter()

// 响应式数据
const submitting = ref(false)
const fileList = ref([])
const tagInput = ref('')
const showCategoryPicker = ref(false)
const showDatePicker = ref(false)
const showPriorityPicker = ref(false)
const showDataFieldEditor = ref(false)
const showFieldTypePicker = ref(false)

const editingFieldIndex = ref(-1)
const editingField = reactive({
  name: '',
  type: 'text',
  description: ''
})

const form = reactive({
  title: '',
  description: '',
  category: '',
  deadline: '',
  priority: 'medium',
  dataFields: [],
  tags: [],
  notes: '',
  collectionDate: new Date()
})

// 选择器选项
const categoryColumns = [
  { text: '村务', value: 'village_affairs' },
  { text: '村民信息', value: 'resident_info' },
  { text: '财务', value: 'financial' },
  { text: '项目', value: 'project' },
  { text: '会议', value: 'meeting' },
  { text: '政策', value: 'policy' },
  { text: '应急', value: 'emergency' },
  { text: '其他', value: 'other' }
]

const priorityColumns = [
  { text: '低', value: 'low' },
  { text: '中', value: 'medium' },
  { text: '高', value: 'high' },
  { text: '紧急', value: 'urgent' }
]

const fieldTypeColumns = [
  { text: '文本', value: 'text' },
  { text: '数字', value: 'number' },
  { text: '日期', value: 'date' },
  { text: '布尔', value: 'boolean' },
  { text: '单选', value: 'select' },
  { text: '多选', value: 'multiselect' }
]

// 方法
const getCategoryText = (value) => {
  const category = categoryColumns.find(item => item.value === value)
  return category ? category.text : '请选择'
}

const getPriorityText = (value) => {
  const priority = priorityColumns.find(item => item.value === value)
  return priority ? priority.text : '中'
}

const getCategoryValue = (text) => {
  const category = categoryColumns.find(item => item.text === text)
  return category ? category.value : ''
}

const getPriorityValue = (text) => {
  const priority = priorityColumns.find(item => item.text === text)
  return priority ? priority.value : 'medium'
}

const getFieldTypeText = (value) => {
  const type = fieldTypeColumns.find(item => item.value === value)
  return type ? type.text : '文本'
}

const getFieldValue = (type) => {
  switch (type) {
    case 'text': return ''
    case 'number': return 0
    case 'date': return new Date()
    case 'boolean': return false
    case 'select': return ''
    case 'multiselect': return []
    default: return ''
  }
}

const onCategoryConfirm = ({ selectedOptions }) => {
  form.category = getCategoryValue(selectedOptions[0].text)
  showCategoryPicker.value = false
}

const onPriorityConfirm = ({ selectedOptions }) => {
  form.priority = getPriorityValue(selectedOptions[0].text)
  showPriorityPicker.value = false
}

const onPrioritySelect = (value) => {
  form.priority = value
}

const onDateConfirm = () => {
  showDatePicker.value = false
}

const onFieldTypeConfirm = ({ selectedOptions }) => {
  editingField.type = selectedOptions[0].value
  showFieldTypePicker.value = false
}

const afterRead = (file) => {
  fileList.value.push({
    url: file.content,
    name: file.file.name,
    status: 'uploading',
    message: '上传中...'
  })

  // 这里可以实现实际的上传逻辑
  setTimeout(() => {
    const index = fileList.value.findIndex(item => item.name === file.file.name)
    if (index > -1) {
      fileList.value[index].status = 'done'
      fileList.value[index].message = '上传成功'
    }
  }, 1000)
}

const beforeDelete = (file) => {
  return new Promise((resolve) => {
    showConfirmDialog({
      title: '确认删除',
      message: `确定要删除文件 ${file.name} 吗？`,
    })
      .then(() => {
        resolve(true)
      })
      .catch(() => {
        resolve(false)
      })
  })
}

const addDataField = () => {
  Object.assign(editingField, {
    name: '',
    type: 'text',
    description: '',
    value: getFieldValue('text')
  })
  editingFieldIndex.value = form.dataFields.length
  form.dataFields.push({ ...editingField })
  showDataFieldEditor.value = true
}

const editDataField = (index) => {
  Object.assign(editingField, form.dataFields[index])
  editingFieldIndex.value = index
  showDataFieldEditor.value = true
}

const saveDataField = () => {
  if (editingFieldIndex.value >= 0) {
    form.dataFields[editingFieldIndex.value] = { ...editingField }
  }
  showDataFieldEditor.value = false
}

const addTag = () => {
  const tag = tagInput.value.trim()
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag)
    tagInput.value = ''
  }
}

const removeTag = (index) => {
  form.tags.splice(index, 1)
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}

const onSubmit = async () => {
  try {
    submitting.value = true

    // 验证必填字段
    if (!form.title.trim()) {
      showToast('请输入资料标题')
      return
    }

    // 准备提交数据
    const submitData = {
      ...form,
      files: fileList.value.map(file => ({
        filename: file.name,
        originalName: file.name,
        path: file.url,
        status: file.status
      }))
    }

    // 调用API创建资料收集任务
    const response = await villageApi.createDocumentCollection(submitData)

    showToast('创建成功')
    router.push(`/village/documents/${response.data.data._id}`)
  } catch (error) {
    console.error('创建失败:', error)
    showToast(error.response?.data?.message || '创建失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.document-create {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.form-content {
  padding-bottom: 80px;
}

.submit-section {
  padding: 16px;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #eee;
}

.data-field-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.editor-header h3 {
  margin: 0;
  font-size: 16px;
}

.editor-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #eee;
}

.tags-container {
  padding: 8px 0;
  min-height: 32px;
}
</style>