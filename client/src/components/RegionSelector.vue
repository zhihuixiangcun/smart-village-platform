<template>
  <div class="region-selector-container">
    <el-form-item :label="label" :prop="prop">
      <div class="region-cascader">
        <el-cascader
          v-model="selectedPath"
          :options="regionOptions"
          :props="cascaderProps"
          :placeholder="placeholder"
          clearable
          filterable
          @change="handleRegionChange"
        />
      </div>

      <div v-if="selectedRegion" class="selected-info">
        <el-tag type="info" size="small" closable @close="clearSelection">
          {{ selectedRegion.fullAddress }}
        </el-tag>
      </div>
    </el-form-item>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { regionData } from '@/data/regionData';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: '所在地区'
  },
  prop: {
    type: String,
    default: 'region'
  },
  placeholder: {
    type: String,
    default: '请选择省/州/市/县/乡镇/村'
  },
  level: {
    type: String,
    default: 'village',
    validator: (value) => ['province', 'prefecture', 'county', 'township', 'village'].includes(value)
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const selectedPath = ref([]);
const selectedRegion = ref(null);

const cascaderProps = {
  value: 'code',
  label: 'name',
  children: 'children',
  checkStrictly: false,
  emitPath: true
};

const regionOptions = computed(() => {
  const levels = ['province', 'prefecture', 'county', 'township', 'village'];
  const targetLevelIndex = levels.indexOf(props.level);

  const formatRegion = (region, currentLevel) => {
    const levelIndex = levels.indexOf(currentLevel);
    const isLastLevel = levelIndex >= targetLevelIndex;

    const result = {
      code: region.code,
      name: region.name,
      leaf: isLastLevel || !region.children || region.children.length === 0
    };

    if (region.children && region.children.length > 0 && !isLastLevel) {
      result.children = region.children.map(child => formatRegion(child, levels[levelIndex + 1]));
    }

    return result;
  };

  return regionData.map(province => formatRegion(province, 'province'));
});

const findRegionByPath = (path) => {
  if (!path || path.length === 0) return null;

  let current = regionData;
  const result = {
    province: null,
    prefecture: null,
    county: null,
    township: null,
    village: null
  };

  if (path[0]) {
    result.province = current.find(p => p.code === path[0]);
    if (!result.province) return null;
  }

  if (path[1] && result.province && result.province.children) {
    result.prefecture = result.province.children.find(p => p.code === path[1]);
    if (!result.prefecture) return result;
  }

  if (path[2] && result.prefecture && result.prefecture.children) {
    result.county = result.prefecture.children.find(c => c.code === path[2]);
    if (!result.county) return result;
  }

  if (path[3] && result.county && result.county.children) {
    result.township = result.county.children.find(t => t.code === path[3]);
    if (!result.township) return result;
  }

  if (path[4] && result.township && result.township.children) {
    result.village = result.township.children.find(v => v.code === path[4]);
    if (!result.village) return result;
  }

  const names = {
    province: result.province?.name || '',
    prefecture: result.prefecture?.name || '',
    county: result.county?.name || '',
    township: result.township?.name || '',
    village: result.village?.name || ''
  };

  const fullAddress = [names.province, names.prefecture, names.county, names.township, names.village].filter(Boolean).join('');

  return {
    ...result,
    ...names,
    fullAddress,
    villageId: result.village?.id || null,
    villageCode: result.village?.code || null
  };
};

const handleRegionChange = (value) => {
  const regionInfo = findRegionByPath(value);

  if (regionInfo && regionInfo.villageId) {
    selectedRegion.value = regionInfo;
    emit('update:modelValue', regionInfo.villageId);
    emit('change', regionInfo);
  }
};

const clearSelection = () => {
  selectedPath.value = [];
  selectedRegion.value = null;
  emit('update:modelValue', '');
  emit('change', null);
};

const initValue = () => {
  if (props.modelValue) {
    regionData.forEach(province => {
      province.children?.forEach(prefecture => {
        prefecture.children?.forEach(county => {
          county.children?.forEach(township => {
            township.children?.forEach(village => {
              if (village.id === props.modelValue || village.code === props.modelValue) {
                selectedPath.value = [province.code, prefecture.code, county.code, township.code, village.code];
                selectedRegion.value = {
                  province: province.name,
                  prefecture: prefecture.name,
                  county: county.name,
                  township: township.name,
                  village: village.name,
                  fullAddress: `${province.name}${prefecture.name}${county.name}${township.name}${village.name}`,
                  villageId: village.id,
                  villageCode: village.code
                };
              }
            });
          });
        });
      });
    });
  }
};

watch(() => props.modelValue, () => {
  initValue();
}, { immediate: true });
</script>

<style scoped>
.region-selector-container {
  width: 100%;
}

.region-cascader {
  width: 100%;
}

:deep(.el-cascader) {
  width: 100%;
}

.selected-info {
  margin-top: 12px;
}
</style>
