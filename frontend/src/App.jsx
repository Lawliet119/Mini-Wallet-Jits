import { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SUCCESS_CODE = 200;

const initialForm = {
  customerPhone: '0703900625',
  customerPin: '123456',
  customerCurrency: 'VND',
  officerPhone: '0900000000',
  officerPin: '123456',
  officerName: 'Operator',
  p2pReceiverPhone: '0334760905',
  p2pAmount: '50000',
  p2pMessage: 'Chuyen tien thu',
  billerId: '',
  billCode: 'EVN001',
  cashInCustomerPhone: '0703900625',
  cashInAmount: '200000'
};

const navItems = [
  { id: 'customer', label: 'Wallet' },
  { id: 'officer', label: 'Operations' },
  { id: 'transactions', label: 'Activity' },
  { id: 'config', label: 'Config' }
];

function readStoredJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch (unusedErr) {
    return null;
  }
}

function formatMoney(amount, currency) {
  return new Intl.NumberFormat('vi-VN').format(Number(amount || 0)) + ' ' + (currency || 'VND');
}

function shortId(value) {
  if (!value) {
    return '-';
  }

  return String(value).slice(-8).toUpperCase();
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(Number(value)));
}

function WalletArt() {
  return (
    <div className="wallet-art" aria-hidden="true">
      <div className="art-blob" />
      <div className="art-stack" />
      <div className="art-wallet">
        <div className="art-pocket" />
        <div className="art-card" />
        <div className="art-chip" />
      </div>
      <div className="art-coin coin-one">$</div>
      <div className="art-coin coin-two">$</div>
      <div className="art-line line-one" />
      <div className="art-line line-two" />
    </div>
  );
}

function TextInput({ label, name, value, onChange, type = 'text', inputMode, placeholder }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={value}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
      />
    </label>
  );
}

