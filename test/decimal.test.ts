import {
  addDecimal,
  compareDecimal,
  interpretPastedNumber,
  normalizeDecimal,
  numberToDecimal,
  parseDecimal,
  roundDecimal,
} from '../src';

describe('decimal strings', () => {
  it('normalizes', () => {
    expect(normalizeDecimal('007.500')).toBe('7.5');
    expect(normalizeDecimal('-0.0')).toBe('0');
    expect(normalizeDecimal('.5')).toBe('0.5');
    expect(normalizeDecimal('abc')).toBeNull();
    expect(normalizeDecimal('')).toBeNull();
  });

  it('converts numbers exactly, including exponents', () => {
    expect(numberToDecimal(0.1)).toBe('0.1');
    expect(numberToDecimal(1e21)).toBe('1000000000000000000000');
    expect(numberToDecimal(1.5e-7)).toBe('0.00000015');
    expect(numberToDecimal(-2.5e30)).toBe('-2500000000000000000000000000000');
    expect(numberToDecimal(NaN)).toBeNull();
  });

  it('adds and compares without float errors', () => {
    expect(addDecimal('0.1', '0.2')).toBe('0.3');
    expect(addDecimal('12345678901234567.89', '0.01')).toBe('12345678901234567.9');
    expect(addDecimal('-1.5', '1.5')).toBe('0');
    expect(compareDecimal('10', '9.99')).toBe(1);
    expect(compareDecimal('-1', '-1.0')).toBe(0);
  });

  it('parses big amounts exactly', () => {
    expect(parseDecimal('12 345 678 901 234 567,89', 'fr-FR')).toBe('12345678901234567.89');
  });

  it.each([
    ['halfExpand', '2.345', '2.35', '-2.345', '-2.35'],
    ['halfEven', '2.345', '2.34', '2.355', '2.36'],
    ['halfCeil', '2.345', '2.35', '-2.345', '-2.34'],
    ['halfFloor', '2.345', '2.34', '-2.345', '-2.35'],
    ['halfTrunc', '2.345', '2.34', '-2.345', '-2.34'],
    ['trunc', '2.349', '2.34', '-2.349', '-2.34'],
    ['expand', '2.341', '2.35', '-2.341', '-2.35'],
    ['ceil', '2.341', '2.35', '-2.349', '-2.34'],
    ['floor', '2.349', '2.34', '-2.341', '-2.35'],
  ] as const)('rounds with %s', (mode, a, ra, b, rb) => {
    expect(roundDecimal(a, 2, mode)).toBe(ra);
    expect(roundDecimal(b, 2, mode)).toBe(rb);
  });

  it('rounds exact ties of big numbers', () => {
    expect(roundDecimal('12345678901234567.885', 2, 'halfEven')).toBe('12345678901234567.88');
    expect(roundDecimal('0.5', 0, 'halfEven')).toBe('0');
    expect(roundDecimal('1.5', 0, 'halfEven')).toBe('2');
    expect(roundDecimal('1.2', 5)).toBe('1.2');
  });
});

describe('interpretPastedNumber', () => {
  const EN = { decimal: '.', group: ',' };
  const FR = { decimal: ',', group: ' ' };
  const DE = { decimal: ',', group: '.' };

  it('uses the last separator as decimal when both are present', () => {
    expect(interpretPastedNumber('1.234.567,89', EN)).toMatchObject({ value: '1234567.89', ambiguous: false });
    expect(interpretPastedNumber('1,234,567.89', FR)).toMatchObject({ value: '1234567.89', ambiguous: false });
  });

  it('treats a repeated separator as grouping', () => {
    expect(interpretPastedNumber('1,234,567', FR).value).toBe('1234567');
    expect(interpretPastedNumber('1.234.567', EN).value).toBe('1234567');
  });

  it('flags "1,234" / "1.234" as ambiguous and lets the locale decide', () => {
    expect(interpretPastedNumber('1,234', EN)).toMatchObject({ value: '1234', ambiguous: true });
    expect(interpretPastedNumber('1,234', FR)).toMatchObject({ value: '1.234', ambiguous: true });
    expect(interpretPastedNumber('1.234', DE)).toMatchObject({ value: '1234', ambiguous: true });
    expect(interpretPastedNumber('0,123', EN)).toMatchObject({ value: '0.123', ambiguous: false });
    expect(interpretPastedNumber('1,23', EN)).toMatchObject({ value: '1.23', ambiguous: false });
  });

  it('handles currency, spaces, apostrophes, negatives and accounting', () => {
    expect(interpretPastedNumber('1 234,50 €', FR).value).toBe('1234.5');
    expect(interpretPastedNumber("CHF 1'234.50", EN).value).toBe('1234.5');
    expect(interpretPastedNumber('-12.50', EN)).toMatchObject({ value: '-12.5', negative: true });
    expect(interpretPastedNumber('(1,234.50)', EN)).toMatchObject({ value: '-1234.5', negative: true });
    expect(interpretPastedNumber('abc', EN).value).toBeNull();
  });
});
