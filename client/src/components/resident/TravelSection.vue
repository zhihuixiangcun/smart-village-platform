<template>
  <section class="travel-section" aria-label="交通出行">
    <!-- 区块标题 -->
    <div class="section-header">
      <div class="title-left">
        <el-icon class="section-icon"><Odometer /></el-icon>
        <h2 class="section-title">交通出行</h2>
      </div>
    </div>

    <!-- 交通服务入口 -->
    <div class="travel-services">
      <div class="service-card" @click="searchFlight">
        <div class="service-icon flight">
          <el-icon :size="32"><Van /></el-icon>
        </div>
        <div class="service-info">
          <h3>航班查询</h3>
          <p>查询附近机场</p>
        </div>
        <el-icon class="arrow"><ArrowRight /></el-icon>
      </div>

      <div class="service-card" @click="searchTrain">
        <div class="service-icon train">
          <el-icon :size="32"><Van /></el-icon>
        </div>
        <div class="service-info">
          <h3>高铁查询</h3>
          <p>查询高铁站</p>
        </div>
        <el-icon class="arrow"><ArrowRight /></el-icon>
      </div>
    </div>

    <!-- 拼车服务 -->
    <div class="carpool-service">
      <div class="carpool-header">
        <h3>
          <el-icon><Flag /></el-icon>
          拼车 / 顺风车
        </h3>
        <el-button type="primary" @click="showPublishDialog">
          <el-icon><Plus /></el-icon>
          发布拼车
        </el-button>
      </div>

      <!-- 拼车搜索表单 -->
      <div class="carpool-search">
        <div class="form-row">
          <label>从</label>
          <el-input
            v-model="carpoolForm.from"
            placeholder="当前定位"
            :prefix-icon="Location"
            readonly
            @click="useCurrentLocation"
          >
            <template #append>
              <el-button :icon="Aim" @click="useCurrentLocation">定位</el-button>
            </template>
          </el-input>
        </div>

        <div class="form-row">
          <label>到</label>
          <el-input
            v-model="carpoolForm.to"
            placeholder="输入目的地"
            :prefix-icon="Location"
            clearable
          >
            <template #append>
              <el-button
                :icon="Microphone"
                @click="startVoiceInput"
                :disabled="!supportsSpeechRecognition"
              >
                语音
              </el-button>
            </template>
          </el-input>
        </div>

        <div class="form-row">
          <label>时间</label>
          <el-date-picker
            v-model="carpoolForm.date"
            type="datetime"
            placeholder="选择出发时间"
            :disabled-date="disabledDate"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm"
            style="width: 100%"
          />
        </div>

        <div class="form-row">
          <label>座位</label>
          <el-input-number
            v-model="carpoolForm.seats"
            :min="1"
            :max="10"
            size="large"
            style="width: 100%"
          />
        </div>

        <el-button
          type="primary"
          size="large"
          :loading="searching"
          @click="searchCarpool"
          style="width: 100%; margin-top: 12px"
        >
          <el-icon><Search /></el-icon>
          查找拼车
        </el-button>
      </div>

      <!-- 最新拼车信息 -->
      <div v-if="carpools.length > 0" class="carpool-list">
        <div class="list-header">
          <h4>最新拼车信息</h4>
          <span class="count">{{ carpools.length }}条</span>
        </div>

        <div
          v-for="carpool in carpools"
          :key="carpool.id"
          class="carpool-item"
          @click="viewCarpoolDetail(carpool)"
        >
          <div class="driver-info">
            <el-avatar :src="carpool.driverAvatar" :size="44">
              {{ carpool.driverName.charAt(0) }}
            </el-avatar>
            <div class="driver-details">
              <div class="driver-name">
                {{ carpool.driverName }}
                <el-tag v-if="carpool.verified" type="success" size="small">实名</el-tag>
              </div>
              <el-rate v-model="carpool.driverRating" disabled size="small" show-score />
            </div>
          </div>

          <div class="route-info">
            <div class="route-line">
              <span class="from">{{ carpool.fromLocation }}</span>
              <el-icon><Right /></el-icon>
              <span class="to">{{ carpool.toLocation }}</span>
            </div>
            <div class="trip-details">
              <span class="time">
                <el-icon><Clock /></el-icon>
                {{ formatTime(carpool.departureTime) }}
              </span>
              <span class="seats">
                <el-icon><User /></el-icon>
                {{ carpool.availableSeats }}/{{ carpool.totalSeats }}座
              </span>
              <span class="price">¥{{ carpool.pricePerSeat }}/人</span>
            </div>
          </div>

          <div class="carpool-actions">
            <el-button type="primary" size="small" @click.stop="contactDriver(carpool)">
              <el-icon><Phone /></el-icon>
              联系
            </el-button>
            <el-button size="small" @click.stop="bookCarpool(carpool)"> 预订 </el-button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-carpool">
        <el-empty description="暂无拼车信息" :image-size="120">
          <el-button type="primary" @click="showPublishDialog">发布拼车信息</el-button>
        </el-empty>
      </div>
    </div>

    <!-- 发布拼车对话框 -->
    <el-dialog
      v-model="publishDialogVisible"
      title="发布拼车信息"
      width="90%"
      :close-on-click-modal="false"
    >
      <el-form :model="publishForm" label-width="80px" label-position="top">
        <el-form-item label="出发地" required>
          <el-input v-model="publishForm.fromLocation" placeholder="如：李家村村委会" />
        </el-form-item>

        <el-form-item label="目的地" required>
          <el-input v-model="publishForm.toLocation" placeholder="如：县城汽车站" />
        </el-form-item>

        <el-form-item label="出发时间" required>
          <el-date-picker
            v-model="publishForm.departureTime"
            type="datetime"
            placeholder="选择出发时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="座位数" required>
          <el-input-number v-model="publishForm.availableSeats" :min="1" :max="10" />
        </el-form-item>

        <el-form-item label="价格/座" required>
          <el-input-number v-model="publishForm.pricePerSeat" :min="0" :precision="0" />
          <span style="margin-left: 8px">元</span>
        </el-form-item>

        <el-form-item label="车型">
          <el-select v-model="publishForm.vehicleType" placeholder="选择车型" style="width: 100%">
            <el-option label="小轿车" value="sedan" />
            <el-option label="SUV" value="suv" />
            <el-option label="面包车" value="van" />
            <el-option label="货车" value="truck" />
          </el-select>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="publishForm.note"
            type="textarea"
            :rows="3"
            placeholder="如：可带小件行李、宠物友好等"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishing" @click="publishCarpool"> 发布 </el-button>
      </template>
    </el-dialog>

    <!-- 安全提示 -->
    <el-alert type="warning" :closable="false" show-icon>
      <template #title>
        <span style="font-size: 13px">
          安全提示：拼车出行请注意安全，核实司机信息，建议选择实名认证司机
        </span>
      </template>
    </el-alert>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Odometer,
  Van,
  ArrowRight,
  Flag,
  Plus,
  Location,
  Aim,
  Microphone,
  Search,
  Right,
  Clock,
  User,
  Phone,
} from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { Carpool, FlightInfo, TrainStation } from '@/types/marketplace';

