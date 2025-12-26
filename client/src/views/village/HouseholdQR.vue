<template>
  <div class="household-qr">
    <!-- 顶部导航 -->
    <van-nav-bar
      title="一户一码"
      left-arrow
      @click-left="$router.go(-1)"
    >
      <template #right>
        <van-icon name="qr-invalid" size="20" @click="showMyQR" />
      </template>
    </van-nav-bar>

    <!-- 我的户码 -->
    <div class="my-qr-section" v-if="myHousehold">
      <van-cell-group inset title="我的户码">
        <van-cell center>
          <template #title>
            <span class="household-name">{{ myHousehold.householder }}</span>
            <van-tag type="primary" size="small">{{ myHousehold.memberCount }}人</van-tag>
          </template>
          <template #label>
            <span class="code-id">{{ myHousehold.codeId }}</span>
          </template>
          <template #right-icon>
            <van-button size="small" type="primary" @click="showQRCode = true">
              查看二维码
            </van-button>
          </template>
        </van-cell>
        <van-cell :title="myHousehold.address" is-link @click="showDetail = true" />
      </van-cell-group>
    </div>

    <van-empty v-else description="暂无户码信息" />

    <!-- 功能菜单 -->
    <div class="function-menu">
      <van-grid :column-num="3" :border="false">
        <van-grid-item text="扫码查看" icon="scan" @click="showScanner = true" />
        <van-grid-item text="家庭成员" icon="friends" @click="showMembers = true" />
        <van-grid-item text="更新信息" icon="edit" @click="showUpdateForm = true" />
        <van-grid-item text="变更历史" icon="records" @click="showHistory = true" />
        <van-grid-item text="统计信息" icon="bar-chart" @click="showStats = true" />
        <van-grid-item text="刷新码" icon="replay" @click="refreshQRCode" />
      </van-grid>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <van-button type="primary" block icon="plus" @click="showAddMember = true">
        添加家庭成员
      </van-button>
    </div>

    <!-- 二维码弹窗 -->
    <van-dialog v-model:show="showQRCode" title="户码二维码" :show-confirm-button="false">
      <div class="qr-dialog-content">
        <div v-if="qrImageUrl" class="qr-image">
          <img :src="qrImageUrl" alt="户码二维码" />
        </div>
        <van-loading v-else size="24px">生成中...</van-loading>
        <div class="qr-code-text">{{ myHousehold?.codeId }}</div>
        <van-button type="primary" block @click="downloadQR">下载二维码</van-button>
        <van-button block @click="showQRCode = false">关闭</van-button>
      </div>
    </van-dialog>

    <!-- 扫码弹窗 -->
    <van-popup v-model:show="showScanner" position="bottom" :style="{ height: '70%' }">
      <div class="scanner-popup">
        <div class="scanner-header">
          <h3>扫码查看户信息</h3>
          <van-icon name="cross" @click="showScanner = false" />
        </div>
        <div class="scanner-content">
          <van-field
            v-model="scanCodeInput"
            label="户码"
            placeholder="请输入或扫描户码"
          />
          <van-button type="primary" block @click="handleScan">
            确认扫码
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 家庭成员弹窗 -->
    <van-popup v-model:show="showMembers" position="bottom" :style="{ height: '80%' }">
      <div class="members-popup">
        <div class="popup-header">
          <h3>家庭成员</h3>
          <van-icon name="cross" @click="showMembers = false" />
        </div>
        <div class="members-content">
          <van-loading v-if="loadingMembers" size="24px">加载中...</van-loading>
          <van-empty v-else-if="!members.length" description="暂无成员" />
          <van-cell-group v-else inset>
            <van-cell
              v-for="member in members"
              :key="member._id"
              :title="member.name"
              :label="member.relationship"
              is-link
              @click="viewMemberDetail(member)"
            >
              <template #right-icon>
                <van-tag :type="member.isHead ? 'primary' : 'default'" size="small">
                  {{ member.isHead ? '户主' : '' }}
                </van-tag>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
      </div>
    </van-popup>

    <!-- 添加成员弹窗 -->
    <van-dialog v-model:show="showAddMember" title="添加家庭成员" show-cancel-button>
      <van-form @submit="handleAddMember">
        <van-cell-group inset>
          <van-field
            v-model="newMember.name"
            name="name"
            label="姓名"
            placeholder="请输入姓名"
            :rules="[{ required: true, message: '请输入姓名' }]"
          />
          <van-field
            v-model="newMember.idCard"
            name="idCard"
            label="身份证号"
            placeholder="请输入身份证号"
            :rules="[{ required: true, message: '请输入身份证号' }]"
          />
          <van-field name="relationship" label="关系">
            <template #input>
              <van-radio-group v-model="newMember.relationship" direction="horizontal">
                <van-radio name="配偶">配偶</van-radio>
                <van-radio name="子女">子女</van-radio>
                <van-radio name="父母">父母</van-radio>
                <van-radio name="其他">其他</van-radio>
              </van-radio-group>
            </template>
          </van-field>
          <van-field
            v-model="newMember.phone"
            name="phone"
            label="联系电话"
            placeholder="请输入电话"
          />
        </van-cell-group>
        <div class="dialog-actions">
          <van-button round block type="primary" native-type="submit">
            添加成员
          </van-button>
        </div>
      </van-form>
    </van-dialog>

    <!-- 更新信息弹窗 -->
    <van-popup v-model:show="showUpdateForm" position="bottom" round>
      <div class="update-popup">
        <div class="popup-header">
          <h3>更新信息</h3>
          <van-icon name="cross" @click="showUpdateForm = false" />
        </div>
        <van-tabs v-model:active="updateTabActive">
          <van-tab title="地址" title-style="font-size:14px">
            <van-form @submit="handleUpdateAddress">
              <van-cell-group inset>
                <van-field
                  v-model="updateForm.address.detailed"
                  label="详细地址"
                  placeholder="请输入详细地址"
                />
              </van-cell-group>
              <div class="dialog-actions">
                <van-button round block type="primary" native-type="submit">
                  更新地址
                </van-button>
              </div>
            </van-form>
          </van-tab>
          <van-tab title="标签" title-style="font-size:14px">
            <van-form @submit="handleUpdateTags">
              <van-cell-group inset>
                <van-field name="tags" label="家庭标签">
                  <template #input>
                    <van-checkbox-group v-model="updateForm.tags" direction="horizontal">
                      <van-checkbox name="党员家庭">党员家庭</van-checkbox>
                      <van-checkbox name="军属家庭">军属家庭</van-checkbox>
                      <van-checkbox name="文明家庭">文明家庭</van-checkbox>
                      <van-checkbox name="安全家庭">安全家庭</van-checkbox>
                    </van-checkbox-group>
                  </template>
                </van-field>
              </van-cell-group>
              <div class="dialog-actions">
                <van-button round block type="primary" native-type="submit">
                  更新标签
                </van-button>
              </div>
            </van-form>
          </van-tab>
          <van-tab title="联系方式" title-style="font-size:14px">
            <van-form @submit="handleUpdateContact">
              <van-cell-group inset>
                <van-field
                  v-model="updateForm.contact.phone"
                  label="联系电话"
                  placeholder="请输入电话"
                  type="tel"
                />
              </van-cell-group>
              <div class="dialog-actions">
                <van-button round block type="primary" native-type="submit">
                  更新联系方式
                </van-button>
              </div>
            </van-form>
          </van-tab>
        </van-tabs>
      </div>
    </van-popup>

    <!-- 扫码结果弹窗 -->
    <van-popup v-model:show="showScanResult" position="bottom" round>
      <div class="scan-result-popup">
        <div class="popup-header">
          <h3>户信息</h3>
          <van-icon name="cross" @click="showScanResult = false" />
        </div>
        <div class="scan-result-content">
          <van-cell-group inset>
            <van-cell title="户主" :value="scanResult?.household?.householder?.name" />
            <van-cell title="人数" :value="scanResult?.household?.demographics?.totalMembers" />
            <van-cell title="地址" :value="scanResult?.household?.addressText" />
            <van-cell title="状态">
              <template #value>
                <van-tag type="success">正常</van-tag>
              </template>
            </van-cell>
          </van-cell-group>
          <div class="result-actions">
            <van-button type="primary" block @click="showScanResult = false">
              确定
            </van-button>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import householdQRApi from '@/api/householdQR'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// ============ 响应式数据 ============
