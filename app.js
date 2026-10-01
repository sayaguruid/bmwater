/**
 * BM WATER - Frontend (single file)
 * Ganti API_URL di bawah dengan Web App URL Apps Script.
 */
const API_URL = 'https://script.google.com/macros/s/AKfycbxR0iJihl0yzyMrTHIu4AR7v9KFxQ9JicLph1NAsdJPwOprXSdckdPdTctnvnNw8J7mfQ/exec';

// ===== STATE =====
let TOKEN = null;
let USER = null;
let CACHE = {
  customers: [],
  agents: [],
  prices: {consumer:10000, consumer2:12000, agent:8000},
  commissions: {consumer:2000, agent:1000}
};

// ===== HELPERS =====
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmtRp = n => 'Rp' + (Number(n)||0).toLocaleString('id-ID');
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

let toastTimer;
function toast(msg, type){
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' '+type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ el.className = 'toast'; }, 2500);
}
function openModal(title, html){
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = html;
  $('#modal').classList.remove('hidden');
}
function closeModal(){ $('#modal').classList.add('hidden'); }

// ===== API =====
async function api(action, data){
  data = data || {};
  data.action = action;
  if(TOKEN && action !== 'login') data.token = TOKEN;

  const res = await fetch(API_URL, {
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if(json.message && json.message.indexOf('Sesi tidak valid') !== -1){
    clearSession();
    showLogin();
  }
  return json;
}

// ===== AUTH =====
function saveSession(token, user){
  TOKEN = token; USER = user;
  localStorage.setItem('bm_token', token);
  localStorage.setItem('bm_user', JSON.stringify(user));
}
function clearSession(){
  TOKEN = null; USER = null;
  localStorage.removeItem('bm_token');
  localStorage.removeItem('bm_user');
}
function loadSession(){
  TOKEN = localStorage.getItem('bm_token');
  const raw = localStorage.getItem('bm_user');
  if(raw){ try{ USER = JSON.parse(raw); }catch(e){} }
  return !!(TOKEN && USER);
}
const isOwner = () => USER && USER.role === 'OWNER';
const isOperator = () => USER && USER.role === 'OPERATOR';

// ===== MENU =====
const MENUS = [
  {id:'dashboard', icon:'📊', label:'Dashboard', roles:['OWNER','OPERATOR']},
  {id:'transactions', icon:'🛒', label:'Penjualan', roles:['OWNER','OPERATOR']},
  {id:'customers', icon:'👥', label:'Konsumen', roles:['OWNER','OPERATOR']},
  {id:'agents', icon:'🏪', label:'Agen', roles:['OWNER','OPERATOR']},
  {id:'production', icon:'🏭', label:'Produksi', roles:['OWNER','OPERATOR']},
  {id:'gallons', icon:'💧', label:'Galon', roles:['OWNER','OPERATOR']},
  {id:'inventory', icon:'📦', label:'Stok', roles:['OWNER','OPERATOR']},
  {id:'commission', icon:'💰', label:'Komisi Saya', roles:['OPERATOR']},
  {id:'commissions', icon:'💰', label:'Komisi Operator', roles:['OWNER']},
  {id:'expenses', icon:'💸', label:'Pengeluaran', roles:['OWNER']},
  {id:'reports', icon:'📈', label:'Laporan', roles:['OWNER']},
  {id:'users', icon:'👤', label:'Operator', roles:['OWNER']},
  {id:'settings', icon:'⚙️', label:'Pengaturan', roles:['OWNER']}
];
const BOTTOM = ['dashboard','transactions','production','gallons'];

// ===== ROUTER =====
const ROUTES = {};

function currentRoute(){ return (location.hash || '#dashboard').replace('#',''); }

async function navigate(){
  const r = currentRoute();
  const m = MENUS.find(x => x.id === r);
  if(!m || !m.roles.includes(USER.role)){ location.hash = 'dashboard'; return; }

  $$('#navMenu a').forEach(a => a.classList.toggle('active', a.dataset.route === r));
  $$('#bottomNav a').forEach(a => a.classList.toggle('active', a.dataset.route === r));

  const content = $('#content');
  if(ROUTES[r]) await ROUTES[r](content);
  else content.innerHTML = `<div class="empty"><span class="icon">🚧</span>Halaman belum tersedia</div>`;
  window.scrollTo(0,0);
}

// ===== VIEWS =====

ROUTES.dashboard = async function(c){
  c.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  const r = await api('getDashboard');
  if(!r.success){ c.innerHTML = `<div class="empty">${r.message}</div>`; return; }
  const d = r.data;

  if(d.role === 'OPERATOR'){
    c.innerHTML = `
      <h2 class="page-title">Dashboard</h2>
      <div class="card hero-card">
        <div class="card-title">Galon Hari Ini</div>
        <div class="card-value">${d.today.quantity} galon</div>
        <div class="card-sub">${d.today.transactions} transaksi</div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-title">Penjualan</div><div class="card-value">${fmtRp(d.today.amount)}</div></div>
        <div class="card"><div class="card-title">Komisi Hari Ini</div><div class="card-value" style="color:var(--success)">${fmtRp(d.today.commission)}</div></div>
      </div>
      <div class="card"><div class="card-title">Komisi Bulan Ini</div><div class="card-value">${fmtRp(d.month.commission)}</div></div>
      <div class="card"><div class="card-title">Transaksi Terakhir</div>${renderRecent(d.recent)}</div>
    `;
  } else {
    c.innerHTML = `
      <h2 class="page-title">Dashboard Owner</h2>
      <div class="card hero-card">
        <div class="card-title">Omzet Hari Ini</div>
        <div class="card-value">${fmtRp(d.today.amount)}</div>
        <div class="card-sub">${d.today.quantity} galon • ${d.today.transactions} transaksi</div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-title">Konsumen</div><div class="card-value">${fmtRp(d.today.consumer_amount)}</div></div>
        <div class="card"><div class="card-title">Agen</div><div class="card-value">${fmtRp(d.today.agent_amount)}</div></div>
        <div class="card"><div class="card-title">Komisi</div><div class="card-value" style="color:var(--warning)">${fmtRp(d.today.commission)}</div></div>
        <div class="card"><div class="card-title">Pengeluaran</div><div class="card-value" style="color:var(--danger)">${fmtRp(d.today.expenses)}</div></div>
      </div>
      <div class="card">
        <div class="card-title">Laba Sementara</div>
        <div class="card-value" style="color:var(--primary)">${fmtRp(d.today.profit)}</div>
        <div class="card-sub">Omzet − Komisi − Pengeluaran</div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-title">Bulan Ini</div><div class="card-value">${fmtRp(d.month.amount)}</div><div class="card-sub">${d.month.quantity} galon</div></div>
        <div class="card"><div class="card-title">7 Hari Terakhir</div>
          ${d.last7.map(x => `<div class="stat-row"><span class="label">${x.date.slice(5)}</span><span class="value">${x.quantity}g</span></div>`).join('')}
        </div>
      </div>
      <div class="card"><div class="card-title">Transaksi Terbaru</div>${renderRecent(d.recent)}</div>
    `;
  }
};

function renderRecent(list){
  if(!list || !list.length) return `<div class="empty"><span class="icon">📭</span>Belum ada</div>`;
  return list.map(t => `
    <div class="stat-row">
      <span class="label">
        <span class="badge badge-${t.customer_type==='AGENT'?'agent':'consumer'}">${t.customer_type==='AGENT'?'Agen':'Konsumen'}</span>
        ${esc(t.customer_name)}
      </span>
      <span class="value">${t.quantity}g • ${fmtRp(t.total_amount)}</span>
    </div>
  `).join('');
}

ROUTES.transactions = async function(c){
  c.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  await Promise.all([loadCustomers(), loadAgents()]);
  const r = await api('getTransactions', {limit:100});
  const trx = r.success ? r.data.transactions : [];

  c.innerHTML = `
    <h2 class="page-title">Penjualan</h2>
    <button class="btn-primary btn-block" style="margin-bottom:16px" onclick="showTrxForm()">+ Transaksi Baru</button>
    <div id="trxList"></div>
    <button class="fab" onclick="showTrxForm()">+</button>
  `;
  const el = $('#trxList');
  if(!trx.length){ el.innerHTML = `<div class="empty"><span class="icon">📭</span>Belum ada transaksi</div>`; return; }
  el.innerHTML = trx.map(t => `
    <div class="list-item">
      <div class="main">
        <div class="title">
          <span class="badge badge-${t.customer_type==='AGENT'?'agent':'consumer'}">${t.customer_type==='AGENT'?'Agen':'Konsumen'}</span>
          ${esc(t.customer_name)}
        </div>
        <div class="sub">${t.quantity} galon × ${fmtRp(t.price_per_gallon)} • ${esc(t.operator_name)} • ${t.date}</div>
      </div>
      <div class="right">${fmtRp(t.total_amount)}</div>
    </div>
  `).join('');
};

ROUTES.customers = async function(c){
  c.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  await loadCustomers();
  const owner = isOwner();
  c.innerHTML = `
    <h2 class="page-title">Konsumen</h2>
    ${owner ? `<button class="btn-primary btn-block" style="margin-bottom:16px" onclick="showCustomerForm()">+ Tambah Konsumen</button>` : ''}
    <div id="custList"></div>
    ${owner ? `<button class="fab" onclick="showCustomerForm()">+</button>` : ''}
  `;
  const el = $('#custList');
  if(!CACHE.customers.length){ el.innerHTML = `<div class="empty"><span class="icon">📭</span>Belum ada konsumen</div>`; return; }
  el.innerHTML = CACHE.customers.map(x => `
    <div class="list-item">
      <div class="main">
        <div class="title">${esc(x.name)}</div>
        <div class="sub">${esc(x.address||'-')} • ${fmtRp(x.price)}/galon</div>
      </div>
      ${owner ? `<button class="btn-secondary btn-sm" onclick="showCustomerForm('${x.customer_id}')">Edit</button>` : ''}
    </div>
  `).join('');
};

ROUTES.agents = async function(c){
  c.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  await loadAgents();
  const owner = isOwner();
  c.innerHTML = `
    <h2 class="page-title">Agen</h2>
    ${owner ? `<button class="btn-primary btn-block" style="margin-bottom:16px" onclick="showAgentForm()">+ Tambah Agen</button>` : ''}
    <div id="agentList"></div>
    ${owner ? `<button class="fab" onclick="showAgentForm()">+</button>` : ''}
  `;
  const el = $('#agentList');
  if(!CACHE.agents.length){ el.innerHTML = `<div class="empty"><span class="icon">📭</span>Belum ada agen</div>`; return; }
  el.innerHTML = CACHE.agents.map(x => `
    <div class="list-item">
      <div class="main">
        <div class="title">${esc(x.agent_name)}</div>
        <div class="sub">${esc(x.owner_name||'-')} • ${esc(x.phone||'-')} • ${fmtRp(x.price)}/galon</div>
      </div>
      ${owner ? `<button class="btn-secondary btn-sm" onclick="showAgentForm('${x.agent_id}')">Edit</button>` : ''}
    </div>
  `).join('');
};

ROUTES.production = async function(c){
  c.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  const r = await api('getProduction', {limit:50});
  const list = r.success ? r.data.production : [];

  c.innerHTML = `
    <h2 class="page-title">Produksi</h2>
    <button class="btn-primary btn-block" style="margin-bottom:16px" onclick="showProductionForm()">+ Catat Produksi</button>
    <div id="prodList"></div>
    <button class="fab" onclick="showProductionForm()">+</button>
  `;
  const el = $('#prodList');
  if(!list.length){ el.innerHTML = `<div class="empty"><span class="icon">📭</span>Belum ada produksi</div>`; return; }
  el.innerHTML = list.map(p => `
    <div class="list-item">
      <div class="main">
        <div class="title">${p.quantity_good} galon layak jual</div>
        <div class="sub">Produksi ${p.quantity_produced} • Reject ${p.quantity_reject} • ${esc(p.operator_name)} • ${p.date}</div>
      </div>
    </div>
  `).join('');
};

ROUTES.gallons = async function(c){
  c.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  const r = await api('getGallonStock');
  const s = r.success ? r.data.summary : {READY:0,EMPTY:0,WASHING:0,DAMAGED:0,LOST:0};
  const hist = r.success ? r.data.history : [];

  c.innerHTML = `
    <h2 class="page-title">Stok Galon</h2>
    <div class="grid-2">
      <div class="card"><div class="card-title">Siap Jual</div><div class="card-value" style="color:var(--success)">${s.READY||0}</div></div>
      <div class="card"><div class="card-title">Kosong</div><div class="card-value">${s.EMPTY||0}</div></div>
      <div class="card"><div class="card-title">Dicuci</div><div class="card-value" style="color:var(--primary)">${s.WASHING||0}</div></div>
      <div class="card"><div class="card-title">Rusak</div><div class="card-value" style="color:var(--danger)">${s.DAMAGED||0}</div></div>
    </div>
    <div class="card"><div class="card-title">Hilang</div><div class="card-value">${s.LOST||0}</div></div>
    <div class="grid-2" style="margin-top:12px">
      <button class="btn-secondary" onclick="showGallonAdjust()">+/- Stok</button>
      <button class="btn-secondary" onclick="showGallonTransfer()">Transfer</button>
    </div>
    <h3 style="margin:20px 0 12px;font-size:15px">Riwayat 20 Terakhir</h3>
    <div>${hist.length ? hist.map(h => `
      <div class="list-item">
        <div class="main">
          <div class="title">${labelGallon(h.type)} ${Number(h.quantity)>0?'+':''}${h.quantity}</div>
          <div class="sub">${esc(h.user_name)} • ${h.timestamp}</div>
        </div>
      </div>`).join('') : `<div class="empty"><span class="icon">📭</span>Belum ada</div>`}</div>
  `;
};
function labelGallon(t){ return {READY:'Siap Jual',EMPTY:'Kosong',WASHING:'Dicuci',DAMAGED:'Rusak',LOST:'Hilang'}[t]||t; }

ROUTES.inventory = async function(c){
  c.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  const r = await api('getInventory');
  const items = r.success ? r.data.items : [];
  const owner = isOwner();

  c.innerHTML = `
    <h2 class="page-title">Stok Barang</h2>
    ${owner ? `<button class="btn-primary btn-block" style="margin-bottom:16px" onclick="showItemForm()">+ Tambah Barang</button>` : ''}
    <div id="invList"></div>
    ${owner ? `<button class="fab" onclick="showItemForm()">+</button>` : ''}
  `;
  const el = $('#invList');
  if(!items.length){ el.innerHTML = `<div class="empty"><span class="icon">📭</span>Belum ada barang</div>`; return; }
  el.innerHTML = items.map(i => {
    const badge = i.status==='HABIS' ? 'danger' : (i.status==='MENIPIS' ? 'agent' : 'success');
    return `
      <div class="list-item">
        <div class="main">
          <div class="title"><span class="badge badge-${badge}">${i.status}</span> ${esc(i.item_name)}</div>
          <div class="sub">Stok: ${i.stock} ${esc(i.unit)} • Min: ${i.min_stock}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn-secondary btn-sm" onclick="showAdjustStock('${i.item_id}')">+/-</button>
          ${owner ? `<button class="btn-secondary btn-sm" onclick="showItemForm('${i.item_id}')">Edit</button>` : ''}
        </div>
      </div>`;
  }).join('');
};

ROUTES.commission = async function(c){
  c.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  const r = await api('getCommissions');
  if(!r.success){ c.innerHTML = `<div class="empty">${r.message}</div>`; return; }
  const d = r.data;
  c.innerHTML = `
    <h2 class="page-title">Komisi Saya</h2>
    <div class="card hero-card">
      <div class="card-title">Total Komisi</div>
      <div class="card-value">${fmtRp(d.total_commission)}</div>
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-title">Dibayar</div><div class="card-value" style="color:var(--success)">${fmtRp(d.total_paid)}</div></div>
      <div class="card"><div class="card-title">Belum Dibayar</div><div class="card-value" style="color:var(--warning)">${fmtRp(d.outstanding)}</div></div>
    </div>
    <h3 style="margin:20px 0 12px;font-size:15px">Detail Komisi</h3>
    ${(d.details && d.details.length) ? d.details.map(x => `
      <div class="list-item">
        <div class="main">
          <div class="title">${x.quantity} galon ${x.customer_type==='AGENT'?'(agen)':'(konsumen)'}</div>
          <div class="sub">${fmtRp(x.commission_per_gallon)}/galon • ${x.timestamp}</div>
        </div>
        <div class="right">${fmtRp(x.commission_amount)}</div>
      </div>`).join('') : `<div class="empty"><span class="icon">📭</span>Belum ada</div>`}
  `;
};

ROUTES.commissions = async function(c){
  c.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  const r = await api('getCommissions');
  if(!r.success){ c.innerHTML = `<div class="empty">${r.message}</div>`; return; }
  const ops = r.data.operators || [];

  c.innerHTML = `
    <h2 class="page-title">Komisi Operator</h2>
    ${!ops.length ? `<div class="empty"><span class="icon">📭</span>Belum ada operator</div>` : ''}
    ${ops.map(op => `
      <div class="card">
        <div class="card-title">${esc(op.operator_name)} (@${esc(op.username)})</div>
        <div class="stat-row"><span class="label">Total Galon</span><span class="value">${op.total_quantity}</span></div>
        <div class="stat-row"><span class="label">Total Komisi</span><span class="value">${fmtRp(op.total_commission)}</span></div>
        <div class="stat-row"><span class="label">Dibayar</span><span class="value" style="color:var(--success)">${fmtRp(op.total_paid)}</span></div>
        <div class="stat-row"><span class="label">Sisa</span><span class="value" style="color:var(--warning)">${fmtRp(op.outstanding)}</span></div>
        ${op.outstanding > 0 ? `<button class="btn-primary btn-block" style="margin-top:12px" onclick='showPayForm("${op.operator_id}","${esc(op.operator_name)}",${op.outstanding})'>Bayar Komisi</button>` : ''}
      </div>
    `).join('')}
    <h3 style="margin:20px 0 12px;font-size:15px">Riwayat Pembayaran</h3>
    <div id="payHist"></div>
  `;

  const pr = await api('getCommissionPayments');
  const pays = (pr.success && pr.data.payments) ? pr.data.payments : [];
  $('#payHist').innerHTML = pays.length ? pays.map(p => `
    <div class="list-item">
      <div class="main"><div class="title">${esc(p.operator_name)}</div><div class="sub">${p.date} • oleh ${esc(p.user_name)}</div></div>
      <div class="right">${fmtRp(p.amount)}</div>
    </div>`).join('') : `<div class="empty"><span class="icon">📭</span>Belum ada</div>`;
};

ROUTES.expenses = async function(c){
  c.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  const r = await api('getExpenses', {limit:100});
  const list = r.success ? r.data.expenses : [];
  const total = list.reduce((s,e) => s + Number(e.amount||0), 0);

  c.innerHTML = `
    <h2 class="page-title">Pengeluaran</h2>
    <div class="card hero-card"><div class="card-title">Total (100 terakhir)</div><div class="card-value">${fmtRp(total)}</div></div>
    <button class="btn-primary btn-block" style="margin-bottom:16px" onclick="showExpenseForm()">+ Catat Pengeluaran</button>
    <div id="expList"></div>
    <button class="fab" onclick="showExpenseForm()">+</button>
  `;
  const el = $('#expList');
  if(!list.length){ el.innerHTML = `<div class="empty"><span class="icon">📭</span>Belum ada</div>`; return; }
  el.innerHTML = list.map(e => `
    <div class="list-item">
      <div class="main">
        <div class="title"><span class="badge badge-agent">${esc(e.category)}</span> ${esc(e.description)}</div>
        <div class="sub">${e.date} • ${esc(e.user_name)}</div>
      </div>
      <div class="right" style="color:var(--danger)">${fmtRp(e.amount)}</div>
    </div>`).join('');
};

// ===== REPORTS =====
let currentReport = 'sales';
const EXPENSE_CATS = ['Air baku','Listrik','Bahan','Maintenance','Transportasi','Pembelian','Lainnya'];

ROUTES.reports = async function(c){
  const r = REPORTS.presetRange('month');
  c.innerHTML = `
    <h2 class="page-title">Laporan</h2>
    <div class="tabs">
      <button class="tab active" data-r="sales" onclick="switchReport('sales',this)">Penjualan</button>
      <button class="tab" data-r="commission" onclick="switchReport('commission',this)">Komisi</button>
      <button class="tab" data-r="finance" onclick="switchReport('finance',this)">Keuangan</button>
    </div>
    <div class="card">
      <div class="grid-2">
        <div class="form-group" style="margin:0"><label>Dari</label><input type="date" id="rep_from" value="${r.from}"></div>
        <div class="form-group" style="margin:0"><label>Sampai</label><input type="date" id="rep_to" value="${r.to}"></div>
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
        <button class="btn-secondary btn-sm" onclick="setPreset('today')">Hari Ini</button>
        <button class="btn-secondary btn-sm" onclick="setPreset('week')">7 Hari</button>
        <button class="btn-secondary btn-sm" onclick="setPreset('month')">Bulan Ini</button>
        <button class="btn-primary btn-sm" onclick="applyReport()">Terapkan</button>
      </div>
    </div>
    <div id="reportContent"></div>
  `;
  await loadReport();
};

const REPORTS = {
  presetRange(p){
    const t = new Date();
    const f = d => d.toISOString().slice(0,10);
    if(p==='today'){ return {from:f(t), to:f(t)}; }
    if(p==='week'){ const s=new Date(t); s.setDate(t.getDate()-6); return {from:f(s), to:f(t)}; }
    if(p==='month'){ const s=new Date(t.getFullYear(),t.getMonth(),1); return {from:f(s), to:f(t)}; }
    return {from:'', to:''};
  }
};

async function loadReport(){
  const from = $('#rep_from').value;
  const to = $('#rep_to').value;
  $('#reportContent').innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  const r = await api('getReports', {report_type: currentReport, from, to});
  if(!r.success){ $('#reportContent').innerHTML = `<div class="empty">${r.message}</div>`; return; }
  renderReport(r.data);
}

function renderReport(d){
  const el = $('#reportContent');
  if(d.report_type === 'sales'){
    el.innerHTML = `
      <div class="card hero-card">
        <div class="card-title">Omzet</div>
        <div class="card-value">${fmtRp(d.summary.amount)}</div>
        <div class="card-sub">${d.summary.quantity} galon • ${d.summary.transactions} transaksi</div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-title">Konsumen</div><div class="card-value">${fmtRp(d.summary.consumer_amount)}</div><div class="card-sub">${d.summary.consumer_quantity} galon</div></div>
        <div class="card"><div class="card-title">Agen</div><div class="card-value">${fmtRp(d.summary.agent_amount)}</div><div class="card-sub">${d.summary.agent_quantity} galon</div></div>
      </div>
      <h3 style="margin:16px 0 8px;font-size:15px">Harian</h3>
      ${d.daily.length ? d.daily.map(x => `
        <div class="list-item">
          <div class="main"><div class="title">${x.date}</div><div class="sub">${x.quantity} galon • ${x.transactions} transaksi</div></div>
          <div class="right">${fmtRp(x.amount)}</div>
        </div>`).join('') : `<div class="empty"><span class="icon">📭</span>Tidak ada data</div>`}
    `;
  } else if(d.report_type === 'commission'){
    el.innerHTML = `
      <div class="card hero-card">
        <div class="card-title">Total Komisi</div>
        <div class="card-value">${fmtRp(d.summary.total_commission)}</div>
        <div class="card-sub">Dibayar: ${fmtRp(d.summary.total_paid)} • Sisa: ${fmtRp(d.summary.outstanding)}</div>
      </div>
      ${d.operators.length ? d.operators.map(op => `
        <div class="card">
          <div class="card-title">${esc(op.operator_name)}</div>
          <div class="stat-row"><span class="label">Konsumen</span><span class="value">${op.consumer_quantity}g</span></div>
          <div class="stat-row"><span class="label">Agen</span><span class="value">${op.agent_quantity}g</span></div>
          <div class="stat-row"><span class="label">Komisi</span><span class="value">${fmtRp(op.total_commission)}</span></div>
          <div class="stat-row"><span class="label">Sisa</span><span class="value" style="color:var(--warning)">${fmtRp(op.outstanding)}</span></div>
        </div>`).join('') : `<div class="empty"><span class="icon">📭</span>Tidak ada data</div>`}
    `;
  } else {
    el.innerHTML = `
      <div class="card hero-card">
        <div class="card-title">Laba Sementara</div>
        <div class="card-value">${fmtRp(d.summary.profit)}</div>
        <div class="card-sub">${d.summary.note}</div>
      </div>
      <div class="card">
        <div class="stat-row"><span class="label">Pendapatan</span><span class="value" style="color:var(--success)">${fmtRp(d.summary.revenue)}</span></div>
        <div class="stat-row"><span class="label">Komisi</span><span class="value" style="color:var(--warning)">- ${fmtRp(d.summary.commission)}</span></div>
        <div class="stat-row"><span class="label">Pengeluaran</span><span class="value" style="color:var(--danger)">- ${fmtRp(d.summary.expense)}</span></div>
        <div class="stat-row" style="border-top:2px solid var(--gray-200);margin-top:6px;padding-top:10px">
          <span class="label" style="font-weight:700">Laba</span>
          <span class="value" style="color:var(--primary);font-size:16px">${fmtRp(d.summary.profit)}</span>
        </div>
      </div>
      <h3 style="margin:16px 0 8px;font-size:15px">Pengeluaran per Kategori</h3>
      ${d.expense_by_category.length ? d.expense_by_category.map(x => `
        <div class="list-item"><div class="main"><div class="title">${esc(x.category)}</div></div><div class="right" style="color:var(--danger)">${fmtRp(x.amount)}</div></div>
      `).join('') : `<div class="empty"><span class="icon">📭</span>Tidak ada</div>`}
    `;
  }
}

window.switchReport = async (t, btn) => {
  currentReport = t;
  $$('.tabs .tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  await loadReport();
};
window.applyReport = loadReport;
window.setPreset = async (p) => {
  const r = REPORTS.presetRange(p);
  $('#rep_from').value = r.from;
  $('#rep_to').value = r.to;
  await loadReport();
};

// ===== USERS =====
ROUTES.users = async function(c){
  c.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  const r = await api('getUsers');
  const list = r.success ? r.data.users.filter(u => u.role === 'OPERATOR') : [];

  c.innerHTML = `
    <h2 class="page-title">Manajemen Operator</h2>
    <button class="btn-primary btn-block" style="margin-bottom:16px" onclick="showUserForm()">+ Tambah Operator</button>
    <div id="userList"></div>
    <button class="fab" onclick="showUserForm()">+</button>
  `;
  const el = $('#userList');
  if(!list.length){ el.innerHTML = `<div class="empty"><span class="icon">📭</span>Belum ada operator</div>`; return; }
  el.innerHTML = list.map(u => `
    <div class="list-item">
      <div class="main">
        <div class="title">${esc(u.name)}</div>
        <div class="sub">@${esc(u.username)} • <span class="badge badge-${u.status==='ACTIVE'?'success':'danger'}">${u.status}</span></div>
      </div>
      <button class="btn-secondary btn-sm" onclick="showUserForm('${u.user_id}')">Edit</button>
    </div>`).join('');
};

// ===== SETTINGS =====
ROUTES.settings = async function(c){
  c.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat...</div>`;
  const r = await api('getSettings');
  if(!r.success){ c.innerHTML = `<div class="empty">${r.message}</div>`; return; }
  const s = r.data.settings;
  c.innerHTML = `
    <h2 class="page-title">Pengaturan</h2>
    <div class="card">
      <div class="card-title">Harga</div>
      <div class="form-group"><label>Konsumen 1</label><input type="number" id="s_pc1" value="${s.price_consumer_1||10000}"></div>
      <div class="form-group"><label>Konsumen 2</label><input type="number" id="s_pc2" value="${s.price_consumer_2||12000}"></div>
      <div class="form-group"><label>Agen</label><input type="number" id="s_pa" value="${s.price_agent||8000}"></div>
    </div>
    <div class="card">
      <div class="card-title">Komisi</div>
      <div class="form-group"><label>Komisi Konsumen / galon</label><input type="number" id="s_cc" value="${s.commission_consumer||2000}"></div>
      <div class="form-group"><label>Komisi Agen / galon</label><input type="number" id="s_ca" value="${s.commission_agent||1000}"></div>
    </div>
    <div class="card">
      <div class="card-title">Operasional</div>
      <div class="form-group">
        <label>Auto kurangi galon READY saat penjualan</label>
        <select id="s_auto">
          <option value="0" ${String(s.auto_deduct_gallon)==='0'?'selected':''}>Tidak</option>
          <option value="1" ${String(s.auto_deduct_gallon)==='1'?'selected':''}>Ya</option>
        </select>
      </div>
    </div>
    <button class="btn-primary btn-block" onclick="saveSettingsForm()">Simpan</button>
  `;
};

window.saveSettingsForm = async () => {
  const payload = {
    settings: {
      price_consumer_1: $('#s_pc1').value,
      price_consumer_2: $('#s_pc2').value,
      price_agent: $('#s_pa').value,
      commission_consumer: $('#s_cc').value,
      commission_agent: $('#s_ca').value,
      auto_deduct_gallon: $('#s_auto').value
    }
  };
  const r = await api('saveSettings', payload);
  if(r.success){ toast(r.message, 'success'); await refreshCache(); }
  else toast(r.message, 'error');
};

// ===== CACHE =====
async function loadCustomers(){
  const r = await api('getCustomers');
  CACHE.customers = r.success ? r.data.customers : [];
  return CACHE.customers;
}
async function loadAgents(){
  const r = await api('getAgents');
  CACHE.agents = r.success ? r.data.agents : [];
  return CACHE.agents;
}
async function refreshCache(){
  const r = await api('getSettings');
  if(r.success){
    const s = r.data.settings;
    CACHE.prices = {
      consumer: parseInt(s.price_consumer_1,10)||10000,
      consumer2: parseInt(s.price_consumer_2,10)||12000,
      agent: parseInt(s.price_agent,10)||8000
    };
    CACHE.commissions = {
      consumer: parseInt(s.commission_consumer,10)||2000,
      agent: parseInt(s.commission_agent,10)||1000
    };
  }
}

// ===== FORMS =====
window.showCustomerForm = function(id){
  const c = id ? CACHE.customers.find(x => x.customer_id === id) : null;
  openModal(id?'Edit Konsumen':'Tambah Konsumen', `
    <div class="form-group"><label>Nama</label><input type="text" id="f_name" value="${c?esc(c.name):''}"></div>
    <div class="form-group"><label>Alamat</label><input type="text" id="f_addr" value="${c?esc(c.address||''):''}"></div>
    <div class="form-group"><label>Harga</label>
      <select id="f_price">
        <option value="10000" ${c && Number(c.price)===10000?'selected':''}>Rp10.000</option>
        <option value="12000" ${c && Number(c.price)===12000?'selected':''}>Rp12.000</option>
      </select>
    </div>
    <button class="btn-primary btn-block" onclick="submitCustomer('${id||''}')">Simpan</button>
  `);
};
window.submitCustomer = async function(id){
  const r = await api('saveCustomer', {
    customer_id: id||undefined,
    name: $('#f_name').value,
    address: $('#f_addr').value,
    price: parseInt($('#f_price').value,10)
  });
  if(r.success){ toast(r.message,'success'); closeModal(); navigate(); }
  else toast(r.message,'error');
};

window.showAgentForm = function(id){
  const a = id ? CACHE.agents.find(x => x.agent_id === id) : null;
  openModal(id?'Edit Agen':'Tambah Agen', `
    <div class="form-group"><label>Nama Agen</label><input type="text" id="f_agn" value="${a?esc(a.agent_name):''}"></div>
    <div class="form-group"><label>Nama Pemilik</label><input type="text" id="f_ago" value="${a?esc(a.owner_name||''):''}"></div>
    <div class="form-group"><label>No HP/WA</label><input type="text" id="f_agp" value="${a?esc(a.phone||''):''}"></div>
    <div class="form-group"><label>Alamat</label><input type="text" id="f_aga" value="${a?esc(a.address||''):''}"></div>
    <div class="form-group"><label>Catatan</label><textarea id="f_agnotes" rows="2">${a?esc(a.notes||''):''}</textarea></div>
    <button class="btn-primary btn-block" onclick="submitAgent('${id||''}')">Simpan</button>
  `);
};
window.submitAgent = async function(id){
  const r = await api('saveAgent', {
    agent_id: id||undefined,
    agent_name: $('#f_agn').value,
    owner_name: $('#f_ago').value,
    phone: $('#f_agp').value,
    address: $('#f_aga').value,
    notes: $('#f_agnotes').value
  });
  if(r.success){ toast(r.message,'success'); closeModal(); navigate(); }
  else toast(r.message,'error');
};

window.showTrxForm = function(){
  openModal('Transaksi Baru', `
    <div class="form-group"><label>Tipe Pelanggan</label>
      <select id="f_type" onchange="onTrxType()">
        <option value="CONSUMER">Konsumen</option>
        <option value="AGENT">Agen</option>
      </select>
    </div>
    <div class="form-group"><label>Pelanggan</label><select id="f_cust" onchange="recalcTrx()"></select></div>
    <div class="form-group"><label>Jumlah Galon</label><input type="number" id="f_qty" min="1" value="1" oninput="recalcTrx()"></div>
    <div class="calc-box">
      <div class="calc-row"><span>Harga/galon</span><span id="c_price">Rp0</span></div>
      <div class="calc-row"><span>Komisi/galon</span><span id="c_comm">Rp0</span></div>
      <div class="calc-row total"><span>Total Bayar</span><span id="c_total">Rp0</span></div>
      <div class="calc-row"><span>Komisi Anda</span><span id="c_ctot">Rp0</span></div>
    </div>
    <div class="form-group"><label>Catatan</label><input type="text" id="f_notes"></div>
    <button class="btn-primary btn-block" onclick="submitTrx()">Simpan</button>
  `);
  onTrxType();
};

window.onTrxType = function(){
  const t = $('#f_type').value;
  const list = t==='AGENT' ? CACHE.agents : CACHE.customers;
  $('#f_cust').innerHTML = list.length
    ? list.map(x => `<option value="${t==='AGENT'?x.agent_id:x.customer_id}">${esc(t==='AGENT'?x.agent_name:x.name)}</option>`).join('')
    : `<option value="">-- Belum ada --</option>`;
  recalcTrx();
};

window.recalcTrx = function(){
  const t = $('#f_type').value;
  const id = $('#f_cust').value;
  const qty = parseInt($('#f_qty').value,10)||0;
  let price = 0;
  if(t==='CONSUMER'){ const c = CACHE.customers.find(x => x.customer_id === id); price = c ? Number(c.price) : 0; }
  else { const a = CACHE.agents.find(x => x.agent_id === id); price = a ? Number(a.price) : 0; }
  const comm = t==='AGENT' ? CACHE.commissions.agent : CACHE.commissions.consumer;
  $('#c_price').textContent = fmtRp(price);
  $('#c_comm').textContent = fmtRp(comm);
  $('#c_total').textContent = fmtRp(qty*price);
  $('#c_ctot').textContent = fmtRp(qty*comm);
};

window.submitTrx = async function(){
  const t = $('#f_type').value;
  const cid = $('#f_cust').value;
  const qty = parseInt($('#f_qty').value,10);
  if(!cid) return toast('Pilih pelanggan','error');
  if(!qty||qty<=0) return toast('Jumlah tidak valid','error');
  const r = await api('createTransaction', {
    customer_type: t, customer_id: cid, quantity: qty, notes: $('#f_notes').value
  });
  if(r.success){ toast(r.message,'success'); closeModal(); navigate(); }
  else toast(r.message,'error');
};

window.showProductionForm = function(){
  openModal('Catat Produksi', `
    <div class="form-group"><label>Jumlah Produksi</label><input type="number" id="f_prodq" min="1" value="1" oninput="recalcProd()"></div>
    <div class="form-group"><label>Reject</label><input type="number" id="f_prodr" min="0" value="0" oninput="recalcProd()"></div>
    <div class="calc-box"><div class="calc-row total"><span>Layak Jual</span><span id="c_prodg">0</span></div></div>
    <div class="form-group"><label>Catatan</label><input type="text" id="f_prodn"></div>
    <button class="btn-primary btn-block" onclick="submitProd()">Simpan</button>
  `);
  recalcProd();
};
window.recalcProd = function(){
  const q = parseInt($('#f_prodq').value,10)||0;
  const r = parseInt($('#f_prodr').value,10)||0;
  $('#c_prodg').textContent = Math.max(0,q-r);
};
window.submitProd = async function(){
  const r = await api('saveProduction', {
    quantity_produced: parseInt($('#f_prodq').value,10),
    quantity_reject: parseInt($('#f_prodr').value,10)||0,
    notes: $('#f_prodn').value
  });
  if(r.success){ toast(r.message,'success'); closeModal(); navigate(); }
  else toast(r.message,'error');
};

window.showGallonAdjust = function(){
  openModal('Penyesuaian Stok Galon', `
    <div class="form-group"><label>Tipe</label>
      <select id="f_gtype">
        <option value="READY">Siap Jual</option>
        <option value="EMPTY">Kosong</option>
        <option value="WASHING">Dicuci</option>
        <option value="DAMAGED">Rusak</option>
        <option value="LOST">Hilang</option>
      </select>
    </div>
    <div class="form-group"><label>Jumlah (+/-)</label><input type="number" id="f_gq" value="1"></div>
    <div class="form-group"><label>Catatan</label><input type="text" id="f_gn"></div>
    <button class="btn-primary btn-block" onclick="submitGallonAdjust()">Simpan</button>
  `);
};
window.submitGallonAdjust = async function(){
  const r = await api('updateGallonStock', {
    type: $('#f_gtype').value, quantity: parseInt($('#f_gq').value,10), notes: $('#f_gn').value
  });
  if(r.success){ toast(r.message,'success'); closeModal(); navigate(); }
  else toast(r.message,'error');
};

window.showGallonTransfer = function(){
  openModal('Transfer Stok Galon', `
    <div class="form-group"><label>Dari</label>
      <select id="f_gfrom">
        <option value="EMPTY">Kosong</option>
        <option value="WASHING">Dicuci</option>
        <option value="READY">Siap Jual</option>
      </select>
    </div>
    <div class="form-group"><label>Ke</label>
      <select id="f_gto">
        <option value="WASHING">Dicuci</option>
        <option value="READY">Siap Jual</option>
        <option value="DAMAGED">Rusak</option>
        <option value="LOST">Hilang</option>
      </select>
    </div>
    <div class="form-group"><label>Jumlah</label><input type="number" id="f_gtq" min="1" value="1"></div>
    <div class="form-group"><label>Catatan</label><input type="text" id="f_gtn"></div>
    <button class="btn-primary btn-block" onclick="submitGallonTransfer()">Transfer</button>
  `);
};
window.submitGallonTransfer = async function(){
  const r = await api('transferGallonStock', {
    from_type: $('#f_gfrom').value, to_type: $('#f_gto').value,
    quantity: parseInt($('#f_gtq').value,10), notes: $('#f_gtn').value
  });
  if(r.success){ toast(r.message,'success'); closeModal(); navigate(); }
  else toast(r.message,'error');
};

window.showItemForm = function(id){
  const r = window._invCache || [];
  const it = id ? r.find(x => x.item_id === id) : null;
  openModal(id?'Edit Barang':'Tambah Barang', `
    <div class="form-group"><label>Nama</label><input type="text" id="f_in" value="${it?esc(it.item_name):''}"></div>
    <div class="form-group"><label>Satuan</label><input type="text" id="f_iu" value="${it?esc(it.unit):'pcs'}"></div>
    <div class="form-group"><label>Stok Awal</label><input type="number" id="f_is" value="${it?it.stock:0}"></div>
    <div class="form-group"><label>Stok Minimum</label><input type="number" id="f_im" value="${it?it.min_stock:0}"></div>
    <button class="btn-primary btn-block" onclick="submitItem('${id||''}')">Simpan</button>
  `);
};
window.submitItem = async function(id){
  const r = await api('saveInventoryItem', {
    item_id: id||undefined,
    item_name: $('#f_in').value, unit: $('#f_iu').value,
    stock: parseInt($('#f_is').value,10)||0,
    min_stock: parseInt($f_im => 0)
  });
  // fix typo & call properly
};

// perbaiki submitItem (versi benar)
window.submitItem = async function(id){
  const r = await api('saveInventoryItem', {
    item_id: id||undefined,
    item_name: $('#f_in').value,
    unit: $('#f_iu').value,
    stock: parseInt($('#f_is').value,10)||0,
    min_stock: parseInt($('#f_im').value,10)||0
  });
  if(r.success){ toast(r.message,'success'); closeModal(); navigate(); }
  else toast(r.message,'error');
};

window.showAdjustStock = function(id){
  openModal('Penyesuaian Stok', `
    <div class="form-group"><label>Perubahan (+/-)</label><input type="number" id="f_asd" value="1"></div>
    <div class="form-group"><label>Catatan</label><input type="text" id="f_asn"></div>
    <button class="btn-primary btn-block" onclick="submitAdjustStock('${id}')">Simpan</button>
  `);
};
window.submitAdjustStock = async function(id){
  const r = await api('adjustInventoryStock', {
    item_id: id, delta: parseInt($('#f_asd').value,10), notes: $('#f_asn').value
  });
  if(r.success){ toast(r.message,'success'); closeModal(); navigate(); }
  else toast(r.message,'error');
};

window.showExpenseForm = function(){
  openModal('Catat Pengeluaran', `
    <div class="form-group"><label>Kategori</label>
      <select id="f_ec">${EXPENSE_CATS.map(c => `<option>${c}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Keterangan</label><input type="text" id="f_ed"></div>
    <div class="form-group"><label>Nominal</label><input type="number" id="f_ea" min="1"></div>
    <div class="form-group"><label>Catatan</label><input type="text" id="f_en"></div>
    <button class="btn-primary btn-block" onclick="submitExpense()">Simpan</button>
  `);
};
window.submitExpense = async function(){
  const amt = parseInt($('#f_ea').value,10);
  if(!amt||amt<=0) return toast('Nominal tidak valid','error');
  if(!$('#f_ed').value) return toast('Keterangan wajib','error');
  const r = await api('saveExpense', {
    category: $('#f_ec').value, description: $('#f_ed').value, amount: amt, notes: $('#f_en').value
  });
  if(r.success){ toast(r.message,'success'); closeModal(); navigate(); }
  else toast(r.message,'error');
};

window.showPayForm = function(opId, name, outstanding){
  const today = new Date().toISOString().slice(0,10);
  openModal('Bayar Komisi', `
    <div style="margin-bottom:12px"><strong>${esc(name)}</strong><br><small style="color:var(--warning)">Sisa: ${fmtRp(outstanding)}</small></div>
    <div class="form-group"><label>Nominal</label><input type="number" id="f_pa" value="${outstanding}" max="${outstanding}"></div>
    <div class="grid-2">
      <div class="form-group"><label>Dari</label><input type="date" id="f_ps" value="${today}"></div>
      <div class="form-group"><label>Sampai</label><input type="date" id="f_pe" value="${today}"></div>
    </div>
    <div class="form-group"><label>Catatan</label><input type="text" id="f_pn"></div>
    <button class="btn-primary btn-block" onclick="submitPay('${opId}')">Bayar</button>
  `);
};
window.submitPay = async function(opId){
  const amt = parseInt($('#f_pa').value,10);
  if(!amt||amt<=0) return toast('Nominal tidak valid','error');
  const r = await api('payCommission', {
    operator_id: opId, amount: amt,
    period_start: $('#f_ps').value, period_end: $('#f_pe').value,
    notes: $('#f_pn').value
  });
  if(r.success){ toast(r.message,'success'); closeModal(); navigate(); }
  else toast(r.message,'error');
};

window.showUserForm = function(id){
  const r = window._userCache || [];
  const u = id ? r.find(x => x.user_id === id) : null;
  openModal(id?'Edit Operator':'Tambah Operator', `
    <div class="form-group"><label>Nama</label><input type="text" id="f_un" value="${u?esc(u.name):''}"></div>
    <div class="form-group"><label>Username</label><input type="text" id="f_uu" value="${u?esc(u.username):''}"></div>
    <div class="form-group"><label>Password ${u?'(kosongkan jika tidak diubah)':''}</label><input type="text" id="f_up"></div>
    ${u?`<div class="form-group"><label>Status</label>
      <select id="f_us">
        <option value="ACTIVE" ${u.status==='ACTIVE'?'selected':''}>Aktif</option>
        <option value="INACTIVE" ${u.status==='INACTIVE'?'selected':''}>Nonaktif</option>
      </select></div>`:''}
    <button class="btn-primary btn-block" onclick="submitUser('${id||''}')">Simpan</button>
  `);
};
window.submitUser = async function(id){
  const r = await api('saveUser', {
    user_id: id||undefined,
    name: $('#f_un').value, username: $('#f_uu').value,
    password: $('#f_up').value,
    status: id ? $('#f_us').value : 'ACTIVE'
  });
  if(r.success){ toast(r.message,'success'); closeModal(); navigate(); }
  else toast(r.message,'error');
};

// Cache user untuk form edit
const _origRoutesUsers = ROUTES.users;
ROUTES.users = async function(c){
  const r = await api('getUsers');
  window._userCache = r.success ? r.data.users : [];
  return _origRoutesUsers(c);
};
const _origRoutesInventory = ROUTES.inventory;
ROUTES.inventory = async function(c){
  const r = await api('getInventory');
  window._invCache = r.success ? r.data.items : [];
  return _origRoutesInventory(c);
};

// ===== SIDEBAR =====
function openSidebar(){ $('#sidebar').classList.add('open'); $('#overlay').classList.remove('hidden'); }
function closeSidebar(){ $('#sidebar').classList.remove('open'); $('#overlay').classList.add('hidden'); }

// ===== VIEW SWITCH =====
function showLogin(){
  $('#loginView').classList.remove('hidden');
  $('#appView').classList.add('hidden');
  closeSidebar();
}

async function showApp(){
  $('#loginView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
  $('#userName').textContent = USER.name;
  $('#userRole').textContent = USER.role;

  await refreshCache();

  const allowed = MENUS.filter(m => m.roles.includes(USER.role));
  $('#navMenu').innerHTML = allowed.map(m =>
    `<a href="#${m.id}" data-route="${m.id}"><span class="icon">${m.icon}</span>${m.label}</a>`
  ).join('');
  $('#bottomNav').innerHTML = allowed.filter(m => BOTTOM.includes(m.id)).map(m =>
    `<a href="#${m.id}" data-route="${m.id}"><span class="icon">${m.icon}</span>${m.label}</a>`
  ).join('');

  if(!location.hash) location.hash = 'dashboard';
  navigate();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#loginBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>Memuat...`;
    try {
      const r = await api('login', {
        username: $('#loginUsername').value.trim(),
        password: $('#loginPassword').value
      });
      if(r.success){
        saveSession(r.data.token, r.data.user);
        toast('Selamat datang, ' + r.data.user.name, 'success');
        await showApp();
      } else {
        toast(r.message, 'error');
      }
    } catch(ex){
      toast('Gagal terhubung: ' + ex.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Masuk';
    }
  });

  $('#logoutBtn').addEventListener('click', async () => {
    try { await api('logout'); } catch(e){}
    clearSession(); closeSidebar(); showLogin(); toast('Anda telah keluar');
  });

  $('#menuBtn').addEventListener('click', openSidebar);
  $('#overlay').addEventListener('click', closeSidebar);
  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', e => { if(e.target.id === 'modal') closeModal(); });

  window.addEventListener('hashchange', () => { if(USER) navigate(); });

  if(loadSession()) showApp();
  else showLogin();
});
