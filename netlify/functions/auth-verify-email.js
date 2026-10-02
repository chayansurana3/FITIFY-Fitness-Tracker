const {
  Account, AccountToken, connectDatabase, consumeAccountToken, createSession, json, parseBody, sameOrigin, serviceError,
} = require('../lib/accountUtils');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  if (!sameOrigin(event)) return json(403, { error: 'Request origin could not be verified.' });
  const body = parseBody(event);
  if (!body || typeof body.token !== 'string') return json(400, { error: 'That verification link is invalid or expired. Request a new one and try again.' });

  try {
    await connectDatabase();
    const token = await consumeAccountToken(body.token, 'verify_email');
    if (!token) return json(400, { error: 'That verification link is invalid or expired. Request a new one and try again.' });
    const user = await Account.findByIdAndUpdate(token.userId, { $set: { emailVerified: true } }, { new: true });
    if (!user) return json(400, { error: 'That verification link is no longer valid.' });
    await AccountToken.deleteMany({ userId: user._id, purpose: 'verify_email' });
    const cookie = await createSession(user, event);
    return json(200, { account: { id: String(user._id), displayName: user.displayName, email: user.email }, message: 'Your email is verified.' }, { 'Set-Cookie': cookie });
  } catch (error) {
    console.error('Email verification failed:', error);
    return serviceError(error, 'We could not verify your email right now. Please try again.');
  }
};
