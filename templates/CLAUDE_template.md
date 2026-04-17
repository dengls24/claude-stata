# 经济学实证研究项目说明

## 项目概述
研究 [研究主题]，核心识别策略为高维固定效应面板回归（双向固定效应：企业 + 年份）。

## 数据路径
- 原始数据：`数据/数据.dta`
- 输出结果（RTF）：`结果/`
- do-file：`程序/`

## 变量说明
- 结局变量：`Y`（[因变量描述]）
- 核心处理变量：`X`（[处理变量描述]）
- 控制变量（global xx）：`Size Age ROA Leverage Growth`
- 固定效应：`id`（企业）、`year`（年份）
- 聚类标准误：`industry_group#year`

## 编码规范
- 使用 `reghdfe` 做高维固定效应回归，**不用** `areg` 或 `xtreg`
- 标准误统一用 `vce(cluster industry_group#year)`
- 回归结果统一用 `esttab` 导出为 `.rtf`，格式：`b(%7.4f) se compress nogap scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)`
- 控制变量通过 `global xx` 宏定义，引用时写 `$xx`
- 每个回归结果用 `est store m1`、`m2`... 依次存储

## 所需 Stata 包
```stata
ssc install reghdfe
ssc install ftools
ssc install ivreg2
ssc install ranktest
ssc install estout
ssc install psacalc
ssc install psmatch2
```

## 研究设计
- 基准回归：逐步加入控制变量和固定效应（无FE → 年FE → 双向FE）
- 内生性处理：Oster δ 检验、IV 估计、PSM-DID、Heckman 两阶段
- 稳健性检验：替换变量、子样本、Bootstrap
- 机制检验与异质性分析

## 工作流规范
- 加载数据统一写：`use 数据文件名, clear`（相对路径，运行前 `cd` 到数据目录）
- 分析脚本命名：`02_analysis_*.do`；稳健性脚本：`03_robust_*.do`
- 每段代码前用 `***` 注释说明对应的表格编号和内容

## 已知陷阱与修复方案

### 陷阱 1：macOS ZIP 解压后中文文件名乱码

**问题**：macOS 打包 ZIP 时文件名编码为 UTF-8，Windows 解压时按 GBK/CP936 解读，导致中文文件名变成乱码。

**修复**：用以下 Python 脚本重命名乱码文件：

```python
import os

for fname in os.listdir('.'):
    try:
        correct = fname.encode('gbk').decode('utf-8')
        if correct != fname:
            os.rename(fname, correct)
            print(f"已修复: {fname} -> {correct}")
    except (UnicodeDecodeError, UnicodeEncodeError):
        pass
```

或解压时直接修正：

```python
import zipfile

with zipfile.ZipFile('archive.zip', 'r') as zf:
    for info in zf.infolist():
        correct_name = info.filename.encode('gbk').decode('utf-8')
        data = zf.read(info.filename)
        with open(correct_name, 'wb') as f:
            f.write(data)
```

---

### 陷阱 2：do-file 必须是 UTF-8 无 BOM 编码

**问题**：Python 写文件时若用 `encoding='utf-8-sig'`（带 BOM），Stata 批处理会静默失败——不产生任何日志，也不报错。

**修复**：写 do-file 时始终用 `utf-8`（无 BOM）：

```python
# 错误（带 BOM，Stata 静默失败）
with open('analysis.do', 'w', encoding='utf-8-sig') as f:
    f.write(content)

# 正确（无 BOM）
with open('analysis.do', 'w', encoding='utf-8') as f:
    f.write(content)

# 修复已有含 BOM 的文件
with open('analysis.do', 'r', encoding='utf-8-sig') as f:
    content = f.read()
with open('analysis.do', 'w', encoding='utf-8') as f:
    f.write(content)
```

---

### 陷阱 3：`ivreg2` 使用 `xi:` 虚拟变量时矩条件矩阵秩不足

**问题**：`xi: ivreg2` 配合大量国家/行业虚拟变量时，单例观测使矩条件协方差矩阵秩亏缺，报警告：
```
Warning: estimated covariance matrix of moment conditions not of full rank.
overidentification statistic not reported, and standard errors and model tests
should be interpreted with caution.
Possible causes: singleton dummy variable (dummy with one 1 and N-1 0s or vice versa)
partial option may address problem.
```

**修复**：加入 `partial()` 选项，将虚拟变量从矩条件中剔除。`partial()` 里**必须用 `xi:` 展开后的变量名**（如 `_Icountryco_*`），不能用 `i.countrycode`：

```stata
* 错误写法（i. 前缀在 ivreg2 的 partial() 中无效，报错）
xi: ivreg2 y (x = z) i.countrycode i.year, r first partial(i.countrycode)

* 正确写法（先让 xi: 展开，再用展开后的名称）
xi: ivreg2 y (x = z) Size Lev Growth _Icountryco_* i.year, ///
    r first partial(_Icountryco_*)
```

`xi:` 展开后的变量名前缀规则：变量名截断到 8 字符后加 `_I` 前缀。例如 `countrycode` → `_Icountryco_*`，`industry` → `_Iindustry_*`。

---

### 陷阱 4：大数据集 Heckman Probit 不收敛

**问题**：数据量 200MB 以上、含 80+ 个国家虚拟变量时，`xi: probit` 可能迭代 50+ 次仍不收敛，日志显示 "not concave"。

**修复策略**（按优先级）：

```stata
* 策略一：增加迭代次数 + difficult 选项
xi: probit select_var $controls _Icountryco_* i.year, ///
    iterate(100) difficult vce(cluster id)

* 策略二：去掉部分虚拟变量，改用连续变量替代（如 GDP 代替国家固定效应）
xi: probit select_var $controls gdp_per_capita i.year, ///
    iterate(100) difficult vce(cluster id)

* 策略三：用 logit 替代 probit（收敛更稳定）
xi: logit select_var $controls _Icountryco_* i.year, ///
    iterate(100) difficult vce(cluster id)
```

---

### 附：Windows 批处理执行 Stata 的正确方式

**问题**：`log using` 指定中文路径时报 `r(603)` 错误；Git Bash 下 `/b` 标志失效。

**修复**：

1. do-file 内**不写 `log using`**，Stata 批处理自动生成同名 `.log` 文件
2. 用 PowerShell 调用，`-WorkingDirectory` 指定 ASCII 路径控制日志位置：

```powershell
Start-Process -FilePath 'D:\Stata 18\StataMP-64.exe' `
    -ArgumentList '/e', 'do', 'D:\stata_run\analysis.do' `
    -WorkingDirectory 'D:\stata_run' `
    -Wait
# 日志自动生成为 D:\stata_run\analysis.log
```

## 注意事项
- Stata 路径：`D:\Stata 18\StataMP-64.exe`
- 通过 stata-mcp 执行 do-file，每次执行是独立批处理，无持久 session
- 输出文件如已存在，加 `replace` 参数覆盖
- 批处理模式下不要使用 `logout`（需要交互式 Stata 环境）
- 中文全角引号 `"..."` 会导致 Stata 语法错误，始终用英文引号 `"..."`
