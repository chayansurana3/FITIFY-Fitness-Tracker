exports.handler = async function () {
  return {
    statusCode: 410,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ error: 'This legacy profile endpoint has been retired. Sign in to use your private FITIFY dashboard.' }),
  };
};
