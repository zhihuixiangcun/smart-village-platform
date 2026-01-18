/**
 * 公告评论模块类型定义
 * 提供JSDoc类型注释，增强代码可维护性
 */

/**
 * @typedef {Object} AnnouncementComment
 * @property {string} id - 评论ID
 * @property {string} announcementId - 公告ID
 * @property {string} content - 评论内容
 * @property {CommentUser} user - 评论用户
 * @property {string} createdAt - 创建时间
 * @property {number} likeCount - 点赞数
 * @property {boolean} liked - 是否已点赞
 * @property {number} replyCount - 回复数
 * @property {CommentReply[]} [replies] - 回复列表
 * @property {string} [replyToId] - 回复的评论ID
 * @property {CommentUser} [replyToUser] - 回复的用户
 */

/**
 * @typedef {Object} CommentUser
 * @property {string} id - 用户ID
 * @property {string} name - 用户名称
 * @property {string} [avatar] - 头像URL
 * @property {string} [role] - 用户角色
 */

/**
 * @typedef {Object} CommentReply
 * @property {string} id - 回复ID
 * @property {string} commentId - 评论ID
 * @property {string} content - 回复内容
 * @property {CommentUser} user - 回复用户
 * @property {string} createdAt - 创建时间
 * @property {number} likeCount - 点赞数
 * @property {boolean} liked - 是否已点赞
 * @property {string} [replyToId] - 回复的回复ID
 */

/**
 * @typedef {Object} CommentCreateParams
 * @property {string} content - 评论内容
 * @property {string} [replyToId] - 回复的评论ID（可选）
 */

/**
 * @typedef {Object} CommentListResponse
 * @property {AnnouncementComment[]} list - 评论列表
 * @property {number} total - 总数
 * @property {number} page - 当前页
 * @property {number} pageSize - 每页数量
 */

/**
 * @typedef {Object} CommentSortType
 * 评论排序类型
 * @property {'hot'|'time'} type - 排序类型（hot=最热, time=最新）
 */

/**
 * 评论排序类型枚举
 * @enum {string}
 */
export const CommentSortTypeEnum = {
  HOT: 'hot',
  TIME: 'time'
}
