<template>
  <div class="property-announcements">
    <van-nav-bar title="物业公告" fixed left-arrow @click-left="onClickLeft" />

    <van-pull-refresh v-model="loading" @refresh="onRefresh">
      <van-list v-model="loading="listLoading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <div v-for="announcement in announcementList" :key="announcement._id" class="announcement-card">
          <div class="card-header">
            <van-tag v-if="announcement.isImportant" type="danger" size="small">重要</van-tag>
            <span class="announcement-date">{{ formatDate(announcement.createdAt) }}</span>
          </div>
          <div class="card-body">
            <h3 class="announcement-title">{{ announcement.title }}</h3>
            <p class="announcement-content">{{ announcement.content }}</p>
            <div v-if="announcement.images && announcement.images.length > 0" class="announcement-images">
              <van-image
                v-for="(image, index) in announcement.images.slice(0, 2)"
                :key="index"
                :src="image.url"
                :width="300"
                fit="cover"
                class="announcement-img"
              />
              <div v-if="announcement.images.length > 2" class="more-images">
                +{{ announcement.images.length - 2 }}
              </div>
            </div>
            <div v-if="announcement.attachments && announcement.attachments.length > 0" class="attachments">
              <div class="section-title">附件</div>
              <div
                v-for="(file, index) in announcement.attachments"
                :key="index"
                class="attachment-item"
                @click="downloadAttachment(file)"
              >
                <van-icon name="description" size="16" />
                <span class="file-name">{{ file.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </van-list>
    </van-pull-refresh>

    <van-empty v-if="announcementList.length === 0 && !loading" description="暂无公告" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Toast } from 'vant';
import propertyApi from '@/api/propertyApi';

const router = useRouter();

const announcementList = ref([]);
const loading = ref(false);
const listLoading = ref(false);
const finished = ref(false);
const page = ref(1);

const onClickLeft = () => router.back();

const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const onRefresh = async () => {
  page.value = 1;
  finished.value = false;
  await loadAnnouncements();
  loading.value = false;
};

const onLoad = async () => {
  if (!finished.value) {
    page.value += 1;
    await loadAnnouncements();
  }
};

const loadAnnouncements = async () => {
  listLoading.value = true;
  try {
    const res = await propertyApi.getPublicIssues({ 
      page: page.value, 
      limit: 10,
      issueType: 'suggestion',
    });
    if (res.success) {
      announcementList.value = [...announcementList.value, ...res.data];
      if (res.data.length < 10) finished.value = true;
    }
  } catch (error) {
    console.error('加载公告失败:', error);
    Toast.fail('加载失败');
  } finally {
    listLoading.value = false;
  }
};

const downloadAttachment = (file) => {
  Toast('开始下载：' + file.name);
};

onMounted(() => {
  loadAnnouncements();
});
</script>

<style scoped>
.property-announcements {
  min-height: 100vh;
  background: #E3F2FD;
  padding-top: 46px;
  padding-bottom: 60px;
}

.announcement-card {
  background: #fff;
  margin: 12px;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.announcement-date {
  font-size: 12px;
  color: #718096;
}

.announcement-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A237E;
  margin: 0 0 8px 0;
}

.announcement-content {
  font-size: 14px;
  color: #4A5568;
  line-height: 1.6;
  margin: 0;
}

.announcement-images {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.announcement-img {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  object-fit: cover;
}

.more-images {
  align-self: center;
  color: #F59E0B;
  font-size: 14px;
}

.attachments {
  margin-top: 24px;
  border-top: 1px solid #E0E7FF;
  padding-top: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1A237E;
  margin-bottom: 12px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  background: #F8F9FA;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.attachment-item:active {
  background: #E3F2FD;
}

.file-name {
  font-size: 14px;
  color: #1A237E;
}
</style>
