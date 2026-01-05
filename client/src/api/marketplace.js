/**
 * 市集和位置服务 API 接口
 * 提供附近商品、商家、招聘、拼车等功能的API调用
 */
import request from '@/utils/request'

// ==================== 附近商品/商家 API ====================

/**
 * 获取附近商品列表
 * @param {Object} params 查询参数 { latitude, longitude, radius, category, keyword, page, limit }
 * @returns {Promise} 商品列表
 */
export function getNearbyProducts(params = {}) {
  return request.get('/api/v1/marketplace/products/nearby', params)
}

/**
 * 获取商品详情
 * @param {string} id 商品ID
 * @returns {Promise} 商品详情
 */
export function getProductDetail(id) {
  return request.get(`/api/v1/marketplace/products/${id}`)
}

/**
 * 获取商家列表
 * @param {Object} params 查询参数 { latitude, longitude, radius, category }
 * @returns {Promise} 商家列表
 */
export function getNearbyMerchants(params = {}) {
  return request.get('/api/v1/marketplace/merchants/nearby', params)
}

/**
 * 获取商家详情
 * @param {string} id 商家ID
 * @returns {Promise} 商家详情
 */
export function getMerchantDetail(id) {
  return request.get(`/api/v1/marketplace/merchants/${id}`)
}

/**
 * 搜索商品
 * @param {Object} params 搜索参数 { keyword, latitude, longitude, category, page, limit }
 * @returns {Promise} 搜索结果
 */
export function searchProducts(params = {}) {
  return request.get('/api/v1/marketplace/products/search', params)
}

// ==================== 商品发布 API ====================

/**
 * 发布商品
 * @param {Object} data 商品数据
 * @returns {Promise} 发布结果
 */
export function publishProduct(data) {
  return request.post('/api/v1/marketplace/products', data)
}

/**
 * 上传商品图片
 * @param {FormData} formData 图片文件
 * @returns {Promise} 图片URL
 */
