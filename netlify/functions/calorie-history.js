const { MealEntry, connectDatabase, getSessionUser, json, parseBody, sameOrigin, serviceError } = require('../lib/accountUtils');

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function daySummary(entries) {
  return entries.reduce((total, entry) => {
    for (const field of ['calories', 'protein', 'carbs', 'fat', 'fibre']) total[field] += Number(entry[field] || 0);
    return total;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 });
}
exports.handler = async (event) => {
  if (!['GET', 'POST', 'DELETE'].includes(event.httpMethod)) return json(405, { error: 'Method not allowed.' }, { Allow: 'GET, POST, DELETE' });
  if (event.httpMethod !== 'GET' && !sameOrigin(event)) return json(403, { error: 'Request origin could not be verified.' });
  try {
    await connectDatabase();
    const user = await getSessionUser(event);
    if (!user) return json(401, { error: 'Sign in to save or view your private meal history.' });
    const date = event.queryStringParameters?.date || new Date().toISOString().slice(0, 10);
    if (!isDate(date)) return json(400, { error: 'Choose a valid date that is not in the future.' });
    if (event.httpMethod === 'GET') {
      const entries = await MealEntry.find({ userId: user._id, loggedOn: date }).sort({ createdAt: 1 }).lean();
      return json(200, { date, entries: entries.map(({ _id, mealName, amount, servingUnit, calories, protein, carbs, fat, fibre, createdAt }) => ({ id: String(_id), mealName, amount, servingUnit, calories, protein, carbs, fat, fibre, createdAt })), totals: daySummary(entries) });
    }
    if (event.httpMethod === 'DELETE') {
      await MealEntry.deleteMany({ userId: user._id, loggedOn: date });
      return json(200, { message: 'Saved meals for this date were cleared.' });
    }
    const body = parseBody(event);
    const allowed = new Set(['loggedOn', 'mealName', 'amount', 'servingUnit', 'calories', 'protein', 'carbs', 'fat', 'fibre']);
    if (!body || Object.keys(body).some((key) => !allowed.has(key))) return json(400, { error: 'Enter valid meal details.' });
    const loggedOn = body.loggedOn || date;
    const amount = Number(body.amount);
    if (!isDate(loggedOn) || typeof body.mealName !== 'string' || !body.mealName.trim() || body.mealName.trim().length > 120) return json(400, { error: 'Enter a meal name and valid date.' });
    if (!Number.isFinite(amount) || amount < 0.1 || amount > 100000) return json(400, { error: 'Enter a valid serving amount.' });
    if (!['counts', 'grams', 'ounces', 'tablespoon', 'cups', 'bowls'].includes(body.servingUnit)) return json(400, { error: 'Choose a valid serving unit.' });
    const nutrients = {};
    for (const field of ['calories', 'protein', 'carbs', 'fat', 'fibre']) {
      nutrients[field] = Number(body[field] || 0);
      if (!Number.isFinite(nutrients[field]) || nutrients[field] < 0 || nutrients[field] > (field === 'calories' ? 100000 : 10000)) return json(400, { error: 'Nutrition values are outside the accepted range.' });
    }
    const entry = await MealEntry.create({ userId: user._id, loggedOn, mealName: body.mealName.trim(), amount, servingUnit: body.servingUnit, ...nutrients });
    return json(201, { entry: { id: String(entry._id), mealName: entry.mealName, amount: entry.amount, servingUnit: entry.servingUnit, ...nutrients, createdAt: entry.createdAt } });
  } catch (error) {
    console.error('Meal history request failed:', error);
    return serviceError(error, 'We could not access your meal history right now. Please try again.');
  }
};
