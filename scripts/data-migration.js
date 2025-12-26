/**
 * 智慧乡村单体应用到微服务数据迁移脚本
 * 将原有单体应用的数据库数据迁移到微服务架构
 */

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

class DataMigration {
  constructor(options = {}) {
    this.config = {
      // 源数据库（单体应用）
      sourceMongoURI: options.sourceMongoURI || 'mongodb://localhost:27017/smart_village',

      // 目标数据库（微服务）
      targetMongoURI: options.targetMongoURI || 'mongodb://localhost:27017',

      // 目标数据库名称
      targetDatabases: {
        users: 'smart_village_users',
        residents: 'smart_village_residents',
        affairs: 'smart_village_affairs',
        finance: 'smart_village_finance',
        notifications: 'smart_village_notifications',
        files: 'smart_village_files'
      },

      // 迁移配置
      batchSize: options.batchSize || 1000,
      dryRun: options.dryRun || false, // 仅模拟迁移，不实际执行
      skipExisting: options.skipExisting || true, // 跳过已存在的数据
      backupBeforeMigration: options.backupBeforeMigration || true,

      ...options
    };

    this.sourceClient = null;
    this.targetClient = null;
    this.migrationStats = {
      totalMigrated: 0,
      totalSkipped: 0,
      totalErrors: 0,
      startTime: null,
      endTime: null,
      collections: {}
    };
  }

  // 连接数据库
  async connect() {
    console.log('🔗 连接数据库...');

    // 连接源数据库
    this.sourceClient = await MongoClient.connect(this.config.sourceMongoURI);
    console.log('✅ 源数据库连接成功');

    // 连接目标数据库
    this.targetClient = await MongoClient.connect(this.config.targetMongoURI);
    console.log('✅ 目标数据库连接成功');
  }

  // 断开数据库连接
  async disconnect() {
    if (this.sourceClient) {
      await this.sourceClient.close();
    }
    if (this.targetClient) {
      await this.targetClient.close();
    }
    console.log('🔌 数据库连接已断开');
  }

