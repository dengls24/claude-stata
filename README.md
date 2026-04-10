# Claude Code × Stata 经济学实证分析工作流

> **方法论指南**：如何配置 Claude Code + stata-mcp，用 AI 驱动完整的面板数据实证研究

[中文](#中文) | [English](#english)

---

## 中文

### 这是什么？

本项目是一套**方法论**，记录如何把 Claude Code（Anthropic 官方 CLI）与 Stata 深度集成，让 AI 完成经济学实证研究的全流程——从写代码、调 bug、安装包，到跑回归、导出表格、生成分析报告。

> 本项目由一个真实研究项目（AI 技术应用对企业创新的影响，面板数据 + 双向固定效应）实操验证，所有踩坑记录均来自真实经历。

---

### 核心架构

```
你（研究者）
    │  自然语言指令
    ▼
Claude Code CLI
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

**为什么是这个架构？**

Claude Code 本身无法直接控制 Stata GUI，但可以通过 MCP（Model Context Protocol）调用外部工具。stata-mcp 作为 MCP Server，把"执行一个 do-file"封装成 Claude 可调用的工具。Claude 负责写代码、判断逻辑、解读结果；Stata 负责实际计算。

---

### 第一步：安装 stata-mcp

stata-mcp 由 [SepineTam](https://github.com/SepineTam/stata-mcp) 开发，需要先安装 `uv`（Python 包管理器）：

```bash
# 安装 uv（如已安装跳过）
pip install uv

# 验证 stata-mcp 可用
uvx stata-mcp --version
uvx stata-mcp --usable   # 检测 Stata 是否在默认路径
```

---

### 第二步：配置 Claude Code

**方法 A：命令行一键添加（推荐）**

```bash
claude mcp add stata-mcp --env STATA_MCP_CWD=$(pwd) -- uvx stata-mcp
```

**方法 B：手动编辑 `~/.claude/settings.json`**

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

> **Windows 用户注意**：如果 Stata 不在默认路径，需额外设置：
> ```json
> "env": {
>   "STATA_PATH": "D:\\Stata 18\\StataMP-64.exe",
>   "STATA_MCP_CWD": "E:\\your-project"
> }
> ```

验证配置是否生效：

```bash
claude mcp list
# 应显示 stata-mcp 在列表中
```

---

### 第三步：配置 CLAUDE.md（最关键的一步）

`CLAUDE.md` 是 Claude Code 的"项目说明书"，放在项目根目录，Claude Code 启动时自动读取。**这是 AI 能准确写出你的 Stata 代码的核心**。

一个好的 CLAUDE.md 应当包含：

```markdown
## 数据路径
- 数据文件：`数据.dta`（用 `use 数据, replace` 加载）
- 输出目录：当前工作目录

## 变量说明
- 结局变量：Y（含义）
- 处理变量：X（含义）
- 控制变量 global：var1 var2 var3

## 编码规范（告诉 Claude 用什么命令）
- 固定效应回归用 reghdfe，不用 areg 或 xtreg
- 标准误：vce(cluster industry#year)
- 结果导出：esttab ... using 表名.rtf, replace b(%7.4f) se star(* 0.10 ** 0.05 *** 0.01)

## 注意事项
- logout 在批处理下会卡住，改用 putdocx
- 代码中不要出现中文引号
```

**为什么这一步关键？**

没有 CLAUDE.md，每次对话 Claude 都要重新猜测你的变量名、回归规范、输出格式。有了 CLAUDE.md，Claude 一开口就知道"这个项目用 reghdfe，cluster 到 industry#year，输出 RTF 格式"。

参见 [`templates/CLAUDE_template.md`](templates/CLAUDE_template.md) 获取完整模板。

---

### 第四步：运行分析

在项目目录启动 Claude Code，直接用自然语言：

```
请帮我跑一下基准回归，数据是数据.dta，输出到表1.rtf
```

Claude 会自动：
1. 检查并安装缺失的 Stata 包
2. 生成 do-file
3. 通过 stata-mcp 执行
4. 读取 log 文件判断是否报错
5. 如有错误，自动修正并重跑

---

### 踩坑记录（重要！）

这些坑都是真实踩过的，能帮你节省大量时间：

#### 坑 1：stata-mcp 不允许嵌套 `do` 命令

**现象**：`do 程序.do` 在 do-file 里再调用另一个 `do xxx.do`，报错：
```
Security warning: Dangerous commands detected: pattern `^\s*do\s+`
```

**原因**：stata-mcp 出于安全检查，禁止嵌套 do 调用。

**解决**：把所有逻辑合并进**单个 do-file**，不要嵌套调用。

---

#### 坑 2：`logout` 在批处理下永久卡住

**现象**：`logout, save(描述统计) word replace: tabstat ...` 执行后程序挂起，永不返回。

**原因**：`logout` 依赖 OLE Automation（Windows COM 接口）操作 Word，批处理无头模式下没有 GUI，OLE 调用无法完成。

**解决**：改用 `putdocx` 输出 Word：

```stata
* 错误写法（批处理下卡住）
logout, save(表1) word replace: tabstat y x, stats(n mean sd min max)

* 正确写法
putdocx begin
putdocx paragraph, style(Heading1)
putdocx text ("描述性统计")
putdocx table t1 = etable
putdocx save 描述统计.docx, replace
```

---

#### 坑 3：自动安装包要放在代码最前面

stata-mcp 每次执行是**独立批处理**，无持久 session。如果包安装脚本和分析代码分成两个 do-file，第二次执行时刚装的包未必能找到。

**正确做法**：包检测放在同一个 do-file 的最开头：

```stata
*** 自动安装依赖包
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

*** 正式分析代码从这里开始
use 数据, replace
```

---

#### 坑 4：中文引号导致 JS/Stata 语法错误

在生成报告的 Node.js 脚本或 Stata do-file 中，中文引号 `"…"` `'…'` 会导致解析失败。

**解决**：统一用英文引号 `"` `'`，或在字符串中用 `[` `]` 替代引号。

---

#### 坑 5：fine-grained PAT 无法创建 GitHub 仓库

GitHub 的 fine-grained PAT（`github_pat_` 前缀）默认无权通过 API 创建仓库，需要在 token 设置里显式开启 "Administration: Read and Write"。

**解决**：用 **classic token**（`ghp_` 前缀），勾选 `repo` scope 即可。

---

### 最佳实践总结

| 实践 | 说明 |
|------|------|
| 写好 CLAUDE.md | 定义变量、规范、路径，AI 生成代码准确率大幅提升 |
| 包安装放 do-file 开头 | 每次独立批处理都能自动补装缺失包 |
| 用 putdocx 代替 logout | 批处理无 GUI，logout 会永久卡住 |
| 所有代码放单个 do-file | 避免 stata-mcp 安全检查拦截嵌套 do |
| 输出文件加 `replace` | 避免"文件已存在"报错 |
| `est store` 命名有序 | m1, m2, m3... 便于 esttab 统一导出 |
| 用 `cap` 容错 | `cap drop _merge` 等防止重复执行报错 |

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
    │       ├── 替换因变量/自变量
    │       ├── 滞后期处理
    │       ├── 调整固定效应
    │       └── 缩短样本
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
│   ├── demo_analysis.do           # 完整实证分析（基准+内生性+稳健性+机制+异质性）
│   └── demo_report.js             # 自动生成 Word 分析报告（Node.js）
├── templates/
│   ├── CLAUDE_template.md         # CLAUDE.md 通用模板
│   └── analysis_template.do       # 实证分析 do-file 通用模板
└── scripts/
    └── setup_and_run.do           # 一键安装依赖 + 运行 demo 分析
```

---

### 运行 Demo

```bash
# 克隆仓库
git clone https://github.com/dengls24/claude-stata.git
cd claude-stata

# 安装 Node.js 依赖（用于生成 Word 报告）
npm install -g docx

# 方式一：直接在 Stata 中运行
# 在 Stata 命令窗口：do scripts/setup_and_run.do

# 方式二：通过 Claude Code 运行（推荐体验完整 AI 驱动流程）
claude  # 启动 Claude Code，然后输入：
# "请帮我运行 demo，生成回归结果和分析报告"
```

---

## English

### What is this?

A **methodology guide** for integrating Claude Code (Anthropic's official CLI) with Stata, enabling AI-driven end-to-end empirical economics research — writing code, fixing bugs, installing packages, running regressions, exporting tables, and generating analysis reports.

> Validated on a real research project: impact of AI technology adoption on firm innovation (panel data, two-way fixed effects).

### Architecture

```
You (researcher)
    │  natural language
    ▼
Claude Code CLI
    │  MCP protocol
    ▼
stata-mcp (MCP Server)
    │  batch execution
    ▼
Stata (headless, runs do-files)
    │
    ▼
RTF regression tables + Word reports
```

### Setup

#### 1. Install stata-mcp

```bash
pip install uv
uvx stata-mcp --version
uvx stata-mcp --usable
```

#### 2. Configure Claude Code

```bash
claude mcp add stata-mcp --env STATA_MCP_CWD=$(pwd) -- uvx stata-mcp
```

Or manually in `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "stata-mcp": {
      "command": "uvx",
      "args": ["stata-mcp"]
    }
  }
}
```

#### 3. Write a CLAUDE.md

Place `CLAUDE.md` in your project root. Claude Code reads it automatically on startup. Define your data paths, variable names, regression conventions, and output formats. This is what makes Claude generate accurate Stata code without repeated prompting.

See [`templates/CLAUDE_template.md`](templates/CLAUDE_template.md) for a complete template.

### Key Gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| `logout` hangs forever | Needs OLE/COM GUI — unavailable in headless batch | Replace with `putdocx` |
| Nested `do` blocked | stata-mcp security check rejects `^\s*do\s+` pattern | Merge all code into one do-file |
| Package not found after install | Each stata-mcp call is an independent process | Put `cap which ... / ssc install` at top of same do-file |
| Chinese quotes cause syntax error | `"…"` `'…'` parsed as multi-byte chars | Use ASCII `"` `'` only |

### Run the Demo

```bash
git clone https://github.com/dengls24/claude-stata.git
cd claude-stata
npm install -g docx
# In Stata: do scripts/setup_and_run.do
# Or start Claude Code and ask it to run the demo
```

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
