/**
 * 村民变动服务层
 * 处理村民变动记录的业务逻辑
 */

const { ResidentChange, ChangeTypes, ChangeStatus, ApprovalLevel } = require('../models/ResidentChange');
const Resident = require('../models/Resident');
const { auditLog } = require('../utils/audit');

class ResidentChangeService {
  /**
   * 创建村民变动记录
   */
  async createChangeRecord(changeData, userId) {
    try {
      // 验证村民是否存在
      const resident = await Resident.findById(changeData.residentId);
      if (!resident) {
        throw new Error('村民不存在');
      }

      // 检测频繁变动
      const isFrequent = await ResidentChange.detectFrequentChanges(
        changeData.residentId,
        30, // 30天内
        3   // 3次以上
      );

      // 确定审批级别
      let approvalLevel = ApprovalLevel.VILLAGE;
      if ([ChangeTypes.MOVE_IN, ChangeTypes.MOVE_OUT].includes(changeData.changeType)) {
        approvalLevel = ApprovalLevel.TOWN;
      }

      // 创建变动记录
      const changeRecord = new ResidentChange({
        ...changeData,
        villageId: resident.villageId,
        approvalLevel,
        createdBy: userId,
        creatorName: changeData.creatorName || '系统管理员',
        alertFlags: {
          isFrequentChange: isFrequent,
          isMissingDocuments: !changeData.proofFiles || changeData.proofFiles.length === 0,
          requiresAttention: isFrequent
        }
      });

      await changeRecord.save();

      // 记录审计日志
      await auditLog(userId, 'CREATE', 'ResidentChange', changeRecord._id, {
        action: '创建村民变动记录',
        changeType: changeRecord.changeTypeName,
        residentId: changeRecord.residentId
      });

      return changeRecord;
    } catch (error) {
      throw new Error(`创建变动记录失败: ${error.message}`);
    }
  }

  /**
   * 获取村民变动历史
   */
  async getResidentHistory(residentId, options = {}) {
    try {
      const history = await ResidentChange.getResidentChangeHistory(residentId, options);

      // 按时间顺序构建变动时间线
      const timeline = history.map(record => ({
        id: record._id,
        date: record.changeDate,
        type: record.changeType,
        typeName: record.changeTypeName,
        status: record.status,
        reason: record.reason,
        remark: record.remark,
        operator: record.approverName || record.creatorName,
        attachments: record.proofFiles.length
      }));

      return {
        residentId,
        totalChanges: history.length,
        timeline
      };
    } catch (error) {
      throw new Error(`获取变动历史失败: ${error.message}`);
    }
  }

  /**
   * 获取待审核变动列表
   */
  async getPendingList(villageId, options = {}) {
    try {
      const pending = await ResidentChange.getPendingChanges(villageId, options);

      return pending.map(record => ({
        id: record._id,
        residentId: record.residentId._id,
        residentName: record.residentId.name,
        residentIdCard: record.residentId.idCard,
        residentPhone: record.residentId.phone,
        changeType: record.changeTypeName,
        changeDate: record.changeDate,
        registerDate: record.registerDate,
        reason: record.reason,
        proofFiles: record.proofFiles,
        creatorName: record.createdBy.name,
        approvalLevel: record.approvalLevel,
        alertFlags: record.alertFlags
      }));
    } catch (error) {
      throw new Error(`获取待审核列表失败: ${error.message}`);
    }
  }

  /**
   * 审批变动记录
   */
  async approveChange(changeId, approverId, approverName, remark = '') {
    try {
      const changeRecord = await ResidentChange.findById(changeId);
      if (!changeRecord) {
        throw new Error('变动记录不存在');
      }

      if (changeRecord.status !== ChangeStatus.PENDING) {
        throw new Error(`变动记录当前状态为${changeRecord.status}，无法审批`);
      }

      // 审批通过
      await changeRecord.approve(approverId, approverName, remark);

      // 更新村民状态（如果需要）
      await this._updateResidentStatus(changeRecord);

      // 记录审计日志
      await auditLog(approverId, 'APPROVE', 'ResidentChange', changeId, {
        action: '审批通过村民变动',
        changeType: changeRecord.changeTypeName,
        residentId: changeRecord.residentId
      });

      return changeRecord;
    } catch (error) {
      throw new Error(`审批失败: ${error.message}`);
    }
  }

