<template>
  <div class="region-test-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>全国行政区划数据测试</h2>
          <el-button type="primary" @click="loadData">刷新数据</el-button>
        </div>
      </template>

      <el-alert
        title="说明"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        此页面用于测试全国行政区划 API 数据。如果数据为空，请先运行数据导入脚本：
        <code>node scripts/import-regions.js all</code>
      </el-alert>

      <el-form label-width="100px">
        <el-form-item label="省份">
          <el-select
            v-model="selected.provinceCode"
            placeholder="请选择省份"
            filterable
            clearable
            @change="onProvinceChange"
            :loading="loading.provinces"
          >
            <el-option
              v-for="province in provinces"
              :key="province.code"
              :label="province.name"
              :value="province.code"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="城市">
          <el-select
            v-model="selected.cityCode"
            placeholder="请选择城市"
            filterable
            clearable
            :disabled="!selected.provinceCode"
            @change="onCityChange"
            :loading="loading.cities"
          >
            <el-option
              v-for="city in cities"
              :key="city.code"
              :label="city.name"
              :value="city.code"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="区县">
          <el-select
            v-model="selected.districtCode"
            placeholder="请选择区县"
            filterable
            clearable
            :disabled="!selected.cityCode"
            @change="onDistrictChange"
            :loading="loading.districts"
          >
            <el-option
              v-for="district in districts"
              :key="district.code"
              :label="district.name"
              :value="district.code"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="乡镇">
          <el-select
            v-model="selected.townshipCode"
            placeholder="请选择乡镇"
            filterable
            clearable
            :disabled="!selected.districtCode"
            @change="onTownshipChange"
            :loading="loading.townships"
          >
            <el-option
              v-for="township in townships"
              :key="township.code"
              :label="township.name"
              :value="township.code"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="村庄">
          <el-select
            v-model="selected.villageCode"
            placeholder="请选择村庄"
            filterable
            clearable
            :disabled="!selected.townshipCode"
            @change="onVillageChange"
            :loading="loading.villages"
          >
            <el-option
              v-for="village in villages"
              :key="village.code"
              :label="village.name"
              :value="village.code"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <div class="selection-summary">
        <el-descriptions title="当前选择" :column="1" border>
          <el-descriptions-item label="完整地址">{{ fullAddress }}</el-descriptions-item>
          <el-descriptions-item label="省份代码">{{ selected.provinceCode }}</el-descriptions-item>
          <el-descriptions-item label="城市代码">{{ selected.cityCode }}</el-descriptions-item>
          <el-descriptions-item label="区县代码">{{ selected.districtCode }}</el-descriptions-item>
          <el-descriptions-item label="乡镇代码">{{ selected.townshipCode }}</el-descriptions-item>
          <el-descriptions-item label="村庄代码">{{ selected.villageCode }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <h3>API 统计数据</h3>
      </template>
      <el-table :data="statsData" border>
        <el-table-column prop="name" label="数据类型" width="150" />
        <el-table-column prop="value" label="数量" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import regionAPI from '@/services/regionAPI';

const provinces = ref([]);
const cities = ref([]);
const districts = ref([]);
const townships = ref([]);
const villages = ref([]);

const loading = reactive({
  provinces: false,
  cities: false,
  districts: false,
  townships: false,
  villages: false
});

const selected = reactive({
  provinceCode: '',
  cityName: '',
  districtName: '',
  townshipName: '',
  villageName: '',
  provinceCode: '',
  cityCode: '',
  districtCode: '',
  townshipCode: '',
  villageCode: ''
});

const statsData = ref([]);

const fullAddress = computed(() => {
  const address = [
    selected.provinceName,
    selected.cityName,
    selected.districtName,
    selected.townshipName,
    selected.villageName
  ].filter(Boolean).join('');
  return address || '未选择';
});

const loadProvinces = async () => {
  loading.provinces = true;
  try {
    const response = await regionAPI.getProvinces();
    provinces.value = response.data;
  } catch (error) {
    ElMessage.error('加载省份数据失败');
  } finally {
    loading.provinces = false;
  }
};

const onProvinceChange = async (code) => {
  if (!code) {
    cities.value = [];
    selected.provinceName = '';
    selected.provinceCode = '';
    selected.cityCode = '';
    selected.districtCode = '';
    selected.townshipCode = '';
    selected.villageCode = '';
    return;
  }

  const province = provinces.value.find(p => p.code === code);
  selected.provinceName = province?.name || '';

  loading.cities = true;
  try {
    const response = await regionAPI.getCities(code);
    cities.value = response.data;
    districts.value = [];
    townships.value = [];
    villages.value = [];
  } catch (error) {
    ElMessage.error('加载城市数据失败');
  } finally {
    loading.cities = false;
  }
};

const onCityChange = async (code) => {
  if (!code) {
    districts.value = [];
    selected.cityName = '';
    selected.cityCode = '';
    selected.districtCode = '';
    selected.townshipCode = '';
    selected.villageCode = '';
    return;
  }

  const city = cities.value.find(c => c.code === code);
  selected.cityName = city?.name || '';

  loading.districts = true;
  try {
    const response = await regionAPI.getDistricts(selected.provinceCode, code);
    districts.value = response.data;
    townships.value = [];
    villages.value = [];
  } catch (error) {
    ElMessage.error('加载区县数据失败');
  } finally {
    loading.districts = false;
  }
};

const onDistrictChange = async (code) => {
  if (!code) {
    townships.value = [];
    selected.districtName = '';
    selected.districtCode = '';
    selected.townshipCode = '';
    selected.villageCode = '';
    return;
  }

  const district = districts.value.find(d => d.code === code);
  selected.districtName = district?.name || '';

  loading.townships = true;
  try {
    const response = await regionAPI.getTownships(selected.provinceCode, selected.cityCode, code);
    townships.value = response.data;
    villages.value = [];
  } catch (error) {
    ElMessage.error('加载乡镇数据失败');
  } finally {
    loading.townships = false;
  }
};

const onTownshipChange = async (code) => {
  if (!code) {
    villages.value = [];
    selected.townshipName = '';
    selected.townshipCode = '';
    selected.villageCode = '';
    return;
  }

  const township = townships.value.find(t => t.code === code);
  selected.townshipName = township?.name || '';

  loading.villages = true;
  try {
    const response = await regionAPI.getVillages(
      selected.provinceCode,
      selected.cityCode,
      selected.districtCode,
      code,
      {
        provinceName: selected.provinceName,
        cityName: selected.cityName,
        districtName: selected.districtName
      }
    );
    villages.value = response.data;
    selected.villageCode = '';
  } catch (error) {
    ElMessage.error('加载村庄数据失败');
  } finally {
    loading.villages = false;
  }
};

const onVillageChange = (code) => {
  if (!code) {
    selected.villageName = '';
    selected.villageCode = '';
    return;
  }

  const village = villages.value.find(v => v.code === code);
  selected.villageName = village?.name || '';
};

const loadStatistics = async () => {
  try {
    const response = await regionAPI.getStatistics();
    statsData.value = [
      { name: '省份', value: response.data.provinces },
      { name: '地级市', value: response.data.cities },
      { name: '区县', value: response.data.districts },
      { name: '乡镇', value: response.data.townships }
    ];
  } catch (error) {
    ElMessage.error('加载统计数据失败');
  }
};

const loadData = async () => {
  await Promise.all([loadProvinces(), loadStatistics()]);
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.region-test-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
}

.selection-summary {
  margin-top: 20px;
}

code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  color: #c0392b;
}
</style>
