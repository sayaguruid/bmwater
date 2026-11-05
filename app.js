/*******************************************************
 * BM WATER - FRONTEND (GitHub Pages)
 * Backend: Google Apps Script
 *******************************************************/

// ============ CONFIG ============
const API_URL = 'https://script.google.com/macros/s/AKfycbw4fnyrVl5i2EvwDQWMzG-xQLQjfJ0oeDE1KhiIycUY4UrRJt6hGteF_xwD6JiCZFk/exec';
// Ganti dengan URL Web App Apps Script Anda

const STATE = {
  user: null,
  page: 'dashboard',
  cache: {},
  filter: {}
};

// ============ API (JSONP) ============
function api(action, payload) {
  return new Promise((resolve, reject) => {
    const callback = 'cb_' + Date.now() + '_' + Math.floor(Math.random()*9999);
    const params = new URLSearchParams({
      action: action,
      payload: JSON.stringify(payload || {}),
      callback: callback
    });
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Request timeout'));
    }, 30000);

    function cleanup() {
      clearTimeout(timer);
      delete window[callback];
      if (script.parentNode) script.parentNode.removeChild(script);
    }
    window[callback] = function(res) {
      cleanup();
      if (res.ok) resolve(res.data);
      else reject(new Error(res.error));
    };
    script.onerror = function() { cleanup(); reject(new Error('Network error')); };
    script.src = API_URL + '?' + params.toString();
    document.body.appendChild(script);
  });
}

