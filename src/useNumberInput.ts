import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  ChangeEvent,
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  MutableRefObject,
  PointerEvent,
} from 'react';

import type {
  NumberInputHandle,
  SpinDirection,
  StepConfig,
  UseNumberInputProps,
} from './types';
import {
  computeStep,
  formatDisplay,
  formatEdit,
  getBounds,
  getCurrentValue,
  isControlled,
  normalize,
  parseDraft,
  resolveProps,
  sameNumber,
  sanitize,
  toNumber,
} from './core';
import type { NumberInputState } from './core';
import { getSeparators } from './utils/locale';
import { groupNumberText } from './utils/number';

// useLayoutEffect warns during server rendering with React 17 / 18
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type Timer = ReturnType<typeof setTimeout>;

interface Instance {
  input: HTMLInputElement | null;
  pendingCaret: number | null;
  spinStartTimer: Timer | null;
  spinInterval: ReturnType<typeof setInterval> | null;
  emitTimer: Timer | null;
  currentSpinValue: number | null | undefined;
  valueOnFocus: number | null;
  documentListeners: boolean;
  prevValueProp: UseNumberInputProps['value'];
}

export interface NumberInputElementProps {
  ref: (element: HTMLInputElement | null) => void;
  type: 'text';
  value: string;
  role: 'spinbutton';
  inputMode: 'text' | 'decimal' | 'numeric';
  autoComplete: 'off';
  autoCorrect: 'off';
  spellCheck: false;
  disabled: boolean | undefined;
  readOnly: boolean | undefined;
  'aria-valuenow': number | undefined;
  'aria-valuemin': number | undefined;
  'aria-valuemax': number | undefined;
  'aria-valuetext': string | undefined;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFocus: (event: FocusEvent<HTMLInputElement>) => void;
  onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export interface SpinButtonProps {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onMouseDown: (event: MouseEvent<HTMLElement>) => void;
}

export interface ClearButtonProps {
  type: 'button';
  onClick: () => void;
  onMouseDown: (event: MouseEvent<HTMLElement>) => void;
  disabled: boolean;
}

export interface UseNumberInputResult {
  /** Committed value (`null` when empty). */
  value: number | null;
  /** Value currently displayed (differs from `value` while spinning). */
  displayValue: number | null;
  /** Text of the input. */
  text: string;
  /** Text shown when not focused (with grouping, prefix, suffix). */
  formattedText: string;
  focused: boolean;
  /** Direction of the spinner arrow being held. */
  spinDirection: SpinDirection | null;
  /** The field holds something (value or text being typed). */
  hasValue: boolean;
  min: number | null;
  max: number | null;
  /** Spread on your `<input>`. */
  inputProps: NumberInputElementProps;
  /** Spread on your "increment" element. */
  incrementProps: SpinButtonProps;
  /** Spread on your "decrement" element. */
  decrementProps: SpinButtonProps;
  /** Spread on your clear `<button>`. */
  clearButtonProps: ClearButtonProps;
  /** Spread on an `<input>` when `name` is given (raw value for HTML forms). */
  hiddenInputProps: { type: 'hidden'; name: string; value: string } | undefined;
  /** Imperative API (stable object). */
  api: NumberInputHandle;
}

const preventDefault = (event: MouseEvent<HTMLElement>) => event.preventDefault();

function createController(
  propsRef: MutableRefObject<UseNumberInputProps>,
  stateRef: MutableRefObject<NumberInputState>,
  inst: Instance,
  setState: (partial: Partial<NumberInputState>) => void
) {
  const resolve = () => resolveProps(propsRef.current);
  const controlled = () => isControlled(propsRef.current);

  function getValue(): number | null {
    return getCurrentValue(propsRef.current, stateRef.current, resolve());
  }

  function isFocused(): boolean {
    return (
      stateRef.current.focused ||
      (!!inst.input &&
        typeof document !== 'undefined' &&
        document.activeElement === inst.input)
    );
  }

  const isSpinning = () => inst.spinInterval != null;

  /** Value used as starting point for stepping. */
  function getWorkingValue(): number | null {
    if (inst.currentSpinValue !== undefined) {
      return inst.currentSpinValue;
    }
    const { draft } = stateRef.current;
    if (draft != null) {
      return parseDraft(draft, resolve());
    }
    return getValue();
  }

  /** Stores (uncontrolled) and notifies (`onChange`) a new value. */
  function emitValue(value: number | null) {
    const current = getValue();
    if (!controlled() && !sameNumber(value, stateRef.current.value)) {
      setState({ value });
    }
    if (!sameNumber(value, current)) {
      propsRef.current.onChange?.(value);
    }
  }

  /** Commits a value: normalizes it, handles empty values and clears the draft. */
  function commit(value: number | null) {
    const p = resolve();
    let next = normalize(value, p);
    if (next === null && !p.allowEmpty) {
      next = normalize(toNumber(p.valueOnEmpty, p.resolvedLocale) ?? 0, p);
    }
    setState({ draft: null });
    emitValue(next);
  }

  function commitDraft() {
    const { draft } = stateRef.current;
    if (draft != null) {
      commit(parseDraft(draft, resolve()));
    }
  }

  /** Handles a new text typed / pasted by the user. */
  function applyText(raw: string, caret: number) {
    const p = resolve();
    const result = sanitize(raw, caret, p);
    let text = raw;
    let nextCaret = caret;
    if (p.numbersOnly) {
      ({ text, caret: nextCaret } = p.groupWhileEditing
        ? groupNumberText(
            result.text,
            {
              decimalDelimiter: getSeparators(p.resolvedLocale).decimal,
              locale: p.resolvedLocale,
            },
            result.caret
          )
        : result);
    }

    inst.pendingCaret = nextCaret;
    setState({ draft: text });

    const { value } = result;
    if (value === null) {
      if (p.allowEmpty) {
        emitValue(null);
      }
      return;
    }
    // out of range values are only committed (clamped) on blur / Enter,
    // so that typing "1" when min is 10 does not jump to 10 immediately
    const { min, max } = getBounds(p);
    if ((min != null && value < min) || (max != null && value > max)) {
      return;
    }
    emitValue(value);
  }

  // ------------------------------------------------------------- stepping

  function step(direction: SpinDirection, config: StepConfig = {}) {
    const p = resolve();
    if (p.disabled || p.readOnly) {
      return;
    }
    const next = computeStep(getWorkingValue(), direction, config, p);
    setState({ draft: null });
    emitValue(next);
  }

  function clearEmitTimer() {
    if (inst.emitTimer) {
      clearTimeout(inst.emitTimer);
      inst.emitTimer = null;
    }
  }

  function clearSpinTimers() {
    if (inst.spinStartTimer) {
      clearTimeout(inst.spinStartTimer);
      inst.spinStartTimer = null;
    }
    if (inst.spinInterval) {
      clearInterval(inst.spinInterval);
      inst.spinInterval = null;
    }
  }

  function scheduleSpinEmit() {
    const delay = resolve().triggerChangeOnSpinDelay;
    if (delay <= 0) {
      emitValue(inst.currentSpinValue ?? null);
      return;
    }
    if (!inst.emitTimer) {
      inst.emitTimer = setTimeout(() => {
        inst.emitTimer = null;
        if (inst.currentSpinValue !== undefined) {
          emitValue(inst.currentSpinValue);
        }
      }, delay);
    }
  }

  function startSpin(direction: SpinDirection, config: StepConfig = {}) {
    const p = resolve();
    if (p.disabled || p.readOnly) {
      return;
    }
    clearSpinTimers();
    if (inst.currentSpinValue === undefined) {
      inst.currentSpinValue = getWorkingValue();
    }
    setState({ spinDirection: direction });

    inst.spinInterval = setInterval(() => {
      const current = resolve();
      const next = computeStep(getWorkingValue(), direction, config, current);
      inst.currentSpinValue = next;
      setState({ spinValue: next });
      if (current.triggerChangeOnSpin) {
        scheduleSpinEmit();
      }
    }, Math.max(10, p.stepDelay));
  }

  function handleDocumentPointerUp() {
    stopSpin();
  }

  function addDocumentListeners() {
    if (inst.documentListeners || typeof document === 'undefined') {
      return;
    }
    inst.documentListeners = true;
    document.addEventListener('pointerup', handleDocumentPointerUp, true);
    document.addEventListener('pointercancel', handleDocumentPointerUp, true);
    window.addEventListener('blur', handleDocumentPointerUp);
  }

  function removeDocumentListeners() {
    if (!inst.documentListeners) {
      return;
    }
    inst.documentListeners = false;
    document.removeEventListener('pointerup', handleDocumentPointerUp, true);
    document.removeEventListener('pointercancel', handleDocumentPointerUp, true);
    window.removeEventListener('blur', handleDocumentPointerUp);
  }

  function stopSpin() {
    clearSpinTimers();
    clearEmitTimer();
    removeDocumentListeners();

    const spinValue = inst.currentSpinValue;
    inst.currentSpinValue = undefined;

    if (spinValue !== undefined) {
      setState({ spinValue: undefined, spinDirection: null, draft: null });
      emitValue(spinValue);
    } else if (stateRef.current.spinDirection != null) {
      setState({ spinDirection: null });
    }
  }

  function handleArrowPointerDown(direction: SpinDirection, event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) {
      return;
    }
    const p = resolve();
    if (p.disabled || p.readOnly) {
      return;
    }
    stopSpin();

    const shiftKey = event.shiftKey;
    step(direction, { shiftKey });
    setState({ spinDirection: direction });
    addDocumentListeners();

    inst.spinStartTimer = setTimeout(() => {
      inst.spinStartTimer = null;
      startSpin(direction, { shiftKey });
    }, p.spinStartDelay);
  }

