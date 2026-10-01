/*******************************************************
 * BM WATER — FRONTEND
 *******************************************************/

const API_URL = 'https://script.google.com/macros/s/AKfycbyvN2Rbnd7poGW_jvO7tA-yAArWzU0f7I2Pxxp_ecQT8Vc6Jjp3GI_pW50eN2C9q60/exec';

const state = {
  token: null,
  user: null,
  currentPage: 'dashboard',
  cache: {}
};

// ====================== API ======================

async function api(action, payload = {}) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action, payload, token: state.token }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Terjadi kesalahan');
    return json.data;
  } catch (err) {
    toast(err.message, 'error');
    throw err;
  }
}

// ====================== UTIL ======================

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function toast(msg, type = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  setTimeout(() => el.classList.add('hidden'), 2500);
}

function formatRp(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function showModal(title, bodyHtml) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  $('#modal').classList.remove('hidden');
}

function closeModal() {
  $('#modal').classList.add('hidden');
  $('#modalBody').innerHTML = '';
}

function confirmAction(msg) {
  return confirm(msg);
}

// ====================== LOGIN ======================

async function doLogin() {
  const username = $('#loginUsername').value.trim();
  const password = $('#loginPassword').value;
  const errEl = $('#loginError');
  errEl.textContent = '';

  if (!username || !password) {
    errEl.textContent = 'Username dan password wajib diisi';
    return;
  }

  try {
    $('#btnLogin').textContent = 'Memuat...';
    $('#btnLogin').disabled = true;

    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', payload: { username, password } }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);

    state.token = json.data.token;
    state.user = json.data.user;
    localStorage.setItem('bm_token', state.token);
    localStorage.setItem('bm_user', JSON.stringify(state.user));

    enterApp();
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    $('#btnLogin').textContent = 'Masuk';
    $('#btnLogin').disabled = false;
  }
}

function doLogout() {
  if (!confirm('Keluar dari aplikasi?')) return;
  localStorage.removeItem('bm_token');
  localStorage.removeItem('bm_user');
  state.token = null;
  state.user = null;
  location.reload();
}

function enterApp() {
  $('#loginScreen').classList.remove('active');
  $('#appScreen').classList.add('active');
  $('#headerUser').textContent = state.user.name + ' · ' + state.user.role;
  buildNav();
  navigate('dashboard');
}

// ====================== NAVIGATION ======================

function buildNav() {
  const isOwner = state.user.role === 'owner';
  const items = isOwner ? [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'penjualan', icon: '💰', label: 'Jual' },
    { id: 'agen', icon: '🔄', label: 'Agen' },
    { id: 'bahan', icon: '📦', label: 'Bahan' },
    { id: 'more', icon: '☰', label: 'Lainnya' }
  ] : [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'penjualan', icon: '💰', label: 'Jual' },
    { id: 'agen', icon: '🔄', label: 'Agen' },
    { id: 'rekap', icon: '📋', label: 'Rekap' },
    { id: 'more', icon: '☰', label: 'Lainnya' }
  ];

  $('#bottomNav').innerHTML = items.map(i =>
    `<button class="nav-item" data-page="${i.id}">
      <span class="nav-icon">${i.icon}</span>${i.label}
    </button>`
  ).join('');

  $$('.nav-item').forEach(btn => {
    btn.onclick = () => navigate(btn.dataset.page);
  });
}

function navigate(page) {
  state.currentPage = page;
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === page));

  const titles = {
    dashboard: 'Dashboard', penjualan: 'Penjualan', agen: 'Galon Agen',
    bahan: 'Bahan', rekap: 'Rekap Galon', more: 'Lainnya',
    konsumen: 'Konsumen', komisi: 'Komisi', pengeluaran: 'Pengeluaran',
    laporan: 'Laporan', pengaturan: 'Pengaturan', rekonsiliasi: 'Rekonsiliasi',
    log: 'Log Aktivitas'
  };
  $('#headerTitle').textContent = titles[page] || 'BM Water';

  const renderers = {
    dashboard: renderDashboard,
    penjualan: renderPenjualan,
    agen: renderAgen,
    bahan: renderBahan,
    rekap: renderRekap,
    more: renderMore,
    konsumen: renderKonsumen,
    komisi: renderKomisi,
    pengeluaran: renderPengeluaran,
    pengaturan: renderPengaturan,
    rekonsiliasi: renderRekonsiliasi,
    log: renderLog
  };

  const main = $('#mainContent');
  main.innerHTML = '<div class="loading">Memuat...</div>';
  (renderers[page] || renderDashboard)();
}

