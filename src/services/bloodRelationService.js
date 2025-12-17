/**
 * 血缘关系验证服务
 * 智能关系图谱算法，支持复杂血缘关系识别和验证
 */

const Household = require('../models/Household');
const User = require('../models/User');
const logger = require('../config/logger');

class BloodRelationService {
  constructor() {
    // 血缘关系权重配置
    this.relationWeights = {
      'parent_child': 1.0,      // 父母-子女
      'spouse': 0.9,            // 配偶
      'siblings': 0.7,          // 兄弟姐妹
      'grandparent_grandchild': 0.8, // 祖孙
      'uncle_nephew': 0.5,      // 叔伯-侄子侄女
      'cousin': 0.4             // 堂表兄弟姐妹
    };

    // 关系强度映射
    this.strengthMapping = {
      'strong': 5,    // 强关系
      'medium': 3,    // 中等关系
      'weak': 1       // 弱关系
    };
  }

  /**
   * 验证两个人之间的血缘关系
   * @param {string} idCard1 - 第一个人的身份证号
   * @param {string} idCard2 - 第二个人的身份证号
   * @param {Object} options - 验证选项
   * @returns {Promise<Object>} 验证结果
   */
  async verifyBloodRelationship(idCard1, idCard2, options = {}) {
    try {
      logger.info(`开始验证血缘关系: ${idCard1} <-> ${idCard2}`);

      // 1. 查找两人的家庭信息
      const family1 = await Household.findFamilyByIdCard(idCard1);
      const family2 = await Household.findFamilyByIdCard(idCard2);

      if (!family1 || !family2) {
        return {
          valid: false,
          reason: '未找到相关人员信息',
          relationship: 'unknown',
          confidence: 0
        };
      }

      // 2. 构建关系图谱
      const relationshipGraph = await this.buildRelationshipGraph(family1, family2);

      // 3. 分析血缘路径
      const bloodPath = await this.findBloodRelationshipPath(
        idCard1, idCard2, relationshipGraph
      );

      // 4. 计算关系强度和可信度
      const result = this.analyzeRelationshipResult(bloodPath, relationshipGraph);

      // 5. 记录验证历史
      await this.recordVerificationHistory(idCard1, idCard2, result, options);

      logger.info(`血缘关系验证完成: ${result.relationship}, 可信度: ${result.confidence}`);

      return result;

    } catch (error) {
      logger.error('血缘关系验证失败:', error);
      throw error;
    }
  }

  /**
   * 构建关系图谱
   * @param {Object} family1 - 第一个家庭
   * @param {Object} family2 - 第二个家庭
   * @returns {Promise<Object>} 关系图谱
   */
  async buildRelationshipGraph(family1, family2) {
    const graph = {
      nodes: new Map(),
      edges: new Map()
    };

    // 添加第一个家庭的所有成员到图谱
    this.addFamilyToGraph(family1, graph);

    // 添加第二个家庭的所有成员到图谱
    this.addFamilyToGraph(family2, graph);

    // 查找并添加血缘关系边
    await this.addBloodRelationEdges(family1, family2, graph);

    return {
      nodes: Array.from(graph.nodes.values()),
      edges: Array.from(graph.edges.values())
    };
  }

  /**
   * 添加家庭成员到关系图谱
   * @param {Object} family - 家庭对象
   * @param {Object} graph - 关系图谱
   */
  addFamilyToGraph(family, graph) {
    // 添加户主
    graph.nodes.set(family.householder.idCard, {
      id: family.householder.idCard,
      name: family.householder.name,
      role: '户主',
      gender: family.householder.gender,
      householdId: family.codeId,
      birthday: this.extractBirthdayFromIdCard(family.householder.idCard)
    });

    // 添加家庭成员
    family.members.filter(m => m.isActive).forEach(member => {
      graph.nodes.set(member.idCard, {
        id: member.idCard,
        name: member.name,
        role: member.relationship,
        gender: member.gender,
        householdId: family.codeId,
        birthday: this.extractBirthdayFromIdCard(member.idCard),
        relationshipType: member.relationshipType,
        relationshipDegree: member.relationshipDegree
      });

      // 添加家庭成员关系边
      const edgeId = `${family.householder.idCard}-${member.idCard}`;
      graph.edges.set(edgeId, {
        source: family.householder.idCard,
        target: member.idCard,
        relationship: member.relationship,
        type: 'family',
        strength: this.calculateRelationshipStrength(member.relationship),
        weight: this.relationWeights[member.relationshipType] || 0.5
      });
    });
  }

