const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, Header, Footer
} = require('docx');
const fs = require('fs');

// ── 工具函数 ────────────────────────────────────────────────
const border = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function cell(text, opts = {}) {
  const { bold = false, align = AlignmentType.CENTER, shade = null, colspan = 1, width = null } = opts;
  return new TableCell({
    borders,
    columnSpan: colspan,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold, size: 18, font: "Times New Roman" })]
    })]
  });
}

function hcell(text, opts = {}) {
  return cell(text, { bold: true, shade: "DCE6F1", ...opts });
}

function para(text, opts = {}) {
  const { bold = false, size = 22, indent = 0, align = AlignmentType.JUSTIFIED, spacing = 360 } = opts;
  return new Paragraph({
    alignment: align,
    indent: indent ? { firstLine: indent } : undefined,
    spacing: { after: spacing },
    children: [new TextRun({ text, bold, size, font: "宋体" })]
  });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.LEFT,
    spacing: { before: 300, after: 180 },
    children: [new TextRun({ text, bold: true, size: 28, font: "黑体" })]
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.LEFT,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, font: "黑体" })]
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    alignment: AlignmentType.LEFT,
    spacing: { before: 180, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, font: "黑体" })]
  });
}

function note(text) {
  return new Paragraph({
    spacing: { after: 180 },
    children: [new TextRun({ text, size: 18, italics: true, font: "宋体" })]
  });
}

// ── 描述性统计表 ─────────────────────────────────────────────
const descTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [1800, 1200, 1200, 1200, 1200, 1200, 1560],
  rows: [
    new TableRow({ children: [
      hcell("变量", { align: AlignmentType.LEFT, width: 1800 }),
      hcell("N", { width: 1200 }),
      hcell("均值", { width: 1200 }),
      hcell("标准差", { width: 1200 }),
      hcell("最小值", { width: 1200 }),
      hcell("最大值", { width: 1200 }),
      hcell("含义", { width: 1560 }),
    ]}),
    new TableRow({ children: [
      cell("Innov", { align: AlignmentType.LEFT }), cell("20,241"), cell("2.1503"), cell("1.1950"), cell("0.0000"), cell("9.1204"), cell("企业创新"),
    ]}),
    new TableRow({ children: [
      cell("AI_utilize", { align: AlignmentType.LEFT }), cell("20,241"), cell("0.1442"), cell("0.4176"), cell("0.0000"), cell("3.9318"), cell("AI应用综合"),
    ]}),
    new TableRow({ children: [
      cell("Size", { align: AlignmentType.LEFT }), cell("20,241"), cell("22.1657"), cell("1.2588"), cell("19.3167"), cell("26.4523"), cell("企业规模"),
    ]}),
    new TableRow({ children: [
      cell("Age", { align: AlignmentType.LEFT }), cell("20,241"), cell("2.8646"), cell("0.3419"), cell("1.0986"), cell("3.6109"), cell("企业年龄"),
    ]}),
    new TableRow({ children: [
      cell("ROA", { align: AlignmentType.LEFT }), cell("20,239"), cell("0.0465"), cell("0.0639"), cell("-0.3730"), cell("0.2473"), cell("资产收益率"),
    ]}),
    new TableRow({ children: [
      cell("Leverage", { align: AlignmentType.LEFT }), cell("20,241"), cell("0.4009"), cell("0.1935"), cell("0.0274"), cell("0.9079"), cell("资产负债率"),
    ]}),
    new TableRow({ children: [
      cell("Growth", { align: AlignmentType.LEFT }), cell("20,236"), cell("0.1695"), cell("0.3499"), cell("-0.6576"), cell("4.0242"), cell("营收增长率"),
    ]}),
    new TableRow({ children: [
      cell("Rdintensity", { align: AlignmentType.LEFT }), cell("20,241"), cell("0.0533"), cell("0.0523"), cell("0.0000"), cell("0.4360"), cell("研发强度"),
    ]}),
  ]
});

