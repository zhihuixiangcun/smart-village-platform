/**
 * Smart Village Platform - Multi-Tenant Migration Script
 * 智慧乡村综合服务平台 - 多租户迁移脚本
 *
 * Purpose:
 * - Add tenantId field to all existing models
 * - Create indexes for tenant data isolation
 * - Migrate existing data to default tenant
 * - Validate multi-tenant setup
 *
 * Usage:
 * node scripts/migrate-to-multi-tenant.js
 *
 * Options:
 * --dry-run    Preview changes without applying
 * --verify     Verify migration after completion
 * --rollback   Rollback migration (if needed)
 */

const mongoose = require('mongoose');

// Database connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smart-village';

/**
 * Models that need tenant isolation
 * Maps model name to its existing schema location
 */
const MODELS_TO_MIGRATE = {
  // User & Authentication
  'User': 'User',
  'VillageUser': 'VillageUser',

  // Resident Management
  'Resident': 'Resident',
  'ResidentProfile': 'ResidentProfile',
  'Household': 'Household',
  'Family': 'Family',

  // Village Management
  'Village': 'Village',
  'VillageMap': 'VillageMap',

  // Announcements & Communications
  'Announcement': 'Announcement',
  'Notification': 'Notification',
  'MessageLog': 'MessageLog',

  // Emergency Management
  'Emergency': 'Emergency',
  'EmergencyPlan': 'EmergencyPlan',
  'EmergencyResource': 'EmergencyResource',
  'EmergencyBroadcast': 'EmergencyBroadcast',
  'EmergencyResponse': 'EmergencyResponse',

  // Finance & Economy
  'Finance': 'Finance',
  'Product': 'Product',
  'Order': 'Order',
  'PaymentRecord': 'PaymentRecord',

  // Agriculture
  'Agriculture': 'Agriculture',
  'AgriculturalProduct': 'AgriculturalProduct',
  'FarmProductSupply': 'FarmProductSupply',

  // Governance & Collaboration
  'VillageCollaboration': 'VillageCollaboration',
  'Meeting': 'Meeting',
  'Voting': 'Voting',
  'Task': 'Task',

  // Documents & Resources
  'Document': 'Document',
  'DocumentCollection': 'DocumentCollection',

  // Duty & Scheduling
  'DutySchedule': 'DutySchedule',
  'DutyLog': 'DutyLog',

  // Subsidies & Applications
  'SubsidyApplication': 'SubsidyApplication',
  'PolicyCalculator': 'PolicyCalculator',

  // Family Proxy
  'FamilyProxyRelation': 'FamilyProxyRelation',
  'FamilyProxySession': 'FamilyProxySession',
  'FamilyProxyAuditLog': 'FamilyProxyAuditLog',

  // Face Recognition
  'FaceRecognition': 'FaceRecognition',

  // Location & Tracking
  'LocationTracking': 'LocationTracking',

  // Feedback & Support
  'Feedback': 'Feedback',

  // Audit & Logging
  'AuditLog': 'AuditLog',
  'BehaviorLog': 'BehaviorLog',
  'SyncHistory': 'SyncHistory',
  'UploadHistory': 'UploadHistory',

  // Data Analytics
  'DataAnalytics': 'DataAnalytics',

  // Applications
  'ApplicationHistory': 'ApplicationHistory'
};

/**
 * Models that should NOT have tenant isolation
 * (System-level models)
 */
const MODELS_TO_SKIP = [
  'Tenant',
  'Subscription',
  'Permission'
];

/**
 * Migration results tracker
 */
const migrationResults = {
  success: [],
  failed: [],
  skipped: [],
  summary: {
    totalModels: 0,
    processedModels: 0,
    addedTenantId: 0,
    createdIndexes: 0,
    migratedDocuments: 0
  }
};

/**
 * Connect to database
 */
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('[Migration] Connected to database:', MONGO_URI);
  } catch (error) {
    console.error('[Migration] Database connection failed:', error);
    throw error;
  }
}

/**
 * Add tenantId field to model schema
 */
