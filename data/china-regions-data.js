module.exports = {
  provinces: [
    { code: '110000', name: '北京市', level: 'municipality', shortName: '北京' },
    { code: '120000', name: '天津市', level: 'municipality', shortName: '天津' },
    { code: '130000', name: '河北省', level: 'province', shortName: '河北' },
    { code: '140000', name: '山西省', level: 'province', shortName: '山西' },
    { code: '150000', name: '内蒙古自治区', level: 'autonomous_region', shortName: '内蒙古' },
    { code: '210000', name: '辽宁省', level: 'province', shortName: '辽宁' },
    { code: '220000', name: '吉林省', level: 'province', shortName: '吉林' },
    { code: '230000', name: '黑龙江省', level: 'province', shortName: '黑龙江' },
    { code: '310000', name: '上海市', level: 'municipality', shortName: '上海' },
    { code: '320000', name: '江苏省', level: 'province', shortName: '江苏' },
    { code: '330000', name: '浙江省', level: 'province', shortName: '浙江' },
    { code: '340000', name: '安徽省', level: 'province', shortName: '安徽' },
    { code: '350000', name: '福建省', level: 'province', shortName: '福建' },
    { code: '360000', name: '江西省', level: 'province', shortName: '江西' },
    { code: '370000', name: '山东省', level: 'province', shortName: '山东' },
    { code: '410000', name: '河南省', level: 'province', shortName: '河南' },
    { code: '420000', name: '湖北省', level: 'province', shortName: '湖北' },
    { code: '430000', name: '湖南省', level: 'province', shortName: '湖南' },
    { code: '440000', name: '广东省', level: 'province', shortName: '广东' },
    { code: '450000', name: '广西壮族自治区', level: 'autonomous_region', shortName: '广西' },
    { code: '460000', name: '海南省', level: 'province', shortName: '海南' },
    { code: '500000', name: '重庆市', level: 'municipality', shortName: '重庆' },
    { code: '510000', name: '四川省', level: 'province', shortName: '四川' },
    { code: '520000', name: '贵州省', level: 'province', shortName: '贵州' },
    { code: '530000', name: '云南省', level: 'province', shortName: '云南' },
    { code: '540000', name: '西藏自治区', level: 'autonomous_region', shortName: '西藏' },
    { code: '610000', name: '陕西省', level: 'province', shortName: '陕西' },
    { code: '620000', name: '甘肃省', level: 'province', shortName: '甘肃' },
    { code: '630000', name: '青海省', level: 'province', shortName: '青海' },
    { code: '640000', name: '宁夏回族自治区', level: 'autonomous_region', shortName: '宁夏' },
    { code: '650000', name: '新疆维吾尔自治区', level: 'autonomous_region', shortName: '新疆' },
    { code: '710000', name: '台湾省', level: 'province', shortName: '台湾' },
    { code: '810000', name: '香港特别行政区', level: 'sar', shortName: '香港' },
    { code: '820000', name: '澳门特别行政区', level: 'sar', shortName: '澳门' }
  ],

  cities: {
    '520000': [
      { code: '520100', name: '贵阳市', level: 'prefecture' },
      { code: '520200', name: '六盘水市', level: 'prefecture' },
      { code: '520300', name: '遵义市', level: 'prefecture' },
      { code: '520400', name: '安顺市', level: 'prefecture' },
      { code: '520500', name: '毕节市', level: 'prefecture' },
      { code: '520600', name: '铜仁市', level: 'prefecture' },
      { code: '522300', name: '黔西南布依族苗族自治州', level: 'prefecture' },
      { code: '522600', name: '黔东南苗族侗族自治州', level: 'prefecture' },
      { code: '522700', name: '黔南布依族苗族自治州', level: 'prefecture' }
    ]
  },

  districts: {
    '520100': [
      { code: '520102', name: '南明区', level: 'district', provinceCode: '520000', cityCode: '520100' },
      { code: '520103', name: '云岩区', level: 'district', provinceCode: '520000', cityCode: '520100' },
      { code: '520111', name: '花溪区', level: 'district', provinceCode: '520000', cityCode: '520100' },
      { code: '520112', name: '乌当区', level: 'district', provinceCode: '520000', cityCode: '520100' },
      { code: '520113', name: '白云区', level: 'district', provinceCode: '520000', cityCode: '520100' },
      { code: '520115', name: '观山湖区', level: 'district', provinceCode: '520000', cityCode: '520100' },
      { code: '520121', name: '开阳县', level: 'district', provinceCode: '520000', cityCode: '520100' },
      { code: '520122', name: '息烽县', level: 'district', provinceCode: '520000', cityCode: '520100' },
      { code: '520123', name: '修文县', level: 'district', provinceCode: '520000', cityCode: '520100' },
      { code: '520181', name: '清镇市', level: 'district', provinceCode: '520000', cityCode: '520100' }
    ],
    '520300': [
      { code: '520302', name: '红花岗区', level: 'district', provinceCode: '520000', cityCode: '520300' },
      { code: '520303', name: '汇川区', level: 'district', provinceCode: '520000', cityCode: '520300' },
      { code: '520304', name: '播州区', level: 'district', provinceCode: '520000', cityCode: '520300' },
      { code: '520322', name: '桐梓县', level: 'district', provinceCode: '520000', cityCode: '520300' },
      { code: '520323', name: '绥阳县', level: 'district', provinceCode: '520000', cityCode: '520300' },
      { code: '520324', name: '正安县', level: 'district', provinceCode: '520000', cityCode: '520300' },
      { code: '520325', name: '道真仡佬族苗族自治县', level: 'district', provinceCode: '520000', cityCode: '520300' },
      { code: '520326', name: '务川仡佬族苗族自治县', level: 'district', provinceCode: '520000', cityCode: '520300' },
      { code: '520327', name: '凤冈县', level: 'district', provinceCode: '520000', cityCode: '520300' },
      { code: '520328', name: '湄潭县', level: ' district', provinceCode: '520000', cityCode: '520300' },
      { code: '520329', name: '余庆县', level: 'district', provinceCode: '520000', cityCode: '520300' },
      { code: '520330', name: '习水县', level: 'district', provinceCode: '520000', cityCode: '520300' },
      { code: '520381', name: '赤水市', level: 'district', provinceCode: '520000', cityCode: '520300' },
      { code: '520382', name: '仁怀市', level: 'district', provinceCode: '520000', cityCode: '520300' }
    ],
    '522300': [
      { code: '522301', name: '兴义市', level: 'district', provinceCode: '520000', cityCode: '522300' },
      { code: '522322', name: '兴仁市', level: 'district', provinceCode: '520000', cityCode: '522300' },
      { code: '522323', name: '普安县', level: 'district', provinceCode: '520000', cityCode: '522300' },
      { code: '522324', name: '晴隆县', level: 'district', provinceCode: '520000', cityCode: '522300' },
      { code: '522325', name: '贞丰县', level: 'district', provinceCode: '520000', cityCode: '522300' },
      { code: '522326', name: '望谟县', level: 'district', provinceCode: '520000', cityCode: '522300' },
      { code: '522327', name: '册亨县', level: 'district', provinceCode: '520000', cityCode: '522300' },
      { code: '522328', name: '安龙县', level: 'district', provinceCode: '520000', cityCode: '522300' }
    ]
  },

  townships: {
    '522325': [
      { id: 'ZFLG003', code: '522325103', name: '鲁贡镇', level: 'township', districtCode: '522325' },
      { id: 'ZFLG004', code: '522325104', name: '沙坪镇', level: 'township', districtCode: '522325' },
      { id: 'ZFLG005', code: '522325105', name: '白层镇', level: 'township', districtCode: '522325' },
      { id: 'ZFLG006', code: '522325106', name: '小屯镇', level: 'township', districtCode: '522325' },
      { id: 'ZFLG007', code: '522325107', name: '长田镇', level: 'township', districtCode: '522325' },
      { id: 'ZFLG008', code: '522325108', name: ' '龙场镇', level: 'township', districtCode: '522325' },
      { id: 'ZFLG009', code: '522325109', name: '北盘江镇', level: 'township', districtCode: '522325' }
    ],
    '522326': [
      { id: 'ZWM001', code: '522326101', name: '平洞街道', level: 'township', districtCode: '522326' },
      { id: 'ZWM002', code: '522326102', name: '新屯街道', level: 'township', districtCode: '522326' },
      { id: 'ZWM003', code: '522326103', name: '王母街道', level: 'township', districtCode: '522326' },
      { id: 'ZWM004', code: '522326104', name: '乐元镇', level: 'township', districtCode: '522326' },
      { id: 'ZWM005', code: '522326105', name: '打易镇', level: 'township', districtCode: '522326' },
      { id: 'ZWM006', code: '522326106', name: '郊纳镇', level: 'township', districtCode: '522326' },
      { id: 'ZWM007', code: '522326107', name: '蔗香镇', level: 'township', districtCode: '522326' },
      { id: 'ZWM008', code: '522326108', name: '大观镇', level: 'township', districtCode: '522326' },
      { id: 'ZWM009', code: '522326109', name: '油迈乡', level: 'township', districtCode: '522326' }
    ]
  },

  villages: {
    '522325103': [
      { id: 'ZFLG003V001', code: 'GZZF01V001A', name: '么扒村', address: '贵州省贞丰县鲁贡镇么扒村' },
      { id: 'ZFLG003V002', code: 'GZZF01V002A', name: '弄洋村', address: '贵州省贞丰县鲁贡镇弄洋村' },
      { id: 'ZFLG003V003', code: 'GZZF01V003A', name: '者央村', address: '贵州省贞丰县鲁贡镇者央村' },
      { id: 'ZFLG003V004', code: 'GZZF01V004A', name: '林桃村', address: '贵州省贞丰县鲁贡镇林桃村' },
      { id: 'ZFLG003V005', code: 'GZZF01V005A', name: '坡艾村', address: '贵州省贞丰县鲁贡镇坡艾村' },
      { id: 'ZFLG003V006', code: 'GZZF01V006A', name: '坡帽村', address: '贵州省贞丰县鲁贡镇坡帽村' },
      { id: 'ZFLG003V007', code: 'GZZF01V007A', name: '坡云村', address: '贵州省贞丰县鲁贡镇坡云村' },
      { id: 'ZFLG003V008', code: 'GZZF01V008A', name: '坡书村', address: '贵州省贞丰县鲁贡镇坡书村' },
      { id: 'ZFLG003V009', code: 'GZZF01V009A', name: '坪乐村', address: '贵州省贞丰县鲁贡镇坪乐村' },
      { id: 'ZFLG003V010', code: 'GZZF01V010A', name: '坪福村', address: '贵州省贞丰县鲁贡镇坪福村' },
      { id: 'ZFLG003V011', code: 'GZZF01V011A', name: '坪新村', address: '贵州省贞丰县鲁贡镇坪新村' },
      { id: 'ZFLG003V012', code: 'GZZF01V012A', name: '坪平村', address: '贵州省贞丰县鲁贡镇坪平村' },
      { id: 'ZFLG003V013', code: 'GZZF01V013A', name: '坪安村', address: '贵州省贞丰县鲁贡镇坪安村' },
      { id: 'ZFLG003V014', code: 'GZZF01V014A', name: '坪顺村', address: '贵州省贞丰县鲁贡镇坪顺村' },
      { id: 'ZFLG003V015', code: 'GZZF01V015A', name: '坪和村', address: '贵州省贞丰县鲁贡镇坪和村' },
      { id: 'ZFLG003V016', code: 'GZZF01V016A', name: '坪乐村', address: '贵州省贞丰县鲁贡镇坪乐村' }
    ],
    '522325104': [
      { id: 'ZFLG004V001', code: 'GZZF02V001A', name: '者索村', address: '贵州省贞丰县沙坪镇者索村' },
      { id: 'ZFLG004V002', code: 'GZZF02V002A', name: '板昌村', address: '贵州省贞丰县沙坪镇板昌村' },
      { id: 'ZFLG004V003', code: 'GZZF02V003A', name: '这年村', address: '贵州省贞丰县沙坪镇这年村' },
      { id: 'ZFLG004V004', code: 'GZZF02V004A', name: '者砍村', address: '贵州省贞丰县沙坪镇者砍村' },
      { id: 'ZFLG004V005', code: 'GZZF02V005A', name: '尼罗村', address: '贵州省贞丰县沙坪镇尼罗村' },
      { id: 'ZFLG004V006', code: 'GZZF02V006A', name: '这年村', address: '贵州省贞丰县沙坪镇这年村' },
      { id: 'ZFLG004V007', code: 'GZZF02V007A', name: '者砍村', address: '贵州省贞丰县沙坪镇者砍村' },
      { id: 'ZFLG004V008', code: 'GZZF02V008A', name: '板昌村', address: '贵州省贞丰县沙坪镇板昌村' },
      { id: 'ZFLG004V009', code: 'GZZF02V009A', name: '尼罗村', address: '贵州省贞丰县沙坪镇尼罗村' }
    ],
    '522325105': [
      { id: 'ZFLG005V001', code: 'GZZF03V001A', name: '兴龙村', address: '贵州省贞丰县白层镇兴龙村' },
      { id: 'ZFLG005V002', code: 'GZZF03V002A', name: '坝桥村', address: '贵州省贞丰县白层镇坝桥村' },
      { id: 'ZFLG005V003', code: 'GZZF03V003A', name: '坡们村', address: '贵州省贞丰县白层镇坡们村' },
      { id: 'ZFLG005V004', code: 'GZZF03V004A', name: '纳杠村', address: '贵州省贞丰县白层镇纳杠村' },
      { id: 'ZFLG005V005', code: 'GZZF03V005A', name: '坡艾村', address: '贵州省贞丰县白层镇坡艾村' },
      { id: 'ZFLG005V006', code: 'GZZF03V006A', name: '坡帽村', address: '贵州省贞丰县白层镇坡帽村' },
      { id: 'ZFLG005V007', code: 'GZZF03V007A', name: '坡云村', address: '贵州省贞丰县白层镇坡云村' },
      { id: 'ZFLG005V008', code: 'GZZF03V008A', name: '坡书村', address: '贵州省贞丰县白层镇坡书村' },
      { id: 'ZFLG005V009', code: 'GZZF03V009A', name: '坪乐村', address: '贵州省贞丰县白层镇坪乐村' },
      { id: 'ZFLG005V010', code: 'GZZF03V010A', name: '坪福村', address: '贵州省贞丰县白层镇坪福村' },
      { id: 'ZFLG005V011', code: 'GZZF03V011A', name: '坪新村', address: '贵州省贞丰县白层镇坪新村' },
      { id: 'ZFLG005V012', code: 'GZZF03V012A', name: '坪平村', address: '贵州省贞丰县白层镇坪平村' },
      { id: 'ZFLG005V013', code: 'GZZF03V013A', name: '坪安村', address: '贵州省贞丰县白层镇坪安村' },
      { id: 'ZFLG005V014', code: 'GZZF03V014A', name: '坪顺村', address: '贵州省贞丰县白层镇坪顺村' },
      { id: 'ZFLG005V015', code: 'GZZF03V015A', name: '坪和村', address: '贵州省贞丰县白层镇坪和村' },
      { id: 'ZFLG005V016', code: 'GZZF03V016A', name: '坪乐村', address: '贵州省贞丰县白层镇坪乐村' }
    ],
    '522326104': [
      { id: 'ZWM004V001', code: 'GZZW01V001A', name: '乐元村', address: '贵州省望谟县乐元镇乐元村' },
      { id: 'ZWM004V002', code: 'GZZW01V002A', name: '里好村', address: '贵州省望谟县乐元镇里好村' },
      { id: 'ZWM004V003', code: 'GZZW01V003A', name: '纳管村', address: '贵州省望谟县乐元镇纳管村' },
      { id: 'ZWM004V004', code: 'GZZW01V004A', name: '董万村', address: '贵州省望谟县乐元镇董万村' },
      { id: 'ZWM004V005', code: 'GZZW01V005A', name: '边饶村', address: '贵州省望谟县乐元镇边饶村' }
    ]
  }
};
