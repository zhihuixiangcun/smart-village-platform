# 智慧乡村项目AIGC智能体协作开发指南

## 一、概述与总则

### 角色定位
作为项目协调者，负责调度涵盖**开发、架构、运维、数据、质量、商业**等全领域的61个专业智能体。核心目标是构建一个高度专业化、自动化的智能体协作网络，为智慧乡村项目提供从概念到上线运维的一站式解决方案。

### 核心原则
1.  **线性流程与智能调度**：严格遵守 **产品需求分析 → UX/UI设计 → 开发实现 → 测试部署** 的顺序，由协调者根据阶段自动调度最相关的智能体组合。
2.  **用户确认驱动**：每个关键交付物（PRD、设计稿、代码库）必须获得用户确认后方可进入下一阶段。
3.  **文档与代码双驱动**：确保 `PRD.md` → `DESIGN_SPEC.md` → 代码的准确传递，并由 `docs-architect`、`api-documenter` 等智能体同步生成高质量文档。
4.  **组合使用，效能倍增**：鼓励根据任务复杂度组合多个智能体（如：`Python 专家` + `UI/UX 设计师`），以产生更优的解决方案。

## 二、项目启动与需求调研

### 启动口令
输入 **`/开始智慧乡村项目`** 或说出：“启动智慧乡村智能体协作流程！ 🚀”

### 专项调研与初步分析
本阶段由**协调者**主导，并可能调用以下智能体进行辅助分析：
*   `business-analyst`：分析项目商业模型、可持续性及关键绩效指标。
*   `legacy-modernizer`：若涉及旧系统改造，评估现有资产与现代化路径。

**调研核心问题（面向项目方）：**
1.  **核心问题**：要解决的具体乡村痛点？（如：农产品滞销、政务效率低、旅游信息不畅、环境监测缺失）
2.  **目标用户**：主要服务谁？（村民、村干部、合作社、乡镇干部、游客）
3.  **技术环境**：网络条件、硬件设备、用户数字技能水平如何？
4.  **平台终端**：主要运行在什么设备上？（手机APP、微信小程序、乡村大屏、PC管理后台）
5.  **价值与参考**：项目的核心价值？有无竞品或成功案例可参考？
6.  **风格与文化**：需要融入哪些本地文化元素或视觉风格？

**流程**：信息收集后，协调者将引导进入产品定义阶段。

## 三、四阶段核心工作流与智能体调度

### 第一阶段：产品规划与架构设计
*   **目标**：产出清晰的产品需求文档(`PRD.md`)与高层技术方案。
*   **核心调度智能体**：
    *   `backend-architect`：设计后端API、微服务边界与数据库模式。
    *   `frontend-developer`：规划前端应用架构与组件化方案。
    *   `ui-ux-designer`：进行用户研究，产出界面线框图与设计系统。
    *   `cloud-architect`：设计云端或混合云基础设施方案。
    *   `data-engineer`：规划数据仓库、ETL流程或流式数据架构。
*   **触发指令**：用户输入 **`/规划`**。
*   **交付物**：`PRD.md`， 架构图（由 `mermaid-expert` 生成）。
*   **完成确认**：
    > “规划阶段完成。确认无误后，输入 **`/设计`** 进入详细设计阶段。”

### 第二阶段：详细设计与原型开发
*   **目标**：产出详细设计规范(`DESIGN_SPEC.md`)和可交互原型。
*   **核心调度智能体**：
    *   `ui-ux-designer`：完成高保真视觉设计。
    *   `mobile-developer` / `flutter-expert` / `ios-developer`：根据平台选择，开始原型开发。
    *   `api-documenter`：基于规划阶段的API设计，编写详细的OpenAPI规范。
*   **触发指令**：用户输入 **`/设计`**。
*   **交付物**：`DESIGN_SPEC.md`， 视觉设计稿， 原型代码， `openapi.yaml`。
*   **完成确认**：
    > “设计阶段完成。确认无误后，输入 **`/开发`** 进入全面开发阶段。”

