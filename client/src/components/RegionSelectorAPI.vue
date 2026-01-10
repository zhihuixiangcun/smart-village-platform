<template>
  <div class="region-selector">
    <div class="region-selector-wrapper">
      <div class="location-actions">
        <el-button
          v-if="locating"
          :loading="true"
          type="primary"
          plain
          @click="getCurrentLocation"
          size="small"
        >
          <el-icon><LocationInformation /></el-icon>
          正在定位...
        </el-button>

        <el-button
          v-else-if="locationPermissionDenied"
          type="warning"
          plain
          @click="requestLocationPermission"
          size="small"
        >
          <el-icon><Warning /></el-icon>
          允许定位权限
        </el-button>

        <el-button
          v-else
          type="primary"
          plain
          @click="getCurrentLocation"
          size="small"
        >
          <el-icon><Location /></el-icon>
          使用当前位置
        </el-button>

        <el-alert
          v-if="locationPermissionDenied"
          title="定位权限说明"
          type="warning"
          :closable="false"
          style="margin-top: 8px;"
        >
          为了自动获取您所在的乡镇和村庄，请允许浏览器获取您的位置信息。您的位置信息仅用于行政区划选择，不会用于其他用途。
        </el-alert>
      </div>

      <div class="region-tree-container">
        <label class="region-label">请选择行政区划</label>
        <el-tree-select
          v-model="selectedRegionPath"
          :data="regionTreeData"
          :props="treeSelectProps"
          :placeholder="placeholder"
          filterable
          clearable
          check-strictly
          :render-after-expand="false"
          :default-expand-all="false"
          :load="loadTreeNode"
          :lazy="true"
          @change="handleTreeSelectChange"
          class="region-tree-select"
        />
      </div>

      <div class="selection-summary" v-if="form.provinceName || form.cityName || form.districtName || form.townshipName || form.villageName">
        <div class="summary-title">已定位区域：</div>
        <div class="summary-tags">
          <el-tag v-if="form.provinceName" type="info" size="small" effect="plain">
            {{ form.provinceName }}
          </el-tag>
          <el-icon class="arrow-right"><ArrowRight /></el-icon>
          <el-tag v-if="form.cityName" type="primary" size="small" effect="plain">
            {{ form.cityName }}
          </el-tag>
          <el-icon class="arrow-right"><ArrowRight /></el-icon>
          <el-tag v-if="form.districtName" type="success" size="small" effect="plain">
            {{ form.districtName }}
          </el-tag>
          <el-icon class="arrow-right"><ArrowRight /></el-icon>
          <el-tag v-if="form.townshipName" type="warning" size="small" effect="plain">
            {{ form.townshipName }}
          </el-tag>
          <template v-if="maxLevel === 'village'">
            <el-icon class="arrow-right"><ArrowRight /></el-icon>
            <el-tag v-if="form.villageName" type="danger" size="small" effect="plain">
              {{ form.villageName }}
            </el-tag>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Location, LocationInformation, Warning, ArrowRight } from '@element-plus/icons-vue';

const emit = defineEmits(['change', 'townshipChange', 'villageChange']);

const props = defineProps({
  userRole: { type: String, default: '' },
  maxLevel: { type: String, default: 'village' }
});

const selectedRegionPath = ref([]);

const treeSelectProps = {
  label: 'name',
  value: 'code',
  children: 'children',
  isLeaf: 'isLeaf',
  disabled: 'disabled'
};

const regionTreeData = ref([]);
const locating = ref(false);
const locationPermissionDenied = ref(false);
const showVillageSelectDialog = ref(false);