// 状态
const searching = ref(false);
const publishing = ref(false);
const publishDialogVisible = ref(false);
const supportsSpeechRecognition = ref(false);

// 拼车搜索表单
const carpoolForm = ref({
  from: '',
  to: '',
  date: '',
  seats: 1,
});

// 发布拼车表单
const publishForm = ref({
  fromLocation: '',
  toLocation: '',
  departureTime: '',
  availableSeats: 4,
  pricePerSeat: 20,
  vehicleType: 'sedan',
  note: '',
});

// 拼车列表
const carpools = ref<Carpool[]>([]);

// 方法
const searchFlight = () => {
  ElMessage.info('航班查询功能开发中...');
  // TODO: 集成航班查询API
};

const searchTrain = () => {
  ElMessage.info('高铁查询功能开发中...');
  // TODO: 集成高铁查询API
};

const useCurrentLocation = () => {
  if (!navigator.geolocation) {
    ElMessage.warning('您的浏览器不支持定位');
    return;
  }

  ElMessage.info('正在获取位置...');
  navigator.geolocation.getCurrentPosition(
    position => {
      // TODO: 反向地理编码获取地址
      carpoolForm.value.from = '当前位置';
      ElMessage.success('定位成功');
    },
    error => {
      console.error('定位失败:', error);
      ElMessage.error('定位失败，请手动输入');
    }
  );
};

const startVoiceInput = () => {
  if (!supportsSpeechRecognition.value) {
    ElMessage.warning('您的浏览器不支持语音输入');
    return;
  }

  ElMessage.info('语音输入功能开发中...');
  // TODO: 集成语音识别
};

