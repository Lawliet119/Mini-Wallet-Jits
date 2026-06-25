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

function WalletArt() {
  return (
    <div className="wallet-art" aria-hidden="true">
      <div className="art-blob" />
      <div className="art-wallet">
        <div className="art-pocket" />
        <div className="art-card" />
      </div>
      <div className="art-coin coin-one">$</div>
      <div className="art-coin coin-two">$</div>
      <div className="art-stack" />
      <div className="art-gear gear-one" />
      <div className="art-gear gear-two" />
    </div>
  );
}

function JsonOutput({ data }) {
  return <pre>{data ? JSON.stringify(data, null, 2) : ''}</pre>;
}

function TextInput({ label, name, value, onChange, type = 'text', inputMode }) {
  return (
    <label>
      {label}
      <input
        value={value}
        type={type}
        inputMode={inputMode}
        onChange={(event) => onChange(name, event.target.value)}
      />
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
        <p className="eyebrow">Your Wallet</p>
        <h2>Digital Wallet</h2>
        <p>Transfer money, cash-in through an officer, and pay bills from one compact wallet workspace.</p>
        <div className="hero-actions">
          <button type="button" onClick={() => setAuthRole('customer')}>Get Started</button>
          <button className="ghost-btn" type="button" onClick={() => setAuthRole('officer')}>Officer Access</button>
        </div>
        <WalletArt />
      </div>

      <div className="auth-panel">
        <div className="auth-panel-head">
          <p className="eyebrow">Sign in</p>
          <h2>Access Console</h2>
        </div>
        <nav className="auth-tabs" aria-label="Access roles">
          <button
            className={`auth-tab ${authRole === 'customer' ? 'is-active' : ''}`}
            type="button"
            onClick={() => setAuthRole('customer')}
          >
            Customer
          </button>
          <button
            className={`auth-tab ${authRole === 'officer' ? 'is-active' : ''}`}
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
              <button className="ghost-btn" type="button" disabled={busy === 'customerRegister'} onClick={onCustomerRegister}>Register</button>
            </>
          ) : (
            <>
              <button type="button" disabled={busy === 'officerLogin'} onClick={onOfficerLogin}>Login</button>
              <button className="ghost-btn" type="button" disabled={busy === 'officerRegister'} onClick={onOfficerRegister}>Register</button>
            </>
          )}
        </div>
        {authMessage ? <p className="auth-message">{authMessage}</p> : null}
      </div>
    </section>
  );
}

