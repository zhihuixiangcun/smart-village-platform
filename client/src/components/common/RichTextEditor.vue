<template>
  <div class="rich-text-editor">
    <!-- 工具栏 -->
    <div class="editor-toolbar" v-if="showToolbar">
      <div class="toolbar-group">
        <!-- 基础格式 -->
        <el-button-group size="small">
          <el-tooltip content="加粗" placement="top">
            <el-button @click="execCommand('bold')" :class="{ active: isActive('bold') }">
              <el-icon><DArrowLeft /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="斜体" placement="top">
            <el-button @click="execCommand('italic')" :class="{ active: isActive('italic') }">
              <el-icon><DArrowRight /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="下划线" placement="top">
            <el-button @click="execCommand('underline')" :class="{ active: isActive('underline') }">
              U
            </el-button>
          </el-tooltip>
          <el-tooltip content="删除线" placement="top">
            <el-button
              @click="execCommand('strikeThrough')"
              :class="{ active: isActive('strikeThrough') }"
            >
              S
            </el-button>
          </el-tooltip>
        </el-button-group>

        <!-- 标题和字体 -->
        <el-select
          v-model="currentFontSize"
          @change="changeFontSize"
          size="small"
          style="width: 80px"
        >
          <el-option
            v-for="size in fontSizes"
            :key="size.value"
            :label="size.label"
            :value="size.value"
          />
        </el-select>

        <el-select
          v-model="currentHeading"
          @change="changeHeading"
          size="small"
          style="width: 100px"
        >
          <el-option
            v-for="heading in headings"
            :key="heading.value"
            :label="heading.label"
            :value="heading.value"
          />
        </el-select>

        <!-- 颜色 -->
        <el-color-picker v-model="textColor" @change="changeTextColor" size="small" />
        <el-color-picker v-model="backgroundColor" @change="changeBackgroundColor" size="small" />

        <!-- 对齐 -->
        <el-button-group size="small">
          <el-tooltip content="左对齐" placement="top">
            <el-button
              @click="execCommand('justifyLeft')"
              :class="{ active: isActive('justifyLeft') }"
            >
              <el-icon><AlignLeft /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="居中" placement="top">
            <el-button
              @click="execCommand('justifyCenter')"
              :class="{ active: isActive('justifyCenter') }"
            >
              <el-icon><AlignCenter /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="右对齐" placement="top">
            <el-button
              @click="execCommand('justifyRight')"
              :class="{ active: isActive('justifyRight') }"
            >
              <el-icon><AlignRight /></el-icon>
            </el-button>
          </el-tooltip>
        </el-button-group>

        <!-- 列表 -->
        <el-button-group size="small">
          <el-tooltip content="无序列表" placement="top">
            <el-button
              @click="execCommand('insertUnorderedList')"
              :class="{ active: isActive('insertUnorderedList') }"
            >
              <el-icon><List /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="有序列表" placement="top">
            <el-button
              @click="execCommand('insertOrderedList')"
              :class="{ active: isActive('insertOrderedList') }"
            >
              <el-icon><Tickets /></el-icon>
            </el-button>
          </el-tooltip>
        </el-button-group>

        <!-- 插入功能 -->
        <el-button-group size="small">
          <el-tooltip content="插入链接" placement="top">
            <el-button @click="insertLink">
              <el-icon><Link /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="插入图片" placement="top">
            <el-button @click="triggerImageUpload">
              <el-icon><Picture /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="插入表格" placement="top">
            <el-button @click="insertTable">
              <el-icon><Grid /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="插入分割线" placement="top">
            <el-button @click="insertHorizontalRule">
              <el-icon><Minus /></el-icon>
            </el-button>
          </el-tooltip>
        </el-button-group>

        <!-- 语音输入 -->
        <speech-input
          :target-ref="editorRef"
          button-text="🎤"
          size="small"
          @confirmed="handleSpeechInput"
        />

        <!-- 其他功能 -->
        <el-button-group size="small">
          <el-tooltip content="清除格式" placement="top">
            <el-button @click="clearFormatting">
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="撤销" placement="top">
            <el-button @click="execCommand('undo')" :disabled="!canUndo">
              <el-icon><RefreshLeft /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="重做" placement="top">
            <el-button @click="execCommand('redo')" :disabled="!canRedo">
              <el-icon><RefreshRight /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="全屏编辑" placement="top">
            <el-button @click="toggleFullscreen">
              <el-icon><FullScreen /></el-icon>
            </el-button>
          </el-tooltip>
        </el-button-group>
      </div>

      <!-- 字数统计 -->
      <div class="word-count">
        <span>字数: {{ wordCount }}</span>
        <span v-if="maxLength">/ {{ maxLength }}</span>
      </div>
    </div>

    <!-- 编辑器容器 -->
    <div
      ref="editorContainer"
      class="editor-container"
      :class="{
        fullscreen: isFullscreen,
        focus: isFocused,
        disabled: disabled,
      }"
      :style="{ height: editorHeight }"
    >
      <div
        ref="editorRef"
        class="editor-content"
        contenteditable
        :placeholder="placeholder"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
        @paste="handlePaste"
        @drop="handleDrop"
        @dragover="handleDragOver"
        v-html="currentContent"
      ></div>

      <!-- 图片上传覆盖层 -->
      <div v-if="isDragging" class="drag-overlay">
        <div class="drag-content">
          <el-icon size="48"><Upload /></el-icon>
          <p>拖拽图片到此处上传</p>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      style="display: none"
      @change="handleImageUpload"
    />

    <!-- 链接插入对话框 -->
    <el-dialog v-model="linkDialogVisible" title="插入链接" width="500px">
      <el-form :model="linkForm" label-width="80px">
        <el-form-item label="链接文本">
          <el-input v-model="linkForm.text" placeholder="请输入链接显示文本" />
        </el-form-item>
        <el-form-item label="链接地址">
          <el-input v-model="linkForm.url" placeholder="请输入链接地址，如: https://example.com" />
        </el-form-item>
        <el-form-item label="打开方式">
          <el-radio-group v-model="linkForm.target">
            <el-radio label="_self">当前窗口</el-radio>
            <el-radio label="_blank">新窗口</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="linkDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmInsertLink">确定</el-button>
      </template>
    </el-dialog>

    <!-- 表格插入对话框 -->
    <el-dialog v-model="tableDialogVisible" title="插入表格" width="400px">
      <el-form :model="tableForm" label-width="80px">
        <el-form-item label="行数">
          <el-input-number v-model="tableForm.rows" :min="1" :max="20" />
        </el-form-item>
        <el-form-item label="列数">
          <el-input-number v-model="tableForm.cols" :min="1" :max="10" />
        </el-form-item>
        <el-form-item label="表格样式">
          <el-select v-model="tableForm.style">
            <el-option label="简单表格" value="simple" />
            <el-option label="带边框表格" value="bordered" />
            <el-option label="斑马纹表格" value="striped" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="tableDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmInsertTable">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  DArrowLeft,
  DArrowRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Tickets,
  Link,
  Picture,
  Grid,
  Minus,
  Delete,
  RefreshLeft,
  RefreshRight,
  FullScreen,
  Upload,
} from '@element-plus/icons-vue';
import SpeechInput from '@/components/common/SpeechInput.vue';