const myHousehold = ref(null)
const qrImageUrl = ref('')
const loadingMembers = ref(false)
const members = ref([])
const scanResult = ref(null)

// 弹窗控制
const showQRCode = ref(false)
const showScanner = ref(false)
const showMembers = ref(false)
const showAddMember = ref(false)
const showUpdateForm = ref(false)
const showScanResult = ref(false)
const showDetail = ref(false)
const showHistory = ref(false)
const showStats = ref(false)

// 表单数据
const scanCodeInput = ref('')
const newMember = reactive({
  name: '',
  idCard: '',
  relationship: '',
  phone: ''
})
const updateForm = reactive({
  address: { detailed: '' },
  tags: [],
  contact: { phone: '' }
})
const updateTabActive = ref(0)

// ============ 方法 ============
/**
 * 加载我的户码信息
 */
const loadMyHousehold = async () => {
  try {
    // 假设从用户信息中获取 householdId
    const householdId = userStore.userInfo?.householdId
    if (!householdId) {
      showToast('未绑定家庭')
      return
    }

    const response = await householdQRApi.generateQR(householdId)
    if (response.success) {
      myHousehold.value = response.data.household
      qrImageUrl.value = response.data.qrImageUrl
    }
  } catch (error) {
    console.error('加载户码信息失败:', error)
  }
}

