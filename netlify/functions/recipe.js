const https = require('https');

exports.handler = async function (event, context, callback) {
  return new Promise((resolve, reject) => {
    const meal = event.queryStringParameters.meal;
    const apiKey = process.env.SPOONACULAR_API_KEY;
    const apiUrl = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${apiKey}&query=${meal}&number=1`;

    https.get(apiUrl, function (response) {
      let data = '';
      response.on('data', function (chunk) {
        data += chunk;
      });
      response.on('end', function () {
        const recipe_data = JSON.parse(data);
        resolve({
          statusCode: 200,
          body: JSON.stringify(recipe_data),
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