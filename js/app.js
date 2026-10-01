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
  { id: 'agents', icon: '🏪', label: 'Agen', roles: ['OWNER','OPERATOR'] },
  { id: 'production', icon: '🏭', label: 'Produksi', roles: ['OWNER','OPERATOR'] },
  { id: 'gallons', icon: '💧', label: 'Galon', roles: ['OWNER','OPERATOR'] },
  { id: 'inventory', icon: '📦', label: 'Stok', roles: ['OWNER','OPERATOR'] },
  { id: 'commission', icon: '💰', label: 'Komisi Saya', roles: ['OPERATOR'] },
  { id: 'commissions', icon: '💰', label: 'Komisi Operator', roles: ['OWNER'] }
];

const BOTTOM_MENUS = ['dashboard','transactions','production','gallons'];

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

ROUTES.production = async function(container) {
  container.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  await PRODUCTION.load(50);
  
  const todayQty = PRODUCTION.data
    .filter(function(p) { return p.date === new Date().toISOString().slice(0,10); })
    .reduce(function(s,p){ return s + Number(p.quantity_good || 0); }, 0);
  
  container.innerHTML = `
    <h2 class="page-title">Produksi</h2>
    <div class="card hero-card">
      <div class="card-title">Produksi Hari Ini (layak jual)</div>
      <div class="card-value">${todayQty} galon</div>
    </div>
    <button class="btn-primary btn-block" style="margin-bottom:16px" onclick="showProductionForm()">+ Catat Produksi</button>
    <div id="prodList"></div>
    <button class="fab" onclick="showProductionForm()">+</button>
  `;
  
  const el = $('#prodList');
  if (!PRODUCTION.data.length) {
    el.innerHTML = `<div class="empty"><span class="icon">📭</span>Belum ada produksi</div>`;
    return;
  }
  el.innerHTML = PRODUCTION.data.map(p => `
    <div class="list-item">
      <div class="main">
        <div class="title">${p.quantity_good} galon layak jual</div>
        <div class="sub">Produksi ${p.quantity_produced} • Reject ${p.quantity_reject} • ${p.operator_name} • ${p.date}</div>
      </div>
    </div>
  `).join('');
};

ROUTES.gallons = async function(container) {
  container.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  await GALLONS.load();
  
  const s = GALLONS.summary;
  container.innerHTML = `
    <h2 class="page-title">Stok Galon</h2>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">Siap Jual</div>
        <div class="card-value" style="color:var(--success)">${s.READY || 0}</div>
      </div>
      <div class="card">
        <div class="card-title">Kosong</div>
        <div class="card-value">${s.EMPTY || 0}</div>
      </div>
      <div class="card">
        <div class="card-title">Sedang Dicuci</div>
        <div class="card-value" style="color:var(--primary)">${s.WASHING || 0}</div>
      </div>
      <div class="card">
        <div class="card-title">Rusak</div>
        <div class="card-value" style="color:var(--danger)">${s.DAMAGED || 0}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Hilang</div>
      <div class="card-value">${s.LOST || 0}</div>
    </div>
    
    <div class="grid-2" style="margin-top:16px">
      <button class="btn-secondary" onclick="showGallonAdjustForm()">+/- Stok</button>
      <button class="btn-secondary" onclick="showGallonTransferForm()">Transfer</button>
    </div>
    
    <h3 style="margin:20px 0 12px;font-size:15px">Riwayat 20 Terakhir</h3>
    <div id="galHistory"></div>
  `;
  
  const hist = $('#galHistory');
  if (!GALLONS.history.length) {
    hist.innerHTML = `<div class="empty"><span class="icon">📭</span>Belum ada perubahan</div>`;
    return;
  }
  const labelMap = { READY:'Siap Jual', EMPTY:'Kosong', WASHING:'Dicuci', DAMAGED:'Rusak', LOST:'Hilang' };
  hist.innerHTML = GALLONS.history.map(h => `
    <div class="list-item">
      <div class="main">
        <div class="title">${labelMap[h.type] || h.type} ${Number(h.quantity) > 0 ? '+' : ''}${h.quantity}</div>
        <div class="sub">${h.user_name} • ${h.timestamp}</div>
      </div>
    </div>
  `).join('');
};

ROUTES.inventory = async function(container) {
  container.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  await INVENTORY.load();
  
  const isOwner = AUTH.isOwner();
  container.innerHTML = `
    <h2 class="page-title">Stok Barang</h2>
    ${isOwner ? `<button class="btn-primary btn-block" style="margin-bottom:16px" onclick="showInventoryForm()">+ Tambah Barang</button>` : ''}
    <div id="invList"></div>
    ${isOwner ? `<button class="fab" onclick="showInventoryForm()">+</button>` : ''}
  `;
  
  const el = $('#invList');
  if (!INVENTORY.items.length) {
    el.innerHTML = `<div class="empty"><span class="icon">📭</span>Belum ada barang</div>`;
    return;
  }
  el.innerHTML = INVENTORY.items.map(i => {
    const badge = i.status === 'HABIS' ? 'danger' : (i.status === 'MENIPIS' ? 'agent' : 'success');
    return `
      <div class="list-item">
        <div class="main">
          <div class="title">
            <span class="badge badge-${badge}">${i.status}</span>
            ${i.item_name}
          </div>
          <div class="sub">Stok: ${i.stock} ${i.unit} • Min: ${i.min_stock}</div>
        </div>
        <div>
          <button class="btn-secondary btn-sm" onclick="showAdjustStockForm('${i.item_id}')">+/-</button>
        </div>
      </div>
    `;
  }).join('');
};

