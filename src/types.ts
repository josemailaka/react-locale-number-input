import type {
  ClipboardEvent,
  CSSProperties,
  FocusEvent,
  HTMLAttributes,
  InputHTMLAttributes,
  KeyboardEvent,
  ReactNode,
} from 'react';
import type { CurrencyDisplay } from './utils/currency';
import type { RoundingMode } from './utils/decimal';

export type { RoundingMode };

export type SpinDirection = 1 | -1;

/** Validation error of the current value. */
export type NumberInputError = 'min' | 'max' | 'required';

export interface NumberInputValueDetails {
  /** Value as a JS number (`null` when empty). */
  value: number | null;
  /** Exact value as a decimal string ("1234.5"), to send to a backend for amounts. */
  valueAsString: string | null;
  /** Value as displayed when not focused ("1 234,50 €"). */
  formattedValue: string;
  /** Validation error, `null` when valid. */
  error: NumberInputError | null;
}

export interface PasteRejection {
  /** Pasted text */
  text: string;
  /**
   * - "ambiguous": "1,234" / "1.234" could be 1234 or 1.234
   * - "invalid": no digit
   * - "negative": negative amount while `allowNegative` is false
   * - "decimals": more decimals than allowed (`precision` / `allowFloat`)
   */
  reason: 'ambiguous' | 'invalid' | 'negative' | 'decimals';
}

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
 * and returns the next value (it is then rounded / clamped).
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

/** Imperative API, available through `ref` and `useNumberInput().api`. */
export interface NumberInputHandle {
  /** The inner text input */
  readonly input: HTMLInputElement | null;
  getInput(): HTMLInputElement | null;
  /** Current numeric value (`null` when empty). */
  getValue(): number | null;
  /** Exact current value as a decimal string ("1234.5"), `null` when empty. */
  getValueAsString(): string | null;
  /** Current validation error, `null` when valid. */
  getError(): NumberInputError | null;
  /** Alias of `getValue`. */
  getNumericValue(): number | null;
  focus(): void;
  blur(): void;
  isFocused(): boolean;
  isSpinning(): boolean;
  /** One step up (`1`) or down (`-1`), calls `onChange`. */
  step(direction: SpinDirection, config?: StepConfig): void;
  /** Alias of `step`. */
  stepTo(direction: SpinDirection, config?: StepConfig): void;
  /** Steps every `stepDelay` ms until `stopSpin()`. */
  startSpin(direction: SpinDirection, config?: StepConfig): void;
  /** Stops spinning and commits the reached value. */
  stopSpin(): void;
  /** Same as the clear button. */
  clear(): void;
}

/** Behaviour props, shared by `useNumberInput` and `NumberInput`. */
export interface UseNumberInputProps {
  /**
   * Group of defaults. `"amount"` is meant for money / finance:
   * no spinner, no wheel, no arrow keys, no negative, `precision="auto"`,
   * `clampBehavior="validate"`, `roundingMode="halfExpand"`, `pasteMode="strict"`.
   * Every prop given explicitly wins over the preset.
   */
  preset?: 'amount';

  // ---------------------------------------------------------------- value
  /**
   * Controlled value. Use `null` for an empty field. Pass a decimal string
   * ("12345678901234567.89") to keep the exact value of big amounts.
   */
  value?: NumericLike;
  /** Initial value for uncontrolled usage. */
  defaultValue?: NumericLike;
  /** Called with the new numeric value (`null` when the field is empty). */
  onChange?: (value: number | null) => void;
  /**
   * Called when the value changes, with the exact decimal string, the
   * formatted text and the validation error. Prefer it for amounts.
   */
  onValueChange?: (details: NumberInputValueDetails) => void;
  /** Called when the validation error changes. */
  onErrorChange?: (error: NumberInputError | null) => void;

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
  /**
   * Number of decimals: limits typing and pads the displayed value.
   * `"auto"`: decimals of the currency for `format="currency"`
   * (2 for EUR, 0 for JPY, 3 for KWD), 2 otherwise.
   */
  precision?: number | 'auto';
  /**
   * How values are rounded to `precision` (and to integers when
   * `allowFloat` is false). Default "halfCeil" (like `Math.round`).
   * Use "halfExpand" (commercial) or "halfEven" (banker's) for money.
   */
  roundingMode?: RoundingMode;
  /**
   * What happens to a typed value outside `minValue` / `maxValue`:
   * - "clamp" (default): it is replaced by the bound on blur / Enter
   * - "validate": it is kept, `error` is set ("min" / "max"),
   *   `aria-invalid` is added, and the application decides
   */
  clampBehavior?: 'clamp' | 'validate';
  /** An empty field is an error ("required"). Adds `aria-required`. */
  required?: boolean;
  /**
   * - "lenient" (default): pasted texts are interpreted as well as possible
   * - "strict": ambiguous ("1,234"), negative (when not allowed) or too precise
   *   pasted texts are rejected and `onPasteRejected` is called
   */
  pasteMode?: 'lenient' | 'strict';
  /** Called when a pasted text is rejected (see `pasteMode`). */
  onPasteRejected?: (rejection: PasteRejection) => void;
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
  /** "accounting" displays negative values in parentheses: "(1,234.50 €)". */
  currencySign?: 'standard' | 'accounting';
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

  // ------------------------------------------------------------------ state
  disabled?: boolean;
  readOnly?: boolean;
  /** Selects the whole text when the field gets the focus. Default `false`. */
  selectAllOnFocus?: boolean;
  /**
   * Form field name. A hidden input holding the raw numeric value
   * (e.g. "1234.5") is rendered so that native forms submit a parsable value.
   */
  name?: string;

  // ----------------------------------------------------------------- events
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onPaste?: (event: ClipboardEvent<HTMLInputElement>) => void;
  /** Called after the value was cleared with the clear button / `clear()`. */
  onClear?: () => void;
}

/** Props of the `NumberInput` component. */
export interface NumberInputProps extends UseNumberInputProps {
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
  placeholder?: string;
  /** `size` attribute of the inner input. */
  size?: number;
  id?: string;
  autoFocus?: boolean;
  tabIndex?: number;
  /** Props for the wrapping div. */
  wrapperProps?: HTMLAttributes<HTMLDivElement>;
  /** Props for the inner text input. */
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
}
