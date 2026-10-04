const dashboard = document.getElementById('dashboard-content');
const loading = document.getElementById('dashboard-loading');
const profileForm = document.getElementById('profile-settings-form');
const profileStatus = document.getElementById('profile-status');
const dashboardError = document.getElementById('dashboard-error');
const unitsSelect = document.getElementById('preferred-units');
const saveButton = document.getElementById('save-profile');
let savedAccount;

async function readApiResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('The account service did not respond. Start FITIFY with “npm run serve” so Netlify Functions are available, then try again.');
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The account service returned an unreadable response. Please try again.');
  }
  if (!response.ok) throw new Error(data.error || 'The request could not be completed. Please try again.');
  return data;
}

function setProfileStatus(message, state = '') {
  profileStatus.textContent = message;
  profileStatus.className = `account-status${state ? ` is-${state}` : ''}`;
}

function formatHeight(heightCm, units) {
  if (!heightCm) return 'Not added';
  if (units === 'metric') return `${Number(heightCm).toFixed(0)} cm`;
  let totalInches = Math.round(Number(heightCm) / 2.54);
  let feet = Math.floor(totalInches / 12);
  let inches = totalInches % 12;
  if (inches === 12) { feet += 1; inches = 0; }
  return `${feet}′ ${inches}″`;
}

function formatWeight(weightKg, units) {
  if (!weightKg) return 'Not added';
  return units === 'metric'
    ? `${Number(weightKg).toFixed(1)} kg`
    : `${(Number(weightKg) * 2.2046226218).toFixed(1)} lb`;
}

function populateMeasurementFields() {
  const imperial = unitsSelect.value === 'imperial';
  document.getElementById('profile-height-label').htmlFor = imperial ? 'profile-height-ft' : 'profile-height-cm';
  document.getElementById('profile-weight-label').htmlFor = imperial ? 'profile-weight-lb' : 'profile-weight-kg';
  document.getElementById('height-metric-wrap').hidden = imperial;
  document.getElementById('height-imperial-wrap').hidden = !imperial;
  document.getElementById('weight-metric-wrap').hidden = imperial;
  document.getElementById('weight-imperial-wrap').hidden = !imperial;

  const heightCm = savedAccount?.heightCm;
  const weightKg = savedAccount?.currentWeightKg;
  if (imperial) {
    const totalInches = heightCm ? Number(heightCm) / 2.54 : null;
    document.getElementById('profile-height-ft').value = totalInches === null ? '' : Math.floor(totalInches / 12);
    document.getElementById('profile-height-in').value = totalInches === null ? '' : (totalInches % 12).toFixed(1);
    document.getElementById('profile-weight-lb').value = weightKg ? (Number(weightKg) * 2.2046226218).toFixed(1) : '';
  } else {
    document.getElementById('profile-height-cm').value = heightCm ?? '';
    document.getElementById('profile-weight-kg').value = weightKg ?? '';
  }
}

function renderAccount(account) {
  savedAccount = account;
  const units = account.preferredUnits === 'imperial' ? 'imperial' : 'metric';
  document.getElementById('welcome-name').textContent = account.displayName || 'there';
  document.getElementById('profile-name').value = account.displayName || '';
  document.getElementById('profile-email').value = account.email || '';
  document.getElementById('email-verification-controls').hidden = account.emailVerified !== false;
  unitsSelect.value = units;
  document.getElementById('fitness-focus').value = account.fitnessGoal || 'general';
  document.getElementById('daily-calorie-target').value = account.dailyCalorieTarget ?? '';
  document.getElementById('stat-height').textContent = formatHeight(account.heightCm, units);
  document.getElementById('stat-weight').textContent = formatWeight(account.currentWeightKg, units);
  document.getElementById('stat-bmi').textContent = account.bmi == null ? '—' : Number(account.bmi).toFixed(1);
  document.getElementById('bmi-note').textContent = account.bmi == null
    ? 'Add height and weight to calculate'
    : 'An estimate from your saved height and weight';
  populateMeasurementFields();
}

