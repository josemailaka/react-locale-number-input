/**
 * Locale helpers built on top of the standard `Intl` API.
 */

export interface LocaleSeparators {
  /** Decimal delimiter, e.g. "." for en-US, "," for fr-FR */
  decimal: string;
  /** Digit group delimiter, e.g. "," for en-US, "." for de-DE, U+202F for fr-FR */
  group: string;
}

const separatorsCache = new Map<string, LocaleSeparators>();
const formatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Returns a valid BCP 47 locale tag, or `undefined` (= runtime default)
 * when no locale is given or when the given one is invalid.
 */
export function normalizeLocale(locale?: string | null): string | undefined {
  if (!locale) {
    if (typeof navigator !== 'undefined' && navigator.language) {
      locale = navigator.language;
    } else {
      return undefined;
    }
  }
  try {
    return Intl.getCanonicalLocales(locale)[0];
  } catch {
    return undefined;
  }
}

/**
 * Cached `Intl.NumberFormat` factory. Always uses latin digits so that the
 * produced text can be edited and parsed back.
 */
export function getNumberFormat(
  locale: string | undefined,
  options: Intl.NumberFormatOptions
): Intl.NumberFormat {
  const key = `${locale ?? ''}|${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    const fullOptions = { numberingSystem: 'latn', ...options } as Intl.NumberFormatOptions;
    try {
      formatter = new Intl.NumberFormat(locale, fullOptions);
    } catch {
      formatter = new Intl.NumberFormat(undefined, fullOptions);
    }
    formatterCache.set(key, formatter);
  }
  return formatter;
}

export function getSeparators(locale?: string): LocaleSeparators {
  const key = locale ?? '';
  let separators = separatorsCache.get(key);
  if (!separators) {
    const parts = getNumberFormat(locale, { useGrouping: true }).formatToParts(
      -1234567.5
    );
    separators = {
      decimal: parts.find(p => p.type === 'decimal')?.value || '.',
      group: parts.find(p => p.type === 'group')?.value || ',',
    };
    separatorsCache.set(key, separators);
  }
  return separators;
}

/** Decimal delimiter for the given locale ("." / ","...). */
export function getDecimalDelimiter(locale?: string): string {
  return getSeparators(locale).decimal;
}

/** Digit group delimiter for the given locale ("," / "." / " "...). */
export function getDigitGroupDelimiter(locale?: string): string {
  return getSeparators(locale).group;
}
