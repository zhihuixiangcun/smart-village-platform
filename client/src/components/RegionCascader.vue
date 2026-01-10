<template>
  <div class="region-cascader">
    <el-cascader
      v-model="selectedValue"
      :options="regionOptions"
      :props="cascaderProps"
      :placeholder="placeholder"
      clearable
      filterable
      @change="handleChange"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { regionData, getVillageById } from '@/data/regionData';

const props = defineProps({
  modelValue: {
    type: [String, Number, Object],
    default: ''
  },
  placeholder: {
    type: String,
    default: '请选择地区'
  },
  level: {
    type: String,
    default: 'village',
    validator: (value) => ['province', 'prefecture', 'county', 'township', 'village'].includes(value)
  },
  separateData: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const selectedValue = ref([]);

const cascaderProps = {
  value: 'code',
  label: 'name',
  children: 'children',
  checkStrictly: false,
  emitPath: true
};

const regionOptions = computed(() => {
  const formatRegion = (region, level) => {
    const result = {
      code: region.code,
      name: region.name,
      children: []
    };

    if (region.children && region.children.length > 0) {
      const nextLevel = getNextLevel(level);
      if (shouldIncludeLevel(nextLevel, props.level)) {
        result.children = region.children.map(child => formatRegion(child, nextLevel));
      }
    }

    return result;
  };

  return regionData.map(province => formatRegion(province, 'province'));
});

const shouldIncludeLevel = (targetLevel, currentLevel) => {
  const levels = ['province', 'prefecture', 'county', 'township', 'village'];
  const targetIndex = levels.indexOf(targetLevel);
  const currentIndex = levels.indexOf(currentLevel);
  return targetIndex >= currentIndex;
};

const getNextLevel = (currentLevel) => {
  const levels = ['province', 'prefecture', 'county', 'township', 'village'];
  const index = levels.indexOf(currentLevel);
  return index < levels.length - 1 ? levels[index + 1] : currentLevel;
};

const getSelectedPath = () => {
  if (!selectedValue.value || selectedValue.value.length === 0) {
    return null;
  }

  return selectedValue.value;
};

const getSelectedRegion = () => {
  const path = getSelectedPath();
  if (!path) return null;

  if (props.separateData) {
    return {
      provinceCode: path[0],
      prefectureCode: path[1],
      countyCode: path[2],
      townshipCode: path[3],
      villageCode: path[4]
    };
  }

  const provinceCode = path[0];
  const prefectureCode = path[1] || '';
  const countyCode = path[2] || '';
  const townshipCode = path[3] || '';
  const villageCode = path[4] || '';

  let regionInfo = {
    provinceCode,
    prefectureCode,
    countyCode,
    townshipCode,
    villageCode
  };

  if (villageCode) {
    const village = getVillageById(villageCode);
    if (village) {
      regionInfo = {
        ...regionInfo,
        villageId: village.id,
        villageName: village.name,
        province: village.province,
        prefecture: village.prefecture,
        county: village.county,
        township: village.township,
        village: village.name,
        fullAddress: `${village.province}${village.prefecture}${village.county}${village.township}${village.name}`
      };
    }
  } else if (townshipCode) {
    regionInfo.townshipCode = townshipCode;
  } else if (countyCode) {
    regionInfo.countyCode = countyCode;
  } else if (prefectureCode) {
    regionInfo.prefectureCode = prefectureCode;
  } else if (provinceCode) {
    regionInfo.provinceCode = provinceCode;
  }

  return regionInfo;
};

const handleChange = (value) => {
  selectedValue.value = value;
  const regionInfo = getSelectedRegion();

  if (props.separateData) {
    emit('update:modelValue', value);
  } else {
    emit('update:modelValue', regionInfo ? regionInfo.villageCode : '');
  }
  emit('change', regionInfo);
};

const initValue = () => {
  if (props.modelValue) {
    if (props.separateData && Array.isArray(props.modelValue)) {
      selectedValue.value = props.modelValue;
    } else if (typeof props.modelValue === 'string') {
      const village = getVillageById(props.modelValue);
      if (village) {
        const province = regionData.find(p => p.name === village.province);
        if (province) {
          const prefecture = province.children.find(p => p.name === village.prefecture);
          if (prefecture) {
            const county = prefecture.children.find(c => c.name === village.county);
            if (county) {
              const township = county.children.find(t => t.name === village.township);
              if (township) {
                selectedValue.value = [province.code, prefecture.code, county.code, township.code, village.code];
              }
            }
          }
        }
      }
    }
  }
};

watch(() => props.modelValue, () => {
  initValue();
}, { immediate: true });
</script>

<style scoped>
.region-cascader {
  width: 100%;
}

:deep(.el-cascader) {
  width: 100%;
}
</style>
