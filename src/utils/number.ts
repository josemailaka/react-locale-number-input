import { getNumberFormat, getSeparators } from './locale';
import { normalizeDecimal } from './decimal';

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
 *
 * `value` may be a decimal string ("12345678901234567.89"): modern engines
 * format it exactly, without going through a binary float.
 */
export function formatNumber(
  value: number | string,
  { locale, precision, useGrouping = true }: FormatNumberOptions = {}
): string {
  const fixed = precision == null ? undefined : clampInt(precision, 0, 20);
  return getNumberFormat(locale, {
    useGrouping,
    minimumFractionDigits: fixed ?? 0,
    maximumFractionDigits: fixed ?? 20,
  })
    .format(value as number)
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
  /** Exact parsed value as a canonical decimal string ("-1234.5"). */
  valueAsString: string | null;
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
  let valueAsString: string | null = null;
  if (strippedInt !== '' || fracDigits !== '') {
    valueAsString = normalizeDecimal(
      `${negative ? '-' : ''}${strippedInt || '0'}.${fracDigits || '0'}`
    );
    value = Number(valueAsString);
    if (value === 0) {
      value = 0; // avoid -0
    }
  }

  return {
    text,
    value,
    valueAsString,
    caret: Math.max(0, Math.min(caretOut, text.length)),
  };
}

/**
 * Same as `parseNumber`, but returns the exact decimal string
 * ("12345678901234567.89") instead of a binary float.
 */
export function parseDecimal(text: string, locale?: string): string | null {
  const { decimal, group } = getSeparators(locale);
  return sanitizeNumberText(String(text ?? ''), {
    decimalDelimiter: decimal,
    groupDelimiter: group,
  }).valueAsString;
}

/**
 * Inserts the locale digit group delimiters in a string of digits:
 *   groupIntegerDigits('1234567', 'en-US') // "1,234,567"
 *   groupIntegerDigits('1234567', 'en-IN') // "12,34,567"
 */
export function groupIntegerDigits(digits: string, locale?: string): string {
  if (!digits) {
    return '';
  }
  try {
    // strings are formatted exactly by modern engines (Intl.NumberFormat v3)
    const grouped = getNumberFormat(locale, { useGrouping: true, maximumFractionDigits: 0 })
      .formatToParts(digits as unknown as number)
      .filter(part => part.type === 'integer' || part.type === 'group')
      .map(part => part.value)
      .join('');
    if (grouped.replace(/\D/g, '') === digits) {
      return grouped;
    }
  } catch {
    // fall back below
  }
  // older engines lose precision above 15 digits: group by 3
  const group = getSeparators(locale).group;
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, group);
}

export interface GroupTextOptions {
  decimalDelimiter: string;
  locale?: string;
}

/**
 * Adds digit group delimiters to a sanitized text ("-1234.5" -> "-1,234.5")
 * and moves the caret accordingly.
 */
export function groupNumberText(
  text: string,
  { decimalDelimiter, locale }: GroupTextOptions,
  caret: number = text.length
): { text: string; caret: number } {
  const sign = text.startsWith('-') ? '-' : '';
  const body = text.slice(sign.length);
  const decimalIndex = body.indexOf(decimalDelimiter);
  const intPart = decimalIndex === -1 ? body : body.slice(0, decimalIndex);
  const rest = decimalIndex === -1 ? '' : body.slice(decimalIndex);
  const grouped = groupIntegerDigits(intPart, locale);
  const out = sign + grouped + rest;

  // walk the output, skipping the inserted delimiters, until `caret`
  // characters of the original text have been passed
  const groupStart = sign.length;
  const groupEnd = sign.length + grouped.length;
  let remaining = caret;
  let position = 0;
  while (position < out.length && remaining > 0) {
    const inserted =
      position >= groupStart && position < groupEnd && !DIGIT.test(out[position]);
    if (!inserted) {
      remaining--;
    }
    position++;
  }
  return { text: out, caret: position };
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
