import { getInvoiceWithItems, getSettings } from '../database/db';
import { BusinessSettings } from '../types';

function formatPricePlain(amount: number, settings: BusinessSettings): string {
  return amount.toLocaleString(settings.currencyLocale) + ' ' + settings.currencySymbol;
}

function logoHtml(settings: BusinessSettings, maxHeight = 60): string {
  if (!settings.logoBase64) return '';
  return `<img src="${settings.logoBase64}" style="max-height:${maxHeight}px; max-width:180px; object-fit:contain;" />`;
}

function businessBlock(settings: BusinessSettings): string {
  const lines = [
    settings.address,
    settings.phone ? `Tel : ${settings.phone}` : '',
    settings.email,
    settings.taxId ? `N\u00B0 fiscal : ${settings.taxId}` : '',
  ].filter(Boolean);
  return lines.map((l) => `<div class="biz-line">${l}</div>`).join('');
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}
function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

// ── Shared data builder ──────────────────────────────────
interface InvoiceData {
  invoice: any;
  items: any[];
  settings: BusinessSettings;
  color: string;
  colorLight: string;
  colorDark: string;
  rows: string;
  logo: string;
  bizInfo: string;
  dateFormatted: string;
  totalFormatted: string;
}

async function buildInvoiceData(invoiceId: number): Promise<InvoiceData> {
  const { invoice, items } = await getInvoiceWithItems(invoiceId);
  const settings = await getSettings();
  const color = settings.invoiceColor || '#1B6FEE';

  const rows = items
    .map(
      (item: any) => `
    <tr>
      <td>${item.productName}</td>
      <td class="center">${item.quantity}</td>
      <td class="right">${formatPricePlain(item.unitPrice, settings)}</td>
      <td class="right bold">${formatPricePlain(item.total, settings)}</td>
    </tr>`
    )
    .join('');

  return {
    invoice,
    items,
    settings,
    color,
    colorLight: lighten(color, 0.9),
    colorDark: darken(color, 0.2),
    rows,
    logo: logoHtml(settings, 60),
    bizInfo: businessBlock(settings),
    dateFormatted: new Date(invoice.date).toLocaleDateString(settings.currencyLocale),
    totalFormatted: formatPricePlain(invoice.total, settings),
  };
}

