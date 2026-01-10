<template>
  <div class="voting-list">
    <!-- 页面标题和操作 -->
    <div class="voting-header">
      <h1>村务投票</h1>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true" v-if="canCreateVote">
          <i class="el-icon-plus"></i>
          创建投票
        </el-button>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="voting-filters">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-select v-model="filters.status" @change="loadVotes" placeholder="投票状态">
            <el-option label="全部" value="all"></el-option>
            <el-option label="进行中" value="active"></el-option>
            <el-option label="即将开始" value="upcoming"></el-option>
            <el-option label="已结束" value="ended"></el-option>
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filters.category" @change="loadVotes" placeholder="投票分类">
            <el-option label="全部" value=""></el-option>
            <el-option label="村务事项" value="village_affairs"></el-option>
            <el-option label="基础设施" value="infrastructure"></el-option>
            <el-option label="财务决策" value="finance"></el-option>
            <el-option label="政策表决" value="policy"></el-option>
            <el-option label="选举投票" value="election"></el-option>
            <el-option label="其他" value="other"></el-option>
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-input
            v-model="filters.search"
            @keyup.enter="loadVotes"
            placeholder="搜索投票标题或内容"
            clearable
          >
            <template #append>
              <el-button @click="loadVotes" icon="el-icon-search"></el-button>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-button @click="resetFilters">重置</el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 投票列表 -->
    <div class="voting-content" v-loading="loading">
      <el-empty v-if="votes.length === 0 && !loading" description="暂无投票"></el-empty>

      <div class="vote-grid" v-else>
        <div
          v-for="vote in votes"
          :key="vote._id"
          class="vote-card"
          :class="{
            active: vote.isActive,
            ended: vote.isEnded,
            upcoming: vote.isUpcoming,
          }"
        >
          <div class="vote-card-header">
            <div class="vote-status">
              <el-tag :type="getStatusType(vote)" size="small">
                {{ getStatusText(vote) }}
              </el-tag>
              <el-tag v-if="vote.hasVoted" type="success" size="small"> 已投票 </el-tag>
            </div>
            <div class="vote-priority">
              <el-rate
                v-model="vote.priority || 3"
                :max="5"
                disabled
                show-text
                text-template="{value}星"
              ></el-rate>
            </div>
          </div>

          <div class="vote-card-body">
            <h3 class="vote-title" @click="viewVote(vote._id)">
              {{ vote.title }}
            </h3>
            <p class="vote-description">{{ vote.description }}</p>

            <div class="vote-meta">
              <div class="vote-info">
                <span><i class="el-icon-user"></i> {{ vote.creator }}</span>
                <span><i class="el-icon-time"></i> {{ formatDate(vote.createdAt) }}</span>
                <span
                  ><i class="el-icon-collection-tag"></i> {{ getVoteTypeText(vote.voteType) }}</span
                >
              </div>

              <div class="vote-stats">
                <span class="stat-item">
                  <i class="el-icon-s-data"></i>
                  参与率: {{ vote.participationRate }}%
                </span>
                <span class="stat-item">
                  <i class="el-icon-user-solid"></i>
                  {{ vote.totalVoted }}/{{ vote.totalEligibleVoters }}
                </span>
              </div>
            </div>

            <div class="vote-timing" v-if="vote.timeRemaining">
              <el-progress
                :percentage="getProgressPercentage(vote)"
                :status="vote.isActive ? 'success' : 'warning'"
                :stroke-width="6"
              ></el-progress>
              <div class="time-remaining">
                剩余时间: {{ formatTimeRemaining(vote.timeRemaining) }}
              </div>
            </div>
          </div>

          <div class="vote-card-footer">
            <div class="vote-tags">
              <el-tag v-for="tag in vote.tags" :key="tag" size="mini" type="info">
                {{ tag }}
              </el-tag>
            </div>

            <div class="vote-actions">
              <el-button size="small" @click="viewVote(vote._id)"> 查看详情 </el-button>
              <el-button
                v-if="vote.isActive && !vote.hasVoted"
                type="primary"
                size="small"
                @click="participateVote(vote._id)"
              >
                立即投票
              </el-button>
              <el-button
                v-if="vote.hasVoted || vote.isEnded"
                type="success"
                size="small"
                @click="viewResults(vote._id)"
              >
                查看结果
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="voting-pagination" v-if="pagination.total > 0">
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

    <!-- 创建投票对话框 -->
    <VoteCreateDialog :visible.sync="showCreateDialog" @created="handleVoteCreated" />
  </div>
</template>

