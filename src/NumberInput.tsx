/**
 * Locale aware numeric input.
 *
 * Based on the NumericInput of @inovua/reactdatagrid-community
 * (Copyright © INOVUA TRADING, MIT license), rewritten in TypeScript.
 */

import { Component } from 'react';
import type {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
} from 'react';

import type {
  IconRenderProps,
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

const DEFAULTS = {
  rootClassName: 'inovua-react-toolkit-numeric-input',
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
} as const satisfies Partial<NumberInputProps>;

type ResolvedProps = Omit<NumberInputProps, keyof typeof DEFAULTS> &
  Required<Pick<NumberInputProps, keyof typeof DEFAULTS>> & {
    /** Validated locale (`undefined` = runtime default) */
    resolvedLocale: string | undefined;
  };

interface NumberInputState {
  /** Value of an uncontrolled input */
  value: number | null;
  /** Text being edited, `null` when the displayed text derives from the value */
  draft: string | null;
  focused: boolean;
  spinDirection: SpinDirection | null;
  /** Value displayed while a spinner arrow is held */
  spinValue: number | null | undefined;
}

type Timer = ReturnType<typeof setTimeout>;

const join = (...classNames: Array<string | false | null | undefined>) =>
  classNames.filter(Boolean).join(' ');

const sameNumber = (a: number | null, b: number | null) =>
  a === b || (a !== null && b !== null && Number.isNaN(a) && Number.isNaN(b));

const preventDefault = (event: MouseEvent) => event.preventDefault();

function toNumber(value: NumericLike | undefined, locale?: string): number | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : parseNumber(value, locale);
}

function sizeToSvgProps(size?: number | [number, number]) {
  if (size == null) {
    return {};
  }
  return Array.isArray(size)
    ? { width: size[0], height: size[1] }
    : { width: size, height: size };
}

export class NumberInput extends Component<NumberInputProps, NumberInputState> {
  static displayName = 'NumberInput';

  /** The inner text input */
  input: HTMLInputElement | null = null;

  private pendingCaret: number | null = null;
  private spinStartTimer: Timer | null = null;
  private spinInterval: ReturnType<typeof setInterval> | null = null;
  private emitTimer: Timer | null = null;
  private currentSpinValue: number | null | undefined = undefined;
  private valueOnFocus: number | null = null;
  private documentListeners = false;

  constructor(props: NumberInputProps) {
    super(props);
    const p = this.resolve(props);
    this.state = {
      value: toNumber(props.defaultValue, p.resolvedLocale),
      draft: null,
      focused: false,
      spinDirection: null,
      spinValue: undefined,
    };
  }

  // ------------------------------------------------------------- lifecycle

  override componentDidUpdate(prevProps: NumberInputProps) {
    if (this.pendingCaret != null) {
      const input = this.input;
      if (input && typeof document !== 'undefined' && document.activeElement === input) {
        try {
          input.setSelectionRange(this.pendingCaret, this.pendingCaret);
        } catch {
          // some input types do not support selection
        }
      }
      this.pendingCaret = null;
    }

    // a controlled value changed from outside while the user was editing:
    // drop the edited text if it does not represent the new value anymore
    if (
      prevProps.value !== this.props.value &&
      this.isControlled() &&
      this.state.draft != null &&
      this.state.spinValue === undefined &&
      !sameNumber(this.parseDraft(this.state.draft), this.getValue())
    ) {
      this.setState({ draft: null });
    }
  }

  override componentWillUnmount() {
    this.clearSpinTimers();
    this.clearEmitTimer();
    this.removeDocumentListeners();
    this.setInputRef(null);
  }

  // ------------------------------------------------------------ public API

  /** Current numeric value (`null` when empty). */
  getValue(): number | null {
    return this.isControlled()
      ? toNumber(this.props.value, this.resolve().resolvedLocale)
      : this.state.value;
  }

  /** Alias of `getValue`, kept for compatibility. */
  getNumericValue(): number | null {
    return this.getValue();
  }

  getInput(): HTMLInputElement | null {
    return this.input;
  }

  focus() {
    this.input?.focus();
  }

  blur() {
    this.input?.blur();
  }