// ============ HELPERS ============
function $(s) { return document.querySelector(s); }
function rp(n) { return 'Rp' + Number(n||0).toLocaleString('id-ID'); }
function esc(s) {
  return String(s==null?'':s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function loading(b) { const el = $('#loading'); if (el) el.classList.toggle('show', b); }
function toast(msg, type) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg;
  t.className = 'toast show ' + (type || '');
  setTimeout(() => t.className = 'toast ' + (type || ''), 2500);
}
function openModal(html) {
  $('#modal').innerHTML = html;
  $('#modal-bg').classList.add('show');
}
function closeModal() { $('#modal-bg').classList.remove('show'); }
function confirmBox(msg) { return window.confirm(msg); }
function val(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function num(id) { return Number(val(id)) || 0; }

// ============ LOGIN ============
function doLogin(e) {
  e.preventDefault();
  const u = val('username').trim();
  const p = val('password');
  if (!u || !p) return toast('Isi username & password', 'error');
  loading(true);
  api('login', { username: u, password: p })
    .then(user => {
      STATE.user = user;
      localStorage.setItem('bw_user', JSON.stringify(user));
      renderApp();
      toast('Selamat datang, ' + user.Nama, 'success');
    })
    .catch(err => toast(err.message, 'error'))
    .finally(() => loading(false));
}

function logout() {
  if (!confirmBox('Keluar dari aplikasi?')) return;
  localStorage.removeItem('bw_user');
  STATE.user = null;
  renderLogin();
}

// ============ RENDER ============
function render() {
  if (!STATE.user) return renderLogin();
  renderApp();
}

function renderLogin() {
  $('#root').innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <h1>💧 BM Water</h1>
        <p>Sistem Manajemen Depot Air Minum</p>
        <form onsubmit="doLogin(event)">
          <div class="form-group"><label>Username</label>
            <input id="username" type="text" autocomplete="username" placeholder="Username"></div>
          <div class="form-group"><label>Password</label>
            <input id="password" type="password" autocomplete="current-password" placeholder="Password"></div>
          <button class="btn" type="submit">MASUK</button>
        </form>
        <p style="margin-top:14px;font-size:11px;color:#999;text-align:center">
          Default: owner/owner123 • operator/operator123
        </p>
      </div>
    </div>`;
}

function renderApp() {
  const u = STATE.user;
  $('#root').innerHTML = `
    <div class="app">
      <div class="header">
        <div>
          <h1>💧 BM Water</h1>
          <div class="user">${esc(u.Nama)} • ${u.Role}</div>
        </div>
        <button onclick="logout()">Keluar</button>
      </div>
      <div id="content"></div>
      <nav class="nav" id="nav"></nav>
    </div>`;
  renderNav();
  go(STATE.page);
}

function renderNav() {
  const isOwner = STATE.user.Role === 'OWNER';
  const items = isOwner ? [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'sales', icon: '🛒', label: 'Transaksi' },
    { id: 'agents', icon: '🏪', label: 'Agen' },
    { id: 'stock', icon: '📦', label: 'Stok' },
    { id: 'finance', icon: '💰', label: 'Keuangan' },
    { id: 'more', icon: '⚙️', label: 'Lainnya' }
  ] : [
    { id: 'dashboard', icon: '📊', label: 'Home' },
    { id: 'sales', icon: '🛒', label: 'Jual' },
    { id: 'delivery', icon: '🚚', label: 'Antar' },
    { id: 'expense', icon: '💵', label: 'Keluar' },
    { id: 'commission', icon: '🎁', label: 'Komisi' },
    { id: 'history', icon: '📋', label: 'Riwayat' }
  ];
  $('#nav').innerHTML = items.map(i => `
    <a onclick="go('${i.id}')" class="${STATE.page===i.id?'active':''}">
      <span class="icon">${i.icon}</span><span>${i.label}</span>
    </a>`).join('');
}

function go(page) {
  STATE.page = page;
  renderNav();
  const views = {
    dashboard: viewDashboard,
    sales: viewSales,
    delivery: viewDelivery,
    expense: viewExpense,
    commission: viewCommission,
    history: viewHistory,
    agents: viewAgents,
    stock: viewStock,
    finance: viewFinance,
    more: viewMore,
    receivables: viewReceivables,
    reports: viewReports,
    audit: viewAudit,
    settings: viewSettings,
    operators: viewOperators,
    purchases: viewPurchases,
    reconcile: viewReconcile,
    master: viewMaster
  };
  (views[page] || viewDashboard)($('#content'));
  window.scrollTo(0, 0);
}

// ============ DASHBOARD ============
async function viewDashboard(el) {
  el.innerHTML = '<div class="section"><p style="text-align:center;color:#999">Memuat...</p></div>';
  try {
    const isOwner = STATE.user.Role === 'OWNER';
    if (isOwner) {
      const d = await api('dashboardOwner', {});
      el.innerHTML = ownerDashHTML(d);
    } else {
      const d = await api('dashboardOperator', { OperatorID: STATE.user.ID });
      el.innerHTML = operatorDashHTML(d);
    }
  } catch (err) {
    el.innerHTML = `<div class="section"><p style="color:red">${esc(err.message)}</p>
      <button class="btn" onclick="go('dashboard')">Coba Lagi</button></div>`;
  }
}

function operatorDashHTML(d) {
  return `
    <div class="cards">
      <div class="card"><div class="label">Penjualan Hari Ini</div><div class="value">${rp(d.penjualanHariIni)}</div></div>
      <div class="card"><div class="label">Galon Terjual</div><div class="value">${d.galonTerjual}</div></div>
      <div class="card"><div class="label">Penjualan Agen</div><div class="value">${rp(d.penjualanAgen)}</div></div>
      <div class="card"><div class="label">Pengantaran</div><div class="value">${d.pengantaranHariIni}</div></div>
      <div class="card"><div class="label">Komisi Hari Ini</div><div class="value">${rp(d.komisiHariIni)}</div></div>
      <div class="card alert"><div class="label">Komisi Belum Dibayar</div><div class="value">${rp(d.komisiBelumDibayar)}</div></div>
      <div class="card"><div class="label">Pengeluaran Hari Ini</div><div class="value">${rp(d.pengeluaranHariIni)}</div></div>
      <div class="card warn"><div class="label">Galon Rusak</div><div class="value">${d.galonRusak}</div></div>
      <div class="card"><div class="label">Galon dari Agen</div><div class="value">${d.galonDariAgen}</div></div>
    </div>
    <div class="quick">
      <button class="btn" onclick="modalSale('KONSUMEN')">+ PENJUALAN KONSUMEN</button>
      <button class="btn secondary" onclick="modalSale('AGEN')">+ PENJUALAN AGEN</button>
      <button class="btn secondary" onclick="modalExpense()">+ PENGELUARAN</button>
      <button class="btn secondary" onclick="modalGallonCondition()">+ GALON RUSAK</button>
      <button class="btn secondary" onclick="modalAgentReturn()">+ GALON DARI AGEN</button>
    </div>`;
}

function ownerDashHTML(d) {
  const alerts = (d.alerts || []).map(a => {
    const cls = a.level === 'warning' || a.level === 'warn' ? 'warning' : 'info';
    return `<div class="alert-box ${cls}">⚠️ ${esc(a.msg)}</div>`;
  }).join('');
  const perOpRows = Object.keys(d.perOperator || {}).map(id => {
    const p = d.perOperator[id];
    return `<tr><td>${esc(id)}</td><td>${p.galon}</td><td>${rp(p.total)}</td></tr>`;
  }).join('');
  return `
    <div class="section"><h2>📈 Penjualan</h2></div>
    <div class="cards">
      <div class="card"><div class="label">Omzet Hari Ini</div><div class="value">${rp(d.omzetHariIni)}</div></div>
      <div class="card"><div class="label">Omzet Bulan Ini</div><div class="value">${rp(d.omzetBulanIni)}</div></div>
      <div class="card"><div class="label">Galon Terjual</div><div class="value">${d.galonTerjual}</div></div>
      <div class="card"><div class="label">Konsumen</div><div class="value">${rp(d.penjualanKonsumen)}</div></div>
      <div class="card"><div class="label">Agen</div><div class="value">${rp(d.penjualanAgen)}</div></div>
    </div>
    <div class="section"><h2>💰 Keuangan</h2></div>
    <div class="cards">
      <div class="card"><div class="label">Pemasukan</div><div class="value">${rp(d.totalPemasukan)}</div></div>
      <div class="card"><div class="label">Pengeluaran</div><div class="value">${rp(d.totalPengeluaran)}</div></div>
      <div class="card alert"><div class="label">Piutang</div><div class="value">${rp(d.totalPiutang)}</div></div>
      <div class="card alert"><div class="label">Komisi Belum Dibayar</div><div class="value">${rp(d.totalKomisi)}</div></div>
      <div class="card"><div class="label">Estimasi Laba</div><div class="value">${rp(d.estimasiLaba)}</div></div>
    </div>
    <div class="section"><h2>📦 Stok</h2></div>
    <div class="cards">
      <div class="card"><div class="label">Stok Galon</div><div class="value">${d.stokGalon}</div></div>
      <div class="card warn"><div class="label">Galon Rusak</div><div class="value">${d.galonRusak}</div></div>
      <div class="card"><div class="label">Stok Tisu</div><div class="value">${d.stokTisu}</div></div>
      <div class="card"><div class="label">Stok Tutup</div><div class="value">${d.stokTutup}</div></div>
    </div>
    ${alerts ? `<div class="section"><h2>⚠️ Peringatan</h2></div>${alerts}` : ''}
    ${perOpRows ? `
      <div class="section"><h2>👥 Penjualan per Operator</h2></div>
      <div class="table-wrap"><table><thead><tr><th>Operator</th><th>Galon</th><th>Total</th></tr></thead>
        <tbody>${perOpRows}</tbody></table></div>` : ''}
    <div class="quick">
      <button class="btn" onclick="go('sales')">Lihat Semua Transaksi</button>
      <button class="btn secondary" onclick="go('reconcile')">🔍 Rekonsiliasi</button>
    </div>`;
}

// ============ VIEW SALES ============
async function viewSales(el) {
  el.innerHTML = `
    <div class="section"><h2>Transaksi</h2>
      <button class="btn" onclick="modalSale('KONSUMEN')">+ Penjualan Konsumen</button>
      <button class="btn secondary" onclick="modalSale('AGEN')">+ Penjualan Agen</button>
    </div>
    <div class="tabs" id="trx-tabs">
      <button class="active" onclick="filterTrx(this,'')">Semua</button>
      <button onclick="filterTrx(this,'KONSUMEN')">Konsumen</button>
      <button onclick="filterTrx(this,'AGEN')">Agen</button>
      <button onclick="filterTrx(this,'hutang')">Hutang</button>
    </div>
    <div class="table-wrap" id="trx-list"><p style="color:#999;padding:16px">Memuat...</p></div>`;
  loadTrxList();
}

let _trxFilter = '';
async function filterTrx(btn, f) {
  _trxFilter = f;
  document.querySelectorAll('#trx-tabs button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadTrxList();
}

async function loadTrxList() {
  try {
    const p = {};
    if (STATE.user.Role === 'OPERATOR') p.operatorId = STATE.user.ID;
    if (_trxFilter === 'KONSUMEN' || _trxFilter === 'AGEN') p.tipe = _trxFilter;
    let list = await api('listTransactions', p);
    if (_trxFilter === 'hutang') list = list.filter(x => Number(x.Hutang) > 0);
    const el = $('#trx-list');
    if (!list.length) { el.innerHTML = '<p style="color:#999;padding:16px">Belum ada transaksi</p>'; return; }
    const canEdit = STATE.user.Role === 'OWNER';
    el.innerHTML = `<table><thead><tr>
      <th>ID</th><th>Tgl</th><th>Tipe</th><th>Galon</th><th>Total</th><th>Status</th>${canEdit?'<th>Aksi</th>':''}
    </tr></thead><tbody>
      ${list.slice(0,200).map(t => `<tr>
        <td>${esc(t.ID)}</td>
        <td>${esc(t.Tanggal)}</td>
        <td><span class="badge ${t.Tipe==='AGEN'?'blue':'green'}">${t.Tipe}</span></td>
        <td>${t.Jumlah}</td>
        <td>${rp(t.Total)}</td>
        <td>${t.Status==='BATAL'?'<span class="badge red">BATAL</span>':
          (Number(t.Hutang)>0?'<span class="badge orange">HUTANG</span>':'<span class="badge green">LUNAS</span>')}</td>
        ${canEdit?`<td>
          ${t.Status!=='BATAL'?`<button class="btn small danger" onclick="cancelTrx('${t.ID}')">Batal</button>`:''}
        </td>`:''}
      </tr>`).join('')}
    </tbody></table>`;
  } catch (e) {
    $('#trx-list').innerHTML = `<p style="color:red;padding:16px">${esc(e.message)}</p>`;
  }
}

async function cancelTrx(id) {
  const alasan = prompt('Alasan pembatalan:');
  if (!alasan) return;
  loading(true);
  try {
    await api('cancelTransaction', { ID: id, Alasan: alasan, UserID: STATE.user.ID });
    toast('Transaksi dibatalkan', 'success');
    loadTrxList();
  } catch (e) { toast(e.message, 'error'); }
  loading(false);
}

// ============ MODAL PENJUALAN ============
async function modalSale(tipe) {
  loading(true);
  try {
    const products = await api('getProducts', {});
    const active = products.filter(p => p.Status === 'Aktif');
    let agents = [];
    if (tipe === 'AGEN') {
      agents = (await api('getAgents', {})).filter(a => a.Status === 'Aktif');
    }
    const opts = active.map(p =>
      `<option value="${p.ID}" data-h="${p.HargaKonsumen}" data-ha="${p.HargaAgen}" data-kj="${p.KomisiJual||2000}" data-ka="${p.KomisiAntar||1000}">${esc(p.Nama)} - ${rp(p.HargaKonsumen)}</option>`
    ).join('');
    const agentOpts = agents.map(a => `<option value="${a.ID}">${esc(a.Nama)}</option>`).join('');
    openModal(`
      <div class="modal-header"><h3>Penjualan ${tipe}</h3><button onclick="closeModal()">×</button></div>
      <div class="modal-body">
        <form onsubmit="submitSale(event,'${tipe}')">
          ${tipe==='AGEN'?`<div class="form-group"><label>Pilih Agen *</label>
            <select id="s_agen" required><option value="">-- Pilih --</option>${agentOpts}</select></div>`:''}
          <div class="form-group"><label>Jenis Galon *</label>
            <select id="s_produk" required onchange="hitungTotal('${tipe}')">${opts}</select></div>
          <div class="form-group"><label>Jumlah Galon *</label>
            <input id="s_jumlah" type="number" min="1" value="1" required oninput="hitungTotal('${tipe}')"></div>
          <div class="total-box">
            <div class="sub">Total</div>
            <div class="total" id="s_total">Rp0</div>
            <div class="sub" id="s_harga">Harga: -</div>
          </div>
          ${tipe==='AGEN'?`
            <div class="form-group"><label>Status Pengiriman *</label>
              <select id="s_deliv" required onchange="hitungTotal('AGEN')">
                <option value="DIAMBIL_AGEN">Diambil Agen (Komisi Rp2.000/galon)</option>
                <option value="DIANTAR_OPERATOR">Diantar Operator (Komisi Rp1.000/galon)</option>
              </select></div>
            <div class="form-group"><label>Komisi Operator (otomatis)</label>
              <input id="s_komisi" type="text" readonly value="Rp0" style="background:#f5f5f5"></div>`:''}
          <div class="form-group"><label>Metode Pembayaran *</label>
            <select id="s_metode" required onchange="toggleBayar()">
              <option value="LUNAS">Lunas</option>
              <option value="SEBAGIAN">Sebagian</option>
              <option value="HUTANG">Hutang</option>
            </select></div>
          <div class="form-group" id="g_dibayar" style="display:none">
            <label>Nominal Dibayar *</label>
            <input id="s_dibayar" type="number" min="0" value="0" oninput="toggleBayar()"></div>
          <div class="form-group"><label>Catatan <span id="lbl_catatan"></span></label>
            <textarea id="s_catatan" rows="2" placeholder="Contoh: Pak Dedi, dibayar besok"></textarea></div>
          <button class="btn" type="submit">SIMPAN TRANSAKSI</button>
        </form>
      </div>`);
    hitungTotal(tipe);
  } catch (e) { toast(e.message, 'error'); }
  loading(false);
}

function hitungTotal(tipe) {
  const sel = $('#s_produk'); if (!sel) return;
  const opt = sel.options[sel.selectedIndex];
  if (!opt) return;
  const isAgen = tipe === 'AGEN';
  const harga = isAgen ? Number(opt.dataset.ha) : Number(opt.dataset.h);
  const jumlah = num('s_jumlah');
  const total = harga * jumlah;
  $('#s_total').textContent = rp(total);
  $('#s_harga').textContent = `Harga: ${rp(harga)} × ${jumlah}`;
  if (isAgen) {
    const deliv = $('#s_deliv').value;
    const rate = deliv === 'DIAMBIL_AGEN' ? Number(opt.dataset.kj) : Number(opt.dataset.ka);
    $('#s_komisi').value = rp(rate * jumlah);
  }
  toggleBayar();
}

function toggleBayar() {
  const m = $('#s_metode'); if (!m) return;
  const g = $('#g_dibayar');
  const lbl = $('#lbl_catatan');
  if (m.value === 'SEBAGIAN') { g.style.display = 'block'; lbl.textContent = '(wajib)'; }
  else if (m.value === 'HUTANG') { g.style.display = 'none'; lbl.textContent = '(wajib)'; }
  else { g.style.display = 'none'; lbl.textContent = ''; }
}

async function submitSale(e, tipe) {
  e.preventDefault();
  const p = {
    Tipe: tipe,
    ProdukID: val('s_produk'),
    Jumlah: num('s_jumlah'),
    MetodeBayar: val('s_metode'),
    Dibayar: num('s_dibayar'),
    Catatan: val('s_catatan'),
    OperatorID: STATE.user.ID
  };
  if (tipe === 'AGEN') {
    p.AgenID = val('s_agen');
    p.DeliveryStatus = val('s_deliv');
  }
  loading(true);
  try {
    await api('createSale', p);
    closeModal();
    toast('Transaksi berhasil disimpan', 'success');
    go(STATE.page);
  } catch (err) { toast(err.message, 'error'); }
  loading(false);
}

// ============ MODAL PENGELUARAN ============
function modalExpense() {
  openModal(`
    <div class="modal-header"><h3>Pengeluaran</h3><button onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <form onsubmit="submitExpense(event)">
        <div class="form-group"><label>Kategori *</label>
          <select id="e_kat" required>
            <option>Bensin</option><option>Parkir</option><option>Kebersihan</option>
            <option>Perbaikan</option><option>Keperluan depot</option><option>Lainnya</option>
          </select></div>
        <div class="form-group"><label>Nominal *</label>
          <input id="e_nom" type="number" min="1" required></div>
        <div class="form-group"><label>Keterangan</label>
          <textarea id="e_ket" rows="2"></textarea></div>
        <button class="btn" type="submit">AJUKAN</button>
      </form>
    </div>`);
}

async function submitExpense(e) {
  e.preventDefault();
  loading(true);
  try {
    await api('createExpense', {
      Kategori: val('e_kat'),
      Nominal: num('e_nom'),
      Keterangan: val('e_ket'),
      OperatorID: STATE.user.ID
    });
    closeModal();
    toast('Pengeluaran diajukan', 'success');
    go(STATE.page);
  } catch (err) { toast(err.message, 'error'); }
  loading(false);
}

// ============ MODAL KONDISI GALON ============
async function modalGallonCondition() {
  loading(true);
  try {
    const products = await api('getProducts', {});
    const opts = products.map(p => `<option value="${p.ID}">${esc(p.Nama)}</option>`).join('');
    openModal(`
      <div class="modal-header"><h3>Lapor Kondisi Galon</h3><button onclick="closeModal()">×</button></div>
      <div class="modal-body">
        <form onsubmit="submitGallonCondition(event)">
          <div class="form-group"><label>Produk *</label><select id="g_produk" required>${opts}</select></div>
          <div class="form-group"><label>Jumlah *</label>
            <input id="g_jumlah" type="number" min="1" required value="1"></div>
          <div class="form-group"><label>Kondisi *</label>
            <select id="g_kondisi" required>
              <option>Baik</option><option>Kotor</option><option>Rusak</option>
              <option>Bocor</option><option>Pecah</option><option>Hilang</option>
            </select></div>
          <div class="form-group"><label>Catatan</label>
            <textarea id="g_catatan" rows="2"></textarea></div>
          <button class="btn" type="submit">SIMPAN</button>
        </form>
      </div>`);
  } catch (e) { toast(e.message, 'error'); }
  loading(false);
}

async function submitGallonCondition(e) {
  e.preventDefault();
  loading(true);
  try {
    await api('reportGallonCondition', {
      ProdukID: val('g_produk'),
      Jumlah: num('g_jumlah'),
      Kondisi: val('g_kondisi'),
      Catatan: val('g_catatan'),
      OperatorID: STATE.user.ID
    });
    closeModal();
    toast('Laporan tersimpan', 'success');
    go(STATE.page);
  } catch (err) { toast(err.message, 'error'); }
  loading(false);
}

// ============ MODAL GALON DARI AGEN ============
async function modalAgentReturn() {
  loading(true);
  try {
    const agents = await api('getAgents', {});
    const products = await api('getProducts', {});
    const agOpts = agents.map(a => `<option value="${a.ID}">${esc(a.Nama)}</option>`).join('');
    const prOpts = products.map(p => `<option value="${p.ID}">${esc(p.Nama)}</option>`).join('');
    openModal(`
      <div class="modal-header"><h3>Galon dari Agen</h3><button onclick="closeModal()">×</button></div>
      <div class="modal-body">
        <form onsubmit="submitAgentReturn(event)">
          <div class="form-group"><label>Agen *</label>
            <select id="ar_agen" required><option value="">-- Pilih --</option>${agOpts}</select></div>
          <div class="form-group"><label>Produk *</label><select id="ar_produk" required>${prOpts}</select></div>
          <div class="form-group"><label>Baik</label><input id="ar_baik" type="number" min="0" value="0"></div>
          <div class="form-group"><label>Kotor</label><input id="ar_kotor" type="number" min="0" value="0"></div>
          <div class="form-group"><label>Rusak</label><input id="ar_rusak" type="number" min="0" value="0"></div>
          <div class="form-group"><label>Bocor</label><input id="ar_bocor" type="number" min="0" value="0"></div>
          <div class="form-group"><label>Pecah</label><input id="ar_pecah" type="number" min="0" value="0"></div>
          <button class="btn" type="submit">SIMPAN</button>
        </form>
      </div>`);
  } catch (e) { toast(e.message, 'error'); }
  loading(false);
}

async function submitAgentReturn(e) {
  e.preventDefault();
  loading(true);
  try {
    await api('agentGallonReturn', {
      AgenID: val('ar_agen'),
      ProdukID: val('ar_produk'),
      Baik: num('ar_baik'),
      Kotor: num('ar_kotor'),
      Rusak: num('ar_rusak'),
      Bocor: num('ar_bocor'),
      Pecah: num('ar_pecah'),
      OperatorID: STATE.user.ID
    });
    closeModal();
    toast('Data tersimpan', 'success');
    go(STATE.page);
  } catch (err) { toast(err.message, 'error'); }
  loading(false);
}

// ============ VIEW PENGANTARAN ============
async function viewDelivery(el) {
  try {
    const p = STATE.user.Role === 'OPERATOR' ? { operatorId: STATE.user.ID } : {};
    const list = await api('listDeliveries', p);
    el.innerHTML = `<div class="section"><h2>Pengantaran</h2></div>
      <div class="table-wrap">${list.length ? `<table><thead><tr>
        <th>ID</th><th>Waktu</th><th>Agen</th><th>Jumlah</th><th>Status</th><th>Aksi</th>
      </tr></thead><tbody>
        ${list.map(d => `<tr>
          <td>${esc(d.ID)}</td>
          <td>${esc(String(d.WaktuTrx).substring(0,16))}</td>
          <td>${esc(d.AgenID)}</td><td>${d.Jumlah}</td>
          <td><span class="badge ${d.Status==='SELESAI'?'green':d.Status==='BATAL'?'red':'orange'}">${d.Status}</span></td>
          <td>${d.Status!=='SELESAI'&&d.Status!=='BATAL'?
            `<button class="btn small success" onclick="setDelivery('${d.ID}','SELESAI')">Selesai</button>`:''}</td>
        </tr>`).join('')}
      </tbody></table>` : '<p style="padding:16px;color:#999">Tidak ada pengantaran</p>'}</div>`;
  } catch (e) {
    el.innerHTML = `<p style="color:red;padding:16px">${esc(e.message)}</p>`;
  }
}

async function setDelivery(id, status) {
  loading(true);
  try {
    await api('updateDelivery', { ID: id, Status: status, UserID: STATE.user.ID });
    toast('Status diperbarui', 'success');
    go('delivery');
  } catch (err) { toast(err.message, 'error'); }
  loading(false);
}

// ============ VIEW PENGELUARAN ============
async function viewExpense(el) {
  try {
    const p = STATE.user.Role === 'OPERATOR' ? { operatorId: STATE.user.ID } : {};
    const list = await api('listExpenses', p);
    const isOwner = STATE.user.Role === 'OWNER';
    el.innerHTML = `
      <div class="section"><h2>Pengeluaran</h2>
        ${!isOwner?`<button class="btn" onclick="modalExpense()">+ Pengeluaran</button>`:''}
      </div>
      <div class="table-wrap">${list.length ? `<table><thead><tr>
        <th>Tgl</th><th>Kategori</th><th>Nominal</th><th>Status</th>${isOwner?'<th>Aksi</th>':''}
      </tr></thead><tbody>
        ${list.map(x => `<tr>
          <td>${esc(x.Tanggal)}</td><td>${esc(x.Kategori)}</td><td>${rp(x.Nominal)}</td>
          <td><span class="badge ${x.Status==='DISETUJUI'?'green':x.Status==='DITOLAK'?'red':'orange'}">${x.Status}</span></td>
          ${isOwner?`<td>${x.Status==='MENUNGGU'?
            `<button class="btn small success" onclick="approveExp('${x.ID}',true)">✓</button>
             <button class="btn small danger" onclick="approveExp('${x.ID}',false)">✗</button>`:''}</td>`:''}
        </tr>`).join('')}
      </tbody></table>` : '<p style="padding:16px;color:#999">Belum ada pengeluaran</p>'}</div>`;
  } catch (e) {
    el.innerHTML = `<p style="color:red;padding:16px">${esc(e.message)}</p>`;
  }
}

async function approveExp(id, approve) {
  let alasan = '';
  if (!approve) {
    alasan = prompt('Alasan tolak:') || '';
    if (!alasan) return;
  }
  loading(true);
  try {
    await api('approveExpense', { ID: id, approve, AlasanTolak: alasan, UserID: STATE.user.ID });
    toast(approve ? 'Disetujui' : 'Ditolak', 'success');
    viewExpense($('#content'));
  } catch (e) { toast(e.message, 'error'); }
  loading(false);
}

// ============ VIEW KOMISI OPERATOR ============
async function viewCommission(el) {
  try {
    const list = await api('listCommissions', { operatorId: STATE.user.ID });
    const total = list.reduce((a,b) => a + Number(b.Total), 0);
    const unpaid = list.filter(c => c.Status === 'BELUM_DIBAYAR').reduce((a,b) => a + Number(b.Total), 0);
    const paid = total - unpaid;
    el.innerHTML = `<div class="section"><h2>Komisi Saya</h2></div>
      <div class="cards">
        <div class="card"><div class="label">Total Komisi</div><div class="value">${rp(total)}</div></div>
        <div class="card alert"><div class="label">Belum Dibayar</div><div class="value">${rp(unpaid)}</div></div>
        <div class="card"><div class="label">Sudah Dibayar</div><div class="value">${rp(paid)}</div></div>
      </div>
      <div class="table-wrap">${list.length ? `<table><thead><tr>
        <th>Tgl</th><th>Trx</th><th>Galon</th><th>Rate</th><th>Total</th><th>Status</th>
      </tr></thead><tbody>
        ${list.slice(0,100).map(c => `<tr>
          <td>${esc(c.Tanggal)}</td><td>${esc(c.TrxID)}</td><td>${c.JumlahGalon}</td>
          <td>${rp(c.Rate)}</td><td>${rp(c.Total)}</td>
          <td><span class="badge ${c.Status==='SUDAH_DIBAYAR'?'green':'orange'}">${c.Status}</span></td>
        </tr>`).join('')}
      </tbody></table>` : '<p style="padding:16px;color:#999">Belum ada komisi</p>'}</div>`;
  } catch (e) {
    el.innerHTML = `<p style="color:red;padding:16px">${esc(e.message)}</p>`;
  }
}

// ============ VIEW RIWAYAT ============
async function viewHistory(el) {
  el.innerHTML = `
    <div class="tabs" id="hist-tabs">
      <button class="active" onclick="filterHist(this,'transaksi')">Transaksi</button>
      <button onclick="filterHist(this,'pengeluaran')">Pengeluaran</button>
      <button onclick="filterHist(this,'galon')">Galon</button>
      <button onclick="filterHist(this,'komisi')">Komisi</button>
    </div>
    <div id="hist-content"><p style="color:#999;padding:16px">Memuat...</p></div>`;
  filterHist(document.querySelector('#hist-tabs button'), 'transaksi');
}

async function filterHist(btn, type) {
  document.querySelectorAll('#hist-tabs button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const el = $('#hist-content');
  el.innerHTML = '<p style="color:#999;padding:16px">Memuat...</p>';
  const opId = STATE.user.ID;
  let html = '';
  try {
    if (type === 'transaksi') {
      const list = await api('listTransactions', { operatorId: opId });
      html = list.length ? `<div class="table-wrap"><table><thead><tr>
        <th>Tgl</th><th>Tipe</th><th>Galon</th><th>Total</th>
      </tr></thead><tbody>
        ${list.slice(0,100).map(t => `<tr>
          <td>${esc(t.Tanggal)}</td><td>${esc(t.Tipe)}</td>
          <td>${t.Jumlah}</td><td>${rp(t.Total)}</td>
        </tr>`).join('')}
      </tbody></table></div>` : '<p style="padding:16px;color:#999">Kosong</p>';
    } else if (type === 'pengeluaran') {
      const list = await api('listExpenses', { operatorId: opId });
      html = list.length ? `<div class="table-wrap"><table><thead><tr>
        <th>Tgl</th><th>Kategori</th><th>Nominal</th><th>Status</th>
      </tr></thead><tbody>
        ${list.map(x => `<tr><td>${esc(x.Tanggal)}</td><td>${esc(x.Kategori)}</td>
          <td>${rp(x.Nominal)}</td><td>${esc(x.Status)}</td></tr>`).join('')}
      </tbody></table></div>` : '<p style="padding:16px;color:#999">Kosong</p>';
    } else if (type === 'galon') {
      const list = await api('listGallonConditions', { operatorId: opId });
      html = list.length ? `<div class="table-wrap"><table><thead><tr>
        <th>Tgl</th><th>Jumlah</th><th>Kondisi</th>
      </tr></thead><tbody>
        ${list.map(x => `<tr><td>${esc(x.Tanggal)}</td>
          <td>${x.Jumlah}</td><td>${esc(x.Kondisi)}</td></tr>`).join('')}
      </tbody></table></div>` : '<p style="padding:16px;color:#999">Kosong</p>';
    } else if (type === 'komisi') {
      const list = await api('listCommissions', { operatorId: opId });
      html = list.length ? `<div class="table-wrap"><table><thead><tr>
        <th>Tgl</th><th>Galon</th><th>Total</th><th>Status</th>
      </tr></thead><tbody>
        ${list.map(c => `<tr><td>${esc(c.Tanggal)}</td><td>${c.JumlahGalon}</td>
          <td>${rp(c.Total)}</td><td>${esc(c.Status)}</td></tr>`).join('')}
      </tbody></table></div>` : '<p style="padding:16px;color:#999">Kosong</p>';
    }
  } catch (e) { html = `<p style="color:red;padding:16px">${esc(e.message)}</p>`; }
  el.innerHTML = html;
}

// ============ VIEW AGEN ============
async function viewAgents(el) {
  try {
    const list = await api('getAgents', {});
    el.innerHTML = `
      <div class="section"><h2>Data Agen</h2>
        ${STATE.user.Role==='OWNER'?`<button class="btn" onclick="modalAgent()">+ Agen Baru</button>`:''}
      </div>
      <div class="table-wrap">${list.length ? `<table><thead><tr>
        <th>Nama</th><th>HP</th><th>Status</th><th>Aksi</th>
      </tr></thead><tbody>
        ${list.map(a => `<tr>
          <td>${esc(a.Nama)}</td><td>${esc(a.HP)}</td>
          <td><span class="badge ${a.Status==='Aktif'?'green':'gray'}">${a.Status}</span></td>
          <td>
            <button class="btn small outline" onclick="detailAgen('${a.ID}')">Detail</button>
            ${STATE.user.Role==='OWNER'?`<button class="btn small" onclick="modalAgent('${a.ID}')">Edit</button>`:''}
          </td>
        </tr>`).join('')}
      </tbody></table>` : '<p style="padding:16px;color:#999">Belum ada agen</p>'}</div>`;
  } catch (e) {
    el.innerHTML = `<p style="color:red;padding:16px">${esc(e.message)}</p>`;
  }
}

async function modalAgent(id) {
  let a = { ID:'', Nama:'', HP:'', Alamat:'', Harga:'', Status:'Aktif', Catatan:'' };
  if (id) {
    const list = await api('getAgents', {});
    a = list.find(x => String(x.ID) === String(id)) || a;
  }
  openModal(`
    <div class="modal-header"><h3>${id?'Edit':'Tambah'} Agen</h3><button onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <form onsubmit="submitAgent(event)">
        <input type="hidden" id="a_id" value="${esc(a.ID)}">
        <div class="form-group"><label>Nama *</label><input id="a_nama" required value="${esc(a.Nama)}"></div>
        <div class="form-group"><label>HP</label><input id="a_hp" value="${esc(a.HP)}"></div>
        <div class="form-group"><label>Alamat</label><textarea id="a_alamat" rows="2">${esc(a.Alamat)}</textarea></div>
        <div class="form-group"><label>Harga Khusus</label><input id="a_harga" type="number" value="${esc(a.Harga)}"></div>
        <div class="form-group"><label>Status</label>
          <select id="a_status"><option ${a.Status==='Aktif'?'selected':''}>Aktif</option>
            <option ${a.Status==='Nonaktif'?'selected':''}>Nonaktif</option></select></div>
        <div class="form-group"><label>Catatan</label><textarea id="a_catatan" rows="2">${esc(a.Catatan)}</textarea></div>
        <button class="btn" type="submit">SIMPAN</button>
      </form>
    </div>`);
}

async function submitAgent(e) {
  e.preventDefault();
  loading(true);
  try {
    await api('saveAgent', {
      ID: val('a_id') || null,
      Nama: val('a_nama'),
      HP: val('a_hp'),
      Alamat: val('a_alamat'),
      Harga: num('a_harga'),
      Status: val('a_status'),
      Catatan: val('a_catatan'),
      UserID: STATE.user.ID
    });
    closeModal();
    toast('Agen tersimpan', 'success');
    viewAgents($('#content'));
  } catch (err) { toast(err.message, 'error'); }
  loading(false);
}

async function detailAgen(id) {
  loading(true);
  try {
    const d = await api('agentDetail', { AgenID: id });
    const a = d.agen;
    openModal(`
      <div class="modal-header"><h3>Detail Agen</h3><button onclick="closeModal()">×</button></div>
      <div class="modal-body">
        <p><b>${esc(a.Nama)}</b></p>
        <p>HP: ${esc(a.HP)}</p>
        <p>Alamat: ${esc(a.Alamat)}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:10px 0">
        <div class="cards" style="padding:0">
          <div class="card"><div class="label">Total Beli</div><div class="value">${rp(d.totalBeli)}</div></div>
          <div class="card"><div class="label">Total Bayar</div><div class="value">${rp(d.totalBayar)}</div></div>
          <div class="card alert"><div class="label">Piutang</div><div class="value">${rp(d.piutang)}</div></div>
          <div class="card"><div class="label">Galon Kirim</div><div class="value">${d.galonKirim}</div></div>
          <div class="card"><div class="label">Galon Kembali</div><div class="value">${d.galonKembali}</div></div>
          <div class="card"><div class="label">Di Agen</div><div class="value">${d.galonDiAgen}</div></div>
          <div class="card warn"><div class="label">Rusak</div><div class="value">${d.galonRusak}</div></div>
        </div>
      </div>`);
  } catch (e) { toast(e.message, 'error'); }
  loading(false);
}

// ============ VIEW STOK ============
async function viewStock(el) {
  try {
    const s = await api('getStock', {});
    const products = await api('getProducts', {});
    const galonRows = Object.keys(s.galon).map(id => {
      const p = products.find(x => String(x.ID) === String(id));
      return `<tr><td>${esc(p?p.Nama:id)}</td><td>${s.galon[id]}</td></tr>`;
    }).join('');
    el.innerHTML = `<div class="section"><h2>Stok</h2></div>
      <div class="cards">
        <div class="card"><div class="label">Stok Tisu</div><div class="value">${s.tisu}</div></div>
        <div class="card"><div class="label">Stok Tutup</div><div class="value">${s.tutup}</div></div>
      </div>
      <div class="section"><h2>Stok Galon</h2></div>
      <div class="table-wrap"><table><thead><tr><th>Produk</th><th>Stok</th></tr></thead>
        <tbody>${galonRows}</tbody></table></div>
      <div class="quick">
        ${STATE.user.Role==='OWNER'?`<button class="btn secondary" onclick="modalOpname()">📋 Stok Opname</button>`:''}
        <button class="btn secondary" onclick="go('purchases')">🛍️ Pembelian</button>
      </div>`;
  } catch (e) {
    el.innerHTML = `<p style="color:red;padding:16px">${esc(e.message)}</p>`;
  }
}

function modalOpname() {
  openModal(`
    <div class="modal-header"><h3>Stok Opname</h3><button onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <form onsubmit="submitOpname(event)">
        <div class="form-group"><label>Item</label>
          <select id="o_item" required>
            <option value="TISU">Tisu</option>
            <option value="TUTUP">Tutup Galon</option>
          </select></div>
        <div class="form-group"><label>Stok Fisik *</label>
          <input id="o_fisik" type="number" min="0" required></div>
        <div class="form-group"><label>Alasan Selisih</label>
          <textarea id="o_alasan" rows="2"></textarea></div>
        <button class="btn" type="submit">SIMPAN</button>
      </form>
    </div>`);
}

async function submitOpname(e) {
  e.preventDefault();
  loading(true);
  try {
    const r = await api('stockOpname', {
      Item: val('o_item'),
      StokFisik: num('o_fisik'),
      Alasan: val('o_alasan'),
      UserID: STATE.user.ID
    });
    closeModal();
    toast('Selisih: ' + r.Selisih, r.Selisih === 0 ? 'success' : 'error');
    viewStock($('#content'));
  } catch (err) { toast(err.message, 'error'); }
  loading(false);
}

// ============ VIEW KEUANGAN ============
async function viewFinance(el) {
  el.innerHTML = `<div class="section"><h2>Keuangan</h2></div>
    <div class="quick">
      <button class="btn" onclick="go('receivables')">📋 Piutang</button>
      <button class="btn secondary" onclick="go('reports')">📊 Laporan</button>
      <button class="btn secondary" onclick="go('commission')">🎁 Komisi</button>
    </div>`;
}

// ============ VIEW PIUTANG ============
async function viewReceivables(el) {
  try {
    const list = await api('listReceivables', {});
    el.innerHTML = `<div class="section"><h2>Piutang</h2></div>
      <div class="table-wrap">${list.length ? `<table><thead><tr>
        <th>ID</th><th>Tgl</th><th>Tipe</th><th>Total</th><th>Dibayar</th><th>Sisa</th><th>Aksi</th>
      </tr></thead><tbody>
        ${list.map(r => `<tr>
          <td>${esc(r.ID)}</td><td>${esc(r.Tanggal)}</td><td>${esc(r.Tipe)}</td>
          <td>${rp(r.Total)}</td><td>${rp(r.TotalDibayar)}</td>
          <td><b>${rp(r.Sisa)}</b></td>
          <td>${r.Sisa>0?`<button class="btn small success" onclick="modalPayment('${r.ID}',${r.Sisa})">Bayar</button>`:''}</td>
        </tr>`).join('')}
      </tbody></table>` : '<p style="padding:16px;color:#999">Tidak ada piutang</p>'}</div>`;
  } catch (e) {
    el.innerHTML = `<p style="color:red;padding:16px">${esc(e.message)}</p>`;
  }
}

function modalPayment(trxId, sisa) {
  openModal(`
    <div class="modal-header"><h3>Terima Pembayaran</h3><button onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <p>Sisa hutang: <b>${rp(sisa)}</b></p>
      <form onsubmit="submitPayment(event,'${trxId}')">
        <div class="form-group"><label>Nominal Bayar *</label>
          <input id="p_nom" type="number" min="1" max="${sisa}" required value="${sisa}"></div>
        <div class="form-group"><label>Metode</label>
          <select id="p_met"><option>TUNAI</option><option>TRANSFER</option></select></div>
        <div class="form-group"><label>Catatan</label>
          <textarea id="p_ket" rows="2"></textarea></div>
        <button class="btn" type="submit">SIMPAN</button>
      </form>
    </div>`);
}

async function submitPayment(e, trxId) {
  e.preventDefault();
  loading(true);
  try {
    await api('addPayment', {
      TrxID: trxId,
      Nominal: num('p_nom'),
      Metode: val('p_met'),
      Catatan: val('p_ket'),
      UserID: STATE.user.ID
    });
    closeModal();
    toast('Pembayaran tersimpan', 'success');
    viewReceivables($('#content'));
  } catch (err) { toast(err.message, 'error'); }
  loading(false);
}

// ============ VIEW LAPORAN ============
async function viewReports(el) {
  el.innerHTML = `
    <div class="section"><h2>Laporan</h2></div>
    <div class="filters">
      <input type="date" id="r_from" value="${new Date(Date.now()-7*864e5).toISOString().slice(0,10)}">
      <input type="date" id="r_to" value="${new Date().toISOString().slice(0,10)}">
      <button class="btn small" onclick="loadReport()">Muat</button>
      <button class="btn small secondary" onclick="window.print()">Print</button>
    </div>
    <div id="report-content"></div>`;
  loadReport();
}

async function loadReport() {
  const from = val('r_from'), to = val('r_to');
  const el = $('#report-content');
  el.innerHTML = '<p style="padding:16px;color:#999">Memuat...</p>';
  try {
    const [sales, finance, perAgent, perOp] = await Promise.all([
      api('reportSales', { from, to }),
      api('reportFinance', { from, to }),
      api('reportAgent', { from, to }),
      api('reportOperator', { from, to })
    ]);
    el.innerHTML = `
      <div class="section"><h2>Ringkasan Penjualan</h2></div>
      <div class="cards">
        <div class="card"><div class="label">Total Transaksi</div><div class="value">${sales.count}</div></div>
        <div class="card"><div class="label">Total Galon</div><div class="value">${sales.galon}</div></div>
        <div class="card"><div class="label">Omzet</div><div class="value">${rp(sales.total)}</div></div>
      </div>
      <div class="section"><h2>Keuangan</h2></div>
      <div class="cards">
        <div class="card"><div class="label">Pemasukan</div><div class="value">${rp(finance.pemasukan)}</div></div>
        <div class="card"><div class="label">Pengeluaran</div><div class="value">${rp(finance.pengeluaran)}</div></div>
        <div class="card alert"><div class="label">Piutang</div><div class="value">${rp(finance.piutang)}</div></div>
        <div class="card"><div class="label">Laba</div><div class="value">${rp(finance.laba)}</div></div>
      </div>
      <div class="section"><h2>Penjualan per Agen</h2></div>
      <div class="table-wrap"><table><thead><tr>
        <th>Agen</th><th>Transaksi</th><th>Galon</th><th>Total</th>
      </tr></thead><tbody>
        ${perAgent.map(x => `<tr><td>${esc(x.agen.Nama)}</td>
          <td>${x.count}</td><td>${x.galon}</td><td>${rp(x.total)}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="section"><h2>Kinerja Operator</h2></div>
      <div class="table-wrap"><table><thead><tr>
        <th>Operator</th><th>Transaksi</th><th>Galon</th><th>Komisi</th>
      </tr></thead><tbody>
        ${perOp.map(x => `<tr><td>${esc(x.operator.Nama)}</td>
          <td>${x.transaksi}</td><td>${x.galon}</td><td>${rp(x.komisi)}</td></tr>`).join('')}
      </tbody></table></div>`;
  } catch (e) { el.innerHTML = `<p style="color:red;padding:16px">${esc(e.message)}</p>`; }
}

// ============ VIEW AUDIT ============
async function viewAudit(el) {
  try {
    const list = await api('listAudit', {});
    el.innerHTML = `<div class="section"><h2>Audit Log</h2></div>
      <div class="table-wrap">${list.length ? `<table><thead><tr>
        <th>Waktu</th><th>User</th><th>Aktivitas</th><th>RefID</th>
      </tr></thead><tbody>
        ${list.slice(0,200).map(a => `<tr>
          <td>${esc(a.Timestamp)}</td><td>${esc(a.UserID)}</td>
          <td>${esc(a.Aktivitas)}</td><td>${esc(a.RefID)}</td>
        </tr>`).join('')}
      </tbody></table>` : '<p style="padding:16px;color:#999">Kosong</p>'}</div>`;
  } catch (e) {
    el.innerHTML = `<p style="color:red;padding:16px">${esc(e.message)}</p>`;
  }
}

// ============ VIEW REKONSILIASI ============
async function viewReconcile(el) {
  el.innerHTML = `
    <div class="section"><h2>🔍 Rekonsiliasi</h2>
      <button class="btn" onclick="runRecon()">Jalankan Rekonsiliasi Hari Ini</button>
    </div>
    <div id="recon-content"></div>`;
  loadRecon();
}

async function runRecon() {
  loading(true);
  try {
    await api('runReconciliation', {
      Tanggal: new Date().toISOString().slice(0,10),
      UserID: STATE.user.ID
    });
    toast('Rekonsiliasi selesai', 'success');
    loadRecon();
  } catch (e) { toast(e.message, 'error'); }
  loading(false);
}

async function loadRecon() {
  try {
    const list = await api('listReconciliation', {});
    const latest = {};
    list.forEach(r => latest[r.Aspek] = r);
    const rows = Object.keys(latest).map(k => {
      const r = latest[k];
      const icon = r.Status === 'SESUAI' ? '🟢' : r.Status === 'PERLU_DIPERIKSA' ? '🟡' : '🔴';
      return `<tr><td>${esc(r.Aspek)}</td>
        <td>${r.NilaiSistem}</td><td>${r.NilaiFisik}</td>
        <td>${r.Selisih}</td><td>${icon} ${esc(r.Status)}</td></tr>`;
    }).join('');
    $('#recon-content').innerHTML = rows ? `<div class="table-wrap"><table><thead><tr>
      <th>Aspek</th><th>Sistem</th><th>Aktual</th><th>Selisih</th><th>Status</th>
    </tr></thead><tbody>${rows}</tbody></table></div>` : '<p style="padding:16px;color:#999">Belum ada data</p>';
  } catch (e) {
    $('#recon-content').innerHTML = `<p style="color:red;padding:16px">${esc(e.message)}</p>`;
  }
}

// ============ VIEW OPERATOR ============
async function viewOperators(el) {
  try {
    const list = await api('getOperators', {});
    el.innerHTML = `<div class="section"><h2>Operator</h2>
        <button class="btn" onclick="modalOperator()">+ Operator Baru</button></div>
      <div class="table-wrap">${list.length ? `<table><thead><tr>
        <th>Nama</th><th>Username</th><th>Status</th><th>Aksi</th>
      </tr></thead><tbody>
        ${list.map(o => `<tr>
          <td>${esc(o.Nama)}</td><td>${esc(o.Username)}</td>
          <td><span class="badge ${o.Status==='Aktif'?'green':'gray'}">${o.Status}</span></td>
          <td><button class="btn small outline" onclick="detailOp('${o.ID}')">Detail</button>
            <button class="btn small" onclick="modalOperator('${o.ID}')">Edit</button></td>
        </tr>`).join('')}
      </tbody></table>` : '<p style="padding:16px;color:#999">Belum ada operator</p>'}</div>`;
  } catch (e) {
    el.innerHTML = `<p style="color:red;padding:16px">${esc(e.message)}</p>`;
  }
}

async function modalOperator(id) {
  let o = { ID:'', Nama:'', Username:'', Password:'', Status:'Aktif' };
  if (id) {
    const list = await api('getOperators', {});
    o = list.find(x => String(x.ID) === String(id)) || o;
  }
  openModal(`
    <div class="modal-header"><h3>${id?'Edit':'Tambah'} Operator</h3><button onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <form onsubmit="submitOperator(event)">
        <input type="hidden" id="op_id" value="${esc(o.ID)}">
        <div class="form-group"><label>Nama *</label><input id="op_nama" required value="${esc(o.Nama)}"></div>
        <div class="form-group"><label>Username *</label><input id="op_user" required value="${esc(o.Username)}"></div>
        <div class="form-group"><label>Password ${id?'(kosongkan jika tidak diubah)':''}</label>
          <input id="op_pass" type="text" ${id?'':'required'}></div>
        <div class="form-group"><label>Status</label>
          <select id="op_status"><option ${o.Status==='Aktif'?'selected':''}>Aktif</option>
            <option ${o.Status==='Nonaktif'?'selected':''}>Nonaktif</option></select></div>
        <button class="btn" type="submit">SIMPAN</button>
      </form>
    </div>`);
}

async function submitOperator(e) {
  e.preventDefault();
  const p = {
    ID: val('op_id') || null,
    Nama: val('op_nama'),
    Username: val('op_user'),
    Status: val('op_status'),
    UserID: STATE.user.ID
  };
  if (val('op_pass')) p.Password = val('op_pass');
  loading(true);
  try {
    await api('saveOperator', p);
    closeModal();
    toast('Operator tersimpan', 'success');
    viewOperators($('#content'));
  } catch (err) { toast(err.message, 'error'); }
  loading(false);
}

async function detailOp(id) {
  loading(true);
  try {
    const d = await api('operatorDetail', { OperatorID: id });
    openModal(`
      <div class="modal-header"><h3>Detail Operator</h3><button onclick="closeModal()">×</button></div>
      <div class="modal-body">
        <p><b>${esc(d.operator.Nama)}</b></p>
        <p>Username: ${esc(d.operator.Username)}</p>
        <div class="cards" style="padding:0">
          <div class="card"><div class="label">Transaksi</div><div class="value">${d.totalTransaksi}</div></div>
          <div class="card"><div class="label">Galon</div><div class="value">${d.galonTerjual}</div></div>
          <div class="card"><div class="label">Komisi</div><div class="value">${rp(d.totalKomisi)}</div></div>
          <div class="card alert"><div class="label">Blm Dibayar</div><div class="value">${rp(d.komisiBelumBayar)}</div></div>
          <div class="card"><div class="label">Antar</div><div class="value">${d.pengantaran}</div></div>
          <div class="card"><div class="label">Pengeluaran</div><div class="value">${rp(d.totalPengeluaran)}</div></div>
        </div>
        ${d.komisiBelumBayar>0?`<button class="btn success" style="margin-top:12px" onclick="bayarKomisi('${id}',${d.komisiBelumBayar})">💵 Bayar Komisi</button>`:''}
      </div>`);
  } catch (e) { toast(e.message, 'error'); }
  loading(false);
}

async function bayarKomisi(opId, total) {
  if (!confirmBox('Bayar komisi Rp' + total.toLocaleString('id-ID') + '?')) return;
  loading(true);
  try {
    const comms = await api('listCommissions', { operatorId: opId, status: 'BELUM_DIBAYAR' });
    const ids = comms.map(c => c.ID);
    await api('payCommission', {
      OperatorID: opId, Total: total, CommissionIDs: ids,
      Metode: 'TUNAI', UserID: STATE.user.ID
    });
    closeModal();
    toast('Komisi dibayar', 'success');
  } catch (e) { toast(e.message, 'error'); }
  loading(false);
}

// ============ VIEW PEMBELIAN ============
async function viewPurchases(el) {
  try {
    const list = await api('listPurchases', {});
    el.innerHTML = `<div class="section"><h2>Pembelian</h2>
        <button class="btn" onclick="modalPurchase()">+ Pembelian</button></div>
      <div class="table-wrap">${list.length ? `<table><thead><tr>
        <th>Tgl</th><th>Kategori</th><th>Barang</th><th>Jumlah</th><th>Total</th>
      </tr></thead><tbody>
        ${list.map(p => `<tr>
          <td>${esc(p.Tanggal)}</td><td>${esc(p.Kategori)}</td>
          <td>${esc(p.Barang)}</td><td>${p.Jumlah} ${esc(p.Satuan)}</td>
          <td>${rp(p.Total)}</td>
        </tr>`).join('')}
      </tbody></table>` : '<p style="padding:16px;color:#999">Belum ada pembelian</p>'}</div>`;
  } catch (e) {
    el.innerHTML = `<p style="color:red;padding:16px">${esc(e.message)}</p>`;
  }
}

function modalPurchase() {
  openModal(`
    <div class="modal-header"><h3>Pembelian</h3><button onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <form onsubmit="submitPurchase(event)">
        <div class="form-group"><label>Tanggal *</label>
          <input id="pu_tgl" type="date" required value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group"><label>Supplier</label><input id="pu_sup"></div>
        <div class="form-group"><label>Kategori *</label>
          <select id="pu_kat" required>
            <option>Air</option><option>Galon</option><option>Tutup galon</option>
            <option>Tisu</option><option>Bahan kebersihan</option><option>Peralatan</option>
            <option>Sparepart</option><option>Lainnya</option>
          </select></div>
        <div class="form-group"><label>Barang *</label><input id="pu_barang" required></div>
        <div class="form-group"><label>Jumlah *</label><input id="pu_jml" type="number" min="1" required></div>
        <div class="form-group"><label>Satuan</label><input id="pu_sat" value="pcs"></div>
        <div class="form-group"><label>Harga Satuan *</label><input id="pu_hrg" type="number" min="0" required></div>
        <div class="form-group"><label>Catatan</label><textarea id="pu_cat" rows="2"></textarea></div>
        <button class="btn" type="submit">SIMPAN</button>
      </form>
    </div>`);
}

async function submitPurchase(e) {
  e.preventDefault();
  loading(true);
  try {
    await api('createPurchase', {
      Tanggal: val('pu_tgl'),
      Supplier: val('pu_sup'),
      Kategori: val('pu_kat'),
      Barang: val('pu_barang'),
      Jumlah: num('pu_jml'),
      Satuan: val('pu_sat'),
      Harga: num('pu_hrg'),
      Catatan: val('pu_cat'),
      UserID: STATE.user.ID
    });
    closeModal();
    toast('Pembelian tersimpan', 'success');
    viewPurchases($('#content'));
  } catch (err) { toast(err.message, 'error'); }
  loading(false);
}

// ============ VIEW MASTER DATA ============
async function viewMaster(el) {
  try {
    const products = await api('getProducts', {});
    el.innerHTML = `<div class="section"><h2>Master Produk</h2>
        <button class="btn" onclick="modalProduct()">+ Produk</button></div>
      <div class="table-wrap">${products.length ? `<table><thead><tr>
        <th>Nama</th><th>Hrg Konsumen</th><th>Hrg Agen</th><th>Komisi</th><th>Status</th><th>Aksi</th>
      </tr></thead><tbody>
        ${products.map(p => `<tr>
          <td>${esc(p.Nama)}</td><td>${rp(p.HargaKonsumen)}</td>
          <td>${rp(p.HargaAgen)}</td><td>${rp(p.KomisiJual)} / ${rp(p.KomisiAntar)}</td>
          <td>${esc(p.Status)}</td>
          <td><button class="btn small" onclick="modalProduct('${p.ID}')">Edit</button></td>
        </tr>`).join('')}
      </tbody></table>` : '<p style="padding:16px;color:#999">Belum ada produk</p>'}</div>`;
  } catch (e) {
    el.innerHTML = `<p style="color:red;padding:16px">${esc(e.message)}</p>`;
  }
}

async function modalProduct(id) {
  let p = { ID:'', Nama:'', Jenis:'', HargaKonsumen:0, HargaAgen:0, KomisiJual:2000, KomisiAntar:1000, Status:'Aktif' };
  if (id) {
    const list = await api('getProducts', {});
    p = list.find(x => String(x.ID) === String(id)) || p;
  }
  openModal(`
    <div class="modal-header"><h3>${id?'Edit':'Tambah'} Produk</h3><button onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <form onsubmit="submitProduct(event)">
        <input type="hidden" id="p_id" value="${esc(p.ID)}">
        <div class="form-group"><label>Nama *</label><input id="p_nama" required value="${esc(p.Nama)}"></div>
        <div class="form-group"><label>Jenis</label><input id="p_jenis" value="${esc(p.Jenis)}"></div>
        <div class="form-group"><label>Harga Konsumen *</label><input id="p_hk" type="number" min="0" required value="${p.HargaKonsumen}"></div>
        <div class="form-group"><label>Harga Agen *</label><input id="p_ha" type="number" min="0" required value="${p.HargaAgen}"></div>
        <div class="form-group"><label>Komisi Jual</label><input id="p_kj" type="number" min="0" value="${p.KomisiJual}"></div>
        <div class="form-group"><label>Komisi Antar</label><input id="p_ka" type="number" min="0" value="${p.KomisiAntar}"></div>
        <div class="form-group"><label>Status</label>
          <select id="p_st"><option ${p.Status==='Aktif'?'selected':''}>Aktif</option>
            <option ${p.Status==='Nonaktif'?'selected':''}>Nonaktif</option></select></div>
        <button class="btn" type="submit">SIMPAN</button>
      </form>
    </div>`);
}

async function submitProduct(e) {
  e.preventDefault();
  loading(true);
  try {
    await api('saveProduct', {
      ID: val('p_id') || null,
      Nama: val('p_nama'),
      Jenis: val('p_jenis'),
      HargaKonsumen: num('p_hk'),
      HargaAgen: num('p_ha'),
      KomisiJual: num('p_kj'),
      KomisiAntar: num('p_ka'),
      Status: val('p_st'),
      UserID: STATE.user.ID
    });
    closeModal();
    toast('Produk tersimpan', 'success');
    viewMaster($('#content'));
  } catch (err) { toast(err.message, 'error'); }
  loading(false);
}

// ============ VIEW MORE ============
async function viewMore(el) {
  el.innerHTML = `<div class="section"><h2>Menu Lainnya</h2></div>
    <div class="quick">
      <button class="btn secondary" onclick="go('operators')">👥 Operator</button>
      <button class="btn secondary" onclick="go('purchases')">🛍️ Pembelian</button>
      <button class="btn secondary" onclick="go('reconcile')">🔍 Rekonsiliasi</button>
      <button class="btn secondary" onclick="go('reports')">📊 Laporan</button>
      <button class="btn secondary" onclick="go('master')">📚 Master Data</button>
      <button class="btn secondary" onclick="go('audit')">📝 Audit Log</button>
      <button class="btn secondary" onclick="go('settings')">⚙️ Pengaturan</button>
    </div>`;
}

// ============ VIEW SETTINGS ============
async function viewSettings(el) {
  try {
    const s = await api('getSettings', {});
    el.innerHTML = `<div class="section"><h2>Pengaturan</h2></div>
      <div class="form">
        <div class="form-group"><label>Nama Aplikasi</label>
          <input id="st_app" value="${esc(s.APP_NAME||'BM Water')}"></div>
        <div class="form-group"><label>Tisu per Galon</label>
          <input id="st_tisu" type="number" value="${esc(s.TISU_PER_GALON||1)}"></div>
        <button class="btn" onclick="saveSettings()">SIMPAN</button>
      </div>`;
  } catch (e) {
    el.innerHTML = `<p style="color:red;padding:16px">${esc(e.message)}</p>`;
  }
}

async function saveSettings() {
  loading(true);
  try {
    await api('saveSettings', { UserID: STATE.user.ID, settings: {
      APP_NAME: val('st_app'),
      TISU_PER_GALON: val('st_tisu')
    }});
    toast('Pengaturan disimpan', 'success');
  } catch (e) { toast(e.message, 'error'); }
  loading(false);
}

// ============ INIT ============
(function init() {
  const saved = localStorage.getItem('bw_user');
  if (saved) { try { STATE.user = JSON.parse(saved); } catch(e){} }
  render();
})();
