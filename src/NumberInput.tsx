/**
 * Locale aware numeric input.
 */

import { forwardRef, useImperativeHandle } from 'react';
import type { ReactNode } from 'react';

import type {
  IconRenderProps,
  NumberInputHandle,
  NumberInputProps,
  SpinDirection,
} from './types';
import { resolveProps } from './core';
import type { ResolvedProps } from './core';
import { useNumberInput } from './useNumberInput';
import type { UseNumberInputResult } from './useNumberInput';

const join = (...classNames: Array<string | false | null | undefined>) =>
  classNames.filter(Boolean).join(' ');

function sizeToSvgProps(size?: number | [number, number]): IconRenderProps {
  if (size == null) {
    return {};
  }
  return Array.isArray(size)
    ? { width: size[0], height: size[1] }
    : { width: size, height: size };
}

const ARROW_PATHS = {
  1: 'M5.262.262l4.106 4.106c.144.144.144.379 0 .524-.07.069-.164.108-.262.108H.894c-.204 0-.37-.166-.37-.37 0-.099.039-.193.108-.262L4.738.262c.145-.145.38-.145.524 0z',
  [-1]: 'M4.738 4.738L.632.632C.488.488.488.253.632.108.702.04.796 0 .894 0h8.212c.204 0 .37.166.37.37 0 .099-.039.193-.108.262L5.262 4.738c-.145.145-.38.145-.524 0z',
} as const;

function renderArrowIcon(
  direction: SpinDirection,
  svgProps: IconRenderProps,
  p: ResolvedProps
): ReactNode {
  const renderer = direction === 1 ? p.renderArrowUpIcon : p.renderArrowDownIcon;
  const custom = renderer?.({ ...svgProps });
  if (custom !== undefined) {
    return custom;
  }
  const height = typeof svgProps.height === 'number' ? svgProps.height / 2 : svgProps.height;
  return (
    <svg style={{ ...svgProps, height }} viewBox="0 0 10 5" aria-hidden="true">
      <path fillRule="evenodd" d={ARROW_PATHS[direction]} />
    </svg>
  );
}

