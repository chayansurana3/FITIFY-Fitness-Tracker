exports.handler = async function (event) {
  const recipeId = event.queryStringParameters?.id;
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return json(503, { error: 'Recipe search is not configured on the server.' });
  if (!recipeId || !/^\d{1,12}$/.test(recipeId)) return json(400, { error: 'Choose a valid recipe to view.' });

  try {
    const query = new URLSearchParams({ apiKey });
    const response = await fetch(`https://api.spoonacular.com/recipes/${recipeId}/information?${query}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error('Spoonacular recipe detail request failed with status:', response.status);
      return json(502, { error: 'Recipe details are temporarily unavailable. Please try again.' });
    }
    const recipe = await response.json();
    return json(200, recipe);
  } catch (error) {
    console.error('Recipe detail request failed:', error.name || 'upstream error');
    return json(502, { error: 'Recipe details are temporarily unavailable. Please try again.' });
  }
};

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}
