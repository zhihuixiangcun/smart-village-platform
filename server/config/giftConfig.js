/**
 * 礼物配置文件
 * 定义虚拟礼物类型、价格和图标
 */

const GIFTS = {
  // 免费礼物
  rose: {
    id: 'rose',
    name: '玫瑰',
    icon: '🌹',
    price: 0,
    category: 'free'
  },
  heart: {
    id: 'heart',
    name: '爱心',
    icon: '❤️',
    price: 0,
    category: 'free'
  },

  // 普通礼物 (1-10 金币)
  coffee: {
    id: 'coffee',
    name: '咖啡',
    icon: '☕',
    price: 5,
    category: 'common'
  },
  cake: {
    id: 'cake',
    name: '蛋糕',
    icon: '🍰',
    price: 8,
    category: 'common'
  },
  teddy: {
    id: 'teddy',
    name: '泰迪熊',
    icon: '🧸',
    price: 10,
    category: 'common'
  },

  // 精致礼物 (11-50 金币)
  chocolate: {
    id: 'chocolate',
    name: '巧克力',
    icon: '🍫',
    price: 15,
    category: 'delicate'
  },
  perfume: {
    id: 'perfume',
    name: '香水',
    icon: '🌸',
    price: 25,
    category: 'delicate'
  },
  necklace: {
    id: 'necklace',
    name: '项链',
    icon: '📿',
    price: 50,
    category: 'delicate'
  },

  // 奢华礼物 (51-200 金币)
  handbag: {
    id: 'handbag',
    name: '名牌包',
    icon: '👜',
    price: 100,
    category: 'luxury'
  },
  watch: {
    id: 'watch',
    name: '名表',
    icon: '⌚',
    price: 150,
    category: 'luxury'
  },
  ring: {
    id: 'ring',
    name: '钻戒',
    icon: '💍',
    price: 200,
    category: 'luxury'
  },

  // 传世礼物 (201+ 金币)
  car: {
    id: 'car',
    name: '跑车',
    icon: '🏎️',
    price: 500,
    category: 'legendary'
  },
  castle: {
    id: 'castle',
    name: '城堡',
    icon: '🏰',
    price: 1000,
    category: 'legendary'
  },
  rocket: {
    id: 'rocket',
    name: '火箭',
    icon: '🚀',
    price: 2000,
    category: 'legendary'
  }
};

/**
 * 根据礼物ID获取价格
 * @param {string} giftId - 礼物ID
 * @returns {number} 礼物单价
 */
function getGiftPrice(giftId) {
  const gift = GIFTS[giftId];
  return gift ? gift.price : 0;
}

/**
 * 计算礼物总价
 * @param {string} giftId - 礼物ID
 * @param {number} amount - 数量
 * @returns {number} 总价
 */
function calculateTotalPrice(giftId, amount = 1) {
  const price = getGiftPrice(giftId);
  return price * (parseInt(amount) || 1);
}

/**
 * 获取礼物信息
 * @param {string} giftId - 礼物ID
 * @returns {object|null} 礼物信息
 */
function getGiftInfo(giftId) {
  return GIFTS[giftId] || null;
}

/**
 * 获取所有礼物列表
 * @returns {object} 所有礼物配置
 */
function getAllGifts() {
  return GIFTS;
}

/**
 * 按分类获取礼物列表
 * @param {string} category - 分类名称 (free, common, delicate, luxury, legendary)
 * @returns {array} 礼物列表
 */
function getGiftsByCategory(category) {
  return Object.values(GIFTS).filter(gift => gift.category === category);
}

module.exports = {
  GIFTS,
  getGiftPrice,
  calculateTotalPrice,
  getGiftInfo,
  getAllGifts,
  getGiftsByCategory
};