function addTenantIdToSchema(model) {
  const schema = model.schema;

  // Check if tenantId already exists
  if (schema.path('tenantId')) {
    console.log(`[Migration] ${model.modelName} already has tenantId field`);
    return false;
  }

  // Add tenantId field
  schema.add({
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
      required: false // Set to false initially for migration
    }
  });

  // Create compound index with tenantId for common queries
  const existingIndexes = Object.keys(schema.indexes());

  // Add tenantId + status index if status exists
  if (schema.path('status')) {
    schema.index({ tenantId: 1, status: 1 });
  }

  // Add tenantId + createdAt index for sorting
  if (schema.path('createdAt')) {
    schema schema.index({ tenantId: 1, createdAt: -1 });
  }

  // Add tenantId + villageId index if villageId exists
  if (schema.path('villageId')) {
    schema.index({ tenantId: 1, villageId: 1 });
  }

  console.log(`[Migration] Added tenantId field to ${model.modelName}`);
  return true;
}

/**
 * Migrate existing documents to default tenant
 */
async function migrateDocumentsToDefaultTenant(model, defaultTenantId) {
  try {
    const result = await model.updateMany(
      { tenantId: { $exists: false } },
      { $set: { tenantId: defaultTenantId } }
    );

    if (result.modifiedCount > 0) {
      console.log(`[Migration] Migrated ${result.modifiedCount} documents in ${model.modelName} to default tenant`);
      migrationResults.summary.migratedDocuments += result.modifiedCount;
    }

    return result.modifiedCount;
  } catch (error) {
    console.error(`[Migration] Failed to migrate documents for ${model.modelName}:`, error);
    return 0;
  }
}

/**
 * Create indexes for model
 */
async function createIndexesForModel(model) {
  try {
    await model.createIndexes();
    migrationResults.summary.createdIndexes++;
    console.log(`[Migration] Created indexes for ${model.modelName}`);
    return true;
  } catch (error) {
    console.error(`[Migration] Failed to create indexes for ${model.modelName}:`, error);
    return false;
  }
}

/**
 * Process single model
 */
async function processModel(modelName, defaultTenantId, dryRun = false) {
  try {
    // Skip models that should not have tenant isolation
    if (MODELS_TO_SKIP.includes(modelName)) {
      migrationResults.skipped.push(modelName);
      console.log(`[Migration] Skipped ${modelName} (system model)`);
      return;
    }

    // Load model
    let model;
    try {
      model = mongoose.model(modelName);
    } catch (error) {
      // Model doesn't exist, try to require it
      try {
        const modelPath = `../models/${modelName}`;
        model = require(modelPath);
      } catch (requireError) {
        migrationResults.failed.push({
          model: modelName,
          error: 'Model not found'
        });
        console.error(`[Migration] Model ${modelName} not found`);
        return;
      }
    }

    if (dryRun) {
      console.log(`[Migration] [DRY RUN] Would process ${modelName}`);
      migrationResults.success.push(modelName);
      return;
    }

    // Add tenantId field to schema
    const fieldAdded = addTenantIdToSchema(model);
    if (fieldAdded) {
      migrationResults.summary.addedTenantId++;
    }

    // Migrate existing documents
    const migratedCount = await migrateDocumentsToDefaultTenant(model, defaultTenantId);

    // Create indexes
    await createIndexesForModel(model);

    migrationResults.success.push(modelName);
    migrationResults.summary.processedModels++;

  } catch (error) {
    migrationResults.failed.push({
      model: modelName,
      error: error.message
    });
    console.error(`[Migration] Failed to process ${modelName}:`, error);
  }
}

/**
 * Create default tenant
 */
async function createDefaultTenant() {
  const Tenant = mongoose.model('Tenant');

  // Check if default tenant exists
  let defaultTenant = await Tenant.findOne({ code: 'DEFAULT' });

  if (!defaultTenant) {
    defaultTenant = new Tenant({
      code: 'DEFAULT',
      name: '默认租户',
      type: 'village',
      status: 'active',
      quota: {
        maxUsers: -1,
        maxStorage: -1,
        maxVillages: -1,
        maxApiCallsPerDay: -1,
        maxConcurrentSessions: -1
      }
    });

    await defaultTenant.save();
    console.log('[Migration] Created default tenant:', defaultTenant._id);
  }

  return defaultTenant._id;
}

