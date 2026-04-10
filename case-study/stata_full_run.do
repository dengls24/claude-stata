set more off
cd "e:\asic-soc\7-项目\a-CIM\大模型\金融\李玉花+附件上传"

* ── 安装依赖包 ──────────────────────────────────────────────
cap which ftools
if _rc != 0 ssc install ftools, replace

cap which reghdfe
if _rc != 0 ssc install reghdfe, replace

cap which ivreg2
if _rc != 0 ssc install ivreg2, replace

cap which ivreghdfe
if _rc != 0 ssc install ivreghdfe, replace

cap which esttab
if _rc != 0 ssc install estout, replace

cap which logout
if _rc != 0 ssc install logout, replace

* ── 主程序开始 ──────────────────────────────────────────────
use 数据,replace

***表AI 描述性统计
tabstat Innov AI_utilize Size Age ROA Leverage Growth Rdintensity ,s(N mean sd min max) f(%12.4f) c(s)
* logout Word导出在批处理模式下会卡住，改用 putdocx 输出
quietly {
    putdocx begin
    putdocx paragraph, style(Title)
    putdocx text ("描述性统计")
    putdocx table tbl = (9, 6), border(all, single)
    putdocx table tbl(1,1) = ("Variable")
    putdocx table tbl(1,2) = ("N")
    putdocx table tbl(1,3) = ("Mean")
    putdocx table tbl(1,4) = ("SD")
    putdocx table tbl(1,5) = ("Min")
    putdocx table tbl(1,6) = ("Max")
    local vars "Innov AI_utilize Size Age ROA Leverage Growth Rdintensity"
    local row = 2
    foreach v of local vars {
        quietly tabstat `v', s(N mean sd min max) save
        matrix r = r(StatTotal)
        putdocx table tbl(`row',1) = ("`v'")
        putdocx table tbl(`row',2) = (r[1,1])
        putdocx table tbl(`row',3) = (r[1,2])
        putdocx table tbl(`row',4) = (r[1,3])
        putdocx table tbl(`row',5) = (r[1,4])
        putdocx table tbl(`row',6) = (r[1,5])
        local ++row
    }
    putdocx save 描述性统计结果n.docx, replace
}

****实证分析部分****
**表1 基准回归结果
global xx " Size Age ROA Leverage Growth Rdintensity" //控制变量
reghdfe Innov AI_utilize ,noabsorb  vce(cluster industry_group#year)
est store m1
reghdfe Innov AI_utilize $xx ,noabsorb vce(cluster industry_group#year)
est store m2
reghdfe Innov AI_utilize $xx ,absorb(year)  vce(cluster industry_group#year)
est store m3
reghdfe Innov AI_utilize $xx ,absorb(id year)  vce(cluster industry_group#year)
est store m4
esttab m1 m2 m3 m4 using 基准回归结果.rtf, replace se compress nogap b(%7.4f) scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)

**表2 基于不同AI技术应用对企业创新的影响
reghdfe Innov Learningbased $xx ,absorb(id year)  vce(cluster industry_group#year)
est store m1
reghdfe Innov KRR $xx ,absorb(id year)  vce(cluster industry_group#year) //KRR为知识表示与推理
est store m2
reghdfe Innov NLP $xx ,absorb(id year)  vce(cluster industry_group#year) //NLP为自然语言处理
est store m3
reghdfe Innov CV $xx ,absorb(id year)  vce(cluster industry_group#year) //CV为计算机视觉
est store m4
reghdfe Innov ML $xx ,absorb(id year)  vce(cluster industry_group#year) //ML为机器学习
est store m5
esttab m1 m2 m3 m4 m5 using 基于不同AI技术应用对企业创新的影响.rtf, replace se compress nogap b(%7.4f) scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)

**内生性处理**
*1 表3 内生性处理Ⅰ：遗漏变量偏误检验
*全集
reghdfe Innov AI_utilize $xx ,absorb(id year)  vce(cluster industry_group#year)
scalar beta_x_full = _b[AI_utilize]
*(1)无控制变量和固定效应
reghdfe Innov AI_utilize ,noabsorb  vce(cluster industry_group#year)
scalar beta_x_basic = _b[AI_utilize]
scalar F = abs(beta_x_full/ (beta_x_basic - beta_x_full))
display "Statistical measure F: " F
*（2）无控制变量，有固定效应
reghdfe Innov AI_utilize,absorb(id year) vce(cluster industry_group#year)
scalar beta_x_nocontrol = _b[AI_utilize]
scalar F = abs(beta_x_full/ (beta_x_nocontrol - beta_x_full))
display "Statistical measure F: " F
*（3）有控制变量，有企业固定
reghdfe Innov AI_utilize $xx ,absorb(id)  vce(cluster industry_group#year)
scalar beta_x_firm = _b[AI_utilize]
scalar F = abs(beta_x_full/ (beta_x_firm - beta_x_full))
display "Statistical measure F: " F

*2 表4 内生性处理Ⅱ
*PSM+heckman 对应表4的（1）——（3）列
reghdfe Innov treated $xx [fweight=_weight] ,absorb(id year) vce(cluster industry_group#year) //PSM
est store m1
probit Innov_dummy AI_utilize $xx OverseaBack i.year //heckman第一阶段
est store m2
reghdfe Innov AI_utilize $xx imr OverseaBack, absorb(id year) vce(cluster industry_group#year) //heckman第二阶段
est store m3
esttab m1 m2 m3 using 内生性处理2-1.rtf, replace se compress nogap b(%7.4f) scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)

*工具变量 对应表4的（4）、（5）列
ivreghdfe Innov $xx (AI_utilize=IV),absorb(id year)  cluster(yins) first //2sls

**稳健性检验**
*（1）表A2 稳健性检验Ⅰ
*替换被解释变量 表A2的第（1）、（2）列
reghdfe Innov1 l2.AI_utilize $xx ,absorb(id year) vce(cluster industry_group#year)
est store m1
reghdfe Innov1 l3.AI_utilize $xx ,absorb(id year)  vce(cluster industry_group#year)
est store m2
*替换解释变量 表A2的第（3）列
reghdfe Innov AI_utilize1 $xx ,absorb(id year) vce(cluster industry_group#year)
est store m3
*解释变量的滞后期 表A2的第（4）——（6）列
reghdfe Innov l.AI_utilize $xx ,absorb(id year) vce(cluster industry_group#year)
est store m4
reghdfe Innov l2.AI_utilize $xx ,absorb(id year) vce(cluster industry_group#year)
est store m5
reghdfe Innov l3.AI_utilize $xx ,absorb(id year) vce(cluster industry_group#year)
est store m6
esttab m1 m2 m3 m4 m5 m6 using 稳健性检验1.rtf, replace se compress nogap b(%7.4f) scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)

*（2）表A4 稳健性检验Ⅱ
*表A4的第（1）——（3）列
reghdfe Innov AI_utilize $xx ,absorb(year id id#industry_group) vce(cluster industry_group#year) //调整固定效应
est store m1
reghdfe Innov AI_utilize $xx ,absorb(id year) vce(cluster id) //聚类至企业层面
est store m2
reghdfe Innov AI_utilize $xx HHI_资产 GDP增速,absorb(id year )  vce(cluster industry_group#year) //增加控制变量
est store m3
esttab m1 m2 m3 using 稳健性检验2-1.rtf, replace se compress nogap b(%7.4f) scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)
*表A4的第（4）列
drop if year<2014
reghdfe Innov AI_utilize $xx ,absorb(id year) vce(cluster industry_group#year) //样本范围调整
est store m4
esttab  m4 using 稳健性检验2-2.rtf, replace se compress nogap b(%7.4f) scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)

***作用机制检验***
use 数据,replace
*表5 作用机制检验
reghdfe K_diversity1 AI_utilize $xx ,absorb(id year)  vce(cluster industry_group#year) //K_diversity1为第一种知识多样性
est store m1
reghdfe K_diversity2 AI_utilize $xx ,absorb(id year)  vce(cluster industry_group#year) //K_diversity1为第二种知识多样性
est store m2
reghdfe B_routines AI_utilize $xx ,absorb(id year)  vce(cluster industry_group) //B_routines为打破组织惯例
est store m3
reghdfe O_resource AI_utilize $xx ,absorb(id year)  vce(cluster industry_group#year) //O_resource为资源配置效率
est store m4
esttab m1 m2 m3 m4 using 作用机制1.rtf, replace se compress nogap b(%7.4f) scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)

*表6 吸收能力的强化作用
*企业产学研合作情况衡量吸收能力 表6的第（1）列
reghdfe Innov AI_utilize Absorptive1_AI Absorptive1 $xx ,absorb(id year)  vce(cluster industry_group#year)
est store m1
*利用研发投入来衡量吸收能力 表6的第（2)列
reghdfe Innov AI_utilize  Absorptive2_AI Absorptive2 Size Age ROA Leverage Growth ,absorb(id year)  vce(cluster industry_group#year)
est store m2
esttab m1 m2 using 吸收能力.rtf, replace se compress nogap b(%7.4f) scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)

***进一步分析***
*（1）表A6 企业异质性分析
reghdfe Innov OP_AI AI_utilize  TFP_OP $xx ,absorb(id year)  vce(cluster industry_group#year) //OP方法计算生产率
est store m1
reghdfe Innov LP_AI AI_utilize  TFP_LP $xx ,absorb(id year)  vce(cluster industry_group#year) //LP方法计算生产率
est store m2
reghdfe Innov HC_AI AI_utilize HC $xx ,absorb(id year)  vce(cluster industry_group#year) //HC为人力资本
est store m3
esttab m1 m2 m3 using 企业异质性.rtf, replace se compress nogap b(%7.4f) scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)

*（2）表A7 行业异质性分析
*劳动密集型为0，资本密集型为1，技术密集型为2
reghdfe Innov AI_utilize $xx if ysmjd==0,absorb(id year ) vce(cluster industry_group#year)
est store m1
reghdfe Innov AI_utilize $xx if ysmjd==1,absorb(id year )  vce(cluster industry_group#year)
est store m2
reghdfe Innov AI_utilize $xx if ysmjd==2,absorb(id year )  vce(cluster industry_group#year)
est store m3
reghdfe Innov KRR $xx if ysmjd==2,absorb(id year)  vce(cluster industry_group#year)
est store m4
reghdfe Innov NLP $xx if ysmjd==2 ,absorb(id year )  vce(cluster industry_group#year)
est store m5
reghdfe Innov CV $xx if ysmjd==2,absorb(id year)  vce(cluster industry_group#year)
est store m6
reghdfe Innov ML $xx if ysmjd==2 ,absorb(id year )  vce(cluster industry_group#year)
est store m7
esttab m1 m2 m3 m4 m5 m6 m7 using 不同行业中AI技术应用的创新影响.rtf, replace se compress nogap b(%7.4f) scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)

*（3）表A8 AI技术应用和企业渐进式与突破式创新
* lnincremental表示渐进式创新；lnBreakthrough表示突破式创新
reghdfe lnincremental AI_utilize $xx ,absorb(id year)  vce(cluster industry_group#year)
est store m1
reghdfe lnBreakthrough AI_utilize $xx ,absorb(id year)  vce(cluster industry_group#year)
est store m2
sort id year
reghdfe lnBreakthrough l5.AI_utilize $xx ,absorb(id year)  vce(cluster industry_group#year)
est store m3
reghdfe lnBreakthrough l6.AI_utilize $xx ,absorb(id year)  vce(cluster industry_group#year)
est store m4
esttab m1 m2 m3 m4 using AI与渐进式突破式创新.rtf, replace se compress nogap b(%7.4f) scalars(N r2_a) star(* 0.10 ** 0.05 *** 0.01)