  isFocused(): boolean {
    return (
      this.state.focused ||
      (!!this.input &&
        typeof document !== 'undefined' &&
        document.activeElement === this.input)
    );
  }

  isSpinning(): boolean {
    return this.spinInterval != null;
  }

  /** Performs one step up (`1`) or down (`-1`) and calls `onChange`. */
  step(direction: SpinDirection, config: StepConfig = {}) {
    const p = this.resolve();
    if (p.disabled || p.readOnly) {
      return;
    }
    const next = this.computeStep(direction, config, p);
    this.setState({ draft: null });
    this.emitValue(next);
  }

  /** Alias of `step`, kept for compatibility. */
  stepTo(direction: SpinDirection, config: StepConfig = {}) {
    this.step(direction, config);
  }

  /** Starts spinning (one step every `stepDelay` ms) until `stopSpin()`. */
  startSpin(direction: SpinDirection, config: StepConfig = {}) {
    const p = this.resolve();
    if (p.disabled || p.readOnly) {
      return;
    }
    this.clearSpinTimers();
    if (this.currentSpinValue === undefined) {
      this.currentSpinValue = this.getWorkingValue();
    }
    this.setState({ spinDirection: direction });

    this.spinInterval = setInterval(() => {
      const next = this.computeStep(direction, config, this.resolve());
      this.currentSpinValue = next;
      this.setState({ spinValue: next });
      if (this.resolve().triggerChangeOnSpin) {
        this.scheduleSpinEmit();
      }
    }, Math.max(10, p.stepDelay));
  }

  /** Stops spinning and commits the reached value. */
  stopSpin() {
    this.clearSpinTimers();
    this.clearEmitTimer();
    this.removeDocumentListeners();

    const spinValue = this.currentSpinValue;
    this.currentSpinValue = undefined;

    if (spinValue !== undefined) {
      this.setState({ spinValue: undefined, spinDirection: null, draft: null });
      this.emitValue(spinValue);
    } else if (this.state.spinDirection != null) {
      this.setState({ spinDirection: null });
    }
  }

  // ----------------------------------------------------------- value logic

  private resolve(props: NumberInputProps = this.props): ResolvedProps {
    const resolved: Record<string, unknown> = { ...DEFAULTS };
    for (const key of Object.keys(props) as Array<keyof NumberInputProps>) {
      if (props[key] !== undefined) {
        resolved[key] = props[key];
      }
    }
    resolved.resolvedLocale = normalizeLocale(props.locale);
    return resolved as ResolvedProps;
  }

  private isControlled(): boolean {
    return this.props.value !== undefined;
  }

  private getBounds(p: ResolvedProps) {
    let min = toNumber(p.minValue, p.resolvedLocale);
    const max = toNumber(p.maxValue, p.resolvedLocale);
    if (!p.allowNegative) {
      min = Math.max(min ?? 0, 0);
    }
    return { min, max };
  }

  /** Applies precision / integer / min / max rules. */
  private normalize(value: number | null, p: ResolvedProps): number | null {
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
    const { min, max } = this.getBounds(p);
    if (min != null && result < min) {
      result = min;
    }
    if (max != null && result > max) {
      result = max;
    }
    return result === 0 ? 0 : result;
  }

