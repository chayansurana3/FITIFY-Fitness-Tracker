const https = require("https");

exports.handler = async function(event, context, callback) {
  return new Promise((resolve, reject) => {
    const inputValue = event.queryStringParameters.inputValue;
    const apiKey = process.env.SPOONACULAR_API_KEY;
    const apiUrl = `https://api.spoonacular.com/recipes/autocomplete?apiKey=${apiKey}&number=5&query=${inputValue}`;

    https.get(apiUrl, (response) => {
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          let names = JSON.parse(data);
          resolve({
            statusCode: 200,
            body: JSON.stringify(names),
          });
        });
      })
      .on("error", (error) => {
        console.log("Error:" + error);
        reject({
          statusCode: 500,
          body: "An error occurred: " + error,
        });
      });
  });
};