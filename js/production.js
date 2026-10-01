/**
 * BM WATER - Production Module
 */
const PRODUCTION = {
  data: [],
  
  async load(limit = 50) {
    const res = await API.call('getProduction', { limit });
    if (res.success) this.data = res.data.production || [];
    return this.data;
  },
  
  async save(payload) {
    return await API.call('saveProduction', payload);
  }
};