  function clear() {
    const p = resolve();
    if (p.disabled || p.readOnly) {
      return;
    }
    stopSpin();
    if (p.allowEmpty) {
      commit(null);
    } else {
      // empty text, the fallback value is committed on blur
      setState({ draft: '' });
    }
    p.onClear?.();
    inst.input?.focus();
  }

  // --------------------------------------------------------------- events

  function handleWheel(event: WheelEvent) {
    const p = resolve();
    if (!p.stepOnWheel || p.disabled || p.readOnly) {
      return;
    }
    if (p.requireFocusOnStep && !isFocused()) {
      return;
    }
    // with Shift pressed some browsers report the delta on the X axis
    const delta = event.deltaY || event.deltaX;
    if (!delta) {
      return;
    }
    event.preventDefault();
    step(delta < 0 ? 1 : -1, { shiftKey: event.shiftKey });
  }

  function setInputRef(element: HTMLInputElement | null) {
    if (inst.input) {
      inst.input.removeEventListener('wheel', handleWheel);
    }
    inst.input = element;
    if (element) {
      // React wheel listeners are passive: preventDefault would be ignored
      element.addEventListener('wheel', handleWheel, { passive: false });
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    event.stopPropagation();
    const target = event.target;
    applyText(target.value, target.selectionStart ?? target.value.length);
  }

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    inst.valueOnFocus = getValue();
    setState({ focused: true });

    const p = resolve();
    if (p.selectAllOnFocus) {
      const input = event.currentTarget;
      setTimeout(() => {
        if (document.activeElement === input) {
          input.select();
        }
      }, 0);
    }
    p.onFocus?.(event);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    if (isSpinning() || inst.currentSpinValue !== undefined) {
      stopSpin();
    }
    commitDraft();
    setState({ focused: false });
    propsRef.current.onBlur?.(event);
  }

