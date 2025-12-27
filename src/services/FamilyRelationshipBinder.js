/**
 * FamilyRelationshipBinder Service
 * 家庭关系绑定服务
 * 实现血缘关系自动绑定、分析和家族树生成
 */

const logger = require('../utils/logger');

class FamilyRelationshipBinder {
  constructor(dbService) {
    this.dbService = dbService;
  }

  // 关系类型常量
  static get RELATIONSHIP_TYPES() {
    return {
      PARENT_CHILD: 'parent_child',    // 父子/女关系
      SPOUSE: 'spouse',                // 配偶关系
      SIBLINGS: 'siblings',            // 兄弟姐妹关系
      GRANDPARENT: 'grandparent',      // 祖孙关系
      OTHER: 'other'                   // 其他关系
    };
  }

  /**
   * 自动绑定家庭成员关系
   */
  async autoBindFamilyRelationships(householdId, options = {}) {
    try {
      const { forceRebind = false } = options;

      // 获取家庭成员
      let members = [];
      if (this.dbService?.sqliteDB) {
        members = await this.dbService.sqliteDB.all(
          'SELECT * FROM household_members WHERE household_id = ?',
          [householdId]
        );
      }

      if (!members || members.length === 0) {
        return {
          success: false,
          message: '未找到家庭成员'
        };
      }

      const relationships = [];
      const familyTree = {
        nodes: [],
        links: [],
        householdId
      };

      // 分析成员间的关系
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const member1 = members[i];
          const member2 = members[j];

          const analysis = await this.analyzePairRelationship(member1, member2);

          if (analysis.relationship && analysis.confidence > 0.5) {
            // 保存关系绑定
            const binding = await this.createRelationshipBinding({
              householdId,
              member1Id: member1.id,
              member2Id: member2.id,
              relationshipType: analysis.relationship,
              confidence: analysis.confidence,
              evidences: analysis.evidences
            });

            if (binding.success) {
              relationships.push(binding);
              familyTree.links.push({
                source: member1.id,
                target: member2.id,
                type: analysis.relationship,
                confidence: analysis.confidence
              });
            }
          }
        }

        // 添加家族树节点
        familyTree.nodes.push({
          id: members[i].id,
          name: members[i].memberName,
          gender: members[i].gender,
          birthDate: members[i].birthDate
        });
      }

      logger.info(`自动绑定血缘关系完成: ${householdId}, 关系数: ${relationships.length}`);

