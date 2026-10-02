const {
  Account, AccountToken, connectDatabase, consumeAccountToken, hashPassword, json, parseBody, sameOrigin, serviceError,
} = require('../lib/accountUtils');
const mongoose = require('mongoose');
const { Session } = require('../lib/accountModels');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  if (!sameOrigin(event)) return json(403, { error: 'Request origin could not be verified.' });
  const body = parseBody(event);
  if (!body || typeof body.token !== 'string') return json(400, { error: 'That password reset link is invalid or expired. Request a new one and try again.' });
  if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128) return json(400, { error: 'Use a password between 12 and 128 characters.' });

  try {
    await connectDatabase();
    const token = await consumeAccountToken(body.token, 'reset_password');
    if (!token) return json(400, { error: 'That password reset link is invalid or expired. Request a new one and try again.' });
    const passwordHash = await hashPassword(body.password);
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Account.updateOne({ _id: token.userId }, { $set: { passwordHash, failedLoginCount: 0, lockedUntil: null } }, { session });
        await Session.deleteMany({ userId: token.userId }, { session });
        await AccountToken.deleteMany({ userId: token.userId }, { session });
      });
    } finally {
      await session.endSession();
    }
    return json(200, { message: 'Your password has been changed. Sign in with the new password.' });
  } catch (error) {
    console.error('Password reset failed:', error);
    return serviceError(error, 'We could not change your password right now. Request a new reset link and try again.');
  }
};
