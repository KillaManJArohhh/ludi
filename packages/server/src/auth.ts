import jwt from 'jsonwebtoken';
import type { AuthTokenPayload } from '@ludi/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'ludi-dev-secret-change-in-production';
const JWT_EXPIRY = '30d';

export function generateToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}
