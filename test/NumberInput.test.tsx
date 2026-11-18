import { act, createRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumberInput } from '../src';
import type { NumberInputProps } from '../src';

const getInput = () => screen.getByRole('spinbutton') as HTMLInputElement;

function setup(props: NumberInputProps = {}) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  const utils = render(<NumberInput locale="en-US" onChange={onChange} {...props} />);
  return { ...utils, onChange, user, input: getInput() };
}

function Controlled(props: NumberInputProps & { initial?: number | null }) {
  const { initial = null, ...rest } = props;
  const [value, setValue] = useState<number | null>(initial);
  return (
    <>
      <NumberInput locale="en-US" {...rest} value={value} onChange={v => { setValue(v); rest.onChange?.(v); }} />
      <output data-testid="value">{String(value)}</output>
      <button type="button" onClick={() => setValue(42)}>set 42</button>
    </>
  );
}

describe('display', () => {
  it('formats the value when not focused and shows the raw value when focused', async () => {
    const { input, user } = setup({ defaultValue: 1234.5 });
    expect(input).toHaveValue('1,234.5');
    await user.click(input);
    expect(input).toHaveValue('1234.5');
    await user.tab();
    expect(input).toHaveValue('1,234.5');
  });

  it('accepts string values', () => {
    setup({ defaultValue: '56' });
    expect(getInput()).toHaveValue('56');
  });

  it('pads decimals with precision', () => {
    setup({ defaultValue: 3.1, precision: 2 });
    expect(getInput()).toHaveValue('3.10');
  });

  it('uses the locale', () => {
    render(<NumberInput locale="de-DE" defaultValue={1234.5} />);
    expect(getInput()).toHaveValue('1.234,5');
  });

  it('adds currency symbol on the side used by the locale', () => {
    const { unmount } = render(<NumberInput locale="en-US" format="currency" defaultValue={12} />);
    expect(getInput()).toHaveValue('$ 12');
    unmount();
    render(<NumberInput locale="fr-FR" format="currency" defaultValue={12.5} precision={2} />);
    expect(getInput()).toHaveValue('12,50 €');
  });

  it('supports explicit currency, currencySymbol, prefix, suffix and percentage', () => {
    const { rerender } = render(<NumberInput locale="en-US" format="currency" currency="EUR" defaultValue={5} />);
    expect(getInput()).toHaveValue('€ 5');
    rerender(<NumberInput locale="en-US" format="currency" currencySymbol="USD" currencyPosition="end" defaultValue={5} />);
    expect(getInput()).toHaveValue('5 USD');
    rerender(<NumberInput locale="en-US" format="percentage" defaultValue={5} />);
    expect(getInput()).toHaveValue('5 %');
    rerender(<NumberInput locale="en-US" prefix="~" suffix="kg" defaultValue={5} />);
    expect(getInput()).toHaveValue('~ 5 kg');
  });

  it('exposes ARIA attributes', () => {
    setup({ defaultValue: 5, minValue: 0, maxValue: 10 });
    const input = getInput();
    expect(input).toHaveAttribute('aria-valuenow', '5');
    expect(input).toHaveAttribute('aria-valuemin', '0');
    expect(input).toHaveAttribute('aria-valuemax', '10');
  });
});

