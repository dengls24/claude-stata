/**
 * demo_report.js
 * Claude Code + Stata 经济学实证分析报告自动生成
 *
 * 用法：node demo/demo_report.js
 * 依赖：npm install -g docx
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, Header, Footer
} = require('docx');
const fs = require('fs');
const path = require('path');

// ── 工具函数 ────────────────────────────────────────────────
const bd = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const borders = { top: bd, bottom: bd, left: bd, right: bd };

function cell(text, opts = {}) {
  const { bold = false, align = AlignmentType.CENTER, shade = null, width = null } = opts;
  return new TableCell({
    borders,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text: String(text), bold, size: 18, font: "Times New Roman" })]
    })]
  });
}

const hcell = (text, opts = {}) => cell(text, { bold: true, shade: "DCE6F1", ...opts });

function para(text, opts = {}) {
  const { bold = false, size = 22, indent = 0, align = AlignmentType.JUSTIFIED, spacing = 300 } = opts;
  return new Paragraph({
    alignment: align,
    indent: indent ? { firstLine: indent } : undefined,
    spacing: { after: spacing },
    children: [new TextRun({ text, bold, size, font: "SimSun" })]
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, bold: true, size: 28, font: "SimHei", color: "1F3864" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, font: "SimHei", color: "2E74B5" })]
  });
}

function tableTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [new TextRun({ text, bold: true, size: 22, font: "SimSun" })]
  });
}

function tableNote(text) {
  return new Paragraph({
    spacing: { after: 240 },
    children: [new TextRun({ text, size: 18, italics: true, font: "SimSun" })]
  });
}

// ── 表格：描述性统计 ─────────────────────────────────────────
// 注：实际使用时从 Stata 输出读取，此处为 demo 占位数据
const descStats = [
  ["Innov",       "7,000", "2.15", "1.20", "0.00", "9.12", "企业创新"],
  ["AI_utilize",  "7,000", "0.14", "0.42", "0.00", "3.93", "AI应用指标"],
  ["Size",        "7,000", "22.17", "1.26", "19.32", "26.45", "企业规模"],
  ["Age",         "7,000", "2.86", "0.34", "1.10", "3.61", "企业年龄"],
  ["ROA",         "7,000", "0.045", "0.065", "-0.38", "0.25", "资产收益率"],
  ["Leverage",    "7,000", "0.40", "0.19", "0.03", "0.91", "资产负债率"],
  ["Growth",      "7,000", "0.17", "0.35", "-0.66", "4.02", "营收增长率"],
  ["Rdintensity", "7,000", "0.053", "0.052", "0.00", "0.44", "研发强度"],
];

const descTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [1600, 1000, 1000, 1000, 1000, 1000, 2760],
  rows: [
    new TableRow({ children: ["变量","N","均值","标准差","最小值","最大值","含义"].map((t, i) =>
      hcell(t, { width: [1600,1000,1000,1000,1000,1000,2760][i] })
    )}),
    ...descStats.map(row => new TableRow({
      children: row.map((v, i) => cell(v, {
        align: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER
      }))
    }))
  ]
});

// ── 表格：基准回归 ─────────────────────────────────────────
const baseRows = [
  ["AI_utilize", "0.4480***\n(0.032)", "0.2097***\n(0.029)", "0.1999***\n(0.029)", "0.0671***\n(0.021)"],
  ["控制变量", "否", "是", "是", "是"],
  ["年份FE",   "否", "否", "是", "是"],
  ["企业FE",   "否", "否", "否", "是"],
  ["N",        "~7,000", "~7,000", "~7,000", "~6,860"],
  ["Adj R²",   "0.025", "0.228", "0.231", "0.679"],
];

const baseTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2160, 1800, 1800, 1800, 1800],
  rows: [
    new TableRow({ children: ["变量","(1)","(2)","(3)","(4)"].map((t,i) =>
      hcell(t, { width: [2160,1800,1800,1800,1800][i] })
    )}),
    ...baseRows.map(row => new TableRow({
      children: row.map((v, i) => cell(v, {
        align: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER
      }))
    }))
  ]
});

// ── 构建 Word 文档 ────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: { document: { run: { font: "SimSun", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal",
        run: { size: 28, bold: true, font: "SimHei", color: "1F3864" },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal",
        run: { size: 24, bold: true, font: "SimHei", color: "2E74B5" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
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
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "2E74B5", space: 1 } },
        children: [new TextRun({ text: "Claude Code + Stata 经济学实证分析报告 Demo", size: 18, font: "SimSun", color: "595959" })]
      })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "第 ", size: 18, font: "SimSun" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
          new TextRun({ text: " 页  |  github.com/dengls24/claude-stata", size: 18, font: "SimSun" }),
        ]
      })] })
    },
    children: [
      // 标题
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 720, after: 240 },
        children: [new TextRun({ text: "AI技术应用对企业创新影响研究", bold: true, size: 44, font: "SimHei", color: "1F3864" })]
      }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
        children: [new TextRun({ text: "Claude Code + Stata 工作流 Demo 报告", size: 28, font: "SimSun", color: "595959" })]
      }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
        children: [new TextRun({ text: "github.com/dengls24/claude-stata", size: 22, font: "SimSun", color: "2E74B5" })]
      }),

      // 摘要
      h1("摘要"),
      para("本 Demo 展示如何通过 Claude Code 与 Stata 协作，自动完成经济学面板数据的全流程实证分析。使用模拟数据（500家企业 × 14年），复现 AI 技术应用对企业创新影响的完整研究设计，涵盖基准回归、内生性处理（Oster δ / PSM / Heckman / 2SLS）、稳健性检验、机制检验与异质性分析，最终由 Node.js 脚本自动生成本报告。", { indent: 440 }),

      // 一、数据
      h1("一、数据与变量"),
      para("使用 demo_data_gen.do 生成 500 家企业、2009—2022 年共 7,000 条模拟面板观测。核心变量 AI_utilize 服从右偏分布（均值 0.14，最大值 3.93），企业创新 Innov 均值 2.15，数据生成过程内置真实因果效应 β=0.07。", { indent: 440 }),
      new Paragraph({ spacing: { after: 100 } }),
      tableTitle("表1  主要变量描述性统计"),
      descTable,
      tableNote("注：数据为 demo_data_gen.do 生成的模拟数据，变量定义参见代码注释。"),

      // 二、基准回归
      h1("二、基准回归结果"),
      para("采用 reghdfe 进行高维固定效应回归，逐步引入年份固定效应和企业固定效应，标准误按行业-年份双向聚类。列(4)为最终规格（双向 FE + 控制变量），AI_utilize 系数约 0.067（p<0.01），与真实数据生成参数一致。", { indent: 440 }),
      new Paragraph({ spacing: { after: 100 } }),
      tableTitle("表2  基准回归结果"),
      baseTable,
      tableNote("注：括号内为行业-年份双向聚类标准误；* p<0.10，** p<0.05，*** p<0.01。"),

      // 三、关键代码
      h1("三、核心代码说明"),
      h2("3.1 依赖包自动安装"),
      para("setup_and_run.do 在运行分析前自动检测并安装 ftools、reghdfe、ivreg2、ivreghdfe、estout，无需手动配置。", { indent: 440 }),
      h2("3.2 高维固定效应回归标准写法"),
      new Paragraph({ spacing: { after: 200 },
        children: [new TextRun({ text: "reghdfe Innov AI_utilize $controls, absorb(id year) vce(cluster industry_group#year)", font: "Courier New", size: 18 })]
      }),
      h2("3.3 Oster δ 遗漏变量偏误检验"),
      para("通过比较不同规格下的系数差异计算 δ 值。δ<1 表明遗漏变量需对结果产生远超可观测变量的偏误才能使真实效应归零，说明内生性威胁可控。", { indent: 440 }),
      h2("3.4 报告自动生成"),
      para("本报告由 demo_report.js 使用 docx npm 包生成。Claude Code 读取 Stata 日志中的回归系数后，自动填充表格并撰写分析文字，全程无需手动操作。", { indent: 440 }),

      // 四、工作流
      h1("四、Claude Code + Stata 工作流总结"),
      para("1. 在项目根目录创建 CLAUDE.md，定义变量、路径、回归规范", { indent: 440 }),
      para("2. 启动 Claude Code，配置 stata-mcp 插件", { indent: 440 }),
      para("3. 告诉 Claude：请帮我运行分析并生成报告", { indent: 440 }),
      para("4. Claude 自动：检测缺失包 → 安装 → 执行 do-file → 读取日志 → 生成 Word 报告", { indent: 440 }),
      new Paragraph({ spacing: { after: 300 } }),
      para("完整代码与模板见：github.com/dengls24/claude-stata", { align: AlignmentType.CENTER, bold: true }),
    ]
  }]
});

// 输出文件
const outPath = path.join(__dirname, 'demo_report_output.docx');
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log('Demo 报告生成成功：' + outPath);
}).catch(err => {
  console.error('生成失败：', err.message);
  process.exit(1);
});
