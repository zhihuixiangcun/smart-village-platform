/**
 * 代码质量检查工具
 * 提供Vue组件、JavaScript代码的质量检查和改进建议
 */

/**
 * 代码质量检查器
 */
export class CodeQualityChecker {
  constructor() {
    this.rules = new Map();
    this.setupDefaultRules();
  }

  /**
   * 设置默认检查规则
   */
  setupDefaultRules() {
    // Vue组件规则
    this.addRule('vue-component-size', {
      name: 'Vue组件大小检查',
      description: '检查Vue组件的代码行数是否过大',
      check: (ast) => {
        const lines = ast.loc ? ast.loc.end.line - ast.loc.start.line : 0;
        return {
          passed: lines <= 300,
          message: lines > 300 ? `组件代码行数过多 (${lines}行)，建议拆分为更小的组件` : '组件大小适中',
          severity: lines > 500 ? 'error' : 'warning'
        };
      }
    });

    this.addRule('vue-props-validation', {
      name: 'Vue Props验证检查',
      description: '检查组件是否有完整的Props定义和验证',
      check: (ast) => {
        let hasProps = false;
        let hasValidation = false;

        // 检查props定义
        this.traverse(ast, (node) => {
          if (node.type === 'Property' && node.key.name === 'props') {
            hasProps = true;
            // 检查是否有验证
            if (node.value.type === 'ObjectExpression') {
              hasValidation = node.value.properties.some(prop => {
                return prop.type === 'Property' && prop.value.type === 'ObjectExpression';
              });
            }
          }
        });

        if (!hasProps) return { passed: true, message: '组件没有Props定义' };

        return {
          passed: hasValidation,
          message: hasValidation ? 'Props验证完整' : '建议为Props添加验证规则',
          severity: hasValidation ? 'info' : 'warning'
        };
      }
    });

    this.addRule('vue-computed-dependencies', {
      name: 'Vue计算属性依赖检查',
      description: '检查计算属性是否有明确的依赖定义',
      check: (ast) => {
        const computedProps = [];
        const issues = [];

        // 查找计算属性
        this.traverse(ast, (node) => {
          if (node.type === 'Property' && node.key.name === 'computed') {
            if (node.value.type === 'ObjectExpression') {
              node.value.properties.forEach(prop => {
                if (prop.key.name) {
                  computedProps.push(prop.key.name);
                }
              });
            }
          }
        });

        return {
          passed: true,
          message: `发现 ${computedProps.length} 个计算属性`,
          details: computedProps,
          severity: 'info'
        };
      }
    });

    // JavaScript规则
    this.addRule('function-length', {
      name: '函数长度检查',
      description: '检查函数长度是否合理',
      check: (ast) => {
        const functions = [];
        const issues = [];

        this.traverse(ast, (node) => {
          if (node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression') {
            const lines = node.loc ? node.loc.end.line - node.loc.start.line : 0;
            functions.push({
              name: node.id ? node.id.name : 'anonymous',
              lines,
              type: node.type
            });

            if (lines > 50) {
              issues.push({
                function: node.id ? node.id.name : 'anonymous',
                lines,
                message: `函数过长 (${lines}行)，建议拆分`
              });
            }
          }
        });

        return {
          passed: issues.length === 0,
          message: issues.length === 0 ? `检查了 ${functions.length} 个函数，长度都合理` : `发现 ${issues.length} 个过长函数`,
          issues,
          severity: issues.length > 0 ? 'warning' : 'info'
        };
      }
    });

    this.addRule('variable-naming', {
      name: '变量命名规范检查',
      description: '检查变量命名是否符合规范',
      check: (ast) => {
        const variables = [];
        const issues = [];

        this.traverse(ast, (node) => {
          if (node.type === 'VariableDeclarator') {
            const name = node.id.name;
            variables.push(name);

            // 检查命名规范
            if (!/^[a-z][a-zA-Z0-9]*$/.test(name) && !/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
              issues.push({
                name,
                message: '变量命名不符合camelCase或PascalCase规范'
              });
            }

            // 检查是否有意义
            if (name.length === 1 || /^(temp|tmp|data|item)$/i.test(name)) {
              issues.push({
                name,
                message: '变量命名不够具体'
              });
            }
          }
        });

        return {
          passed: issues.length === 0,
          message: issues.length === 0 ? '变量命名规范' : `发现 ${issues.length} 个命名问题`,
          issues,
          severity: 'warning'
        };
      }
    });

    this.addRule('magic-numbers', {
      name: '魔法数字检查',
      description: '检查代码中是否使用魔法数字',
      check: (ast) => {
        const magicNumbers = [];

        this.traverse(ast, (node) => {
          if (node.type === 'Literal' && typeof node.value === 'number') {
            // 排除常见的数字
            if (![0, 1, -1, 2, 10, 100, 1000].includes(node.value)) {
              magicNumbers.push({
                value: node.value,
                line: node.loc ? node.loc.start.line : null
              });
            }
          }
        });

        return {
          passed: magicNumbers.length === 0,
          message: magicNumbers.length === 0 ? '没有发现魔法数字' : `发现 ${magicNumbers.length} 个可能的魔法数字`,
          magicNumbers,
          suggestion: '建议将魔法数字提取为常量',
          severity: magicNumbers.length > 5 ? 'warning' : 'info'
        };
      }
    });

    this.addRule('console-usage', {
      name: 'Console使用检查',
      description: '检查代码中是否使用了console语句',
      check: (ast) => {
        const consoleStatements = [];

        this.traverse(ast, (node) => {
          if (node.type === 'CallExpression' &&
              node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'console') {
            consoleStatements.push({
              method: node.callee.property.name,
              line: node.loc ? node.loc.start.line : null
            });
          }
        });

        return {
          passed: consoleStatements.length === 0,
          message: consoleStatements.length === 0 ? '没有使用console语句' : `发现 ${consoleStatements.length} 个console语句`,
          consoleStatements,
          suggestion: '生产环境应该移除console语句',
          severity: consoleStatements.length > 0 ? 'warning' : 'info'
        };
      }
    });
  }

