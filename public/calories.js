const mealForm = document.getElementById('meal-form');
const mealInput = document.getElementById('meal_name');
const servingInput = document.getElementById('serving_size');
const servingType = document.getElementById('serving_type');
const trackButton = document.getElementById('track-button');
const statusElement = document.getElementById('calorie-status');
const trackedSection = document.getElementById('tracked');
const mealEntries = document.getElementById('meal-entries');
const mealDate = document.getElementById('meal-date');
const totals = { calories: 0, protein: 0, fat: 0, carbs: 0, fibre: 0 };
const nutritionTargets = Object.fromEntries(['calories','protein','fat','carbs','fibre'].map((key) => [key, document.getElementById(key)]));
let signedIn = false;
let guestMeals = [];
function localDateString(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
mealDate.value = localDateString(); mealDate.max = localDateString();
function setStatus(message, state = '') { statusElement.textContent = message; statusElement.className = `calorie-status${state ? ` is-${state}` : ''}`; }
function getNutrient(data, code) { const amount = Number(data.totalNutrients?.[code]?.quantity); return Number.isFinite(amount) ? amount : 0; }
function updateTotals() { nutritionTargets.calories.textContent = Math.round(totals.calories).toLocaleString(); ['protein','fat','carbs','fibre'].forEach((key) => nutritionTargets[key].textContent = totals[key].toFixed(1)); }
function renderMealRows(entries) { mealEntries.replaceChildren(); Object.keys(totals).forEach((key) => { totals[key] = 0; }); entries.forEach((entry) => { for (const key of Object.keys(totals)) totals[key] += Number(entry[key] || 0); const row = document.createElement('tr'); for (const value of [entry.mealName, `${entry.amount} ${entry.servingUnit}`, `${Math.round(entry.calories).toLocaleString()} kcal`]) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); } mealEntries.append(row); }); updateTotals(); trackedSection.hidden = entries.length === 0; }
async function loadDay() {
  if (!signedIn) return;
  try { const response = await fetch(`/.netlify/functions/calorie-history?date=${encodeURIComponent(mealDate.value)}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load saved meals.'); renderMealRows(data.entries || []); document.getElementById('calorie-save-note').textContent = 'Meals are saved to your private account.'; document.getElementById('tracked-heading').textContent = `Nutrition for ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${mealDate.value}T12:00:00Z`))}`; }
  catch (error) { setStatus(error.message || 'Could not load saved meals.', 'error'); }
}
async function readApi(response) { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'The request could not be completed.'); return data; }
fetch('/.netlify/functions/auth-session', { cache: 'no-store' }).then((response) => { signedIn = response.ok; const note = document.getElementById('calorie-save-note'); if (!signedIn) note.innerHTML = 'Sign in to save meals between visits. <a href="./account.html">Sign in</a> · <a href="./register.html">Create account</a>'; else return loadDay(); }).catch(() => {});
mealDate.addEventListener('change', () => { guestMeals = []; renderMealRows([]); void loadDay(); });
function validateMeal(name, amount) { if (!name.trim()) { mealInput.setAttribute('aria-invalid','true'); setStatus('Add a meal or ingredient to continue.','error'); mealInput.focus(); return false; } mealInput.removeAttribute('aria-invalid'); if (!Number.isFinite(amount)||amount<=0) { servingInput.setAttribute('aria-invalid','true'); setStatus('Enter a serving amount greater than zero.','error'); servingInput.focus(); return false; } servingInput.removeAttribute('aria-invalid'); return true; }
mealForm.addEventListener('submit', async (event) => {
 event.preventDefault(); const name=mealInput.value.trim(); const amount=Number(servingInput.value); if(!validateMeal(name,amount)) return;
 const apiUnit={counts:'',grams:'g',ounces:'oz',tablespoon:'tbsp',cups:'cup',bowls:'bowl'}[servingType.value]??''; const query=`${amount}${apiUnit?` ${apiUnit}`:''} ${name}`;
 trackButton.disabled=true; trackButton.innerHTML='<span class="calorie-spinner" aria-hidden="true"></span> Estimating nutrition'; setStatus('Checking nutrition information…','loading');
 try {
  const lookup=await fetch(`/.netlify/functions/meal?meal=${encodeURIComponent(query)}`); if(!lookup.ok) throw new Error('Nutrition data is temporarily unavailable. Please try again.'); const data=await lookup.json(); const calories=Number(data.calories); if(!Number.isFinite(calories)||calories<=0) throw new Error(`Couldn’t find nutrition data for “${name}”. Try a more specific food name.`);
  const meal={loggedOn:mealDate.value,mealName:name,amount,servingUnit:servingType.value,calories,protein:getNutrient(data,'PROCNT'),fat:getNutrient(data,'FAT'),carbs:getNutrient(data,'CHOCDF'),fibre:getNutrient(data,'FIBTG')};
  if(signedIn){ const response=await fetch('/.netlify/functions/calorie-history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(meal),cache:'no-store'}); await readApi(response); await loadDay(); }
  else { guestMeals.push(meal); renderMealRows(guestMeals); document.getElementById('tracked-heading').textContent = `Nutrition for ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${mealDate.value}T12:00:00Z`))}`; }
  setStatus(`${name} added for ${mealDate.value}. ${signedIn?'Saved to your account.':'Sign in to keep this history.'}`,'success'); servingInput.value=''; mealInput.value=''; mealInput.focus();
 } catch(error){console.error('Nutrition tracking failed:',error);setStatus(error.message||'Something went wrong. Please try again.','error');}
 finally{trackButton.disabled=false;trackButton.innerHTML='<i class="fa-solid fa-plus" aria-hidden="true"></i> Add to this day';}
});
document.getElementById('clear-meals').addEventListener('click', async()=>{ if(signedIn){ if(!window.confirm(`Delete all saved meals for ${mealDate.value}?`)) return; try{const response=await fetch(`/.netlify/functions/calorie-history?date=${encodeURIComponent(mealDate.value)}`,{method:'DELETE',cache:'no-store'});await readApi(response);}catch(error){setStatus(error.message,'error');return;} } guestMeals = []; renderMealRows([]); setStatus('Meals for this date have been cleared.', 'success'); });
mealInput.addEventListener('input',()=>mealInput.removeAttribute('aria-invalid')); servingInput.addEventListener('input',()=>servingInput.removeAttribute('aria-invalid'));
