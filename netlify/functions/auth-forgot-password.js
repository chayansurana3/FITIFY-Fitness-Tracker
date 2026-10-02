const {
  Account, connectDatabase, createAccountToken, json, keepOnlyAccountToken, parseBody, sameOrigin, sendAccountEmail, siteBaseUrl,
} = require('../lib/accountUtils');

const genericResponse = () => json(202, { message: 'If an account matches that address, a password reset link will be sent shortly.' });

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  if (!sameOrigin(event)) return json(403, { error: 'Request origin could not be verified.' });
  const body = parseBody(event);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return genericResponse();

  try {
    await connectDatabase();
    const user = await Account.findOne({ email, emailVerified: { $ne: false } });
    if (!user) return genericResponse();
    const token = await createAccountToken(user._id, 'reset_password', 60 * 60 * 1000);
    const link = `${siteBaseUrl(event)}/reset-password.html?token=${encodeURIComponent(token)}`;
    await sendAccountEmail({
      to: email,
      subject: 'Reset your FITIFY password',
      html: `<p>Hi ${user.displayName.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]))},</p><p>Use the link below to choose a new FITIFY password.</p><p><a href="${link}">Reset password</a></p><p>This link expires in one hour. If you did not request this, you can ignore this message.</p>`,
      text: `Use this link to reset your FITIFY password: ${link}\nThis link expires in one hour. If you did not request this, ignore this message.`,
    });
    await keepOnlyAccountToken(user._id, 'reset_password', token);
    return genericResponse();
  } catch (error) {
    console.error('Password reset request failed:', error);
    return genericResponse();
  }
};
