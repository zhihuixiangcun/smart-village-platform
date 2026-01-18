                                                           # 智慧乡村AIGC智能体协作开发指南

> 基于150+专业智能体的自动化协作系统

## 核心原则

```mermaid
flowchart LR
    Start[启动项目] --> Align[Align 对齐]
    Align --> Architect[Architect 架构]
    Architect --> Atomize[Atomize 拆分]
    Atomize --> Approve[Approve 审批]
    Approve --> Automate[Automate 开发]
    Automate --> Assess[Assess 验收]
```

**四阶段工作流**
1. `/规划` → 产品规划 + 架构设计 → `PRD.md` + 架构图
2. `/设计` → 详细设计 + 原型开发 → `DESIGN_SPEC.md` + 设计稿
3. `/开发` → 开发实现 + 代码集成 → 完整代码 + 测试套件
4. `/测试部署` → 质量保障 + 上线运维 → 可运行应用 + 文档

**决策规则**
- ✅ 用户确认后才进入下一阶段
- ✅ 智能体组合优先于单智能体
- ✅ 文档与代码同步生成
- ⚠️ 遇到歧义立即询问用户

## 智能体快速索引

### 元数据标签系统

| 标签 | 说明 | 智能体 |
|------|------|--------|
| `#arch` | 架构设计 | backend-architect, frontend-developer, cloud-architect, graphql-architect, architecture-reviewer, api-design |
| `#code` | 编码实现 | python-pro, javascript-pro, typescript-pro, golang-pro, java-pro, c-pro, cpp-pro, csharp-pro, php-pro, ruby-pro, rust-pro, elixir-pro, scala-pro |
| `#devops` | 运维部署 | deployment-engineer, terraform-specialist, devops-troubleshooter, cloud-architect, network-engineer, incident-responder |
| `#test` | 测试质量 | test-automator, security-auditor, code-reviewer, performance-engineer, debugger, error-detective, code-review-excellence |
| `#data` | 数据处理 | data-engineer, data-scientist, sql-pro, database-admin, database-optimizer |
| `#ai` | 人工智能 | ai-engineer, ml-engineer, mlops-engineer, prompt-engineer |
| `#ui` | 界面设计 | ui-ux-designer, frontend-ui-ux-engineer, frontend-design, axiom-ios-ui, axiom-swiftui-nav |
| `#docs` | 文档编写 | docs-architect, api-documenter, tutorial-engineer, reference-builder |
| `#mobile` | 移动开发 | mobile-developer, flutter-expert, ios-developer, iosdev-cn |
| `#biz` | 商业分析 | business-analyst, legal-advisor, content-marketer, sales-automator, customer-support, product-manager-expert |
| `#design-patterns` | 设计模式 | 27-design-patterns |
| `#planning` | 项目规划 | brainstorming, planning, writing-plans, coding-plan, flow-plan, omo-agents |
| `#principles` | 设计原则 | principle-dry, principle-kiss, principle-solid, principle-yagni |
| `#security` | 安全验证 | defense-in-depth, defense-in-depth-validation, security-auditor |
| `#quality` | 质量保证 | quality-standards, thoroughness, systematic-debugging, verification-before-completion |
| `#collaboration` | 协作流程 | 6A工作流项目规则, 敏捷开发5S个人规则, using-git-worktrees, hive-workflow |
| `#specialized` | 专项技能 | smart-village-specialist, rural-fintech-specialist, sage-rust-conventions, cleanddd-kotlin-coding |
| `#infrastructure` | 基础设施 | environment-config-generator, session-template, context-manager |
| `#skills-management` | 技能管理 | skill-creator, skill-share, using-superpowers |

### 智能体调用决策树

```
需要做什么？
├─ 创意/设计?
│  ├─ 头脑风暴 → brainstorming
│  ├─ 需求分析 → brainstorming
│  ├─ UI/UX设计 → ui-ux-designer, frontend-design, frontend-ui-ux-engineer, ui-ux-pro-max
│  ├─ Web界面设计 → frontend-design
│  └─ 原型构建 → frontend-ui-ux-engineer
│
├─ 新项目/新功能架构?
│  ├─ 后端API → backend-architect, backend-microservice-development
│  ├─ 前端架构 → frontend-developer
│  ├─ 云架构 → cloud-architect
│  ├─ 数据架构 → data-engineer
│  ├─ GraphQL架构 → graphql-architect
│  ├─ API设计 → api-design
│  └─ 设计模式 → 27-design-patterns
│
├─ 编写代码?
│  ├─ Python → python-pro, python-sandbox
│  ├─ JavaScript/Node → javascript-pro
│  ├─ TypeScript → typescript-pro
│  ├─ Go → golang-pro
│  ├─ Java → java-pro
│  ├─ C/C++/C# → c-pro/cpp-pro/csharp-pro
│  ├─ Ruby/PHP/Rust → ruby-pro/php-pro/rust-pro
│  ├─ Elixir/Scala → elixir-pro/scala-pro
│  ├─ CleanDDD Kotlin → cleanddd-kotlin-coding
│  └─ Rust规范 → sage-rust-conventions
│
├─ 部署运维?
│  ├─ CI/CD配置 → deployment-engineer
│  ├─ Docker/K8s → deployment-engineer
│  ├─ 基础设施IaC → terraform-specialist
│  ├─ 云架构设计 → cloud-architect
│  ├─ 生产问题 → devops-troubleshooter
│  ├─ 网络问题 → network-engineer
│  ├─ 生产事故 → incident-responder
│  └─ 数据库运维 → database-admin
│
├─ 测试质量?
│  ├─ 写测试 → test-automator
│  ├─ TDD开发 → test-driven-development
│  ├─ 安全审计 → security-auditor
│  ├─ 代码审查 → code-reviewer, code-review-excellence
│  ├─ 性能优化 → performance-engineer
│  ├─ 调试Bug → debugger, debugging-strategies, systematic-debugging
│  └─ 错误检测 → error-detective
│
├─ 数据处理?
│  ├─ ETL管道 → data-engineer
│  ├─ 数据分析 → data-scientist
│  ├─ SQL优化 → sql-pro, database-optimizer
│  ├─ 数据库设计 → database-admin
│  ├─ 机器学习 → ml-engineer
│  └─ ML运维 → mlops-engineer
│
├─ AI功能?
│  ├─ LLM应用 → ai-engineer
│  ├─ 提示词优化 → prompt-engineer
│  └─ AI辅助编程 → vibevibe
│
├─ 文档编写?
│  ├─ 技术文档 → docs-architect
│  ├─ API文档 → api-documenter
│  ├─ 教程指南 → tutorial-engineer
│  ├─ 参考手册 → reference-builder
│  └─ 变更公告 → create-changelog-announcement
│
├─ 移动端?
│  ├─ 跨平台 → mobile-developer
│  ├─ Flutter → flutter-expert
│  ├─ iOS开发 → ios-developer, iosdev-cn
│  ├─ iOS UI → axiom-ios-ui
│  ├─ iOS导航 → axiom-swiftui-nav
│  ├─ React Native → mobile-developer
│  └─ Unity游戏 → unity-developer
│
├─ Web前端?
│  ├─ React/Next.js → typescript-pro, vercel-react-best-practices, react-best-practices
│  ├─ UI/UX设计 → frontend-design, frontend-ui-ux-engineer, ui-ux-pro-max
│  ├─ Web设计规范 → web-design-guidelines
│  └─ 结构化数据 → structured-data
│
├─ 其他专业领域?
│  ├─ 法律合规 → legal-advisor
│  ├─ 内容营销 → content-marketer, sales-automator
│  ├─ 商业分析 → business-analyst
│  ├─ 客户支持 → customer-support
│  ├─ 量化分析 → quant-analyst, risk-manager
│  ├─ 智慧村庄 → smart-village-specialist
│  ├─ 乡村金融 → rural-fintech-specialist
│  ├─ 支付集成 → payment-integration
│  ├─ 搜索专家 → search-specialist
│  ├─ Minecraft插件 → minecraft-bukkit-pro
│  ├─ Mermaid图表 → mermaid-expert
│  └─ Obsidian模板 → obsidian_templater_use
│
├─ 开发流程与质量?
│  ├─ 项目规划 → planning, brainstorming, writing-plans, coding-plan, flow-plan
│  ├─ 代码质量 → quality-standards
│  ├─ 深度实现 → thoroughness
│  ├─ 完成前验证 → verification-before-completion
│  ├─ 防御式验证 → defense-in-depth, defense-in-depth-validation
│  ├─ Bug修复 → fix-bug, systematic-debugging
│  ├─ 开发分支完成 → finishing-a-development-branch
│  ├─ Git工作树 → using-git-worktrees
│  ├─ 环境配置 → environment-config-generator
│  ├─ 会话管理 → session-template, context-manager
│  ├─ 任务管理 → hive-workflow
│  ├─ 并行代理调度 → dispatching-parallel-agents
│  ├─ 子代理驱动 → subagent-driven-development
│  ├─ 执行计划 → executing-plans
│  ├─ 接收代码审查 → receiving-code-review
│  ├─ 请求代码审查 → requesting-code-review
│  └─ 跨平台守护 → cross-platform-guardian
│
├─ 技能管理?
│  ├─ 创建技能 → skill-creator
│  ├─ 分享技能 → skill-share
│  ├─ 编写技能文档 → writing-skills
│  └─ 使用Superpowers → using-superpowers, superpowers-factory-bridge
│
└─ 多代理协作?
   ├─ OMO协调 → omo, omo-agents
   ├─ Explore代理 → explore
   ├─ Librarian代理 → librarian
   ├─ Oracle顾问 → oracle
   ├─ Document Writer → document-writer
   ├─ Frontend Engineer → frontend-ui-ux-engineer
   └─ Multimodal Looker → multimodal-looker
```

