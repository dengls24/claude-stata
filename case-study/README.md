# 实战案例：AI 技术应用对企业创新的影响

本目录是本仓库方法论的**真实落地案例**，完整复现了一篇实证论文的全部分析流程。

## 研究背景

- **研究问题**：AI 技术应用（及细分类别）如何影响企业创新？
- **数据**：2009–2022 年中国 A 股上市公司面板数据（`data.dta`）
- **识别策略**：双向固定效应（企业 + 年份）+ 多种内生性处理
- **参考论文**：《人工智能技术应用如何影响企业创新》，《中国工业经济》

## 文件说明

### 代码

| 文件 | 说明 |
|------|------|
| `stata_analysis.do` | 原始 Stata 分析程序（论文附件原版） |
| `stata_full_run.do` | 完整运行版：含自动安装依赖包 + 修复批处理兼容问题（`putdocx` 替代 `logout`） |
| `python_analysis.py` | Python 转译版：用 `statsmodels` + `linearmodels` 实现相同分析 |
| `generate_report.js` | Node.js 脚本：读取回归结果，自动生成 Word 分析报告 |

### 数据

| 文件 | 说明 |
|------|------|
| `data.dta` | 原始面板数据（Stata 格式，13MB）|

主要变量：
- `Innov`：企业创新（专利申请数对数）
- `AI_utilize`：AI 技术应用综合指标
- `Learningbased` / `KRR` / `NLP` / `CV` / `ML`：AI 细分类别
- `Size` / `Age` / `ROA` / `Leverage` / `Growth` / `Rdintensity`：控制变量
- `id`（企业）/ `year`（年份）：固定效应
- `industry_group`：行业分组（用于双向聚类）

### 输出结果（`results/`）

| 文件 | 对应分析 |
|------|----------|
| `基准回归结果.rtf/.csv` | 主回归：逐步加入固定效应和控制变量 |
| `基于不同AI技术应用对企业创新的影响.rtf/.csv` | AI 细分变量（5 类）回归 |
| `内生性处理2-1.rtf/.csv` | PSM-DID + Heckman + 2SLS Bartik IV |
| `稳健性检验1.rtf/.csv` | 替换变量 + 滞后期处理 |
| `稳健性检验2-1.rtf/.csv` | 调整固定效应 + 缩短样本 |
| `稳健性检验2-2.rtf/.csv` | Bootstrap 标准误 |
| `作用机制1.rtf/.csv` | 中介变量回归（机制检验） |
| `吸收能力.rtf/.csv` | 吸收能力异质性 |
| `企业异质性.rtf/.csv` | 企业规模 / 所有制异质性 |
| `不同行业中AI技术应用的创新影响.rtf/.csv` | 行业异质性 |
| `AI与渐进式突破式创新.rtf/.csv` | 渐进式 vs 突破式创新 |
| `描述性统计结果n.rtf/.docx` | 描述性统计 |
| `AI技术应用与企业创新实证分析报告.docx` | 自动生成的完整 Word 分析报告 |

---

## 两种运行方式

### 方式一：stata-mcp（MCP 调用，推荐）

配置好 stata-mcp 后，在 Claude Code 中直接对话：

```
请帮我运行 case-study/stata_full_run.do，数据在 case-study/data.dta
```

Claude 会自动安装缺失包、执行回归、读取结果、在出错时自动修正。

或手动在 Stata 中运行：

```stata
cd "path/to/case-study"
do stata_full_run.do
```

### 方式二：Python 转译版（无需 Stata）

```bash
pip install pandas numpy statsmodels linearmodels
python case-study/python_analysis.py
```

Python 版用 `linearmodels.PanelOLS` 实现双向固定效应，`statsmodels` 做描述统计，输出 CSV 格式结果。

---

## 关键技术点

**stata_full_run.do 相比原版 stata_analysis.do 的改动**：

1. 开头加入自动包安装（`cap which reghdfe / ssc install`）
2. 将 `logout` Word 输出改为 `putdocx`（原版在批处理下永久卡住）
3. 所有代码合并为单文件（stata-mcp 安全检查禁止嵌套 `do`）

详见仓库根目录 [README.md](../README.md) 的踩坑记录章节。
