/**
 * 公告评论Store
 * 管理评论列表、回复、点赞等
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 使用评论Store
 * @returns {Object} Store状态和方法
 */
export const useAnnouncementCommentStore = defineStore('announcementComment', () => {
  // ===== 状态管理 =====

  /** 评论列表 - 按公告ID分组 @type {import('vue').Ref<Map<string, import('@/types/announcement-comment').AnnouncementComment[]>>} */
  const commentsMap = ref(new Map())

  /** 回复列表 - 按评论ID分组 @type {import('vue').Ref<Map<string, import('@/types/announcement-comment').CommentReply[]>>} */
  const repliesMap = ref(new Map())

  /** 加载状态 */
  const loading = ref(false)
  const submitting = ref(false)

  // ===== 计算属性 =====

  /**
   * 获取公告的评论列表
   * @param {string} announcementId - 公告ID
   * @returns {import('@/types/announcement-comment').AnnouncementComment[]} 评论列表
   */
  const getComments = (announcementId) => {
    return commentsMap.value.get(announcementId) || []
  }

  /**
   * 获取评论的回复列表
   * @param {string} commentId - 评论ID
   * @returns {import('@/types/announcement-comment').CommentReply[]} 回复列表
   */
  const getReplies = (commentId) => {
    return repliesMap.value.get(commentId) || []
  }

  // ===== API调用方法 =====

  /**
   * 获取公告评论列表
   * @param {string} announcementId - 公告ID
   * @returns {Promise<import('@/types/announcement-comment').AnnouncementComment[]>} 评论列表
   */
  const fetchComments = async (announcementId) => {
    // 如果已有数据，直接返回
    if (commentsMap.value.has(announcementId)) {
      return commentsMap.value.get(announcementId)
    }

    loading.value = true

    try {
      // 调用API
      const { village } = await import('@/api')
      const response = await village.announcement.getComments(announcementId)
      const comments = response.data?.list || []

      commentsMap.value.set(announcementId, comments)

      return comments
    } catch (error) {
      console.error('获取评论失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 发表评论
   * @param {string} announcementId - 公告ID
   * @param {import('@/types/announcement-comment').CommentCreateParams} data - 评论数据
   * @returns {Promise<import('@/types/announcement-comment').AnnouncementComment>} 新评论
   */
  const submitComment = async (announcementId, data) => {
    submitting.value = true

    try {
      // 调用API
      const { village } = await import('@/api')
      const response = await village.announcement.createComment(announcementId, data)
      const newComment = response.data

      // 更新本地状态
      const comments = commentsMap.value.get(announcementId) || []
      comments.unshift(newComment)
      commentsMap.value.set(announcementId, comments)

      return newComment
    } catch (error) {
      console.error('发表评论失败:', error)
      throw error
    } finally {
      submitting.value = false
    }
  }

  /**
   * 删除评论
   * @param {string} announcementId - 公告ID
   * @param {string} commentId - 评论ID
   * @returns {Promise<void>}
   */
  const deleteComment = async (announcementId, commentId) => {
    try {
      // 调用API
      const { village } = await import('@/api')
      await village.announcement.deleteComment(announcementId, commentId)

      // 更新本地状态
      const comments = commentsMap.value.get(announcementId) || []
      const index = comments.findIndex(c => c.id === commentId)
      if (index > -1) {
        comments.splice(index, 1)
      }
    } catch (error) {
      console.error('删除评论失败:', error)
      throw error
    }
  }

  /**
   * 点赞评论
   * @param {string} commentId - 评论ID
   * @returns {Promise<boolean>} 新的点赞状态
   */
  const toggleLikeComment = async (commentId, announcementId) => {
    // 查找评论
    let comment
    for (const comments of commentsMap.value.values()) {
      comment = comments.find(c => c.id === commentId)
      if (comment) break
    }

    if (!comment) return false

    const isLiked = !comment.liked

    try {
      // 乐观更新
      comment.liked = isLiked
      comment.likeCount = (comment.likeCount || 0) + (isLiked ? 1 : -1)

      // 调用API
      const { village } = await import('@/api')
      await village.announcement.likeComment(announcementId, commentId)

      return isLiked
    } catch (error) {
      // 回滚
      comment.liked = !isLiked
      comment.likeCount = (comment.likeCount || 0) + (isLiked ? -1 : 1)
      throw error
    }
  }

  /**
   * 获取评论回复列表
   * @param {string} commentId - 评论ID
   * @returns {Promise<import('@/types/announcement-comment').CommentReply[]>} 回复列表
   */
  const fetchReplies = async (commentId) => {
    // 如果已有数据，直接返回
    if (repliesMap.value.has(commentId)) {
      return repliesMap.value.get(commentId)
    }

    try {
      // TODO: 调用API（需要公告ID参数）
      // 当前API设计需要announcementId，这里需要调整或从其他地方获取
      // const { village } = await import('@/api')
      // const response = await village.announcement.getCommentReplies(announcementId, commentId)
      // const replies = response.data?.list || []

      // 模拟数据
      const replies = []

      repliesMap.value.set(commentId, replies)

      return replies
    } catch (error) {
      console.error('获取回复失败:', error)
      throw error
    }
  }

  /**
   * 发表回复
   * @param {string} announcementId - 公告ID
   * @param {string} commentId - 评论ID
   * @param {string} content - 回复内容
   * @returns {Promise<import('@/types/announcement-comment').CommentReply>} 新回复
   */
  const submitReply = async (announcementId, commentId, content) => {
    try {
      // 调用API
      const { village } = await import('@/api')
      const response = await village.announcement.createReply(announcementId, commentId, { content })
      const newReply = response.data

      // 更新本地状态
      const replies = repliesMap.value.get(commentId) || []
      replies.push(newReply)
      repliesMap.value.set(commentId, replies)

      // 更新评论的回复数
      for (const comments of commentsMap.value.values()) {
        const comment = comments.find(c => c.id === commentId)
        if (comment) {
          comment.replyCount = (comment.replyCount || 0) + 1
          break
        }
      }

      return newReply
    } catch (error) {
      console.error('发表回复失败:', error)
      throw error
    }
  }

  /**
   * 清除公告的评论缓存
   * @param {string} announcementId - 公告ID
   */
  const clearComments = (announcementId) => {
    commentsMap.value.delete(announcementId)
  }

  /**
   * 重置Store
   */
  const reset = () => {
    commentsMap.value.clear()
    repliesMap.value.clear()
    loading.value = false
    submitting.value = false
  }

  return {
    // 状态
    commentsMap,
    repliesMap,
    loading,
    submitting,

    // 计算属性方法
    getComments,
    getReplies,

    // 方法
    fetchComments,
    submitComment,
    deleteComment,
    toggleLikeComment,
    fetchReplies,
    submitReply,
    clearComments,
    reset
  }
})
