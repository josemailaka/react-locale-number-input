import type {
  CSSProperties,
  FocusEvent,
  HTMLAttributes,
  InputHTMLAttributes,
  KeyboardEvent,
  ReactNode,
} from 'react';
import type { CurrencyDisplay } from './utils/currency';

export type SpinDirection = 1 | -1;

export type NumberInputFormat = 'number' | 'currency' | 'percentage';

export type NumericLike = number | string | null;

export interface StepConfig {
  /** Step to use instead of `step` / `shiftStep` (may be negative). */
  step?: number;
  /** When `true`, `shiftStep` is used (unless `step` is given). */
  shiftKey?: boolean;
}

export interface StepFnInfo {
  step: number;
  shiftKey: boolean;
  min: number | null;
  max: number | null;
}

/**
 * Custom stepping logic. Receives the current value (or `null` when empty)
 * and returns the next value (it is then rounded / clamped by the component).
 */
export type StepFn = (
  value: number | null,
  direction: SpinDirection,
  info: StepFnInfo
) => number | null;

export interface IconRenderProps {
  width?: number | string;
  height?: number | string;
  fill?: string;
}

export type IconRenderer = (props: IconRenderProps) => ReactNode | undefined;

export interface NumberInputProps {
  // ---------------------------------------------------------------- value
  /** Controlled value. Use `null` for an empty field. */
  value?: NumericLike;
  /** Initial value for uncontrolled usage. */
  defaultValue?: NumericLike;
  /** Called with the new numeric value (`null` when the field is empty). */
  onChange?: (value: number | null) => void;

  // ------------------------------------------------------------ constraints
  /** Minimum value. Values below are clamped on blur / when stepping. */
  minValue?: number | string;
  /** Maximum value. Values above are clamped on blur / when stepping. */
  maxValue?: number | string;
  /** Allows negative numbers. Default `true`. */
  allowNegative?: boolean;
  /** Allows decimals. Default `true`. */
  allowFloat?: boolean;
  /** Allows an empty field (value `null`). Default `true`. */
  allowEmpty?: boolean;
  /** Value used when the field is left empty and `allowEmpty` is `false`. */
  valueOnEmpty?: number | string;
  /** Number of decimals: limits typing and pads the displayed value. */
  precision?: number;
  /** Filters every non numeric character while typing. Default `true`. */
  numbersOnly?: boolean;
  /**
   * Shows the digit group delimiters while typing ("1,234,567" instead of
   * "1234567"). Default `true`.
   */
  groupWhileEditing?: boolean;

  // ------------------------------------------------------------- formatting
  /** BCP 47 locale, e.g. "fr-FR". Defaults to the browser language. */
  locale?: string;
  /** "number" (default), "currency" or "percentage". */
  format?: NumberInputFormat;
  /** ISO 4217 code for `format="currency"`. Defaults to the currency of the locale region. */
  currency?: string;
  /** Overrides the currency symbol. */
  currencySymbol?: string;
  /** How the currency is displayed. Default "symbol". */
  currencyDisplay?: CurrencyDisplay;
  /** Currency side. Defaults to the usual side for the locale. */
  currencyPosition?: 'start' | 'end';
  /** Text displayed before the number when the field is not focused. */
  prefix?: string;
  /** Text displayed after the number when the field is not focused. */
  suffix?: string;

  // --------------------------------------------------------------- stepping
  /** Step for arrows / wheel / spinner. Default `1`. */
  step?: number;
  /** Step used when Shift is pressed (and for PageUp / PageDown). Default `10`. */
  shiftStep?: number;
  /** Value used when stepping from an empty field. */
  initialStep?: number;
  /** Custom step function. */
  stepFn?: StepFn;
  /** Interval (ms) between steps while a spinner arrow is held. Default `60`. */
  stepDelay?: number;
  /** Delay (ms) before a held spinner arrow starts spinning. Default `300`. */
  spinStartDelay?: number;
  /** ArrowUp / ArrowDown / PageUp / PageDown change the value. Default `true`. */
  spinOnArrowKeys?: boolean;
  /** Mouse wheel changes the value. Default `true`. */
  stepOnWheel?: boolean;
  /** Wheel stepping only when the field is focused. Default `true`. */
  requireFocusOnStep?: boolean;
  /** Call `onChange` while spinning (otherwise only when it stops). Default `true`. */
  triggerChangeOnSpin?: boolean;
  /** Minimum time (ms) between two `onChange` calls while spinning. Default `80`. */
  triggerChangeOnSpinDelay?: number;

  // ------------------------------------------------------------------ tools
  /** Shows the up / down spinner. Default `true`. */
  enableSpinnerTools?: boolean;
  /** Shows the clear button when there is a value. Default `true`. */
  enableClearButton?: boolean;
  /** Clear button can receive the keyboard focus. Default `false`. */
  acceptClearToolFocus?: boolean;
  /** Tools side. Default "end". */
  toolPosition?: 'start' | 'end';
  /** Accessible label of the clear button. Default "Clear value". */
  clearButtonLabel?: string;
  /** Called after the clear button was used. */
  onClear?: () => void;

  arrowSize?: number | [number, number];
  arrowColor?: string;
  arrowStyle?: CSSProperties;
  arrowUpStyle?: CSSProperties;
  arrowDownStyle?: CSSProperties;
  clearButtonSize?: number | [number, number];
  clearButtonColor?: string;
  clearButtonStyle?: CSSProperties;
  clearButtonClassName?: string;
  renderClearIcon?: IconRenderer;
  renderArrowUpIcon?: IconRenderer;
  renderArrowDownIcon?: IconRenderer;

  // -------------------------------------------------------------- the rest
  /** Theme name, see the `themes/` CSS files. Default "default-light". */
  theme?: string;
  rootClassName?: string;
  className?: string;
  style?: CSSProperties;
  rtl?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  /** `size` attribute of the inner input. */
  size?: number;
  id?: string;
  autoFocus?: boolean;
  tabIndex?: number;
  /** Selects the whole text when the field gets the focus. Default `false`. */
  selectAllOnFocus?: boolean;
  /**
   * Form field name. A hidden input holding the raw numeric value
   * (e.g. "1234.5") is rendered so that native forms submit a parsable value.
   */
  name?: string;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** Props for the wrapping div. */
  wrapperProps?: HTMLAttributes<HTMLDivElement>;
  /** Props for the inner text input. */
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
}
