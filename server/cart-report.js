// Gera o PDF do "Carrinho de compras" — um produto por bloco, com foto,
// tipo de loja, preço total, medidas, loja e observações, fechando com o
// valor total somado de tudo. Usa pdfkit (puro JS, sem binário nativo,
// funciona bem em serverless).
const PDFDocument = require('pdfkit');

const INK = '#201c16';
const INK_SOFT = '#756b5c';
const INK_FAINT = '#a89d8b';
const ACCENT = '#c17a4e';
const LINE = '#eae1cf';
const CREAM = '#faf6ef';

const STORE_TYPE_LABELS = { fisica: 'Loja física', online: 'Loja online' };

function fmtBRL(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function itemDisplayTitle(item) {
  if (item.store && item.store.trim()) return item.store;
  return STORE_TYPE_LABELS[item.storeType] || 'Produto';
}

// soma do carrinho: usa sempre o "Valor total" de cada produto — só cai
// pro "Preço" se o valor total não tiver sido preenchido
function cartItemValue(item) {
  if (item.totalPrice !== null && item.totalPrice !== undefined) return Number(item.totalPrice) || 0;
  return Number(item.price) || 0;
}

async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrBuf = await res.arrayBuffer();
    return Buffer.from(arrBuf);
  } catch (e) {
    return null;
  }
}

const PAGE_MARGIN = 46;

function drawHeader(doc, project, itemCount) {
  doc.rect(0, 0, doc.page.width, 108).fill(INK);
  doc
    .fillColor(CREAM)
    .font('Helvetica-Bold')
    .fontSize(22)
    .text('isdra', PAGE_MARGIN, 34, { continued: true })
    .fillColor(ACCENT)
    .text(' ✦', { continued: true })
    .fillColor(CREAM)
    .text(' ra', { continued: false });
  doc
    .fillColor(CREAM)
    .font('Helvetica-Bold')
    .fontSize(15)
    .text('Carrinho de Compras', PAGE_MARGIN, 62);
  const rightText = `${project.code} · ${itemCount} ${itemCount === 1 ? 'produto' : 'produtos'} · ${new Date().toLocaleDateString('pt-BR')}`;
  doc
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor('#d9cdb8')
    .text(rightText, PAGE_MARGIN, 84);
  doc.y = 130;
}

function drawFooterTotal(doc, totalFormatted, itemCount) {
  const boxY = doc.y + 14;
  const boxH = 56;
  doc.roundedRect(PAGE_MARGIN, boxY, doc.page.width - PAGE_MARGIN * 2, boxH, 12).fill(INK);
  doc
    .fillColor('#d9cdb8')
    .font('Helvetica')
    .fontSize(10)
    .text(`Valor total de ${itemCount} ${itemCount === 1 ? 'produto' : 'produtos'}`, PAGE_MARGIN + 20, boxY + 14);
  doc
    .fillColor(CREAM)
    .font('Helvetica-Bold')
    .fontSize(20)
    .text(totalFormatted, PAGE_MARGIN + 20, boxY + 28);
}

function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(INK_FAINT)
      .text(`Página ${i + 1} de ${range.count}`, 0, doc.page.height - 32, {
        align: 'center',
        width: doc.page.width
      });
  }
}

async function renderCartReportPdf({ project, items }, res) {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true, autoFirstPage: false });
  doc.pipe(res);
  doc.addPage();
  drawHeader(doc, project, items.length);

  const total = items.reduce((sum, it) => sum + cartItemValue(it), 0);
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  const photoSize = 78;

  if (!items.length) {
    doc
      .font('Helvetica')
      .fontSize(12)
      .fillColor(INK_SOFT)
      .text('O carrinho está vazio.', PAGE_MARGIN, doc.y + 20);
  }

  for (const item of items) {
    const price = item.price !== null && item.price !== undefined ? fmtBRL(item.price) : null;
    const totalPrice = item.totalPrice !== null && item.totalPrice !== undefined ? fmtBRL(item.totalPrice) : null;
    const storeTypeLabel = STORE_TYPE_LABELS[item.storeType] || '';
    const lines = [];
    if (item.measurements) lines.push(`Medidas: ${item.measurements}`);
    if (item.store) lines.push(`Loja: ${item.store}`);
    if (item.link) lines.push(`Link: ${item.link}`);
    if (item.notes) lines.push(`Observações: ${item.notes}`);

    // estimativa de altura do bloco pra decidir se cabe na página atual
    const estLines = Math.max(1, lines.length) * 13 + 40;
    const blockHeight = Math.max(photoSize, estLines) + 24;
    if (doc.y + blockHeight > doc.page.height - PAGE_MARGIN - 70) {
      doc.addPage();
      doc.y = PAGE_MARGIN;
    }

    const blockTop = doc.y;
    const textX = PAGE_MARGIN + photoSize + 16;
    const textWidth = contentWidth - photoSize - 16;

    // foto (ou placeholder)
    const imgBuf = await fetchImageBuffer(item.photoUrl);
    if (imgBuf) {
      try {
        doc.save();
        doc.roundedRect(PAGE_MARGIN, blockTop, photoSize, photoSize, 10).clip();
        doc.image(imgBuf, PAGE_MARGIN, blockTop, { width: photoSize, height: photoSize, cover: [photoSize, photoSize] });
        doc.restore();
      } catch (e) {
        doc.roundedRect(PAGE_MARGIN, blockTop, photoSize, photoSize, 10).fill('#f0ead9');
      }
    } else {
      doc.roundedRect(PAGE_MARGIN, blockTop, photoSize, photoSize, 10).fill('#f0ead9');
    }

    let ty = blockTop;
    doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(itemDisplayTitle(item), textX, ty, { width: textWidth });
    ty = doc.y + 2;

    if (storeTypeLabel) {
      doc.font('Helvetica').fontSize(9).fillColor(INK_SOFT).text(storeTypeLabel.toUpperCase(), textX, ty, { width: textWidth, characterSpacing: 0.4 });
      ty = doc.y + 3;
    }
    if (price) {
      doc.font('Helvetica-Bold').fontSize(13).fillColor(ACCENT).text(`Preço: ${price}`, textX, ty, { width: textWidth });
      ty = doc.y + 1;
    }
    if (totalPrice) {
      doc.font('Helvetica-Oblique').fontSize(10).fillColor(INK_FAINT).text(`Valor total: ${totalPrice}`, textX, ty, { width: textWidth });
      ty = doc.y + 4;
    }
    if (lines.length) {
      doc.font('Helvetica').fontSize(9.5).fillColor(INK_SOFT).text(lines.join('\n'), textX, ty, { width: textWidth, lineGap: 2 });
      ty = doc.y;
    }

    const blockBottom = Math.max(blockTop + photoSize, ty) + 14;
    doc.moveTo(PAGE_MARGIN, blockBottom).lineTo(doc.page.width - PAGE_MARGIN, blockBottom).strokeColor(LINE).lineWidth(1).stroke();
    doc.y = blockBottom + 14;
  }

  if (items.length) {
    if (doc.y + 90 > doc.page.height - PAGE_MARGIN) {
      doc.addPage();
      doc.y = PAGE_MARGIN;
    }
    drawFooterTotal(doc, fmtBRL(total), items.length);
  }

  addPageNumbers(doc);
  doc.end();
}

module.exports = { renderCartReportPdf };
