<template>
  <div class="suggestion-list">
    <!-- 页面标题和操作 -->
    <div class="list-header">
      <h1>建议征集</h1>
      <div class="header-actions">
        <el-button type="primary" @click="goToSubmit" icon="el-icon-edit"> 提交建议 </el-button>
        <el-button v-if="canManage" @click="goToManage" icon="el-icon-setting">
          分类管理
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon submitted">
          <i class="el-icon-document"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ statistics.total || 0 }}</div>
          <div class="stat-label">建议总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon pending">
          <i class="el-icon-time"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ statistics.pending || 0 }}</div>
          <div class="stat-label">待处理</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon processing">
          <i class="el-icon-loading"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ statistics.processing || 0 }}</div>
          <div class="stat-label">处理中</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon completed">
          <i class="el-icon-circle-check"></i>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ statistics.completed || 0 }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filter-section">
      <el-row :gutter="16">
        <el-col :span="4">
          <el-select v-model="filters.status" @change="loadSuggestions" placeholder="状态筛选">
            <el-option label="全部状态" value="all"></el-option>
            <el-option label="已提交" value="submitted"></el-option>
            <el-option label="审核中" value="under_review"></el-option>
            <el-option label="已通过" value="approved"></el-option>
            <el-option label="已拒绝" value="rejected"></el-option>
            <el-option label="实施中" value="in_progress"></el-option>
            <el-option label="已完成" value="completed"></el-option>
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filters.category" @change="loadSuggestions" placeholder="分类筛选">
            <el-option label="全部分类" value=""></el-option>
            <el-option
              v-for="category in categories"
              :key="category._id"
              :label="category.name"
              :value="category._id"
            ></el-option>
          </el-select>
        </el-col>
        <el-col :span="3">
          <el-select v-model="filters.priority" @change="loadSuggestions" placeholder="优先级">
            <el-option label="全部优先级" value=""></el-option>
            <el-option label="低优先级" value="low"></el-option>
            <el-option label="中优先级" value="medium"></el-option>
            <el-option label="高优先级" value="high"></el-option>
            <el-option label="紧急" value="urgent"></el-option>
          </el-select>
        </el-col>
        <el-col :span="3">
          <el-select v-model="filters.dateRange" @change="loadSuggestions" placeholder="时间范围">
            <el-option label="全部时间" value="all"></el-option>
            <el-option label="本周" value="week"></el-option>
            <el-option label="本月" value="month"></el-option>
            <el-option label="本季度" value="quarter"></el-option>
            <el-option label="本年" value="year"></el-option>
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-input
            v-model="filters.search"
            @keyup.enter="loadSuggestions"
            placeholder="搜索建议标题或内容"
            clearable
          >
            <template #append>
              <el-button @click="loadSuggestions" icon="el-icon-search"></el-button>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-button @click="resetFilters">重置筛选</el-button>
        </el-col>
      </el-row>

      <!-- 排序选项 -->
      <div class="sort-options">
        <span>排序：</span>
        <el-radio-group v-model="sortBy" @change="loadSuggestions" size="small">
          <el-radio-button label="submittedAt">提交时间</el-radio-button>
          <el-radio-button label="priority">优先级</el-radio-button>
          <el-radio-button label="evaluation.overallScore">评分</el-radio-button>
          <el-radio-button label="feedback.likes">热度</el-radio-button>
        </el-radio-group>
        <el-radio-group v-model="sortOrder" @change="loadSuggestions" size="small">
          <el-radio-button label="desc">降序</el-radio-button>
          <el-radio-button label="asc">升序</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- 建议列表 -->
    <div class="suggestions-content" v-loading="loading">
      <el-empty v-if="suggestions.length === 0 && !loading" description="暂无建议">
        <el-button type="primary" @click="goToSubmit">提交第一个建议</el-button>
      </el-empty>

      <div class="suggestions-grid" v-else>
        <div
          v-for="suggestion in suggestions"
          :key="suggestion._id"
          class="suggestion-card"
          :class="{
            'high-priority': suggestion.priority === 'high' || suggestion.priority === 'urgent',
            completed: suggestion.status === 'completed',
          }"
          @click="viewSuggestion(suggestion._id)"
        >
          <!-- 卡片头部 -->
          <div class="card-header">
            <div class="suggestion-status">
              <el-tag :type="getStatusType(suggestion.status)" size="small">
                {{ getStatusText(suggestion.status) }}
              </el-tag>
              <el-tag v-if="suggestion.priority === 'urgent'" type="danger" size="small">
                紧急
              </el-tag>
              <el-tag v-if="suggestion.priority === 'high'" type="warning" size="small">
                高优先级
              </el-tag>
            </div>
            <div class="suggestion-category">
              <el-tag :color="suggestion.category?.color" size="mini" effect="light">
                <i :class="suggestion.category?.icon"></i>
                {{ suggestion.category?.name }}
              </el-tag>
            </div>
          </div>

          <!-- 卡片内容 -->
          <div class="card-body">
            <h3 class="suggestion-title">{{ suggestion.title }}</h3>
            <p class="suggestion-content">{{ suggestion.content }}</p>

            <!-- 进度条（如果在实施中） -->
            <div v-if="suggestion.status === 'in_progress'" class="progress-section">
              <div class="progress-label">
                <span>实施进度</span>
                <span>{{ suggestion.implementation?.progress || 0 }}%</span>
              </div>
              <el-progress
                :percentage="suggestion.implementation?.progress || 0"
                :stroke-width="6"
                :show-text="false"
              ></el-progress>
              <div class="current-phase">
                {{ suggestion.implementation?.currentPhase || '准备阶段' }}
              </div>
            </div>

            <!-- 评估分数 -->
            <div v-if="suggestion.evaluation?.overallScore" class="evaluation-score">
              <span>综合评分：</span>
              <el-rate
                :value="suggestion.evaluation.overallScore"
                disabled
                show-score
                text-color="#ff9900"
              ></el-rate>
            </div>
          </div>

          <!-- 卡片底部 -->
          <div class="card-footer">
            <div class="submitter-info">
              <el-avatar :src="suggestion.submitter?.avatar" :size="24">
                {{ suggestion.submitter?.realName?.charAt(0) }}
              </el-avatar>
              <span class="submitter-name">{{ suggestion.submitter?.realName }}</span>
              <span class="submit-time">{{ formatDateTime(suggestion.submittedAt) }}</span>
            </div>

            <div class="interaction-stats">
              <span class="stat-item">
                <i class="el-icon-view"></i>
                {{ suggestion.feedback?.views || 0 }}
              </span>
              <span class="stat-item" @click.stop="likeSuggestion(suggestion._id)">
                <i class="el-icon-thumb" :class="{ liked: hasLiked(suggestion) }"></i>
                {{ suggestion.feedback?.likes?.length || 0 }}
              </span>
              <span class="stat-item">
                <i class="el-icon-chat-dot-round"></i>
                {{ suggestion.feedback?.comments?.length || 0 }}
              </span>
            </div>
          </div>

          <!-- 管理操作（仅管理员可见） -->
          <div v-if="canManage && showManageActions" class="manage-actions">
            <el-button
              v-if="suggestion.status === 'submitted'"
              type="primary"
              size="mini"
              @click.stop="evaluateSuggestion(suggestion._id)"
            >
              评估
            </el-button>
            <el-button
              v-if="suggestion.status === 'approved'"
              type="success"
              size="mini"
              @click.stop="startImplementation(suggestion._id)"
            >
              开始实施
            </el-button>
            <el-button
              v-if="suggestion.status === 'in_progress'"
              type="warning"
              size="mini"
              @click.stop="updateProgress(suggestion._id)"
            >
              更新进度
            </el-button>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-section" v-if="pagination.total > 0">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="pagination.page"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pagination.limit"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
        >
        </el-pagination>
      </div>
    </div>

    <!-- 我的建议快速入口 -->
    <div class="quick-actions">
      <el-button type="text" @click="goToMySuggestions" class="my-suggestions-btn">
        <i class="el-icon-user"></i>
        我的建议 ({{ myStats.total || 0 }})
      </el-button>
    </div>
  </div>
