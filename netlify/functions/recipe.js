const https = require('https');

exports.handler = async function (event, context, callback) {
  return new Promise((resolve, reject) => {
    const meal = event.queryStringParameters.meal;
    const id = event.queryStringParameters.id;
    const apiKey = process.env.SPOONACULAR_API_KEY;
    const apiUrl = `https://api.spoonacular.com/recipes/${id}/information?apiKey=${apiKey}`;

    https.get(apiUrl, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        const recipe_data = JSON.parse(data);
        resolve({
          statusCode: 200,
          body: JSON.stringify(recipe_data),
        });
      });
    }).on('error', (error) => {
      console.error('Error:', error);
      reject({
        statusCode: 500,
        body: 'An error occurred: ' + error,
      });
    });
  });
};