ROUTES.commission = async function(container) {
  container.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  await COMMISSION.load();
  const d = COMMISSION.data;
  if (!d) {
    container.innerHTML = `<div class="empty"><span class="icon">⚠️</span>Gagal memuat</div>`;
    return;
  }
  container.innerHTML = `
    <h2 class="page-title">Komisi Saya</h2>
    <div class="card hero-card">
      <div class="card-title">Total Komisi</div>
      <div class="card-value">${formatRp(d.total_commission)}</div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-title">Sudah Dibayar</div>
        <div class="card-value" style="color:var(--success)">${formatRp(d.total_paid)}</div>
      </div>
      <div class="card">
        <div class="card-title">Belum Dibayar</div>
        <div class="card-value" style="color:var(--warning)">${formatRp(d.outstanding)}</div>
      </div>
    </div>
    <h3 style="margin:20px 0 12px;font-size:15px">Detail Komisi</h3>
    <div id="commDetails"></div>
  `;
  const el = $('#commDetails');
  if (!d.details || !d.details.length) {
    el.innerHTML = `<div class="empty"><span class="icon">📭</span>Belum ada komisi</div>`;
    return;
  }
  el.innerHTML = d.details.map(c => `
    <div class="list-item">
      <div class="main">
        <div class="title">${c.quantity} galon ${c.customer_type === 'AGENT' ? '(agen)' : '(konsumen)'}</div>
        <div class="sub">${formatRp(c.commission_per_gallon)}/galon • ${c.timestamp}</div>
      </div>
      <div class="right">${formatRp(c.commission_amount)}</div>
    </div>
  `).join('');
};

