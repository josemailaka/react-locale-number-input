# Changelog

## 2.1.0: money and finance

All the new behaviours are opt-in: without the new props, typing, stepping and display are unchanged
(verified against 2.0.0 with 8,000+ random interactions). Only pasting changes; see "Fixed" below.

### New

- **Exact decimal values.** Values are handled internally as decimal strings with BigInt, never as
  binary floats.
  - New `onValueChange({ value, valueAsString, formattedValue, error })`.
  - New `getValueAsString()` on the ref, and `valueAsString` in `useNumberInput()`.
  - `value` / `defaultValue` accept exact strings (`"12345678901234567.89"`).
  - The hidden form input now holds the exact value.
- **Validation instead of silent clamping**: `clampBehavior="validate"` keeps an out-of-range amount
  and reports it.
  - `error` (`"min"`, `"max"`, `"required"`), `onErrorChange`, `getError()`.
  - `aria-invalid`, the `--invalid` CSS class, and the `required` prop with `aria-required`.
- **`precision="auto"`**: decimals of the currency (EUR 2, JPY 0, KWD 3). `getCurrencyInfo()` now
  also returns `code` and `digits`.
- **`preset="amount"`**: safe defaults for money. Spinner, wheel and arrow keys are off, negative
  values are refused, and it applies `precision="auto"`, `clampBehavior="validate"`,
  `roundingMode="halfExpand"` and `pasteMode="strict"`.
- **`roundingMode`**: `halfCeil` (default, unchanged), `halfExpand`, `halfEven` (banker's),
  `halfFloor`, `halfTrunc`, `trunc`, `expand`, `ceil`, `floor`.
- **`pasteMode="strict"`** with `onPasteRejected({ text, reason })`. Ambiguous (`1,234`), invalid,
  negative or too precise pasted texts are rejected.
- **`currencySign="accounting"`**: negative amounts in parentheses, `(1,234.50 €)`. A `--negative`
  CSS class is set for negative values.
- **Development warning** when an amount or currency field has no explicit `locale` / `currency`.
- New helpers: `parseDecimal`, `normalizeDecimal`, `numberToDecimal`, `addDecimal`, `compareDecimal`,
  `roundDecimal`, `interpretPastedNumber`.

### Fixed: pasting

| Pasted text | Locale | 2.0.0 | 2.1.0 |
| --- | --- | --- | --- |
| `1.234.567,89` | en-US | 1.23456789 | 1234567.89 |
| `$1,234.50` | de-DE | 1.2345 | 1234.5 |
| `1 234,5` | en-US | 12345 | 1234.5 |
| `1.239` | integer field | 1239 | 1 |
| `1.239` | precision 2 | 1.23 (truncated) | 1.24 (rounded with `roundingMode`) |
| `(1,234.50)` (accounting) | en-US | 1234.5 (sign lost) | -1234.5 |

## 2.0.0

### New

- **`useNumberInput` hook**: the whole behaviour of the component, without markup, for custom designs
  or design systems. It returns `inputProps`, `incrementProps`, `decrementProps`, `clearButtonProps`,
  `hiddenInputProps`, the current value and texts, and the imperative `api`.
- `clear()` method on the ref.
- New exported types: `NumberInputHandle`, `UseNumberInputProps`, `UseNumberInputResult`.

### Changed (why this is a major version)

- `NumberInput` is now a function component (hooks + `forwardRef`) instead of a class component.
  It is ready for the React Compiler, and its behaviour is unchanged (the 1.x test suite passes as is).
- The ref is now a `NumberInputHandle` object instead of the class instance. Every public method is
  still there (`focus`, `blur`, `getValue`, `getNumericValue`, `getInput`, `input`, `step`, `stepTo`,
  `startSpin`, `stopSpin`, `isFocused`, `isSpinning`), and `useRef<NumberInput>(null)` still compiles.
  **Breaking only** for code that read the instance internals (`ref.current.state`, `ref.current.props`)
  or used `instanceof NumberInput`.

## 1.1.0

- New `groupWhileEditing` prop (default `true`): the thousands separators are shown while typing
  (`1,234,567`). The caret stays in place, and Backspace / Delete next to a separator remove the digit.
  Set it to `false` to get the 1.0 behaviour (raw digits while editing).
- Grouping follows the locale conventions (`useGrouping: "auto"`): es-ES no longer groups 4 digit numbers,
  en-IN uses lakh grouping (`12,34,567`).
- New helpers: `groupIntegerDigits`, `groupNumberText`.
- The JavaScript build is minified: 20 KB instead of 34 KB (7.5 KB gzipped).

## 1.0.0


### Features completed

- Decimal typing now works in locales that use `,` (fr-FR, de-DE…): both `.` and `,` are accepted.
- `numbersOnly` is now applied: pasted or typed text is cleaned and formatted text can be pasted.
- `precision` limits typing and rounds the value (the `*OnControlledPrecision` flags were never used).
- `minValue` / `maxValue` are applied on blur / Enter instead of on every keystroke. The `mim` typo is fixed.
- The currency of the locale's region is found even without a region (`"fr"`), and 40 regions that were
  missing are added (KR, RU, TW, VN…). The new `currency` and `currencyDisplay` props are available, and the
  currency side follows the locale.
- Stepping keeps the step's decimals instead of rounding to 3 digits (0.1 + 0.2 = 0.3).
- The mouse wheel works with React 17+ (the listener is non-passive).
- Pointer events are supported (mouse, touch and pen), and timers and listeners are cleaned up on unmount.
- Escape, Enter, PageUp / PageDown and the `-` sign toggle are supported.
- New props: `readOnly`, `name` (hidden input for forms), `onClear`, `selectAllOnFocus`, `spinStartDelay`,
  `clearButtonLabel`, `id`, `autoFocus`, `tabIndex`.
- ARIA `spinbutton` attributes and `inputMode` for mobile keyboards are added.
- The global `window.isNumeric` is no longer defined. There is no `prop-types` dependency and no runtime dependency.
- `index.css` now includes the default theme (`default-light`).
