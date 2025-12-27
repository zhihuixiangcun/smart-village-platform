<template>
  <div class="family-relation-manage">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <h2>亲属代理管理</h2>
        <p>管理家庭成员间的代理权限和访问控制</p>
      </div>
      <div class="header-actions">
        <button @click="showCreateModal = true" class="btn-primary">
          <i class="fas fa-plus"></i> 新建代理关系
        </button>
        <button @click="refreshData" class="btn-secondary" :disabled="isLoading">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': isLoading }"></i> 刷新
        </button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-users"></i>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalRelations }}</div>
          <div class="stat-label">总代理关系</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon active">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.activeRelations }}</div>
          <div class="stat-label">活跃代理</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-clock"></i>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.expiringSoon }}</div>
          <div class="stat-label">即将过期</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-user-shield"></i>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.myPermissions }}</div>
          <div class="stat-label">我的权限</div>
        </div>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filter-section">
      <div class="filter-left">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input
            v-model="searchKeyword"
            @input="handleSearch"
            placeholder="搜索姓名、关系类型..."
            type="text"
          />
        </div>
        <div class="filter-dropdown">
          <select v-model="filterType" @change="handleFilter">
            <option value="">所有类型</option>
            <option value="principal">我是被代理者</option>
            <option value="agent">我是代理者</option>
          </select>
        </div>
        <div class="filter-dropdown">
          <select v-model="filterStatus" @change="handleFilter">
            <option value="">所有状态</option>
            <option value="active">活跃</option>
            <option value="inactive">非活跃</option>
            <option value="expired">已过期</option>
          </select>
        </div>
      </div>
      <div class="filter-right">
        <button @click="exportData" class="btn-outline">
          <i class="fas fa-download"></i> 导出
        </button>
      </div>
    </div>

    <!-- 关系列表 -->
    <div class="relations-table">
      <div class="table-header">
        <h3>代理关系列表</h3>
        <div class="table-info">
          共 {{ filteredRelations.length }} 条记录
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>关系信息</th>
              <th>代理类型</th>
              <th>权限范围</th>
              <th>状态</th>
              <th>有效期</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!isLoading && filteredRelations.length === 0">
              <td colspan="7" class="empty-state">
                <div class="empty-content">
                  <i class="fas fa-users-slash"></i>
                  <p>暂无代理关系</p>
                  <button @click="showCreateModal = true" class="btn-primary">
                    创建第一个代理关系
                  </button>
                </div>
              </td>
            </tr>
            <tr v-for="relation in paginatedRelations" :key="relation._id" v-else>
              <td>
                <div class="relation-info">
                  <div class="relation-users">
                    <div class="user-chip">
                      <i class="fas fa-user"></i>
                      <span>{{ relation.principalUserName }}</span>
                    </div>
                    <i class="fas fa-arrow-right relation-arrow"></i>
                    <div class="user-chip agent">
                      <i class="fas fa-user-shield"></i>
                      <span>{{ relation.agentUserName }}</span>
                    </div>
                  </div>
                  <div class="relation-type">
                    {{ getRelationTypeText(relation.relationType) }}
                  </div>
                </div>
              </td>
              <td>
                <span class="permission-badge" :class="getRelationTypeClass(relation.relationType)">
                  {{ getRelationTypeText(relation.relationType) }}
                </span>
              </td>
              <td>
                <div class="permission-list">
                  <span
                    v-for="permission in relation.permissions.queryPermissions.slice(0, 2)"
                    :key="permission"
                    class="permission-tag"
                  >
                    {{ getPermissionText(permission) }}
                  </span>
                  <span v-if="relation.permissions.queryPermissions.length > 2" class="permission-more">
                    +{{ relation.permissions.queryPermissions.length - 2 }}
                  </span>
                </div>
              </td>
              <td>
                <span class="status-badge" :class="relation.status">
                  {{ getStatusText(relation.status) }}
                </span>
              </td>
              <td>
                <div class="date-info">
                  <div v-if="relation.expiresAt">
                    {{ formatDate(relation.expiresAt) }}
                    <span
                      v-if="isExpiringSoon(relation.expiresAt)"
                      class="expiring-warning"
                    >
                      <i class="fas fa-exclamation-triangle"></i>
                      即将过期
                    </span>
                  </div>
                  <span v-else class="permanent">永久</span>
                </div>
              </td>
              <td>{{ formatDate(relation.createdAt) }}</td>
              <td>
                <div class="action-buttons">
                  <button @click="viewRelation(relation)" class="btn-icon" title="查看详情">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button @click="editRelation(relation)" class="btn-icon" title="编辑">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button
                    @click="deleteRelation(relation)"
                    class="btn-icon danger"
                    title="删除"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="pagination" v-if="totalPages > 1">
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="page-btn"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        <button
          @click="currentPage++"
          :disabled="currentPage === totalPages"
          class="page-btn"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- 创建/编辑模态框 -->
    <CreateRelationModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onRelationCreated"
      :editData="editRelationData"
    />

    <!-- 详情模态框 -->
    <RelationDetailModal
      v-if="showDetailModal"
      :relation="selectedRelation"
      @close="showDetailModal = false"
    />
  </div>
