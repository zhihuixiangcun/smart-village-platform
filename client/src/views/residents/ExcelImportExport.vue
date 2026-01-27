<template>
  <div class="excel-import-export">
    <!-- 导入功能 -->
    <div class="import-section">
      <el-card title="Excel数据导入" shadow="never">
        <template #header>
          <div class="card-header">
            <span>Excel数据导入</span>
            <el-button @click="downloadTemplate" icon="Download" size="small"> 下载模板 </el-button>
          </div>
        </template>

        <div class="import-steps">
          <el-steps :active="importStep" direction="vertical" size="small">
            <el-step title="选择文件" description="支持.xlsx、.xls格式">
              <template #icon>
                <el-icon><Upload /></el-icon>
              </template>
            </el-step>
            <el-step title="数据预览" description="检查数据格式和内容">
              <template #icon>
                <el-icon><View /></el-icon>
              </template>
            </el-step>
            <el-step title="字段映射" description="配置字段对应关系">
              <template #icon>
                <el-icon><Connection /></el-icon>
              </template>
            </el-step>
            <el-step title="数据验证" description="检查数据有效性">
              <template #icon>
                <el-icon><Check /></el-icon>
              </template>
            </el-step>
            <el-step title="导入完成" description="查看导入结果">
              <template #icon>
                <el-icon><SuccessFilled /></el-icon>
              </template>
            </el-step>
          </el-steps>
        </div>

        <div class="import-content">
          <!-- Step 1: 文件选择 -->
          <div v-if="importStep === 0" class="step-content">
            <el-upload
              ref="uploadRef"
              class="upload-area"
              drag
              :auto-upload="false"
              :limit="1"
              :accept="'.xlsx,.xls'"
              :on-change="handleFileChange"
              :on-exceed="handleFileExceed"
            >
              <el-icon class="upload-icon"><UploadFilled /></el-icon>
              <div class="upload-text">
                <p>将Excel文件拖到此处，或<em>点击上传</em></p>
                <p class="upload-tip">仅支持 .xlsx 和 .xls 格式，文件大小不超过10MB</p>
              </div>
            </el-upload>

            <div v-if="selectedFile" class="file-info">
              <div class="file-item">
                <el-icon><Document /></el-icon>
                <span class="file-name">{{ selectedFile.name }}</span>
                <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
                <el-button type="danger" text @click="removeFile">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>

            <div class="step-actions">
              <el-button
                type="primary"
                @click="parseExcelFile"
                :disabled="!selectedFile"
                :loading="parsing"
              >
                解析文件
              </el-button>
            </div>
          </div>

          <!-- Step 2: 数据预览 -->
          <div v-if="importStep === 1" class="step-content">
            <div class="preview-header">
              <h4>数据预览 (共 {{ previewData.length }} 行)</h4>
              <div class="preview-actions">
                <el-select v-model="selectedSheet" placeholder="选择工作表" @change="switchSheet">
                  <el-option
                    v-for="sheet in sheetNames"
                    :key="sheet"
                    :label="sheet"
                    :value="sheet"
                  />
                </el-select>
                <el-checkbox v-model="hasHeader">首行为标题</el-checkbox>
              </div>
            </div>

            <div class="preview-table">
              <el-table
                :data="previewData.slice(0, 10)"
                border
                stripe
                size="small"
                max-height="300"
              >
                <el-table-column
                  v-for="(column, index) in previewColumns"
                  :key="index"
                  :prop="`col_${index}`"
                  :label="hasHeader ? column : `列${index + 1}`"
                  show-overflow-tooltip
                />
              </el-table>
            </div>

            <div class="preview-info">
              <el-alert title="数据预览" type="info" :closable="false" show-icon>
                <template #default>
                  <p>显示前10行数据，共识别到 {{ previewColumns.length }} 列</p>
                  <p>请确认数据格式正确后进行下一步</p>
                </template>
              </el-alert>
            </div>

            <div class="step-actions">
              <el-button @click="prevStep">上一步</el-button>
              <el-button type="primary" @click="nextStep">下一步</el-button>
            </div>
          </div>

          <!-- Step 3: 字段映射 -->
          <div v-if="importStep === 2" class="step-content">
            <div class="mapping-header">
              <h4>字段映射配置</h4>
              <p>请将Excel列与系统字段进行映射</p>
            </div>

            <div class="mapping-table">
              <el-table :data="fieldMappings" border>
                <el-table-column label="Excel列" width="200">
                  <template #default="scope">
                    <div class="excel-column">
                      <span>{{ scope.row.excelColumn }}</span>
                      <el-tag size="small">{{ scope.row.exampleValue }}</el-tag>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="映射到系统字段" width="200">
                  <template #default="scope">
                    <el-select v-model="scope.row.systemField" placeholder="选择系统字段" clearable>
                      <el-option
                        v-for="field in systemFields"
                        :key="field.key"
                        :label="field.label"
                        :value="field.key"
                        :disabled="isFieldMapped(field.key, scope.$index)"
                      />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="必填" width="80">
                  <template #default="scope">
                    <el-tag
                      v-if="getFieldInfo(scope.row.systemField)?.required"
                      type="danger"
                      size="small"
                    >
                      必填
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="数据类型" width="100">
                  <template #default="scope">
                    <span>{{ getFieldInfo(scope.row.systemField)?.type || '-' }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="120">
                  <template #default="scope">
                    <el-button size="small" @click="autoMapField(scope.$index)" icon="MagicStick">
                      智能匹配
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div class="mapping-info">
              <el-alert
                :title="`已映射 ${mappedFieldsCount} 个字段，必填字段 ${requiredFieldsCount} 个`"
                :type="allRequiredFieldsMapped ? 'success' : 'warning'"
                :closable="false"
                show-icon
              >
                <template #default>
                  <div v-if="!allRequiredFieldsMapped">
                    <p>以下必填字段尚未映射：</p>
                    <el-tag
                      v-for="field in unmappedRequiredFields"
                      :key="field.key"
                      type="danger"
                      size="small"
                      style="margin-right: 8px; margin-bottom: 4px"
                    >
                      {{ field.label }}
                    </el-tag>
                  </div>
                </template>
              </el-alert>
            </div>

            <div class="step-actions">
              <el-button @click="prevStep">上一步</el-button>
              <el-button @click="autoMapAllFields" icon="MagicStick">智能映射全部</el-button>
              <el-button type="primary" @click="nextStep" :disabled="!allRequiredFieldsMapped">
                下一步
              </el-button>
            </div>
          </div>

          <!-- Step 4: 数据验证 -->
          <div v-if="importStep === 3" class="step-content">
            <div class="validation-header">
              <h4>数据验证结果</h4>
              <el-button @click="validateData" :loading="validating" icon="Refresh">
                重新验证
              </el-button>
            </div>

            <div class="validation-summary">
              <el-row :gutter="20">
                <el-col :span="6">
                  <el-statistic title="总行数" :value="validationResult.total" />
                </el-col>
                <el-col :span="6">
                  <el-statistic
                    title="有效数据"
                    :value="validationResult.valid"
                    :value-style="{ color: '#67c23a' }"
                  />
                </el-col>
                <el-col :span="6">
                  <el-statistic
                    title="错误数据"
                    :value="validationResult.invalid"
                    :value-style="{ color: '#f56c6c' }"
                  />
                </el-col>
                <el-col :span="6">
                  <el-statistic
                    title="警告数据"
                    :value="validationResult.warning"
                    :value-style="{ color: '#e6a23c' }"
                  />
                </el-col>
              </el-row>
            </div>

            <div v-if="validationResult.errors.length > 0" class="validation-errors">
              <h5>错误详情</h5>
              <el-table
                :data="validationResult.errors.slice(0, 20)"
                border
                size="small"
                max-height="200"
              >
                <el-table-column prop="row" label="行号" width="80" />
                <el-table-column prop="field" label="字段" width="120" />
                <el-table-column prop="value" label="值" width="150" />
                <el-table-column prop="error" label="错误信息" />
              </el-table>
              <div v-if="validationResult.errors.length > 20" class="error-more">
                还有 {{ validationResult.errors.length - 20 }} 个错误...
              </div>
            </div>

            <div class="import-options">
              <h5>导入选项</h5>
              <el-checkbox v-model="importOptions.skipErrors">跳过错误数据</el-checkbox>
              <el-checkbox v-model="importOptions.updateExisting">更新已存在的数据</el-checkbox>
              <el-checkbox v-model="importOptions.createBackup">导入前创建备份</el-checkbox>
            </div>

            <div class="step-actions">
              <el-button @click="prevStep">上一步</el-button>
              <el-button
                type="primary"
                @click="confirmImport"
                :loading="importing"
                :disabled="validationResult.valid === 0"
              >
                确认导入 ({{ validationResult.valid }} 条)
              </el-button>
            </div>
          </div>

          <!-- Step 5: 导入完成 -->
          <div v-if="importStep === 4" class="step-content">
            <div class="import-result">
              <el-result
                :icon="importResult.success ? 'success' : 'error'"
                :title="importResult.success ? '导入成功' : '导入失败'"
                :sub-title="importResult.message"
              >
                <template #extra>
                  <div class="result-details">
                    <el-descriptions :column="2" border>
                      <el-descriptions-item label="总数据量">
                        {{ importResult.total }}
                      </el-descriptions-item>
                      <el-descriptions-item label="成功导入">
                        {{ importResult.success_count }}
                      </el-descriptions-item>
                      <el-descriptions-item label="失败数量">
                        {{ importResult.failed_count }}
                      </el-descriptions-item>
                      <el-descriptions-item label="耗时">
                        {{ importResult.duration }}ms
                      </el-descriptions-item>
                    </el-descriptions>

                    <div v-if="importResult.failed_items?.length > 0" class="failed-items">
                      <h5>失败项目</h5>
                      <el-table
                        :data="importResult.failed_items.slice(0, 10)"
                        border
                        size="small"
                        max-height="200"
                      >
                        <el-table-column prop="row" label="行号" width="80" />
                        <el-table-column prop="data" label="数据" />
                        <el-table-column prop="reason" label="失败原因" />
                      </el-table>
                    </div>
                  </div>

                  <div class="result-actions">
                    <el-button
                      @click="exportFailedData"
                      v-if="importResult.failed_items?.length > 0"
                    >
                      导出失败数据
                    </el-button>
                    <el-button @click="resetImport">重新导入</el-button>
                    <el-button type="primary" @click="closeDialog">完成</el-button>
                  </div>
                </template>
              </el-result>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 导出功能 -->
    <div class="export-section">
      <el-card title="Excel数据导出" shadow="never">
        <template #header>
          <div class="card-header">
            <span>Excel数据导出</span>
            <el-button @click="quickExport" icon="Download" size="small"> 快速导出 </el-button>
          </div>
        </template>

        <el-form :model="exportOptions" label-width="120px">
          <el-form-item label="导出范围">
            <el-radio-group v-model="exportOptions.scope">
              <el-radio label="all">全部数据</el-radio>
              <el-radio label="filtered">筛选结果</el-radio>
              <el-radio label="selected">选中数据</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="导出字段">
            <el-checkbox-group v-model="exportOptions.fields">
              <div class="field-groups">
                <div v-for="group in fieldGroups" :key="group.name" class="field-group">
                  <h5>{{ group.label }}</h5>
                  <el-checkbox v-for="field in group.fields" :key="field.key" :label="field.key">
                    {{ field.label }}
                  </el-checkbox>
                </div>
              </div>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="文件格式">
            <el-radio-group v-model="exportOptions.format">
              <el-radio label="xlsx">Excel 2007+ (.xlsx)</el-radio>
              <el-radio label="xls">Excel 97-2003 (.xls)</el-radio>
              <el-radio label="csv">CSV格式 (.csv)</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="其他选项">
            <el-checkbox v-model="exportOptions.includeHeader">包含标题行</el-checkbox>
            <el-checkbox v-model="exportOptions.maskSensitive">敏感信息脱敏</el-checkbox>
            <el-checkbox v-model="exportOptions.includeMetadata">包含元数据</el-checkbox>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="exportData" :loading="exporting">
              导出数据
            </el-button>
            <el-button @click="previewExport">预览</el-button>
            <el-button @click="saveExportTemplate">保存为模板</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Upload,
  View,
  Connection,
  Check,
  SuccessFilled,
  UploadFilled,
  Document,
  Delete,
  MagicStick,
  Refresh,
  Download,
} from '@element-plus/icons-vue';
import ExcelJS from 'exceljs';

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  importTemplate: {
    type: Array,
    default: () => [],
  },
  systemFields: {
    type: Array,
    default: () => [],
  },
  exportData: {
    type: Array,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(['update:modelValue', 'import-success', 'export-success']);

// 响应式数据
const uploadRef = ref();
const selectedFile = ref(null);
const importStep = ref(0);
const parsing = ref(false);
const validating = ref(false);
const importing = ref(false);
const exporting = ref(false);

// 数据预览
const previewData = ref([]);
const previewColumns = ref([]);
const sheetNames = ref([]);
const selectedSheet = ref('');
const hasHeader = ref(true);

// 字段映射
const fieldMappings = ref([]);

// 数据验证
const validationResult = reactive({
  total: 0,
  valid: 0,
  invalid: 0,
  warning: 0,
  errors: [],
});

// 导入选项
const importOptions = reactive({
  skipErrors: true,
  updateExisting: false,
  createBackup: true,
});

// 导入结果
const importResult = reactive({
  success: false,
  message: '',
  total: 0,
  success_count: 0,
  failed_count: 0,
  duration: 0,
  failed_items: [],
});

// 导出选项
const exportOptions = reactive({
  scope: 'all',
  fields: [],
  format: 'xlsx',
  includeHeader: true,
  maskSensitive: true,
  includeMetadata: false,
});

// 系统字段定义
const systemFields = ref([
  { key: 'name', label: '姓名', type: 'string', required: true },
  { key: 'gender', label: '性别', type: 'enum', required: true },
  { key: 'idCard', label: '身份证号', type: 'string', required: true },
  { key: 'phone', label: '联系电话', type: 'string', required: true },
  { key: 'birthDate', label: '出生日期', type: 'date', required: false },
  { key: 'address', label: '居住地址', type: 'string', required: false },
  { key: 'education', label: '文化程度', type: 'enum', required: false },
  { key: 'occupation', label: '职业', type: 'string', required: false },
  { key: 'maritalStatus', label: '婚姻状况', type: 'enum', required: false },
  { key: 'healthStatus', label: '健康状态', type: 'enum', required: false },
]);

// 字段分组
const fieldGroups = ref([
  {
    name: 'basic',
    label: '基本信息',
    fields: [
      { key: 'name', label: '姓名' },
      { key: 'gender', label: '性别' },
      { key: 'idCard', label: '身份证号' },
      { key: 'birthDate', label: '出生日期' },
    ],
  },
  {
    name: 'contact',
    label: '联系信息',
    fields: [
      { key: 'phone', label: '联系电话' },
      { key: 'address', label: '居住地址' },
    ],
  },
  {
    name: 'social',
    label: '社会信息',
    fields: [
      { key: 'education', label: '文化程度' },
      { key: 'occupation', label: '职业' },
      { key: 'maritalStatus', label: '婚姻状况' },
      { key: 'healthStatus', label: '健康状态' },
    ],
  },
]);

// 计算属性
const mappedFieldsCount = computed(() => {
  return fieldMappings.value.filter(mapping => mapping.systemField).length;
});

const requiredFieldsCount = computed(() => {
  return systemFields.value.filter(field => field.required).length;
});

const allRequiredFieldsMapped = computed(() => {
  const mappedFields = fieldMappings.value
    .filter(mapping => mapping.systemField)
    .map(mapping => mapping.systemField);

  return systemFields.value
    .filter(field => field.required)
    .every(field => mappedFields.includes(field.key));
});

const unmappedRequiredFields = computed(() => {
  const mappedFields = fieldMappings.value
    .filter(mapping => mapping.systemField)
    .map(mapping => mapping.systemField);

  return systemFields.value.filter(field => field.required && !mappedFields.includes(field.key));
});

// 方法
const handleFileChange = file => {
  selectedFile.value = file.raw;
};

const handleFileExceed = () => {
  ElMessage.warning('只能选择一个文件');
};

const removeFile = () => {
  selectedFile.value = null;
  uploadRef.value?.clearFiles();
};

const formatFileSize = size => {
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
  return (size / (1024 * 1024)).toFixed(1) + ' MB';
};

const parseExcelFile = async () => {
  if (!selectedFile.value) return;

  parsing.value = true;

  try {
    const buffer = await selectedFile.value.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    sheetNames.value = workbook.worksheets.map(ws => ws.name);
    selectedSheet.value = sheetNames.value[0];

    await switchSheet();
    importStep.value = 1;
  } catch (error) {
    ElMessage.error('文件解析失败：' + error.message);
  } finally {
    parsing.value = false;
  }
};

const switchSheet = async () => {
  if (!selectedFile.value || !selectedSheet.value) return;

  try {
    const buffer = await selectedFile.value.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet(selectedSheet.value);

    if (!worksheet || worksheet.rowCount === 0) {
      ElMessage.warning('工作表为空');
      return;
    }

    const jsonData = [];
    worksheet.eachRow((row, rowNumber) => {
      const values = [];
      row.eachCell(cell => {
        values.push(cell.value);
      });
      jsonData.push(values);
    });

    if (hasHeader.value) {
      previewColumns.value = jsonData[0] || [];
      previewData.value = jsonData.slice(1).map(row => {
        const obj = {};
        row.forEach((cell, index) => {
          obj[`col_${index}`] = cell;
        });
        return obj;
      });
    } else {
      previewColumns.value = jsonData[0]?.map((_, index) => `列${index + 1}`) || [];
      previewData.value = jsonData.map(row => {
        const obj = {};
        row.forEach((cell, index) => {
          obj[`col_${index}`] = cell;
        });
        return obj;
      });
    }

    // 初始化字段映射
    fieldMappings.value = previewColumns.value.map((column, index) => ({
      excelColumn: column,
      systemField: '',
      exampleValue: previewData.value[0]?.[`col_${index}`] || '',
    }));
  } catch (error) {
    ElMessage.error('工作表解析失败：' + error.message);
  }
};

const autoMapField = index => {
  const mapping = fieldMappings.value[index];
  const excelColumn = mapping.excelColumn.toLowerCase();

  // 智能匹配逻辑
  const matchMap = {
    姓名: 'name',
    name: 'name',
    性别: 'gender',
    gender: 'gender',
    身份证: 'idCard',
    id: 'idCard',
    电话: 'phone',
    phone: 'phone',
    地址: 'address',
    address: 'address',
  };

  for (const [key, value] of Object.entries(matchMap)) {
    if (excelColumn.includes(key.toLowerCase())) {
      if (!isFieldMapped(value, index)) {
        mapping.systemField = value;
        break;
      }
    }
  }
};

const autoMapAllFields = () => {
  fieldMappings.value.forEach((_, index) => {
    autoMapField(index);
  });
};

const isFieldMapped = (fieldKey, excludeIndex = -1) => {
  return fieldMappings.value.some(
    (mapping, index) => index !== excludeIndex && mapping.systemField === fieldKey
  );
};

const getFieldInfo = fieldKey => {
  return systemFields.value.find(field => field.key === fieldKey);
};

const validateData = async () => {
  validating.value = true;

  try {
    // 模拟数据验证
    await new Promise(resolve => setTimeout(resolve, 1000));

    const total = previewData.value.length;
    const errors = [];

    // 验证逻辑
    previewData.value.forEach((row, index) => {
      fieldMappings.value.forEach(mapping => {
        if (mapping.systemField) {
          const fieldInfo = getFieldInfo(mapping.systemField);
          const value = row[`col_${fieldMappings.value.indexOf(mapping)}`];

          // 必填验证
          if (fieldInfo?.required && (!value || value.toString().trim() === '')) {
            errors.push({
              row: index + 2, // Excel行号（考虑标题行）
              field: fieldInfo.label,
              value: value || '',
              error: '必填字段不能为空',
            });
          }

          // 数据类型验证
          if (value && fieldInfo?.type === 'date') {
            if (isNaN(Date.parse(value))) {
              errors.push({
                row: index + 2,
                field: fieldInfo.label,
                value: value,
                error: '日期格式不正确',
              });
            }
          }
        }
      });
    });

    validationResult.total = total;
    validationResult.invalid = errors.length;
    validationResult.valid = total - errors.length;
    validationResult.warning = 0;
    validationResult.errors = errors;
  } catch (error) {
    ElMessage.error('数据验证失败');
  } finally {
    validating.value = false;
  }
};

const confirmImport = async () => {
  importing.value = true;

  try {
    const startTime = Date.now();

    // 模拟导入过程
    await new Promise(resolve => setTimeout(resolve, 2000));

    const duration = Date.now() - startTime;

    importResult.success = true;
    importResult.message = '数据导入成功';
    importResult.total = validationResult.total;
    importResult.success_count = validationResult.valid;
    importResult.failed_count = validationResult.invalid;
    importResult.duration = duration;
    importResult.failed_items = validationResult.errors.map(error => ({
      row: error.row,
      data: error.field + ': ' + error.value,
      reason: error.error,
    }));

    importStep.value = 4;
    emit('import-success', importResult);
  } catch (error) {
    importResult.success = false;
    importResult.message = '数据导入失败：' + error.message;
    importStep.value = 4;
  } finally {
    importing.value = false;
  }
};

const nextStep = () => {
  if (importStep.value === 2) {
    validateData();
  }
  importStep.value++;
};

const prevStep = () => {
  importStep.value--;
};

const resetImport = () => {
  importStep.value = 0;
  selectedFile.value = null;
  previewData.value = [];
  previewColumns.value = [];
  fieldMappings.value = [];
  uploadRef.value?.clearFiles();
};

const closeDialog = () => {
  emit('update:modelValue', false);
  resetImport();
};

const downloadTemplate = async () => {
  // 创建模板数据
  const templateData = [
    ['姓名', '性别', '身份证号', '联系电话', '出生日期', '居住地址', '文化程度', '职业'],
    [
      '张三',
      '男',
      '320123199001011234',
      '13800138001',
      '1990-01-01',
      '某某村123号',
      '大专',
      '农民',
    ],
    [
      '李四',
      '女',
      '320123199101011234',
      '13800138002',
      '1991-01-01',
      '某某村456号',
      '高中',
      '务工',
    ],
  ];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('村民信息模板');

  // 添加数据
  templateData.forEach(row => {
    worksheet.addRow(row);
  });

  // 设置表头样式
  worksheet.getRow(1).font = { bold: true };

  // 生成文件
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '村民信息导入模板.xlsx';
  a.click();
  window.URL.revokeObjectURL(url);

  ElMessage.success('模板下载成功');
};

const quickExport = () => {
  exportOptions.scope = 'all';
  exportOptions.fields = systemFields.value.map(field => field.key);
  exportData();
};

const exportData = async () => {
  exporting.value = true;

  try {
    // 创建导出数据
    const headers = exportOptions.fields.map(fieldKey => {
      const field = systemFields.value.find(f => f.key === fieldKey);
      return field?.label || fieldKey;
    });

    const data = [
      headers,
      ...props.exportData.map(item => exportOptions.fields.map(fieldKey => item[fieldKey] || '')),
    ];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('村民数据');

    // 添加数据
    data.forEach(row => {
      worksheet.addRow(row);
    });

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };

    // 生成文件
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `村民数据_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);

    ElMessage.success('导出成功');
    emit('export-success', { fileName: a.download, recordCount: data.length - 1 });
  } catch (error) {
    ElMessage.error('导出失败：' + error.message);
  } finally {
    exporting.value = false;
  }
};

const previewExport = () => {
  ElMessage.info('预览功能开发中...');
};

const saveExportTemplate = () => {
  ElMessage.info('保存模板功能开发中...');
};

const exportFailedData = async () => {
  if (importResult.failed_items.length === 0) return;

  const data = [
    ['行号', '数据', '失败原因'],
    ...importResult.failed_items.map(item => [item.row, item.data, item.reason]),
  ];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('失败数据');

  // 添加数据
  data.forEach(row => {
    worksheet.addRow(row);
  });

  // 设置表头样式
  worksheet.getRow(1).font = { bold: true };

  // 生成文件
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `导入失败数据_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);

  ElMessage.success('失败数据导出成功');
};