      return {
        success: true,
        householdId,
        relationships,
        familyTree,
        message: `成功绑定 ${relationships.length} 个关系`
      };

    } catch (error) {
      logger.error('自动绑定血缘关系失败:', error);
      throw new Error('自动绑定血缘关系失败');
    }
  }

  /**
   * 分析两个成员之间的关系
   */
  async analyzePairRelationship(member1, member2) {
    try {
      const evidences = [];
      let relationship = null;
      let confidence = 0;

      // 1. 姓名相似度分析
      const nameAnalysis = this.analyzeNameSimilarity(member1, member2);
      evidences.push(nameAnalysis);
      if (nameAnalysis.sameSurname) {
        confidence += 0.2;
      }

      // 2. 年龄差异分析
      const ageAnalysis = this.analyzeAgeDifference(member1, member2);
      evidences.push(ageAnalysis);

      // 3. 身份证关系分析
      const idCardAnalysis = this.analyzeIdCardRelationship(member1, member2);
      evidences.push(idCardAnalysis);
      confidence += idCardAnalysis.evidence_strength * 0.3;

      // 4. 综合判断关系类型
      const ageDiff = this.calculateAgeDifference(member1, member2);

      if (ageDiff >= 20 && ageDiff <= 50) {
        // 可能是父母子女关系
        relationship = FamilyRelationshipBinder.RELATIONSHIP_TYPES.PARENT_CHILD;
        confidence += 0.3;
      } else if (ageDiff <= 5) {
        // 可能是兄弟姐妹或配偶关系
        if (member1.gender !== member2.gender) {
          relationship = FamilyRelationshipBinder.RELATIONSHIP_TYPES.SPOUSE;
          confidence += 0.2;
        } else {
          relationship = FamilyRelationshipBinder.RELATIONSHIP_TYPES.SIBLINGS;
          confidence += 0.15;
        }
      } else if (ageDiff >= 40) {
        // 可能是祖孙关系
        relationship = FamilyRelationshipBinder.RELATIONSHIP_TYPES.GRANDPARENT;
        confidence += 0.25;
      }

      return {
        relationship,
        confidence: Math.min(1, confidence),
        evidences
      };

    } catch (error) {
      logger.error('分析成员关系失败:', error);
      return {
        relationship: null,
        confidence: 0,
        evidences: []
      };
    }
  }

  /**
   * 分析身份证关系
   */
  analyzeIdCardRelationship(member1, member2) {
    const idCard1 = member1.memberIdCard;
    const idCard2 = member2.memberIdCard;

    if (!idCard1 || !idCard2) {
      return {
        sameArea: false,
        evidence_strength: 0
      };
    }

    // 比较地区码（前6位）
    const areaCode1 = idCard1.substring(0, 6);
    const areaCode2 = idCard2.substring(0, 6);
    const sameArea = areaCode1 === areaCode2;

    // 比较出生日期（第7-14位）
    const birthYear1 = parseInt(idCard1.substring(6, 10));
    const birthYear2 = parseInt(idCard2.substring(6, 10));

    let evidence_strength = 0;
    if (sameArea) {
      evidence_strength += 0.3;
    }

    // 同地区且年龄合理，增加证据强度
    const ageDiff = Math.abs(birthYear1 - birthYear2);
    if (sameArea && ageDiff >= 15 && ageDiff <= 50) {
      evidence_strength += 0.2;
    }

    return {
      sameArea,
      areaCode1,
      areaCode2,
      ageDiff: Math.abs(birthYear1 - birthYear2),
      evidence_strength: Math.min(1, evidence_strength)
    };
  }

  /**
   * 手动绑定关系
   */
  async manualBindRelationship(bindingData) {
    try {
      const {
        householdId,
        member1Id,
        member2Id,
        relationshipType,
        operatorId
      } = bindingData;

      // 验证关系类型
      const validTypes = Object.values(FamilyRelationshipBinder.RELATIONSHIP_TYPES);
      if (!validTypes.includes(relationshipType)) {
        return {
          success: false,
          reason: '无效的关系类型'
        };
      }

      // 创建绑定ID
      const bindingId = `BINDING_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 保存到数据库
      if (this.dbService?.sqliteDB) {
        await this.dbService.sqliteDB.run(
          `INSERT INTO family_relationship_bindings (id, household_id, member1_id, member2_id,
           relationship_type, operator_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [bindingId, householdId, member1Id, member2Id, relationshipType, operatorId, new Date()]
        );
      }

      logger.info(`手动绑定关系成功: ${bindingId}`);

      return {
        success: true,
        bindingId,
        relationshipType,
        message: '关系绑定成功'
      };

    } catch (error) {
      logger.error('手动绑定关系失败:', error);
      throw error;
    }
  }

  /**
   * 生成家族树
   */
  async generateFamilyTree(householdId, relationships) {
    try {
      // 获取所有成员
      let members = [];
      if (this.dbService?.sqliteDB) {
        const result = await this.dbService.sqliteDB.all(
          'SELECT * FROM household_members WHERE household_id = ?',
          [householdId]
        );
        members = result || [];
      }

      // 如果没有获取到成员，使用空数组
      if (!members || !Array.isArray(members)) {
        members = [];
      }

      const nodes = members.map(member => ({
        id: member.id,
        name: member.memberName,
        gender: member.gender,
        birthDate: member.birthDate,
        relationship: member.relationship
      }));

      const links = relationships.map(rel => ({
        source: rel.member1Id,
        target: rel.member2Id,
        type: rel.relationshipType,
        direction: rel.direction
      }));

      return {
        householdId,
        nodes,
        links,
        relationships: relationships.length
      };

    } catch (error) {
      logger.error('生成家族树失败:', error);
      throw error;
    }
  }

  /**
   * 辅助方法
   */
  analyzeNameSimilarity(member1, member2) {
    const name1 = member1.memberName || '';
    const name2 = member2.memberName || '';

    // 检查是否同姓
    const surname1 = name1.charAt(0);
    const surname2 = name2.charAt(0);
    const sameSurname = surname1 === surname2 && surname1.length > 0;

    return {
      type: 'name_similarity',
      sameSurname,
      name1,
      name2
    };
  }

  analyzeAgeDifference(member1, member2) {
    const ageDiff = this.calculateAgeDifference(member1, member2);

    const possibleRelations = [];
    if (ageDiff >= 20 && ageDiff <= 50) {
      possibleRelations.push({
        type: FamilyRelationshipBinder.RELATIONSHIP_TYPES.PARENT_CHILD,
        likelihood: 0.6
      });
    }
    if (ageDiff <= 5) {
      possibleRelations.push({
        type: FamilyRelationshipBinder.RELATIONSHIP_TYPES.SIBLINGS,
        likelihood: 0.4
      });
      if (member1.gender !== member2.gender) {
        possibleRelations.push({
          type: FamilyRelationshipBinder.RELATIONSHIP_TYPES.SPOUSE,
          likelihood: 0.5
        });
      }
    }

    return {
      type: 'age_difference',
      ageDiff,
      possibleRelations
    };
  }

  calculateAgeDifference(member1, member2) {
    const birthYear1 = parseInt(member1.birthDate?.substring(0, 4) || '1970');
    const birthYear2 = parseInt(member2.birthDate?.substring(0, 4) || '1970');
    return Math.abs(birthYear1 - birthYear2);
  }

  async createRelationshipBinding(bindingData) {
    try {
      const bindingId = `BINDING_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (this.dbService?.sqliteDB) {
        await this.dbService.sqliteDB.run(
          `INSERT INTO family_relationship_bindings (id, household_id, member1_id, member2_id,
           relationship_type, confidence, evidences, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            bindingId,
            bindingData.householdId,
            bindingData.member1Id,
            bindingData.member2Id,
            bindingData.relationshipType,
            bindingData.confidence,
            JSON.stringify(bindingData.evidences || []),
            new Date()
          ]
        );
      }

      return {
        success: true,
        bindingId,
        relationshipType: bindingData.relationshipType,
        confidence: bindingData.confidence
      };

    } catch (error) {
      logger.error('创建关系绑定失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = FamilyRelationshipBinder;