### 智能体组合模式

**场景1：开发新功能**
```
backend-architect (架构) → python-pro (后端) → frontend-developer (前端)
  → test-automator (测试) → code-reviewer (审查)
```

**场景2：性能优化**
```
performance-engineer (分析) → database-optimizer (DB) → sql-pro (SQL)
  → code-reviewer (审查)
```

**场景3：AI功能开发**
```
ai-engineer (LLM应用) + data-engineer (数据管道) + prompt-engineer (提示词)
  → ml-engineer (模型) → test-automator (测试)
```

**场景4：完整功能上线**
```
ui-ux-designer (设计) → [python-pro | typescript-pro] (开发)
  → test-automator (测试) → security-auditor (安全) → deployment-engineer (部署)
  → docs-architect (文档)
```

**场景5：数据中台构建**
```
data-engineer (ETL管道) → database-admin (数据库) → data-scientist (分析)
  → ml-engineer (模型) → api-documenter (文档)
```

**场景6：微服务架构升级**
```
cloud-architect (云架构) → backend-architect (服务拆分) → graphql-architect (接口)
  → deployment-engineer (部署) → terraform-specialist (IaC)
```

**场景7：AI功能开发（增强版）**
```
brainstorming (需求分析) → ai-engineer (LLM应用) + data-engineer (数据管道)
  → prompt-engineer (提示词优化) → test-automator (测试)
  → code-review-excellence (代码审查)
```

**场景8：移动端应用开发**
```
ui-ux-designer (设计) → ios-developer (iOS开发) + axiom-ios-ui (UI优化)
  → test-automator (测试) → security-auditor (安全) → docs-architect (文档)
```

**场景9：前后端全栈开发**
```
brainstorming (需求) → backend-architect (后端架构) + frontend-developer (前端架构)
  → [python-pro | typescript-pro] (开发) → test-automator (测试)
  → deployment-engineer (部署) → docs-architect (文档)
```

**场景10：代码质量提升**
```
code-review-excellence (建立标准) → code-reviewer (审查)
  → quality-standards (质量检查) → systematic-debugging (调试)
  → principle-solid (架构改进)
```

## 6A工作流规则

### Align 对齐
**目标**: 模糊需求 → 精确规范

**执行清单**:
- [ ] 项目上下文分析（结构、技术栈、架构模式、依赖、业务域）
- [ ] 需求理解确认 → `docs/任务名/ALIGNMENT_[任务名].md`
- [ ] 智能决策策略（自动决策或询问用户）
- [ ] 生成共识 → `docs/任务名/CONSENSUS_[任务名].md`

**质量门控**:
- 需求边界清晰无歧义
- 技术方案与现有架构对齐
- 验收标准具体可测试
- 所有关键假设已确认
- 项目特性规范已对齐

### Architect 架构
**目标**: 共识 → 系统设计

**执行清单**:
- [ ] 系统分层设计
- [ ] 生成设计文档 → `docs/任务名/DESIGN_[任务名].md` (含mermaid图)
- [ ] 模块依赖关系图
- [ ] 接口契约定义
- [ ] 数据流向图
- [ ] 异常处理策略

**质量门控**:
- 架构图清晰准确
- 接口定义完整
- 与现有系统无冲突
- 设计可行性验证

### Atomize 拆分
**目标**: 设计 → 原子任务

**执行清单**:
- [ ] 子任务拆分 → `docs/任务名/TASK_[任务名].md`
- [ ] 每任务包含: 输入契约(前置/数据/环境)、输出契约(数据/交付物/验收)、实现约束(技术/接口/质量)、依赖关系
- [ ] 生成任务依赖图(mermaid)

**质量门控**:
- 任务覆盖完整需求
- 依赖关系无循环
- 每个任务都可独立验证
- 复杂度评估合理

### Approve 审批
**目标**: 任务清单 → 确认执行

**执行清单**:
- [ ] 检查清单: 完整性、一致性、可行性、可控性、可测性
- [ ] 最终确认: 需求、任务、边界、验收标准、质量标准

### Automate 执行
**目标**: 按任务 → 编写代码

**执行清单**:
- [ ] 执行前检查（输入、环境、依赖）
- [ ] 编写测试优先（边界、异常）
- [ ] 实现核心逻辑
- [ ] 运行验证测试
- [ ] 更新文档

