<template>
  <div class="marketplace">
    <div class="marketplace-header">
      <h1>二手市场</h1>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        发布物品
      </el-button>
    </div>

    <div class="marketplace-filters">
      <el-row :gutter="16">
        <el-col :span="5">
          <el-select v-model="filters.category" @change="loadItems" placeholder="全部分类">
            <el-option label="全部分类" value=""></el-option>
            <el-option label="家用电器" value="appliance"></el-option>
            <el-option label="数码产品" value="electronics"></el-option>
            <el-option label="图书音像" value="books"></el-option>
            <el-option label="家居用品" value="home"></el-option>
            <el-option label="其他" value="other"></el-option>
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select v-model="filters.status" @change="loadItems" placeholder="物品状态">
            <el-option label="全部状态" value=""></el-option>
            <el-option label="可购买" value="available"></el-option>
            <el-option label="已售出" value="sold"></el-option>
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-input v-model="filters.keyword" @keyup.enter="loadItems" placeholder="搜索物品..." clearable>
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-button @click="resetFilters">重置</el-button>
        </el-col>
      </el-row>
    </div>

    <div class="marketplace-content" v-loading="loading">
      <el-empty v-if="items.length === 0 && !loading" description="暂无物品"></el-empty>

      <div class="items-grid" v-else>
        <div v-for="item in items" :key="item.id" class="item-card">
          <div class="item-image" v-if="item.images && item.images.length > 0">
            <img :src="item.images[0]" alt="item" />
            <el-tag v-if="item.status === 'sold'" type="info" class="status-tag">已售出</el-tag>
          </div>

          <div class="item-content">
            <h3 class="item-title" @click="viewItem(item.id)">{{ item.title }}</h3>
            <div class="item-price">¥{{ item.price }}</div>
            <el-tag size="small">{{ getCategoryText(item.category) }}</el-tag>

            <div class="item-meta">
              <span><el-icon><Location /></el-icon> {{ item.location }}</span>
              <span><el-icon><View /></el-icon> {{ item.views }}</span>
              <span><el-icon><Star /></el-icon> {{ item.favorites }}</span>
            </div>

            <div class="seller-info">
              <el-avatar :size="24" :src="item.sellerAvatar"></el-avatar>
              <span>{{ item.sellerName }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="pagination" v-if="pagination.total > 0">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[12, 24, 48]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, Search, Location, View, Star } from '@element-plus/icons-vue';
import { communityApi } from '@/api/community';

const router = useRouter();
const loading = ref(false);
const items = ref([]);

const filters = reactive({
  category: '',
  status: '',
  keyword: '',
});

const pagination = reactive({
  page: 1,
  pageSize: 12,
  total: 0,
});

const loadItems = async () => {
  loading.value = true;
  try {
    const response = await communityApi.getMarketplaceItems({
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters,
    });

    if (response.data.success) {
      items.value = response.data.data.list || [];
      pagination.total = response.data.data.total || 0;
    }
  } catch (error) {
    ElMessage.error('加载物品失败');
  } finally {
    loading.value = false;
  }
};

const handleCreate = () => {
  router.push('/community/marketplace/create');
};

const viewItem = (id) => {
  router.push(`/community/marketplace/${id}`);
};

const resetFilters = () => {
  filters.category = '';
  filters.status = '';
  filters.keyword = '';
  pagination.page = 1;
  loadItems();
};

const handleSizeChange = (size) => {
  pagination.pageSize = size;
  pagination.page = 1;
  loadItems();
};

const handlePageChange = (page) => {
  pagination.page = page;
  loadItems();
};

const getCategoryText = (category) => {
  const categories = {
    appliance: '家用电器',
    electronics: '数码产品',
    books: '图书音像',
    home: '家居用品',
    other: '其他',
  };
  return categories[category] || category;
};

loadItems();
</script>

<style lang="scss" scoped>
.marketplace {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.marketplace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h1 {
    margin: 0;
    font-size: 32px;
    color: #0f172a;
  }
}

.marketplace-filters {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.marketplace-content {
  .items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
  }

  .item-card {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .item-image {
      position: relative;
      height: 200px;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .status-tag {
        position: absolute;
        top: 12px;
        right: 12px;
      }
    }

    .item-content {
      padding: 16px;

      .item-title {
        margin: 0 0 8px 0;
        font-size: 16px;
        color: #0f172a;
        cursor: pointer;
        transition: color 0.3s ease;

        &:hover {
          color: #2563eb;
        }
      }

      .item-price {
        font-size: 24px;
        font-weight: 700;
        color: #e11d48;
        margin-bottom: 8px;
      }

      .item-meta {
        display: flex;
        justify-content: space-between;
        margin: 12px 0;
        font-size: 12px;
        color: #94a3b8;

        span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }

      .seller-info {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-top: 12px;
        border-top: 1px solid #e2e8f0;
        font-size: 14px;
        color: #64748b;
      }
    }
  }

  .pagination {
    display: flex;
    justify-content: center;
    margin-top: 32px;
  }
}

@media (max-width: 768px) {
  .marketplace {
    padding: 16px;
  }

  .marketplace-header {
    flex-direction: column;
    gap: 12px;
  }

  .marketplace-content .items-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