// Props
const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '请输入内容...',
  },
  height: {
    type: [String, Number],
    default: '300px',
  },
  maxLength: {
    type: Number,
    default: null,
  },
  showToolbar: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  uploadUrl: {
    type: String,
    default: '/api/announcements/upload',
  },
});

// Emits
const emit = defineEmits(['update:modelValue', 'change', 'focus', 'blur', 'imageUpload']);

// 响应式数据
const editorRef = ref();
const editorContainer = ref();
const fileInput = ref();

const currentContent = ref(props.modelValue);
const isFocused = ref(false);
const isFullscreen = ref(false);
const isDragging = ref(false);
const canUndo = ref(false);
const canRedo = ref(false);

// 工具栏状态
const currentFontSize = ref('14px');
const currentHeading = ref('p');
const textColor = ref('#000000');
const backgroundColor = ref('#ffffff');

// 对话框状态
const linkDialogVisible = ref(false);
const tableDialogVisible = ref(false);

const linkForm = reactive({
  text: '',
  url: '',
  target: '_self',
});

const tableForm = reactive({
  rows: 3,
  cols: 3,
  style: 'bordered',
});

// 配置选项
const fontSizes = [
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '28px', value: '28px' },
  { label: '32px', value: '32px' },
];

const headings = [
  { label: '正文', value: 'p' },
  { label: '标题1', value: 'h1' },
  { label: '标题2', value: 'h2' },
  { label: '标题3', value: 'h3' },
  { label: '标题4', value: 'h4' },
  { label: '标题5', value: 'h5' },
  { label: '标题6', value: 'h6' },
];