  /**
   * 添加血缘关系边
   * @param {Object} family1 - 第一个家庭
   * @param {Object} family2 - 第二个家庭
   * @param {Object} graph - 关系图谱
   */
  async addBloodRelationEdges(family1, family2, graph) {
    // 在家庭1的血缘关系网络中查找家庭2
    const relatedFamily = family1.bloodRelationNetwork.relatedFamilies.find(
      rf => rf.householdId && rf.householdId.toString() === family2._id.toString()
    );

    if (relatedFamily) {
      // 添加血缘关系边
      const edgeId = `${family1.codeId}-${family2.codeId}`;
      graph.edges.set(edgeId, {
        source: family1.codeId,
        target: family2.codeId,
        relationship: relatedFamily.relationship,
        type: 'blood_relation',
        strength: relatedFamily.relationshipStrength,
        weight: this.calculateBloodRelationWeight(relatedFamily.relationship),
        establishedDate: relatedFamily.establishedDate
      });
    }

    // 反向查找（family2到family1）
    const reverseRelation = family2.bloodRelationNetwork.relatedFamilies.find(
      rf => rf.householdId && rf.householdId.toString() === family1._id.toString()
    );

    if (reverseRelation && !relatedFamily) {
      const edgeId = `${family2.codeId}-${family1.codeId}`;
      graph.edges.set(edgeId, {
        source: family2.codeId,
        target: family1.codeId,
        relationship: reverseRelation.relationship,
        type: 'blood_relation',
        strength: reverseRelation.relationshipStrength,
        weight: this.calculateBloodRelationWeight(reverseRelation.relationship),
        establishedDate: reverseRelation.establishedDate
      });
    }
  }

  /**
   * 查找血缘关系路径
   * @param {string} idCard1 - 第一个身份证号
   * @param {string} idCard2 - 第二个身份证号
   * @param {Object} graph - 关系图谱
   * @returns {Promise<Array>} 关系路径
   */
  async findBloodRelationshipPath(idCard1, idCard2, graph) {
    // 使用深度优先搜索查找路径
    const visited = new Set();
    const paths = [];

    const dfs = (currentId, targetId, currentPath, accumulatedWeight) => {
      if (currentId === targetId) {
        paths.push({
          path: [...currentPath],
          totalWeight: accumulatedWeight
        });
        return;
      }

      if (visited.has(currentId)) return;
      visited.add(currentId);

      // 查找当前节点的所有边
      const outgoingEdges = graph.edges.filter(edge => edge.source === currentId);

      for (const edge of outgoingEdges) {
        dfs(
          edge.target,
          targetId,
          [...currentPath, edge],
          accumulatedWeight + (edge.weight || 0)
        );
      }

      visited.delete(currentId);
    };

    dfs(idCard1, idCard2, [], 0);

    // 返回权重最高的路径
    if (paths.length === 0) {
      return [];
    }

    return paths.reduce((best, current) =>
      current.totalWeight > best.totalWeight ? current : best
    ).path;
  }

  /**
   * 分析关系结果
   * @param {Array} bloodPath - 血缘路径
   * @param {Object} graph - 关系图谱
   * @returns {Object} 分析结果
   */
  analyzeRelationshipResult(bloodPath, graph) {
    if (bloodPath.length === 0) {
      return {
        valid: false,
        relationship: 'unrelated',
        confidence: 0,
        reason: '未发现血缘关系'
      };
    }

    // 分析路径中的关系类型
    const relationships = bloodPath.map(edge => edge.relationship);
    const totalWeight = bloodPath.reduce((sum, edge) => sum + (edge.weight || 0), 0);

    // 确定主要关系类型
    let mainRelationship = 'unknown';
    let confidence = Math.min(totalWeight / relationships.length, 1.0);

    if (relationships.includes('配偶')) {
      mainRelationship = 'spouse';
      confidence = Math.max(confidence, 0.9);
    } else if (relationships.includes('子女') || relationships.includes('父母')) {
      mainRelationship = 'parent_child';
      confidence = Math.max(confidence, 0.8);
    } else if (relationships.includes('兄弟姐妹')) {
      mainRelationship = 'siblings';
      confidence = Math.max(confidence, 0.7);
    } else if (relationships.includes('祖父母') || relationships.includes('孙子女')) {
      mainRelationship = 'grandparent_grandchild';
      confidence = Math.max(confidence, 0.8);
    } else {
      mainRelationship = 'extended_family';
      confidence = Math.max(confidence, 0.5);
    }

    return {
      valid: confidence > 0.3,
      relationship: mainRelationship,
      confidence,
      path: bloodPath,
      pathLength: bloodPath.length,
      details: `通过${bloodPath.length}个关系节点建立血缘关系，总权重: ${totalWeight.toFixed(2)}`
    };
  }