  /**
   * 拒绝变动记录
   */
  async rejectChange(changeId, approverId, approverName, reason) {
    try {
      const changeRecord = await ResidentChange.findById(changeId);
      if (!changeRecord) {
        throw new Error('变动记录不存在');
      }

      if (changeRecord.status !== ChangeStatus.PENDING) {
        throw new Error(`变动记录当前状态为${changeRecord.status}，无法拒绝`);
      }

      await changeRecord.reject(approverId, approverName, reason);

      // 记录审计日志
      await auditLog(approverId, 'REJECT', 'ResidentChange', changeId, {
        action: '拒绝村民变动',
        changeType: changeRecord.changeTypeName,
        residentId: changeRecord.residentId,
        rejectReason: reason
      });

      return changeRecord;
    } catch (error) {
      throw new Error(`拒绝失败: ${error.message}`);
    }
  }

  /**
   * 取消变动记录
   */
  async cancelChange(changeId, userId, reason = '') {
    try {
      const changeRecord = await ResidentChange.findById(changeId);
      if (!changeRecord) {
        throw new Error('变动记录不存在');
      }

      if (changeRecord.status === ChangeStatus.APPROVED) {
        throw new Error('已审批通过的变动记录不能取消');
      }

      await changeRecord.cancel(reason);

      // 记录审计日志
      await auditLog(userId, 'CANCEL', 'ResidentChange', changeId, {
        action: '取消村民变动',
        changeType: changeRecord.changeTypeName,
        residentId: changeRecord.residentId,
        cancelReason: reason
      });

      return changeRecord;
    } catch (error) {
      throw new Error(`取消失败: ${error.message}`);
    }
  }

  /**
   * 获取变动统计
   */
  async getStatistics(villageId, startDate, endDate) {
    try {
      const stats = await ResidentChange.getVillageChangeStats(villageId, startDate, endDate);

      return stats.map(stat => ({
        changeType: stat._id,
        count: stat.count,
        pending: stat.pending,
        approved: stat.approved,
        rejected: stat.rejected,
        approvalRate: stat.count > 0 ? ((stat.approved / stat.count) * 100).toFixed(2) + '%' : '0%'
      }));
    } catch (error) {
      throw new Error(`获取统计数据失败: ${error.message}`);
    }
  }

  /**
   * 获取变动趋势
   */
  async getTrends(villageId, months = 12) {
    try {
      const trends = await ResidentChange.getChangeTrends(villageId, months);

      // 按月份组织数据
      const monthlyData = {};

      trends.forEach(trend => {
        const key = `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}`;
        if (!monthlyData[key]) {
          monthlyData[key] = { year: trend._id.year, month: trend._id.month, data: {} };
        }
        monthlyData[key].data[trend._id.changeType] = trend.count;
      });

      return Object.values(monthlyData).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
    } catch (error) {
      throw new Error(`获取趋势数据失败: ${error.message}`);
    }
  }

  /**
   * 获取人口流动分析
   */
  async getPopulationFlowAnalysis(villageId, startDate, endDate) {
    try {
      const matchStage = {
        villageId: new mongoose.Types.ObjectId(villageId)
      };

      if (startDate || endDate) {
        matchStage.changeDate = {};
        if (startDate) matchStage.changeDate.$gte = new Date(startDate);
        if (endDate) matchStage.changeDate.$lte = new Date(endDate);
      }

      const flowTypes = [
        { type: ChangeTypes.MOVE_IN, name: '迁入' },
        { type: ChangeTypes.MOVE_OUT, name: '迁出' },
        { type: ChangeTypes.MARRIAGE_IN, name: '婚入' },
        { type: ChangeTypes.MARRIAGE_OUT, name: '婚出' },
        { type: ChangeTypes.BIRTH, name: '新生' },
        { type: ChangeTypes.DEATH, name: '死亡' },
        { type: ChangeTypes.MIGRANT_WORK, name: '务工' },
        { type: ChangeTypes.RETURN, name: '返乡' }
      ];

      const promises = flowTypes.map(async ({ type, name }) => {
        const count = await ResidentChange.countDocuments({
          ...matchStage,
          changeType: type,
          status: ChangeStatus.APPROVED
        });
        return { type: name, count };
      });

      const results = await Promise.all(promises);

      // 计算净流入
      const inflow = results.filter(r => ['迁入', '婚入', '新生', '返乡'].includes(r.type))
        .reduce((sum, r) => sum + r.count, 0);
      const outflow = results.filter(r => ['迁出', '婚出', '死亡', '务工'].includes(r.type))
        .reduce((sum, r) => sum + r.count, 0);

      return {
        details: results,
        summary: {
          inflow,
          outflow,
          netFlow: inflow - outflow
        }
      };
    } catch (error) {
      throw new Error(`获取人口流动分析失败: ${error.message}`);
    }
  }

