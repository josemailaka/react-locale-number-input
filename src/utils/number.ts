import { getNumberFormat, getSeparators } from './locale';

export interface FormatNumberOptions {
  locale?: string;
  /** Fixed number of fraction digits (0 - 20). */
  precision?: number;
  /** Use digit grouping (thousands separators). Defaults to `true`. */
  useGrouping?: boolean;
}

/** Number of fraction digits needed to represent `value` exactly. */
export function countDecimals(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const str = String(value);
  const exponentMatch = /e([+-]\d+)$/i.exec(str);
  if (exponentMatch) {
    const [mantissa] = str.split(/e/i);
    const mantissaDecimals = (mantissa.split('.')[1] || '').length;
    return Math.max(0, mantissaDecimals - Number(exponentMatch[1]));
  }
  return (str.split('.')[1] || '').length;
}

/** Rounds `value` to `decimals` fraction digits, without binary float artefacts. */
export function roundTo(value: number, decimals: number): number {
  const d = clampInt(decimals, 0, 20);
  const rounded = Number(`${Math.round(Number(`${value}e${d}`))}e-${d}`);
  return Number.isFinite(rounded) ? rounded : Number(value.toFixed(d));
}

/** Adds two numbers keeping only the decimals that matter (0.1 + 0.2 === 0.3). */
export function addExact(a: number, b: number): number {
  const decimals = Math.min(20, Math.max(countDecimals(a), countDecimals(b)));
  return roundTo(a + b, decimals);
}

export function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Formats a number for the given locale. Always produces latin digits and an
 * ASCII minus sign so the output can be parsed back with `parseNumber`.
 */
export function formatNumber(
  value: number,
  { locale, precision, useGrouping = true }: FormatNumberOptions = {}
): string {
  const fixed = precision == null ? undefined : clampInt(precision, 0, 20);
  return getNumberFormat(locale, {
    useGrouping,
    minimumFractionDigits: fixed ?? 0,
    maximumFractionDigits: fixed ?? 20,
  })
    .format(value)
    .replace(/−/g, '-')
    // bidi control marks added by some locales (ar, he, fa...)
    .replace(/[؜‎‏]/g, '');
}

export interface SanitizeOptions {
  decimalDelimiter: string;
  groupDelimiter: string;
  allowNegative?: boolean;
  allowFloat?: boolean;
  precision?: number;
}

export interface SanitizeResult {
  /** Cleaned text, ready to be displayed in the input. */
  text: string;
  /** Parsed numeric value, `null` when the text holds no digit. */
  value: number | null;
  /** Caret position in `text` matching the caret position in the raw text. */
  caret: number;
}

const DIGIT = /[0-9]/;

/**
 * Cleans what the user typed/pasted:
 *  - keeps digits, one decimal delimiter (if floats are allowed) and a leading minus
 *  - removes digit group delimiters, currency symbols, spaces, letters...
 *  - limits the decimals to `precision`
 *  - removes useless leading zeros
 * It also maps the caret so editing in the middle of the text feels natural.
 */
export function sanitizeNumberText(
  raw: string,
  options: SanitizeOptions,
  caret: number = raw.length
): SanitizeResult {
  const {
    decimalDelimiter,
    groupDelimiter,
    allowNegative = true,
    allowFloat = true,
    precision,
  } = options;
  const source = raw.replace(/−/g, '-');

  // "." is accepted as decimal delimiter for locales where it is not used for grouping
  let dec = decimalDelimiter;
  if (
    source.indexOf(dec) === -1 &&
    dec !== '.' &&
    groupDelimiter !== '.' &&
    source.indexOf('.') !== -1
  ) {
    dec = '.';
  }

  const firstDigit = source.search(DIGIT);
  const minusIndex = source.indexOf('-');
  const negative =
    allowNegative &&
    minusIndex !== -1 &&
    (firstDigit === -1 || minusIndex < firstDigit);
  const canHaveDecimals = allowFloat && precision !== 0;

  let intDigits = '';
  let fracDigits = '';
  let hasDecimal = false;
  let caretOut = 0;
  let caretIntDigits = 0;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    let kept = false;

    if (DIGIT.test(ch)) {
      if (!hasDecimal) {
        intDigits += ch;
        kept = true;
        if (i < caret) caretIntDigits++;
      } else if (precision == null || fracDigits.length < precision) {
        fracDigits += ch;
        kept = true;
      }
    } else if (ch === dec && canHaveDecimals && !hasDecimal) {
      hasDecimal = true;
      kept = true;
    } else if (ch === '-' && negative && i === minusIndex) {
      kept = true;
    }

    if (kept && i < caret) {
      caretOut++;
    }
  }

  const strippedInt = intDigits.replace(/^0+(?=\d)/, '');
  const removedZeros = intDigits.length - strippedInt.length;
  caretOut -= Math.min(removedZeros, caretIntDigits);

  const text =
    (negative ? '-' : '') +
    strippedInt +
    (hasDecimal ? decimalDelimiter + fracDigits : '');

  let value: number | null = null;
  if (strippedInt !== '' || fracDigits !== '') {
    value = Number(
      `${negative ? '-' : ''}${strippedInt || '0'}.${fracDigits || '0'}`
    );
    if (value === 0) {
      value = 0; // avoid -0
    }
  }

  return { text, value, caret: Math.max(0, Math.min(caretOut, text.length)) };
}

/**
 * Parses a (possibly formatted) number string for the given locale.
 *
 *   parseNumber('1,234.5', 'en-US')  // 1234.5
 *   parseNumber('1.234,5', 'de-DE')  // 1234.5
 *   parseNumber('1 234,5 €', 'fr-FR') // 1234.5
 *
 * Returns `null` when the string holds no digit.
 */
export function parseNumber(text: string, locale?: string): number | null {
  const { decimal, group } = getSeparators(locale);
  return sanitizeNumberText(String(text ?? ''), {
    decimalDelimiter: decimal,
    groupDelimiter: group,
  }).value;
}
