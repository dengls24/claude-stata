"""
Stata do 文件的 Python 等价实现
原始文件: 程序.do
使用 pyfixest 实现 reghdfe（高维固定效应回归），linearmodels 实现 ivreghdfe（工具变量回归）
"""

import os
import warnings
import numpy as np
import pandas as pd
import pyfixest as pf
from scipy.stats import norm
from linearmodels.iv import absorbing as iv_abs

warnings.filterwarnings("ignore")

# ── 工作目录 & 读取数据 ──────────────────────────────────────────────
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(DATA_DIR)

df = pd.read_stata("数据.dta")

# 确保面板排序
df = df.sort_values(["id", "year"]).reset_index(drop=True)

# 控制变量
xx = ["Size", "Age", "ROA", "Leverage", "Growth", "Rdintensity"]


# ── 辅助函数 ─────────────────────────────────────────────────────────

def gen_lag(data, var, n=1):
    """生成面板数据滞后项（等价于 Stata 的 l.var / l2.var）"""
    return data.groupby("id")[var].shift(n)


def make_cluster_col(data, col1, col2=None):
    """生成聚类交互列（等价于 Stata 的 industry_group#year）"""
    if col2 is None:
        return data[col1].astype(str)
    name = f"{col1}_x_{col2}"
    if name not in data.columns:
        data[name] = data[col1].astype(str) + "_" + data[col2].astype(str)
    return name


def fmt_stars(pval):
    if pval < 0.01:
        return "***"
    elif pval < 0.05:
        return "**"
    elif pval < 0.10:
        return "*"
    return ""


def results_to_df(model_dict):
    """将多个 pyfixest 模型结果整理为类 esttab 的 DataFrame"""
    rows = []
    all_vars = []
    for name, m in model_dict.items():
        for v in m.coef().index:
            if v not in all_vars:
                all_vars.append(v)

    for v in all_vars:
        coef_row = {"Variable": v}
        se_row = {"Variable": ""}
        for name, m in model_dict.items():
            if v in m.coef().index:
                b = m.coef()[v]
                s = m.se()[v]
                p = m.pvalue()[v]
                coef_row[name] = f"{b:.4f}{fmt_stars(p)}"
                se_row[name] = f"({s:.4f})"
            else:
                coef_row[name] = ""
                se_row[name] = ""
        rows.append(coef_row)
        rows.append(se_row)

    # N 和 adj R2
    n_row = {"Variable": "N"}
    r2_row = {"Variable": "adj. R2"}
    for name, m in model_dict.items():
        n_row[name] = str(m._N)
        r2_row[name] = f"{m._adj_r2:.4f}" if hasattr(m, "_adj_r2") else ""
    rows.append(n_row)
    rows.append(r2_row)

    return pd.DataFrame(rows)


def save_results(result_df, filename):
    """保存结果到 CSV（原 Stata 输出 RTF）"""
    # 用 CSV 替代 RTF，方便后续处理
    csv_name = filename.replace(".rtf", ".csv")
    result_df.to_csv(csv_name, index=False, encoding="utf-8-sig")
    print(f"  -> 结果已保存: {csv_name}")


def run_reghdfe(data, depvar, indepvars, absorb=None, cluster="industry_group_x_year",
                subset=None, weights=None):
    """
    等价于 Stata 的 reghdfe。
    absorb: list of FE vars, e.g. ["id", "year"]
    cluster: 聚类变量名
    """
    reg_data = data.copy()
    if subset is not None:
        reg_data = reg_data.loc[subset].copy()

    # 构建公式
    rhs = " + ".join(indepvars)
    fml = f"{depvar} ~ {rhs}"
    if absorb:
        fml += " | " + " + ".join(absorb)

    m = pf.feols(fml, data=reg_data, vcov={"CRV1": cluster}, weights=weights)
    return m


# ── 生成面板变量 ──────────────────────────────────────────────────────
# 聚类列
make_cluster_col(df, "industry_group", "year")

# 滞后变量
df["L1_AI_utilize"] = gen_lag(df, "AI_utilize", 1)
df["L2_AI_utilize"] = gen_lag(df, "AI_utilize", 2)
df["L3_AI_utilize"] = gen_lag(df, "AI_utilize", 3)
df["L5_AI_utilize"] = gen_lag(df, "AI_utilize", 5)
df["L6_AI_utilize"] = gen_lag(df, "AI_utilize", 6)

