* ============================================================
* demo_data_gen.do
* 生成模拟面板数据，用于 claude-stata demo
* 无需真实数据即可运行完整分析流程
* ============================================================

set more off
clear all
set seed 20240101

* ── 参数设置 ──────────────────────────────────────────────
local N_firm  = 500    // 企业数
local N_year  = 14     // 年份数（2009-2022）
local N_total = `N_firm' * `N_year'

* ── 生成面板结构 ─────────────────────────────────────────
set obs `N_total'

* 企业 ID 和年份
gen id   = ceil(_n / `N_year')
gen year = 2008 + mod(_n - 1, `N_year') + 1

* 行业分组（75个行业组）
gen industry_group = ceil(id / 7)

* 企业类型（劳动密集型0、资本密集型1、技术密集型2）
gen ysmjd = mod(industry_group, 3)

* ── 生成核心变量 ─────────────────────────────────────────
* 企业固定效应
gen firm_fe = rnormal(0, 0.5)
bysort id: replace firm_fe = firm_fe[1]

* 年份固定效应（逐年递增趋势）
gen year_fe = (year - 2009) * 0.05 + rnormal(0, 0.1)
bysort year: replace year_fe = year_fe[1]

* AI 技术应用（右偏分布，均值约0.14）
gen AI_utilize = max(0, rnormal(0, 0.5) + firm_fe * 0.3) * (year >= 2012)
replace AI_utilize = AI_utilize * (1 + (year - 2012) * 0.1) if year >= 2012
replace AI_utilize = 0 if AI_utilize < 0

* AI 细分技术（基于AI_utilize派生）
gen Learningbased = max(0, AI_utilize * 0.4 + rnormal(0, 0.1))
gen KRR           = max(0, AI_utilize * 0.1 + rnormal(0, 0.05))
gen NLP           = max(0, AI_utilize * 0.2 + rnormal(0, 0.1))
gen CV            = max(0, AI_utilize * 0.3 + rnormal(0, 0.1))
gen ML            = max(0, AI_utilize * 0.35 + rnormal(0, 0.1))

* 替换AI指标（用于稳健性）
gen AI_utilize1 = AI_utilize / 10 + rnormal(0, 0.02)

* ── 控制变量 ──────────────────────────────────────────────
gen Size      = rnormal(22, 1.3)            // 总资产对数
gen Age       = rnormal(2.9, 0.35)          // 企业年龄对数
gen ROA       = rnormal(0.045, 0.065)       // 资产收益率
replace ROA   = max(-0.38, min(0.25, ROA))
gen Leverage  = rnormal(0.40, 0.19)         // 资产负债率
replace Leverage = max(0.03, min(0.91, Leverage))
gen Growth    = rnormal(0.17, 0.35)         // 营收增长率
replace Growth = max(-0.66, min(4.0, Growth))
gen Rdintensity = max(0, rnormal(0.053, 0.052))  // 研发强度

* 宏观控制变量
gen GDP_growth = rnormal(0.08, 0.02)
bysort year: replace GDP_growth = GDP_growth[1]
gen HHI_assets = rnormal(0.1, 0.05)

* ── 因变量（企业创新）────────────────────────────────────
* 真实效应: AI_utilize -> Innov (β≈0.07)
gen Innov = 2.0 + 0.07 * AI_utilize ///
    + 0.25 * Size + 0.3 * ROA + 2.0 * Rdintensity ///
    - 0.15 * Leverage - 0.07 * Growth ///
    + firm_fe + year_fe + rnormal(0, 0.68)
replace Innov = max(0, Innov)

* 替换被解释变量（用于稳健性）
gen Innov1 = Innov * 0.8 + rnormal(0, 0.3)
replace Innov1 = max(0, Innov1)

* 渐进式与突破式创新
gen lnincremental  = 0.06 * AI_utilize + 0.13 * Size + firm_fe + year_fe + rnormal(0, 0.68)
gen lnBreakthrough = 0.03 * AI_utilize + 0.13 * Size + firm_fe + year_fe + rnormal(0, 0.53)
replace lnincremental  = max(0, lnincremental)
replace lnBreakthrough = max(0, lnBreakthrough)

* ── 机制变量 ──────────────────────────────────────────────
gen K_diversity1 = 0.01 * AI_utilize + 0.04 * Size + rnormal(0, 0.24)
gen K_diversity2 = 0.8  * AI_utilize + 1.5  * Size + rnormal(0, 6.8)
gen B_routines   = 0.02 * AI_utilize + 0.02 * Size + rnormal(0, 0.49)
gen O_resource   = -0.012 * AI_utilize + 0.10 * Size + rnormal(0, 0.23)

* ── PSM / Heckman 相关变量 ──────────────────────────────
gen Innov_dummy  = (Innov > 2)
gen OverseaBack  = (runiform() < 0.15)
gen treated      = (AI_utilize > 0.3)
gen _weight      = 1
gen imr          = rnormal(0, 0.5)  // 逆米尔斯比（简化）

* ── 工具变量（Bartik式）────────────────────────────────
* IV = 企业初始AI份额 × 其他城市第三产业增加值变化率
gen city = ceil(id / 5)
bysort id: gen ai_share_2009 = AI_utilize[1]
gen tertiary_growth = rnormal(0.08, 0.02)
bysort year: replace tertiary_growth = tertiary_growth[1]
gen IV = ai_share_2009 * tertiary_growth + rnormal(0, 0.01)
gen yins = city  // 工具变量聚类变量

* ── 企业异质性变量 ──────────────────────────────────────
gen TFP_OP = rnormal(0, 0.5)
gen TFP_LP = TFP_OP + rnormal(0, 0.1)
gen OP_AI  = TFP_OP * AI_utilize
gen LP_AI  = TFP_LP * AI_utilize
gen HC     = rnormal(50, 20)   // 人力资本（高学历员工占比×100）
gen HC_AI  = HC * AI_utilize

* ── 吸收能力变量 ─────────────────────────────────────────
gen Absorptive1    = (runiform() < 0.4)  // 产学研合作
gen Absorptive1_AI = Absorptive1 * AI_utilize
gen Absorptive2    = Rdintensity         // 研发强度即吸收能力2
gen Absorptive2_AI = Absorptive2 * AI_utilize

* ── 清理并保存 ───────────────────────────────────────────
drop firm_fe year_fe ai_share_2009 tertiary_growth

label var Innov       "企业创新（发明专利申请数对数）"
label var AI_utilize  "AI技术应用综合指标"
label var Size        "企业规模（总资产对数）"
label var Age         "企业年龄（对数）"
label var ROA         "资产收益率"
label var Leverage    "资产负债率"
label var Growth      "营收增长率"
label var Rdintensity "研发强度"

xtset id year

save demo_data.dta, replace
display "模拟数据生成完成：`N_total' 条观测，`N_firm' 家企业，`N_year' 年"