describe('typing', () => {
  it('calls onChange with numbers', async () => {
    const { input, user, onChange } = setup();
    await user.type(input, '12.5');
    expect(onChange).toHaveBeenLastCalledWith(12.5);
    expect(input).toHaveValue('12.5');
  });

  it('ignores letters', async () => {
    const { input, user, onChange } = setup();
    await user.type(input, '1a2');
    expect(input).toHaveValue('12');
    expect(onChange).toHaveBeenLastCalledWith(12);
  });

  it('accepts "." and "," as decimal delimiter for fr-FR', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<NumberInput locale="fr-FR" onChange={onChange} />);
    const input = getInput();
    await user.type(input, '12.5');
    expect(input).toHaveValue('12,5');
    expect(onChange).toHaveBeenLastCalledWith(12.5);
    await user.clear(input);
    await user.type(input, '7,25');
    expect(input).toHaveValue('7,25');
    expect(onChange).toHaveBeenLastCalledWith(7.25);
    await user.tab();
    expect(input).toHaveValue('7,25');
  });

  it('allows a single decimal delimiter', async () => {
    const { input, user } = setup();
    await user.type(input, '1.2.3');
    expect(input).toHaveValue('1.23');
  });

  it('limits decimals to precision', async () => {
    const { input, user, onChange } = setup({ precision: 2 });
    await user.type(input, '1.2345');
    expect(input).toHaveValue('1.23');
    expect(onChange).toHaveBeenLastCalledWith(1.23);
  });

  it('refuses decimals when allowFloat is false', async () => {
    const { input, user, onChange } = setup({ allowFloat: false });
    await user.type(input, '1.5');
    expect(input).toHaveValue('15');
    expect(onChange).toHaveBeenLastCalledWith(15);
  });

  it('refuses negative numbers when allowNegative is false', async () => {
    const { input, user, onChange } = setup({ allowNegative: false });
    await user.type(input, '-5');
    expect(input).toHaveValue('5');
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it('"-" toggles the sign wherever the caret is', async () => {
    const { input, user, onChange } = setup({ defaultValue: 5 });
    await user.click(input);
    await user.keyboard('-');
    expect(onChange).toHaveBeenLastCalledWith(-5);
    await user.keyboard('-');
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it('emits null when emptied', async () => {
    const { input, user, onChange } = setup({ defaultValue: 5 });
    await user.clear(input);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('uses valueOnEmpty when allowEmpty is false', async () => {
    const { input, user, onChange } = setup({ defaultValue: 5, allowEmpty: false, valueOnEmpty: 1 });
    await user.clear(input);
    expect(onChange).not.toHaveBeenCalled();
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(input).toHaveValue('1');
  });

  it('clamps to min / max on blur only', async () => {
    const { input, user, onChange } = setup({ minValue: 10, maxValue: 100 });
    await user.type(input, '500');
    expect(onChange).toHaveBeenLastCalledWith(50); // "50" was in range
    await user.tab();
    expect(onChange).toHaveBeenLastCalledWith(100);
    expect(input).toHaveValue('100');

    await user.clear(input);
    await user.type(input, '5');
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(10);
  });

  it('Escape restores the value present when the field got the focus', async () => {
    const { input, user, onChange } = setup({ defaultValue: 3 });
    await user.click(input);
    await user.keyboard('{End}9');
    expect(onChange).toHaveBeenLastCalledWith(39);
    await user.keyboard('{Escape}');
    expect(onChange).toHaveBeenLastCalledWith(3);
    expect(input).toHaveValue('3');
  });

  it('parses pasted formatted text', async () => {
    const { input, user, onChange } = setup();
    await user.click(input);
    await user.paste('$ 1,234.50');
    expect(onChange).toHaveBeenLastCalledWith(1234.5);
  });
});

describe('stepping', () => {
  it('ArrowUp / ArrowDown / Shift / PageUp', async () => {
    const { input, user, onChange } = setup({ defaultValue: 5 });
    await user.click(input);
    await user.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(6);
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith(4);
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}');
    expect(onChange).toHaveBeenLastCalledWith(14);
    await user.keyboard('{PageDown}');
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it('decimal steps without float artefacts and respects max', async () => {
    const { input, user, onChange } = setup({ defaultValue: 0.1, step: 0.1, maxValue: 0.4 });
    await user.click(input);
    await user.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(0.2);
    await user.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(0.3);
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(0.4);
  });

  it('steps from an empty field to initialStep', async () => {
    const { input, user, onChange } = setup({ initialStep: 7 });
    await user.click(input);
    await user.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(7);
  });

  it('supports a custom stepFn', async () => {
    const { input, user, onChange } = setup({
      defaultValue: 2,
      stepFn: (value, direction) => (value ?? 1) * (direction === 1 ? 2 : 0.5),
    });
    await user.click(input);
    await user.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it('steps with the wheel only when focused', () => {
    const { input, onChange } = setup({ defaultValue: 1 });
    fireEvent.wheel(input, { deltaY: -100 });
    expect(onChange).not.toHaveBeenCalled();
    act(() => input.focus());
    fireEvent.wheel(input, { deltaY: -100 });
    expect(onChange).toHaveBeenLastCalledWith(2);
    fireEvent.wheel(input, { deltaY: 100 });
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('does not step when disabled or readOnly', async () => {
    const { input, user, onChange, rerender } = setup({ defaultValue: 1, readOnly: true });
    await user.click(input);
    await user.keyboard('{ArrowUp}');
    expect(onChange).not.toHaveBeenCalled();
    rerender(<NumberInput locale="en-US" onChange={onChange} defaultValue={1} disabled />);
    expect(getInput()).toBeDisabled();
  });

  describe('spinner arrows', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('steps once on click and spins while held', () => {
      const onChange = vi.fn();
      const { container } = render(
        <NumberInput locale="en-US" defaultValue={0} onChange={onChange} stepDelay={50} triggerChangeOnSpin={false} />
      );
      const up = container.querySelector('.locale-number-input__spinner-arrow--up')!;

      fireEvent.pointerDown(up, { button: 0 });
      expect(onChange).toHaveBeenLastCalledWith(1);

      act(() => vi.advanceTimersByTime(300 + 50 * 3));
      expect(getInput()).toHaveValue('4');
      expect(onChange).toHaveBeenCalledTimes(1); // triggerChangeOnSpin=false

      fireEvent.pointerUp(document);
      expect(onChange).toHaveBeenLastCalledWith(4);

      act(() => vi.advanceTimersByTime(500));
      expect(getInput()).toHaveValue('4');
    });

    it('emits while spinning with triggerChangeOnSpin', () => {
      const onChange = vi.fn();
      const { container } = render(
        <NumberInput locale="en-US" defaultValue={0} onChange={onChange} stepDelay={50} triggerChangeOnSpinDelay={0} />
      );
      const down = container.querySelector('.locale-number-input__spinner-arrow--down')!;
      fireEvent.pointerDown(down, { button: 0 });
      act(() => vi.advanceTimersByTime(300 + 50 * 2));
      expect(onChange.mock.calls.map(c => c[0])).toEqual([-1, -2, -3]);
      fireEvent.pointerUp(document);
    });
  });
});

describe('clear button', () => {
  it('clears the value', async () => {
    const onClear = vi.fn();
    const { user, onChange } = setup({ defaultValue: 8, onClear });
    await user.click(screen.getByRole('button', { name: 'Clear value' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(onClear).toHaveBeenCalled();
    expect(getInput()).toHaveValue('');
    expect(getInput()).toHaveFocus();
  });

  it('is hidden without value', () => {
    const { container } = setup();
    expect(
      container.querySelector('.locale-number-input__clear-button-wrapper--hidden')
    ).not.toBeNull();
  });
});

describe('controlled usage', () => {
  it('follows the value prop', async () => {
    const user = userEvent.setup();
    render(<Controlled initial={1} />);
    const input = getInput();
    await user.click(input);
    await user.keyboard('{ArrowUp}');
    expect(screen.getByTestId('value')).toHaveTextContent('2');
    await user.clear(input);
    await user.type(input, '3.');
    expect(input).toHaveValue('3.');
    expect(screen.getByTestId('value')).toHaveTextContent('3');
    await user.click(screen.getByText('set 42'));
    expect(input).toHaveValue('42');
  });
});

describe('forms and ref API', () => {
  it('renders a hidden input with the raw value', () => {
    const { container } = setup({ name: 'price', defaultValue: 1234.5 });
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.name).toBe('price');
    expect(hidden.value).toBe('1234.5');
  });

  it('exposes imperative methods', () => {
    const ref = createRef<NumberInput>();
    const onChange = vi.fn();
    render(<NumberInput ref={ref} locale="en-US" defaultValue={10} onChange={onChange} />);
    expect(ref.current!.getValue()).toBe(10);
    act(() => ref.current!.focus());
    expect(getInput()).toHaveFocus();
    act(() => ref.current!.step(1, { step: 0.5 }));
    expect(onChange).toHaveBeenLastCalledWith(10.5);
  });

  it('passes wrapperProps and inputProps', async () => {
    const onClick = vi.fn();
    const onKeyUp = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <NumberInput
        wrapperProps={{ onClick, 'data-x': 'y', className: 'extra' } as never}
        inputProps={{ onKeyUp, 'aria-label': 'Amount' }}
      />
    );
    const input = screen.getByLabelText('Amount');
    await user.type(input, '1');
    expect(onClick).toHaveBeenCalled();
    expect(onKeyUp).toHaveBeenCalled();
    expect(container.firstElementChild).toHaveClass('extra', 'locale-number-input--theme-default-light');
  });
});
