# react-locale-number-input

Locale-aware number input for React, written in TypeScript.

- Formats per locale with `Intl`: `1,234.5` (en-US), `1.234,5` (de-DE), `1 234,5` (fr-FR)…
- Accepts both `.` and `,` as the decimal key and converts it to the locale's delimiter
- Currency (auto-detected from the locale or given as an ISO code), percentage, prefix and suffix
- `minValue` / `maxValue`, `precision`, integers only, positive only, required (non-empty)
- Spinner arrows (hold to spin), ArrowUp / ArrowDown, Shift for big steps, PageUp / PageDown, mouse wheel
- Clear button, Escape to undo, Enter to commit
- Accessible (`role="spinbutton"` and the `aria-value*` attributes), right-to-left support, 11 themes
- Pasted text is parsed (`$ 1,234.50` → `1234.5`) and a hidden input keeps the raw value for HTML forms
- Works with React 17, 18 and 19, ships ESM and CJS builds plus TypeScript types, and is marked `"use client"` for Next.js

Based on the `NumericInput` of
[@inovua/reactdatagrid-community](https://github.com/inovua/reactdatagrid) (MIT).

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
| `value` | `number \| string \| null` | – | Controlled value (`null` = empty) |
| `defaultValue` | `number \| string \| null` | – | Initial value (uncontrolled) |
| `onChange` | `(value: number \| null) => void` | – | Called with the numeric value |
| `locale` | `string` | browser language | BCP 47 locale, e.g. `"fr-FR"` |
| `precision` | `number` | – | Number of decimals: typing is limited to it and the display is padded to it |
| `minValue` / `maxValue` | `number \| string` | – | Bounds, applied on blur / Enter and when stepping |
| `allowNegative` | `boolean` | `true` | |
| `allowFloat` | `boolean` | `true` | |
| `allowEmpty` | `boolean` | `true` | When `false`, an empty field becomes `valueOnEmpty` (or 0, clamped) on blur |
| `valueOnEmpty` | `number \| string` | – | |
| `numbersOnly` | `boolean` | `true` | Filter non-numeric characters while typing |
| `format` | `"number" \| "currency" \| "percentage"` | `"number"` | |
| `currency` | `string` | currency of the locale's region | ISO 4217 code (`"EUR"`, `"USD"`…) |
| `currencySymbol` | `string` | – | Overrides the symbol |
| `currencyDisplay` | `"symbol" \| "narrowSymbol" \| "code" \| "name"` | `"symbol"` | |
| `currencyPosition` | `"start" \| "end"` | as usual for the locale | |
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
ref.current.step(1);                     // one step up
ref.current.step(-1, { step: 0.1 });     // custom step
ref.current.startSpin(1);                // spins until stopSpin()
ref.current.stopSpin();
ref.current.getInput();                  // HTMLInputElement
```

## Helpers

```ts
import {
  parseNumber,           // parseNumber('1.234,5', 'de-DE') === 1234.5
  formatNumber,          // formatNumber(1234.5, { locale: 'fr-FR', precision: 2 }) === '1 234,50'
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

MIT. Copyright © INOVUA TRADING (original NumericInput) and the contributors of this package.