// ====================== DASHBOARD ======================

async function renderDashboard() {
  try {
    const data = await api('getDashboard');
    const isOwner = state.user.role === 'owner';

    let html = `
      <div class="grid-2">
        <div class="card">
          <div class="card-title">Omzet Hari Ini</div>
          <div class="card-value small">${formatRp(data.omzet)}</div>
        </div>
        <div class="card">
          <div class="card-title">Galon Terjual</div>
          <div class="card-value small">${data.totalGalon}</div>
        </div>
        <div class="card">
          <div class="card-title">Konsumen</div>
          <div class="card-value small">${data.galonKonsumen} galon</div>
        </div>
        <div class="card">
          <div class="card-title">Agen</div>
          <div class="card-value small">${data.galonAgen} galon</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Komisi ${isOwner ? 'Operator' : 'Hari Ini'}</div>
        <div class="card-value small">${formatRp(isOwner ? data.komisi : (data.komisiBelumDibayar || 0))}</div>
      </div>
    `;

    if (isOwner && data.kontrol) {
      html += `<h3 style="margin: 20px 0 12px; font-size: 15px;">⚠️ Kontrol Operasional</h3>`;
      data.kontrol.forEach(k => {
        html += `
          <div class="kontrol-item ${k.status}">
            <div class="kontrol-header">
              <span class="kontrol-label">${statusIcon(k.status)} ${k.label}</span>
              <span class="kontrol-status">${statusText(k.status)}</span>
            </div>
            <div class="kontrol-msg">${k.message || ''}</div>
          </div>
        `;
      });
    }

    $('#mainContent').innerHTML = html;
  } catch (e) {}
}

function statusIcon(s) {
  return s === 'sesuai' ? '🟢' : s === 'perlu_diperiksa' ? '🟡' : '🔴';
}
function statusText(s) {
  return s === 'sesuai' ? 'Sesuai' : s === 'perlu_diperiksa' ? 'Perlu Diperiksa' : 'Beda Besar';
}

// ====================== PENJUALAN ======================

let penjualanState = { type: 'konsumen', customers: [], agents: [] };

async function renderPenjualan() {
  const [customers, agents] = await Promise.all([
    api('getCustomers').catch(() => []),
    api('getAgents').catch(() => [])
  ]);
  penjualanState.customers = customers;
  penjualanState.agents = agents;

  $('#mainContent').innerHTML = `
    <div class="card">
      <div class="segment">
        <button class="active" data-type="konsumen">Konsumen</button>
        <button data-type="agen">Agen</button>
      </div>

      <div id="penjualanForm"></div>
    </div>
  `;

  $$('.segment button').forEach(b => {
    b.onclick = () => {
      penjualanState.type = b.dataset.type;
      $$('.segment button').forEach(x => x.classList.toggle('active', x === b));
      renderPenjualanForm();
    };
  });

  renderPenjualanForm();
}

function renderPenjualanForm() {
  const isKonsumen = penjualanState.type === 'konsumen';
  const list = isKonsumen ? penjualanState.customers : penjualanState.agents;

  let html = `
    <div class="form-group">
      <label class="form-label">Pelanggan</label>
      <select id="saleCustomer">
        <option value="">-- Pilih --</option>
        ${list.map(c => `<option value="${c.id}" data-name="${c.name}">${c.name}</option>`).join('')}
      </select>
      ${isKonsumen ? '<button class="btn-secondary mt-8" onclick="openAddCustomer()">+ Tambah Konsumen Baru</button>' : ''}
    </div>

    <div class="form-group">
      <label class="form-label">Jumlah Galon</label>
      <input type="number" id="saleQty" min="1" placeholder="0">
    </div>

    <button class="btn-primary" onclick="submitSale()">Simpan Transaksi</button>
  `;

  $('#penjualanForm').innerHTML = html;
}

