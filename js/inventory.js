/**
 * BM WATER - Inventory & Gallon Stock
 */
const GALLONS = {
  summary: { READY:0, EMPTY:0, WASHING:0, DAMAGED:0, LOST:0 },
  history: [],
  
  async load() {
    const res = await API.call('getGallonStock', {});
    if (res.success) {
      this.summary = res.data.summary || this.summary;
      this.history = res.data.history || [];
    }
    return this.summary;
  },
  
  async update(type, quantity, notes) {
    return await API.call('updateGallonStock', { type, quantity, notes });
  },
  
  async transfer(from_type, to_type, quantity, notes) {
    return await API.call('transferGallonStock', { from_type, to_type, quantity, notes });
  }
};

const INVENTORY = {
  items: [],
  
  async load() {
    const res = await API.call('getInventory', {});
    if (res.success) this.items = res.data.items || [];
    return this.items;
  },
  
  async save(payload) {
    return await API.call('saveInventoryItem', payload);
  },
  
  async adjust(item_id, delta, notes) {
    return await API.call('adjustInventoryStock', { item_id, delta, notes });
  },
  
  getById(id) {
    return this.items.find(function(i) { return i.item_id === id; });
  }
};
