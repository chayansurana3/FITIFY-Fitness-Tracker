const {
  Account, AccountToken, connectDatabase, createAccountToken, hashPassword, json, keepOnlyAccountToken, parseBody, sameOrigin,
  sendAccountEmail, serviceError, siteBaseUrl,
} = require('../lib/accountUtils');

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  if (!sameOrigin(event)) return json(403, { error: 'Request origin could not be verified.' });
  const body = parseBody(event);
  if (!body) return json(400, { error: 'Please send valid form data.' });

  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (displayName.length < 2 || displayName.length > 80) return json(400, { error: 'Enter a name between 2 and 80 characters.' });
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Enter a valid email address.' });
  if (password.length < 12 || password.length > 128) return json(400, { error: 'Use a password between 12 and 128 characters.' });

  let user;
  try {
    await connectDatabase();
    const passwordHash = await hashPassword(password);
    user = await Account.create({ displayName, email, passwordHash, emailVerified: false });
    const token = await createAccountToken(user._id, 'verify_email', 24 * 60 * 60 * 1000);
    const link = `${siteBaseUrl(event)}/verify-email.html?token=${encodeURIComponent(token)}`;
    const safeName = escapeHtml(displayName);
    await sendAccountEmail({
      to: email,
      subject: 'Verify your FITIFY account',
      html: `<p>Hi ${safeName},</p><p>Verify your email to activate your FITIFY account.</p><p><a href="${link}">Verify email</a></p><p>This link expires in 24 hours. If you did not create this account, ignore this message.</p>`,
      text: `Hi ${displayName}, verify your FITIFY account using this link: ${link}\nThis link expires in 24 hours. If you did not create this account, ignore this message.`,
    });
    await keepOnlyAccountToken(user._id, 'verify_email', token);
    return json(201, { verificationRequired: true, message: 'Your account is created. Check your email for a verification link before signing in.' });
  } catch (error) {
    if (user) {
      await AccountToken.deleteMany({ userId: user._id }).catch(() => {});
      await Account.deleteOne({ _id: user._id }).catch(() => {});
    }
    if (error.code === 11000) return json(409, { error: 'An account with that email already exists. Sign in instead.' });
    console.error('Account registration failed:', error);
    return serviceError(error, 'We could not create your account right now. Please try again.');
  }
};