  // 备份数据
  async backupData() {
    if (!this.config.backupBeforeMigration) {
      return;
    }

    console.log('💾 创建数据备份...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDBName = `smart_village_backup_${timestamp}`;

    try {
      const sourceDB = this.sourceClient.db();
      const backupDB = this.targetClient.db(backupDBName);

      const collections = await sourceDB.collections();

      for (const collection of collections) {
        const collectionName = collection.collectionName;
        console.log(`  备份集合: ${collectionName}`);

        const documents = await collection.find({}).toArray();
        if (documents.length > 0) {
          await backupDB.collection(collectionName).insertMany(documents);
        }
      }

      console.log(`✅ 备份完成: ${backupDBName}`);
      return backupDBName;

    } catch (error) {
      console.error('❌ 备份失败:', error);
      throw error;
    }
  }

  // 迁移用户数据
  async migrateUsers() {
    console.log('👥 迁移用户数据...');
    const collectionStats = { migrated: 0, skipped: 0, errors: 0 };

    try {
      const sourceDB = this.sourceClient.db();
      const targetDB = this.targetClient.db(this.config.targetDatabases.users);

      // 源集合
      const sourceUsers = sourceDB.collection('users');
      const sourceRoles = sourceDB.collection('roles');

      // 目标集合
      const targetUsers = targetDB.collection('users');
      const targetRoles = targetDB.collection('roles');

      // 迁移角色数据
      console.log('  迁移角色数据...');
      const roles = await sourceRoles.find({}).toArray();

      for (const role of roles) {
        try {
          const existingRole = await targetRoles.findOne({ name: role.name });

          if (existingRole && this.config.skipExisting) {
            collectionStats.skipped++;
            continue;
          }

          if (!this.config.dryRun) {
            await targetRoles.replaceOne(
              { name: role.name },
              {
                ...role,
                _id: role._id,
                createdAt: role.createdAt || new Date(),
                updatedAt: new Date()
              },
              { upsert: true }
            );
          }

          collectionStats.migrated++;

        } catch (error) {
          console.error(`    迁移角色失败 ${role.name}:`, error.message);
          collectionStats.errors++;
        }
      }

      // 迁移用户数据
      console.log('  迁移用户数据...');
      const totalUsers = await sourceUsers.countDocuments();
      console.log(`    总用户数: ${totalUsers}`);

      let processed = 0;
      const cursor = sourceUsers.find({}).batchSize(this.config.batchSize);

      for await (const user of cursor) {
        try {
          const existingUser = await targetUsers.findOne({
            $or: [
              { _id: user._id },
              { email: user.email },
              { username: user.username }
            ]
          });

          if (existingUser && this.config.skipExisting) {
            collectionStats.skipped++;
            continue;
          }

          // 数据转换
          const migratedUser = {
            _id: user._id,
            username: user.username,
            email: user.email,
            password: user.password,
            phone: user.phone || null,
            avatar: user.avatar || null,
            status: user.status || 'active',
            roles: user.roles || ['user'],
            profile: {
              firstName: user.profile?.firstName || user.firstName || '',
              lastName: user.profile?.lastName || user.lastName || '',
              gender: user.profile?.gender || user.gender || '',
              birthDate: user.profile?.birthDate || user.birthDate || null,
              address: user.profile?.address || user.address || null
            },
            preferences: user.preferences || {},
            security: {
              lastLogin: user.lastLogin || null,
              loginAttempts: user.loginAttempts || 0,
              lockedUntil: user.lockedUntil || null
            },
            createdAt: user.createdAt || new Date(),
            updatedAt: new Date()
          };

          if (!this.config.dryRun) {
            await targetUsers.replaceOne(
              { _id: user._id },
              migratedUser,
              { upsert: true }
            );
          }

          collectionStats.migrated++;
          processed++;

          if (processed % 100 === 0) {
            console.log(`    已处理: ${processed}/${totalUsers}`);
          }

        } catch (error) {
          console.error(`    迁移用户失败 ${user.username || user.email}:`, error.message);
          collectionStats.errors++;
        }
      }

      console.log(`✅ 用户数据迁移完成: 迁移${collectionStats.migrated}条, 跳过${collectionStats.skipped}条, 错误${collectionStats.errors}条`);

    } catch (error) {
      console.error('❌ 用户数据迁移失败:', error);
      throw error;
    }

    this.migrationStats.collections.users = collectionStats;
  }

  // 迁移村民数据
  async migrateResidents() {
    console.log('🏠 迁移村民数据...');
    const collectionStats = { migrated: 0, skipped: 0, errors: 0 };

    try {
      const sourceDB = this.sourceClient.db();
      const targetDB = this.targetClient.db(this.config.targetDatabases.residents);

      // 源集合
      const sourceResidents = sourceDB.collection('residents');
      const sourceFamilies = sourceDB.collection('families');

      // 目标集合
      const targetResidents = targetDB.collection('residents');
      const targetFamilies = targetDB.collection('families');

      // 迁移家庭数据
      console.log('  迁移家庭数据...');
      const families = await sourceFamilies.find({}).toArray();

      for (const family of families) {
        try {
          const existingFamily = await targetFamilies.findOne({ familyId: family.familyId });

          if (existingFamily && this.config.skipExisting) {
            collectionStats.skipped++;
            continue;
          }

          const migratedFamily = {
            _id: family._id,
            familyId: family.familyId,
            headOfFamilyId: family.headOfFamilyId || null,
            familyName: family.familyName || '',
            address: family.address || {},
            contactPhone: family.contactPhone || '',
            economicStatus: family.economicStatus || '',
            specialCircumstances: family.specialCircumstances || [],
            members: family.members || [],
            createdAt: family.createdAt || new Date(),
            updatedAt: new Date()
          };

          if (!this.config.dryRun) {
            await targetFamilies.replaceOne(
              { familyId: family.familyId },
              migratedFamily,
              { upsert: true }
            );
          }

          collectionStats.migrated++;

        } catch (error) {
          console.error(`    迁移家庭失败 ${family.familyId}:`, error.message);
          collectionStats.errors++;
        }
      }

      // 迁移村民数据
      console.log('  迁移村民数据...');
      const totalResidents = await sourceResidents.countDocuments();
      console.log(`    总村民数: ${totalResidents}`);

      let processed = 0;
      const cursor = sourceResidents.find({}).batchSize(this.config.batchSize);

      for await (const resident of cursor) {
        try {
          const existingResident = await targetResidents.findOne({
            $or: [
              { _id: resident._id },
              { idCard: resident.idCard }
            ]
          });

          if (existingResident && this.config.skipExisting) {
            collectionStats.skipped++;
            continue;
          }

          const migratedResident = {
            _id: resident._id,
            residentId: resident.residentId || resident._id.toString(),
            name: resident.name || '',
            idCard: resident.idCard || '',
            gender: resident.gender || '',
            birthDate: resident.birthDate || null,
            phone: resident.phone || '',
            address: resident.address || {},
            familyId: resident.familyId || null,
            relationship: resident.relationship || '',
            education: resident.education || '',
            occupation: resident.occupation || '',
            politicalStatus: resident.politicalStatus || '',
            maritalStatus: resident.maritalStatus || '',
            health: {
              conditions: resident.health?.conditions || [],
              disabilities: resident.health?.disabilities || [],
              insurance: resident.health?.insurance || false
            },
            skills: resident.skills || [],
            interests: resident.interests || [],
            status: resident.status || 'active',
            avatar: resident.avatar || null,
            notes: resident.notes || '',
            createdAt: resident.createdAt || new Date(),
            updatedAt: new Date()
          };

          if (!this.config.dryRun) {
            await targetResidents.replaceOne(
              { _id: resident._id },
              migratedResident,
              { upsert: true }
            );
          }

          collectionStats.migrated++;
          processed++;

          if (processed % 100 === 0) {
            console.log(`    已处理: ${processed}/${totalResidents}`);
          }

        } catch (error) {
          console.error(`    迁移村民失败 ${resident.name}:`, error.message);
          collectionStats.errors++;
        }
      }

      console.log(`✅ 村民数据迁移完成: 迁移${collectionStats.migrated}条, 跳过${collectionStats.skipped}条, 错误${collectionStats.errors}条`);

    } catch (error) {
      console.error('❌ 村民数据迁移失败:', error);
      throw error;
    }

    this.migrationStats.collections.residents = collectionStats;
  }

  // 迁移村务数据
  async migrateAffairs() {
    console.log('📋 迁移村务数据...');
    const collectionStats = { migrated: 0, skipped: 0, errors: 0 };

    try {
      const sourceDB = this.sourceClient.db();
      const targetDB = this.targetClient.db(this.config.targetDatabases.affairs);

      // 源集合
      const sourceAnnouncements = sourceDB.collection('announcements');
      const sourceMeetings = sourceDB.collection('meetings');
      const sourceTasks = sourceDB.collection('tasks');

      // 迁移公告数据
      console.log('  迁移公告数据...');
      const announcements = await sourceAnnouncements.find({}).toArray();

      for (const announcement of announcements) {
        try {
          const existing = await targetDB.collection('announcements').findOne({ _id: announcement._id });

          if (existing && this.config.skipExisting) {
            collectionStats.skipped++;
            continue;
          }

          const migratedAnnouncement = {
            _id: announcement._id,
            title: announcement.title || '',
            content: announcement.content || '',
            category: announcement.category || 'general',
            priority: announcement.priority || 'normal',
            attachments: announcement.attachments || [],
            status: announcement.status || 'published',
            authorId: announcement.authorId || null,
            authorName: announcement.authorName || '',
            views: announcement.views || 0,
            tags: announcement.tags || [],
            publishedAt: announcement.publishedAt || announcement.createdAt || new Date(),
            createdAt: announcement.createdAt || new Date(),
            updatedAt: new Date()
          };

          if (!this.config.dryRun) {
            await targetDB.collection('announcements').replaceOne(
              { _id: announcement._id },
              migratedAnnouncement,
              { upsert: true }
            );
          }

          collectionStats.migrated++;

        } catch (error) {
          console.error(`    迁移公告失败 ${announcement.title}:`, error.message);
          collectionStats.errors++;
        }
      }

      // 迁移会议数据
      console.log('  迁移会议数据...');
      const meetings = await sourceMeetings.find({}).toArray();

      for (const meeting of meetings) {
        try {
          const existing = await targetDB.collection('meetings').findOne({ _id: meeting._id });

          if (existing && this.config.skipExisting) {
            collectionStats.skipped++;
            continue;
          }

          const migratedMeeting = {
            _id: meeting._id,
            title: meeting.title || '',
            description: meeting.description || '',
            type: meeting.type || 'regular',
            location: meeting.location || '',
            scheduledAt: meeting.scheduledAt || null,
            duration: meeting.duration || 60,
            organizerId: meeting.organizerId || null,
            organizerName: meeting.organizerName || '',
            participants: meeting.participants || [],
            agenda: meeting.agenda || [],
            minutes: meeting.minutes || '',
            attachments: meeting.attachments || [],
            status: meeting.status || 'scheduled',
            recurring: meeting.recurring || false,
            recurringPattern: meeting.recurringPattern || null,
            createdAt: meeting.createdAt || new Date(),
            updatedAt: new Date()
          };

          if (!this.config.dryRun) {
            await targetDB.collection('meetings').replaceOne(
              { _id: meeting._id },
              migratedMeeting,
              { upsert: true }
            );
          }

          collectionStats.migrated++;

        } catch (error) {
          console.error(`    迁移会议失败 ${meeting.title}:`, error.message);
          collectionStats.errors++;
        }
      }

      // 迁移任务数据
      console.log('  迁移任务数据...');
      const tasks = await sourceTasks.find({}).toArray();

      for (const task of tasks) {
        try {
          const existing = await targetDB.collection('tasks').findOne({ _id: task._id });

          if (existing && this.config.skipExisting) {
            collectionStats.skipped++;
            continue;
          }

          const migratedTask = {
            _id: task._id,
            title: task.title || '',
            description: task.description || '',
            category: task.category || 'general',
            priority: task.priority || 'normal',
            status: task.status || 'pending',
            assigneeId: task.assigneeId || null,
            assigneeName: task.assigneeName || '',
            creatorId: task.creatorId || null,
            creatorName: task.creatorName || '',
            dueDate: task.dueDate || null,
            completedAt: task.completedAt || null,
            attachments: task.attachments || [],
            comments: task.comments || [],
            tags: task.tags || [],
            estimatedHours: task.estimatedHours || null,
            actualHours: task.actualHours || null,
            createdAt: task.createdAt || new Date(),
            updatedAt: new Date()
          };

          if (!this.config.dryRun) {
            await targetDB.collection('tasks').replaceOne(
              { _id: task._id },
              migratedTask,
              { upsert: true }
            );
          }

          collectionStats.migrated++;

        } catch (error) {
          console.error(`    迁移任务失败 ${task.title}:`, error.message);
          collectionStats.errors++;
        }
      }

      console.log(`✅ 村务数据迁移完成: 迁移${collectionStats.migrated}条, 跳过${collectionStats.skipped}条, 错误${collectionStats.errors}条`);

    } catch (error) {
      console.error('❌ 村务数据迁移失败:', error);
      throw error;
    }

    this.migrationStats.collections.affairs = collectionStats;
  }

  // 迁移财务数据
  async migrateFinance() {
    console.log('💰 迁移财务数据...');
    const collectionStats = { migrated: 0, skipped: 0, errors: 0 };

    try {
      const sourceDB = this.sourceClient.db();
      const targetDB = this.targetClient.db(this.config.targetDatabases.finance);

      // 源集合
      const sourceTransactions = sourceDB.collection('transactions');
      const sourceCategories = sourceDB.collection('categories');

      // 迁移分类数据
      console.log('  迁移财务分类数据...');
      const categories = await sourceCategories.find({}).toArray();

      for (const category of categories) {
        try {
          const existing = await targetDB.collection('categories').findOne({ name: category.name });

          if (existing && this.config.skipExisting) {
            collectionStats.skipped++;
            continue;
          }

          const migratedCategory = {
            _id: category._id,
            name: category.name || '',
            type: category.type || 'expense', // income or expense
            description: category.description || '',
            parentId: category.parentId || null,
            budget: category.budget || 0,
            color: category.color || '',
            icon: category.icon || '',
            isActive: category.isActive !== false,
            createdAt: category.createdAt || new Date(),
            updatedAt: new Date()
          };

          if (!this.config.dryRun) {
            await targetDB.collection('categories').replaceOne(
              { name: category.name },
              migratedCategory,
              { upsert: true }
            );
          }

          collectionStats.migrated++;

        } catch (error) {
          console.error(`    迁移财务分类失败 ${category.name}:`, error.message);
          collectionStats.errors++;
        }
      }

      // 迁移交易数据
      console.log('  迁移交易数据...');
      const totalTransactions = await sourceTransactions.countDocuments();
      console.log(`    总交易数: ${totalTransactions}`);

      let processed = 0;
      const cursor = sourceTransactions.find({}).batchSize(this.config.batchSize);

      for await (const transaction of cursor) {
        try {
          const existing = await targetDB.collection('transactions').findOne({
            transactionId: transaction.transactionId || transaction._id.toString()
          });

          if (existing && this.config.skipExisting) {
            collectionStats.skipped++;
            continue;
          }

          const migratedTransaction = {
            _id: transaction._id,
            transactionId: transaction.transactionId || transaction._id.toString(),
            type: transaction.type || 'expense', // income or expense
            amount: transaction.amount || 0,
            currency: transaction.currency || 'CNY',
            categoryId: transaction.categoryId || null,
            categoryName: transaction.categoryName || '',
            description: transaction.description || '',
            date: transaction.date || new Date(),
            tags: transaction.tags || [],
            attachments: transaction.attachments || [],
            relatedProjectId: transaction.relatedProjectId || null,
            relatedProjectName: transaction.relatedProjectName || '',
            approvedBy: transaction.approvedBy || null,
            approvedAt: transaction.approvedAt || null,
            status: transaction.status || 'completed', // pending, approved, rejected
            createdBy: transaction.createdBy || null,
            createdAt: transaction.createdAt || new Date(),
            updatedAt: new Date()
          };

          if (!this.config.dryRun) {
            await targetDB.collection('transactions').replaceOne(
              { transactionId: migratedTransaction.transactionId },
              migratedTransaction,
              { upsert: true }
            );
          }

          collectionStats.migrated++;
          processed++;

          if (processed % 100 === 0) {
            console.log(`    已处理: ${processed}/${totalTransactions}`);
          }

        } catch (error) {
          console.error(`    迁移交易失败 ${transaction.description}:`, error.message);
          collectionStats.errors++;
        }
      }

      console.log(`✅ 财务数据迁移完成: 迁移${collectionStats.migrated}条, 跳过${collectionStats.skipped}条, 错误${collectionStats.errors}条`);

    } catch (error) {
      console.error('❌ 财务数据迁移失败:', error);
      throw error;
    }

    this.migrationStats.collections.finance = collectionStats;
  }

  // 创建索引
  async createIndexes() {
    console.log('🔍 创建数据库索引...');

    try {
      // 用户数据库索引
      const usersDB = this.targetClient.db(this.config.targetDatabases.users);
      await usersDB.collection('users').createIndex({ username: 1 }, { unique: true });
      await usersDB.collection('users').createIndex({ email: 1 }, { unique: true });
      await usersDB.collection('users').createIndex({ phone: 1 });
      await usersDB.collection('roles').createIndex({ name: 1 }, { unique: true });

      // 村民数据库索引
      const residentsDB = this.targetClient.db(this.config.targetDatabases.residents);
      await residentsDB.collection('residents').createIndex({ idCard: 1 }, { unique: true });
      await residentsDB.collection('residents').createIndex({ phone: 1 });
      await residentsDB.collection('families').createIndex({ familyId: 1 }, { unique: true });

      // 村务数据库索引
      const affairsDB = this.targetClient.db(this.config.targetDatabases.affairs);
      await affairsDB.collection('announcements').createIndex({ createdAt: -1 });
      await affairsDB.collection('meetings').createIndex({ scheduledAt: -1 });
      await affairsDB.collection('tasks').createIndex({ status: 1, createdAt: -1 });

      // 财务数据库索引
      const financeDB = this.targetClient.db(this.config.targetDatabases.finance);
      await financeDB.collection('transactions').createIndex({ transactionId: 1 }, { unique: true });
      await financeDB.collection('transactions').createIndex({ createdAt: -1 });
      await financeDB.collection('transactions').createIndex({ category: 1, date: -1 });

      console.log('✅ 索引创建完成');

    } catch (error) {
      console.error('❌ 索引创建失败:', error);
      throw error;
    }
  }

  // 验证迁移数据
  async validateMigration() {
    console.log('🔍 验证迁移数据...');

    try {
      const validationResults = {};

      // 验证用户数据
      const usersDB = this.targetClient.db(this.config.targetDatabases.users);
      const userCount = await usersDB.collection('users').countDocuments();
      const roleCount = await usersDB.collection('roles').countDocuments();
      validationResults.users = { users: userCount, roles: roleCount };

      // 验证村民数据
      const residentsDB = this.targetClient.db(this.config.targetDatabases.residents);
      const residentCount = await residentsDB.collection('residents').countDocuments();
      const familyCount = await residentsDB.collection('families').countDocuments();
      validationResults.residents = { residents: residentCount, families: familyCount };

      // 验证村务数据
      const affairsDB = this.targetClient.db(this.config.targetDatabases.affairs);
      const announcementCount = await affairsDB.collection('announcements').countDocuments();
      const meetingCount = await affairsDB.collection('meetings').countDocuments();
      const taskCount = await affairsDB.collection('tasks').countDocuments();
      validationResults.affairs = {
        announcements: announcementCount,
        meetings: meetingCount,
        tasks: taskCount
      };

      // 验证财务数据
      const financeDB = this.targetClient.db(this.config.targetDatabases.finance);
      const transactionCount = await financeDB.collection('transactions').countDocuments();
      const categoryCount = await financeDB.collection('categories').countDocuments();
      validationResults.finance = {
        transactions: transactionCount,
        categories: categoryCount
      };

      console.log('✅ 数据验证完成:');
      console.log(`  用户: ${validationResults.users.users}用户, ${validationResults.users.roles}角色`);
      console.log(`  村民: ${validationResults.residents.residents}村民, ${validationResults.residents.families}家庭`);
      console.log(`  村务: ${validationResults.affairs.announcements}公告, ${validationResults.affairs.meetings}会议, ${validationResults.affairs.tasks}任务`);
      console.log(`  财务: ${validationResults.finance.transactions}交易, ${validationResults.finance.categories}分类`);

      return validationResults;

    } catch (error) {
      console.error('❌ 数据验证失败:', error);
      throw error;
    }
  }

  // 生成迁移报告
  generateMigrationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      config: {
        dryRun: this.config.dryRun,
        skipExisting: this.config.skipExisting,
        batchSize: this.config.batchSize
      },
      stats: {
        ...this.migrationStats,
        duration: this.migrationStats.endTime - this.migrationStats.startTime,
        totalProcessed: this.migrationStats.totalMigrated + this.migrationStats.totalSkipped + this.migrationStats.totalErrors
      },
      collections: this.migrationStats.collections
    };

