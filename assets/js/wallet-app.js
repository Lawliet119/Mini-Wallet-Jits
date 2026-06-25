(function() {
  var root = document.querySelector('[data-app="mini-wallet"]');
  if (!root) {
    return;
  }

  var state = {
    mode: 'customer',
    customerToken: localStorage.getItem('miniWallet.customerToken') || '',
    officerToken: localStorage.getItem('miniWallet.officerToken') || '',
    customer: readJson('miniWallet.customer'),
    officer: readJson('miniWallet.officer'),
    p2pTransRefId: '',
    billTransRefId: ''
  };

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (unusedErr) {
      return null;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function query(name) {
    return root.querySelector('[data-input="' + name + '"]');
  }

  function field(name) {
    return root.querySelector('[data-field="' + name + '"]');
  }

  function value(name) {
    var element = query(name);
    return element ? element.value.trim() : '';
  }

  function numberValue(name) {
    return Number(value(name));
  }

  function tokenFor(role) {
    return role === 'officer' ? state.officerToken : state.customerToken;
  }

  function setText(selector, valueText) {
    var element = root.querySelector(selector);
    if (element) {
      element.textContent = valueText;
    }
  }

  function print(output, payload) {
    var element = root.querySelector('[data-output="' + output + '"]');
    if (!element) {
      return;
    }
    element.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  }

  function log(message, payload) {
    var logBox = root.querySelector('[data-output="log"]');
    var now = new Date().toLocaleTimeString();
    var line = '[' + now + '] ' + message;
    if (payload) {
      line += '\n' + JSON.stringify(payload, null, 2);
    }
    logBox.textContent = line + '\n\n' + logBox.textContent;
    setText('[data-state="last"]', message);
  }

  function setBusy(actionName, busy) {
    var button = root.querySelector('[data-action="' + actionName + '"]');
    if (button) {
      button.disabled = busy;
    }
  }

  async function api(path, options) {
    var role = options.role || 'customer';
    var headers = {
      'Content-Type': 'application/json'
    };
    var token = tokenFor(role);
    if (token) {
      headers.Authorization = 'Bearer ' + token;
    }

    var response = await fetch(path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    var data = await response.json();
    if (data.err !== 200) {
      var err = new Error(data.message || 'Request failed');
      err.payload = data;
      throw err;
    }
    return data;
  }

  async function run(actionName, task) {
    setBusy(actionName, true);
    try {
      var data = await task();
      log(actionName + ' ok', data);
      return data;
    } catch (err) {
      var payload = err.payload || {
        message: err.message
      };
      log(actionName + ' failed', payload);
      throw err;
    } finally {
      setBusy(actionName, false);
      renderSession();
    }
  }

  function renderSession() {
    root.querySelectorAll('.mode-tab').forEach((tab) => {
      tab.classList.toggle('is-active', tab.dataset.mode === state.mode);
    });
    root.querySelectorAll('[data-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.panel !== state.mode;
    });

    var activeUser = state.mode === 'officer' ? state.officer : state.customer;
    field('role').textContent = activeUser ? state.mode : 'Guest';
    field('phone').textContent = activeUser ? activeUser.phone : '-';
    setText('[data-chip="customer"]', state.customer ? state.customer.phone : 'Signed out');
    setText('[data-chip="officer"]', state.officer ? state.officer.phone : 'Signed out');
  }

  async function refreshBalance() {
    if (!state.customerToken) {
      field('balance').textContent = '-';
      field('pocket').textContent = '-';
      return null;
    }

    var data = await api('/api/v1/wallet/balance', {
      role: 'customer'
    });
    field('balance').textContent = formatMoney(data.pocket.balance, data.pocket.currency);
    field('pocket').textContent = data.pocket.status + ' / ' + data.pocket.id.slice(-6);
    return data;
  }

  function formatMoney(amount, currency) {
    return new Intl.NumberFormat('vi-VN').format(Number(amount || 0)) + ' ' + (currency || 'VND');
  }

  async function customerLogin(register) {
    var data = await api(register ? '/api/v1/customers/register' : '/api/v1/customers/login', {
      method: 'POST',
      body: {
        phone: value('customerPhone'),
        pin: value('customerPin'),
        currency: value('customerCurrency') || 'VND'
      }
    });
    state.customerToken = data.accessToken;
    state.customer = data.customer;
    localStorage.setItem('miniWallet.customerToken', state.customerToken);
    writeJson('miniWallet.customer', state.customer);
    await refreshBalance();
    return data;
  }

  async function officerLogin(register) {
    var data = await api(register ? '/api/v1/officers/register' : '/api/v1/officers/login', {
      method: 'POST',
      body: {
        phone: value('officerPhone'),
        pin: value('officerPin'),
        name: value('officerName')
      },
      role: 'officer'
    });
    state.officerToken = data.accessToken;
    state.officer = data.officer;
    localStorage.setItem('miniWallet.officerToken', state.officerToken);
    writeJson('miniWallet.officer', state.officer);
    return data;
  }

  async function loadBillers() {
    var data = await api('/api/v1/billers', {
      role: 'customer'
    });
    var select = query('billerId');
    select.innerHTML = '';
    data.billers.forEach((biller) => {
      var option = document.createElement('option');
      option.value = biller.id;
      option.textContent = biller.code + ' - ' + biller.name;
      select.appendChild(option);
    });
    return data;
  }

  async function p2pRequest() {
    var data = await api('/api/v1/transactions/p2p/request', {
      method: 'POST',
      role: 'customer',
      body: {
        receiverPhone: value('p2pReceiverPhone'),
        amount: numberValue('p2pAmount'),
        message: value('p2pMessage')
      }
    });
    state.p2pTransRefId = data.transRefId;
    setText('[data-state="p2p"]', data.transRefId.slice(-8));
    print('p2p', data);
    return data;
  }

  async function p2pConfirm() {
    var data = await api('/api/v1/transactions/p2p/confirm', {
      method: 'POST',
      role: 'customer',
      body: {
        transRefId: state.p2pTransRefId
      }
    });
    print('p2p', data);
    return data;
  }

  async function p2pVerify() {
    var data = await api('/api/v1/transactions/p2p/verify', {
      method: 'POST',
      role: 'customer',
      body: {
        transRefId: state.p2pTransRefId,
        pin: value('customerPin')
      }
    });
    print('p2p', data);
    await refreshBalance();
    return data;
  }

  async function billRequest() {
    var data = await api('/api/v1/transactions/bills/request', {
      method: 'POST',
      role: 'customer',
      body: {
        billerId: value('billerId'),
        billCode: value('billCode')
      }
    });
    state.billTransRefId = data.transRefId;
    setText('[data-state="bill"]', data.transRefId.slice(-8));
    print('bill', data);
    return data;
  }

  async function billConfirm() {
    var data = await api('/api/v1/transactions/bills/confirm', {
      method: 'POST',
      role: 'customer',
      body: {
        transRefId: state.billTransRefId
      }
    });
    print('bill', data);
    return data;
  }

  async function billVerify() {
    var data = await api('/api/v1/transactions/bills/verify', {
      method: 'POST',
      role: 'customer',
      body: {
        transRefId: state.billTransRefId,
        pin: value('customerPin')
      }
    });
    print('bill', data);
    await refreshBalance();
    return data;
  }

  async function cashIn() {
    var data = await api('/api/v1/admin/transactions/cash-in', {
      method: 'POST',
      role: 'officer',
      body: {
        customerPhone: value('cashInCustomerPhone'),
        amount: numberValue('cashInAmount'),
        currency: 'VND'
      }
    });
    print('cashIn', data);
    await refreshBalance();
    return data;
  }

  async function loadHistory() {
    var data = await api('/api/v1/transactions/history?limit=20', {
      role: 'customer'
    });
    var list = root.querySelector('[data-list="history"]');
    list.innerHTML = '';
    data.transactions.forEach((transaction) => {
      var item = document.createElement('div');
      var amountClass = transaction.direction === 'OUT' ? 'amount-out' : 'amount-in';
      item.className = 'history-item';
      item.innerHTML = [
        '<strong>' + transaction.type + '</strong>',
        '<span><small>' + transaction.code + '</small><br>' + transaction.status + '</span>',
        '<button type="button" data-transaction-id="' + transaction.id + '"><span class="' + amountClass + '">' + formatMoney(transaction.totalAmount, transaction.currency) + '</span></button>'
      ].join('');
      list.appendChild(item);
    });
    setText('[data-state="history"]', data.pagination.total + ' item(s)');
    return data;
  }

  async function loadDetail(id) {
    var data = await api('/api/v1/transactions/' + encodeURIComponent(id), {
      role: 'customer'
    });
    print('detail', data);
    return data;
  }

  function clearSession() {
    ['miniWallet.customerToken', 'miniWallet.officerToken', 'miniWallet.customer', 'miniWallet.officer'].forEach((key) => {
      localStorage.removeItem(key);
    });
    state.customerToken = '';
    state.officerToken = '';
    state.customer = null;
    state.officer = null;
    state.p2pTransRefId = '';
    state.billTransRefId = '';
    field('balance').textContent = '-';
    field('pocket').textContent = '-';
    log('session cleared');
    renderSession();
  }

  root.addEventListener('click', (event) => {
    var modeButton = event.target.closest('[data-mode]');
    if (modeButton) {
      state.mode = modeButton.dataset.mode;
      renderSession();
      return;
    }

    var transactionButton = event.target.closest('[data-transaction-id]');
    if (transactionButton) {
      run('loadDetail', () => loadDetail(transactionButton.dataset.transactionId));
      return;
    }

    var actionButton = event.target.closest('[data-action]');
    if (!actionButton) {
      return;
    }

    var action = actionButton.dataset.action;
    var handlers = {
      refreshAll: async function() {
        await refreshBalance();
        return loadHistory();
      },
      clearSession: async function() {
        clearSession();
      },
      customerLogin: () => customerLogin(false),
      customerRegister: () => customerLogin(true),
      officerLogin: () => officerLogin(false),
      officerRegister: () => officerLogin(true),
      loadBillers: loadBillers,
      p2pRequest: p2pRequest,
      p2pConfirm: p2pConfirm,
      p2pVerify: p2pVerify,
      billRequest: billRequest,
      billConfirm: billConfirm,
      billVerify: billVerify,
      cashIn: cashIn,
      loadHistory: loadHistory
    };

    if (handlers[action]) {
      run(action, handlers[action]);
    }
  });

  renderSession();
  if (state.customerToken) {
    refreshBalance().catch((err) => log('balance failed', err.payload || {
      message: err.message
    }));
    loadBillers().catch((err) => log('billers failed', err.payload || {
      message: err.message
    }));
  }
})();
