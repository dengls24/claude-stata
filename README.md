# Claude Code × Stata 经济学实证分析工作流

> 系统性配置指南：让 AI 真正理解你的研究项目，自动完成面板数据实证分析全流程

[中文](#中文) | [English](#english)

---

## 中文

### 这是什么

本仓库记录一套**经过实战验证的方法论**：如何把 Claude Code 与 Stata 深度集成，让 AI 驱动经济学实证研究的完整流程——从理解数据、写代码、自动安装依赖包，到执行回归、导出学术表格、生成 Word 分析报告。

**实战背景**：本方法在一个真实研究项目（AI 技术应用对企业创新的影响，2009–2022 年 A 股上市公司面板数据，双向固定效应）上完整跑通，所有代码、配置和踩坑记录均来自第一手操作经验。

---

### 为什么需要专门配置

Claude Code 对 Python/JavaScript 开箱即用，但 Stata 有三个特殊摩擦点：

| 问题 | 原因 |
|------|------|
| Claude 找不到 Stata | Stata 不在系统 PATH，无法直接调用 |
| 生成代码不符合规范 | Stata 有独特范式：do-file、宏（macro）、global、preserve/restore |
| AI 不懂你的项目 | 每次对话要重新说明变量名、回归规范、输出格式 |

三步配置解决这三个问题：**stata-mcp**（执行引擎）+ **Stata Skill**（领域知识）+ **CLAUDE.md**（项目记忆）。

---

### 核心架构

```
研究者（自然语言）
        │
        ▼
  Claude Code CLI
  ┌─────────────────────────────────┐
  │  CLAUDE.md  ←  项目变量/规范/路径  │
  │  Stata Skill ← 语法/命令/社区包   │
  └─────────────────────────────────┘
        │  MCP 协议
        ▼
  stata-mcp（MCP Server）
        │  批处理调用（无头模式）
        ▼
     Stata 18
        │
        ├── RTF 回归表格（esttab）
        ├── Word 描述统计（putdocx）
        └── Node.js → Word 分析报告
```

---

### 第一步：安装 stata-mcp

stata-mcp 由 [SepineTam](https://github.com/SepineTam/stata-mcp) 开发，把"执行 do-file"封装为 Claude 可调用的 MCP 工具。

```bash
pip install uv
uvx stata-mcp --usable   # 检查 Stata 是否可被检测到
```

**项目级配置（推荐）**：配置只对当前项目生效，不影响其他项目。

```bash
cd your-project
claude mcp add stata-mcp \
  --env STATA_MCP_CWD=$(pwd) \
  --scope project \
  -- uvx stata-mcp
```

**全局配置**：

```bash
claude mcp add stata-mcp --scope user -- uvx stata-mcp
```

**Windows 用户**：需要在 `~/.claude/settings.json` 中显式指定 Stata 路径：

```json
{
  "mcpServers": {
    "stata-mcp": {
      "command": "uvx",
      "args": ["stata-mcp"],
      "env": {
        "STATA_PATH": "D:\\Stata 18\\StataMP-64.exe",
        "STATA_MCP_CWD": "E:\\your-project"
      }
    }
  }
}
```

> **本项目实测环境**：Windows 11 + Stata 18 MP，原生 bash（非 WSL），`D:\Stata 18\StataMP-64.exe`。
> WSL 兼容性更好，但非必须——原生 Windows 完全可用。

验证：

```bash
claude mcp list   # 应看到 stata-mcp
```

---

### 第二步：安装 Stata Skill

Skill 是 Claude Code 的领域知识注入机制——把 Stata 的语法规范、常用命令、社区包用法预装进 AI 的上下文，让它不需要每次"现学"。

**安装社区 Stata Skill**（37 个参考文档，覆盖 20 个常用社区包）：

```bash
/plugin marketplace add dylantmoore/stata-skill
/plugin install stata@dylantmoore-stata-skill
```

涵盖：数据操作、面板回归、因果推断（DID/RDD/PSM/IV）、`reghdfe`、`estout`、`ivreghdfe`、`rdrobust`、`csdid` 等。

安装后，Claude 写 `reghdfe` 或 `esttab` 时会自动参考正确语法，不再瞎猜选项。

> 也可以用 `/plugin marketplace add EveryInc/compound-engineering-plugin` 安装 Compound Engineering 插件来管理 Skill 的创建和更新。

---

### 第三步：配置 CLAUDE.md（最重要）

`CLAUDE.md` 放在项目根目录，Claude Code 每次启动自动读取。**这是让 AI 精准生成你的代码的关键**——它让 Claude 知道你的变量叫什么、用哪个回归命令、聚类到哪一层。

```bash
/init   # 根据项目结构自动生成基础版
```

一份有效的经济学研究 CLAUDE.md 至少要包含：

```markdown
## 数据路径
- 原始数据：`数据.dta`（用 `use 数据, replace` 加载，运行前 cd 到数据目录）
- 输出：当前工作目录

## 变量说明
- 结局变量：Innov（企业创新）
- 处理变量：AI_utilize（AI 技术应用综合指标）
- 控制变量 global xx：Size Age ROA Leverage Growth Rdintensity
- 固定效应：id（企业）、year（年份）
- 聚类：industry_group#year

## 编码规范
- 固定效应回归用 reghdfe，不用 areg 或 xtreg
- 标准误：vce(cluster industry_group#year)
- 结果导出：esttab m* using 表名.rtf, replace b(%7.4f) se compress nogap scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)
- Word 输出用 putdocx，不用 logout（批处理下会卡住）

## 工作流规范
- 分析脚本：02_analysis_*.do；稳健性：03_robust_*.do
- 每段代码前用 *** 注释说明对应表格编号
```

**为什么这步最关键？** 没有 CLAUDE.md，Claude 每次对话要重新猜你的变量名是 `y` 还是 `Innov`，聚类层级是 `id` 还是 `industry_group#year`。有了它，第一句话就能写出符合规范的代码。

完整模板见 [`templates/CLAUDE_template.md`](templates/CLAUDE_template.md)。

---

### 典型操作：全流程 AI 驱动

配置完成后，在项目目录启动 Claude Code，直接对话：

```
请帮我跑一下基准回归，数据是数据.dta，参考 CLAUDE.md 的规范，
逐步加入控制变量和固定效应，结果输出到表1.rtf
```

Claude 会自动：
1. 检查并安装缺失的 Stata 包（`reghdfe`、`estout` 等）
2. 生成符合 CLAUDE.md 规范的 do-file
3. 通过 stata-mcp 执行
4. 读取 log 文件判断是否报错
5. 自动修正错误并重跑

**本项目实际跑通的分析链路**：

```
描述统计（putdocx）
→ 基准回归（逐步加FE，4列）
→ AI 细分变量回归（Learningbased/KRR/NLP/CV/ML）
→ 内生性处理（Oster δ / PSM-DID / Heckman / 2SLS Bartik IV）
→ 稳健性检验（替换变量 / 滞后期 / 调整FE / 缩短样本）
→ 机制检验（中介变量）
→ 异质性分析（行业 / 企业规模 / 所有制）
→ Node.js 自动生成 Word 分析报告
```

共输出 13 个结果文件，与原始论文数值 100% 吻合。

---

### 踩坑记录（Windows 原生环境实测）

这些坑均在实操中真实遇到，不是理论推演：

#### 1. `logout` 在批处理下永久卡住

**现象**：程序执行到 `logout, save(...) word replace: tabstat ...` 后挂起，永不返回。

**原因**：`logout` 依赖 Windows OLE Automation 操作 Word，stata-mcp 的无头批处理模式没有 GUI，OLE 调用无法完成。

**解法**：改用 `putdocx`：

```stata
* 错误写法（批处理下卡死）
logout, save(描述统计) word replace: tabstat y x, stats(n mean sd min max)

* 正确写法
putdocx begin
putdocx paragraph, style(Heading1)
putdocx text ("描述性统计")
putdocx table t1 = etable
putdocx save 描述统计.docx, replace
```

---

#### 2. 嵌套 `do` 命令被安全检查拦截

**现象**：在 do-file 里写 `do 程序.do`，报错：
```
Security warning: Dangerous commands detected: pattern `^\s*do\s+`
```

**原因**：stata-mcp 出于安全考虑禁止嵌套 do 调用。

**解法**：把所有逻辑合并进**单个 do-file**，不拆分调用。

---

#### 3. 安装包后下次执行找不到

**现象**：第一次运行安装了 `reghdfe`，第二次执行新 do-file 时又报 `command reghdfe not found`。

**原因**：stata-mcp 每次调用是**独立的 Stata 进程**，进程间无状态共享。

**解法**：把包检测安装逻辑放在**同一个 do-file 的开头**：

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

* 正式分析代码从这里开始
use 数据, replace
```

---

#### 4. 中文引号导致 Node.js / Stata 语法错误

**现象**：JS 报 `SyntaxError: missing ) after argument list`，或 Stata 报字符串解析错误。

**原因**：中文引号 `"…"` `'…'` 是多字节字符，被当成非法字符。

**解法**：do-file 和 JS 脚本中统一使用 ASCII 引号 `"` `'`。

---

#### 5. Fine-grained PAT 无法通过 API 创建 GitHub 仓库

**现象**：API 返回 `"Resource not accessible by personal access token"`。

**原因**：Fine-grained PAT（`github_pat_` 前缀）默认没有创建仓库的权限，需显式开启"Administration: Read and Write"。

**解法**：用 **classic token**（`ghp_` 前缀），勾选 `repo` scope。

---

### 关键代码模式

**高维固定效应回归（标准写法）**

```stata
global controls Size Age ROA Leverage Growth Rdintensity

* 基准回归：逐步加FE
reghdfe Innov AI_utilize, noabsorb vce(cluster industry_group#year)
est store m1

reghdfe Innov AI_utilize, absorb(year) vce(cluster industry_group#year)
est store m2

reghdfe Innov AI_utilize, absorb(id year) vce(cluster industry_group#year)
est store m3

reghdfe Innov AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)
est store m4

esttab m1 m2 m3 m4 using 表1基准回归.rtf, ///
  replace b(%7.4f) se compress nogap ///
  scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)
```

**2SLS 工具变量（Bartik IV）**

```stata
* Bartik 工具变量：企业初始 AI 份额 × 其他城市第三产业增加值增长率
ivreghdfe Innov $controls (AI_utilize = bartik_iv), ///
  absorb(id year) cluster(industry_group year) first
est store iv1
```

**Oster δ 遗漏变量偏误检验**

```stata
* 受限模型（无控制变量无FE）
reghdfe Innov AI_utilize, noabsorb vce(cluster industry_group#year)
scalar beta_r = _b[AI_utilize]
scalar r2_r   = e(r2)

* 完整模型
reghdfe Innov AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)
scalar beta_f = _b[AI_utilize]
scalar r2_f   = e(r2)

* δ 估计（Rmax 取 1.3×R²_full 的保守估计）
scalar delta = abs(beta_f * (1.3*r2_f - r2_f) / ((beta_r - beta_f) * r2_f))
display "Oster delta = " delta   // > 1 则稳健
```

---

### 自动生成 Word 分析报告（Node.js）

除了 Stata 的 RTF 表格，本项目还用 Node.js 自动把所有回归结果汇总成结构完整的 Word 报告：

```bash
# 安装依赖
npm install -g docx

# 生成报告
NODE_PATH="C:/Users/YourName/AppData/Roaming/npm/node_modules" node demo/demo_report.js
```

> **Windows 注意**：全局安装的 npm 包需要设置 `NODE_PATH` 才能被 `require()` 找到。

---

### 目录结构

```
claude-stata/
├── README.md                      # 本文件：方法论 + 实战记录
├── CLAUDE.md                      # Claude Code 项目指令模板（面板数据项目）
├── case-study/                    # 真实案例：AI 技术应用对企业创新的影响
│   ├── README.md                  # 案例说明与变量文档
│   ├── data.dta                   # 原始面板数据（A 股上市公司，2009–2022）
│   ├── stata_analysis.do          # 原版 Stata 程序（论文附件原版）
│   ├── stata_full_run.do          # 生产版：含自动装包 + 批处理兼容修复
│   ├── python_analysis.py         # Python 转译版（无需 Stata 许可证）
│   ├── generate_report.js         # Node.js Word 报告自动生成
│   └── results/                   # 13 个输出文件（RTF / CSV / DOCX）
├── demo/                          # 模拟数据 demo（无需真实数据即可运行）
│   ├── demo_data_gen.do           # 生成模拟面板数据（500 企业 × 14 年）
│   ├── demo_analysis.do           # 完整实证分析 do-file
│   └── demo_report.js             # Node.js 自动生成 Word 分析报告
├── templates/
│   ├── CLAUDE_template.md         # CLAUDE.md 通用模板
│   └── analysis_template.do       # 实证分析 do-file 通用模板
└── scripts/
    └── setup_and_run.do           # 一键安装依赖包 + 运行 demo
```

---

### 快速开始

```bash
git clone https://github.com/dengls24/claude-stata.git
cd claude-stata

# 配置 stata-mcp（项目级）
claude mcp add stata-mcp --env STATA_MCP_CWD=$(pwd) --scope project -- uvx stata-mcp

# 运行真实案例（MCP 方式）
cd case-study
# 在 Claude Code 中输入：请帮我运行 stata_full_run.do，数据是 data.dta

# 或用 Python（无需 Stata）
pip install pandas numpy statsmodels linearmodels
python case-study/python_analysis.py

# 运行模拟 demo（无需真实数据）
# do scripts/setup_and_run.do
```

---

### 延伸阅读

- [stata-mcp](https://github.com/SepineTam/stata-mcp)：MCP Server 官方文档
- Aniket Panjwani, *"Using Claude Code with Stata — an Economist's Guide"*（[ai-mba.io](https://ai-mba.io)）：系统性配置指南，涵盖 WSL/PATH/PDF 优化等更多场景
- Sant'Anna et al.：DID 方法论最新进展及 Claude Code 工作流实践

---

## English

### What is this

A **battle-tested methodology guide** for integrating Claude Code with Stata, enabling AI-driven end-to-end empirical economics research.

**Validated on**: A real panel data project studying AI adoption and firm innovation (A-share listed firms, 2009–2022, two-way fixed effects). All code, configurations, and gotchas come from first-hand experience.

---

### The three-layer setup

| Layer | Tool | Solves |
|-------|------|--------|
| Execution engine | stata-mcp | Claude can't run Stata directly — MCP bridges them |
| Domain knowledge | Stata Skill | Claude needs Stata syntax/conventions pre-loaded |
| Project memory | CLAUDE.md | Claude needs to know *your* variables, specs, and conventions |

---

### Step 1: Install stata-mcp

```bash
pip install uv

# Project-scoped (recommended)
claude mcp add stata-mcp \
  --env STATA_MCP_CWD=$(pwd) \
  --scope project \
  -- uvx stata-mcp
```

**Windows** — specify Stata path explicitly in `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "stata-mcp": {
      "command": "uvx",
      "args": ["stata-mcp"],
      "env": {
        "STATA_PATH": "D:\\Stata 18\\StataMP-64.exe",
        "STATA_MCP_CWD": "E:\\your-project"
      }
    }
  }
}
```

> **Tested on**: Windows 11 native bash (not WSL) + Stata 18 MP. WSL works too but is not required.

---

### Step 2: Install Stata Skill

```bash
/plugin marketplace add dylantmoore/stata-skill
/plugin install stata@dylantmoore-stata-skill
```

37 reference docs covering panel data, causal inference, and 20 community packages (`reghdfe`, `estout`, `ivreghdfe`, `rdrobust`, `csdid`, etc.). Claude uses these docs when writing do-files instead of guessing.

---

### Step 3: Configure CLAUDE.md

```bash
/init   # generates CLAUDE.md from your project structure
```

Tell Claude your variable names, regression conventions, and output format. Without this, Claude guesses — with this, it gets it right from the first prompt.

---

### Key gotchas (all encountered in production)

| Issue | Root cause | Fix |
|-------|-----------|-----|
| `logout` hangs forever | Needs OLE Automation (Word COM) — unavailable in headless batch | Replace with `putdocx` |
| Nested `do` blocked | stata-mcp security check rejects `^\s*do\s+` | Merge all code into one do-file |
| Package not found after install | Each stata-mcp call is an independent Stata process | Put `cap which ... / ssc install` at the top of the same do-file |
| Chinese quotes cause syntax errors | `"…"` parsed as multi-byte chars | Use ASCII `"` `'` only |
| `NODE_PATH` required for global npm packages | Node `require()` doesn't search global paths by default on Windows | Prepend `NODE_PATH=...` to the node command |
| Fine-grained PAT can't create GitHub repos | Missing "Administration: Read and Write" permission | Use classic token (`ghp_` prefix) with `repo` scope |

---

### Complete empirical pipeline (what we actually ran)

```
Raw data (.dta)
    ├── Descriptive stats ──────────────► putdocx Word
    ├── Baseline regression (stepwise FE) ► esttab RTF
    ├── AI subtypes (5 variables) ────────► esttab RTF
    ├── Endogeneity
    │     ├── Oster δ
    │     ├── PSM-DID
    │     ├── Heckman 2-stage
    │     └── 2SLS (Bartik IV)
    ├── Robustness checks (4 variants)
    ├── Mechanism tests (mediators)
    └── Heterogeneity (industry / size / ownership)
              │
              ▼
    Node.js → Word analysis report (.docx)
```

13 output files generated. Results matched the published paper 100%.

---

### Citation

```bibtex
@misc{claude-stata2025,
  author = {Deng, Lishuo},
  title  = {Claude Code × Stata: A Battle-Tested Methodology for AI-Driven Empirical Economics},
  year   = {2025},
  url    = {https://github.com/dengls24/claude-stata}
}
```

### License

MIT — free to use and adapt for academic research.
