---
name: stata-diagnostics
description: Diagnose common issues in Claude+Stata empirical economics projects
---

# /stata-diagnostics

扫描当前 Stata 项目，检查常见配置问题、编码陷阱和反模式，输出带修复建议的诊断报告。

Scan the current Stata project for common configuration issues, encoding pitfalls, and anti-patterns, then output a diagnostic report with fix suggestions.

---

## 执行步骤 / Steps

### 1. 检查 CLAUDE.md

查找项目根目录的 `CLAUDE.md`，验证以下配置是否存在：

- `reghdfe` 被指定为主回归命令（而非 `areg`/`xtreg`）
- `vce(cluster ...)` 聚类标准误已配置
- `esttab` RTF 导出格式已定义
- `global` 控制变量宏已定义
- Stata 可执行文件路径已指定
- 数据路径和输出路径已指定
- 所需包列表（reghdfe, ftools, ivreg2, ranktest, estout）

如果 CLAUDE.md 不存在，提示用户从 `templates/CLAUDE_template.md` 复制。

---

### 2. 检查 do-file 编码（最高优先级）

扫描所有 `.do` 文件，检测 UTF-8 BOM（字节序标记）：

```python
with open('file.do', 'rb') as f:
    if f.read(3) == b'\xef\xbb\xbf':
        # 含 BOM — Stata 批处理将静默失败，不产生任何日志
```

发现 BOM 时自动提供修复代码：

```python
with open('file.do', 'r', encoding='utf-8-sig') as f:
    content = f.read()
with open('file.do', 'w', encoding='utf-8') as f:
    f.write(content)
```

---

### 3. 检查中文文件名

列出项目目录中含非 ASCII 字符的文件名，提示：
- macOS→Windows ZIP 传输时可能出现乱码
- 修复方法：`fname.encode('gbk').decode('utf-8')`

---

### 4. 检查所需包

在 CLAUDE.md 和 do-file 中查找包引用，报告缺失项：

| 包 | 用途 | 级别 |
|----|------|------|
| reghdfe | 高维固定效应回归 | 必需 |
| ftools | reghdfe 依赖 | 必需 |
| estout/esttab | 结果导出 | 必需 |
| ivreg2 | IV 估计 | 推荐 |
| ranktest | ivreg2 依赖 | 推荐 |
| psacalc | Oster δ 检验 | 推荐 |
| psmatch2 | PSM 匹配 | 可选 |

---

### 5. 扫描反模式

逐一检查所有 `.do` 文件，报告行号：

**禁用命令：**
- `areg` → 替换为 `reghdfe`
- `xtreg` → 替换为 `reghdfe`

**批处理不兼容：**
- `logout` → 批处理中报错，改用 `putdocx`
- `log using` 含中文路径 → 报 r(603)，移除并依赖自动日志

**语法错误：**
- 中文全角引号 `"..."` `"..."` → 替换为英文 `"..."`

**ivreg2 矩阵秩亏缺风险：**
- `xi: ivreg2` 含大量虚拟变量但无 `partial()` → 建议加 `partial(_I*)`
- `partial(i.varname)` 写法 → 必须改为 `partial(_Ivarname_*)`（xi: 展开后的名称）

**Heckman 收敛风险：**
- `probit` 或 `xi: probit` 在大数据集中 → 建议加 `iterate(100) difficult`

---

### 6. 输出诊断报告

```
========================================
  Stata 项目诊断报告 / Diagnostic Report
  路径：[project path]
  时间：[datetime]
========================================

[配置] CLAUDE.md
  ✓ 存在
  ✓ reghdfe 已配置
  ✗ 未找到 Stata 可执行文件路径

[编码] do-file BOM 检查
  ✗ analysis.do — 含 UTF-8 BOM（批处理静默失败）
  ✓ baseline.do — 正常

[文件名]
  ! 数据.dta — 含中文，ZIP 传输注意编码

[包依赖]
  ✓ reghdfe, ftools, estout
  ✗ ranktest — 未列出（ivreg2 必需依赖）

[反模式]
  ✗ robust.do:42 — 使用了 areg，建议替换为 reghdfe
  ✗ iv_est.do:87 — xi: ivreg2 缺少 partial()
  ✓ 未发现中文引号
  ✓ 未发现 logout

[修复优先级]
  高：analysis.do BOM 编码（否则批处理无日志）
  高：iv_est.do:87 加 partial(_I*) 避免矩阵秩亏缺
  中：CLAUDE.md 补充 ranktest
  低：areg → reghdfe
========================================
```

发现问题后询问用户是否自动修复（BOM 可自动修复；其他需确认）。
