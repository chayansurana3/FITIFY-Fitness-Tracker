const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  uniqueCode: {
    type: Number,
    unique: true,
    required: true
  },
  firstName: {
    type: String,
    required: [true, 'first name is required']
  },
  lastName: {
    type: String,
    required: [true, 'last name is required']
  },
  email: {
    type: String,
    required: [true, 'email is required'],
    unique: true
  },
  age: Number,
  gender: String,
  height: Number,
  weight: Number,
  bmi: Number,
  waist: Number,
  chest: Number,
  hip: Number,
  thigh: Number,
  calf: Number  
});

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
