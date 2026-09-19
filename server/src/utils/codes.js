import crypto from 'node:crypto';

export function makeCode(prefix) {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${date}-${suffix}`;
}