// 计算属性
const wordCount = computed(() => {
  const text = editorRef.value?.textContent || '';
  return text.length;
});

const editorHeight = computed(() => {
  if (isFullscreen.value) return '100vh';
  return typeof props.height === 'number' ? `${props.height}px` : props.height;
});

// 方法
const execCommand = (command, value = null) => {
  if (props.disabled) return;

  document.execCommand(command, false, value);
  updateContent();
  updateToolbarState();
};

const isActive = command => {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
};

const updateContent = () => {
  const content = editorRef.value?.innerHTML || '';
  currentContent.value = content;
  emit('update:modelValue', content);
  emit('change', content);
};

const updateToolbarState = () => {
  canUndo.value = document.queryCommandEnabled('undo');
  canRedo.value = document.queryCommandEnabled('redo');

  // 更新字体大小
  try {
    const fontSize = document.queryCommandValue('fontSize');
    if (fontSize) {
      currentFontSize.value = fontSize;
    }
  } catch (e) {
    // 忽略错误
  }
};

const changeFontSize = size => {
  execCommand('fontSize', size);
};

const changeHeading = tag => {
  execCommand('formatBlock', tag);
};

const changeTextColor = color => {
  execCommand('foreColor', color);
};

const changeBackgroundColor = color => {
  execCommand('backColor', color);
};

const clearFormatting = () => {
  execCommand('removeFormat');
};

const insertLink = () => {
  const selection = window.getSelection();
  if (selection.toString()) {
    linkForm.text = selection.toString();
  } else {
    linkForm.text = '';
  }
  linkForm.url = '';
  linkForm.target = '_self';
  linkDialogVisible.value = true;
};

const confirmInsertLink = () => {
  if (!linkForm.url) {
    ElMessage.warning('请输入链接地址');
    return;
  }

  const linkHtml = `<a href="${linkForm.url}" target="${linkForm.target}">${linkForm.text || linkForm.url}</a>`;
  execCommand('insertHTML', linkHtml);
  linkDialogVisible.value = false;
};

const triggerImageUpload = () => {
  fileInput.value.click();
};

const handleImageUpload = async event => {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  for (const file of files) {
    await uploadImage(file);
  }

  // 清空文件输入
  event.target.value = '';
};

const uploadImage = async file => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(props.uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      const imageHtml = `<img src="${result.data.url}" alt="${file.name}" style="max-width: 100%; height: auto;" />`;
      execCommand('insertHTML', imageHtml);
      emit('imageUpload', result.data);
    } else {
      ElMessage.error('图片上传失败');
    }
  } catch (error) {
    ElMessage.error('图片上传失败');
    console.error('图片上传错误:', error);
  }
};