  /**
   * 获取劳动力分析
   */
  async getLaborAnalysis(villageId, startDate, endDate) {
    try {
      const matchStage = {
        villageId: new mongoose.Types.ObjectId(villageId),
        changeType: { $in: [ChangeTypes.MIGRANT_WORK, ChangeTypes.RETURN, ChangeTypes.FARMING] },
        status: ChangeStatus.APPROVED
      };

      if (startDate || endDate) {
        matchStage.changeDate = {};
        if (startDate) matchStage.changeDate.$gte = new Date(startDate);
        if (endDate) matchStage.changeDate.$lte = new Date(endDate);
      }

      // 获取务工人员详情
      const migrantWorkers = await ResidentChange.find({
        ...matchStage,
        changeType: ChangeTypes.MIGRANT_WORK
      }).populate('residentId', 'name age gender');

      // 获取返乡人员详情
      const returnWorkers = await ResidentChange.find({
        ...matchStage,
        changeType: ChangeTypes.RETURN
      }).populate('residentId', 'name age gender');

      // 转为务农人员
      const farmers = await ResidentChange.find({
        ...matchStage,
        changeType: ChangeTypes.FARMING
      }).populate('residentId', 'name age gender');

      return {
        migrant: {
          count: migrantWorkers.length,
          details: migrantWorkers.map(w => ({
            name: w.residentId.name,
            age: w.residentId.age,
            gender: w.residentId.gender,
            workLocation: w.migrantWorkInfo?.workCity,
            workCompany: w.migrantWorkInfo?.workCompany,
            monthlyIncome: w.migrantWorkInfo?.monthlyIncome
          }))
        },
        return: {
          count: returnWorkers.length,
          details: returnWorkers.map(w => ({
            name: w.residentId.name,
            age: w.residentId.age,
            gender: w.residentId.gender,
            previousLocation: w.returnInfo?.previousWorkLocation,
            plannedActivity: w.returnInfo?.plannedActivity
          }))
        },
        farming: {
          count: farmers.length,
          details: farmers.map(w => ({
            name: w.residentId.name,
            age: w.residentId.age,
            gender: w.residentId.gender,
            changeDate: w.changeDate
          }))
        }
      };
    } catch (error) {
      throw new Error(`获取劳动力分析失败: ${error.message}`);
    }
  }

