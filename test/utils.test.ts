import {
  addExact,
  countDecimals,
  formatNumber,
  getCurrencyCodeForLocale,
  getCurrencyForCountryCode,
  getCurrencyInfo,
  getDecimalDelimiter,
  getDigitGroupDelimiter,
  groupIntegerDigits,
  groupNumberText,
  parseNumber,
  roundTo,
  sanitizeNumberText,
} from '../src';

const EN = { decimalDelimiter: '.', groupDelimiter: ',' };
const FR = { decimalDelimiter: ',', groupDelimiter: ' ' };
const DE = { decimalDelimiter: ',', groupDelimiter: '.' };

describe('getDecimalDelimiter / getDigitGroupDelimiter', () => {
  it('works without locale', () => {
    expect(getDecimalDelimiter()).toBeTruthy();
    expect(getDigitGroupDelimiter()).toBeTruthy();
  });

  it('en-GB', () => {
    expect(getDecimalDelimiter('en-GB')).toBe('.');
    expect(getDigitGroupDelimiter('en-GB')).toBe(',');
  });

  // these two were disabled (xit) in the original code base
  it('ro-RO', () => {
    expect(getDecimalDelimiter('ro-RO')).toBe(',');
    expect(getDigitGroupDelimiter('ro-RO')).toBe('.');
  });

  it('fr-FR uses a narrow no-break space for grouping', () => {
    expect(getDecimalDelimiter('fr-FR')).toBe(',');
    expect(getDigitGroupDelimiter('fr-FR')).toBe(' ');
  });
});

describe('parseNumber', () => {
  it('parses plain numbers', () => {
    expect(parseNumber('1000')).toBe(1000);
    expect(parseNumber('-12.5', 'en-US')).toBe(-12.5);
  });

  it('returns null without digits', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('x')).toBeNull();
    expect(parseNumber('-')).toBeNull();
  });

  it('handles group and decimal delimiters per locale', () => {
    expect(parseNumber('1,234.56', 'en-US')).toBe(1234.56);
    expect(parseNumber('1.234,56', 'de-DE')).toBe(1234.56);
    expect(parseNumber('1 234,56 €', 'fr-FR')).toBe(1234.56);
    expect(parseNumber('1234.56', 'fr-FR')).toBe(1234.56);
    expect(parseNumber('1,0,0,,,005.05', 'en-US')).toBe(100005.05);
  });
});

describe('sanitizeNumberText', () => {
  it('removes letters and keeps a single decimal delimiter', () => {
    expect(sanitizeNumberText('1a2b.3.4', EN)).toMatchObject({ text: '12.34', value: 12.34 });
  });

  it('keeps intermediate texts', () => {
    expect(sanitizeNumberText('-', EN)).toMatchObject({ text: '-', value: null });
    expect(sanitizeNumberText('.', EN)).toMatchObject({ text: '.', value: null });
    expect(sanitizeNumberText('-.', EN)).toMatchObject({ text: '-.', value: null });
    expect(sanitizeNumberText('1000.', EN)).toMatchObject({ text: '1000.', value: 1000 });
    expect(sanitizeNumberText('.03', EN)).toMatchObject({ text: '.03', value: 0.03 });
    expect(sanitizeNumberText('-.1', EN)).toMatchObject({ text: '-.1', value: -0.1 });
  });

  it('converts "." to the locale delimiter when "." is not used for grouping', () => {
    expect(sanitizeNumberText('12.5', FR)).toMatchObject({ text: '12,5', value: 12.5 });
    expect(sanitizeNumberText('1.234,5', DE)).toMatchObject({ text: '1234,5', value: 1234.5 });
  });

  it('applies allowNegative / allowFloat / precision', () => {
    expect(sanitizeNumberText('-5', { ...EN, allowNegative: false }).value).toBe(5);
    expect(sanitizeNumberText('5.5', { ...EN, allowFloat: false })).toMatchObject({ text: '55', value: 55 });
    expect(sanitizeNumberText('1.23456', { ...EN, precision: 2 })).toMatchObject({ text: '1.23', value: 1.23 });
    expect(sanitizeNumberText('1.5', { ...EN, precision: 0 }).text).toBe('15');
  });

  it('removes useless leading zeros and maps the caret', () => {
    expect(sanitizeNumberText('05', EN, 2)).toEqual({ text: '5', value: 5, caret: 1 });
    expect(sanitizeNumberText('0.5', EN).text).toBe('0.5');
    expect(sanitizeNumberText('1x23', EN, 2)).toEqual({ text: '123', value: 123, caret: 1 });
  });

  it('never returns -0', () => {
    expect(Object.is(sanitizeNumberText('-0', EN).value, 0)).toBe(true);
  });
});

