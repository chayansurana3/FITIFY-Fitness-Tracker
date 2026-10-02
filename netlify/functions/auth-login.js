const {
  Account, connectDatabase, createSession, json, parseBody, publicAccount, sameOrigin, serviceError, verifyPassword,
} = require('../lib/accountUtils');

const DUMMY_PASSWORD_HASH = `scrypt$16384$8$1$${'0'.repeat(32)}$${'0'.repeat(128)}`;

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  if (!sameOrigin(event)) return json(403, { error: 'Request origin could not be verified.' });
  const body = parseBody(event);
  if (!body) return json(400, { error: 'Please send valid form data.' });
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password || email.length > 254 || password.length > 128) {
    return json(400, { error: 'Enter your email and password.' });
  }

  try {
    await connectDatabase();
    const user = await Account.findOne({ email }).select('+passwordHash +failedLoginCount +lockedUntil');
    if (!user) {
      await verifyPassword(password, DUMMY_PASSWORD_HASH);
      return json(401, { error: 'Email or password is incorrect.' });
    }

    const matches = await verifyPassword(password, user.passwordHash);
    if (user.lockedUntil && user.lockedUntil > new Date()) return json(401, { error: 'Email or password is incorrect.' });
    if (matches && user.emailVerified === false) return json(403, { code: 'EMAIL_NOT_VERIFIED', error: 'Verify your email before signing in.' });
    if (!matches) {
      const updated = await Account.findByIdAndUpdate(user._id, { $inc: { failedLoginCount: 1 } }, { new: true }).select('+failedLoginCount');
      if (updated?.failedLoginCount >= 5) {
        await Account.updateOne({ _id: user._id }, { $set: { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) } });
      }
      return json(401, { error: 'Email or password is incorrect.' });
    }

    await Account.updateOne({ _id: user._id }, { $set: { failedLoginCount: 0, lockedUntil: null } });
    const cookie = await createSession(user, event);
    return json(200, { account: publicAccount(user) }, { 'Set-Cookie': cookie });
  } catch (error) {
    console.error('Account sign-in failed:', error);
    return serviceError(error, 'We could not sign you in right now. Please try again.');
  }
};

