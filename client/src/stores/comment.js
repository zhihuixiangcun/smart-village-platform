import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import api from '@/utils/api'

export const useCommentStore = defineStore('comment', () => {
  // 状态
  const comments = ref([])
  const currentComment = ref(null)
  const loading = ref(false)
  const stats = reactive({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })

  // 获取评论列表
  const getComments = async (params = {}) => {
    loading.value = true
    try {
      const response = await api.get('/api/announcements/comments', { params })

      if (response.data.success) {
        if (params.page === 1 || !params.page) {
          comments.value = response.data.data.comments
        } else {
          comments.value.push(...response.data.data.comments)
        }
        return response.data
      } else {
        throw new Error(response.data.message || '获取评论列表失败')
      }
    } catch (error) {
      console.error('获取评论列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 获取单个评论详情
  const getCommentById = async (id) => {
    try {
      const response = await api.get(`/api/announcements/comments/${id}`)

      if (response.data.success) {
        currentComment.value = response.data.data
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取评论详情失败')
      }
    } catch (error) {
      console.error('获取评论详情失败:', error)
      throw error
    }
  }

  // 创建评论
  const createComment = async (data) => {
    try {
      const response = await api.post('/api/announcements/comments', data)

      if (response.data.success) {
        const newComment = response.data.data
        // 如果是顶级评论，添加到列表开头
        if (!data.parentId) {
          comments.value.unshift(newComment)
        }
        return newComment
      } else {
        throw new Error(response.data.message || '发表评论失败')
      }
    } catch (error) {
      console.error('发表评论失败:', error)
      throw error
    }
  }

  // 更新评论
  const updateComment = async (id, data) => {
    try {
      const response = await api.put(`/api/announcements/comments/${id}`, data)

      if (response.data.success) {
        // 更新本地列表
        const updateCommentInList = (commentList) => {
          for (let i = 0; i < commentList.length; i++) {
            if (commentList[i].id === id) {
              commentList[i] = { ...commentList[i], ...response.data.data }
              return true
            }
            // 递归更新子评论
            if (commentList[i].replies && commentList[i].replies.length > 0) {
              if (updateCommentInList(commentList[i].replies)) {
                return true
              }
            }
          }
          return false
        }

        updateCommentInList(comments.value)

        if (currentComment.value?.id === id) {
          currentComment.value = { ...currentComment.value, ...response.data.data }
        }

        return response.data.data
      } else {
        throw new Error(response.data.message || '更新评论失败')
      }
    } catch (error) {
      console.error('更新评论失败:', error)
      throw error
    }
  }

  // 删除评论
  const deleteComment = async (id) => {
    try {
      const response = await api.delete(`/api/announcements/comments/${id}`)

      if (response.data.success) {
        // 从本地列表中移除
        const removeCommentFromList = (commentList) => {
          for (let i = 0; i < commentList.length; i++) {
            if (commentList[i].id === id) {
              commentList.splice(i, 1)
              return true
            }
            // 递归删除子评论
            if (commentList[i].replies && commentList[i].replies.length > 0) {
              if (removeCommentFromList(commentList[i].replies)) {
                // 更新父评论的回复数量
                commentList[i].stats.replies = Math.max(0, (commentList[i].stats.replies || 0) - 1)
                return true
              }
            }
          }
          return false
        }

        removeCommentFromList(comments.value)
        return true
      } else {
        throw new Error(response.data.message || '删除评论失败')
      }
    } catch (error) {
      console.error('删除评论失败:', error)
      throw error
    }
  }

  // 点赞评论
  const likeComment = async (id) => {
    try {
      const response = await api.post(`/api/announcements/comments/${id}/like`)

      if (response.data.success) {
        // 更新本地状态
        const updateLikeInList = (commentList) => {
          for (let comment of commentList) {
            if (comment.id === id) {
              comment.isLiked = true
              comment.stats.likes = (comment.stats.likes || 0) + 1
              return true
            }
            if (comment.replies && comment.replies.length > 0) {
              if (updateLikeInList(comment.replies)) {
                return true
              }
            }
          }
          return false
        }

        updateLikeInList(comments.value)
        return response.data.data
      } else {
        throw new Error(response.data.message || '点赞失败')
      }
    } catch (error) {
      console.error('点赞失败:', error)
      throw error
    }
  }

  // 取消点赞评论
  const unlikeComment = async (id) => {
    try {
      const response = await api.delete(`/api/announcements/comments/${id}/like`)

      if (response.data.success) {
        // 更新本地状态
        const updateUnlikeInList = (commentList) => {
          for (let comment of commentList) {
            if (comment.id === id) {
              comment.isLiked = false
              comment.stats.likes = Math.max(0, (comment.stats.likes || 0) - 1)
              return true
            }
            if (comment.replies && comment.replies.length > 0) {
              if (updateUnlikeInList(comment.replies)) {
                return true
              }
            }
          }
          return false
        }

        updateUnlikeInList(comments.value)
        return response.data.data
      } else {
        throw new Error(response.data.message || '取消点赞失败')
      }
    } catch (error) {
      console.error('取消点赞失败:', error)
      throw error
    }
  }

  // 置顶/取消置顶评论
  const toggleTopComment = async (id) => {
    try {
      const response = await api.patch(`/api/announcements/comments/${id}/top`)

      if (response.data.success) {
        // 更新本地状态
        const comment = comments.value.find(c => c.id === id)
        if (comment) {
          comment.isTop = response.data.data.isTop

          // 如果是置顶，移动到列表顶部
          if (comment.isTop) {
            const index = comments.value.indexOf(comment)
            if (index > 0) {
              comments.value.splice(index, 1)
              comments.value.unshift(comment)
            }
          }
        }
        return response.data.data
      } else {
        throw new Error(response.data.message || '操作失败')
      }
    } catch (error) {
      console.error('置顶操作失败:', error)
      throw error
    }
  }

  // 举报评论
  const reportComment = async (id, reportData) => {
    try {
      const response = await api.post(`/api/announcements/comments/${id}/report`, reportData)

      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '举报失败')
      }
    } catch (error) {
      console.error('举报评论失败:', error)
      throw error
    }
  }

  // 审核评论
  const moderateComment = async (id, action, reason = '') => {
    try {
      const response = await api.patch(`/api/announcements/comments/${id}/moderate`, {
        action, // approve, reject, delete
        reason
      })

      if (response.data.success) {
        // 更新本地状态
        const comment = comments.value.find(c => c.id === id)
        if (comment) {
          comment.status = action === 'approve' ? 'approved' :
                          action === 'reject' ? 'rejected' : 'deleted'
        }
        return response.data.data
      } else {
        throw new Error(response.data.message || '审核失败')
      }
    } catch (error) {
      console.error('审核评论失败:', error)
      throw error
    }
  }

  // 批量操作评论
  const batchOperateComments = async (ids, operation) => {
    try {
      const response = await api.post('/api/announcements/comments/batch', {
        ids,
        operation // delete, approve, reject
      })

      if (response.data.success) {
        // 更新本地状态
        if (operation === 'delete') {
          comments.value = comments.value.filter(comment => !ids.includes(comment.id))
        } else {
          ids.forEach(id => {
            const comment = comments.value.find(c => c.id === id)
            if (comment) {
              comment.status = operation === 'approve' ? 'approved' : 'rejected'
            }
          })
        }
        return response.data.data
      } else {
        throw new Error(response.data.message || '批量操作失败')
      }
    } catch (error) {
      console.error('批量操作失败:', error)
      throw error
    }
  }

  // 获取评论统计
  const getCommentStats = async (params = {}) => {
    try {
      const response = await api.get('/api/announcements/comments/stats', { params })

      if (response.data.success) {
        Object.assign(stats, response.data.data)
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取统计失败')
      }
    } catch (error) {
      console.error('获取评论统计失败:', error)
      throw error
    }
  }

  // 搜索评论
  const searchComments = async (query, options = {}) => {
    try {
      const response = await api.get('/api/announcements/comments/search', {
        params: { q: query, ...options }
      })

      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '搜索失败')
      }
    } catch (error) {
      console.error('搜索评论失败:', error)
      throw error
    }
  }

  // 获取用户的评论历史
  const getUserComments = async (userId, params = {}) => {
    try {
      const response = await api.get(`/api/announcements/comments/user/${userId}`, { params })

      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取用户评论失败')
      }
    } catch (error) {
      console.error('获取用户评论失败:', error)
      throw error
    }
  }

  // 获取热门评论
  const getHotComments = async (params = {}) => {
    try {
      const response = await api.get('/api/announcements/comments/hot', { params })

      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取热门评论失败')
      }
    } catch (error) {
      console.error('获取热门评论失败:', error)
      throw error
    }
  }

  // 获取评论回复
  const getCommentReplies = async (commentId, params = {}) => {
    try {
      const response = await api.get(`/api/announcements/comments/${commentId}/replies`, { params })

      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error(response.data.message || '获取回复失败')
      }
    } catch (error) {
      console.error('获取评论回复失败:', error)
      throw error
    }
  }

  // 清空评论列表
  const clearComments = () => {
    comments.value = []
    currentComment.value = null
  }

  // 重置状态
  const resetState = () => {
    comments.value = []
    currentComment.value = null
    loading.value = false
    Object.assign(stats, {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    })
  }

  // 添加新评论到列表（用于实时更新）
  const addComment = (comment) => {
    if (comment.parentId) {
      // 如果是回复，找到父评论并添加
      const findAndAddReply = (commentList) => {
        for (let parentComment of commentList) {
          if (parentComment.id === comment.parentId) {
            if (!parentComment.replies) {
              parentComment.replies = []
            }
            parentComment.replies.push(comment)
            parentComment.stats.replies = (parentComment.stats.replies || 0) + 1
            return true
          }
          if (parentComment.replies && parentComment.replies.length > 0) {
            if (findAndAddReply(parentComment.replies)) {
              return true
            }
          }
        }
        return false
      }
      findAndAddReply(comments.value)
    } else {
      // 顶级评论添加到列表开头
      comments.value.unshift(comment)
    }
  }

  // 更新评论状态（用于实时更新）
  const updateCommentStatus = (id, status) => {
    const updateStatusInList = (commentList) => {
      for (let comment of commentList) {
        if (comment.id === id) {
          comment.status = status
          return true
        }
        if (comment.replies && comment.replies.length > 0) {
          if (updateStatusInList(comment.replies)) {
            return true
          }
        }
      }
      return false
    }
    updateStatusInList(comments.value)
  }

  return {
    // 状态
    comments,
    currentComment,
    loading,
    stats,

    // 基础方法
    getComments,
    getCommentById,
    createComment,
    updateComment,
    deleteComment,

    // 交互方法
    likeComment,
    unlikeComment,
    toggleTopComment,
    reportComment,

    // 管理方法
    moderateComment,
    batchOperateComments,

    // 查询方法
    getCommentStats,
    searchComments,
    getUserComments,
    getHotComments,
    getCommentReplies,

    // 工具方法
    clearComments,
    resetState,
    addComment,
    updateCommentStatus,

    // 简化的方法名
    get: getComments,
    getById: getCommentById,
    create: createComment,
    update: updateComment,
    delete: deleteComment,
    like: likeComment,
    unlike: unlikeComment,
    toggleTop: toggleTopComment,
    report: reportComment,
    moderate: moderateComment,
    batchOperate: batchOperateComments,
    search: searchComments,
    getStats: getCommentStats
  }
})