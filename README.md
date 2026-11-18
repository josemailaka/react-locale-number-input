# react-locale-number-input

Locale-aware number input for React, written in TypeScript.

**[▶ Live demo](https://josemailaka.github.io/react-locale-number-input/)**: try the locales,
currencies, the `preset="amount"` money field and the headless hook in your browser.

- Thousands separators shown while typing, with natural caret and Backspace handling
- Formats per locale with `Intl`: `1,234.5` (en-US), `1.234,5` (de-DE), `1 234,5` (fr-FR)…
- Accepts both `.` and `,` as the decimal key and converts it to the locale's delimiter
- Currency (auto-detected from the locale or given as an ISO code), percentage, prefix and suffix
- `minValue` / `maxValue`, `precision`, integers only, positive only, required (non-empty)
- Spinner arrows (hold to spin), ArrowUp / ArrowDown, Shift for big steps, PageUp / PageDown, mouse wheel
- Clear button, Escape to undo, Enter to commit
- Ready for money: exact decimal values (no float errors), validation instead of silent clamping, currency decimals, rounding modes, strict paste, accounting format (`preset="amount"`)
- Accessible (`role="spinbutton"` and the `aria-value*` attributes), right-to-left support, 11 themes
- Pasted text is parsed (`$ 1,234.50` → `1234.5`) and a hidden input keeps the raw value for HTML forms
- Built with hooks: use the `NumberInput` component, or the headless `useNumberInput` hook with your own markup
- Works with React 17, 18 and 19, ships ESM and CJS builds plus TypeScript types, and is marked `"use client"` for Next.js

## Installation

```bash
npm install react-locale-number-input
```

## Usage

```tsx
import { useState } from 'react';
import { NumberInput } from 'react-locale-number-input';
import 'react-locale-number-input/index.css';

export function PriceField() {
  const [price, setPrice] = useState<number | null>(1234.5);

  return (
    <NumberInput
      locale="fr-FR"
      format="currency"
      precision={2}
      minValue={0}
      value={price}
      onChange={setPrice} // number | null
    />
  );
}
```

Uncontrolled:

```tsx
<NumberInput defaultValue={10} step={0.5} onChange={value => console.log(value)} />
```

### Themes

`index.css` contains the base styles and the default theme (`default-light`).
To use another theme, also import its CSS file and set the `theme` prop:

```tsx
import 'react-locale-number-input/index.css';
import 'react-locale-number-input/themes/blue-dark.css';

<NumberInput theme="blue-dark" />;
```

The available themes are `default`, `default-light`, `default-dark`, `amber-light`, `amber-dark`,
`blue-light`, `blue-dark`, `green-light`, `green-dark`, `pink-light` and `pink-dark`. Import
`themes/all.css` to get all of them.

The SCSS sources are shipped in `react-locale-number-input/scss/*`. Every variable is `!default`,
so you can override any of them before importing the sources.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `preset` | `"amount"` | – | Safe defaults for money, see [Money and finance](#money-and-finance) |
| `value` | `number \| string \| null` | – | Controlled value (`null` = empty). A decimal string (`"1234.50"`) keeps big amounts exact |
| `defaultValue` | `number \| string \| null` | – | Initial value (uncontrolled) |
| `onChange` | `(value: number \| null) => void` | – | Called with the numeric value |
| `onValueChange` | `(details) => void` | – | `{ value, valueAsString, formattedValue, error }`: use `valueAsString` for amounts |
| `onErrorChange` | `(error) => void` | – | `"min" \| "max" \| "required" \| null` |
| `locale` | `string` | browser language | BCP 47 locale, e.g. `"fr-FR"` |
| `precision` | `number \| "auto"` | – | Number of decimals: typing is limited to it and the display is padded to it. `"auto"`: decimals of the currency (EUR 2, JPY 0, KWD 3) |
| `roundingMode` | `"halfCeil" \| "halfExpand" \| "halfEven" \| "halfFloor" \| "halfTrunc" \| "trunc" \| "expand" \| "ceil" \| "floor"` | `"halfCeil"` | Rounding to `precision` (and to integers). `halfExpand` = commercial, `halfEven` = banker's |
| `clampBehavior` | `"clamp" \| "validate"` | `"clamp"` | `validate`: out of range values are kept and reported (`error`, `aria-invalid`) instead of being replaced |
| `pasteMode` | `"lenient" \| "strict"` | `"lenient"` | `strict`: ambiguous (`1,234`), negative or too precise pasted texts are rejected |
| `onPasteRejected` | `({ text, reason }) => void` | – | `reason`: `"ambiguous" \| "invalid" \| "negative" \| "decimals"` |
| `required` | `boolean` | `false` | An empty field is an error (`"required"`) |
| `minValue` / `maxValue` | `number \| string` | – | Bounds, applied on blur / Enter and when stepping |
| `allowNegative` | `boolean` | `true` | |
| `allowFloat` | `boolean` | `true` | |
| `allowEmpty` | `boolean` | `true` | When `false`, an empty field becomes `valueOnEmpty` (or 0, clamped) on blur |
| `valueOnEmpty` | `number \| string` | – | |
| `numbersOnly` | `boolean` | `true` | Filter non-numeric characters while typing |
| `groupWhileEditing` | `boolean` | `true` | Show the thousands separators while typing (`1,234,567`) |
| `format` | `"number" \| "currency" \| "percentage"` | `"number"` | |
| `currency` | `string` | currency of the locale's region | ISO 4217 code (`"EUR"`, `"USD"`…) |
| `currencySymbol` | `string` | – | Overrides the symbol |
| `currencyDisplay` | `"symbol" \| "narrowSymbol" \| "code" \| "name"` | `"symbol"` | |
| `currencyPosition` | `"start" \| "end"` | as usual for the locale | |
| `currencySign` | `"standard" \| "accounting"` | `"standard"` | `accounting`: negative amounts in parentheses `(1,234.50 €)` |
| `prefix` / `suffix` | `string` | – | Shown when the field is not focused |
| `step` | `number` | `1` | |
| `shiftStep` | `number` | `10` | Used with Shift and with PageUp / PageDown |
| `initialStep` | `number` | – | Value used when stepping from an empty field |
| `stepFn` | `(value, direction, info) => number \| null` | – | Custom step logic |
| `stepDelay` | `number` | `60` | ms between two steps while an arrow is held |
| `spinStartDelay` | `number` | `300` | ms before a held arrow starts spinning |
| `spinOnArrowKeys` | `boolean` | `true` | |
| `stepOnWheel` | `boolean` | `true` | |
| `requireFocusOnStep` | `boolean` | `true` | The wheel only works while the field is focused |
| `triggerChangeOnSpin` | `boolean` | `true` | Call `onChange` while spinning, not only when it stops |
| `triggerChangeOnSpinDelay` | `number` | `80` | Minimum ms between two `onChange` calls while spinning |
| `enableSpinnerTools` | `boolean` | `true` | |
| `enableClearButton` | `boolean` | `true` | |
| `acceptClearToolFocus` | `boolean` | `false` | Lets the clear button take keyboard focus |
| `toolPosition` | `"start" \| "end"` | `"end"` | |
| `clearButtonLabel` | `string` | `"Clear value"` | Accessible label of the clear button |
| `onClear` | `() => void` | – | |
| `theme` | `string` | `"default-light"` | |
| `rtl` | `boolean` | `false` | |
| `disabled` / `readOnly` | `boolean` | `false` | |
| `selectAllOnFocus` | `boolean` | `false` | |
| `name` | `string` | – | Renders a hidden input with the raw value (`1234.5`) for HTML forms |
| `placeholder`, `id`, `autoFocus`, `tabIndex`, `size` | | | Passed to the inner input |
| `onFocus` / `onBlur` / `onKeyDown` | | | |
| `inputProps` | `InputHTMLAttributes` | – | Props for the inner input |
| `wrapperProps` | `HTMLAttributes<HTMLDivElement>` | – | Props for the wrapping div |
| `arrowSize`, `arrowColor`, `arrowStyle`, `arrowUpStyle`, `arrowDownStyle` | | | Spinner customisation |
| `clearButtonSize`, `clearButtonColor`, `clearButtonStyle`, `clearButtonClassName` | | | Clear button customisation |
| `renderClearIcon`, `renderArrowUpIcon`, `renderArrowDownIcon` | `(props) => ReactNode` | – | Custom icons |
| `className`, `style`, `rootClassName` | | | |

## Money and finance

`preset="amount"` turns on safe defaults for money:

```tsx
<NumberInput
  preset="amount"
  locale="fr-FR"        // always explicit for money
  format="currency"
  currency="EUR"        // always explicit for money
  maxValue={10000}
  value={amount}        // decimal string, e.g. "1234.50"
  onValueChange={({ valueAsString, error }) => {
    setAmount(valueAsString); // exact: send it to the backend as is
    setError(error);          // "max" if 50000 was typed: never silently changed
  }}
/>
```

| Risk | What the package does |
| --- | --- |
| Binary floats (`0.1 + 0.2`, more than 15 digits) | Values are exact decimal strings internally (BigInt); `valueAsString`, `getValueAsString()` and the hidden form input give the exact value |
| Amount silently replaced by min / max | `clampBehavior="validate"` keeps what was typed and reports `error` / `aria-invalid` / `--invalid` class |
| Wrong number of decimals per currency | `precision="auto"`: 2 for EUR, 0 for JPY, 3 for KWD… |
| Accidental change (wheel, arrows, spinner, `-` key) | Disabled by the preset |
| Rounding rules | `roundingMode`: `halfExpand` (preset), `halfEven` (banker's), `trunc`… |
| Pasting `1,234` (1234 or 1.234?) | `pasteMode="strict"` rejects ambiguous texts and calls `onPasteRejected`; `1.234.567,89` and `(1,234.50)` are understood |
| Negative amounts | `currencySign="accounting"` shows `(1,234.50 €)`, and the `--negative` class is set |
| Locale of the user's browser | A development warning is shown when `locale` / `currency` are missing |

The preset sets: no spinner, no wheel, no arrow keys, `allowNegative={false}`, `precision="auto"`,
`clampBehavior="validate"`, `roundingMode="halfExpand"`, `pasteMode="strict"`. Any prop given
explicitly wins, e.g. `allowNegative` for refunds.

> Always validate amounts again on the server, with decimal arithmetic (`BigDecimal`, `NUMERIC`…).

## Keyboard

| Key | Action |
| --- | --- |
| ArrowUp / ArrowDown | ± `step` (± `shiftStep` with Shift) |
| PageUp / PageDown | ± `shiftStep` |
| `.` or `,` | Types the locale's decimal delimiter |
| `-` | Toggles the sign, wherever the caret is |
| `+` | Makes the number positive |
| Enter | Commits the value (applies min / max / precision) |
| Escape | Restores the value the field had when it got focus |

## Ref API

```tsx
const ref = useRef<NumberInput>(null);
<NumberInput ref={ref} />;

ref.current.focus();
ref.current.blur();
ref.current.getValue();                  // number | null
ref.current.getValueAsString();          // exact decimal string | null
ref.current.getError();                  // "min" | "max" | "required" | null
ref.current.step(1);                     // one step up
ref.current.step(-1, { step: 0.1 });     // custom step
ref.current.startSpin(1);                // spins until stopSpin()
ref.current.stopSpin();
ref.current.clear();
ref.current.getInput();                  // HTMLInputElement
```

`NumberInput` is a function component. Its ref type is `NumberInputHandle`, also exported under the
name `NumberInput`, so `useRef<NumberInput>(null)` works.

## Headless hook: `useNumberInput`

To use your own markup or design system, `useNumberInput` gives you the same behaviour without any
markup: parsing, grouping while typing, stepping, spinning, clearing and the ARIA attributes.

```tsx
import { useNumberInput } from 'react-locale-number-input';

function PriceField() {
  const n = useNumberInput({ locale: 'fr-FR', format: 'currency', defaultValue: 10, minValue: 0 });

  return (
    <div className="my-field">
      <button type="button" {...n.decrementProps}>−</button>
      <input {...n.inputProps} aria-label="Price" />
      <button type="button" {...n.incrementProps}>+</button>
      <button {...n.clearButtonProps} aria-label="Clear">×</button>
      {n.hiddenInputProps && <input {...n.hiddenInputProps} />}
    </div>
  );
}
```

It accepts the behaviour props of the table above (`value`, `onChange`, `locale`, `format`, `precision`,
`minValue`, `step`…). It returns:

| Field | Description |
| --- | --- |
| `inputProps` | Spread on your `<input>` (value, handlers, `role="spinbutton"`, `aria-value*`, `ref`) |
| `incrementProps` / `decrementProps` | Spread on your spin buttons (click = one step, hold = spin) |
| `clearButtonProps` | Spread on your clear `<button>` (`disabled` when empty) |
| `hiddenInputProps` | Hidden input with the raw value, when `name` is given |
| `value`, `valueAsString`, `displayValue`, `text`, `formattedText` | Current value and texts |
| `error`, `invalid` | Validation error, and whether to show it ("required" only once touched) |
| `focused`, `spinDirection`, `hasValue`, `min`, `max` | State, for styling |
| `api` | The same imperative API as the ref (stable object) |

## Helpers

```ts
import {
  parseNumber,           // parseNumber('1.234,5', 'de-DE') === 1234.5
  formatNumber,          // formatNumber(1234.5, { locale: 'fr-FR', precision: 2 }) === '1 234,50'
  groupIntegerDigits,    // groupIntegerDigits('1234567', 'en-IN') === '12,34,567'
  getDecimalDelimiter,   // getDecimalDelimiter('fr-FR') === ','
  getDigitGroupDelimiter,
  getCurrencyInfo,       // getCurrencyInfo('en-US') -> { symbol: '$', position: 'start' }
  getCurrencyCodeForLocale, // 'fr' -> 'EUR'
} from 'react-locale-number-input';
```

## Development

Requires Node.js 22.18+ (developed on Node 26).

```bash
npm install
npm run dev          # playground at http://localhost:5173
npm test             # unit and component tests (Vitest + Testing Library)
npm run typecheck
npm run build        # dist/: ESM + CJS + .d.ts + CSS
npm run verify       # everything + publint + arethetypeswrong
```

## License

MIT, see [LICENSE](LICENSE).