**代码质量要求**:
- 严格遵循现有代码规范
- 保持代码风格一致
- 使用现有工具和库
- 复用现有组件
- 代码精简易读
- API密钥放到.env不提交git

### Assess 评估
**目标**: 代码 → 质量验收

**执行清单**:
- [ ] 验收检查: 需求、标准、编译、测试、功能、一致性
- [ ] 质量评估: 代码(规范/可读性/复杂度)、测试(覆盖率/有效性)、文档(完整性/准确性)、集成、技术债
- [ ] 生成报告: `docs/任务名/FINAL_[任务名].md`
- [ ] 生成TODO: `docs/任务名/TODO_[任务名].md`（待办事宜、缺少配置）

## 敏捷5S规则

### 文档管理规范
- [ ] 新项目启动必创建「说明文档.md」
- [ ] 文档包含: 规划、方案、进度(含时间节点)
- [ ] 重启项目先读文档确认进度
- [ ] 完成任务立即标记并更新文档

### 开发流程规范
- [ ] 顺序思考 → ToDoList → 按优先级执行
- [ ] 完成一项标记"已完成" → 无遗留 → 下一项

### 问题解决规范
- [ ] 优先工具查找文档、示例
- [ ] 查官方文档(Python.org/Oracle等)
- [ ] 严禁编造代码或方案

### 执行约束规范
- ❌ 禁止项目延期（识别风险调整计划）
- ❌ 禁止超出计划（扩容先更新规划）
- ❌ 禁止出错（多轮自检、暂停修复）

### 环境与输出规范
- ✅ 固定使用win系统开发
- ✅ 所有函数必须添加注释(功能、参数、返回值)

## AI工作个人规则

### 交互风格
- 简洁直接，无前言后语
- 单次响应≤4行（不含工具/代码）
- 1-3句回答，除非用户要求详细
- 无表情符号（除非用户要求）

### 代码开发
- 零注释（除非用户要求）
- 查看现有文件了解约定
- 遵循项目风格和模式
- 使用现有库和工具
- 前端优先组合式API
- 不暴露/记录密钥
- 不提交敏感文件(.env, credentials.json)

### 工作流程
1. 理解需求 → Glob/Grep/Read
2. 实现方案 → 所有可用工具
3. 验证方案 → 测试（如可能）
4. 质量检查 → lint/typecheck（找不到命令问用户，建议写入AGENTS.md）

### Git规则 (CRITICAL)
- **永不主动提交**，仅用户明确要求时
- 永不更新git配置
- 永不运行破坏性/不可逆命令（除非用户要求）
- 永不跳过hooks（除非用户要求）
- 永不强制推送main/master（用户要求则警告）
- `--amend`仅满足: 用户要求 OR hook自动修改 + 本次会话创建 + 未推送
- 提交失败/hook拒绝 → 绝不amend → 修复并创建新提交
- 已推送 → 绝不amend（除非用户要求强制推送）

### Git提交流程（用户要求时）
1. 并行: `git status`, `git diff`, `git log`
2. 分析staged更改，起草message
3. 不提交机密文件，警告用户
4. 并行: add文件, commit, git status验证
5. hook失败 → 修复并创建新commit（遵循amend规则）

### 工具使用策略
- **批量调用**: 独立任务并行调用多个工具
- **正确工具**:
  - Bash: 终端操作(git/npm/docker)
  - Read/Glob/Grep: 文件操作(不用bash的cat/head/tail/grep/rg/find)
  - Edit: 编辑文件(不用sed/awk)
  - Write: 新文件(仅明确要求)
- **Bash特殊规则**:
  - 不用find/ls → Glob
  - 不用grep → Grep
  - 不用cat/head/tail → Read
  - 不用sed/awk → Edit
  - 不用echo/printf → Write
  - 独立命令并行，依赖命令&&链式

### 复杂任务
- Task工具进行多步骤任务/开放搜索
- >3步骤复杂任务使用TodoWrite
- 开始前创建todo list

### 拒绝恶意代码
- 拒绝编写/解释恶意代码
- 即使声称教育目的
- 文件像恶意软件则拒绝

## 技术执行规范

### 安全规范
- API密钥等使用.env文件管理
- 代码变更同时更新文档
- 测试优先（先写测试后写实现）
- 边界覆盖（正常、边界、异常）

## 文件系统

**智能体路径**: `.claude/skills/`

**调用方式**:
```bash
skill backend-architect    # 调用后端架构师
skill python-pro           # 调用Python专家
skill security-auditor     # 调用安全审计
```

**目录结构**:
```
.claude/skills/
├── 27-design-patterns/
├── 41-openapi-module-architecture/
├── 6A工作流项目规则.md
├── ai-engineer/
├── api-design/
├── api-documenter/
├── architect-reviewer/
├── axiom-ios-ui/
├── axiom-swiftui-nav/
├── backend-architect/
├── backend-microservice-development/
├── brainstorming/
├── business-analyst/
├── claude.ai/
├── cleanddd-kotlin-coding/
├── cloud-architect/
├── code-review-excellence/
├── code-reviewer/
├── coding-plan/
├── content-marketer/
├── context-hunter/
├── context-manager/
├── cpp-pro/
├── c-pro/
├── create-changelog-announcement/
├── cross-platform-guardian/
├── csharp-pro/
├── customer-support/
├── database-admin/
├── database-optimizer/
├── data-engineer/
├── data-scientist/
├── debugger/
├── debugging-strategies/
├── defense-in-depth/
├── defense-in-depth-validation/
├── deployment-engineer/
├── devops-troubleshooter/
├── dispatching-parallel-agents/
├── docs-architect/
├── droid-bin-mod/
├── dx-optimizer/
├── dynamic/
├── elixir-pro/
├── embedded-thinking/
├── environment-config-generator/
├── error-detective/
├── executing-plans/
├── finishing-a-development-branch/
├── fix/
├── fix-bug/
├── flow-plan/
├── flutter-expert/
├── fpf-review/
├── frontend-design/
├── frontend-developer/
├── golang-pro/
├── graphql-architect/
├── hive-workflow/
├── implementing-from-task/
├── incident-responder/
├── iosdev-cn/
├── ios-developer/
├── java-pro/
├── javascript-pro/
├── legacy-modernizer/
├── legal-advisor/
├── memory-safety-patterns/
├── mermaid-expert/
├── minecraft-bukkit-pro/
├── ml-engineer/
├── mlops-engineer/
├── mobile-developer/
├── network-engineer/
├── obsidian-templater-use/
├── omo/
├── omo-agents/
├── oracle/
├── payment-integration/
├── performance-engineer/
├── php-pro/
├── planning/
├── principle-dry/
├── principle-kiss/
├── principle-solid/
├── principle-yagni/
├── product manager expert/
├── prompt-engineer/
├── python-pro/
├── python-sandbox/
├── quality-standards/
├── quant-analyst/
├── react-best-practices/
├── reactumg-knowledge/
├── receiving-code-review/
├── reference-builder/
├── requesting-code-review/
├── risk-manager/
├── ruby-pro/
├── rural-fintech-specialist/
├── rust-pro/
├── sage-rust-conventions/
├── sales-automator/
├── scala-pro/
├── scarches-docs-complete/
├── script-test/
├── search-specialist/
├── security-auditor/
├── session-template/
├── skill-creator/
├── skill-share/
├── smart-village-specialist/
├── sql-pro/
├── structured-data/
├── subagent-driven-development/
├── superpowers-factory-bridge/
├── systematic-debugging/
├── template/
├── terraform-specialist/
├── test-automator/
├── test-driven-development/
├── thoroughness/
├── tutorial-engineer/
├── typescript-pro/
├── ui-ux-designer/
├── ui-ux-pro-max/
├── unity-developer/
├── using-git-worktrees/
├── using-superpowers/
├── vercel-deploy-claimable/
├── vercel-react-best-practices/
├── verification-before-completion/
├── vibevibe/
├── web-artifacts-builder/
├── web-design-guidelines/
├── writing-plans/
├── writing-skills/
├── 敏捷开发5S个人规则.md
└── ... (共150+个智能体)
```

