const express = require('express');
const router = express.Router();
const smartAuthController = require('../controllers/smartAuthenticationController');
const { body, param } = require('express-validator');
const auth = require('../middleware/auth');

// å¡-Ùˆ
const handleValidationErrors = (req, res, next) => {
  const errors = require('express-validator').validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '¬på¡1%',
      errors: errors.array()
    });
  }
  next();
};

// ==================== ∫8§¡ ====================

/**
 * @swagger
 * /api/smart-auth/face/register:
 *   post:
 *     summary: Ëå∫8
 *     tags: [Smart Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               imageUrl:
 *                 type: string
 *               livenessAction:
 *                 type: string
 *                 enum: [blink, nod, mouth, head_turn, multi_action, 3d_depth]
 *     responses:
 *       201:
 *         description: ∫8Ëåü
 */
router.post('/face/register', auth, smartAuthController.upload.single('image'), [
  body('livenessAction')
    .optional()
    .isIn(['blink', 'nod', 'mouth', 'head_turn', 'multi_action', '3d_depth'])
    .withMessage(';S¿K®\‡H'),
  handleValidationErrors
], smartAuthController.registerFace);

/**
 * @swagger
 * /api/smart-auth/face/authenticate/{userId}:
 *   post:
 *     summary: ∫8§¡
 *     tags: [Smart Authentication]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: (7ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: §¡ü
 *       401:
 *         description: §¡1%
 */
router.post('/face/authenticate/:userId', smartAuthController.upload.single('image'), handleValidationErrors, smartAuthController.authenticateFace);

/**
 * @swagger
 * /api/smart-auth/face/search:
 *   post:
 *     summary: «∫8"(7
 *     tags: [Smart Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: "”ú
 */
router.post('/face/search', smartAuthController.upload.single('image'), handleValidationErrors, smartAuthController.searchUserByFace);

/**
 * @swagger
 * /api/smart-auth/face/{faceId}/verify:
 *   post:
 *     summary: °8∫8Ëå
 *     tags: [Smart Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: faceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ∫8ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - approved
 *             properties:
 *               approved:
 *                 type: boolean
 *               reason:
 *                 type: string
 *                 description: “›ü‡approved=falseˆ≈k	
 *     responses:
 *       200:
 *         description: °8å
 */
router.post('/face/:faceId/verify', auth, [
  body('approved')
    .isBoolean()
    .withMessage('approved≈{:<'),
  body('reason')
    .if((value, { req }) => !req.body.approved)
    .notEmpty()
    .withMessage('“›ˆ≈{–õü‡'),
  handleValidationErrors
], smartAuthController.verifyFaceRegistration);

/**
 * @swagger
 * /api/smart-auth/face/user/{userId}:
 *   get:
 *     summary: ∑÷(7∫8·o
 *     tags: [Smart Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: (7ID
 *     responses:
 *       200:
 *         description: (7∫8·o
 *       404:
 *         description: (7*Ëå∫8
 */
router.get('/face/user/:userId', auth, [
  param('userId')
    .isMongoId()
    .withMessage('(7ID<Ô'),
  handleValidationErrors
], smartAuthController.getUserFaceInfo);

// ==================== ≤^„ ====================

/**
 * @swagger
 * /api/smart-auth/proxy:
 *   post:
 *     summary: ˙„àC
 *     tags: [Smart Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - principalUserId
 *               - proxyUserId
 *               - relationship
 *             properties:
 *               principalUserId:
 *                 type: string
 *                 description: ´„∫ID
 *               proxyUserId:
 *                 type: string
 *                 description: „∫ID
 *               relationship:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [spouse, parent, child, sibling, grandparent, grandchild, other]
 *                   customRelation:
 *                     type: string
 *                 proofDocuments:
 *                     type: array
 *                     items:
 *                       type: object
 *               authorizationScope:
 *                 type: object
 *                 properties:
 *                   allowedOperations:
 *                     type: array
 *                     items:
 *                       type: string
 *                   timeConstraints:
 *                     type: object
 *     responses:
 *       201:
 *         description: „àC˙ü
 */
