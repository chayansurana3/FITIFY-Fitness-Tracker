const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const PORT = process.env.PORT || 3000;
const username = "chayansurana3";
const password = "Motorblade3";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), { index: 'update_basic.html' }));

mongoose.connect(`mongodb+srv://${username}:${password}@cluster0.e6wowbu.mongodb.net/FITIFY_PROFILES?retryWrites=true&w=majority`);
const Profile = require('./profileModel');

app.post('/submit', async (req, res) => {
  const uniqueId = req.body['unique-id'];
  try {
    const existingProfile = await Profile.findOne({ uniqueCode: uniqueId });
    if (!existingProfile) {
      return res.status(404).send('Profile not found');
    }

    const updateObj = {};
    
    if (req.body.Email) {updateObj.email = req.body.Email;}
    if (req.body.FirstName) {updateObj.firstName = req.body.FirstName;}
    if (req.body.LastName) {updateObj.lastName = req.body.LastName;}
    if (!isNaN(parseInt(req.body.Age))) {updateObj.age = parseInt(req.body.Age);}
    if (!isNaN(parseFloat(req.body.BMI))) {updateObj.bmi = parseFloat(req.body.BMI);}
    if (!isNaN(parseInt(req.body.Feets)) && !isNaN(parseInt(req.body.Inches))) {updateObj.height = 12 * parseInt(req.body.Feets) + parseInt(req.body.Inches);}
    if (!isNaN(parseFloat(req.body.Weight))) {updateObj.weight = parseFloat(req.body.Weight);}
    if (req.body.Waist) {updateObj.waist = parseFloat(req.body.Waist);}
    if (req.body.Chest) {updateObj.chest = parseFloat(req.body.Chest);}
    if (req.body.Hip) {updateObj.hip = parseFloat(req.body.Hip);}
    if (req.body.Thigh) {updateObj.thigh = parseFloat(req.body.Thigh);}
    if (!isNaN(parseFloat(req.body.Calf))) {updateObj.calf = parseFloat(req.body.Calf);}
    if (req.body.gender) {updateObj.gender = req.body.gender;}
    
    if (Object.keys(updateObj).length > 0) {
      await Profile.updateOne({ _id: existingProfile._id }, { $set: updateObj });
    }
    const updatedProfile = await Profile.findById(existingProfile._id);
    res.send('Your data has been updated successfully!!');
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, console.log("Server is listening on port: " + PORT));