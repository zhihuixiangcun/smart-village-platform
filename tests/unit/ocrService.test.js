/**
 * OCR服务单元测试
 */

require('../setup/unit');
const ocrService = require('../../src/services/ocrService');

describe('OCR Service', () => {
  describe('recognizeIDCard', () => {
    test('应该正确解析身份证信息', async () => {
      const mockImageBuffer = Buffer.from('fake-id-card-image');

      // Mock successful OCR response
      const mockResult = {
        name: '张三',
        idCard: '110101199001011234',
        gender: '男',
        nation: '汉',
        birth: '1990-01-01',
        address: '北京市东城区某某街道',
        authority: '北京市公安局东城分局',
        validDate: '2010.01.01-2020.01.01'
      };

      ocrService.recognizeIDCard = jest.fn().mockResolvedValue(mockResult);

      const result = await ocrService.recognizeIDCard(mockImageBuffer);

      expect(result).toBeDefined();
      expect(result.name).toBe('张三');
      expect(result.idCard).toMatch(/^\d{17}[\dXx]$/);
      expect(['男', '女']).toContain(result.gender);
    });

    test('应该处理无效的身份证号码', async () => {
      const mockImageBuffer = Buffer.from('invalid-id-card');

      ocrService.recognizeIDCard = jest.fn().mockResolvedValue({
        name: '张三',
        idCard: 'invalid-id',
        gender: '男'
      });

      const result = await ocrService.recognizeIDCard(mockImageBuffer);

      expect(result.idCard).toBe('invalid-id');
    });

    test('应该处理OCR服务错误', async () => {
      const mockImageBuffer = Buffer.from('corrupted-image');

      ocrService.recognizeIDCard = jest.fn().mockRejectedValue(
        new Error('OCR service unavailable')
      );

      await expect(ocrService.recognizeIDCard(mockImageBuffer))
        .rejects.toThrow('OCR service unavailable');
    });
  });

  describe('recognizeInvoice', () => {
    test('应该正确解析发票信息', async () => {
      const mockImageBuffer = Buffer.from('fake-invoice-image');

      const mockResult = {
        invoiceCode: '1234567890',
        invoiceNumber: '00000001',
        invoiceDate: '2023-12-20',
        purchaserName: '测试公司',
        purchaserTaxNo: '91110000123456789X',
        sellerName: '供应商公司',
        sellerTaxNo: '91110000987654321Y',
        totalAmount: '1000.00',
        taxAmount: '130.00',
        amountInWords: '壹仟元整'
      };

      ocrService.recognizeInvoice = jest.fn().mockResolvedValue(mockResult);

      const result = await ocrService.recognizeInvoice(mockImageBuffer);

      expect(result).toBeDefined();
      expect(result.invoiceCode).toBeDefined();
      expect(result.invoiceNumber).toBeDefined();
      expect(parseFloat(result.totalAmount)).toBeGreaterThan(0);
    });
  });

  describe('validateIDCard', () => {
    test('应该验证有效的身份证号码', () => {
      const validIdCards = [
        '110101199001011234',
        '440101199002022345',
        '310101199003033456'
      ];

      validIdCards.forEach(idCard => {
        expect(ocrService.validateIDCard(idCard)).toBe(true);
      });
    });

    test('应该拒绝无效的身份证号码', () => {
      const invalidIdCards = [
        '123456789012345678', // 长度错误
        '11010119900101123X', // 最后一位错误
        '11010119900101123',  // 长度不足
        ''                    // 空字符串
      ];

      invalidIdCards.forEach(idCard => {
        expect(ocrService.validateIDCard(idCard)).toBe(false);
      });
    });
  });

  describe('extractBirthDate', () => {
    test('应该从身份证号码提取正确的出生日期', () => {
      const testCases = [
        { idCard: '110101199001011234', expected: '1990-01-01' },
        { idCard: '440101200002022345', expected: '2000-02-02' }
      ];

      testCases.forEach(({ idCard, expected }) => {
        expect(ocrService.extractBirthDate(idCard)).toBe(expected);
      });
    });

    test('应该处理无效的身份证号码', () => {
      expect(ocrService.extractBirthDate('invalid')).toBeNull();
    });
  });

  describe('extractGender', () => {
    test('应该从身份证号码提取正确的性别', () => {
      expect(ocrService.extractGender('110101199001011234')).toBe('男'); // 第17位是奇数
      expect(ocrService.extractGender('110101199001011235')).toBe('女'); // 第17位是偶数
    });

    test('应该处理无效的身份证号码', () => {
      expect(ocrService.extractGender('invalid')).toBeNull();
    });
  });
});