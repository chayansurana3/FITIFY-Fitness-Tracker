const { connectDatabase, getSessionUser, json, publicAccount, serviceError } = require('../lib/accountUtils');

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed.' }, { Allow: 'GET' });
  try {
    if (!(event.headers?.cookie || event.headers?.Cookie || '').includes('fitify_session=')) {
      return json(401, { error: 'Sign in to continue.' });
    }
    await connectDatabase();
    const user = await getSessionUser(event);
    if (!user) return json(401, { error: 'Your session has expired. Sign in again.' });
    return json(200, { account: publicAccount(user) });
  } catch (error) {
    console.error('Session lookup failed:', error);
    return serviceError(error, 'We could not check your session right now.');
  }
};

