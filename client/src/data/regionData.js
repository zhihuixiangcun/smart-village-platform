export const regionData = [
  {
    code: '520000',
    name: '贵州省',
    children: [
      {
        code: '522300',
        name: '黔西南布依族苗族自治州',
        children: [
          {
            code: '522301',
            name: '兴义市',
            children: [
              {
                code: '522301001',
                name: '顶效镇',
                children: [
                  { code: 'GZZXY1V001A', name: '绿化村', id: '69620c30a56e5cb7d408a2fe' },
                  { code: 'GZZXY1V002A', name: '绿荫村', id: '69620c30a56e5cb7d408a303' },
                  { code: 'GZZXY1V003A', name: '查白村', id: '69620c30a56e5cb7d408a307' },
                  { code: 'GZZXY1V004A', name: '楼纳村', id: '69620c30a56e5cb7d408a30a' }
                ]
              }
            ]
          },
          {
            code: '522325',
            name: '贞丰县',
            children: [
              {
                code: '522325001',
                name: '鲁贡镇',
                children: [
                  { code: 'GZZF01V001A', name: '么扒村', id: '69620ba44261831e215211b3' },
                  { code: 'GZZF01V002A', name: '弄洋村', id: '69620ba44261831e215211be' },
                  { code: 'GZZF01V003A', name: '者央村', id: '69620ba44261831e215211c1' },
                  { code: 'GZZF01V004A', name: '林桃村', id: '69620ba44261831e215211c4' },
                  { code: 'GZZF01V005A', name: '鲁贡村', id: '69620ba44261831e215211c7' },
                  { code: 'GZZF01V006A', name: '坡稿村', id: '69620ba44261831e215211ca' },
                  { code: 'GZZF01V007A', name: '落岩村', id: '69620ba44261831e215211cd' },
                  { code: 'GZZF01V008A', name: '板围村', id: '69620ba44261831e215211d0' },
                  { code: 'GZZF01V009A', name: '洛艾村', id: '69620ba44261831e215211d3' },
                  { code: 'GZZF01V010A', name: '打明村', id: '69620ba44261831e215211d6' },
                  { code: 'GZZF01V011A', name: '尼罗村', id: '69620ba44261831e215211d9' },
                  { code: 'GZZF01V012A', name: '这艾村', id: '69620ba44261831e215211dc' },
                  { code: 'GZZF01V013A', name: '毛闷村', id: '69620ba44261831e215211df' },
                  { code: 'GZZF01V014A', name: '路羊村', id: '69620ba44261831e215211e2' },
                  { code: 'GZZF01V015A', name: '巧年村', id: '69620ba44261831e215211e5' },
                  { code: 'GZZF01V016A', name: '者冗村', id: '69620ba44261831e215211e8' }
                ]
              },
              {
                code: '522325002',
                name: '沙坪镇',
                children: [
                  { code: 'GZZF02V002A', name: '者索村', id: '69620d263aae7459331c09fe' },
                  { code: 'GZZF02V003A', name: '板昌村', id: '69620d263aae7459331c0a01' },
                  { code: 'GZZF02V004A', name: '这年村', id: '69620d263aae7459331c0a04' },
                  { code: 'GZZF02V005A', name: '者砍村', id: '69620d263aae7459331c0a07' }
                ]
              },
              {
                code: '522325003',
                name: '白层镇',
                children: [
                  { code: 'GZZF03V001A', name: '兴龙村', id: '69620e87edd9c22fcd029c81' },
                  { code: 'GZZF03V002A', name: '坝桥村', id: '69620e87edd9c22fcd029c84' },
                  { code: 'GZZF03V003A', name: '坡们村', id: '69620e87edd9c22fcd029c87' },
                  { code: 'GZZF03V004A', name: '纳杠村', id: '69620e87edd9c22fcd029c8a' }
                ]
              }
            ]
          },
          {
            code: '522326',
            name: '望谟县',
            children: [
              {
                code: '522326001',
                name: '乐元镇',
                children: [
                  { code: 'GZZF02V001A', name: '乐元村', id: '69620ba44261831e215211c7' },
                  { code: 'GZZW02V002A', name: '里好村', id: '69620e87edd9c22fcd029c8d' },
                  { code: 'GZZW02V003A', name: '纳管村', id: '69620e87edd9c22fcd029c90' },
                  { code: 'GZZW02V004A', name: '董万村', id: '69620e87edd9c22fcd029c93' }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];

export const getVillageById = (villageId) => {
  for (const province of regionData) {
    for (const prefecture of province.children || []) {
      for (const county of prefecture.children || []) {
        for (const township of county.children || []) {
          for (const village of township.children || []) {
            if (village.id === villageId || village.code === villageId) {
              return {
                ...village,
                province: province.name,
                prefecture: prefecture.name,
                county: county.name,
                township: township.name
              };
            }
          }
        }
      }
    }
  }
  return null;
};

export const getVillagesByLocation = (provinceCode, prefectureCode, countyCode, townshipCode) => {
  const result = [];

  for (const province of regionData) {
    if (provinceCode && province.code !== provinceCode) continue;

    for (const prefecture of province.children || []) {
      if (prefectureCode && prefecture.code !== prefectureCode) continue;

      for (const county of prefecture.children || []) {
        if (countyCode && county.code !== countyCode) continue;

        for (const township of county.children || []) {
          if (townshipCode && township.code !== townshipCode) continue;

          for (const village of township.children || []) {
            result.push({
              ...village,
              province: province.name,
              prefecture: prefecture.name,
              county: county.name,
              township: township.name
            });
          }
        }
      }
    }
  }

  return result;
};

export const getProvinceList = () => {
  return regionData.map(p => ({ code: p.code, name: p.name }));
};

export const getPrefectureList = (provinceCode) => {
  const province = regionData.find(p => p.code === provinceCode);
  return province ? province.children.map(p => ({ code: p.code, name: p.name })) : [];
};

export const getCountyList = (provinceCode, prefectureCode) => {
  const province = regionData.find(p => p.code === provinceCode);
  if (!province) return [];

  const prefecture = province.children.find(p => p.code === prefectureCode);
  return prefecture ? prefecture.children.map(c => ({ code: c.code, name: c.name })) : [];
};

export const getTownshipList = (provinceCode, prefectureCode, countyCode) => {
  const province = regionData.find(p => p.code === provinceCode);
  if (!province) return [];

  const prefecture = province.children.find(p => p.code === prefectureCode);
  if (!prefecture) return [];

  const county = prefecture.children.find(c => c.code === countyCode);
  return county ? county.children.map(t => ({ code: t.code, name: t.name })) : [];
};

export const getVillageList = (provinceCode, prefectureCode, countyCode, townshipCode) => {
  const province = regionData.find(p => p.code === provinceCode);
  if (!province) return [];

  const prefecture = province.children.find(p => p.code === prefectureCode);
  if (!prefecture) return [];

  const county = prefecture.children.find(c => c.code === countyCode);
  if (!county) return [];

  const township = county.children.find(t => t.code === townshipCode);
  if (!township) return [];

  return township.children.map(v => ({ id: v.id, code: v.code, name: v.name }));
};
