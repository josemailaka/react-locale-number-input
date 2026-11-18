/**
 * Pure logic shared by `useNumberInput` and `NumberInput`.
 */
import type {
  NumberInputProps,
  NumericLike,
  SpinDirection,
  StepConfig,
} from './types';
import { getSeparators, normalizeLocale } from './utils/locale';
import {
  addExact,
  formatNumber,
  parseNumber,
  roundTo,
  sanitizeNumberText,
} from './utils/number';
import { getCurrencyInfo } from './utils/currency';

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
  enableSpinnerTools: true,
  enableClearButton: true,
  acceptClearToolFocus: false,
  toolPosition: 'end',
  arrowSize: 10,
  clearButtonSize: 10,
  clearButtonLabel: 'Clear value',
  selectAllOnFocus: false,
  groupWhileEditing: true,
} as const satisfies Partial<NumberInputProps>;

export type ResolvedProps = Omit<NumberInputProps, keyof typeof DEFAULTS> &
  Required<Pick<NumberInputProps, keyof typeof DEFAULTS>> & {
    /** Validated locale (`undefined` = runtime default) */
    resolvedLocale: string | undefined;
  };

export interface NumberInputState {
  /** Value of an uncontrolled input */
  value: number | null;
  /** Text being edited, `null` when the displayed text derives from the value */
  draft: string | null;
  focused: boolean;
  spinDirection: SpinDirection | null;
  /** Value displayed while a spinner arrow is held */
  spinValue: number | null | undefined;
}

export const sameNumber = (a: number | null, b: number | null) =>
  a === b || (a !== null && b !== null && Number.isNaN(a) && Number.isNaN(b));

export function toNumber(value: NumericLike | undefined, locale?: string): number | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : parseNumber(value, locale);
}

/** Merges the defaults with the given props (`undefined` props are ignored). */
export function resolveProps(props: NumberInputProps): ResolvedProps {
  const resolved: Record<string, unknown> = { ...DEFAULTS };
  for (const key of Object.keys(props) as Array<keyof NumberInputProps>) {
    if (props[key] !== undefined) {
      resolved[key] = props[key];
    }
  }
  resolved.resolvedLocale = normalizeLocale(props.locale);
  return resolved as ResolvedProps;
}

export const isControlled = (props: NumberInputProps) => props.value !== undefined;

/** Current committed value: `value` prop when controlled, state otherwise. */
export function getCurrentValue(
  props: NumberInputProps,
  state: NumberInputState,
  p: ResolvedProps
): number | null {
  return isControlled(props) ? toNumber(props.value, p.resolvedLocale) : state.value;
}

export function getBounds(p: ResolvedProps) {
  let min = toNumber(p.minValue, p.resolvedLocale);
  const max = toNumber(p.maxValue, p.resolvedLocale);
  if (!p.allowNegative) {
    min = Math.max(min ?? 0, 0);
  }
  return { min, max };
}

/** Applies precision / integer / min / max rules. */
export function normalize(value: number | null, p: ResolvedProps): number | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  let result = value;
  if (!p.allowFloat) {
    result = Math.round(result);
  }
  if (p.precision != null) {
    result = roundTo(result, p.precision);
  }
  const { min, max } = getBounds(p);
  if (min != null && result < min) {
    result = min;
  }
  if (max != null && result > max) {
    result = max;
  }
  return result === 0 ? 0 : result;
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
      precision: p.precision,
    },
    caret
  );
}

export function parseDraft(draft: string, p: ResolvedProps): number | null {
  return sanitize(draft, undefined, p).value;
}

/** Next value when stepping from `base`. */
export function computeStep(
  base: number | null,
  direction: SpinDirection,
  config: StepConfig,
  p: ResolvedProps
): number | null {
  const { min, max } = getBounds(p);
  const stepSize = config.step ?? (config.shiftKey ? p.shiftStep : p.step);

  let next: number | null;
  if (p.stepFn) {
    next = p.stepFn(base, direction, {
      step: stepSize,
      shiftKey: !!config.shiftKey,
      min,
      max,
    });
  } else if (base == null) {
    next =
      p.initialStep ??
      (min != null && min > 0 ? min : max != null && max < 0 ? max : 0);
  } else {
    next = addExact(base, direction * stepSize);
  }
  return normalize(next, p);
}

export function getAffixes(p: ResolvedProps) {
  let { prefix, suffix } = p;

  if (p.format === 'currency') {
    const info = getCurrencyInfo(p.resolvedLocale, p.currency, p.currencyDisplay);
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

/** Text shown when the field is not focused: grouping + prefix / suffix. */
export function formatDisplay(value: number, p: ResolvedProps): string {
  const { prefix, suffix } = getAffixes(p);
  const text = formatNumber(value, { locale: p.resolvedLocale, precision: p.precision });
  return [prefix, text, suffix].filter(Boolean).join(' ');
}

/** Text shown while editing: no prefix / suffix, grouping if `groupWhileEditing`. */
export function formatEdit(value: number, p: ResolvedProps): string {
  return formatNumber(value, {
    locale: p.resolvedLocale,
    precision: p.precision,
    useGrouping: p.numbersOnly && p.groupWhileEditing,
  });
}