---
**最后更新**: 2026-01-17
**核心理念**: 将150+个专家智能体根据项目需求灵活组合调用，实现高效、专业的协同开发

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: `npx openskills read <skill-name>` (run in your shell)
  - For multiple: `npx openskills read skill-one,skill-two`
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>27-design-patterns</name>
<description>BK-CI 项目设计模式实践指南，涵盖工厂模式、策略模式、观察者模式、装饰器模式、模板方法等在项目中的实际应用。当用户学习设计模式、重构代码、设计可扩展架构或理解项目设计时使用。</description>
<location>project</location>
</skill>

<skill>
<name>41-openapi-module-architecture</name>
<description>OpenAPI 开放接口模块架构指南，涵盖 API 网关、接口鉴权、限流配置、SDK 生成、API 文档。当用户开发开放 API、配置接口鉴权、实现限流策略或生成 SDK 时使用。</description>
<location>project</location>
</skill>

<skill>
<name>ai-engineer</name>
<description>Build LLM applications, RAG systems, and prompt pipelines. Implements vector search, agent orchestration, and AI API integrations. Use PROACTIVELY for LLM features, chatbots, or AI-powered applications.</description>
<location>project</location>
</skill>

<skill>
<name>api-design</name>
<description>RESTful API 设计最佳实践。当用户需要设计 API 接口、定义端点规范、编写 API 文档、或评估现有 API 设计时使用此技能。</description>
<location>project</location>
</skill>

<skill>
<name>api-documenter</name>
<description>Create OpenAPI/Swagger specs, generate SDKs, and write developer documentation. Handles versioning, examples, and interactive docs. Use PROACTIVELY for API documentation or client library generation.</description>
<location>project</location>
</skill>

<skill>
<name>architect-reviewer</name>
<description>Reviews code changes for architectural consistency and patterns. Use PROACTIVELY after any structural changes, new services, or API modifications. Ensures SOLID principles, proper layering, and maintainability.</description>
<location>project</location>
</skill>

<skill>
<name>axiom-ios-ui</name>
<description>Use when building, fixing, or improving ANY iOS UI including SwiftUI, UIKit, layout, navigation, animations, design guidelines. Covers view updates, layout bugs, navigation issues, performance, architecture, Apple design compliance.</description>
<location>project</location>
</skill>

<skill>
<name>axiom-swiftui-nav</name>
<description>Use when implementing navigation patterns, choosing between NavigationStack and NavigationSplitView, handling deep links, adopting coordinator patterns, or requesting code review of navigation implementation - prevents navigation state corruption, deep link failures, and state restoration bugs for iOS 18+</description>
<location>project</location>
</skill>

<skill>
<name>backend-architect</name>
<description>Design RESTful APIs, microservice boundaries, and database schemas. Reviews system architecture for scalability and performance bottlenecks. Use PROACTIVELY when creating new backend services or APIs.</description>
<location>project</location>
</skill>

<skill>
<name>backend-microservice-development</name>
<description>后端微服务开发规范，涵盖目录结构、分层架构（API/Service/DAO）、依赖注入、配置管理、Spring Boot 最佳实践。当用户进行后端开发、创建新微服务、编写 Kotlin/Java 代码或设计服务架构时使用。</description>
<location>project</location>
</skill>

<skill>
<name>brainstorming</name>
<description>"You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."</description>
<location>project</location>
</skill>

<skill>
<name>business-analyst</name>
<description>Analyze metrics, create reports, and track KPIs. Builds dashboards, revenue models, and growth projections. Use PROACTIVELY for business metrics or investor updates.</description>
<location>project</location>
</skill>

<skill>
<name>c-pro</name>
<description>Write efficient C code with proper memory management, pointer arithmetic, and system calls. Handles embedded systems, kernel modules, and performance-critical code. Use PROACTIVELY for C optimization, memory issues, or system programming.</description>
<location>project</location>
</skill>

<skill>
<name>claude.ai</name>
<description>Deploy applications and websites to Vercel instantly. Designed for use with claude.ai and Claude Desktop to enable deployments directly from conversations. Deployments are "claimable" - users can transfer ownership to their own Vercel account.</description>
<location>project</location>
</skill>

<skill>
<name>cleanddd-kotlin-coding</name>
<description>在 only-danmuku 的 CleanDDD Kotlin 项目中编写或修改聚合/命令/查询/API 端点/事件/防腐层 Client/仓储/配置/测试时使用；遵循 代码实现规约.md 与 design/_gen + genDesign 的生成流程。</description>
<location>project</location>
</skill>

<skill>
<name>cloud-architect</name>
<description>Design AWS/Azure/GCP infrastructure, implement Terraform IaC, and optimize cloud costs. Handles auto-scaling, multi-region deployments, and serverless architectures. Use PROACTIVELY for cloud infrastructure, cost optimization, or migration planning.</description>
<location>project</location>
</skill>

<skill>
<name>code-review-excellence</name>
<description>Master effective code review practices to provide constructive feedback, catch bugs early, and foster knowledge sharing while maintaining team morale. Use when reviewing pull requests, establishing review standards, or mentoring developers.</description>
<location>project</location>
</skill>

<skill>
<name>code-reviewer</name>
<description>Expert code review specialist. Proactively reviews code for quality, security, and maintainability. Use immediately after writing or modifying code.</description>
<location>project</location>
</skill>

<skill>
<name>coding-plan</name>
<description>Write clear, actionable coding plans for implementing features, bug fixes, and improvements. Use when planning code changes, designing implementation strategy, sequencing file modifications, or providing step-by-step implementation guidance.</description>
<location>project</location>
</skill>

<skill>
<name>content-marketer</name>
<description>Write blog posts, social media content, and email newsletters. Optimizes for SEO and creates content calendars. Use PROACTIVELY for marketing content or social media posts.</description>
<location>project</location>
</skill>

<skill>
<name>context-hunter</name>
<description>Discover codebase patterns, conventions, and unwritten rules before making changes. Use when implementing features, fixing bugs, or refactoring code.</description>
<location>project</location>
</skill>

<skill>
<name>context-manager</name>
<description>Manages context across multiple agents and long-running tasks. Use when coordinating complex multi-agent workflows or when context needs to be preserved across multiple sessions. MUST BE USED for projects exceeding 10k tokens.</description>
<location>project</location>
</skill>

