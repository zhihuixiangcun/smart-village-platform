<template>
  <div class="permission-template-management">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索模板..."
          style="width: 300px"
          clearable
          @input="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="filterCategory"
          placeholder="模板分类"
          style="width: 150px; margin-left: 12px"
          clearable
          @change="handleFilter"
        >
          <el-option label="全部" value="" />
          <el-option label="系统模板" value="system" />
          <el-option label="自定义模板" value="custom" />
          <el-option label="部门模板" value="department" />
        </el-select>
      </div>

      <div class="toolbar-right">
        <el-button type="primary" @click="showCreateTemplateDialog">
          <el-icon><Plus /></el-icon>
          创建模板
        </el-button>
        <el-dropdown split-button type="primary" @click="showImportTemplateDialog">
          <el-icon><Upload /></el-icon>
          导入模板
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="showImportTemplateDialog"> 从JSON导入 </el-dropdown-item>
              <el-dropdown-item @click="showImportTemplateDialog('zip')">
                从ZIP批量导入
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown split-button @click="exportTemplates">
          <el-icon><Download /></el-icon>
          导出模板
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="exportSingleTemplate"> 导出当前模板 </el-dropdown-item>
              <el-dropdown-item @click="exportAllTemplates('json')">
                导出全部(JSON)
              </el-dropdown-item>
              <el-dropdown-item @click="exportAllTemplates('zip')">
                导出全部(ZIP)
              </el-dropdown-item>
              <el-dropdown-item divided @click="showExportOptionsDialog">
                自定义导出选项
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 模板列表 -->
    <el-row :gutter="24">
      <!-- 左侧模板列表 -->
      <el-col :span="8">
        <el-card class="template-list-card">
          <template #header>
            <div class="card-header">
              <h3>权限模板列表</h3>
              <span class="template-count">共 {{ filteredTemplates.length }} 个模板</span>
            </div>
          </template>

          <div class="template-list">
            <div
              v-for="template in filteredTemplates"
              :key="template.id"
              class="template-item"
              :class="{ active: selectedTemplate?.id === template.id }"
              @click="selectTemplate(template)"
            >
              <div class="template-icon">
                <el-icon :size="24" :color="template.category === 'system' ? '#409eff' : '#67c23a'">
                  <Document />
                </el-icon>
              </div>
              <div class="template-info">
                <div class="template-name">{{ template.name }}</div>
                <div class="template-description">{{ template.description }}</div>
                <div class="template-meta">
                  <el-tag :type="getCategoryTagType(template.category)" size="small">
                    {{ getCategoryLabel(template.category) }}
                  </el-tag>
                  <span class="permission-count">{{ template.permissionCount }} 项权限</span>
                </div>
              </div>
              <div class="template-actions">
                <el-dropdown @command="handleTemplateAction">
                  <el-button type="text" size="small">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item :command="`edit-${template.id}`">编辑</el-dropdown-item>
                      <el-dropdown-item :command="`copy-${template.id}`">复制</el-dropdown-item>
                      <el-dropdown-item :command="`apply-${template.id}`"
                        >应用模板</el-dropdown-item
                      >
                      <el-dropdown-item :command="`delete-${template.id}`" class="danger-item">
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧模板详情 -->
      <el-col :span="16">
        <el-card class="template-detail-card">
          <template #header>
            <div class="card-header">
              <h3 v-if="selectedTemplate">
                {{ selectedTemplate.name }}
              </h3>
              <h3 v-else>模板详情</h3>
              <div class="template-actions" v-if="selectedTemplate">
                <el-button type="primary" size="small" @click="handleApplyTemplate">
                  应用模板
                </el-button>
                <el-button size="small" @click="previewTemplate"> 预览效果 </el-button>
              </div>
            </div>
          </template>

          <div v-if="selectedTemplate" class="template-content">
            <!-- 基本信息 -->
            <div class="template-basic-info">
              <el-descriptions :column="2" border>
                <el-descriptions-item label="模板ID">
                  {{ selectedTemplate.id }}
                </el-descriptions-item>
                <el-descriptions-item label="分类">
                  <el-tag :type="getCategoryTagType(selectedTemplate.category)">
                    {{ getCategoryLabel(selectedTemplate.category) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="创建时间">
                  {{ formatDateTime(selectedTemplate.createdAt) }}
                </el-descriptions-item>
                <el-descriptions-item label="更新时间">
                  {{ formatDateTime(selectedTemplate.updatedAt) }}
                </el-descriptions-item>
                <el-descriptions-item label="使用次数">
                  {{ selectedTemplate.usageCount || 0 }}
                </el-descriptions-item>
                <el-descriptions-item label="权限数量">
                  {{ selectedTemplate.permissionCount }}
                </el-descriptions-item>
              </el-descriptions>
            </div>

            <!-- 权限配置 -->
            <div class="template-permissions">
              <h4>权限配置</h4>
              <el-tabs v-model="activePermissionTab" type="card">
                <el-tab-pane label="权限列表" name="list">
                  <div class="permission-list">
                    <div
                      v-for="category in selectedTemplate.permissions"
                      :key="category.module"
                      class="permission-category"
                    >
                      <h5>{{ category.module }}</h5>
                      <el-checkbox-group v-model="category.enabledPermissions">
                        <div class="permission-grid">
                          <el-checkbox
                            v-for="permission in category.permissions"
                            :key="permission.key"
                            :label="permission.key"
                          >
                            <div class="permission-item">
                              <span class="permission-name">{{ permission.name }}</span>
                              <span class="permission-description">{{
                                permission.description
                              }}</span>
                            </div>
                          </el-checkbox>
                        </div>
                      </el-checkbox-group>
                    </div>
                  </div>
                </el-tab-pane>

                <el-tab-pane label="权限统计" name="stats">
                  <div class="permission-stats">
                    <div ref="permissionChart" class="chart-container"></div>
                  </div>
                </el-tab-pane>

                <el-tab-pane label="使用历史" name="history">
                  <div class="usage-history">
                    <el-timeline>
                      <el-timeline-item
                        v-for="history in selectedTemplate.usageHistory || []"
                        :key="history.id"
                        :timestamp="formatDateTime(history.timestamp)"
                      >
                        <div class="history-content">
                          <div class="history-action">
                            {{ history.action }} - {{ history.target }}
                          </div>
                          <div class="history-operator">操作人: {{ history.operator }}</div>
                        </div>
                      </el-timeline-item>
                    </el-timeline>
                    <div v-if="!selectedTemplate.usageHistory?.length" class="no-history">
                      <el-empty description="暂无使用记录" />
                    </div>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </div>
          </div>

          <div v-else class="no-template-selected">
            <el-empty description="请选择一个模板查看详情" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 创建/编辑模板对话框 -->
    <el-dialog
      v-model="templateDialogVisible"
      :title="isEditing ? '编辑模板' : '创建模板'"
      width="800px"
      :destroy-on-close="true"
    >
      <el-form
        ref="templateFormRef"
        :model="templateForm"
        :rules="templateRules"
        label-width="100px"
      >
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="templateForm.name" placeholder="输入模板名称" />
        </el-form-item>

        <el-form-item label="模板描述" prop="description">
          <el-input
            v-model="templateForm.description"
            type="textarea"
            :rows="2"
            placeholder="描述模板用途"
          />
        </el-form-item>

        <el-form-item label="模板分类" prop="category">
          <el-radio-group v-model="templateForm.category">
            <el-radio label="system">系统模板</el-radio>
            <el-radio label="custom">自定义模板</el-radio>
            <el-radio label="department">部门模板</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="适用角色">
          <el-select
            v-model="templateForm.targetRoles"
            multiple
            placeholder="选择适用角色"
            style="width: 100%"
          >
            <el-option
              v-for="role in roleOptions"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="权限配置">
          <div class="permission-config">
            <el-tabs v-model="configTab" type="border-card">
              <el-tab-pane
                v-for="category in permissionCategories"
                :key="category.key"
                :label="category.name"
                :name="category.key"
              >
                <div class="category-permissions">
                  <div class="category-header">
                    <el-checkbox
                      :indeterminate="getCategoryIndeterminate(category)"
                      :model-value="getCategoryChecked(category)"
                      @update:model-value="val => handleCategoryCheck(category, val)"
                    >
                      全选
                    </el-checkbox>
                  </div>
                  <el-checkbox-group v-model="templateForm.permissions">
                    <el-row :gutter="16">
                      <el-col
                        v-for="permission in category.permissions"
                        :key="permission.key"
                        :span="8"
                      >
                        <el-checkbox :label="permission.key">
                          {{ permission.name }}
                        </el-checkbox>
                      </el-col>
                    </el-row>
                  </el-checkbox-group>
                </div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitTemplate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 应用模板对话框 -->
    <el-dialog
      v-model="applyDialogVisible"
      title="应用权限模板"
      width="600px"
      :destroy-on-close="true"
    >
      <div v-if="applyTemplate" class="apply-template-form">
        <h4>{{ applyTemplate.name }}</h4>
        <p class="template-desc">{{ applyTemplate.description }}</p>

        <el-form label-width="100px">
          <el-form-item label="应用对象">
            <el-radio-group v-model="applyForm.target">
              <el-radio label="role">角色</el-radio>
              <el-radio label="user">用户</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="applyForm.target === 'role'" label="选择角色">
            <el-select v-model="applyForm.roleId" placeholder="选择角色" style="width: 100%">
              <el-option
                v-for="role in roleOptions"
                :key="role.value"
                :label="role.label"
                :value="role.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item v-if="applyForm.target === 'user'" label="选择用户">
            <el-select
              v-model="applyForm.userIds"
              multiple
              placeholder="选择用户"
              style="width: 100%"
            >
              <el-option
                v-for="user in userOptions"
                :key="user.id"
                :label="user.name"
                :value="user.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="应用方式">
            <el-radio-group v-model="applyForm.mode">
              <el-radio label="replace">替换现有权限</el-radio>
              <el-radio label="merge">合并权限</el-radio>
              <el-radio label="append">追加权限</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="生效时间">
            <el-date-picker
              v-model="applyForm.effectiveTime"
              type="datetime"
              placeholder="选择生效时间"
              style="width: 100%"
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="applyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="executeApplyTemplate">应用</el-button>
      </template>
    </el-dialog>

    <!-- 导入模板对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="导入权限模板"
      width="900px"
      :close-on-click-modal="false"
    >
      <el-steps :active="importStep" finish-status="success" align-center>
        <el-step title="选择文件" />
        <el-step title="预览验证" />
        <el-step title="导入选项" />
        <el-step title="导入完成" />
      </el-steps>

      <div class="import-content">
        <!-- 步骤1: 选择文件 -->
        <div v-if="importStep === 0" class="import-step">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            drag
            accept=".json,.zip"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">支持 JSON 或 ZIP 格式文件，单次最多导入 10 个模板</div>
            </template>
          </el-upload>

          <div v-if="importFile" class="file-info">
            <el-icon><Document /></el-icon>
            <span class="file-name">{{ importFile.name }}</span>
            <span class="file-size">({{ formatFileSize(importFile.size) }})</span>
          </div>
        </div>

        <!-- 步骤2: 预览验证 -->
        <div v-if="importStep === 1" class="import-step">
          <el-alert
            title="验证结果"
            :type="validationResult.isValid ? 'success' : 'error'"
            :closable="false"
            style="margin-bottom: 16px"
          >
            <template v-if="validationResult.isValid">
              验证通过，共发现 {{ importedTemplates.length }} 个模板
            </template>
            <template v-else>
              {{ validationResult.error }}
            </template>
          </el-alert>

          <div v-if="validationResult.isValid" class="template-preview">
            <h4>模板预览</h4>
            <el-table :data="importedTemplates" max-height="300" border>
              <el-table-column prop="name" label="模板名称" width="200" />
              <el-table-column prop="description" label="描述" show-overflow-tooltip />
              <el-table-column prop="category" label="分类" width="100">
                <template #default="{ row }">
                  <el-tag :type="getCategoryTagType(row.category)" size="small">
                    {{ getCategoryLabel(row.category) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="权限数量" width="100">
                <template #default="{ row }">
                  {{ row.permissions?.flat()?.length || row.permissions?.length || 0 }}
                </template>
              </el-table-column>
              <el-table-column label="冲突状态" width="120">
                <template #default="{ row }">
                  <el-tag v-if="hasConflict(row)" type="warning" size="small"> 存在冲突 </el-tag>
                  <el-tag v-else type="success" size="small">无冲突</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- 步骤3: 导入选项 -->
        <div v-if="importStep === 2" class="import-step">
          <div class="import-options">
            <h4>导入选项</h4>
            <el-form label-width="150px">
              <el-form-item label="冲突处理方式">
                <el-radio-group v-model="importOptions.conflictStrategy">
                  <el-radio label="skip">跳过冲突</el-radio>
                  <el-radio label="overwrite">覆盖同名</el-radio>
                  <el-radio label="rename">自动重命名</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="导入分类">
                <el-select
                  v-model="importOptions.category"
                  placeholder="选择导入分类"
                  style="width: 200px"
                >
                  <el-option label="保持原分类" value="" />
                  <el-option label="系统模板" value="system" />
                  <el-option label="自定义模板" value="custom" />
                  <el-option label="部门模板" value="department" />
                </el-select>
              </el-form-item>

              <el-form-item label="保留使用记录">
                <el-switch v-model="importOptions.keepUsageHistory" />
              </el-form-item>

              <el-form-item label="导入后刷新">
                <el-switch v-model="importOptions.refreshAfterImport" />
              </el-form-item>
            </el-form>
          </div>
        </div>

        <!-- 步骤4: 导入完成 -->
        <div v-if="importStep === 3" class="import-step">
          <el-result
            :icon="importResult.success ? 'success' : 'error'"
            :title="importResult.success ? '导入完成' : '导入失败'"
            :sub-title="importResult.message"
          >
            <template #extra>
              <div v-if="importResult.success" class="import-stats">
                <el-row :gutter="24">
                  <el-col :span="8">
                    <el-statistic title="成功导入" :value="importResult.successCount" />
                  </el-col>
                  <el-col :span="8">
                    <el-statistic title="跳过数量" :value="importResult.skipCount" />
                  </el-col>
                  <el-col :span="8">
                    <el-statistic title="失败数量" :value="importResult.failCount" />
                  </el-col>
                </el-row>
              </div>
            </template>
          </el-result>
        </div>
      </div>

      <template #footer>
        <el-button @click="closeImportDialog">取消</el-button>
        <el-button v-if="importStep > 0 && importStep < 3" @click="importStep--">
          上一步
        </el-button>
        <el-button
          v-if="importStep === 0"
          type="primary"
          :disabled="!importFile"
          @click="nextImportStep"
        >
          下一步
        </el-button>
        <el-button
          v-if="importStep === 1"
          type="primary"
          :disabled="!validationResult.isValid"
          @click="nextImportStep"
        >
          下一步
        </el-button>
        <el-button
          v-if="importStep === 2"
          type="primary"
          :loading="importing"
          @click="executeImport"
        >
          开始导入
        </el-button>
        <el-button v-if="importStep === 3" type="primary" @click="closeImportDialog">
          完成
        </el-button>
      </template>
    </el-dialog>

    <!-- 导出选项对话框 -->
    <el-dialog v-model="exportOptionsDialogVisible" title="导出选项" width="600px">
      <el-form label-width="120px">
        <el-form-item label="导出格式">
          <el-radio-group v-model="exportOptions.format">
            <el-radio label="json">JSON</el-radio>
            <el-radio label="zip">ZIP</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="包含字段">
          <el-checkbox-group v-model="exportOptions.fields">
            <el-checkbox label="name">模板名称</el-checkbox>
            <el-checkbox label="description">描述</el-checkbox>
            <el-checkbox label="permissions">权限配置</el-checkbox>
            <el-checkbox label="category">分类</el-checkbox>
            <el-checkbox label="createdAt">创建时间</el-checkbox>
            <el-checkbox label="updatedAt">更新时间</el-checkbox>
            <el-checkbox label="usageHistory">使用历史</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="文件命名">
          <el-input v-model="exportOptions.filename" placeholder="输入文件名" />
        </el-form-item>

        <el-form-item label="压缩图片">
          <el-switch v-model="exportOptions.compressImages" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="exportOptionsDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="executeExportWithOptions">导出</el-button>
      </template>
    </el-dialog>

    <!-- 导入进度对话框 -->
    <el-dialog
      v-model="importProgressDialogVisible"
      title="导入进度"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <div class="import-progress">
        <el-progress :percentage="importProgress.percentage" :status="importProgress.status" />
        <div class="progress-info">
          <p>当前: {{ importProgress.current }}</p>
          <p>总计: {{ importProgress.total }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Search,
  Plus,
  Upload,
  Download,
  MoreFilled,
  Document,
  UploadFilled,
} from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import enhancedPermissionService from '@/services/enhancedPermissionService';
import JSZip from 'jszip';

// 响应式数据
const searchKeyword = ref('');
const filterCategory = ref('');
const selectedTemplate = ref(null);
const activePermissionTab = ref('list');
const configTab = ref('basic');
const templateDialogVisible = ref(false);
const applyDialogVisible = ref(false);
const isEditing = ref(false);
const applyTemplate = ref(null);

// 导入相关
const importDialogVisible = ref(false);
const importProgressDialogVisible = ref(false);
const importStep = ref(0);
const importFile = ref(null);
const importing = ref(false);
const importedTemplates = ref([]);
const importOptions = reactive({
  conflictStrategy: 'skip',
  category: '',
  keepUsageHistory: true,
  refreshAfterImport: true,
});

const validationResult = reactive({
  isValid: false,
  error: '',
});

const importResult = reactive({
  success: false,
  successCount: 0,
  skipCount: 0,
  failCount: 0,
  message: '',
});

const importProgress = reactive({
  percentage: 0,
  current: 0,
  total: 0,
  status: '',
});

// 导出相关
const exportOptionsDialogVisible = ref(false);
const exportOptions = reactive({
  format: 'json',
  fields: ['name', 'description', 'permissions', 'category', 'createdAt', 'updatedAt'],
  filename: 'permission-templates',
  compressImages: true,
});

// 模板数据
const templates = ref([
  {
    id: '1',
    name: '基础管理员权限',
    description: '包含基本的管理功能权限',
    category: 'system',
    permissionCount: 25,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
    usageCount: 156,
    permissions: [
      {
        module: '用户管理',
        permissions: [
          { key: 'user:read', name: '查看用户', description: '查看用户基本信息' },
          { key: 'user:write', name: '编辑用户', description: '修改用户信息' },
        ],
        enabledPermissions: ['user:read', 'user:write'],
      },
      {
        module: '角色管理',
        permissions: [{ key: 'role:read', name: '查看角色', description: '查看角色信息' }],
        enabledPermissions: ['role:read'],
      },
    ],
  },
  {
    id: '2',
    name: '财务主管权限',
    description: '财务部门主管专用权限模板',
    category: 'department',
    permissionCount: 18,
    createdAt: new Date('2025-01-05'),
    updatedAt: new Date('2025-01-10'),
    usageCount: 23,
    permissions: [
      {
        module: '财务管理',
        permissions: [
          { key: 'finance:read', name: '查看财务', description: '查看财务数据' },
          { key: 'finance:approve', name: '财务审批', description: '审批财务申请' },
        ],
        enabledPermissions: ['finance:read', 'finance:approve'],
      },
    ],
  },
  {
    id: '3',
    name: '只读权限模板',
    description: '仅包含查看权限的安全模板',
    category: 'custom',
    permissionCount: 15,
    createdAt: new Date('2025-01-08'),
    updatedAt: new Date('2025-01-08'),
    usageCount: 89,
    permissions: [],
  },
]);

// 权限分类
const permissionCategories = ref([
  {
    key: 'basic',
    name: '基础权限',
    permissions: [
      { key: 'user:read', name: '查看用户' },
      { key: 'user:write', name: '编辑用户' },
      { key: 'role:read', name: '查看角色' },
      { key: 'role:write', name: '编辑角色' },
    ],
  },
  {
    key: 'business',
    name: '业务权限',
    permissions: [
      { key: 'resident:read', name: '查看村民' },
      { key: 'resident:write', name: '编辑村民' },
      { key: 'finance:read', name: '查看财务' },
      { key: 'finance:write', name: '编辑财务' },
    ],
  },
  {
    key: 'system',
    name: '系统权限',
    permissions: [
      { key: 'system:config', name: '系统配置' },
      { key: 'system:log', name: '查看日志' },
    ],
  },
]);

// 表单数据
const templateFormRef = ref(null);
const templateForm = reactive({
  name: '',
  description: '',
  category: 'custom',
  targetRoles: [],
  permissions: [],
});

const applyForm = reactive({
  target: 'role',
  roleId: '',
  userIds: [],
  mode: 'merge',
  effectiveTime: new Date(),
});

const templateRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入模板描述', trigger: 'blur' }],
  category: [{ required: true, message: '请选择模板分类', trigger: 'change' }],
};

const roleOptions = ref([
  { label: '村级管理员', value: 'village_admin' },
  { label: '部门主管', value: 'department_head' },
  { label: '工作人员', value: 'staff' },
  { label: '村民', value: 'villager' },
]);

const userOptions = ref([
  { id: '1', name: '张管理员' },
  { id: '2', name: '李主管' },
  { id: '3', name: '王工作人员' },
]);

// 图表实例
let permissionChart = null;

// 计算属性
const filteredTemplates = computed(() => {
  let result = templates.value;

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(
      template =>
        template.name.toLowerCase().includes(keyword) ||
        template.description.toLowerCase().includes(keyword)
    );
  }

  if (filterCategory.value) {
    result = result.filter(template => template.category === filterCategory.value);
  }

  return result;
});

// 方法
const handleSearch = () => {
  // 搜索逻辑已通过计算属性实现
};

const handleFilter = () => {
  // 过滤逻辑已通过计算属性实现
};

const selectTemplate = template => {
  selectedTemplate.value = template;
  nextTick(() => {
    initPermissionChart();
  });
};

const getCategoryTagType = category => {
  const types = {
    system: 'primary',
    custom: 'success',
    department: 'warning',
  };
  return types[category] || 'info';
};

const getCategoryLabel = category => {
  const labels = {
    system: '系统模板',
    custom: '自定义模板',
    department: '部门模板',
  };
  return labels[category] || '未知';
};

const getCategoryIndeterminate = category => {
  const checkedCount = category.permissions.filter(p =>
    templateForm.permissions.includes(p.key)
  ).length;
  return checkedCount > 0 && checkedCount < category.permissions.length;
};

const getCategoryChecked = category => {
  return category.permissions.every(p => templateForm.permissions.includes(p.key));
};

const handleCategoryCheck = (category, checked) => {
  if (checked) {
    category.permissions.forEach(p => {
      if (!templateForm.permissions.includes(p.key)) {
        templateForm.permissions.push(p.key);
      }
    });
  } else {
    category.permissions.forEach(p => {
      const index = templateForm.permissions.indexOf(p.key);
      if (index > -1) {
        templateForm.permissions.splice(index, 1);
      }
    });
  }
};

const initPermissionChart = () => {
  if (!selectedTemplate.value) return;

  const chartDom = document.querySelector('[ref="permissionChart"]');
  if (!chartDom) return;

  permissionChart = echarts.init(chartDom);

  const data = [];
  selectedTemplate.value.permissions.forEach(category => {
    category.permissions.forEach(permission => {
      data.push({
        name: permission.name,
        value: 1,
      });
    });
  });

  const option = {
    tooltip: {
      trigger: 'item',
    },
    series: [
      {
        name: '权限分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: data,
      },
    ],
  };

  permissionChart.setOption(option);
};

const handleTemplateAction = async command => {
  const [action, templateId] = command.split('-');
  const template = templates.value.find(t => t.id === templateId);

  switch (action) {
    case 'edit':
      isEditing.value = true;
      Object.assign(templateForm, {
        name: template.name,
        description: template.description,
        category: template.category,
        targetRoles: [],
        permissions: [],
      });
      templateDialogVisible.value = true;
      break;

    case 'copy':
      isEditing.value = false;
      Object.assign(templateForm, {
        name: template.name + '_副本',
        description: template.description,
        category: 'custom',
        targetRoles: [],
        permissions: [],
      });
      templateDialogVisible.value = true;
      break;

    case 'apply':
      showApplyTemplateDialog(template);
      break;

    case 'delete':
      try {
        await ElMessageBox.confirm(`确定要删除模板"${template.name}"吗？`, '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        });

        const index = templates.value.findIndex(t => t.id === templateId);
        templates.value.splice(index, 1);

        if (selectedTemplate.value?.id === templateId) {
          selectedTemplate.value = null;
        }

        ElMessage.success('模板删除成功');
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除模板失败');
        }
      }
      break;
  }
};

const showCreateTemplateDialog = () => {
  isEditing.value = false;
  Object.assign(templateForm, {
    name: '',
    description: '',
    category: 'custom',
    targetRoles: [],
    permissions: [],
  });
  templateDialogVisible.value = true;
};

const showImportTemplateDialog = fileType => {
  importStep.value = 0;
  importFile.value = null;
  importedTemplates.value = [];
  validationResult.isValid = false;
  validationResult.error = '';
  importResult.success = false;
  importResult.successCount = 0;
  importResult.skipCount = 0;
  importResult.failCount = 0;
  importProgress.percentage = 0;
  importProgress.current = 0;
  importProgress.total = 0;

  if (fileType === 'zip') {
    ElMessage.info('请选择 ZIP 文件');
  }

  importDialogVisible.value = true;
};

const closeImportDialog = () => {
  importDialogVisible.value = false;
  if (importOptions.refreshAfterImport && importResult.success) {
    ElMessage.success('模板列表已刷新');
  }
};

const nextImportStep = async () => {
  if (importStep.value === 0) {
    await validateAndParseImportFile();
  }

  if (validationResult.isValid) {
    importStep.value++;
  }
};

const exportTemplates = () => {
  exportAllTemplates('json');
};

const exportSingleTemplate = () => {
  if (!selectedTemplate.value) {
    ElMessage.warning('请先选择一个模板');
    return;
  }

  const templateData = prepareTemplateForExport(selectedTemplate.value);
  const jsonData = JSON.stringify(templateData, null, 2);
  downloadFile(jsonData, `${templateData.name}.json`, 'application/json');

  ElMessage.success('模板导出成功');
};

const exportAllTemplates = format => {
  const templatesToExport =
    filteredTemplates.value.length > 0 ? filteredTemplates.value : templates.value;

  if (templatesToExport.length === 0) {
    ElMessage.warning('没有可导出的模板');
    return;
  }

  if (format === 'json') {
    const jsonData = JSON.stringify(templatesToExport, null, 2);
    downloadFile(jsonData, `permission-templates-${Date.now()}.json`, 'application/json');
  } else if (format === 'zip') {
    exportTemplatesAsZip(templatesToExport);
  }

  ElMessage.success(`成功导出 ${templatesToExport.length} 个模板`);
};

const showExportOptionsDialog = () => {
  exportOptions.format = 'json';
  exportOptions.fields = [
    'name',
    'description',
    'permissions',
    'category',
    'createdAt',
    'updatedAt',
  ];
  exportOptions.filename = 'permission-templates';
  exportOptionsDialogVisible.value = true;
};

const executeExportWithOptions = () => {
  const templatesToExport =
    filteredTemplates.value.length > 0 ? filteredTemplates.value : templates.value;

  if (templatesToExport.length === 0) {
    ElMessage.warning('没有可导出的模板');
    return;
  }

  const filteredData = templatesToExport.map(template => {
    const filtered = {};
    exportOptions.fields.forEach(field => {
      if (template[field] !== undefined) {
        filtered[field] = template[field];
      }
    });
    return filtered;
  });

  if (exportOptions.format === 'json') {
    const jsonData = JSON.stringify(filteredData, null, 2);
    downloadFile(jsonData, `${exportOptions.filename}.json`, 'application/json');
  } else if (exportOptions.format === 'zip') {
    exportTemplatesAsZip(filteredData, exportOptions.filename);
  }

  exportOptionsDialogVisible.value = false;
  ElMessage.success('导出成功');
};

const prepareTemplateForExport = template => {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    permissions: template.permissions.map(category => ({
      module: category.module,
      permissions: category.permissions,
      enabledPermissions: category.enabledPermissions,
    })),
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    usageCount: template.usageCount,
    usageHistory: template.usageHistory,
    version: '1.0',
  };
};

const exportTemplatesAsZip = async (templatesList, filename = 'permission-templates') => {
  try {
    const zip = new JSZip();

    templatesList.forEach(template => {
      const templateData = prepareTemplateForExport(template);
      const jsonContent = JSON.stringify(templateData, null, 2);
      zip.file(`${template.name}.json`, jsonContent);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadFile(blob, `${filename}-${Date.now()}.zip`, 'application/zip');
  } catch (error) {
    console.error('导出ZIP文件失败:', error);
    ElMessage.error('导出ZIP文件失败: ' + error.message);
  }
};

const downloadFile = (content, filename, mimeType) => {
  let blob;
  if (typeof content === 'string') {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = content;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const submitTemplate = async () => {
  try {
    await templateFormRef.value.validate();

    const templateData = {
      ...templateForm,
      createdAt: isEditing.value ? templateForm.createdAt : new Date(),
      updatedAt: new Date(),
      permissionCount: templateForm.permissions.length,
      usageCount: isEditing.value ? templateForm.usageCount : 0,
      permissions: [],
    };

    // 构建权限结构
    permissionCategories.value.forEach(category => {
      const categoryPermissions = {
        module: category.name,
        permissions: [],
        enabledPermissions: [],
      };

      category.permissions.forEach(permission => {
        categoryPermissions.permissions.push({
          key: permission.key,
          name: permission.name,
          description: `${permission.name}权限`,
        });

        if (templateForm.permissions.includes(permission.key)) {
          categoryPermissions.enabledPermissions.push(permission.key);
        }
      });

      if (categoryPermissions.enabledPermissions.length > 0) {
        templateData.permissions.push(categoryPermissions);
      }
    });

    if (isEditing.value) {
      const index = templates.value.findIndex(t => t.id === templateForm.id);
      templates.value[index] = templateData;
      ElMessage.success('模板更新成功');
    } else {
      templateData.id = Date.now().toString();
      templates.value.push(templateData);
      ElMessage.success('模板创建成功');
    }

    templateDialogVisible.value = false;
  } catch (error) {
    console.error('保存模板失败:', error);
  }
};

const handleApplyTemplate = () => {
  showApplyTemplateDialog(selectedTemplate.value);
};

const handleFileChange = file => {
  importFile.value = file.raw;
};

const handleFileRemove = () => {
  importFile.value = null;
};

const validateAndParseImportFile = async () => {
  if (!importFile.value) {
    validationResult.isValid = false;
    validationResult.error = '请选择要导入的文件';
    return;
  }

  const fileType = importFile.value.name.split('.').pop().toLowerCase();

  try {
    if (fileType === 'json') {
      await parseJsonFile();
    } else if (fileType === 'zip') {
      await parseZipFile();
    } else {
      throw new Error('不支持的文件格式，仅支持 JSON 或 ZIP');
    }

    await validateTemplates();
  } catch (error) {
    validationResult.isValid = false;
    validationResult.error = error.message;
    ElMessage.error(error.message);
  }
};

const parseJsonFile = () => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const content = e.target.result;
        const data = JSON.parse(content);

        if (Array.isArray(data)) {
          importedTemplates.value = data;
        } else if (typeof data === 'object' && data.id) {
          importedTemplates.value = [data];
        } else {
          throw new Error('JSON 文件格式不正确');
        }

        resolve();
      } catch (error) {
        reject(new Error('解析 JSON 文件失败: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(importFile.value);
  });
};

const parseZipFile = async () => {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(importFile.value);
    const templates = [];

    for (const filename of Object.keys(contents)) {
      if (filename.endsWith('.json')) {
        const content = await contents[filename].async('text');
        const data = JSON.parse(content);

        if (typeof data === 'object' && data.id) {
          templates.push(data);
        }
      }
    }

    if (templates.length === 0) {
      throw new Error('ZIP 文件中未找到有效的模板文件');
    }

    if (templates.length > 10) {
      throw new Error('单次最多导入 10 个模板');
    }

    importedTemplates.value = templates;
  } catch (error) {
    throw new Error('解析 ZIP 文件失败: ' + error.message);
  }
};

const validateTemplates = () => {
  const errors = [];

  importedTemplates.value.forEach((template, index) => {
    if (!template.id) {
      errors.push(`模板 ${index + 1}: 缺少 ID`);
    }
    if (!template.name) {
      errors.push(`模板 ${index + 1}: 缺少名称`);
    }
    if (!template.permissions || !Array.isArray(template.permissions)) {
      errors.push(`模板 ${index + 1}: 权限配置格式错误`);
    }
  });

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  validationResult.isValid = true;
};

const hasConflict = template => {
  return templates.value.some(t => t.id === template.id || t.name === template.name);
};

const previewTemplate = () => {
  ElMessage.info('预览功能待实现');
};

const showApplyTemplateDialog = template => {
  applyTemplate.value = template;
  Object.assign(applyForm, {
    target: 'role',
    roleId: '',
    userIds: [],
    mode: 'merge',
    effectiveTime: new Date(),
  });
  applyDialogVisible.value = true;
};

const executeApplyTemplate = async () => {
  try {
    if (applyForm.target === 'role' && !applyForm.roleId) {
      ElMessage.warning('请选择角色');
      return;
    }

    if (applyForm.target === 'user' && applyForm.userIds.length === 0) {
      ElMessage.warning('请选择用户');
      return;
    }

    const template = templates.value.find(t => t.id === applyTemplate.value.id);
    if (template) {
      template.usageCount = (template.usageCount || 0) + 1;

      if (!template.usageHistory) {
        template.usageHistory = [];
      }
      template.usageHistory.push({
        id: Date.now().toString(),
        action: '应用模板',
        target:
          applyForm.target === 'role'
            ? `角色: ${applyForm.roleId}`
            : `用户: ${applyForm.userIds.length}个`,
        operator: '当前用户',
        timestamp: new Date(),
      });
    }

    ElMessage.success('模板应用成功');
    applyDialogVisible.value = false;
  } catch (error) {
    ElMessage.error('应用模板失败');
  }
};

const executeImport = async () => {
  importing.value = true;
  importProgressDialogVisible.value = true;

  importProgress.total = importedTemplates.value.length;
  importProgress.current = 0;
  importProgress.percentage = 0;
  importProgress.status = '';

  importResult.successCount = 0;
  importResult.skipCount = 0;
  importResult.failCount = 0;

  try {
    for (const template of importedTemplates.value) {
      importProgress.current++;

      try {
        const existingTemplate = templates.value.find(t => t.id === template.id);
        const existingByName = templates.value.find(t => t.name === template.name);

        if (existingTemplate || existingByName) {
          if (importOptions.conflictStrategy === 'skip') {
            importResult.skipCount++;
            continue;
          } else if (importOptions.conflictStrategy === 'overwrite') {
            if (existingTemplate) {
              const index = templates.value.findIndex(t => t.id === template.id);
              templates.value[index] = normalizeTemplate(template);
            } else if (existingByName) {
              const index = templates.value.findIndex(t => t.name === template.name);
              templates.value[index] = normalizeTemplate(template);
            }
            importResult.successCount++;
          } else if (importOptions.conflictStrategy === 'rename') {
            const newTemplate = { ...template };
            newTemplate.name = `${template.name}_${Date.now()}`;
            newTemplate.id = `${template.id}_${Date.now()}`;
            templates.value.push(normalizeTemplate(newTemplate));
            importResult.successCount++;
          }
        } else {
          templates.value.push(normalizeTemplate(template));
          importResult.successCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        importResult.failCount++;
        console.error('导入模板失败:', error);
      }

      importProgress.percentage = Math.round((importProgress.current / importProgress.total) * 100);
    }

    importResult.success = true;
    importResult.message = `成功导入 ${importResult.successCount} 个模板`;
    if (importResult.skipCount > 0) {
      importResult.message += `，跳过 ${importResult.skipCount} 个`;
    }
    if (importResult.failCount > 0) {
      importResult.message += `，失败 ${importResult.failCount} 个`;
    }

    importStep.value = 3;
    ElMessage.success('导入完成');
  } catch (error) {
    importResult.success = false;
    importResult.message = '导入过程中发生错误: ' + error.message;
    importProgress.status = 'exception';
    ElMessage.error(importResult.message);
  } finally {
    importing.value = false;
    setTimeout(() => {
      importProgressDialogVisible.value = false;
    }, 1000);
  }
};

const normalizeTemplate = template => {
  return {
    id: template.id || Date.now().toString(),
    name: template.name,
    description: template.description || '',
    category: importOptions.category || template.category || 'custom',
    permissionCount: template.permissions?.flat()?.length || template.permissions?.length || 0,
    createdAt: template.createdAt ? new Date(template.createdAt) : new Date(),
    updatedAt: template.updatedAt ? new Date(template.updatedAt) : new Date(),
    usageCount: template.usageCount || 0,
    permissions: template.permissions || [],
    usageHistory: importOptions.keepUsageHistory ? template.usageHistory : [],
  };
};

// 工具方法
const formatDateTime = date => {
  return new Date(date).toLocaleString();
};

const formatFileSize = bytes => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 生命周期
onMounted(() => {
  // 初始化数据
});
</script>

<style lang="scss" scoped>
.permission-template-management {
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding: 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    .toolbar-left {
      display: flex;
      align-items: center;
    }

    .toolbar-right {
      display: flex;
      gap: 12px;
    }
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
      font-size: 16px;
      color: #2c3e50;
    }

    .template-count {
      font-size: 14px;
      color: #909399;
    }
  }

  .template-list-card {
    height: calc(100vh - 300px);
    overflow: hidden;

    .template-list {
      height: calc(100% - 60px);
      overflow-y: auto;
    }

    .template-item {
      display: flex;
      align-items: center;
      padding: 16px;
      margin-bottom: 8px;
      border-radius: 8px;
      background: #f5f7fa;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        background: #e6e8eb;
      }

      &.active {
        background: #ecf5ff;
        border: 1px solid #409eff;
      }

      .template-icon {
        margin-right: 12px;
      }

      .template-info {
        flex: 1;

        .template-name {
          font-weight: 500;
          color: #2c3e50;
          margin-bottom: 4px;
        }

        .template-description {
          font-size: 14px;
          color: #606266;
          margin-bottom: 8px;
        }

        .template-meta {
          display: flex;
          align-items: center;
          gap: 8px;

          .permission-count {
            font-size: 12px;
            color: #909399;
          }
        }
      }

      .template-actions {
        opacity: 0;
        transition: opacity 0.3s ease;

        .template-item:hover & {
          opacity: 1;
        }
      }
    }
  }

  .template-detail-card {
    height: calc(100vh - 300px);
    overflow: hidden;

    .template-actions {
      display: flex;
      gap: 8px;
    }

    .template-content {
      height: calc(100% - 60px);
      overflow-y: auto;

      .template-basic-info {
        margin-bottom: 24px;
      }

      .template-permissions {
        h4 {
          margin-bottom: 16px;
          color: #2c3e50;
        }

        .permission-list {
          .permission-category {
            margin-bottom: 24px;
            padding: 16px;
            background: #f5f7fa;
            border-radius: 6px;

            h5 {
              margin-bottom: 12px;
              color: #2c3e50;
            }

            .permission-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
              gap: 12px;

              .permission-item {
                .permission-name {
                  display: block;
                  font-weight: 500;
                  color: #2c3e50;
                  margin-bottom: 4px;
                }

                .permission-description {
                  font-size: 12px;
                  color: #909399;
                }
              }
            }
          }
        }

        .permission-stats {
          .chart-container {
            height: 300px;
          }
        }

        .usage-history {
          .history-content {
            .history-action {
              font-weight: 500;
              color: #2c3e50;
              margin-bottom: 4px;
            }

            .history-operator {
              font-size: 12px;
              color: #909399;
            }
          }

          .no-history {
            padding: 40px;
            text-align: center;
          }
        }
      }
    }

    .no-template-selected {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .permission-config {
    .category-permissions {
      .category-header {
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e4e7ed;
      }
    }
  }

  .apply-template-form {
    h4 {
      margin-bottom: 8px;
      color: #2c3e50;
    }

    .template-desc {
      color: #606266;
      margin-bottom: 24px;
    }
  }

  :deep(.danger-item) {
    color: #f56c6c;
  }

  .import-content {
    padding: 24px 0;

    .import-step {
      min-height: 300px;

      .file-info {
        display: flex;
        align-items: center;
        padding: 16px;
        margin-top: 16px;
        background: #f5f7fa;
        border-radius: 8px;

        .file-name {
          flex: 1;
          margin-left: 12px;
          font-weight: 500;
          color: #2c3e50;
        }

        .file-size {
          color: #909399;
          font-size: 12px;
        }
      }

      .template-preview {
        h4 {
          margin-bottom: 12px;
          color: #2c3e50;
        }
      }

      .import-options {
        h4 {
          margin-bottom: 16px;
          color: #2c3e50;
        }
      }

      .import-stats {
        width: 100%;
        padding: 24px;
      }
    }

    .import-progress {
      padding: 24px;

      .progress-info {
        margin-top: 16px;
        text-align: center;

        p {
          margin: 8px 0;
          color: #606266;
        }
      }
    }
  }
}
</style>
