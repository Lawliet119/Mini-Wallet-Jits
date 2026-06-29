import { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SUCCESS_CODE = 200;

const initialForm = {
  customerPhone: '',
  customerPin: '',
  customerCurrency: '',
  officerPhone: '',
  officerPin: '',
  officerName: '',
  p2pReceiverPhone: '',
  p2pAmount: '',
  p2pMessage: '',
  billerId: '',
  billCode: '',
  cashInCustomerPhone: '',
  cashInAmount: ''
};

const modeItemsByRole = {
  customer: [
    { id: 'customer', label: 'Payments', icon: 'P' },
    { id: 'transactions', label: 'Activity', icon: 'A' }
  ],
  officer: [
    { id: 'officer', label: 'Cash-in', icon: 'C' },
    { id: 'config', label: 'Config', icon: 'G' }
  ]
};

const quickActionsByRole = {
  customer: [
    { id: 'customer', label: 'Transfer', helper: 'P2P move', icon: 'transfer', tone: 'violet' },
    { id: 'customer-bill', label: 'Bills', helper: 'Inquiry and pay', icon: 'bill', tone: 'blue' },
    { id: 'transactions', label: 'History', helper: 'Audit trail', icon: 'history', tone: 'amber' },
    { id: 'refresh', label: 'Refresh', helper: 'Balance sync', icon: 'refresh', tone: 'lilac' }
  ],
  officer: [
    { id: 'officer', label: 'Cash-in', helper: 'Desk operation', icon: 'topup', tone: 'green' },
    { id: 'config', label: 'Config', helper: 'Service rules', icon: 'config', tone: 'peach' },
    { id: 'refresh', label: 'Refresh', helper: 'Session sync', icon: 'refresh', tone: 'lilac' }
  ]
};

function QuickIcon({ name }) {
  switch (name) {
    case 'transfer':
      return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3l4 4-4 4"></path><path d="M3 17l4-4 4 4"></path><path d="M7 13h14"></path><path d="M21 7H3"></path></svg>;
    case 'topup':
      return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
    case 'bill':
      return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
    case 'history':
      return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
    case 'refresh':
      return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>;
    case 'config':
      return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
    default:
      return null;
  }
}

function readStoredJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch (unusedErr) {
    return null;
  }
}

function readSessionValue(key) {
  try {
    return sessionStorage.getItem(key) || '';
  } catch (unusedErr) {
    return '';
  }
}

function formatMoney(amount, currency) {
  return new Intl.NumberFormat('vi-VN').format(Number(amount || 0)) + ' ' + (currency || 'VND');
}

function formatShortMoney(amount) {
  const value = Number(amount || 0);
  if (value >= 1000000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1000000)}M`;
  }
  if (value >= 1000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1000)}K`;
  }
  return new Intl.NumberFormat('vi-VN').format(value);
}

