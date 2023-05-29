const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;
const username = "chayansurana3";
const password = "Motorblade3";

app.use(express.static(path.join(__dirname, 'public'), { index: 'fetch_basic.html' }));

mongoose.connect(`mongodb+srv://${username}:${password}@cluster0.e6wowbu.mongodb.net/FITIFY_PROFILES?retryWrites=true&w=majority`);
const Profile = require('./profileModel');

app.get('/profile/:uniqueCode', async (req, res) => {
  const unique_code = req.params.uniqueCode;
  console.log(unique_code);
  try {
    const query = Profile.where({ uniqueCode: unique_code });
    const user_profile = await query.findOne();
    if (!user_profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json(user_profile);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, console.log("Server is listening on port: " + PORT));