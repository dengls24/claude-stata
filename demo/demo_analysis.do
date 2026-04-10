* ============================================================
* demo_analysis.do
* Claude Code + Stata 经济学实证分析完整 Demo
* 对应论文：AI技术应用对企业创新的影响
* ============================================================

set more off
cd "E:\claude-stata\demo"
use demo_data.dta, replace

global controls "Size Age ROA Leverage Growth Rdintensity"

*** 表1 基准回归 ─────────────────────────────────────────────
* 逐步加入控制变量和固定效应
reghdfe Innov AI_utilize, noabsorb vce(cluster industry_group#year)
est store m1

reghdfe Innov AI_utilize $controls, noabsorb vce(cluster industry_group#year)
est store m2

reghdfe Innov AI_utilize $controls, absorb(year) vce(cluster industry_group#year)
est store m3

reghdfe Innov AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)
est store m4

esttab m1 m2 m3 m4 using baseline.rtf, replace ///
    se compress nogap b(%7.4f) scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01) ///
    title("表1 基准回归：AI技术应用对企业创新的影响")

*** 表2 AI细分技术对企业创新的影响 ─────────────────────────
foreach v in Learningbased KRR NLP CV ML {
    reghdfe Innov `v' $controls, absorb(id year) vce(cluster industry_group#year)
    est store m_`v'
}
esttab m_Learningbased m_KRR m_NLP m_CV m_ML using ai_subtypes.rtf, replace ///
    se compress nogap b(%7.4f) scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01) ///
    title("表2 不同AI技术类型对企业创新的影响")

*** 内生性处理I：Oster δ 遗漏变量偏误检验 ───────────────────
display _newline "=== Oster delta 检验 ==="

* 全集（双向FE + 控制变量）
reghdfe Innov AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)
scalar beta_full = _b[AI_utilize]

* 无控制变量无固定效应
reghdfe Innov AI_utilize, noabsorb vce(cluster industry_group#year)
scalar beta_basic = _b[AI_utilize]
scalar delta1 = abs(beta_full / (beta_basic - beta_full))
display "δ（vs无FE无控制）= " delta1

* 有双向FE无控制变量
reghdfe Innov AI_utilize, absorb(id year) vce(cluster industry_group#year)
scalar beta_fe = _b[AI_utilize]
scalar delta2 = abs(beta_full / (beta_fe - beta_full))
display "δ（vs有FE无控制）= " delta2

* 仅企业FE
reghdfe Innov AI_utilize $controls, absorb(id) vce(cluster industry_group#year)
scalar beta_firmfe = _b[AI_utilize]
scalar delta3 = abs(beta_full / (beta_firmfe - beta_full))
display "δ（vs仅企业FE）= " delta3

*** 表3 内生性处理II：PSM + Heckman ─────────────────────────
* PSM（使用匹配权重）
reghdfe Innov treated $controls [fweight=_weight], ///
    absorb(id year) vce(cluster industry_group#year)
est store m_psm

* Heckman 第一阶段
probit Innov_dummy AI_utilize $controls OverseaBack i.year
est store m_heckman1

* Heckman 第二阶段
reghdfe Innov AI_utilize $controls imr OverseaBack, ///
    absorb(id year) vce(cluster industry_group#year)
est store m_heckman2

esttab m_psm m_heckman1 m_heckman2 using endogeneity.rtf, replace ///
    se compress nogap b(%7.4f) scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01) ///
    title("表3 内生性处理：PSM与Heckman")

*** 工具变量（2SLS）────────────────────────────────────────
ivreghdfe Innov $controls (AI_utilize = IV), ///
    absorb(id year) cluster(yins) first
// 关注：一阶段F统计量、K-P LM检验

*** 表4 稳健性检验 ───────────────────────────────────────────
* 替换被解释变量
reghdfe Innov1 l2.AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)
est store r1
reghdfe Innov1 l3.AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)
est store r2

* 替换解释变量
reghdfe Innov AI_utilize1 $controls, absorb(id year) vce(cluster industry_group#year)
est store r3

* 滞后期
forvalues k = 1/3 {
    reghdfe Innov l`k'.AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)
    est store r_l`k'
}

esttab r1 r2 r3 r_l1 r_l2 r_l3 using robustness1.rtf, replace ///
    se compress nogap b(%7.4f) scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01) ///
    title("表4 稳健性检验：替换变量与滞后处理")

* 调整固定效应与聚类
reghdfe Innov AI_utilize $controls, ///
    absorb(year id id#industry_group) vce(cluster industry_group#year)
est store r_fe

reghdfe Innov AI_utilize $controls, absorb(id year) vce(cluster id)
est store r_clus

reghdfe Innov AI_utilize $controls HHI_assets GDP_growth, ///
    absorb(id year) vce(cluster industry_group#year)
est store r_ctrl

esttab r_fe r_clus r_ctrl using robustness2.rtf, replace ///
    se compress nogap b(%7.4f) scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01) ///
    title("表5 稳健性检验：模型设定")

*** 表5 作用机制检验 ─────────────────────────────────────────
use demo_data.dta, replace
global controls "Size Age ROA Leverage Growth Rdintensity"

reghdfe K_diversity1 AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)
est store mech1
reghdfe K_diversity2 AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)
est store mech2
reghdfe B_routines   AI_utilize $controls, absorb(id year) vce(cluster industry_group)
est store mech3
reghdfe O_resource   AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)
est store mech4

