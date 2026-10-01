/**
 * BM WATER - Commission Module
 */
const COMMISSION = {
  data: null,
  
  async load() {
    const res = await API.call('getCommissions', {});
    if (res.success) this.data = res.data;
    return this.data;
  }
};
