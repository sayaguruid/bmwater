/**
 * BM WATER - Dashboard rendering
 */
const DASHBOARD = {
  async render(container) {
    container.innerHTML = `<div class="empty"><span class="icon">⏳</span>Memuat dashboard...</div>`;
    const res = await API.call('getDashboard', {});
    if (!res.success) {
      container.innerHTML = `<div class="empty"><span class="icon">⚠️</span>${res.message}</div>`;
      return;
    }
    const d = res.data;
    if (d.role === 'OWNER') container.innerHTML = this.renderOwner(d);
    else container.innerHTML = this.renderOperator(d);
  },
  
  renderOperator(d) {
    return `
      <h2 class="page-title">Dashboard</h2>
      <div class="card hero-card">
        <div class="card-title">Galon Hari Ini</div>
        <div class="card-value">${d.today.quantity} galon</div>
        <div class="card-sub">${d.today.transactions} transaksi</div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title">Penjualan Hari Ini</div>
          <div class="card-value">${formatRp(d.today.amount)}</div>
        </div>
        <div class="card">
          <div class="card-title">Komisi Hari Ini</div>
          <div class="card-value" style="color:var(--success)">${formatRp(d.today.commission)}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Komisi Bulan Ini</div>
        <div class="card-value">${formatRp(d.month.commission)}</div>
      </div>
      <div class="card">
        <div class="card-title">Transaksi Terakhir</div>
        ${this.renderRecentList(d.recent)}
      </div>
    `;
  },
  
  renderOwner(d) {
    return `
      <h2 class="page-title">Dashboard Owner</h2>
      <div class="card hero-card">
        <div class="card-title">Omzet Hari Ini</div>
        <div class="card-value">${formatRp(d.today.amount)}</div>
        <div class="card-sub">${d.today.quantity} galon • ${d.today.transactions} transaksi</div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title">Konsumen</div>
          <div class="card-value">${formatRp(d.today.consumer_amount)}</div>
        </div>
        <div class="card">
          <div class="card-title">Agen</div>
          <div class="card-value">${formatRp(d.today.agent_amount)}</div>
        </div>
        <div class="card">
          <div class="card-title">Komisi Operator</div>
          <div class="card-value" style="color:var(--warning)">${formatRp(d.today.commission)}</div>
        </div>
        <div class="card">
          <div class="card-title">Pengeluaran</div>
          <div class="card-value" style="color:var(--danger)">${formatRp(d.today.expenses)}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Laba Sementara Hari Ini</div>
        <div class="card-value" style="color:var(--primary)">${formatRp(d.today.profit)}</div>
        <div class="card-sub">Omzet − Komisi − Pengeluaran</div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title">Bulan Ini</div>
          <div class="card-value">${formatRp(d.month.amount)}</div>
          <div class="card-sub">${d.month.quantity} galon</div>
        </div>
        <div class="card">
          <div class="card-title">7 Hari Terakhir</div>
          ${d.last7.map(x => `<div class="stat-row"><span class="label">${x.date.slice(5)}</span><span class="value">${x.quantity}g</span></div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">Transaksi Terbaru</div>
        ${this.renderRecentList(d.recent)}
      </div>
    `;
  },
  
  renderRecentList(list) {
    if (!list || !list.length) return `<div class="empty"><span class="icon">📭</span>Belum ada transaksi</div>`;
    return list.map(t => `
      <div class="stat-row">
        <span class="label">
          <span class="badge badge-${t.customer_type === 'AGENT' ? 'agent' : 'consumer'}">${t.customer_type === 'AGENT' ? 'Agen' : 'Konsumen'}</span>
          ${t.customer_name}
        </span>
        <span class="value">${t.quantity}g • ${formatRp(t.total_amount)}</span>
      </div>
    `).join('');
  }
};