esttab mech1 mech2 mech3 mech4 using mechanism.rtf, replace ///
    se compress nogap b(%7.4f) scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01) ///
    title("表5 作用机制检验")

*** 表6 吸收能力的调节作用 ────────────────────────────────
reghdfe Innov AI_utilize Absorptive1_AI Absorptive1 $controls, ///
    absorb(id year) vce(cluster industry_group#year)
est store abs1

reghdfe Innov AI_utilize Absorptive2_AI Absorptive2 Size Age ROA Leverage Growth, ///
    absorb(id year) vce(cluster industry_group#year)
est store abs2

esttab abs1 abs2 using absorptive.rtf, replace ///
    se compress nogap b(%7.4f) scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01) ///
    title("表6 吸收能力的强化作用")

*** 表7 行业异质性 ──────────────────────────────────────────
forvalues j = 0/2 {
    reghdfe Innov AI_utilize $controls if ysmjd == `j', ///
        absorb(id year) vce(cluster industry_group#year)
    est store ind`j'
}

foreach v in KRR NLP CV ML {
    reghdfe Innov `v' $controls if ysmjd == 2, ///
        absorb(id year) vce(cluster industry_group#year)
    est store ind_`v'
}

esttab ind0 ind1 ind2 ind_KRR ind_NLP ind_CV ind_ML ///
    using industry_het.rtf, replace ///
    se compress nogap b(%7.4f) scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01) ///
    title("表7 行业异质性分析")

*** 表8 企业异质性（生产率与人力资本）──────────────────────
reghdfe Innov OP_AI AI_utilize TFP_OP $controls, ///
    absorb(id year) vce(cluster industry_group#year)
est store firm1
reghdfe Innov LP_AI AI_utilize TFP_LP $controls, ///
    absorb(id year) vce(cluster industry_group#year)
est store firm2
reghdfe Innov HC_AI AI_utilize HC $controls, ///
    absorb(id year) vce(cluster industry_group#year)
est store firm3

esttab firm1 firm2 firm3 using firm_het.rtf, replace ///
    se compress nogap b(%7.4f) scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01) ///
    title("表8 企业异质性分析")

*** 表9 渐进式与突破式创新 ──────────────────────────────────
sort id year
reghdfe lnincremental  AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)
est store inno1
reghdfe lnBreakthrough AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)
est store inno2
reghdfe lnBreakthrough l5.AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)
est store inno3
reghdfe lnBreakthrough l6.AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)
est store inno4

esttab inno1 inno2 inno3 inno4 using innovation_type.rtf, replace ///
    se compress nogap b(%7.4f) scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01) ///
    title("表9 渐进式与突破式创新")

display _newline "=== 全部分析完成，RTF 结果表已输出到当前目录 ==="
