/**
 * 腾讯云OCR服务 - 占位实现
 * TODO: 实现实际的腾讯云OCR API调用
 */

class TencentOCR {
  /**
   * 识别文档
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 识别结果
   */
  static async recognizeDocument(filePath) {
    // TODO: 实现实际的腾讯云OCR API调用
    // 目前返回模拟数据
    return {
      success: false,
      message: '腾讯云OCR服务未配置，请先配置API密钥',
      text: '',
      items: []
    };
  }

  /**
   * 识别身份证
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 识别结果
   */
  static async recognizeIdCard(filePath) {
    // TODO: 实现实际的腾讯云身份证OCR API调用
    return {
      success: false,
      message: '腾讯云OCR服务未配置，请先配置API密钥',
      data: {}
    };
  }

  /**
   * 识别银行卡
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 识别结果
   */
  static async recognizeBankCard(filePath) {
    // TODO: 实现实际的腾讯云银行卡OCR API调用
    return {
      success: false,
      message: '腾讯云OCR服务未配置，请先配置API密钥',
      data: {}
    };
  }

  /**
   * 识别营业执照
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} 识别结果
   */
  static async recognizeBusinessLicense(filePath) {
    // TODO: 实现实际的腾讯云营业执照OCR API调用
    return {
      success: false,
      message: '腾讯云OCR服务未配置，请先配置API密钥',
      data: {}
    };
  }
}

module.exports = TencentOCR;