function Panel({ title, state, children, wide = false }) {
  return (
    <article className={`panel ${wide ? 'wide-panel' : ''}`}>
      <div className="panel-head">
        <h2>{title}</h2>
        {state ? <span>{state}</span> : null}
      </div>
      {children}
    </article>
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
    const data = await api('/api/v1/transactions/p2p/request', {
      method: 'POST',
      role: 'customer',
      body: {
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
    const data = await api('/api/v1/transactions/p2p/confirm', {
      method: 'POST',
      role: 'customer',
      body: { transRefId: p2pTransRefId }
    });
    setOutputs((current) => ({ ...current, p2p: data }));
    return data;
  }

  async function verifyP2P() {
    const data = await api('/api/v1/transactions/p2p/verify', {
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
    const data = await api('/api/v1/transactions/bills/request', {
      method: 'POST',
      role: 'customer',
      body: {
        billerId: form.billerId,
        billCode: form.billCode
      }
    });
    setBillTransRefId(data.transRefId);
    setOutputs((current) => ({ ...current, bill: data }));
    return data;
  }

  async function confirmBill() {
    const data = await api('/api/v1/transactions/bills/confirm', {
      method: 'POST',
      role: 'customer',
      body: { transRefId: billTransRefId }
    });
    setOutputs((current) => ({ ...current, bill: data }));
    return data;
  }

  async function verifyBill() {
    const data = await api('/api/v1/transactions/bills/verify', {
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
    const data = await api('/api/v1/admin/transactions/cash-in', {
      method: 'POST',
      role: 'officer',
      body: {
        customerPhone: form.cashInCustomerPhone,
        amount: Number(form.cashInAmount),
        currency: 'VND'
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

  useEffect(() => {
    if (customerToken) {
      run('refreshBalance', refreshBalance);
      run('loadBillers', loadBillers);
    }
  }, [customerToken]);

  return (
    <main className="wallet-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Digital Wallet</p>
          <h1>JITS Mini Wallet</h1>
        </div>
        <div className="header-actions">
          <button className="ghost-btn" type="button" onClick={() => run('refreshAll', async () => {
            const balance = await refreshBalance();
            const transactions = await loadHistory();
            return { balance, transactions };
          })}>Refresh</button>
          <button className="danger-btn" type="button" onClick={clearSession}>Clear Session</button>
        </div>
      </header>

      {!hasSession ? (
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
      ) : (
        <>
          <section className="status-band">
            <div className="metric"><span>Role</span><strong>{activeUser ? mode : 'Guest'}</strong></div>
            <div className="metric"><span>Phone</span><strong>{activeUser?.phone || '-'}</strong></div>
            <div className="metric"><span>Balance</span><strong>{pocket ? formatMoney(pocket.balance, pocket.currency) : '-'}</strong></div>
            <div className="metric"><span>Pocket</span><strong>{pocket ? `${pocket.status} / ${pocket.id.slice(-6)}` : '-'}</strong></div>
          </section>

          <nav className="mode-tabs" aria-label="Mini wallet modes">
            {['customer', 'officer', 'transactions', 'config'].map((item) => (
              <button className={`mode-tab ${mode === item ? 'is-active' : ''}`} key={item} type="button" onClick={() => setMode(item)}>
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </nav>

          <section className="workspace-grid">
            {mode === 'customer' ? (
              <>
                <Panel title="Customer Access" state={customer?.phone || 'Signed out'}>
                  <AuthFields role="customer" form={form} onChange={updateForm} />
                  <div className="button-row">
                    <button type="button" onClick={() => run('customerLogin', () => customerLogin(false))}>Login</button>
                    <button className="ghost-btn" type="button" onClick={() => run('customerRegister', () => customerLogin(true))}>Register</button>
                  </div>
                </Panel>

                <Panel title="P2P Transfer" state={p2pTransRefId ? p2pTransRefId.slice(-8) : 'Ready'}>
                  <div className="form-grid">
                    <TextInput label="Receiver Phone" name="p2pReceiverPhone" value={form.p2pReceiverPhone} onChange={updateForm} />
                    <TextInput label="Amount" name="p2pAmount" value={form.p2pAmount} onChange={updateForm} inputMode="numeric" />
                    <label className="span-2">
                      Message
                      <input value={form.p2pMessage} onChange={(event) => updateForm('p2pMessage', event.target.value)} />
                    </label>
                  </div>
                  <div className="button-row">
                    <button type="button" onClick={() => run('p2pRequest', requestP2P)}>Request</button>
                    <button type="button" onClick={() => run('p2pConfirm', confirmP2P)}>Confirm</button>
                    <button type="button" onClick={() => run('p2pVerify', verifyP2P)}>Verify</button>
                  </div>
                  <JsonOutput data={outputs.p2p} />
                </Panel>

                <Panel title="Bill Payment" state={billTransRefId ? billTransRefId.slice(-8) : 'Ready'}>
                  <div className="form-grid">
                    <label>
                      Biller
                      <select value={form.billerId} onChange={(event) => updateForm('billerId', event.target.value)}>
                        <option value="">Select biller</option>
                        {billers.map((biller) => <option value={biller.id} key={biller.id}>{biller.code} - {biller.name}</option>)}
                      </select>
                    </label>
                    <TextInput label="Bill Code" name="billCode" value={form.billCode} onChange={updateForm} />
                  </div>
                  <div className="button-row">
                    <button type="button" onClick={() => run('loadBillers', loadBillers)}>Load Billers</button>
                    <button type="button" onClick={() => run('billRequest', requestBill)}>Inquiry</button>
                    <button type="button" onClick={() => run('billConfirm', confirmBill)}>Confirm</button>
                    <button type="button" onClick={() => run('billVerify', verifyBill)}>Pay</button>
                  </div>
                  <JsonOutput data={outputs.bill} />
                </Panel>
              </>
            ) : null}

            {mode === 'officer' ? (
              <>
                <Panel title="Officer Access" state={officer?.phone || 'Signed out'}>
                  <AuthFields role="officer" form={form} onChange={updateForm} />
                  <div className="button-row">
                    <button type="button" onClick={() => run('officerLogin', () => officerLogin(false))}>Login</button>
                    <button className="ghost-btn" type="button" onClick={() => run('officerRegister', () => officerLogin(true))}>Register</button>
                  </div>
                </Panel>

                <Panel title="Cash-In" state="Ready">
                  <div className="form-grid">
                    <TextInput label="Customer Phone" name="cashInCustomerPhone" value={form.cashInCustomerPhone} onChange={updateForm} />
                    <TextInput label="Amount" name="cashInAmount" value={form.cashInAmount} onChange={updateForm} inputMode="numeric" />
                  </div>
                  <div className="button-row">
                    <button type="button" onClick={() => run('cashIn', cashIn)}>Execute</button>
                  </div>
                  <JsonOutput data={outputs.cashIn} />
                </Panel>
              </>
            ) : null}

            {mode === 'transactions' ? (
              <Panel title="Transaction History" state={`${history.length} item(s)`} wide>
                <div className="button-row">
                  <button type="button" onClick={() => run('loadHistory', loadHistory)}>Load History</button>
                </div>
                <div className="history-list">
                  {history.map((transaction) => (
                    <div className="history-item" key={transaction.id}>
                      <strong>{transaction.type}</strong>
                      <span><small>{transaction.code}</small><br />{transaction.status}</span>
                      <button type="button" onClick={() => run('loadDetail', () => loadDetail(transaction.id))}>
                        <span className={transaction.direction === 'OUT' ? 'amount-out' : 'amount-in'}>
                          {formatMoney(transaction.totalAmount, transaction.currency)}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
                <JsonOutput data={outputs.detail} />
              </Panel>
            ) : null}

            {mode === 'config' ? (
              <Panel title="Service Config" state={configDetail?.service?.code || 'Officer only'} wide>
                <div className="button-row">
                  <button type="button" onClick={() => run('loadConfigServices', loadConfigServices)}>Load Services</button>
                </div>
                <div className="config-layout">
                  <div className="service-list">
                    {services.map((service) => (
                      <button className="service-card" type="button" key={service.id} onClick={() => run('loadConfigDetail', () => loadConfigDetail(service.code))}>
                        <strong>{service.code}</strong>
                        <span>{service.name}</span>
                        <small>{service.type} / {service.authMethod}</small>
                      </button>
                    ))}
                  </div>
                  <ConfigDetail detail={configDetail} />
                </div>
              </Panel>
            ) : null}
          </section>

          <aside className="event-console">
            <div className="panel-head">
              <h2>Run Log</h2>
              <span>{logs[0]?.message || 'Idle'}</span>
            </div>
            <pre>{logs.map((entry) => `[${entry.at}] ${entry.message}${entry.payload ? `\n${JSON.stringify(entry.payload, null, 2)}` : ''}`).join('\n\n')}</pre>
          </aside>
        </>
      )}
    </main>
  );
}

function ConfigDetail({ detail }) {
  if (!detail) {
    return <div className="config-detail" />;
  }

  return (
    <div className="config-detail">
      <ConfigBlock title="Ledger Steps" rows={detail.definitions} mapRow={(row) => [`#${row.stepOrder}`, `${row.debitSource} -> ${row.creditSource}`, `${row.amountSource} / ${row.stage}`]} />
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

export default App;
