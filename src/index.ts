export { NumberInput, NumberInput as default } from './NumberInput';
export { useNumberInput } from './useNumberInput';
export type {
  ClearButtonProps,
  NumberInputElementProps,
  SpinButtonProps,
  UseNumberInputResult,
} from './useNumberInput';

export type {
  IconRenderer,
  IconRenderProps,
  NumberInputFormat,
  NumberInputHandle,
  NumberInputProps,
  UseNumberInputProps,
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
