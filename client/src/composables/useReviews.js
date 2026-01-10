/**
 * 评价系统 Composable
 */
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';

export const useReviews = () => {
  const reviews = ref([]);
  const loading = ref(false);
  const submitting = ref(false);

  /**
   * 获取评价列表
   */
  const fetchReviews = async (targetType, targetId) => {
    loading.value = true;
    try {
      const { data } = await axios.get('/api/reviews', {
        params: { targetType, targetId },
      });

      if (data.success) {
        reviews.value = data.data || [];
      }

      return reviews.value;
    } catch (error) {
      console.error('获取评价失败:', error);
      return [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * 提交评价
   */
  const submitReview = async reviewData => {
    submitting.value = true;

    try {
      const { data } = await axios.post('/api/reviews', {
        userId: reviewData.userId,
        targetType: reviewData.targetType,
        targetId: reviewData.targetId,
        rating: reviewData.rating,
        content: reviewData.content,
        images: reviewData.images || [],
      });

      if (data.success) {
        reviews.value.unshift(data.data);

        ElMessage.success('评价提交成功');

        // 奖励积分
        await awardPointsForReview(reviewData.userId, data.data.id);

        return true;
      }
    } catch (error) {
      console.error('提交评价失败:', error);
      ElMessage.error('评价提交失败，请重试');
      return false;
    } finally {
      submitting.value = false;
    }
  };

  /**
   * 评价点赞
   */
  const likeReview = async reviewId => {
    try {
      const { data } = await axios.post(`/api/reviews/${reviewId}/like`);

      if (data.success) {
        const review = reviews.value.find(r => r.id === reviewId);
        if (review) {
          review.likes++;
        }

        ElMessage.success('点赞成功');
        return true;
      }
    } catch (error) {
      console.error('点赞失败:', error);
      ElMessage.error('点赞失败');
      return false;
    }
  };

  /**
   * 删除评价
   */
  const deleteReview = async (reviewId, userId) => {
    try {
      const { data } = await axios.delete(`/api/reviews/${reviewId}`, {
        data: { userId },
      });

      if (data.success) {
        reviews.value = reviews.value.filter(r => r.id !== reviewId);
        ElMessage.success('评价已删除');
        return true;
      }
    } catch (error) {
      console.error('删除评价失败:', error);
      ElMessage.error('删除失败');
      return false;
    }
  };

  /**
   * 计算平均评分
   */
  const averageRating = computed(() => {
    if (reviews.value.length === 0) return 0;

    const sum = reviews.value.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.value.length).toFixed(1);
  });

  /**
   * 获取评分分布
   */
  const ratingDistribution = computed(() => {
    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    reviews.value.forEach(review => {
      const rating = Math.floor(review.rating);
      if (rating >= 1 && rating <= 5) {
        distribution[rating]++;
      }
    });

    return distribution;
  });

  /**
   * 获取好评率
   */
  const positiveRate = computed(() => {
    if (reviews.value.length === 0) return 0;

    const positiveCount = reviews.value.filter(r => r.rating >= 4).length;
    return Math.round((positiveCount / reviews.value.length) * 100);
  });

  /**
   * 奖励积分（评价后）
   */
  const awardPointsForReview = async (userId, reviewId) => {
    try {
      await axios.post('/api/points/award', {
        userId,
        type: 'earn',
        amount: 10, // 评价奖励10积分
        reason: '发表评价',
        relatedId: reviewId,
      });
    } catch (error) {
      console.error('积分奖励失败:', error);
    }
  };

  /**
   * 获取用户评价统计
   */
  const getUserReviewStats = async userId => {
    try {
      const { data } = await axios.get(`/api/reviews/stats/${userId}`);

      if (data.success) {
        return data.data;
      }
    } catch (error) {
      console.error('获取评价统计失败:', error);
      return null;
    }
  };

  return {
    reviews,
    loading,
    submitting,
    averageRating,
    ratingDistribution,
    positiveRate,
    fetchReviews,
    submitReview,
    likeReview,
    deleteReview,
    getUserReviewStats,
  };
};

export default useReviews;
