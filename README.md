# Claude Code + Stata 经济学实证分析工作流

> 用 AI 驱动的方式完成面板数据回归、内生性处理、稳健性检验与自动化报告生成

[English](#english) | [中文](#中文)

---

## 中文

### 项目简介

本项目展示如何将 **Claude Code**（Anthropic 官方 CLI）与 **Stata** 深度结合，完成经济学实证研究的全流程自动化：

- 自动检测并安装所需 Stata 包（`reghdfe`、`ivreghdfe`、`estout` 等）
- 执行高维固定效应面板回归、内生性处理、稳健性检验
- 通过 `esttab` 导出标准学术格式 `.rtf` 回归结果表
- 用 Node.js 自动生成结构完整的 Word 数据分析报告（`.docx`）

### 核心工具链

| 工具 | 用途 |
|------|------|
| [Claude Code](https://claude.ai/code) | AI 驱动的代码生成、调试、报告撰写 |
| [stata-mcp](https://github.com/hanlulong/stata-mcp) | 让 Claude 直接调用 Stata 执行 do-file |
| Stata 18 + reghdfe | 高维固定效应回归（HDFE） |
| Node.js + docx | 自动生成 Word 格式分析报告 |

### 目录结构

```
claude-stata/
├── README.md                      # 本文件
├── CLAUDE.md                      # Claude Code 项目指令模板
├── demo/
│   ├── demo_data_gen.do           # 生成模拟面板数据（无需真实数据即可运行）
│   ├── demo_analysis.do           # 完整实证分析 do-file（基准+内生性+稳健性+机制）
│   └── demo_report.js             # 自动生成 Word 分析报告
├── templates/
│   ├── CLAUDE_template.md         # CLAUDE.md 通用模板（适配任意面板数据项目）
│   └── analysis_template.do       # 实证分析 do-file 通用模板
└── scripts/
    └── setup_and_run.do           # 自动安装依赖包 + 运行分析的一键脚本
```

### 快速开始

#### 1. 环境要求

- Stata 15+（推荐 Stata 18 MP）
- Node.js 18+（用于生成 Word 报告）
- Claude Code CLI（`npm install -g @anthropic-ai/claude-code`）
- stata-mcp 插件（在 Claude Code 中配置）

#### 2. 运行 Demo

```bash
# 克隆仓库
git clone https://github.com/dengls24/claude-stata.git
cd claude-stata

# 安装 Node.js 依赖
npm install -g docx

# 在 Stata 中运行（或通过 Claude Code + stata-mcp 执行）
# 第一步：生成模拟数据
stata-mp -b do demo/demo_data_gen.do

# 第二步：运行完整分析
stata-mp -b do scripts/setup_and_run.do

# 第三步：生成 Word 报告
node demo/demo_report.js
```

#### 3. 通过 Claude Code 运行（推荐）

在项目根目录启动 Claude Code，直接对话：

```
请帮我运行 demo 分析，生成回归结果和分析报告
```

Claude 会自动：安装缺失包 → 执行回归 → 读取结果 → 生成报告

### stata-mcp 配置

在 `~/.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "stata": {
      "command": "python",
      "args": ["-m", "stata_mcp"],
      "env": {
        "STATA_PATH": "D:\\Stata 18\\StataMP-64.exe"
      }
    }
  }
}
```

> Windows 路径根据实际安装位置调整

### CLAUDE.md 的作用

项目根目录的 `CLAUDE.md` 文件是 Claude Code 的"项目说明书"，定义：
- 数据路径与变量含义
- 回归规范（使用 `reghdfe` 而非 `areg`）
- 输出格式（`esttab` 参数、文件命名规则）
- 编码约定（`global` 宏、固定效应设定、聚类层级）

详见 `templates/CLAUDE_template.md`。

### 实证分析流程

```
原始数据(.dta)
    │
    ▼
描述性统计 ──► Word 表格
    │
    ▼
基准回归（双向 FE）──► RTF 表格
    │
    ├──► 内生性处理（Oster δ / PSM / Heckman / 2SLS）
    │
    ├──► 稳健性检验（替换变量 / 滞后期 / 调整 FE）
    │
    ├──► 机制检验（中介变量回归）
    │
    └──► 异质性分析（子样本 / 交互项）
              │
              ▼
         Word 分析报告(.docx)
```

### 关键技术要点

**1. 自动安装 Stata 包**

```stata
cap which reghdfe
if _rc != 0 ssc install reghdfe, replace

cap which ftools
if _rc != 0 ssc install ftools, replace
```

**2. 高维固定效应回归标准写法**

```stata
reghdfe y x $controls, absorb(id year) vce(cluster industry_group#year)
est store m1
```

**3. Oster δ 遗漏变量偏误检验**

```stata
* 全集系数
reghdfe y x $controls, absorb(id year) vce(...)
scalar beta_full = _b[x]

* 受限集系数（无控制变量无FE）
reghdfe y x, noabsorb vce(...)
scalar beta_restricted = _b[x]

* 计算 δ
scalar delta = abs(beta_full / (beta_restricted - beta_full))
display "Oster delta: " delta
```

**4. 工具变量（2SLS）**

```stata
ivreghdfe y $controls (x = iv), absorb(id year) cluster(group) first
```

---

## English

### Overview

This project demonstrates how to integrate **Claude Code** (Anthropic's official CLI) with **Stata** for end-to-end empirical economics research automation:

- Auto-detect and install required Stata packages
- Run high-dimensional fixed-effects panel regressions, endogeneity tests, and robustness checks
- Export publication-ready regression tables via `esttab`
- Auto-generate structured Word reports using Node.js

### Toolchain

| Tool | Purpose |
|------|---------|
| [Claude Code](https://claude.ai/code) | AI-driven code generation, debugging, report writing |
| [stata-mcp](https://github.com/hanlulong/stata-mcp) | Enables Claude to execute Stata do-files directly |
| Stata 18 + reghdfe | High-dimensional fixed effects regression |
| Node.js + docx | Automated Word report generation |

### Quick Start

```bash
git clone https://github.com/dengls24/claude-stata.git
cd claude-stata
npm install -g docx

# Run demo analysis
stata-mp -b do scripts/setup_and_run.do

# Generate Word report
node demo/demo_report.js
```

### Key Features

**Automatic Package Installation**

The setup script detects and installs missing Stata community packages before running analysis, eliminating manual setup.

**CLAUDE.md Project Instructions**

A `CLAUDE.md` file in the project root tells Claude Code about your data structure, variable definitions, regression specifications, and output conventions — enabling accurate code generation without repeated prompting.

**Full Empirical Pipeline**

Covers the complete workflow from descriptive statistics through baseline regressions, endogeneity corrections (Oster δ, PSM, Heckman, 2SLS), robustness checks, mechanism tests, and heterogeneity analysis.

### Citation

If you use this workflow in your research, please cite:

```
@misc{claude-stata,
  author = {Deng Lishuo},
  title  = {Claude Code + Stata: An AI-Driven Empirical Economics Workflow},
  year   = {2025},
  url    = {https://github.com/dengls24/claude-stata}
}
```

### License

MIT License — free to use and adapt for academic research.
