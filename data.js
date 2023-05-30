const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dot = dotenv.config();
const PORT = process.env.PORT || 3000;
const username = process.env.MONGODB_USERNAME;
const password = process.env.MONGODB_PASSWORD;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), { index: 'basic.html' }));

mongoose.connect(`mongodb+srv://${username}:${password}@cluster0.e6wowbu.mongodb.net/FITIFY_PROFILES?retryWrites=true&w=majority`);
const Profile = require('./profileModel');

app.post('/submit', (req, res) => {
  var uniqueId = Math.floor(Math.random() * 10000) + 1;
  req.body.gender = req.body.gender === "select" ? "Not Specified" : req.body.gender;
  const newProfileData = {
    uniqueCode: uniqueId,
    email: req.body.Email,
    firstName: req.body.FirstName,
    lastName: req.body.LastName,
    age: parseInt(req.body.Age) || 0,
    weight: parseFloat(req.body.Weight) || 0,
    bmi: parseFloat(req.body.BMI) || 0,
    height: 12 * parseInt(req.body.Feets) + parseInt(req.body.Inches) || 0,
    waist: parseFloat(req.body.Waist) || 0,
    chest: parseFloat(req.body.Chest) || 0,
    hip: parseFloat(req.body.Hip) || 0,
    thigh: parseFloat(req.body.Thigh) || 0,
    calf: parseFloat(req.body.Calf) || 0,
    gender: req.body.gender
  };

  Profile.create(newProfileData)
    .then(createdProfile => {
      console.log('Profile created:', createdProfile);
      res.send(`✅✅✅ SUCCESS!! PLEASE STORE YOUR UNIQUE FITIFY ID FOR FUTURE USE: <span style="color: gold; font-weight: bold; font-size: 25px;">${uniqueId}</span>. NOTE: NEVER SHARE THIS CODE WITH ANYONE!!`);
    })
    .catch(error => {
      console.error('Error creating profile:', error);
      res.send(`⚠️⚠️⚠️ ALERT!! ERROR IN STORING YOUR DATA:    ` + error);
  });
});

app.listen(PORT, console.log("Server is listening on port: " + PORT));