  /**
   * With grouping while editing, Backspace right after a group delimiter
   * (or Delete right before one) removes the digit behind the delimiter,
   * otherwise nothing would happen (the delimiter is re-inserted).
   */
  function handleDeleteOverGroupDelimiter(event: KeyboardEvent<HTMLInputElement>) {
    const p = resolve();
    if (!p.numbersOnly || !p.groupWhileEditing) {
      return;
    }
    const input = event.currentTarget;
    const text = input.value;
    const start = input.selectionStart;
    if (start == null || start !== input.selectionEnd) {
      return;
    }
    const { group } = getSeparators(p.resolvedLocale);

    if (event.key === 'Backspace' && start >= 2 && text[start - 1] === group) {
      event.preventDefault();
      applyText(text.slice(0, start - 2) + text.slice(start - 1), start - 2);
    } else if (event.key === 'Delete' && text[start] === group && start + 1 < text.length) {
      event.preventDefault();
      applyText(text.slice(0, start + 1) + text.slice(start + 2), start + 1);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const p = resolve();
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
          step(key === 'ArrowUp' ? 1 : -1, { shiftKey: event.shiftKey });
        }
        return;
      case 'PageUp':
      case 'PageDown':
        if (p.spinOnArrowKeys) {
          event.preventDefault();
          step(key === 'PageUp' ? 1 : -1, { step: p.shiftStep });
        }
        return;
      case 'Enter':
        commitDraft();
        return;
      case 'Escape':
        if (stateRef.current.draft != null || !sameNumber(getValue(), inst.valueOnFocus)) {
          event.preventDefault();
          setState({ draft: null });
          emitValue(inst.valueOnFocus);
        }
        return;
      case 'Backspace':
      case 'Delete':
        handleDeleteOverGroupDelimiter(event);
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
        return; // there is already a delimiter outside of the selection
      }
      applyText(text.slice(0, start) + decimal + text.slice(end), start + decimal.length);
      return;
    }

    // "-" toggles the sign, "+" makes the number positive
    if ((key === '-' || key === '+') && p.allowNegative) {
      if (text.startsWith('-')) {
        applyText(text.slice(1), Math.max(0, start - 1));
      } else if (key === '-') {
        applyText(`-${text}`, start + 1);
      }
    }
  }

  // ------------------------------------------------------------ lifecycle

  /** Runs after every render (like componentDidUpdate). */
  function afterRender() {
    if (inst.pendingCaret != null) {
      const input = inst.input;
      if (input && typeof document !== 'undefined' && document.activeElement === input) {
        try {
          input.setSelectionRange(inst.pendingCaret, inst.pendingCaret);
        } catch {
          // some input types do not support selection
        }
      }
      inst.pendingCaret = null;
    }

    // a controlled value changed from outside while the user was editing:
    // drop the edited text if it does not represent the new value anymore
    const valueProp = propsRef.current.value;
    if (valueProp !== inst.prevValueProp) {
      inst.prevValueProp = valueProp;
      const { draft, spinValue } = stateRef.current;
      if (
        controlled() &&
        draft != null &&
        spinValue === undefined &&
        !sameNumber(parseDraft(draft, resolve()), getValue())
      ) {
        setState({ draft: null });
      }
    }
  }

  /** Runs on unmount. The wheel listener is removed by the ref callback. */
  function dispose() {
    clearSpinTimers();
    clearEmitTimer();
    removeDocumentListeners();
    inst.currentSpinValue = undefined;
  }

  const api: NumberInputHandle = {
    get input() {
      return inst.input;
    },
    getInput: () => inst.input,
    getValue,
    getNumericValue: getValue,
    focus: () => inst.input?.focus(),
    blur: () => inst.input?.blur(),
    isFocused,
    isSpinning,
    step,
    stepTo: step,
    startSpin,
    stopSpin,
    clear,
  };

  const spinUp: SpinButtonProps = {
    onPointerDown: event => handleArrowPointerDown(1, event),
    onMouseDown: preventDefault,
  };
  const spinDown: SpinButtonProps = {
    onPointerDown: event => handleArrowPointerDown(-1, event),
    onMouseDown: preventDefault,
  };

  return {
    api,
    spinUp,
    spinDown,
    setInputRef,
    handleChange,
    handleFocus,
    handleBlur,
    handleKeyDown,
    afterRender,
    dispose,
  };
}