const staticProvinces = [
  { code: '520000', name: '贵州省', level: 'province' },
  { code: '110000', name: '北京市', level: 'municipality' },
  { code: '120000', name: '天津市', level: 'municipality' },
  { code: '130000', name: '河北省', level: 'province' },
  { code: '140000', name: '山西省', level: 'province' },
  { code: '150000', name: '内蒙古自治区', level: 'autonomous_region' },
  { code: '210000', name: '辽宁省', level: 'province' },
  { code: '220000', name: '吉林省', level: 'province' },
  { code: '230000', name: '黑龙江省', level: 'province' },
  { code: '310000', name: '上海市', level: 'municipality' },
  { code: '320000', name: '江苏省', level: 'province' },
  { code: '330000', name: '浙江省', level: 'province' },
  { code: '340000', name: '安徽省', level: 'province' },
  { code: '350000', name: '福建省', level: 'province' },
  { code: '360000', name: '江西省', level: 'province' },
  { code: '370000', name: '山东省', level: 'province' },
  { code: '410000', name: '河南省', level: 'province' },
  { code: '420000', name: '湖北省', level: 'province' },
  { code: '430000', name: '湖南省', level: 'province' },
  { code: '440000', name: '广东省', level: 'province' },
  { code: '450000', name: '广西壮族自治区', level: 'autonomous_region' },
  { code: '460000', name: '海南省', level: 'province' },
  { code: '500000', name: '重庆市', level: 'municipality' },
  { code: '510000', name: '四川省', level: 'province' },
  { code: '530000', name: '云南省', level: 'province' },
  { code: '540000', name: '西藏自治区', level: 'autonomous_region' },
  { code: '610000', name: '陕西省', level: 'province' },
  { code: '620000', name: '甘肃省', level: 'province' },
  { code: '630000', name: '青海省', level: 'province' },
  { code: '640000', name: '宁夏回族自治区', level: 'autonomous_region' },
  { code: '650000', name: '新疆维吾尔自治区', level: 'autonomous_region' },
  { code: '710000', name: '台湾省', level: 'province' },
  { code: '810000', name: '香港特别行政区', level: 'sar' },
  { code: '820000', name: '澳门特别行政区', level: 'sar' }
];

const staticCities = {
  '110000': [
    { code: '110100', name: '北京市' }
  ],
  '120000': [
    { code: '120100', name: '天津市' }
  ],
  '310000': [
    { code: '310100', name: '上海市' }
  ],
  '500000': [
    { code: '500100', name: '重庆市' }
  ],
  '520000': [
    { code: '520100', name: '贵阳市', provinceCode: '520000' },
    { code: '520200', name: '六盘水市', provinceCode: '520000' },
    { code: '520300', name: '遵义市', provinceCode: '520000' },
    { code: '520400', name: '安顺市', provinceCode: '520000' },
    { code: '520500', name: '毕节市', provinceCode: '520000' },
    { code: '520600', name: '铜仁市', provinceCode: '520000' },
    { code: '522300', name: '黔西南布依族苗族自治州', provinceCode: '520000' },
    { code: '522600', name: '黔东南苗族侗族自治州', provinceCode: '520000' },
    { code: '522700', name: '黔南布依族苗族自治州', provinceCode: '520000' }
  ]
};