function JsonOutput({ data }) {
  if (!data) {
    return null;
  }

  return (
    <details className="json-output">
      <summary>Technical response</summary>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}

function TextInput({ label, name, value, onChange, type = 'text', inputMode, placeholder }) {
  return (
    <label>
      {label}
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

function AuthFields({ form, onChange }) {
  return (
    <div className="form-grid auth-form-grid">
      <TextInput label="Phone" name="customerPhone" value={form.customerPhone} onChange={onChange} placeholder="Enter phone number" />
      <TextInput label="PIN" name="customerPin" value={form.customerPin} onChange={onChange} type="password" placeholder="Enter PIN" />
    </div>
  );
}

function WalletIllustration() {
  return (
    <div className="wallet-illustration" aria-hidden="true">
      <div className="wallet-body">
        <div className="wallet-flap" />
        <div className="wallet-slot" />
      </div>
      <div className="coin-card">
        <span>$</span>
      </div>
      <div className="coin-stack" />
      <div className="gear-card">
        <span />
      </div>
    </div>
  );
}

function AuthGate({ form, onChange, onLogin, onRegister, busy, authMessage }) {
  return (
    <section className="auth-screen">
      <div className="auth-brand">
        <div className="brand-row">
          <span className="brand-mark">J.</span>
          <span>Mini Wallet</span>
        </div>
        <div className="auth-hero">
          <div className="auth-copy">
            <p className="eyebrow">Digital wallet operations</p>
            <h1>Move money with a real transaction flow.</h1>
            <p>Sign in, request, confirm, verify, then audit every entry from one config-driven wallet workspace.</p>
          </div>
          <WalletIllustration />
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-card-head">
          <div>
            <p className="eyebrow">Secure access</p>
            <h2>Wallet sign in</h2>
          </div>
          <span className="auth-status">JWT</span>
        </div>

        <AuthFields form={form} onChange={onChange} />
        <div className="button-row">
          <button type="button" disabled={busy === 'login'} onClick={onLogin}>Login</button>
          <button className="secondary-btn" type="button" disabled={busy === 'register'} onClick={onRegister}>Register</button>
        </div>
        {authMessage ? <p className="auth-message">{authMessage}</p> : null}
      </div>
    </section>
  );
}

function SideRail({ mode, setMode, clearSession, items }) {
  return (
    <aside className="side-rail">
      <div className="rail-logo">J.</div>
      <nav className="rail-nav" aria-label="Main navigation">
        {items.map((item) => (
          <button
            className={`rail-btn ${mode.startsWith(item.id) ? 'is-active' : ''}`}
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => setMode(item.id)}
          >
            {item.icon}
          </button>
        ))}
      </nav>
      <button className="rail-btn rail-exit" type="button" title="Sign out" onClick={clearSession}>X</button>
    </aside>
  );
}

function SummaryColumn({ pocket, customer, officer, history, setMode, activeRole }) {
  const outTotal = history.reduce((total, item) => total + (item.direction === 'OUT' ? Number(item.totalAmount || 0) : 0), 0);
  const inTotal = history.reduce((total, item) => total + (item.direction === 'IN' ? Number(item.totalAmount || 0) : 0), 0);

  return (
    <aside className="summary-column">
      <SummaryMetric tone="violet" icon="$" label="Wallet Balance" value={pocket ? formatMoney(pocket.balance, pocket.currency) : '--'} />
      <SummaryMetric tone="green" icon="+" label="Incoming Total" value={formatMoney(inTotal, pocket?.currency || 'VND')} />
      <SummaryMetric tone="peach" icon="-" label="Outgoing Total" value={formatMoney(outTotal, pocket?.currency || 'VND')} />
      <SummaryMetric tone="blue" icon="ID" label="Active Phone" value={customer?.phone || officer?.phone || '--'} />

      <div className="progress-card">
        <div className="donut">
          <span>{history.length || 0}</span>
        </div>
        <div className="legend-row"><i className="legend-dot done" />Done</div>
        <div className="legend-row"><i className="legend-dot pending" />Pending</div>
        <div className="legend-row"><i className="legend-dot todo" />Review</div>
      </div>

      <button className="deposit-card" type="button" onClick={() => setMode(activeRole === 'officer' ? 'officer' : 'customer')}>
        <strong>{activeRole === 'officer' ? 'Cash-in desk' : 'Top up now'}</strong>
        <span>{activeRole === 'officer' ? 'Add value after an external receipt is confirmed.' : 'Pull value from a linked bank source into your wallet.'}</span>
      </button>
    </aside>
  );
}

function SummaryMetric({ tone, icon, label, value }) {
  return (
    <section className="summary-metric">
      <span className={`metric-icon ${tone}`}>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </section>
  );
}

function DashboardTopBar({ runRefresh }) {
  return (
    <div className="dashboard-topbar">
      <div className="search-control">
        <span>Q</span>
        <input readOnly value="" placeholder="Phone, transaction ref, bill code..." />
      </div>
      <select aria-label="City filter" defaultValue="">
        <option value="">City</option>
        <option value="hcm">Ho Chi Minh</option>
        <option value="hn">Ha Noi</option>
      </select>
      <select aria-label="Category filter" defaultValue="">
        <option value="">Category</option>
        <option value="transfer">Transfer</option>
        <option value="bill">Bill</option>
      </select>
      <button type="button" onClick={runRefresh}>Search</button>
    </div>
  );
}

function ActionGrid({ mode, actions, runQuickAction }) {
  return (
    <section className="action-grid" aria-label="Payment actions">
      {actions.map((action) => (
        <button
          className={`action-card ${action.tone} ${mode === action.id ? 'is-active' : ''}`}
          type="button"
          key={action.id}
          onClick={() => runQuickAction(action.id)}
        >
          <span className="action-icon-wrapper"><QuickIcon name={action.icon} /></span>
          <strong>{action.label}</strong>
          <small>{action.helper}</small>
        </button>
      ))}
    </section>
  );
}

function Panel({ title, state, children, wide = false }) {
  return (
    <article className={`panel ${wide ? 'wide-panel' : ''}`}>
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
        </div>
        {state ? <span>{state}</span> : null}
      </div>
      {children}
    </article>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function WalletCard({ pocket, customer }) {
  const phone = customer?.phone || '---- ----';
  const lastFour = phone.slice(-4).padStart(4, '-');

  return (
    <section className="wallet-card">
      <div className="wallet-card-top">
        <span>JITS</span>
        <strong>VISA</strong>
      </div>
      <p>3453 4262 7310 {lastFour}</p>
      <div className="wallet-card-bottom">
        <span>
          Card Holder
          <strong>{customer?.phone || 'Not signed'}</strong>
        </span>
        <span>
          Balance
          <strong>{pocket ? formatShortMoney(pocket.balance) : '--'}</strong>
        </span>
      </div>
    </section>
  );
}

function WeeklySummary({ history }) {
  const bars = [38, 52, 72, 34, 48, 60, 82, 56, 58];
  const hasHistory = history.length > 0;

  return (
    <section className="weekly-summary">
      <h2>Weekly Summary</h2>
      <div className="bar-chart" aria-label="Weekly transaction summary">
        {bars.map((height, index) => (
          <span key={height + index} style={{ '--height': `${hasHistory ? height : Math.max(18, height - 28)}px` }}>
            <i />
          </span>
        ))}
      </div>
      <div className="chart-labels">
        <span>Mon</span>
        <span>Wed</span>
        <span>Fri</span>
      </div>
    </section>
  );
}

function LatestTransactions({ history, onLoadHistory, onLoadDetail }) {
  return (
    <section className="latest-card">
      <div className="section-title-row">
        <h2>Latest Transactions</h2>
        <button className="icon-btn" type="button" title="Load history" onClick={onLoadHistory}>R</button>
      </div>

      {history.length ? (
        <div className="transaction-list">
          {history.slice(0, 5).map((transaction) => (
            <button className="transaction-row" type="button" key={transaction.id} onClick={() => onLoadDetail(transaction.id)}>
              <span className={`tx-icon ${transaction.direction === 'OUT' ? 'out' : 'in'}`}>{transaction.direction === 'OUT' ? '>' : '<'}</span>
              <span>
                <strong>{transaction.type}</strong>
                <small>{transaction.status} / {transaction.code}</small>
              </span>
              <b className={transaction.direction === 'OUT' ? 'amount-out' : 'amount-in'}>
                {transaction.direction === 'OUT' ? '-' : '+'}{formatMoney(transaction.totalAmount, transaction.currency)}
              </b>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="No transactions loaded" text="Use refresh or load history after signing in." />
      )}
    </section>
  );
}

function App() {
  const [mode, setMode] = useState('customer');
  const [customerToken, setCustomerToken] = useState(() => readSessionValue('miniWallet.customerToken'));
  const [officerToken, setOfficerToken] = useState(() => readSessionValue('miniWallet.officerToken'));
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
  const [p2pStep, setP2pStep] = useState('request');
  const [billTransRefId, setBillTransRefId] = useState('');
  const [billStep, setBillStep] = useState('request');
  const [expandedTxId, setExpandedTxId] = useState(null);
  const [showWorkspace, setShowWorkspace] = useState(() => Boolean(readSessionValue('miniWallet.customerToken') || readSessionValue('miniWallet.officerToken')));

  const hasSession = showWorkspace && Boolean(customerToken || officerToken);
  const activeRole = officerToken ? 'officer' : 'customer';
  const navigationItems = modeItemsByRole[activeRole];
  const quickActions = quickActionsByRole[activeRole];
  const modeLabel = quickActions.find((item) => item.id === mode)?.label || navigationItems.find((item) => item.id === mode)?.label || 'Payments';
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

    let response = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET',
      headers,
      credentials: 'include',
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    let data = await response.json();

    if (data.err === 401 && path !== '/api/v1/access/refresh' && path !== '/api/v1/access/logout') {
      try {
        const refreshRes = await fetch(`${API_BASE}/api/v1/access/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        const refreshData = await refreshRes.json();
        
        if (refreshData.err === SUCCESS_CODE) {
          const newToken = refreshData.accessToken;
          if (refreshData.role === 'officer') {
            setOfficerToken(newToken);
            sessionStorage.setItem('miniWallet.officerToken', newToken);
          } else {
            setCustomerToken(newToken);
            sessionStorage.setItem('miniWallet.customerToken', newToken);
          }
          
          headers.Authorization = `Bearer ${newToken}`;
          response = await fetch(`${API_BASE}${path}`, {
            method: options.method || 'GET',
            headers,
            credentials: 'include',
            body: options.body ? JSON.stringify(options.body) : undefined
          });
          data = await response.json();
        } else {
          clearSession();
          throw new Error('Session expired');
        }
      } catch (e) {
        clearSession();
        throw new Error('Session expired');
      }
    }

    if (data.err && data.err !== SUCCESS_CODE) {
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
    return data;
  }

  async function login() {
    const data = await api('/api/v1/access/login', {
      method: 'POST',
      body: {
        phone: form.customerPhone,
        pin: form.customerPin
      }
    });

    if (data.role === 'officer') {
      setOfficerToken(data.accessToken);
      setOfficer(data.officer);
      setCustomerToken('');
      setCustomer(null);
      setPocket(null);
      setMode('officer');
      sessionStorage.setItem('miniWallet.officerToken', data.accessToken);
      localStorage.setItem('miniWallet.officer', JSON.stringify(data.officer));
      sessionStorage.removeItem('miniWallet.customerToken');
      localStorage.removeItem('miniWallet.customerToken');
      localStorage.removeItem('miniWallet.customer');
    } else {
      setCustomerToken(data.accessToken);
      setCustomer(data.customer);
      setOfficerToken('');
      setOfficer(null);
      setMode('customer');
      sessionStorage.setItem('miniWallet.customerToken', data.accessToken);
      localStorage.setItem('miniWallet.customer', JSON.stringify(data.customer));
      sessionStorage.removeItem('miniWallet.officerToken');
      localStorage.removeItem('miniWallet.officerToken');
      localStorage.removeItem('miniWallet.officer');
    }

    setShowWorkspace(true);
    setForm((current) => ({
      ...current,
      customerPin: '',
      officerPin: ''
    }));

    return data;
  }

  async function registerCustomer() {
    const data = await api('/api/v1/customers/register', {
      method: 'POST',
      body: {
        phone: form.customerPhone,
        pin: form.customerPin,
        currency: form.customerCurrency || 'VND'
      }
    });

    setCustomerToken(data.accessToken);
    setCustomer(data.customer);
    setOfficerToken('');
    setOfficer(null);
    setMode('customer');
    setShowWorkspace(true);
    setForm((current) => ({ ...current, customerPin: '' }));
    sessionStorage.setItem('miniWallet.customerToken', data.accessToken);
    localStorage.setItem('miniWallet.customer', JSON.stringify(data.customer));
    sessionStorage.removeItem('miniWallet.officerToken');
    localStorage.removeItem('miniWallet.officerToken');
    localStorage.removeItem('miniWallet.officer');

    return data;
  }

  function clearSession() {
    api('/api/v1/access/logout', { method: 'POST' }).catch(() => {});
    ['miniWallet.customerToken', 'miniWallet.officerToken'].forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
    ['miniWallet.customer', 'miniWallet.officer'].forEach((key) => localStorage.removeItem(key));
    setCustomerToken('');
    setOfficerToken('');
    setCustomer(null);
    setOfficer(null);
    setPocket(null);
    setMode('customer');
    setShowWorkspace(false);
    setLogs([{ message: 'session cleared', at: new Date().toLocaleTimeString() }]);
  }

  function resetP2P() {
    setP2pStep('request');
    setP2pTransRefId('');
    setOutputs((current) => ({ ...current, p2p: null }));
    updateForm('p2pAmount', '');
    updateForm('p2pMessage', '');
    updateForm('customerPin', '');
  }

  function resetBill() {
    setBillStep('request');
    setBillTransRefId('');
    setOutputs((current) => ({ ...current, bill: null }));
    updateForm('billerId', '');
    updateForm('billCode', '');
    updateForm('customerPin', '');
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
    setP2pStep('confirm');
    return data;
  }

  async function confirmP2P() {
    const data = await api('/api/v1/transactions/confirm', {
      method: 'POST',
      role: 'customer',
      body: { transRefId: p2pTransRefId }
    });
    setOutputs((current) => ({ ...current, p2p: data }));
    setP2pStep('verify');
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
    setP2pStep('done');
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
    setBillStep('confirm');
    return data;
  }

  async function confirmBill() {
    const data = await api('/api/v1/transactions/confirm', {
      method: 'POST',
      role: 'customer',
      body: { transRefId: billTransRefId }
    });
    setOutputs((current) => ({ ...current, bill: data }));
    setBillStep('verify');
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
    setBillStep('done');
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

  function runQuickAction(actionId) {
    if (actionId === 'refresh') {
      run('refreshAll', async () => {
        const balance = await refreshBalance();
        const transactions = customerToken ? await loadHistory() : null;
        return { balance, transactions };
      });
      return;
    }

    if (actionId === 'customer-bill') {
      setMode('customer-bill');
      run('loadBillers', loadBillers);
      return;
    }

    if (actionId === 'customer-topup') {
      setMode('customer-topup');
      return;
    }

    setMode(actionId);
    if (actionId === 'transactions') {
      run('loadHistory', loadHistory);
    }
    if (actionId === 'config') {
      run('loadConfigServices', loadConfigServices);
    }
  }

  useEffect(() => {
    if (hasSession && customerToken) {
      run('refreshBalance', refreshBalance);
      run('loadBillers', loadBillers);
    }
  }, [hasSession, customerToken]);

  return (
    <main className="page-shell">
      {!hasSession ? (
        <AuthGate
          form={form}
          onChange={updateForm}
          onLogin={() => run('login', login)}
          onRegister={() => run('register', registerCustomer)}
          busy={busy}
          authMessage={authMessage}
        />
      ) : (
        <section className="dashboard-shell">
          <SideRail mode={mode} setMode={setMode} clearSession={clearSession} items={navigationItems} />
          <SummaryColumn pocket={pocket} customer={customer} officer={officer} history={history} setMode={setMode} activeRole={activeRole} />

          <section className="dashboard-main">
            <DashboardTopBar runRefresh={() => runQuickAction('refresh')} />

            <div className="hero-row">
              <div>
                <p className="eyebrow">JITS Mini Wallet</p>
                <h1>{modeLabel}</h1>
                <p>Request, confirm, verify, and inspect every wallet operation from the same workspace.</p>
              </div>
              <button className="notification-btn" type="button" title={logs[0]?.message || 'No notifications'}>{logs.length || 0}</button>
            </div>

            <ActionGrid mode={mode} actions={quickActions} runQuickAction={runQuickAction} />

            <section className="dashboard-content">
              <div className="workbench-stack">
                {mode === 'customer' ? (
                  <div className="workbench-stack">
                    <Panel title="Send Money" state={p2pTransRefId ? p2pTransRefId.slice(-8) : 'Ready'}>
                      {p2pStep === 'request' && (
                        <>
                          <div className="form-grid">
                            <TextInput label="Receiver Phone" name="p2pReceiverPhone" value={form.p2pReceiverPhone} onChange={updateForm} placeholder="Enter receiver phone" />
                            <TextInput label="Amount" name="p2pAmount" value={form.p2pAmount} onChange={updateForm} inputMode="numeric" placeholder="Enter amount" />
                            <label className="span-2">
                              Message
                              <input value={form.p2pMessage} placeholder="Add a transfer note" onChange={(event) => updateForm('p2pMessage', event.target.value)} />
                            </label>
                          </div>
                          <div className="button-row">
                            <button type="button" onClick={() => run('p2pRequest', requestP2P)}>Request</button>
                          </div>
                        </>
                      )}

                      {p2pStep === 'confirm' && (
                        <>
                          <div className="form-grid" style={{ padding: '16px', background: 'var(--surface-color)', borderRadius: '8px', marginBottom: '16px' }}>
                            <p style={{ margin: 0, gridColumn: 'span 2' }}><strong>Receiver:</strong> {outputs.p2p?.receiver?.phone || form.p2pReceiverPhone}</p>
                            <p style={{ margin: 0 }}><strong>Amount:</strong> {formatMoney(outputs.p2p?.amount, outputs.p2p?.currency)}</p>
                            <p style={{ margin: 0 }}><strong>Fee:</strong> {formatMoney(outputs.p2p?.fee, outputs.p2p?.currency)}</p>
                            <p style={{ margin: 0, gridColumn: 'span 2', fontSize: '1.2em', color: 'var(--primary-color)' }}><strong>Total:</strong> {formatMoney(outputs.p2p?.totalAmount, outputs.p2p?.currency)}</p>
                          </div>
                          <div className="button-row">
                            <button className="secondary-btn" type="button" onClick={resetP2P}>Cancel</button>
                            <button type="button" onClick={() => run('p2pConfirm', confirmP2P)}>Confirm Transfer</button>
                          </div>
                        </>
                      )}

                      {p2pStep === 'verify' && (
                        <>
                          <div className="form-grid">
                            <TextInput label="PIN" name="customerPin" value={form.customerPin} onChange={updateForm} type="password" placeholder="Enter PIN to verify" />
                          </div>
                          <div className="button-row">
                            <button className="secondary-btn" type="button" onClick={resetP2P}>Cancel</button>
                            <button type="button" onClick={() => run('p2pVerify', verifyP2P)}>Verify & Send</button>
                          </div>
                        </>
                      )}

                      {p2pStep === 'done' && (
                        <>
                          <div className="form-grid" style={{ padding: '16px', background: 'var(--surface-color)', borderRadius: '8px', marginBottom: '16px', color: 'var(--success-color)' }}>
                            <p style={{ margin: 0, gridColumn: 'span 2' }}><strong>✓ Transaction Successful</strong></p>
                            <p style={{ margin: 0, gridColumn: 'span 2' }}><strong>Code:</strong> {outputs.p2p?.transaction?.code}</p>
                          </div>
                          <div className="button-row">
                            <button type="button" onClick={resetP2P}>New Transfer</button>
                          </div>
                        </>
                      )}

                      <JsonOutput data={outputs.p2p} />
                    </Panel>
                  </div>
                ) : null}

                {mode === 'customer-bill' ? (
                  <div className="workbench-stack">
                    <Panel title="Bill Payment" state={billTransRefId ? billTransRefId.slice(-8) : 'Ready'}>
                      {billStep === 'request' && (
                        <>
                          <div className="form-grid">
                            <label>
                              Biller
                              <select value={form.billerId} onChange={(event) => updateForm('billerId', event.target.value)}>
                                <option value="">Select biller</option>
                                {billers.map((biller) => <option value={biller.id} key={biller.id}>{biller.code} - {biller.name}</option>)}
                              </select>
                            </label>
                            <TextInput label="Bill Code" name="billCode" value={form.billCode} onChange={updateForm} placeholder="Enter bill code" />
                          </div>
                          <div className="button-row">
                            <button type="button" onClick={() => run('loadBillers', loadBillers)}>Load Billers</button>
                            <button className="secondary-btn" type="button" onClick={() => run('billRequest', requestBill)}>Inquiry</button>
                          </div>
                        </>
                      )}

                      {billStep === 'confirm' && (
                        <>
                          <div className="form-grid" style={{ padding: '16px', background: 'var(--surface-color)', borderRadius: '8px', marginBottom: '16px' }}>
                            <p style={{ margin: 0 }}><strong>Bill Details</strong></p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', gridColumn: 'span 2' }}>
                              <span>Biller:</span> <strong>{billers.find(b => b.id === form.billerId)?.name}</strong>
                              <span>Amount:</span> <strong>{formatMoney(outputs.bill?.amount, outputs.bill?.currency)}</strong>
                              <span>Fee:</span> <strong>{formatMoney(outputs.bill?.fee, outputs.bill?.currency)}</strong>
                              <span>Total:</span> <strong className="amount-out">{formatMoney(outputs.bill?.totalAmount, outputs.bill?.currency)}</strong>
                            </div>
                          </div>
                          <div className="button-row">
                            <button className="secondary-btn" type="button" onClick={resetBill}>Cancel</button>
                            <button type="button" onClick={() => run('billConfirm', confirmBill)}>Confirm</button>
                          </div>
                        </>
                      )}

                      {billStep === 'verify' && (
                        <>
                          <div className="form-grid">
                            <TextInput label="PIN" name="customerPin" value={form.customerPin} onChange={updateForm} type="password" placeholder="Enter PIN to pay" />
                          </div>
                          <div className="button-row">
                            <button className="secondary-btn" type="button" onClick={resetBill}>Cancel</button>
                            <button type="button" onClick={() => run('billVerify', verifyBill)}>Verify & Pay</button>
                          </div>
                        </>
                      )}

                      {billStep === 'done' && (
                        <>
                          <div className="form-grid" style={{ padding: '16px', background: 'var(--surface-color)', borderRadius: '8px', marginBottom: '16px', color: 'var(--success-color)' }}>
                            <p style={{ margin: 0, gridColumn: 'span 2' }}><strong>✓ Bill Paid Successfully</strong></p>
                            <p style={{ margin: 0, gridColumn: 'span 2' }}><strong>Code:</strong> {outputs.bill?.transaction?.code}</p>
                          </div>
                          <div className="button-row">
                            <button type="button" onClick={resetBill}>Pay Another Bill</button>
                          </div>
                        </>
                      )}

                      <JsonOutput data={outputs.bill} />
                    </Panel>
                  </div>
                ) : null}

                {mode === 'officer' ? (
                  <Panel title="Cash-in Desk" state={officerToken ? 'Ready' : 'Login required'} wide>
                    <div className="form-grid">
                      <TextInput label="Customer Phone" name="cashInCustomerPhone" value={form.cashInCustomerPhone} onChange={updateForm} placeholder="Enter customer phone" />
                      <TextInput label="Amount" name="cashInAmount" value={form.cashInAmount} onChange={updateForm} inputMode="numeric" placeholder="Enter cash-in amount" />
                    </div>
                    {!officerToken ? <p className="inline-note">Sign in through Cash-in access before executing this operation.</p> : null}
                    <div className="button-row">
                      <button type="button" disabled={!officerToken} onClick={() => run('cashIn', cashIn)}>Confirm Cash-in</button>
                    </div>
                    <JsonOutput data={outputs.cashIn} />
                  </Panel>
                ) : null}

                {mode === 'transactions' ? (
                  <Panel title="Transaction History" state={`${history.length} item(s)`} wide>
                    <div className="button-row">
                      <button type="button" onClick={() => run('loadHistory', loadHistory)}>Load History</button>
                    </div>
                    <div className="history-list">
                      {history.map((transaction) => (
                        <div className="history-item-container" key={transaction.id}>
                          <button 
                            className={`history-item ${expandedTxId === transaction.id ? 'is-expanded' : ''}`}
                            type="button" 
                            onClick={() => {
                              if (expandedTxId === transaction.id) {
                                setExpandedTxId(null);
                              } else {
                                setExpandedTxId(transaction.id);
                                run('loadDetail', () => loadDetail(transaction.id));
                              }
                            }}
                          >
                            <strong>{transaction.type}</strong>
                            <span><small>{transaction.code}</small><br />{transaction.status}</span>
                            <b className={transaction.direction === 'OUT' ? 'amount-out' : 'amount-in'}>
                              {formatMoney(transaction.totalAmount, transaction.currency)}
                            </b>
                          </button>
                          {expandedTxId === transaction.id && outputs.detail?.transaction?.id === transaction.id && (
                            <div className="history-detail-panel">
                              <div className="detail-grid">
                                <div className="detail-row"><span>Type</span> <strong>{outputs.detail.transaction.type}</strong></div>
                                {outputs.detail.transaction.sender && <div className="detail-row"><span>Sender</span> <strong>{outputs.detail.transaction.sender.phone}</strong></div>}
                                {outputs.detail.transaction.receiver && <div className="detail-row"><span>Receiver</span> <strong>{outputs.detail.transaction.receiver.phone}</strong></div>}
                                {outputs.detail.transaction.biller && <div className="detail-row"><span>Biller</span> <strong>{outputs.detail.transaction.biller.name}</strong></div>}
                                <div className="detail-row"><span>Amount</span> <strong>{formatMoney(outputs.detail.transaction.amount, outputs.detail.transaction.currency)}</strong></div>
                                <div className="detail-row"><span>Fee</span> <strong>{formatMoney(outputs.detail.transaction.fee, outputs.detail.transaction.currency)}</strong></div>
                                <div className="detail-row"><span>Total</span> <strong>{formatMoney(outputs.detail.transaction.totalAmount, outputs.detail.transaction.currency)}</strong></div>
                                <div className="detail-row"><span>Date</span> <strong>{new Date(outputs.detail.transaction.createdAt).toLocaleString()}</strong></div>
                                {outputs.detail.metadata?.note && <div className="detail-row"><span>Note</span> <strong>{outputs.detail.metadata.note}</strong></div>}
                                {outputs.detail.trail && <div className="detail-row"><span>Trail Status</span> <strong>{outputs.detail.trail.status}</strong></div>}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {!history.length ? <EmptyState title="No transaction data" text="Load history after customer sign in." /> : null}
                  </Panel>
                ) : null}

                {mode === 'config' ? (
                  <Panel title="Service Config" state={configDetail?.service?.code || 'Cash-in access'} wide>
                    <div className="button-row">
                      <button type="button" disabled={!officerToken} onClick={() => run('loadConfigServices', loadConfigServices)}>Load Services</button>
                    </div>
                    {!officerToken ? <p className="inline-note">Config inspection uses the cash-in/operator token.</p> : null}
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
              </div>

              <aside className="dashboard-side">
                <WalletCard pocket={pocket} customer={customer} />
                <WeeklySummary history={history} />
                {activeRole === 'customer' ? (
                  <LatestTransactions
                    history={history}
                    onLoadHistory={() => run('loadHistory', loadHistory)}
                    onLoadDetail={(id) => run('loadDetail', () => loadDetail(id))}
                  />
                ) : (
                  <section className="latest-card">
                    <div className="section-title-row">
                      <h2>Cash-in Session</h2>
                    </div>
                    <EmptyState title="Operator workspace" text="Use Cash-in Desk for assisted deposits or Config for service setup." />
                  </section>
                )}
                <section className="run-log">
                  <div className="section-title-row">
                    <h2>Run Log</h2>
                    <span>{logs[0]?.message || 'Idle'}</span>
                  </div>
                  <pre>{logs.map((entry) => `[${entry.at}] ${entry.message}${entry.payload ? `\n${JSON.stringify(entry.payload, null, 2)}` : ''}`).join('\n\n')}</pre>
                </section>
              </aside>
            </section>
          </section>
        </section>
      )}
    </main>
  );
}

function ConfigDetail({ detail }) {
  if (!detail) {
    return <div className="config-detail empty-config" />;
  }

  return (
    <div className="config-detail">
      <ConfigBlock title="Fees" rows={detail.fees || []} mapRow={(row) => [row.feeType, `${formatMoney(row.amount, row.currency)}`, row.status]} />
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
