# Changelog

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
