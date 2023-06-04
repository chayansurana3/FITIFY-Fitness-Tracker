const mongoose = require('mongoose');
const username = process.env.MONGODB_USERNAME;
const password = process.env.MONGODB_PASSWORD;

mongoose.connect(`mongodb+srv://${username}:${password}@cluster0.e6wowbu.mongodb.net/FITIFY_PROFILES?retryWrites=true&w=majority`);
const Profile = require('./profileModel');

exports.handler = async function (event, context, callback) {
  return new Promise(async (resolve, reject) => {
    const unique_code = event.queryStringParameters.uniqueCode;
    console.log(unique_code);

    try {
      const user_profile = await Profile.findOne({ uniqueCode: unique_code });
      if (!user_profile) {
        return callback(null, {
          statusCode: 404,
          body: JSON.stringify({ error: 'Profile not found' }),
        });
      }

      return callback(null, {
        statusCode: 200,
        body: JSON.stringify(user_profile),
      });
    } catch (error) {
      console.log(error);
      return callback(null, {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server error' }),
      });
    }
  });
};