const disabledDate = (time: Date) => {
  // 不能选择过去的时间
  return time.getTime() < Date.now() - 8.64e7;
};

const searchCarpool = async () => {
  if (!carpoolForm.value.to) {
    ElMessage.warning('请输入目的地');
    return;
  }

  searching.value = true;
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 模拟数据
    carpools.value = [
      {
        id: 'c1',
        driverId: 'd1',
        driverName: '张师傅',
        driverAvatar: '',
        driverRating: 4.8,
        verified: true,
        fromLocation: carpoolForm.value.from || '李家村',
        toLocation: carpoolForm.value.to,
        departureTime: '2026-01-06 08:00',
        availableSeats: 3,
        totalSeats: 4,
        pricePerSeat: 25,
        vehicleType: '小轿车',
        licensePlate: '浙A****8',
        note: '可带小件行李',
        status: 'active',
        publishTime: new Date().toISOString(),
      },
      {
        id: 'c2',
        driverId: 'd2',
        driverName: '李师傅',
        driverAvatar: '',
        driverRating: 4.6,
        verified: true,
        fromLocation: carpoolForm.value.from || '李家村',
        toLocation: carpoolForm.value.to,
        departureTime: '2026-01-06 14:00',
        availableSeats: 2,
        totalSeats: 5,
        pricePerSeat: 20,
        vehicleType: 'SUV',
        licensePlate: '浙A****6',
        status: 'active',
        publishTime: new Date().toISOString(),
      },
    ];

    ElMessage.success(`找到 ${carpools.value.length} 条拼车信息`);
  } catch (error) {
    console.error('搜索失败:', error);
    ElMessage.error('搜索失败，请重试');
  } finally {
    searching.value = false;
  }
};

const formatTime = (time: string) => {
  const date = new Date(time);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return '今天 ' + time.split(' ')[1];
  } else if (days === 1) {
    return '明天 ' + time.split(' ')[1];
  }
  return time;
};

const viewCarpoolDetail = (carpool: Carpool) => {
  ElMessageBox.alert(
    `
    <div style="text-align: left;">
      <p><strong>司机：</strong>${carpool.driverName}</p>
      <p><strong>车型：</strong>${carpool.vehicleType}</p>
      <p><strong>车牌：</strong>${carpool.licensePlate}</p>
      <p><strong>路线：</strong>${carpool.fromLocation} → ${carpool.toLocation}</p>
      <p><strong>时间：</strong>${carpool.departureTime}</p>
      <p><strong>座位：</strong>${carpool.availableSeats}/${carpool.totalSeats}</p>
      <p><strong>价格：</strong>¥${carpool.pricePerSeat}/人</p>
      ${carpool.note ? `<p><strong>备注：</strong>${carpool.note}</p>` : ''}
    </div>
    `,
    '拼车详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '联系司机',
    }
  );
};

/**
 * 脱敏显示电话号码
 */
const maskPhone = (phone: string): string => {
  // 如果已经是脱敏的,直接返回
  if (phone.includes('****')) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

const contactDriver = async (carpool: Carpool) => {
  try {
    await ElMessageBox.confirm(
      `联系 ${carpool.driverName}？\n司机评分: ${carpool.driverRating}⭐\n${carpool.verified ? '✓ 实名认证' : '⚠ 未认证'}`,
      '确认联系司机',
      {
        confirmButtonText: '查看联系方式',
        cancelButtonText: '取消',
        type: 'info',
        distinguishCancelAndClose: true,
      }
    );

    // 显示完整联系方式(实际应用中应该从后端获取)
    await ElMessageBox.alert(
      `<div style="text-align: left; line-height: 2;">
        <p style="font-size: 16px; margin: 10px 0;"><strong>司机:</strong> ${carpool.driverName}</p>
        <p style="font-size: 16px; margin: 10px 0;"><strong>电话:</strong> ${maskPhone('13812345678')}</p>
        <p style="font-size: 14px; margin: 10px 0;"><strong>车型:</strong> ${carpool.vehicleType}</p>
        <p style="font-size: 14px; margin: 10px 0;"><strong>车牌:</strong> ${carpool.licensePlate}</p>
        <p style="color: #f56c6c; font-size: 13px; margin: 10px 0;">⚠️ 安全提示：请核实司机信息后再上车</p>
      </div>`,
      '司机联系方式',
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '复制电话',
        callback: () => {
          navigator.clipboard.writeText('13812345678');
          ElMessage.success('电话号码已复制到剪贴板');
        },
      }
    );
  } catch {
    // 用户取消
  }
};