const insertTable = () => {
  tableForm.rows = 3;
  tableForm.cols = 3;
  tableForm.style = 'bordered';
  tableDialogVisible.value = true;
};

const confirmInsertTable = () => {
  const { rows, cols, style } = tableForm;

  let tableClass = 'editor-table';
  if (style === 'bordered') tableClass += ' table-bordered';
  if (style === 'striped') tableClass += ' table-striped';

  let tableHtml = `<table class="${tableClass}">`;

  // 生成表头
  tableHtml += '<thead><tr>';
  for (let j = 0; j < cols; j++) {
    tableHtml += `<th>列${j + 1}</th>`;
  }
  tableHtml += '</tr></thead>';

  // 生成表体
  tableHtml += '<tbody>';
  for (let i = 0; i < rows; i++) {
    tableHtml += '<tr>';
    for (let j = 0; j < cols; j++) {
      tableHtml += '<td>&nbsp;</td>';
    }
    tableHtml += '</tr>';
  }
  tableHtml += '</tbody></table><p><br></p>';

  execCommand('insertHTML', tableHtml);
  tableDialogVisible.value = false;
};

const insertHorizontalRule = () => {
  execCommand('insertHorizontalRule');
};

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;

  if (isFullscreen.value) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }

  nextTick(() => {
    editorRef.value.focus();
  });
};

const handleInput = () => {
  updateContent();
};

const handleFocus = () => {
  isFocused.value = true;
  emit('focus');
};

const handleBlur = () => {
  isFocused.value = false;
  emit('blur');
};

const handleKeydown = event => {
  // 检查字数限制
  if (props.maxLength && wordCount.value >= props.maxLength) {
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      ElMessage.warning(`内容长度不能超过${props.maxLength}字符`);
      return;
    }
  }

  // 快捷键处理
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'b':
        event.preventDefault();
        execCommand('bold');
        break;
      case 'i':
        event.preventDefault();
        execCommand('italic');
        break;
      case 'u':
        event.preventDefault();
        execCommand('underline');
        break;
      case 'z':
        event.preventDefault();
        execCommand('undo');
        break;
      case 'y':
        event.preventDefault();
        execCommand('redo');
        break;
    }
  }

  updateToolbarState();
};

const handlePaste = event => {
  event.preventDefault();

  const clipboardData = event.clipboardData || window.clipboardData;
  const pastedData = clipboardData.getData('text/html') || clipboardData.getData('text/plain');

  // 清理粘贴的HTML内容
  const cleanHtml = cleanPastedHtml(pastedData);
  execCommand('insertHTML', cleanHtml);
};