router.post('/proxy', auth, [
  body('principalUserId')
    .isMongoId()
    .withMessage('´„∫ID<Ô'),
  body('proxyUserId')
    .isMongoId()
    .withMessage('„∫ID<Ô'),
  body('relationship.type')
    .isIn(['spouse', 'parent', 'child', 'sibling', 'grandparent', 'grandchild', 'other'])
    .withMessage('s˚{ã‡H'),
  body('authorizationScope.allowedOperations')
    .isArray({ min: 1 })
    .withMessage('A∏ÑÕ\˝:z'),
  handleValidationErrors
], smartAuthController.createProxyAuthorization);

/**
 * @swagger
 * /api/smart-auth/proxy/{authId}/verify:
 *   post:
 *     summary: °8„àC
 *     tags: [Smart Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: authId
 *         required: true
 *         schema:
 *           type: string
 *         description: àCID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - approved
 *             properties:
 *               approved:
 *                 type: boolean
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: °8å
 */
router.post('/proxy/:authId/verify', auth, [
  param('authId')
    .isMongoId()
    .withMessage('àCID<Ô'),
  body('approved')
    .isBoolean()
    .withMessage('approved≈{:<'),
  body('reason')
    .if((value, { req }) => !req.body.approved)
    .notEmpty()
    .withMessage('“›ˆ≈{–õü‡'),
  handleValidationErrors
], smartAuthController.verifyProxyAuthorization);

/**
 * @swagger
 * /api/smart-auth/proxy/{principalUserId}/use:
 *   post:
 *     summary: („CP
 *     tags: [Smart Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: principalUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: ´„∫ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - operation
 *             properties:
 *               operation:
 *                 type: string
 *                 description: ÅgLÑÕ\
 *     responses:
 *       200:
 *         description: „Õ\ü
 *       403:
 *         description: ‡„CP
 */
router.post('/proxy/:principalUserId/use', auth, [
  param('principalUserId')
    .isMongoId()
    .withMessage('´„∫ID<Ô'),
  body('operation')
    .notEmpty()
    .withMessage('Õ\˝:z'),
  handleValidationErrors
], smartAuthController.useProxyAuthorization);

/**
 * @swagger
 * /api/smart-auth/proxy/{authId}/revoke:
 *   post:
 *     summary: § „àC
 *     tags: [Smart Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: authId
 *         required: true
 *         schema:
 *           type: string
 *         description: àCID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: § ü‡
 *     responses:
 *       200:
 *         description: àCÚ§ 
 */
router.post('/proxy/:authId/revoke', auth, [
  param('authId')
    .isMongoId()
    .withMessage('àCID<Ô'),
  handleValidationErrors
], smartAuthController.revokeProxyAuthorization);

/**
 * @swagger
 * /api/smart-auth/proxy/user/{userId}:
 *   get:
 *     summary: ∑÷(7Ñ„s˚
 *     tags: [Smart Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: (7ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, principal, proxy]
 *           default: all
 *         description: s˚{ã
 *     responses:
 *       200:
 *         description: „s˚h
 */
router.get('/proxy/user/:userId', auth, [
  param('userId')
    .isMongoId()
    .withMessage('(7ID<Ô'),
  handleValidationErrors
], smartAuthController.getUserProxies);

/**
 * @swagger
 * /api/smart-auth/proxy/my:
 *   get:
 *     summary: ∑÷Ñ„s˚
 *     tags: [Smart Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, principal, proxy]
 *           default: all
 *         description: s˚{ã
 *     responses:
 *       200:
 *         description: Ñ„s˚
 */
router.get('/proxy/my', auth, smartAuthController.getMyProxies);

// ==================== §¡› ====================

/**
 * @swagger
 * /api/smart-auth/session/{sessionId}/validate:
 *   post:
 *     summary: å¡§¡›
 *     tags: [Smart Authentication]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ›ID
 *     responses:
 *       200:
 *         description: ›	H
 *       401:
 *         description: ›‡HÚ«
 */
router.post('/session/:sessionId/validate', [
  param('sessionId')
    .notEmpty()
    .withMessage('›ID˝:z'),
  handleValidationErrors
], smartAuthController.validateAuthSession);

// ==================== ﬂ°åê ====================

/**
 * @swagger
 * /api/smart-auth/stats:
 *   get:
 *     summary: ∑÷§¡ﬂ°
 *     tags: [Smart Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: villageId
 *         schema:
 *           type: string
 *         description: QÑID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description:  ÀÂ
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ”_Â
 *     responses:
 *       200:
 *         description: §¡ﬂ°pn
 */
router.get('/stats', auth, smartAuthController.getAuthStatistics);

module.exports = router;
