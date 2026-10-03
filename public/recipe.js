const searchForm = document.querySelector('.recipe-search');
const input = document.getElementById('recipe-query');
const button = document.getElementById('search-button');
const suggestionDropdown = document.getElementById('suggestionDropdown');
const resultBox = document.getElementById('result-box');
const recipeTitle = document.getElementById('recipe-title');
const recipeImage = document.getElementById('recipe-image');
const recipeSummary = document.getElementById('recipe-summary');
const recipeMeta = document.getElementById('recipe-meta');
const recipeSteps = document.getElementById('recipe-steps');
const ingredientsList = document.getElementById('ingredients-list');
const statusMessage = document.getElementById('recipe-status');
const searchAgain = document.getElementById('search-again');

let selectedRecipeId = null;
let suggestionTimer;
let suggestionRequest = 0;

function setStatus(message, state = '') {
  statusMessage.textContent = message;
  statusMessage.className = `recipe-status${state ? ` is-${state}` : ''}`;
}

function closeSuggestions() {
  suggestionDropdown.hidden = true;
  suggestionDropdown.replaceChildren();
}

async function updateSuggestions(query) {
  const requestNumber = ++suggestionRequest;
  if (query.trim().length < 2) {
    closeSuggestions();
    return;
  }

  try {
    const response = await fetch(`/.netlify/functions/recipeNames?inputValue=${encodeURIComponent(query.trim())}`);
    if (!response.ok) throw new Error('Suggestions are unavailable');
    const recipes = await response.json();
    if (requestNumber !== suggestionRequest || !Array.isArray(recipes)) return;
    suggestionDropdown.replaceChildren();

    recipes.slice(0, 5).forEach((recipe) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'suggestion-item';
      option.setAttribute('role', 'option');
      option.textContent = recipe.title;
      option.addEventListener('click', () => {
        input.value = recipe.title;
        selectedRecipeId = recipe.id;
        closeSuggestions();
        setStatus('Recipe selected. Click “Find a recipe” when you’re ready.');
        button.focus();
      });
      suggestionDropdown.appendChild(option);
    });

    if (recipes.length) suggestionDropdown.hidden = false;
    else closeSuggestions();
  } catch (error) {
    if (requestNumber === suggestionRequest) closeSuggestions();
    console.error('Could not load recipe suggestions:', error);
  }
}

function plainText(value) {
  if (!value) return '';
  const parsed = new DOMParser().parseFromString(String(value), 'text/html');
  return (parsed.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function renderRecipe(data) {
  recipeTitle.textContent = data.title || 'Recipe';
  recipeImage.alt = data.title ? `${data.title} recipe` : 'Recipe';
  recipeImage.src = data.image || '';
  recipeImage.hidden = !data.image;
  recipeSummary.textContent = plainText(data.summary) || 'A delicious recipe to try at home.';
  recipeMeta.replaceChildren();

  const metaItems = [
    data.readyInMinutes ? { icon: 'fa-clock', label: `${data.readyInMinutes} min` } : null,
    data.servings ? { icon: 'fa-utensils', label: `${data.servings} servings` } : null,
    data.vegetarian ? { icon: 'fa-leaf', label: 'Vegetarian' } : null,
  ].filter(Boolean);
  metaItems.forEach(({ icon, label }) => {
    const chip = document.createElement('span');
    chip.className = 'recipe-meta-chip';
    const iconElement = document.createElement('i');
    iconElement.className = `fa-solid ${icon}`;
    iconElement.setAttribute('aria-hidden', 'true');
    chip.append(iconElement, document.createTextNode(label));
    recipeMeta.appendChild(chip);
  });

  ingredientsList.replaceChildren();
  const ingredients = Array.isArray(data.extendedIngredients) ? data.extendedIngredients : [];
  ingredients.forEach((ingredient) => {
    const item = document.createElement('li');
    item.textContent = ingredient.original || ingredient.originalName || ingredient.name || 'Ingredient';
    ingredientsList.appendChild(item);
  });
  if (!ingredients.length) {
    const empty = document.createElement('li');
    empty.className = 'recipe-empty';
    empty.textContent = 'Ingredient details are not available for this recipe.';
    ingredientsList.appendChild(empty);
  }

  recipeSteps.replaceChildren();
  const instructionGroups = Array.isArray(data.analyzedInstructions) ? data.analyzedInstructions : [];
  const steps = instructionGroups.flatMap((group) => Array.isArray(group.steps) ? group.steps : []).map((step) => step.step).filter(Boolean);
  steps.forEach((step) => {
    const item = document.createElement('li');
    item.textContent = step;
    recipeSteps.appendChild(item);
  });
  if (!steps.length) {
    const empty = document.createElement('li');
    empty.className = 'recipe-empty';
    empty.textContent = plainText(data.instructions) || 'Step-by-step instructions are not available for this recipe.';
    recipeSteps.appendChild(empty);
  }

  resultBox.hidden = false;
}

async function findRecipe(query) {
  const meal = query.trim();
  if (!meal) {
    setStatus('Enter a dish or ingredient to search for recipes.', 'error');
    input.focus();
    return;
  }

  closeSuggestions();
  resultBox.hidden = true;
  button.disabled = true;
  button.innerHTML = '<span class="recipe-spinner" aria-hidden="true"></span> Searching';
  setStatus(`Looking for recipes matching “${meal}”…`, 'loading');

  try {
    let recipeId = selectedRecipeId;
    if (!recipeId) {
      const namesResponse = await fetch(`/.netlify/functions/recipeNames?inputValue=${encodeURIComponent(meal)}`);
      if (!namesResponse.ok) throw new Error('Recipe search is temporarily unavailable. Please try again.');
      const recipes = await namesResponse.json();
      if (!Array.isArray(recipes) || !recipes.length) {
        setStatus(`No recipes found for “${meal}”. Try a different search.`, 'error');
        return;
      }
      recipeId = recipes[0].id;
    }

    const recipeResponse = await fetch(`/.netlify/functions/recipe?id=${encodeURIComponent(recipeId)}&meal=${encodeURIComponent(meal)}`);
    if (!recipeResponse.ok) throw new Error('Recipe details could not be loaded. Please try again.');
    const recipe = await recipeResponse.json();
    if (!recipe || !recipe.title) throw new Error('Recipe details could not be loaded. Please try another search.');

    renderRecipe(recipe);
    setStatus('Recipe found. Happy cooking!');
    resultBox.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  } catch (error) {
    console.error('Error fetching recipe data:', error);
    setStatus(error.message || 'Something went wrong while searching. Please try again.', 'error');
  } finally {
    button.disabled = false;
    button.innerHTML = 'Find a recipe <span aria-hidden="true">&#8594;</span>';
    selectedRecipeId = null;
  }
}

input.addEventListener('input', () => {
  selectedRecipeId = null;
  resultBox.hidden = true;
  window.clearTimeout(suggestionTimer);
  const query = input.value;
  if (query.trim().length >= 2) setStatus('Choose a suggestion or search for this phrase.');
  suggestionTimer = window.setTimeout(() => updateSuggestions(query), 260);
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeSuggestions();
  if (event.key === 'ArrowDown' && !suggestionDropdown.hidden) {
    event.preventDefault();
    suggestionDropdown.querySelector('.suggestion-item')?.focus();
  }
});

document.addEventListener('click', (event) => {
  if (!searchForm.contains(event.target)) closeSuggestions();
});

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  findRecipe(input.value);
});

searchAgain.addEventListener('click', () => {
  input.focus();
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});

recipeImage.addEventListener('error', () => { recipeImage.hidden = true; });