print("=" * 70)
print("数据加载完毕，共 {} 行 {} 列".format(*df.shape))
print("=" * 70)

# =====================================================================
# 表AI 描述性统计
# =====================================================================
print("\n" + "=" * 70)
print("表AI 描述性统计")
print("=" * 70)
desc_vars = ["Innov", "AI_utilize", "Size", "Age", "ROA", "Leverage", "Growth", "Rdintensity"]
desc = df[desc_vars].describe().T[["count", "mean", "std", "min", "max"]]
desc.columns = ["N", "Mean", "SD", "Min", "Max"]
desc = desc.map(lambda x: f"{x:.4f}" if isinstance(x, float) else x)
print(desc.to_string())
desc.to_csv("描述性统计结果.csv", encoding="utf-8-sig")
print("  -> 结果已保存: 描述性统计结果.csv")

# =====================================================================
# 表1 基准回归结果
# =====================================================================
print("\n" + "=" * 70)
print("表1 基准回归结果")
print("=" * 70)

models = {}
# (1) 无控制变量、无固定效应
models["(1)"] = run_reghdfe(df, "Innov", ["AI_utilize"], absorb=None)
# (2) 有控制变量、无固定效应
models["(2)"] = run_reghdfe(df, "Innov", ["AI_utilize"] + xx, absorb=None)
# (3) 有控制变量、年份固定效应
models["(3)"] = run_reghdfe(df, "Innov", ["AI_utilize"] + xx, absorb=["year"])
# (4) 有控制变量、企业+年份固定效应
models["(4)"] = run_reghdfe(df, "Innov", ["AI_utilize"] + xx, absorb=["id", "year"])

res = results_to_df(models)
print(res.to_string(index=False))
save_results(res, "基准回归结果.rtf")

# =====================================================================
# 表2 基于不同AI技术应用对企业创新的影响
# =====================================================================
print("\n" + "=" * 70)
print("表2 基于不同AI技术应用对企业创新的影响")
print("=" * 70)

models = {}
for i, (aivar, label) in enumerate([
    ("Learningbased", "深度学习"),
    ("KRR", "知识表示与推理"),
    ("NLP", "自然语言处理"),
    ("CV", "计算机视觉"),
    ("ML", "机器学习"),
], 1):
    models[f"({i})"] = run_reghdfe(df, "Innov", [aivar] + xx, absorb=["id", "year"])

res = results_to_df(models)
print(res.to_string(index=False))
save_results(res, "基于不同AI技术应用对企业创新的影响.rtf")

# =====================================================================
# 表3 内生性处理Ⅰ：遗漏变量偏误检验（Oster检验）
# =====================================================================
print("\n" + "=" * 70)
print("表3 内生性处理Ⅰ：遗漏变量偏误检验")
print("=" * 70)

# 全集（Full model）
m_full = run_reghdfe(df, "Innov", ["AI_utilize"] + xx, absorb=["id", "year"])
beta_full = m_full.coef()["AI_utilize"]

# (1) 无控制变量、无固定效应
m_basic = run_reghdfe(df, "Innov", ["AI_utilize"], absorb=None)
beta_basic = m_basic.coef()["AI_utilize"]
F1 = abs(beta_full / (beta_basic - beta_full))
print(f"(1) 无控制变量和固定效应: F = {F1:.4f}")

# (2) 无控制变量、有固定效应
m_nocontrol = run_reghdfe(df, "Innov", ["AI_utilize"], absorb=["id", "year"])
beta_nocontrol = m_nocontrol.coef()["AI_utilize"]
F2 = abs(beta_full / (beta_nocontrol - beta_full))
print(f"(2) 无控制变量，有固定效应: F = {F2:.4f}")

# (3) 有控制变量、有企业固定效应
m_firm = run_reghdfe(df, "Innov", ["AI_utilize"] + xx, absorb=["id"])
beta_firm = m_firm.coef()["AI_utilize"]
F3 = abs(beta_full / (beta_firm - beta_full))
print(f"(3) 有控制变量，有企业固定: F = {F3:.4f}")

# =====================================================================
# 表4 内生性处理Ⅱ：PSM + Heckman + IV
# =====================================================================
print("\n" + "=" * 70)
print("表4 内生性处理Ⅱ")
print("=" * 70)

models = {}

