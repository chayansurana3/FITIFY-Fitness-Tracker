const mongoose = require('mongoose');
const {
  Account, Session, connectDatabase, createSession, getSessionUser, hashPassword, json, parseBody,
  sameOrigin, serviceError, verifyPassword,
} = require('../lib/accountUtils');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  if (!sameOrigin(event)) return json(403, { error: 'Request origin could not be verified.' });
  const body = parseBody(event);
  if (!body || typeof body.currentPassword !== 'string' || body.currentPassword.length > 128) return json(400, { error: 'Enter your current password.' });
  if (typeof body.newPassword !== 'string' || body.newPassword.length < 12 || body.newPassword.length > 128) return json(400, { error: 'Use a new password between 12 and 128 characters.' });

  try {
    await connectDatabase();
    const sessionUser = await getSessionUser(event);
    if (!sessionUser) return json(401, { error: 'Sign in again to change your password.' });
    const user = await Account.findById(sessionUser._id).select('+passwordHash');
    if (!user || !(await verifyPassword(body.currentPassword, user.passwordHash))) return json(403, { error: 'Your current password did not match.' });
    const passwordHash = await hashPassword(body.newPassword);
    const transaction = await mongoose.startSession();
    try {
      await transaction.withTransaction(async () => {
        await Account.updateOne({ _id: user._id }, { $set: { passwordHash, failedLoginCount: 0, lockedUntil: null } }, { session: transaction });
        await Session.deleteMany({ userId: user._id }, { session: transaction });
      });
    } finally {
      await transaction.endSession();
    }
    const cookie = await createSession(user, event);
    return json(200, { message: 'Your password has been changed. Other signed-in sessions were closed.' }, { 'Set-Cookie': cookie });
  } catch (error) {
    console.error('Password change failed:', error);
    return serviceError(error, 'We could not change your password right now. Please try again.');
  }
};