  private sanitize(raw: string, caret: number | undefined, p: ResolvedProps) {
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

  private parseDraft(draft: string): number | null {
    return this.sanitize(draft, undefined, this.resolve()).value;
  }

  /** Value used as starting point for stepping. */
  private getWorkingValue(): number | null {
    if (this.currentSpinValue !== undefined) {
      return this.currentSpinValue;
    }
    if (this.state.draft != null) {
      return this.parseDraft(this.state.draft);
    }
    return this.getValue();
  }

  private computeStep(
    direction: SpinDirection,
    config: StepConfig,
    p: ResolvedProps
  ): number | null {
    const { min, max } = this.getBounds(p);
    const stepSize = config.step ?? (config.shiftKey ? p.shiftStep : p.step);
    const base = this.getWorkingValue();

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
    return this.normalize(next, p);
  }

  /** Stores (uncontrolled) and notifies (`onChange`) a new value. */
  private emitValue(value: number | null) {
    const current = this.getValue();
    if (!this.isControlled() && !sameNumber(value, this.state.value)) {
      this.setState({ value });
    }
    if (!sameNumber(value, current)) {
      this.props.onChange?.(value);
    }
  }

  /** Commits a value: normalizes it, handles empty values and clears the draft. */
  private commit(value: number | null) {
    const p = this.resolve();
    let next = this.normalize(value, p);
    if (next === null && !p.allowEmpty) {
      next = this.normalize(toNumber(p.valueOnEmpty, p.resolvedLocale) ?? 0, p);
    }
    this.setState({ draft: null });
    this.emitValue(next);
  }

  private commitDraft() {
    if (this.state.draft != null) {
      this.commit(this.parseDraft(this.state.draft));
    }
  }

  /** Handles a new text typed / pasted by the user. */
  private applyText(raw: string, caret: number) {
    const p = this.resolve();
    const result = this.sanitize(raw, caret, p);
    const text = p.numbersOnly ? result.text : raw;

    this.pendingCaret = p.numbersOnly ? result.caret : caret;
    this.setState({ draft: text });

    const { value } = result;
    if (value === null) {
      if (p.allowEmpty) {
        this.emitValue(null);
      }
      return;
    }
    // out of range values are only committed (clamped) on blur / Enter,
    // so that typing "1" when min is 10 does not jump to 10 immediately
    const { min, max } = this.getBounds(p);
    if ((min != null && value < min) || (max != null && value > max)) {
      return;
    }
    this.emitValue(value);
  }

  private scheduleSpinEmit() {
    const delay = this.resolve().triggerChangeOnSpinDelay;
    if (delay <= 0) {
      this.emitValue(this.currentSpinValue ?? null);
      return;
    }
    if (!this.emitTimer) {
      this.emitTimer = setTimeout(() => {
        this.emitTimer = null;
        if (this.currentSpinValue !== undefined) {
          this.emitValue(this.currentSpinValue);
        }
      }, delay);
    }
  }

  private clearEmitTimer() {
    if (this.emitTimer) {
      clearTimeout(this.emitTimer);
      this.emitTimer = null;
    }
  }

  private clearSpinTimers() {
    if (this.spinStartTimer) {
      clearTimeout(this.spinStartTimer);
      this.spinStartTimer = null;
    }
    if (this.spinInterval) {
      clearInterval(this.spinInterval);
      this.spinInterval = null;
    }
  }

  // ---------------------------------------------------------------- events

  private setInputRef = (element: HTMLInputElement | null) => {
    if (this.input) {
      this.input.removeEventListener('wheel', this.handleWheel);
    }
    this.input = element;
    if (element) {
      // React wheel listeners are passive: preventDefault would be ignored
      element.addEventListener('wheel', this.handleWheel, { passive: false });
    }
  };

  private handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    this.props.inputProps?.onChange?.(event);
    const target = event.target;
    this.applyText(target.value, target.selectionStart ?? target.value.length);
  };

  private handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    this.valueOnFocus = this.getValue();
    this.setState({ focused: true });

