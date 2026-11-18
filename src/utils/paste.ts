import { normalizeDecimal } from './decimal';

export interface PasteInterpretation {
  /** Exact decimal value ("-1234.5"), `null` when the text holds no digit. */
  value: string | null;
  /**
   * The pasted digits as written, with "." as decimal separator and no
   * grouping ("0007", "10.50"): what is inserted in the field.
   */
  digits: string;
  /**
   * `true` when the text could mean two different amounts, e.g. "1,234"
   * (1234 in English, 1.234 in French) or "1.234".
   */
  ambiguous: boolean;
  /** The text is negative: "-12", "−12" or accounting "(12)". */
  negative: boolean;
}

const MARKS = /[.,٫]/; // ".", "," and the arabic decimal separator

/**
 * Interprets a pasted text whatever its origin (spreadsheet, bank statement,
 * another locale...):
 *  - spaces, apostrophes, currency symbols and letters are ignored
 *  - when "." and "," are both present, the last one is the decimal separator
 *  - a separator used several times is a group separator ("1,234,567")
 *  - a single separator followed by exactly 3 digits is ambiguous ("1,234"):
 *    the locale decides, and `ambiguous` is set
 */
export function interpretPastedNumber(
  text: string,
  separators: { decimal: string; group: string }
): PasteInterpretation {
  const source = String(text ?? '').replace(/−/g, '-').trim();
  const firstDigit = source.search(/\d/);
  if (firstDigit === -1) {
    return { value: null, digits: '', ambiguous: false, negative: false };
  }
  const beforeDigits = source.slice(0, firstDigit);
  const negative = beforeDigits.includes('-') || (beforeDigits.includes('(') && source.includes(')'));

  // keep only digits and the possible decimal marks
  const core = source
    .slice(firstDigit)
    .split('')
    .filter(ch => /\d/.test(ch) || MARKS.test(ch) || ch === separators.decimal)
    .join('')
    .replace(/[.,٫]+$/, ''); // trailing marks ("12." / "12,")

  const marks = core.split('').filter(ch => !/\d/.test(ch));
  let decimalMark: string | null = null;
  let ambiguous = false;

  if (marks.length > 0) {
    const kinds = new Set(marks);
    const last = marks[marks.length - 1];
    if (kinds.size > 1) {
      decimalMark = last;
    } else if (marks.length === 1) {
      const [intPart, fracPart] = core.split(last);
      const looksGrouped = fracPart.length === 3 && intPart.length <= 3 && intPart !== '0';
      if (!looksGrouped) {
        decimalMark = last;
      } else {
        ambiguous = true;
        // same rule as typing: the locale decimal is a decimal, the locale
        // group is a group, "." is a decimal when the locale does not group with it
        decimalMark =
          last === separators.decimal
            ? last
            : last === separators.group
              ? null
              : last === '.' && separators.group !== '.'
                ? last
                : null;
      }
    }
    // several times the same mark: group separator
  }

  let intDigits = core;
  let fracDigits = '';
  if (decimalMark) {
    const index = core.lastIndexOf(decimalMark);
    intDigits = core.slice(0, index);
    fracDigits = core.slice(index + 1);
  }
  intDigits = intDigits.replace(/\D/g, '');
  fracDigits = fracDigits.replace(/\D/g, '');

  return {
    value: normalizeDecimal(`${negative ? '-' : ''}${intDigits || '0'}.${fracDigits || '0'}`),
    digits: `${negative ? '-' : ''}${intDigits}${decimalMark ? `.${fracDigits}` : ''}`,
    ambiguous,
    negative,
  };
}
