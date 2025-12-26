/**
 * 家庭关系管理服务 - 优化版本
 * 使用聚合管道和批量查询避免N+1问题
 */

const Resident = require('../models/Resident');
const Household = require('../models/Household');
const { QueryOptimizer } = require('../utils/queryOptimizer');
const logger = require('../utils/logger');

class FamilyServiceOptimized {
  constructor() {
    // 家庭关系类型定义
    this.relationshipTypes = {
      'self': '本人',
      'spouse': '配偶',
      'father': '父亲',
      'mother': '母亲',
      'son': '儿子',
      'daughter': '女儿',
      'brother': '兄弟',
      'sister': '姐妹',
      'grandfather': '祖父',
      'grandmother': '祖母',
      'grandson': '孙子',
      'granddaughter': '孙女',
      'other': '其他'
    };

    this.bloodRelationshipWeights = {
      'self': 1,
      'father': 0.5,
      'mother': 0.5,
      'son': 0.5,
      'daughter': 0.5,
      'grandfather': 0.25,
      'grandmother': 0.25,
      'grandson': 0.25,
      'granddaughter': 0.25,
      'brother': 0.5,
      'sister': 0.5,
      'spouse': 0,
      'other': 0.1
    };
  }

  /**
   * 构建家庭关系网络 - 优化版本
   * 使用聚合管道一次性获取所有相关数据
   * @param {string} residentId 村民ID
   */
  async buildFamilyNetwork(residentId) {
    try {
      // 使用聚合管道一次性获取所有家庭成员和血缘关系
      const networkData = await this._buildNetworkAggregation(residentId);

      if (!networkData.resident) {
        throw new Error('村民不存在');
      }

      const network = {
        center: {
          id: networkData.resident._id,
          name: networkData.resident.name,
          gender: networkData.resident.gender,
          birthDate: networkData.resident.birthDate,
          photo: networkData.resident.photo
        },
        relations: networkData.relations || [],
        household: networkData.household || null,
        statistics: networkData.statistics || this._calculateStatistics(networkData.resident, networkData.relations || [])
      };

      return network;

    } catch (error) {
      logger.error('构建家庭关系网络失败:', error);
      throw error;
    }
  }

