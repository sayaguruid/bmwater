/**
 * BM WATER - Customers Module
 */
const CUSTOMERS = {
  data: [],
  
  async load() {
    const res = await API.call('getCustomers', {});
    if (res.success) this.data = res.data.customers || [];
    return this.data;
  },
  
  async save(payload) {
    return await API.call('saveCustomer', payload);
  },
  
  getById(id) {
    return this.data.find(c => c.customer_id === id);
  }
};
