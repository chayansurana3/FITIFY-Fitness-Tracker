const mongoose = require('mongoose');
const username = process.env.MONGODB_USERNAME;
const password = process.env.MONGODB_PASSWORD;

mongoose.connect(`mongodb+srv://${username}:${password}@cluster0.e6wowbu.mongodb.net/FITIFY_PROFILES?retryWrites=true&w=majority`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Profile = require('./profileModel');

exports.handler = async function (event, context) {
  const timeout = 20000; // Timeout value in milliseconds (e.g., 10 seconds)
  
  return new Promise(async (resolve, reject) => {
    const timeoutHandler = setTimeout(() => {
      reject(new Error('Function execution timed out'));
    }, timeout);
    
    try {
      const unique_code = event.queryStringParameters.uniqueCode;
      console.log(unique_code);

      const user_profile = await Profile.findOne({ uniqueCode: unique_code });
      if (!user_profile) {
        clearTimeout(timeoutHandler); 
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Profile not found' }),
        };
      }

      clearTimeout(timeoutHandler); 
      return {
        statusCode: 200,
        body: JSON.stringify(user_profile),
      };
    } catch (error) {
      clearTimeout(timeoutHandler);
      console.log(error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server error' }),
      };
    }
  });
};
