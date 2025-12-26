/**
 * 文档管理路由
 */

const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/documentController');
const documentValidator = require('../validators/documentValidator');
const auth = require('../middleware/auth');

// 上传单个文档
router.post(
  '/',
  auth.authenticate,
  documentValidator.uploadDocument,
  DocumentController.uploadDocument
);

// 批量上传文档
router.post(
  '/batch',
  auth.authenticate,
  documentValidator.batchUploadDocuments,
  DocumentController.batchUploadDocuments
);

// 获取文档列表
router.get(
  '/',
  auth.authenticate,
  documentValidator.getDocumentList,
  DocumentController.getDocumentList
);

// 获取我的文档
router.get(
  '/my',
  auth.authenticate,
  documentValidator.getMyDocuments,
  DocumentController.getMyDocuments
);

// 获取文档统计数据
router.get(
  '/stats',
  auth.authenticate,
  documentValidator.getDocumentStats,
  DocumentController.getDocumentStats
);

// 获取文档详情
router.get(
  '/:documentId',
  auth.authenticate,
  documentValidator.documentId,
  DocumentController.getDocumentById
);

// 更新文档信息
router.put(
  '/:documentId',
  auth.authenticate,
  documentValidator.updateDocument,
  DocumentController.updateDocument
);

// 分享文档
router.post(
  '/:documentId/share',
  auth.authenticate,
  documentValidator.shareDocument,
  DocumentController.shareDocument
);

// 下载文档
router.get(
  '/:documentId/download',
  auth.authenticate,
  documentValidator.documentId,
  DocumentController.downloadDocument
);

// 语音读取文档内容
router.get(
  '/:documentId/read',
  auth.authenticate,
  documentValidator.readDocumentContent,
  DocumentController.readDocumentContent
);

// 预览文档
router.get(
  '/:documentId/preview',
  auth.authenticate,
  documentValidator.documentId,
  DocumentController.previewDocument
);

// 删除文档
router.delete(
  '/:documentId',
  auth.authenticate,
  documentValidator.documentId,
  DocumentController.deleteDocument
);

module.exports = router;