<skill>
<name>cpp-pro</name>
<description>Write idiomatic C++ code with modern features, RAII, smart pointers, and STL algorithms. Handles templates, move semantics, and performance optimization. Use PROACTIVELY for C++ refactoring, memory safety, or complex C++ patterns.</description>
<location>project</location>
</skill>

<skill>
<name>create-changelog-announcement</name>
<description>Use this skill to create and publish changelog announcements for new features, improvements, or bug fixes. This skill handles the complete workflow - creating detailed changelog documentation pages, adding sidebar announcement cards, and ensuring everything follows project standards. Use when the user mentions adding changelog entries, documenting new features, creating release notes, or announcing product updates.</description>
<location>project</location>
</skill>

<skill>
<name>cross-platform-guardian</name>
<description>Ensure cross-platform compatibility across macOS (Intel/ARM), Ubuntu, and Fedora for this dotfiles repository. Detects and auto-fixes hardcoded paths, platform-specific assumptions, package availability issues, and test coverage gaps. Use when adding features, updating configs, bumping Nix flake, or investigating platform-specific bugs. Keywords: cross-platform, compatibility, macOS, Linux, Ubuntu, Fedora, platform, portability, Nix flake, Docker test, CI</description>
<location>project</location>
</skill>

<skill>
<name>csharp-pro</name>
<description>Write modern C# code with advanced features like records, pattern matching, and async/await. Optimizes .NET applications, implements enterprise patterns, and ensures comprehensive testing. Use PROACTIVELY for C# refactoring, performance optimization, or complex .NET solutions.</description>
<location>project</location>
</skill>

<skill>
<name>customer-support</name>
<description>Handle support tickets, FAQ responses, and customer emails. Creates help docs, troubleshooting guides, and canned responses. Use PROACTIVELY for customer inquiries or support documentation.</description>
<location>project</location>
</skill>

<skill>
<name>data-engineer</name>
<description>Build ETL pipelines, data warehouses, and streaming architectures. Implements Spark jobs, Airflow DAGs, and Kafka streams. Use PROACTIVELY for data pipeline design or analytics infrastructure.</description>
<location>project</location>
</skill>

<skill>
<name>data-scientist</name>
<description>Data analysis expert for SQL queries, BigQuery operations, and data insights. Use proactively for data analysis tasks and queries.</description>
<location>project</location>
</skill>

<skill>
<name>database-admin</name>
<description>Manage database operations, backups, replication, and monitoring. Handles user permissions, maintenance tasks, and disaster recovery. Use PROACTIVELY for database setup, operational issues, or recovery procedures.</description>
<location>project</location>
</skill>

<skill>
<name>database-optimizer</name>
<description>Optimize SQL queries, design efficient indexes, and handle database migrations. Solves N+1 problems, slow queries, and implements caching. Use PROACTIVELY for database performance issues or schema optimization.</description>
<location>project</location>
</skill>

<skill>
<name>debugger</name>
<description>Debugging specialist for errors, test failures, and unexpected behavior. Use proactively when encountering any issues.</description>
<location>project</location>
</skill>

<skill>
<name>debugging-strategies</name>
<description>Master systematic debugging techniques, profiling tools, and root cause analysis to efficiently track down bugs across any codebase or technology stack. Use when investigating bugs, performance issues, or unexpected behavior.</description>
<location>project</location>
</skill>

<skill>
<name>defense-in-depth</name>
<description>Use when invalid data causes failures deep in execution, requiring validation at multiple system layers - validates at every layer data passes through to make bugs structurally impossible</description>
<location>project</location>
</skill>

<skill>
<name>defense-in-depth-validation</name>
<description>Validate at every layer data passes through to make bugs impossible</description>
<location>project</location>
</skill>

<skill>
<name>deployment-engineer</name>
<description>Configure CI/CD pipelines, Docker containers, and cloud deployments. Handles GitHub Actions, Kubernetes, and infrastructure automation. Use PROACTIVELY when setting up deployments, containers, or CI/CD workflows.</description>
<location>project</location>
</skill>

<skill>
<name>devops-troubleshooter</name>
<description>Debug production issues, analyze logs, and fix deployment failures. Masters monitoring tools, incident response, and root cause analysis. Use PROACTIVELY for production debugging or system outages.</description>
<location>project</location>
</skill>

<skill>
<name>dispatching-parallel-agents</name>
<description>Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies</description>
<location>project</location>
</skill>

<skill>
<name>docs-architect</name>
<description>Creates comprehensive technical documentation from existing codebases. Analyzes architecture, design patterns, and implementation details to produce long-form technical manuals and ebooks. Use PROACTIVELY for system documentation, architecture guides, or technical deep-dives.</description>
<location>project</location>
</skill>

<skill>
<name>droid-bin-mod</name>
<description>修改 droid 二进制以禁用截断。当用户提到：修改/恢复/测试 droid、press Ctrl+O、output truncated、显示完整命令或输出时触发。</description>
<location>project</location>
</skill>

<skill>
<name>dx-optimizer</name>
<description>Developer Experience specialist. Improves tooling, setup, and workflows. Use PROACTIVELY when setting up new projects, after team feedback, or when development friction is noticed.</description>
<location>project</location>
</skill>

<skill>
<name>dynamic</name>
<description>|</description>
<location>project</location>
</skill>

<skill>
<name>elixir-pro</name>
<description>Write idiomatic Elixir code with OTP patterns, supervision trees, and Phoenix LiveView. Masters concurrency, fault tolerance, and distributed systems. Use PROACTIVELY for Elixir refactoring, OTP design, or complex BEAM optimizations.</description>
<location>project</location>
</skill>

<skill>
<name>embedded-thinking</name>
<description>提供嵌入式系统软硬件协同思考框架，涵盖硬件层、软件架构、资源约束、实时性、测试调试五大维度。当需要设计嵌入式应用、评审物联网系统、或需要全局视角审视 MCU/MPU 与软件配合时使用。支持裸机/RTOS 选型、功耗优化、内存预算、中断响应、OTA 升级等嵌入式特有场景决策。</description>
<location>project</location>
</skill>

<skill>
<name>environment-config-generator</name>
<description>生成多环境配置清单和dotenv模板文件，确保dev/test/staging/prod环境配置完整。当需要创建环境配置、生成.env.example模板、文档化测试框架setup、映射CI环境变量时使用。解决dotenv经常被忽视的痛点。</description>
<location>project</location>
</skill>

<skill>
<name>error-detective</name>
<description>Search logs and codebases for error patterns, stack traces, and anomalies. Correlates errors across systems and identifies root causes. Use PROACTIVELY when debugging issues, analyzing logs, or investigating production errors.</description>
<location>project</location>
</skill>

<skill>
<name>executing-plans</name>
<description>Use when you have a written implementation plan to execute in a separate session with review checkpoints</description>
<location>project</location>
</skill>

<skill>
<name>finishing-a-development-branch</name>
<description>Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup</description>
<location>project</location>
</skill>