  /**
   * 计算关系强度
   * @param {string} relationship - 关系类型
   * @returns {number} 关系强度(1-5)
   */
  calculateRelationshipStrength(relationship) {
    const strengthMap = {
      '配偶': 5,
      '子女': 5,
      '父母': 5,
      '祖父母': 4,
      '孙子女': 4,
      '兄弟姐妹': 3,
      '其他': 2
    };
    return strengthMap[relationship] || 2;
  }

  /**
   * 计算血缘关系权重
   * @param {string} relation - 关系描述
   * @returns {number} 权重值
   */
  calculateBloodRelationWeight(relation) {
    const weightMap = {
      '父母家庭': 0.9,
      '子女家庭': 0.9,
      '兄弟姐妹家庭': 0.7
    };
    return weightMap[relation] || 0.5;
  }

  /**
   * 从身份证号提取生日
   * @param {string} idCard - 身份证号
   * @returns {Date|null} 生日
   */
  extractBirthdayFromIdCard(idCard) {
    if (!idCard || idCard.length !== 18) return null;

    const birthDateStr = idCard.substring(6, 14);
    const year = parseInt(birthDateStr.substring(0, 4));
    const month = parseInt(birthDateStr.substring(4, 6));
    const day = parseInt(birthDateStr.substring(6, 8));

    return new Date(year, month - 1, day);
  }

  /**
   * 记录验证历史
   * @param {string} idCard1 - 第一个身份证号
   * @param {string} idCard2 - 第二个身份证号
   * @param {Object} result - 验证结果
   * @param {Object} options - 选项
   */
  async recordVerificationHistory(idCard1, idCard2, result, options) {
    try {
      // 这里可以将验证历史保存到专门的审计日志表
      const auditRecord = {
        timestamp: new Date(),
        type: 'blood_relation_verification',
        parties: [idCard1, idCard2],
        result: {
          valid: result.valid,
          relationship: result.relationship,
          confidence: result.confidence
        },
        operator: options.operatorId || 'system',
        ipAddress: options.ipAddress,
        userAgent: options.userAgent
      };

      logger.info('血缘关系验证历史记录:', auditRecord);

      // TODO: 保存到数据库的审计日志表

    } catch (error) {
      logger.error('记录验证历史失败:', error);
    }
  }

  /**
   * 构建整个村庄的血缘关系图谱
   * @param {string} villageId - 村庄ID
   * @returns {Promise<Object>} 完整的关系图谱
   */
  async buildVillageBloodRelationGraph(villageId) {
    try {
      logger.info(`开始构建村庄 ${villageId} 的血缘关系图谱`);

      // 获取村庄内所有活跃家庭
      const households = await Household.find({
        villageId,
        status: 'active'
      }).populate('bloodRelationNetwork.relatedFamilies.householdId');

      const graph = {
        nodes: [],
        edges: [],
        communities: [], // 关系社群
        statistics: {
          totalHouseholds: households.length,
          totalMembers: 0,
          averageRelationsPerHousehold: 0,
          mostConnectedHouseholds: []
        }
      };

      // 构建节点和边
      households.forEach(household => {
        // 添加户主和家庭成员节点
        graph.nodes.push({
          id: household.codeId,
          name: household.householder.name,
          role: '户主',
          householdId: household.codeId,
          type: 'household'
        });

        household.members.filter(m => m.isActive).forEach(member => {
          graph.nodes.push({
            id: `${household.codeId}_${member.idCard}`,
            name: member.name,
            role: member.relationship,
            householdId: household.codeId,
            type: 'member'
          });

          graph.edges.push({
            source: household.codeId,
            target: `${household.codeId}_${member.idCard}`,
            relationship: member.relationship,
            type: 'family',
            strength: this.calculateRelationshipStrength(member.relationship)
          });
        });

        // 统计成员数量
        graph.statistics.totalMembers += 1 + household.members.filter(m => m.isActive).length;
      });

      // 添加血缘关系边
      households.forEach(household => {
        household.bloodRelationNetwork.relatedFamilies.forEach(relatedFamily => {
          if (relatedFamily.householdId) {
            graph.edges.push({
              source: household.codeId,
              target: relatedFamily.householdId.codeId,
              relationship: relatedFamily.relationship,
              type: 'blood_relation',
              strength: relatedFamily.relationshipStrength
            });
          }
        });
      });

      // 计算统计信息
      this.calculateGraphStatistics(graph, households);

      // 使用社区发现算法识别关系社群
      graph.communities = this.detectCommunities(graph);

      logger.info(`血缘关系图谱构建完成: ${graph.nodes.length}个节点, ${graph.edges.length}条边`);

      return graph;

    } catch (error) {
      logger.error('构建血缘关系图谱失败:', error);
      throw error;
    }
  }

