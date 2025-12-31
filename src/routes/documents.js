const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentController = require('../controllers/documentController');
const { authenticateToken } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/documents/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticateToken);

router.post('/package', documentController.createOrUpdatePackage);
router.get('/package/:residentId', documentController.getPackage);
router.put('/package/:residentId/document/:documentId', documentController.updateDocument);
router.delete('/package/:residentId/document/:documentId', documentController.deleteDocument);
router.post('/package/:residentId/upload', upload.single('file'), documentController.uploadDocumentFile);
router.put('/package/:residentId/access-settings', documentController.updateAccessSettings);
router.get('/package/:residentId/logs', documentController.getAccessLogs);
router.get('/types', documentController.getDocumentTypes);
router.get('/expiring', documentController.getExpiringDocuments);
router.get('/statistics', documentController.getStatistics);
router.get('/residents', documentController.getResidentsList);

module.exports = router;