# (1) PSM - 使用频率权重
if "_weight" in df.columns:
    df_psm = df.dropna(subset=["_weight", "treated", "Innov"] + xx).copy()
    df_psm["_weight_int"] = df_psm["_weight"].astype(int)
    # pyfixest 通过 weights 参数支持
    models["(1) PSM"] = run_reghdfe(
        df_psm, "Innov", ["treated"] + xx, absorb=["id", "year"],
        weights="_weight_int"
    )
    print("  PSM 回归完成")

# (2) Heckman 第一阶段: probit
from statsmodels.discrete.discrete_model import Probit
import statsmodels.api as sm

heck_vars = ["AI_utilize"] + xx + ["OverseaBack"]
df_heck = df.dropna(subset=["Innov_dummy"] + heck_vars).copy()

# 加入年份虚拟变量
year_dummies = pd.get_dummies(df_heck["year"], prefix="yr", drop_first=True, dtype=float)
df_heck = pd.concat([df_heck, year_dummies], axis=1)
yr_cols = list(year_dummies.columns)

X_probit = sm.add_constant(df_heck[heck_vars + yr_cols])
probit_model = Probit(df_heck["Innov_dummy"], X_probit).fit(disp=0)
print("  Heckman 第一阶段 (Probit) 完成")
print(f"    AI_utilize coef = {probit_model.params['AI_utilize']:.4f}, "
      f"p = {probit_model.pvalues['AI_utilize']:.4f}")

# (3) Heckman 第二阶段
if "imr" in df.columns and "OverseaBack" in df.columns:
    models["(3) Heckman"] = run_reghdfe(
        df, "Innov", ["AI_utilize"] + xx + ["imr", "OverseaBack"], absorb=["id", "year"]
    )
    print("  Heckman 第二阶段完成")

res = results_to_df(models) if models else pd.DataFrame()
if not res.empty:
    print(res.to_string(index=False))
    save_results(res, "内生性处理2-1.rtf")

# (4)(5) 工具变量 2SLS
print("\n  工具变量 2SLS:")
if "IV" in df.columns and "yins" in df.columns:
    from linearmodels.iv import AbsorbingLS

    df_iv = df.dropna(subset=["Innov", "AI_utilize", "IV", "yins"] + xx).copy()

    # 构造年份虚拟变量用于吸收
    absorb_cols = pd.DataFrame({
        "id_cat": pd.Categorical(df_iv["id"]),
        "year_cat": pd.Categorical(df_iv["year"]),
    })

    df_iv_idx = df_iv.set_index(["id", "year"])
    endog = df_iv_idx[["AI_utilize"]]
    exog = df_iv_idx[xx]
    instruments = df_iv_idx[["IV"]]
    dependent = df_iv_idx["Innov"]

    try:
        iv_model = AbsorbingLS(
            dependent=dependent,
            exog=exog,
            endog=endog,
            instruments=instruments,
            absorb=absorb_cols,
        ).fit(cov_type="clustered", clusters=df_iv_idx["yins"])
        print(f"    AI_utilize coef = {iv_model.params['AI_utilize']:.4f}")
        print(iv_model.summary)
    except Exception as e:
        print(f"    IV 回归出错: {e}")

# =====================================================================
# 表A2 稳健性检验Ⅰ
# =====================================================================
print("\n" + "=" * 70)
print("表A2 稳健性检验Ⅰ")
print("=" * 70)

models = {}

# (1) 替换被解释变量 + 滞后2期
if "Innov1" in df.columns:
    models["(1) Innov1~L2.AI"] = run_reghdfe(df, "Innov1", ["L2_AI_utilize"] + xx, absorb=["id", "year"])
    # (2) 替换被解释变量 + 滞后3期
    models["(2) Innov1~L3.AI"] = run_reghdfe(df, "Innov1", ["L3_AI_utilize"] + xx, absorb=["id", "year"])

# (3) 替换解释变量
if "AI_utilize1" in df.columns:
    models["(3) AI_utilize1"] = run_reghdfe(df, "Innov", ["AI_utilize1"] + xx, absorb=["id", "year"])

# (4)-(6) 解释变量滞后1/2/3期
models["(4) L1.AI"] = run_reghdfe(df, "Innov", ["L1_AI_utilize"] + xx, absorb=["id", "year"])
models["(5) L2.AI"] = run_reghdfe(df, "Innov", ["L2_AI_utilize"] + xx, absorb=["id", "year"])
models["(6) L3.AI"] = run_reghdfe(df, "Innov", ["L3_AI_utilize"] + xx, absorb=["id", "year"])

