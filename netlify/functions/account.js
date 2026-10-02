const mongoose = require('mongoose');
const {
  Account, AccountToken, BmiEntry, MealEntry, Session, WeightEntry, connectDatabase,
  getSessionUser, json, makeCookie, parseBody, publicAccount, sameOrigin, serviceError, verifyPassword,
} = require('../lib/accountUtils');

function validateOptionalNumber(body, field, label, min, max, updates) {
  if (!Object.prototype.hasOwnProperty.call(body, field)) return null;
  if (body[field] === null || body[field] === '') {
    updates[field] = null;
    return null;
  }
  const value = Number(body[field]);
  if (!Number.isFinite(value) || value < min || value > max) return `${label} must be between ${min} and ${max}.`;
  updates[field] = value;
  return null;
}

exports.handler = async function (event) {
  if (!['GET', 'PUT', 'DELETE'].includes(event.httpMethod)) return json(405, { error: 'Method not allowed.' }, { Allow: 'GET, PUT, DELETE' });
  if (event.httpMethod !== 'GET' && !sameOrigin(event)) return json(403, { error: 'Request origin could not be verified.' });

  try {
    await connectDatabase();
    const user = await getSessionUser(event);
    if (!user) return json(401, { error: 'Sign in to view your dashboard.' });
    if (event.httpMethod === 'GET') return json(200, { account: publicAccount(user) });

    const body = parseBody(event);
    if (!body) return json(400, { error: 'Please send valid form data.' });
    if (event.httpMethod === 'DELETE') {
      if (typeof body.password !== 'string' || body.password.length > 128) return json(400, { error: 'Enter your current password to delete your account.' });
      const account = await Account.findById(user._id).select('+passwordHash');
      if (!account || !(await verifyPassword(body.password, account.passwordHash))) {
        return json(403, { error: 'Your password did not match. Your account has not been deleted.' });
      }
      const transaction = await mongoose.startSession();
      try {
        await transaction.withTransaction(async () => {
          const filter = { userId: user._id };
          await Session.deleteMany(filter, { session: transaction });
          await AccountToken.deleteMany(filter, { session: transaction });
          await BmiEntry.deleteMany(filter, { session: transaction });
          await WeightEntry.deleteMany(filter, { session: transaction });
          await MealEntry.deleteMany(filter, { session: transaction });
          await Account.deleteOne({ _id: user._id }, { session: transaction });
        });
      } finally {
        await transaction.endSession();
      }
      const expiredCookie = makeCookie('', event, 0);
      return json(200, { message: 'Your account and saved FITIFY data have been deleted.' }, { 'Set-Cookie': expiredCookie });
    }

    const allowed = new Set(['displayName', 'preferredUnits', 'heightCm', 'currentWeightKg', 'fitnessGoal', 'dailyCalorieTarget']);
    if (Object.keys(body).some((key) => !allowed.has(key))) return json(400, { error: 'One or more fields cannot be updated.' });

    const updates = {};
    if (Object.prototype.hasOwnProperty.call(body, 'displayName')) {
      if (typeof body.displayName !== 'string') return json(400, { error: 'Enter a valid name.' });
      const displayName = String(body.displayName).trim();
      if (displayName.length < 2 || displayName.length > 80) return json(400, { error: 'Name must be between 2 and 80 characters.' });
      updates.displayName = displayName;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'preferredUnits')) {
      if (!['metric', 'imperial'].includes(body.preferredUnits)) return json(400, { error: 'Choose metric or imperial units.' });
      updates.preferredUnits = body.preferredUnits;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'fitnessGoal')) {
      if (!['general', 'consistency', 'strength', 'endurance'].includes(body.fitnessGoal)) return json(400, { error: 'Choose one of the available fitness focus options.' });
      updates.fitnessGoal = body.fitnessGoal;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'dailyCalorieTarget')) {
      if (body.dailyCalorieTarget === null || body.dailyCalorieTarget === '') updates.dailyCalorieTarget = null;
      else {
        const target = Number(body.dailyCalorieTarget);
        if (!Number.isFinite(target) || target < 500 || target > 10000) return json(400, { error: 'Daily calorie goal must be between 500 and 10,000 kcal.' });
        updates.dailyCalorieTarget = Math.round(target);
      }
    }

    const heightError = validateOptionalNumber(body, 'heightCm', 'Height', 50, 260, updates);
    const weightError = validateOptionalNumber(body, 'currentWeightKg', 'Weight', 10, 500, updates);
    if (heightError) return json(400, { error: heightError });
    if (weightError) return json(400, { error: weightError });
    if (!Object.keys(updates).length) return json(400, { error: 'There are no profile changes to save.' });

    const updatedUser = await Account.findByIdAndUpdate(user._id, { $set: updates }, { new: true, runValidators: true });
    return json(200, { account: publicAccount(updatedUser) });
  } catch (error) {
    console.error('Account profile request failed:', error);
    return serviceError(error, 'We could not load or save your profile right now.');
  }
};