function openAddCustomer() {
  showModal('Tambah Konsumen', `
    <div class="form-group">
      <label class="form-label">Nama</label>
      <input type="text" id="newCustName" placeholder="Nama konsumen">
    </div>
    <div class="form-group">
      <label class="form-label">Alamat</label>
      <input type="text" id="newCustAddress" placeholder="Alamat (opsional)">
    </div>
    <div class="form-group">
      <label class="form-label">Harga</label>
      <select id="newCustPrice">
        <option value="10000">Rp10.000</option>
        <option value="12000">Rp12.000</option>
      </select>
    </div>
    <button class="btn-primary" onclick="saveNewCustomer()">Simpan</button>
  `);
  setTimeout(() => $('#newCustName')?.focus(), 100);
}

async function saveNewCustomer() {
  const name = $('#newCustName').value.trim();
  const address = $('#newCustAddress').value.trim();
  const price = Number($('#newCustPrice').value);

  if (!name) return toast('Nama wajib diisi', 'error');

  try {
    const newCust = await api('addCustomer', { name, address, price });
    penjualanState.customers.push(newCust);
    closeModal();
    renderPenjualanForm();
    setTimeout(() => {
      const sel = $('#saleCustomer');
      if (sel) sel.value = newCust.id;
    }, 100);
    toast('Konsumen berhasil ditambahkan', 'success');
  } catch (e) {}
}

async function submitSale() {
  const sel = $('#saleCustomer');
  const qty = Number($('#saleQty').value);
  const customer_id = sel.value;
  const customer_name = sel.options[sel.selectedIndex]?.dataset.name || '';

  if (!customer_id) return toast('Pilih pelanggan', 'error');
  if (!qty || qty <= 0) return toast('Jumlah galon tidak valid', 'error');

  try {
    const res = await api('createSale', {
      customer_type: penjualanState.type,
      customer_id, customer_name, quantity: qty
    });
    toast(`Transaksi tersimpan. Total ${formatRp(res.total)}`, 'success');
    $('#saleQty').value = '';
    sel.value = '';
  } catch (e) {}
}

// ====================== AGEN ======================

let agenState = { tab: 'keluar', agents: [] };

async function renderAgen() {
  const [agents, tracking] = await Promise.all([
    api('getAgents').catch(() => []),
    api('getGallonTracking').catch(() => [])
  ]);
  agenState.agents = agents;

  let html = `
    <div class="segment">
      <button class="active" data-tab="keluar">Galon Keluar</button>
      <button data-tab="kembali">Galon Kembali</button>
      <button data-tab="tracking">Tracking</button>
    </div>
    <div id="agenContent"></div>
  `;

  $('#mainContent').innerHTML = html;

  $$('.segment button').forEach(b => {
    b.onclick = () => {
      agenState.tab = b.dataset.tab;
      $$('.segment button').forEach(x => x.classList.toggle('active', x === b));
      renderAgenContent(tracking);
    };
  });

  renderAgenContent(tracking);
}