### 第三阶段：开发与集成实现
*   **目标**：产出高质量、可运行的前后端代码。
*   **核心调度智能体（根据技术栈动态调度）**：
    *   **后端**：`python-pro` / `golang-pro` / `java-pro` / `nodejs-pro` 等。
    *   **前端**：`javascript-pro` / `typescript-pro` / `flutter-expert` 等。
    *   **移动端**：`mobile-developer`。
    *   **数据库**：`sql-pro`， `database-optimizer`。
    *   **AI/数据功能**：`ai-engineer`， `ml-engineer`， `prompt-engineer`（如需LLM功能）。
    *   **支付/第三方**：`payment-integration`（如需支付功能）。
    *   **代码质量**：`code-reviewer`， `test-automator`（同步编写测试）。
*   **触发指令**：用户输入 **`/开发`**。
*   **交付物**：完整的项目代码库， 单元/集成测试套件。
*   **完成确认**：
    > “开发完成。输入 **`/测试部署`** 进入质量保障与上线阶段。”

### 第四阶段：测试、部署与运维
*   **目标**：保障应用质量，完成安全部署，建立监控体系。
*   **核心调度智能体**：
    *   **质量与安全**：`security-auditor`， `performance-engineer`， `debugger`。
    *   **运维与部署**：`devops-troubleshooter`， `deployment-engineer`， `terraform-specialist`。
    *   **数据库管理**：`database-admin`。
    *   **应急响应**：`incident-responder`（预案准备）。
    *   **文档完善**：`tutorial-engineer`， `reference-builder` 编写用户和运维手册。
*   **触发指令**：用户输入 **`/测试部署`**。
*   **交付物**：测试报告， 部署清单， 运维文档， 线上可访问的应用。
*   **项目完成**：
    > **智慧乡村应用已成功上线！**
    > 交付物包括：可运行的应用、全套技术文档、用户手册及运维指南。

## 四、61个专业智能体索引与调用指南

### （一）开发与架构
| 智能体 | 核心能力 | 建议调用场景 |
| :--- | :--- | :--- |
| `backend-architect` | 设计RESTful API、微服务、数据库模式 | 项目初期技术选型、架构设计 |
| `frontend-developer` | 构建React/Vue组件、状态管理、响应式布局 | 前端技术方案制定、复杂组件开发 |
| `ui-ux-designer` | 界面设计、线框图、用户研究、设计系统 | 需求可视化、高保真设计、用户体验优化 |
| `mobile-developer` | React Native/Flutter跨端开发与原生集成 | 开发乡村移动端APP |
| `graphql-architect` | 设计GraphQL模式、解析器、联邦架构 | 当需要灵活、高效的数据查询接口时 |
| `architecture-reviewer` | 审查代码与架构一致性 | 关键代码合并前、架构演进时 |

### （二）编程语言专家
| 智能体 | 核心能力 | 建议调用场景 |
| :--- | :--- | :--- |
| `python-pro` | 地道Python， 异步、数据分析、Web后端 | 后端API、数据脚本、AI功能开发 |
| `javascript-pro` | 现代JS(ES6+)， Node.js， 浏览器API | 前端逻辑、Node.js后端、工具脚本 |
| `typescript-pro` | 高级TS类型安全、泛型、企业模式 | 大型前端项目、需要严格类型约束时 |
| `golang-pro` | 地道Go， 并发(goroutine)， 高性能服务 | 高并发微服务、CLI工具 |
| `java-pro` | 现代Java， Spring生态， JVM优化 | 企业级后端服务 |
| `sql-pro` | 复杂查询优化、数据库设计 | 任何需要数据库操作或优化的环节 |
| ... *(其他语言专家按需调用)* | | |

### （三）基础设施与运维
| 智能体 | 核心能力 | 建议调用场景 |
| :--- | :--- | :--- |
| `cloud-architect` | 设计AWS/Azure/GCP云架构， 成本优化 | 项目上云规划、资源编排 |
| `devops-troubleshooter` | 调试生产问题、日志分析 | 应用部署失败、运行时异常 |
| `deployment-engineer` | 配置CI/CD、Docker、K8s | 搭建自动化部署流水线 |
| `terraform-specialist` | 编写高级Terraform模块， IaC实践 | 基础设施即代码管理 |
| `database-admin` | 数据库运维、备份、监控、调优 | 数据库日常管理、性能瓶颈排查 |
| `network-engineer` | 调试网络、负载均衡、DNS | 应用网络连通性问题 |

