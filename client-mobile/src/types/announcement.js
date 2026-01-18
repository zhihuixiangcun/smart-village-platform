/**
 * 公告模块类型定义
 * 提供JSDoc类型注释，增强代码可维护性
 */

/**
 * @typedef {Object} AnnouncementType
 * @property {string} id - 公告唯一标识
 * @property {'important'|'notice'|'meeting'|'public'} type - 公告类型
 * @property {string} typeLabel - 类型显示名称
 * @property {string} title - 公告标题
 * @property {string} summary - 公告摘要
 * @property {string} content - 公告内容(HTML格式)
 * @property {string} publishDate - 发布时间
 * @property {number} viewCount - 浏览次数
 * @property {boolean} top - 是否置顶
 * @property {boolean} read - 是否已读
 * @property {string} category - 分类标签
 * @property {string} publisher - 发布单位
 * @property {AnnouncementAttachment[]} [attachments] - 附件列表
 * @property {boolean} [liked] - 是否已点赞
 * @property {number} [likeCount] - 点赞数
 * @property {boolean} [collected] - 是否已收藏
 * @property {number} [commentCount] - 评论数
 * @property {boolean} [expanded] - 是否展开（列表页用）
 * @property {boolean} [playing] - 是否正在语音播报（列表页用）
 */

/**
 * @typedef {Object} AnnouncementAttachment
 * @property {string} id - 附件ID
 * @property {string} name - 文件名
 * @property {string} size - 文件大小（如 "2.3MB"）
 * @property {string} url - 下载链接
 * @property {string} [type] - 文件类型/MIME类型
 */

/**
 * @typedef {Object} AnnouncementFilter
 * @property {string} type - 类型筛选 (all|important|notice|meeting|public)
 * @property {string} [keyword] - 搜索关键词
 * @property {string} [startDate] - 开始日期
 * @property {string} [endDate] - 结束日期
 * @property {'date'|'viewCount'|'likeCount'} [sortBy] - 排序方式
 * @property {'asc'|'desc'} [sortOrder] - 排序方向
 */

/**
 * @typedef {Object} AnnouncementPagination
 * @property {number} page - 当前页码
 * @property {number} pageSize - 每页数量
 * @property {number} total - 总数
 * @property {boolean} hasMore - 是否有更多
 */

/**
 * @typedef {Object} AnnouncementStats
 * @property {number} all - 全部数量
 * @property {number} important - 重要数量
 * @property {number} notice - 通知数量
 * @property {number} meeting - 会议数量
 * @property {number} public - 公示数量
 * @property {number} unread - 未读数量
 */

/**
 * @typedef {Object} AnnouncementListResponse
 * @property {AnnouncementType[]} list - 公告列表
 * @property {number} total - 总数
 * @property {number} page - 当前页
 * @property {number} pageSize - 每页数量
 */

/**
 * @typedef {Object} AnnouncementDetailResponse
 * @property {AnnouncementType} detail - 公告详情
 * @property {AnnouncementType[]} [related] - 相关公告
 */

/**
 * @enum {string}
 * 公告类型枚举
 */
export const AnnouncementTypeEnum = {
  IMPORTANT: 'important',
  NOTICE: 'notice',
  MEETING: 'meeting',
  PUBLIC: 'public'
}

/**
 * @enum {string}
 * 公告排序字段枚举
 */
export const AnnouncementSortByEnum = {
  DATE: 'date',
  VIEW_COUNT: 'viewCount',
  LIKE_COUNT: 'likeCount'
}

/**
 * @enum {string}
 * 公告排序方向枚举
 */
export const AnnouncementSortOrderEnum = {
  ASC: 'asc',
  DESC: 'desc'
}