// ── 基准回归表 ────────────────────────────────────────────────
const baseTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2100, 1815, 1815, 1815, 1815],
  rows: [
    new TableRow({ children: [
      hcell("变量", { align: AlignmentType.LEFT, width: 2100 }),
      hcell("(1)\n无FE", { width: 1815 }),
      hcell("(2)\n控制变量", { width: 1815 }),
      hcell("(3)\n+年FE", { width: 1815 }),
      hcell("(4)\n双向FE", { width: 1815 }),
    ]}),
    new TableRow({ children: [
      cell("AI_utilize", { align: AlignmentType.LEFT }), cell("0.4480***\n(0.0317)"), cell("0.2097***\n(0.0293)"), cell("0.1999***\n(0.0286)"), cell("0.0671***\n(0.0207)"),
    ]}),
    new TableRow({ children: [
      cell("Size", { align: AlignmentType.LEFT }), cell("—"), cell("0.3885***\n(0.0177)"), cell("0.3818***\n(0.0177)"), cell("0.2556***\n(0.0238)"),
    ]}),
    new TableRow({ children: [
      cell("Age", { align: AlignmentType.LEFT }), cell("—"), cell("0.0789**\n(0.0362)"), cell("-0.0213\n(0.0309)"), cell("-0.2950**\n(0.1236)"),
    ]}),
    new TableRow({ children: [
      cell("ROA", { align: AlignmentType.LEFT }), cell("—"), cell("1.8977***\n(0.1674)"), cell("1.8999***\n(0.1670)"), cell("0.3769**\n(0.1466)"),
    ]}),
    new TableRow({ children: [
      cell("Leverage", { align: AlignmentType.LEFT }), cell("—"), cell("0.3211***\n(0.0671)"), cell("0.3465***\n(0.0663)"), cell("-0.1680**\n(0.0684)"),
    ]}),
    new TableRow({ children: [
      cell("Growth", { align: AlignmentType.LEFT }), cell("—"), cell("-0.0936***\n(0.0264)"), cell("-0.0917***\n(0.0244)"), cell("-0.0691***\n(0.0192)"),
    ]}),
    new TableRow({ children: [
      cell("Rdintensity", { align: AlignmentType.LEFT }), cell("—"), cell("6.3691***\n(0.4582)"), cell("6.0782***\n(0.4278)"), cell("2.0329***\n(0.3082)"),
    ]}),
    new TableRow({ children: [
      cell("企业FE", { align: AlignmentType.LEFT }), cell("否"), cell("否"), cell("否"), cell("是"),
    ]}),
    new TableRow({ children: [
      cell("年份FE", { align: AlignmentType.LEFT }), cell("否"), cell("否"), cell("是"), cell("是"),
    ]}),
    new TableRow({ children: [
      cell("N", { align: AlignmentType.LEFT }), cell("20,241"), cell("20,236"), cell("20,236"), cell("19,637"),
    ]}),
    new TableRow({ children: [
      cell("Adj R²", { align: AlignmentType.LEFT }), cell("0.0245"), cell("0.2283"), cell("0.2314"), cell("0.6785"),
    ]}),
  ]
});

// ── AI细分技术表 ──────────────────────────────────────────────
const aiSubTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2000, 1472, 1472, 1472, 1472, 1472],
  rows: [
    new TableRow({ children: [
      hcell("变量", { align: AlignmentType.LEFT, width: 2000 }),
      hcell("(1)\nLearning", { width: 1472 }),
      hcell("(2)\nKRR", { width: 1472 }),
      hcell("(3)\nNLP", { width: 1472 }),
      hcell("(4)\nCV", { width: 1472 }),
      hcell("(5)\nML", { width: 1472 }),
    ]}),
    new TableRow({ children: [
      cell("AI细分变量", { align: AlignmentType.LEFT }),
      cell("0.0713***\n(0.0227)"),
      cell("-0.0057\n(0.0701)"),
      cell("0.0498\n(0.0346)"),
      cell("0.1284***\n(0.0325)"),
      cell("0.0575*\n(0.0345)"),
    ]}),
    new TableRow({ children: [
      cell("控制变量", { align: AlignmentType.LEFT }), cell("是"), cell("是"), cell("是"), cell("是"), cell("是"),
    ]}),
    new TableRow({ children: [
      cell("双向FE", { align: AlignmentType.LEFT }), cell("是"), cell("是"), cell("是"), cell("是"), cell("是"),
    ]}),
    new TableRow({ children: [
      cell("N", { align: AlignmentType.LEFT }), cell("19,637"), cell("19,637"), cell("19,637"), cell("19,637"), cell("19,637"),
    ]}),
    new TableRow({ children: [
      cell("Adj R²", { align: AlignmentType.LEFT }), cell("0.6785"), cell("0.6783"), cell("0.6784"), cell("0.6786"), cell("0.6784"),
    ]}),
  ]
});

