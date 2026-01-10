<template>
  <div class="suggestion-manage-page">
    <div class="header">
      <h2>建议分类管理</h2>
      <el-button type="primary" @click="showAddDialog" :icon="Plus"> 新增分类 </el-button>
    </div>

    <el-card>
      <el-table :data="categories" v-loading="loading" style="width: 100%">
        <el-table-column prop="order" label="排序" width="80" sortable />
        <el-table-column label="图标" width="80">
          <template #default="{ row }">
            <el-icon :style="{ color: row.color, fontSize: '20px' }">
              <component :is="getIconComponent(row.icon)" />
            </el-icon>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="分类名称" min-width="120" />
        <el-table-column prop="nameEn" label="英文标识" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="responsibleDepartment" label="负责部门" min-width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="averageProcessingTime" label="平均处理时间(天)" width="140" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editCategory(row)"> 编辑 </el-button>
            <el-button
              size="small"
              :type="row.isActive ? 'danger' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.isActive ? '禁用' : '启用' }}
            </el-button>
            <el-button size="small" type="danger" @click="deleteCategory(row)"> 删除 </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑分类对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑分类' : '新增分类'" width="600px">
      <el-form
        ref="categoryForm"
        :model="categoryFormData"
        :rules="categoryRules"
        label-width="120px"
      >
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="categoryFormData.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="英文标识" prop="nameEn">
          <el-input
            v-model="categoryFormData.nameEn"
            placeholder="请输入英文标识"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="categoryFormData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分类描述"
          />
        </el-form-item>
        <el-form-item label="图标">
          <el-select v-model="categoryFormData.icon" placeholder="请选择图标" style="width: 200px">
            <el-option
              v-for="icon in iconOptions"
              :key="icon.value"
              :label="icon.label"
              :value="icon.value"
            >
              <div style="display: flex; align-items: center">
                <el-icon style="margin-right: 8px">
                  <component :is="getIconComponent(icon.value)" />
                </el-icon>
                {{ icon.label }}
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="categoryFormData.color" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="categoryFormData.order" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="负责部门">
          <el-input v-model="categoryFormData.responsibleDepartment" placeholder="请输入负责部门" />
        </el-form-item>
        <el-form-item label="平均处理时间">
          <el-input-number v-model="categoryFormData.averageProcessingTime" :min="0" :max="365" />
          <span style="margin-left: 8px; color: #909399">天</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="categoryFormData.isActive" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveCategory" :loading="saving">
            {{ saving ? '保存中...' : '确定' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { reactive, ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus,
  Folder,
  House,
  Tools,
  TrendCharts,
  School,
  Monitor,
  PictureRounded,
  Bell,
  Setting,
} from '@element-plus/icons-vue';
import { suggestionApi } from '../api/suggestion';

export default {
  name: 'SuggestionCategoryManage',
  components: {
    Plus,
    Folder,
    House,
    Tools,
    TrendCharts,
    School,
    Monitor,
    PictureRounded,
    Bell,
    Setting,
  },
  setup() {
    const categoryForm = ref(null);
    const categories = ref([]);
    const loading = ref(false);
    const saving = ref(false);
    const dialogVisible = ref(false);
    const isEdit = ref(false);

    const categoryFormData = reactive({
      name: '',
      nameEn: '',
      description: '',
      icon: 'folder',
      color: '#007bff',
      order: 0,
      responsibleDepartment: '',
      averageProcessingTime: 0,
      isActive: true,
      village: 'default_village',
    });

    const categoryRules = reactive({
      name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
      nameEn: [
        { required: true, message: '请输入英文标识', trigger: 'blur' },
        { pattern: /^[a-z_]+$/, message: '英文标识只能包含小写字母和下划线', trigger: 'blur' },
      ],
    });

    const iconOptions = [
      { label: '文件夹', value: 'folder' },
      { label: '房屋', value: 'house' },
      { label: '工具', value: 'tools' },
      { label: '图表', value: 'trend-charts' },
      { label: '学校', value: 'school' },
      { label: '监控', value: 'monitor' },
      { label: '图片', value: 'picture-rounded' },
      { label: '铃铛', value: 'bell' },
      { label: '设置', value: 'setting' },
    ];

    const getIconComponent = iconName => {
      const iconMap = {
        folder: Folder,
        house: House,
        tools: Tools,
        'trend-charts': TrendCharts,
        school: School,
        monitor: Monitor,
        'picture-rounded': PictureRounded,
        bell: Bell,
        setting: Setting,
      };
      return iconMap[iconName] || Folder;
    };

    const loadCategories = async () => {
      try {
        loading.value = true;
        const response = await suggestionApi.getCategories(categoryFormData.village);
        categories.value = response.data.sort((a, b) => a.order - b.order);
      } catch (error) {
        ElMessage.error('加载分类失败：' + error.message);
      } finally {
        loading.value = false;
      }
    };

    const showAddDialog = () => {
      isEdit.value = false;
      resetForm();
      dialogVisible.value = true;
    };

    const editCategory = category => {
      isEdit.value = true;
      Object.assign(categoryFormData, category);
      dialogVisible.value = true;
    };

    const resetForm = () => {
      Object.assign(categoryFormData, {
        name: '',
        nameEn: '',
        description: '',
        icon: 'folder',
        color: '#007bff',
        order: categories.value.length,
        responsibleDepartment: '',
        averageProcessingTime: 0,
        isActive: true,
        village: 'default_village',
      });
      if (categoryForm.value) {
        categoryForm.value.resetFields();
      }
    };

    const saveCategory = async () => {
      try {
        const valid = await categoryForm.value.validate();
        if (!valid) return;

        saving.value = true;

        if (isEdit.value) {
          await suggestionApi.updateCategory(categoryFormData._id, categoryFormData);
          ElMessage.success('分类更新成功');
        } else {
          await suggestionApi.createCategory(categoryFormData);
          ElMessage.success('分类创建成功');
        }

        dialogVisible.value = false;
        await loadCategories();
      } catch (error) {
        ElMessage.error('保存失败：' + error.message);
      } finally {
        saving.value = false;
      }
    };

    const toggleStatus = async category => {
      try {
        const action = category.isActive ? '禁用' : '启用';
        await ElMessageBox.confirm(`确定要${action}分类"${category.name}"吗？`, '确认操作', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        });

        await suggestionApi.updateCategory(category._id, {
          ...category,
          isActive: !category.isActive,
        });

        ElMessage.success(`${action}成功`);
        await loadCategories();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('操作失败：' + error.message);
        }
      }
    };

    const deleteCategory = async category => {
      try {
        await ElMessageBox.confirm(
          `确定要删除分类"${category.name}"吗？删除后该分类下的建议将无法正常显示。`,
          '警告',
          {
            confirmButtonText: '确定删除',
            cancelButtonText: '取消',
            type: 'warning',
          }
        );

        await suggestionApi.deleteCategory(category._id);
        ElMessage.success('删除成功');
        await loadCategories();
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error('删除失败：' + error.message);
        }
      }
    };

    onMounted(() => {
      loadCategories();
    });

    return {
      categories,
      loading,
      saving,
      dialogVisible,
      isEdit,
      categoryFormData,
      categoryRules,
      iconOptions,
      categoryForm,
      Plus,
      getIconComponent,
      showAddDialog,
      editCategory,
      saveCategory,
      toggleStatus,
      deleteCategory,
    };
  },
};
</script>

<style scoped>
.suggestion-manage-page {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  color: #2c3e50;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