/**
 * Verify migration
 */
async function verifyMigration() {
  console.log('\n[Migration] Verifying migration...');

  const verificationResults = {};

  for (const [modelName, schemaName] of Object.entries(MODELS_TO_MIGRATE)) {
    if (MODELS_TO_SKIP.includes(modelName)) {
      continue;
    }

    try {
      const model = mongoose.model(modelName);

      // Check if tenantId field exists
      const hasTenantId = model.schema.path('tenantId') !== undefined;

      // Check if documents have tenantId
      const docsWithoutTenant = await model.countDocuments({ tenantId: { $exists: false } });

      // Check if indexes exist
      const indexes = Object.keys(model.schema.indexes());
      const hasTenantIndex = indexes.some(idx => idx.includes('tenantId'));

      verificationResults[modelName] = {
        hasTenantId,
        hasTenantIndex,
        docsWithoutTenant,
        status: (!hasTenantId || docsWithoutTenant > 0) ? 'FAILED' : 'PASSED'
      };

      if (verificationResults[modelName].status === 'FAILED') {
        console.error(`[Migration] Verification FAILED for ${modelName}:`, verificationResults[modelName]);
      }
    } catch (error) {
      verificationResults[modelName] = {
        status: 'ERROR',
        error: error.message
      };
    }
  }

  const allPassed = Object.values(verificationResults).every(r => r.status === 'PASSED');

  if (allPassed) {
    console.log('[Migration] ✓ All models verified successfully');
  } else {
    console.error('[Migration] ✗ Some models failed verification');
  }

  return verificationResults;
}

/**
 * Print migration summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Models:        ${migrationResults.summary.totalModels}`);
  console.log(`Processed Models:    ${migrationResults.summary.processedModels}`);
  console.log(`Added tenantId:      ${migrationResults.summary.addedTenantId}`);
  console.log(`Created Indexes:     ${migrationResults.summary.createdIndexes}`);
  console.log(`Migrated Documents:  ${migrationResults.summary.migratedDocuments}`);
  console.log('\nSuccessful:', migrationResults.success.length);
  console.log('Failed:', migrationResults.failed.length);
  console.log('Skipped:', migrationResults.skipped.length);

  if (migrationResults.failed.length > 0) {
    console.log('\nFailed Models:');
    migrationResults.failed.forEach(item => {
      console.log(`  - ${item.model}: ${item.error}`);
    });
  }

  console.log('='.repeat(60) + '\n');
}

/**
 * Main migration function
 */
async function runMigration(options = {}) {
  const {
    dryRun = false,
    verify = false,
    rollback = false
  } = options;

  console.log('[Migration] Starting multi-tenant migration...');
  console.log('[Migration] Options:', { dryRun, verify, rollback });

  try {
    // Connect to database
    await connectToDatabase();

    if (rollback) {
      console.log('[Migration] Rollback not implemented yet');
      console.log('[Migration] Please restore from backup if needed');
      return;
    }

    // Create default tenant
    const defaultTenantId = await createDefaultTenant();

    // Process each model
    migrationResults.summary.totalModels = Object.keys(MODELS_TO_MIGRATE).length;

    for (const modelName of Object.keys(MODELS_TO_MIGRATE)) {
      await processModel(modelName, defaultTenantId, dryRun);
    }

    // Print summary
    printSummary();

    // Verify if requested
    if (verify && !dryRun) {
      await verifyMigration();
    }

    console.log('[Migration] Migration completed');

  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  verify: args.includes('--verify'),
  rollback: args.includes('--rollback')
};

// Run migration
if (require.main === module) {
  runMigration(options)
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('[Migration] Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runMigration, verifyMigration, MODELS_TO_MIGRATE };
