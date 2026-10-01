/**
 * BM WATER - Agents Module
 */
const AGENTS = {
  data: [],
  
  async load() {
    const res = await API.call('getAgents', {});
    if (res.success) this.data = res.data.agents || [];
    return this.data;
  },
  
  async save(payload) {
    return await API.call('saveAgent', payload);
  },
  
  getById(id) {
    return this.data.find(a => a.agent_id === id);
  }
};
