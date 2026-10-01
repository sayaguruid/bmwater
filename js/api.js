/**
 * BM WATER - API Client
 */
const API = {
  token: null,
  
  init() {
    this.token = localStorage.getItem('bm_token') || null;
  },
  
  async call(action, data = {}) {
    if (this.token && action !== 'login') {
      data.token = this.token;
    }
    data.action = action;
    
    const res = await fetch(APP_CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    });
    
    const json = await res.json();
    
    if (json.message && json.message.indexOf('Sesi tidak valid') !== -1) {
      AUTH.clearSession();
      showLogin();
    }
    
    return json;
  }
};