function renderBmiHistory(entries) {
  const list = document.getElementById('bmi-history-list');
  const empty = document.getElementById('bmi-history-empty');
  list.replaceChildren();
  empty.hidden = entries.length > 0;
  entries.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'bmi-history-item';
    const main = document.createElement('div');
    main.className = 'bmi-history-main';
    const value = document.createElement('strong');
    value.textContent = Number(entry.bmi).toFixed(1);
    const category = document.createElement('span');
    category.className = 'bmi-history-category';
    const tone = entry.bmi < 18.5 || entry.bmi >= 30 ? 'red' : entry.bmi < 25 ? 'green' : 'yellow';
    category.classList.add(`is-${tone}`);
    category.textContent = entry.category;
    main.append(value, category);
    const details = document.createElement('p');
    details.textContent = `${formatHeight(entry.heightCm, savedAccount.preferredUnits)} · ${formatWeight(entry.weightKg, savedAccount.preferredUnits)}`;
    const date = document.createElement('time');
    date.dateTime = entry.createdAt;
    const parsedDate = new Date(entry.createdAt);
    date.textContent = Number.isNaN(parsedDate.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(parsedDate);
    item.append(main, details, date);
    list.append(item);
  });
}

async function loadBmiHistory() {
  const error = document.getElementById('bmi-history-error');
  try {
    const response = await fetch('/.netlify/functions/bmi-history', { cache: 'no-store' });
    const data = await readApiResponse(response);
    renderBmiHistory(Array.isArray(data.entries) ? data.entries : []);
  } catch {
    error.hidden = false;
  }
}

async function loadDashboard() {
  try {
    const response = await fetch('/.netlify/functions/account', { cache: 'no-store' });
    if (response.status === 401) {
      window.location.replace('./account.html');
      return;
    }
    const data = await readApiResponse(response);
    renderAccount(data.account);
    dashboard.hidden = false;
    loading.hidden = true;
    void loadBmiHistory();
    void loadWeightHistory();
    void loadCalorieHistory();
  } catch (error) {
    loading.replaceChildren();
    const message = document.createElement('p');
    message.className = 'account-status is-error';
    message.textContent = error instanceof TypeError
      ? 'We couldn’t reach the account service. Start FITIFY with “npm run serve” and try again.'
      : error.message || 'We could not load your dashboard. Check your connection and try again.';
    const link = document.createElement('a');
    link.className = 'auth-switch';
    link.href = './account.html';
    link.textContent = 'Return to sign in';
    loading.append(message, link);
  }
}

unitsSelect.addEventListener('change', () => {
  populateMeasurementFields();
  setProfileStatus('Unit preference changed. Save to keep this setting.');
});

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setProfileStatus('');
  const displayName = document.getElementById('profile-name').value.trim();
  if (displayName.length < 2 || displayName.length > 80) {
    document.getElementById('profile-name').setAttribute('aria-invalid', 'true');
    setProfileStatus('Name must be between 2 and 80 characters.', 'error');
    document.getElementById('profile-name').focus();
    return;
  }
  document.getElementById('profile-name').removeAttribute('aria-invalid');

  let heightCm = null;
  let currentWeightKg = null;
  const imperial = unitsSelect.value === 'imperial';
  if (imperial) {
    const feetField = document.getElementById('profile-height-ft');
    const inchesField = document.getElementById('profile-height-in');
    const feetText = feetField.value.trim();
    const inchesText = inchesField.value.trim();
    const feet = Number(feetText || 0);
    const inches = Number(inchesText || 0);
    if ((feetText || inchesText) && (feet < 0 || inches < 0 || inches >= 12 || feet * 12 + inches <= 0)) {
      setProfileStatus('Enter a valid height. Inches must be less than 12.', 'error');
      inchesField.setAttribute('aria-invalid', 'true');
      inchesField.focus();
      return;
    }
    if (feetText || inchesText) heightCm = (feet * 12 + inches) * 2.54;
    const poundsText = document.getElementById('profile-weight-lb').value.trim();
    if (poundsText) currentWeightKg = Number(poundsText) / 2.2046226218;
  } else {
    const heightText = document.getElementById('profile-height-cm').value.trim();
    const weightText = document.getElementById('profile-weight-kg').value.trim();
    if (heightText) heightCm = Number(heightText);
    if (weightText) currentWeightKg = Number(weightText);
  }

  if (heightCm !== null && (!Number.isFinite(heightCm) || heightCm < 50 || heightCm > 260)) {
    setProfileStatus('Height must be between 50 and 260 cm.', 'error');
    return;
  }
  if (currentWeightKg !== null && (!Number.isFinite(currentWeightKg) || currentWeightKg < 10 || currentWeightKg > 500)) {
    setProfileStatus('Weight must be between 10 and 500 kg.', 'error');
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = 'Saving…';
  try {
    const response = await fetch('/.netlify/functions/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName,
        preferredUnits: unitsSelect.value,
        heightCm,
        currentWeightKg,
        fitnessGoal: document.getElementById('fitness-focus').value,
        dailyCalorieTarget: document.getElementById('daily-calorie-target').value || null,
      }),
      cache: 'no-store',
    });
    if (response.status === 401) {
      window.location.replace('./account.html');
      return;
    }
    const data = await readApiResponse(response);
    renderAccount(data.account);
    setProfileStatus('Your profile has been saved.', 'success');
  } catch (error) {
    setProfileStatus(error.message || 'We could not save your profile. Try again.', 'error');
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML = 'Save changes <span aria-hidden="true">&#8594;</span>';
  }
});