  /**
   * 计算图谱统计信息
   * @param {Object} graph - 关系图谱
   * @param {Array} households - 家庭列表
   */
  calculateGraphStatistics(graph, households) {
    // 计算平均关系数
    const relationCounts = households.map(h =>
      h.bloodRelationNetwork.relatedFamilies.length
    );
    graph.statistics.averageRelationsPerHousehold =
      relationCounts.reduce((sum, count) => sum + count, 0) / households.length;

    // 找出连接最多的家庭
    graph.statistics.mostConnectedHouseholds = households
      .sort((a, b) =>
        b.bloodRelationNetwork.relatedFamilies.length -
        a.bloodRelationNetwork.relatedFamilies.length
      )
      .slice(0, 5)
      .map(h => ({
        codeId: h.codeId,
        householderName: h.householder.name,
        relationCount: h.bloodRelationNetwork.relatedFamilies.length
      }));
  }

  /**
   * 检测关系社群
   * @param {Object} graph - 关系图谱
   * @returns {Array} 社群列表
   */
  detectCommunities(graph) {
    // 简化的社区发现算法
    // 实际可以使用Louvain等更复杂的算法
    const communities = [];
    const visited = new Set();

    graph.edges.forEach(edge => {
      if (edge.type === 'blood_relation') {
        // 找到连接的家庭形成社群
        const sourceHousehold = edge.source;
        const targetHousehold = edge.target;

        if (!visited.has(sourceHousehold)) {
          const community = this.expandCommunity(sourceHousehold, graph, visited);
          if (community.length > 1) {
            communities.push(community);
          }
        }
      }
    });

    return communities;
  }

  /**
   * 扩展社群
   * @param {string} startId - 起始节点ID
   * @param {Object} graph - 关系图谱
   * @param {Set} visited - 已访问节点
   * @returns {Array} 社群成员
   */
  expandCommunity(startId, graph, visited) {
    const community = [];
    const queue = [startId];

    while (queue.length > 0) {
      const currentId = queue.shift();

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      community.push(currentId);

      // 添加所有通过血缘关系连接的节点
      graph.edges
        .filter(edge =>
          (edge.source === currentId || edge.target === currentId) &&
          edge.type === 'blood_relation'
        )
        .forEach(edge => {
          const nextId = edge.source === currentId ? edge.target : edge.source;
          if (!visited.has(nextId)) {
            queue.push(nextId);
          }
        });
    }

    return community;
  }

  /**
   * 推荐潜在的血缘关系
   * @param {string} villageId - 村庄ID
   * @param {string} householdId - 家庭ID
   * @returns {Promise<Array>} 推荐关系列表
   */
  async recommendPotentialRelations(villageId, householdId) {
    try {
      // 获取目标家庭
      const targetHousehold = await Household.findOne({
        villageId,
        codeId: householdId,
        status: 'active'
      });

      if (!targetHousehold) {
        throw new Error('未找到目标家庭');
      }

      // 获取村庄内其他家庭
      const otherHouseholds = await Household.find({
        villageId,
        codeId: { $ne: householdId },
        status: 'active'
      });

      const recommendations = [];

      // 分析潜在关系
      otherHouseholds.forEach(household => {
        const relationScore = this.calculatePotentialRelationScore(targetHousehold, household);

        if (relationScore > 0.3) {
          recommendations.push({
            householdId: household.codeId,
            householderName: household.householder.name,
            score: relationScore,
            reason: this.generateRelationReason(targetHousehold, household, relationScore)
          });
        }
      });

      // 按分数排序
      recommendations.sort((a, b) => b.score - a.score);

      return recommendations.slice(0, 10); // 返回前10个推荐

    } catch (error) {
      logger.error('推荐潜在关系失败:', error);
      throw error;
    }
  }

