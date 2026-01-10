/**
 * 积分奖励系统 Composable
 */
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';

/**
 * 积分奖励配置
 */
export const POINTS_CONFIG = {
  // 签到奖励
  SIGN_IN_DAILY: 5,
  SIGN_IN_CONSECUTIVE_7: 20, // 连续签到7天额外奖励
  SIGN_IN_CONSECUTIVE_30: 100, // 连续签到30天额外奖励

  // 互动奖励
  LIKE_POST: 2,
  COMMENT: 5,
  SHARE: 3,
  FOLLOW: 2,

  // 交易奖励
  COMPLETE_ORDER: 10,
  WRITE_REVIEW: 10, // 写评价
  REVIEW_WITH_PHOTO: 15, // 带图评价
  REVIEW_WITH_VIDEO: 30, // 带视频评价

  // 社区贡献
  POST_NEWS: 15,
  POST_ACTIVITY: 20,
  PARTICIPATE_ACTIVITY: 10,
  VOLUNTEER: 50,

  // 拼车相关
  PUBLISH_CARPOOL: 5,
  COMPLETE_CARPOOL: 20,
  CARPOOL_ON_TIME: 5, // 准时完成

  // 商品相关
  PUBLISH_PRODUCT: 5,
  SELL_PRODUCT: 10,

  // 举报奖励（经核实）
  REPORT_TRUE: 30,

  // 惩罚
  SPAM_POST: -20,
  FAKE_REVIEW: -50,
  CANCEL_ORDER: -5,
  NO_SHOW_CARPOOL: -10,
};