function renderAgenContent(tracking) {
  const tab = agenState.tab;
  let html = '';

  if (tab === 'keluar') {
    html = `
      <div class="card">
        <div class="form-group">
          <label class="form-label">Agen</label>
          <select id="outAgent">
            <option value="">-- Pilih Agen --</option>
            ${agenState.agents.map(a => `<option value="${a.id}" data-name="${a.name}">${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Aqua</label><input type="number" id="outAqua" min="0" value="0"></div>
          <div class="form-group"><label class="form-label">BM Water</label><input type="number" id="outBM" min="0" value="0"></div>
          <div class="form-group"><label class="form-label">Kran</label><input type="number" id="outKran" min="0" value="0"></div>
          <div class="form-group"><label class="form-label">Lainnya</label><input type="number" id="outLain" min="0" value="0"></div>
        </div>
        <button class="btn-primary" onclick="submitGallonOut()">Simpan Galon Keluar</button>
      </div>
    `;
  } else if (tab === 'kembali') {
    html = `
      <div class="card">
        <div class="form-group">
          <label class="form-label">Agen</label>
          <select id="retAgent">
            <option value="">-- Pilih Agen --</option>
            ${agenState.agents.map(a => `<option value="${a.id}" data-name="${a.name}">${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Aqua</label><input type="number" id="retAqua" min="0" value="0"></div>
          <div class="form-group"><label class="form-label">BM Water</label><input type="number" id="retBM" min="0" value="0"></div>
          <div class="form-group"><label class="form-label">Kran</label><input type="number" id="retKran" min="0" value="0"></div>
          <div class="form-group"><label class="form-label">Lainnya</label><input type="number" id="retLain" min="0" value="0"></div>
          <div class="form-group"><label class="form-label">Rusak</label><input type="number" id="retRusak" min="0" value="0"></div>
        </div>
        <button class="btn-primary" onclick="submitGallonReturn()">Simpan Galon Kembali</button>
      </div>
    `;
  } else {
    if (!tracking || tracking.length === 0) {
      html = '<div class="card text-center text-muted">Belum ada data tracking galon agen.</div>';
    } else {
      html = tracking.map(t => `
        <div class="card">
          <div style="font-weight:700; margin-bottom:8px;">${t.agent_name}</div>
          <div class="table-wrap">
            <table>
              <tr><th>Jenis</th><th>Keluar</th><th>Kembali</th><th>Belum</th></tr>
              <tr><td>Aqua</td><td>${t.aqua}</td><td>${t.kembali.aqua}</td><td><b>${t.belum.aqua}</b></td></tr>
              <tr><td>BM Water</td><td>${t.bm_water}</td><td>${t.kembali.bm_water}</td><td><b>${t.belum.bm_water}</b></td></tr>
              <tr><td>Kran</td><td>${t.kran}</td><td>${t.kembali.kran}</td><td><b>${t.belum.kran}</b></td></tr>
              <tr><td>Lainnya</td><td>${t.lainnya}</td><td>${t.kembali.lainnya}</td><td><b>${t.belum.lainnya}</b></td></tr>
              <tr style="background:#f8fafc;"><td><b>Total</b></td><td><b>${t.total}</b></td><td><b>${t.kembali.total}</b></td><td><b>${t.belum.total}</b></td></tr>
            </table>
          </div>
        </div>
      `).join('');
    }
  }

  $('#agenContent').innerHTML = html;
}

async function submitGallonOut() {
  const sel = $('#outAgent');
  const agent_id = sel.value;
  const agent_name = sel.options[sel.selectedIndex]?.dataset.name || '';
  if (!agent_id) return toast('Pilih agen', 'error');

  const payload = {
    agent_id, agent_name,
    aqua: Number($('#outAqua').value || 0),
    bm_water: Number($('#outBM').value || 0),
    kran: Number($('#outKran').value || 0),
    lainnya: Number($('#outLain').value || 0)
  };

  try {
    await api('createGallonOut', payload);
    toast('Galon keluar tersimpan', 'success');
    renderAgen();
  } catch (e) {}
}

async function submitGallonReturn() {
  const sel = $('#retAgent');
  const agent_id = sel.value;
  const agent_name = sel.options[sel.selectedIndex]?.dataset.name || '';
  if (!agent_id) return toast('Pilih agen', 'error');

  const payload = {
    agent_id, agent_name,
    aqua: Number($('#retAqua').value || 0),
    bm_water: Number($('#retBM').value || 0),
    kran: Number($('#retKran').value || 0),
    lainnya: Number($('#retLain').value || 0),
    rusak: Number($('#retRusak').value || 0)
  };

  try {
    await api('createGallonReturn', payload);
    toast('Galon kembali tersimpan', 'success');
    renderAgen();
  } catch (e) {}
}

// ====================== BAHAN ======================

async function renderBahan() {
  const stocks = await api('getMaterialStock').catch(() => []);

  let html = `
    <div class="card">
      <div class="card-title">Stok Bahan Saat Ini</div>
      ${stocks.map(s => `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;">
          <span style="text-transform:capitalize;">${s.material}</span>
          <span><b>${s.last_physical_stock}</b></span>
        </div>
      `).join('')}
    </div>

    <div class="card">
      <div class="card-title">Catat Pembelian</div>
      <div class="form-group">
        <label class="form-label">Bahan</label>
        <select id="purMaterial">
          <option value="air">Air (liter)</option>
          <option value="tutup">Tutup (pcs)</option>
          <option value="label">Label (pcs)</option>
          <option value="tisue">Tisue (roll)</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Jumlah</label><input type="number" id="purQty" min="1"></div>
      <div class="form-group"><label class="form-label">Harga Total</label><input type="number" id="purPrice" min="0"></div>
      <div class="form-group"><label class="form-label">Supplier</label><input type="text" id="purSupplier"></div>
      <button class="btn-primary" onclick="submitPurchase()">Simpan Pembelian</button>
    </div>

    <div class="card">
      <div class="card-title">Rekonsiliasi Stok</div>
      <p class="text-muted mb-12" style="font-size:13px;">Masukkan stok fisik hasil hitung manual.</p>
      <div class="form-group">
        <label class="form-label">Bahan</label>
        <select id="recMaterial">
          <option value="air">Air</option>
          <option value="tutup">Tutup</option>
          <option value="label">Label</option>
          <option value="tisue">Tisue</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Stok Fisik</label><input type="number" id="recPhysical" min="0"></div>
      <button class="btn-primary" onclick="submitReconciliation()">Simpan Rekonsiliasi</button>
    </div>
  `;

  $('#mainContent').innerHTML = html;
}

async function submitPurchase() {
  const payload = {
    material: $('#purMaterial').value,
    quantity: Number($('#purQty').value),
    price: Number($('#purPrice').value || 0),
    supplier: $('#purSupplier').value
  };
  if (!payload.quantity) return toast('Jumlah wajib diisi', 'error');
  try {
    await api('saveMaterialPurchase', payload);
    toast('Pembelian tersimpan', 'success');
    renderBahan();
  } catch (e) {}
}

async function submitReconciliation() {
  const payload = {
    material: $('#recMaterial').value,
    physical_stock: Number($('#recPhysical').value)
  };
  if (isNaN(payload.physical_stock)) return toast('Stok fisik wajib diisi', 'error');
  try {
    const res = await api('saveReconciliation', payload);
    toast(`Rekonsiliasi tersimpan. Selisih: ${res.diff}`, res.status === 'sesuai' ? 'success' : '');
    renderBahan();
  } catch (e) {}
}

// ====================== REKAP GALON ======================

async function renderRekap() {
  $('#mainContent').innerHTML = `
    <div class="card">
      <div class="card-title">Rekap Galon Hari Ini</div>
      <div class="form-group"><label class="form-label">Galon Kosong Belum Diisi</label><input type="number" id="rekapKosong" min="0" value="0"></div>
      <div class="form-group"><label class="form-label">Galon Jelek/Rusak</label><input type="number" id="rekapRusak" min="0" value="0"></div>
      <div class="form-group"><label class="form-label">Catatan</label><textarea id="rekapCatatan" rows="3"></textarea></div>
      <button class="btn-primary" onclick="submitRekap()">Simpan Rekap</button>
    </div>
  `;
}

async function submitRekap() {
  const payload = {
    kosong: Number($('#rekapKosong').value || 0),
    jelek_rusak: Number($('#rekapRusak').value || 0),
    catatan: $('#rekapCatatan').value
  };
  try {
    await api('saveGallonCheck', payload);
    toast('Rekap tersimpan', 'success');
  } catch (e) {}
}

// ====================== MORE ======================

function renderMore() {
  const isOwner = state.user.role === 'owner';
  const items = isOwner ? [
    { id: 'konsumen', label: '👥 Konsumen' },
    { id: 'komisi', label: '💵 Komisi Operator' },
    { id: 'pengeluaran', label: '💸 Pengeluaran' },
    { id: 'rekonsiliasi', label: '📋 Rekonsiliasi' },
    { id: 'log', label: '📜 Log Aktivitas' },
    { id: 'pengaturan', label: '⚙️ Pengaturan' }
  ] : [
    { id: 'konsumen', label: '👥 Konsumen' },
    { id: 'komisi', label: '💵 Komisi Saya' }
  ];

  $('#mainContent').innerHTML = `
    <div class="card">
      ${items.map(i => `
        <button class="btn-secondary" onclick="navigate('${i.id}')">${i.label}</button>
      `).join('')}
    </div>
  `;
}

// ====================== KONSUMEN ======================

async function renderKonsumen() {
  const list = await api('getCustomers').catch(() => []);
  $('#mainContent').innerHTML = `
    <div class="card">
      <div class="card-title">Daftar Konsumen</div>
      ${list.length === 0 ? '<p class="text-muted">Belum ada konsumen.</p>' :
        list.map(c => `
          <div style="padding:10px 0; border-bottom:1px solid #eee;">
            <div style="font-weight:600;">${c.name}</div>
            <div class="text-muted" style="font-size:12px;">${c.address || '-'} · ${formatRp(c.price)}</div>
          </div>
        `).join('')}
    </div>
  `;
}

// ====================== KOMISI ======================

async function renderKomisi() {
  const data = await api('getCommission').catch(() => ({ total: 0, unpaid: 0, paid: 0, sales: [] }));
  $('#mainContent').innerHTML = `
    <div class="grid-2">
      <div class="card"><div class="card-title">Total</div><div class="card-value small">${formatRp(data.total)}</div></div>
      <div class="card"><div class="card-title">Belum Dibayar</div><div class="card-value small">${formatRp(data.unpaid)}</div></div>
      <div class="card"><div class="card-title">Sudah Dibayar</div><div class="card-value small">${formatRp(data.paid)}</div></div>
    </div>
    <div class="card">
      <div class="card-title">Riwayat Komisi</div>
      <div class="table-wrap">
        <table>
          <tr><th>Tanggal</th><th>Pelanggan</th><th>Komisi</th><th>Status</th></tr>
          ${data.sales.map(s => `
            <tr>
              <td>${String(s.date).substring(0,10)}</td>
              <td>${s.customer_name}</td>
              <td>${formatRp(s.commission)}</td>
              <td>${s.commission_status === 'paid' ? '<span class="badge badge-success">Lunas</span>' : '<span class="badge badge-warning">Belum</span>'}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  `;
}

// ====================== PENGELUARAN ======================

async function renderPengeluaran() {
  const list = await api('getExpenses').catch(() => []);
  $('#mainContent').innerHTML = `
    <div class="card">
      <div class="card-title">Catat Pengeluaran</div>
      <div class="form-group"><label class="form-label">Kategori</label>
        <select id="expCategory">
          <option value="operasional">Operasional</option>
          <option value="listrik">Listrik</option>
          <option value="gaji">Gaji</option>
          <option value="lainnya">Lainnya</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Keterangan</label><input type="text" id="expDesc"></div>
      <div class="form-group"><label class="form-label">Jumlah</label><input type="number" id="expAmount" min="0"></div>
      <button class="btn-primary" onclick="submitExpense()">Simpan</button>
    </div>
    <div class="card">
      <div class="card-title">Riwayat Pengeluaran</div>
      ${list.length === 0 ? '<p class="text-muted">Belum ada pengeluaran.</p>' :
        list.map(e => `
          <div style="padding:8px 0; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
            <div><div>${e.description || e.category}</div><div class="text-muted" style="font-size:12px;">${String(e.date).substring(0,10)}</div></div>
            <div>${formatRp(e.amount)}</div>
          </div>
        `).join('')}
    </div>
  `;
}

async function submitExpense() {
  const payload = {
    category: $('#expCategory').value,
    description: $('#expDesc').value,
    amount: Number($('#expAmount').value)
  };
  if (!payload.amount) return toast('Jumlah wajib diisi', 'error');
  try {
    await api('saveExpense', payload);
    toast('Pengeluaran tersimpan', 'success');
    renderPengeluaran();
  } catch (e) {}
}

// ====================== REKONSILIASI ======================

async function renderRekonsiliasi() {
  const list = await api('getReconciliation').catch(() => []);
  $('#mainContent').innerHTML = `
    <div class="card">
      <div class="card-title">Riwayat Rekonsiliasi</div>
      ${list.length === 0 ? '<p class="text-muted">Belum ada rekonsiliasi.</p>' :
        list.reverse().map(r => `
          <div style="padding:10px 0; border-bottom:1px solid #eee;">
            <div style="display:flex; justify-content:space-between;">
              <b style="text-transform:capitalize;">${r.material}</b>
              <span class="badge badge-${r.status === 'sesuai' ? 'success' : r.status === 'perlu_diperiksa' ? 'warning' : 'danger'}">${r.status}</span>
            </div>
            <div class="text-muted" style="font-size:12px; margin-top:4px;">
              ${String(r.date).substring(0,10)} · Fisik: ${r.physical_stock} · Selisih: ${r.difference}
            </div>
          </div>
        `).join('')}
    </div>
  `;
}

// ====================== LOG ======================

async function renderLog() {
  const list = await api('getLog', { limit: 100 }).catch(() => []);
  $('#mainContent').innerHTML = `
    <div class="card">
      <div class="card-title">Log Aktivitas (100 terakhir)</div>
      ${list.map(l => `
        <div style="padding:8px 0; border-bottom:1px solid #eee; font-size:13px;">
          <div><b>${l.action}</b> · ${l.user_name}</div>
          <div class="text-muted" style="font-size:11px;">${l.timestamp}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ====================== PENGATURAN ======================

async function renderPengaturan() {
  const s = await api('getSettings').catch(() => ({}));
  const fields = [
    ['consumer_price_1', 'Harga Konsumen 1'],
    ['consumer_price_2', 'Harga Konsumen 2'],
    ['agent_price', 'Harga Agen'],
    ['consumer_commission', 'Komisi Konsumen'],
    ['agent_commission', 'Komisi Agen'],
    ['liter_per_gallon', 'Liter per Galon'],
    ['cap_per_gallon', 'Tutup per Galon'],
    ['label_per_gallon', 'Label per Galon (BM Water)'],
    ['tolerance_water', 'Toleransi Air'],
    ['tolerance_cap', 'Toleransi Tutup'],
    ['tolerance_label', 'Toleransi Label']
  ];

  $('#mainContent').innerHTML = `
    <div class="card">
      ${fields.map(([k, label]) => `
        <div class="form-group">
          <label class="form-label">${label}</label>
          <input type="text" id="set_${k}" value="${s[k] || ''}">
        </div>
      `).join('')}
      <button class="btn-primary" onclick="submitSettings()">Simpan Pengaturan</button>
    </div>
  `;
}

async function submitSettings() {
  const payload = {};
  ['consumer_price_1','consumer_price_2','agent_price','consumer_commission','agent_commission',
   'liter_per_gallon','cap_per_gallon','label_per_gallon','tolerance_water','tolerance_cap','tolerance_label']
   .forEach(k => {
     const el = $('#set_' + k);
     if (el && el.value !== '') payload[k] = el.value;
   });
  try {
    await api('saveSettings', payload);
    toast('Pengaturan tersimpan', 'success');
  } catch (e) {}
}

// ====================== INIT ======================

document.addEventListener('DOMContentLoaded', () => {
  $('#btnLogin').onclick = doLogin;
  $('#loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  $('#btnLogout').onclick = doLogout;
  $('#modalClose').onclick = closeModal;
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

  // Auto login
  const savedToken = localStorage.getItem('bm_token');
  const savedUser = localStorage.getItem('bm_user');
  if (savedToken && savedUser) {
    state.token = savedToken;
    state.user = JSON.parse(savedUser);
    enterApp();
  }
});