  /**
   * 搜索变动记录
   */
  async searchChanges(villageId, searchCriteria = {}) {
    try {
      const {
        changeType,
        status,
        startDate,
        endDate,
        keyword,
        page = 1,
        limit = 20
      } = searchCriteria;

      const query = { villageId };

      if (changeType) query.changeType = changeType;
      if (status) query.status = status;
      if (startDate || endDate) {
        query.changeDate = {};
        if (startDate) query.changeDate.$gte = new Date(startDate);
        if (endDate) query.changeDate.$lte = new Date(endDate);
      }

      // 关键词搜索（搜索村民姓名、身份证号、变动原因）
      if (keyword) {
        const residents = await Resident.find({
          $or: [
            { name: { $regex: keyword, $options: 'i' } },
            { idCard: { $regex: keyword, $options: 'i' } }
          ]
        }).select('_id');

        query.residentId = { $in: residents.map(r => r._id) };
        if (!query.$or) query.$or = [];
        query.$or.push({ reason: { $regex: keyword, $options: 'i' } });
      }

      const total = await ResidentChange.countDocuments(query);
      const changes = await ResidentChange.find(query)
        .sort({ changeDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('residentId', 'name idCard phone')
        .populate('approverId', 'name')
        .populate('createdBy', 'name');

      return {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        data: changes
      };
    } catch (error) {
      throw new Error(`搜索变动记录失败: ${error.message}`);
    }
  }

  /**
   * 导出变动记录
   */
  async exportChanges(villageId, filters = {}) {
    try {
      const { data } = await this.searchChanges(villageId, {
        ...filters,
        limit: 10000 // 导出限制
      });

      // 转换为导出格式
      const exportData = data.map(record => ({
        '村民姓名': record.residentId?.name || '',
        '身份证号': record.residentId?.idCard || '',
        '联系电话': record.residentId?.phone || '',
        '变动类型': record.changeTypeName,
        '变动日期': record.changeDate ? record.changeDate.toLocaleDateString('zh-CN') : '',
        '登记日期': record.registerDate ? record.registerDate.toLocaleDateString('zh-CN') : '',
        '生效日期': record.effectiveDate ? record.effectiveDate.toLocaleDateString('zh-CN') : '',
        '变动原因': record.reason,
        '状态': this._getStatusName(record.status),
        '审批人': record.approverId?.name || '',
        '创建人': record.createdBy?.name || '',
        '备注': record.remark || ''
      }));

      return exportData;
    } catch (error) {
      throw new Error(`导出变动记录失败: ${error.message}`);
    }
  }

  /**
   * 获取变动类型配置
   */
  getChangeTypeConfig() {
    return {
      farming: {
        name: '务农',
        requiresProof: true,
        proofTypes: ['申请书', '土地承包合同'],
        approvalLevel: 'village',
        description: '村民从其他状态转为务农'
      },
      migrant_work: {
        name: '务工',
        requiresProof: true,
        proofTypes: ['劳动合同', '用人单位证明'],
        approvalLevel: 'village',
        description: '村民外出务工',
        fields: ['workProvince', 'workCity', 'workCompany', 'industry', 'monthlyIncome', 'workAddress', 'workPhone']
      },
      birth: {
        name: '新生',
        requiresProof: true,
        proofTypes: ['出生医学证明', '父母身份证', '户口本'],
        approvalLevel: 'village',
        description: '新生儿落户登记',
        fields: ['fatherName', 'fatherId', 'motherName', 'motherId', 'birthPlace', 'birthCertificateNumber']
      },
      death: {
        name: '死亡',
        requiresProof: true,
        proofTypes: ['死亡证明', '户口本', '身份证'],
        approvalLevel: 'village',
        description: '村民死亡注销',
        fields: ['deathCause', 'deathPlace', 'funeralDate', 'deathCertificateNumber']
      },
      marriage_in: {
        name: '婚入',
        requiresProof: true,
        proofTypes: ['结婚证', '配偶身份证', '户口迁移证明'],
        approvalLevel: 'village',
        description: '因结婚迁入本村',
        fields: ['spouseName', 'spouseIdCard', 'marriageCertificateNumber', 'marriageDate', 'originalLocation']
      },
      marriage_out: {
        name: '婚出',
        requiresProof: true,
        proofTypes: ['结婚证', '户口本', '迁入证明'],
        approvalLevel: 'village',
        description: '因结婚迁出本村',
        fields: ['spouseName', 'spouseIdCard', 'marriageCertificateNumber', 'marriageDate', 'newLocation']
      },
      move_in: {
        name: '迁入',
        requiresProof: true,
        proofTypes: ['户口迁移证', '身份证', '原户口本'],
        approvalLevel: 'town',
        description: '从外地迁入本村',
        fields: ['fromLocation', 'approvalNumber', 'approvalAuthority', 'migrationReason']
      },
      move_out: {
        name: '迁出',
        requiresProof: true,
        proofTypes: ['户口迁移证', '身份证', '迁入地证明'],
        approvalLevel: 'town',
        description: '从本村迁往外地',
        fields: ['toLocation', 'approvalNumber', 'approvalAuthority', 'migrationReason']
      },
      return: {
        name: '返乡',
        requiresProof: false,
        proofTypes: [],
        approvalLevel: 'village',
        description: '外出务工人员返乡',
        fields: ['previousWorkLocation', 'previousWorkCompany', 'returnReason', 'plannedActivity']
      },
      other: {
        name: '其他',
        requiresProof: true,
        proofTypes: ['相关证明材料'],
        approvalLevel: 'village',
        description: '其他类型变动'
      }
    };
  }

  /**
   * 私有方法 - 更新村民状态
   */
  async _updateResidentStatus(changeRecord) {
    try {
      const resident = await Resident.findById(changeRecord.residentId);
      if (!resident) return;

      switch (changeRecord.changeType) {
        case ChangeTypes.DEATH:
          resident.status = 'deceased';
          break;

        case ChangeTypes.MOVE_OUT:
          resident.status = 'moved_out';
          break;

        case ChangeTypes.MIGRANT_WORK:
          if (!resident.migrantWork) {
            resident.migrantWork = {};
          }
          resident.migrantWork.isMigrantWorker = true;
          resident.migrantWork.workCity = changeRecord.migrantWorkInfo?.workCity;
          resident.migrantWork.workProvince = changeRecord.migrantWorkInfo?.workProvince;
          resident.migrantWork.workCompany = changeRecord.migrantWorkInfo?.workCompany;
          resident.migrantWork.monthlyIncome = changeRecord.migrantWorkInfo?.monthlyIncome;
          resident.migrantWork.workStartDate = changeRecord.effectiveDate;
          break;

        case ChangeTypes.RETURN:
          if (resident.migrantWork) {
            resident.migrantWork.isMigrantWorker = false;
          }
          break;

        case ChangeTypes.FARMING:
          resident.occupation = 'farmer';
          break;
      }

      await resident.save();
    } catch (error) {
      console.error('更新村民状态失败:', error);
    }
  }

  /**
   * 私有方法 - 获取状态名称
   */
  _getStatusName(status) {
    const statusMap = {
      [ChangeStatus.PENDING]: '待审核',
      [ChangeStatus.APPROVED]: '已通过',
      [ChangeStatus.REJECTED]: '已拒绝',
      [ChangeStatus.CANCELLED]: '已取消'
    };
    return statusMap[status] || status;
  }
}

module.exports = new ResidentChangeService();