    return report;
  }

  // 执行完整迁移
  async runMigration() {
    console.log('🚀 开始智慧乡村数据迁移');
    console.log('==========================================');

    if (this.config.dryRun) {
      console.log('⚠️ 模拟运行模式 - 不会实际修改数据');
    }

    this.migrationStats.startTime = Date.now();

    try {
      // 连接数据库
      await this.connect();

      // 备份数据
      const backupName = await this.backupData();

      // 执行迁移
      await this.migrateUsers();
      await this.migrateResidents();
      await this.migrateAffairs();
      await this.migrateFinance();

      // 创建索引
      if (!this.config.dryRun) {
        await this.createIndexes();
      }

      // 验证迁移结果
      const validationResults = await this.validateMigration();

      this.migrationStats.endTime = Date.now();

      // 生成报告
      const report = this.generateMigrationReport();

      // 保存报告
      const fs = require('fs');
      const reportPath = `./migration-report-${new Date().toISOString().slice(0, 10)}.json`;
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      console.log('==========================================');
      console.log('✅ 数据迁移完成！');
      console.log(`📊 迁移统计:`);
      console.log(`   总迁移: ${this.migrationStats.totalMigrated}`);
      console.log(`   跳过: ${this.migrationStats.totalSkipped}`);
      console.log(`   错误: ${this.migrationStats.totalErrors}`);
      console.log(`   耗时: ${Math.round(report.stats.duration / 1000)}秒`);

      if (backupName) {
        console.log(`   备份数据库: ${backupName}`);
      }

      console.log(`📄 迁移报告: ${reportPath}`);

      return report;

    } catch (error) {
      console.error('❌ 数据迁移失败:', error);
      this.migrationStats.endTime = Date.now();
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// 主函数
async function main() {
  const options = {
    sourceMongoURI: process.env.SOURCE_MONGO_URI || 'mongodb://localhost:27017/smart_village',
    targetMongoURI: process.env.TARGET_MONGO_URI || 'mongodb://localhost:27017',
    dryRun: process.env.DRY_RUN === 'true',
    skipExisting: process.env.SKIP_EXISTING !== 'false'
  };

  const migrator = new DataMigration(options);

  try {
    const report = await migrator.runMigration();
    process.exit(report.stats.totalErrors > 0 ? 1 : 0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  main().catch(console.error);
}

module.exports = DataMigration;