/**
 * BM WATER - App Router & UI
 */

// === HELPERS ===
function formatRp(n) {
  const num = Number(n) || 0;
  return 'Rp' + num.toLocaleString('id-ID');
}

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

let toastTimer;
function showToast(msg, type) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2500);
}

function openModal(title, bodyHtml) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  $('#modal').classList.remove('hidden');
}
function closeModal() {
  $('#modal').classList.add('hidden');
}

// === MENUS ===
const MENUS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard', roles: ['OWNER','OPERATOR'] },
  { id: 'transactions', icon: '🛒', label: 'Penjualan', roles: ['OWNER','OPERATOR'] },
  { id: 'customers', icon: '👥', label: 'Konsumen', roles: ['OWNER','OPERATOR'] },
  { id: 'agents', icon: '🏪', label: 'Agen', roles: ['OWNER','OPERATOR'] }
];

const BOTTOM_MENUS = ['dashboard','transactions','customers','agents'];

// === ROUTER ===
const ROUTES = {};

function currentRoute() {
  return (location.hash || '#dashboard').replace('#','');
}

async function navigate() {
  const route = currentRoute();
  const menu = MENUS.find(m => m.id === route);
  
  if (!menu || !menu.roles.includes(AUTH.user.role)) {
    location.hash = 'dashboard';
    return;
  }
  
  // update nav highlight
  $$('#navMenu a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });
  $$('#bottomNav a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });
  
  const content = $('#content');
  const handler = ROUTES[route];
  if (handler) await handler(content);
  else content.innerHTML = `<div class="empty"><span class="icon">🚧</span>Halaman belum tersedia</div>`;
  
  window.scrollTo(0,0);
}

// === VIEWS ===

ROUTES.dashboard = function(container) {
  return DASHBOARD.render(container);
};

ROUTES.transactions = async function(container) {
  container.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  await Promise.all([CUSTOMERS.load(), AGENTS.load()]);
  const trx = await TRANSACTIONS.load(100);
  
  container.innerHTML = `
    <h2 class="page-title">Penjualan</h2>
    <button class="btn-primary btn-block" style="margin-bottom:16px" onclick="showTransactionForm()">+ Transaksi Baru</button>
    <div id="trxList"></div>
    <button class="fab" onclick="showTransactionForm()">+</button>
  `;
  
  const listEl = $('#trxList');
  if (!trx.length) {
    listEl.innerHTML = `<div class="empty"><span class="icon">📭</span>Belum ada transaksi</div>`;
    return;
  }
  listEl.innerHTML = trx.map(t => `
    <div class="list-item">
      <div class="main">
        <div class="title">
          <span class="badge badge-${t.customer_type === 'AGENT' ? 'agent' : 'consumer'}">${t.customer_type === 'AGENT' ? 'Agen' : 'Konsumen'}</span>
          ${t.customer_name}
        </div>
        <div class="sub">${t.quantity} galon × ${formatRp(t.price_per_gallon)} • ${t.operator_name} • ${t.date}</div>
      </div>
      <div class="right">${formatRp(t.total_amount)}</div>
    </div>
  `).join('');
};

ROUTES.customers = async function(container) {
  container.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  await CUSTOMERS.load();
  
  const isOwner = AUTH.isOwner();
  container.innerHTML = `
    <h2 class="page-title">Konsumen</h2>
    ${isOwner ? `<button class="btn-primary btn-block" style="margin-bottom:16px" onclick="showCustomerForm()">+ Tambah Konsumen</button>` : ''}
    <div id="custList"></div>
    ${isOwner ? `<button class="fab" onclick="showCustomerForm()">+</button>` : ''}
  `;
  
  const listEl = $('#custList');
  if (!CUSTOMERS.data.length) {
    listEl.innerHTML = `<div class="empty"><span class="icon">📭</span>Belum ada konsumen</div>`;
    return;
  }
  listEl.innerHTML = CUSTOMERS.data.map(c => `
    <div class="list-item">
      <div class="main">
        <div class="title">${c.name}</div>
        <div class="sub">${c.address || '-'} • ${formatRp(c.price)}/galon</div>
      </div>
      ${isOwner ? `<button class="btn-secondary btn-sm" onclick="showCustomerForm('${c.customer_id}')">Edit</button>` : ''}
    </div>
  `).join('');
};

ROUTES.agents = async function(container) {
  container.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  await AGENTS.load();
  
  const isOwner = AUTH.isOwner();
  container.innerHTML = `
    <h2 class="page-title">Agen</h2>
    ${isOwner ? `<button class="btn-primary btn-block" style="margin-bottom:16px" onclick="showAgentForm()">+ Tambah Agen</button>` : ''}
    <div id="agentList"></div>
    ${isOwner ? `<button class="fab" onclick="showAgentForm()">+</button>` : ''}
  `;
  
  const listEl = $('#agentList');
  if (!AGENTS.data.length) {
    listEl.innerHTML = `<div class="empty"><span class="icon">📭</span>Belum ada agen</div>`;
    return;
  }
  listEl.innerHTML = AGENTS.data.map(a => `
    <div class="list-item">
      <div class="main">
        <div class="title">${a.agent_name}</div>
        <div class="sub">${a.owner_name || '-'} • ${a.phone || '-'} • ${formatRp(a.price)}/galon</div>
      </div>
      ${isOwner ? `<button class="btn-secondary btn-sm" onclick="showAgentForm('${a.agent_id}')">Edit</button>` : ''}
    </div>
  `).join('');
};

// === FORMS ===

window.showCustomerForm = function(id) {
  const c = id ? CUSTOMERS.getById(id) : null;
  const html = `
    <div class="form-group">
      <label>Nama Konsumen</label>
      <input type="text" id="f_cust_name" value="${c ? escapeHtml(c.name) : ''}">
    </div>
    <div class="form-group">
      <label>Alamat</label>
      <input type="text" id="f_cust_address" value="${c ? escapeHtml(c.address || '') : ''}">
    </div>
    <div class="form-group">
      <label>Harga</label>
      <select id="f_cust_price">
        <option value="10000" ${c && Number(c.price) === 10000 ? 'selected' : ''}>Rp10.000/galon</option>
        <option value="12000" ${c && Number(c.price) === 12000 ? 'selected' : ''}>Rp12.000/galon</option>
      </select>
    </div>
    <button class="btn-primary btn-block" onclick="submitCustomerForm('${id || ''}')">Simpan</button>
  `;
  openModal(id ? 'Edit Konsumen' : 'Tambah Konsumen', html);
};

window.submitCustomerForm = async function(id) {
  const payload = {
    customer_id: id || undefined,
    name: $('#f_cust_name').value,
    address: $('#f_cust_address').value,
    price: parseInt($('#f_cust_price').value, 10)
  };
  const res = await CUSTOMERS.save(payload);
  if (res.success) {
    showToast(res.message, 'success');
    closeModal();
    navigate();
  } else {
    showToast(res.message, 'error');
  }
};

window.showAgentForm = function(id) {
  const a = id ? AGENTS.getById(id) : null;
  const html = `
    <div class="form-group"><label>Nama Agen</label><input type="text" id="f_ag_name" value="${a ? escapeHtml(a.agent_name) : ''}"></div>
    <div class="form-group"><label>Nama Pemilik</label><input type="text" id="f_ag_owner" value="${a ? escapeHtml(a.owner_name || '') : ''}"></div>
    <div class="form-group"><label>No. HP/WA</label><input type="text" id="f_ag_phone" value="${a ? escapeHtml(a.phone || '') : ''}"></div>
    <div class="form-group"><label>Alamat</label><input type="text" id="f_ag_address" value="${a ? escapeHtml(a.address || '') : ''}"></div>
    <div class="form-group"><label>Catatan</label><textarea id="f_ag_notes" rows="2">${a ? escapeHtml(a.notes || '') : ''}</textarea></div>
    <button class="btn-primary btn-block" onclick="submitAgentForm('${id || ''}')">Simpan</button>
  `;
  openModal(id ? 'Edit Agen' : 'Tambah Agen', html);
};

window.submitAgentForm = async function(id) {
  const payload = {
    agent_id: id || undefined,
    agent_name: $('#f_ag_name').value,
    owner_name: $('#f_ag_owner').value,
    phone: $('#f_ag_phone').value,
    address: $('#f_ag_address').value,
    notes: $('#f_ag_notes').value
  };
  const res = await AGENTS.save(payload);
  if (res.success) {
    showToast(res.message, 'success');
    closeModal();
    navigate();
  } else {
    showToast(res.message, 'error');
  }
};

window.showTransactionForm = function() {
  const html = `
    <div class="form-group">
      <label>Tipe Pelanggan</label>
      <select id="f_trx_type" onchange="onTrxTypeChange()">
        <option value="CONSUMER">Konsumen</option>
        <option value="AGENT">Agen</option>
      </select>
    </div>
    <div class="form-group">
      <label>Pelanggan</label>
      <select id="f_trx_customer" onchange="onTrxCustomerChange()"></select>
    </div>
    <div class="form-group">
      <label>Jumlah Galon</label>
      <input type="number" id="f_trx_qty" min="1" value="1" oninput="recalcTrx()">
    </div>
    <div class="calc-box">
      <div class="calc-row"><span>Harga/galon</span><span id="calc_price">Rp0</span></div>
      <div class="calc-row"><span>Komisi/galon</span><span id="calc_comm">Rp0</span></div>
      <div class="calc-row total"><span>Total Bayar</span><span id="calc_total">Rp0</span></div>
      <div class="calc-row"><span>Komisi Anda</span><span id="calc_comm_total">Rp0</span></div>
    </div>
    <div class="form-group">
      <label>Catatan (opsional)</label>
      <input type="text" id="f_trx_notes">
    </div>
    <button class="btn-primary btn-block" onclick="submitTransactionForm()">Simpan Transaksi</button>
  `;
  openModal('Transaksi Baru', html);
  onTrxTypeChange();
};

window.onTrxTypeChange = function() {
  const type = $('#f_trx_type').value;
  const select = $('#f_trx_customer');
  const list = type === 'AGENT' ? AGENTS.data : CUSTOMERS.data;
  select.innerHTML = list.length
    ? list.map(x => `<option value="${type === 'AGENT' ? x.agent_id : x.customer_id}">${type === 'AGENT' ? x.agent_name : x.name}</option>`).join('')
    : `<option value="">-- Belum ada data --</option>`;
  recalcTrx();
};

window.onTrxCustomerChange = function() { recalcTrx(); };

window.recalcTrx = function() {
  const type = $('#f_trx_type').value;
  const id = $('#f_trx_customer').value;
  const qty = parseInt($('#f_trx_qty').value, 10) || 0;
  
  let price = 0;
  if (type === 'CONSUMER') {
    const c = CUSTOMERS.getById(id);
    price = c ? Number(c.price) : 0;
  } else {
    const a = AGENTS.getById(id);
    price = a ? Number(a.price) : 0;
  }
  
  const calc = TRANSACTIONS.compute(type, price, qty);
  $('#calc_price').textContent = formatRp(price);
  $('#calc_comm').textContent = formatRp(calc.commissionPerGallon);
  $('#calc_total').textContent = formatRp(calc.total);
  $('#calc_comm_total').textContent = formatRp(calc.totalCommission);
};

window.submitTransactionForm = async function() {
  const payload = {
    customer_type: $('#f_trx_type').value,
    customer_id: $('#f_trx_customer').value,
    quantity: parseInt($('#f_trx_qty').value, 10),
    notes: $('#f_trx_notes').value
  };
  
  if (!payload.customer_id) return showToast('Pilih pelanggan', 'error');
  if (!payload.quantity || payload.quantity <= 0) return showToast('Jumlah tidak valid', 'error');
  
  const res = await TRANSACTIONS.create(payload);
  if (res.success) {
    showToast(res.message, 'success');
    closeModal();
    navigate();
  } else {
    showToast(res.message, 'error');
  }
};

// === UTILS ===
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// === VIEW SWITCH ===
function showLogin() {
  $('#loginView').classList.remove('hidden');
  $('#appView').classList.add('hidden');
  closeSidebar();
}
function showApp() {
  $('#loginView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
  
  $('#userName').textContent = AUTH.user.name;
  $('#userRole').textContent = AUTH.user.role;
  
  // Build menus by role
  const allowed = MENUS.filter(m => m.roles.includes(AUTH.user.role));
  $('#navMenu').innerHTML = allowed.map(m =>
    `<a href="#${m.id}" data-route="${m.id}"><span class="icon">${m.icon}</span>${m.label}</a>`
  ).join('');
  
  $('#bottomNav').innerHTML = allowed.filter(m => BOTTOM_MENUS.includes(m.id)).map(m =>
    `<a href="#${m.id}" data-route="${m.id}"><span class="icon">${m.icon}</span>${m.label}</a>`
  ).join('');
  
  if (!location.hash) location.hash = 'dashboard';
  navigate();
}

// === SIDEBAR ===
function openSidebar() {
  $('#sidebar').classList.add('open');
  $('#overlay').classList.remove('hidden');
}
function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#overlay').classList.add('hidden');
}

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
  API.init();
  AUTH.init();
  
  // Login submit
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#loginBtn');
    const username = $('#loginUsername').value.trim();
    const password = $('#loginPassword').value;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>Memuat...`;
    try {
      const res = await AUTH.login(username, password);
      if (res.success) {
        showToast('Selamat datang, ' + AUTH.user.name, 'success');
        showApp();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('Gagal terhubung ke server: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Masuk';
    }
  });
  
  // Logout
  $('#logoutBtn').addEventListener('click', async () => {
    await AUTH.logout();
    closeSidebar();
    showToast('Anda telah keluar');
    showLogin();
  });
  
  // Menu toggle
  $('#menuBtn').addEventListener('click', openSidebar);
  $('#overlay').addEventListener('click', closeSidebar);
  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  
  // Hash change
  window.addEventListener('hashchange', () => {
    if (AUTH.isLoggedIn()) navigate();
  });
  
  // Auto-login
  if (AUTH.isLoggedIn()) showApp();
  else showLogin();
});
