# Claude Code × Stata 经济学实证分析工作流

> **方法论指南**：系统性配置 Claude Code + stata-mcp + Stata Skill，用 AI 驱动完整的面板数据实证研究

[中文](#中文) | [English](#english)

---

## 中文

### 这是什么？

本项目是一套**方法论**，记录如何把 Claude Code（Anthropic 官方 CLI）与 Stata 深度集成，让 AI 完成经济学实证研究的全流程——从写代码、调 bug、安装包，到跑回归、导出表格、生成分析报告。

> 由真实研究项目（AI 技术应用对企业创新的影响，面板数据 + 双向固定效应）实操验证，所有踩坑记录均来自真实经历。参考 Aniket Panjwani 的《Using Claude Code with Stata — an Economist's Guide》以及社区最佳实践。

---

### 为什么 Stata 用户需要专门配置？

Claude Code 对 Python/JavaScript 开箱即用，但 Stata 有三个特殊挑战：

1. **路径问题**：Stata 默认不在系统 PATH 中，Claude Code 无法自动发现它
2. **文档问题**：Stata 官方文档是大型 PDF，直接塞给 AI 消耗大量 tokens
3. **语言范式**：Stata 有独特的 do-file、宏（macro）、global、preserve/restore 结构，需要专门的上下文

---

### 核心架构

```
你（研究者）
    │  自然语言指令
    ▼
Claude Code CLI
    │  读取 CLAUDE.md（项目说明书）
    │  调用 Stata Skill（领域知识）
    │  通过 MCP 协议
    ▼
stata-mcp（MCP Server）
    │  批处理调用
    ▼
Stata（无头模式运行 do-file）
    │
    ▼
RTF 回归表格 + Word 分析报告
```

---

### 第一步：让 Claude Code 找到 Stata

#### 配置系统路径

直接在 Claude Code 中输入：

```
找到我最新的 Stata 安装目录，并将其添加到我的 bashrc（Linux）或 zshrc（Mac）配置文件中
```

Claude Code 会自动扫描常见安装路径，写入正确的 `export PATH` 语句。

验证：

```bash
which stata
stata --version
```

> **Windows 用户**：强烈建议使用 WSL（Windows Subsystem for Linux）。原生 Windows 环境下路径分隔符、换行符等兼容性问题较多。如使用 WSL，配置与 Mac/Linux 完全一致。

---

### 第二步：安装 stata-mcp（MCP 执行引擎）

stata-mcp 由 [SepineTam](https://github.com/SepineTam/stata-mcp) 开发，将"执行 do-file"封装为 Claude 可调用的工具。

```bash
# 安装 uv（Python 包管理器）
pip install uv

# 验证 stata-mcp 可用
uvx stata-mcp --version
uvx stata-mcp --usable   # 检测 Stata 是否在默认路径
```

**配置方法 A：命令行（推荐）**

```bash
# 项目级（仅当前目录生效，推荐用于特定研究项目）
claude mcp add stata-mcp \
  --env STATA_MCP_CWD=$(pwd) \
  --scope project \
  -- uvx stata-mcp

# 全局（所有项目生效）
claude mcp add stata-mcp --scope user -- uvx stata-mcp
```

**配置方法 B：手动编辑 `~/.claude/settings.json`**

```json
{
  "mcpServers": {
    "stata-mcp": {
      "command": "uvx",
      "args": ["stata-mcp"],
      "env": {
        "STATA_MCP_CWD": "/path/to/your/project"
      }
    }
  }
}
```

> **Windows 路径示例**：
> ```json
> "env": {
>   "STATA_PATH": "D:\\Stata 18\\StataMP-64.exe",
>   "STATA_MCP_CWD": "E:\\your-project"
> }
> ```

验证：

```bash
claude mcp list   # 应显示 stata-mcp
```

---

### 第三步：安装 Stata Skill（最关键的一步）

Skill 是 Claude Code 的领域知识注入机制，每次调用时 AI 优先参考这些文档生成代码，相当于给 AI 配备一份 Stata 专家手册。

#### 方法 A：安装社区 Stata Skill（推荐）

由 Dylan Moore 维护的 [`stata-skill`](https://github.com/dylantmoore/stata-skill) 涵盖 37 个参考文档：

```bash
/plugin marketplace add dylantmoore/stata-skill
/plugin install stata@dylantmoore-stata-skill
```

涵盖内容：
- **数据操作**：导入/导出、清洗、字符串、日期处理
- **统计方法**：线性回归、面板数据、时间序列、MLE、GMM、IV
- **因果推断**：DID、RDD、PSM、处理效应、选择偏差
- **高级方法**：生存分析、SEM、空间分析、Lasso
- **编程规范**：do-file 结构、宏变量、循环、Mata
- **可视化与报告**：图形生成、出版级回归表格
- **20 个常用社区包**：`reghdfe`、`estout`、`ivreghdfe`、`rdrobust`、`csdid`、`did2s` 等

> 采用**渐进式披露架构**：索引文件引导 Claude 按需读取相关文档，而非一次性加载全部内容，控制 token 消耗。

#### 方法 B：让 Claude Code 自动创建

```
帮我创建一个用户级别的 Stata 技能，内容包括 Stata 是什么、如何执行和生成 do-file，以及来自我的 Stata 安装目录的文档引用
```

Claude Code 会生成结构化技能文件，存储在 `~/.claude/skills/` 目录。

#### 安装 Compound Engineering 插件（Skill 管理工具）

```bash
/plugin marketplace add EveryInc/compound-engineering-plugin
```

该插件的工作流哲学：**80% 用于规划和复盘，20% 用于执行**——与经济学实证研究"先设计后执行"的理念一致。

---

### 第四步：优化 PDF 文档处理

Stata 官方文档是大型 PDF（`[R]`、`[XT]`、`[XT]` 等），直接读取消耗大量 tokens。安装三个工具：

```bash
# Mac
brew install pandoc pdfgrep
pip install pdfplumber

# Linux
apt-get install pandoc pdfgrep
pip install pdfplumber
```

| 工具 | 作用 |
|------|------|
| `pandoc` | 将 PDF 转为 Markdown，大幅压缩体积 |
| `pdfgrep` | PDF 全文搜索，快速定位相关段落 |
| `pdfplumber` | 提取 PDF 中的表格和结构化内容 |

安装后，Claude Code 访问 Stata 手册时会：先用 `pdfgrep` 定位章节 → 再用 `pandoc` 转 Markdown → 只纳入必要片段。

---

### 第五步：配置 CLAUDE.md（让 AI 记住你的研究习惯）

`CLAUDE.md` 放在项目根目录，Claude Code 每次启动自动读取。**这是让 AI 生成准确 Stata 代码的核心**——没有它，Claude 每次要重新猜测变量名、回归规范、输出格式。

初始化：

```bash
/init   # Claude Code 根据项目结构自动生成基础 CLAUDE.md
```

经济学研究项目的 CLAUDE.md 建议结构：

```markdown
## 数据路径
- 原始数据：/data/raw/
- 清洗后数据：/data/clean/
- 输出结果：/output/

## 编码规范
- 所有 do-file 开头加版本声明：version 17
- 固定效应回归用 reghdfe，不用 areg 或 xtreg
- 标准误：vce(cluster industry#year)
- 结果导出：esttab ... using 表名.rtf, replace b(%7.4f) se star(* 0.10 ** 0.05 *** 0.01)

## 当前研究设计
- 核心识别策略：[DID / RDD / IV 等]
- 处理变量：[变量名]
- 结局变量：[变量名]

## 工作流规范
- 数据清洗：01_clean_*.do
- 分析脚本：02_analysis_*.do
- 稳健性：03_robust_*.do
```

参见 [`templates/CLAUDE_template.md`](templates/CLAUDE_template.md) 获取完整模板。

---

### 典型工作流示例

#### 论文复现

```
帮我理解这个复现包的结构，找到主回归的 do-file，
并解释 Table 3 的系数是如何生成的
```

#### 快速假设检验

```
用 local projection 方法估计 X 对 Y 的动态效应，
控制行业固定效应和年份固定效应，
画出事件研究图并标注 95% 置信区间
```

#### 代码整理规范化

```
审查 /analysis/ 目录下所有 do-file，
统一变量命名规范，添加必要注释，
确保所有路径为相对路径，
生成 master.do 按顺序调用所有脚本
```

#### MCP 闭环完整示例（最强用法）

```
执行以下任务：写 do-file 时全程使用绝对路径。
加载 auto 数据集（webuse auto），生成各变量的描述性统计。
识别数据集的关键特征，生成相关图形并保存至 plots 文件夹。
对汽车价格的主要决定因素进行回归分析。
将所有输出导出为 LaTeX 文件并编译。
自动处理所有编译错误，LaTeX 编译时间不超过 10 秒。
所有代码错误须在工作流中自动识别并修复。
```

---

### 踩坑记录（实操总结）

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| stata-mcp 首次调用超时 | 冷启动慢 | 改用 `stata_do` 工具直接传 do-file 内容 |
| 嵌套 `do` 被拦截 | stata-mcp 安全检查禁止 `^\s*do\s+` 模式 | 把所有逻辑合并进单个 do-file |
| `logout` 永久卡住 | 依赖 OLE Automation，批处理无头模式无 GUI | 改用 `putdocx` 输出 Word |
| 装包后仍找不到 | 每次 stata-mcp 调用是独立进程 | 包检测放在同一 do-file 最开头 |
| 中文引号报语法错误 | `"…"` 被当多字节字符解析 | 统一用 ASCII `"` `'` |
| fine-grained PAT 建不了仓库 | 默认无 Administration 权限 | 用 classic token（`ghp_` 前缀），勾选 `repo` |

#### 关键代码片段

**自动安装依赖包**

```stata
cap which ftools
if _rc != 0 ssc install ftools, replace
cap which reghdfe
if _rc != 0 ssc install reghdfe, replace
cap which ivreghdfe
if _rc != 0 ssc install ivreghdfe, replace
cap which ivreg2
if _rc != 0 ssc install ivreg2, replace
cap which estout
if _rc != 0 ssc install estout, replace
```

**高维固定效应回归标准写法**

```stata
global controls Size Age ROA Leverage Growth Rdintensity

reghdfe Innov AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)
est store m1
esttab m1 using 表1.rtf, replace b(%7.4f) se compress nogap scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)
```

**用 putdocx 替代 logout**

```stata
* 错误（批处理下卡住）
logout, save(表1) word replace: tabstat y x, stats(n mean sd min max)

* 正确
putdocx begin
putdocx paragraph, style(Heading1)
putdocx text ("描述性统计")
putdocx table t1 = etable
putdocx save 描述统计.docx, replace
```

---

### 从 Stata 到现代工具链的渐进路径

不需要放弃 Stata，可以分阶段过渡：

| 阶段 | Stata 角色 | Claude Code 作用 |
|------|------------|-----------------|
| 阶段一 | 全部分析 | 写 do-file、调试、生成表格 |
| 阶段二 | 核心回归 + 表格 | 文本处理、爬虫、API 调用用 Python |
| 阶段三 | 快速探索 + 出版表格 | 计算密集型任务迁移 Python |

---

### 进阶：通过 MCP 扩展研究工作流

```json
// .claude/settings.json
{
  "mcpServers": {
    "stata-mcp": { "command": "uvx", "args": ["stata-mcp"] },
    "zotero": { ... },        // 文献管理：写作时自动引用
    "world-bank": { ... },    // 数据获取：直接下载 WDI 数据
    "web-search": { ... },    // 文献综述：自动检索相关论文
    "database": { ... }       // SQL 查询：直接访问数据库
  }
}
```

---

### 完整实证分析流程

```
原始数据(.dta)
    │
    ▼
[1] 描述性统计 ──► putdocx Word
    │
    ▼
[2] 基准回归（双向 FE）
    逐步：无FE → 年FE → 双向FE → 加控制变量
    ──► esttab RTF
    │
    ├── [3] 内生性处理
    │       ├── Oster δ（遗漏变量偏误检验）
    │       ├── PSM-DID（倾向得分匹配）
    │       ├── Heckman 两阶段
    │       └── 2SLS（Bartik 工具变量）
    │
    ├── [4] 稳健性检验
    │
    ├── [5] 机制检验（中介变量）
    │
    └── [6] 异质性分析（子样本 / 交互项）
              │
              ▼
         Word 分析报告(.docx)
```

---

### 目录结构

```
claude-stata/
├── README.md                      # 方法论文档（本文件）
├── CLAUDE.md                      # Claude Code 项目指令（面板数据项目模板）
├── demo/
│   ├── demo_data_gen.do           # 生成模拟面板数据（500企业×14年）
│   ├── demo_analysis.do           # 完整实证分析
│   └── demo_report.js             # 自动生成 Word 分析报告
├── templates/
│   ├── CLAUDE_template.md         # CLAUDE.md 通用模板
│   └── analysis_template.do       # 实证分析 do-file 通用模板
└── scripts/
    └── setup_and_run.do           # 一键安装依赖 + 运行 demo
```

---

### 运行 Demo

```bash
git clone https://github.com/dengls24/claude-stata.git
cd claude-stata

# 方式一：Stata 中直接运行
# do scripts/setup_and_run.do

# 方式二：Claude Code 驱动（体验完整 AI 闭环）
claude
# 然后输入：请帮我运行 demo，生成回归结果和分析报告
```

---

## English

### What is this?

A **methodology guide** for integrating Claude Code (Anthropic's official CLI) with Stata, enabling AI-driven end-to-end empirical economics research. Based on Aniket Panjwani's *"Using Claude Code with Stata — an Economist's Guide"* and validated on a real panel data project.

### Why Stata needs special configuration

Unlike Python/JS, Stata has three friction points for Claude Code:
1. **Path**: Stata is not on system PATH by default
2. **Docs**: Official manuals are large PDFs — expensive to load directly
3. **Paradigm**: do-files, macros, globals, preserve/restore need dedicated context

### 5-Step Setup

#### Step 1: Add Stata to PATH

```
Find my latest Stata installation and add it to my shell config
```

Verify: `which stata && stata --version`

> Windows users: use WSL for full compatibility.

#### Step 2: Install stata-mcp

```bash
pip install uv
claude mcp add stata-mcp --scope user -- uvx stata-mcp
```

Or for project scope:

```bash
claude mcp add stata-mcp \
  --env STATA_MCP_CWD=$(pwd) \
  --scope project \
  -- uvx stata-mcp
```

#### Step 3: Install Stata Skill (most important)

```bash
/plugin marketplace add dylantmoore/stata-skill
/plugin install stata@dylantmoore-stata-skill
```

37 reference docs covering data ops, econometrics, causal inference, programming conventions, and 20 community packages (`reghdfe`, `estout`, `ivreghdfe`, `rdrobust`, `csdid`, etc.).

#### Step 4: Optimize PDF handling

```bash
brew install pandoc pdfgrep && pip install pdfplumber
```

Claude Code will use `pdfgrep` → `pandoc` → minimal context instead of loading full PDFs.

#### Step 5: Configure CLAUDE.md

```bash
/init   # auto-generates CLAUDE.md from project structure
```

Define data paths, variable names, regression conventions, output formats. Claude Code reads this on every startup — no need to repeat yourself across conversations.

### Key Gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| `logout` hangs | Needs OLE/COM — unavailable headless | Replace with `putdocx` |
| Nested `do` blocked | stata-mcp security check | Merge all code into one do-file |
| Package missing after install | Each call is an independent process | Put `ssc install` at top of same do-file |
| Chinese quotes → syntax error | Multi-byte char parsing | Use ASCII `"` `'` only |
| Fine-grained PAT can't create repo | Missing Administration permission | Use classic token with `repo` scope |

### Citation

```bibtex
@misc{claude-stata2025,
  author = {Deng Lishuo},
  title  = {Claude Code × Stata: A Methodology for AI-Driven Empirical Economics},
  year   = {2025},
  url    = {https://github.com/dengls24/claude-stata}
}
```

### License

MIT — free to use and adapt for academic research.
