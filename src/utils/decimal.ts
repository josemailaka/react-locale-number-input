/**
 * Exact decimal arithmetic on canonical decimal strings ("-1234.5", "0.07"),
 * based on BigInt. Used for amounts, where binary floats are not acceptable.
 *
 * Canonical form: optional "-", integer part without useless leading zeros,
 * optional "." + fraction without trailing zeros, never "-0".
 */

export type RoundingMode =
  | 'halfExpand' // 2.5 -> 3, -2.5 -> -3 (commercial rounding)
  | 'halfEven' // 2.5 -> 2, 3.5 -> 4 (banker's rounding)
  | 'halfCeil' // 2.5 -> 3, -2.5 -> -2 (Math.round, the default)
  | 'halfFloor' // 2.5 -> 2, -2.5 -> -3
  | 'halfTrunc' // 2.5 -> 2, -2.5 -> -2
  | 'trunc' // towards zero
  | 'expand' // away from zero
  | 'ceil' // towards +infinity
  | 'floor'; // towards -infinity

const DECIMAL = /^(-)?(\d*)(?:\.(\d*))?$/;

/** Returns the canonical form of a plain decimal string, `null` if it is not one. */
export function normalizeDecimal(text: string): string | null {
  const match = DECIMAL.exec(text.trim());
  if (!match) {
    return null;
  }
  const [, sign, intDigits = '', fracDigits = ''] = match;
  if (!intDigits && !fracDigits) {
    return null;
  }
  const int = intDigits.replace(/^0+(?=\d)/, '') || '0';
  const frac = fracDigits.replace(/0+$/, '');
  const result = frac ? `${int}.${frac}` : int;
  return sign && result !== '0' ? `-${result}` : result;
}

/** Exact decimal representation of a JS number (handles exponents: 1e21, 1e-7). */
export function numberToDecimal(value: number): string | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  const str = String(value);
  if (!/e/i.test(str)) {
    return normalizeDecimal(str);
  }
  const [mantissa, exponentText] = str.toLowerCase().split('e');
  const exponent = Number(exponentText);
  const negative = mantissa.startsWith('-');
  const [intPart, fracPart = ''] = (negative ? mantissa.slice(1) : mantissa).split('.');
  const digits = intPart + fracPart;
  const point = intPart.length + exponent;
  let result: string;
  if (point <= 0) {
    result = `0.${'0'.repeat(-point)}${digits}`;
  } else if (point >= digits.length) {
    result = digits + '0'.repeat(point - digits.length);
  } else {
    result = `${digits.slice(0, point)}.${digits.slice(point)}`;
  }
  return normalizeDecimal((negative ? '-' : '') + result);
}

interface Parts {
  negative: boolean;
  int: string;
  frac: string;
}

function split(decimal: string): Parts {
  const negative = decimal.startsWith('-');
  const [int, frac = ''] = (negative ? decimal.slice(1) : decimal).split('.');
  return { negative, int: int || '0', frac };
}

function scaleOf(decimal: string): number {
  return split(decimal).frac.length;
}

function toUnits(decimal: string, scale: number): bigint {
  const { negative, int, frac } = split(decimal);
  const units = BigInt(int + frac.padEnd(scale, '0'));
  return negative ? -units : units;
}

function fromUnits(units: bigint, scale: number): string {
  const negative = units < BigInt(0);
  const digits = (negative ? -units : units).toString().padStart(scale + 1, '0');
  const int = digits.slice(0, digits.length - scale);
  const frac = scale ? `.${digits.slice(digits.length - scale)}` : '';
  return normalizeDecimal((negative ? '-' : '') + int + frac) as string;
}

/** -1, 0 or 1 */
export function compareDecimal(a: string, b: string): number {
  const scale = Math.max(scaleOf(a), scaleOf(b));
  const ua = toUnits(a, scale);
  const ub = toUnits(b, scale);
  return ua < ub ? -1 : ua > ub ? 1 : 0;
}

export function addDecimal(a: string, b: string): string {
  const scale = Math.max(scaleOf(a), scaleOf(b));
  return fromUnits(toUnits(a, scale) + toUnits(b, scale), scale);
}

export function negateDecimal(a: string): string {
  return a.startsWith('-') ? a.slice(1) : a === '0' ? a : `-${a}`;
}

/** Rounds to `decimals` fraction digits with the given rounding mode. */
export function roundDecimal(
  decimal: string,
  decimals: number,
  mode: RoundingMode = 'halfCeil'
): string {
  const { negative, int, frac } = split(decimal);
  const d = Math.max(0, Math.floor(decimals));
  if (frac.length <= d) {
    return decimal;
  }
  const kept = BigInt(int + frac.slice(0, d));
  const rest = frac.slice(d);

  if (!/[1-9]/.test(rest)) {
    return fromUnits(negative ? -kept : kept, d);
  }
  // position of the dropped part relatively to the half: -1 below, 0 tie, 1 above
  const half =
    rest[0] > '5' || (rest[0] === '5' && /[1-9]/.test(rest.slice(1)))
      ? 1
      : rest[0] === '5'
        ? 0
        : -1;
  const odd = kept % BigInt(2) === BigInt(1);

  let awayFromZero: boolean;
  switch (mode) {
    case 'trunc':
      awayFromZero = false;
      break;
    case 'expand':
      awayFromZero = true;
      break;
    case 'ceil':
      awayFromZero = !negative;
      break;
    case 'floor':
      awayFromZero = negative;
      break;
    case 'halfExpand':
      awayFromZero = half >= 0;
      break;
    case 'halfTrunc':
      awayFromZero = half > 0;
      break;
    case 'halfFloor':
      awayFromZero = half > 0 || (half === 0 && negative);
      break;
    case 'halfEven':
      awayFromZero = half > 0 || (half === 0 && odd);
      break;
    case 'halfCeil':
    default:
      awayFromZero = half > 0 || (half === 0 && !negative);
      break;
  }

  const units = awayFromZero ? kept + BigInt(1) : kept;
  return fromUnits(negative ? -units : units, d);
}