export const usePoints = () => {
  const userPoints = ref({
    total: 0,
    available: 0,
    frozen: 0,
    rank: 0,
    level: 1,
    history: [],
  });

  const loading = ref(false);

  /**
   * 获取用户积分信息
   */
  const fetchUserPoints = async userId => {
    if (!userId) return;

    loading.value = true;
    try {
      const { data } = await axios.get(`/api/points/${userId}`);

      if (data.success) {
        userPoints.value = data.data;
      }
    } catch (error) {
      console.error('获取积分失败:', error);
      // 降级方案：从localStorage读取
      const localPoints = localStorage.getItem(`points_${userId}`);
      if (localPoints) {
        userPoints.value = JSON.parse(localPoints);
      }
    } finally {
      loading.value = false;
    }
  };

  /**
   * 奖励积分
   */
  const awardPoints = async (userId, amount, reason, relatedId = null) => {
    if (!userId || amount <= 0) return false;

    try {
      const { data } = await axios.post('/api/points/award', {
        userId,
        type: 'earn',
        amount,
        reason,
        relatedId,
      });

      if (data.success) {
        userPoints.value.total += amount;
        userPoints.value.available += amount;

        // 添加到历史记录
        userPoints.value.history.unshift({
          id: data.data.id,
          type: 'earn',
          amount,
          reason,
          createdAt: new Date().toISOString(),
        });

        // 保存到localStorage
        savePointsToLocal(userId);

        ElMessage.success(`积分+${amount}`);

        // 检查是否升级
        await checkLevelUp(userId);

        return true;
      }
    } catch (error) {
      console.error('奖励积分失败:', error);
      return false;
    }

    return false;
  };

  /**
   * 扣除积分
   */
  const deductPoints = async (userId, amount, reason, relatedId = null) => {
    if (!userId || amount <= 0) return false;

    if (userPoints.value.available < amount) {
      ElMessage.error('积分不足');
      return false;
    }

    try {
      const { data } = await axios.post('/api/points/deduct', {
        userId,
        type: 'spend',
        amount,
        reason,
        relatedId,
      });

      if (data.success) {
        userPoints.value.total -= amount;
        userPoints.value.available -= amount;

        // 添加到历史记录
        userPoints.value.history.unshift({
          id: data.data.id,
          type: 'spend',
          amount,
          reason,
          createdAt: new Date().toISOString(),
        });

        // 保存到localStorage
        savePointsToLocal(userId);

        ElMessage.success(`积分-${amount}`);
        return true;
      }
    } catch (error) {
      console.error('扣除积分失败:', error);
      return false;
    }

    return false;
  };

  /**
   * 积分兑换
   */
  const redeemPoints = async (userId, points, reward) => {
    if (userPoints.value.available < points) {
      ElMessage.error('积分不足');
      return false;
    }

    return await deductPoints(userId, points, `兑换：${reward}`);
  };

  /**
   * 检查是否升级
   */
  const checkLevelUp = async userId => {
    const newLevel = calculateLevel(userPoints.value.total);

    if (newLevel > userPoints.value.level) {
      userPoints.value.level = newLevel;

      ElMessage.success({
        message: `恭喜升级到 ${newLevel} 级！`,
        duration: 3000,
      });

      // 发放升级奖励
      await awardPoints(userId, newLevel * 10, '升级奖励');
    }
  };

  /**
   * 计算用户等级
   */
  const calculateLevel = totalPoints => {
    if (totalPoints < 100) return 1;
    if (totalPoints < 500) return 2;
    if (totalPoints < 1000) return 3;
    if (totalPoints < 2000) return 4;
    if (totalPoints < 5000) return 5;
    if (totalPoints < 10000) return 6;
    if (totalPoints < 20000) return 7;
    if (totalPoints < 50000) return 8;
    if (totalPoints < 100000) return 9;
    return 10;
  };

  /**
   * 获取等级进度
   */
  const getLevelProgress = () => {
    const currentLevel = userPoints.value.level;
    const currentPoints = userPoints.value.total;

    const levelThresholds = [0, 100, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

    if (currentLevel >= 10) {
      return 100;
    }

    const minPoints = levelThresholds[currentLevel - 1];
    const maxPoints = levelThresholds[currentLevel];

    const progress = ((currentPoints - minPoints) / (maxPoints - minPoints)) * 100;

    return Math.min(100, Math.max(0, progress));
  };

  /**
   * 获取下一等级所需积分
   */
  const getNextLevelPoints = () => {
    const currentLevel = userPoints.value.level;

    if (currentLevel >= 10) {
      return '已达最高等级';
    }

    const levelThresholds = [100, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
    return levelThresholds[currentLevel - 1] - userPoints.value.total;
  };

  /**
   * 签到
   */
  const signIn = async userId => {
    if (!userId) return false;

    try {
      const { data } = await axios.post('/api/points/sign-in', { userId });

      if (data.success) {
        const { points, consecutiveDays, bonus } = data.data;

        await awardPoints(userId, points, '每日签到');

        if (bonus > 0) {
          setTimeout(() => {
            awardPoints(userId, bonus, `连续签到${consecutiveDays}天奖励`);
          }, 500);
        }

        return true;
      } else if (data.message === 'already_signed') {
        ElMessage.info('今日已签到');
        return false;
      }
    } catch (error) {
      console.error('签到失败:', error);
      ElMessage.error('签到失败');
      return false;
    }

    return false;
  };

  /**
   * 获取积分排行榜
   */
  const getPointsRanking = async (limit = 100) => {
    try {
      const { data } = await axios.get('/api/points/ranking', {
        params: { limit },
      });

      if (data.success) {
        return data.data;
      }
    } catch (error) {
      console.error('获取排行榜失败:', error);
      return [];
    }

    return [];
  };

  /**
   * 保存到本地存储
   */
  const savePointsToLocal = userId => {
    localStorage.setItem(`points_${userId}`, JSON.stringify(userPoints.value));
  };

  /**
   * 获取积分历史记录（分页）
   */
  const getPointsHistory = async (userId, page = 1, pageSize = 20) => {
    try {
      const { data } = await axios.get(`/api/points/${userId}/history`, {
        params: { page, pageSize },
      });

      if (data.success) {
        return data.data;
      }
    } catch (error) {
      console.error('获取积分历史失败:', error);
      return [];
    }

    return [];
  };

  return {
    userPoints,
    loading,
    fetchUserPoints,
    awardPoints,
    deductPoints,
    redeemPoints,
    signIn,
    getPointsRanking,
    getPointsHistory,
    getLevelProgress,
    getNextLevelPoints,
    calculateLevel,
  };
};

export default usePoints;
