// ODT renderer — builds a valid OpenDocument Text file (LibreOffice / OpenOffice
// / Google Docs / Word can all open it) from the shared block model. An ODT is a
// zip of XML; we hand-write content.xml with automatic styles and stitch the
// package with jszip. Single column, accent section rules, ATS-friendly.

'use strict';

const JSZip = require('jszip');
const { buildBlocks } = require('./docmodel');
const { getTheme } = require('../themes');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

function automaticStyles(t) {
  const ink = t.ink, accent = t.accentDeep, soft = t.inkSoft;
  const P = (name, props, text) => `<style:style style:name="${name}" style:family="paragraph"><style:paragraph-properties ${props}/><style:text-properties ${text}/></style:style>`;
  const T = (name, text) => `<style:style style:name="${name}" style:family="text"><style:text-properties ${text}/></style:style>`;
  return `
  ${P('Name', 'fo:margin-bottom="0.05cm"', `fo:font-weight="bold" fo:font-size="20pt" fo:color="${ink}"`)}
  ${P('Title', 'fo:margin-bottom="0.1cm"', `fo:font-weight="bold" fo:font-size="11pt" fo:color="${accent}"`)}
  ${P('Contact', 'fo:margin-bottom="0.15cm"', `fo:font-size="9pt" fo:color="${soft}"`)}
  ${P('Rule', 'fo:border-bottom="0.06cm solid ' + accent + '" fo:padding-bottom="0.02cm" fo:margin-bottom="0.18cm"', 'fo:font-size="2pt"')}
  ${P('Metrics', 'fo:margin-bottom="0.2cm"', `fo:font-size="10pt" fo:color="${ink}"`)}
  ${P('H', 'fo:margin-top="0.32cm" fo:margin-bottom="0.1cm" fo:border-bottom="0.02cm solid ' + accent + '" fo:padding-bottom="0.04cm"', `fo:font-weight="bold" fo:font-size="11pt" fo:color="${accent}" fo:letter-spacing="0.03cm"`)}
  <style:style style:name="Sub" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.1cm" fo:margin-bottom="0.03cm"><style:tab-stops><style:tab-stop style:position="17cm" style:type="right"/></style:tab-stops></style:paragraph-properties><style:text-properties fo:font-size="10.5pt" fo:color="${ink}"/></style:style>
  ${P('P', 'fo:margin-bottom="0.1cm"', `fo:font-size="10pt" fo:color="${ink}"`)}
  ${P('PI', 'fo:margin-bottom="0.08cm"', `fo:font-size="10pt" fo:font-style="italic" fo:color="${soft}"`)}
  ${P('Skills', 'fo:margin-bottom="0.08cm"', `fo:font-size="9.5pt" fo:color="${ink}"`)}
  ${P('Pub', 'fo:margin-bottom="0.08cm" fo:margin-left="0.7cm" fo:text-indent="-0.7cm"', `fo:font-size="10pt" fo:color="${ink}"`)}
  ${P('Li', 'fo:margin-bottom="0.03cm"', `fo:font-size="10pt" fo:color="${ink}"`)}
  ${T('tBold', `fo:font-weight="bold" fo:color="${ink}"`)}
  ${T('tAccent', `fo:color="${accent}"`)}
  ${T('tAccentB', `fo:font-weight="bold" fo:color="${accent}"`)}
  ${T('tSoft', `fo:color="${soft}"`)}
  ${T('tValue', `fo:font-weight="bold" fo:font-size="12pt" fo:color="${ink}"`)}
  ${T('tLabel', `fo:font-size="8.5pt" fo:color="${soft}"`)}
  <text:list-style style:name="L1"><text:list-level-style-bullet text:level="1" text:bullet-char="•"><style:list-level-properties text:space-before="0.3cm" text:min-label-width="0.35cm"/></text:list-level-style-bullet></text:list-style>`;
}

