const KEY = 'ffn_signed_invitation';
export function earlyAccessHeaders() {
  try {
    const token = window.sessionStorage.getItem(KEY);
    return token ? { 'X-Early-Access': token } : {};
  } catch { return {}; }
}
export function captureInvitation() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get('invite');
  if (!token) return;
  try { window.sessionStorage.setItem(KEY, token); } catch { return; }
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
}
