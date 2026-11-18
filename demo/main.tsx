import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { NumberInput } from '../src';
import '../src/style/index.scss';
import '../src/style/theme/default-dark/index.scss';
import '../src/style/theme/blue-light/index.scss';

function App() {
  const [value, setValue] = useState<number | null>(56);
  const [log, setLog] = useState<string[]>([]);
  const ref = useRef<NumberInput>(null);
  const push = (msg: string) => setLog(l => [msg, ...l].slice(0, 30));

  return (
    <>
      <h1>react-locale-number-input</h1>

      <section>
        <h2>Controlled / uncontrolled</h2>
        <div className="row">
          <label>
            Controlled (value: <code>{String(value)}</code>)
            <NumberInput
              ref={ref}
              locale="en-US"
              value={value}
              onChange={v => {
                setValue(v);
                push(`controlled -> ${v}`);
              }}
            />
          </label>
          <label>
            Uncontrolled, tools at start
            <NumberInput
              locale="en-US"
              defaultValue={10}
              toolPosition="start"
              onChange={v => push(`uncontrolled -> ${v}`)}
            />
          </label>
          <button type="button" onClick={() => setValue(1000)}>set 1000</button>
          <button type="button" onClick={() => ref.current?.step(1, { step: 0.1 })}>+0.1 (ref.step)</button>
        </div>
      </section>

      <section>
        <h2>Locales</h2>
        <div className="row">
          {['en-US', 'fr-FR', 'de-DE', 'de-CH', 'ar-EG', 'ja-JP'].map(locale => (
            <label key={locale}>
              {locale}
              <NumberInput locale={locale} defaultValue={1234567.891} />
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2>Currency / percentage / prefix-suffix</h2>
        <div className="row">
          <label>
            fr-FR currency, precision 2
            <NumberInput locale="fr-FR" format="currency" precision={2} defaultValue={1234.5} />
          </label>
          <label>
            en-US currency
            <NumberInput locale="en-US" format="currency" precision={2} defaultValue={99.9} />
          </label>
          <label>
            en-GB, currency=&quot;JPY&quot;
            <NumberInput locale="en-GB" format="currency" currency="JPY" defaultValue={5000} />
          </label>
          <label>
            percentage 0-100
            <NumberInput format="percentage" minValue={0} maxValue={100} defaultValue={25} />
          </label>
          <label>
            suffix &quot;kg&quot;, step 0.5
            <NumberInput suffix="kg" step={0.5} defaultValue={2.5} />
          </label>
        </div>
      </section>

      <section>
        <h2>Constraints</h2>
        <div className="row">
          <label>
            min 10, max 100 (clamped on blur)
            <NumberInput minValue={10} maxValue={100} defaultValue={50} />
          </label>
          <label>
            integers only, no negative
            <NumberInput allowFloat={false} allowNegative={false} defaultValue={3} />
          </label>
          <label>
            allowEmpty=false, valueOnEmpty=0
            <NumberInput allowEmpty={false} valueOnEmpty={0} defaultValue={7} />
          </label>
          <label>
            disabled
            <NumberInput disabled defaultValue={1} />
          </label>
          <label>
            readOnly
            <NumberInput readOnly defaultValue={1} />
          </label>
          <label>
            no tools
            <NumberInput enableSpinnerTools={false} enableClearButton={false} defaultValue={1} />
          </label>
        </div>
      </section>

      <section>
        <h2>Themes / RTL</h2>
        <div className="row">
          <NumberInput theme="blue-light" defaultValue={12} />
          <div className="dark">
            <NumberInput theme="default-dark" defaultValue={12} />
          </div>
          <NumberInput rtl locale="ar-EG" defaultValue={12} />
        </div>
      </section>

      <section>
        <h2>Form (hidden input with raw value)</h2>
        <form
          onSubmit={e => {
            e.preventDefault();
            push(`submit -> ${new URLSearchParams(new FormData(e.currentTarget) as never).toString()}`);
          }}
        >
          <div className="row">
            <NumberInput name="price" locale="fr-FR" format="currency" defaultValue={1234.5} />
            <button type="submit">submit</button>
          </div>
        </form>
      </section>

      <section>
        <h2>onChange log</h2>
        <pre>{log.join('\n')}</pre>
      </section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
