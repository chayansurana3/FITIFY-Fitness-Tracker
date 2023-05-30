const https = require('https');

exports.handler = function (event, context, callback) {
  if (event.httpMethod !== 'GET') {
    callback(null, { statusCode: 405, body: 'Method Not Allowed' });
    return;
  }

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
      callback(null, {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meal_data),
      });
    });
  }).on('error', function (error) {
    console.error('Error:', error);
    callback(null, { statusCode: 500, body: 'An error occurred: ' + error });
  });
};
