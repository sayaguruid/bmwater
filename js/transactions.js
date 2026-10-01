/**
 * BM WATER - Transactions Module
 */
const TRANSACTIONS = {
  data: [],
  prices: { consumer: 10000, consumer2: 12000, agent: 8000 },
  commissions: { consumer: 2000, agent: 1000 },
  
  async load(limit = 50) {
    const res = await API.call('getTransactions', { limit });
    if (res.success) this.data = res.data.transactions || [];
    return this.data;
  },
  
  async create(payload) {
    return await API.call('createTransaction', payload);
  },
  
  compute(customerType, pricePerGallon, quantity) {
    const qty = parseInt(quantity, 10) || 0;
    const commissionPerGallon = customerType === 'AGENT'
      ? this.commissions.agent
      : this.commissions.consumer;
    return {
      total: qty * pricePerGallon,
      commissionPerGallon: commissionPerGallon,
      totalCommission: qty * commissionPerGallon
    };
  }
};