<skill>
<name>fix</name>
<description>Meta-skill workflow orchestrator for bug investigation and resolution. Routes to debug, implement, test, and commit based on scope.</description>
<location>project</location>
</skill>

<skill>
<name>fix-bug</name>
<description>|</description>
<location>project</location>
</skill>

<skill>
<name>flow-plan</name>
<description>Create structured build plans from feature requests, bug reports, or Beads issue IDs. Use when planning features, designing implementation, preparing work breakdown, or when given a bead/issue ID to plan. Triggers on /flow:plan with text descriptions or issue IDs (e.g., bd-123, gno-45, app-12).</description>
<location>project</location>
</skill>

<skill>
<name>flutter-expert</name>
<description>Master Flutter development with Dart, widgets, and platform integrations. Handles state management, animations, testing, and performance optimization. Deploys to iOS, Android, Web, and desktop. Use PROACTIVELY for Flutter architecture, UI implementation, or cross-platform features.</description>
<location>project</location>
</skill>

<skill>
<name>fpf-review</name>
<description>|</description>
<location>project</location>
</skill>

<skill>
<name>frontend-design</name>
<description>高质量前端界面设计与高保真原型构建指南。适用于构建 Web 组件、复杂页面、仪表板，或根据 PRD 生成全功能原型。强调现代美学、用户体验、代码质量及完整的工程化结构。</description>
<location>project</location>
</skill>

<skill>
<name>frontend-developer</name>
<description>Build React components, implement responsive layouts, and handle client-side state management. Optimizes frontend performance and ensures accessibility. Use PROACTIVELY when creating UI components or fixing frontend issues.</description>
<location>project</location>
</skill>

<skill>
<name>golang-pro</name>
<description>Write idiomatic Go code with goroutines, channels, and interfaces. Optimizes concurrency, implements Go patterns, and ensures proper error handling. Use PROACTIVELY for Go refactoring, concurrency issues, or performance optimization.</description>
<location>project</location>
</skill>

<skill>
<name>graphql-architect</name>
<description>Design GraphQL schemas, resolvers, and federation. Optimizes queries, solves N+1 problems, and implements subscriptions. Use PROACTIVELY for GraphQL API design or performance issues.</description>
<location>project</location>
</skill>

<skill>
<name>hive-workflow</name>
<description>Issue tracking and task management using the hive system. Use when creating, updating, or managing work items. Use when you need to track bugs, features, tasks, or epics. Do NOT use for simple one-off questions or explorations.</description>
<location>project</location>
</skill>

<skill>
<name>implementing-from-task</name>
<description>测试中, 用户明确指定执行 implementing-from-task 时候才执行, 其余情况一律不执行</description>
<location>project</location>
</skill>

<skill>
<name>incident-responder</name>
<description>Handles production incidents with urgency and precision. Use IMMEDIATELY when production issues occur. Coordinates debugging, implements fixes, and documents post-mortems.</description>
<location>project</location>
</skill>

<skill>
<name>ios-developer</name>
<description>Develop native iOS applications with Swift/SwiftUI. Masters UIKit/SwiftUI, Core Data, networking, and app lifecycle. Use PROACTIVELY for iOS-specific features, App Store optimization, or native iOS development.</description>
<location>project</location>
</skill>

<skill>
<name>iosdev-cn</name>
<description>通用 iOS App 开发、构建、签名、测试与 App Store 上架流程（中国区）指南。用于当用户询问 iOS 开发/上架/审核/签名/TestFlight/App Store Connect/隐私合规/订阅配置，或输入触发词 iosdev 时。</description>
<location>project</location>
</skill>

<skill>
<name>java-pro</name>
<description>Master modern Java with streams, concurrency, and JVM optimization. Handles Spring Boot, reactive programming, and enterprise patterns. Use PROACTIVELY for Java performance tuning, concurrent programming, or complex enterprise solutions.</description>
<location>project</location>
</skill>

<skill>
<name>javascript-pro</name>
<description>Master modern JavaScript with ES6+, async patterns, and Node.js APIs. Handles promises, event loops, and browser/Node compatibility. Use PROACTIVELY for JavaScript optimization, async debugging, or complex JS patterns.</description>
<location>project</location>
</skill>

<skill>
<name>legacy-modernizer</name>
<description>Refactor legacy codebases, migrate outdated frameworks, and implement gradual modernization. Handles technical debt, dependency updates, and backward compatibility. Use PROACTIVELY for legacy system updates, framework migrations, or technical debt reduction.</description>
<location>project</location>
</skill>

<skill>
<name>legal-advisor</name>
<description>Draft privacy policies, terms of service, disclaimers, and legal notices. Creates GDPR-compliant texts, cookie policies, and data processing agreements. Use PROACTIVELY for legal documentation, compliance texts, or regulatory requirements.</description>
<location>project</location>
</skill>

<skill>
<name>memory-safety-patterns</name>
<description>Implement memory-safe programming with RAII, ownership, smart pointers, and resource management across Rust, C++, and C. Use when writing safe systems code, managing resources, or preventing memory bugs.</description>
<location>project</location>
</skill>

<skill>
<name>mermaid-expert</name>
<description>Create Mermaid diagrams for flowcharts, sequences, ERDs, and architectures. Masters syntax for all diagram types and styling. Use PROACTIVELY for visual documentation, system diagrams, or process flows.</description>
<location>project</location>
</skill>

<skill>
<name>minecraft-bukkit-pro</name>
<description>Master Minecraft server plugin development with Bukkit, Spigot, and Paper APIs. Specializes in event-driven architecture, command systems, world manipulation, player management, and performance optimization. Use PROACTIVELY for plugin architecture, gameplay mechanics, server-side features, or cross-version compatibility.</description>
<location>project</location>
</skill>

<skill>
<name>ml-engineer</name>
<description>Implement ML pipelines, model serving, and feature engineering. Handles TensorFlow/PyTorch deployment, A/B testing, and monitoring. Use PROACTIVELY for ML model integration or production deployment.</description>
<location>project</location>
</skill>

<skill>
<name>mlops-engineer</name>
<description>Build ML pipelines, experiment tracking, and model registries. Implements MLflow, Kubeflow, and automated retraining. Handles data versioning and reproducibility. Use PROACTIVELY for ML infrastructure, experiment management, or pipeline automation.</description>
<location>project</location>
</skill>

<skill>
<name>mobile-developer</name>
<description>Develop React Native or Flutter apps with native integrations. Handles offline sync, push notifications, and app store deployments. Use PROACTIVELY for mobile features, cross-platform code, or app optimization.</description>
<location>project</location>
</skill>

<skill>
<name>network-engineer</name>
<description>Debug network connectivity, configure load balancers, and analyze traffic patterns. Handles DNS, SSL/TLS, CDN setup, and network security. Use PROACTIVELY for connectivity issues, network optimization, or protocol debugging.</description>
<location>project</location>
</skill>

<skill>
<name>obsidian-templater-use</name>
<description>创建和使用 Obsidian Templater 模板，包括动态变量、JavaScript 代码、系统命令和高级模板功能。当用户提到模板、Templater、动态内容、自动化笔记创建或需要模板语法帮助时使用此技能。</description>
<location>project</location>
</skill>

