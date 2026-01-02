<template>
  <div class="invite-members-page">
    <!-- 顶部导航栏 -->
    <div class="page-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <span class="header-title">邀请成员</span>
      <button class="confirm-btn" :disabled="selectedCount === 0" @click="confirmInvite">
        <span class="btn-text">确定({{ selectedCount }})</span>
      </button>
    </div>

    <!-- 搜索框 -->
    <div class="search-section">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchText"
          type="text"
          class="search-input"
          placeholder="搜索好友"
          :class="{ 'large-text': isElderlyMode }"
        />
      </div>
    </div>

    <!-- 已选提示 -->
    <div v-if="selectedCount > 0" class="selected-bar">
      <span class="selected-text">已选择 {{ selectedCount }} 人</span>
      <button class="clear-btn" @click="clearAll">
        <span class="clear-text">清空</span>
      </button>
    </div>

    <!-- 好友列表 -->
    <div class="contacts-list">
      <!-- 按首字母分组 -->
      <div v-for="group in groupedContacts" :key="group.letter" class="contact-group">
        <div class="group-letter">{{ group.letter }}</div>

        <div
          v-for="contact in group.contacts"
          :key="contact.id"
          class="contact-item"
          @click="toggleSelect(contact)"
        >
          <input
            v-model="contact.selected"
            type="checkbox"
            class="contact-checkbox"
          />

          <div class="contact-avatar">{{ contact.avatar }}</div>

          <div class="contact-info">
            <div class="contact-name">{{ contact.name }}</div>
            <div class="contact-village">{{ contact.villageName }}</div>
          </div>

          <div v-if="contact.inGroup" class="in-group-badge">
            <span class="badge-text">已在群</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredContacts.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">未找到相关好友</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useChatStore } from '@/store/chat'
import { useElderlyStore } from '@/store/elderly'

const router = useRouter()
const route = useRoute()
const chatStore = useChatStore()
const elderlyStore = useElderlyStore()

// 群组ID
const groupId = ref(route.params.id)

// 搜索文本
const searchText = ref('')

// 好友列表（模拟）
const contacts = ref([
  { id: 'f001', name: '村支书', avatar: '👨‍💼', villageName: '东村', selected: false, inGroup: true, pinyin: 'cunzshu' },
  { id: 'f002', name: '王会计', avatar: '👩‍💼', villageName: '东村', selected: false, inGroup: true, pinyin: 'wangkj' },
  { id: 'f003', name: '李大姐', avatar: '👩', villageName: '东村', selected: false, inGroup: false, pinyin: 'lij' },
  { id: 'f004', name: '张主任', avatar: '👨', villageName: '东村', selected: false, inGroup: false, pinyin: 'zhangzr' },
  { id: 'f005', name: '刘秘书', avatar: '👩‍💼', villageName: '东村', selected: false, inGroup: false, pinyin: 'liums' },
  { id: 'f006', name: '陈大哥', avatar: '👨‍🌾', villageName: '西村', selected: false, inGroup: false, pinyin: 'chendg' },
  { id: 'f007', name: '周阿姨', avatar: '👩', villageName: '南村', selected: false, inGroup: false, pinyin: 'zhouay' },
  { id: 'f008', name: '吴大哥', avatar: '👨', villageName: '北村', selected: false, inGroup: false, pinyin: 'wudg' },
  { id: 'f009', name: '郑师傅', avatar: '👨‍🔧', villageName: '东村', selected: false, inGroup: false, pinyin: 'zhengsf' },
  { id: 'f010', name: '孙大姐', avatar: '👩', villageName: '东村', selected: false, inGroup: false, pinyin: 'sunj' }
])

// 是否适老化模式
const isElderlyMode = computed(() => elderlyStore.isElderlyMode)

// 过滤后的联系人
const filteredContacts = computed(() => {
  if (!searchText.value) {
    return contacts.value.filter(c => !c.inGroup)
  }
  const keyword = searchText.value.toLowerCase()
  return contacts.value.filter(c =>
    !c.inGroup && (
      c.name.toLowerCase().includes(keyword) ||
      c.pinyin.toLowerCase().includes(keyword)
    )
  )
})

// 选中数量
const selectedCount = computed(() => {
  return contacts.value.filter(c => c.selected && !c.inGroup).length
})

