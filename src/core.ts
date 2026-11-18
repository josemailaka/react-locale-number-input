/**
 * Pure logic shared by `useNumberInput` and `NumberInput`.
 *
 * Values are handled as exact canonical decimal strings ("-1234.5"), so that
 * amounts never go through binary floats. JS numbers are only produced at the
 * edges (`onChange`, `getValue()`, `stepFn`).
 */
import type {
  NumberInputError,
  NumberInputProps,
  NumericLike,
  SpinDirection,
  StepConfig,
} from './types';
import { getSeparators, normalizeLocale } from './utils/locale';
import { formatNumber, parseDecimal, sanitizeNumberText } from './utils/number';
import { getCurrencyInfo } from './utils/currency';
import type { CurrencyInfo } from './utils/currency';
import {
  addDecimal,
  compareDecimal,
  negateDecimal,
  normalizeDecimal,
  numberToDecimal,
  roundDecimal,
} from './utils/decimal';

export const DEFAULTS = {
  rootClassName: 'locale-number-input',
  spinOnArrowKeys: true,
  numbersOnly: true,
  step: 1,
  shiftStep: 10,
  requireFocusOnStep: true,
  stepOnWheel: true,
  allowNegative: true,
  allowFloat: true,
  allowEmpty: true,
  triggerChangeOnSpin: true,
  triggerChangeOnSpinDelay: 80,
  stepDelay: 60,
  spinStartDelay: 300,
  prefix: '',
  suffix: '',
  theme: 'default-light',
  format: 'number',
  currencyDisplay: 'symbol',
  currencySign: 'standard',
  enableSpinnerTools: true,
  enableClearButton: true,
  acceptClearToolFocus: false,
  toolPosition: 'end',
  arrowSize: 10,
  clearButtonSize: 10,
  clearButtonLabel: 'Clear value',
  selectAllOnFocus: false,
  groupWhileEditing: true,
  roundingMode: 'halfCeil',
  clampBehavior: 'clamp',
  pasteMode: 'lenient',
  required: false,
} as const satisfies Partial<NumberInputProps>;

/** Defaults applied by the `preset` prop (explicit props still win). */
export const PRESETS = {
  amount: {
    enableSpinnerTools: false,
    stepOnWheel: false,
    spinOnArrowKeys: false,
    allowNegative: false,
    precision: 'auto',
    clampBehavior: 'validate',
    roundingMode: 'halfExpand',
    pasteMode: 'strict',
  },
} as const satisfies Record<string, Partial<NumberInputProps>>;

export type ResolvedProps = Omit<NumberInputProps, keyof typeof DEFAULTS> &
  Required<Pick<NumberInputProps, keyof typeof DEFAULTS>> & {
    /** Validated locale (`undefined` = runtime default) */
    resolvedLocale: string | undefined;
    /** `precision` with "auto" resolved */
    resolvedPrecision: number | undefined;
    /** Currency information when `format="currency"` */
    currencyInfo: CurrencyInfo | undefined;
  };

export interface NumberInputState {
  /** Value of an uncontrolled input (canonical decimal string) */
  value: string | null;
  /** Text being edited, `null` when the displayed text derives from the value */
  draft: string | null;
  focused: boolean;
  /** The field lost the focus at least once */
  touched: boolean;
  spinDirection: SpinDirection | null;
  /** Value displayed while a spinner arrow is held */
  spinValue: string | null | undefined;
}

/** Converts a value prop (number or string) to a canonical decimal string. */
export function toDecimal(value: NumericLike | undefined, locale?: string): string | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return numberToDecimal(value);
  }
  return normalizeDecimal(value) ?? parseDecimal(value, locale);
}

export const decimalToNumber = (value: string | null): number | null => {
  if (value == null) {
    return null;
  }
  const result = Number(value);
  return result === 0 ? 0 : result;
};

/** Merges the defaults, the preset and the given props (`undefined` props are ignored). */
export function resolveProps(props: NumberInputProps): ResolvedProps {
  const resolved: Record<string, unknown> = {
    ...DEFAULTS,
    ...(props.preset ? PRESETS[props.preset] : undefined),
  };
  for (const key of Object.keys(props) as Array<keyof NumberInputProps>) {
    if (props[key] !== undefined) {
      resolved[key] = props[key];
    }
  }
  const locale = normalizeLocale(props.locale);
  const currencyInfo =
    resolved.format === 'currency'
      ? getCurrencyInfo(
          locale,
          props.currency,
          resolved.currencyDisplay as NonNullable<NumberInputProps['currencyDisplay']>
        )
      : undefined;
  const precision = resolved.precision as NumberInputProps['precision'];

  resolved.resolvedLocale = locale;
  resolved.currencyInfo = currencyInfo;
  resolved.resolvedPrecision =
    precision === 'auto'
      ? (currencyInfo?.digits ?? 2)
      : precision == null
        ? undefined
        : Math.min(20, Math.max(0, Math.floor(precision)));
  return resolved as ResolvedProps;
}

export const isControlled = (props: NumberInputProps) => props.value !== undefined;

/** Current committed value: `value` prop when controlled, state otherwise. */
export function getCurrentValue(
  props: NumberInputProps,
  state: NumberInputState,
  p: ResolvedProps
): string | null {
  return isControlled(props) ? toDecimal(props.value, p.resolvedLocale) : state.value;
}