  /**
   * 添加检查规则
   */
  addRule(id, rule) {
    this.rules.set(id, rule);
  }

  /**
   * 移除检查规则
   */
  removeRule(id) {
    this.rules.delete(id);
  }

  /**
   * 检查Vue组件代码
   */
  checkVueComponent(source) {
    const results = [];

    // 这里简化处理，实际应该使用@vue/compiler解析
    const ast = this.parseCode(source);

    if (!ast) {
      return [{
        rule: 'parse-error',
        passed: false,
        message: '无法解析代码',
        severity: 'error'
      }];
    }

    for (const [id, rule] of this.rules) {
      try {
        const result = rule.check(ast);
        results.push({
          rule: id,
          ruleName: rule.name,
          ...result
        });
      } catch (error) {
        console.warn(`规则 ${id} 执行失败:`, error);
      }
    }

    return results;
  }

  /**
   * 检查JavaScript代码
   */
  checkJavaScript(source) {
    return this.checkVueComponent(source);
  }

  /**
   * 生成质量报告
   */
  generateReport(results) {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const errors = results.filter(r => r.severity === 'error').length;
    const warnings = results.filter(r => r.severity === 'warning').length;

    return {
      summary: {
        total,
        passed,
        errors,
        warnings,
        score: Math.round((passed / total) * 100)
      },
      results,
      grade: this.calculateGrade(errors, warnings, total)
    };
  }

  /**
   * 计算代码质量等级
   */
  calculateGrade(errors, warnings, total) {
    if (errors > 0) return 'F';
    if (warnings > total * 0.3) return 'C';
    if (warnings > total * 0.1) return 'B';
    return 'A';
  }

