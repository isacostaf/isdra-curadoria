const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Falta a variável de ambiente JWT_SECRET (veja .env.example).');
}

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

// Sessões viram tokens assinados (JWT) em vez de uma tabela/Map: nenhuma
// consulta extra ao banco é necessária pra validar cada request, o que
// funciona bem em ambiente serverless (cada invocação é isolada).
function signSessionToken(projectId) {
  return jwt.sign({ projectId }, JWT_SECRET, { expiresIn: '30d' });
}

function verifySessionToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.projectId ? payload : null;
  } catch (e) {
    return null;
  }
}

module.exports = { normalizeCode, hashPassword, verifyPassword, signSessionToken, verifySessionToken };
