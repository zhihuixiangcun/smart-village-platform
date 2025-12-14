/**
 * 村务工作流程端到端测试
 */

const puppeteer = require('puppeteer');
const { expect } = require('chai');

describe('Village Management Platform E2E Tests', () => {
  let browser;
  let page;
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  before(async () => {
    browser = await puppeteer.launch({
      headless: process.env.NODE_ENV === 'test' ? true : false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  after(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
  });

  afterEach(async () => {
    await page.close();
  });

  describe('用户登录和权限验证流程', () => {
    it('应该完成村民登录流程', async () => {
      // 访问登录页面
      await page.goto(`${baseUrl}/login`);

      // 等待页面加载
      await page.waitForSelector('#login-form');

      // 填写登录信息
      await page.type('#username', 'villager001');
      await page.type('#password', 'password123');

      // 选择角色
      await page.select('#role', 'villager');

      // 点击登录按钮
      await page.click('#login-button');

      // 等待跳转到首页
      await page.waitForNavigation();

      // 验证登录成功
      const currentUrl = page.url();
      expect(currentUrl).to.include('/dashboard');

      // 验证用户信息显示
      await page.waitForSelector('.user-info');
      const userName = await page.$eval('.user-name', el => el.textContent);
      expect(userName).to.include('villager001');
    });

    it('应该显示村委管理面板', async () => {
      // 村委管理员登录
      await page.goto(`${baseUrl}/login`);
      await page.type('#username', 'admin001');
      await page.type('#password', 'admin123');
      await page.select('#role', 'village_admin');
      await page.click('#login-button');
      await page.waitForNavigation();

      // 验证管理面板显示
      await page.waitForSelector('.admin-panel');
      const managementModules = await page.$$('.admin-module');
      expect(managementModules.length).to.be.greaterThan(0);
    });
  });

  describe('农资电商购买流程', () => {
    beforeEach(async () => {
      // 先登录
      await page.goto(`${baseUrl}/login`);
      await page.type('#username', 'villager001');
      await page.type('#password', 'password123');
      await page.select('#role', 'villager');
      await page.click('#login-button');
      await page.waitForNavigation();
    });

    it('应该完成完整的农资购买流程', async () => {
      // 导航到电商页面
      await page.click('[data-testid="ecommerce-link"]');
      await page.waitForNavigation();
      await page.waitForSelector('.product-list');

      // 搜索产品
      await page.type('#search-input', '有机化肥');
      await page.click('#search-button');
      await page.waitForSelector('.product-card');

      // 点击第一个产品查看详情
      await page.click('.product-card:first-child');
      await page.waitForSelector('.product-detail');

      // 验证产品详情显示
      const productName = await page.$eval('.product-title', el => el.textContent);
      expect(productName).to.include('有机化肥');

      // 添加到购物车
      await page.type('#quantity-input', '2');
      await page.click('#add-to-cart');

      // 等待购物车更新提示
      await page.waitForSelector('.cart-notification');
      const notification = await page.$eval('.cart-notification', el => el.textContent);
      expect(notification).to.include('已添加到购物车');

      // 查看购物车
      await page.click('#cart-icon');
      await page.waitForSelector('.cart-modal');

      // 验证购物车内容
      const cartItems = await page.$$('.cart-item');
      expect(cartItems.length).to.equal(1);

      const cartTotal = await page.$eval('.cart-total', el => el.textContent);
      expect(cartTotal).to.include('240');

      // 结算
      await page.click('#checkout-button');
      await page.waitForSelector('.checkout-form');

      // 填写收货信息
      await page.type('#recipient-name', '张三');
      await page.type('#recipient-phone', '13800138001');
      await page.type('#address-detail', '浙江省杭州市余杭区瓶窑镇测试地址');

      // 选择支付方式
      await page.click('#payment-wechat');

      // 提交订单
      await page.click('#submit-order');
      await page.waitForSelector('.order-success');

      // 验证订单创建成功
      const orderMessage = await page.$eval('.order-success', el => el.textContent);
      expect(orderMessage).to.include('订单创建成功');

      // 跳转到支付页面
      await page.click('#go-to-payment');
      await page.waitForSelector('.payment-qr');

      // 验证支付二维码显示
      const qrCode = await page.$('.payment-qr img');
      expect(qrCode).to.exist;
    });

    it('应该处理农产品供应发布', async () => {
      // 导航到农产品供应页面
      await page.click('[data-testid="farm-supply-link"]');
      await page.waitForNavigation();

      // 点击发布供应按钮
      await page.click('#publish-supply');
      await page.waitForSelector('.supply-form');

      // 填写供应信息
      await page.type('#product-name', '有机蔬菜');
      await page.select('#product-category', 'vegetable');
      await page.type('#product-description', '新鲜有机蔬菜，无农药残留');
      await page.type('#product-quantity', '100');
      await page.select('#product-unit', 'kg');

      await page.type('#min-price', '8');
      await page.type('#max-price', '12');

      await page.select('#quality-grade', 'AAA');
      await page.click('#certification-organic');
      await page.click('#certification-green');

      await page.type('#contact-phone', '13800138001');
      await page.type('#contact-address', '浙江省杭州市余杭区瓶窑镇');

      // 提交表单
      await page.click('#submit-supply');
      await page.waitForSelector('.supply-success');

      // 验证发布成功
      const successMessage = await page.$eval('.supply-success', el => el.textContent);
      expect(successMessage).to.include('发布成功');
    });
  });

  describe('计算机视觉服务流程', () => {
    beforeEach(async () => {
      // 登录
      await page.goto(`${baseUrl}/login`);
      await page.type('#username', 'villager001');
      await page.type('#password', 'password123');
      await page.click('#login-button');
      await page.waitForNavigation();
    });

    it('应该完成身份证OCR识别流程', async () => {
      // 导航到OCR服务页面
      await page.click('[data-testid="ocr-service-link"]');
      await page.waitForSelector('.ocr-upload-area');

      // 选择识别类型
      await page.select('#ocr-type', 'id_card');

      // 上传身份证图片 (模拟文件上传)
      const fileInput = await page.$('#file-input');
      await fileInput.uploadFile('tests/fixtures/id-card-sample.jpg');

      // 等待上传完成
      await page.waitForSelector('.upload-success');

      // 开始识别
      await page.click('#start-recognition');
      await page.waitForSelector('.recognition-result');

      // 验证识别结果
      const resultName = await page.$eval('.result-name', el => el.textContent);
      const resultIdNumber = await page.$eval('.result-id-number', el => el.textContent);

      expect(resultName).to.include('张');
      expect(resultIdNumber).to.match(/\d{17}[\dX]/); // 身份证号格式
    });

    it('应该完成作物病害识别流程', async () => {
      // 导航到作物病害识别页面
      await page.click('[data-testid="crop-detection-link"]');
      await page.waitForSelector('.detection-upload-area');

      // 选择作物类型
      await page.select('#crop-type', 'rice');

      // 上传病害图片
      const fileInput = await page.$('#file-input');
      await fileInput.uploadFile('tests/fixtures/crop-disease-sample.jpg');

      // 开始检测
      await page.click('#start-detection');
      await page.waitForSelector('.detection-result');

      // 验证检测结果
      const diseaseName = await page.$eval('.disease-name', el => el.textContent);
      const probability = await page.$eval('.disease-probability', el => el.textContent);
      const treatment = await page.$eval('.treatment-suggestion', el => el.textContent);

      expect(diseaseName).to.exist;
      expect(probability).to.include('%');
      expect(treatment).to.include('建议');
    });

    it('应该完成人脸识别登录流程', async () => {
      // 导航到人脸识别页面
      await page.click('[data-testid="face-recognition-link"]');
      await page.waitForSelector('.face-camera');

      // 启动摄像头
      await page.click('#start-camera');
      await page.waitForSelector('.camera-preview');

      // 模拟人脸识别成功 (在实际测试中需要模拟摄像头数据)
      await page.evaluate(() => {
        // 模拟成功的人脸识别结果
        window.simulateFaceRecognitionSuccess();
      });

      // 等待识别结果
      await page.waitForSelector('.recognition-success');

      // 验证识别成功
      const successMessage = await page.$eval('.recognition-success', el => el.textContent);
      expect(successMessage).to.include('识别成功');
    });
  });

  describe('村务管理流程', () => {
    beforeEach(async () => {
      // 村委管理员登录
      await page.goto(`${baseUrl}/login`);
      await page.type('#username', 'admin001');
      await page.type('#password', 'admin123');
      await page.select('#role', 'village_admin');
      await page.click('#login-button');
      await page.waitForNavigation();
    });

    it('应该完成公告发布流程', async () => {
      // 导航到公告管理页面
      await page.click('[data-testid="announcement-link"]');
      await page.waitForSelector('.announcement-list');

      // 点击发布新公告
      await page.click('#new-announcement');
      await page.waitForSelector('.announcement-form');

      // 填写公告内容
      await page.type('#announcement-title', '关于春耕备耕的通知');
      await page.type('#announcement-content', '各位村民，春耕备耕工作即将开始，请提前做好准备工作...');

      // 设置公告类型和优先级
      await page.select('#announcement-type', 'notice');
      await page.select('#announcement-priority', 'high');

      // 设置发布时间
      await page.type('#publish-time', '2025-03-01 09:00');

      // 添加附件
      const fileInput = await page.$('#attachment-input');
      await fileInput.uploadFile('tests/fixtures/announcement-attachment.pdf');

      // 预览公告
      await page.click('#preview-announcement');
      await page.waitForSelector('.preview-modal');

      // 确认发布
      await page.click('#confirm-publish');
      await page.waitForSelector('.publish-success');

      // 验证公告发布成功
      const successMessage = await page.$eval('.publish-success', el => el.textContent);
      expect(successMessage).to.include('发布成功');

      // 验证公告出现在列表中
      await page.goto(`${baseUrl}/announcements`);
      await page.waitForSelector('.announcement-item');

      const announcementTitle = await page.$eval('.announcement-title', el => el.textContent);
      expect(announcementTitle).to.include('春耕备耕');
    });

    it('应该完成村民信息管理流程', async () => {
      // 导航到村民管理页面
      await page.click('[data-testid="villager-management-link"]');
      await page.waitForSelector('.villager-list');

      // 搜索村民
      await page.type('#villager-search', '张三');
      await page.click('#search-button');

      // 等待搜索结果
      await page.waitForSelector('.villager-card');

      // 点击查看村民详情
      await page.click('.villager-card:first-child');
      await page.waitForSelector('.villager-detail');

      // 验证村民信息显示
      const villagerName = await page.$eval('.villager-name', el => el.textContent);
      expect(villagerName).to.include('张三');

      // 编辑村民信息
      await page.click('#edit-villager');
      await page.waitForSelector('.edit-form');

      await page.type('#villager-phone', '13800138002');
      await page.type('#villager-address', '浙江省杭州市余杭区瓶窑镇新地址');

      // 保存修改
      await page.click('#save-changes');
      await page.waitForSelector('.save-success');

      // 验证修改成功
      const saveMessage = await page.$eval('.save-success', el => el.textContent);
      expect(saveMessage).to.include('保存成功');
    });
  });

  describe('实时监控和数据分析流程', () => {
    beforeEach(async () => {
      // 系统管理员登录
      await page.goto(`${baseUrl}/login`);
      await page.type('#username', 'sysadmin');
      await page.type('#password', 'admin123');
      await page.select('#role', 'system_admin');
      await page.click('#login-button');
      await page.waitForNavigation();
    });

    it('应该访问实时数据大屏', async () => {
      // 导航到监控大屏
      await page.click('[data-testid="monitoring-dashboard-link"]');
      await page.waitForSelector('.dashboard-container');

      // 验证数据大屏组件
      await page.waitForSelector('.system-metrics');
      await page.waitForSelector('.real-time-charts');
      await page.waitForSelector('.alert-panel');

      // 验证关键指标显示
      const cpuUsage = await page.$eval('.cpu-usage', el => el.textContent);
      const memoryUsage = await page.$eval('.memory-usage', el => el.textContent);
      const onlineUsers = await page.$eval('.online-users', el => el.textContent);

      expect(cpuUsage).to.match(/\d+/);
      expect(memoryUsage).to.match(/\d+/);
      expect(onlineUsers).to.match(/\d+/);

      // 验证图表加载
      const charts = await page.$$('.chart-container');
      expect(charts.length).to.be.greaterThan(0);
    });

    it('应该完成数据分析报告生成', async () => {
      // 导航到数据分析页面
      await page.click('[data-testid="data-analytics-link"]');
      await page.waitForSelector('.analytics-panel');

      // 选择报告类型
      await page.select('#report-type', 'village_efficiency');

      // 设置时间范围
      await page.type('#start-date', '2025-01-01');
      await page.type('#end-date', '2025-01-31');

      // 选择数据维度
      await page.click('#include-demographics');
      await page.click('#include-services');
      await page.click('#include-activities');

      // 生成报告
      await page.click('#generate-report');
      await page.waitForSelector('.report-loading');

      // 等待报告生成完成
      await page.waitForSelector('.report-result', { timeout: 10000 });

      // 验证报告内容
      const reportTitle = await page.$eval('.report-title', el => el.textContent);
      const reportData = await page.$eval('.report-summary', el => el.textContent);

      expect(reportTitle).to.include('村务效能分析报告');
      expect(reportData).to.include('效率指标');

      // 导出报告
      await page.click('#export-report');

      // 验证下载开始
      await page.waitForSelector('.download-started');
    });
  });

  describe('移动端适配测试', () => {
    beforeEach(async () => {
      await page.setViewport({ width: 375, height: 667 }); // iPhone尺寸
    });

    it('应该在移动端正常显示', async () => {
      await page.goto(`${baseUrl}`);

      // 验证响应式布局
      const isMobileLayout = await page.$eval('body', el =>
        window.getComputedStyle(el).getPropertyValue('--mobile-layout') === 'true'
      );
      expect(isMobileLayout).to.be.true;

      // 验证移动端导航菜单
      await page.click('.mobile-menu-toggle');
      await page.waitForSelector('.mobile-menu');

      // 验证触摸友好的按钮
      const buttons = await page.$$('.btn');
      for (const button of buttons) {
        const buttonHeight = await button.evaluate(el =>
          window.getComputedStyle(el).getPropertyValue('min-height')
        );
        expect(parseInt(buttonHeight)).to.be.at.least(44); // iOS推荐最小触摸区域
      }
    });

    it('应该支持触摸手势', async () => {
      await page.goto(`${baseUrl}/announcements`);

      // 模拟滑动手势
      await page.evaluate(() => {
        const announcements = document.querySelector('.announcement-list');
        if (announcements) {
          announcements.dispatchEvent(new TouchEvent('touchstart', {
            touches: [{ clientX: 100, clientY: 200 }]
          }));
          announcements.dispatchEvent(new TouchEvent('touchmove', {
            touches: [{ clientX: 200, clientY: 200 }]
          }));
          announcements.dispatchEvent(new TouchEvent('touchend'));
        }
      });

      // 验证滑动响应
      await page.waitFor(500);
    });
  });

  describe('无障碍访问测试', () => {
    it('应该支持键盘导航', async () => {
      await page.goto(`${baseUrl}`);

      // 使用Tab键导航
      await page.keyboard.press('Tab');
      let focusedElement = await page.evaluate(() => document.activeElement.tagName);
      expect(focusedElement).to.be.oneOf(['BUTTON', 'A', 'INPUT']);

      // 继续Tab导航
      await page.keyboard.press('Tab');
      focusedElement = await page.evaluate(() => document.activeElement.tagName);

      // 验证焦点可见性
      const hasFocus = await page.evaluate(() => {
        const focused = document.activeElement;
        const styles = window.getComputedStyle(focused);
        return styles.outline !== 'none' || styles.boxShadow !== 'none';
      });
      expect(hasFocus).to.be.true;
    });

    it('应该支持屏幕阅读器', async () => {
      await page.goto(`${baseUrl}/login`);

      // 检查ARIA标签
      const hasAriaLabels = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input, button');
        return Array.from(inputs).every(input =>
          input.hasAttribute('aria-label') ||
          input.hasAttribute('aria-labelledby') ||
          input.hasAttribute('title')
        );
      });
      expect(hasAriaLabels).to.be.true;

      // 检查页面标题和结构
      const mainHeading = await page.$eval('h1', el => el.textContent);
      expect(mainHeading).to.exist;
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成页面加载', async () => {
      const startTime = Date.now();

      await page.goto(`${baseUrl}`);
      await page.waitForSelector('.app-container');

      const loadTime = Date.now() - startTime;
      expect(loadTime).to.be.lessThan(3000); // 3秒内完成加载
    });

    it('应该通过Core Web Vitals指标', async () => {
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals = {};

            entries.forEach((entry) => {
              if (entry.name === 'largest-contentful-paint') {
                vitals.lcp = entry.startTime;
              } else if (entry.name === 'first-input') {
                vitals.fid = entry.processingStart - entry.startTime;
              } else if (entry.entryType === 'layout-shift') {
                if (!vitals.cls) vitals.cls = 0;
                vitals.cls += entry.value;
              }
            });

            resolve(vitals);
          });

          observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

          // 5秒后返回结果
          setTimeout(() => observer.disconnect(), 5000);
        });
      });

      // Core Web Vitals 推荐阈值
      expect(metrics.lcp).to.be.lessThan(2500); // LCP < 2.5s
      expect(metrics.fid).to.be.lessThan(100); // FID < 100ms
      expect(metrics.cls).to.be.lessThan(0.1); // CLS < 0.1
    });
  });
});