// 按首字母分组
const groupedContacts = computed(() => {
  const groups = {}

  filteredContacts.value.forEach(contact => {
    const letter = contact.pinyin.charAt(0).toUpperCase()
    if (!groups[letter]) {
      groups[letter] = []
    }
    groups[letter].push(contact)
  })

  // 排序并转换为数组
  return Object.keys(groups)
    .sort()
    .map(letter => ({
      letter,
      contacts: groups[letter]
    }))
})

// 切换选择
const toggleSelect = (contact) => {
  if (contact.inGroup) return
  contact.selected = !contact.selected
  if (elderlyStore.hapticFeedback) {
    elderlyStore.vibrate('short')
  }
}

// 清空选择
const clearAll = () => {
  contacts.value.forEach(c => c.selected = false)
}

// 确认邀请
const confirmInvite = async () => {
  const selected = contacts.value.filter(c => c.selected && !c.inGroup)

  if (selected.length === 0) return

  // TODO: 调用API发送邀请
  console.log('邀请成员:', selected)

  alert(`已发送 ${selected.length} 个邀请`)

  // 返回群详情页
  router.back()
}

// 返回
const goBack = () => {
  router.back()
}
</script>

<style lang="scss" scoped>
.invite-members-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.page-header {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #eee;

  .back-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: none;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 20px;

    &:active {
      background: #f5f5f5;
    }
  }

  .header-title {
    flex: 1;
    font-size: 18px;
    font-weight: 600;
    color: #333;
    text-align: center;
  }

  .confirm-btn {
    padding: 8px 16px;
    border: none;
    background: #1890ff;
    color: #fff;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;

    &:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  }
}

.search-section {
  padding: 12px 16px;
  background: #fff;

  .search-box {
    display: flex;
    align-items: center;
    background: #f5f5f5;
    border-radius: 8px;
    padding: 10px 12px;

    .search-icon {
      font-size: 16px;
      opacity: 0.5;
      margin-right: 8px;
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 14px;
      outline: none;

      &.large-text {
        font-size: 18px;
      }
    }
  }
}

.selected-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #e6f7ff;
  border-bottom: 1px solid #91d5ff;

  .selected-text {
    font-size: 14px;
    color: #1890ff;
  }

  .clear-btn {
    border: none;
    background: none;
    color: #1890ff;
    font-size: 14px;
    cursor: pointer;
    padding: 4px 8px;
  }
}

.contacts-list {
  flex: 1;
  overflow-y: auto;

  .contact-group {
    margin-bottom: 8px;
    background: #fff;

    .group-letter {
      padding: 8px 16px;
      font-size: 12px;
      color: #999;
      background: #f5f5f5;
    }

    .contact-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #f5f5f5;
      cursor: pointer;

      &:last-child {
        border-bottom: none;
      }

      &:active {
        background: #f5f5f5;
      }

      .contact-checkbox {
        width: 18px;
        height: 18px;
        margin-right: 12px;
        flex-shrink: 0;
      }

      .contact-avatar {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        background: #f0f0f0;
        margin-right: 12px;
        flex-shrink: 0;
      }

      .contact-info {
        flex: 1;

        .contact-name {
          font-size: 15px;
          color: #333;
          margin-bottom: 4px;
        }

        .contact-village {
          font-size: 12px;
          color: #999;
        }
      }

      .in-group-badge {
        .badge-text {
          font-size: 11px;
          color: #999;
          background: #f5f5f5;
          padding: 2px 6px;
          border-radius: 4px;
        }
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80px 20px;

    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.3;
    }

    .empty-text {
      font-size: 16px;
      color: #999;
    }
  }
}

// 适老化模式样式
:deep(.elderly-mode-large) {
  .page-header .header-title {
    font-size: 22px;
  }

  .contact-item .contact-info .contact-name {
    font-size: 18px;
  }
}

:deep(.elderly-mode-xl) {
  .page-header .header-title {
    font-size: 28px;
  }

  .contact-item {
    padding: 16px;

    .contact-avatar {
      width: 48px;
      height: 48px;
      font-size: 24px;
    }

    .contact-info .contact-name {
      font-size: 20px;
    }
  }
}
</style>
