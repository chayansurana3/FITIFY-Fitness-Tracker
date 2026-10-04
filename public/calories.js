const mealForm = document.getElementById('meal-form');
const mealInput = document.getElementById('meal_name');
const servingInput = document.getElementById('serving_size');
const servingType = document.getElementById('serving_type');
const trackButton = document.getElementById('track-button');
const statusElement = document.getElementById('calorie-status');
const trackedSection = document.getElementById('tracked');
const mealEntries = document.getElementById('meal-entries');
const mealDate = document.getElementById('meal-date');
const journalContent = document.getElementById('meal-history-content');
const journalButton = document.getElementById('toggle-meal-history');
const journalLabel = document.getElementById('meal-history-toggle-label');
const journalCount = document.getElementById('meal-history-count');
const journalList = document.getElementById('meal-history-days');
const journalEmpty = document.getElementById('meal-history-empty');
const journalFilter = document.getElementById('meal-history-filter');
const clearLocalHistoryButton = document.getElementById('clear-local-history');
const guestHistoryKey = 'fitify_guest_meal_logs_v1';
const totals = { calories: 0, protein: 0, fat: 0, carbs: 0, fibre: 0 };
const nutritionTargets = Object.fromEntries(['calories', 'protein', 'fat', 'carbs', 'fibre'].map((key) => [key, document.getElementById(key)]));
let signedIn = false;
let guestMeals = loadGuestHistory();
let accountHistory = [];
let journalOpen = false;

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateLabel(date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

mealDate.value = localDateString();
mealDate.max = localDateString();

function setStatus(message, state = '') {
  statusElement.textContent = message;
  statusElement.className = `calorie-status${state ? ` is-${state}` : ''}`;
}

function getNutrient(data, code) {
  const amount = Number(data.totalNutrients?.[code]?.quantity);
  return Number.isFinite(amount) ? amount : 0;
}

function loadGuestHistory() {
  try {
    const entries = JSON.parse(localStorage.getItem(guestHistoryKey) || '[]');
    if (!Array.isArray(entries)) return [];
    return entries.filter((entry) => entry && /^\d{4}-\d{2}-\d{2}$/.test(entry.loggedOn) && typeof entry.mealName === 'string')
      .map((entry) => ({ ...entry, calories: Number(entry.calories) || 0, protein: Number(entry.protein) || 0, carbs: Number(entry.carbs) || 0, fat: Number(entry.fat) || 0, fibre: Number(entry.fibre) || 0 }));
  } catch {
    return [];
  }
}

function persistGuestHistory(entries) {
  try {
    localStorage.setItem(guestHistoryKey, JSON.stringify(entries));
    guestMeals = entries;
    return true;
  } catch (error) {
    console.error('Could not save the local meal journal:', error?.name || 'storage error');
    return false;
  }
}

function updateTotals(entries) {
  Object.keys(totals).forEach((key) => {
    totals[key] = entries.reduce((sum, entry) => sum + Number(entry[key] || 0), 0);
  });
  nutritionTargets.calories.textContent = Math.round(totals.calories).toLocaleString();
  ['protein', 'fat', 'carbs', 'fibre'].forEach((key) => {
    nutritionTargets[key].textContent = totals[key].toFixed(1);
  });
}

function renderMealRows(entries) {
  mealEntries.replaceChildren();
  updateTotals(entries);
  entries.forEach((entry) => {
    const row = document.createElement('tr');
    for (const value of [entry.mealName, `${entry.amount} ${entry.servingUnit}`, `${Math.round(entry.calories).toLocaleString()} kcal`]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    mealEntries.append(row);
  });
  trackedSection.hidden = entries.length === 0;
}

function currentGuestDayEntries() {
  return guestMeals.filter((entry) => entry.loggedOn === mealDate.value).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

function updateJournalCount() {
  const count = signedIn ? accountHistory.length : guestMeals.length;
  journalCount.textContent = count.toLocaleString();
  journalButton.setAttribute('aria-label', `${journalOpen ? 'Hide' : 'Show'} ${count} saved meal logs`);
}

function renderJournal(entries) {
  const selectedDate = journalFilter.value;
  const filtered = entries
    .filter((entry) => !selectedDate || entry.loggedOn === selectedDate)
    .sort((a, b) => b.loggedOn.localeCompare(a.loggedOn) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  journalList.replaceChildren();
  journalEmpty.hidden = filtered.length > 0;
  if (!filtered.length) return;

  const grouped = new Map();
  filtered.forEach((entry) => {
    if (!grouped.has(entry.loggedOn)) grouped.set(entry.loggedOn, []);
    grouped.get(entry.loggedOn).push(entry);
  });

  grouped.forEach((dayEntries, date) => {
    const day = document.createElement('article');
    day.className = 'meal-history-day';
    const header = document.createElement('div');
    header.className = 'meal-history-day-heading';
    const heading = document.createElement('h3');
    heading.textContent = dateLabel(date);
    const dayCalories = dayEntries.reduce((sum, entry) => sum + Number(entry.calories || 0), 0);
    const total = document.createElement('span');
    total.className = 'meal-history-day-total';
    total.textContent = `${Math.round(dayCalories).toLocaleString()} kcal · ${dayEntries.length} ${dayEntries.length === 1 ? 'meal' : 'meals'}`;
    header.append(heading, total);

    const list = document.createElement('ul');
    list.className = 'meal-history-entry-list';
    dayEntries.forEach((entry) => {
      const item = document.createElement('li');
      item.className = 'meal-history-entry';
      const detail = document.createElement('div');
      detail.className = 'meal-history-entry-detail';
      const name = document.createElement('strong');
      name.textContent = entry.mealName;
      const serving = document.createElement('span');
      serving.textContent = `${entry.amount} ${entry.servingUnit}`;
      const macros = document.createElement('small');
      macros.textContent = `Protein ${Number(entry.protein || 0).toFixed(1)} g · Carbs ${Number(entry.carbs || 0).toFixed(1)} g · Fat ${Number(entry.fat || 0).toFixed(1)} g`;
      detail.append(name, serving, macros);
      const calories = document.createElement('b');
      calories.textContent = `${Math.round(entry.calories).toLocaleString()} kcal`;
      item.append(detail, calories);
      list.append(item);
    });
    day.append(header, list);
    journalList.append(day);
  });
}

function refreshJournal() {
  const entries = signedIn ? accountHistory : guestMeals;
  renderJournal(entries);
  updateJournalCount();
}

async function readApi(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
}

async function loadDay() {
  if (signedIn) {
    try {
      const response = await fetch(`/.netlify/functions/calorie-history?date=${encodeURIComponent(mealDate.value)}`, { cache: 'no-store' });
      const data = await readApi(response);
      renderMealRows(data.entries || []);
      document.getElementById('calorie-save-note').textContent = 'Meals are saved to your private account.';
    } catch (error) {
      setStatus(error.message || 'Could not load saved meals.', 'error');
    }
  } else {
    renderMealRows(currentGuestDayEntries());
  }
  document.getElementById('tracked-heading').textContent = `Nutrition for ${dateLabel(mealDate.value)}`;
}

async function loadAccountHistory() {
  try {
    const response = await fetch('/.netlify/functions/calorie-history?history=1', { cache: 'no-store' });
    const data = await readApi(response);
    accountHistory = Array.isArray(data.entries) ? data.entries : [];
    refreshJournal();
  } catch (error) {
    journalList.replaceChildren();
    journalEmpty.hidden = false;
    journalEmpty.textContent = error.message || 'Could not load your saved meal history.';
  }
}

fetch('/.netlify/functions/auth-session', { cache: 'no-store' })
  .then(async (response) => {
    signedIn = response.ok;
    const note = document.getElementById('calorie-save-note');
    if (signedIn) {
      note.textContent = 'Meals are saved to your private account.';
      clearLocalHistoryButton.hidden = true;
      document.getElementById('meal-history-storage').textContent = 'Saved privately to your FITIFY account.';
      await Promise.all([loadDay(), loadAccountHistory()]);
    } else {
      note.innerHTML = 'Sign in to sync meals between devices. <a href="./account.html">Sign in</a> · <a href="./register.html">Create account</a>';
      clearLocalHistoryButton.hidden = false;
      document.getElementById('meal-history-storage').textContent = 'Saved only in this browser on this device. It will not sync to your account.';
      document.getElementById('meal-history-description').textContent = 'Your saved meal entries, grouped by day and sorted newest first.';
      await loadDay();
      refreshJournal();
    }
  })
  .catch(() => {
    signedIn = false;
    document.getElementById('calorie-save-note').innerHTML = 'Sign in to sync meals between devices. <a href="./account.html">Sign in</a> · <a href="./register.html">Create account</a>';
    clearLocalHistoryButton.hidden = false;
    document.getElementById('meal-history-storage').textContent = 'Saved only in this browser on this device. It will not sync to your account.';
    renderMealRows(currentGuestDayEntries());
    refreshJournal();
  });

mealDate.addEventListener('change', () => { void loadDay(); });

function validateMeal(name, amount) {
  if (!name.trim()) {
    mealInput.setAttribute('aria-invalid', 'true');
    setStatus('Add a meal or ingredient to continue.', 'error');
    mealInput.focus();
    return false;
  }
  mealInput.removeAttribute('aria-invalid');
  if (!Number.isFinite(amount) || amount <= 0) {
    servingInput.setAttribute('aria-invalid', 'true');
    setStatus('Enter a serving amount greater than zero.', 'error');
    servingInput.focus();
    return false;
  }
  servingInput.removeAttribute('aria-invalid');
  return true;
}

mealForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = mealInput.value.trim();
  const amount = Number(servingInput.value);
  if (!validateMeal(name, amount)) return;

  const apiUnit = { counts: '', grams: 'g', ounces: 'oz', tablespoon: 'tbsp', cups: 'cup', bowls: 'bowl' }[servingType.value] ?? '';
  const query = `${amount}${apiUnit ? ` ${apiUnit}` : ''} ${name}`;
  trackButton.disabled = true;
  trackButton.innerHTML = '<span class="calorie-spinner" aria-hidden="true"></span> Estimating nutrition';
  setStatus('Checking nutrition information…', 'loading');

  try {
    const lookup = await fetch(`/.netlify/functions/meal?meal=${encodeURIComponent(query)}`);
    if (!lookup.ok) throw new Error('Nutrition data is temporarily unavailable. Please try again.');
    const data = await lookup.json();
    const calories = Number(data.calories);
    if (!Number.isFinite(calories) || calories <= 0) throw new Error(`Couldn’t find nutrition data for “${name}”. Try a more specific food name.`);

    const meal = {
      loggedOn: mealDate.value,
      mealName: name,
      amount,
      servingUnit: servingType.value,
      calories,
      protein: getNutrient(data, 'PROCNT'),
      fat: getNutrient(data, 'FAT'),
      carbs: getNutrient(data, 'CHOCDF'),
      fibre: getNutrient(data, 'FIBTG'),
    };

    if (signedIn) {
      const response = await fetch('/.netlify/functions/calorie-history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meal), cache: 'no-store' });
      await readApi(response);
      await Promise.all([loadDay(), loadAccountHistory()]);
      setStatus(`${name} saved to your FITIFY account.`, 'success');
    } else {
      const entry = { ...meal, id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, createdAt: new Date().toISOString() };
      const updatedHistory = [entry, ...guestMeals];
      if (!persistGuestHistory(updatedHistory)) throw new Error('Your browser could not save this log. Check that site storage is enabled, then try again.');
      renderMealRows(currentGuestDayEntries());
      refreshJournal();
      setStatus(`${name} saved in this browser for ${mealDate.value}.`, 'success');
    }
    servingInput.value = '';
    mealInput.value = '';
    mealInput.focus();
  } catch (error) {
    console.error('Nutrition tracking failed:', error);
    setStatus(error.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    trackButton.disabled = false;
    trackButton.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i> Add to this day';
  }
});

document.getElementById('clear-meals').addEventListener('click', async () => {
  if (signedIn) {
    if (!window.confirm(`Delete all saved meals for ${mealDate.value}?`)) return;
    try {
      const response = await fetch(`/.netlify/functions/calorie-history?date=${encodeURIComponent(mealDate.value)}`, { method: 'DELETE', cache: 'no-store' });
      await readApi(response);
      await Promise.all([loadDay(), loadAccountHistory()]);
    } catch (error) {
      setStatus(error.message || 'Could not clear saved meals.', 'error');
      return;
    }
  } else {
    const remaining = guestMeals.filter((entry) => entry.loggedOn !== mealDate.value);
    if (!persistGuestHistory(remaining)) {
      setStatus('Your browser could not update saved logs. Try again.', 'error');
      return;
    }
    renderMealRows(currentGuestDayEntries());
    refreshJournal();
  }
  setStatus(`Meals for ${mealDate.value} have been cleared.`, 'success');
});

journalButton.addEventListener('click', async () => {
  journalOpen = !journalOpen;
  journalContent.hidden = !journalOpen;
  journalButton.setAttribute('aria-expanded', String(journalOpen));
  journalLabel.textContent = journalOpen ? 'Hide logs' : 'Show logs';
  if (journalOpen) {
    if (signedIn) await loadAccountHistory();
    else refreshJournal();
  }
  updateJournalCount();
});

journalFilter.addEventListener('change', () => refreshJournal());

clearLocalHistoryButton.addEventListener('click', () => {
  if (signedIn || !guestMeals.length) return;
  if (!window.confirm('Clear all meal logs saved in this browser? This cannot be undone.')) return;
  if (!persistGuestHistory([])) {
    setStatus('Your browser could not clear saved logs. Try again.', 'error');
    return;
  }
  renderMealRows([]);
  refreshJournal();
  setStatus('This browser’s meal history has been cleared.', 'success');
});

mealInput.addEventListener('input', () => mealInput.removeAttribute('aria-invalid'));
servingInput.addEventListener('input', () => servingInput.removeAttribute('aria-invalid'));