function renderClearIcon(svgProps: IconRenderProps, p: ResolvedProps): ReactNode {
  const custom = p.renderClearIcon?.({ width: svgProps.width, height: svgProps.height });
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

function renderClearButton(p: ResolvedProps, n: UseNumberInputResult) {
  const root = p.rootClassName;
  const svgProps = sizeToSvgProps(p.clearButtonSize);
  if (p.clearButtonColor) {
    svgProps.fill = p.clearButtonColor;
  }
  const hidden = !p.enableClearButton || n.clearButtonProps.disabled;

  return (
    <div
      key="clearButton"
      className={join(
        `${root}__clear-button-wrapper`,
        hidden && `${root}__clear-button-wrapper--hidden`
      )}
    >
      <button
        {...n.clearButtonProps}
        disabled={hidden}
        aria-label={p.clearButtonLabel}
        title={p.clearButtonLabel}
        className={join(
          `${root}__clear-button`,
          `${root}__clear-button--${p.rtl ? 'rtl' : 'ltr'}`,
          p.clearButtonClassName
        )}
        style={{ ...p.clearButtonStyle }}
        tabIndex={p.acceptClearToolFocus ? 0 : -1}
      >
        {renderClearIcon(svgProps, p)}
      </button>
    </div>
  );
}

function renderSpinner(p: ResolvedProps, n: UseNumberInputResult) {
  const root = p.rootClassName;
  const dir = p.rtl ? 'rtl' : 'ltr';
  const svgProps = sizeToSvgProps(p.arrowSize);
  if (p.arrowColor) {
    svgProps.fill = p.arrowColor;
  }

  const wrapperClassName = p.enableSpinnerTools
    ? `${root}__spinner-wrapper ${root}__spinner-wrapper--${dir}`
    : `${root}__spinner-wrapper-hidden ${root}__spinner-wrapper-hidden--${dir}`;

  const arrow = (direction: SpinDirection) => (
    <span
      {...(direction === 1 ? n.incrementProps : n.decrementProps)}
      className={join(
        `${root}__spinner-arrow`,
        `${root}__spinner-arrow--${direction === 1 ? 'up' : 'down'}`,
        n.spinDirection === direction && `${root}__spinner-arrow--active`
      )}
      style={{ ...p.arrowStyle, ...(direction === 1 ? p.arrowUpStyle : p.arrowDownStyle) }}
    >
      {renderArrowIcon(direction, svgProps, p)}
    </span>
  );

  return (
    <div key="spinnerTool" className={wrapperClassName} aria-hidden="true">
      {p.enableSpinnerTools ? (
        <>
          {arrow(1)}
          {arrow(-1)}
        </>
      ) : null}
    </div>
  );
}

const NumberInputComponent = forwardRef<NumberInputHandle, NumberInputProps>(
  function NumberInput(props, ref) {
    const userInputProps = props.inputProps ?? {};

    const n = useNumberInput({
      ...props,
      onFocus: event => {
        userInputProps.onFocus?.(event);
        props.onFocus?.(event);
      },
      onBlur: event => {
        userInputProps.onBlur?.(event);
        props.onBlur?.(event);
      },
      onKeyDown: event => {
        userInputProps.onKeyDown?.(event);
        props.onKeyDown?.(event);
      },
      onPaste: event => {
        userInputProps.onPaste?.(event);
        props.onPaste?.(event);
      },
    });

    useImperativeHandle(ref, () => n.api, [n.api]);

    const p = resolveProps(props);
    const root = p.rootClassName;

    const className = join(
      root,
      p.theme && `${root}--theme-${p.theme}`,
      `${root}--${p.rtl ? 'rtl' : 'ltr'}`,
      p.disabled && `${root}--disabled`,
      p.readOnly && `${root}--read-only`,
      n.focused && `${root}--focused`,
      n.invalid && `${root}--invalid`,
      n.displayValue != null && n.displayValue < 0 && `${root}--negative`,
      p.enableSpinnerTools && `${root}--enable-spinner-tools`,
      p.enableClearButton && `${root}--enable-clear-button`,
      p.className
    );

    // user handlers are composed above / below, the other inputProps may
    // override the defaults (aria-*, inputMode, autoComplete...)
    const {
      onChange: userOnChange,
      onFocus: _onFocus,
      onBlur: _onBlur,
      onKeyDown: _onKeyDown,
      onPaste: _onPaste,
      className: inputClassName,
      ...restInputProps
    } = userInputProps;
    const {
      ref: inputRef,
      value,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      onPaste,
      disabled,
      readOnly,
      ...a11yProps
    } = n.inputProps;

    const input = (
      <input
        key="input"
        size={Math.max(1, p.size || 0)} // without it, FF does not flex the input correctly
        placeholder={p.placeholder}
        id={p.id}
        autoFocus={p.autoFocus}
        tabIndex={p.tabIndex}
        {...a11yProps}
        {...restInputProps}
        ref={inputRef}
        type="text"
        className={join(`${root}__input`, inputClassName)}
        disabled={disabled}
        readOnly={readOnly}
        value={value}
        onChange={event => {
          userOnChange?.(event);
          onChange(event);
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />
    );

    const clearButton = renderClearButton(p, n);
    const spinner = renderSpinner(p, n);

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
        {n.hiddenInputProps ? <input {...n.hiddenInputProps} /> : null}
      </div>
    );
  }
);

NumberInputComponent.displayName = 'NumberInput';

/**
 * Locale aware number input with spinner, clear button, currency /
 * percentage formatting, min / max and precision.
 */
export const NumberInput = NumberInputComponent;

/**
 * Type of the `ref` of `NumberInput`, so that `useRef<NumberInput>(null)`
 * keeps working as with the 1.x class component.
 */
export type NumberInput = NumberInputHandle;

export default NumberInput;
