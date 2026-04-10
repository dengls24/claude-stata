* ============================================================
* analysis_template.do
* 经济学面板数据实证分析通用模板
* 按照 [方括号] 提示替换为你的实际变量名
* ============================================================

set more off
cd "[数据目录路径]"
use [数据文件名], replace

* 定义控制变量全局宏
global controls "[control1 control2 control3 ...]"

*** 一、描述性统计 ────────────────────────────────────────────
tabstat [Y X $controls], s(N mean sd min max) f(%12.4f) c(s)

*** 二、基准回归 ──────────────────────────────────────────────
* 列(1)：无控制变量无固定效应
reghdfe [Y] [X], noabsorb vce(cluster industry_group#year)
est store m1

* 列(2)：加入控制变量
reghdfe [Y] [X] $controls, noabsorb vce(cluster industry_group#year)
est store m2

* 列(3)：加入年份固定效应
reghdfe [Y] [X] $controls, absorb(year) vce(cluster industry_group#year)
est store m3

* 列(4)：双向固定效应（核心规格）
reghdfe [Y] [X] $controls, absorb(id year) vce(cluster industry_group#year)
est store m4

esttab m1 m2 m3 m4 using 基准回归.rtf, replace ///
    se compress nogap b(%7.4f) scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01)

*** 三、内生性处理I：Oster δ ──────────────────────────────────
* 保存全集回归系数
reghdfe [Y] [X] $controls, absorb(id year) vce(cluster industry_group#year)
scalar beta_full = _b[[X]]

* 计算 δ（相对于受限规格）
reghdfe [Y] [X], noabsorb vce(cluster industry_group#year)
scalar beta_basic = _b[[X]]
scalar delta = abs(beta_full / (beta_basic - beta_full))
display "Oster delta = " delta
* delta > 1：遗漏变量威胁可控

*** 四、内生性处理II：PSM + Heckman ──────────────────────────
* PSM（需提前做好匹配，生成 treated 和 _weight）
reghdfe [Y] treated $controls [fweight=_weight], ///
    absorb(id year) vce(cluster industry_group#year)
est store m_psm

* Heckman 第一阶段（Probit）
probit [Y_dummy] [X] $controls [排他性变量] i.year
est store m_heck1

* Heckman 第二阶段（将 IMR 加入回归）
* 先计算 IMR：predict imr, pr -> gen imr = normalden(imr)/normal(imr)
reghdfe [Y] [X] $controls imr [排他性变量], ///
    absorb(id year) vce(cluster industry_group#year)
est store m_heck2

esttab m_psm m_heck1 m_heck2 using 内生性处理.rtf, replace ///
    se compress nogap b(%7.4f) scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01)

*** 五、工具变量（2SLS）─────────────────────────────────────
ivreghdfe [Y] $controls ([X] = [IV]), ///
    absorb(id year) cluster([聚类变量]) first
* 检查：一阶段 F > 16.38（K-P 10% 临界值），K-P LM 显著

*** 六、稳健性检验 ───────────────────────────────────────────
* 替换被解释变量 / 解释变量
reghdfe [Y_alt] [X] $controls, absorb(id year) vce(cluster industry_group#year)
est store r1
reghdfe [Y] [X_alt] $controls, absorb(id year) vce(cluster industry_group#year)
est store r2

* 滞后期
forvalues k = 1/3 {
    reghdfe [Y] l`k'.[X] $controls, absorb(id year) vce(cluster industry_group#year)
    est store r_l`k'
}

* 调整固定效应
reghdfe [Y] [X] $controls, absorb(id year id#industry_group) vce(cluster industry_group#year)
est store r_fe

* 聚类至企业层面
reghdfe [Y] [X] $controls, absorb(id year) vce(cluster id)
est store r_clus

esttab r1 r2 r_l1 r_l2 r_l3 r_fe r_clus using 稳健性检验.rtf, replace ///
    se compress nogap b(%7.4f) scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01)

*** 七、机制检验 ─────────────────────────────────────────────
foreach mvar in [mechanism1 mechanism2 mechanism3] {
    reghdfe `mvar' [X] $controls, absorb(id year) vce(cluster industry_group#year)
    est store mech_`mvar'
}
esttab mech_* using 机制检验.rtf, replace ///
    se compress nogap b(%7.4f) scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01)

*** 八、异质性分析 ───────────────────────────────────────────
* 子样本分组回归
levelsof [分组变量], local(groups)
foreach g of local groups {
    reghdfe [Y] [X] $controls if [分组变量] == `g', ///
        absorb(id year) vce(cluster industry_group#year)
    est store het_`g'
}
esttab het_* using 异质性分析.rtf, replace ///
    se compress nogap b(%7.4f) scalars(N r2_a) ///
    star(* 0.10 ** 0.05 *** 0.01)

display "分析完成"
