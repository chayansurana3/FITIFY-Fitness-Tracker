const { Account, WeightEntry, connectDatabase, getSessionUser, json, parseBody, sameOrigin, serviceError } = require('../lib/accountUtils');
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
exports.handler = async function (event) {
  if (!['GET', 'POST'].includes(event.httpMethod)) return json(405, { error: 'Method not allowed.' }, { Allow: 'GET, POST' });
  if (event.httpMethod === 'POST' && !sameOrigin(event)) return json(403, { error: 'Request origin could not be verified.' });
  try {
    await connectDatabase();
    const user = await getSessionUser(event);
    if (!user) return json(401, { error: 'Sign in to save or view your private weight history.' });
    if (event.httpMethod === 'GET') {
      const entries = await WeightEntry.find({ userId: user._id }).sort({ loggedOn: -1 }).limit(90).lean();
      return json(200, { entries: entries.map(({ _id, loggedOn, weightKg, source }) => ({ id: String(_id), loggedOn, weightKg, source })) });
    }
    const body = parseBody(event);
    if (!body || Object.keys(body).some((key) => !['loggedOn', 'weightKg'].includes(key))) return json(400, { error: 'Enter a valid date and weight.' });
    const loggedOn = body.loggedOn || new Date().toISOString().slice(0, 10);
    const weightKg = Number(body.weightKg);
    if (!validDate(loggedOn)) return json(400, { error: 'Choose a valid date that is not in the future.' });
    if (!Number.isFinite(weightKg) || weightKg < 10 || weightKg > 500) return json(400, { error: 'Weight must be between 10 and 500 kg.' });
    const entry = await WeightEntry.findOneAndUpdate({ userId: user._id, loggedOn }, { $set: { weightKg, source: 'manual' } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    const latest = await WeightEntry.findOne({ userId: user._id }).sort({ loggedOn: -1 }).lean();
    if (latest) await Account.updateOne({ _id: user._id }, { $set: { currentWeightKg: latest.weightKg } });
    return json(200, { entry: { id: String(entry._id), loggedOn: entry.loggedOn, weightKg: entry.weightKg, source: entry.source } });
  } catch (error) {
    console.error('Weight history request failed:', error);
    return serviceError(error, 'We could not access your weight history right now. Please try again.');
  }
};