const staticDistricts = {
  '520100': [
    { code: '520102', name: '南明区', provinceCode: '520000', cityCode: '520100' },
    { code: '520103', name: '云岩区', provinceCode: '520000', cityCode: '520100' },
    { code: '520111', name: '花溪区', provinceCode: '520000', cityCode: '520100' },
    { code: '520112', name: '乌当区', provinceCode: '520000', cityCode: '520100' },
    { code: '520113', name: '白云区', provinceCode: '520000', cityCode: '520100' },
    { code: '520115', name: '观山湖区', provinceCode: '520000', cityCode: '520100' },
    { code: '520121', name: '开阳县', provinceCode: '520000', cityCode: '520100' },
    { code: '520122', name: '息烽县', provinceCode: '520000', cityCode: '520100' },
    { code: '520123', name: '修文县', provinceCode: '520000', cityCode: '520100' },
    { code: '520181', name: '清镇市', provinceCode: '520000', cityCode: '520100' }
  ],
  '520300': [
    { code: '520302', name: '红花岗区', provinceCode: '520000', cityCode: '520300' },
    { code: '520303', name: '汇川区', provinceCode: '520000', cityCode: '520300' },
    { code: '520304', name: '播州区', provinceCode: '520000', cityCode: '520300' },
    { code: '520322', name: '桐梓县', provinceCode: '520000', cityCode: '520300' },
    { code: '520323', name: '绥阳县', provinceCode: '520000', cityCode: '520300' },
    { code: '520324', name: '正安县', provinceCode: '520000', cityCode: '520300' },
    { code: '520325', name: '道真仡佬族苗族自治县', provinceCode: '520000', cityCode: '520300' },
    { code: '520326', name: '务川仡佬族苗族自治县', provinceCode: '520000', cityCode: '520300' },
    { code: '520327', name: '凤冈县', provinceCode: '520000', cityCode: '520300' },
    { code: '520328', name: '湄潭县', provinceCode: '520000', cityCode: '520300' },
    { code: '520329', name: '余庆县', provinceCode: '520000', cityCode: '520300' },
    { code: '520330', name: '习水县', provinceCode: '520000', cityCode: '520300' },
    { code: '520381', name: '赤水市', provinceCode: '520000', cityCode: '520300' },
    { code: '520382', name: '仁怀市', provinceCode: '520000', cityCode: '520300' }
  ],
  '522300': [
    { code: '522301', name: '兴义市', provinceCode: '520000', cityCode: '522300' },
    { code: '522322', name: '兴仁市', provinceCode: '520000', cityCode: '522300' },
    { code: '522323', name: '普安县', provinceCode: '520000', cityCode: '522300' },
    { code: '522324', name: '晴隆县', provinceCode: '520000', cityCode: '522300' },
    { code: '522325', name: '贞丰县', provinceCode: '520000', cityCode: '522300' },
    { code: '522326', name: '望谟县', provinceCode: '520000', cityCode: '522300' },
    { code: '522327', name: '册亨县', provinceCode: '520000', cityCode: '522300' },
    { code: '522328', name: '安龙县', provinceCode: '520000', cityCode: '522300' }
  ]
};

const staticTownships = {
  '522301': [
    { id: '1', code: '522301001', name: '黄草街道', districtCode: '522301' },
    { id: '2', code: '522301002', name: '兴泰街道', districtCode: '522301' },
    { id: '3', code: '522301003', name: '桔山街道', districtCode: '522301' },
    { id: '4', code: '522301004', name: '坪东街道', districtCode: '522301' },
    { id: '5', code: '522301005', name: '丰都街道', districtCode: '522301' },
    { id: '6', code: '522301006', name: '顶效镇', districtCode: '522301' },
    { id: '7', code: '522301007', name: '木贾街道', districtCode: '522301' },
    { id: '8', code: '522301008', name: '马岭镇', districtCode: '522301' },
    { id: '9', code: '522301009', name: '清水河镇', districtCode: '522301' },
    { id: '10', code: '522301010', name: '乌沙镇', districtCode: '522301' },
    { id: '11', code: '522301011', name: '威舍镇', districtCode: '522301' }
  ],
  '522325': [
    { id: '12', code: '522325001', name: '珉谷街道', districtCode: '522325' },
    { id: '13', code: '522325002', name: '永丰街道', districtCode: '522325' },
    { id: '14', code: '522325003', name: '鲁贡镇', districtCode: '522325' },
    { id: '15', code: '522325004', name: '沙坪镇', districtCode: '522325' },
    { id: '16', code: '522325005', name: '白层镇', districtCode: '522325' },
    { id: '17', code: '522325006', name: '小屯镇', districtCode: '522325' },
    { id: '18', code: '522325007', name: '长田镇', districtCode: '522325' },
    { id: '19', code: '522325008', name: '龙场镇', districtCode: '522325' },
    { id: '20', code: '522325009', name: '北盘江镇', districtCode: '522325' }
  ],
  '522326': [
    { id: '21', code: '522326001', name: '平洞街道', districtCode: '522326' },
    { id: '22', code: '522326002', name: '新屯街道', districtCode: '522326' },
    { id: '23', code: '522326003', name: '王母街道', districtCode: '522326' },
    { id: '24', code: '522326004', name: '乐元镇', districtCode: '522326' },
    { id: '25', code: '522326005', name: '打易镇', districtCode: '522326' },
    { id: '26', code: '522326006', name: '郊纳镇', districtCode: '522326' },
    { id: '27', code: '522326007', name: '蔗香镇', districtCode: '522326' },
    { id: '28', code: '522326008', name: '大观镇', districtCode: '522326' },
    { id: '29', code: '522326009', name: '油迈乡', districtCode: '522326' }
  ]
};

