/* NEXUS customer authentication demo. State is stored locally for the static prototype. */
const CUSTOMER_ACCOUNTS_KEY = 'nexus_customer_accounts';
const CUSTOMER_SESSION_KEY = 'nexus_customer_user';

function readJson(storage, key, fallback) {
  try { const value = storage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch (error) { console.error(`Unable to read ${key}:`, error); return fallback; }
}

function getCustomerAccounts() { return readJson(localStorage, CUSTOMER_ACCOUNTS_KEY, []); }
function getCurrentUser() { return readJson(localStorage, CUSTOMER_SESSION_KEY, null) || readJson(sessionStorage, CUSTOMER_SESSION_KEY, null); }
function isLoggedIn() { return getCurrentUser() !== null; }

async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function registerCustomer(name, email, password) {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getCustomerAccounts();
  if (accounts.some(account => account.email === cleanEmail)) return { success: false, message: 'Email này đã được đăng ký trên thiết bị.' };
  accounts.push({ name: cleanName, email: cleanEmail, passwordHash: await hashPassword(password) });
  localStorage.setItem(CUSTOMER_ACCOUNTS_KEY, JSON.stringify(accounts));
  return { success: true };
}

async function loginCustomer(email, password, remember = true) {
  const cleanEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  const account = getCustomerAccounts().find(item => item.email === cleanEmail && item.passwordHash === passwordHash);
  if (!account) return { success: false, message: 'Email hoặc mật khẩu chưa chính xác.' };
  const user = { name: account.name, email: account.email, loginAt: new Date().toISOString() };
  (remember ? localStorage : sessionStorage).setItem(CUSTOMER_SESSION_KEY, JSON.stringify(user));
  return { success: true, user };
}

function logoutCustomer() {
  localStorage.removeItem(CUSTOMER_SESSION_KEY);
  sessionStorage.removeItem(CUSTOMER_SESSION_KEY);
  window.location.href = 'index.html';
}

function initHeaderAuth() {
  const actionsWrap = document.querySelector('.header-actions');
  if (!actionsWrap || document.getElementById('header-auth-btn')) return;
  const user = getCurrentUser();
  const authDiv = document.createElement('div');
  authDiv.id = 'header-auth-btn';
  authDiv.className = 'action-btn-wrap';
  authDiv.innerHTML = `<a href="login.html" class="header-icon-link" aria-label="${user ? `Tài khoản của ${user.name}` : 'Đăng nhập tài khoản'}" title="${user ? 'Tài khoản' : 'Đăng nhập'}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></a>`;
  actionsWrap.appendChild(authDiv);
}

function initSharedHeaderBadges() {
  try {
    const cart = JSON.parse(localStorage.getItem('nexus_luxury_cart') || '{}');
    const wishlist = JSON.parse(localStorage.getItem('nexus_luxury_wishlist') || '[]');
    const cartCount = Object.values(cart).reduce((sum, quantity) => sum + Number(quantity || 0), 0);
    const cartBadge = document.getElementById('header-cart-count');
    const wishlistBadge = document.getElementById('header-wishlist-count');
    if (cartBadge) { cartBadge.textContent = cartCount; cartBadge.style.display = cartCount > 0 ? 'flex' : 'none'; }
    if (wishlistBadge) { wishlistBadge.textContent = wishlist.length; wishlistBadge.style.display = wishlist.length > 0 ? 'flex' : 'none'; }
  } catch (error) { console.error('Error reading header badges:', error); }
}

document.addEventListener('DOMContentLoaded', () => { initHeaderAuth(); initSharedHeaderBadges(); });
