# 经济学实证研究 CLAUDE.md 通用模板

> 使用说明：
> 1. 复制本文件到你的项目根目录，重命名为 CLAUDE.md
> 2. 按照 [方括号] 提示填写你的实际信息
> 3. Claude Code 启动时自动读取此文件

## 项目概述

**研究问题**：[例：AI 技术应用对企业创新的影响]
**识别策略**：高维固定效应面板回归（双向固定效应：企业 + 年份）
**数据来源**：[例：CSMAR、WIND、CCER、手工整理]
**样本期间**：[例：2009—2022 年]
**样本范围**：[例：中国 A 股上市公司，剔除金融行业和 ST 样本]

## 数据路径

```
项目根目录/
├── 数据.dta          ← 原始数据（运行前 cd 到此目录）
├── 程序.do           ← 主程序
└── 输出/             ← RTF/CSV 结果（自动创建）
```

## 变量说明

| 变量名 | 含义 | 类型 |
|--------|------|------|
| `Y` | [结局变量，例：Innov 企业创新] | 因变量 |
| `X` | [处理变量，例：AI_utilize AI应用] | 核心自变量 |
| `control1` | [例：Size 企业规模] | 控制变量 |
| `control2` | [例：Age 企业年龄] | 控制变量 |
| `id` | 企业固定效应标识符 | FE |
| `year` | 年份固定效应标识符 | FE |
| `industry_group` | 行业分组（聚类用） | 聚类 |

**全局宏定义**：

```stata
global controls "Size Age ROA Leverage Growth Rdintensity"
```

## 计量规范

### 核心原则

- 使用 `reghdfe` 做高维固定效应回归，**不用** `areg` 或 `xtreg`
- 标准误统一用 `vce(cluster industry_group#year)`（行业-年份双向聚类）
- 回归结果用 `esttab` 导出 `.rtf`，格式固定如下

### esttab 标准导出格式

```stata
esttab m1 m2 m3 using 表名.rtf, replace ///
    se compress nogap b(%7.4f) ///
    scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01)
```

### 标准回归模块

```stata
* 基准回归（双向FE）
reghdfe Y X $controls, absorb(id year) vce(cluster industry_group#year)
est store m1

* IV（2SLS）
ivreghdfe Y $controls (X = IV), absorb(id year) cluster(yins) first

* 工具变量显著性判断：Kleibergen-Paap rk F > 16.38（10%弱IV临界值）
```

## 内生性处理清单

- [ ] Oster δ 遗漏变量偏误检验（δ > 1 为安全阈值）
- [ ] PSM-DID（使用 `[fweight=_weight]`）
- [ ] Heckman 两阶段（排他性变量：`OverseaBack` 或其他）
- [ ] 工具变量 2SLS（说明工具变量来源与构造逻辑）

## 稳健性检验清单

- [ ] 替换被解释变量
- [ ] 替换核心解释变量
- [ ] 解释变量滞后 1-3 期
- [ ] 调整固定效应设定
- [ ] 聚类至企业层面
- [ ] 增加宏观控制变量（HHI、GDP 增速）
- [ ] 缩短样本范围（如剔除 2014 年前）

## 输出规范

| 输出类型 | 格式 | 命名规则 |
|----------|------|----------|
| 回归结果表 | `.rtf` | `表名.rtf` |
| 描述性统计 | `.docx` | `描述性统计.docx` |
| 分析报告 | `.docx` | `分析报告.docx` |

## 编码约定

```stata
* 加载数据
use 数据, replace

* 控制变量全局宏
global controls "..."

* 按序存储估计结果
est store m1
est store m2
...

* 输出文件已存在时覆盖
esttab ... using 表名.rtf, replace ...
```

## 注意事项

1. **Stata 路径**：`D:\Stata 18\StataMP-64.exe`（根据实际修改）
2. **logout 问题**：`logout` 在批处理下会卡住，改用 `putdocx` 输出 Word
3. **中文引号**：do-file 中避免用 `"` `"`，改用英文双引号 `"`
4. **嵌套 do**：stata-mcp 安全检查会拦截嵌套 `do` 命令，将所有代码合并为单一 do-file
5. **缺少包**：运行前先执行 `scripts/setup_and_run.do` 安装依赖

## 常见 Stata 包

| 包名 | 用途 | 安装 |
|------|------|------|
| `reghdfe` | 高维固定效应回归 | `ssc install reghdfe` |
| `ftools` | reghdfe 依赖 | `ssc install ftools` |
| `ivreghdfe` | IV + HDFE | `ssc install ivreghdfe` |
| `ivreg2` | ivreghdfe 依赖 | `ssc install ivreg2` |
| `estout` | esttab 回归表 | `ssc install estout` |
| `psmatch2` | PSM 匹配 | `ssc install psmatch2` |