const staticVillages = {
  '522325003': [
    { id: '69620ba44261831e215211b3', code: 'GZZF01V001A', name: '么扒村', address: '贵州省贞丰县鲁贡镇么扒村' },
    { id: '69620ba44261831e215211be', code: 'GZZF01V002A', name: '弄洋村', address: '贵州省贞丰县鲁贡镇弄洋村' },
    { id: '69620ba44261831e215211c1', code: 'GZZF01V003A', name: '者央村', address: '贵州省贞丰县鲁贡镇者央村' },
    { id: '69620ba44261831e215211c4', code: 'GZZF01V004A', name: '林桃村', address: '贵州省贞丰县鲁贡镇林桃村' },
    { id: '69620ba44261831e215211c5', code: 'GZZF01V005A', name: '坡艾村', address: '贵州省贞丰县鲁贡镇坡艾村' },
    { id: '69620ba44261831e215211c6', code: 'GZZF01V006A', name: '坡帽村', address: '贵州省贞丰县鲁贡镇坡帽村' },
    { id: '69620ba44261831e215211c7', code: 'GZZF01V007A', name: '坡云村', address: '贵州省贞丰县鲁贡镇坡云村' },
    { id: '69620ba44261831e215211c8', code: 'GZZF01V008A', name: '坡书村', address: '贵州省贞丰县鲁贡镇坡书村' },
    { id: '69620ba44261831e215211c9', code: 'GZZF01V009A', name: '坪乐村', address: '贵州省贞丰县鲁贡镇坪乐村' },
    { id: '69620ba44261831e215211ca', code: 'GZZF01V010A', name: '坪福村', address: '贵州省贞丰县鲁贡镇坪福村' },
    { id: '69620ba44261831e215211cb', code: 'GZZF01V011A', name: '坪新村', address: '贵州省贞丰县鲁贡镇坪新村' },
    { id: '69620ba44261831e215211cc', code: 'GZZF01V012A', name: '坪平村', address: '贵州省贞丰县鲁贡镇坪平村' },
    { id: '69620ba44261831e215211cd', code: 'GZZF01V013A', name: '坪安村', address: '贵州省贞丰县鲁贡镇坪安村' },
    { id: '69620ba44261831e215211ce', code: 'GZZF01V014A', name: '坪顺村', address: '贵州省贞丰县鲁贡镇坪顺村' },
    { id: '69620ba44261831e215211cf', code: 'GZZF01V015A', name: '坪和村', address: '贵州省贞丰县鲁贡镇坪和村' },
    { id: '69620ba44261831e215211d0', code: 'GZZF01V016A', name: '坪乐村', address: '贵州省贞丰县鲁贡镇坪乐村' }
  ]
};

const form = reactive({
  provinceCode: '',
  provinceName: '',
  cityCode: '',
  cityName: '',
  districtCode: '',
  districtName: '',
  townshipCode: '',
  townshipName: '',
  villageCode: '',
  villageName: ''
});

const loadRegionTree = async () => {
  regionTreeData.value = staticProvinces.map(province => ({
    code: province.code,
    name: province.name,
    level: province.level,
    isLeaf: false
  }));
};

