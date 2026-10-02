const { connectDatabase, destroySession, json, sameOrigin, serviceError } = require('../lib/accountUtils');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  if (!sameOrigin(event)) return json(403, { error: 'Request origin could not be verified.' });
  try {
    await connectDatabase();
    const cookie = await destroySession(event);
    return json(200, { message: 'You are signed out.' }, { 'Set-Cookie': cookie });
  } catch (error) {
    console.error('Sign-out failed:', error);
    return serviceError(error, 'Could not sign you out right now.');
  }
};