export function uploadProductImage(formData) {
  return request.post('/api/v1/marketplace/products/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 更新商品信息
 * @param {string} id 商品ID
 * @param {Object} data 更新数据
 * @returns {Promise} 更新结果
 */
export function updateProduct(id, data) {
  return request.put(`/api/v1/marketplace/products/${id}`, data)
}

/**
 * 下架商品
 * @param {string} id 商品ID
 * @returns {Promise} 下架结果
 */
export function deleteProduct(id) {
  return request.delete(`/api/v1/marketplace/products/${id}`)
}

/**
 * 获取我的商品列表
 * @param {Object} params 查询参数 { status, page, limit }
 * @returns {Promise} 商品列表
 */
export function getMyProducts(params = {}) {
  return request.get('/api/v1/marketplace/products/my', params)
}

// ==================== 附近服务(吃喝玩乐) API ====================

/**
 * 获取附近场所(餐厅、景点等)
 * @param {Object} params 查询参数 { latitude, longitude, radius, type, keyword, page, limit }
 * @returns {Promise} 场所列表
 */
export function getNearbyVenues(params = {}) {
  return request.get('/api/v1/marketplace/venues/nearby', params)
}

/**
 * 获取场所详情
 * @param {string} id 场所ID
 * @returns {Promise} 场所详情
 */
export function getVenueDetail(id) {
  return request.get(`/api/v1/marketplace/venues/${id}`)
}

/**
 * 获取场所评价
 * @param {string} id 场所ID
 * @param {Object} params 分页参数
 * @returns {Promise} 评价列表
 */
export function getVenueReviews(id, params = {}) {
  return request.get(`/api/v1/marketplace/venues/${id}/reviews`, params)
}

/**
 * 提交场所评价
 * @param {string} id 场所ID
 * @param {Object} data 评价数据
 * @returns {Promise} 评价结果
 */
export function submitVenueReview(id, data) {
  return request.post(`/api/v1/marketplace/venues/${id}/reviews`, data)
}

// ==================== 交通出行 API ====================

/**
 * 查询附近机场
 * @param {Object} params 查询参数 { latitude, longitude, radius }
 * @returns {Promise} 机场列表
 */
export function getNearbyAirports(params = {}) {
  return request.get('/api/v1/marketplace/travel/airports', params)
}

/**
 * 查询航班信息
 * @param {Object} params 查询参数 { date, origin, destination }
 * @returns {Promise} 航班列表
 */
export function getFlights(params = {}) {
  return request.get('/api/v1/marketplace/travel/flights', params)
}

/**
 * 查询附近高铁站
 * @param {Object} params 查询参数 { latitude, longitude, radius }
 * @returns {Promise} 高铁站列表
 */
export function getNearbyTrainStations(params = {}) {
  return request.get('/api/v1/marketplace/train/stations', params)
}

/**
 * 查询火车票信息
 * @param {Object} params 查询参数 { date, origin, destination }
 * @returns {Promise} 车次列表
 */
export function getTrainTickets(params = {}) {
  return request.get('/api/v1/marketplace/train/tickets', params)
}

// ==================== 拼车服务 API ====================

/**
 * 获取拼车信息列表
 * @param {Object} params 查询参数 { from, to, date, page, limit }
 * @returns {Promise} 拼车列表
 */
export function getCarpoolList(params = {}) {
  return request.get('/api/v1/marketplace/carpool', params)
}

/**
 * 发布拼车信息
 * @param {Object} data 拼车数据
 * @returns {Promise} 发布结果
 */
export function publishCarpool(data) {
  return request.post('/api/v1/marketplace/carpool', data)
}

/**
 * 更新拼车信息
 * @param {string} id 拼车ID
 * @param {Object} data 更新数据
 * @returns {Promise} 更新结果
 */
export function updateCarpool(id, data) {
  return request.put(`/api/v1/marketplace/carpool/${id}`, data)
}

/**
 * 取消拼车
 * @param {string} id 拼车ID
 * @returns {Promise} 取消结果
 */
export function cancelCarpool(id) {
  return request.delete(`/api/v1/marketplace/carpool/${id}`)
}

/**
 * 预订拼车
 * @param {string} id 拼车ID
 * @returns {Promise} 预订结果
 */
export function bookCarpool(id) {
  return request.post(`/api/v1/marketplace/carpool/${id}/book`)
}

/**
 * 获取我的拼车信息
 * @param {Object} params 查询参数 { status, type, page, limit }
 * @returns {Promise} 拼车列表
 */
export function getMyCarpool(params = {}) {
  return request.get('/api/v1/marketplace/carpool/my', params)
}

// ==================== 招聘求职 API ====================

/**
 * 获取招聘信息列表
 * @param {Object} params 查询参数 { latitude, longitude, companyType, keyword, page, limit }
 * @returns {Promise} 招聘列表
 */
export function getJobPostings(params = {}) {
  return request.get('/api/v1/marketplace/jobs', params)
}

/**
 * 获取招聘详情
 * @param {string} id 招聘ID
 * @returns {Promise} 招聘详情
 */
export function getJobDetail(id) {
  return request.get(`/api/v1/marketplace/jobs/${id}`)
}

/**
 * 发布招聘信息
 * @param {Object} data 招聘数据
 * @returns {Promise} 发布结果
 */
export function publishJob(data) {
  return request.post('/api/v1/marketplace/jobs', data)
}

/**
 * 更新招聘信息
 * @param {string} id 招聘ID
 * @param {Object} data 更新数据
 * @returns {Promise} 更新结果
 */
export function updateJob(id, data) {
  return request.put(`/api/v1/marketplace/jobs/${id}`, data)
}

/**
 * 关闭招聘
 * @param {string} id 招聘ID
 * @returns {Promise} 关闭结果
 */
export function closeJob(id) {
  return request.delete(`/api/v1/marketplace/jobs/${id}`)
}

/**
 * 申请职位
 * @param {string} id 职位ID
 * @returns {Promise} 申请结果
 */
export function applyJob(id) {
  return request.post(`/api/v1/marketplace/jobs/${id}/apply`)
}

/**
 * 获取求职信息列表
 * @param {Object} params 查询参数 { latitude, longitude, skills, keyword, page, limit }
 * @returns {Promise} 求职列表
 */
export function getJobSeekers(params = {}) {
  return request.get('/api/v1/marketplace/seekers', params)
}

/**
 * 发布求职信息
 * @param {Object} data 求职数据
 * @returns {Promise} 发布结果
 */
export function publishSeeker(data) {
  return request.post('/api/v1/marketplace/seekers', data)
}

/**
 * 更新求职信息
 * @param {string} id 求职ID
 * @param {Object} data 更新数据
 * @returns {Promise} 更新结果
 */
export function updateSeeker(id, data) {
  return request.put(`/api/v1/marketplace/seekers/${id}`, data)
}

/**
 * 邀请求职者
 * @param {string} id 求职者ID
 * @param {Object} data 邀请信息
 * @returns {Promise} 邀请结果
 */
export function inviteSeeker(id, data) {
  return request.post(`/api/v1/marketplace/seekers/${id}/invite`, data)
}

// ==================== 收藏和互动 API ====================

/**
 * 收藏商品
 * @param {string} id 商品ID
 * @returns {Promise} 收藏结果
 */
export function likeProduct(id) {
  return request.post(`/api/v1/marketplace/products/${id}/like`)
}

/**
 * 取消收藏
 * @param {string} id 商品ID
 * @returns {Promise} 取消结果
 */
export function unlikeProduct(id) {
  return request.delete(`/api/v1/marketplace/products/${id}/like`)
}

/**
 * 获取我的收藏列表
 * @param {Object} params 分页参数
 * @returns {Promise} 收藏列表
 */
export function getMyLikes(params = {}) {
  return request.get('/api/v1/marketplace/likes/my', params)
}

// ==================== 位置服务 API ====================

/**
 * 获取用户当前位置
 * @returns {Promise} 位置信息
 */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      },
      (error) => {
        reject(error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}

/**
 * 计算两地距离
 * @param {number} lat1 起点纬度
 * @param {number} lon1 起点经度
 * @param {number} lat2 终点纬度
 * @param {number} lon2 终点经度
 * @returns {number} 距离(米)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // 地球半径(米)
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

// ==================== 导出API对象 ====================

// 导出商品相关API
export const productApi = {
  getNearbyProducts,
  getProductDetail,
  getNearbyMerchants,
  getMerchantDetail,
  searchProducts,
  publishProduct,
  uploadProductImage,
  updateProduct,
  deleteProduct,
  getMyProducts
}

// 导出服务相关API
export const venueApi = {
  getNearbyVenues,
  getVenueDetail,
  getVenueReviews,
  submitVenueReview
}

// 导出交通相关API
export const travelApi = {
  getNearbyAirports,
  getFlights,
  getNearbyTrainStations,
  getTrainTickets
}

// 导出拼车相关API
export const carpoolApi = {
  getCarpoolList,
  publishCarpool,
  updateCarpool,
  cancelCarpool,
  bookCarpool,
  getMyCarpool
}

// 导出招聘求职API
export const jobApi = {
  getJobPostings,
  getJobDetail,
  publishJob,
  updateJob,
  closeJob,
  applyJob,
  getJobSeekers,
  publishSeeker,
  updateSeeker,
  inviteSeeker
}

// 导出所有API作为对象
export const marketplaceApi = {
  // 商品
  getNearbyProducts,
  getProductDetail,
  getNearbyMerchants,
  getMerchantDetail,
  searchProducts,
  publishProduct,
  uploadProductImage,
  updateProduct,
  deleteProduct,
  getMyProducts,
  // 服务
  getNearbyVenues,
  getVenueDetail,
  getVenueReviews,
  submitVenueReview,
  // 交通
  getNearbyAirports,
  getFlights,
  getNearbyTrainStations,
  getTrainTickets,
  // 拼车
  getCarpoolList,
  publishCarpool,
  updateCarpool,
  cancelCarpool,
  bookCarpool,
  getMyCarpool,
  // 招聘
  getJobPostings,
  getJobDetail,
  publishJob,
  updateJob,
  closeJob,
  applyJob,
  getJobSeekers,
  publishSeeker,
  updateSeeker,
  inviteSeeker,
  // 收藏
  likeProduct,
  unlikeProduct,
  getMyLikes,
  // 位置
  getCurrentLocation,
  calculateDistance
}

export default marketplaceApi