ROUTES.commissions = async function(container) {
  container.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  await COMMISSION.load();
  const d = COMMISSION.data;
  if (!d || !d.operators) {
    container.innerHTML = `<div class="empty"><span class="icon">⚠️</span>Gagal memuat</div>`;
    return;
  }
  container.innerHTML = `
    <h2 class="page-title">Komisi Operator</h2>
    ${d.operators.length === 0 ? '<div class="empty"><span class="icon">📭</span>Belum ada operator</div>' : ''}
    ${d.operators.map(op => `
      <div class="card">
        <div class="card-title">${op.operator_name} (@${op.username})</div>
        <div class="stat-row"><span class="label">Total Galon</span><span class="value">${op.total_quantity}</span></div>
        <div class="stat-row"><span class="label">Total Komisi</span><span class="value">${formatRp(op.total_commission)}</span></div>
        <div class="stat-row"><span class="label">Sudah Dibayar</span><span class="value" style="color:var(--success)">${formatRp(op.total_paid)}</span></div>
        <div class="stat-row"><span class="label">Sisa</span><span class="value" style="color:var(--warning)">${formatRp(op.outstanding)}</span></div>
      </div>
    `).join('')}
  `;
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

window.showProductionForm = function() {
  const html = `
    <div class="form-group">
      <label>Jumlah Produksi (galon)</label>
      <input type="number" id="f_prod_qty" min="1" value="1" oninput="recalcProd()">
    </div>
    <div class="form-group">
      <label>Galon Reject</label>
      <input type="number" id="f_prod_reject" min="0" value="0" oninput="recalcProd()">
    </div>
    <div class="calc-box">
      <div class="calc-row total"><span>Layak Jual</span><span id="calc_prod_good">0</span></div>
    </div>
    <div class="form-group">
      <label>Catatan (opsional)</label>
      <input type="text" id="f_prod_notes">
    </div>
    <button class="btn-primary btn-block" onclick="submitProductionForm()">Simpan Produksi</button>
  `;
  openModal('Catat Produksi', html);
  recalcProd();
};

window.recalcProd = function() {
  const qty = parseInt($('#f_prod_qty').value, 10) || 0;
  const reject = parseInt($('#f_prod_reject').value, 10) || 0;
  $('#calc_prod_good').textContent = Math.max(0, qty - reject);
};

window.submitProductionForm = async function() {
  const payload = {
    quantity_produced: parseInt($('#f_prod_qty').value, 10),
    quantity_reject: parseInt($('#f_prod_reject').value, 10) || 0,
    notes: $('#f_prod_notes').value
  };
  const res = await PRODUCTION.save(payload);
  if (res.success) {
    showToast(res.message, 'success');
    closeModal();
    navigate();
  } else {
    showToast(res.message, 'error');
  }
};

window.showGallonAdjustForm = function() {
  const html = `
    <div class="form-group">
      <label>Tipe Galon</label>
      <select id="f_gal_type">
        <option value="READY">Siap Jual</option>
        <option value="EMPTY">Kosong</option>
        <option value="WASHING">Sedang Dicuci</option>
        <option value="DAMAGED">Rusak</option>
        <option value="LOST">Hilang</option>
      </select>
    </div>
    <div class="form-group">
      <label>Jumlah (+ untuk menambah, - untuk mengurangi)</label>
      <input type="number" id="f_gal_qty" value="1">
    </div>
    <div class="form-group">
      <label>Catatan</label>
      <input type="text" id="f_gal_notes" placeholder="Opsional">
    </div>
    <button class="btn-primary btn-block" onclick="submitGallonAdjustForm()">Simpan</button>
  `;
  openModal('Penyesuaian Stok Galon', html);
};

window.submitGallonAdjustForm = async function() {
  const res = await GALLONS.update(
    $('#f_gal_type').value,
    parseInt($('#f_gal_qty').value, 10),
    $('#f_gal_notes').value
  );
  if (res.success) {
    showToast(res.message, 'success');
    closeModal();
    navigate();
  } else {
    showToast(res.message, 'error');
  }
};

window.showGallonTransferForm = function() {
  const html = `
    <div class="form-group">
      <label>Dari</label>
      <select id="f_gal_from">
        <option value="EMPTY">Kosong</option>
        <option value="WASHING">Sedang Dicuci</option>
        <option value="READY">Siap Jual</option>
        <option value="DAMAGED">Rusak</option>
      </select>
    </div>
    <div class="form-group">
      <label>Ke</label>
      <select id="f_gal_to">
        <option value="WASHING">Sedang Dicuci</option>
        <option value="READY">Siap Jual</option>
        <option value="DAMAGED">Rusak</option>
        <option value="LOST">Hilang</option>
      </select>
    </div>
    <div class="form-group">
      <label>Jumlah</label>
      <input type="number" id="f_gal_transfer_qty" min="1" value="1">
    </div>
    <div class="form-group">
      <label>Catatan</label>
      <input type="text" id="f_gal_transfer_notes">
    </div>
    <button class="btn-primary btn-block" onclick="submitGallonTransferForm()">Transfer</button>
  `;
  openModal('Transfer Stok Galon', html);
};

window.submitGallonTransferForm = async function() {
  const res = await GALLONS.transfer(
    $('#f_gal_from').value,
    $('#f_gal_to').value,
    parseInt($('#f_gal_transfer_qty').value, 10),
    $('#f_gal_transfer_notes').value
  );
  if (res.success) {
    showToast(res.message, 'success');
    closeModal();
    navigate();
  } else {
    showToast(res.message, 'error');
  }
};

window.showInventoryForm = function(id) {
  const it = id ? INVENTORY.getById(id) : null;
  const html = `
    <div class="form-group"><label>Nama Barang</label><input type="text" id="f_inv_name" value="${it ? escapeHtml(it.item_name) : ''}"></div>
    <div class="form-group"><label>Satuan</label><input type="text" id="f_inv_unit" placeholder="pcs / botol / roll" value="${it ? escapeHtml(it.unit) : 'pcs'}"></div>
    <div class="form-group"><label>Stok Awal</label><input type="number" id="f_inv_stock" value="${it ? it.stock : 0}"></div>
    <div class="form-group"><label>Stok Minimum</label><input type="number" id="f_inv_min" value="${it ? it.min_stock : 0}"></div>
    <button class="btn-primary btn-block" onclick="submitInventoryForm('${id || ''}')">Simpan</button>
  `;
  openModal(id ? 'Edit Barang' : 'Tambah Barang', html);
};

window.submitInventoryForm = async function(id) {
  const payload = {
    item_id: id || undefined,
    item_name: $('#f_inv_name').value,
    unit: $('#f_inv_unit').value,
    stock: parseInt($('#f_inv_stock').value, 10) || 0,
    min_stock: parseInt($('#f_inv_min').value, 10) || 0
  };
  const res = await INVENTORY.save(payload);
  if (res.success) {
    showToast(res.message, 'success');
    closeModal();
    navigate();
  } else {
    showToast(res.message, 'error');
  }
};

window.showAdjustStockForm = function(id) {
  const it = INVENTORY.getById(id);
  if (!it) return;
  const html = `
    <div style="margin-bottom:12px">
      <strong>${escapeHtml(it.item_name)}</strong><br>
      <small style="color:var(--gray-400)">Stok saat ini: ${it.stock} ${it.unit}</small>
    </div>
    <div class="form-group">
      <label>Perubahan (+ untuk masuk, - untuk keluar)</label>
      <input type="number" id="f_adj_delta" value="1">
    </div>
    <div class="form-group">
      <label>Catatan</label>
      <input type="text" id="f_adj_notes" placeholder="mis: pembelian, pemakaian">
    </div>
    <button class="btn-primary btn-block" onclick="submitAdjustStockForm('${id}')">Simpan</button>
  `;
  openModal('Penyesuaian Stok', html);
};

window.submitAdjustStockForm = async function(id) {
  const delta = parseInt($('#f_adj_delta').value, 10);
  const res = await INVENTORY.adjust(id, delta, $('#f_adj_notes').value);
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