<skill>
<name>omo</name>
<description>Use this skill when you see `/omo`. Multi-agent orchestration for "code analysis / bug investigation / fix planning / implementation". Choose the minimal agent set and order based on task type + risk; recipes below show common patterns.</description>
<location>project</location>
</skill>

<skill>
<name>omo-agents</name>
<description>|</description>
<location>project</location>
</skill>

<skill>
<name>oracle</name>
<description>|</description>
<location>project</location>
</skill>

<skill>
<name>payment-integration</name>
<description>Integrate Stripe, PayPal, and payment processors. Handles checkout flows, subscriptions, webhooks, and PCI compliance. Use PROACTIVELY when implementing payments, billing, or subscription features.</description>
<location>project</location>
</skill>

<skill>
<name>performance-engineer</name>
<description>Profile applications, optimize bottlenecks, and implement caching strategies. Handles load testing, CDN setup, and query optimization. Use PROACTIVELY for performance issues or optimization tasks.</description>
<location>project</location>
</skill>

<skill>
<name>php-pro</name>
<description>Write idiomatic PHP code with generators, iterators, SPL data structures, and modern OOP features. Use PROACTIVELY for high-performance PHP applications.</description>
<location>project</location>
</skill>

<skill>
<name>planning</name>
<description>Create comprehensive implementation plans for complex tasks. Use when in Plan mode, for new features, refactoring efforts, architecture changes, bug fixes with unclear scope, or any work touching multiple files/systems.</description>
<location>project</location>
</skill>

<skill>
<name>principle-dry</name>
<description>识别并消除知识重复，确保系统中每条知识有唯一权威表示。当需要重构代码、整理文档、优化配置、建立单一数据源时使用。覆盖代码重复、数据冗余、文档重复三大维度，提供具体消除策略和权衡建议。</description>
<location>project</location>
</skill>

<skill>
<name>principle-kiss</name>
<description>保持设计和实现的简单性，识别并消除不必要的复杂度。当需要架构设计评审、代码简化重构、接口设计优化时使用。覆盖代码、架构、接口、流程四大维度，提供简单性检查清单和过度复杂性的诊断修复方法。</description>
<location>project</location>
</skill>

<skill>
<name>principle-solid</name>
<description>应用面向对象设计五大原则（单一职责、开闭、里氏替换、接口隔离、依赖倒置），系统化评审类与模块设计质量。当需要评审架构设计、重构现有代码、审查类职责划分时使用。支持多层次检查清单和违反原则的诊断修复。</description>
<location>project</location>
</skill>

<skill>
<name>principle-yagni</name>
<description>识别并消除过度设计，确保只实现当前明确需要的功能。当需要评审功能范围、重构冗余代码、权衡技术债务时使用。覆盖功能必要性、过度设计信号、技术债务权衡三大维度，提供具体的识别标准和删减建议。</description>
<location>project</location>
</skill>

<skill>
<name>product manager expert</name>
<description></description>
<location>project</location>
</skill>

<skill>
<name>prompt-engineer</name>
<description>Optimizes prompts for LLMs and AI systems. Use when building AI features, improving agent performance, or crafting system prompts. Expert in prompt patterns and techniques.</description>
<location>project</location>
</skill>

<skill>
<name>python-pro</name>
<description>Write idiomatic Python code with advanced features like decorators, generators, and async/await. Optimizes performance, implements design patterns, and ensures comprehensive testing. Use PROACTIVELY for Python refactoring, optimization, or complex Python features.</description>
<location>project</location>
</skill>

<skill>
<name>python-sandbox</name>
<description>在沙盒环境中执行Python代码，用于数据分析、可视化和生成Excel、Word、PDF等文件。支持数据清洗、统计分析、机器学习、图表生成、文档自动化等复杂工作流。</description>
<location>project</location>
</skill>

<skill>
<name>quality-standards</name>
<description>质量标准 - 代码质量、设计模式和反模式的统一指南。包含 SOLID 原则、代码异味识别和最佳实践。</description>
<location>project</location>
</skill>

<skill>
<name>quant-analyst</name>
<description>Build financial models, backtest trading strategies, and analyze market data. Implements risk metrics, portfolio optimization, and statistical arbitrage. Use PROACTIVELY for quantitative finance, trading algorithms, or risk analysis.</description>
<location>project</location>
</skill>

<skill>
<name>react-best-practices</name>
<description>React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimization, or performance improvements.</description>
<location>project</location>
</skill>

<skill>
<name>reactumg-knowledge</name>
<description>ReactUMG 完整开发知识库。仅供 PlanReactUMG 和 DebugReactUMG Agent 显式调用，不应在日常开发中直接激活。包含所有开发规则、代码示例和最佳实践的详细参考文档。</description>
<location>project</location>
</skill>

<skill>
<name>receiving-code-review</name>
<description>Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation</description>
<location>project</location>
</skill>

<skill>
<name>reference-builder</name>
<description>Creates exhaustive technical references and API documentation. Generates comprehensive parameter listings, configuration guides, and searchable reference materials. Use PROACTIVELY for API docs, configuration references, or complete technical specifications.</description>
<location>project</location>
</skill>

<skill>
<name>requesting-code-review</name>
<description>Use when completing tasks, implementing major features, or before merging to verify work meets requirements</description>
<location>project</location>
</skill>

<skill>
<name>risk-manager</name>
<description>Monitor portfolio risk, R-multiples, and position limits. Creates hedging strategies, calculates expectancy, and implements stop-losses. Use PROACTIVELY for risk assessment, trade tracking, or portfolio protection.</description>
<location>project</location>
</skill>

<skill>
<name>ruby-pro</name>
<description>Write idiomatic Ruby code with metaprogramming, Rails patterns, and performance optimization. Specializes in Ruby on Rails, gem development, and testing frameworks. Use PROACTIVELY for Ruby refactoring, optimization, or complex Ruby features.</description>
<location>project</location>
</skill>

<skill>
<name>rural-fintech-specialist</name>
<description>Rural fintech expert specializing in village financial transparency, points-based governance systems, micro-loans, and government subsidy calculation. Use when developing financial management, subsidy systems, or incentive mechanisms for rural platforms.</description>
<location>project</location>
</skill>

<skill>
<name>rust-pro</name>
<description>Write idiomatic Rust with ownership patterns, lifetimes, and trait implementations. Masters async/await, safe concurrency, and zero-cost abstractions. Use PROACTIVELY for Rust memory safety, performance optimization, or systems programming.</description>
<location>project</location>
</skill>

<skill>
<name>sage-rust-conventions</name>
<description>Sage 项目 Rust 代码规范，包含命名、错误处理、异步、测试等最佳实践</description>
<location>project</location>
</skill>

<skill>
<name>sales-automator</name>
<description>Draft cold emails, follow-ups, and proposal templates. Creates pricing pages, case studies, and sales scripts. Use PROACTIVELY for sales outreach or lead nurturing.</description>
<location>project</location>
</skill>

