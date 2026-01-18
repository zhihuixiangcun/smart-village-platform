<template>
  <div class="booking-view">
    <van-nav-bar title="预约服务" fixed left-arrow @click-left="onClickLeft" />

    <div v-if="service">
      <div class="service-header">
        <van-image round :src="service.photos[0]?.url || defaultAvatar" class="service-avatar" />
        <div class="service-info">
          <h2 class="service-name">{{ service.name }}</h2>
          <div class="service-meta">
            <van-tag v-if="service.isVerified" type="success" size="small">已认证</van-tag>
            <van-tag :type="getTypeColor(service.type)" plain>{{ getTypeLabel(service.type) }}</van-tag>
            <span class="service-rating">
              <van-rate :value="service.rating?.average || 0" :size="16" allow-half void />
              <span class="rating-text">{{ service.rating?.average || 0 }}</span>
              <span class="rating-count">({{ service.rating?.count || 0 }}条评价</span>
            </span>
            <div class="service-location">
              <van-icon name="location-o" />
              <span>{{ service.serviceArea?.join(', ') || '全小区' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="booking-section">
        <h3 class="section-title">选择服务时间</h3>
        <van-cell-group>
          <van-field 
            v-model="form.appointmentDate"
            name="date"
            type="date"
            label="预约日期"
            placeholder="请选择预约日期"
            :min-date="minDate"
            :max-date="maxDate"
            :rules="[{ required: true, message: '请选择预约日期' }]"
          />
          <van-field
            v-model="form.appointmentTime"
            name="time"
            type="time"
            label="预约时间"
            placeholder="请选择预约时间"
            clickable
            @click="showTimePicker"
          >
            <template #input>
              <div class="field-input">
                <span>{{ form.appointmentTime || '请选择' }}</span>
                <van-icon name="arrow" size="16" />
              </div>
            </template>
          </van-field>
        </van-cell-group>

        <h3 class="section-title">联系信息</h3>
        <van-cell-group>
          <van-field
            v-model="form.contactPhone"
            name="phone"
            label="联系电话"
            placeholder="请输入联系电话"
            :rules="[{ required: true, pattern: /^1[3-9]\d{9}$/ }]"
          />
          <van-field
            v-model="form.contactName"
            name="userName"
            label="联系人姓名"
            placeholder="请输入联系人姓名"
            :rules="[{ required: true, message: '请输入联系人姓名' }]"
          />
        </van-cell-group>

        <h3 class="section-title">服务地址</h3>
        <div class="address-section">
          <van-field
            v-model="form.address"
            type="textarea"
            label="详细地址"
            placeholder="请输入详细地址，包含门牌号"
            :rules="[{ required: true, message: '请输入服务地址' }]"
            rows="3"
            maxlength="200"
          />
          <van-field
            v-model="form.addressDetail"
            name="addressDetail"
            label="详细地址补充"
            placeholder="如：3栋201室"
            type="textarea"
            rows="2"
            maxlength="100"
          />
        </div>
      </div>

      <div class="service-info-section">
        <div class="info-row">
          <span class="info-label">服务类型</span>
          <span class="info-value">{{ getTypeLabel(service.type) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">参考价格</span>
          <span class="info-value">¥{{ service.price }}/次</span>
          <span class="info-unit">/次</span>
        </div>
      </div>

      <div class="booking-actions">
        <van-button type="default" plain @click="onClickLeft">取消</van-button>
        <van-button type="primary" native-type="submit" :loading="submitting" @click="onSubmit">确认预约</van-button>
      </div>
    </div>

    <van-popup v-model="showTimePicker" position="bottom" :style="{ height: '40%' }">
      <van-time-picker
        v-model="selectedTime"
        :min-hour="6"
        :max-hour="22"
        title="选择时间"
        @confirm="onTimeConfirm"
        @cancel="onTimeCancel"
      >
      </van-popup>

    <van-loading v-if="!service" size="24px" vertical>加载中...</van-loading>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Toast, showDialog } from 'vant';
import housekeepingApi from '@/api/housekeepingApi';

const router = useRouter();
const route = useRoute();

const service = ref(null);
const showTimePicker = ref(false);
const selectedTime = ref('');
const submitting = ref(false);

const form = reactive({
  appointmentDate: '',
  appointmentTime: '',
  contactPhone: '',
  contactName: '',
  address: '',
  addressDetail: '',
});

const onClickLeft = () => router.back();

const showTimePicker = () => {
  showTimePicker.value = true;
};

const onTimeConfirm = (value) => {
  selectedTime.value = value;
  showTimePicker.value = false;
};

const onTimeCancel = () => {
  showTimePicker.value = false;
};

const onClickLeft = () => {
  showDialog({
    title: '确认取消预约',
    message: '确定要取消预约吗？',
    showCancelButton: true,
  }).then((action) => {
    if (action === 'confirm') {
      router.back();
    }
  });
};

const onTimeCancel = () => {
  showTimePicker.value = false;
};

const loadService = async () => {
  try {
    const res = await housekeepingApi.getProviderById(route.params.id);
    if (res.success) {
      service.value = res.data;
    }
  } catch (error) {
    console.error('加载服务商信息失败:', error);
    Toast.fail('加载失败');
  }
};

const onTimeConfirm = (value) => {
  selectedTime.value = value;
  showTimePicker.value = false;
};

const onTimeCancel = () => {
  showTimePicker.value = false;
};

const onClickLeft = () => router.back();

const showTimePicker = () => {
  showTimePicker.value = true;
};

const onTimeConfirm = (value) => {
  selectedTime.value = value;
  showTimePicker.value = false;
};

const onTimeCancel = () => {
  showTimePicker.value = false;
};

const onTimeCancel = () => {
  showTimePicker.value = false;
};

const loadService = async () => {
  try {
    const res = await housekeepingApi.getProviderById(route.params.id);
    if (res.success) {
      service.value = res.data;
    }
  } catch (error) {
    console.error('加载服务商信息失败:', error);
    Toast.fail('加载失败');
  }
};

const onTimeConfirm = (value) => {
  selectedTime.value = value;
  showTimePicker.value = false;
};

const onTimeCancel = () => {
  showTimePicker.value = false;
};

const onClickLeft = () => router.back();

const showTimePicker = () => {
  showTimePicker.value = true;
};

const onTimeConfirm = (value) => {
  selectedTime.value = value;
  showTimePicker.value = false;
};

const onTimeCancel = () => {
  showTimePicker.value = false;
};

const onTimeCancel = () => {
  showTimePicker.value = false;
};

const onSubmit = async () => {
  const { appointmentDate, appointmentTime, contactPhone, contactName, address, addressDetail } = form;

  if (!appointmentDate || !appointmentTime || !contactPhone) {
    Toast('请填写必填项');
    return;
  }

  submitting.value = true;
  try {
    const res = await housekeepingApi.createOrder({
      serviceProviderId: route.params.id,
      appointmentDate: `${appointmentDate} ${form.appointmentTime}`,
      serviceType: service.value.type,
      address: {
        street: address.street,
        community: address.community,
        building: address.building,
        roomNumber: address.roomNumber,
        detail: addressDetail,
      },
      contactPhone,
      contactName,
    });
    
    if (res.success) {
      Toast.success('预约成功');
      setTimeout(() => {
        router.push(`/mobile/convenience/housekeeping/order/${res.data._id}`);
      }, 1000);
    }
  } catch (error) {
    console.error('预约失败:', error);
    Toast.fail('预约失败');
  } finally {
    submitting.value = false;
  }
};

const getTypeLabel = (type) => {
  const labels = {
    cleaning: '保洁服务',
    nanny: '月嫂服务',
    elderly: '老人服务',
    babysitter: '保姆服务',
  };
  return labels[type] || type;
};

const getTypeColor = (type) => {
  const colors = {
    cleaning: '#2E8B6',
    nanny: '#FF6B6B',
    elderly: '#9F766A',
    babysitter: '#FF8B6B',
  };
  return colors[type] || '#2E8B6';
};

const loadService = async () => {
  loadService();
};

const getTypeLabel = (type) => {
  const labels = {
    cleaning: '保洁服务',
    nanny: '月嫂服务',
    elderly: '老人服务',
    babysitter: '保姆服务',
  };
  return labels[type] || type;
};

const getTypeColor = (type) => {
  const colors = {
    cleaning: '#2E8B6',
    nanny: '#FF6B6B',
    elderly: '#9F766A',
    babysitter: '#FF8B6B',
  };
  return colors[type] || '#2E8B6';
};

const minDate = computed(() => {
  const today = new Date();
  return today.toISOString().split('T')[0] + 'Z';
});

const maxDate = computed(() => {
  const date = new Date();
  date.setDate(date.getDate() + 90);
  return date.toISOString().split('T')[0] + 'Z';
});

onMounted(() => {
  loadService();
});
</script>

<style scoped>
.booking-view {
  min-height: 100vh;
  background: #E3F2FD;
  padding-top: 46px;
}

.service-header {
  padding: 24px;
  background: #fff;
  margin-bottom: 24px;
}

.service-avatar {
  width: 64px;
  height: 64px;
  margin-right: 16px;
}

.service-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 16px;
}

.service-name {
  font-size: 20px;
  font-weight: 600;
  color: #1A3320;
}

.service-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.service-rating {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rating-text {
  font-size: 14px;
  color: #F59E0B;
}

.rating-count {
  font-size: 14px;
  color: #94A3B8;
}

.service-location {
  display: flex;
  align-items: center;
  gap: 4px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1A3320;
}

.booking-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A3320;
  margin-bottom: 12px;
}

.van-cell {
  background: #F8F9FA;
}

.field-input {
  display: flex;
  align-items: center;
}

.field-input span {
  flex: 1;
}

.field-input .van-field__control {
  text-align: left;
}

.service-info-section {
  padding: 16px;
  border-top: 1px solid #E0E7FF;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.info-label {
  font-size: 14px;
  color: #718096;
}

.info-value {
  font-size: 16px;
  font-weight: 500;
  color: #1A332E;
}

.booking-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
}
</style>
