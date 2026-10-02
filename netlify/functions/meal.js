const https = require('https');

exports.handler = async function (event, context, callback) {
  return new Promise((resolve, reject) => {
    const meal = event.queryStringParameters.meal;
    const app_id = process.env.EDAMAM_API_ID;
    const app_key = process.env.EDAMAM_API_KEY;
    const query = new URLSearchParams({ app_id, app_key, 'nutrition-type': 'cooking', ingr: meal || '' });
    const url = `https://api.edamam.com/api/nutrition-data?${query.toString()}`;

    https.get(url, function (response) {
      let data = '';
      response.on('data', function (chunk) {
        data += chunk;
      });
      response.on('end', function () {
        try {
          const meal_data = JSON.parse(data);
          resolve({ statusCode: response.statusCode >= 200 && response.statusCode < 300 ? 200 : 502, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meal_data) });
        } catch {
          resolve({ statusCode: 502, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Nutrition provider returned an unreadable response.' }) });
        }
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