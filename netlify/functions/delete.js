const mongoose = require('mongoose');

exports.handler = async function (event, context, callback) {
  try {
    const username = process.env.MONGODB_USERNAME;
    const password = process.env.MONGODB_PASSWORD;
    await mongoose.connect(`mongodb+srv://${username}:${password}@cluster0.e6wowbu.mongodb.net/FITIFY_PROFILES?retryWrites=true&w=majority`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
    const Profile = require('./profileModel');

    const unique_code = event.queryStringParameters.uniqueCode;
    console.log(unique_code);

    const deleteResult = await Profile.deleteOne({ uniqueCode: unique_code });
    if (deleteResult.deletedCount === 0) {
      return callback(null, {
        statusCode: 404,
        body: JSON.stringify({ error: 'Profile not found' }),
      });
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

    return callback(null, {
      statusCode: 200,
      body: JSON.stringify({ message: 'Profile deleted successfully' }),
    });
  } catch (error) {
    console.log(error);
    return callback(null, {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' }),
    });
  }
};
