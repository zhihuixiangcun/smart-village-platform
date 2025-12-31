const { DocumentPackage, DocumentAccessLog, DOCUMENT_TYPES } = require('../models/DocumentPackage');
const User = require('../models/User');
const fsProm = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

exports.createOrUpdatePackage = async (req, res) => {
  try {
    const { residentId, documents, accessSettings } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userId !== residentId && userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    const resident = await User.findById(residentId);
    if (!resident) {
      return res.status(404).json({ success: false, error: 'Resident not found' });
    }

    let pkg = await DocumentPackage.findByResident(residentId);

    if (!pkg) {
      pkg = new DocumentPackage({
        residentId,
        villageId: resident.villageId,
        documents: [],
        accessSettings: accessSettings || { allowCommitteeView: false }
      });
    } else if (accessSettings) {
      pkg.accessSettings = { ...pkg.accessSettings, ...accessSettings };
    }

    if (documents && documents.length > 0) {
      for (const doc of documents) {
        await pkg.addDocument(doc);
      }
    }

    await pkg.save();

    res.json({ success: true, message: 'Saved', data: { packageId: pkg._id, totalDocuments: pkg.documents.length } });
  } catch (error) {
    logger.error('Failed:', error);
    res.status(500).json({ success: false, error: 'Failed' });
  }
};

exports.getPackage = async (req, res) => {
  try {
    const { residentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userVillageId = req.user.villageId;

    const access = await DocumentPackage.checkAccess(residentId, userId, userRole, userVillageId);

    if (!access.allowed) {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    let pkg = await DocumentPackage.findOne({ residentId })
      .populate('residentId', 'name phone villageId')
      .populate('villageId', 'name');

    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    if (access.requireMask) {
      pkg = pkg.getMaskedData();
    }

    res.json({ success: true, data: pkg });
  } catch (error) {
    logger.error('Failed:', error);
    res.status(500).json({ success: false, error: 'Failed' });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const { residentId, documentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userId !== residentId && userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    const pkg = await DocumentPackage.findByResident(residentId);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    await pkg.updateDocument(documentId, req.body);
    res.json({ success: true, message: 'Updated' });
  } catch (error) {
    logger.error('Failed:', error);
    res.status(500).json({ success: false, error: 'Failed' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const { residentId, documentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userId !== residentId && userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    const pkg = await DocumentPackage.findByResident(residentId);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    await pkg.removeDocument(documentId);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    logger.error('Failed:', error);
    res.status(500).json({ success: false, error: 'Failed' });
  }
};

exports.uploadDocumentFile = async (req, res) => {
  try {
    const { residentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userId !== residentId && userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file' });
    }

    const fileExt = path.extname(req.file.originalname);
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const fileKey = 'documents/' + residentId + '/' + timestamp + '_' + randomBytes + fileExt;

    const fileBuffer = await fsProm.readFile(req.file.path);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    await fsProm.unlink(req.file.path);

    res.json({ success: true, message: 'Uploaded', data: { fileKey, fileName: req.file.originalname, size: req.file.size, checksum } });
  } catch (error) {
    logger.error('Failed:', error);
    res.status(500).json({ success: false, error: 'Failed' });
  }
};

exports.getAccessLogs = async (req, res) => {
  try {
    const { residentId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const logs = await DocumentAccessLog.find({ residentId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('operatorId', 'name role');

    const total = await DocumentAccessLog.countDocuments({ residentId });

    res.json({ success: true, data: logs, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Failed:', error);
    res.status(500).json({ success: false, error: 'Failed' });
  }
};

exports.updateAccessSettings = async (req, res) => {
  try {
    const { residentId } = req.params;
    const { allowCommitteeView } = req.body;
    const userId = req.user.id;

    if (userId !== residentId) {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    const pkg = await DocumentPackage.findByResident(residentId);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    pkg.accessSettings.allowCommitteeView = allowCommitteeView;
    await pkg.save();

    res.json({ success: true, message: 'Updated', data: { allowCommitteeView } });
  } catch (error) {
    logger.error('Failed:', error);
    res.status(500).json({ success: false, error: 'Failed' });
  }
};

exports.getDocumentTypes = async (req, res) => {
  try {
    const types = Object.entries(DOCUMENT_TYPES).map(([key, value]) => ({ value, label: key, key }));
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
};

exports.getExpiringDocuments = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const expiring = await DocumentPackage.findExpiringDocuments(parseInt(days));
    res.json({ success: true, data: expiring });
  } catch (error) {
    logger.error('Failed:', error);
    res.status(500).json({ success: false, error: 'Failed' });
  }
};

exports.getStatistics = async (req, res) => {
  try {
    const { villageId } = req.query;
    const stats = await DocumentPackage.getStatistics(villageId);
    res.json({ success: true, data: stats[0] || { totalPackages: 0, totalDocuments: 0 } });
  } catch (error) {
    logger.error('Failed:', error);
    res.status(500).json({ success: false, error: 'Failed' });
  }
};

exports.getResidentsList = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userVillageId = req.user.villageId;

    if (!['committee_member', 'village_admin', 'village_secretary', 'admin'].includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    const query = { role: 'resident' };
    if (userRole !== 'admin') {
      query.villageId = userVillageId;
    }

    const residents = await User.find(query).select('name phone villageId').populate('villageId', 'name');
    const residentIds = residents.map(r => r._id);
    const packages = await DocumentPackage.find({ residentId: { $in: residentIds } });

    const result = residents.map(resident => {
      const pkg = packages.find(p => p.residentId.toString() === resident._id.toString());
      return { _id: resident._id, name: resident.name, phone: resident.phone, villageId: resident.villageId, hasPackage: !!pkg, totalDocuments: pkg ? pkg.documents.length : 0 };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Failed:', error);
    res.status(500).json({ success: false, error: 'Failed' });
  }
};
