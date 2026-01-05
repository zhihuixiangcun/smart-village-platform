import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import api from '@/utils/api';

export const useAnnouncementStore = defineStore('announcement', () => {
  // 状态
  const announcements = ref([]);
  const currentAnnouncement = ref(null);
  const loading = ref(false);
  const categories = ref([]);
  const stats = reactive({
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0
  });

  // 获取公告列表
  const getAnnouncements = async (params = {}) => {
    loading.value = true;
    try {
      const response = await api.get('/api/announcements', { params });

      if (response.data.success) {
        announcements.value = response.data.data.announcements;
        return response.data;
      } else {
        throw new Error(response.data.message || '获取公告列表失败');
      }
    } catch (error) {
      console.error('获取公告列表失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 获取公告详情
  const getAnnouncementById = async (id) => {
    loading.value = true;
    try {
      const response = await api.get(`/api/announcements/${id}`);

      if (response.data.success) {
        currentAnnouncement.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(response.data.message || '获取公告详情失败');
      }
    } catch (error) {
      console.error('获取公告详情失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 创建公告
  const createAnnouncement = async (data) => {
    loading.value = true;
    try {
      const response = await api.post('/api/announcements', data);

      if (response.data.success) {
        // 如果是发布状态，更新列表
        if (data.status === 'published') {
          announcements.value.unshift(response.data.data);
        }
        return response.data.data;
      } else {
        throw new Error(response.data.message || '创建公告失败');
      }
    } catch (error) {
      console.error('创建公告失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 更新公告
  const updateAnnouncement = async (id, data) => {
    loading.value = true;
    try {
      const response = await api.put(`/api/announcements/${id}`, data);

      if (response.data.success) {
        // 更新本地列表中的公告
        const index = announcements.value.findIndex(item => item.id === id);
        if (index !== -1) {
          announcements.value[index] = response.data.data;
        }

        // 更新当前公告
        if (currentAnnouncement.value?.id === id) {
          currentAnnouncement.value = response.data.data;
        }

        return response.data.data;
      } else {
        throw new Error(response.data.message || '更新公告失败');
      }
    } catch (error) {
      console.error('更新公告失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 删除公告
  const deleteAnnouncement = async (id) => {
    loading.value = true;
    try {
      const response = await api.delete(`/api/announcements/${id}`);

      if (response.data.success) {
        // 从本地列表中移除
        const index = announcements.value.findIndex(item => item.id === id);
        if (index !== -1) {
          announcements.value.splice(index, 1);
        }
        return true;
      } else {
        throw new Error(response.data.message || '删除公告失败');
      }
    } catch (error) {
      console.error('删除公告失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 置顶/取消置顶公告
  const toggleTopAnnouncement = async (id) => {
    try {
      const response = await api.patch(`/api/announcements/${id}/top`);

      if (response.data.success) {
        // 更新本地列表
        const index = announcements.value.findIndex(item => item.id === id);
        if (index !== -1) {
          announcements.value[index].isTop = response.data.data.isTop;
        }
        return response.data.data;
      } else {
        throw new Error(response.data.message || '操作失败');
      }
    } catch (error) {
      console.error('置顶操作失败:', error);
      throw error;
    }
  };

  // 批量删除公告
  const batchDeleteAnnouncements = async (ids) => {
    loading.value = true;
    try {
      const promises = ids.map(id => api.delete(`/api/announcements/${id}`));
      const responses = await Promise.all(promises);

      // 检查所有请求是否成功
      const allSuccess = responses.every(response => response.data.success);

      if (allSuccess) {
        // 从本地列表中移除已删除的公告
        announcements.value = announcements.value.filter(item => !ids.includes(item.id));
        return true;
      } else {
        throw new Error('部分公告删除失败');
      }
    } catch (error) {
      console.error('批量删除失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 批量归档公告
  const batchArchiveAnnouncements = async (ids) => {
    loading.value = true;
    try {
      const promises = ids.map(id =>
        api.put(`/api/announcements/${id}`, { status: 'archived' })
      );
      const responses = await Promise.all(promises);

      const allSuccess = responses.every(response => response.data.success);

      if (allSuccess) {
        // 更新本地列表中的状态
        ids.forEach(id => {
          const index = announcements.value.findIndex(item => item.id === id);
          if (index !== -1) {
            announcements.value[index].status = 'archived';
          }
        });
        return true;
      } else {
        throw new Error('部分公告归档失败');
      }
    } catch (error) {
      console.error('批量归档失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 搜索公告
  const searchAnnouncements = async (query, options = {}) => {
    loading.value = true;
    try {
      const response = await api.get(`/api/announcements/search/${encodeURIComponent(query)}`, {
        params: options
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || '搜索失败');
      }
    } catch (error) {
      console.error('搜索公告失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  // 获取公告分类
  const getCategories = async () => {
    try {
      const response = await api.get('/api/announcements/categories');

      if (response.data.success) {
        categories.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(response.data.message || '获取分类失败');
      }
    } catch (error) {
      console.error('获取公告分类失败:', error);
      throw error;
    }
  };

  // 获取热门公告
  const getHotAnnouncements = async (limit = 10) => {
    try {
      const response = await api.get('/api/announcements/hot', {
        params: { limit }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || '获取热门公告失败');
      }
    } catch (error) {
      console.error('获取热门公告失败:', error);
      throw error;
    }
  };

  // 获取置顶公告
  const getTopAnnouncements = async () => {
    try {
      const response = await api.get('/api/announcements/top');

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || '获取置顶公告失败');
      }
    } catch (error) {
      console.error('获取置顶公告失败:', error);
      throw error;
    }
  };

  // 获取公告统计
  const getAnnouncementStats = async (params = {}) => {
    try {
      const response = await api.get('/api/announcements/stats/overview', { params });

      if (response.data.success) {
        Object.assign(stats, response.data.data.total);
        return response.data.data;
      } else {
        throw new Error(response.data.message || '获取统计失败');
      }
    } catch (error) {
      console.error('获取公告统计失败:', error);
      throw error;
    }
  };

  // 上传文件
  const uploadFile = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/announcements/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || '文件上传失败');
      }
    } catch (error) {
      console.error('文件上传失败:', error);
      throw error;
    }
  };

  // 点赞公告
  const likeAnnouncement = async (id) => {
    try {
      const response = await api.post(`/api/announcements/${id}/like`);

      if (response.data.success) {
        // 更新本地统计
        const index = announcements.value.findIndex(item => item.id === id);
        if (index !== -1) {
          announcements.value[index].stats.likes = response.data.data.likes;
        }

        if (currentAnnouncement.value?.id === id) {
          currentAnnouncement.value.stats.likes = response.data.data.likes;
        }

        return response.data.data;
      } else {
        throw new Error(response.data.message || '点赞失败');
      }
    } catch (error) {
      console.error('点赞失败:', error);
      throw error;
    }
  };

  // 分享公告
  const shareAnnouncement = async (id) => {
    try {
      const response = await api.post(`/api/announcements/${id}/share`);

      if (response.data.success) {
        // 更新本地统计
        const index = announcements.value.findIndex(item => item.id === id);
        if (index !== -1) {
          announcements.value[index].stats.shares += 1;
        }

        if (currentAnnouncement.value?.id === id) {
          currentAnnouncement.value.stats.shares += 1;
        }

        return response.data.data;
      } else {
        throw new Error(response.data.message || '分享失败');
      }
    } catch (error) {
      console.error('分享失败:', error);
      throw error;
    }
  };

  // 清空当前公告
  const clearCurrentAnnouncement = () => {
    currentAnnouncement.value = null;
  };

  // 重置状态
  const resetState = () => {
    announcements.value = [];
    currentAnnouncement.value = null;
    loading.value = false;
    categories.value = [];
    Object.assign(stats, {
      total: 0,
      published: 0,
      draft: 0,
      archived: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0
    });
  };

  return {
    // 状态
    announcements,
    currentAnnouncement,
    loading,
    categories,
    stats,

    // 方法
    getAnnouncements,
    getAnnouncementById,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    toggleTopAnnouncement,
    batchDeleteAnnouncements,
    batchArchiveAnnouncements,
    searchAnnouncements,
    getCategories,
    getHotAnnouncements,
    getTopAnnouncements,
    getAnnouncementStats,
    uploadFile,
    likeAnnouncement,
    shareAnnouncement,
    clearCurrentAnnouncement,
    resetState,

    // 简化的方法名
    get: getAnnouncements,
    getById: getAnnouncementById,
    create: createAnnouncement,
    update: updateAnnouncement,
    delete: deleteAnnouncement,
    toggleTop: toggleTopAnnouncement,
    batchDelete: batchDeleteAnnouncements,
    batchArchive: batchArchiveAnnouncements,
    search: searchAnnouncements,
    getStats: getAnnouncementStats,
    upload: uploadFile,
    like: likeAnnouncement,
    share: shareAnnouncement
  };
});