/**
 * BM WATER - Auth
 */
const AUTH = {
  user: null,
  
  init() {
    const raw = localStorage.getItem('bm_user');
    if (raw) {
      try { this.user = JSON.parse(raw); } catch(e) {}
    }
  },
  
  async login(username, password) {
    const res = await API.call('login', { username, password });
    if (!res.success) return res;
    
    API.token = res.data.token;
    this.user = res.data.user;
    localStorage.setItem('bm_token', API.token);
    localStorage.setItem('bm_user', JSON.stringify(this.user));
    return res;
  },
  
  async logout() {
    try { await API.call('logout', {}); } catch(e) {}
    this.clearSession();
  },
  
  clearSession() {
    API.token = null;
    this.user = null;
    localStorage.removeItem('bm_token');
    localStorage.removeItem('bm_user');
  },
  
  isLoggedIn() {
    return !!(API.token && this.user);
  },
  
  isOwner() { return this.user && this.user.role === 'OWNER'; },
  isOperator() { return this.user && this.user.role === 'OPERATOR'; }
};