// ═══════════════════════════════════════════════════════
//  TEMPLATE: MODERN
// ═══════════════════════════════════════════════════════
function templateModern(d: InvoiceData): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1f2937; font-size: 14px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .header-left { display: flex; align-items: center; gap: 16px; }
  .biz-name { font-size: 24px; font-weight: 800; color: ${d.color}; }
  .biz-line { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .invoice-badge { background: ${d.color}; color: #fff; font-size: 22px; font-weight: 800; padding: 10px 24px; border-radius: 8px; text-align: center; }
  .invoice-badge small { display: block; font-size: 11px; font-weight: 500; opacity: 0.8; margin-top: 2px; }
  .meta-bar { display: flex; gap: 32px; background: ${d.colorLight}; padding: 16px 20px; border-radius: 8px; margin-bottom: 28px; border-left: 4px solid ${d.color}; }
  .meta-item .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; }
  .meta-item .val { font-size: 15px; font-weight: 700; color: #111827; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: ${d.color}; color: #fff; padding: 11px 14px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th:first-child { border-radius: 8px 0 0 0; }
  thead th:last-child { border-radius: 0 8px 0 0; }
  td { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; }
  tr:nth-child(even) { background: #fafbfc; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  .total-section { display: flex; justify-content: flex-end; margin-top: 10px; }
  .total-box { background: ${d.colorLight}; border: 2px solid ${d.color}; border-radius: 10px; padding: 16px 28px; text-align: right; }
  .total-label { font-size: 12px; text-transform: uppercase; color: #6b7280; letter-spacing: 1px; }
  .total-amount { font-size: 28px; font-weight: 800; color: ${d.color}; margin-top: 4px; }
  .footer { text-align: center; margin-top: 44px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
</style></head><body>
  <div class="header">
    <div class="header-left">
      ${d.logo}
      <div>
        <div class="biz-name">${d.settings.businessName}</div>
        ${d.bizInfo}
      </div>
    </div>
    <div class="invoice-badge">FACTURE<small>${d.invoice.number}</small></div>
  </div>
  <div class="meta-bar">
    <div class="meta-item"><div class="lbl">Client</div><div class="val">${d.invoice.clientName}</div></div>
    <div class="meta-item"><div class="lbl">Date</div><div class="val">${d.dateFormatted}</div></div>
    <div class="meta-item"><div class="lbl">Facture</div><div class="val">${d.invoice.number}</div></div>
  </div>
  <table><thead><tr>
    <th style="text-align:left">Produit</th><th class="center">Qte</th><th class="right">P.U.</th><th class="right">Total</th>
  </tr></thead><tbody>${d.rows}</tbody></table>
  <div class="total-section"><div class="total-box">
    <div class="total-label">Total a payer</div>
    <div class="total-amount">${d.totalFormatted}</div>
  </div></div>
  <div class="footer">${d.settings.footerMessage}<br/>${d.settings.businessName}</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════
//  TEMPLATE: CLASSIC
// ═══════════════════════════════════════════════════════
function templateClassic(d: InvoiceData): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Georgia, serif; padding: 40px; color: #2c2c2c; font-size: 14px; }
  .header { text-align: center; border-bottom: 3px double ${d.color}; padding-bottom: 24px; margin-bottom: 28px; }
  .logo-wrap { margin-bottom: 10px; }
  .biz-name { font-size: 28px; font-weight: bold; color: ${d.color}; letter-spacing: 1px; }
  .biz-line { font-size: 12px; color: #666; margin-top: 2px; }
  h2 { font-size: 20px; margin-top: 16px; font-weight: normal; letter-spacing: 4px; text-transform: uppercase; color: #444; }
  .invoice-num { font-size: 13px; color: #888; margin-top: 4px; }
  .info-row { display: flex; justify-content: space-between; margin-bottom: 24px; padding: 16px; background: #fafafa; border: 1px solid #e0e0e0; }
  .info-row .lbl { font-size: 11px; text-transform: uppercase; color: #888; }
  .info-row .val { font-size: 15px; font-weight: bold; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #ccc; }
  th { background: ${d.color}; color: #fff; padding: 10px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid ${d.colorDark}; }
  td { padding: 10px 12px; border: 1px solid #ddd; }
  tr:nth-child(even) { background: #f8f8f8; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .total-row { text-align: right; font-size: 24px; font-weight: bold; color: ${d.color}; padding: 12px 0; border-top: 3px double ${d.color}; }
  .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 12px; }
</style></head><body>
  <div class="header">
    <div class="logo-wrap">${d.logo}</div>
    <div class="biz-name">${d.settings.businessName}</div>
    ${d.bizInfo}
    <h2>Facture</h2>
    <div class="invoice-num">${d.invoice.number}</div>
  </div>
  <div class="info-row">
    <div><div class="lbl">Client</div><div class="val">${d.invoice.clientName}</div></div>
    <div style="text-align:right"><div class="lbl">Date</div><div class="val">${d.dateFormatted}</div></div>
  </div>
  <table><thead><tr>
    <th style="text-align:left">Produit</th><th class="center">Qte</th><th class="right">Prix unitaire</th><th class="right">Total</th>
  </tr></thead><tbody>${d.rows}</tbody></table>
  <div class="total-row">TOTAL : ${d.totalFormatted}</div>
  <div class="footer">${d.settings.footerMessage}<br/>${d.settings.businessName}</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════
//  TEMPLATE: MINIMAL
// ═══════════════════════════════════════════════════════
function templateMinimal(d: InvoiceData): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', 'SF Pro', -apple-system, sans-serif; padding: 48px; color: #374151; font-size: 14px; line-height: 1.6; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .biz-name { font-size: 18px; font-weight: 700; color: #111; }
  .biz-line { font-size: 11px; color: #9ca3af; }
  .invoice-info { text-align: right; }
  .invoice-title { font-size: 32px; font-weight: 200; color: ${d.color}; letter-spacing: -1px; }
  .invoice-num-label { font-size: 11px; color: #9ca3af; margin-top: 8px; }
  .invoice-num-val { font-size: 13px; font-weight: 600; color: #374151; }
  .meta-row { display: flex; gap: 48px; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6; }
  .meta-item .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; color: #9ca3af; }
  .meta-item .val { font-size: 14px; font-weight: 600; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { padding: 12px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; border-bottom: 2px solid #111; }
  td { padding: 14px 0; border-bottom: 1px solid #f3f4f6; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 600; }
  .total-section { display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 20px; border-top: 2px solid #111; }
  .total-inner { text-align: right; }
  .total-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; color: #9ca3af; }
  .total-amount { font-size: 30px; font-weight: 700; color: ${d.color}; margin-top: 4px; }
  .footer { text-align: center; margin-top: 60px; font-size: 11px; color: #d1d5db; }
</style></head><body>
  <div class="header">
    <div class="header-left">
      ${d.logo}
      <div>
        <div class="biz-name">${d.settings.businessName}</div>
        ${d.bizInfo}
      </div>
    </div>
    <div class="invoice-info">
      <div class="invoice-title">Facture</div>
      <div class="invoice-num-label">NUMERO</div>
      <div class="invoice-num-val">${d.invoice.number}</div>
    </div>
  </div>
  <div class="meta-row">
    <div class="meta-item"><div class="lbl">Facture a</div><div class="val">${d.invoice.clientName}</div></div>
    <div class="meta-item"><div class="lbl">Date d'emission</div><div class="val">${d.dateFormatted}</div></div>
  </div>
  <table><thead><tr>
    <th style="text-align:left">Description</th><th class="center">Qte</th><th class="right">Prix unit.</th><th class="right">Montant</th>
  </tr></thead><tbody>${d.rows}</tbody></table>
  <div class="total-section"><div class="total-inner">
    <div class="total-label">Total a payer</div>
    <div class="total-amount">${d.totalFormatted}</div>
  </div></div>
  <div class="footer">${d.settings.footerMessage}</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════
//  TEMPLATE: ELEGANT
// ═══════════════════════════════════════════════════════
function templateElegant(d: InvoiceData): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #2c2c2c; font-size: 14px; }
  .top-bar { background: ${d.color}; padding: 36px 40px; color: #fff; display: flex; justify-content: space-between; align-items: center; }
  .top-left { display: flex; align-items: center; gap: 16px; }
  .top-left img { border-radius: 6px; }
  .biz-name { font-size: 24px; font-weight: 800; color: #fff; }
  .biz-line { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 1px; }
  .top-right { text-align: right; }
  .top-right h1 { font-size: 28px; font-weight: 800; letter-spacing: 3px; }
  .top-right .num { font-size: 12px; opacity: 0.8; margin-top: 4px; }
  .body-content { padding: 32px 40px; }
  .meta-cards { display: flex; gap: 20px; margin-bottom: 28px; }
  .meta-card { flex: 1; background: #f9fafb; border-radius: 8px; padding: 14px 16px; border-left: 3px solid ${d.color}; }
  .meta-card .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; }
  .meta-card .val { font-size: 15px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #1f2937; color: #fff; padding: 11px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; }
  td { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; }
  tr:nth-child(even) { background: #fafbfc; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  .total-bar { display: flex; justify-content: flex-end; }
  .total-box { background: linear-gradient(135deg, ${d.color}, ${d.colorDark}); color: #fff; padding: 20px 32px; border-radius: 10px; text-align: right; min-width: 220px; }
  .total-box .lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
  .total-box .amt { font-size: 28px; font-weight: 800; margin-top: 4px; }
  .footer { text-align: center; margin-top: 40px; padding: 20px 40px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
</style></head><body>
  <div class="top-bar">
    <div class="top-left">
      ${d.logo ? d.logo.replace('object-fit:contain;', 'object-fit:contain; border-radius:6px;') : ''}
      <div>
        <div class="biz-name">${d.settings.businessName}</div>
        ${d.bizInfo.replace(/class="biz-line"/g, 'class="biz-line" style="color:rgba(255,255,255,0.7)"')}
      </div>
    </div>
    <div class="top-right">
      <h1>FACTURE</h1>
      <div class="num">${d.invoice.number}</div>
    </div>
  </div>
  <div class="body-content">
    <div class="meta-cards">
      <div class="meta-card"><div class="lbl">Client</div><div class="val">${d.invoice.clientName}</div></div>
      <div class="meta-card"><div class="lbl">Date</div><div class="val">${d.dateFormatted}</div></div>
      <div class="meta-card"><div class="lbl">Reference</div><div class="val">${d.invoice.number}</div></div>
    </div>
    <table><thead><tr>
      <th style="text-align:left">Designation</th><th class="center">Qte</th><th class="right">P.U.</th><th class="right">Total</th>
    </tr></thead><tbody>${d.rows}</tbody></table>
    <div class="total-bar"><div class="total-box">
      <div class="lbl">Total</div>
      <div class="amt">${d.totalFormatted}</div>
    </div></div>
  </div>
  <div class="footer">${d.settings.footerMessage}<br/>${d.settings.businessName}</div>
</body></html>`;
}

// ── Template router ──────────────────────────────────
const TEMPLATE_MAP: Record<string, (d: InvoiceData) => string> = {
  modern: templateModern,
  classic: templateClassic,
  minimal: templateMinimal,
  elegant: templateElegant,
};

/**
 * Generate invoice HTML using the selected template.
 */
export async function generateInvoiceHtml(invoiceId: number): Promise<string> {
  const data = await buildInvoiceData(invoiceId);
  const templateFn = TEMPLATE_MAP[data.settings.invoiceTemplate] ?? templateModern;
  return templateFn(data);
}

/**
 * Generate a compact thermal-printer-style ticket.
 */
export async function generateTicketHtml(invoiceId: number): Promise<string> {
  const { invoice, items } = await getInvoiceWithItems(invoiceId);
  const settings = await getSettings();
  const color = settings.invoiceColor || '#1B6FEE';

  const rows = items
    .map(
      (item: any) => `
    <tr>
      <td>${item.productName}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${formatPricePlain(item.total, settings)}</td>
    </tr>`
    )
    .join('');

  const contactLines = [
    settings.address,
    settings.phone ? `Tel : ${settings.phone}` : '',
  ].filter(Boolean).map((line) => `<div class="center">${line}</div>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  @page { margin: 0; size: 80mm auto; }
  body { font-family: 'Courier New', monospace; width: 72mm; margin: 4mm auto; font-size: 12px; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  .colored-line { border-top: 2px solid ${color}; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; }
  .total { font-size: 16px; font-weight: bold; text-align: center; margin: 8px 0; color: ${color}; }
  .logo-wrap { text-align: center; margin-bottom: 6px; }
  .logo-wrap img { max-height: 40px; max-width: 120px; }
</style></head><body>
  ${settings.logoBase64 ? `<div class="logo-wrap"><img src="${settings.logoBase64}" /></div>` : ''}
  <div class="center bold" style="font-size:16px;">${settings.businessName}</div>
  ${contactLines}
  <div class="center">Ticket de caisse</div>
  <div class="colored-line"></div>
  <div>N\u00B0 : ${invoice.number}</div>
  <div>Client : ${invoice.clientName}</div>
  <div>Date : ${new Date(invoice.date).toLocaleString(settings.currencyLocale)}</div>
  <div class="line"></div>
  <table>
    <tr class="bold"><td>Article</td><td style="text-align:center">Qte</td><td style="text-align:right">Total</td></tr>
    ${rows}
  </table>
  <div class="line"></div>
  <div class="total">TOTAL : ${formatPricePlain(invoice.total, settings)}</div>
  <div class="colored-line"></div>
  <div class="center" style="margin-top:8px;">${settings.footerMessage}</div>
</body></html>`;
}
