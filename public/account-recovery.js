async function postJson(path, payload) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}
const forgotForm = document.getElementById('recovery-form');
if (forgotForm) forgotForm.addEventListener('submit', async (event) => {
  event.preventDefault(); const button = document.getElementById('recovery-submit'); const status = document.getElementById('recovery-status'); button.disabled = true; status.className = 'account-status'; status.textContent = 'Sending…';
  try { const data = await postJson('/.netlify/functions/auth-forgot-password', { email: document.getElementById('email').value.trim().toLowerCase() }); status.textContent = data.message || 'If an account exists for that address, a reset link has been sent.'; status.classList.add('is-success'); }
  catch (error) { status.textContent = error.message; status.classList.add('is-error'); }
  finally { button.disabled = false; }
});
const resetForm = document.getElementById('reset-form');
if (resetForm) resetForm.addEventListener('submit', async (event) => {
  event.preventDefault(); const button = document.getElementById('reset-submit'); const status = document.getElementById('reset-status'); const password = document.getElementById('password').value; const confirm = document.getElementById('confirm-password').value;
  if (password.length < 12 || password.length > 128) { status.textContent = 'Use a password between 12 and 128 characters.'; status.className = 'account-status is-error'; return; }
  if (password !== confirm) { status.textContent = 'The passwords do not match.'; status.className = 'account-status is-error'; return; }
  button.disabled = true; status.textContent = 'Updating password…'; status.className = 'account-status';
  try { await postJson('/.netlify/functions/auth-reset-password', { token: new URLSearchParams(location.search).get('token'), password }); resetForm.hidden = true; status.textContent = 'Password updated. You can now sign in.'; status.classList.add('is-success'); }
  catch (error) { status.textContent = error.message; status.classList.add('is-error'); }
  finally { button.disabled = false; }
});
const verifyStatus = document.getElementById('verify-status');
if (verifyStatus) {
  const token = new URLSearchParams(location.search).get('token');
  fetch('/.netlify/functions/auth-verify-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), cache: 'no-store' })
    .then(async (response) => { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'This verification link is invalid or expired.'); return data; })
    .then(() => { verifyStatus.textContent = 'Email verified. Opening your dashboard…'; verifyStatus.classList.add('is-success'); location.replace('./dashboard.html'); })
    .catch((error) => { verifyStatus.textContent = error.message; verifyStatus.classList.add('is-error'); });
}