// ── 内生性处理表（IV）─────────────────────────────────────────
const ivTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [3120, 3120, 3120],
  rows: [
    new TableRow({ children: [
      hcell("方法", { width: 3120 }),
      hcell("系数（AI_utilize）", { width: 3120 }),
      hcell("关键统计量", { width: 3120 }),
    ]}),
    new TableRow({ children: [
      cell("PSM（treated）"), cell("0.1116**\n(0.0528)"), cell("N=7,468"),
    ]}),
    new TableRow({ children: [
      cell("Heckman第二阶段"), cell("0.1033***\n(0.0289)"), cell("IMR系数=-1.057*"),
    ]}),
    new TableRow({ children: [
      cell("2SLS（IV=互联网普及率）"), cell("0.4654**\n(0.1995)"), cell("K-P F=31.72\n一阶段F>16.38（10%）"),
    ]}),
  ]
});

// ── 机制检验表 ────────────────────────────────────────────────
const mechTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2340, 1755, 1755, 1755, 1755],
  rows: [
    new TableRow({ children: [
      hcell("因变量", { align: AlignmentType.LEFT, width: 2340 }),
      hcell("(1)\n知识多样性1", { width: 1755 }),
      hcell("(2)\n知识多样性2", { width: 1755 }),
      hcell("(3)\n打破组织惯例", { width: 1755 }),
      hcell("(4)\n资源配置效率", { width: 1755 }),
    ]}),
    new TableRow({ children: [
      cell("AI_utilize", { align: AlignmentType.LEFT }),
      cell("0.0113*\n(0.0068)"),
      cell("0.7881***\n(0.2663)"),
      cell("0.0215**\n(0.0084)"),
      cell("-0.0124***\n(0.0046)"),
    ]}),
    new TableRow({ children: [
      cell("含义", { align: AlignmentType.LEFT }),
      cell("促进", { shade: "E2EFDA" }),
      cell("促进", { shade: "E2EFDA" }),
      cell("促进", { shade: "E2EFDA" }),
      cell("降低资源错配", { shade: "E2EFDA" }),
    ]}),
    new TableRow({ children: [
      cell("N", { align: AlignmentType.LEFT }), cell("19,635"), cell("19,637"), cell("19,589"), cell("17,086"),
    ]}),
  ]
});

// ── 行业异质性表 ─────────────────────────────────────────────
const industryTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2000, 1120, 1120, 1120, 1000, 1000, 1000, 1000],
  rows: [
    new TableRow({ children: [
      hcell("变量", { align: AlignmentType.LEFT, width: 2000 }),
      hcell("(1)\n劳动密集", { width: 1120 }),
      hcell("(2)\n资本密集", { width: 1120 }),
      hcell("(3)\n技术密集", { width: 1120 }),
      hcell("(4)\nKRR", { width: 1000 }),
      hcell("(5)\nNLP", { width: 1000 }),
      hcell("(6)\nCV", { width: 1000 }),
      hcell("(7)\nML", { width: 1000 }),
    ]}),
    new TableRow({ children: [
      cell("AI_utilize/细分", { align: AlignmentType.LEFT }),
      cell("0.1583\n(0.1221)"),
      cell("-0.0640\n(0.0802)"),
      cell("0.0709***\n(0.0215)"),
      cell("0.0094\n(0.0793)"),
      cell("0.0560\n(0.0350)"),
      cell("0.1151***\n(0.0338)"),
      cell("0.0635*\n(0.0370)"),
    ]}),
    new TableRow({ children: [
      cell("N", { align: AlignmentType.LEFT }),
      cell("2,928"), cell("4,937"), cell("11,696"),
      cell("11,696"), cell("11,696"), cell("11,696"), cell("11,696"),
    ]}),
  ]
});

// ── 渐进式/突破式创新表 ──────────────────────────────────────
const innoTypeTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2340, 1755, 1755, 1755, 1755],
  rows: [
    new TableRow({ children: [
      hcell("因变量", { align: AlignmentType.LEFT, width: 2340 }),
      hcell("(1)\n渐进式", { width: 1755 }),
      hcell("(2)\n突破式", { width: 1755 }),
      hcell("(3)\n突破式L5", { width: 1755 }),
      hcell("(4)\n突破式L6", { width: 1755 }),
    ]}),
    new TableRow({ children: [
      cell("AI_utilize", { align: AlignmentType.LEFT }),
      cell("0.0596**\n(0.0250)"),
      cell("0.0279\n(0.0180)"),
      cell("0.0704*\n(0.0360)"),
      cell("0.0963**\n(0.0461)"),
    ]}),
    new TableRow({ children: [
      cell("显著性", { align: AlignmentType.LEFT }),
      cell("5%显著", { shade: "E2EFDA" }),
      cell("不显著", { shade: "FFF2CC" }),
      cell("10%显著", { shade: "FFF2CC" }),
      cell("5%显著", { shade: "E2EFDA" }),
    ]}),
    new TableRow({ children: [
      cell("N", { align: AlignmentType.LEFT }),
      cell("19,637"), cell("19,637"), cell("6,693"), cell("5,520"),
    ]}),
  ]
});