function body(blocks) {
  const out = [];
  let list = null; // open bullet list buffer
  const flush = () => { if (list) { out.push(`<text:list text:style-name="L1">${list}</text:list>`); list = null; } };

  let pubN = 0;
  for (const b of blocks) {
    if (b.t !== 'li') flush();
    switch (b.t) {
      case 'name': out.push(`<text:p text:style-name="Name">${esc(b.text)}</text:p>`); break;
      case 'title': out.push(`<text:p text:style-name="Title">${esc(b.text)}</text:p>`); break;
      case 'contact': out.push(`<text:p text:style-name="Contact">${esc(b.text)}</text:p>`); break;
      case 'rule': out.push(`<text:p text:style-name="Rule"></text:p>`); break;
      case 'metrics':
        out.push(`<text:p text:style-name="Metrics">${b.items.map((m, i) => `${i ? '<text:span text:style-name="tSoft">    </text:span>' : ''}<text:span text:style-name="tValue">${esc(m.value)} </text:span><text:span text:style-name="tLabel">${esc(m.label)}</text:span>`).join('')}</text:p>`);
        break;
      case 'h': pubN = 0; out.push(`<text:p text:style-name="H">${esc(b.text.toUpperCase())}</text:p>`); break;
      case 'sub':
        out.push(`<text:p text:style-name="Sub"><text:span text:style-name="tBold">${esc(b.bold)}</text:span>${b.normal ? `<text:span text:style-name="tAccent">${esc(b.normal)}</text:span>` : ''}${b.right ? `<text:tab/><text:span text:style-name="tSoft">${esc(b.right)}</text:span>` : ''}</text:p>`);
        break;
      case 'p': out.push(`<text:p text:style-name="${b.italic ? 'PI' : 'P'}">${esc(b.text)}</text:p>`); break;
      case 'li': list = (list || '') + `<text:list-item><text:p text:style-name="Li">${esc(b.text)}</text:p></text:list-item>`; break;
      case 'liNum': pubN += 1; out.push(`<text:p text:style-name="Pub"><text:span text:style-name="tAccentB">[${pubN}]  </text:span>${esc(b.text)}</text:p>`); break;
      case 'skills':
        for (const g of b.groups) out.push(`<text:p text:style-name="Skills">${g.label ? `<text:span text:style-name="tAccentB">${esc(g.label)}:  </text:span>` : ''}${esc((g.items || []).map((s) => (typeof s === 'string' ? s : s.name)).join('  ·  '))}</text:p>`);
        break;
      default: break;
    }
  }
  flush();
  return out.join('\n');
}

function contentXml(blocks, theme) {
  const NS = [
    'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"',
    'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"',
    'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"',
    'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
    'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"',
  ].join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content ${NS} office:version="1.2">
<office:automatic-styles>${automaticStyles(theme)}</office:automatic-styles>
<office:body><office:text>
${body(blocks)}
</office:text></office:body>
</office:document-content>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2">
<office:styles><style:default-style style:family="paragraph"><style:text-properties style:font-name="Liberation Sans" fo:font-size="10pt"/></style:default-style></office:styles>
<office:automatic-styles><style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="1.4cm" fo:margin-bottom="1.4cm" fo:margin-left="1.5cm" fo:margin-right="1.5cm"/></style:page-layout></office:automatic-styles>
<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles>
</office:document-styles>`;

const MANIFEST_XML = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;

/** Build an .odt Buffer from a profile. */
async function toOdtBuffer(p, ctx = {}) {
  const theme = ctx.theme || getTheme(ctx.themeKey || 'midnight-gold');
  const blocks = buildBlocks(p, ctx);
  const zip = new JSZip();
  // mimetype must be first and stored uncompressed.
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
  zip.file('content.xml', contentXml(blocks, theme));
  zip.file('styles.xml', STYLES_XML);
  zip.file('meta.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" office:version="1.2"><office:meta><meta:generator>Premium Resume Studio</meta:generator></office:meta></office:document-meta>`);
  zip.folder('META-INF').file('manifest.xml', MANIFEST_XML);
  return zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/vnd.oasis.opendocument.text' });
}

module.exports = { toOdtBuffer };
