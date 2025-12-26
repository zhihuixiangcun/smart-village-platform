/**
 * 家庭关系服务单元测试
 */

require('../setup/unit');
const familyService = require('../../src/services/familyService');

describe('Family Service', () => {
  describe('buildFamilyTree', () => {
    test('应该构建正确的家庭关系树', () => {
      const residents = [
        {
          _id: '1',
          name: '张父',
          idCard: '110101196001011234',
          gender: '男',
          birth: '1960-01-01'
        },
        {
          _id: '2',
          name: '张母',
          idCard: '110101196002022345',
          gender: '女',
          birth: '1960-02-02'
        },
        {
          _id: '3',
          name: '张子',
          idCard: '110101199001011234',
          gender: '男',
          birth: '1990-01-01'
        },
        {
          _id: '4',
          name: '张女',
          idCard: '110101199502022345',
          gender: '女',
          birth: '1995-02-02'
        }
      ];

      const familyTree = familyService.buildFamilyTree(residents);

      expect(familyTree).toBeDefined();
      expect(familyTree.length).toBeGreaterThan(0);

      // 检查是否建立了父母与子女的关系
      const father = residents.find(r => r.name === '张父');
      const children = familyService.findChildren(father, residents);
      expect(children.length).toBe(2);
    });

    test('应该处理单个居民的情况', () => {
      const residents = [
        {
          _id: '1',
          name: '单身居民',
          idCard: '110101199001011234',
          gender: '男',
          birth: '1990-01-01'
        }
      ];

      const familyTree = familyService.buildFamilyTree(residents);

      expect(familyTree).toBeDefined();
      expect(familyTree.length).toBe(1);
      expect(familyTree[0].relationships).toEqual([]);
    });
  });

  describe('calculateRelationship', () => {
    test('应该正确计算父母与子女关系', () => {
      const parent = {
        _id: '1',
        name: '父亲',
        idCard: '110101196001011234',
        gender: '男',
        birth: '1960-01-01'
      };

      const child = {
        _id: '2',
        name: '儿子',
        idCard: '110101199001011234',
        gender: '男',
        birth: '1990-01-01'
      };

      const relationship = familyService.calculateRelationship(parent, child);

      expect(relationship).toBe('父子');
    });

    test('应该正确计算配偶关系', () => {
      const person1 = {
        _id: '1',
        name: '丈夫',
        idCard: '110101196001011234',
        gender: '男',
        birth: '1960-01-01'
      };

      const person2 = {
        _id: '2',
        name: '妻子',
        idCard: '110101196002022345',
        gender: '女',
        birth: '1960-02-02'
      };

      const relationship = familyService.calculateRelationship(person1, person2);

      expect(['夫妻', '配偶']).toContain(relationship);
    });

    test('应该处理无法确定关系的情况', () => {
      const person1 = {
        _id: '1',
        name: '人员1',
        idCard: '110101198001011234',
        gender: '男',
        birth: '1980-01-01'
      };

      const person2 = {
        _id: '2',
        name: '人员2',
        idCard: '110101198502022345',
        gender: '男',
        birth: '1985-02-02'
      };

      const relationship = familyService.calculateRelationship(person1, person2);

      expect(relationship).toBe('未知');
    });
  });

  describe('findChildren', () => {
    test('应该找到指定父母的所有子女', () => {
      const residents = [
        {
          _id: '1',
          name: '父亲',
          idCard: '110101196001011234',
          gender: '男',
          birth: '1960-01-01'
        },
        {
          _id: '2',
          name: '儿子1',
          idCard: '110101199001011234',
          gender: '男',
          birth: '1990-01-01'
        },
        {
          _id: '3',
          name: '儿子2',
          idCard: '110101199502022345',
          gender: '男',
          birth: '1995-02-02'
        },
        {
          _id: '4',
          name: '女儿',
          idCard: '110101199803033456',
          gender: '女',
          birth: '1998-03-03'
        }
      ];

      const father = residents[0];
      const children = familyService.findChildren(father, residents);

      expect(children.length).toBe(3);
      expect(children.every(child =>
        ['儿子1', '儿子2', '女儿'].includes(child.name)
      )).toBe(true);
    });

    test('应该处理没有子女的情况', () => {
      const residents = [
        {
          _id: '1',
          name: '单身汉',
          idCard: '110101196001011234',
          gender: '男',
          birth: '1960-01-01'
        }
      ];

      const person = residents[0];
      const children = familyService.findChildren(person, residents);

      expect(children.length).toBe(0);
    });
  });

  describe('findSpouse', () => {
    test('应该找到指定人员的配偶', () => {
      const residents = [
        {
          _id: '1',
          name: '丈夫',
          idCard: '110101196001011234',
          gender: '男',
          birth: '1960-01-01'
        },
        {
          _id: '2',
          name: '妻子',
          idCard: '110101196002022345',
          gender: '女',
          birth: '1960-02-02'
        }
      ];

      const husband = residents[0];
      const spouse = familyService.findSpouse(husband, residents);

      expect(spouse).toBeDefined();
      expect(spouse.name).toBe('妻子');
      expect(spouse.gender).toBe('女');
    });

    test('应该处理没有配偶的情况', () => {
      const residents = [
        {
          _id: '1',
          name: '单身汉',
          idCard: '110101196001011234',
          gender: '男',
          birth: '1960-01-01'
        }
      ];

      const person = residents[0];
      const spouse = familyService.findSpouse(person, residents);

      expect(spouse).toBeNull();
    });
  });

  describe('generateFamilyCode', () => {
    test('应该为同一家庭成员生成相同的家庭编码', () => {
      const familyMembers = [
        { idCard: '110101196001011234' }, // 父亲
        { idCard: '110101199001011234' }, // 儿子
        { idCard: '110101199502022345' }  // 女儿
      ];

      const familyCodes = familyMembers.map(member =>
        familyService.generateFamilyCode(member.idCard)
      );

      // 同一家庭成员应该有相同的家庭编码前6位（地区码）
      expect(familyCodes.every(code => code.startsWith('110101'))).toBe(true);
    });

    test('应该为不同家庭生成不同的家庭编码', () => {
      const member1 = { idCard: '110101196001011234' }; // 北京
      const member2 = { idCard: '440101196001011234' }; // 广东

      const familyCode1 = familyService.generateFamilyCode(member1.idCard);
      const familyCode2 = familyService.generateFamilyCode(member2.idCard);

      expect(familyCode1).not.toBe(familyCode2);
    });
  });
});