  /**
   * 计算潜在关系分数
   * @param {Object} household1 - 家庭1
   * @param {Object} household2 - 家庭2
   * @returns {number} 关系分数
   */
  calculatePotentialRelationScore(household1, household2) {
    let score = 0;

    // 姓氏相似度
    if (this.isSameSurname(household1.householder.name, household2.householder.name)) {
      score += 0.3;
    }

    // 地址相似度
    const addressSimilarity = this.calculateAddressSimilarity(
      household1.address,
      household2.address
    );
    score += addressSimilarity * 0.2;

    // 年龄分布相似度
    const ageSimilarity = this.calculateAgeSimilarity(household1, household2);
    score += ageSimilarity * 0.2;

    // 特殊标签相似度
    const tagSimilarity = this.calculateTagSimilarity(
      household1.specialTags,
      household2.specialTags
    );
    score += tagSimilarity * 0.3;

    return Math.min(score, 1.0);
  }

  /**
   * 判断是否为相同姓氏
   * @param {string} name1 - 姓名1
   * @param {string} name2 - 姓名2
   * @returns {boolean} 是否相同
   */
  isSameSurname(name1, name2) {
    const surname1 = name1.substring(0, 1);
    const surname2 = name2.substring(0, 1);
    return surname1 === surname2;
  }

  /**
   * 计算地址相似度
   * @param {Object} address1 - 地址1
   * @param {Object} address2 - 地址2
   * @returns {number} 相似度
   */
  calculateAddressSimilarity(address1, address2) {
    const fields = ['province', 'city', 'county', 'township', 'village', 'group'];
    let matches = 0;

    fields.forEach(field => {
      if (address1[field] && address2[field] && address1[field] === address2[field]) {
        matches++;
      }
    });

    return matches / fields.length;
  }

  /**
   * 计算年龄分布相似度
   * @param {Object} household1 - 家庭1
   * @param {Object} household2 - 家庭2
   * @returns {number} 相似度
   */
  calculateAgeSimilarity(household1, household2) {
    const getAgeDistribution = (household) => {
      const members = [household.householder, ...household.members.filter(m => m.isActive)];
      const currentYear = new Date().getFullYear();

      return members.map(member => {
        if (!member.birthday) return 0;
        return currentYear - new Date(member.birthday).getFullYear();
      });
    };

    const ages1 = getAgeDistribution(household1);
    const ages2 = getAgeDistribution(household2);

    // 计算年龄分布的相关性
    const avgAge1 = ages1.reduce((sum, age) => sum + age, 0) / ages1.length;
    const avgAge2 = ages2.reduce((sum, age) => sum + age, 0) / ages2.length;

    const ageDiff = Math.abs(avgAge1 - avgAge2);
    return Math.max(0, 1 - ageDiff / 50); // 50岁为最大年龄差
  }

  /**
   * 计算标签相似度
   * @param {Array} tags1 - 标签1
   * @param {Array} tags2 - 标签2
   * @returns {number} 相似度
   */
  calculateTagSimilarity(tags1, tags2) {
    if (tags1.length === 0 || tags2.length === 0) return 0;

    const intersection = tags1.filter(tag => tags2.includes(tag));
    const union = [...new Set([...tags1, ...tags2])];

    return intersection.length / union.length;
  }

  /**
   * 生成推荐理由
   * @param {Object} household1 - 家庭1
   * @param {Object} household2 - 家庭2
   * @param {number} score - 分数
   * @returns {string} 推荐理由
   */
  generateRelationReason(household1, household2, score) {
    const reasons = [];

    if (this.isSameSurname(household1.householder.name, household2.householder.name)) {
      reasons.push('姓氏相同');
    }

    if (this.calculateAddressSimilarity(household1.address, household2.address) > 0.5) {
      reasons.push('地址相近');
    }

    if (this.calculateTagSimilarity(household1.specialTags, household2.specialTags) > 0.3) {
      reasons.push('特征相似');
    }

    return reasons.join('、') || '综合分析';
  }
}

module.exports = BloodRelationService;