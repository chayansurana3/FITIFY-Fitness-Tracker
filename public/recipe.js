const input = document.getElementsByTagName("input")[0];
const button = document.getElementsByClassName("btn-success")[0];
const suggestionDropdown = document.getElementById("suggestionDropdown");
const resultBox = document.getElementsByClassName("result-box")[0];
const recipeTitle = document.getElementById("recipe-title");
const recipeImage = document.getElementById("recipe-image");
const recipeSteps = document.getElementById("recipe-steps");
const recipeIngredients = document.getElementById("ingredients");
const loader =  document.getElementsByClassName('loader')[0];
var id = -1;

function capitalizeEachWord(str) {
  const words = str.split(" ");
  const capitalizedWords = words.map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  return capitalizedWords.join(" ");
}

const updateSuggestions = async (inputValue) => {
  if (inputValue.length === 0) return;

  try {
    const response = await fetch("/.netlify/functions/recipeNames?inputValue=" + inputValue);
    let data = await response.json();
    suggestionDropdown.style.display = "block";
    suggestionDropdown.textContent = "";
    console.log(data);
    data.forEach((recipe) => {
      const suggestionItem = document.createElement("div");
      suggestionItem.classList.add("suggestion-item");
      suggestionItem.textContent = recipe.title;
      suggestionItem.addEventListener("click", () => {
        input.value = recipe.title;
        id = recipe.id;
        suggestionDropdown.style.display = "none";
      });
      suggestionDropdown.appendChild(suggestionItem);
    });
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

const findRecipe = async (meal) => {
  if (meal.length === 0) {
    alert("Recipe field requires a value");
    return;
  }

  try {
    loader.style.display = 'inline-block';
    if (id == -1){
      const response = await fetch("/.netlify/functions/recipeNames?inputValue=" + meal);
      let data = await response.json();
      if (data.length === 0) return; 
      id = data[0]["id"];
    }
    const response = await fetch('/.netlify/functions/recipe?meal=' + meal + '&id=' + id);
    let data = await response.json();
    loader.style.display = 'none';
    if (data.length === 0){
      alert("Recipe Not Found");
      return;
    }
    resultBox.style.display = "block";
    resultBox.scrollIntoView();
    recipeTitle.textContent = data.title.toUpperCase();
    recipeImage.src = data.image;
    let temp = data.analyzedInstructions[0]["steps"];
    let instructions = temp.map((items) => items.step);
    let ingredientsList = data.extendedIngredients.map((ingredient) => capitalizeEachWord(ingredient.name));
    ingredientsList.forEach((item) => {
      recipeIngredients.innerHTML += `<h6>${item}</h6>`;
    });
    instructions.forEach((item) => {
      recipeSteps.innerHTML += `<li>${item}</li>`;
    });
  } catch (error) {
    loader.style.display = 'none';
    console.error("Error fetching recipe data:", error);
  }
};

input.addEventListener("input", (event) => {
  const inputValue = event.target.value;
  console.log(inputValue);
  updateSuggestions(inputValue);
});

button.addEventListener("click", () => {
  let meal = input.value;
  console.log(meal);
  findRecipe(meal);
  id = -1;
});