const bookCarpool = (carpool: Carpool) => {
  ElMessageBox.confirm(
    `预订 ${carpool.driverName} 的拼车？\n路线：${carpool.fromLocation} → ${carpool.toLocation}\n时间：${carpool.departureTime}\n价格：¥${carpool.pricePerSeat}/人`,
    '预订拼车',
    {
      confirmButtonText: '确认预订',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      ElMessage.success('预订成功！司机将尽快与您联系');
    })
    .catch(() => {
      // 用户取消
    });
};

const showPublishDialog = () => {
  publishDialogVisible.value = true;
  // 设置默认时间
  const now = new Date();
  now.setHours(now.getHours() + 2);
  publishForm.value.departureTime = now.toISOString().slice(0, 16).replace('T', ' ');
};

const publishCarpool = async () => {
  // 表单验证
  if (!publishForm.value.fromLocation || !publishForm.value.toLocation) {
    ElMessage.warning('请填写出发地和目的地');
    return;
  }
  if (!publishForm.value.departureTime) {
    ElMessage.warning('请选择出发时间');
    return;
  }

  publishing.value = true;
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));

    ElMessage.success('发布成功！');
    publishDialogVisible.value = false;

    // 刷新列表
    await searchCarpool();
  } catch (error) {
    console.error('发布失败:', error);
    ElMessage.error('发布失败，请重试');
  } finally {
    publishing.value = false;
  }
};

// 生命周期
onMounted(() => {
  // 检查语音识别支持
  supportsSpeechRecognition.value =
    'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  // 加载初始拼车信息
  carpoolForm.value.from = '李家村';
});
</script>

<style lang="scss" scoped>
.travel-section {
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;

  .section-icon {
    font-size: 24px;
    color: #409eff;
  }

  .section-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }
}

.travel-services {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;

  .service-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      border-color: var(--el-color-primary);
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
    }

    .service-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;

      &.flight {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      &.train {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }
    }

    .service-info {
      flex: 1;

      h3 {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 4px 0;
      }

      p {
        font-size: 13px;
        color: var(--el-text-color-secondary);
        margin: 0;
      }
    }

    .arrow {
      color: var(--el-text-color-secondary);
    }
  }
}

.carpool-service {
  .carpool-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }
  }

  .carpool-search {
    padding: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 12px;
    margin-bottom: 16px;

    .form-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;

      &:last-of-type {
        margin-bottom: 0;
      }

      label {
        width: 40px;
        font-weight: 500;
        color: var(--el-text-color-regular);
      }

      :deep(.el-input),
      :deep(.el-date-picker),
      :deep(.el-input-number) {
        flex: 1;
      }
    }
  }

  .carpool-list {
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      h4 {
        font-size: 15px;
        font-weight: 600;
        margin: 0;
      }

      .count {
        font-size: 13px;
        color: var(--el-text-color-secondary);
      }
    }

    .carpool-item {
      padding: 12px;
      border: 1px solid var(--el-border-color-lighter);
      border-radius: 12px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        border-color: var(--el-color-primary);
        box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
      }

      .driver-info {
        display: flex;
        gap: 12px;
        margin-bottom: 12px;

        .driver-details {
          flex: 1;

          .driver-name {
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
        }
      }

      .route-info {
        margin-bottom: 12px;

        .route-line {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 500;
          margin-bottom: 8px;

          .from {
            color: var(--el-color-success);
          }

          .to {
            color: var(--el-color-danger);
          }
        }

        .trip-details {
          display: flex;
          gap: 16px;
          font-size: 13px;
          color: var(--el-text-color-secondary);

          span {
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .price {
            margin-left: auto;
            font-size: 16px;
            font-weight: 600;
            color: var(--el-color-danger);
          }
        }
      }

      .carpool-actions {
        display: flex;
        gap: 8px;

        .el-button {
          flex: 1;
        }
      }
    }
  }

  .empty-carpool {
    padding: 40px 20px;
    text-align: center;
  }
}

// 大字模式适配
.large-text-mode {
  .travel-services .service-card {
    padding: 20px;

    .service-icon {
      width: 64px;
      height: 64px;
    }

    .service-info h3 {
      font-size: 18px;
    }
  }

  .carpool-item .route-info .route-line {
    font-size: 17px;
  }
}
</style>