const loadTreeNode = async (node, resolve) => {
  const level = node.data.level;
  const parentCode = node.data.code;

  try {
    let children = [];

    if (level === 'municipality') {
      const districtData = staticDistricts[parentCode] || [];
      children = districtData.map(district => ({
        code: district.code,
        name: district.name,
        level: 'district',
        isLeaf: false
      }));
    } else if (level === 'province') {
      const cityData = staticCities[parentCode] || [];
      children = cityData.map(city => ({
        code: city.code,
        name: city.name,
        level: 'city',
        isLeaf: false
      }));
    } else if (level === 'city') {
      const districtData = staticDistricts[parentCode] || [];
      children = districtData.map(district => ({
        code: district.code,
        name: district.name,
        level: 'district',
        isLeaf: false
      }));
    } else if (level === 'district') {
      const townshipData = staticTownships[parentCode] || [];
      children = townshipData.map(township => ({
        code: township.code,
        name: township.name,
        level: 'township',
        isLeaf: props.maxLevel === 'township'
      }));
    } else if (level === 'township' && props.maxLevel === 'village') {
      const villageData = staticVillages[parentCode] || [];
      children = villageData.map(village => ({
        code: village.code,
        name: village.name,
        level: 'village',
        isLeaf: true,
        address: village.address
      }));
    }

    resolve(children);
  } catch (error) {
    console.error('加载子节点失败:', error);
    resolve([]);
  }
};

const handleTreeSelectChange = (value, node) => {
  console.log('选择的区域:', value, node);

  if (!node) return;

  const level = node.level;

  if (level === 'province' || level === 'municipality' || level === 'autonomous_region') {
    form.provinceCode = node.code;
    form.provinceName = node.name;
  } else if (level === 'city') {
    form.cityCode = node.code;
    form.cityName = node.name;
  } else if (level === 'district') {
    form.districtCode = node.code;
    form.districtName = node.name;
  } else if (level === 'township') {
    form.townshipCode = node.code;
    form.townshipName = node.name;

    if (props.maxLevel === 'township') {
      emit('townshipChange', {
        townshipCode: node.code,
        townshipName: node.name,
        districtCode: form.districtCode,
        districtName: form.districtName,
        provinceCode: form.provinceCode,
        provinceName: form.provinceName,
        cityName: form.cityName
      });
    }
  } else if (level === 'village') {
    form.villageCode = node.code;
    form.villageName = node.name;

    emit('villageChange', {
      villageCode: node.code,
      villageName: node.name,
      village: node,
      townshipCode: form.townshipCode,
      townshipName: form.townshipName,
      districtCode: form.districtCode,
      districtName: form.districtName,
      provinceCode: form.provinceCode,
      provinceName: form.provinceName,
      cityName: form.cityName
    });
  }

  emit('change', { ...form });
};

