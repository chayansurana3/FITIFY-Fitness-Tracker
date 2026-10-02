const {
  Account, BmiEntry, WeightEntry, connectDatabase, getSessionUser, json, parseBody, sameOrigin, serviceError,
} = require('../lib/accountUtils');

function getCategory(bmi) {
  if (bmi < 18.5) return 'Below the usual range';
  if (bmi < 25) return 'Within the usual range';
  if (bmi < 30) return 'Above the usual range';
  return 'Higher range';
}

function isValidLogDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  const latest = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value <= latest;
}

exports.handler = async function (event) {
  if (!['GET', 'POST'].includes(event.httpMethod)) return json(405, { error: 'Method not allowed.' }, { Allow: 'GET, POST' });
  if (event.httpMethod === 'POST' && !sameOrigin(event)) return json(403, { error: 'Request origin could not be verified.' });

  try {
    await connectDatabase();
    const user = await getSessionUser(event);
    if (!user) return json(401, { error: 'Sign in to save or view your private BMI history.' });

    if (event.httpMethod === 'GET') {
      const entries = await BmiEntry.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20).lean();
      return json(200, { entries: entries.map(({ _id, bmi, heightCm, weightKg, category, createdAt }) => ({
        id: String(_id), bmi, heightCm, weightKg, category, createdAt,
      })) });
    }

    const body = parseBody(event);
    if (!body || Object.keys(body).some((key) => !['heightCm', 'weightKg', 'loggedOn'].includes(key))) {
      return json(400, { error: 'Please submit valid height and weight values.' });
    }
    const heightCm = Number(body.heightCm);
    const weightKg = Number(body.weightKg);
    if (!Number.isFinite(heightCm) || heightCm < 50 || heightCm > 260) return json(400, { error: 'Height must be between 50 and 260 cm.' });
    if (!Number.isFinite(weightKg) || weightKg < 10 || weightKg > 500) return json(400, { error: 'Weight must be between 10 and 500 kg.' });
    const loggedOn = body.loggedOn || new Date().toISOString().slice(0, 10);
    if (!isValidLogDate(loggedOn)) return json(400, { error: 'Choose a valid date for this result.' });
    const bmi = Number((weightKg / ((heightCm / 100) ** 2)).toFixed(1));
    const entry = await BmiEntry.create({ userId: user._id, heightCm, weightKg, bmi, category: getCategory(bmi) });
    await WeightEntry.findOneAndUpdate(
      { userId: user._id, loggedOn },
      { $set: { weightKg, source: 'bmi' } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    const latestWeight = await WeightEntry.findOne({ userId: user._id }).sort({ loggedOn: -1 }).lean();
    await Account.updateOne({ _id: user._id }, { $set: { heightCm, currentWeightKg: latestWeight?.weightKg ?? weightKg } });
    return json(201, { entry: {
      id: String(entry._id), bmi: entry.bmi, heightCm: entry.heightCm, weightKg: entry.weightKg,
      category: entry.category, createdAt: entry.createdAt,
    } });
  } catch (error) {
    console.error('BMI history request failed:', error);
    return serviceError(error, 'We could not access your BMI history right now. Please try again.');
  }
};