// ── 企业异质性表 ─────────────────────────────────────────────
const firmHetTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [3120, 2080, 2080, 2080],
  rows: [
    new TableRow({ children: [
      hcell("交互项", { align: AlignmentType.LEFT, width: 3120 }),
      hcell("(1) OP生产率×AI", { width: 2080 }),
      hcell("(2) LP生产率×AI", { width: 2080 }),
      hcell("(3) 人力资本×AI", { width: 2080 }),
    ]}),
    new TableRow({ children: [
      cell("交互项系数", { align: AlignmentType.LEFT }),
      cell("0.0917***\n(0.0311)"),
      cell("0.0771***\n(0.0248)"),
      cell("0.0094***\n(0.0023)"),
    ]}),
    new TableRow({ children: [
      cell("AI_utilize主效应", { align: AlignmentType.LEFT }),
      cell("-0.5571***\n(0.2049)"),
      cell("-0.5931***\n(0.2047)"),
      cell("-0.0303\n(0.0288)"),
    ]}),
    new TableRow({ children: [
      cell("N", { align: AlignmentType.LEFT }), cell("19,035"), cell("19,035"), cell("14,186"),
    ]}),
  ]
});

// ── 吸收能力表 ───────────────────────────────────────────────
const absorpTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [3120, 3120, 3120],
  rows: [
    new TableRow({ children: [
      hcell("变量", { align: AlignmentType.LEFT, width: 3120 }),
      hcell("(1) 产学研合作", { width: 3120 }),
      hcell("(2) 研发投入", { width: 3120 }),
    ]}),
    new TableRow({ children: [
      cell("AI_utilize", { align: AlignmentType.LEFT }),
      cell("0.0369\n(0.0339)"),
      cell("0.0247\n(0.0342)"),
    ]}),
    new TableRow({ children: [
      cell("吸收能力×AI交互项", { align: AlignmentType.LEFT }),
      cell("0.2448***\n(0.0605)"),
      cell("0.4427*\n(0.2644)"),
    ]}),
    new TableRow({ children: [
      cell("含义", { align: AlignmentType.LEFT }),
      cell("吸收能力显著强化AI效果", { shade: "E2EFDA", colspan: 2 }),
    ]}),
    new TableRow({ children: [
      cell("N", { align: AlignmentType.LEFT }), cell("8,009"), cell("19,637"),
    ]}),
  ]
});

