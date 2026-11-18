import { useState } from 'react';
import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumberInput } from '../src';
import type { NumberInputProps, NumberInputValueDetails } from '../src';

const getInput = () => screen.getByRole('spinbutton') as HTMLInputElement;

function setup(props: NumberInputProps = {}) {
  const onChange = vi.fn();
  const onValueChange = vi.fn<(d: NumberInputValueDetails) => void>();
  const user = userEvent.setup();
  const utils = render(
    <NumberInput locale="en-US" onChange={onChange} onValueChange={onValueChange} {...props} />
  );
  const last = () => onValueChange.mock.calls[onValueChange.mock.calls.length - 1]?.[0];
  return { ...utils, onChange, onValueChange, last, user, input: getInput() };
}

describe('1. exact values (valueAsString)', () => {
  it('keeps every digit of big amounts', async () => {
    const { input, user, last, container } = setup({ name: 'amount' });
    await user.type(input, '12345678901234567.89');
    expect(last()).toMatchObject({ valueAsString: '12345678901234567.89' });
    expect(input).toHaveValue('12,345,678,901,234,567.89');
    await user.tab();
    expect(input).toHaveValue('12,345,678,901,234,567.89');
    expect(container.querySelector('input[type="hidden"]')).toHaveValue('12345678901234567.89');
  });

  it('accepts an exact string as controlled value', () => {
    render(<NumberInput locale="fr-FR" value="98765432109876543.21" precision={2} />);
    expect(getInput()).toHaveValue('98 765 432 109 876 543,21');
  });

  it('gives the formatted value and the error', async () => {
    const { input, user, last } = setup({ locale: 'fr-FR', format: 'currency', currency: 'EUR', precision: 2 });
    await user.type(input, '1234,5');
    expect(last()).toEqual({
      value: 1234.5,
      valueAsString: '1234.5',
      formattedValue: '1 234,50 €',
      error: null,
    });
  });

  it('exposes getValueAsString() on the ref', () => {
    const ref = createRef<NumberInput>();
    render(<NumberInput ref={ref} defaultValue="0.1" />);
    expect(ref.current!.getValueAsString()).toBe('0.1');
  });
});

