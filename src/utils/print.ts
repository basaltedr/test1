import { getInvoiceWithItems } from '../database/db';

function formatPricePlain(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' FCFA';
}

/**
 * Generate a full-page invoice HTML (A4-style) for printing or PDF export.
 */
export async function generateInvoiceHtml(invoiceId: number): Promise<string> {
  const { invoice, items } = await getInvoiceWithItems(invoiceId);

  const rows = items
    .map(
      (item: any) => `
    <tr>
      <td>${item.productName}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${formatPricePlain(item.unitPrice)}</td>
      <td style="text-align:right"><strong>${formatPricePlain(item.total)}</strong></td>
    </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #2C3E50; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4A90D9; padding-bottom: 20px; }
    .header h1 { margin: 0; font-size: 28px; color: #4A90D9; }
    .header p { margin: 4px 0; color: #666; }
    .info { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info div { }
    .info .label { font-size: 12px; color: #888; text-transform: uppercase; }
    .info .value { font-size: 16px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background-color: #4A90D9; color: white; padding: 10px 12px; text-align: left; font-size: 13px; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .total-row { text-align: right; font-size: 22px; font-weight: 700; margin-top: 10px; color: #27AE60; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #aaa; border-top: 1px solid #eee; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>FACTURE</h1>
    <p>${invoice.number}</p>
  </div>

  <div class="info">
    <div>
      <div class="label">Client</div>
      <div class="value">${invoice.clientName}</div>
    </div>
    <div>
      <div class="label">Date</div>
      <div class="value">${new Date(invoice.date).toLocaleDateString('fr-FR')}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Produit</th>
        <th style="text-align:center">Qté</th>
        <th style="text-align:right">Prix unitaire</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="total-row">
    TOTAL : ${formatPricePlain(invoice.total)}
  </div>

  <div class="footer">
    Merci pour votre achat !<br/>
    GestiVente — Application de gestion commerciale
  </div>
</body>
</html>`;
}

/**
 * Generate a compact thermal-printer-style ticket (58mm / 80mm width).
 */
export async function generateTicketHtml(invoiceId: number): Promise<string> {
  const { invoice, items } = await getInvoiceWithItems(invoiceId);

  const rows = items
    .map(
      (item: any) => `
    <tr>
      <td>${item.productName}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${formatPricePlain(item.total)}</td>
    </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 0; size: 80mm auto; }
    body {
      font-family: 'Courier New', monospace;
      width: 72mm;
      margin: 4mm auto;
      font-size: 12px;
      color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; }
    .total { font-size: 16px; font-weight: bold; text-align: center; margin: 8px 0; }
  </style>
</head>
<body>
  <div class="center bold" style="font-size:16px;">GestiVente</div>
  <div class="center">Ticket de caisse</div>
  <div class="line"></div>

  <div>N° : ${invoice.number}</div>
  <div>Client : ${invoice.clientName}</div>
  <div>Date : ${new Date(invoice.date).toLocaleString('fr-FR')}</div>
  <div class="line"></div>

  <table>
    <tr class="bold">
      <td>Article</td>
      <td style="text-align:center">Qté</td>
      <td style="text-align:right">Total</td>
    </tr>
    ${rows}
  </table>

  <div class="line"></div>
  <div class="total">TOTAL : ${formatPricePlain(invoice.total)}</div>
  <div class="line"></div>

  <div class="center" style="margin-top:8px;">Merci et à bientôt !</div>
</body>
</html>`;
}