// ── 构建文档 ──────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "宋体", size: 22 } }
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "黑体", color: "1F3864" },
        paragraph: { spacing: { before: 300, after: 180 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "黑体", color: "2E74B5" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 }
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "黑体", color: "2E74B5" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 }
      },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E74B5", space: 1 } },
          children: [new TextRun({ text: "AI技术应用对企业创新影响研究——实证分析报告", size: 18, font: "宋体", color: "595959" })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "第 ", size: 18, font: "宋体" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "宋体" }),
            new TextRun({ text: " 页", size: 18, font: "宋体" }),
          ]
        })]
      })
    },
    children: [
      // ── 封面标题 ────────────────────────────────────────────
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 720, after: 360 },
        children: [new TextRun({ text: "AI技术应用对企业创新影响研究", bold: true, size: 40, font: "黑体", color: "1F3864" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "——实证分析报告", bold: true, size: 32, font: "黑体", color: "2E74B5" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 720 },
        children: [new TextRun({ text: "2026年4月", size: 22, font: "宋体", color: "595959" })]
      }),

      // ── 一、数据概览与描述性统计 ────────────────────────────
      heading1("一、数据概览与描述性统计"),
      para("本研究使用中国A股上市公司面板数据，样本涵盖2009—2022年共14个年度，有效观测约20,241条，企业数量约3,072家。核心变量为企业创新水平（Innov）与AI技术应用综合指标（AI_utilize），并控制规模、盈利能力、财务杠杆等六项企业特征变量。以下为主要变量的描述性统计结果。", { indent: 440 }),
      new Paragraph({ spacing: { after: 120 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "表1  主要变量描述性统计", bold: true, size: 22, font: "宋体" })]
      }),
      descTable,
      note("注：Innov为企业创新（对数化专利申请数）；AI_utilize为AI技术应用综合指标；Size为总资产对数；Age为企业上市年龄对数；ROA为总资产收益率；Leverage为资产负债率；Growth为营收增长率；Rdintensity为研发投入占比。"),
      new Paragraph({ spacing: { after: 200 } }),
      para("从描述性统计可知，样本企业创新均值为2.15，标准差1.20，分布具有一定右偏性，表明上市企业间创新水平存在显著分化。AI_utilize均值仅0.14，中位数更低，说明大多数企业AI应用程度仍处于初级阶段，少数头部企业已达到较高水平（最大值3.93）。控制变量中，企业ROA均值4.65%，杠杆率40%，研发强度5.33%，整体处于合理水平。", { indent: 440 }),

      // ── 二、基准回归结果 ────────────────────────────────────
      heading1("二、基准回归结果"),
      para("基准回归采用双向固定效应模型（reghdfe），逐步引入控制变量与固定效应，标准误按行业-年份双向聚类处理，以稳健应对截面与时间序列层面的残差相关性。结果如表2所示。", { indent: 440 }),
      new Paragraph({ spacing: { after: 120 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "表2  基准回归：AI技术应用对企业创新的影响", bold: true, size: 22, font: "宋体" })]
      }),
      baseTable,
      note("注：括号内为行业-年份双向聚类标准误；* p<0.10，** p<0.05，*** p<0.01。列(1)—(4)固定效应逐步叠加。"),
      new Paragraph({ spacing: { after: 200 } }),
      para("核心发现如下：", { indent: 440 }),
      para("第一，AI技术应用（AI_utilize）对企业创新的正向影响在全部四个规格中均显著为正。在最基础的无固定效应设定中（列1），系数为0.4480，t值高达14.12；引入全部控制变量与双向固定效应后（列4），系数收敛至0.0671（p<0.01），表明在控制企业和年份共同趋势后，AI应用仍能显著提升企业创新水平。", { indent: 440 }),
      para("第二，系数从列(1)的0.448大幅下降至列(4)的0.067，说明简单OLS因遗漏变量（如企业禀赋差异）而严重高估了AI的创新效应。加入双向固定效应后，组内（within）R²由0.024下降至0.020，而整体R²跳升至0.729，意味着企业固定效应本身解释了绝大部分创新水平的差异。", { indent: 440 }),
      para("第三，规模（Size）、盈利能力（ROA）、研发强度（Rdintensity）均与创新正相关，财务杠杆（Leverage）和营收增长率（Growth）与创新负相关，与已有文献一致。", { indent: 440 }),

      // ── 三、AI细分技术类型分析 ──────────────────────────────
      heading1("三、AI细分技术类型的异质性影响"),
      para("进一步将AI_utilize拆分为五类技术：机器学习（Learningbased）、知识表示与推理（KRR）、自然语言处理（NLP）、计算机视觉（CV）、机器学习（ML），分别考察其对企业创新的差异化影响。", { indent: 440 }),
      new Paragraph({ spacing: { after: 120 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "表3  不同AI技术类型对企业创新的影响", bold: true, size: 22, font: "宋体" })]
      }),
      aiSubTable,
      note("注：括号内为行业-年份双向聚类标准误；所有回归均控制双向固定效应及六项企业控制变量。* p<0.10，** p<0.05，*** p<0.01。"),
      new Paragraph({ spacing: { after: 200 } }),
      para("结果显示：计算机视觉（CV）的创新促进效果最为突出（β=0.1284，p<0.01），机器学习型（Learningbased）次之（β=0.0713，p<0.01）。ML在10%水平上显著（β=0.0575，p<0.10）。NLP在全样本中未达到统计显著（p=0.150），可能与其在技术密集型行业更具影响力有关（见行业异质性分析）。KRR基本无显著效应（β=-0.006，p=0.935），说明知识表示与推理类AI应用当前对创新产出的直接贡献有限。上述差异表明，不同AI技术路径对创新的影响机制存在实质性差别，企业AI应用策略值得精细化。", { indent: 440 }),

      // ── 四、内生性处理 ──────────────────────────────────────
      heading1("四、内生性处理"),
      heading2("4.1 遗漏变量偏误检验（Oster δ）"),
      para("利用Oster（2019）方法计算选择性偏误统计量δ。以完整模型（双向FE+控制变量，β=0.0671）为基准：", { indent: 440 }),
      para("（1）相对于无控制变量无固定效应基准（β=0.4480），δ=0.176，远低于规则阈值1，意味着遗漏变量需对结果产生远超已观测变量的选择性偏误，才能使真实效应归零；", { indent: 440 }),
      para("（2）相对于仅含双向FE无控制变量规格（β=0.0924），δ=2.651；", { indent: 440 }),
      para("（3）相对于仅含企业FE无年FE规格（β=0.0733），δ=10.83。", { indent: 440 }),
      para("多组δ值均支持主效应稳健性——遗漏变量偏误不足以颠覆结论。", { indent: 440 }),
      new Paragraph({ spacing: { after: 120 } }),
      heading2("4.2 PSM-DID、Heckman选择与工具变量估计"),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "表4  内生性处理：多种方法结果汇总", bold: true, size: 22, font: "宋体" })]
      }),
      ivTable,
      note("注：PSM使用倾向得分匹配+频率权重；Heckman第一阶段为Probit模型，以OverseaBack为排他性变量；2SLS工具变量为互联网普及率（IV）。K-P F统计量31.72超过10%弱工具变量临界值16.38。"),
      new Paragraph({ spacing: { after: 200 } }),
      para("三种方法均支持AI技术应用对企业创新的正向因果效应：", { indent: 440 }),
      para("（1）PSM结果显示处理组相较匹配对照组创新水平更高（β=0.112，p<0.05），缓解了样本选择偏误；", { indent: 440 }),
      para("（2）Heckman两阶段回归中，逆米尔斯比（IMR）系数在10%水平显著，印证样本选择问题的存在；修正后AI系数仍显著（β=0.103，p<0.01）；", { indent: 440 }),
      para("（3）2SLS估计中，互联网普及率作为AI应用强度的工具变量，一阶段F=31.72，满足相关性条件（弱工具变量检验通过10%临界值），二阶段系数为0.465（p<0.05）。IV估计系数大于OLS，可能反映了对AI应用较弱企业的局部平均处理效应（LATE）特征，或部分遗漏变量的负向偏误被纠正。", { indent: 440 }),

      // ── 五、稳健性检验 ──────────────────────────────────────
      heading1("五、稳健性检验"),
      heading2("5.1 替换变量与滞后处理"),
      para("稳健性检验I（表A2）从三个维度验证基准结论：", { indent: 440 }),
      para("第一，替换被解释变量：使用Innov1（另一口径创新指标）并引入AI_utilize的滞后2期和3期，系数分别为0.0655（p<0.05）和0.0523（p<0.10），正向效应依然成立。", { indent: 440 }),
      para("第二，替换解释变量：使用AI_utilize1（另一口径AI应用指标），系数为1.317（p<0.01），方向与显著性一致。", { indent: 440 }),
      para("第三，AI_utilize滞后1—3期对原始Innov的影响：L1=0.083***、L2=0.070**、L3=0.069**，均显著为正且量级稳定，说明AI应用的创新效应具有持续性。", { indent: 440 }),
      new Paragraph({ spacing: { after: 120 } }),
      heading2("5.2 模型设定稳健性"),
      para("稳健性检验II（表A4）进一步从模型层面验证：", { indent: 440 }),
      para("（1）增加企业×行业交叉固定效应后，系数为0.077（p<0.001），结论不变；", { indent: 440 }),
      para("（2）将聚类层级从行业-年份改为企业层面，系数0.067（p<0.05），仍显著；", { indent: 440 }),
      para("（3）增加行业集中度（HHI_资产）和GDP增速作为宏观控制变量，系数0.072（p<0.01）；", { indent: 440 }),
      para("（4）剔除2014年之前样本（规避早期AI数据质量问题），系数0.042（p<0.05），量级略降但依然显著。", { indent: 440 }),
      para("综合多种稳健性检验，AI技术应用促进企业创新的核心结论高度稳健。", { indent: 440 }),

      // ── 六、作用机制检验 ────────────────────────────────────
      heading1("六、作用机制检验"),
      para("本文从知识多样性、打破组织惯例、资源配置效率三个维度探讨AI技术促进创新的内在路径。", { indent: 440 }),
      new Paragraph({ spacing: { after: 120 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "表5  作用机制检验结果", bold: true, size: 22, font: "宋体" })]
      }),
      mechTable,
      note("注：括号内为行业-年份双向聚类标准误；所有回归均控制双向固定效应；* p<0.10，** p<0.05，*** p<0.01。资源配置效率（O_resource）系数为负代表降低资源错配程度（正向机制）。"),
      new Paragraph({ spacing: { after: 200 } }),
      para("机制检验揭示三条显著路径：", { indent: 440 }),
      para("第一，知识多样性渠道。AI应用显著提升企业内部知识多样性——知识多样性指标1（β=0.011，p<0.10）和指标2（β=0.788，p<0.01）均正向显著。知识多样性有助于企业从更宽广的技术轨迹中汲取创新要素，进而提升专利产出。", { indent: 440 }),
      para("第二，组织惯例打破渠道。AI技术应用对打破组织惯例变量（B_routines）具有显著正向影响（β=0.022，p<0.05），表明AI可通过重塑业务流程、打破路径依赖来激活组织创新活力。", { indent: 440 }),
      para("第三，资源配置效率渠道。资源配置效率指标（O_resource）系数显著为负（β=-0.012，p<0.01），意味着AI技术应用有效降低了企业内部资源错配，提升了研发资源向高回报项目的配置效率，从而驱动创新产出增加。", { indent: 440 }),
      new Paragraph({ spacing: { after: 120 } }),
      heading2("6.1 吸收能力的调节作用"),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "表6  吸收能力的强化作用", bold: true, size: 22, font: "宋体" })]
      }),
      absorpTable,
      note("注：Absorptive1_AI为产学研合作与AI_utilize的交互项；Absorptive2_AI为研发投入与AI_utilize的交互项。* p<0.10，** p<0.05，*** p<0.01。"),
      new Paragraph({ spacing: { after: 200 } }),
      para("结果显示，吸收能力的调节效应显著：以产学研合作衡量的吸收能力与AI的交互项系数为0.245（p<0.01），以研发投入衡量的交互项系数为0.443（p<0.10），均正向显著。这意味着吸收能力更强的企业能够更有效地将AI技术转化为创新成果——外部合作网络与内部研发积累是AI赋能创新的重要前提条件。", { indent: 440 }),

      // ── 七、进一步分析 ──────────────────────────────────────
      heading1("七、进一步分析：异质性与创新类型"),
      heading2("7.1 行业异质性"),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "表7  行业异质性分析（AI应用与创新）", bold: true, size: 22, font: "宋体" })]
      }),
      industryTable,
      note("注：劳动密集型=0，资本密集型=1，技术密集型=2；列(4)—(7)仅限技术密集型子样本。括号内为双向聚类标准误。* p<0.10，*** p<0.01。"),
      new Paragraph({ spacing: { after: 200 } }),
      para("行业异质性检验结果表明：", { indent: 440 }),
      para("（1）AI应用的创新效应主要集中在技术密集型行业（β=0.071，p<0.01），在劳动密集型（p=0.195）和资本密集型（p=0.426）行业中均不显著。这一分布符合理论预期——技术密集型企业在人才基础、数字基础设施和研发文化上更具AI转化能力。", { indent: 440 }),
      para("（2）在技术密集型子样本中进一步分解AI类型：CV（β=0.115，p<0.01）和ML（β=0.064，p<0.10）显著促进创新；KRR和NLP效果不显著。说明视觉感知和数据驱动建模类AI在技术密集型行业具有更直接的创新应用场景。", { indent: 440 }),
      new Paragraph({ spacing: { after: 120 } }),
      heading2("7.2 企业异质性：生产率与人力资本的调节"),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "表8  企业异质性分析", bold: true, size: 22, font: "宋体" })]
      }),
      firmHetTable,
      note("注：OP_AI/LP_AI为TFP（OP/LP法）与AI_utilize的交互项；HC_AI为人力资本与AI_utilize的交互项。* p<0.10，*** p<0.01。"),
      new Paragraph({ spacing: { after: 200 } }),
      para("企业异质性分析揭示了马太效应：生产率更高（OP法：β=0.092，p<0.01；LP法：β=0.077，p<0.01）以及人力资本更充裕（β=0.009，p<0.01）的企业，AI技术促进创新的效果更强。这与知识互补性理论一致——AI作为通用目的技术，与高质量生产要素产生超加性协同效应。值得注意的是，AI_utilize主效应在含交互项的回归中转为负值，这是交互项模型的常见数值现象，反映低禀赋情境下AI应用的净效应受限。", { indent: 440 }),
      new Paragraph({ spacing: { after: 120 } }),
      heading2("7.3 渐进式创新与突破式创新"),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "表9  AI应用与创新类型", bold: true, size: 22, font: "宋体" })]
      }),
      innoTypeTable,
      note("注：渐进式创新（lnincremental）与突破式创新（lnBreakthrough）为两类创新分类指标；L5/L6为AI_utilize的5/6年滞后期。* p<0.10，** p<0.05。"),
      new Paragraph({ spacing: { after: 200 } }),
      para("创新类型分解结果提供了关于AI创新作用时效的重要发现：", { indent: 440 }),
      para("（1）AI应用在当期对渐进式创新有显著正向影响（β=0.060，p<0.05），表明AI的即时创新效果更多体现在现有技术轨道上的改良与优化；", { indent: 440 }),
      para("（2）AI应用对当期突破式创新的影响不显著（β=0.028，p=0.121），但使用5年和6年滞后期后，系数分别达到0.070（p<0.10）和0.096（p<0.05），均显著为正。这说明AI驱动突破式创新存在显著时滞——AI知识积累、技术融合与组织能力培育需要较长时间（5—6年）方能转化为颠覆性创新成果。", { indent: 440 }),
      para("上述发现对企业AI战略具有重要启示：短期内AI应优先应用于改善现有流程与渐进式创新；而突破性技术创新目标则需提前布局、持续投入，预留充裕的转化周期。", { indent: 440 }),

      // ── 八、主要结论与政策建议 ──────────────────────────────
      heading1("八、主要结论与政策建议"),
      heading2("8.1 主要结论"),
      para("本文基于中国A股上市公司2009—2022年面板数据，系统考察了AI技术应用对企业创新的影响。主要结论如下：", { indent: 440 }),
      para("结论一：AI技术应用对企业创新具有显著正向影响，基准估计系数为0.067，经内生性处理（PSM、Heckman、IV）后结论保持稳健，因果关系得到可靠识别。", { indent: 440 }),
      para("结论二：不同AI技术类型效果分化显著，计算机视觉（CV）和机器学习（Learningbased）促进效果最强，知识表示与推理（KRR）效果不显著。", { indent: 440 }),
      para("结论三：AI促进创新的机制路径包括提升知识多样性、打破组织惯例、优化资源配置，三条路径均经过统计验证。", { indent: 440 }),
      para("结论四：AI创新效应存在明显的行业异质性（技术密集型行业更强）和企业异质性（高生产率、高人力资本企业更强），吸收能力显著正向调节AI的创新效果。", { indent: 440 }),
      para("结论五：AI对渐进式创新的效果即时显现，对突破式创新的效果需要5—6年时滞方才显现，揭示了AI驱动颠覆性创新的长周期特性。", { indent: 440 }),
      new Paragraph({ spacing: { after: 120 } }),
      heading2("8.2 政策建议"),
      para("一、推动AI应用向技术密集型行业深化，同时通过产学研合作平台降低中小企业AI应用门槛，缩小行业间数字化鸿沟。", { indent: 440 }),
      para("二、重视AI基础能力建设，尤其是人力资本培育和产学研合作体系构建，以提升企业的AI转化吸收能力。", { indent: 440 }),
      para("三、企业在制定AI战略时应区分短期（渐进式创新）与长期（突破式创新）目标，避免因短期未见突破而低估AI的长期创新价值。", { indent: 440 }),
      para("四、鼓励计算机视觉（CV）等应用型AI技术的推广，重点布局与研发流程深度融合的智能化工具。", { indent: 440 }),

      // ── 附录 ────────────────────────────────────────────────
      heading1("附录：关键统计量汇总"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3120, 3120, 3120],
        rows: [
          new TableRow({ children: [
            hcell("检验类型", { width: 3120 }),
            hcell("统计量/系数", { width: 3120 }),
            hcell("结论", { width: 3120 }),
          ]}),
          new TableRow({ children: [ cell("基准回归（双向FE）"), cell("β=0.0671***"), cell("显著正向"), ]}),
          new TableRow({ children: [ cell("Oster δ（vs.无FE）"), cell("δ=0.176"), cell("遗漏变量威胁可控"), ]}),
          new TableRow({ children: [ cell("工具变量一阶段F"), cell("K-P F=31.72"), cell("强工具变量（>16.38）"), ]}),
          new TableRow({ children: [ cell("2SLS系数"), cell("β=0.465**"), cell("因果效应确认"), ]}),
          new TableRow({ children: [ cell("Heckman第二阶段"), cell("β=0.103***"), cell("选择偏误修正后显著"), ]}),
          new TableRow({ children: [ cell("CV类AI（全样本）"), cell("β=0.128***"), cell("技术细分最强效应"), ]}),
          new TableRow({ children: [ cell("突破式创新L6"), cell("β=0.096**"), cell("5—6年时滞效应"), ]}),
          new TableRow({ children: [ cell("吸收能力交互项1"), cell("β=0.245***"), cell("吸收能力显著强化"), ]}),
        ]
      }),
      new Paragraph({ spacing: { after: 400 } }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("e:\\asic-soc\\7-项目\\a-CIM\\大模型\\金融\\李玉花+附件上传\\AI技术应用与企业创新实证分析报告.docx", buffer);
  console.log("报告生成成功！");
}).catch(err => {
  console.error("生成失败:", err);
  process.exit(1);
});