document.getElementById('sign-out').addEventListener('click', async () => {
  const button = document.getElementById('sign-out');
  button.disabled = true;
  try {
    const response = await fetch('/.netlify/functions/auth-logout', { method: 'POST', cache: 'no-store' });
    if (!response.ok) throw new Error('Sign-out failed. Please try again.');
    window.location.replace('./account.html');
  } catch (error) {
    dashboardError.textContent = error.message;
    button.disabled = false;
  }
});

loadDashboard();

document.getElementById('send-verification-email').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  setStatusById('verification-status', 'Sending a verification link…');
  try {
    const response = await fetch('/.netlify/functions/auth-resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: document.getElementById('profile-email').value }),
      cache: 'no-store',
    });
    await readApiResponse(response);
    setStatusById('verification-status', 'If email delivery is configured, a fresh link is on its way.', 'success');
  } catch (error) {
    setStatusById('verification-status', error.message || 'Could not request a verification link.', 'error');
  } finally {
    button.disabled = false;
  }
});


function localDateString(date = new Date()) {
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`;
}
function setStatusById(id, message, state = '') { const el = document.getElementById(id); el.textContent = message; el.className = `account-status${state ? ` is-${state}` : ''}`; }
function weightValueToKg(value) { return unitsSelect.value === 'imperial' ? Number(value) / 2.2046226218 : Number(value); }
function renderWeightHistory(entries) {
  const list = document.getElementById('weight-history-list'); const empty = document.getElementById('weight-history-empty'); const chart = document.getElementById('weight-chart');
  list.replaceChildren(); chart.replaceChildren(); empty.hidden = entries.length > 0;
  const ordered = [...entries].sort((a, b) => a.loggedOn.localeCompare(b.loggedOn));
  if (ordered.length > 1) {
    const width = 720; const height = 150; const pad = 20; const values = ordered.map((entry) => savedAccount.preferredUnits === 'imperial' ? Number(entry.weightKg) * 2.2046226218 : Number(entry.weightKg));
    const min = Math.min(...values); const max = Math.max(...values); const spread = max - min || 1;
    const points = values.map((value, i) => `${pad + i * (width - 2 * pad) / (values.length - 1)},${height - pad - (value - min) * (height - 2 * pad) / spread}`);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Weight trend over recorded dates');
    const poly = document.createElementNS(svg.namespaceURI, 'polyline'); poly.setAttribute('points', points.join(' ')); poly.setAttribute('fill', 'none'); poly.setAttribute('stroke', '#a78bfa'); poly.setAttribute('stroke-width', '4'); poly.setAttribute('stroke-linecap', 'round'); poly.setAttribute('stroke-linejoin', 'round'); svg.append(poly);
    points.forEach((point) => { const [cx, cy] = point.split(','); const dot = document.createElementNS(svg.namespaceURI, 'circle'); dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('r', '4'); dot.setAttribute('fill', '#62e2b0'); svg.append(dot); }); chart.append(svg);
  }
  [...ordered].reverse().slice(0, 12).forEach((entry) => { const item = document.createElement('li'); item.className = 'bmi-history-item'; const main = document.createElement('div'); main.className = 'bmi-history-main'; const value = document.createElement('strong'); value.textContent = formatWeight(entry.weightKg, savedAccount.preferredUnits); const source = document.createElement('span'); source.className = 'bmi-history-category is-green'; source.textContent = entry.source === 'bmi' ? 'BMI calculator' : 'Check-in'; main.append(value, source); const date = document.createElement('time'); date.dateTime = entry.loggedOn; date.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${entry.loggedOn}T12:00:00Z`)); item.append(main, date); list.append(item); });
}
async function loadWeightHistory() {
  try { const response = await fetch('/.netlify/functions/weight-history', { cache: 'no-store' }); const data = await readApiResponse(response); renderWeightHistory(Array.isArray(data.entries) ? data.entries : []); }
  catch (error) { setStatusById('weight-log-status', error.message || 'Could not load your weight history.', 'error'); }
}
document.getElementById('weight-log-date').value = localDateString();
document.getElementById('weight-log-date').max = localDateString();
document.getElementById('weight-log-label').textContent = `Weight (${unitsSelect.value === 'imperial' ? 'lb' : 'kg'})`;
unitsSelect.addEventListener('change', () => { document.getElementById('weight-log-label').textContent = `Weight (${unitsSelect.value === 'imperial' ? 'lb' : 'kg'})`; });
document.getElementById('weight-log-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const button = document.getElementById('weight-log-submit'); const valueField = document.getElementById('weight-log-value'); button.disabled = true; setStatusById('weight-log-status', 'Saving check-in…');
  try { const response = await fetch('/.netlify/functions/weight-history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loggedOn: document.getElementById('weight-log-date').value, weightKg: weightValueToKg(valueField.value) }), cache: 'no-store' }); await readApiResponse(response); const accountResponse = await fetch('/.netlify/functions/account', { cache: 'no-store' }); const accountData = await readApiResponse(accountResponse); renderAccount(accountData.account); await loadWeightHistory(); setStatusById('weight-log-status', 'Check-in saved. Your profile snapshot is up to date.', 'success'); }
  catch (error) { setStatusById('weight-log-status', error.message || 'Could not save this check-in.', 'error'); }
  finally { button.disabled = false; }
});
async function loadCalorieHistory() {
  const list = document.getElementById('calorie-history-list'); const empty = document.getElementById('calorie-history-empty'); const error = document.getElementById('calorie-history-error');
  try {
    const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - index); return localDateString(date); });
    const summaries = await Promise.all(days.map(async (date) => { const response = await fetch(`/.netlify/functions/calorie-history?date=${date}`, { cache: 'no-store' }); return { date, ...(await readApiResponse(response)) }; }));
    const withMeals = summaries.filter((item) => item.entries?.length); list.replaceChildren(); empty.hidden = withMeals.length > 0;
    withMeals.forEach((item) => { const article = document.createElement('article'); article.className = 'calorie-history-day'; const header = document.createElement('div'); header.className = 'calorie-history-day-head'; const date = document.createElement('strong'); date.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${item.date}T12:00:00Z`)); const count = document.createElement('span'); count.textContent = `${item.entries.length} ${item.entries.length === 1 ? 'meal' : 'meals'}`; header.append(date, count); const amount = document.createElement('div'); amount.className = 'calorie-history-amount'; amount.textContent = `${Math.round(item.totals.calories).toLocaleString()} kcal`; article.append(header, amount);
      if (savedAccount.dailyCalorieTarget) { const track = document.createElement('div'); track.className = 'calorie-progress'; const bar = document.createElement('span'); bar.style.width = `${Math.min(100, item.totals.calories / savedAccount.dailyCalorieTarget * 100)}%`; track.append(bar); const note = document.createElement('small'); note.textContent = `${Math.round(item.totals.calories / savedAccount.dailyCalorieTarget * 100)}% of ${savedAccount.dailyCalorieTarget.toLocaleString()} kcal goal`; article.append(track, note); }
      list.append(article);
    });
  } catch { error.hidden = false; }
}
document.getElementById('change-password-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const status = document.getElementById('password-status'); const button = document.getElementById('change-password-submit'); const currentPassword = document.getElementById('current-password').value; const newPassword = document.getElementById('new-password').value;
  if (newPassword.length < 12 || newPassword.length > 128) { setStatusById('password-status', 'Use a password between 12 and 128 characters.', 'error'); return; }
  button.disabled = true; setStatusById('password-status', 'Updating password…');
  try { const response = await fetch('/.netlify/functions/auth-change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }), cache: 'no-store' }); await readApiResponse(response); event.target.reset(); setStatusById('password-status', 'Password updated. Other signed-in sessions were closed.', 'success'); }
  catch (error) { setStatusById('password-status', error.message || 'Could not update password.', 'error'); }
  finally { button.disabled = false; }
});
document.getElementById('delete-account-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const status = document.getElementById('delete-status'); const button = document.getElementById('delete-account-submit');
  if (document.getElementById('delete-confirmation').value !== 'DELETE') { setStatusById('delete-status', 'Type DELETE exactly to confirm permanent account removal.', 'error'); return; }
  if (!window.confirm('Permanently delete your account and all saved FITIFY history? This cannot be undone.')) return;
  button.disabled = true; setStatusById('delete-status', 'Deleting your account…');
  try { const response = await fetch('/.netlify/functions/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: document.getElementById('delete-password').value }), cache: 'no-store' }); await readApiResponse(response); window.location.replace('./index.html'); }
  catch (error) { setStatusById('delete-status', error.message || 'Could not delete this account.', 'error'); button.disabled = false; }
});