/**
 * Headless number input: all the behaviour of `NumberInput` (locale parsing
 * and formatting, grouping while typing, stepping, spinning, clearing...)
 * without any markup. Spread the returned props on your own elements.
 *
 * ```tsx
 * const n = useNumberInput({ locale: 'fr-FR', defaultValue: 10 });
 * <input {...n.inputProps} />
 * <button {...n.incrementProps}>+</button>
 * ```
 */
export function useNumberInput(props: UseNumberInputProps = {}): UseNumberInputResult {
  const p = resolveProps(props);
  const [state, setFullState] = useState<NumberInputState>(() => ({
    value: toNumber(props.defaultValue, p.resolvedLocale),
    draft: null,
    focused: false,
    spinDirection: null,
    spinValue: undefined,
  }));

  const propsRef = useRef(props);
  const stateRef = useRef(state);

  const [controller] = useState(() =>
    createController(
      propsRef,
      stateRef,
      {
        input: null,
        pendingCaret: null,
        spinStartTimer: null,
        spinInterval: null,
        emitTimer: null,
        currentSpinValue: undefined,
        valueOnFocus: null,
        documentListeners: false,
        prevValueProp: props.value,
      },
      partial => setFullState(current => ({ ...current, ...partial }))
    )
  );

  useIsomorphicLayoutEffect(() => {
    propsRef.current = props;
    stateRef.current = state;
    controller.afterRender();
  });

  useEffect(() => () => controller.dispose(), [controller]);

  // ----------------------------------------------------- derived values
  const value = getCurrentValue(props, state, p);
  const displayValue = state.spinValue !== undefined ? state.spinValue : value;

  let text: string;
  if (state.spinValue === undefined && state.draft != null) {
    text = state.draft;
  } else if (displayValue == null) {
    text = '';
  } else {
    text = state.focused ? formatEdit(displayValue, p) : formatDisplay(displayValue, p);
  }

  const formattedText = displayValue == null ? '' : formatDisplay(displayValue, p);
  const hasValue = state.draft != null ? state.draft !== '' : displayValue != null;
  const { min, max } = getBounds(p);

  return {
    value,
    displayValue,
    text,
    formattedText,
    focused: state.focused,
    spinDirection: state.spinDirection,
    hasValue,
    min,
    max,
    inputProps: {
      ref: controller.setInputRef,
      type: 'text',
      value: text,
      role: 'spinbutton',
      inputMode: p.allowNegative
        ? 'text'
        : p.allowFloat && p.precision !== 0
          ? 'decimal'
          : 'numeric',
      autoComplete: 'off',
      autoCorrect: 'off',
      spellCheck: false,
      disabled: p.disabled,
      readOnly: p.readOnly,
      'aria-valuenow': displayValue ?? undefined,
      'aria-valuemin': min ?? undefined,
      'aria-valuemax': max ?? undefined,
      'aria-valuetext': formattedText || undefined,
      onChange: controller.handleChange,
      onFocus: controller.handleFocus,
      onBlur: controller.handleBlur,
      onKeyDown: controller.handleKeyDown,
    },
    incrementProps: controller.spinUp,
    decrementProps: controller.spinDown,
    clearButtonProps: {
      type: 'button',
      onClick: controller.api.clear,
      onMouseDown: preventDefault,
      disabled: !hasValue || !!p.disabled || !!p.readOnly,
    },
    hiddenInputProps: p.name
      ? { type: 'hidden', name: p.name, value: value == null ? '' : String(value) }
      : undefined,
    api: controller.api,
  };
}
