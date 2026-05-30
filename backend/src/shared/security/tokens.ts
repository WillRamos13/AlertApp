import { createHmac, randomBytes } from 'node:crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import type { RoleCode } from '../types/auth';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: RoleCode;
}

export function generateOpaqueToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashToken(token: string): string {
  return createHmac('sha256', env.AUTH_TOKEN_PEPPER).update(token).digest('hex');
}

export function signAccessToken(userId: string, role: RoleCode): string {
  const expiresIn = `${env.ACCESS_TOKEN_EXPIRES_IN_MINUTES}m` as SignOptions['expiresIn'];
  return jwt.sign({ role }, env.JWT_ACCESS_SECRET, { subject: userId, expiresIn });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof payload === 'string' || !payload.sub || typeof payload.role !== 'string') {
    throw new Error('Token de acceso inválido.');
  }
  return payload as AccessTokenPayload;
}

export function refreshExpiresAt(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
}