// 初始化
onMounted(() => {
  exportOptions.fields = systemFields.value.map(field => field.key);
});
</script>

<style lang="scss" scoped>
.excel-import-export {
  .import-section,
  .export-section {
    margin-bottom: 20px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .import-steps {
    margin-bottom: 20px;
  }

  .step-content {
    min-height: 300px;

    .upload-area {
      border: 2px dashed #dcdfe6;
      border-radius: 6px;
      text-align: center;
      padding: 40px;
      transition: border-color 0.3s;

      &:hover {
        border-color: #409eff;
      }

      .upload-icon {
        font-size: 48px;
        color: #c0c4cc;
        margin-bottom: 16px;
      }

      .upload-text {
        color: #606266;

        em {
          color: #409eff;
          font-style: normal;
        }

        .upload-tip {
          font-size: 12px;
          color: #909399;
          margin-top: 8px;
        }
      }
    }

    .file-info {
      margin-top: 16px;

      .file-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f5f7fa;
        border-radius: 4px;

        .file-name {
          flex: 1;
          color: #303133;
        }

        .file-size {
          color: #909399;
          font-size: 12px;
        }
      }
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      .preview-actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }
    }

    .preview-table {
      margin-bottom: 16px;
    }

    .mapping-header {
      margin-bottom: 20px;

      p {
        color: #606266;
        margin: 8px 0 0 0;
      }
    }

    .mapping-table {
      margin-bottom: 16px;

      .excel-column {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
    }

    .validation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .validation-summary {
      margin-bottom: 20px;
    }

    .validation-errors {
      margin-bottom: 20px;

      h5 {
        color: #f56c6c;
        margin-bottom: 12px;
      }

      .error-more {
        text-align: center;
        color: #909399;
        font-size: 14px;
        margin-top: 8px;
      }
    }

    .import-options {
      margin-bottom: 20px;

      h5 {
        margin-bottom: 12px;
      }

      .el-checkbox {
        display: block;
        margin-bottom: 8px;
      }
    }

    .step-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 20px;
    }
  }

  .result-details {
    margin-bottom: 20px;

    .failed-items {
      margin-top: 20px;

      h5 {
        color: #f56c6c;
        margin-bottom: 12px;
      }
    }
  }

  .result-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .field-groups {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;

    .field-group {
      h5 {
        color: #303133;
        margin-bottom: 12px;
        border-bottom: 1px solid #ebeef5;
        padding-bottom: 8px;
      }

      .el-checkbox {
        display: block;
        margin-bottom: 8px;
      }
    }
  }
}
</style>
