exports.handler = async function (event) {
  const meal = event.queryStringParameters?.meal?.trim();
  const appId = process.env.EDAMAM_API_ID;
  const appKey = process.env.EDAMAM_API_KEY;
  if (!appId || !appKey) return json(503, { error: 'Nutrition lookup is not configured on the server.' });
  if (!meal || meal.length > 300) return json(400, { error: 'Enter a meal and serving amount.' });

  try {
    const query = new URLSearchParams({ app_id: appId, app_key: appKey, 'nutrition-type': 'cooking', ingr: meal });
    const response = await fetch(`https://api.edamam.com/api/nutrition-data?${query}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error('Edamam nutrition request failed with status:', response.status);
      return json(502, { error: 'Nutrition data is temporarily unavailable. Please try again.' });
    }
    return json(200, await response.json());
  } catch (error) {
    console.error('Nutrition request failed:', error.name || 'upstream error');
    return json(502, { error: 'Nutrition data is temporarily unavailable. Please try again.' });
  }
};

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}