  /**
   * 使用聚合管道构建网络数据 - 避免N+1查询
   * @private
   */
  async _buildNetworkAggregation(residentId) {
    const pipeline = [
      // 第一阶段：获取目标村民
      {
        $match: { _id: mongoose.Types.ObjectId(residentId) }
      },
      // 第二阶段：关联家庭成员
      {
        $lookup: {
          from: 'residents',
          let: {
            villageId: '$villageId',
            householdNumber: '$household.householdNumber',
            currentId: '$_id'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$villageId', '$$villageId'] },
                    { $eq: ['$household.householdNumber', '$$householdNumber'] },
                    { $ne: ['$_id', '$$currentId'] },
                    { $eq: ['$status', 'active'] }
                  ]
                }
              }
            },
            {
              $project: {
                _id: 1,
                name: 1,
                gender: 1,
                birthDate: 1,
                age: 1,
                photo: 1,
                relationship: '$household.relationship',
                phone: 1
              }
            }
          ],
          as: 'householdMembers'
        }
      },
      // 第三阶段：查找血缘亲属
      {
        $lookup: {
          from: 'residents',
          let: {
            villageId: '$villageId',
            idCardPrefix: { $substr: ['$idCard', 0, 6] },
            currentId: '$_id',
            birthYear: { $toInt: { $substr: ['$idCard', 6, 4] } }
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$villageId', '$$villageId'] },
                    { $regexMatch: { input: '$idCard', regex: `^${$$idCardPrefix}` } },
                    { $ne: ['$_id', '$$currentId'] },
                    { $eq: ['$status', 'active'] }
                  ]
                }
              }
            },
            {
              $project: {
                _id: 1,
                name: 1,
                gender: 1,
                birthDate: 1,
                age: 1,
                photo: 1,
                idCard: 1
              }
            }
          ],
          as: 'bloodRelatives'
        }
      }
    ];

    const results = await Resident.aggregate(pipeline);

    if (results.length === 0) {
      return { resident: null };
    }

    const resident = results[0];

    // 处理家庭成员
    const householdMembers = (resident.householdMembers || []).map(member => ({
      id: member._id,
      name: member.name,
      gender: member.gender,
      birthDate: member.birthDate,
      age: member.age,
      photo: member.photo,
      relationship: member.relationship || 'other',
      relationshipType: this.getRelationshipType(member.relationship),
      phone: member.phone,
      type: 'household'
    }));

    // 处理血缘亲属（批量推断关系）
    const bloodRelatives = this._batchInferRelationships(
      resident,
      resident.bloodRelatives || []
    );

    // 合并并去重
    const allRelations = this._deduplicateRelations([
      ...householdMembers,
      ...bloodRelatives
    ]);

    // 查找配偶及其家庭
    const marriageRelatives = await this._findMarriageRelativesBatch([resident, ...allRelations]);

    return {
      resident,
      household: householdMembers.length > 0 ? {
        householdNumber: resident.household?.householdNumber,
        members: householdMembers
      } : null,
      relations: this._deduplicateRelations([...allRelations, ...marriageRelatives])
    };
  }

  /**
   * 批量推断血缘关系 - 避免循环中的单个查询
   * @private
   */
  _batchInferRelationships(centerResident, potentialRelatives) {
    const centerBirthYear = parseInt(centerResident.idCard.substring(6, 10));
    const centerGender = centerResident.gender;

    return potentialRelatives.map(relative => {
      const relativeBirthYear = parseInt(relative.idCard.substring(6, 10));
      const ageDiff = Math.abs(centerBirthYear - relativeBirthYear);

      const relationship = this.inferBloodRelationship(
        centerResident,
        relative,
        ageDiff
      );

      if (relationship) {
        return {
          id: relative._id,
          name: relative.name,
          gender: relative.gender,
          birthDate: relative.birthDate,
          age: relative.age,
          photo: relative.photo,
          relationship: relationship.type,
          relationshipType: relationship.label,
          bloodWeight: relationship.weight,
          type: 'blood'
        };
      }
      return null;
    }).filter(Boolean);
  }

  /**
   * 批量查找姻亲关系 - 优化版本
   * @private
   */
  async _findMarriageRelativesBatch(residents) {
    // 收集所有需要查找的配偶身份证号
    const spouseIdCards = residents
      .map(r => r.family?.spouse?.idCard)
      .filter(Boolean);

    if (spouseIdCards.length === 0) {
      return [];
    }

    // 批量查找所有配偶
    const spouses = await Resident.find({
      idCard: { $in: spouseIdCards },
      status: 'active'
    }).select('name gender birthDate photo villageId idCard household householdNumber');

    // 构建映射
    const spouseMap = new Map(
      spouses.map(s => [s.idCard, s])
    );

    // 批量获取配偶的家庭成员
    const spouseHouseholdNumbers = spouses
      .map(s => s.household?.householdNumber)
      .filter(Boolean);

    let householdMembers = [];
    if (spouseHouseholdNumbers.length > 0) {
      householdMembers = await Resident.find({
        'household.householdNumber': { $in: spouseHouseholdNumbers },
        status: 'active'
      }).select('name gender birthDate photo household relationship');
    }

    const relatives = [];

    for (const resident of residents) {
      if (resident.family?.spouse?.idCard) {
        const spouse = spouseMap.get(resident.family.spouse.idCard);
        if (spouse) {
          relatives.push({
            id: spouse._id,
            name: spouse.name,
            gender: spouse.gender,
            birthDate: spouse.birthDate,
            age: spouse.age,
            photo: spouse.photo,
            relationship: 'spouse',
            relationshipType: '配偶',
            type: 'marriage'
          });

          // 添加配偶的家庭成员
          const spouseFamilyMembers = householdMembers.filter(
            m => m.household?.householdNumber === spouse.household?.householdNumber &&
                 m._id.toString() !== spouse._id.toString()
          );

          for (const member of spouseFamilyMembers) {
            relatives.push({
              id: member._id,
              name: member.name,
              gender: member.gender,
              birthDate: member.birthDate,
              age: member.age,
              photo: member.photo,
              relationship: this.getSpouseFamilyRelationship(member.relationship),
              relationshipType: this.getRelationshipType(
                this.getSpouseFamilyRelationship(member.relationship)
              ),
              type: 'marriage'
            });
          }
        }
      }
    }

    return relatives;
  }

  /**
   * 推断血缘关系
   */
  inferBloodRelationship(resident1, resident2, ageDiff = null) {
    const birthYear1 = parseInt(resident1.idCard.substring(6, 10));
    const birthYear2 = parseInt(resident2.idCard.substring(6, 10));

    if (ageDiff === null) {
      ageDiff = Math.abs(birthYear1 - birthYear2);
    }

    const isMale1 = resident1.gender === 'male';
    const isMale2 = resident2.gender === 'male';

    if (ageDiff <= 2) {
      if (isMale1 && isMale2) {
        return { type: 'brother', label: '兄弟', weight: 0.5 };
      } else if (!isMale1 && !isMale2) {
        return { type: 'sister', label: '姐妹', weight: 0.5 };
      } else {
        return { type: 'sibling', label: '兄妹/姐弟', weight: 0.5 };
      }
    } else if (ageDiff >= 20 && ageDiff <= 50) {
      if (birthYear1 > birthYear2) {
        if (isMale2) {
          return { type: 'father', label: '父亲', weight: 0.5 };
        } else {
          return { type: 'mother', label: '母亲', weight: 0.5 };
        }
      } else {
        if (isMale2) {
          return { type: 'son', label: '儿子', weight: 0.5 };
        } else {
          return { type: 'daughter', label: '女儿', weight: 0.5 };
        }
      }
    } else if (ageDiff >= 40 && ageDiff <= 70) {
      if (birthYear1 > birthYear2) {
        if (isMale2) {
          return { type: 'grandfather', label: '祖父', weight: 0.25 };
        } else {
          return { type: 'grandmother', label: '祖母', weight: 0.25 };
        }
      } else {
        if (isMale2) {
          return { type: 'grandson', label: '孙子', weight: 0.25 };
        } else {
          return { type: 'granddaughter', label: '孙女', weight: 0.25 };
        }
      }
    }

    return null;
  }

  /**
   * 获取配偶家庭关系转换
   */
  getSpouseFamilyRelationship(relationship) {
    const spouseMap = {
      'father': 'father_in_law',
      'mother': 'mother_in_law',
      'son': 'stepson',
      'daughter': 'stepdaughter',
      'brother': 'brother_in_law',
      'sister': 'sister_in_law'
    };
    return spouseMap[relationship] || 'other';
  }

  /**
   * 获取关系类型标签
   */
  getRelationshipType(relationship) {
    return this.relationshipTypes[relationship] || '其他';
  }

  /**
   * 去重处理
   */
  _deduplicateRelations(relations) {
    const seen = new Set();
    return relations.filter(relation => {
      if (!relation || !relation.id) return false;
      const key = relation.id.toString();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 计算家庭统计数据
   */
  _calculateStatistics(centerResident, relations) {
    const allMembers = [centerResident, ...relations];

    return {
      totalMembers: allMembers.length,
      maleCount: allMembers.filter(m => m.gender === 'male').length,
      femaleCount: allMembers.filter(m => m.gender === 'female').length,
      elderlyCount: allMembers.filter(m => m.age >= 60).length,
      minorCount: allMembers.filter(m => m.age < 18).length,
      workingAgeCount: allMembers.filter(m => m.age >= 18 && m.age < 60).length
    };
  }

  /**
   * 生成家庭树 - 使用$graphLookup优化递归查询
   * @param {string} residentId 村民ID
   * @param {number} depth 深度
   */
  async generateFamilyTree(residentId, depth = 3) {
    try {
      const resident = await Resident.findById(residentId);
      if (!resident) {
        throw new Error('村民不存在');
      }

      // 使用$graphLookup一次性获取所有后代
      const treeData = await Resident.aggregate([
        {
          $match: { _id: resident._id }
        },
        {
          $graphLookup: {
            from: 'residents',
            startWith: '$_id',
            connectFromField: '_id',
            connectToField: 'family.parents',
            as: 'descendants',
            maxDepth: depth,
            restrictSearchWithMatch: {
              status: 'active',
              villageId: resident.villageId
            }
          }
        }
      ]);

      // 构建树形结构
      return this._buildTreeStructure(treeData[0], depth);

    } catch (error) {
      logger.error('生成家庭树失败:', error);
      throw error;
    }
  }

  /**
   * 构建树形结构
   * @private
   */
  _buildTreeStructure(data, maxDepth) {
    const buildNode = (resident, currentDepth) => {
      if (!resident || currentDepth > maxDepth) return null;

      return {
        id: resident._id,
        name: resident.name,
        gender: resident.gender,
        birthDate: resident.birthDate,
        age: resident.age,
        photo: resident.photo,
        children: (resident.children || []).map(child =>
          buildNode(child, currentDepth + 1)
        ).filter(Boolean)
      };
    };

    return buildNode(data, 0);
  }

  /**
   * 获取家庭统计数据 - 优化版本
   * 使用聚合管道直接计算统计数据
   * @param {string} villageId 村庄ID
   */
  async getFamilyStatistics(villageId) {
    try {
      // 使用聚合管道一次性获取所有统计数据
      const stats = await Household.aggregate([
        {
          $match: { villageId: mongoose.Types.ObjectId(villageId) }
        },
        {
          $lookup: {
            from: 'residents',
            localField: '_id',
            foreignField: 'householdId',
            as: 'members'
          }
        },
        {
          $project: {
            _id: 1,
            memberCount: { $size: '$members' },
            members: 1
          }
        },
        {
          $group: {
            _id: null,
            totalHouseholds: { $sum: 1 },
            totalMembers: { $sum: '$memberCount' },
            households: {
              $push: {
                memberCount: '$memberCount',
                members: '$members'
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalHouseholds: 1,
            totalMembers: 1,
            averageHouseholdSize: {
              $cond: [
                { $gt: ['$totalHouseholds', 0] },
                { $divide: ['$totalMembers', '$totalHouseholds'] },
                0
              ]
            },
            householdDistribution: {
              single: {
                $size: {
                  $filter: {
                    input: '$households',
                    cond: { $eq: ['$$this.memberCount', 1] }
                  }
                }
              },
              small: {
                $size: {
                  $filter: {
                    input: '$households',
                    cond: { $and: [{ $gte: ['$$this.memberCount', 2] }, { $lte: ['$$this.memberCount', 3] }] }
                  }
                }
              },
              medium: {
                $size: {
                  $filter: {
                    input: '$households',
                    cond: { $and: [{ $gte: ['$$this.memberCount', 4] }, { $lte: ['$$this.memberCount', 5] }] }
                  }
                }
              },
              large: {
                $size: {
                  $filter: {
                    input: '$households',
                    cond: { $gt: ['$$this.memberCount', 5] }
                  }
                }
              }
            }
          }
        }
      ]);

      return stats[0] || {
        totalHouseholds: 0,
        totalMembers: 0,
        averageHouseholdSize: 0,
        householdDistribution: {
          single: 0,
          small: 0,
          medium: 0,
          large: 0
        }
      };

    } catch (error) {
      logger.error('获取家庭统计数据失败:', error);
      throw error;
    }
  }

  /**
   * 检查血缘关系 - 优化版本
   * @param {string} idCard1 身份证号1
   * @param {string} idCard2 身份证号2
   */
  async checkBloodRelationship(idCard1, idCard2) {
    try {
      // 批量查找两个村民
      const residents = await Resident.find({
        idCard: { $in: [idCard1, idCard2] }
      }).select('idCard household villageId gender birthDate');

      if (residents.length !== 2) {
        return { hasRelationship: false };
      }

      const [resident1, resident2] = residents;

      // 检查是否在同一户籍
      if (resident1.household?.householdNumber &&
          resident1.household.householdNumber === resident2.household?.householdNumber &&
          resident1.villageId.toString() === resident2.villageId.toString()) {
        return { hasRelationship: true, type: 'household' };
      }

      // 检查血缘关系
      const relationship = this.inferBloodRelationship(resident1, resident2);
      if (relationship) {
        return {
          hasRelationship: true,
          type: 'blood',
          relationship: relationship.type,
          weight: relationship.weight
        };
      }

      return { hasRelationship: false };

    } catch (error) {
      logger.error('检查血缘关系失败:', error);
      return { hasRelationship: false };
    }
  }
}

module.exports = new FamilyServiceOptimized();