describe('2. validation instead of silent clamping', () => {
  it('keeps an amount above max and reports the error', async () => {
    const onErrorChange = vi.fn();
    const { input, user, last, onChange, container } = setup({
      maxValue: 10000,
      clampBehavior: 'validate',
      onErrorChange,
    });
    await user.type(input, '50000');
    await user.tab();
    expect(input).toHaveValue('50,000'); // not silently replaced by 10,000
    expect(onChange).toHaveBeenLastCalledWith(50000);
    expect(last()).toMatchObject({ valueAsString: '50000', error: 'max' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(container.firstElementChild).toHaveClass('locale-number-input--invalid');
    expect(onErrorChange).toHaveBeenLastCalledWith('max');

    await user.clear(input);
    await user.type(input, '500');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(onErrorChange).toHaveBeenLastCalledWith(null);
  });

  it('reports "min" and "required" (only once touched)', async () => {
    const { input, user, last } = setup({ minValue: 10, clampBehavior: 'validate', required: true });
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).not.toHaveAttribute('aria-invalid');
    await user.type(input, '5');
    expect(last()).toMatchObject({ error: 'min' });
    await user.clear(input);
    await user.tab();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(last()).toMatchObject({ valueAsString: null, error: 'required' });
  });

  it('still clamps by default', async () => {
    const { input, user, onChange } = setup({ maxValue: 100 });
    await user.type(input, '500');
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith(100);
  });
});

describe('3. precision="auto" follows the currency', () => {
  it.each([
    ['EUR', 'fr-FR', '12,345', '12,34 €'],
    ['JPY', 'ja-JP', '12.5', '￥ 125'],
    ['KWD', 'en-US', '1.2345', 'KWD 1.234'],
  ])('%s', async (currency, locale, typed, displayed) => {
    const user = userEvent.setup();
    render(<NumberInput locale={locale} format="currency" currency={currency} precision="auto" />);
    await user.type(getInput(), typed);
    await user.tab();
    expect(getInput()).toHaveValue(displayed);
  });
});

describe('4. preset="amount"', () => {
  it('disables everything that could change an amount by accident', async () => {
    const { input, user, onChange, container } = setup({
      preset: 'amount',
      format: 'currency',
      currency: 'EUR',
      locale: 'fr-FR',
      defaultValue: 100,
    });
    expect(container.querySelector('.locale-number-input__spinner-arrow')).toBeNull();
    await user.click(input);
    await user.keyboard('{ArrowUp}{PageUp}');
    fireEvent.wheel(input, { deltaY: -100 });
    await user.keyboard('-');
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('100,00');
  });

  it('lets explicit props win', () => {
    const { container } = setup({ preset: 'amount', enableSpinnerTools: true });
    expect(container.querySelector('.locale-number-input__spinner-arrow')).not.toBeNull();
  });

  it('validates instead of clamping and uses 2 decimals', async () => {
    const { input, user, last } = setup({ preset: 'amount', maxValue: 1000 });
    await user.type(input, '1500.999');
    await user.tab();
    expect(input).toHaveValue('1,500.99');
    expect(last()).toMatchObject({ valueAsString: '1500.99', error: 'max' });
  });
});

describe('5. roundingMode', () => {
  it.each([
    ['halfCeil', '-2.5', '-2'],
    ['halfExpand', '-2.5', '-3'],
    ['halfEven', '2.5', '2'],
    ['trunc', '2.9', '2'],
  ] as const)('%s (pasted value)', async (roundingMode, pasted, expected) => {
    const { input, user, last } = setup({ precision: 0, roundingMode });
    await user.click(input);
    await user.paste(pasted);
    expect(last()?.valueAsString).toBe(expected);
  });

  it('applies to controlled values with more decimals than precision', () => {
    render(<NumberInput locale="en-US" value="2.345" precision={2} roundingMode="halfEven" />);
    expect(getInput()).toHaveValue('2.34');
  });
});

describe('6. paste', () => {
  it('lenient: understands formats from other locales', async () => {
    const { input, user, last } = setup();
    await user.click(input);
    await user.paste('1.234.567,89');
    expect(last()?.valueAsString).toBe('1234567.89');
    await user.clear(input);
    await user.paste('(1,234.50)');
    expect(last()?.valueAsString).toBe('-1234.5');
  });

  it('inserts the pasted digits as written (trailing / leading zeros)', async () => {
    const { input, user } = setup({ groupWhileEditing: false });
    await user.click(input);
    await user.paste('10.50');
    expect(input).toHaveValue('10.50');
    input.setSelectionRange(2, 2);
    await user.paste('0007');
    expect(input).toHaveValue('100007.50');
  });

  it('lenient: rounds pasted decimals beyond precision', async () => {
    const { input, user, last } = setup({ precision: 2, roundingMode: 'halfExpand' });
    await user.click(input);
    await user.paste('1.235');
    expect(last()?.valueAsString).toBe('1.24');
  });

  it.each([
    ['1,234', 'ambiguous', {}],
    ['abc', 'invalid', {}],
    ['-50', 'negative', { allowNegative: false }],
    ['12.3456', 'decimals', { precision: 2 }],
    ['12.5', 'decimals', { allowFloat: false }],
  ] as const)('strict: rejects "%s" (%s)', async (text, reason, extra) => {
    const onPasteRejected = vi.fn();
    const { input, user, onChange } = setup({ pasteMode: 'strict', onPasteRejected, ...extra });
    await user.click(input);
    await user.paste(text);
    expect(onPasteRejected).toHaveBeenCalledWith({ text, reason });
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
  });

  it('strict: accepts unambiguous texts', async () => {
    const onPasteRejected = vi.fn();
    const { input, user, last } = setup({ pasteMode: 'strict', onPasteRejected, locale: 'fr-FR' });
    await user.click(input);
    await user.paste('1 234,56 €');
    expect(onPasteRejected).not.toHaveBeenCalled();
    expect(last()?.valueAsString).toBe('1234.56');
    expect(input).toHaveValue('1 234,56');
  });
});

describe('7. accounting format', () => {
  it('shows negative amounts in parentheses, with a CSS class', async () => {
    const { input, user, container } = setup({
      locale: 'en-US',
      format: 'currency',
      currency: 'USD',
      currencySign: 'accounting',
      defaultValue: -1234.5,
      precision: 2,
    });
    expect(input).toHaveValue('($ 1,234.50)');
    expect(container.firstElementChild).toHaveClass('locale-number-input--negative');
    await user.click(input);
    expect(input).toHaveValue('-1,234.50'); // editable form while focused
  });
});

describe('8. explicit locale warning', () => {
  it('warns in development for amounts without locale / currency', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<NumberInput format="currency" />);
    const messages = warn.mock.calls.map(c => String(c[0])).join('\n');
    expect(messages).toMatch(/without `locale`/);
    expect(messages).toMatch(/without `currency`/);
    warn.mockRestore();
  });

  it('does not warn for plain numbers', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<NumberInput />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('controlled amount with validation', () => {
  it('round-trips an exact string value', async () => {
    function Form() {
      const [amount, setAmount] = useState<string | null>('10.00');
      return (
        <>
          <NumberInput
            preset="amount"
            locale="en-US"
            format="currency"
            currency="USD"
            value={amount}
            onValueChange={d => setAmount(d.valueAsString)}
          />
          <output data-testid="amount">{String(amount)}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Form />);
    expect(getInput()).toHaveValue('$ 10.00');
    await user.clear(getInput());
    await user.type(getInput(), '99999999999999999.99');
    act(() => getInput().blur());
    expect(screen.getByTestId('amount')).toHaveTextContent('99999999999999999.99');
    expect(getInput()).toHaveValue('$ 99,999,999,999,999,999.99');
  });
});