</template>

<script>
import { suggestionAPI } from '@/api/suggestion';
import { formatDate, formatDateTime } from '@/utils/dateUtils';

export default {
  name: 'SuggestionList',
  data() {
    return {
      loading: false,
      suggestions: [],
      categories: [],
      statistics: {},
      myStats: {},
      filters: {
        status: 'all',
        category: '',
        priority: '',
        dateRange: 'all',
        search: '',
      },
      sortBy: 'submittedAt',
      sortOrder: 'desc',
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      },
      showManageActions: false,
    };
  },
  computed: {
    canManage() {
      return (
        this.$store.getters.userRole === 'committee' || this.$store.getters.userRole === 'admin'
      );
    },
  },
  async mounted() {
    await this.loadCategories();
    await this.loadSuggestions();
    await this.loadStatistics();
    await this.loadMyStats();
  },
  methods: {
    async loadCategories() {
      try {
        const response = await suggestionAPI.getActiveCategories();
        if (response.data.success) {
          this.categories = response.data.data;
        }
      } catch (error) {
        console.error('获取分类失败:', error);
      }
    },

    async loadSuggestions() {
      this.loading = true;
      try {
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          sortBy: this.sortBy,
          sortOrder: this.sortOrder,
          ...this.filters,
        };

        // 清理空参数
        Object.keys(params).forEach(key => {
          if (params[key] === '' || params[key] === 'all') {
            delete params[key];
          }
        });

        const response = await suggestionAPI.getSuggestionList(params);

        if (response.data.success) {
          this.suggestions = response.data.data.suggestions;
          this.pagination = response.data.data.pagination;
        }
      } catch (error) {
        this.$message.error('获取建议列表失败');
        console.error(error);
      } finally {
        this.loading = false;
      }
    },

    async loadStatistics() {
      try {
        const response = await suggestionAPI.getStatistics({ dateRange: 30 });
        if (response.data.success) {
          const stats = response.data.data.baseStatistics;

          this.statistics = {
            total: stats.reduce((sum, stat) => sum + stat.count, 0),
            pending: stats
              .filter(s => ['submitted', 'under_review'].includes(s._id))
              .reduce((sum, stat) => sum + stat.count, 0),
            processing: stats
              .filter(s => ['approved', 'in_progress'].includes(s._id))
              .reduce((sum, stat) => sum + stat.count, 0),
            completed: stats.find(s => s._id === 'completed')?.count || 0,
          };
        }
      } catch (error) {
        console.error('获取统计数据失败:', error);
      }
    },

    async loadMyStats() {
      try {
        const response = await suggestionAPI.getMySuggestions({ page: 1, limit: 1 });
        if (response.data.success) {
          this.myStats = response.data.data.pagination;
        }
      } catch (error) {
        console.error('获取我的建议统计失败:', error);
      }
    },

    resetFilters() {
      this.filters = {
        status: 'all',
        category: '',
        priority: '',
        dateRange: 'all',
        search: '',
      };
      this.sortBy = 'submittedAt';
      this.sortOrder = 'desc';
      this.pagination.page = 1;
      this.loadSuggestions();
    },

    handleSizeChange(newSize) {
      this.pagination.limit = newSize;
      this.pagination.page = 1;
      this.loadSuggestions();
    },

    handleCurrentChange(newPage) {
      this.pagination.page = newPage;
      this.loadSuggestions();
    },

    viewSuggestion(suggestionId) {
      this.$router.push(`/suggestions/${suggestionId}`);
    },

    async likeSuggestion(suggestionId) {
      try {
        const response = await suggestionAPI.likeSuggestion(suggestionId);
        if (response.data.success) {
          // 更新本地数据
          const suggestion = this.suggestions.find(s => s._id === suggestionId);
          if (suggestion) {
            const userId = this.$store.getters.userId;
            const hasLiked = suggestion.feedback?.likes?.some(like => like.user === userId);

            if (hasLiked) {
              // 移除点赞
              suggestion.feedback.likes = suggestion.feedback.likes.filter(
                like => like.user !== userId
              );
            } else {
              // 添加点赞
              if (!suggestion.feedback) suggestion.feedback = { likes: [] };
              suggestion.feedback.likes.push({ user: userId });
            }
          }
        }
      } catch (error) {
        this.$message.error('操作失败');
        console.error(error);
      }
    },

    hasLiked(suggestion) {
      const userId = this.$store.getters.userId;
      return suggestion.feedback?.likes?.some(like => like.user === userId);
    },

    goToSubmit() {
      this.$router.push('/suggestions/submit');
    },

    goToManage() {
      this.$router.push('/suggestions/manage');
    },

    goToMySuggestions() {
      this.$router.push('/suggestions/my');
    },

    evaluateSuggestion(suggestionId) {
      this.$router.push(`/suggestions/${suggestionId}/evaluate`);
    },

    startImplementation(suggestionId) {
      this.$router.push(`/suggestions/${suggestionId}/implement`);
    },

    updateProgress(suggestionId) {
      this.$router.push(`/suggestions/${suggestionId}/progress`);
    },

    getStatusType(status) {
      const statusTypes = {
        submitted: 'primary',
        under_review: 'warning',
        approved: 'success',
        rejected: 'danger',
        in_progress: 'warning',
        completed: 'success',
        archived: 'info',
      };
      return statusTypes[status] || 'info';
    },

    getStatusText(status) {
      const statusTexts = {
        submitted: '已提交',
        under_review: '审核中',
        approved: '已通过',
        rejected: '已拒绝',
        in_progress: '实施中',
        completed: '已完成',
        archived: '已归档',
      };
      return statusTexts[status] || '未知';
    },

    formatDate,
    formatDateTime,
  },
};
</script>