    const p = this.resolve();
    if (p.selectAllOnFocus) {
      const input = event.currentTarget;
      setTimeout(() => {
        if (document.activeElement === input) {
          input.select();
        }
      }, 0);
    }
    p.inputProps?.onFocus?.(event);
    p.onFocus?.(event);
  };

  private handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (this.isSpinning() || this.currentSpinValue !== undefined) {
      this.stopSpin();
    }
    this.commitDraft();
    this.setState({ focused: false });

    this.props.inputProps?.onBlur?.(event);
    this.props.onBlur?.(event);
  };

  private handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const p = this.resolve();
    p.inputProps?.onKeyDown?.(event);
    p.onKeyDown?.(event);

    const { key } = event;
    if (!key || event.defaultPrevented || p.disabled || p.readOnly) {
      return;
    }

    switch (key) {
      case 'ArrowUp':
      case 'ArrowDown':
        if (p.spinOnArrowKeys) {
          event.preventDefault();
          this.step(key === 'ArrowUp' ? 1 : -1, { shiftKey: event.shiftKey });
        }
        return;
      case 'PageUp':
      case 'PageDown':
        if (p.spinOnArrowKeys) {
          event.preventDefault();
          this.step(key === 'PageUp' ? 1 : -1, { step: p.shiftStep });
        }
        return;
      case 'Enter':
        this.commitDraft();
        return;
      case 'Escape':
        if (
          this.state.draft != null ||
          !sameNumber(this.getValue(), this.valueOnFocus)
        ) {
          event.preventDefault();
          this.setState({ draft: null });
          this.emitValue(this.valueOnFocus);
        }
        return;
    }

    if (
      !p.numbersOnly ||
      key.length !== 1 ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      /[0-9]/.test(key)
    ) {
      return;
    }

    const input = event.currentTarget;
    const text = input.value;
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? start;
    const { decimal } = getSeparators(p.resolvedLocale);

    event.preventDefault();

    // decimal delimiter: "." and "," are both accepted and converted to the
    // delimiter of the locale; only one delimiter is allowed
    if (key === decimal || key === '.' || key === ',') {
      if (!p.allowFloat || p.precision === 0) {
        return;
      }
      const existing = text.indexOf(decimal);
      if (existing !== -1 && (existing < start || existing >= end)) {
        // there is already a delimiter outside of the selection
        return;
      }
      this.applyText(
        text.slice(0, start) + decimal + text.slice(end),
        start + decimal.length
      );
      return;
    }

    // "-" toggles the sign, "+" makes the number positive
    if ((key === '-' || key === '+') && p.allowNegative) {
      if (text.startsWith('-')) {
        this.applyText(text.slice(1), Math.max(0, start - 1));
      } else if (key === '-') {
        this.applyText(`-${text}`, start + 1);
      }
    }
  };

  private handleWheel = (event: WheelEvent) => {
    const p = this.resolve();
    if (!p.stepOnWheel || p.disabled || p.readOnly) {
      return;
    }
    if (p.requireFocusOnStep && !this.isFocused()) {
      return;
    }
    // with Shift pressed some browsers report the delta on the X axis
    const delta = event.deltaY || event.deltaX;
    if (!delta) {
      return;
    }
    event.preventDefault();
    this.step(delta < 0 ? 1 : -1, { shiftKey: event.shiftKey });
  };

  private handleArrowPointerDown(direction: SpinDirection, event: PointerEvent) {
    if (event.button !== 0) {
      return;
    }
    const p = this.resolve();
    if (p.disabled || p.readOnly) {
      return;
    }
    this.stopSpin();

    const shiftKey = event.shiftKey;
    this.step(direction, { shiftKey });
    this.setState({ spinDirection: direction });
    this.addDocumentListeners();

    this.spinStartTimer = setTimeout(() => {
      this.spinStartTimer = null;
      this.startSpin(direction, { shiftKey });
    }, p.spinStartDelay);
  }

  private handleUpPointerDown = (event: PointerEvent) =>
    this.handleArrowPointerDown(1, event);

  private handleDownPointerDown = (event: PointerEvent) =>
    this.handleArrowPointerDown(-1, event);

  private handleDocumentPointerUp = () => {
    this.stopSpin();
  };

  private addDocumentListeners() {
    if (this.documentListeners || typeof document === 'undefined') {
      return;
    }
    this.documentListeners = true;
    document.addEventListener('pointerup', this.handleDocumentPointerUp, true);
    document.addEventListener('pointercancel', this.handleDocumentPointerUp, true);
    window.addEventListener('blur', this.handleDocumentPointerUp);
  }

  private removeDocumentListeners() {
    if (!this.documentListeners) {
      return;
    }
    this.documentListeners = false;
    document.removeEventListener('pointerup', this.handleDocumentPointerUp, true);
    document.removeEventListener('pointercancel', this.handleDocumentPointerUp, true);
    window.removeEventListener('blur', this.handleDocumentPointerUp);
  }

  private handleClearClick = () => {
    const p = this.resolve();
    if (p.disabled || p.readOnly) {
      return;
    }
    this.stopSpin();
    if (p.allowEmpty) {
      this.commit(null);
    } else {
      // empty text, the fallback value is committed on blur
      this.setState({ draft: '' });
    }
    p.onClear?.();
    this.focus();
  };

  // ------------------------------------------------------------- rendering

  private getAffixes(p: ResolvedProps) {
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
  private formatDisplay(value: number, p: ResolvedProps): string {
    const { prefix, suffix } = this.getAffixes(p);
    const text = formatNumber(value, {
      locale: p.resolvedLocale,
      precision: p.precision,
    });
    return join(prefix, text, suffix);
  }

  /** Text shown while editing: no grouping, no prefix / suffix. */
  private formatEdit(value: number, p: ResolvedProps): string {
    return formatNumber(value, {
      locale: p.resolvedLocale,
      precision: p.precision,
      useGrouping: false,
    });
  }

  private renderClearIcon(svgProps: IconRenderProps): ReactNode {
    const custom = this.props.renderClearIcon?.({
      width: svgProps.width,
      height: svgProps.height,
    });
    if (custom !== undefined) {
      return custom;
    }
    return (
      <svg style={{ ...svgProps }} viewBox="0 0 10 10" aria-hidden="true">
        <path
          fill="none"
          fillRule="evenodd"
          strokeLinecap="round"
          strokeWidth="1.33"
          d="M1 1l8 8m0-8L1 9"
        />
      </svg>
    );
  }

  private renderArrowIcon(direction: SpinDirection, svgProps: IconRenderProps): ReactNode {
    const renderer =
      direction === 1 ? this.props.renderArrowUpIcon : this.props.renderArrowDownIcon;
    const custom = renderer?.({ ...svgProps });
    if (custom !== undefined) {
      return custom;
    }
    const height =
      typeof svgProps.height === 'number' ? svgProps.height / 2 : svgProps.height;
    return (
      <svg style={{ ...svgProps, height }} viewBox="0 0 10 5" aria-hidden="true">
        <path
          fillRule="evenodd"
          d={
            direction === 1
              ? 'M5.262.262l4.106 4.106c.144.144.144.379 0 .524-.07.069-.164.108-.262.108H.894c-.204 0-.37-.166-.37-.37 0-.099.039-.193.108-.262L4.738.262c.145-.145.38-.145.524 0z'
              : 'M4.738 4.738L.632.632C.488.488.488.253.632.108.702.04.796 0 .894 0h8.212c.204 0 .37.166.37.37 0 .099-.039.193-.108.262L5.262 4.738c-.145.145-.38.145-.524 0z'
          }
        />
      </svg>
    );
  }

  private renderClearButton(p: ResolvedProps, hasValue: boolean) {
    const root = p.rootClassName;
    const svgProps: IconRenderProps = sizeToSvgProps(p.clearButtonSize);
    if (p.clearButtonColor) {
      svgProps.fill = p.clearButtonColor;
    }
    const hidden = !hasValue || !p.enableClearButton || p.disabled || p.readOnly;

    return (
      <div
        key="clearButton"
        className={join(
          `${root}__clear-button-wrapper`,
          hidden && `${root}__clear-button-wrapper--hidden`
        )}
      >
        <button
          type="button"
          aria-label={p.clearButtonLabel}
          title={p.clearButtonLabel}
          onClick={this.handleClearClick}
          onMouseDown={preventDefault}
          className={join(
            `${root}__clear-button`,
            `${root}__clear-button--${p.rtl ? 'rtl' : 'ltr'}`,
            p.clearButtonClassName
          )}
          style={{ ...p.clearButtonStyle }}
          tabIndex={p.acceptClearToolFocus ? 0 : -1}
          disabled={hidden}
        >
          {this.renderClearIcon(svgProps)}
        </button>
      </div>
    );
  }

  private renderSpinner(p: ResolvedProps) {
    const root = p.rootClassName;
    const dir = p.rtl ? 'rtl' : 'ltr';
    const { spinDirection } = this.state;
    const svgProps: IconRenderProps = sizeToSvgProps(p.arrowSize);
    if (p.arrowColor) {
      svgProps.fill = p.arrowColor;
    }

    const wrapperClassName = p.enableSpinnerTools
      ? `${root}__spinner-wrapper ${root}__spinner-wrapper--${dir}`
      : `${root}__spinner-wrapper-hidden ${root}__spinner-wrapper-hidden--${dir}`;

    return (
      <div key="spinnerTool" className={wrapperClassName} aria-hidden="true">
        {p.enableSpinnerTools ? (
          <>
            <span
              className={join(
                `${root}__spinner-arrow`,
                `${root}__spinner-arrow--up`,
                spinDirection === 1 && `${root}__spinner-arrow--active`
              )}
              style={{ ...p.arrowStyle, ...p.arrowUpStyle }}
              onPointerDown={this.handleUpPointerDown}
              onMouseDown={preventDefault}
            >
              {this.renderArrowIcon(1, svgProps)}
            </span>
            <span
              className={join(
                `${root}__spinner-arrow`,
                `${root}__spinner-arrow--down`,
                spinDirection === -1 && `${root}__spinner-arrow--active`
              )}
              style={{ ...p.arrowStyle, ...p.arrowDownStyle }}
              onPointerDown={this.handleDownPointerDown}
              onMouseDown={preventDefault}
            >
              {this.renderArrowIcon(-1, svgProps)}
            </span>
          </>
        ) : null}
      </div>
    );
  }

  override render() {
    const p = this.resolve();
    const { state } = this;
    const root = p.rootClassName;
    const value = this.getValue();
    const shownValue = state.spinValue !== undefined ? state.spinValue : value;

    let text: string;
    if (state.spinValue === undefined && state.draft != null) {
      text = state.draft;
    } else if (shownValue == null) {
      text = '';
    } else {
      text = state.focused
        ? this.formatEdit(shownValue, p)
        : this.formatDisplay(shownValue, p);
    }

    const hasValue = state.draft != null ? state.draft !== '' : shownValue != null;
    const { min, max } = this.getBounds(p);
    const inputProps = p.inputProps ?? {};

    const className = join(
      root,
      p.theme && `${root}--theme-${p.theme}`,
      `${root}--${p.rtl ? 'rtl' : 'ltr'}`,
      p.disabled && `${root}--disabled`,
      p.readOnly && `${root}--read-only`,
      state.focused && `${root}--focused`,
      p.enableSpinnerTools && `${root}--enable-spinner-tools`,
      p.enableClearButton && `${root}--enable-clear-button`,
      p.className
    );

    const input = (
      <input
        size={Math.max(1, p.size || 0)} // without it, FF does not flex the input correctly
        placeholder={p.placeholder}
        id={p.id}
        autoFocus={p.autoFocus}
        tabIndex={p.tabIndex}
        inputMode={p.allowNegative ? 'text' : p.allowFloat && p.precision !== 0 ? 'decimal' : 'numeric'}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        role="spinbutton"
        aria-valuenow={shownValue ?? undefined}
        aria-valuemin={min ?? undefined}
        aria-valuemax={max ?? undefined}
        aria-valuetext={shownValue == null ? undefined : this.formatDisplay(shownValue, p)}
        {...inputProps}
        ref={this.setInputRef}
        type="text"
        key="input"
        className={join(`${root}__input`, inputProps.className)}
        disabled={p.disabled}
        readOnly={p.readOnly}
        value={text}
        onKeyDown={this.handleKeyDown}
        onChange={this.handleChange}
        onFocus={this.handleFocus}
        onBlur={this.handleBlur}
      />
    );

    const clearButton = this.renderClearButton(p, hasValue);
    const spinner = this.renderSpinner(p);

    let children: ReactNode[];
    if (p.toolPosition === 'start') {
      children = p.enableSpinnerTools
        ? [spinner, clearButton, input]
        : [clearButton, input, spinner];
    } else {
      children = p.enableSpinnerTools
        ? [input, clearButton, spinner]
        : [input, spinner, clearButton];
    }

    const wrapperProps = p.wrapperProps ?? {};

    return (
      <div
        dir={p.rtl ? 'rtl' : undefined}
        {...wrapperProps}
        className={join(className, wrapperProps.className)}
        style={{ ...p.style, ...wrapperProps.style }}
      >
        {children}
        {p.name ? (
          <input type="hidden" name={p.name} value={value == null ? '' : String(value)} />
        ) : null}
      </div>
    );
  }
}

export default NumberInput;