const cleanPastedHtml = html => {
  // 创建临时元素来清理HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // 移除脚本和样式
  const scripts = temp.querySelectorAll('script, style');
  scripts.forEach(el => el.remove());

  // 移除危险属性
  const elements = temp.querySelectorAll('*');
  elements.forEach(el => {
    const allowedAttrs = ['href', 'src', 'alt', 'title', 'width', 'height'];
    Array.from(el.attributes).forEach(attr => {
      if (!allowedAttrs.includes(attr.name)) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return temp.innerHTML;
};

const handleDrop = event => {
  event.preventDefault();
  isDragging.value = false;

  const files = Array.from(event.dataTransfer.files);
  const imageFiles = files.filter(file => file.type.startsWith('image/'));

  if (imageFiles.length > 0) {
    imageFiles.forEach(file => uploadImage(file));
  }
};

const handleDragOver = event => {
  event.preventDefault();
  isDragging.value = true;
};

const handleSpeechInput = text => {
  execCommand('insertHTML', text);
  ElMessage.success('语音输入完成');
};

// 监听modelValue变化
watch(
  () => props.modelValue,
  newValue => {
    if (newValue !== currentContent.value) {
      currentContent.value = newValue;
      if (editorRef.value) {
        editorRef.value.innerHTML = newValue;
      }
    }
  }
);

// 生命周期
onMounted(() => {
  // 初始化编辑器内容
  if (editorRef.value) {
    editorRef.value.innerHTML = props.modelValue;
  }

  // 监听拖拽离开
  document.addEventListener('dragleave', event => {
    if (!editorContainer.value.contains(event.relatedTarget)) {
      isDragging.value = false;
    }
  });
});

onUnmounted(() => {
  if (isFullscreen.value) {
    document.body.style.overflow = '';
  }
});
</script>

<style lang="scss" scoped>
.rich-text-editor {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-color);

  .editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color-light);
    background: var(--fill-color-light);
    flex-wrap: wrap;
    gap: 8px;

    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;

      .el-button-group {
        .el-button {
          &.active {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
          }
        }
      }
    }

    .word-count {
      font-size: 12px;
      color: var(--text-color-secondary);
      white-space: nowrap;
    }
  }

  .editor-container {
    position: relative;
    transition: all 0.3s ease;

    &.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2000;
      background: var(--bg-color);
    }

    &.focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
    }

    &.disabled {
      background: var(--fill-color-lighter);
      cursor: not-allowed;

      .editor-content {
        pointer-events: none;
      }
    }

    .editor-content {
      min-height: 200px;
      padding: 16px;
      outline: none;
      line-height: 1.6;
      font-size: 14px;
      color: var(--text-color-primary);
      overflow-y: auto;

      &[contenteditable]:empty::before {
        content: attr(placeholder);
        color: var(--text-color-placeholder);
        pointer-events: none;
      }

      // 编辑器内容样式
      :deep(h1, h2, h3, h4, h5, h6) {
        margin: 16px 0 12px 0;
        font-weight: 600;
      }

      :deep(h1) {
        font-size: 28px;
      }
      :deep(h2) {
        font-size: 24px;
      }
      :deep(h3) {
        font-size: 20px;
      }
      :deep(h4) {
        font-size: 18px;
      }
      :deep(h5) {
        font-size: 16px;
      }
      :deep(h6) {
        font-size: 14px;
      }

      :deep(p) {
        margin: 8px 0;
      }

      :deep(ul, ol) {
        margin: 8px 0;
        padding-left: 24px;
      }

      :deep(li) {
        margin: 4px 0;
      }

      :deep(blockquote) {
        margin: 16px 0;
        padding: 12px 16px;
        border-left: 4px solid var(--primary-color);
        background: var(--fill-color-light);
        font-style: italic;
      }

      :deep(a) {
        color: var(--primary-color);
        text-decoration: underline;

        &:hover {
          opacity: 0.8;
        }
      }

      :deep(img) {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        margin: 8px 0;
      }

      :deep(.editor-table) {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;

        &.table-bordered {
          border: 1px solid var(--border-color);

          th,
          td {
            border: 1px solid var(--border-color);
            padding: 8px 12px;
          }
        }

        &.table-striped {
          tr:nth-child(even) {
            background: var(--fill-color-lighter);
          }
        }

        th {
          background: var(--fill-color);
          font-weight: 600;
          text-align: left;
        }

        td {
          min-width: 50px;
          min-height: 32px;
        }
      }

      :deep(hr) {
        margin: 20px 0;
        border: none;
        border-top: 2px solid var(--border-color);
      }
    }

    .drag-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(64, 158, 255, 0.1);
      border: 2px dashed var(--primary-color);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;

      .drag-content {
        text-align: center;
        color: var(--primary-color);

        p {
          margin-top: 12px;
          font-size: 16px;
          font-weight: 500;
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .rich-text-editor {
    .editor-toolbar {
      padding: 8px 12px;

      .toolbar-group {
        gap: 4px;

        .el-select {
          width: 60px !important;
        }
      }

      .word-count {
        display: none;
      }
    }

    .editor-container {
      .editor-content {
        padding: 12px;
        font-size: 16px; // 移动端更大的字体
      }
    }
  }
}
</style>