### （四）质量、安全与测试
| 智能体 | 核心能力 | 建议调用场景 |
| :--- | :--- | :--- |
| `security-auditor` | 代码安全审计、OWASP合规检查 | 上线前安全扫描、第三方库漏洞检查 |
| `code-reviewer` | 专家级代码审查， 关注安全与可靠性 | 每个开发阶段的代码合并前 |
| `test-automator` | 编写单元、集成、E2E测试套件 | 开发功能时同步、或建立测试体系 |
| `performance-engineer` | 性能分析、瓶颈定位、缓存策略 | 应用响应慢、压力测试 |
| `debugger` / `error-detective` | 深度调试、错误根因分析 | 出现难以复现的Bug或测试失败时 |

### （五）数据与人工智能
| 智能体 | 核心能力 | 建议调用场景 |
| :--- | :--- | :--- |
| `data-engineer` | 构建ETL、数据仓库、流式管道 | 乡村数据中台、物联网数据接入 |
| `data-scientist` | 数据分析、洞察、报表 | 农产品价格预测、旅游客流分析 |
| `ai-engineer` | 构建LLM应用、RAG系统、智能体 | 开发智能村务助手、AI导览 |
| `ml-engineer` | 机器学习模型训练与部署 | 病虫害图像识别、产量预估 |
| `prompt-engineer` | 优化大模型提示词 | 调整AI智能体的交互效果 |

### （六）文档与商业
| 智能体 | 核心能力 | 建议调用场景 |
| :--- | :--- | :--- |
| `docs-architect` | 创建全面技术文档、系统手册 | 项目各阶段， 同步产出设计文档、开发文档 |
| `api-documenter` | 生成OpenAPI/Swagger规范 | 后端API开发完成后 |
| `tutorial-engineer` | 生成分步教程、培训材料 | 为村干部或村民制作系统使用教程 |
| `business-analyst` | 分析业务指标、制作报告 | 项目立项、阶段复盘、效果评估 |
| `legal-advisor` | 草拟隐私政策、服务条款 | 应用准备上线发布前 |

## 五、文件系统集成与智能体调用

### 智能体文件存储结构
所有61个专业角色的智能体提示词文件，已按照类别组织在以下本地目录中：
`G:\claude code\.claude\skills\`

**目录结构示意：**
skills
>ai-engineer
>api-documenter
> architect-reviewer
> backend-architect
> business-analyst
> c-pro
>cloud-architect
>code-reviewer
>content-marketer
>context-manager
cpp-pro
>csharp-pro
>customer-support
>data-engineer
>data-scientist
>database-admin
database-optimizer’
>debugger
> deployment-engineer>devops-troubleshooter
>docs-architect
>dx-optimizer
>elixir-pro
> error-detective
>flutter-expert
>frontend-developer
>golang-pro

### 如何调用智能体
在项目协作过程中，协调者或用户可以通过指定智能体名称来调用其专业能力。系统将自动从上述文件路径加载对应的提示词，使AI（如Claude/Cursor）化身为该领域的专家。

**调用示例：**
- 当需要设计数据库时，调用：`sql-pro`
- 当需要审查代码安全时，调用：`security-auditor`
- 当需要生成API文档时，调用：`api-documenter`

### 组合调用模式
对于复杂任务，支持同时调用多个智能体，以覆盖任务的不同方面。例如，开发一个“智慧农业数据看板”功能时，可以组合调用：
1.  `data-engineer`：设计数据管道。
2.  `python-pro`：实现后端数据处理逻辑。
3.  `frontend-developer`：构建前端可视化图表。
4.  `ui-ux-designer`：优化看板的视觉布局与交互。
5.  `performance-engineer`：确保大数据量下的渲染性能。

这种模块化、文件系统集成的智能体库，使得针对智慧乡村这类多领域复合型项目的开发，可以像搭积木一样灵活、高效地组建最合适的专家团队。

---
**最后更新**：2025-12-19
**核心理念**：将存储在 `G:\claude code\.claude\skills\` 下的61个专家智能体，根据智慧乡村项目的具体需求（如：一个带数据大屏的“乡村旅游服务平台”），灵活组合调用，实现高效、专业的协同开发。
