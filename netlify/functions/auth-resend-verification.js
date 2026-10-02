const {
  Account, connectDatabase, createAccountToken, json, keepOnlyAccountToken, parseBody, sameOrigin, sendAccountEmail, siteBaseUrl,
} = require('../lib/accountUtils');

const genericResponse = () => json(202, { message: 'If the account needs verification, a new link will be sent shortly.' });

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  if (!sameOrigin(event)) return json(403, { error: 'Request origin could not be verified.' });
  const body = parseBody(event);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254) return genericResponse();

  try {
    await connectDatabase();
    const user = await Account.findOne({ email, emailVerified: false });
    if (!user) return genericResponse();
    const token = await createAccountToken(user._id, 'verify_email', 24 * 60 * 60 * 1000);
    const link = `${siteBaseUrl(event)}/verify-email.html?token=${encodeURIComponent(token)}`;
    await sendAccountEmail({
      to: email,
      subject: 'Verify your FITIFY account',
      html: `<p>Verify your email to activate your FITIFY account.</p><p><a href="${link}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
      text: `Verify your FITIFY account using this link: ${link}\nThis link expires in 24 hours.`,
    });
    await keepOnlyAccountToken(user._id, 'verify_email', token);
    return genericResponse();
  } catch (error) {
    console.error('Verification resend failed:', error);
    return genericResponse();
  }
};