function SelectInput({ label, value, onChange, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function AuthFields({ role, form, onChange }) {
  if (role === 'officer') {
    return (
      <div className="form-grid">
        <TextInput label="Phone" name="officerPhone" value={form.officerPhone} onChange={onChange} />
        <TextInput label="PIN" name="officerPin" value={form.officerPin} onChange={onChange} type="password" />
        <TextInput label="Name" name="officerName" value={form.officerName} onChange={onChange} />
      </div>
    );
  }

  return (
    <div className="form-grid">
      <TextInput label="Phone" name="customerPhone" value={form.customerPhone} onChange={onChange} />
      <TextInput label="PIN" name="customerPin" value={form.customerPin} onChange={onChange} type="password" />
      <TextInput label="Currency" name="customerCurrency" value={form.customerCurrency} onChange={onChange} />
    </div>
  );
}

function AuthGate({ authRole, setAuthRole, form, onChange, onCustomerLogin, onCustomerRegister, onOfficerLogin, onOfficerRegister, busy, authMessage }) {
  return (
    <section className="auth-gate">
      <div className="auth-copy">
        <div className="brand-mark">JW</div>
        <p className="eyebrow">JITS Wallet</p>
        <h1>Digital Wallet</h1>
        <p className="auth-lead">Account access, wallet balance, transfers, bill collection, and operator cash-in in one workspace.</p>
        <div className="hero-actions">
          <button type="button" onClick={() => setAuthRole('customer')}>Customer sign in</button>
          <button className="secondary-btn" type="button" onClick={() => setAuthRole('officer')}>Officer sign in</button>
        </div>
        <WalletArt />
      </div>

      <div className="auth-panel">
        <div className="panel-title-block">
          <p className="eyebrow">Secure access</p>
          <h2>{authRole === 'customer' ? 'Customer wallet' : 'Officer console'}</h2>
        </div>

        <nav className="segmented-control" aria-label="Access roles">
          <button
            className={authRole === 'customer' ? 'is-active' : ''}
            type="button"
            onClick={() => setAuthRole('customer')}
          >
            Customer
          </button>
          <button
            className={authRole === 'officer' ? 'is-active' : ''}
            type="button"
            onClick={() => setAuthRole('officer')}
          >
            Officer
          </button>
        </nav>

        <AuthFields role={authRole} form={form} onChange={onChange} />
        <div className="button-row">
          {authRole === 'customer' ? (
            <>
              <button type="button" disabled={busy === 'customerLogin'} onClick={onCustomerLogin}>Login</button>
              <button className="secondary-btn" type="button" disabled={busy === 'customerRegister'} onClick={onCustomerRegister}>Register</button>
            </>
          ) : (
            <>
              <button type="button" disabled={busy === 'officerLogin'} onClick={onOfficerLogin}>Login</button>
              <button className="secondary-btn" type="button" disabled={busy === 'officerRegister'} onClick={onOfficerRegister}>Register</button>
            </>
          )}
        </div>
        {authMessage ? <p className="auth-message">{authMessage}</p> : null}
      </div>
    </section>
  );
}

function Sidebar({ mode, setMode, activeUser, customer, officer }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">JW</div>
        <div>
          <strong>JITS Wallet</strong>
          <span>Mini Wallet Suite</span>
        </div>
      </div>

      <nav className="side-nav" aria-label="Wallet navigation">
        {navItems.map((item) => (
          <button className={mode === item.id ? 'is-active' : ''} key={item.id} type="button" onClick={() => setMode(item.id)}>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="session-card">
        <span>Active session</span>
        <strong>{activeUser?.phone || '-'}</strong>
        <small>Customer: {customer?.phone || 'none'}</small>
        <small>Officer: {officer?.phone || 'none'}</small>
      </div>
    </aside>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WalletCard({ pocket, customer }) {
  return (
    <section className="wallet-card">
      <div>
        <span className="card-label">Available balance</span>
        <strong>{pocket ? formatMoney(pocket.balance, pocket.currency) : '-'}</strong>
      </div>
      <div className="wallet-card-bottom">
        <span>{customer?.phone || 'No customer session'}</span>
        <span>{pocket ? `${pocket.status} / ${shortId(pocket.id)}` : 'Pocket unavailable'}</span>
      </div>
    </section>
  );
}

function Surface({ title, eyebrow, state, children, className = '' }) {
  return (
    <section className={`surface ${className}`}>
      <div className="surface-head">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        {state ? <span className="state-pill">{state}</span> : null}
      </div>
      {children}
    </section>
  );
}

function WorkflowStepper({ current }) {
  const steps = ['Request', 'Confirm', 'Verify'];

  return (
    <div className="stepper">
      {steps.map((step, index) => (
        <div className={`step ${index <= current ? 'is-done' : ''}`} key={step}>
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </div>
  );
}

function receiptRows(data) {
  if (!data) {
    return [];
  }

  const transaction = data.transaction || {};
  const base = [
    ['Reference', shortId(data.transRefId)],
    ['Service', data.serviceCode || '-'],
    ['Status', transaction.status || data.status || 'pending']
  ];

  if (data.receiver) {
    base.push(['Receiver', data.receiver.phone]);
  }

  if (data.biller) {
    base.push(['Biller', data.biller.name || data.biller.code]);
  }

  if (data.invoice) {
    base.push(['Invoice', data.invoice.billCode]);
  }

  base.push(['Amount', formatMoney(data.amount || transaction.amount, data.currency || transaction.currency)]);
  base.push(['Fee', formatMoney(data.fee || transaction.fee, data.currency || transaction.currency)]);
  base.push(['Total', formatMoney(data.totalAmount || transaction.totalAmount, data.currency || transaction.currency)]);

  if (transaction.code) {
    base.push(['Transaction', transaction.code]);
  }

  if (transaction.billerRefId) {
    base.push(['Biller Ref', transaction.billerRefId]);
  }

  return base;
}

function Receipt({ title, data }) {
  const rows = receiptRows(data);

  return (
    <div className="receipt">
      <div className="receipt-head">
        <strong>{title}</strong>
        <span>{data ? shortId(data.transRefId) : 'Waiting'}</span>
      </div>
      {rows.length ? rows.map(([label, value]) => (
        <div className="receipt-row" key={`${title}-${label}`}>
          <span>{label}</span>
          <strong>{value || '-'}</strong>
        </div>
      )) : (
        <p className="empty-copy">No transaction selected.</p>
      )}
      <TechnicalPayload data={data} />
    </div>
  );
}

function TechnicalPayload({ data }) {
  if (!data) {
    return null;
  }

  return (
    <details className="payload">
      <summary>Technical payload</summary>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}

function CustomerWorkspace({
  form,
  updateForm,
  pocket,
  customer,
  billers,
  outputs,
  p2pTransRefId,
  billTransRefId,
  busy,
  run,
  requestP2P,
  confirmP2P,
  verifyP2P,
  loadBillers,
  requestBill,
  confirmBill,
  verifyBill,
  loadHistory
}) {
  const p2pStep = outputs.p2p?.transaction ? 2 : p2pTransRefId ? 1 : 0;
  const billStep = outputs.bill?.transaction ? 2 : billTransRefId ? 1 : 0;

  return (
    <div className="customer-layout">
      <div className="left-stack">
        <WalletCard pocket={pocket} customer={customer} />
        <Surface title="Transfer money" eyebrow="P2P transfer" state={p2pTransRefId ? shortId(p2pTransRefId) : 'Ready'}>
          <WorkflowStepper current={p2pStep} />
          <div className="form-grid">
            <TextInput label="Receiver phone" name="p2pReceiverPhone" value={form.p2pReceiverPhone} onChange={updateForm} />
            <TextInput label="Amount" name="p2pAmount" value={form.p2pAmount} onChange={updateForm} inputMode="numeric" />
            <label className="field span-2">
              <span>Message</span>
              <input value={form.p2pMessage} onChange={(event) => updateForm('p2pMessage', event.target.value)} />
            </label>
          </div>
          <div className="button-row">
            <button type="button" disabled={busy === 'p2pRequest'} onClick={() => run('p2pRequest', requestP2P)}>Request</button>
            <button className="secondary-btn" type="button" disabled={!p2pTransRefId || busy === 'p2pConfirm'} onClick={() => run('p2pConfirm', confirmP2P)}>Confirm</button>
            <button type="button" disabled={!p2pTransRefId || busy === 'p2pVerify'} onClick={() => run('p2pVerify', verifyP2P)}>Verify PIN</button>
          </div>
        </Surface>
      </div>

      <div className="right-stack">
        <Surface title="Payment receipt" eyebrow="Current transfer">
          <Receipt title="P2P" data={outputs.p2p} />
        </Surface>
      </div>

      <Surface title="Bill payment" eyebrow="Inquiry and collection" state={billTransRefId ? shortId(billTransRefId) : 'Ready'} className="span-wide">
        <div className="bill-grid">
          <div>
            <WorkflowStepper current={billStep} />
            <div className="form-grid">
              <SelectInput label="Biller" value={form.billerId} onChange={(value) => updateForm('billerId', value)}>
                <option value="">Select biller</option>
                {billers.map((biller) => <option value={biller.id} key={biller.id}>{biller.code} - {biller.name}</option>)}
              </SelectInput>
              <TextInput label="Bill code" name="billCode" value={form.billCode} onChange={updateForm} />
            </div>
            <div className="button-row">
              <button className="secondary-btn" type="button" onClick={() => run('loadBillers', loadBillers)}>Load billers</button>
              <button type="button" disabled={!form.billerId || busy === 'billRequest'} onClick={() => run('billRequest', requestBill)}>Inquiry</button>
              <button className="secondary-btn" type="button" disabled={!billTransRefId || busy === 'billConfirm'} onClick={() => run('billConfirm', confirmBill)}>Confirm</button>
              <button type="button" disabled={!billTransRefId || busy === 'billVerify'} onClick={() => run('billVerify', verifyBill)}>Pay</button>
            </div>
          </div>
          <Receipt title="Bill" data={outputs.bill} />
        </div>
      </Surface>

      <div className="quick-actions span-wide">
        <button type="button" onClick={() => run('loadHistory', loadHistory)}>Refresh activity</button>
        <span>Latest balance: {pocket ? formatMoney(pocket.balance, pocket.currency) : '-'}</span>
      </div>
    </div>
  );
}

function OfficerWorkspace({ form, updateForm, officer, outputs, busy, run, officerLogin, cashIn }) {
  return (
    <div className="operations-layout">
      <Surface title="Officer profile" eyebrow="Access" state={officer?.phone || 'Signed out'}>
        <AuthFields role="officer" form={form} onChange={updateForm} />
        <div className="button-row">
          <button type="button" disabled={busy === 'officerLogin'} onClick={() => run('officerLogin', () => officerLogin(false))}>Login</button>
          <button className="secondary-btn" type="button" disabled={busy === 'officerRegister'} onClick={() => run('officerRegister', () => officerLogin(true))}>Register</button>
        </div>
      </Surface>

      <Surface title="Cash-in posting" eyebrow="Bank to customer" state="Config: CASH_IN">
        <div className="form-grid">
          <TextInput label="Customer phone" name="cashInCustomerPhone" value={form.cashInCustomerPhone} onChange={updateForm} />
          <TextInput label="Amount" name="cashInAmount" value={form.cashInAmount} onChange={updateForm} inputMode="numeric" />
        </div>
        <div className="button-row">
          <button type="button" disabled={!officer || busy === 'cashIn'} onClick={() => run('cashIn', cashIn)}>Post cash-in</button>
        </div>
      </Surface>

      <Surface title="Cash-in receipt" eyebrow="Result">
        <Receipt title="Cash-in" data={outputs.cashIn} />
      </Surface>
    </div>
  );
}

function ActivityWorkspace({ history, outputs, run, loadHistory, loadDetail }) {
  return (
    <Surface title="Transaction activity" eyebrow="Ledger receipts" state={`${history.length} item(s)`} className="full-width">
      <div className="table-actions">
        <button type="button" onClick={() => run('loadHistory', loadHistory)}>Load history</button>
      </div>
      <div className="activity-table">
        <div className="activity-head">
          <span>Type</span>
          <span>Code</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Time</span>
        </div>
        {history.length ? history.map((transaction) => (
          <button className="activity-row" type="button" key={transaction.id} onClick={() => run('loadDetail', () => loadDetail(transaction.id))}>
            <span>{transaction.type}</span>
            <strong>{transaction.code}</strong>
            <span className={transaction.direction === 'OUT' ? 'amount-out' : 'amount-in'}>
              {transaction.direction === 'OUT' ? '-' : '+'}{formatMoney(transaction.totalAmount, transaction.currency)}
            </span>
            <span>{transaction.status}</span>
            <span>{formatDate(transaction.createdAt)}</span>
          </button>
        )) : (
          <p className="empty-copy">No transactions loaded.</p>
        )}
      </div>
      <TechnicalPayload data={outputs.detail} />
    </Surface>
  );
}

function ConfigWorkspace({ services, configDetail, run, loadConfigServices, loadConfigDetail }) {
  return (
    <Surface title="Service configuration" eyebrow="Config-driven engine" state={configDetail?.service?.code || 'Officer access'} className="full-width">
      <div className="config-layout">
        <div className="config-sidebar">
          <button type="button" onClick={() => run('loadConfigServices', loadConfigServices)}>Load services</button>
          <div className="service-list">
            {services.map((service) => (
              <button className="service-row" type="button" key={service.id} onClick={() => run('loadConfigDetail', () => loadConfigDetail(service.code))}>
                <strong>{service.code}</strong>
                <span>{service.name}</span>
                <small>{service.type} / {service.authMethod}</small>
              </button>
            ))}
          </div>
        </div>
        <ConfigDetail detail={configDetail} />
      </div>
    </Surface>
  );
}

function ConfigDetail({ detail }) {
  if (!detail) {
    return <div className="config-detail empty-copy">Select a service.</div>;
  }

  return (
    <div className="config-detail">
      <ConfigBlock title="Ledger steps" rows={detail.definitions} mapRow={(row) => [`#${row.stepOrder}`, `${row.debitSource} -> ${row.creditSource}`, `${row.amountSource} / ${row.stage}`]} />
      <ConfigBlock title="Fields" rows={detail.fields} mapRow={(row) => [row.order, `${row.name} <- ${row.source}`, `${row.rule} / ${row.dataType}`]} />
      <ConfigBlock title="Validations" rows={detail.validations} mapRow={(row) => [row.ruleOrder, row.ruleFunction, `${row.input} / ${row.errorMessage}`]} />
    </div>
  );
}

function ConfigBlock({ title, rows, mapRow }) {
  return (
    <section className="config-block">
      <h3>{title}</h3>
      {rows.length ? rows.map((row) => {
        const cells = mapRow(row);
        return (
          <div className="config-row" key={`${title}-${cells[0]}-${cells[1]}`}>
            <strong>{cells[0]}</strong>
            <span>{cells[1]}</span>
            <small>{cells[2]}</small>
          </div>
        );
      }) : <small>No data</small>}
    </section>
  );
}

function AuditLog({ logs }) {
  return (
    <aside className="audit-log">
      <div className="surface-head">
        <div>
          <p className="eyebrow">Audit log</p>
          <h2>Session events</h2>
        </div>
        <span className="state-pill">{logs[0]?.message || 'Idle'}</span>
      </div>
      <div className="log-list">
        {logs.length ? logs.map((entry, index) => (
          <details className="log-entry" key={`${entry.at}-${entry.message}-${index}`}>
            <summary>
              <span>{entry.at}</span>
              <strong>{entry.message}</strong>
            </summary>
            {entry.payload ? <pre>{JSON.stringify(entry.payload, null, 2)}</pre> : null}
          </details>
        )) : <p className="empty-copy">No events yet.</p>}
      </div>
    </aside>
  );
}

function App() {
  const [mode, setMode] = useState(() => (localStorage.getItem('miniWallet.officerToken') && !localStorage.getItem('miniWallet.customerToken') ? 'officer' : 'customer'));
  const [authRole, setAuthRole] = useState(() => (localStorage.getItem('miniWallet.officerToken') && !localStorage.getItem('miniWallet.customerToken') ? 'officer' : 'customer'));
  const [customerToken, setCustomerToken] = useState(() => localStorage.getItem('miniWallet.customerToken') || '');
  const [officerToken, setOfficerToken] = useState(() => localStorage.getItem('miniWallet.officerToken') || '');
  const [customer, setCustomer] = useState(() => readStoredJson('miniWallet.customer'));
  const [officer, setOfficer] = useState(() => readStoredJson('miniWallet.officer'));
  const [form, setForm] = useState(initialForm);
  const [pocket, setPocket] = useState(null);
  const [billers, setBillers] = useState([]);
  const [history, setHistory] = useState([]);
  const [services, setServices] = useState([]);
  const [configDetail, setConfigDetail] = useState(null);
  const [outputs, setOutputs] = useState({});
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState('');
  const [p2pTransRefId, setP2pTransRefId] = useState('');
  const [billTransRefId, setBillTransRefId] = useState('');

  const hasSession = Boolean(customerToken || officerToken);
  const activeUser = mode === 'officer' ? officer : customer;
  const authMessage = useMemo(() => logs[0]?.message || '', [logs]);

  function updateForm(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function tokenFor(role) {
    return role === 'officer' ? officerToken : customerToken;
  }

  async function api(path, options = {}) {
    const role = options.role || 'customer';
    const headers = { 'Content-Type': 'application/json' };
    const token = tokenFor(role);

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const data = await response.json();

    if (data.err !== SUCCESS_CODE) {
      const err = new Error(data.message || 'Request failed');
      err.payload = data;
      throw err;
    }

    return data;
  }

  async function run(label, task) {
    setBusy(label);
    try {
      const data = await task();
      setLogs((current) => [{ message: `${label} ok`, payload: data, at: new Date().toLocaleTimeString() }, ...current].slice(0, 8));
      return data;
    } catch (err) {
      const payload = err.payload || { message: err.message };
      setLogs((current) => [{ message: `${label} failed`, payload, at: new Date().toLocaleTimeString() }, ...current].slice(0, 8));
      return null;
    } finally {
      setBusy('');
    }
  }

  async function refreshBalance() {
    if (!customerToken) {
      setPocket(null);
      return null;
    }

    const data = await api('/api/v1/wallet/balance', { role: 'customer' });
    setPocket(data.pocket);
    return data;
  }

  async function loadBillers() {
    const data = await api('/api/v1/billers', { role: 'customer' });
    setBillers(data.billers);
    if (!form.billerId && data.billers.length) {
      setForm((current) => ({ ...current, billerId: data.billers[0].id }));
    }
    return data;
  }

  async function customerLogin(register) {
    const data = await api(register ? '/api/v1/customers/register' : '/api/v1/customers/login', {
      method: 'POST',
      body: {
        phone: form.customerPhone,
        pin: form.customerPin,
        currency: form.customerCurrency || 'VND'
      }
    });
    setCustomerToken(data.accessToken);
    setCustomer(data.customer);
    setMode('customer');
    setAuthRole('customer');
    localStorage.setItem('miniWallet.customerToken', data.accessToken);
    localStorage.setItem('miniWallet.customer', JSON.stringify(data.customer));
    return data;
  }

  async function officerLogin(register) {
    const data = await api(register ? '/api/v1/officers/register' : '/api/v1/officers/login', {
      method: 'POST',
      role: 'officer',
      body: {
        phone: form.officerPhone,
        pin: form.officerPin,
        name: form.officerName
      }
    });
    setOfficerToken(data.accessToken);
    setOfficer(data.officer);
    setMode('officer');
    setAuthRole('officer');
    localStorage.setItem('miniWallet.officerToken', data.accessToken);
    localStorage.setItem('miniWallet.officer', JSON.stringify(data.officer));
    return data;
  }

  function clearSession() {
    ['miniWallet.customerToken', 'miniWallet.officerToken', 'miniWallet.customer', 'miniWallet.officer'].forEach((key) => localStorage.removeItem(key));
    setCustomerToken('');
    setOfficerToken('');
    setCustomer(null);
    setOfficer(null);
    setPocket(null);
    setMode('customer');
    setAuthRole('customer');
    setLogs([{ message: 'session cleared', at: new Date().toLocaleTimeString() }]);
  }

  async function requestP2P() {
    const data = await api('/api/v1/transactions/request', {
      method: 'POST',
      role: 'customer',
      body: {
        serviceCode: 'P2P_TRANSFER',
        receiverPhone: form.p2pReceiverPhone,
        amount: Number(form.p2pAmount),
        message: form.p2pMessage
      }
    });
    setP2pTransRefId(data.transRefId);
    setOutputs((current) => ({ ...current, p2p: data }));
    return data;
  }

  async function confirmP2P() {
    const data = await api('/api/v1/transactions/confirm', {
      method: 'POST',
      role: 'customer',
      body: { transRefId: p2pTransRefId }
    });
    setOutputs((current) => ({ ...current, p2p: data }));
    return data;
  }

  async function verifyP2P() {
    const data = await api('/api/v1/transactions/verify', {
      method: 'POST',
      role: 'customer',
      body: {
        transRefId: p2pTransRefId,
        pin: form.customerPin
      }
    });
    setOutputs((current) => ({ ...current, p2p: data }));
    await refreshBalance();
    return data;
  }

  async function requestBill() {
    const data = await api('/api/v1/transactions/request', {
      method: 'POST',
      role: 'customer',
      body: {
        serviceCode: 'BILL_PAYMENT',
        billerId: form.billerId,
        billCode: form.billCode
      }
    });
    setBillTransRefId(data.transRefId);
    setOutputs((current) => ({ ...current, bill: data }));
    return data;
  }

  async function confirmBill() {
    const data = await api('/api/v1/transactions/confirm', {
      method: 'POST',
      role: 'customer',
      body: { transRefId: billTransRefId }
    });
    setOutputs((current) => ({ ...current, bill: data }));
    return data;
  }

  async function verifyBill() {
    const data = await api('/api/v1/transactions/verify', {
      method: 'POST',
      role: 'customer',
      body: {
        transRefId: billTransRefId,
        pin: form.customerPin
      }
    });
    setOutputs((current) => ({ ...current, bill: data }));
    await refreshBalance();
    return data;
  }

  async function cashIn() {
    const requestData = await api('/api/v1/transactions/request', {
      method: 'POST',
      role: 'officer',
      body: {
        serviceCode: 'CASH_IN',
        customerPhone: form.cashInCustomerPhone,
        amount: Number(form.cashInAmount),
        currency: 'VND'
      }
    });
    const data = await api('/api/v1/transactions/verify', {
      method: 'POST',
      role: 'officer',
      body: {
        transRefId: requestData.transRefId
      }
    });
    setOutputs((current) => ({ ...current, cashIn: data }));
    await refreshBalance();
    return data;
  }

  async function loadHistory() {
    const data = await api('/api/v1/transactions/history?limit=20', { role: 'customer' });
    setHistory(data.transactions);
    return data;
  }

  async function loadDetail(transactionId) {
    const data = await api(`/api/v1/transactions/${encodeURIComponent(transactionId)}`, { role: 'customer' });
    setOutputs((current) => ({ ...current, detail: data }));
    return data;
  }

  async function loadConfigServices() {
    const data = await api('/api/v1/config/services', { role: 'officer' });
    setServices(data.services);
    return data;
  }

  async function loadConfigDetail(code) {
    const data = await api(`/api/v1/config/services/${encodeURIComponent(code)}`, { role: 'officer' });
    setConfigDetail(data);
    return data;
  }

  async function refreshWorkspace() {
    const result = {};

    if (customerToken) {
      result.balance = await refreshBalance();
      result.billers = await loadBillers();
      result.history = await loadHistory();
    }

    if (officerToken) {
      result.configServices = await loadConfigServices();
    }

    return result;
  }

  useEffect(() => {
    if (customerToken) {
      run('refreshBalance', refreshBalance);
      run('loadBillers', loadBillers);
    }
  }, [customerToken]);

  if (!hasSession) {
    return (
      <main className="login-shell">
        <AuthGate
          authRole={authRole}
          setAuthRole={setAuthRole}
          form={form}
          onChange={updateForm}
          onCustomerLogin={() => run('customerLogin', async () => {
            const data = await customerLogin(false);
            await refreshBalance();
            return data;
          })}
          onCustomerRegister={() => run('customerRegister', async () => {
            const data = await customerLogin(true);
            await refreshBalance();
            return data;
          })}
          onOfficerLogin={() => run('officerLogin', () => officerLogin(false))}
          onOfficerRegister={() => run('officerRegister', () => officerLogin(true))}
          busy={busy}
          authMessage={authMessage}
        />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Sidebar mode={mode} setMode={setMode} activeUser={activeUser} customer={customer} officer={officer} />
      <section className="main-workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>{mode === 'customer' ? 'Wallet overview' : navItems.find((item) => item.id === mode)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <button className="secondary-btn" type="button" onClick={() => run('refreshWorkspace', refreshWorkspace)}>Refresh</button>
            <button className="danger-btn" type="button" onClick={clearSession}>Sign out</button>
          </div>
        </header>

        <section className="status-grid">
          <Stat label="Customer" value={customer?.phone || 'Not signed in'} />
          <Stat label="Officer" value={officer?.phone || 'Not signed in'} />
          <Stat label="Balance" value={pocket ? formatMoney(pocket.balance, pocket.currency) : '-'} tone="highlight" />
          <Stat label="Pocket" value={pocket ? `${pocket.status} / ${shortId(pocket.id)}` : '-'} />
        </section>

        {mode === 'customer' ? (
          <CustomerWorkspace
            form={form}
            updateForm={updateForm}
            pocket={pocket}
            customer={customer}
            billers={billers}
            outputs={outputs}
            p2pTransRefId={p2pTransRefId}
            billTransRefId={billTransRefId}
            busy={busy}
            run={run}
            requestP2P={requestP2P}
            confirmP2P={confirmP2P}
            verifyP2P={verifyP2P}
            loadBillers={loadBillers}
            requestBill={requestBill}
            confirmBill={confirmBill}
            verifyBill={verifyBill}
            loadHistory={loadHistory}
          />
        ) : null}

        {mode === 'officer' ? (
          <OfficerWorkspace
            form={form}
            updateForm={updateForm}
            officer={officer}
            outputs={outputs}
            busy={busy}
            run={run}
            officerLogin={officerLogin}
            cashIn={cashIn}
          />
        ) : null}

        {mode === 'transactions' ? (
          <ActivityWorkspace history={history} outputs={outputs} run={run} loadHistory={loadHistory} loadDetail={loadDetail} />
        ) : null}

        {mode === 'config' ? (
          <ConfigWorkspace
            services={services}
            configDetail={configDetail}
            run={run}
            loadConfigServices={loadConfigServices}
            loadConfigDetail={loadConfigDetail}
          />
        ) : null}

        <AuditLog logs={logs} />
      </section>
    </main>
  );
}

export default App;