</template>

<script>
import { familyRelationAPI } from '@/api/faceRecognition';
import CreateRelationModal from '@/components/FamilyRelation/CreateRelationModal.vue';
import RelationDetailModal from '@/components/FamilyRelation/RelationDetailModal.vue';

export default {
  name: 'FamilyRelationManage',
  components: {
    CreateRelationModal,
    RelationDetailModal
  },
  data() {
    return {
      isLoading: false,
      relations: [],
      searchKeyword: '',
      filterType: '',
      filterStatus: '',
      currentPage: 1,
      pageSize: 10,

      // 模态框状态
      showCreateModal: false,
      showDetailModal: false,
      editRelationData: null,
      selectedRelation: null,

      // 统计信息
      stats: {
        totalRelations: 0,
        activeRelations: 0,
        expiringSoon: 0,
        myPermissions: 0
      }
    };
  },
  computed: {
    filteredRelations() {
      let filtered = this.relations;

      // 搜索过滤
      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase();
        filtered = filtered.filter(relation =>
          relation.principalUserName.toLowerCase().includes(keyword) ||
          relation.agentUserName.toLowerCase().includes(keyword) ||
          relation.relationType.toLowerCase().includes(keyword)
        );
      }

      // 类型过滤
      if (this.filterType) {
        const currentUserId = this.$store.state.user.id;
        filtered = filtered.filter(relation => {
          if (this.filterType === 'principal') {
            return relation.principalUserId === currentUserId;
          } else if (this.filterType === 'agent') {
            return relation.agentUserId === currentUserId;
          }
          return true;
        });
      }

      // 状态过滤
      if (this.filterStatus) {
        filtered = filtered.filter(relation => relation.status === this.filterStatus);
      }

      return filtered;
    },

    totalPages() {
      return Math.ceil(this.filteredRelations.length / this.pageSize);
    },

    paginatedRelations() {
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.filteredRelations.slice(start, end);
    }
  },
  async mounted() {
    await this.loadRelations();
    this.calculateStats();
  },
  methods: {
    // 加载代理关系数据
    async loadRelations() {
      try {
        this.isLoading = true;
        const response = await familyRelationAPI.getRelations({
          villageId: this.$store.state.user.villageId
        });
        this.relations = response.data.map(relation => ({
          ...relation,
          principalUserName: relation.principalUserId?.name || '未知用户',
          agentUserName: relation.agentUserId?.name || '未知用户'
        }));
      } catch (error) {
        console.error('加载代理关系失败:', error);
        this.$message.error('加载数据失败: ' + error.message);
      } finally {
        this.isLoading = false;
      }
    },

    // 刷新数据
    async refreshData() {
      await this.loadRelations();
      this.calculateStats();
    },

    // 计算统计信息
    calculateStats() {
      const now = new Date();
      const currentUserId = this.$store.state.user.id;

      this.stats = {
        totalRelations: this.relations.length,
        activeRelations: this.relations.filter(r => r.status === 'active').length,
        expiringSoon: this.relations.filter(r => {
          if (!r.expiresAt) return false;
          const expiryDate = new Date(r.expiresAt);
          const daysUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24);
          return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
        }).length,
        myPermissions: this.relations.filter(r =>
          r.agentUserId === currentUserId && r.status === 'active'
        ).length
      };
    },

    // 搜索处理
    handleSearch() {
      this.currentPage = 1;
    },

    // 筛选处理
    handleFilter() {
      this.currentPage = 1;
    },

    // 查看关系详情
    viewRelation(relation) {
      this.selectedRelation = relation;
      this.showDetailModal = true;
    },

    // 编辑关系
    editRelation(relation) {
      this.editRelationData = relation;
      this.showCreateModal = true;
    },

    // 删除关系
    async deleteRelation(relation) {
      const confirmed = await this.$confirm(
        '确定要删除此代理关系吗？',
        '删除代理关系',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      );

      if (!confirmed) return;

      try {
        await familyRelationAPI.deleteRelation(relation._id);
        this.$message.success('代理关系删除成功');
        await this.loadRelations();
        this.calculateStats();
      } catch (error) {
        console.error('删除代理关系失败:', error);
        this.$message.error('删除失败: ' + error.message);
      }
    },

    // 关系创建完成
    onRelationCreated() {
      this.showCreateModal = false;
      this.editRelationData = null;
      this.loadRelations();
      this.calculateStats();
    },

    // 导出数据
    exportData() {
      const data = this.filteredRelations.map(relation => ({
        被代理者: relation.principalUserName,
        代理者: relation.agentUserName,
        关系类型: this.getRelationTypeText(relation.relationType),
        查询权限: relation.permissions.queryPermissions.map(p => this.getPermissionText(p)).join(', '),
        操作权限: relation.permissions.actionPermissions.map(p => this.getPermissionText(p)).join(', '),
        状态: this.getStatusText(relation.status),
        过期时间: relation.expiresAt ? this.formatDate(relation.expiresAt) : '永久',
        创建时间: this.formatDate(relation.createdAt)
      }));

      this.exportToCSV(data, '代理关系列表');
    },

    // 导出为CSV
    exportToCSV(data, filename) {
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${this.formatDate(new Date())}.csv`;
      link.click();
    },

    // 获取关系类型文本
    getRelationTypeText(type) {
      const types = {
        spouse: '配偶',
        parent: '父母',
        child: '子女',
        sibling: '兄弟姐妹',
        grandparent: '祖父母',
        grandchild: '孙子女',
        guardian: '监护人',
        other: '其他'
      };
      return types[type] || type;
    },

    // 获取关系类型样式类
    getRelationTypeClass(type) {
      const classes = {
        spouse: 'spouse',
        parent: 'parent',
        child: 'child',
        sibling: 'sibling',
        guardian: 'guardian',
        other: 'other'
      };
      return classes[type] || 'other';
    },

    // 获取权限文本
    getPermissionText(permission) {
      const permissions = {
        basic_info: '基本信息',
        contact_info: '联系方式',
        health_info: '健康信息',
        financial_info: '财务信息',
        government_info: '政务信息',
        family_info: '家庭信息',
        view_info: '查看信息',
        update_info: '更新信息',
        submit_application: '提交申请',
        approve_application: '审批申请',
        view_documents: '查看文档',
        sign_documents: '签署文档'
      };
      return permissions[permission] || permission;
    },

    // 获取状态文本
    getStatusText(status) {
      const statuses = {
        active: '活跃',
        inactive: '非活跃',
        suspended: '暂停',
        expired: '已过期'
      };
      return statuses[status] || status;
    },

    // 检查是否即将过期
    isExpiringSoon(expiresAt) {
      if (!expiresAt) return false;
      const now = new Date();
      const expiryDate = new Date(expiresAt);
      const daysUntilExpiry = (expiryDate - now) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
    },

    // 格式化日期
    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleString('zh-CN');
    }
  }
};
</script>

<style scoped>
.family-relation-manage {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.header-content h2 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 24px;
}

.header-content p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-primary, .btn-secondary, .btn-outline {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #2196f3;
  color: white;
}

.btn-primary:hover {
  background: #1976d2;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  background: white;
  color: #2196f3;
  border: 1px solid #2196f3;
}

.btn-outline:hover {
  background: #2196f3;
  color: white;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 20px;
}

.stat-icon.active {
  background: #e8f5e8;
  color: #4caf50;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-left {
  display: flex;
  gap: 15px;
  align-items: center;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box i {
  position: absolute;
  left: 12px;
  color: #999;
}

.search-box input {
  padding: 10px 12px 10px 35px;
  border: 1px solid #ddd;
  border-radius: 6px;
  width: 250px;
  font-size: 14px;
}

.filter-dropdown select {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  min-width: 120px;
}

.relations-table {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.table-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.table-info {
  color: #666;
  font-size: 14px;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: 15px;
  background: #f8f9fa;
  font-weight: 500;
  color: #333;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.data-table td {
  padding: 15px;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.data-table tr:hover {
  background: #f8f9fa;
}

.relation-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.relation-users {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f0f0f0;
  border-radius: 16px;
  font-size: 12px;
}

.user-chip.agent {
  background: #e3f2fd;
  color: #1976d2;
}

.relation-arrow {
  color: #999;
}

.relation-type {
  font-size: 12px;
  color: #666;
}

.permission-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.permission-badge.spouse { background: #fce4ec; color: #c2185b; }
.permission-badge.parent { background: #e8f5e8; color: #2e7d32; }
.permission-badge.child { background: #e3f2fd; color: #1565c0; }
.permission-badge.sibling { background: #fff3e0; color: #ef6c00; }
.permission-badge.guardian { background: #f3e5f5; color: #7b1fa2; }
.permission-badge.other { background: #f5f5f5; color: #616161; }

.permission-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.permission-tag {
  padding: 2px 6px;
  background: #f0f0f0;
  border-radius: 3px;
  font-size: 11px;
  color: #666;
}

.permission-more {
  padding: 2px 6px;
  background: #e0e0e0;
  border-radius: 3px;
  font-size: 11px;
  color: #999;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active { background: #e8f5e8; color: #2e7d32; }
.status-badge.inactive { background: #f5f5f5; color: #616161; }
.status-badge.suspended { background: #fff3e0; color: #ef6c00; }
.status-badge.expired { background: #ffebee; color: #c62828; }

.date-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.expiring-warning {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #f57c00;
  font-size: 11px;
}

.permanent {
  color: #4caf50;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: #f0f0f0;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: #e0e0e0;
}

.btn-icon.danger {
  color: #f44336;
}

.btn-icon.danger:hover {
  background: #ffebee;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-content {
  max-width: 400px;
  margin: 0 auto;
}

.empty-content i {
  font-size: 48px;
  color: #ccc;
  margin-bottom: 16px;
}

.empty-content p {
  color: #666;
  margin-bottom: 20px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border-top: 1px solid #eee;
}

.page-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: #f0f0f0;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #666;
}
</style>