<style scoped>
.suggestion-list {
  padding: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-header h1 {
  margin: 0;
  color: #333;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.submitted {
  background: #409eff;
}
.stat-icon.pending {
  background: #e6a23c;
}
.stat-icon.processing {
  background: #f56c6c;
}
.stat-icon.completed {
  background: #67c23a;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.filter-section {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.sort-options {
  margin-top: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.suggestions-content {
  min-height: 400px;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.suggestion-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  border-left: 4px solid #ddd;
  position: relative;
}

.suggestion-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.suggestion-card.high-priority {
  border-left-color: #f56c6c;
}

.suggestion-card.completed {
  border-left-color: #67c23a;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.suggestion-status {
  display: flex;
  gap: 8px;
}

.suggestion-title {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 16px;
  line-height: 1.4;
}

.suggestion-content {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 15px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.progress-section {
  margin-bottom: 15px;
  padding: 10px;
  background: #f0f9ff;
  border-radius: 6px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
}

.current-phase {
  margin-top: 5px;
  font-size: 12px;
  color: #409eff;
}

.evaluation-score {
  margin-bottom: 15px;
  font-size: 14px;
  color: #666;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.submitter-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.submitter-name {
  font-size: 14px;
  color: #333;
}

.submit-time {
  font-size: 12px;
  color: #999;
}

.interaction-stats {
  display: flex;
  gap: 15px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
}

.stat-item.liked {
  color: #f56c6c;
}

.manage-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 5px;
}

.pagination-section {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

.quick-actions {
  position: fixed;
  bottom: 30px;
  right: 30px;
}

.my-suggestions-btn {
  background: #409eff;
  color: white;
  border-radius: 25px;
  padding: 12px 20px;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.my-suggestions-btn:hover {
  background: #66b1ff;
  color: white;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .suggestion-list {
    padding: 10px;
  }

  .list-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stat-card {
    padding: 15px;
  }

  .suggestions-grid {
    grid-template-columns: 1fr;
  }

  .filter-section .el-row .el-col {
    margin-bottom: 10px;
  }

  .sort-options {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
