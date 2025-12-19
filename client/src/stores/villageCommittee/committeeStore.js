import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { committeeApi } from '@/api/villageCommittee'

export const useCommitteeStore = defineStore('committee', () => {
  // 状态
  const members = ref([])
  const partyMembers = ref([])
  const dutySchedule = ref([])
  const householdCodes = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 计算属性
  const activeMembers = computed(() =>
    members.value.filter(m => m.status === 'active')
  )

  const activePartyMembers = computed(() =>
    partyMembers.value.filter(m => m.status === 'active')
  )

  const onDutyToday = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return dutySchedule.value.filter(s => s.date === today)
  })

  // 村委人员管理
  const fetchMembers = async (params = {}) => {
    loading.value = true
    error.value = null
    try {
      const response = await committeeApi.getMembers(params)
      members.value = response.data
      return response
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createMember = async (memberData) => {
    try {
      const response = await committeeApi.createMember(memberData)
      members.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const updateMember = async (id, memberData) => {
    try {
      const response = await committeeApi.updateMember(id, memberData)
      const index = members.value.findIndex(m => m.id === id)
      if (index !== -1) {
        members.value[index] = response.data
      }
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const deleteMember = async (id) => {
    try {
      await committeeApi.deleteMember(id)
      members.value = members.value.filter(m => m.id !== id)
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const transferMember = async (id, transferData) => {
    try {
      const response = await committeeApi.transferMember(id, transferData)
      const index = members.value.findIndex(m => m.id === id)
      if (index !== -1) {
        members.value[index] = { ...members.value[index], ...response.data }
      }
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // 党员信息管理
  const fetchPartyMembers = async (params = {}) => {
    loading.value = true
    try {
      const response = await committeeApi.getPartyMembers(params)
      partyMembers.value = response.data
      return response
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createPartyMember = async (memberData) => {
    try {
      const response = await committeeApi.createPartyMember(memberData)
      partyMembers.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const updatePartyMember = async (id, memberData) => {
    try {
      const response = await committeeApi.updatePartyMember(id, memberData)
      const index = partyMembers.value.findIndex(m => m.id === id)
      if (index !== -1) {
        partyMembers.value[index] = response.data
      }
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // 值班表管理
  const fetchDutySchedule = async (params = {}) => {
    loading.value = true
    try {
      const response = await committeeApi.getDutySchedule(params)
      dutySchedule.value = response.data
      return response
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const createDutySchedule = async (scheduleData) => {
    try {
      const response = await committeeApi.createDutySchedule(scheduleData)
      dutySchedule.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const updateDutySchedule = async (id, scheduleData) => {
    try {
      const response = await committeeApi.updateDutySchedule(id, scheduleData)
      const index = dutySchedule.value.findIndex(s => s.id === id)
      if (index !== -1) {
        dutySchedule.value[index] = response.data
      }
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // 一户一码管理
  const fetchHouseholdCodes = async (params = {}) => {
    loading.value = true
    try {
      const response = await committeeApi.getHouseholdCodes(params)
      householdCodes.value = response.data
      return response
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const generateHouseholdCode = async (householdData) => {
    try {
      const response = await committeeApi.generateHouseholdCode(householdData)
      householdCodes.value.push(response.data)
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const updateHouseholdCode = async (id, data) => {
    try {
      const response = await committeeApi.updateHouseholdCode(id, data)
      const index = householdCodes.value.findIndex(h => h.id === id)
      if (index !== -1) {
        householdCodes.value[index] = response.data
      }
      return response.data
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // 导出功能
  const exportMembers = async (format = 'excel') => {
    try {
      const response = await committeeApi.exportMembers(format)
      return response
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const importMembers = async (file) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await committeeApi.importMembers(formData)
      await fetchMembers()
      return response
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // 重置状态
  const resetState = () => {
    members.value = []
    partyMembers.value = []
    dutySchedule.value = []
    householdCodes.value = []
    loading.value = false
    error.value = null
  }

  return {
    // 状态
    members,
    partyMembers,
    dutySchedule,
    householdCodes,
    loading,
    error,

    // 计算属性
    activeMembers,
    activePartyMembers,
    onDutyToday,

    // 村委人员管理
    fetchMembers,
    createMember,
    updateMember,
    deleteMember,
    transferMember,

    // 党员信息管理
    fetchPartyMembers,
    createPartyMember,
    updatePartyMember,

    // 值班表管理
    fetchDutySchedule,
    createDutySchedule,
    updateDutySchedule,

    // 一户一码管理
    fetchHouseholdCodes,
    generateHouseholdCode,
    updateHouseholdCode,

    // 导入导出
    exportMembers,
    importMembers,

    // 重置
    resetState
  }
})