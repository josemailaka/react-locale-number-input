export { NumberInput, NumberInput as default } from './NumberInput';

export type {
  IconRenderer,
  IconRenderProps,
  NumberInputFormat,
  NumberInputProps,
  NumericLike,
  SpinDirection,
  StepConfig,
  StepFn,
  StepFnInfo,
} from './types';

export {
  addExact,
  countDecimals,
  formatNumber,
  groupIntegerDigits,
  groupNumberText,
  parseNumber,
  roundTo,
  sanitizeNumberText,
} from './utils/number';
export type {
  FormatNumberOptions,
  GroupTextOptions,
  SanitizeOptions,
  SanitizeResult,
} from './utils/number';

export {
  getDecimalDelimiter,
  getDigitGroupDelimiter,
  getSeparators,
} from './utils/locale';
export type { LocaleSeparators } from './utils/locale';

export {
  getCurrencyCodeForLocale,
  getCurrencyForCountryCode,
  getCurrencyInfo,
} from './utils/currency';
export type { CurrencyDisplay, CurrencyInfo } from './utils/currency';
