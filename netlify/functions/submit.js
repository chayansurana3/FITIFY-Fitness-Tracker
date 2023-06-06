const mongoose = require('mongoose');

const connectToMongoDB = async () => {
  try {
    const username = process.env.MONGODB_USERNAME;
    const password = process.env.MONGODB_PASSWORD;
    await mongoose.connect(`mongodb+srv://${username}:${password}@cluster0.e6wowbu.mongodb.net/FITIFY_PROFILES?retryWrites=true&w=majority`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.log('Error connecting to MongoDB:', error);
  }
};

const Profile = require('./profileModel');
exports.handler = async function (event, context, callback) {
  try {
    await connectToMongoDB();
    const formData = JSON.parse(event.body);
    const unique_code = Math.floor(Math.random() * 10000);
    const profile = new Profile({
      uniqueCode: unique_code, 
      firstName: formData.FirstName,
      lastName: formData.LastName,
      email: formData.Email,
      age: formData.Age,
      gender: formData.gender,
      height: formData.Feets * 12 + formData.Inches,
      weight: formData.Weight,
      bmi: formData.BMI,
      waist: formData.Waist,
      chest: formData.Chest,
      hip: formData.Hip,
      thigh: formData.Thigh,
      calf: formData.Calf,
    });

    const savedProfile = await profile.save();
    console.log('Profile saved:', savedProfile);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

    return callback(null, {
      statusCode: 200,
      body: JSON.stringify({ message: 'Profile saved successfully' }, { uniqueCode: unique_code}),
    });
  } catch (error) {
    console.log(error);
    return callback(null, {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' }),
    });
  }
};
