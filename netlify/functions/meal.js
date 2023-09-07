const https = require('https');

exports.handler = async function (event, context, callback) {
  return new Promise((resolve, reject) => {
    const meal = event.queryStringParameters.meal;
    const app_id = process.env.EDAMAM_API_ID;
    const app_key = process.env.EDAMAM_API_KEY;
    const url = `https://api.edamam.com/api/nutrition-data?app_id=${app_id}&app_key=${app_key}&nutrition-type=cooking&ingr=${meal}`;

    https.get(url, function (response) {
      let data = '';
      response.on('data', function (chunk) {
        data += chunk;
      });
      response.on('end', function () {
        const meal_data = JSON.parse(data);
        resolve({
          statusCode: 200,
          body: JSON.stringify(meal_data),
        });
      });
    }).on('error', function (error) {
      console.error('Error:', error);
      reject({
        statusCode: 500,
        body: 'An error occurred: ' + error,
      });
    });
  });
};