describe('formatNumber', () => {
  it('formats with grouping', () => {
    expect(formatNumber(1234.5, { locale: 'en-US' })).toBe('1,234.5');
    expect(formatNumber(1234.5, { locale: 'de-DE' })).toBe('1.234,5');
  });

  it('pads with precision', () => {
    expect(formatNumber(1000, { locale: 'en-US', precision: 2 })).toBe('1,000.00');
    expect(formatNumber(1000.0032, { locale: 'en-US', precision: 6 })).toBe('1,000.003200');
    expect(formatNumber(1000.0002, { locale: 'en-US', precision: 3 })).toBe('1,000.000');
  });

  it('can disable grouping and always uses latin digits / ascii minus', () => {
    expect(formatNumber(-1234.5, { locale: 'ar-EG', useGrouping: false })).toMatch(/^-1234.5$/);
    expect(formatNumber(-5, { locale: 'sv-SE' })).toBe('-5');
  });
});

describe('grouping', () => {
  it('groups integer digits per locale', () => {
    expect(groupIntegerDigits('1234567', 'en-US')).toBe('1,234,567');
    expect(groupIntegerDigits('1234567', 'en-IN')).toBe('12,34,567');
    expect(groupIntegerDigits('1234', 'es-ES')).toBe('1234'); // es groups from 5 digits
    expect(groupIntegerDigits('12345678901234567890', 'en-US')).toBe('12,345,678,901,234,567,890');
    expect(groupIntegerDigits('', 'en-US')).toBe('');
  });

  it('groups a text and maps the caret', () => {
    const opts = { decimalDelimiter: '.', locale: 'en-US' };
    expect(groupNumberText('-1234.5', opts)).toEqual({ text: '-1,234.5', caret: 8 });
    expect(groupNumberText('1234', opts, 1)).toEqual({ text: '1,234', caret: 1 });
    expect(groupNumberText('1234', opts, 2)).toEqual({ text: '1,234', caret: 3 });
    expect(groupNumberText('-', opts, 1)).toEqual({ text: '-', caret: 1 });
  });
});

describe('number helpers', () => {
  it('countDecimals', () => {
    expect(countDecimals(1)).toBe(0);
    expect(countDecimals(1.25)).toBe(2);
    expect(countDecimals(1e-7)).toBe(7);
  });

  it('roundTo / addExact avoid float artefacts', () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(addExact(0.1, 0.2)).toBe(0.3);
    expect(addExact(1.1, -0.1)).toBe(1);
  });
});

describe('currency', () => {
  it('finds the currency of the locale region, even without region', () => {
    expect(getCurrencyCodeForLocale('fr-FR')).toBe('EUR');
    expect(getCurrencyCodeForLocale('fr')).toBe('EUR');
    expect(getCurrencyCodeForLocale('en-US')).toBe('USD');
    expect(getCurrencyCodeForLocale('de-CH')).toBe('CHF');
    // regions that were missing in the original data
    expect(getCurrencyCodeForLocale('ko-KR')).toBe('KRW');
    expect(getCurrencyCodeForLocale('ru-RU')).toBe('RUB');
  });

  it('returns symbol and position', () => {
    expect(getCurrencyInfo('en-US')).toEqual({ symbol: '$', position: 'start' });
    expect(getCurrencyInfo('fr-FR')).toEqual({ symbol: '€', position: 'end' });
    expect(getCurrencyInfo('en-US', 'EUR')).toEqual({ symbol: '€', position: 'start' });
    expect(getCurrencyInfo('en-US', 'EUR', 'code')?.symbol).toBe('EUR');
  });

  it('keeps the legacy helper', () => {
    expect(getCurrencyForCountryCode('en-GB')).toBe('£');
  });
});