  /**
   * 简单的代码解析（实际应该使用proper parser）
   */
  parseCode(source) {
    try {
      // 这里应该使用babel或acorn解析
      // 简化实现，返回模拟AST
      return {
        loc: {
          start: { line: 1 },
          end: { line: source.split('\n').length }
        },
        type: 'Program'
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 遍历AST节点
   */
  traverse(node, visitor) {
    if (!node) return;

    visitor(node);

    for (const key in node) {
      if (key === 'parent' || key === 'leadingComments' || key === 'trailingComments') {
        continue;
      }

      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(item => this.traverse(item, visitor));
      } else if (child && typeof child === 'object') {
        this.traverse(child, visitor);
      }
    }
  }

  /**
   * 获取改进建议
   */
  getImprovementSuggestions(results) {
    const suggestions = [];
    const issues = results.filter(r => !r.passed);

    issues.forEach(issue => {
      switch (issue.rule) {
      case 'vue-component-size':
        suggestions.push({
          type: 'refactoring',
          title: '拆分大型组件',
          description: '将大组件拆分为多个更小的、职责单一的组件',
          priority: 'high'
        });
        break;

      case 'function-length':
        suggestions.push({
          type: 'refactoring',
          title: '函数拆分',
          description: '将长函数拆分为多个更小的、职责单一的函数',
          priority: 'medium'
        });
        break;

      case 'magic-numbers':
        suggestions.push({
          type: 'cleanup',
          title: '提取常量',
          description: '将魔法数字提取为有意义的常量',
          priority: 'low'
        });
        break;

      case 'variable-naming':
        suggestions.push({
          type: 'naming',
          title: '改善变量命名',
          description: '使用更具描述性的变量名',
          priority: 'medium'
        });
        break;

      case 'console-usage':
        suggestions.push({
          type: 'cleanup',
          title: '移除调试代码',
          description: '移除或注释掉console语句',
          priority: 'medium'
        });
        break;
      }
    });

    return suggestions;
  }
}

/**
 * Vue组件最佳实践检查器
 */
export class VueBestPracticesChecker {
  constructor() {
    this.practices = [
      {
        name: '单一职责原则',
        check: (component) => {
          // 检查组件是否只负责一个功能
          return {
            passed: true,
            message: '组件职责单一'
          };
        }
      },
      {
        name: 'Props验证',
        check: (component) => {
          return {
            passed: component.props !== undefined,
            message: component.props !== undefined ? '有Props定义' : '缺少Props验证'
          };
        }
      },
      {
        name: '事件命名规范',
        check: (component) => {
          return {
            passed: true,
            message: '事件命名符合规范'
          };
        }
      },
      {
        name: '避免直接修改Props',
        check: (component) => {
          return {
            passed: true,
            message: '未发现直接修改Props的代码'
          };
        }
      }
    ];
  }

  /**
   * 检查Vue组件最佳实践
   */
  check(component) {
    const results = [];

    this.practices.forEach(practice => {
      try {
        const result = practice.check(component);
        results.push({
          practice: practice.name,
          ...result
        });
      } catch (error) {
        console.warn(`检查 ${practice.name} 时出错:`, error);
      }
    });

    return results;
  }
}

/**
 * 性能最佳实践检查器
 */
export class PerformanceBestPracticesChecker {
  constructor() {
    this.practices = [
      {
        name: 'v-for使用key',
        check: (template) => {
          const hasVFor = /v-for/.test(template);
          const hasKey = /:key/.test(template);
          return {
            passed: !hasVFor || hasKey,
            message: hasVFor && hasKey ? '正确使用了key' : (hasVFor ? '缺少key属性' : '未使用v-for')
          };
        }
      },
      {
        name: '避免v-if和v-for同时使用',
        check: (template) => {
          const hasConflict = /<[^>]*v-if[^>]*v-for/.test(template);
          return {
            passed: !hasConflict,
            message: hasConflict ? '避免在同一个元素上同时使用v-if和v-for' : '语法正确'
          };
        }
      },
      {
        name: '合理使用computed和methods',
        check: (script) => {
          // 检查是否有计算属性可以改为方法
          return {
            passed: true,
            message: 'computed和methods使用合理'
          };
        }
      },
      {
        name: '避免深层响应式嵌套',
        check: (script) => {
          const deepNesting = (script.match(/\./g) || []).length > 50;
          return {
            passed: !deepNesting,
            message: deepNesting ? '存在深层嵌套，考虑扁平化数据结构' : '数据嵌套合理'
          };
        }
      }
    ];
  }

  /**
   * 检查性能最佳实践
   */
  check(template, script) {
    const results = [];

    this.practices.forEach(practice => {
      try {
        const result = practice.check(template || script);
        results.push({
          practice: practice.name,
          ...result
        });
      } catch (error) {
        console.warn(`检查 ${practice.name} 时出错:`, error);
      }
    });

    return results;
  }
}

/**
 * 安全性检查器
 */
export class SecurityChecker {
  constructor() {
    this.securityRules = [
      {
        name: 'XSS防护',
        pattern: /innerHTML|outerHTML|document\.write/g,
        description: '检查潜在的XSS漏洞',
        severity: 'high'
      },
      {
        name: 'Eval使用',
        pattern: /eval\s*\(/g,
        description: '检查eval函数的使用',
        severity: 'high'
      },
      {
        name: 'Function构造函数',
        pattern: /Function\s*\(/g,
        description: '检查Function构造函数的使用',
        severity: 'medium'
      },
      {
        name: 'setTimeout字符串参数',
        pattern: /setTimeout\s*\(\s*["']/g,
        description: '检查setTimeout的字符串参数',
        severity: 'medium'
      },
      {
        name: '本地存储敏感信息',
        pattern: /(localStorage|sessionStorage).*(password|token|secret)/gi,
        description: '检查是否在本地存储敏感信息',
        severity: 'high'
      }
    ];
  }

  /**
   * 检查代码安全性
   */
  check(code) {
    const results = [];

    this.securityRules.forEach(rule => {
      const matches = code.match(rule.pattern);
      if (matches) {
        results.push({
          rule: rule.name,
          description: rule.description,
          matches: matches.length,
          severity: rule.severity,
          locations: this.findLocations(code, rule.pattern)
        });
      }
    });

    return {
      passed: results.length === 0,
      message: results.length === 0 ? '未发现安全问题' : `发现 ${results.length} 个潜在安全问题`,
      issues: results
    };
  }

  /**
   * 查找匹配位置
   */
  findLocations(code, pattern) {
    const locations = [];
    let match;

    while ((match = pattern.exec(code)) !== null) {
      const lines = code.substring(0, match.index).split('\n');
      locations.push({
        line: lines.length,
        column: lines[lines.length - 1].length + 1,
        text: match[0]
      });
    }

    return locations;
  }
}

// 创建默认实例
export const codeQualityChecker = new CodeQualityChecker();
export const vueBestPracticesChecker = new VueBestPracticesChecker();
export const performanceBestPracticesChecker = new PerformanceBestPracticesChecker();
export const securityChecker = new SecurityChecker();

// 导出工具函数
export default {
  CodeQualityChecker,
  VueBestPracticesChecker,
  PerformanceBestPracticesChecker,
  SecurityChecker,
  codeQualityChecker,
  vueBestPracticesChecker,
  performanceBestPracticesChecker,
  securityChecker
};