res = results_to_df(models)
print(res.to_string(index=False))
save_results(res, "稳健性检验1.rtf")

# =====================================================================
# 表A4 稳健性检验Ⅱ
# =====================================================================
print("\n" + "=" * 70)
print("表A4 稳健性检验Ⅱ")
print("=" * 70)

models = {}

# (1) 调整固定效应: id + year + id#industry_group 交互固定效应
df["id_x_industry"] = df["id"].astype(str) + "_" + df["industry_group"].astype(str)
models["(1) 调整FE"] = run_reghdfe(
    df, "Innov", ["AI_utilize"] + xx,
    absorb=["year", "id", "id_x_industry"]
)

# (2) 聚类至企业层面
models["(2) 聚类企业"] = pf.feols(
    "Innov ~ AI_utilize + " + " + ".join(xx) + " | id + year",
    data=df, vcov={"CRV1": "id"}
)

# (3) 增加控制变量
extra_vars = []
for candidate in ["HHI_资产", "HHI_\u8d44\u4ea7"]:
    if candidate in df.columns:
        extra_vars.append(candidate)
        break
# 查找 GDP增速 列
for col in df.columns:
    if "GDP" in col and "增速" in col.replace("\x00", ""):
        extra_vars.append(col)
        break
    elif col == "GDP增速":
        extra_vars.append(col)
        break

if extra_vars:
    models["(3) 增加控制"] = run_reghdfe(
        df, "Innov", ["AI_utilize"] + xx + extra_vars, absorb=["id", "year"]
    )
else:
    # 尝试匹配列名（可能有编码问题）
    hhi_cols = [c for c in df.columns if "HHI" in c]
    gdp_cols = [c for c in df.columns if "GDP" in c]
    print(f"  注意: HHI相关列 = {hhi_cols}, GDP相关列 = {gdp_cols}")
    if hhi_cols and gdp_cols:
        models["(3) 增加控制"] = run_reghdfe(
            df, "Innov", ["AI_utilize"] + xx + [hhi_cols[0], gdp_cols[0]],
            absorb=["id", "year"]
        )

res = results_to_df(models)
print(res.to_string(index=False))
save_results(res, "稳健性检验2-1.rtf")

# (4) 样本范围调整: year >= 2014
df_sub = df[df["year"] >= 2014].copy()
m4 = run_reghdfe(df_sub, "Innov", ["AI_utilize"] + xx, absorb=["id", "year"])
res4 = results_to_df({"(4) year>=2014": m4})
print(res4.to_string(index=False))
save_results(res4, "稳健性检验2-2.rtf")

# =====================================================================
# 表5 作用机制检验
# =====================================================================
print("\n" + "=" * 70)
print("表5 作用机制检验")
print("=" * 70)

# 重新加载数据（原 Stata 中有 use 数据,replace）
df = pd.read_stata("数据.dta")
df = df.sort_values(["id", "year"]).reset_index(drop=True)
make_cluster_col(df, "industry_group", "year")

models = {}
# (1) 知识多样性1
if "K_diversity1" in df.columns:
    models["(1) K_diversity1"] = run_reghdfe(df, "K_diversity1", ["AI_utilize"] + xx, absorb=["id", "year"])
# (2) 知识多样性2
if "K_diversity2" in df.columns:
    models["(2) K_diversity2"] = run_reghdfe(df, "K_diversity2", ["AI_utilize"] + xx, absorb=["id", "year"])
# (3) 打破组织惯例 — 注意原 Stata 聚类为 industry_group（无 #year）
if "B_routines" in df.columns:
    models["(3) B_routines"] = run_reghdfe(
        df, "B_routines", ["AI_utilize"] + xx, absorb=["id", "year"],
        cluster="industry_group"
    )
# (4) 资源配置效率
if "O_resource" in df.columns:
    models["(4) O_resource"] = run_reghdfe(df, "O_resource", ["AI_utilize"] + xx, absorb=["id", "year"])

res = results_to_df(models)
print(res.to_string(index=False))
save_results(res, "作用机制1.rtf")

# =====================================================================
# 表6 吸收能力的强化作用
# =====================================================================
print("\n" + "=" * 70)
print("表6 吸收能力的强化作用")
print("=" * 70)

