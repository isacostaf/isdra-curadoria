const crypto = require('crypto');

function normalizeCode(code) {
  return (code || '').trim().toLowerCase().replace(/\s+/g, '');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password || '', salt, 64);
  const stored = Buffer.from(hash, 'hex');
  if (check.length !== stored.length) return false;
  return crypto.timingSafeEqual(check, stored);
}

module.exports = { normalizeCode, hashPassword, verifyPassword };
