const express = require('express');
const https = require('https');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
const dotenv = require('dotenv');
const dot = dotenv.config();
const app_id = process.env.EDAMAM_API_ID;
const app_key = process.env.EDAMAM_API_KEY;

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
