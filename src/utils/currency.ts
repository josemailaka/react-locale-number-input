import { REGION_CURRENCY } from '../data/regionCurrency';

export type CurrencyDisplay = 'symbol' | 'narrowSymbol' | 'code' | 'name';

/** Region (ISO 3166-1 alpha-2) of a locale, e.g. "fr" -> "FR", "en-GB" -> "GB". */
export function getLocaleRegion(locale?: string): string | undefined {
  if (!locale) {
    return undefined;
  }
  try {
    const intlLocale = new Intl.Locale(locale);
    return intlLocale.region || intlLocale.maximize().region || undefined;
  } catch {
    const parts = locale.split(/[-_]/);
    const region = parts.find((part, i) => i > 0 && /^[a-z]{2}$/i.test(part));
    return region ? region.toUpperCase() : undefined;
  }
}

/** ISO 4217 currency code used in the region of the given locale ("fr-FR" -> "EUR"). */
export function getCurrencyCodeForLocale(locale?: string): string | undefined {
  const region = getLocaleRegion(locale);
  return region ? REGION_CURRENCY[region] : undefined;
}

export interface CurrencyInfo {
  /** Symbol / code / name to display */
  symbol: string;
  /** Where the locale places the currency */
  position: 'start' | 'end';
}

/**
 * Returns the currency symbol for `currency` (or for the currency of the locale
 * region when omitted) and where the locale usually places it.
 */
export function getCurrencyInfo(
  locale?: string,
  currency?: string,
  currencyDisplay: CurrencyDisplay = 'symbol'
): CurrencyInfo | undefined {
  const key = `${locale ?? ''}|${currency ?? ''}|${currencyDisplay}`;
  if (!infoCache.has(key)) {
    infoCache.set(key, computeCurrencyInfo(locale, currency, currencyDisplay));
  }
  return infoCache.get(key);
}

const infoCache = new Map<string, CurrencyInfo | undefined>();

function computeCurrencyInfo(
  locale: string | undefined,
  currency: string | undefined,
  currencyDisplay: CurrencyDisplay
): CurrencyInfo | undefined {
  const code = (currency || getCurrencyCodeForLocale(locale))?.toUpperCase();
  if (!code) {
    return undefined;
  }
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay,
    }).formatToParts(1);
    const currencyIndex = parts.findIndex(p => p.type === 'currency');
    const integerIndex = parts.findIndex(p => p.type === 'integer');
    return {
      symbol: currencyIndex === -1 ? code : parts[currencyIndex].value,
      position: currencyIndex !== -1 && currencyIndex < integerIndex ? 'start' : 'end',
    };
  } catch {
    return { symbol: code, position: 'end' };
  }
}

/**
 * Legacy helper:
 * returns the currency symbol for the region of the given locale.
 */
export function getCurrencyForCountryCode(
  locale: string,
  currencyDisplay: CurrencyDisplay = 'symbol'
): string {
  return getCurrencyInfo(locale, undefined, currencyDisplay)?.symbol ?? '';
}
