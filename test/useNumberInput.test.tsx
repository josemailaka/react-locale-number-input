import { StrictMode, act, createRef, useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumberInput, useNumberInput } from '../src';
import type { UseNumberInputProps } from '../src';

function Custom(props: UseNumberInputProps) {
  const n = useNumberInput({ locale: 'en-US', ...props });
  return (
    <div>
      <input {...n.inputProps} aria-label="amount" />
      <button type="button" aria-label="plus" {...n.incrementProps} />
      <button type="button" aria-label="minus" {...n.decrementProps} />
      <button {...n.clearButtonProps} aria-label="clear" />
      {n.hiddenInputProps ? <input {...n.hiddenInputProps} /> : null}
      <output data-testid="state">{`${n.value}|${n.formattedText}|${n.focused}`}</output>
    </div>
  );
}

const getInput = () => screen.getByLabelText('amount') as HTMLInputElement;

describe('useNumberInput (headless)', () => {
  it('formats, parses and groups like the component', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Custom defaultValue={1234.5} format="currency" onChange={onChange} />);
    expect(getInput()).toHaveValue('$ 1,234.5');
    expect(screen.getByTestId('state')).toHaveTextContent('1234.5|$ 1,234.5|false');

    await user.clear(getInput());
    await user.type(getInput(), '98765');
    expect(getInput()).toHaveValue('98,765');
    expect(onChange).toHaveBeenLastCalledWith(98765);
    expect(screen.getByTestId('state')).toHaveTextContent('98765|$ 98,765|true');
  });

  it('wires increment / decrement / clear props', () => {
    const onChange = vi.fn();
    render(<Custom defaultValue={5} onChange={onChange} />);
    fireEvent.pointerDown(screen.getByLabelText('plus'), { button: 0 });
    fireEvent.pointerUp(document);
    expect(onChange).toHaveBeenLastCalledWith(6);
    fireEvent.pointerDown(screen.getByLabelText('minus'), { button: 0 });
    fireEvent.pointerUp(document);
    expect(onChange).toHaveBeenLastCalledWith(5);
    fireEvent.click(screen.getByLabelText('clear'));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByLabelText('clear')).toBeDisabled();
  });

  it('returns hidden input props for forms', () => {
    const { container } = render(<Custom name="qty" defaultValue={3} />);
    expect(container.querySelector('input[type="hidden"]')).toHaveValue('3');
  });

  it('exposes a stable api object', () => {
    const apis: unknown[] = [];
    function Probe() {
      const n = useNumberInput({ defaultValue: 1 });
      apis.push(n.api);
      return <input {...n.inputProps} aria-label="amount" />;
    }
    const { rerender } = render(<Probe />);
    rerender(<Probe />);
    expect(apis[0]).toBe(apis[1]);
  });
});

describe('NumberInput as function component', () => {
  it('works in StrictMode (wheel listener, timers)', () => {
    const onChange = vi.fn();
    render(
      <StrictMode>
        <NumberInput locale="en-US" defaultValue={1} onChange={onChange} />
      </StrictMode>
    );
    const input = screen.getByRole('spinbutton');
    act(() => input.focus());
    fireEvent.wheel(input, { deltaY: -100 });
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('keeps the 1.x ref typing: useRef<NumberInput>()', () => {
    let captured: NumberInput | null = null;
    function App() {
      const ref = useRef<NumberInput>(null);
      return (
        <>
          <NumberInput ref={ref} defaultValue={7} />
          <button type="button" onClick={() => (captured = ref.current)}>get</button>
        </>
      );
    }
    render(<App />);
    fireEvent.click(screen.getByText('get'));
    expect(captured!.getValue()).toBe(7);
    expect(captured!.input).toBe(screen.getByRole('spinbutton'));
  });

  it('ref.clear() clears the value', () => {
    const ref = createRef<NumberInput>();
    const onChange = vi.fn();
    render(<NumberInput ref={ref} defaultValue={7} onChange={onChange} />);
    act(() => ref.current!.clear());
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('cleans timers on unmount while spinning', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { container, unmount } = render(<NumberInput defaultValue={0} onChange={onChange} />);
    fireEvent.pointerDown(container.querySelector('.locale-number-input__spinner-arrow--up')!, { button: 0 });
    unmount();
    const calls = onChange.mock.calls.length;
    act(() => vi.advanceTimersByTime(2000));
    expect(onChange.mock.calls.length).toBe(calls);
    vi.useRealTimers();
  });
});
