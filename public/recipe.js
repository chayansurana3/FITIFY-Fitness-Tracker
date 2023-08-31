const input = document.getElementsByTagName("input")[0];
const button = document.getElementsByClassName("btn-success")[0];
const suggestionDropdown = document.getElementById("suggestionDropdown");

async function updateSuggestions(inputValue) {
  if (inputValue.length === 0) return;
  suggestionDropdown.innerHTML = "";

  try {
    const response = await fetch('/.netlify/functions/recipeNames?inputValue=' + inputValue);
    let data = await response.json();
    let names = Array.isArray(data) ? data : [];
    suggestionDropdown.style.display = "block";
    names.forEach((recipe) => {
      const suggestionItem = document.createElement("div");
      suggestionItem.classList.add("suggestion-item");
      suggestionItem.textContent = recipe.title;
      suggestionItem.addEventListener("click", () => {
        input.value = recipe.title;
        suggestionDropdown.innerHTML = "";
      });
      suggestionDropdown.appendChild(suggestionItem);
    });
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

input.addEventListener("input", (event) => {
  const inputValue = event.target.value;
  console.log(inputValue);
  updateSuggestions(inputValue);
});

button.addEventListener("click", () => {
  let food = input.value;
  console.log(food);
});