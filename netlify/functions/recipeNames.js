exports.handler = async function (event) {
  const inputValue = event.queryStringParameters?.inputValue?.trim();
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return json(503, { error: 'Recipe search is not configured on the server.' });
  if (!inputValue || inputValue.length < 2 || inputValue.length > 100) return json(200, []);

  try {
    const query = new URLSearchParams({ apiKey, number: '5', query: inputValue });
    const response = await fetch(`https://api.spoonacular.com/recipes/autocomplete?${query}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error('Spoonacular autocomplete request failed with status:', response.status);
      return json(502, { error: 'Recipe suggestions are temporarily unavailable. Please try again.' });
    }
    const recipes = await response.json();
    return json(200, Array.isArray(recipes) ? recipes : []);
  } catch (error) {
    console.error('Recipe autocomplete request failed:', error.name || 'upstream error');
    return json(502, { error: 'Recipe suggestions are temporarily unavailable. Please try again.' });
  }
};

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}
