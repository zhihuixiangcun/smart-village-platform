/**
 * 礼物配置模块测试
 * 测试礼物价格计算功能
 */

const { calculateTotalPrice, getGiftInfo, getAllGifts } = require('../giftConfig');

describe('礼物配置测试', () => {

  test('应正确计算单个礼物价格', () => {
    const rosePrice = calculateTotalPrice('rose', 1);
    expect(rosePrice).toBe(0);

    const coffeePrice = calculateTotalPrice('coffee', 1);
    expect(coffeePrice).toBe(5);

    const rocketPrice = calculateTotalPrice('rocket', 1);
    expect(rocketPrice).toBe(2000);
  });

  test('应正确计算多个礼物总价', () => {
    const totalPrice = calculateTotalPrice('coffee', 10);
    expect(totalPrice).toBe(50); // 5 * 10
  });

  test('应正确获取礼物信息', () => {
    const gift = getGiftInfo('rose');
    expect(gift).toBeDefined();
    expect(gift.name).toBe('玫瑰');
    expect(gift.icon).toBe('🌹');
    expect(gift.price).toBe(0);
    expect(gift.category).toBe('free');
  });

  test('无效礼物ID应返回null', () => {
    const gift = getGiftInfo('invalid_gift');
    expect(gift).toBeNull();
  });

  test('默认数量应为1', () => {
    const price = calculateTotalPrice('coffee');
    expect(price).toBe(5);
  });

  test('应获取所有礼物配置', () => {
    const gifts = getAllGifts();
    expect(gifts).toBeDefined();
    expect(Object.keys(gifts).length).toBeGreaterThan(0);
    expect(gifts.rose).toBeDefined();
    expect(gifts.rocket).toBeDefined();
  });
});