<script>
import { votingAPI } from '@/api/voting';
import VoteCreateDialog from './VoteCreateDialog.vue';
import { formatDate } from '@/utils/dateUtils';

export default {
  name: 'VotingList',
  components: {
    VoteCreateDialog,
  },
  data() {
    return {
      loading: false,
      showCreateDialog: false,
      votes: [],
      filters: {
        status: 'all',
        category: '',
        search: '',
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      },
    };
  },
  computed: {
    canCreateVote() {
      // 检查用户是否有创建投票权限
      return (
        this.$store.getters.userRole === 'committee' || this.$store.getters.userRole === 'admin'
      );
    },
  },
  mounted() {
    this.loadVotes();
  },
  methods: {
    async loadVotes() {
      this.loading = true;
      try {
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          ...this.filters,
        };

        const response = await votingAPI.getVoteList(params);

        if (response.data.success) {
          this.votes = response.data.data.votes;
          this.pagination = response.data.data.pagination;
        }
      } catch (error) {
        this.$message.error('加载投票列表失败');
        console.error(error);
      } finally {
        this.loading = false;
      }
    },

    resetFilters() {
      this.filters = {
        status: 'all',
        category: '',
        search: '',
      };
      this.pagination.page = 1;
      this.loadVotes();
    },

    handleSizeChange(newSize) {
      this.pagination.limit = newSize;
      this.pagination.page = 1;
      this.loadVotes();
    },

    handleCurrentChange(newPage) {
      this.pagination.page = newPage;
      this.loadVotes();
    },

    handleVoteCreated() {
      this.showCreateDialog = false;
      this.loadVotes();
    },

    viewVote(voteId) {
      this.$router.push(`/voting/${voteId}`);
    },

    participateVote(voteId) {
      this.$router.push(`/voting/${voteId}/participate`);
    },

    viewResults(voteId) {
      this.$router.push(`/voting/${voteId}/results`);
    },

    getStatusType(vote) {
      if (vote.isActive) return 'success';
      if (vote.isEnded) return 'info';
      if (vote.isUpcoming) return 'warning';
      return 'info';
    },

    getStatusText(vote) {
      if (vote.isActive) return '进行中';
      if (vote.isEnded) return '已结束';
      if (vote.isUpcoming) return '即将开始';
      return '未知状态';
    },

    getVoteTypeText(voteType) {
      const types = {
        single_choice: '单选投票',
        multiple_choice: '多选投票',
        ranking: '排序投票',
        rating: '评分投票',
        yes_no: '是否投票',
      };
      return types[voteType] || '未知类型';
    },

    getProgressPercentage(vote) {
      if (!vote.timeRemaining) return 100;

      const totalDuration = new Date(vote.endTime) - new Date(vote.startTime);
      const remainingTime = vote.timeRemaining.totalMinutes * 60 * 1000;
      const elapsed = totalDuration - remainingTime;

      return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    },

    formatTimeRemaining(timeRemaining) {
      if (!timeRemaining) return '';

      if (timeRemaining.days > 0) {
        return `${timeRemaining.days}天${timeRemaining.hours}小时`;
      } else if (timeRemaining.hours > 0) {
        return `${timeRemaining.hours}小时${timeRemaining.minutes}分钟`;
      } else {
        return `${timeRemaining.minutes}分钟`;
      }
    },

    formatDate,
  },
};
</script>

<style scoped>
.voting-list {
  padding: 20px;
}

.voting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.voting-header h1 {
  margin: 0;
  color: #333;
}

.voting-filters {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.vote-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.vote-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border-left: 4px solid #ddd;
}

.vote-card.active {
  border-left-color: #67c23a;
}

.vote-card.ended {
  border-left-color: #909399;
}

.vote-card.upcoming {
  border-left-color: #e6a23c;
}

.vote-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.vote-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.vote-status {
  display: flex;
  gap: 8px;
}

.vote-title {
  margin: 0 0 10px 0;
  color: #333;
  cursor: pointer;
  transition: color 0.3s ease;
}

.vote-title:hover {
  color: #409eff;
}

.vote-description {
  color: #666;
  margin: 0 0 15px 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.vote-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  font-size: 12px;
  color: #999;
}

.vote-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vote-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.vote-timing {
  margin-bottom: 15px;
}

.time-remaining {
  text-align: center;
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}

.vote-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vote-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.vote-actions {
  display: flex;
  gap: 8px;
}

.voting-pagination {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .voting-list {
    padding: 10px;
  }

  .vote-grid {
    grid-template-columns: 1fr;
  }

  .voting-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .vote-card {
    padding: 15px;
  }

  .vote-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .vote-card-footer {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
}
</style>
