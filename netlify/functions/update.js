const mongoose = require('mongoose');
const username = process.env.MONGODB_USERNAME;
const password = process.env.MONGODB_PASSWORD;
mongoose.connect(`mongodb+srv://${username}:${password}@cluster0.e6wowbu.mongodb.net/FITIFY_PROFILES?retryWrites=true&w=majority`, { useNewUrlParser: true, useUnifiedTopology: true });
const Profile = require('./profileModel');

exports.handler = async function (event, context, callback) {
  const formData = JSON.parse(event.body);
  const uniqueId = formData['unique-id'];

  try {
    const existingProfile = await Profile.findOne({ uniqueCode: uniqueId });
    if (!existingProfile) {
      return callback(null, {
        statusCode: 404,
        body: JSON.stringify({ error: 'Profile not found' }),
      });
    }

    const updateObj = {};
    if (formData.Email) updateObj.email = formData.Email;
    if (formData.FirstName) updateObj.firstName = formData.FirstName;
    if (formData.LastName) updateObj.lastName = formData.LastName;
    if (!isNaN(parseInt(formData.Age))) updateObj.age = parseInt(formData.Age);
    if (!isNaN(parseFloat(formData.BMI))) updateObj.bmi = parseFloat(formData.BMI);
    if (!isNaN(parseInt(formData.Feets)) && !isNaN(parseInt(formData.Inches))) updateObj.height = 12 * parseInt(formData.Feets) + parseInt(formData.Inches);
    if (!isNaN(parseFloat(formData.Weight))) updateObj.weight = parseFloat(formData.Weight);
    if (formData.Waist) updateObj.waist = parseFloat(formData.Waist);
    if (formData.Chest) updateObj.chest = parseFloat(formData.Chest);
    if (formData.Hip) updateObj.hip = parseFloat(formData.Hip);
    if (formData.Thigh) updateObj.thigh = parseFloat(formData.Thigh);
    if (!isNaN(parseFloat(formData.Calf))) updateObj.calf = parseFloat(formData.Calf);
    if (formData.gender) updateObj.gender = formData.gender;

    if (Object.keys(updateObj).length > 0) {
      await Profile.updateOne({ _id: existingProfile._id }, { $set: updateObj });
    }
    
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    
    return callback(null, {
      statusCode: 200,
      body: JSON.stringify({ message: 'Your data has been updated successfully!!' }),
    });
  } catch (error) {
    console.log(error);
    return callback(null, {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    });
  }
};
