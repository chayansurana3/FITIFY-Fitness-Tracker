const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { Account, Session, BmiEntry, AccountToken, WeightEntry, MealEntry } = require('./accountModels');

const scrypt = promisify(crypto.scrypt);
const SESSION_COOKIE = 'fitify_session';
const SESSION_DAYS = 14;
let connectionPromise;
let accountEmailTransport;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return;
  if (!connectionPromise) {
    const uri = process.env.MONGODB_URI || (() => {
      const username = encodeURIComponent(process.env.MONGODB_USERNAME || '');
      const password = encodeURIComponent(process.env.MONGODB_PASSWORD || '');
      if (!username || !password) {
        const error = new Error('Database configuration is missing.');
        error.code = 'FITIFY_DATABASE_NOT_CONFIGURED';
        throw error;
      }
      return `mongodb+srv://${username}:${password}@cluster0.e6wowbu.mongodb.net/FITIFY_PROFILES?retryWrites=true&w=majority`;
    })();
    connectionPromise = mongoose.connect(uri).catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }
  await connectionPromise;
}

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
    body: JSON.stringify(body),
  };
}

function serviceError(error, fallback) {
  if (error?.code === 'FITIFY_DATABASE_NOT_CONFIGURED') {
    return json(503, { error: 'MongoDB is not configured. Add MONGODB_URI or both MONGODB_USERNAME and MONGODB_PASSWORD to the project-root .env file, then restart with “npm run serve”.' });
  }
  if (error?.code === 'FITIFY_EMAIL_NOT_CONFIGURED') {
    return json(503, { error: 'Email delivery is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM to your environment settings before using verification or password recovery.' });
  }
  if (error?.code === 'FITIFY_EMAIL_DELIVERY_FAILED') {
    return json(503, { error: 'We could not send the email right now. Check the email provider settings and try again.' });
  }
  return json(500, { error: fallback });
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch {
    return null;
  }
}

function sameOrigin(event) {
  const headers = event.headers || {};
  const origin = headers.origin || headers.Origin;
  const expectedHost = headers.host || headers.Host || headers['x-forwarded-host'];
  if (!origin || !expectedHost) return false;
  try {
    return new URL(origin).host.toLowerCase() === expectedHost.toLowerCase();
  } catch {
    return false;
  }
}

function readCookie(event, name) {
  const headers = event.headers || {};
  const cookieHeader = headers.cookie || headers.Cookie || '';
  const entry = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!entry) return '';
  try {
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return '';
  }
}

function makeCookie(token, event, maxAge = SESSION_DAYS * 24 * 60 * 60) {
  const proto = (event.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
  const secure = proto === 'https' || process.env.CONTEXT === 'production';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

function sessionHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createAccountToken(userId, purpose, lifetimeMs) {
  const token = crypto.randomBytes(32).toString('base64url');
  await AccountToken.create({ userId, purpose, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + lifetimeMs) });
  return token;
}

async function keepOnlyAccountToken(userId, purpose, activeToken) {
  await AccountToken.deleteMany({ userId, purpose, tokenHash: { $ne: tokenHash(activeToken) } });
}

async function consumeAccountToken(token, purpose) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 128) return null;
  return AccountToken.findOneAndDelete({ tokenHash: tokenHash(token), purpose, expiresAt: { $gt: new Date() } });
}

function siteBaseUrl(event) {
  const configured = process.env.SITE_URL;
  if (configured) {
    try {
      const url = new URL(configured);
      if (['http:', 'https:'].includes(url.protocol)) return url.origin;
    } catch {}
  }
  const headers = event.headers || {};
  const host = headers.host || headers.Host || headers['x-forwarded-host'];
  const proto = (headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  if (!host || !['http', 'https'].includes(proto)) throw new Error('Site URL is not available.');
  return `${proto}://${host}`;
}

function getAccountEmailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  const port = Number(SMTP_PORT || 587);
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !Number.isInteger(port) || port < 1 || port > 65535 || !process.env.EMAIL_FROM) {
    const error = new Error('SMTP email delivery is not configured.');
    error.code = 'FITIFY_EMAIL_NOT_CONFIGURED';
    throw error;
  }
  if (!accountEmailTransport) {
    accountEmailTransport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE.toLowerCase() === 'true' : port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: { minVersion: 'TLSv1.2' },
    });
  }
  return accountEmailTransport;
}

async function sendAccountEmail({ to, subject, html, text }) {
  try {
    await getAccountEmailTransport().sendMail({ from: process.env.EMAIL_FROM, to, subject, html, text });
  } catch (cause) {
    if (cause?.code === 'FITIFY_EMAIL_NOT_CONFIGURED') throw cause;
    console.error('SMTP email delivery failed with code:', cause?.code || 'unknown');
    const error = new Error('SMTP email delivery failed.');
    error.code = 'FITIFY_EMAIL_DELIVERY_FAILED';
    throw error;
  }
}

async function createSession(user, event) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await Session.create({ userId: user._id, tokenHash: sessionHash(token), expiresAt });
  return makeCookie(token, event);
}

async function getSessionUser(event) {
  const token = readCookie(event, SESSION_COOKIE);
  if (!token) return null;
  const session = await Session.findOne({ tokenHash: sessionHash(token), expiresAt: { $gt: new Date() } })
    .populate('userId', 'displayName email emailVerified preferredUnits heightCm currentWeightKg fitnessGoal dailyCalorieTarget');
  return session?.userId || null;
}

async function destroySession(event) {
  const token = readCookie(event, SESSION_COOKIE);
  if (token) await Session.deleteOne({ tokenHash: sessionHash(token) });
  return makeCookie('', event, 0);
}

function publicAccount(user) {
  return {
    id: String(user._id),
    displayName: user.displayName,
    email: user.email,
    emailVerified: user.emailVerified !== false,
    preferredUnits: user.preferredUnits,
    heightCm: user.heightCm ?? null,
    currentWeightKg: user.currentWeightKg ?? null,
    fitnessGoal: user.fitnessGoal || 'general',
    dailyCalorieTarget: user.dailyCalorieTarget ?? null,
    bmi: user.heightCm > 0 && user.currentWeightKg > 0
      ? Number((user.currentWeightKg / ((user.heightCm / 100) ** 2)).toFixed(1))
      : null,
  };
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString('hex')}$${Buffer.from(key).toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, n, r, p, saltHex, keyHex] = String(storedHash || '').split('$');
  if (algorithm !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = Buffer.from(await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
  }));
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = {
  Account,
  AccountToken,
  BmiEntry,
  MealEntry,
  Session,
  WeightEntry,
  SESSION_COOKIE,
  connectDatabase,
  createSession,
  createAccountToken,
  keepOnlyAccountToken,
  destroySession,
  getSessionUser,
  hashPassword,
  json,
  makeCookie,
  parseBody,
  publicAccount,
  sameOrigin,
  siteBaseUrl,
  sendAccountEmail,
  consumeAccountToken,
  serviceError,
  verifyPassword,
};
