const express = require('express');
const https = require('https');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const app_id = "919d8178";
const app_key = "5cf5bed128e7e603778b156f81436f54";

app.use(express.static(path.join(__dirname, 'public'), { index: 'calories.html' }));
app.get('/nutrition', function(req, res) {
  const meal = req.query.meal;
  const url = "https://api.edamam.com/api/nutrition-data?app_id=" + app_id + "&app_key=" + app_key + "&nutrition-type=cooking&ingr=" + meal;
  https.get(url, function(response) {
    let data = '';
    response.on("data", function(chunk) {
      data += chunk;
    });
    response.on("end", function() {
      const meal_data = JSON.parse(data);
      res.json(meal_data);
      console.log(meal_data);
    });
  }).on("error", function(error) {
    console.error("Error:", error);
    res.status(500).send("An error occurred: " + error);
  });
});

app.listen(port, function() {
  console.log("Server is running on port " + port);
});
