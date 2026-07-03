// DOCX renderer — turns the shared block model into a real, editable Word
// document using the pure-JS `docx` library. Single column, accent-colored
// section rules, ATS-friendly. Sizes are in half-points; colors are hex w/o '#'.

'use strict';

const {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, TabStopType, HeadingLevel,
} = require('docx');
const { buildBlocks } = require('./docmodel');
const { getTheme } = require('../themes');

const hex = (c) => String(c || '#000000').replace('#', '');

function render(blocks, theme) {
  const accent = hex(theme.accentDeep);
  const ink = hex(theme.ink);
  const soft = hex(theme.inkSoft);

  const children = [];
  const RIGHT_TAB = 9700; // twips, ~ right margin for dates

  let pubN = 0;
  for (const b of blocks) {
    switch (b.t) {
      case 'name':
        children.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: b.text, bold: true, size: 40, color: ink })] }));
        break;
      case 'title':
        children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: b.text, size: 22, color: accent, bold: true })] }));
        break;
      case 'contact':
        children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: b.text, size: 18, color: soft })] }));
        break;
      case 'rule':
        children.push(new Paragraph({ spacing: { after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: accent } }, children: [] }));
        break;
      case 'metrics':
        children.push(new Paragraph({
          spacing: { after: 100 },
          children: b.items.flatMap((m, i) => [
            ...(i ? [new TextRun({ text: '    ', size: 20 })] : []),
            new TextRun({ text: `${m.value} `, bold: true, size: 22, color: ink }),
            new TextRun({ text: m.label, size: 16, color: soft }),
          ]),
        }));
        break;
      case 'h':
        pubN = 0;
        children.push(new Paragraph({
          spacing: { before: 200, after: 60 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: accent } },
          children: [new TextRun({ text: b.text.toUpperCase(), bold: true, size: 21, color: accent, characterSpacing: 20 })],
        }));
        break;
      case 'sub':
        children.push(new Paragraph({
          spacing: { before: 60, after: 10 },
          tabStops: b.right ? [{ type: TabStopType.RIGHT, position: RIGHT_TAB }] : [],
          children: [
            new TextRun({ text: b.bold, bold: true, size: 21, color: ink }),
            ...(b.normal ? [new TextRun({ text: b.normal, size: 20, color: accent })] : []),
            ...(b.right ? [new TextRun({ text: `\t${b.right}`, size: 18, color: soft })] : []),
          ],
        }));
        break;
      case 'p':
        children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: b.text, size: 20, italics: !!b.italic, color: b.italic ? soft : ink })] }));
        break;
      case 'li':
        children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 20 }, children: [new TextRun({ text: b.text, size: 20, color: ink })] }));
        break;
      case 'liNum':
        pubN += 1;
        children.push(new Paragraph({ spacing: { after: 30 }, indent: { left: 360, hanging: 360 }, children: [new TextRun({ text: `[${pubN}]  `, bold: true, size: 20, color: accent }), new TextRun({ text: b.text, size: 20, color: ink })] }));
        break;
      case 'skills':
        for (const g of b.groups) {
          children.push(new Paragraph({
            spacing: { after: 30 },
            children: [
              ...(g.label ? [new TextRun({ text: `${g.label}:  `, bold: true, size: 19, color: accent })] : []),
              new TextRun({ text: (g.items || []).map((s) => (typeof s === 'string' ? s : s.name)).join('  ·  '), size: 19, color: ink }),
            ],
          }));
        }
        break;
      default:
        break;
    }
  }

  return new Document({
    creator: 'Premium Resume Studio',
    styles: { default: { document: { run: { font: 'Calibri' } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
      children,
    }],
  });
}

/** Build a .docx Buffer from a profile. */
async function toDocxBuffer(p, ctx = {}) {
  const theme = ctx.theme || getTheme(ctx.themeKey || 'midnight-gold');
  const blocks = buildBlocks(p, ctx);
  const doc = render(blocks, theme);
  return Packer.toBuffer(doc);
}

module.exports = { toDocxBuffer };