<skill>
<name>scala-pro</name>
<description>Master enterprise-grade Scala development with functional programming, distributed systems, and big data processing. Expert in Apache Pekko, Akka, Spark, ZIO/Cats Effect, and reactive architectures. Use PROACTIVELY for Scala system design, performance optimization, or enterprise integration.</description>
<location>project</location>
</skill>

<skill>
<name>scarches-docs-complete</name>
<description>scArches 文档本地镜像全量</description>
<location>project</location>
</skill>

<skill>
<name>script-test</name>
<description>测试脚本执行功能的示例 Skill</description>
<location>project</location>
</skill>

<skill>
<name>search-specialist</name>
<description>Expert web researcher using advanced search techniques and synthesis. Masters search operators, result filtering, and multi-source verification. Handles competitive analysis and fact-checking. Use PROACTIVELY for deep research, information gathering, or trend analysis.</description>
<location>project</location>
</skill>

<skill>
<name>security-auditor</name>
<description>Review code for vulnerabilities, implement secure authentication, and ensure OWASP compliance. Handles JWT, OAuth2, CORS, CSP, and encryption. Use PROACTIVELY for security reviews, auth flows, or vulnerability fixes.</description>
<location>project</location>
</skill>

<skill>
<name>session-template</name>
<description>Apply task-specific templates to AI session plans using ai-update-plan. Use when starting a new task to load appropriate plan structure (feature, bugfix, refactor, documentation, security).</description>
<location>project</location>
</skill>

<skill>
<name>skill-creator</name>
<description>Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.</description>
<location>project</location>
</skill>

<skill>
<name>skill-share</name>
<description>A skill that creates new Claude skills and automatically shares them on Slack using Rube for seamless team collaboration and skill discovery.</description>
<location>project</location>
</skill>

<skill>
<name>smart-village-specialist</name>
<description>Smart village platform development expert specializing in rural governance, resident management, financial transparency, and community services. Use when working on village management features, rural e-government systems, or agricultural technology platforms.</description>
<location>project</location>
</skill>

<skill>
<name>sql-pro</name>
<description>Write complex SQL queries, optimize execution plans, and design normalized schemas. Masters CTEs, window functions, and stored procedures. Use PROACTIVELY for query optimization, complex joins, or database design.</description>
<location>project</location>
</skill>

<skill>
<name>structured-data</name>
<description>生成和验证 JSON-LD 结构化数据，支持 Article、BlogPosting、Organization、WebPage、Product、LocalBusiness 等 Schema.org 类型。自动检测页面类型，验证语法，检查必需字段，提供 Google Rich Results 测试工具链接和 Next.js 组件代码示例。</description>
<location>project</location>
</skill>

<skill>
<name>subagent-driven-development</name>
<description>Use when executing implementation plans with independent tasks in the current session</description>
<location>project</location>
</skill>

<skill>
<name>superpowers-factory-bridge</name>
<description>|</description>
<location>project</location>
</skill>

<skill>
<name>systematic-debugging</name>
<description>Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes - four-phase framework (root cause investigation, pattern analysis, hypothesis testing, implementation) that ensures understanding before attempting solutions</description>
<location>project</location>
</skill>

<skill>
<name>terraform-specialist</name>
<description>Write advanced Terraform modules, manage state files, and implement IaC best practices. Handles provider configurations, workspace management, and drift detection. Use PROACTIVELY for Terraform modules, state issues, or IaC automation.</description>
<location>project</location>
</skill>

<skill>
<name>test-automator</name>
<description>Create comprehensive test suites with unit, integration, and e2e tests. Sets up CI pipelines, mocking strategies, and test data. Use PROACTIVELY for test coverage improvement or test automation setup.</description>
<location>project</location>
</skill>

<skill>
<name>test-driven-development</name>
<description>Use when implementing any feature or bugfix, before writing implementation code</description>
<location>project</location>
</skill>

<skill>
<name>thoroughness</name>
<description>Use when implementing complex multi-step tasks, fixing critical bugs, or when quality and completeness matter more than speed - ensures comprehensive implementation without shortcuts through systematic analysis, implementation, and verification phases</description>
<location>project</location>
</skill>

<skill>
<name>tutorial-engineer</name>
<description>Creates step-by-step tutorials and educational content from code. Transforms complex concepts into progressive learning experiences with hands-on examples. Use PROACTIVELY for onboarding guides, feature tutorials, or concept explanations.</description>
<location>project</location>
</skill>

<skill>
<name>typescript-pro</name>
<description>Master TypeScript with advanced types, generics, and strict type safety. Handles complex type systems, decorators, and enterprise-grade patterns. Use PROACTIVELY for TypeScript architecture, type inference optimization, or advanced typing patterns.</description>
<location>project</location>
</skill>

<skill>
<name>ui-ux-designer</name>
<description>Create interface designs, wireframes, and design systems. Masters user research, prototyping, and accessibility standards. Use PROACTIVELY for design systems, user flows, or interface optimization.</description>
<location>project</location>
</skill>

<skill>
<name>ui-ux-pro-max</name>
<description>"UI/UX design intelligence. 50 styles, 21 palettes, 50 font pairings, 20 charts, 8 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, mobile app, .html, .tsx, .vue, .svelte. Elements: button, modal, navbar, sidebar, card, table, form, chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, flat design. Topics: color palette, accessibility, animation, layout, typography, font pairing, spacing, hover, shadow, gradient."</description>
<location>project</location>
</skill>

<skill>
<name>unity-developer</name>
<description>Build Unity games with optimized C# scripts, efficient rendering, and proper asset management. Handles gameplay systems, UI implementation, and platform deployment. Use PROACTIVELY for Unity performance issues, game mechanics, or cross-platform builds.</description>
<location>project</location>
</skill>

<skill>
<name>using-git-worktrees</name>
<description>Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification</description>
<location>project</location>
</skill>

<skill>
<name>using-superpowers</name>
<description>Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions</description>
<location>project</location>
</skill>

<skill>
<name>vercel-deploy-claimable</name>
<description>Deploy applications and websites to Vercel instantly. Designed for use with claude.ai and Claude Desktop to enable deployments directly from conversations. Deployments are "claimable" - users can transfer ownership to their own Vercel account.</description>
<location>project</location>
</skill>

<skill>
<name>vercel-react-best-practices</name>
<description>React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimization, or performance improvements.</description>
<location>project</location>
</skill>

<skill>
<name>verification-before-completion</name>
<description>Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always</description>
<location>project</location>
</skill>

<skill>
<name>vibevibe</name>
<description>Vibe Coding 全栈实战教程。涵盖 AI 辅助编程心法、Next.js 全栈开发、与 AI 对话的艺术、PRD 文档驱动开发、UI/UX 设计、数据库、部署等内容。适用于零基础到进阶的 Vibe Coding 学习。</description>
<location>project</location>
</skill>

<skill>
<name>web-design-guidelines</name>
<description>Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".</description>
<location>project</location>
</skill>

<skill>
<name>writing-plans</name>
<description>Use when you have a spec or requirements for a multi-step task, before touching code</description>
<location>project</location>
</skill>

<skill>
<name>writing-skills</name>
<description>Use when creating new skills, editing existing skills, or verifying skills work before deployment</description>
<location>project</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
