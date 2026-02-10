import { getSettings } from '../database/db';
import { BusinessSettings } from '../types';

let cachedSettings: BusinessSettings | null = null;

export async function loadFormatSettings(): Promise<void> {
  cachedSettings = await getSettings();
}

export function clearFormatCache(): void {
  cachedSettings = null;
}

export function formatPrice(amount: number): string {
  if (cachedSettings) {
    return amount.toLocaleString(cachedSettings.currencyLocale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' ' + cachedSettings.currencySymbol;
  }
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + ' FCFA';
}

export function formatDate(dateStr: string): string {
  const locale = cachedSettings?.currencyLocale ?? 'fr-FR';
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
