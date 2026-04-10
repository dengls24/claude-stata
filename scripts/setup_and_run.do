* ============================================================
* setup_and_run.do
* 一键安装依赖包 + 运行完整 demo 分析
* 用法：stata-mp -b do scripts/setup_and_run.do
* ============================================================

set more off

* ── 第一步：安装所需社区包 ──────────────────────────────
display "正在检查并安装依赖包..."

cap which ftools
if _rc != 0 {
    display "安装 ftools..."
    ssc install ftools, replace
}

cap which reghdfe
if _rc != 0 {
    display "安装 reghdfe..."
    ssc install reghdfe, replace
}

cap which ivreg2
if _rc != 0 {
    display "安装 ivreg2..."
    ssc install ivreg2, replace
}

cap which ivreghdfe
if _rc != 0 {
    display "安装 ivreghdfe..."
    ssc install ivreghdfe, replace
}

cap which esttab
if _rc != 0 {
    display "安装 estout..."
    ssc install estout, replace
}

display "依赖包检查完成"

* ── 第二步：生成模拟数据 ─────────────────────────────────
display _newline "正在生成模拟数据..."
cd "E:\claude-stata\demo"
quietly do demo_data_gen.do
display "模拟数据生成完成：demo_data.dta"

* ── 第三步：运行完整分析 ─────────────────────────────────
display _newline "开始运行实证分析..."
quietly do demo_analysis.do

display _newline "============================================"
display "全部完成！输出文件："
display "  baseline.rtf         - 基准回归"
display "  ai_subtypes.rtf      - AI细分技术"
display "  endogeneity.rtf      - 内生性处理"
display "  robustness1.rtf      - 稳健性检验I"
display "  robustness2.rtf      - 稳健性检验II"
display "  mechanism.rtf        - 机制检验"
display "  absorptive.rtf       - 吸收能力"
display "  industry_het.rtf     - 行业异质性"
display "  firm_het.rtf         - 企业异质性"
display "  innovation_type.rtf  - 创新类型"
display "============================================"
display "下一步：node demo/demo_report.js 生成 Word 报告"
