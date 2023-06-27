var total_calories = 0, total_proteins = 0, total_fats = 0, total_carbs = 0, total_fibres = 0;
const track_btn = document.getElementsByTagName("button")[1];
const track_box = document.getElementsByClassName("tracked")[0];
const meal_table = document.getElementById("meal-table");
const nutrition_table = document.getElementById("nutrition-table");
const caloriesElement = document.getElementById("calories");
const proteinsElement = document.getElementById("protein");
const fatsElement = document.getElementById("fat");
const carbsElement = document.getElementById("carbs");
const fibreElement = document.getElementById("fibre");

function correctInput(mealName, serving) {
  console.log("Started input authentication: " + mealName + "," + serving);
  if (!serving && !mealName) {
    alert("**Fill the empty fields");
    return false;
  }
  if (!serving) {
    alert("**Serving Size Field is empty");
    return false;
  }
  if (!mealName) {
    alert("**Meal Name Field is empty");
    return false;
  }
  if (serving < 0 || isNaN(parseFloat(serving))) {
    alert("Incorrect Serving Size");
    return false;
  }
  return true;
}

function create_row_meal_table(meal_name, serving, serving_type, current_calories) {
  let newRow = document.createElement("tr");
  let mealCell = document.createElement("td");
  let servingSizeCell = document.createElement("td");
  let caloriesCell = document.createElement("td");
  mealCell.textContent = meal_name;
  servingSizeCell.textContent = serving + " " + serving_type;
  caloriesCell.textContent = current_calories;
  newRow.appendChild(mealCell);
  newRow.appendChild(servingSizeCell);
  newRow.appendChild(caloriesCell);
  meal_table.appendChild(newRow);
}

function update_nutrition(calories, protein, fat, carbs, fibre) {
  caloriesElement.innerHTML = calories;
  proteinsElement.innerHTML = protein + "g";
  carbsElement.innerHTML = carbs + "g";
  fibreElement.innerHTML = fibre + "g";
  fatsElement.innerHTML = fat + "g";
}

track_btn.addEventListener("click", function() {
  let mealName = document.getElementById("meal_name").value;
  let serving = document.getElementById("serving_size").value;
  const select_option = document.getElementsByTagName("select")[0];
  let serving_type = select_option.options[select_option.selectedIndex].text;
  if (serving_type == "Pieces/Counts") serving_type = ""; //As per the EDAMAM Documentation
  let meal = encodeURIComponent(serving + " " + serving_type + " " + mealName);
  console.log(meal);

  if (correctInput(mealName, serving)) {
    fetch("/.netlify/functions/nutrition?meal=" + meal)
      .then((response) => response.json())
      .then((data) => {
        let current_calories = data.calories;
        if (parseFloat(current_calories) == 0) {
          console.log("Food not found!!");
          alert('"' + mealName + '"' + " not found!!");
          return;
        }
        let current_fat = data.totalNutrients.FAT.quantity.toFixed(2);
        let current_protein = data.totalNutrients.PROCNT.quantity.toFixed(2);
        let current_carbs = data.totalNutrients.CHOCDF.quantity.toFixed(2);
        let current_fibre = data.totalNutrients.FIBTG.quantity.toFixed(2);

        track_box.style.display = "block";
        create_row_meal_table(mealName, serving, serving_type, current_calories);
        total_calories += current_calories;
        total_proteins += parseFloat(current_protein);
        total_carbs += parseFloat(current_carbs);
        total_fats += parseFloat(current_fat);
        total_fibres += parseFloat(current_fibre);
        update_nutrition(total_calories, total_proteins, total_fats, total_carbs, total_fibres);
        track_box.scrollIntoView();
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }
});
