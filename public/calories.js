const mealForm = document.getElementById('meal-form');
const mealInput = document.getElementById('meal_name');
const servingInput = document.getElementById('serving_size');
const servingType = document.getElementById('serving_type');
const trackButton = document.getElementById('track-button');
const statusElement = document.getElementById('calorie-status');
const trackedSection = document.getElementById('tracked');
const mealEntries = document.getElementById('meal-entries');

const totals = { calories: 0, protein: 0, fat: 0, carbs: 0, fibre: 0 };
const nutritionTargets = {
  calories: document.getElementById('calories'),
  protein: document.getElementById('protein'),
  fat: document.getElementById('fat'),
  carbs: document.getElementById('carbs'),
  fibre: document.getElementById('fibre'),
};

function setStatus(message, state = '') {
  statusElement.textContent = message;
  statusElement.className = `calorie-status${state ? ` is-${state}` : ''}`;
}

function getNutrient(data, code) {
  const amount = Number(data.totalNutrients?.[code]?.quantity);
  return Number.isFinite(amount) ? amount : 0;
}

function updateTotals() {
  nutritionTargets.calories.textContent = Math.round(totals.calories).toLocaleString();
  ['protein', 'fat', 'carbs', 'fibre'].forEach((key) => {
    nutritionTargets[key].textContent = totals[key].toFixed(1);
  });
}

function addMealRow(name, amount, unit, calories) {
  const row = document.createElement('tr');
  const mealCell = document.createElement('td');
  const servingCell = document.createElement('td');
  const caloriesCell = document.createElement('td');
  mealCell.textContent = name;
  servingCell.textContent = `${amount}${unit ? ` ${unit}` : ''}`;
  caloriesCell.textContent = `${Math.round(calories).toLocaleString()} kcal`;
  row.append(mealCell, servingCell, caloriesCell);
  mealEntries.appendChild(row);
}

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

async function trackMeal(event) {
  event.preventDefault();
  const name = mealInput.value.trim();
  const amount = Number(servingInput.value);
  if (!validateMeal(name, amount)) return;

  const unitLabel = servingType.options[servingType.selectedIndex].text;
  const apiUnit = {
    counts: '', grams: 'g', ounces: 'oz', tablespoon: 'tbsp', cups: 'cup', bowls: 'bowl',
  }[servingType.value] ?? '';
  const query = `${amount}${apiUnit ? ` ${apiUnit}` : ''} ${name}`;

  trackButton.disabled = true;
  trackButton.innerHTML = '<span class="calorie-spinner" aria-hidden="true"></span> Estimating nutrition';
  setStatus('Checking nutrition information…', 'loading');

  try {
    const response = await fetch(`/.netlify/functions/meal?meal=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Nutrition data is temporarily unavailable. Please try again.');
    const data = await response.json();
    const calories = Number(data.calories);
    if (!Number.isFinite(calories) || calories <= 0) {
      throw new Error(`Couldn’t find nutrition data for “${name}”. Try a more specific food name.`);
    }

    const nutrients = {
      calories,
      protein: getNutrient(data, 'PROCNT'),
      fat: getNutrient(data, 'FAT'),
      carbs: getNutrient(data, 'CHOCDF'),
      fibre: getNutrient(data, 'FIBTG'),
    };
    Object.keys(totals).forEach((key) => { totals[key] += nutrients[key]; });
    updateTotals();
    addMealRow(name, amount, servingType.value === 'counts' ? 'pieces' : unitLabel.toLowerCase(), calories);
    trackedSection.hidden = false;
    setStatus(`${name} added to today’s tracker.`, 'success');
    servingInput.value = '';
    mealInput.value = '';
    mealInput.focus();
  } catch (error) {
    console.error('Nutrition lookup failed:', error);
    setStatus(error.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    trackButton.disabled = false;
    trackButton.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i> Add to today';
  }
}

mealForm.addEventListener('submit', trackMeal);

document.getElementById('clear-meals').addEventListener('click', () => {
  Object.keys(totals).forEach((key) => { totals[key] = 0; });
  updateTotals();
  mealEntries.replaceChildren();
  trackedSection.hidden = true;
  setStatus('Today’s meal list has been cleared.');
});

mealInput.addEventListener('input', () => mealInput.removeAttribute('aria-invalid'));
servingInput.addEventListener('input', () => servingInput.removeAttribute('aria-invalid'));
