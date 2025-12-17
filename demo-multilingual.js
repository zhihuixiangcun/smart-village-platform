#!/usr/bin/env node

/**
 * 智慧乡村多语言系统演示脚本
 * 演示布依族语等少数民族语言支持功能
 */

const express = require('express');
const { initI18n, getSupportedLanguages, getLanguageInfo } = require('./src/i18n');
const LanguageDetector = require('./src/i18n/utils/languageDetector');
const Translator = require('./src/i18n/utils/translator');
const CulturalAdapter = require('./src/i18n/utils/culturalAdapter');

console.log('🌍 智慧乡村多语言系统演示');
console.log('='*50);

async function runDemo() {
  try {
    // 初始化系统
    console.log('\n📋 初始化多语言系统...');
    const i18next = initI18n();
    const languageDetector = new LanguageDetector();
    const translator = new Translator(i18next);
    const culturalAdapter = new CulturalAdapter();
    
    // 等待i18n系统就绪
    await new Promise(resolve => {
      if (i18next.isInitialized) {
        resolve();
      } else {
        i18next.on('initialized', resolve);
      }
    });
    
    console.log('✅ 多语言系统初始化完成');
    
    // 显示支持的语言
    console.log('\n🔤 支持的语言列表:');
    const languages = getSupportedLanguages();
    languages.forEach((lang, index) => {
      console.log(`  ${index + 1}. ${lang.name} (${lang.code}) - ${lang.displayName}`);
    });
    
    // 演示布依族语翻译
    console.log('\n🏮 布依族语翻译演示:');
    const bouyeiTranslations = {
      'welcome': translator.translate('welcome', { lng: 'pcc', ns: 'common' }),
      'hello': translator.translate('hello', { lng: 'pcc', ns: 'common' }),
      'thank_you': translator.translate('thank_you', { lng: 'pcc', ns: 'common' }),
      'village.management': translator.translate('management', { lng: 'pcc', ns: 'village' }),
      'village.rice': translator.translate('rice', { lng: 'pcc', ns: 'village' }),
      'village.harvest': translator.translate('harvest', { lng: 'pcc', ns: 'village' })
    };
    
    Object.entries(bouyeiTranslations).forEach(([key, translation]) => {
      const chineseTranslation = translator.translate(key.replace('village.', ''), { lng: 'zh-CN', ns: key.startsWith('village.') ? 'village' : 'common' });
      console.log(`  ${chineseTranslation} → ${translation} (${key})`);
    });
    
    // 演示方言支持
    console.log('\n🗣️  布依族语方言对比:');
    const dialectComparison = [
      { key: 'hello', ns: 'common' },
      { key: 'bouyei', ns: 'common' }
    ];
    
    dialectComparison.forEach(({ key, ns }) => {
      const standard = translator.translate(key, { lng: 'pcc', ns });
      const qiannan = translator.translate(key, { lng: 'pcc-qn', ns });
      const chinese = translator.translate(key, { lng: 'zh-CN', ns });
      
      console.log(`  ${chinese}:`);
      console.log(`    标准布依语: ${standard}`);
      console.log(`    黔南方言:   ${qiannan}`);
    });
    
    // 演示文化适配
    console.log('\n🎊 文化适配演示:');
    const culturalInfo = culturalAdapter.getCultureConfig('pcc');
    console.log(`  历法类型: ${culturalInfo.calendar}`);
    console.log(`  货币符号: ${culturalInfo.currencySymbol}`);
    console.log(`  周起始日: ${culturalInfo.weekStart === 1 ? '周一' : '周日'}`);
    
    // 演示节日信息
    console.log('\n🎉 布依族传统节日:');
    const festivals = culturalAdapter.getFestivals('pcc', 2024);
    festivals.slice(0, 4).forEach(festival => {
      console.log(`  ${festival.name} - ${festival.description}`);
    });
    
    // 演示亲属称谓
    console.log('\n👨‍👩‍👧‍👦 布依族语亲属称谓:');
    const kinshipTerms = ['father', 'mother', 'son', 'daughter', 'elder_brother', 'younger_sister'];
    kinshipTerms.forEach(term => {
      const bouyeiTerm = culturalAdapter.getKinshipTerm(term, 'pcc');
      const chineseTerm = {
        'father': '父亲',
        'mother': '母亲',
        'son': '儿子',
        'daughter': '女儿',
        'elder_brother': '哥哥',
        'younger_sister': '妹妹'
      }[term];
      console.log(`  ${chineseTerm} → ${bouyeiTerm}`);
    });
    
    // 演示货币格式化
    console.log('\n💰 货币格式化演示:');
    const amounts = [100, 1234.56, 50000];
    amounts.forEach(amount => {
      const chinese = culturalAdapter.formatCurrency(amount, 'zh-CN');
      const bouyei = culturalAdapter.formatCurrency(amount, 'pcc');
      console.log(`  ${amount} → 中文: ${chinese}, 布依语: ${bouyei}`);
    });
    
    // 演示地址格式化
    console.log('\n🏠 地址格式化演示:');
    const address = {
      country: '中国',
      province: '贵州省',
      city: '黔南布依族苗族自治州',
      district: '都匀市',
      street: '民族路',
      detail: '123号'
    };
    
    const formattedAddress = culturalAdapter.formatAddress(address, 'pcc');
    console.log(`  ${formattedAddress}`);
    
    // 翻译统计
    console.log('\n📊 翻译完成度统计:');
    const stats = translator.getStats();
    Object.entries(stats.completeness).forEach(([lang, percentage]) => {
      const langInfo = getLanguageInfo(lang);
      console.log(`  ${langInfo.name}: ${percentage.toFixed(1)}%`);
    });
    
    // 性能测试
    console.log('\n⚡ 性能测试:');
    const startTime = Date.now();
    
    // 批量翻译测试
    const testKeys = ['welcome', 'hello', 'thank_you', 'yes', 'no'];
    for (let i = 0; i < 100; i++) {
      translator.translateBatch(testKeys, { lng: 'pcc', ns: 'common' });
    }
    
    const endTime = Date.now();
    console.log(`  500次翻译操作耗时: ${endTime - startTime}ms`);
    console.log(`  缓存大小: ${stats.cacheSize} 项`);
    
    console.log('\n✅ 多语言系统演示完成!');
    console.log('\n🚀 启动提示:');
    console.log('  1. 运行 npm install 安装依赖');
    console.log('  2. 运行 npm start 启动服务器');
    console.log('  3. 访问 http://localhost:3001/api/v1/i18n/languages 查看API');
    console.log('  4. 测试多语言功能: POST http://localhost:3001/api/v1/i18n/switch');
    
  } catch (error) {
    console.error('❌ 演示运行失败:', error.message);
    process.exit(1);
  }
}

// 运行演示
if (require.main === module) {
  runDemo();
}

module.exports = { runDemo };