const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    ElMessage.warning('您的浏览器不支持定位功能');
    return;
  }

  locating.value = true;
  locationPermissionDenied.value = false;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        console.log('当前位置:', { latitude, longitude });

        ElMessage.info('正在获取行政区划信息...');

        const response = await fetch(`http://localhost:3001/api/v1/regions/geocode?lat=${latitude}&lng=${longitude}`);
        const data = await response.json();

        if (data.success && data.data) {
          const { province, city, district, township, village } = data.data;

          form.provinceName = province?.name || '';
          form.cityName = city?.name || '';
          form.districtName = district?.name || '';
          form.townshipName = township?.name || '';

          if (township?.code) {
            form.townshipCode = township.code;
            regionTreeData.value = [
              { code: province.code, name: province.name, level: province.level, isLeaf: false },
              { code: city.code, name: city.name, level: 'city', isLeaf: false },
              { code: district.code, name: district.name, level: 'district', isLeaf: false },
              { code: township.code, name: township.name, level: 'township', isLeaf: props.maxLevel === 'township' }
            ];

            villages.value = staticVillages[township.code] || [];

            if (village) {
              form.villageCode = village.code;
              form.villageName = village.name;
              emit('villageChange', {
                villageCode: village.code,
                villageName: village.name,
                village: village,
                townshipCode: township.code,
                townshipName: township.name,
                districtCode: district.code,
                districtName: district.name,
                provinceCode: province.code,
                provinceName: province.name,
                cityName: city.name
              });
            } else if (props.maxLevel === 'village' && villages.value.length > 0) {
              showVillageSelectDialog.value = true;
            }

            emit('change', { ...form });
            ElMessage.success('定位成功！已自动选择行政区划');
          } else {
            ElMessage.warning('无法识别您的位置所在乡镇');
          }
        } else {
          ElMessage.warning('无法解析当前位置的行政区划信息');
        }
      } catch (error) {
        console.error('定位失败:', error);
        ElMessage.error('定位成功但无法解析行政区划，请联系管理员');
      } finally {
        locating.value = false;
      }
    },
    (error) => {
      console.error('定位失败:', error);
      locating.value = false;

      if (error.code === error.PERMISSION_DENIED) {
        locationPermissionDenied.value = true;
        ElMessage.warning('定位权限被拒绝，请允许浏览器获取位置信息');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        ElMessage.warning('无法获取位置信息');
      } else if (error.code === error.TIMEOUT) {
        ElMessage.warning('定位超时，请重试');
      } else {
        ElMessage.warning('定位失败，请重试');
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
};

const requestLocationPermission = () => {
  if (!navigator.geolocation) {
    ElMessage.warning('您的浏览器不支持定位功能');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    () => {
      locationPermissionDenied.value = false;
      ElMessage.success('定位权限已授权');
      getCurrentLocation();
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        locationPermissionDenied.value = true;
      }
    }
  );
};

const confirmVillage = () => {
  if (form.villageCode) {
    const village = villages.value.find(v => v.code === form.villageCode);
    form.villageName = village?.name || '';

    emit('villageChange', {
      villageCode: form.villageCode,
      villageName: form.villageName,
      village: village,
      townshipCode: form.townshipCode,
      townshipName: form.townshipName,
      districtCode: form.districtCode,
      districtName: form.districtName,
      provinceCode: form.provinceCode,
      provinceName: form.provinceName,
      cityName: form.cityName
    });

    emit('change', { ...form });
    showVillageSelectDialog.value = false;
  }
};

onMounted(() => {
  loadRegionTree();
});
</script>

<style scoped>
.region-selector {
  width: 100%;
}

.region-selector-wrapper {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
}

.region-tree-container {
  margin-top: 20px;
}

.region-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
  display: block;
}

.region-tree-select {
  width: 100%;
}

.region-tree-select :deep(.el-tree-select__input) {
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  transition: all 0.3s;
  background: white;
}

.region-tree-select :deep(.el-tree-select__input:hover) {
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.region-tree-select :deep(.el-tree-select__input.is-focus) {
  border-color: #409eff;
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.15);
}

.region-tree-select :deep(.el-tree-select__placeholder) {
  color: #a8abb2;
}

.location-actions {
  padding: 16px;
  background: white;
  border-radius: 8px;
  margin-top: 20px;
  border-left: 4px solid #409eff;
}

.location-actions .el-button {
  width: 100%;
  height: 36px;
  font-size: 14px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.location-actions .el-button :deep(.el-icon) {
  margin-right: 6px;
}

.location-actions .el-alert {
  border: none;
  padding: 0;
  margin-top: 12px;
}

.location-actions .el-alert :deep(.el-alert__title) {
  font-size: 13px;
  margin-bottom: 4px;
}

.location-actions .el-alert__description {
  font-size: 12px;
  line-height: 1.6;
  color: #606266;
}

.selection-summary {
  margin-top: 24px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.summary-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.summary-tags .el-tag {
  font-size: 13px;
  padding: 6px 14px;
  height: 28px;
  line-height: 16px;
  font-weight: 500;
  border-radius: 4px;
}

.summary-tags .arrow-right {
  font-size: 12px;
  color: #909399;
  margin: 0 4px;
}

.el-divider {
  margin: 24px 0;
}
</style>
