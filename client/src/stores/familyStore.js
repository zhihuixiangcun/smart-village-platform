/**
 * Family Store
 * 家庭状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as familyApi from '@/api/family'

export const useFamilyStore = defineStore('family', () => {
  // State
  const families = ref([])
  const currentFamily = ref(null)
  const currentMembers = ref([])
  const statistics = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Pagination
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0
  })

  // Filters
  const filters = ref({
    familyType: '',
    needsVisit: '',
    housingType: '',
    riskLevel: '',
    keyword: ''
  })

  // Computed
  const filteredFamilies = computed(() => {
    let result = families.value

    if (filters.value.keyword) {
      const keyword = filters.value.keyword.toLowerCase()
      result = result.filter(f =>
        f.houseNumber?.toLowerCase().includes(keyword) ||
        f.headOfHousehold?.name?.toLowerCase().includes(keyword) ||
        f.address?.detail?.toLowerCase().includes(keyword)
      )
    }

    if (filters.value.familyType) {
      result = result.filter(f =>
        f.familyTypes?.includes(filters.value.familyType)
      )
    }

    if (filters.value.needsVisit !== '') {
      const needsVisit = filters.value.needsVisit === 'true'
      result = result.filter(f =>
        f.specialFlags?.needsRegularVisit === needsVisit
      )
    }

    if (filters.value.riskLevel) {
      result = result.filter(f =>
        f.specialFlags?.riskLevel === filters.value.riskLevel
      )
    }

    return result
  })

  const familiesByPriority = computed(() => {
    return [...filteredFamilies.value].sort((a, b) =>
      (b.specialFlags?.helpPriority || 0) - (a.specialFlags?.helpPriority || 0)
    )
  })

  const needsVisitFamilies = computed(() => {
    return filteredFamilies.value.filter(f =>
      f.specialFlags?.needsRegularVisit
    )
  })

  const highRiskFamilies = computed(() => {
    return filteredFamilies.value.filter(f =>
      f.specialFlags?.riskLevel === '高'
    )
  })

  // Actions
  async function fetchFamilies(villageId, params = {}) {
    loading.value = true
    error.value = null

    try {
      const response = await familyApi.familyApi.getFamilyList(villageId, {
        ...filters.value,
        ...pagination.value,
        ...params
      })

      families.value = response.data || []
      pagination.value.total = response.total || families.value.length
    } catch (err) {
      error.value = err.message || '获取家庭列表失败'
      console.error('Error fetching families:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchFamilyById(familyId) {
    loading.value = true
    error.value = null

    try {
      const response = await familyApi.familyApi.getFamilyById(familyId)
      currentFamily.value = response.data.family
      currentMembers.value = response.data.members || []
      return response.data
    } catch (err) {
      error.value = err.message || '获取家庭详情失败'
      console.error('Error fetching family:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchFamilyByQRCode(qrCode) {
    loading.value = true
    error.value = null

    try {
      const response = await familyApi.familyApi.getFamilyByQRCode(qrCode)
      currentFamily.value = response.data.family
      currentMembers.value = response.data.members || []
      return response.data
    } catch (err) {
      error.value = err.message || '获取家庭信息失败'
      console.error('Error fetching family by QR:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createFamily(familyData) {
    loading.value = true
    error.value = null

    try {
      const response = await familyApi.familyApi.createFamily(familyData)

      // 添加到列表
      if (response.data) {
        families.value.unshift(response.data)
      }

      return response.data
    } catch (err) {
      error.value = err.message || '创建家庭档案失败'
      console.error('Error creating family:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateFamily(familyId, familyData) {
    loading.value = true
    error.value = null

    try {
      const response = await familyApi.familyApi.updateFamily(familyId, familyData)

      // 更新列表中的数据
      const index = families.value.findIndex(f => f._id === familyId)
      if (index !== -1) {
        families.value[index] = response.data
      }

      // 更新当前家庭
      if (currentFamily.value?._id === familyId) {
        currentFamily.value = response.data
      }

      return response.data
    } catch (err) {
      error.value = err.message || '更新家庭档案失败'
      console.error('Error updating family:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteFamily(familyId) {
    loading.value = true
    error.value = null

    try {
      await familyApi.familyApi.deleteFamily(familyId)

      // 从列表中移除
      families.value = families.value.filter(f => f._id !== familyId)

      // 清除当前家庭
      if (currentFamily.value?._id === familyId) {
        currentFamily.value = null
        currentMembers.value = []
      }
    } catch (err) {
      error.value = err.message || '删除家庭档案失败'
      console.error('Error deleting family:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function searchFamilies(villageId, keyword) {
    loading.value = true
    error.value = null

    try {
      const response = await familyApi.familyApi.searchFamilies(villageId, keyword)
      families.value = response.data || []
      return response.data
    } catch (err) {
      error.value = err.message || '搜索失败'
      console.error('Error searching families:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchStatistics(villageId) {
    loading.value = true
    error.value = null

    try {
      const response = await familyApi.familyApi.getStatistics(villageId)
      statistics.value = response.data
      return response.data
    } catch (err) {
      error.value = err.message || '获取统计数据失败'
      console.error('Error fetching statistics:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 成员管理
  async function addMember(familyId, memberData) {
    loading.value = true
    error.value = null

    try {
      const response = await familyApi.familyMemberApi.addMember(familyId, memberData)

      // 添加到成员列表
      if (currentFamily.value?._id === familyId) {
        currentMembers.value.push(response.data)

        // 更新成员数量
        if (currentFamily.value) {
          currentFamily.value.memberCount = currentMembers.value.length
        }
      }

      return response.data
    } catch (err) {
      error.value = err.message || '添加成员失败'
      console.error('Error adding member:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateMember(memberId, memberData) {
    loading.value = true
    error.value = null

    try {
      const response = await familyApi.familyMemberApi.updateMember(memberId, memberData)

      // 更新成员列表
      const index = currentMembers.value.findIndex(m => m._id === memberId)
      if (index !== -1) {
        currentMembers.value[index] = response.data
      }

      return response.data
    } catch (err) {
      error.value = err.message || '更新成员信息失败'
      console.error('Error updating member:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteMember(memberId) {
    loading.value = true
    error.value = null

    try {
      await familyApi.familyMemberApi.deleteMember(memberId)

      // 从成员列表中移除
      currentMembers.value = currentMembers.value.filter(m => m._id !== memberId)

      // 更新成员数量
      if (currentFamily.value) {
        currentFamily.value.memberCount = currentMembers.value.length
      }
    } catch (err) {
      error.value = err.message || '删除成员失败'
      console.error('Error deleting member:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 二维码管理
  async function regenerateQRCode(familyId, expiresInDays = null) {
    loading.value = true
    error.value = null

    try {
      const response = await familyApi.qrCodeApi.regenerateQRCode(familyId, expiresInDays)

      // 更新家庭信息
      if (currentFamily.value?._id === familyId) {
        currentFamily.value = response.data
      }

      const index = families.value.findIndex(f => f._id === familyId)
      if (index !== -1) {
        families.value[index] = response.data
      }

      return response.data
    } catch (err) {
      error.value = err.message || '重新生成二维码失败'
      console.error('Error regenerating QR code:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function revokeQRCode(familyId) {
    loading.value = true
    error.value = null

    try {
      const response = await familyApi.qrCodeApi.revokeQRCode(familyId)

      // 更新家庭信息
      if (currentFamily.value?._id === familyId) {
        currentFamily.value = response.data
      }

      const index = families.value.findIndex(f => f._id === familyId)
      if (index !== -1) {
        families.value[index] = response.data
      }

      return response.data
    } catch (err) {
      error.value = err.message || '撤销二维码失败'
      console.error('Error revoking QR code:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function recordQRCodePrint(familyId) {
    try {
      const response = await familyApi.qrCodeApi.recordPrint(familyId)

      // 更新打印次数
      if (currentFamily.value?._id === familyId) {
        currentFamily.value.qrCode.printCount = response.data.printCount
        currentFamily.value.qrCode.lastPrintedAt = response.data.lastPrintedAt
      }

      return response.data
    } catch (err) {
      error.value = err.message || '记录打印失败'
      console.error('Error recording print:', err)
      throw err
    }
  }

  // 标签管理
  async function addFamilyTag(familyId, tagName, color = '#409EFF') {
    try {
      const response = await familyApi.tagApi.addFamilyTag(familyId, tagName, color)

      // 更新标签列表
      if (currentFamily.value?._id === familyId) {
        currentFamily.value.tags = response.data
      }

      return response.data
    } catch (err) {
      error.value = err.message || '添加标签失败'
      console.error('Error adding tag:', err)
      throw err
    }
  }

  async function removeFamilyTag(familyId, tagName) {
    try {
      const response = await familyApi.tagApi.removeFamilyTag(familyId, tagName)

      // 更新标签列表
      if (currentFamily.value?._id === familyId) {
        currentFamily.value.tags = response.data
      }

      return response.data
    } catch (err) {
      error.value = err.message || '移除标签失败'
      console.error('Error removing tag:', err)
      throw err
    }
  }

  // Filter and Pagination
  function setFilter(key, value) {
    filters.value[key] = value
    pagination.value.page = 1 // 重置到第一页
  }

  function clearFilters() {
    filters.value = {
      familyType: '',
      needsVisit: '',
      housingType: '',
      riskLevel: '',
      keyword: ''
    }
    pagination.value.page = 1
  }

  function setPagination(page, pageSize) {
    pagination.value.page = page
    pagination.value.pageSize = pageSize
  }

  // Reset
  function reset() {
    families.value = []
    currentFamily.value = null
    currentMembers.value = []
    statistics.value = null
    loading.value = false
    error.value = null
    pagination.value = {
      page: 1,
      pageSize: 20,
      total: 0
    }
    filters.value = {
      familyType: '',
      needsVisit: '',
      housingType: '',
      riskLevel: '',
      keyword: ''
    }
  }

  return {
    // State
    families,
    currentFamily,
    currentMembers,
    statistics,
    loading,
    error,
    pagination,
    filters,

    // Computed
    filteredFamilies,
    familiesByPriority,
    needsVisitFamilies,
    highRiskFamilies,

    // Actions
    fetchFamilies,
    fetchFamilyById,
    fetchFamilyByQRCode,
    createFamily,
    updateFamily,
    deleteFamily,
    searchFamilies,
    fetchStatistics,
    addMember,
    updateMember,
    deleteMember,
    regenerateQRCode,
    revokeQRCode,
    recordQRCodePrint,
    addFamilyTag,
    removeFamilyTag,
    setFilter,
    clearFilters,
    setPagination,
    reset
  }
})
