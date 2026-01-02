const NodeCache = require('node-cache');
const logger = require('./logger');

// 创建缓存实例
const cache = new NodeCache({
  stdTTL: 3600, // 默认过期时间1小时
  checkperiod: 600, // 每10分钟检查一次过期键
  useClones: false
});

// 缓存事件监听
cache.on('set', (key, value) => {
  logger.debug('Cache set', { key });
});

cache.on('del', (key, value) => {
  logger.debug('Cache deleted', { key });
});

cache.on('expired', (key, value) => {
  logger.debug('Cache expired', { key });
});

module.exports = cache;