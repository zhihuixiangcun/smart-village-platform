/**
 * 家庭关系管理服务
 * 处理村民家庭关系网络的构建、查询和血缘关系分析
 */

const Resident = require('../models/Resident');
const Household = require('../models/Household');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

class FamilyService {
  constructor() {
    // 家庭关系类型定义
    this.relationshipTypes = {
      // 直系亲属
      'self': '本人',
      'spouse': '配偶',
      'father': '父亲',
      'mother': '母亲',
      'son': '儿子',
      'daughter': '女儿',

      // 旁系亲属
      'brother': '兄弟',
      'sister': '姐妹',
      'grandfather': '祖父',
      'grandmother': '祖母',
      'grandson': '孙子',
      'granddaughter': '孙女',

      // 其他关系
      'other': '其他'
    };

    // 血缘关系权重（用于计算亲缘度）
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
      'spouse': 0, // 配偶无血缘关系
      'other': 0.1
    };
  }

  /**
   * 构建家庭关系网络
   * @param {string} residentId 村民ID
   */
  async buildFamilyNetwork(residentId) {
    try {
      const resident = await Resident.findById(residentId);
      if (!resident) {
        throw new Error('村民不存在');
      }

      const network = {
        center: {
          id: resident._id,
          name: resident.name,
          gender: resident.gender,
          birthDate: resident.birthDate,
          photo: resident.photo
        },
        relations: [],
        household: null,
        statistics: {
          totalMembers: 0,
          maleCount: 0,
          femaleCount: 0,
          elderlyCount: 0,
          minorCount: 0,
          workingAgeCount: 0
        }
      };

      // 1. 构建户籍家庭成员
      if (resident.household?.householdNumber) {
        const householdMembers = await this.getHouseholdMembers(
          resident.villageId,
          resident.household.householdNumber,
          resident._id
        );

        network.household = {
          householdNumber: resident.household.householdNumber,
          members: householdMembers
        };

        network.relations.push(...householdMembers);
      }

      // 2. 构建血缘关系（根据身份证号）
      const bloodRelatives = await this.findBloodRelatives(resident);
      network.relations.push(...bloodRelatives);

      // 3. 构建姻亲关系
      const marriageRelatives = await this.findMarriageRelatives(resident);
      network.relations.push(...marriageRelatives);

      // 4. 去重并计算统计数据
      const uniqueRelations = this.deduplicateRelations(network.relations);
      network.relations = uniqueRelations;
      network.statistics = this.calculateStatistics(resident, uniqueRelations);

      return network;

    } catch (error) {
      logger.error('构建家庭关系网络失败:', error);
      throw error;
    }
  }

  /**
   * 获取户籍家庭成员
   */
  async getHouseholdMembers(villageId, householdNumber, excludeId) {
    try {
      const members = await Resident.find({
        villageId,
        'household.householdNumber': householdNumber,
        _id: { $ne: excludeId },
        status: 'active'
      }).select('name gender birthDate photo household relationship phone');

      return members.map(member => ({
        id: member._id,
        name: member.name,
        gender: member.gender,
        birthDate: member.birthDate,
        age: member.age,
        photo: member.photo,
        relationship: member.household?.relationship || 'other',
        relationshipType: this.getRelationshipType(member.household?.relationship),
        phone: member.phone,
        type: 'household'
      }));

    } catch (error) {
      logger.error('获取户籍家庭成员失败:', error);
      return [];
    }
  }

  /**
   * 查找血缘亲属
   */
  async findBloodRelatives(resident) {
    try {
      const relatives = [];
      const currentIdCard = resident.idCard;

      if (!currentIdCard) return relatives;

      // 根据身份证号前6位（地区码）和出生日期推断可能的亲属
      const areaCode = currentIdCard.substring(0, 6);
      const birthYear = parseInt(currentIdCard.substring(6, 10));

      // 查找同村同地区的村民
      const potentialRelatives = await Resident.find({
        villageId: resident.villageId,
        idCard: { $regex: `^${areaCode}` },
        _id: { $ne: resident._id },
        status: 'active'
      }).select('name gender birthDate idCard photo');

      for (const relative of potentialRelatives) {
        const relationship = this.inferBloodRelationship(resident, relative);
        if (relationship) {
          relatives.push({
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
          });
        }
      }

      return relatives;

    } catch (error) {
      logger.error('查找血缘亲属失败:', error);
      return [];
    }
  }

  /**
   * 查找姻亲关系
   */
  async findMarriageRelatives(resident) {
    try {
      const relatives = [];

      // 查找配偶
      if (resident.family?.spouse?.idCard) {
        const spouse = await Resident.findOne({
          idCard: resident.family.spouse.idCard,
          status: 'active'
        }).select('name gender birthDate photo villageId');

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

          // 配偶的家庭成员
          const spouseFamily = await this.getHouseholdMembers(
            spouse.villageId,
            spouse.household?.householdNumber,
            spouse._id
          );

          spouseFamily.forEach(member => {
            relatives.push({
              ...member,
              relationship: this.getSpouseFamilyRelationship(member.relationship),
              relationshipType: this.getRelationshipType(this.getSpouseFamilyRelationship(member.relationship)),
              type: 'marriage'
            });
          });
        }
      }

      return relatives;

    } catch (error) {
      logger.error('查找姻亲关系失败:', error);
      return [];
    }
  }

  /**
   * 推断血缘关系
   */
  inferBloodRelationship(resident1, resident2) {
    const birthYear1 = parseInt(resident1.idCard.substring(6, 10));
    const birthYear2 = parseInt(resident2.idCard.substring(6, 10));
    const ageDiff = Math.abs(birthYear1 - birthYear2);

    // 性别信息
    const isMale1 = resident1.gender === 'male';
    const isMale2 = resident2.gender === 'male';

    // 根据年龄差和性别推断关系
    if (ageDiff <= 2) {
      // 年龄相近，可能是兄弟姐妹
      if (isMale1 && isMale2) {
        return { type: 'brother', label: '兄弟', weight: 0.5 };
      } else if (!isMale1 && !isMale2) {
        return { type: 'sister', label: '姐妹', weight: 0.5 };
      } else {
        return { type: 'sibling', label: '兄妹/姐弟', weight: 0.5 };
      }
    } else if (ageDiff >= 20 && ageDiff <= 50) {
      // 年龄差距大，可能是父母子女
      if (birthYear1 > birthYear2) {
        // resident1较年轻
        if (isMale2) {
          return { type: 'father', label: '父亲', weight: 0.5 };
        } else {
          return { type: 'mother', label: '母亲', weight: 0.5 };
        }
      } else {
        // resident1较年长
        if (isMale2) {
          return { type: 'son', label: '儿子', weight: 0.5 };
        } else {
          return { type: 'daughter', label: '女儿', weight: 0.5 };
        }
      }
    } else if (ageDiff >= 40 && ageDiff <= 70) {
      // 年龄差距很大，可能是祖孙
      if (birthYear1 > birthYear2) {
        // resident1较年轻
        if (isMale2) {
          return { type: 'grandfather', label: '祖父', weight: 0.25 };
        } else {
          return { type: 'grandmother', label: '祖母', weight: 0.25 };
        }
      } else {
        // resident1较年长
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
  deduplicateRelations(relations) {
    const seen = new Set();
    return relations.filter(relation => {
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
  calculateStatistics(centerResident, relations) {
    const allMembers = [centerResident, ...relations];

    const stats = {
      totalMembers: allMembers.length,
      maleCount: allMembers.filter(m => m.gender === 'male').length,
      femaleCount: allMembers.filter(m => m.gender === 'female').length,
      elderlyCount: allMembers.filter(m => m.age >= 60).length,
      minorCount: allMembers.filter(m => m.age < 18).length,
      workingAgeCount: allMembers.filter(m => m.age >= 18 && m.age < 60).length
    };

    return stats;
  }

  /**
   * 查询家庭关系
   * @param {string} residentId 村民ID
   * @param {string} targetId 目标村民ID
   */
  async findRelationship(residentId, targetId) {
    try {
      const network = await this.buildFamilyNetwork(residentId);
      const relation = network.relations.find(r => r.id.toString() === targetId);

      if (!relation) {
        return {
          found: false,
          message: '未找到家庭关系'
        };
      }

      return {
        found: true,
        relationship: relation.relationship,
        relationshipType: relation.relationshipType,
        bloodWeight: relation.bloodWeight || 0,
        type: relation.type
      };

    } catch (error) {
      logger.error('查询家庭关系失败:', error);
      throw error;
    }
  }

  /**
   * 检查血缘关系
   * @param {string} idCard1 身份证号1
   * @param {string} idCard2 身份证号2
   */
  async checkBloodRelationship(idCard1, idCard2) {
    try {
      const resident1 = await Resident.findOne({ idCard: idCard1 });
      const resident2 = await Resident.findOne({ idCard: idCard2 });

      if (!resident1 || !resident2) {
        return { hasRelationship: false };
      }

      // 检查是否在同一户籍
      if (resident1.household?.householdNumber === resident2.household?.householdNumber &&
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

  /**
   * 生成家庭树
   * @param {string} residentId 村民ID
   * @param {number} depth 深度
   */
  async generateFamilyTree(residentId, depth = 3) {
    try {
      const resident = await Resident.findById(residentId);
      if (!resident) {
        throw new Error('村民不存在');
      }

      const tree = {
        id: resident._id,
        name: resident.name,
        gender: resident.gender,
        birthDate: resident.birthDate,
        age: resident.age,
        photo: resident.photo,
        children: []
      };

      if (depth <= 0) return tree;

      // 查找子女
      const children = await this.findChildren(resident);
      for (const child of children) {
        const childTree = await this.generateFamilyTree(child._id, depth - 1);
        tree.children.push(childTree);
      }

      return tree;

    } catch (error) {
      logger.error('生成家庭树失败:', error);
      throw error;
    }
  }

  /**
   * 查找子女
   */
  async findChildren(parent) {
    try {
      const parentBirthYear = parseInt(parent.idCard.substring(6, 10));
      const minChildBirthYear = parentBirthYear + 15;

      return await Resident.find({
        villageId: parent.villageId,
        idCard: { $regex: `^${parent.idCard.substring(0, 6)}${minChildBirthYear}` },
        status: 'active'
      }).select('name gender birthDate photo idCard');

    } catch (error) {
      logger.error('查找子女失败:', error);
      return [];
    }
  }

  /**
   * 更新家庭关系
   * @param {string} residentId 村民ID
   * @param {Object} relation 关系数据
   */
  async updateRelationship(residentId, relation) {
    try {
      const resident = await Resident.findById(residentId);
      if (!resident) {
        throw new Error('村民不存在');
      }

      const targetResident = await Resident.findById(relation.targetId);
      if (!targetResident) {
        throw new Error('目标村民不存在');
      }

      // 更新关系信息
      if (relation.type === 'spouse') {
        // 更新配偶关系
        resident.family.spouse = {
          name: targetResident.name,
          idCard: targetResident.idCard,
          phone: targetResident.phone
        };

        targetResident.family.spouse = {
          name: resident.name,
          idCard: resident.idCard,
          phone: resident.phone
        };
      }

      // 保存更新
      await Promise.all([
        resident.save(),
        targetResident.save()
      ]);

      logger.info(`家庭关系更新成功: ${residentId} -> ${relation.targetId}`);

      return {
        success: true,
        message: '家庭关系更新成功'
      };

    } catch (error) {
      logger.error('更新家庭关系失败:', error);
      throw error;
    }
  }

  /**
   * 获取家庭统计数据
   * @param {string} villageId 村庄ID
   */
  async getFamilyStatistics(villageId) {
    try {
      const households = await Household.find({ villageId })
        .populate('members', 'name gender age')
        .lean();

      const statistics = {
        totalHouseholds: households.length,
        totalMembers: 0,
        averageHouseholdSize: 0,
        householdDistribution: {
          single: 0,
          small: 0,      // 2-3人
          medium: 0,     // 4-5人
          large: 0       // 6人以上
        },
        specialHouseholds: {
          elderlyOnly: 0,
          singleParent: 0,
          disabled: 0
        }
      };

      households.forEach(household => {
        const memberCount = household.members.length;
        statistics.totalMembers += memberCount;

        // 家庭规模分布
        if (memberCount === 1) {
          statistics.householdDistribution.single++;
        } else if (memberCount <= 3) {
          statistics.householdDistribution.small++;
        } else if (memberCount <= 5) {
          statistics.householdDistribution.medium++;
        } else {
          statistics.householdDistribution.large++;
        }

        // 特殊家庭统计
        const elderlyCount = household.members.filter(m => m.age >= 60).length;
        const minorCount = household.members.filter(m => m.age < 18).length;

        if (elderlyCount > 0 && minorCount === 0) {
          statistics.specialHouseholds.elderlyOnly++;
        }

        if (memberCount <= 2 && minorCount > 0) {
          statistics.specialHouseholds.singleParent++;
        }
      });

      statistics.averageHouseholdSize = households.length > 0
        ? Math.round(statistics.totalMembers / households.length * 100) / 100
        : 0;

      return statistics;

    } catch (error) {
      logger.error('获取家庭统计数据失败:', error);
      throw error;
    }
  }
}

module.exports = new FamilyService();