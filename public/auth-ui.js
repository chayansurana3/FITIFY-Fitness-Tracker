const form = document.getElementById('auth-form');
const status = document.getElementById('auth-status');
const submitButton = document.getElementById('auth-submit');
const mode = form.dataset.authMode;
function showStatus(message, state = '') { status.textContent = message; status.className = `account-status${state ? ` is-${state}` : ''}`; }
async function readApiResponse(response) {
  if (!(response.headers.get('content-type') || '').toLowerCase().includes('application/json')) throw new Error('The account service did not respond. Start FITIFY with “npm run serve”, then try again.');
  let result;
  try { result = await response.json(); } catch { throw new Error('The account service returned an unreadable response. Please try again.'); }
  if (!response.ok) { const error = new Error(result.error || 'We could not complete that request.'); error.code = result.code; throw error; }
  return result;
}
fetch('/.netlify/functions/auth-session', { cache: 'no-store' }).then((r) => { if (r.ok) window.location.replace('./dashboard.html'); }).catch(() => {});
form.addEventListener('submit', async (event) => {
  event.preventDefault(); showStatus('');
  const payload = Object.fromEntries(new FormData(form).entries()); payload.email = String(payload.email || '').trim().toLowerCase();
  const nameField = document.getElementById('displayName'); const passwordField = document.getElementById('password');
  if (mode === 'register' && String(payload.displayName || '').trim().length < 2) { nameField.setAttribute('aria-invalid', 'true'); showStatus('Enter a name with at least 2 characters.', 'error'); nameField.focus(); return; }
  nameField?.removeAttribute('aria-invalid');
  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) { const field = document.getElementById('email'); field.setAttribute('aria-invalid', 'true'); showStatus('Enter a valid email address.', 'error'); field.focus(); return; }
  document.getElementById('email').removeAttribute('aria-invalid');
  if (!payload.password || payload.password.length > 128 || (mode === 'register' && payload.password.length < 12)) { passwordField.setAttribute('aria-invalid', 'true'); showStatus(mode === 'register' ? 'Use a password between 12 and 128 characters.' : 'Enter your password.', 'error'); passwordField.focus(); return; }
  passwordField.removeAttribute('aria-invalid'); submitButton.disabled = true; submitButton.textContent = mode === 'register' ? 'Creating your account…' : 'Signing in…';
  try {
    const response = await fetch(`/.netlify/functions/auth-${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store' });
    const result = await readApiResponse(response);
    if (mode === 'register') showStatus(result.message || 'Your account is ready. You are signed in.', 'success');
    window.location.assign('./dashboard.html');
  } catch (error) {
    showStatus(error instanceof TypeError ? 'We couldn’t reach the account service. Start FITIFY with “npm run serve” and try again.' : error.message || 'We could not connect. Please try again.', 'error');
  } finally { submitButton.disabled = false; submitButton.innerHTML = mode === 'register' ? 'Create account <span aria-hidden="true">&#8594;</span>' : 'Sign in <span aria-hidden="true">&#8594;</span>'; }
});
document.querySelectorAll('.account-field input').forEach((field) => field.addEventListener('input', () => field.removeAttribute('aria-invalid')));
