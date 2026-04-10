# 经济学实证研究项目说明（CLAUDE.md 模板）

> 复制本文件到你的项目根目录，并按实际情况修改。
> Claude Code 启动时会自动读取此文件，作为项目上下文。

## 项目概述

研究主题：[填写你的研究问题，例如：AI 技术应用对企业创新的影响]
核心识别策略：高维固定效应面板回归（双向固定效应：企业 + 年份）
数据来源：[填写数据库，例如：CSMAR、WIND、CCER]
样本期间：[例如：2009—2022 年]

## 数据路径

- 原始数据：`数据.dta`（相对路径，运行前 cd 到数据目录）
- 输出结果（RTF/CSV）：当前工作目录
- 主程序：`程序.do`

## 变量说明

- 结局变量：`Y`（[变量含义]）
- 核心处理变量：`X`（[变量含义]）
- 控制变量（global controls）：`control1 control2 control3 ...`
- 固定效应：`id`（企业）、`year`（年份）
- 聚类标准误：`industry_group#year`（行业-年份双向聚类）

> 根据你的实际变量替换上述占位符

## 编码规范

- 使用 `reghdfe` 做高维固定效应回归，**不用** `areg` 或 `xtreg`
- 标准误统一用 `vce(cluster industry_group#year)`
- 回归结果用 `esttab` 导出为 `.rtf`，格式：
  ```stata
  esttab m1 m2 ... using 表名.rtf, replace se compress nogap b(%7.4f) scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)
  ```
- 描述性统计用 `tabstat` 输出
- 控制变量通过 `global controls` 宏定义，引用时写 `$controls`
- 每个回归结果用 `est store m1`、`m2`... 依次存储

## 研究设计

- **基准回归**：逐步加入控制变量和固定效应（无FE → 年FE → 双向FE）
- **内生性处理**：
  - Oster δ 遗漏变量偏误检验
  - PSM-DID（倾向得分匹配）
  - Heckman 两阶段选择模型
  - IV 估计（工具变量：[填写工具变量及理由]）
- **稳健性检验**：替换变量、滞后期处理、调整固定效应、缩短样本
- **机制检验**：[填写中介变量]
- **异质性分析**：[填写分组维度]

## 工作流规范

- 加载数据：`use 数据, replace`（相对路径，运行前 cd 到数据目录）
- 新建分析脚本命名：`02_analysis_*.do`；稳健性脚本：`03_robust_*.do`
- 每段代码前用 `***` 注释说明对应的表格编号和内容
- 输出文件如已存在，加 `replace` 参数覆盖

## 注意事项

- Stata 路径：`D:\Stata 18\StataMP-64.exe`（根据实际安装路径修改）
- 通过 stata-mcp 执行 do-file，每次执行是独立批处理，无持久 session
- 代码中避免使用中文引号（" "），改用英文引号或省略
- `logout` 命令在批处理模式下会卡住，改用 `putdocx` 输出 Word 文件