export function getBounds(p: ResolvedProps) {
  let min = toDecimal(p.minValue ?? null, p.resolvedLocale);
  const max = toDecimal(p.maxValue ?? null, p.resolvedLocale);
  if (!p.allowNegative && (min == null || compareDecimal(min, '0') < 0)) {
    min = '0';
  }
  return { min, max };
}

/** Applies integer / precision rules and, when `clamp` is true, min / max. */
export function normalize(
  value: string | null,
  p: ResolvedProps,
  clamp = true
): string | null {
  if (value == null) {
    return null;
  }
  let result = value;
  if (!p.allowFloat) {
    result = roundDecimal(result, 0, p.roundingMode);
  }
  if (p.resolvedPrecision != null) {
    result = roundDecimal(result, p.resolvedPrecision, p.roundingMode);
  }
  if (clamp) {
    const { min, max } = getBounds(p);
    if (min != null && compareDecimal(result, min) < 0) {
      result = min;
    }
    if (max != null && compareDecimal(result, max) > 0) {
      result = max;
    }
  }
  return normalizeDecimal(result);
}

export function isOutOfRange(value: string, p: ResolvedProps): 'min' | 'max' | null {
  const { min, max } = getBounds(p);
  if (min != null && compareDecimal(value, min) < 0) {
    return 'min';
  }
  if (max != null && compareDecimal(value, max) > 0) {
    return 'max';
  }
  return null;
}

/** Validation error of a value. */
export function getError(value: string | null, p: ResolvedProps): NumberInputError | null {
  if (value == null) {
    const requiredValue =
      p.required || (p.clampBehavior === 'validate' && !p.allowEmpty);
    return requiredValue ? 'required' : null;
  }
  return isOutOfRange(value, p);
}

export function sanitize(raw: string, caret: number | undefined, p: ResolvedProps) {
  const { decimal, group } = getSeparators(p.resolvedLocale);
  return sanitizeNumberText(
    raw,
    {
      decimalDelimiter: decimal,
      groupDelimiter: group,
      allowNegative: p.allowNegative,
      allowFloat: p.allowFloat,
      precision: p.resolvedPrecision,
    },
    caret
  );
}

export function parseDraft(draft: string, p: ResolvedProps): string | null {
  return sanitize(draft, undefined, p).valueAsString;
}

/** Next value when stepping from `base`. */
export function computeStep(
  base: string | null,
  direction: SpinDirection,
  config: StepConfig,
  p: ResolvedProps
): string | null {
  const { min, max } = getBounds(p);
  const stepSize = config.step ?? (config.shiftKey ? p.shiftStep : p.step);

  let next: string | null;
  if (p.stepFn) {
    const result = p.stepFn(decimalToNumber(base), direction, {
      step: stepSize,
      shiftKey: !!config.shiftKey,
      min: decimalToNumber(min),
      max: decimalToNumber(max),
    });
    next = result == null ? null : numberToDecimal(result);
  } else if (base == null) {
    next =
      p.initialStep != null
        ? numberToDecimal(p.initialStep)
        : min != null && compareDecimal(min, '0') > 0
          ? min
          : max != null && compareDecimal(max, '0') < 0
            ? max
            : '0';
  } else {
    const delta = numberToDecimal(stepSize) ?? '0';
    next = addDecimal(base, direction === 1 ? delta : negateDecimal(delta));
  }
  return normalize(next, p);
}

export function getAffixes(p: ResolvedProps) {
  let { prefix, suffix } = p;

  if (p.format === 'currency') {
    const info = p.currencyInfo;
    const symbol = p.currencySymbol ?? info?.symbol;
    const position = p.currencyPosition ?? info?.position ?? 'end';
    if (symbol) {
      if (position === 'start' && !prefix) {
        prefix = symbol;
      } else if (position === 'end' && !suffix) {
        suffix = symbol;
      }
    }
  } else if (p.format === 'percentage' && !suffix) {
    suffix = '%';
  }

  return { prefix, suffix };
}

function roundForDisplay(value: string, p: ResolvedProps): string {
  return p.resolvedPrecision == null
    ? value
    : roundDecimal(value, p.resolvedPrecision, p.roundingMode);
}

/** Text shown when the field is not focused: grouping + prefix / suffix. */
export function formatDisplay(value: string, p: ResolvedProps): string {
  const { prefix, suffix } = getAffixes(p);
  const rounded = roundForDisplay(value, p);
  const negative = rounded.startsWith('-');

  if (negative && p.currencySign === 'accounting') {
    const text = formatNumber(negateDecimal(rounded), {
      locale: p.resolvedLocale,
      precision: p.resolvedPrecision,
    });
    return `(${[prefix, text, suffix].filter(Boolean).join(' ')})`;
  }

  const text = formatNumber(rounded, {
    locale: p.resolvedLocale,
    precision: p.resolvedPrecision,
  });
  return [prefix, text, suffix].filter(Boolean).join(' ');
}

/** Text shown while editing: no prefix / suffix, grouping if `groupWhileEditing`. */
export function formatEdit(value: string, p: ResolvedProps): string {
  return formatNumber(roundForDisplay(value, p), {
    locale: p.resolvedLocale,
    precision: p.resolvedPrecision,
    useGrouping: p.numbersOnly && p.groupWhileEditing,
  });
}
