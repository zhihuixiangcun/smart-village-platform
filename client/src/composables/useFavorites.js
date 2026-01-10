/**
 * 收藏功能 Composable
 */
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';

export const useFavorites = () => {
  const favorites = ref([]);
  const loading = ref(false);

  /**
   * 获取收藏列表
   */
  const fetchFavorites = async userId => {
    if (!userId) return;

    loading.value = true;
    try {
      const { data } = await axios.get('/api/favorites', {
        params: { userId },
      });

      if (data.success) {
        favorites.value = data.data || [];
      }
    } catch (error) {
      console.error('获取收藏列表失败:', error);
      // 降级方案：从localStorage读取
      const localFavorites = localStorage.getItem(`favorites_${userId}`);
      if (localFavorites) {
        favorites.value = JSON.parse(localFavorites);
      }
    } finally {
      loading.value = false;
    }
  };

  /**
   * 添加收藏
   */
  const addFavorite = async (userId, targetType, targetId) => {
    if (!userId) {
      ElMessage.warning('请先登录');
      return false;
    }

    try {
      const { data } = await axios.post('/api/favorites', {
        userId,
        targetType,
        targetId,
      });

      if (data.success) {
        favorites.value.push(data.data);

        // 同步到localStorage
        saveFavoritesToLocal(userId);

        ElMessage.success('收藏成功');
        return true;
      }
    } catch (error) {
      console.error('添加收藏失败:', error);

      // 降级方案：保存到localStorage
      const favorite = {
        id: `fav_${Date.now()}`,
        userId,
        targetType,
        targetId,
        createdAt: new Date().toISOString(),
      };

      favorites.value.push(favorite);
      saveFavoritesToLocal(userId);
      ElMessage.success('收藏成功');
      return true;
    }

    return false;
  };

  /**
   * 取消收藏
   */
  const removeFavorite = async (userId, favoriteId) => {
    if (!userId) return false;

    try {
      const { data } = await axios.delete(`/api/favorites/${favoriteId}`);

      if (data.success) {
        favorites.value = favorites.value.filter(fav => fav.id !== favoriteId);

        // 同步到localStorage
        saveFavoritesToLocal(userId);

        ElMessage.success('已取消收藏');
        return true;
      }
    } catch (error) {
      console.error('取消收藏失败:', error);

      // 降级方案：从localStorage删除
      favorites.value = favorites.value.filter(fav => fav.id !== favoriteId);
      saveFavoritesToLocal(userId);
      ElMessage.success('已取消收藏');
      return true;
    }

    return false;
  };

  /**
   * 检查是否已收藏
   */
  const isFavorited = (targetType, targetId) => {
    return computed(() => {
      return favorites.value.some(
        fav => fav.targetType === targetType && fav.targetId === targetId
      );
    });
  };

  /**
   * 切换收藏状态
   */
  const toggleFavorite = async (userId, targetType, targetId) => {
    const existing = favorites.value.find(
      fav => fav.targetType === targetType && fav.targetId === targetId
    );

    if (existing) {
      return await removeFavorite(userId, existing.id);
    } else {
      return await addFavorite(userId, targetType, targetId);
    }
  };

  /**
   * 保存到本地存储
   */
  const saveFavoritesToLocal = userId => {
    localStorage.setItem(`favorites_${userId}`, JSON.stringify(favorites.value));
  };

  /**
   * 获取收藏的商品列表
   */
  const getFavoriteProducts = computed(() => {
    return favorites.value.filter(fav => fav.targetType === 'product');
  });

  /**
   * 获取收藏的商家列表
   */
  const getFavoriteMerchants = computed(() => {
    return favorites.value.filter(fav => fav.targetType === 'merchant');
  });

  /**
   * 获取收藏的场所列表
   */
  const getFavoriteVenues = computed(() => {
    return favorites.value.filter(fav => fav.targetType === 'venue');
  });

  return {
    favorites,
    loading,
    fetchFavorites,
    addFavorite,
    removeFavorite,
    isFavorited,
    toggleFavorite,
    getFavoriteProducts,
    getFavoriteMerchants,
    getFavoriteVenues,
  };
};

export default useFavorites;