models = {}
# (1) 产学研合作衡量吸收能力
if all(c in df.columns for c in ["Absorptive1_AI", "Absorptive1"]):
    models["(1) 产学研合作"] = run_reghdfe(
        df, "Innov", ["AI_utilize", "Absorptive1_AI", "Absorptive1"] + xx,
        absorb=["id", "year"]
    )

# (2) 研发投入衡量吸收能力（注意：排除 Rdintensity 避免共线性，原文用不同控制变量）
if all(c in df.columns for c in ["Absorptive2_AI", "Absorptive2"]):
    xx_no_rd = ["Size", "Age", "ROA", "Leverage", "Growth"]
    models["(2) 研发投入"] = run_reghdfe(
        df, "Innov", ["AI_utilize", "Absorptive2_AI", "Absorptive2"] + xx_no_rd,
        absorb=["id", "year"]
    )

res = results_to_df(models)
print(res.to_string(index=False))
save_results(res, "吸收能力.rtf")

# =====================================================================
# 表A6 企业异质性分析
# =====================================================================
print("\n" + "=" * 70)
print("表A6 企业异质性分析")
print("=" * 70)

models = {}
if all(c in df.columns for c in ["OP_AI", "TFP_OP"]):
    models["(1) OP"] = run_reghdfe(
        df, "Innov", ["OP_AI", "AI_utilize", "TFP_OP"] + xx, absorb=["id", "year"]
    )
if all(c in df.columns for c in ["LP_AI", "TFP_LP"]):
    models["(2) LP"] = run_reghdfe(
        df, "Innov", ["LP_AI", "AI_utilize", "TFP_LP"] + xx, absorb=["id", "year"]
    )
if all(c in df.columns for c in ["HC_AI", "HC"]):
    models["(3) HC"] = run_reghdfe(
        df, "Innov", ["HC_AI", "AI_utilize", "HC"] + xx, absorb=["id", "year"]
    )

res = results_to_df(models)
print(res.to_string(index=False))
save_results(res, "企业异质性.rtf")

# =====================================================================
# 表A7 行业异质性分析
# =====================================================================
print("\n" + "=" * 70)
print("表A7 行业异质性分析")
print("=" * 70)

models = {}
if "ysmjd" in df.columns:
    for val, label in [(0, "劳动密集型"), (1, "资本密集型"), (2, "技术密集型")]:
        subset = df["ysmjd"] == val
        models[f"({val+1}) {label}"] = run_reghdfe(
            df, "Innov", ["AI_utilize"] + xx, absorb=["id", "year"], subset=subset
        )
    # 技术密集型行业中不同AI技术
    subset_tech = df["ysmjd"] == 2
    for i, aivar in enumerate(["KRR", "NLP", "CV", "ML"], 4):
        if aivar in df.columns:
            models[f"({i}) {aivar}"] = run_reghdfe(
                df, "Innov", [aivar] + xx, absorb=["id", "year"], subset=subset_tech
            )

res = results_to_df(models)
print(res.to_string(index=False))
save_results(res, "不同行业中AI技术应用的创新影响.rtf")

# =====================================================================
# 表A8 AI技术应用和企业渐进式与突破式创新
# =====================================================================
print("\n" + "=" * 70)
print("表A8 AI技术应用和企业渐进式与突破式创新")
print("=" * 70)

# 生成滞后变量
df["L5_AI_utilize"] = gen_lag(df, "AI_utilize", 5)
df["L6_AI_utilize"] = gen_lag(df, "AI_utilize", 6)

models = {}
if "lnincremental" in df.columns:
    models["(1) 渐进式"] = run_reghdfe(df, "lnincremental", ["AI_utilize"] + xx, absorb=["id", "year"])
if "lnBreakthrough" in df.columns:
    models["(2) 突破式"] = run_reghdfe(df, "lnBreakthrough", ["AI_utilize"] + xx, absorb=["id", "year"])
    models["(3) 突破式L5"] = run_reghdfe(df, "lnBreakthrough", ["L5_AI_utilize"] + xx, absorb=["id", "year"])
    models["(4) 突破式L6"] = run_reghdfe(df, "lnBreakthrough", ["L6_AI_utilize"] + xx, absorb=["id", "year"])

res = results_to_df(models)
print(res.to_string(index=False))
save_results(res, "AI与渐进式突破式创新.rtf")

print("\n" + "=" * 70)
print("全部回归完成！结果文件已保存至当前目录。")
print("=" * 70)