/**
 * 显示我的二维码
 */
const showMyQR = () => {
  if (!myHousehold.value) {
    showToast('请先绑定家庭')
    return
  }
  showQRCode.value = true
}

/**
 * 下载二维码
 */
const downloadQR = () => {
  if (!qrImageUrl.value) return

  const link = document.createElement('a')
  link.href = qrImageUrl.value
  link.download = `户码_${myHousehold.value?.codeId}.png`
  link.click()
  showToast('下载成功')
}

/**
 * 处理扫码
 */
const handleScan = async () => {
  const codeId = scanCodeInput.value.trim()
  if (!codeId) {
    showToast('请输入户码')
    return
  }

  try {
    const response = await householdQRApi.publicScanQR(codeId)
    if (response.success) {
      scanResult.value = response.data
      showScanResult.value = true
      showScanner.value = false
      scanCodeInput.value = ''
    }
  } catch (error) {
    showToast(error.message || '扫码失败')
  }
}

/**
 * 刷新二维码
 */
const refreshQRCode = async () => {
  try {
    const householdId = userStore.userInfo?.householdId
    if (!householdId) {
      showToast('未绑定家庭')
      return
    }

    const response = await householdQRApi.refreshQR(householdId)
    if (response.success) {
      qrImageUrl.value = response.data.qrData.qrImageUrl
      showToast('刷新成功')
    }
  } catch (error) {
    showToast('刷新失败')
  }
}

/**
 * 添加成员
 */
const handleAddMember = async () => {
  try {
    const codeId = myHousehold.value?.codeId
    if (!codeId) {
      showToast('户码不存在')
      return
    }

    const response = await householdQRApi.addMember(codeId, newMember)
    if (response.success) {
      showToast('添加成功')
      showAddMember.value = false
      // 重置表单
      Object.assign(newMember, {
        name: '',
        idCard: '',
        relationship: '',
        phone: ''
      })
    }
  } catch (error) {
    showToast(error.message || '添加失败')
  }
}

/**
 * 更新地址
 */
const handleUpdateAddress = async () => {
  try {
    const codeId = myHousehold.value?.codeId
    const response = await householdQRApi.updateAddress(codeId, updateForm.address)
    if (response.success) {
      showToast('更新成功')
      showUpdateForm.value = false
    }
  } catch (error) {
    showToast(error.message || '更新失败')
  }
}

/**
 * 更新标签
 */
const handleUpdateTags = async () => {
  try {
    const codeId = myHousehold.value?.codeId
    const response = await householdQRApi.updateTags(codeId, updateForm.tags)
    if (response.success) {
      showToast('更新成功')
      showUpdateForm.value = false
    }
  } catch (error) {
    showToast(error.message || '更新失败')
  }
}

/**
 * 更新联系方式
 */
const handleUpdateContact = async () => {
  try {
    const codeId = myHousehold.value?.codeId
    const response = await householdQRApi.updateContact(codeId, updateForm.contact.phone)
    if (response.success) {
      showToast('更新成功')
      showUpdateForm.value = false
    }
  } catch (error) {
    showToast(error.message || '更新失败')
  }
}

/**
 * 查看成员详情
 */
const viewMemberDetail = (member) => {
  // TODO: 实现成员详情查看
  console.log('查看成员详情:', member)
}

// ============ 生命周期 ============
onMounted(() => {
  loadMyHousehold()
})
</script>

<style scoped>
.household-qr {
  min-height: 100vh;
  background-color: #f7f8fa;
}

.my-qr-section {
  margin-bottom: 16px;
}

.household-name {
  font-weight: 600;
  margin-right: 8px;
}

.code-id {
  font-family: monospace;
  color: #1989fa;
}

.function-menu {
  margin-bottom: 16px;
}

.quick-actions {
  padding: 16px;
}

/* 二维码弹窗 */
.qr-dialog-content {
  padding: 24px;
  text-align: center;
}

.qr-image img {
  width: 250px;
  height: 250px;
  margin: 0 auto 16px;
}

.qr-code-text {
  font-family: monospace;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}

/* 扫码弹窗 */
.scanner-popup,
.members-popup,
.update-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.popup-header h3 {
  margin: 0;
  font-size: 16px;
}

.scanner-content,
.members-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.update-popup {
  overflow: hidden;
}

/* 对话框操作 */
.dialog-actions {
  padding: 16px;
}

/* 扫码结果 */
.scan-result-popup {
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.scan-result-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.result-actions {
  padding: 16px;
}
</style>
